import torch
from pathlib import Path

# MODEL_FILE_NAME = "pytorch_model_transformed.bin"
MODEL_FILE_NAME = "pytorch_model_transformed.bin"
MODEL_DIRECTORY = Path(__file__).resolve().parent.parent / "src-tauri" / "models" / "suggestion"

model_file_path = MODEL_DIRECTORY / MODEL_FILE_NAME

print(f"Attempting to inspect model file: {model_file_path.resolve()}")

if model_file_path.exists():
    try:
        if MODEL_FILE_NAME.endswith(".bin"):
            print(f"Loading PyTorch state dictionary from: {model_file_path}")
            state_dict = torch.load(model_file_path, map_location=torch.device('cpu'))
        elif MODEL_FILE_NAME.endswith(".safetensors"):
            print(f"Loading SafeTensors file from: {model_file_path}")
            from safetensors.torch import load_file
            state_dict = load_file(model_file_path, device="cpu")
        else:
            print(f"Unsupported model file extension: {MODEL_FILE_NAME}")
            exit()
        print("\nTensor names (keys) found in the model file:")
        found_problematic_tensor = False
        problematic_tensor_name = "transformer.h.1.attn.bias"
        similar_keys = []
        for key in state_dict.keys():
            print(key)
            if key == problematic_tensor_name:
                found_problematic_tensor = True
            if "transformer.h.1.attn" in key:
                similar_keys.append(key)
        print("-" * 30)
        if found_problematic_tensor:
            print(f"SUCCESS: The expected tensor '{problematic_tensor_name}' was found in the file.")
        else:
            print(f"ERROR: The expected tensor '{problematic_tensor_name}' was NOT found in the file.")
            if similar_keys:
                print("\nFound these similar tensor keys which might be helpful:")
                for skey in similar_keys:
                    print(skey)
            else:
                print("No similar tensor keys related to 'transformer.h.1.attn' were found either.")
        print("-" * 30)
    except Exception as e:
        print(f"An error occurred while trying to load or inspect the model file: {e}")
        print("Ensure PyTorch is installed (`pip install torch`) and 'safetensors' (`pip install safetensors`) if you are loading a .safetensors file.")
else:
    print(f"Model file not found at: {model_file_path.resolve()}")
    print("Please ensure the path is correct, the model file name is correct, and the model has been downloaded by download_model.py to this location.")