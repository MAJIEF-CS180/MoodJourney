use rusqlite::{params, Connection, Result};
use rusqlite::OptionalExtension;
use rusqlite::{Error as RusqliteError};       
use rusqlite::ffi;                   
use serde::{Deserialize, Serialize};
use chrono::Local;
use chrono::NaiveDate;
use chrono::Utc;
use std::path::Path;

#[derive(Debug, Serialize, Deserialize)]
pub struct Entry {
    pub date: String,
    pub title: Option<String>,
    pub content: Option<String>,
    pub password: Option<String>,
    pub image: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChatSession {
    pub id: String,
    pub created_at: String,
    pub last_modified_at: String,
    pub title: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChatMessage {
    pub id: i64,
    pub session_id: String,
    pub sender: String,
    pub content: String,
    pub timestamp: String,
}

pub fn init_db_at_path(db_file_path: &Path) -> Result<()> {
    let conn = Connection::open(db_file_path)?;
    conn.execute(
        "CREATE TABLE IF NOT EXISTS entries (
            date TEXT NOT NULL PRIMARY KEY, -- Added PRIMARY KEY for date consistency
            title TEXT NOT NULL,
            content TEXT,
            password TEXT,
            image TEXT
        )",
        [],
    )?;
    conn.execute(
        "CREATE TABLE IF NOT EXISTS assistant_chat_sessions (
            id TEXT PRIMARY KEY,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            last_modified_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            title TEXT
        )",
        [],
    )?;
    conn.execute(
        "CREATE TABLE IF NOT EXISTS assistant_chat_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            sender TEXT NOT NULL,
            content TEXT NOT NULL,
            timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES assistant_chat_sessions(id) ON DELETE CASCADE
        )",
        [],
    )?;
    Ok(())
}

// DO NOT USE THIS FUNCTION
#[allow(dead_code)]
pub fn init_db() -> Result<()> {
    let default_db_path = Path::new("entries.db"); 
    init_db_at_path(default_db_path)
}

pub fn add_entry_to_db(db_file_path: &Path, entry: Entry) -> Result<()> {
    if NaiveDate::parse_from_str(&entry.date, "%Y-%m-%d").is_err() {
        return Err(RusqliteError::SqliteFailure(
            ffi::Error {
                code: ffi::ErrorCode::ConstraintViolation,
                extended_code: ffi::ErrorCode::ConstraintViolation as i32,
            },
            Some("Date must be a valid YYYY-MM-DD format".to_string()),
        ));
    }

    let fetched = get_entry_by_date_from_db(db_file_path, entry.date.as_str())?;
    if fetched.is_some() {
        return Err(RusqliteError::SqliteFailure(
            ffi::Error {
                code: ffi::ErrorCode::ConstraintViolation,
                extended_code: ffi::ErrorCode::ConstraintViolation as i32, 
            },
            Some("Entry with this date already exists".to_string()),
        ));
    }

    let conn = Connection::open(db_file_path)?;
    conn.execute(
        "INSERT INTO entries (date, title, content, password, image) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![entry.date, entry.title.as_ref(), entry.content, entry.password, entry.image],
    )?;
    Ok(())
}

pub fn get_entries_from_db(db_file_path: &Path) -> Result<Vec<Entry>> {
    let conn = Connection::open(db_file_path)?;
    let mut stmt = conn.prepare("SELECT date, title, content, password, image FROM entries ORDER BY date DESC")?;
    let entry_iter = stmt.query_map([], |row| {
        Ok(Entry {
            date: row.get(0)?,
            title: row.get(1).optional()?,
            content: row.get(2)?,
            password: row.get(3)?,
            image: row.get(4)?,
        })
    })?;

    let mut entries = Vec::new();
    for entry_result in entry_iter {
        entries.push(entry_result?);
    }
    Ok(entries)
}

pub fn get_entry_by_date_from_db(db_file_path: &Path, date: &str) -> Result<Option<Entry>> {
    let conn = Connection::open(db_file_path)?;
    let mut stmt = conn.prepare("SELECT date, title, content, password, image FROM entries WHERE date = ?1")?;
    let entry = stmt.query_row([date], |row| {
        Ok(Entry {
            date: row.get(0)?,
            title: row.get(1).optional()?,
            content: row.get(2)?,
            password: row.get(3)?,
            image: row.get(4)?,
        })
    }).optional()?;
    Ok(entry)
}

pub fn update_entry_by_date_in_db(db_file_path: &Path, date: &str, new_title: Option<&str>, new_content: Option<&str>, new_password: Option<&str>, new_image: Option<&str>) -> Result<()> {
    let conn = Connection::open(db_file_path)?;
    conn.execute(
        "UPDATE entries SET title = ?1, content = ?2, password = ?3, image = ?4 WHERE date = ?5",
        params![new_title, new_content, new_password, new_image, date],
    )?;
    Ok(())
}

pub fn delete_entry_by_date_from_db(db_file_path: &Path, date: &str) -> Result<()> {
    let conn = Connection::open(db_file_path)?;
    conn.execute("DELETE FROM entries WHERE date = ?1", [date])?;
    Ok(())
}

pub fn create_entry_with_now_in_db(db_file_path: &Path, title: &str, content: Option<&str>, password: Option<&str>, image: Option<&str>) -> Result<()> {
    let date = Local::now().format("%Y-%m-%d").to_string();
    let entry = Entry {
        date,
        title: Some(title.to_string()),
        content: content.map(|s| s.to_string()),
        password: password.map(|s| s.to_string()),
        image: image.map(|s| s.to_string()),
    };
    add_entry_to_db(db_file_path, entry)
}

#[allow(dead_code)]
pub fn add_entry(entry: Entry) -> Result<()> {
    add_entry_to_db(Path::new("entries.db"), entry)
}

#[allow(dead_code)]
pub fn get_entries() -> Result<Vec<Entry>> {
    get_entries_from_db(Path::new("entries.db"))
}

#[allow(dead_code)]
pub fn get_entry_by_date(date: &str) -> Result<Option<Entry>> {
    get_entry_by_date_from_db(Path::new("entries.db"), date)
}

#[allow(dead_code)]
pub fn update_entry_by_date(date: &str, new_title: Option<&str>, new_content: Option<&str>, new_password: Option<&str>, new_image: Option<&str>) -> Result<()> {
    update_entry_by_date_in_db(Path::new("entries.db"), date, new_title, new_content, new_password, new_image)
}

#[allow(dead_code)]
pub fn delete_entry_by_date(date: &str) -> Result<()> {
    delete_entry_by_date_from_db(Path::new("entries.db"), date)
}

#[allow(dead_code)]
pub fn create_entry_with_now(title: &str, content: Option<&str>, password: Option<&str>, image: Option<&str>) -> Result<()> {
    create_entry_with_now_in_db(Path::new("entries.db"), title, content, password, image)
}

pub fn create_new_chat_session_in_db(db_file_path: &Path) -> Result<String> {
    let conn = Connection::open(db_file_path)?;
    let session_id = uuid::Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO assistant_chat_sessions (id, created_at, last_modified_at) VALUES (?1, ?2, ?3)",
        params![session_id, now, now],
    )?;
    Ok(session_id)
}

pub fn save_chat_message_in_db(db_file_path: &Path, session_id: &str, sender: &str, content: &str) -> Result<()> {
    let conn = Connection::open(db_file_path)?;
    let now = Utc::now().to_rfc3339();

    if sender == "user" {
        let current_title: Option<String> = conn.query_row(
            "SELECT title FROM assistant_chat_sessions WHERE id = ?1",
            params![session_id],
            |row| row.get::<_, Option<String>>(0),
        ).optional()?.flatten();

        if current_title.is_none() || current_title.as_deref() == Some("") {
             let new_title: String = content.chars().take(50).collect();
             let final_title = if content.chars().count() > 50 { format!("{}...", new_title) } else { new_title };
             conn.execute(
                 "UPDATE assistant_chat_sessions SET title = ?1, last_modified_at = ?2 WHERE id = ?3",
                 params![final_title, now, session_id],
             )?;
        }
        else {
             conn.execute(
                 "UPDATE assistant_chat_sessions SET last_modified_at = ?1 WHERE id = ?2",
                 params![now, session_id],
             )?;
        }
    }
    else {
         conn.execute(
             "UPDATE assistant_chat_sessions SET last_modified_at = ?1 WHERE id = ?2",
             params![now, session_id],
         )?;
    }

    conn.execute(
        "INSERT INTO assistant_chat_messages (session_id, sender, content, timestamp) VALUES (?1, ?2, ?3, ?4)",
        params![session_id, sender, content, now],
    )?;
    Ok(())
}

pub fn get_all_chat_sessions_from_db(db_file_path: &Path) -> Result<Vec<ChatSession>> {
    let conn = Connection::open(db_file_path)?;
    let mut stmt = conn.prepare("SELECT id, created_at, last_modified_at, title FROM assistant_chat_sessions ORDER BY last_modified_at DESC")?;
    let iter = stmt.query_map([], |row| {
        Ok(ChatSession {
            id: row.get(0)?,
            created_at: row.get(1)?,
            last_modified_at: row.get(2)?,
            title: row.get::<_, Option<String>>(3)?,
        })
    })?;
    iter.collect()
}

pub fn get_messages_for_session_from_db(db_file_path: &Path, session_id: &str) -> Result<Vec<ChatMessage>> {
    let conn = Connection::open(db_file_path)?;
    let mut stmt = conn.prepare("SELECT id, session_id, sender, content, timestamp FROM assistant_chat_messages WHERE session_id = ?1 ORDER BY timestamp ASC")?;
    let iter = stmt.query_map(params![session_id], |row| {
        Ok(ChatMessage {
            id: row.get(0)?,
            session_id: row.get(1)?,
            sender: row.get(2)?,
            content: row.get(3)?,
            timestamp: row.get(4)?,
        })
    })?;
    iter.collect()
}

pub fn delete_chat_session_from_db(db_file_path: &Path, session_id: &str) -> Result<()> {
    let conn = Connection::open(db_file_path)?;
    conn.execute("DELETE FROM assistant_chat_sessions WHERE id = ?1", params![session_id])?;
    Ok(())
}

#[allow(dead_code)]
pub fn create_new_chat_session() -> Result<String> {
    create_new_chat_session_in_db(Path::new("entries.db"))
}

#[allow(dead_code)]
pub fn save_chat_message(session_id: &str, sender: &str, content: &str) -> Result<()> {
    save_chat_message_in_db(Path::new("entries.db"), session_id, sender, content)
}

#[allow(dead_code)]
pub fn get_all_chat_sessions() -> Result<Vec<ChatSession>> {
    get_all_chat_sessions_from_db(Path::new("entries.db"))
}

#[allow(dead_code)]
pub fn get_messages_for_session(session_id: &str) -> Result<Vec<ChatMessage>> {
    get_messages_for_session_from_db(Path::new("entries.db"), session_id)
}

#[allow(dead_code)]
pub fn delete_chat_session(session_id: &str) -> Result<()> {
    delete_chat_session_from_db(Path::new("entries.db"), session_id)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::path::PathBuf;

    fn get_test_db_file_path(test_name: &str) -> PathBuf {
        let mut path = std::env::temp_dir();
        path.push("moodjourney_db_tests");
        
        fs::create_dir_all(&path).expect("Failed to create temporary test directory for DB");
        
        let file_name = format!("test_entries_{}.db", test_name); 
        path.push(file_name);

        if path.exists() {
            let _ = fs::remove_file(&path);
        }
        path
    }

    #[test]
    fn test_add_and_get_entries() {
        let db_path = get_test_db_file_path("add_and_get_entries");

        init_db_at_path(&db_path).expect("Failed to init DB at test path");

        let new_entry = Entry {
            date: "2025-04-20".to_string(),
            title: Some("Test Title".to_string()),
            content: Some("Test Content".to_string()),
            password: Some("1234".to_string()),
            image: Some("images/test_image.jpg".to_string()),
        };

        add_entry_to_db(&db_path, new_entry).expect("Failed to add entry");

        let entries = get_entries_from_db(&db_path).expect("Failed to get entries");
        
        assert!(entries.len() > 0, "Expected at least one entry after adding.");

        let _ = fs::remove_file(db_path);
    }

    #[test]
    fn test_get_update_delete_entry_by_date() {
        let db_path = get_test_db_file_path("get_update_delete_entry");

        init_db_at_path(&db_path).expect("init failed for test path");

        let entry = Entry {
            date: "2025-04-21".to_string(),
            title: Some("Initial Title".to_string()),
            content: Some("Initial Content".to_string()),
            password: Some("initpass".to_string()),
            image: None,
        };

        add_entry_to_db(&db_path, entry).expect("add failed");

        let fetched = get_entry_by_date_from_db(&db_path, "2025-04-21").expect("get failed").expect("no entry found after add");
        assert_eq!(fetched.title, Some("Initial Title".to_string()));
        assert!(fetched.image.is_none());

        update_entry_by_date_in_db(&db_path, "2025-04-21", Some("Updated"), Some("Updated Content"), Some("newpass"), None)
            .expect("update failed");

        let updated = get_entry_by_date_from_db(&db_path, "2025-04-21").expect("get failed").expect("no entry found after update");
        assert_eq!(updated.title, Some("Updated".to_string()));
        assert_eq!(updated.content.as_deref(), Some("Updated Content"));

        delete_entry_by_date_from_db(&db_path, "2025-04-21").expect("delete failed");

        let deleted = get_entry_by_date_from_db(&db_path, "2025-04-21").expect("get failed for deleted entry");
        assert!(deleted.is_none(), "Entry should be None after deletion.");

        let _ = fs::remove_file(db_path);
    }

    fn setup_db_for_chat_tests_internal_consistent(db_path: &Path) {
        if db_path.exists() {
            let _ = fs::remove_file(db_path);
        }
        init_db_at_path(db_path).expect("Failed to init DB for chat test");
    }

    #[test]
    fn test_create_and_get_chat_session_from_db() -> std::result::Result<(), String> {
        let db_path = get_test_db_file_path("create_and_get_chat_session");
        setup_db_for_chat_tests_internal_consistent(&db_path);

        let session_id = create_new_chat_session_in_db(&db_path).map_err(|e| e.to_string())?;
        assert!(!session_id.is_empty(), "Session ID empty.");

        let sessions = get_all_chat_sessions_from_db(&db_path).map_err(|e| e.to_string())?;
        assert_eq!(sessions.len(), 1, "Expected one session.");
        assert_eq!(sessions[0].id, session_id, "Session ID mismatch.");
        assert!(sessions[0].title.is_none(), "New session title not None.");

        let _ = fs::remove_file(&db_path);
        Ok(())
    }

    #[test]
    fn test_save_and_get_chat_messages_from_db() -> std::result::Result<(), String> {
        let db_path = get_test_db_file_path("save_and_get_chat_messages");
        setup_db_for_chat_tests_internal_consistent(&db_path);

        let session_id = create_new_chat_session_in_db(&db_path).map_err(|e| e.to_string())?;

        save_chat_message_in_db(&db_path, &session_id, "user", "Hello Assistant!").map_err(|e| e.to_string())?;
        save_chat_message_in_db(&db_path, &session_id, "assistant", "Hello User!").map_err(|e| e.to_string())?;

        let messages = get_messages_for_session_from_db(&db_path, &session_id).map_err(|e| e.to_string())?;
        assert_eq!(messages.len(), 2, "Expected two messages.");

        assert_eq!(messages[0].sender, "user");
        assert_eq!(messages[0].content, "Hello Assistant!");
        assert_eq!(messages[1].sender, "assistant");
        assert_eq!(messages[1].content, "Hello User!");

        assert!(messages[0].timestamp <= messages[1].timestamp, "Messages not ordered by timestamp.");

        let _ = fs::remove_file(&db_path);
        Ok(())
    }

    #[test]
    fn test_chat_session_title_update_on_first_user_message_in_db() -> std::result::Result<(), String> {
        let db_path = get_test_db_file_path("chat_session_title_update");
        setup_db_for_chat_tests_internal_consistent(&db_path);
        let session_id = create_new_chat_session_in_db(&db_path).map_err(|e| e.to_string())?;

        let first_message_content = "This is the very first message from the user.";
        save_chat_message_in_db(&db_path, &session_id, "user", first_message_content).map_err(|e| e.to_string())?;

        let sessions = get_all_chat_sessions_from_db(&db_path).map_err(|e| e.to_string())?;
        let session = sessions.iter().find(|s| s.id == session_id).expect("Session not found");
        
        let expected_title_prefix: String = first_message_content.chars().take(50).collect();
        let final_expected_title = if first_message_content.chars().count() > 50 { 
            format!("{}...", expected_title_prefix) 
        } else { 
            expected_title_prefix.clone() 
        };

        assert_eq!(session.title.as_ref().unwrap(), &final_expected_title, "Session title not set correctly.");

        save_chat_message_in_db(&db_path, &session_id, "assistant", "Okay, interesting.").map_err(|e| e.to_string())?;
        let sessions_after_assistant = get_all_chat_sessions_from_db(&db_path).map_err(|e| e.to_string())?;
        let session_after_assistant = sessions_after_assistant.iter().find(|s| s.id == session_id).expect("Session not found");
        assert_eq!(session_after_assistant.title.as_ref().unwrap(), &final_expected_title, "Session title changed after assistant message.");

        save_chat_message_in_db(&db_path, &session_id, "user", "Another user message.").map_err(|e| e.to_string())?;
        let sessions_after_second_user = get_all_chat_sessions_from_db(&db_path).map_err(|e| e.to_string())?;
        let session_after_second_user = sessions_after_second_user.iter().find(|s| s.id == session_id).expect("Session not found");
        assert_eq!(session_after_second_user.title.as_ref().unwrap(), &final_expected_title, "Session title changed after second user message.");

        let _ = fs::remove_file(&db_path);
        Ok(())
    }

    #[test]
    fn test_chat_session_title_truncation_in_db() -> std::result::Result<(), String> {
        let db_path = get_test_db_file_path("chat_session_title_truncation");
        setup_db_for_chat_tests_internal_consistent(&db_path);
        let session_id = create_new_chat_session_in_db(&db_path).map_err(|e| e.to_string())?;
        let long_message = "This is a very long first message that definitely exceeds the fifty character limit for the title of a chat session, it just keeps going on and on and on and on.";
        save_chat_message_in_db(&db_path, &session_id, "user", long_message).map_err(|e| e.to_string())?;

        let sessions = get_all_chat_sessions_from_db(&db_path).map_err(|e| e.to_string())?;
        let session = sessions.iter().find(|s| s.id == session_id).expect("Session not found");
        
        let expected_truncated_prefix: String = long_message.chars().take(50).collect();
        let expected_title_with_ellipsis = format!("{}...", expected_truncated_prefix);
        
        assert_eq!(session.title.as_ref().unwrap(), &expected_title_with_ellipsis, "Session title not truncated correctly.");

        let _ = fs::remove_file(&db_path);
        Ok(())
    }

    #[test]
    fn test_delete_chat_session_and_cascade_in_db() -> std::result::Result<(), String> {
        let db_path = get_test_db_file_path("delete_chat_session_cascade");
        setup_db_for_chat_tests_internal_consistent(&db_path);
        let session_id1 = create_new_chat_session_in_db(&db_path).map_err(|e| e.to_string())?;
        let session_id2 = create_new_chat_session_in_db(&db_path).map_err(|e| e.to_string())?;

        save_chat_message_in_db(&db_path, &session_id1, "user", "Hi from session 1").map_err(|e| e.to_string())?;
        save_chat_message_in_db(&db_path, &session_id1, "assistant", "Reply in session 1").map_err(|e| e.to_string())?;
        save_chat_message_in_db(&db_path, &session_id2, "user", "Hi from session 2").map_err(|e| e.to_string())?;

        delete_chat_session_from_db(&db_path, &session_id1).map_err(|e| e.to_string())?;

        let sessions = get_all_chat_sessions_from_db(&db_path).map_err(|e| e.to_string())?;
        assert_eq!(sessions.len(), 1, "Expected one session left.");
        assert_eq!(sessions[0].id, session_id2, "Wrong session deleted or ID incorrect.");

        let messages_for_deleted_session = get_messages_for_session_from_db(&db_path, &session_id1).map_err(|e| e.to_string())?;
        assert!(messages_for_deleted_session.is_empty(), "Messages for deleted session not gone.");
        
        let messages_for_remaining_session = get_messages_for_session_from_db(&db_path, &session_id2).map_err(|e| e.to_string())?;
        assert_eq!(messages_for_remaining_session.len(), 1, "Messages for remaining session incorrect.");
        assert_eq!(messages_for_remaining_session[0].content, "Hi from session 2");

        let _ = fs::remove_file(&db_path);
        Ok(())
    }
}
