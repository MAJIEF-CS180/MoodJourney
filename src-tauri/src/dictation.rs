use whisper_rs::{convert_integer_to_float_audio, FullParams, SamplingStrategy, WhisperContext, WhisperContextParameters};
use std::path::{Path, PathBuf};
use hound;
use tauri::{AppHandle, Manager, path::BaseDirectory};
use anyhow::{Result, anyhow};

fn get_model_path(app_handle: &AppHandle, model_name: &str) -> Result<PathBuf> {
    match app_handle
        .path()
        .resolve(&format!("models/dictation/{}", model_name), BaseDirectory::Resource)
    {
        Ok(resolved_path) if resolved_path.exists() => {
            log::info!("[DictationModel] Found model '{}' in bundled resources: {:?}", model_name, resolved_path);
            return Ok(resolved_path);
        }
        Ok(resolved_path) => {
            log::warn!("[DictationModel] Model '{}' path resolved to {:?} but file does not exist. Will check dev path.", model_name, resolved_path);
        }
        Err(e) => {
            log::warn!("[DictationModel] Failed to resolve resource path for '{}': {}. Will check dev path.", model_name, e);
        }
    }

    let mut dev_path_base = std::env::current_dir()
        .map_err(|e| anyhow!("Failed to get current directory: {}", e))?;

    if dev_path_base.ends_with("src-tauri") {
        if !dev_path_base.pop() {
            return Err(anyhow!("Failed to navigate up from src-tauri directory."));
        }
    }

    let model_folder_path = dev_path_base.join("src-tauri").join("models").join("dictation");
    let full_model_path = model_folder_path.join(model_name);

    if full_model_path.exists() {
        log::info!("[DictationModel] Found model '{}' in development path: {:?}", model_name, full_model_path);
        Ok(full_model_path)
    } else {
        Err(anyhow!(
            "Model '{}' not found. Checked bundled resources and development path: {}. (Current dev check base: {})",
            model_name,
            full_model_path.display(),
            dev_path_base.display()
        ))
    }
}

pub struct DictationModel {
    ctx: WhisperContext,
}

impl DictationModel {
    pub fn new(app_handle: &AppHandle, model_name: &str) -> Result<Self> {
        log::info!("[DictationModel] Initializing DictationModel with model: {}", model_name);

        // 1. Resolve Model Path
        let model_path = get_model_path(app_handle, model_name)
            .map_err(|e| anyhow!("Failed to get model path for '{}': {}", model_name, e))?;

        let model_path_str = model_path.to_str().ok_or_else(|| {
            anyhow!(
                "Model path '{}' contains invalid UTF-8 characters.",
                model_path.display()
            )
        })?;

        // 2. Load Model
        log::info!("[DictationModel] Loading Whisper model from: {}", model_path_str);
        let ctx = WhisperContext::new_with_params(model_path_str, WhisperContextParameters::default())
            .map_err(|e| anyhow!("Failed to load Whisper model from '{}': {:?}", model_path_str, e))?;
        
        log::info!("[DictationModel] Whisper model '{}' loaded successfully.", model_name);
        Ok(Self { ctx }) // model_name removed from struct initialization
    }

    pub fn transcribe(&self, audio_file_path_str: &str) -> Result<String> {
        log::debug!("[DictationModel] Attempting to transcribe audio file: {}", audio_file_path_str);
        let audio_file_path = Path::new(audio_file_path_str);
        if !audio_file_path.exists() {
            return Err(anyhow!("Audio file not found at path: {}", audio_file_path_str));
        }

        // 3. Create a Transcription State
        let mut state = self
            .ctx
            .create_state()
            .map_err(|e| anyhow!("Failed to create Whisper transcription state: {:?}", e))?;

        // 4. Load WAV File
        let mut reader = hound::WavReader::open(audio_file_path).map_err(|e| {
            anyhow!(
                "Failed to open WAV audio file '{}': {}",
                audio_file_path_str,
                e
            )
        })?;

        let wav_spec = reader.spec();
        if wav_spec.sample_rate != 16000 {
            return Err(anyhow!(
                "Unsupported audio sample rate: {}. Whisper requires 16kHz.",
                wav_spec.sample_rate
            ));
        }
        if wav_spec.channels != 1 {
            return Err(anyhow!(
                "Unsupported audio channel count: {}. Whisper requires mono (1 channel).",
                wav_spec.channels
            ));
        }
        if wav_spec.bits_per_sample != 16 || wav_spec.sample_format != hound::SampleFormat::Int {
            return Err(anyhow!(
                "Unsupported audio sample format or bits per sample. Whisper requires 16-bit Integer PCM."
            ));
        }

        let samples_i16: Vec<i16> = reader
            .samples::<i16>()
            .collect::<std::result::Result<_, _>>()
            .map_err(|e| anyhow!("Failed to read i16 samples from WAV file: {}", e))?;

        let mut audio_data_f32: Vec<f32> = vec![0.0; samples_i16.len()];
        convert_integer_to_float_audio(&samples_i16, &mut audio_data_f32)
            .map_err(|e| anyhow!("Failed to convert audio samples from i16 to f32: {:?}", e))?;

        // 5. Set Transcription Parameters
        let mut params = FullParams::new(SamplingStrategy::Greedy { best_of: 1 });
        params.set_n_threads(4);
        params.set_language(Some("en"));

        // 6. Run Transcription
        state
            .full(params, &audio_data_f32[..])
            .map_err(|e| anyhow!("Transcription failed during full processing: {:?}", e))?;

        // 7. Extract Transcribed Text
        let num_segments = state
            .full_n_segments()
            .map_err(|e| anyhow!("Failed to get number of transcribed segments: {:?}", e))?;

        let mut full_text = String::new();
        for i in 0..num_segments {
            let segment_text = state
                .full_get_segment_text(i)
                .map_err(|e| anyhow!("Failed to get text for segment {}: {:?}", i, e))?;
            full_text.push_str(&segment_text);
        }
        
        // 8. Return The Transcribed Text
        log::info!("[DictationModel] Transcription successful for '{}'. Length: {}", audio_file_path_str, full_text.len());
        Ok(full_text.trim().to_string())
    }
}

#[tauri::command]
pub async fn perform_dictation_cmd(
    audio_file_path: String,
    dictation_model_state: tauri::State<'_, crate::AppDictationModel>,
) -> Result<String, String> {
    log::info!("[CMD perform_dictation_cmd] Received request for audio file: {}", audio_file_path);

    let model_arc = dictation_model_state.inner().0.clone();

    tokio::task::spawn_blocking(move || {
        model_arc.0.transcribe(&audio_file_path)
    })
    .await
    .map_err(|e| { 
        log::error!("[CMD perform_dictation_cmd] Task join error: {}", e);
        format!("Task join error during transcription: {}", e)
    })?
    .map_err(|e| { 
        log::error!("[CMD perform_dictation_cmd] Transcription error: {}", e);
        e.to_string()
    })
}