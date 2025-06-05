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

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::path::PathBuf;
    use std::sync::Mutex;

    fn get_test_password_file_path(test_name: &str) -> PathBuf {
        let mut path = std::env::temp_dir();
        path.push("moodjourney_password_tests");

        fs::create_dir_all(&path).expect("Failed to create temporary test directory for passwords");
        
        let file_name = format!("password_state_for_{}.json", test_name);
        path.push(file_name);

        if path.exists() {
            let _ = fs::remove_file(&path);
        }
        
        path
    }

    fn create_test_password_state(test_name: &str) -> (Mutex<PasswordState>, PathBuf) {
        let path = get_test_password_file_path(test_name);
        let state = PasswordState::load_from_path(path.clone());
        (Mutex::new(state), path)
    }

    #[test]
    fn test_set_and_check_pin() {
        let (state_mutex, test_file_path) = create_test_password_state("set_and_check_pin");

        assert!(!get_is_pin_set(&state_mutex), "Initially, PIN should not be set.");
        assert!(!is_locked(&state_mutex), "Initially, should not be locked as no PIN is set.");

        set_password(&state_mutex, "1234");
        assert!(get_is_pin_set(&state_mutex), "PIN should be set after calling set_password.");
        assert!(is_locked(&state_mutex), "Should be locked after setting a new PIN.");
        
        assert!(check_password(&state_mutex, "1234"), "Correct PIN should pass verification.");
        assert!(!is_locked(&state_mutex), "Should be unlocked after correct PIN check.");

        set_locked(&state_mutex, true);
        assert!(is_locked(&state_mutex), "Should be locked after manual lock invocation.");
        assert!(!check_password(&state_mutex, "0000"), "Incorrect PIN should fail verification.");
        assert!(is_locked(&state_mutex), "Should remain locked after incorrect PIN attempt.");

        let _ = fs::remove_file(test_file_path);
    }

    #[test]
    fn test_manual_locking() {
        let (state_mutex, test_file_path) = create_test_password_state("manual_locking");
        
        set_password(&state_mutex, "5678");
        assert!(is_locked(&state_mutex), "Should be locked immediately after setting a PIN.");

        set_locked(&state_mutex, false);
        assert!(!is_locked(&state_mutex), "Should be unlocked after calling set_locked(false).");

        set_locked(&state_mutex, true);
        assert!(is_locked(&state_mutex), "Should be locked after calling set_locked(true).");

        let _ = fs::remove_file(test_file_path);
    }

    #[test]
    fn test_delete_pin() {
        let (state_mutex, test_file_path) = create_test_password_state("delete_pin");

        set_password(&state_mutex, "1122");
        assert!(get_is_pin_set(&state_mutex), "PIN should be set before deletion attempt.");
        assert!(is_locked(&state_mutex), "State should be locked after PIN is set.");

        do_delete_pin(&state_mutex);
        assert!(!get_is_pin_set(&state_mutex), "PIN should not be set after deletion.");
        assert!(!is_locked(&state_mutex), "State should be unlocked after PIN deletion.");
        
        assert!(!check_password(&state_mutex, "1122"), "Checking a deleted PIN should fail.");

        let _ = fs::remove_file(test_file_path);
    }

    #[test]
    fn test_empty_password_clears_pin() {
        let (state_mutex, test_file_path) = create_test_password_state("empty_password_clears_pin");

        set_password(&state_mutex, "1234");
        assert!(get_is_pin_set(&state_mutex), "PIN should be set initially.");
        assert!(is_locked(&state_mutex), "Should be locked with initial PIN.");

        set_password(&state_mutex, "");
        assert!(!get_is_pin_set(&state_mutex), "PIN should be cleared when an empty password is set.");
        assert!(!is_locked(&state_mutex), "Should be unlocked when PIN is cleared.");

        let _ = fs::remove_file(test_file_path);
    }

    #[test]
    fn test_is_locked_behavior_with_no_pin() {
        let (state_mutex, test_file_path) = create_test_password_state("is_locked_no_pin");

        assert!(!get_is_pin_set(&state_mutex));
        assert!(!is_locked(&state_mutex), "Should not be locked if no PIN is set, regardless of explicit calls to set_locked.");

        set_locked(&state_mutex, true);
        assert!(!is_locked(&state_mutex), "Calling set_locked(true) should not make it locked if no PIN is actually set.");

        let _ = fs::remove_file(test_file_path);
    }
}
