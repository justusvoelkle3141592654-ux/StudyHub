//! Tauri commands invoked from the frontend via `invoke()`.
//!
//! File-system commands here are used for things the fs plugin scope cannot
//! express well: the user-chosen database directory and working folder are
//! only known at runtime. The frontend registers those directories as
//! allowed roots after reading the settings; every path-based command checks
//! that its arguments stay inside an allowed root.

use serde::Serialize;
use sha2::{Digest, Sha256};
use std::fs::{self, File, OpenOptions};
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};

/// Runtime list of directories the path-based commands may touch.
#[derive(Default)]
pub struct AllowedRoots(pub Mutex<Vec<PathBuf>>);

const MAX_LOG_BYTES: u64 = 10 * 1024 * 1024;

/// Returns the version from Cargo.toml (kept in sync with package.json and
/// tauri.conf.json by the release process).
#[tauri::command]
pub fn app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

fn normalize(path: &str) -> PathBuf {
    let p = PathBuf::from(path);
    // Canonicalize when the path exists; otherwise canonicalize the parent so
    // that not-yet-created files can still be validated.
    if let Ok(c) = p.canonicalize() {
        return c;
    }
    if let (Some(parent), Some(name)) = (p.parent(), p.file_name()) {
        if let Ok(c) = parent.canonicalize() {
            return c.join(name);
        }
    }
    p
}

fn ensure_allowed(roots: &State<AllowedRoots>, app: &AppHandle, path: &str) -> Result<PathBuf, String> {
    let target = normalize(path);
    let mut allowed: Vec<PathBuf> = roots.0.lock().map_err(|e| e.to_string())?.clone();
    if let Ok(dir) = app.path().app_data_dir() {
        allowed.push(normalize(dir.to_string_lossy().as_ref()));
    }
    if let Ok(dir) = app.path().app_local_data_dir() {
        allowed.push(normalize(dir.to_string_lossy().as_ref()));
    }
    if allowed.iter().any(|root| target.starts_with(root)) {
        Ok(target)
    } else {
        Err(format!("Path is outside the allowed directories: {}", path))
    }
}

/// Register directories the app may read and write (database dir, working folder).
#[tauri::command]
pub fn set_allowed_roots(roots: State<AllowedRoots>, paths: Vec<String>) -> Result<(), String> {
    let mut guard = roots.0.lock().map_err(|e| e.to_string())?;
    *guard = paths.iter().map(|p| normalize(p)).collect();
    Ok(())
}

#[tauri::command]
pub fn fs_copy_file(app: AppHandle, roots: State<AllowedRoots>, from: String, to: String) -> Result<u64, String> {
    // The source may be a user-picked file outside the roots (import), the
    // destination must be inside.
    let dst = ensure_allowed(&roots, &app, &to)?;
    if let Some(parent) = dst.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::copy(&from, &dst).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn fs_remove_file(app: AppHandle, roots: State<AllowedRoots>, path: String) -> Result<(), String> {
    let p = ensure_allowed(&roots, &app, &path)?;
    if p.is_file() {
        fs::remove_file(&p).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn fs_mkdir(app: AppHandle, roots: State<AllowedRoots>, path: String) -> Result<(), String> {
    let p = ensure_allowed(&roots, &app, &path)?;
    fs::create_dir_all(&p).map_err(|e| e.to_string())
}

#[derive(Serialize)]
pub struct DirEntryInfo {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: u64,
    pub modified_ms: Option<u64>,
}

/// Read-only directory listing. Not restricted to the roots because the
/// source of an import is a folder the user picked in a dialog.
#[tauri::command]
pub fn fs_list_dir(path: String) -> Result<Vec<DirEntryInfo>, String> {
    let p = PathBuf::from(&path);
    let mut out = Vec::new();
    if !p.is_dir() {
        return Ok(out);
    }
    for entry in fs::read_dir(&p).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let meta = entry.metadata().map_err(|e| e.to_string())?;
        let modified_ms = meta
            .modified()
            .ok()
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_millis() as u64);
        out.push(DirEntryInfo {
            name: entry.file_name().to_string_lossy().to_string(),
            path: entry.path().to_string_lossy().to_string(),
            is_dir: meta.is_dir(),
            size: meta.len(),
            modified_ms,
        });
    }
    out.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(out)
}

#[tauri::command]
pub fn fs_exists(path: String) -> bool {
    Path::new(&path).exists()
}

#[derive(Serialize)]
pub struct FileInfo {
    pub size: u64,
    pub is_dir: bool,
    pub modified_ms: Option<u64>,
}

#[tauri::command]
pub fn fs_stat(path: String) -> Result<FileInfo, String> {
    let meta = fs::metadata(&path).map_err(|e| e.to_string())?;
    Ok(FileInfo {
        size: meta.len(),
        is_dir: meta.is_dir(),
        modified_ms: meta
            .modified()
            .ok()
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_millis() as u64),
    })
}

/// SHA-256 of a file, streamed so large files do not need to fit in memory.
/// Allowed for any readable path because the source of an import is a
/// user-picked file.
#[tauri::command]
pub fn sha256_file(path: String) -> Result<String, String> {
    let mut file = File::open(&path).map_err(|e| e.to_string())?;
    let mut hasher = Sha256::new();
    let mut buf = vec![0u8; 1024 * 1024];
    loop {
        let n = file.read(&mut buf).map_err(|e| e.to_string())?;
        if n == 0 {
            break;
        }
        hasher.update(&buf[..n]);
    }
    Ok(format!("{:x}", hasher.finalize()))
}

/// Read a file the user picked (import preview) or one inside the roots.
#[tauri::command]
pub fn fs_read_file(path: String) -> Result<Vec<u8>, String> {
    fs::read(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn fs_write_file(app: AppHandle, roots: State<AllowedRoots>, path: String, data: Vec<u8>) -> Result<(), String> {
    let p = ensure_allowed(&roots, &app, &path)?;
    if let Some(parent) = p.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&p, data).map_err(|e| e.to_string())
}

/// Append a line to the rotating log file in the app data directory.
/// When the file exceeds 10 MB it is renamed to `studyhub.log.1` (replacing
/// the previous one), so disk usage stays bounded at ~20 MB.
#[tauri::command]
pub fn append_log(app: AppHandle, line: String) -> Result<(), String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let log_path = dir.join("studyhub.log");
    if let Ok(meta) = fs::metadata(&log_path) {
        if meta.len() > MAX_LOG_BYTES {
            let rotated = dir.join("studyhub.log.1");
            let _ = fs::remove_file(&rotated);
            fs::rename(&log_path, &rotated).map_err(|e| e.to_string())?;
        }
    }
    let mut f = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_path)
        .map_err(|e| e.to_string())?;
    let mut text = line;
    if !text.ends_with('\n') {
        text.push('\n');
    }
    f.write_all(text.as_bytes()).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn log_file_path(app: AppHandle) -> Result<String, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    Ok(dir.join("studyhub.log").to_string_lossy().to_string())
}

/// Open a file with the default application (desktop). Restricted to the
/// registered roots so the frontend cannot launch arbitrary paths.
#[tauri::command]
pub fn open_path_external(app: AppHandle, roots: State<AllowedRoots>, path: String) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;
    let p = ensure_allowed(&roots, &app, &path)?;
    app.opener().open_path(p.to_string_lossy().to_string(), None::<&str>).map_err(|e| e.to_string())
}
