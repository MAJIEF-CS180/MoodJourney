#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod db;
mod emotion;
mod dictation;

use std::fs;
use std::io::Write; 
use std::path::PathBuf;
use uuid::Uuid;

use db::{
    init_db, create_entry_with_now, get_entries, get_entry_by_date, update_entry_by_date, delete_entry_by_date, Entry,
};
use emotion::classify_emotion;
use tauri::{command, AppHandle, Manager};

// automatically creates entry with current local date
// content and password are optional
#[command]
fn create_entry(title: &str, content: Option<&str>, password: Option<&str>, image: Option<&str>) -> Result<(), String> {
    create_entry_with_now(title, content, password, image).map_err(|e| e.to_string())
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
fn update_entry(date: &str, new_title: &str, new_content: Option<&str>, new_password: Option<&str>, new_image: Option<&str>) -> Result<(), String> {
    update_entry_by_date(date, new_title, new_content, new_password, new_image).map_err(|e| e.to_string())
}

// delete a specific entry by date
#[command]
fn delete_entry(app_handle: AppHandle, date: &str) -> Result<(), String> {
    match get_entry_by_date(date) {
        Ok(Some(entry)) => {
            if let Some(image_file_name_str) = entry.image {
                if !image_file_name_str.is_empty() {
                    match app_handle.path().app_local_data_dir() {
                        Ok(app_data_dir) => {
                            let full_image_path = app_data_dir.join(&image_file_name_str);
                            if full_image_path.exists() {
                                if let Err(e) = fs::remove_file(&full_image_path) {
                                    eprintln!("Failed to delete image file {:?}: {}", full_image_path, e);
                                } 
                                else {
                                    println!("Successfully deleted image file: {:?}", full_image_path);
                                }
                            }
                            else {
                                println!("Image file not found for deletion: {:?}", full_image_path);
                            }
                        }
                        Err(e) => {
                            eprintln!("Error getting app local data dir for image deletion: {}", e);
                        }
                    }
                }
            }
        }
        Ok(None) => {
            println!("Entry not found in DB for date {}, no image to delete.", date);
        }
        Err(e) => {
            eprintln!("Error fetching entry from DB to delete its image: {}", e);
            return Err(format!("Failed to fetch entry for image deletion: {}", e));
        }
    }
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
        let model_name = "ggml-tiny.en.bin";
        dictation::transcribe_audio_file(&app_handle, &audio_file_path, model_name)
    })
    .await
    .map_err(|e| format!("Task join error during transcription: {}", e))?
    .map_err(|e| {
        eprintln!("Transcription error: {}", e);
        e
    })
}

// upload image function
#[command]
async fn upload_image_file(app_handle: AppHandle, file_data_base64: String, original_file_name: String) -> Result<String, String> {
    let app_data_dir = app_handle.path().app_local_data_dir()
        .map_err(|e| format!("Could not determine app local data directory: {}", e))?;
    
    let images_dir_name = "journal_images";
    let images_dir = app_data_dir.join(images_dir_name);

    if !images_dir.exists() {
        fs::create_dir_all(&images_dir).map_err(|e| format!("Failed to create images directory at {:?}: {}", images_dir, e))?;
    }

    let image_bytes = base64::decode(&file_data_base64).map_err(|e| format!("Invalid base64 image data: {}", e))?;

    let extension = PathBuf::from(&original_file_name)
        .extension()
        .and_then(|ext| ext.to_str())
        .map(|s| s.to_lowercase())
        .filter(|s| !s.is_empty() && s.chars().all(|c| c.is_alphanumeric()))
        .unwrap_or_else(|| "png".to_string());
    
    let unique_id = Uuid::new_v4().to_string();
    let new_file_name = format!("{}.{}", unique_id, extension);
    
    let file_path = images_dir.join(&new_file_name);

    let mut file = fs::File::create(&file_path).map_err(|e| format!("Failed to create image file at {:?}: {}", file_path, e))?;
    file.write_all(&image_bytes).map_err(|e| format!("Failed to write image data to {:?}: {}", file_path, e))?;
    
    println!("Image saved to: {:?}", file_path);
    Ok(format!("{}/{}", images_dir_name, new_file_name))
}

fn main() {
    init_db().expect("Failed to initialize database");

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            let app_handle = app.handle().clone();
            match app_handle.path().app_local_data_dir() {
                Ok(dir) => {
                    let images_path = dir.join("journal_images");
                    if !images_path.exists() {
                        if let Err(e) = fs::create_dir_all(&images_path) {
                            eprintln!("Could not create images directory on startup at {:?}: {}", images_path, e);
                        } else {
                            println!("Images directory ensured at: {:?}", images_path);
                        }
                    }
                }
                Err(e) => {
                    eprintln!("Could not resolve app local data directory at startup to ensure images directory: {}", e);
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![create_entry, read_entries, get_entry, update_entry, classify_emotion, delete_entry, perform_dictation, upload_image_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
