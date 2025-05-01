use rust_bert::pipelines::sequence_classification::SequenceClassificationModel;
use std::sync::OnceLock;

//static MODEL: OnceLock<SequenceClassificationModel> = OnceLock::new();

#[tauri::command]
pub fn classify_emotion(text: String) -> Result<String, String> {
    // Initialize the model each time the function is called
    let model = SequenceClassificationModel::new(Default::default())
        .map_err(|e| e.to_string())?;

    let output = model.predict(&[text.as_str()]);
    let emotion = output.get(0)
        .map(|res| res.text.clone())
        .unwrap_or_else(|| "Unknown".to_string());

    Ok(emotion)
}