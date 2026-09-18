//! StudyHub native shell.
//!
//! The Rust side is intentionally thin: it registers the Tauri plugins the
//! frontend uses (SQLite, file system, dialogs, key/value store,
//! notifications, OS info) and exposes a handful of commands that cannot be
//! done from JavaScript alone (SHA-256 hashing of large files, rotating log
//! writes, database backups).

mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .manage(commands::AllowedRoots::default())
        .invoke_handler(tauri::generate_handler![
            commands::app_version,
            commands::set_allowed_roots,
            commands::fs_copy_file,
            commands::fs_remove_file,
            commands::fs_mkdir,
            commands::fs_list_dir,
            commands::fs_exists,
            commands::fs_stat,
            commands::fs_read_file,
            commands::fs_write_file,
            commands::sha256_file,
            commands::append_log,
            commands::log_file_path,
        ])
        .run(tauri::generate_context!())
        .expect("error while running StudyHub");
}
