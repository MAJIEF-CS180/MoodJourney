use serde::Deserialize;
use serde_json::json;
use anyhow::{Result, anyhow};

// IMPORTANT: Replace "YOUR_GEMINI_API_KEY" with your actual Gemini API key.
// Consider loading this from an environment variable or a config file for better security.
const GEMINI_API_KEY: &str = "AIzaSyAmoii5kOue26viGuWzFAJ7hNB3y6RiceA";
const GEMINI_API_URL_BASE: &str = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

#[derive(Deserialize, Debug)]
struct GeminiCandidate {
    content: GeminiContent,
    #[serde(rename = "finishReason")]
    _finish_reason: Option<String>, // Changed here
    // safetyRatings, etc., can be added if needed
}

#[derive(Deserialize, Debug)]
struct GeminiContent {
    parts: Vec<GeminiPart>,
    _role: Option<String>, // Changed here
}

#[derive(Deserialize, Debug)]
struct GeminiPart {
    text: String,
}

#[derive(Deserialize, Debug)]
struct GeminiResponse {
    candidates: Vec<GeminiCandidate>,
    #[serde(rename = "promptFeedback")]
    _prompt_feedback: Option<serde_json::Value>, // Changed here
}

pub async fn generate_suggestion_via_api(prompt: &str) -> Result<String> {
    if GEMINI_API_KEY == "YOUR_GEMINI_API_KEY" {
        log::error!("[API Suggestion] Gemini API key is not configured.");
        return Err(anyhow!("API_KEY_NOT_CONFIGURED: The Gemini API key is not set in the Rust code."));
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
        "generationConfig": { // Optional: Adjust these as needed
            "temperature": 0.7,
            "topP": 0.9,
            "topK": 40,
            "maxOutputTokens": 150, // Increased token limit for potentially longer suggestions
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
    if GEMINI_API_KEY == "YOUR_GEMINI_API_KEY" { //
        log::error!("[API Chat] Gemini API key is not configured.");
        return Err(anyhow!("API_KEY_NOT_CONFIGURED: The Gemini API key is not set."));
    }
    if api_contents.is_empty() {
        return Err(anyhow!("Chat contents for API cannot be empty."));
    }

    let client = reqwest::Client::new();
    let api_url = format!("{}?key={}", GEMINI_API_URL_BASE, GEMINI_API_KEY); //

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
