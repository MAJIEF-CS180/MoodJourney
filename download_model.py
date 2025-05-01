from transformers import AutoTokenizer, AutoModelForSequenceClassification
import os

model_name = "j-hartmann/emotion-english-distilroberta-base"
target_dir = "./models/emotion"

# Download and save the model and tokenizer
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForSequenceClassification.from_pretrained(model_name)

tokenizer.save_pretrained(target_dir)
model.save_pretrained(target_dir)
