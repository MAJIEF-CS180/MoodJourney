import { alpha } from '@mui/material/styles';

export const INITIAL_VISIBLE_ENTRIES = 5;
export const ALERT_TIMEOUT_DURATION = 10000;

export const getMainContent = (fullContent) => {
    if (!fullContent) return "";
    const emotionTagIndex = fullContent.indexOf("\n\n🧠 Emotion:");
    const suggestionTagIndex = fullContent.indexOf("\n\n💡 Suggestion:");
    let endOfMain = fullContent.length;
    if (emotionTagIndex !== -1) endOfMain = Math.min(endOfMain, emotionTagIndex);
    if (suggestionTagIndex !== -1) endOfMain = Math.min(endOfMain, suggestionTagIndex);
    return fullContent.substring(0, endOfMain).trim();
};

export const extractEmotionFromContent = (fullContent) => {
    if (!fullContent) return null;
    const match = fullContent.match(/\n\n🧠 Emotion: (\w+)/);
    return match ? match[1] : null;
};

export const extractSuggestionFromContent = (fullContent) => {
    if (!fullContent) return null;
    const match = fullContent.match(/\n\n💡 Suggestion: ([\s\S]+)$/);
    return match ? match[1].trim() : null;
};

export const parseSuggestions = (suggestionText) => {
    const defaultText = "Suggestion details will appear here.";
    const noSuggestionsText = "No suggestions available for this entry.";

    if (!suggestionText ||
        suggestionText.trim().toLowerCase() === "suggestion not available." ||
        suggestionText.trim().toLowerCase() === noSuggestionsText.toLowerCase()) {
        return [noSuggestionsText, noSuggestionsText, noSuggestionsText];
    }

    let suggestions = suggestionText.split("\n\n").map(s => s.trim()).filter(Boolean);

    if (suggestions.length === 1 && suggestions[0].includes("\n")) {
        const innerSuggestions = suggestions[0].split("\n").map(s => s.trim()).filter(Boolean);
        if (innerSuggestions.length > 1) {
            suggestions = innerSuggestions;
        }
    }

    const result = [];
    for (let i = 0; i < 3; i++) {
        result.push(suggestions[i] || defaultText);
    }
    return result;
};

export const getContentForEditing = (fullContent) => getMainContent(fullContent);

export const formatDate = (dateString) => {
    if (!dateString) return "Invalid Date";
    const date = new Date(dateString.includes('T') ? dateString : dateString + 'T00:00:00');
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
};

export const formatChatTimestamp = (timestamp) => {
    if (!timestamp) return "";
    try {
        const date = new Date(timestamp);
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) {
        console.error("Error formatting chat timestamp:", e);
        return "Invalid Date";
    }
};

export const getEmotionColor = (emotion, theme) => {
    if (theme.palette.mode === 'light' && theme.palette.primary.main === '#DAA520') {
        const emotionLower = emotion?.toLowerCase();
        switch (emotionLower) {
            case 'sadness': return '#87CEFA';
            case 'anger': case 'angry': return '#FF69B4';
            case 'neutral': return '#DDA0DD';
            case 'joy': return '#FFDE59';
            case 'disgust': return '#90EE90';
            case 'fear': return '#FF7F50';
            case 'surprise': return '#F0E68C';
            default: return alpha(theme.palette.text.secondary, 0.8);
        }
    }

    const emotionLower = emotion?.toLowerCase();
    const isDark = theme.palette.mode === 'dark';
    switch (emotionLower) {
        case 'sadness': return isDark ? '#64B5F6' : '#1976D2';
        case 'anger': case 'angry': return isDark ? '#E57373' : '#D32F2F';
        case 'neutral': return isDark ? '#B0BEC5' : '#607D8B';
        case 'joy': return isDark ? '#FFF176' : '#FBC02D';
        case 'disgust': return isDark ? '#81C784' : '#388E3C';
        case 'fear': return isDark ? '#CE93D8' : '#7B1FA2';
        case 'surprise': return isDark ? '#FFB74D' : '#F57C00';
        default: return theme.palette.text.disabled;
    }
};

export const scrollbarStyles = (theme) => ({
    overflowY: 'auto',
    pr: 0.5,
    mr: -0.5,
    '&::-webkit-scrollbar': { width: '8px' },
    '&::-webkit-scrollbar-track': { background: 'transparent' },
    '&::-webkit-scrollbar-thumb': {
        background: theme.palette.mode === 'dark' ? alpha(theme.palette.common.white, 0.25) : alpha(theme.palette.common.black, 0.25),
        ...(theme.palette.primary.main === '#DAA520' && theme.palette.mode === 'light' && {
            background: alpha(theme.palette.primary.main, 0.6),
        }),
        borderRadius: '4px',
        '&:hover': {
            background: theme.palette.mode === 'dark' ? alpha(theme.palette.common.white, 0.4) : alpha(theme.palette.common.black, 0.4),
            ...(theme.palette.primary.main === '#DAA520' && theme.palette.mode === 'light' && {
                 background: alpha(theme.palette.primary.main, 0.8),
            }),
        }
    },
});
