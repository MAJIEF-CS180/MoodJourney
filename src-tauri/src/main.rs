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
use chrono::Local;

use db::{
    init_db, create_entry_with_now, get_entries, get_entry_by_date, update_entry_by_date, delete_entry_by_date, Entry,
};
use dictation::{DictationModel, perform_dictation_cmd};
use emotion::{EmotionModel, classify_emotion};
use tauri::{command, AppHandle, Manager, path::BaseDirectory};
use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64_STANDARD};
use serde::{Deserialize, Serialize};
use crate::suggestion::generate_suggestion_via_api;

pub struct SafeDictationModelWrapper(pub DictationModel);
pub struct AppDictationModel(pub Arc<SafeDictationModelWrapper>);
unsafe impl Send for SafeDictationModelWrapper {}
unsafe impl Sync for SafeDictationModelWrapper {}

pub struct SafeEmotionModelWrapper(pub EmotionModel);
pub struct AppEmotionModel(pub Arc<SafeEmotionModelWrapper>);
unsafe impl Send for SafeEmotionModelWrapper {}
unsafe impl Sync for SafeEmotionModelWrapper {}

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

// AI suggestions
#[command]
async fn generate_suggestion_cmd(
    entry_title: Option<String>,
    entry_content: Option<String>,
) -> Result<String, String> {
    let mut prompt_parts: Vec<String> = Vec::new();

    let initial_prompt_block = r#"
    You are a helpful journaling assistant called "MoodJourney".
    Your goal is to provide three concise, actionable, and encouraging suggestions based on the user's journal entry.
    The suggestions should be things the user could consider doing or thinking about related to their entry.

    Here's an example of how to respond to an entry corresponding to the emotion "sadness":
    --- Example Start ---
    Journal Entry: Today was a bit overwhelming. I had a lot of meetings and didn't get as much done on my main project as I hoped. Feeling a little drained now.
    Suggestions:
    - Perhaps take 15 minutes for a quick walk or some stretching to clear your head and recharge.
    - Before tomorrow, could you identify one or two key tasks for your main project to focus on first? This might help you feel more accomplished.
    - Remember to acknowledge what you *did* manage today, even with many meetings. It's okay for some days to be less project-focused.
    --- Example End ---

    Here's an example of how to respond to an entry corresponding to the emotion "joy":
    --- Example Start ---
    Journal Entry: I had such a wonderful day! Spent the afternoon hiking with friends, and the weather was perfect. We even saw a deer. Feeling so refreshed and grateful.
    Suggestions:
    - That sounds amazing! Maybe you could plan another hike soon to keep the good vibes going?
    - Consider sharing a photo from your hike or telling another friend about your adventure to spread the joy.
    - Take a moment to jot down one specific thing about the hike that made you feel most refreshed – it's a great memory to hold onto.
    --- Example End ---

    Here's an example of how to respond to an entry corresponding to the emotion "anger":
    --- Example Start ---
    Journal Entry: I'm so furious right now! My coworker completely threw me under the bus in the team meeting, taking credit for my work and blaming me for their mistake. I feel so disrespected and unappreciated.
    Suggestions:
    - It's completely understandable to feel furious and disrespected. Allow yourself to feel that anger without judgment for a bit.
    - When you feel a bit calmer, consider writing down the specific points you want to address with your coworker or manager, focusing on the facts and how it impacted you.
    - Is there a quick activity that usually helps you release frustration, like listening to loud music, going for a brisk walk (if possible), or scribbling on a piece of paper?
    --- Example End ---

    Do not output "Suggestions:" before the three suggestions. Simply output the three suggestions themselves.
    Now, here is the user's actual journal entry:"#;

    prompt_parts.push(initial_prompt_block.to_string());

    if let Some(title_str) = entry_title.as_ref().filter(|t| !t.trim().is_empty()) {
        prompt_parts.push(format!("Title: {}", title_str.trim()));
    }

    if let Some(content_str) = entry_content.as_ref().filter(|c| !c.trim().is_empty()) {
        let max_content_chars = 700;
        let current_content_trimmed = content_str.trim();
        let content_to_use = if current_content_trimmed.chars().count() > max_content_chars {
            current_content_trimmed.chars().take(max_content_chars).collect::<String>() + "..."
        }
        else {
            current_content_trimmed.to_string()
        };
        prompt_parts.push(format!("Content: {}", content_to_use));
    }
    else {
        prompt_parts.push("Content: (No specific content provided for this entry)".to_string());
    }

    prompt_parts.push("\nSuggestion:".to_string());
    let final_prompt = prompt_parts.join("\n");

    if entry_content.as_deref().unwrap_or("").trim().is_empty() && entry_title.as_deref().unwrap_or("").trim().is_empty() {
        return Err("Cannot generate suggestion: Journal entry title and content are both empty.".to_string());
    }
    
    log::info!("[CMD generate_suggestion_cmd] Final prompt for Gemini API (first 200 chars): {}", final_prompt.chars().take(200).collect::<String>());

    match generate_suggestion_via_api(&final_prompt).await {
        Ok(suggestion) => {
            if suggestion.trim().is_empty() {
                Err("The AI generated an empty suggestion. Try rephrasing or adding more detail to your entry.".to_string())
            } else {
                Ok(suggestion)
            }
        }
        Err(e) => {
            log::error!("[CMD generate_suggestion_cmd] Error generating suggestion via API: {}", e);
            Err(format!("Failed to generate suggestion: {}", e))
        }
    }
}

fn get_main_content_from_full_content_rs(full_content: &str) -> String {
    let brain_emotion_tag_marker = "\n\n🧠 Emotion:";
    let clean_emotion_tag_replacement = "\n\nEmotion:";
    let suggestion_tag_marker = "\n\n💡 Suggestion:";

    let end_of_relevant_content = full_content.find(suggestion_tag_marker)
        .unwrap_or(full_content.len());

    let relevant_content_slice = &full_content[0..end_of_relevant_content];
    let modified_content = relevant_content_slice.replace(brain_emotion_tag_marker, clean_emotion_tag_replacement);
    modified_content.trim().to_string()
}

#[derive(Serialize, Deserialize)]
struct ChatCompletionResponse {
    assistant_response: String,
    session_id: String,
}

#[command]
async fn chat_with_moodjourney_cmd(
    user_message: String,
    session_id_option: Option<String>,
) -> Result<ChatCompletionResponse, String> {
    log::info!("[CMD chat_with_moodjourney_cmd] User: '{}', Session: {:?}", user_message, session_id_option);

    let current_session_id = match session_id_option {
        Some(id) => id,
        None => db::create_new_chat_session().map_err(|e| {
            log::error!("Failed to create new chat session: {}", e);
            e.to_string()
        })?,
    };

    db::save_chat_message(&current_session_id, "user", &user_message).map_err(|e| {
        log::error!("Failed to save user message for session {}: {}", current_session_id, e);
        e.to_string()
    })?;

    let all_messages_for_session_from_db = db::get_messages_for_session(&current_session_id)
        .map_err(|e| format!("Failed to retrieve messages for session {}: {}", current_session_id, e))?;

    let mut api_request_contents: Vec<serde_json::Value> = Vec::new();

    for (index, db_msg) in all_messages_for_session_from_db.iter().enumerate() {
        let mut current_turn_text_for_api = db_msg.content.clone();
        if index == 0 && db_msg.sender == "user" {
            let mut system_and_first_user_message_parts: Vec<String> = Vec::new();
            let current_date_str = Local::now().format("%A, %B %d, %Y").to_string();

            let initial_prompt_block = format!(
                r#"
                You are a helpful journaling assistant called "MoodJourney". The user wants to chat with you.
                The current date is {}.
                You have access to the user's past journal entries for context. Refer to them when relevant to provide
                insightful and understanding responses. Be conversational and concise. Do not explicitly state 'Based on your entry
                from (Month) (Day), (Year)...' unless it feels natural and helpful.
                The following is the start of our conversation:"#,
                current_date_str
            );

            system_and_first_user_message_parts.push(initial_prompt_block);

            let all_journal_entries = db::get_entries().unwrap_or_default();
            if !all_journal_entries.is_empty() {
                system_and_first_user_message_parts.push("\n\nHere are the user's past journal entries as general context:\n---\n".to_string());
                for entry in all_journal_entries.iter() {
                    let main_content = get_main_content_from_full_content_rs(&entry.content.clone().unwrap_or_default());
                    system_and_first_user_message_parts.push(format!("Date: {}\nContent: {}\n---\n",
                        entry.date,
                        main_content
                    ));
                }
                system_and_first_user_message_parts.push("End of past journal entries.\n".to_string());
            }

            system_and_first_user_message_parts.push(format!("\nUser: {}", db_msg.content));
            current_turn_text_for_api = system_and_first_user_message_parts.join("\n");
        }
        api_request_contents.push(serde_json::json!({
            "role": if db_msg.sender == "user" { "user" } else { "model" },
            "parts": [{"text": current_turn_text_for_api}]
        }));
    }

    let last_content_for_log = api_request_contents.last()
        .and_then(|c| c.get("parts").and_then(|p| p.get(0)).and_then(|t| t.get("text")).and_then(|s| s.as_str()))
        .map(|s| s.chars().take(300).collect::<String>())
        .unwrap_or_else(|| "N/A".to_string());
    log::info!("[CMD chat_with_moodjourney_cmd] Last turn content being sent to API (first 300 chars): {}", last_content_for_log);

    match suggestion::generate_chat_response_via_api(&api_request_contents).await {
        Ok(response_text) => {
            if response_text.trim().is_empty() {
                Err("The AI generated an empty response.".to_string())
            }
            else {
                db::save_chat_message(&current_session_id, "assistant", &response_text).map_err(|e| {
                    log::error!("Failed to save assistant message for session {}: {}", current_session_id, e);
                    e.to_string()
                })?;
                Ok(ChatCompletionResponse {
                    assistant_response: response_text,
                    session_id: current_session_id,
                })
            }
        }
        Err(e) => {
            log::error!("[CMD chat_with_moodjourney_cmd] Error generating chat response: {}", e);
            Err(format!("Failed to get response from MoodJourney: {}", e))
        }
    }
}

#[command]
async fn load_chat_sessions() -> Result<Vec<db::ChatSession>, String> {
    db::get_all_chat_sessions().map_err(|e| e.to_string())
}

#[command]
async fn load_messages_for_session_cmd(session_id: String) -> Result<Vec<db::ChatMessage>, String> {
    db::get_messages_for_session(&session_id).map_err(|e| e.to_string())
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
        .invoke_handler(tauri::generate_handler![create_entry, read_entries, get_entry, update_entry, classify_emotion, delete_entry, perform_dictation_cmd,
        upload_image_file, generate_suggestion_cmd, chat_with_moodjourney_cmd, load_chat_sessions, load_messages_for_session_cmd])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
