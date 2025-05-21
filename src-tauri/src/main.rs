#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod db;
mod dictation;
mod emotion;
mod suggestion;

use std::fs;
use std::io::Write; 
use std::path::PathBuf;
use std::sync::Arc;
use uuid::Uuid;

use db::{
    init_db, create_entry_with_now, get_entries, get_entry_by_date, update_entry_by_date, delete_entry_by_date, Entry,
};
use dictation::{DictationModel, perform_dictation_cmd};
use emotion::{EmotionModel, classify_emotion};
use tauri::{command, AppHandle, Manager, State as TauriState, path::BaseDirectory};
use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64_STANDARD};
use crate::suggestion::SuggestionModel;

pub struct SafeDictationModelWrapper(pub DictationModel);
pub struct AppDictationModel(pub Arc<SafeDictationModelWrapper>);
unsafe impl Send for SafeDictationModelWrapper {}
unsafe impl Sync for SafeDictationModelWrapper {}

pub struct SafeEmotionModelWrapper(pub EmotionModel);
pub struct AppEmotionModel(pub Arc<SafeEmotionModelWrapper>);
unsafe impl Send for SafeEmotionModelWrapper {}
unsafe impl Sync for SafeEmotionModelWrapper {}

pub struct SafeSuggestionModelWrapper(SuggestionModel);
pub struct AppSuggestionModel(pub Arc<SafeSuggestionModelWrapper>);
unsafe impl Send for SafeSuggestionModelWrapper {}
unsafe impl Sync for SafeSuggestionModelWrapper {}

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

    let image_bytes = BASE64_STANDARD.decode(&file_data_base64)
        .map_err(|e| format!("Invalid base64 image data: {}", e))?;

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

// generate AI suggestions
#[command]
fn generate_suggestion_cmd(
    entry_title: Option<String>, 
    entry_content: Option<String>, 
    suggestion_type: Option<String>, 
    suggestion_model_state: TauriState<'_, AppSuggestionModel>
) -> Result<String, String> {

    // Changed prompt_parts to Vec<String> to own the formatted strings
    let mut prompt_parts: Vec<String> = Vec::new();

    prompt_parts.push("Here are some examples of journal entries and helpful suggestions:".to_string());
    prompt_parts.push("Journal Entry: I felt anxious about my presentation today, but it went okay.".to_string());
    prompt_parts.push("Suggestion: What specific part of the presentation made you feel most relieved when it was over?".to_string());
    prompt_parts.push("Journal Entry: I'm grateful for a quiet evening at home.".to_string());
    prompt_parts.push("Suggestion: How can you create more moments of quiet and gratitude this week?".to_string());
    prompt_parts.push("\nNow, consider the following journal entry:".to_string());

    // Used .as_ref() before .filter() to avoid moving entry_title
    if let Some(title_str) = entry_title.as_ref().filter(|t| !t.trim().is_empty()) {
        prompt_parts.push(format!("Title: {}", title_str.trim())); // format! returns String
    }

    // Used .as_ref() before .filter() to avoid moving entry_content
    if let Some(content_str) = entry_content.as_ref().filter(|c| !c.trim().is_empty()) {
        let max_content_chars = 500;
        let current_content_trimmed = content_str.trim();
        let content_to_use = if current_content_trimmed.chars().count() > max_content_chars {
            current_content_trimmed.chars().take(max_content_chars).collect::<String>() + "..."
        } 
        else {
            current_content_trimmed.to_string() // Ensure this is a String if not already
        };
        prompt_parts.push(format!("Content: {}", content_to_use)); // format! returns String
    } 
    else {
        prompt_parts.push("Content: (No specific content provided for this entry)".to_string());
    }
    
    match suggestion_type.as_deref() {
        Some("reflective_question") => {
            prompt_parts.push("\nBased on this entry, suggest a reflective question for the user.".to_string());
        }
        Some("positive_affirmation") => {
            prompt_parts.push("\nBased on this entry, generate a positive affirmation.".to_string());
        }
        Some("actionable_step") => {
            prompt_parts.push("\nBased on this entry, suggest a small actionable step the user could take.".to_string());
        }
        _ => {
            prompt_parts.push("\nProvide a helpful and insightful suggestion related to this journal entry.".to_string());
        }
    }
    prompt_parts.push("Suggestion:".to_string());

    // .join() works on Vec<String> by taking references to the Strings.
    let final_prompt = prompt_parts.join("\n");

    // Now entry_content and entry_title can be checked with .is_none() as they were not moved.
    if final_prompt.trim().len() < 50 && entry_content.is_none() && entry_title.is_none() {
        return Err("The context provided for suggestion is too minimal. Please provide more details from the journal entry.".to_string());
    }
    
    log::info!("[CMD generate_suggestion_cmd] Constructed prompt: {}", final_prompt);

    let model_wrapper_arc = &suggestion_model_state.inner().0;
    let suggestion_model_in_wrapper = &model_wrapper_arc.0;
    
    match suggestion_model_in_wrapper.generate(&final_prompt) {
        Ok(suggestion) => {
            if suggestion.trim().is_empty() {
                Err("The AI generated an empty suggestion. Try rephrasing or adding more detail to your entry.".to_string())
            }
            else {
                Ok(suggestion)
            }
        }
        Err(e) => {
            eprintln!("[CMD generate_suggestion_cmd] Error generating suggestion: {}", e);
            Err(format!("Failed to generate suggestion: {}", e))
        }
    }
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
                        }
                        else {
                            println!("Images directory ensured at: {:?}", images_path);
                        }
                    }
                }
                Err(e) => {
                    eprintln!("Could not resolve app local data directory at startup to ensure images directory: {}", e);
                }
            }

            let resource_path = app.path().resolve("models", BaseDirectory::Resource)
                .expect("ERROR: Failed to resolve 'models' resource directory. Check tauri.conf.json, ensure it exists in src-tauri/, and is in bundle resources.");
            
            println!("Models resource path for ML models: {:?}", resource_path);
            if !resource_path.exists() {
                eprintln!("CRITICAL: Base 'models' directory for ML models does not exist at {:?}.", resource_path);
                panic!("Base 'models' directory not found. Ensure models are bundled correctly.");
            }
        
            let suggestion_model_dir_name = "suggestion";
            let suggestion_model_dir = resource_path.join(suggestion_model_dir_name);
            println!("Loading suggestion model from: {:?}", suggestion_model_dir);
            let suggestion_model_instance = SuggestionModel::new(suggestion_model_dir)
                .expect("CRITICAL: Failed to initialize SuggestionModel.");
            let safe_suggestion_model_wrapper = SafeSuggestionModelWrapper(suggestion_model_instance);
            app.manage(AppSuggestionModel(Arc::new(safe_suggestion_model_wrapper)));
            println!("SuggestionModel (GPT-2) managed.");

            let emotion_model_dir_name = "emotion";
            let emotion_model_base_path = resource_path.join(emotion_model_dir_name);
            println!("[main.rs] Attempting to load emotion model from: {:?}", emotion_model_base_path);
            let emotion_model_instance = EmotionModel::new(emotion_model_base_path)
                .expect("CRITICAL: Failed to initialize EmotionModel. Check model files and paths.");
            let safe_emotion_model_wrapper = SafeEmotionModelWrapper(emotion_model_instance);
            app.manage(AppEmotionModel(Arc::new(safe_emotion_model_wrapper)));
            println!("[main.rs] EmotionModel initialized and managed.");

            let dictation_model_name = "ggml-base.en.bin";
            log::info!("[main.rs] Attempting to load dictation model: {}", dictation_model_name);
            let dictation_model_instance = DictationModel::new(&app_handle, dictation_model_name)
                .expect("CRITICAL: Failed to initialize DictationModel. Check model file and paths.");
            let safe_dictation_model_wrapper = SafeDictationModelWrapper(dictation_model_instance);
            app.manage(AppDictationModel(Arc::new(safe_dictation_model_wrapper)));
            log::info!("[main.rs] DictationModel ('{}') initialized and managed.", dictation_model_name);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![create_entry, read_entries, get_entry, update_entry, classify_emotion, delete_entry, perform_dictation_cmd, upload_image_file, generate_suggestion_cmd])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
