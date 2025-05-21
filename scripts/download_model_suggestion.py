import requests
from pathlib import Path
import os

suggestion_model_name = "openai-community/gpt2"
revision = "main"
suggestion_target_dir = Path(__file__).resolve().parent.parent / "src-tauri" / "models" / "suggestion"

files_to_download = [
    "config.json",
    "generation_config.json",
    "merges.txt",
    "pytorch_model.bin",
    "tokenizer_config.json",
    "tokenizer.json",
    "vocab.json",
]

def download_file(url: str, destination_path: Path):
    try:
        print(f"Downloading {url} to {destination_path}...")
        response = requests.get(url, stream=True, timeout=300)
        response.raise_for_status()
        total_size = int(response.headers.get('content-length', 0))
        block_size = 1024
        with open(destination_path, "wb") as f:
            downloaded_size = 0
            for data in response.iter_content(block_size):
                f.write(data)
                downloaded_size += len(data)
                done = int(50 * downloaded_size / total_size) if total_size else 0
                print(f"\r[{'=' * done}{' ' * (50-done)}] {downloaded_size/1024/1024:.2f} MB / {total_size/1024/1024:.2f} MB", end='' if downloaded_size < total_size else '\n')
        if total_size != 0 and downloaded_size < total_size:
            print(f"ERROR: Incomplete download for {destination_path}. Expected {total_size} bytes, got {downloaded_size} bytes.")
            return False
        print(f"Successfully downloaded {destination_path.name}.")
        return True
    except requests.exceptions.RequestException as e:
        print(f"Error downloading {url}: {e}")
        if destination_path.exists():
            os.remove(destination_path)
        return False
    except IOError as e:
        print(f"Error writing file {destination_path}: {e}")
        if destination_path.exists():
            os.remove(destination_path)
        return False

def main():
    all_files_exist = True
    for filename in files_to_download:
        if not (suggestion_target_dir / filename).exists():
            all_files_exist = False
            print(f"File {filename} not found in {suggestion_target_dir.resolve()}.")
            break
    if all_files_exist:
        print(f"All model files already seem to exist in {suggestion_target_dir.resolve()}. Skipping download.")
        return
    print(f"One or more model files missing. Downloading model '{suggestion_model_name}' to {suggestion_target_dir.resolve()}...")
    try:
        suggestion_target_dir.mkdir(parents=True, exist_ok=True)
        print(f"Ensured directory {suggestion_target_dir.resolve()} exists.")
        base_url = f"https://huggingface.co/{suggestion_model_name}/resolve/{revision}/"
        all_downloads_successful = True
        for filename in files_to_download:
            file_url = f"{base_url}{filename}?download=true"
            destination_path = suggestion_target_dir / filename
            if destination_path.exists():
                print(f"File {filename} already exists. Skipping.")
                continue
            if not download_file(file_url, destination_path):
                all_downloads_successful = False
                print(f"Failed to download {filename}. Halting further downloads for this model.")
                break
        if all_downloads_successful:
            print(f"All files for model '{suggestion_model_name}' downloaded successfully to {suggestion_target_dir.resolve()}.")
        else:
            print(f"Failed to download all necessary files for model '{suggestion_model_name}'. Please check the errors above.")
            print("You might need to manually clean up the target directory and try again.")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        print("Please check the model name, your internet connection, and file permissions.")

if __name__ == "__main__":
    main()
