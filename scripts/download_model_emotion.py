from transformers import AutoTokenizer, AutoModelForSequenceClassification
from pathlib import Path
import os

emotion_model_name = "j-hartmann/emotion-english-distilroberta-base"
emotion_target_dir = Path(__file__).resolve().parent.parent / "src-tauri" / "models" / "emotion"

# Download and save the model and tokenizer
tokenizer_emotion = AutoTokenizer.from_pretrained(emotion_model_name)
model_emotion = AutoModelForSequenceClassification.from_pretrained(emotion_model_name)

emotion_target_dir.mkdir(parents=True, exist_ok=True)

tokenizer_emotion.save_pretrained(emotion_target_dir)
model_emotion.save_pretrained(emotion_target_dir)

print(f"Emotion model and tokenizer saved to {emotion_target_dir.resolve()}")