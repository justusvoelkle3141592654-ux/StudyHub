//! Secret storage for tokens and API keys.
//!
//! Desktop: the OS credential store via the `keyring` crate (Windows
//! Credential Manager, macOS Keychain). Android: a JSON file inside the
//! app-private data directory, which Android isolates per app and encrypts
//! at rest with file-based encryption. Secrets are never written to the
//! SQLite database or to the log.

use tauri::AppHandle;

const SERVICE: &str = "de.studyhub.app";

#[cfg(not(target_os = "android"))]
mod imp {
    use super::SERVICE;

    pub fn set(_app: &tauri::AppHandle, key: &str, value: &str) -> Result<(), String> {
        let entry = keyring::Entry::new(SERVICE, key).map_err(|e| e.to_string())?;
        entry.set_password(value).map_err(|e| e.to_string())
    }

    pub fn get(_app: &tauri::AppHandle, key: &str) -> Result<Option<String>, String> {
        let entry = keyring::Entry::new(SERVICE, key).map_err(|e| e.to_string())?;
        match entry.get_password() {
            Ok(v) => Ok(Some(v)),
            Err(keyring::Error::NoEntry) => Ok(None),
            Err(e) => Err(e.to_string()),
        }
    }

    pub fn delete(_app: &tauri::AppHandle, key: &str) -> Result<(), String> {
        let entry = keyring::Entry::new(SERVICE, key).map_err(|e| e.to_string())?;
        match entry.delete_credential() {
            Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
            Err(e) => Err(e.to_string()),
        }
    }
}

#[cfg(target_os = "android")]
mod imp {
    use std::collections::BTreeMap;
    use std::fs;
    use tauri::Manager;

    fn path(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
        let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
        fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
        Ok(dir.join("secrets.json"))
    }

    fn read(app: &tauri::AppHandle) -> Result<BTreeMap<String, String>, String> {
        let p = path(app)?;
        if !p.exists() {
            return Ok(BTreeMap::new());
        }
        let raw = fs::read_to_string(&p).map_err(|e| e.to_string())?;
        serde_json::from_str(&raw).map_err(|e| e.to_string())
    }

    fn write(app: &tauri::AppHandle, map: &BTreeMap<String, String>) -> Result<(), String> {
        let p = path(app)?;
        let raw = serde_json::to_string(map).map_err(|e| e.to_string())?;
        fs::write(&p, raw).map_err(|e| e.to_string())
    }

    pub fn set(app: &tauri::AppHandle, key: &str, value: &str) -> Result<(), String> {
        let mut map = read(app)?;
        map.insert(key.to_string(), value.to_string());
        write(app, &map)
    }

    pub fn get(app: &tauri::AppHandle, key: &str) -> Result<Option<String>, String> {
        Ok(read(app)?.get(key).cloned())
    }

    pub fn delete(app: &tauri::AppHandle, key: &str) -> Result<(), String> {
        let mut map = read(app)?;
        map.remove(key);
        write(app, &map)
    }
}

#[tauri::command]
pub fn secret_set(app: AppHandle, key: String, value: String) -> Result<(), String> {
    imp::set(&app, &key, &value)
}

#[tauri::command]
pub fn secret_get(app: AppHandle, key: String) -> Result<Option<String>, String> {
    imp::get(&app, &key)
}

#[tauri::command]
pub fn secret_delete(app: AppHandle, key: String) -> Result<(), String> {
    imp::delete(&app, &key)
}
