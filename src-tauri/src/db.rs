use rusqlite::{params, Connection, Result};
use rusqlite::OptionalExtension;
use rusqlite::{Error};       
use rusqlite::ffi;                   
use serde::{Deserialize, Serialize};
use chrono::Local;
use chrono::NaiveDate;
use chrono::Utc;

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

pub fn init_db() -> Result<()> {
    let conn = Connection::open("entries.db")?;
    conn.execute(
        "CREATE TABLE IF NOT EXISTS entries (
            date TEXT NOT NULL,
            title TEXT NOT NULL,
            content TEXT,
            password TEXT,
            image TEXT
        )",
        [],
    )?;
    conn.execute(
        "CREATE TABLE IF NOT EXISTS assistant_chat_sessions (
            id TEXT PRIMARY KEY, -- Unique ID for the chat session (e.g., UUID)
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            last_modified_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            title TEXT -- A title for the chat, could be first user message snippet
        )",
        [],
    )?;
    conn.execute(
        "CREATE TABLE IF NOT EXISTS assistant_chat_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            sender TEXT NOT NULL, -- 'user' or 'assistant'
            content TEXT NOT NULL,
            timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES assistant_chat_sessions(id) ON DELETE CASCADE
        )",
        [],
    )?;
    Ok(())
}

pub fn add_entry(entry: Entry) -> Result<()> {
    if NaiveDate::parse_from_str(&entry.date, "%Y-%m-%d").is_err() {
        return Err(Error::SqliteFailure(
            ffi::Error {
                code: ffi::ErrorCode::ConstraintViolation,
                extended_code: ffi::ErrorCode::ConstraintViolation as i32,
            },
            Some("Date must be a valid YYYY-MM-DD format".to_string()),
        ));
    }

    let fetched = get_entry_by_date(entry.date.as_str())?;
    if fetched.is_some() {
        return Err(Error::SqliteFailure(
            ffi::Error {
                code: ffi::ErrorCode::ConstraintViolation,
                extended_code: ffi::ErrorCode::ConstraintViolation as i32, 
            },
            Some("Entry with this date already exists".to_string()),
        ));
    }

    let conn = Connection::open("entries.db")?;
    conn.execute(
        "INSERT INTO entries (date, title, content, password, image) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![entry.date, entry.title.as_ref(), entry.content, entry.password, entry.image],
    )?;
    Ok(())
}

pub fn get_entries() -> Result<Vec<Entry>> {
    let conn = Connection::open("entries.db")?;
    let mut stmt = conn.prepare("SELECT date, title, content, password, image FROM entries")?;
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
    for entry in entry_iter {
        entries.push(entry?);
    }

    Ok(entries)
}

pub fn get_entry_by_date(date: &str) -> Result<Option<Entry>> {
    let conn = Connection::open("entries.db")?;
    let mut stmt = conn.prepare("SELECT date, title, content, password, image FROM entries WHERE date = ?1")?;

    let entry = stmt.query_row([date], |row| {
        Ok(Entry {
            date: row.get(0)?,
            title: row.get(1)?,
            content: row.get(2)?,
            password: row.get(3)?,
            image: row.get(4)?,
        })
    }).optional()?;

    Ok(entry)
}

pub fn update_entry_by_date(date: &str, new_title: &str, new_content: Option<&str>, new_password: Option<&str>, new_image: Option<&str>) -> Result<()> {
    let conn = Connection::open("entries.db")?;
    conn.execute(
        "UPDATE entries SET title = ?1, content = ?2, password = ?3, image = ?4 WHERE date = ?5",
        params![new_title, new_content, new_password, new_image, date],
    )?;
    Ok(())
}

pub fn delete_entry_by_date(date: &str) -> Result<()> {
    let conn = Connection::open("entries.db")?;
    conn.execute("DELETE FROM entries WHERE date = ?1", [date])?;
    Ok(())
}

pub fn create_entry_with_now(title: &str, content: Option<&str>, password: Option<&str>, image: Option<&str>) -> Result<()> {
    let date = Local::now().format("%Y-%m-%d").to_string();
    let entry = Entry {
        date,
        title: Some(title.to_string()),
        content: content.map(|s| s.to_string()),
        password: password.map(|s| s.to_string()),
        image: image.map(|s| s.to_string()),
    };
    add_entry(entry)
}

pub fn create_new_chat_session() -> Result<String> {
    let conn = Connection::open("entries.db")?;
    let session_id = uuid::Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339(); // Or Local::now()
    conn.execute(
        "INSERT INTO assistant_chat_sessions (id, created_at, last_modified_at) VALUES (?1, ?2, ?3)",
        params![session_id, now, now],
    )?;
    Ok(session_id)
}

pub fn save_chat_message(session_id: &str, sender: &str, content: &str) -> Result<()> {
    let conn = Connection::open("entries.db")?;
    let now = Utc::now().to_rfc3339();

    if sender == "user" {
        let current_title: Option<String> = conn.query_row(
            "SELECT title FROM assistant_chat_sessions WHERE id = ?1",
            params![session_id],
            |row| row.get::<_, Option<String>>(0),
        )
        .optional()?
        .flatten();

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

pub fn get_all_chat_sessions() -> Result<Vec<ChatSession>> {
    let conn = Connection::open("entries.db")?;
    let mut stmt = conn.prepare("SELECT id, created_at, last_modified_at, title FROM assistant_chat_sessions ORDER BY last_modified_at DESC")?;
    let iter = stmt.query_map([], |row| {
        Ok(ChatSession {
            id: row.get(0)?,
            created_at: row.get(1)?,
            last_modified_at: row.get(2)?,
            title: row.get(3).optional()?,
        })
    })?;
    let mut sessions = Vec::new();
    for session in iter {
        sessions.push(session?);
    }
    Ok(sessions)
}

pub fn get_messages_for_session(session_id: &str) -> Result<Vec<ChatMessage>> {
    let conn = Connection::open("entries.db")?;
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
    let mut messages = Vec::new();
    for msg in iter {
        messages.push(msg?);
    }
    Ok(messages)
}

pub fn delete_chat_session(session_id: &str) -> Result<()> {
    let conn = Connection::open("entries.db")?;
    conn.execute("DELETE FROM assistant_chat_sessions WHERE id = ?1", params![session_id])?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn test_add_and_get_entries() {
        let _ = fs::remove_file("entries.db");

        init_db().expect("Failed to init DB");

        let new_entry = Entry {
            date: "2025-04-20".to_string(),
            title: "Test Title".to_string(),
            content: Some("Test Content".to_string()),
            password: Some("1234".to_string()),
            image: Some("images/test_image.jpg".to_string()),
        };

        add_entry(new_entry).expect("Failed to add entry");

        let entries = get_entries().expect("Failed to get entries");
        assert!(entries.len() > 0);
    }

    #[test]
    fn test_get_update_delete_entry_by_date() {
        let _ = fs::remove_file("entries.db");
        init_db().expect("init failed");

        let entry = Entry {
            date: "2025-04-21".to_string(),
            title: "Initial Title".to_string(),
            content: Some("Initial Content".to_string()),
            password: Some("initpass".to_string()),
            image: None,
        };

        add_entry(entry).expect("add failed");

        let fetched = get_entry_by_date("2025-04-21").expect("get failed").expect("no entry");
        assert_eq!(fetched.title, "Initial Title");
        assert!(fetched.image.is_none());

        update_entry_by_date("2025-04-21", "Updated", Some("Updated Content"), Some("newpass"), None)
            .expect("update failed");

        let updated = get_entry_by_date("2025-04-21").expect("get failed").expect("no entry");
        assert_eq!(updated.title, "Updated");
        assert_eq!(updated.content.as_deref(), Some("Updated Content"));

        delete_entry_by_date("2025-04-21").expect("delete failed");

        let deleted = get_entry_by_date("2025-04-21").expect("get failed");
        assert!(deleted.is_none());
    }

}
