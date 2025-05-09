#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod db;
mod emotion;
mod dictation;
use db::{
    init_db, create_entry_with_now, get_entries, get_entry_by_date, update_entry_by_date, delete_entry_by_date, Entry,
};
use emotion::classify_emotion;

use tauri::{command, AppHandle};

// automatically creates entry with current local date
// content and password are optional
#[command]
fn create_entry(title: &str, content: Option<&str>, password: Option<&str>) -> Result<(), String> {
    create_entry_with_now(title, content, password).map_err(|e| e.to_string())
}

// returns list of all entries
#[command]
fn read_entries() -> Result<Vec<Entry>, String> {
    get_entries().map_err(|e| e.to_string())
}

// get a specific entry by date
#[command]
fn get_entry(date: &str) -> Result<Option<Entry>, String> {
    get_entry_by_date(date).map_err(|e| e.to_string())
}

// update a specific entry by date
#[command]
fn update_entry(date: &str, new_title: &str, new_content: Option<&str>, new_password: Option<&str>) -> Result<(), String> {
    update_entry_by_date(date, new_title, new_content, new_password).map_err(|e| e.to_string())
}

// delete a specific entry by date
#[command]
fn delete_entry(date: &str) -> Result<(), String> {
    delete_entry_by_date(date).map_err(|e| e.to_string())
}

// dictation function
#[command]
async fn perform_dictation(
    app_handle: AppHandle,
    audio_file_path: String,
) -> Result<String, String> {
    println!("Attempting to transcribe audio file: {}", audio_file_path);
    tokio::task::spawn_blocking(move || {
        let model_name = "ggml-small.en.bin";
        dictation::transcribe_audio_file(&app_handle, &audio_file_path, model_name)
    })
    .await
    .map_err(|e| format!("Task join error during transcription: {}", e))?
    .map_err(|e| {
        eprintln!("Transcription error: {}", e);
        e
    })
}

fn main() {
    init_db().expect("Failed to initialize database");

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![create_entry, read_entries, get_entry, update_entry, classify_emotion, delete_entry, perform_dictation])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
