//! Tauri commands invoked from the frontend via `invoke()`.

/// Returns the version from Cargo.toml (kept in sync with package.json and
/// tauri.conf.json by the release process).
#[tauri::command]
pub fn app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}
