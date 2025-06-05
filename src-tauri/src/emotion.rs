use rust_bert::pipelines::sequence_classification::{SequenceClassificationModel, SequenceClassificationConfig};
use rust_bert::resources::LocalResource;
use rust_bert::pipelines::common::ModelType;
use tch::Device;
use std::path::PathBuf;
use anyhow::{Result, anyhow};

pub struct EmotionModel {
    model: SequenceClassificationModel,
}

impl EmotionModel {
    pub fn new(model_base_path: PathBuf) -> Result<Self> {
        log::info!("[EmotionModel] Loading emotion model from base path: {:?}", model_base_path);

        let config_path = model_base_path.join("config.json");
        let vocab_path = model_base_path.join("vocab.json");
        let merges_path = model_base_path.join("merges.txt"); 
        let model_weights_path = model_base_path.join("model.safetensors"); 

        if !config_path.exists() {
            return Err(anyhow!("Emotion model config.json not found at {:?}", config_path));
        }
        if !vocab_path.exists() {
            return Err(anyhow!("Emotion model vocab.json not found at {:?}", vocab_path));
        }
        if !merges_path.exists() {
            return Err(anyhow!("Emotion model merges.txt not found at {:?}", merges_path));
        }
        if !model_weights_path.exists() {
            return Err(anyhow!("Emotion model model.safetensors not found at {:?}", model_weights_path));
        }

        let config_resource = LocalResource { local_path: config_path };
        let vocab_resource = LocalResource { local_path: vocab_path };
        let merges_resource = LocalResource { local_path: merges_path };
        let model_resource = LocalResource { local_path: model_weights_path }; 

        let device = Device::Cpu; 
        log::info!("[EmotionModel] Using device: {:?}", device);

        let classification_config = SequenceClassificationConfig {
            model_type: ModelType::Roberta, 
            model_resource: rust_bert::pipelines::common::ModelResource::Torch(Box::new(model_resource)),
            config_resource: Box::new(config_resource),
            vocab_resource: Box::new(vocab_resource),
            merges_resource: Some(Box::new(merges_resource)), 
            device,
            ..Default::default() 
        };

        log::info!("[EmotionModel] Initializing SequenceClassificationModel...");
        let model = SequenceClassificationModel::new(classification_config)
            .map_err(|e| anyhow!("Failed to create SequenceClassificationModel: {}", e))?;
        
        log::info!("[EmotionModel] SequenceClassificationModel initialized successfully.");
        Ok(Self { model })
    }

    pub fn classify(&self, text: &str) -> Result<String> {
        if text.trim().is_empty() {
            log::warn!("[EmotionModel] Attempted to classify with an empty text.");
            return Err(anyhow!("Input text for emotion classification cannot be empty."));
        }
        log::debug!("[EmotionModel] Classifying emotion for text: \"{}\"", text.trim());

        let input = [text.trim()];
        let output = self.model.predict(&input);

        if let Some(label) = output.get(0) {
            log::info!("[EmotionModel] Classified emotion: \"{}\" with confidence {}", label.text, label.score);
            Ok(label.text.clone())
        } else {
            log::error!("[EmotionModel] Failed to classify emotion for text: \"{}\". No output from model.", text.trim());
            Err(anyhow!("Failed to classify emotion: No output from model."))
        }
    }
}

#[tauri::command]
pub fn classify_emotion(
    text: String,
    emotion_model_state: tauri::State<'_, crate::AppEmotionModel>, 
) -> Result<String, String> {
    log::debug!("[CMD classify_emotion] Received text: \"{}\"", text);
    let model_wrapper_arc = &emotion_model_state.inner().0; 
    let emotion_model_in_wrapper = &model_wrapper_arc.0;   
    
    match emotion_model_in_wrapper.classify(&text) {
        Ok(emotion) => Ok(emotion),
        Err(e) => {
            log::error!("[CMD classify_emotion] Error classifying emotion: {}", e);
            Err(format!("Failed to classify emotion: {}", e))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;
    use anyhow::Result;

    fn get_dev_emotion_model_path_for_tests() -> Result<PathBuf> {
        let current_dir = std::env::current_dir().expect("Failed to get current directory.");
        let project_root_marker = "src-tauri";

        let mut search_path = current_dir.clone();
        while !search_path.join(project_root_marker).is_dir() {
            if !search_path.pop() {
                if current_dir.join(project_root_marker).is_dir() {
                    search_path = current_dir;
                    break;
                }
                return Err(anyhow::anyhow!(
                    "Project root 'src-tauri' not found from {}.",
                    current_dir.display()
                ));
            }
        }

        let model_path = search_path.join(project_root_marker).join("models").join("emotion");

        if !model_path.exists() {
            return Err(anyhow::anyhow!(
                "Model dir not found at {}. Base: {}, Current: {}",
                model_path.display(),
                search_path.display(),
                std::env::current_dir().unwrap_or_default().display()
            ));
        }
        Ok(model_path)
    }

    #[test]
    fn test_emotion_classification_basic_joy() -> Result<()> {
        let model_path = get_dev_emotion_model_path_for_tests()?;
        let emotion_model = EmotionModel::new(model_path)?;

        let text = "I am feeling wonderful and excited today!";
        let result = emotion_model.classify(text);

        assert!(result.is_ok(), "Classification failed: {:?}", result.err());
        let classification = result.unwrap();
        assert!(!classification.is_empty(), "Result empty.");
        let known_labels = vec!["anger", "disgust", "fear", "joy", "neutral", "sadness", "surprise"];
        assert!(known_labels.contains(&classification.to_lowercase().as_str()), "Unexpected label: {}", classification);
        Ok(())
    }

    #[test]
    fn test_emotion_classification_empty_input() -> Result<()> {
        let model_path = get_dev_emotion_model_path_for_tests()?;
        let emotion_model = EmotionModel::new(model_path)?;

        let text = "";
        let result = emotion_model.classify(text);

        assert!(result.is_err(), "Classification succeeded for empty text.");
        if let Err(e) = result {
            assert!(e.to_string().contains("Input text for emotion classification cannot be empty."), "Wrong error for empty input: {}.", e);
        }
        Ok(())
    }

    #[test]
    fn test_emotion_classification_sadness_example() -> Result<()> {
        let model_path = get_dev_emotion_model_path_for_tests()?;
        let emotion_model = EmotionModel::new(model_path)?;

        let text = "I feel so lonely and down today.";
        let result = emotion_model.classify(text);
        assert!(result.is_ok(), "Classification failed for sadness: {:?}", result.err());
        let classification = result.unwrap();
        assert!(!classification.is_empty());
        assert_eq!(classification.to_lowercase(), "sadness", "Expected 'sadness' for '{}', got '{}'", text, classification);
        Ok(())
    }

    #[test]
    fn test_emotion_classification_anger_example() -> Result<()> {
        let model_path = get_dev_emotion_model_path_for_tests()?;
        let emotion_model = EmotionModel::new(model_path)?;

        let text = "This is making me really angry and frustrated!";
        let result = emotion_model.classify(text);
        assert!(result.is_ok(), "Classification failed for anger: {:?}", result.err());
        let classification = result.unwrap();
        assert!(!classification.is_empty());
        assert_eq!(classification.to_lowercase(), "anger", "Expected 'anger' for '{}', got '{}'", text, classification);
        Ok(())
    }
}
