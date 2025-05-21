import requests
from pathlib import Path
import os

def download_model_dictation():
    model_url = "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin?download=true"
    try:
        script_dir = Path(__file__).resolve().parent
        project_root = script_dir if (script_dir / "src-tauri").is_dir() else script_dir.parent
        if not (project_root / "src-tauri").is_dir():
            project_root = Path(".") 
            if not (project_root / "src-tauri").is_dir():
                 print("Error: Could not reliably determine project root containing 'src-tauri'.")
                 print("Please run this script from your project's root directory or adjust the path logic.")
                 return
        target_dir = project_root / "src-tauri" / "models" / "dictation"
        file_name = "ggml-base.en.bin" 
        destination_path = target_dir / file_name
    except Exception as e:
        print(f"Error determining paths: {e}")
        target_dir = Path("./src-tauri/models/dictation")
        file_name = "ggml-base.en.bin"
        destination_path = target_dir / file_name
    print(f"Target directory: {target_dir.resolve()}")
    print(f"Destination path: {destination_path.resolve()}")

    try:
        target_dir.mkdir(parents=True, exist_ok=True)
        print(f"Ensured directory exists: {target_dir.resolve()}")
        if destination_path.exists():
            print(f"Model file {file_name} already exists in {target_dir.resolve()}. Skipping download.")
            return
        print(f"Downloading {file_name} from {model_url}...")
        response = requests.get(model_url, stream=True, timeout=300) 
        response.raise_for_status()  
        total_size = int(response.headers.get('content-length', 0))
        block_size = 1024  
        with open(destination_path, "wb") as f:
            downloaded_size = 0
            for chunk in response.iter_content(chunk_size=block_size):
                if chunk:  
                    f.write(chunk)
                    downloaded_size += len(chunk)
                    if total_size > 0:
                        done = int(50 * downloaded_size / total_size)
                        print(f"\r[{'=' * done}{' ' * (50-done)}] {downloaded_size/1024/1024:.2f} MB / {total_size/1024/1024:.2f} MB", end='')
            print() 
        if total_size != 0 and downloaded_size < total_size:
            print(f"ERROR: Incomplete download for {destination_path.name}. Expected {total_size} bytes, got {downloaded_size} bytes.")
            if destination_path.exists():
                os.remove(destination_path) 
        else:
            print(f"Successfully downloaded {file_name} to {destination_path.resolve()}")
    except requests.exceptions.RequestException as e:
        print(f"Error downloading model: {e}")
        if destination_path.exists() and os.path.getsize(destination_path) < total_size : 
            os.remove(destination_path) 
    except IOError as e:
        print(f"Error writing file {destination_path.name}: {e}")
        if destination_path.exists(): 
            os.remove(destination_path)
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        if destination_path.exists(): 
             if total_size == 0 or (total_size > 0 and os.path.getsize(destination_path) < total_size):
                os.remove(destination_path)

if __name__ == "__main__":
    download_model_dictation()