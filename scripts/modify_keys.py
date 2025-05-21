import torch
import os
from pathlib import Path

MODEL_DIRECTORY = Path(__file__).resolve().parent.parent / "src-tauri" / "models" / "suggestion"
INPUT_MODEL_FILE_NAME = "pytorch_model.bin"
OUTPUT_MODEL_FILE_NAME = "pytorch_model_transformed.bin"

def modify_model_keys(model_path, output_path, prefix="transformer."):
    try:
        state_dict = torch.load(model_path, map_location=torch.device('cpu'))
        print(f"Successfully loaded model from: {model_path}")
        new_state_dict = {}
        modified_keys_count = 0
        print("\nOriginal tensor names (first 5 for brevity if many):")
        for i, key in enumerate(list(state_dict.keys())[:5]):
            print(key)
        if len(state_dict.keys()) > 5:
            print("...")
        for key, value in state_dict.items():
            new_key = prefix + key
            new_state_dict[new_key] = value
            modified_keys_count += 1
        print(f"\nModified {modified_keys_count} tensor names.")
        print("\nNew tensor names (first 5 for brevity if many):")
        for i, key in enumerate(list(new_state_dict.keys())[:5]):
            print(key)
        if len(new_state_dict.keys()) > 5:
            print("...")
        torch.save(new_state_dict, output_path)
        print(f"\nSuccessfully saved modified model to: {output_path}")

    except FileNotFoundError:
        print(f"ERROR: The file was not found at {model_path}")
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    input_model_file_path = MODEL_DIRECTORY / INPUT_MODEL_FILE_NAME
    output_model_file_path = MODEL_DIRECTORY / OUTPUT_MODEL_FILE_NAME
    print(f"Input model path: {input_model_file_path.resolve()}")
    print(f"Output model path: {output_model_file_path.resolve()}")
    if not input_model_file_path.exists():
        print(f"ERROR: Input model file not found at '{input_model_file_path.resolve()}'")
        print("Please ensure the path is correct.")
    else:
        output_dir = output_model_file_path.parent
        if not output_dir.exists():
            output_dir.mkdir(parents=True, exist_ok=True)
            print(f"Created output directory: {output_dir}")
        modify_model_keys(str(input_model_file_path), str(output_model_file_path))
        print("\n--- Verification (Optional) ---")
        print("Loading the new model file to check a few keys...")
        try:
            loaded_new_state_dict = torch.load(str(output_model_file_path), map_location=torch.device('cpu'))
            print("First 5 keys from the new model file:")
            for i, key in enumerate(list(loaded_new_state_dict.keys())[:5]):
                print(key)
            if len(loaded_new_state_dict.keys()) > 5:
                print("...")
            if list(loaded_new_state_dict.keys())[0].startswith("transformer."):
                print("Verification successful: Keys seem to be prefixed correctly.")
            else:
                print("Verification WARNING: Keys might not be prefixed as expected.")
        except Exception as e:
            print(f"Error during verification: {e}")
