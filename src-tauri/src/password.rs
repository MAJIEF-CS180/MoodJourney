use sha2::{Digest, Sha256};
use serde::{Serialize, Deserialize};
use std::fs::{self, File};
use std::io::{Read, Write};
use std::path::PathBuf;
use once_cell::sync::Lazy;
use std::sync::Mutex;

static PASSWORD_STATE: Lazy<Mutex<PasswordState>> = Lazy::new(|| {
    let state = PasswordState::load();
    Mutex::new(state)
});

#[derive(Serialize, Deserialize, Debug)]
struct PasswordData {
    password_hash: Option<String>,
    locked: bool,
}

#[derive(Debug)]
struct PasswordState {
    path: PathBuf,
    password_data: PasswordData,
}

impl PasswordState {
    fn load() -> Self {
        let path = dirs::config_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("moodjourney")
            .join("password.json");

        fs::create_dir_all(path.parent().unwrap()).ok();

        let password_data = if path.exists() {
            let mut file = File::open(&path).expect("Failed to open password file");
            let mut contents = String::new();
            file.read_to_string(&mut contents).ok();
            serde_json::from_str(&contents).unwrap_or(PasswordData {
                password_hash: None,
                locked: false,
            })
        } else {
            PasswordData {
                password_hash: None,
                locked: false,
            }
        };

        PasswordState {
            path,
            password_data,
        }
    }

    fn save(&self) {
        let data = serde_json::to_string_pretty(&self.password_data).unwrap();
        let mut file = File::create(&self.path).expect("Failed to write password file");
        file.write_all(data.as_bytes()).expect("Write error");
    }

    fn hash(password: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(password.as_bytes());
        format!("{:x}", hasher.finalize())
    }

    fn set_locked(&mut self, locked: bool) {
        self.password_data.locked = locked;
        self.save();
    }

    fn is_locked(&self) -> bool {
        self.password_data.locked
    }

    fn check_password(&mut self, attempt: &str) -> bool {
        if let Some(ref hash) = self.password_data.password_hash {
            let attempt_hash = Self::hash(attempt);
            if *hash == attempt_hash {
                self.password_data.locked = false;
                self.save();
                return true;
            }
        }
        false
    }

    fn set_password(&mut self, new_password: &str) {
        self.password_data.password_hash = Some(Self::hash(new_password));
        self.password_data.locked = false;
        if !new_password.is_empty() {
            self.password_data.locked = true;
        }
        self.save();
    }
}

pub fn set_locked(locked: bool) {
    let mut state = PASSWORD_STATE.lock().unwrap();
    state.set_locked(locked);
}

pub fn is_locked() -> bool {
    PASSWORD_STATE.lock().unwrap().is_locked()
}

pub fn check_password(attempt: &str) -> bool {
    PASSWORD_STATE.lock().unwrap().check_password(attempt)
}

pub fn set_password(password: &str) {
    PASSWORD_STATE.lock().unwrap().set_password(password);
}
