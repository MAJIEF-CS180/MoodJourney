use moodjourney_lib::db::{
    Entry, init_db, add_entry, create_entry_with_now, get_entries, get_entry_by_date, update_entry_by_date, delete_entry_by_date,
};
use moodjourney_lib::password::{ 
    self,
    PasswordState,
};
use std::env;
use std::io::{self, Write};
use std::path::PathBuf;
use std::sync::Mutex;
use std::fs;


fn main() {
    let args: Vec<String> = env::args().collect();

    let password_file_path: PathBuf = match dirs::config_dir() {
        Some(mut config_path) => {
            config_path.push("com.moodjourney.app");
            if !config_path.exists() {
                if let Err(_e) = fs::create_dir_all(&config_path) {
                    eprintln!("Failed to create directory. Password functionality will fail.");
                    PathBuf::new()
                }
                else {
                    config_path.push("password.json");
                    config_path
                }
            }
            else {
                config_path.push("password.json");
                config_path
            }
        }
        None => {
            eprintln!("Failed to create directory. Password functionality will fail.");
            PathBuf::new()
        }
    };

    if password_file_path.as_os_str().is_empty() {
        eprintln!("Failed to proceed with password operations due to config path issues.");
    }

    let password_state_instance = PasswordState::load_from_path(password_file_path.clone());
    let password_state_mutex = Mutex::new(password_state_instance);

    if args.len() < 2 {
        eprintln!("Usage: cli <command> [args]");
        return;
    }

    let command = args[1].as_str();

    match command {
        "init" => {
            init_db().expect("Failed to init DB");
            println!("Database initialized.");
        }
        "add" => {
            let date = args.get(2).expect("Need date");
            let title = args.get(3).expect("Need title");
            let content = args.get(4);
            let password = args.get(5);
            let entry = Entry {
                date: date.to_string(),
                title: Some(title.to_string()),
                content: content.map(|s| s.to_string()),
                password: password.map(|s| s.to_string()),
                image: None,
            };
            match add_entry(entry) {
                Ok(_) => println!("Entry added for date: {}", date),
                Err(e) => eprintln!("Failed to add entry: {}", e),
            }
        }
        "create" => {
            let title = args.get(2).expect("Need title");
            let content = args.get(3).map(|s| s.as_str());
            let password = args.get(4).map(|s| s.as_str());

            create_entry_with_now(title, content, password, None).expect("Failed to create");
            println!("Entry added.");
        }
        "get" => {
            let date = args.get(2).expect("Need date");
            match get_entry_by_date(date).expect("Failed to get") {
                Some(entry) => println!("{:#?}", entry),
                None => println!("No entry found."),
            }
        }
        "update" => {
            let date = args.get(2).expect("Need date");
            let title = args.get(3).expect("Need title");
            let content = args.get(4).map(|s| s.as_str());
            let password = args.get(5).map(|s| s.as_str());

            update_entry_by_date(date, title, content, password, None).expect("Failed to update");
            println!("Entry updated.");
        }
        "delete" => {
            let date = args.get(2).expect("Need date");
            delete_entry_by_date(date).expect("Failed to delete");
            println!("Entry deleted.");
        }
        "list" => {
            let entries = get_entries().expect("Failed to list");
            for entry in entries {
                println!("{:#?}", entry);
            }
        }
        "newpass" => {
            print!("New Password: ");
            io::stdout().flush().unwrap();
            let mut pwd = String::new();
            io::stdin().read_line(&mut pwd).unwrap();
            password::set_password(&password_state_mutex, pwd.trim());
            if password::is_locked(&password_state_mutex) {
                println!("Password set and locked.");
            } else {
                println!("Password cleared.");
            }
        }
        "auth" => {
            print!("Enter Password: ");
            io::stdout().flush().unwrap();
            let mut pwd = String::new();
            io::stdin().read_line(&mut pwd).unwrap();
            if password::check_password(&password_state_mutex, pwd.trim()) {
                println!("Unlocked.");
            } else {
                println!("Incorrect password.");
            }
        }
        "lock" => {
            password::set_locked(&password_state_mutex, true);
            println!("Locked.");
        }
        "lockstatus" => {
            let locked = password::is_locked(&password_state_mutex);
            println!("Locked: {}", locked);
        }
        _ => {
            eprintln!("Unknown command.");
        }
    }
}
