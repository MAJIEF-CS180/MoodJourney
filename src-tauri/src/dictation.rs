use std::path::{Path, PathBuf};

use hound;
use tauri::{AppHandle, Manager, path::BaseDirectory}; 
use whisper_rs::{convert_integer_to_float_audio, FullParams, SamplingStrategy, WhisperContext, WhisperContextParameters};

fn get_model_path(app_handle: &AppHandle, model_name: &str) -> Result<PathBuf, String> {
    let resource_path_result = app_handle
        .path()
        .resolve(&format!("models/dictation/{}", model_name), BaseDirectory::Resource);

    if let Ok(resolved_path) = resource_path_result {
        if resolved_path.exists() {
            return Ok(resolved_path);
        }
    } 
    else if let Err(e) = resource_path_result {
        eprintln!("Failed to resolve resource path for '{}': {}", model_name, e);
    }

    let mut dev_path_base = std::env::current_dir()
        .map_err(|e| format!("Failed to get current directory: {}", e))?;

    if dev_path_base.ends_with("src-tauri") {
        if !dev_path_base.pop() {
            return Err("Failed to navigate up from src-tauri directory.".to_string());
        }
    }

    let model_folder_path = dev_path_base.join("models").join("dictation");
    let full_model_path = model_folder_path.join(model_name);

    if full_model_path.exists() {
        Ok(full_model_path)
    } 
    else {
        // Provide a detailed error message if the model is not found in either location.
        Err(format!(
            "Model '{}' not found. Checked bundled resources and development path: {}. (Current dev check base: {})",
            model_name,
            full_model_path.display(),
            dev_path_base.display()
        ))
    }
}

pub fn transcribe_audio_file(
    app_handle: &AppHandle,
    audio_file_path_str: &str,
    model_name: &str,
) -> Result<String, String> {
    let audio_file_path = Path::new(audio_file_path_str);
    if !audio_file_path.exists() {
        return Err(format!("Audio file not found at path: {}", audio_file_path_str));
    }

    // 1. Resolve Model Path
    let model_path = get_model_path(app_handle, model_name)?;
    let model_path_str = model_path.to_str().ok_or_else(|| {
        format!(
            "Model path '{}' contains invalid UTF-8 characters.",
            model_path.display()
        )
    })?;

    // 2. Load Model
    let ctx = WhisperContext::new_with_params(model_path_str, WhisperContextParameters::default())
        .map_err(|e| format!("Failed to load Whisper model from '{}': {:?}", model_path_str, e))?;

    // 3. Create a Transcription State
    let mut state = ctx
        .create_state()
        .map_err(|e| format!("Failed to create Whisper transcription state: {:?}", e))?;

    // 4. Load WAV File
    let mut reader = hound::WavReader::open(audio_file_path).map_err(|e| {
        format!(
            "Failed to open WAV audio file '{}': {}",
            audio_file_path_str, e
        )
    })?;

    let wav_spec = reader.spec();
    if wav_spec.sample_rate != 16000 {
        return Err(format!(
            "Unsupported audio sample rate: {}. Whisper requires 16kHz.",
            wav_spec.sample_rate
        ));
    }
    if wav_spec.channels != 1 {
        return Err(format!(
            "Unsupported audio channel count: {}. Whisper requires mono (1 channel).",
            wav_spec.channels
        ));
    }
    if wav_spec.bits_per_sample != 16 || wav_spec.sample_format != hound::SampleFormat::Int {
        return Err(format!(
            "Unsupported audio sample format or bits per sample. Whisper requires 16-bit Integer PCM."
        ));
    }

    let samples_i16: Vec<i16> = reader
        .samples::<i16>()
        .collect::<Result<_, _>>()
        .map_err(|e| format!("Failed to read i16 samples from WAV file: {}", e))?;

    let mut audio_data_f32: Vec<f32> = vec![0.0; samples_i16.len()];
    if let Err(e) = convert_integer_to_float_audio(&samples_i16, &mut audio_data_f32) {
        return Err(format!("Failed to convert audio samples from i16 to f32: {:?}", e));
    }

    // 5. Set Transcription Parameters
    let mut params = FullParams::new(SamplingStrategy::Greedy { best_of: 1 });
    params.set_n_threads(4);
    params.set_language(Some("en"));

    // 6. Run Transcription
    state
        .full(params, &audio_data_f32[..])
        .map_err(|e| format!("Transcription failed during full processing: {:?}", e))?;

    // 7. Extract Transcribed Text
    let num_segments = state
        .full_n_segments()
        .map_err(|e| format!("Failed to get number of transcribed segments: {:?}", e))?;

    let mut full_text = String::new();
    for i in 0..num_segments {
        let segment_text = state
            .full_get_segment_text(i)
            .map_err(|e| format!("Failed to get text for segment {}: {:?}", i, e))?;
        full_text.push_str(&segment_text);
    }

    // 8. Return The Transcribed Text
    Ok(full_text.trim().to_string())
}