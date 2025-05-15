use rusqlite::{params, Connection, Result};
use rusqlite::OptionalExtension;
use rusqlite::{Error};       
use rusqlite::ffi;                   
use serde::{Deserialize, Serialize};
use chrono::Local;
use chrono::NaiveDate;

#[derive(Debug, Serialize, Deserialize)]
pub struct Entry {
    pub date: String,
    pub title: String,
    pub content: Option<String>,
    pub password: Option<String>,
    pub image: Option<String>,
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
        params![entry.date, entry.title, entry.content, entry.password, entry.image],
    )?;
    Ok(())
}

pub fn get_entries() -> Result<Vec<Entry>> {
    let conn = Connection::open("entries.db")?;
    let mut stmt = conn.prepare("SELECT date, title, content, password, image FROM entries")?;
    let entry_iter = stmt.query_map([], |row| {
        Ok(Entry {
            date: row.get(0)?,
            title: row.get(1)?,
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
        title: title.to_string(),
        content: content.map(|s| s.to_string()),
        password: password.map(|s| s.to_string()),
        image: image.map(|s| s.to_string()),
    };
    add_entry(entry)
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
