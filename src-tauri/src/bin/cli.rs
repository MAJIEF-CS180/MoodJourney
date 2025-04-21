use moodjourney_lib::db::{
    init_db, create_entry_with_now, get_entries, get_entry_by_date, update_entry_by_date, delete_entry_by_date,
};
use std::env;

fn main() {
    let args: Vec<String> = env::args().collect();

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
        "create" => {
            let title = args.get(2).expect("Need title");
            let content = args.get(3).map(|s| s.as_str());
            let password = args.get(4).map(|s| s.as_str());

            create_entry_with_now(title, content, password).expect("Failed to create");
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

            update_entry_by_date(date, title, content, password).expect("Failed to update");
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
        _ => {
            eprintln!("Unknown command.");
        }
    }
}
