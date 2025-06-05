use serde::Deserialize;
use serde_json::json;
use anyhow::{Result, anyhow};
use crate::config::GEMINI_API_KEY;
const GEMINI_API_URL_BASE: &str = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

#[derive(Deserialize, Debug)]
struct GeminiCandidate {
    content: GeminiContent,
    #[serde(rename = "finishReason")]
    _finish_reason: Option<String>,
}

#[derive(Deserialize, Debug)]
struct GeminiContent {
    parts: Vec<GeminiPart>,
    _role: Option<String>,
}

#[derive(Deserialize, Debug)]
struct GeminiPart {
    text: String,
}

#[derive(Deserialize, Debug)]
struct GeminiResponse {
    candidates: Vec<GeminiCandidate>,
    #[serde(rename = "promptFeedback")]
    _prompt_feedback: Option<serde_json::Value>,
}

pub async fn generate_suggestion_via_api(prompt: &str) -> Result<String> {
    if GEMINI_API_KEY == "YOUR_GEMINI_API_KEY_GOES_HERE" {
        log::error!("[API Suggestion] Gemini API key is not configured in src-tauri/src/config.rs. Please follow instructions in src-tauri/src/config_template.rs.");
        return Err(anyhow!("API_KEY_NOT_CONFIGURED: The Gemini API key is not set in src-tauri/src/config.rs. Please follow instructions in src-tauri/src/config_template.rs."));
    }
    if prompt.trim().is_empty() {
        return Err(anyhow!("Prompt cannot be empty."));
    }

    let client = reqwest::Client::new();
    let api_url = format!("{}?key={}", GEMINI_API_URL_BASE, GEMINI_API_KEY);

    let request_body = json!({
        "contents": [{
            "parts": [{"text": prompt}]
        }],
        "generationConfig": {
            "temperature": 0.7,
            "topP": 0.9,
            "topK": 40,
            "maxOutputTokens": 150,
        }
    });

    log::info!("[API Suggestion] Sending prompt (first 100 chars): '{}'", prompt.chars().take(100).collect::<String>());
    log::debug!("[API Suggestion] Full prompt: {}", prompt);
    log::debug!("[API Suggestion] Request body to Gemini: {}", request_body.to_string());


    let res = client.post(&api_url)
        .header("Content-Type", "application/json")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| {
            log::error!("[API Suggestion] Failed to send request to Gemini API: {}", e);
            anyhow!("Network request to Gemini API failed: {}", e)
        })?;

    let response_status = res.status();
    let response_body_text = res.text().await.unwrap_or_else(|_| "Failed to read error body".to_string());

    if !response_status.is_success() {
        log::error!("[API Suggestion] Gemini API Error ({}): {}", response_status, response_body_text);
        return Err(anyhow!("Gemini API request failed with status {}: {}", response_status, response_body_text));
    }
    
    log::debug!("[API Suggestion] Gemini Raw Response: {}", response_body_text);

    let response_data: GeminiResponse = serde_json::from_str(&response_body_text)
        .map_err(|e| {
            log::error!("[API Suggestion] Failed to parse Gemini API response: {}", e);
            log::error!("[API Suggestion] Response body was: {}", response_body_text);
            anyhow!("Failed to parse Gemini API response: {}. Body: {}", e, response_body_text)
        })?;

    if let Some(candidate) = response_data.candidates.get(0) {
        if let Some(part) = candidate.content.parts.get(0) {
            let suggestion_text = part.text.trim().to_string();
            log::info!("[API Suggestion] Received suggestion: {}", suggestion_text);
            if suggestion_text.is_empty() {
                 log::warn!("[API Suggestion] Gemini API returned an empty suggestion text part.");
                 return Err(anyhow!("Gemini API returned an empty suggestion."));
            }
            return Ok(suggestion_text);
        }
    }
    
    log::warn!("[API Suggestion] No suggestion content found in Gemini API response structure. Full response: {:?}", response_data);
    Err(anyhow!("No suggestion content found in Gemini API response."))
}

pub async fn generate_chat_response_via_api(api_contents: &Vec<serde_json::Value>) -> Result<String> {
    if GEMINI_API_KEY == "YOUR_GEMINI_API_KEY_GOES_HERE" {
        log::error!("[API Chat] Gemini API key is not configured in src-tauri/src/config.rs. Please follow instructions in src-tauri/src/config_template.rs.");
        return Err(anyhow!("API_KEY_NOT_CONFIGURED: The Gemini API key is not set in src-tauri/src/config.rs. Please follow instructions in src-tauri/src/config_template.rs."));
    }
    if api_contents.is_empty() {
        return Err(anyhow!("Chat contents for API cannot be empty."));
    }

    let client = reqwest::Client::new();
    let api_url = format!("{}?key={}", GEMINI_API_URL_BASE, GEMINI_API_KEY);

    let request_body = json!({
        "contents": api_contents,
        "generationConfig": {
            "temperature": 0.75,
            "topP": 0.9,
            "topK": 40,
            "maxOutputTokens": 600, 
        }
    });

    let last_content_for_log = api_contents.last()
        .and_then(|c| c.get("parts"))
        .and_then(|p| p.get(0))
        .and_then(|t| t.get("text"))
        .and_then(|s| s.as_str())
        .map(|s| s.chars().take(100).collect::<String>())
        .unwrap_or_else(|| "N/A".to_string());

    log::info!("[API Chat] Sending chat content to API (last turn, first 100 chars): '{}'", last_content_for_log);

    let res = client.post(&api_url)
        .header("Content-Type", "application/json")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| {
            log::error!("[API Chat] Failed to send request to Gemini API: {}", e);
            anyhow!("Network request to Gemini API failed: {}", e)
        })?;

    let response_status = res.status();
    let response_body_text = res.text().await.unwrap_or_else(|_| "Failed to read error body".to_string());

    if !response_status.is_success() {
        log::error!("[API Chat] Gemini API Error ({}): {}", response_status, response_body_text);
        return Err(anyhow!("Gemini API request failed with status {}: {}", response_status, response_body_text));
    }

    log::debug!("[API Chat] Gemini Raw Response: {}", response_body_text);

    let response_data: GeminiResponse = serde_json::from_str(&response_body_text)
        .map_err(|e| {
            log::error!("[API Chat] Failed to parse Gemini API response: {}", e);
            anyhow!("Failed to parse Gemini API response: {}. Body: {}", e, response_body_text)
        })?;

    if let Some(candidate) = response_data.candidates.get(0) {
        if let Some(part) = candidate.content.parts.get(0) {
            let chat_response_text = part.text.trim().to_string();
            log::info!("[API Chat] Received chat response (first 100 chars): {}", chat_response_text.chars().take(100).collect::<String>());
            if chat_response_text.is_empty() {
                 log::warn!("[API Chat] Gemini API returned an empty chat response text part.");
                 return Err(anyhow!("Gemini API returned an empty response."));
            }
            return Ok(chat_response_text);
        }
    }
    log::warn!("[API Chat] No chat response content found in Gemini API response structure.");
    Err(anyhow!("No chat response content found in Gemini API response."))
}

#[cfg(test)]
mod suggestion_module_tests {
    use super::*;
    use serde_json::json;

    #[tokio::test]
    async fn test_generate_suggestion_api_key_not_configured() {
        if crate::config::GEMINI_API_KEY == "YOUR_GEMINI_API_KEY_GOES_HERE" {
            let result = generate_suggestion_via_api("test prompt").await;
            assert!(result.is_err(), "Expected error.");
            if let Err(e) = result {
                assert!(e.to_string().contains("API_KEY_NOT_CONFIGURED"), "Error should mention API key.");
            }
        }
        else {
            println!("Skipping test: API key set.");
        }
    }

    #[tokio::test]
    async fn test_generate_chat_response_api_key_not_configured() {
        if crate::config::GEMINI_API_KEY == "YOUR_GEMINI_API_KEY_GOES_HERE" {
            let contents = vec![json!({"role": "user", "parts": [{"text": "hello"}]})];
            let result = generate_chat_response_via_api(&contents).await;
            assert!(result.is_err(), "Expected error.");
            if let Err(e) = result {
                assert!(e.to_string().contains("API_KEY_NOT_CONFIGURED"), "Error should mention API key.");
            }
        }
        else {
            println!("Skipping test: API key set.");
        }
    }

    #[tokio::test]
    async fn test_generate_suggestion_empty_prompt() {
        let result = generate_suggestion_via_api("").await;
        assert!(result.is_err(), "Expected error.");
        if let Err(e) = result {
            assert!(e.to_string().contains("Prompt cannot be empty"), "Error should say prompt is empty.");
        }
    }

    #[tokio::test]
    async fn test_generate_chat_response_empty_contents() {
        let result = generate_chat_response_via_api(&Vec::new()).await;
        assert!(result.is_err(), "Expected error.");
        if let Err(e) = result {
            assert!(e.to_string().contains("Chat contents for API cannot be empty"), "Error should say chat content is empty.");
        }
    }
}
