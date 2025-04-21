#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod db;
use db::{
    init_db, create_entry_with_now, get_entries, get_entry_by_date, update_entry_by_date, delete_entry_by_date, Entry,
};

use tauri::{command};

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

fn main() {
    init_db().expect("Failed to initialize database");

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![create_entry, read_entries])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
