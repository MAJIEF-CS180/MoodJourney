use sha2::{Digest, Sha256};
use serde::{Serialize, Deserialize};
use std::fs::{self, File};
use std::io::{Read, Write};
use std::path::PathBuf;
use std::sync::Mutex;

#[derive(Serialize, Deserialize, Debug)]
pub struct PasswordData {
    pub password_hash: Option<String>,
    pub locked: bool,
}

#[derive(Debug)]
pub struct PasswordState {
    pub path: PathBuf,
    pub password_data: PasswordData,
}

impl PasswordState {
    pub fn load_from_path(specific_path: PathBuf) -> Self {
        if let Some(parent_dir) = specific_path.parent() {
            let _ = fs::create_dir_all(parent_dir);
        }

        let password_data = if specific_path.exists() {
            match File::open(&specific_path) {
                Ok(mut file) => {
                    let mut contents = String::new();
                    if file.read_to_string(&mut contents).is_ok() {
                        serde_json::from_str(&contents).unwrap_or_else(|_e| {
                            PasswordData { password_hash: None, locked: false }
                        })
                    }
                    else {
                        PasswordData { password_hash: None, locked: false }
                    }
                }
                Err(_e) => {
                    PasswordData { password_hash: None, locked: false }
                }
            }
        }
        else {
            PasswordData {
                password_hash: None,
                locked: false,
            }
        };

        PasswordState {
            path: specific_path,
            password_data,
        }
    }

    fn save(&self) {
        match serde_json::to_string_pretty(&self.password_data) {
            Ok(data) => {
                match File::create(&self.path) {
                    Ok(mut file) => {
                        if let Err(_e) = file.write_all(data.as_bytes()) {
                            eprintln!("Error writing to password file {:?}: {}", self.path, _e);
                        }
                    }
                    Err(_e) => {
                        eprintln!("Failed to create/truncate password file {:?}: {}", self.path, _e);
                    }
                }
            }
            Err(_e) => {
                eprintln!("Error serializing password data: {}", _e);
            }
        }
    }

    fn hash_password(password: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(password.as_bytes());
        format!("{:x}", hasher.finalize())
    }

    pub fn set_locked_internal(&mut self, locked: bool) {
        self.password_data.locked = locked;
        self.save();
    }

    pub fn check_password_internal(&mut self, attempt: &str) -> bool {
        if let Some(ref hash) = self.password_data.password_hash {
            let attempt_hash = Self::hash_password(attempt);
            if *hash == attempt_hash {
                self.password_data.locked = false;
                self.save();
                return true;
            }
        }
        false
    }

    pub fn set_password_internal(&mut self, new_password: &str) {
        if new_password.is_empty() {
            self.password_data.password_hash = None;
            self.password_data.locked = false;
        }
        else {
            self.password_data.password_hash = Some(Self::hash_password(new_password));
            self.password_data.locked = true;
        }
        self.save();
    }

    pub fn is_pin_set_internal(&self) -> bool {
        self.password_data.password_hash.is_some()
    }
    
    pub fn is_locked_internal(&self) -> bool {
        if self.is_pin_set_internal() {
            self.password_data.locked
        }
        else {
            false
        }
    }

    pub fn delete_pin_internal(&mut self) {
        self.password_data.password_hash = None;
        self.password_data.locked = false;
        self.save();
    }
}

pub fn set_locked(state_mutex: &Mutex<PasswordState>, locked: bool) {
    let mut state_guard = state_mutex.lock().unwrap_or_else(|poisoned| {
        poisoned.into_inner()
    });
    state_guard.set_locked_internal(locked);
}

pub fn is_locked(state_mutex: &Mutex<PasswordState>) -> bool {
    let state_guard = state_mutex.lock().unwrap_or_else(|poisoned| poisoned.into_inner());
    state_guard.is_locked_internal()
}

pub fn check_password(state_mutex: &Mutex<PasswordState>, attempt: &str) -> bool {
    let mut state_guard = state_mutex.lock().unwrap_or_else(|poisoned| poisoned.into_inner());
    state_guard.check_password_internal(attempt)
}

pub fn set_password(state_mutex: &Mutex<PasswordState>, new_password: &str) {
    let mut state_guard = state_mutex.lock().unwrap_or_else(|poisoned| poisoned.into_inner());
    state_guard.set_password_internal(new_password);
}

pub fn get_is_pin_set(state_mutex: &Mutex<PasswordState>) -> bool {
    let state_guard = state_mutex.lock().unwrap_or_else(|poisoned| poisoned.into_inner());
    state_guard.is_pin_set_internal()
}

pub fn do_delete_pin(state_mutex: &Mutex<PasswordState>) {
    let mut state_guard = state_mutex.lock().unwrap_or_else(|poisoned| poisoned.into_inner());
    state_guard.delete_pin_internal();
}
