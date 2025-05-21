use rust_bert::gpt2::GPT2Generator;
use rust_bert::pipelines::generation_utils::{GenerateConfig, LanguageGenerator};
use rust_bert::resources::LocalResource;
use rust_bert::pipelines::common::ModelResource;
use std::path::PathBuf;
use tch::Device;
use anyhow::Result;

pub struct SuggestionModel {
    model: GPT2Generator,
}

impl SuggestionModel {
    pub fn new(model_base_path: PathBuf) -> Result<Self> {
        log::info!("[SuggestionModel] Loading suggestion model from base path: {:?}", model_base_path);

        let config_path = model_base_path.join("config.json");
        let vocab_path = model_base_path.join("vocab.json");
        let merges_path = model_base_path.join("merges.txt");
        let model_weights_path = model_base_path.join("pytorch_model_transformed.bin");

        if !config_path.exists() {
            return Err(anyhow::anyhow!("GPT-2 config.json not found at {:?}", config_path));
        }
        if !vocab_path.exists() {
            return Err(anyhow::anyhow!("GPT-2 vocab.json not found at {:?}", vocab_path));
        }
        if !merges_path.exists() {
             return Err(anyhow::anyhow!("GPT-2 merges.txt not found at {:?}", merges_path));
        }
        if !model_weights_path.exists() {
            return Err(anyhow::anyhow!("GPT-2 pytorch_model_transformed.bin not found at {:?}", model_weights_path));
        }

        let config_resource = LocalResource { local_path: config_path };
        let vocab_resource = LocalResource { local_path: vocab_path };
        let merges_resource = LocalResource { local_path: merges_path };
        let model_resource_local = LocalResource { local_path: model_weights_path };

        let device = Device::Cpu;
        log::info!("[SuggestionModel] Using device: {:?}", device);

        let generate_config = GenerateConfig {
            model_type: rust_bert::pipelines::common::ModelType::GPT2, // Model type
            model_resource: ModelResource::Torch(Box::new(model_resource_local)), // Path to model weights
            config_resource: Box::new(config_resource), // Path to model configuration
            vocab_resource: Box::new(vocab_resource), // Path to vocabulary file
            merges_resource: Some(Box::new(merges_resource)), // Path to merges file (for BPE tokenizers)
            min_length: 10, // Min generated text length
            max_length: Some(75), // Max generated text length - you can adjust this
            do_sample: true, // Enable sampling for diverse output
            early_stopping: true, // Stop generation early if EOS token is produced
            num_beams: 1, // Number of beams for beam search (1 for sampling)
            temperature: 0.7, // Sampling temperature (controls randomness) - you can adjust this
            top_k: 40, // Top-k filtering
            top_p: 0.9, // Nucleus (top-p) sampling
            repetition_penalty: 1.25, // Penalize token repetition
            no_repeat_ngram_size: 3, // Prevent n-gram repetition
            num_return_sequences: 1, // Number of sequences to generate
            device, // Computation device (CPU/GPU)
            ..Default::default() // Use default for other parameters
        };
        
        log::info!("[SuggestionModel] Initializing GPT2Generator...");
        let model = GPT2Generator::new(generate_config)?;
        log::info!("[SuggestionModel] GPT2Generator initialized successfully.");
        Ok(Self { model })
    }

    pub fn generate(&self, prompt: &str) -> Result<String> {
        if prompt.trim().is_empty() {
            log::warn!("[SuggestionModel] Attempted to generate with an empty prompt.");
            return Err(anyhow::anyhow!("Prompt cannot be empty."));
        }

        let trimmed_prompt = prompt.trim();
        log::debug!("[SuggestionModel] Generating suggestion for prompt: \"{}\"", trimmed_prompt);

        let outputs = self.model.generate(Some(&[trimmed_prompt]), None)?;

        if let Some(suggestion_output) = outputs.get(0) {
            let full_generated_text = suggestion_output.text.trim();
            println!("[SuggestionModel RAW OUTPUT] Full text from model: \"{}\"", full_generated_text);

            log::debug!("[SuggestionModel] Full text from model (prompt + suggestion): \"{}\"", full_generated_text);

            let suggestion_only = if full_generated_text.starts_with(trimmed_prompt) {
                let suggestion_part = &full_generated_text[trimmed_prompt.len()..];
                suggestion_part.trim_start().to_string()
            }
            else if let Some(stripped) = full_generated_text.strip_prefix(trimmed_prompt.split_whitespace().next().unwrap_or_default()) {
                log::warn!("[SuggestionModel] Full generated text did not start with the full prompt. Trying partial strip. Prompt: '{}', Full Text: '{}'", trimmed_prompt, full_generated_text);
                stripped.trim_start().to_string()
            }
            else {
                log::warn!("[SuggestionModel] WARNING: Full generated text did not start with the prompt as expected. Prompt: '{}', Full Text: '{}'. Returning full text as a fallback.", trimmed_prompt, full_generated_text);
                full_generated_text.to_string()
            };
            
            if suggestion_only.is_empty() && full_generated_text.len() <= trimmed_prompt.len() + 5 {
                 log::warn!("[SuggestionModel] Extracted suggestion is empty or very short, possibly model only returned prompt. Prompt: '{}', Full Text: '{}'", trimmed_prompt, full_generated_text);
                 return Err(anyhow::anyhow!("Model returned an empty or too short suggestion. It might have only echoed the prompt."));
            }

            log::info!("[SuggestionModel] Final extracted suggestion: \"{}\"", suggestion_only);
            
            Ok(suggestion_only)
        } 
        else {
            log::error!("[SuggestionModel] Failed to generate suggestion for prompt: \"{}\". No output from model.", trimmed_prompt);
            Err(anyhow::anyhow!("Failed to generate suggestion: No output from model."))
        }
    }
}
