import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { invoke } from "@tauri-apps/api/core";
import { ThemeProvider, CssBaseline, Box, Toolbar, Typography, Snackbar, Alert as MuiAlert, CircularProgress, createTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';

import { lightTheme, darkTheme, girlbossTheme, AppBar as StyledAppBar } from './theme';
import {
    formatDate, getEmotionColor, getContentForEditing, ALERT_TIMEOUT_DURATION
} from './utils';

import AppDrawer from './components/AppDrawer';
import SettingsPage from './components/SettingsPage';
import InsightsPage from './components/InsightsPage';
import AssistantPage from './components/AssistantPage';
import JournalEntryView from './components/JournalEntryView';
import NewEntryForm from './components/NewEntryForm';
import PinModal from './components/PinModal';
import ConfirmationDialog from './components/ConfirmationDialog';
import ImageUploadModal from './components/ImageUploadModal';

function App() {
    const [themeMode, setThemeMode] = useState(() => localStorage.getItem('appThemeMode') || 'system');
    const [configuredUserName, setConfiguredUserName] = useState(() => localStorage.getItem('appConfiguredUserName') || 'Michael');
    const [isDarkModeActive, setIsDarkModeActive] = useState(false);
    const [entries, setEntries] = useState([]);
    const [selectedEntry, setSelectedEntry] = useState(null);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState({ message: "", severity: "info" });
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [hoverOpen, setHoverOpen] = useState(false);
    const [entryText, setEntryText] = useState("");
    const [saving, setSaving] = useState(false);
    const [currentView, setCurrentView] = useState('main');
    const [isEditingSelectedEntry, setIsEditingSelectedEntry] = useState(false);
    const [editedContentText, setEditedContentText] = useState("");
    const [lastDetectedEmotion, setLastDetectedEmotion] = useState("");
    const [flashColor, setFlashColor] = useState(null);
    const [showAllEntriesInDrawer, setShowAllEntriesInDrawer] = useState(false);
    const [isDictating, setIsDictating] = useState(false);
    const [isFileDictating, setIsFileDictating] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [entryToDelete, setEntryToDelete] = useState(null);
    const [isPinSet, setIsPinSet] = useState(false);
    const [showPinModal, setShowPinModal] = useState(false);
    const [pinInput, setPinInput] = useState("");
    const [pinError, setPinError] = useState("");
    const [pinAction, setPinAction] = useState("");
    const [isAppLocked, setIsAppLocked] = useState(true);
    const [imageUploadModalOpen, setImageUploadModalOpen] = useState(false);
    const [entryForImageUpload, setEntryForImageUpload] = useState(null);
    const [expandedSuggestionIndices, setExpandedSuggestionIndices] = useState([]);
    const [globalBackgroundImageUrl, setGlobalBackgroundImageUrl] = useState(null);
    const [activeMonetColor, setActiveMonetColor] = useState(null);
    const [isMonetActiveForView, setIsMonetActiveForView] = useState(false);
    const [recognitionInstance, setRecognitionInstance] = useState(null);

    const muiTheme = useMemo(() => {
        const baseThemeObject = themeMode === 'girlboss' ? girlbossTheme : (isDarkModeActive ? darkTheme : lightTheme);

        if (isMonetActiveForView && activeMonetColor && themeMode !== 'girlboss') {
            const monetPaletteAdditions = {
                palette: {
                    monet: {
                        main: activeMonetColor,
                        backgroundCard: alpha(activeMonetColor, baseThemeObject.palette.mode === 'light' ? 0.08 : 0.12),
                        borderCard: alpha(activeMonetColor, 0.5),
                        textTitle: baseThemeObject.palette.mode === 'light' ? activeMonetColor : alpha(activeMonetColor, 0.9),
                        icon: activeMonetColor,
                        contrastText: baseThemeObject.palette.getContrastText ? baseThemeObject.palette.getContrastText(activeMonetColor) : (baseThemeObject.palette.mode === 'light' ? '#000' : '#fff'),
                    }
                }
            };

            const existingMonetComponentOverrides = { components: {} };
            const basePaperStyleFn = baseThemeObject.components?.MuiPaper?.styleOverrides?.root;
            const baseAppBarStyleFn = baseThemeObject.components?.MuiAppBar?.styleOverrides?.root;
            const baseDrawerStyleFn = baseThemeObject.components?.MuiDrawer?.styleOverrides?.paper;

            if (baseThemeObject.palette.mode === 'light') {
                existingMonetComponentOverrides.components.MuiPaper = {
                    styleOverrides: {
                        root: (params) => {
                            const defaultStyle = typeof basePaperStyleFn === 'function' ? basePaperStyleFn(params) : (basePaperStyleFn || {});
                            return {
                                ...defaultStyle,
                                borderColor: alpha(activeMonetColor, 0.5),
                            };
                        }
                    }
                };
            } else {
                existingMonetComponentOverrides.components.MuiAppBar = {
                    styleOverrides: {
                        root: (params) => {
                            const baseStyle = typeof baseAppBarStyleFn === 'function' ? baseAppBarStyleFn(params) : (baseAppBarStyleFn || {});
                            const existingAlpha = parseFloat(String(baseStyle.backgroundColor).match(/[\d\.]+(?=\)?$)/)?.[0] || 0.75);
                            return {
                                ...baseStyle,
                                backgroundColor: alpha(activeMonetColor, existingAlpha)
                            };
                        }
                    }
                };
                existingMonetComponentOverrides.components.MuiDrawer = {
                    styleOverrides: {
                        paper: (params) => {
                            const baseStyle = typeof baseDrawerStyleFn === 'function' ? baseDrawerStyleFn(params) : (baseDrawerStyleFn || {});
                            const existingAlpha = parseFloat(String(baseStyle.backgroundColor).match(/[\d\.]+(?=\)?$)/)?.[0] || 0.75);
                            return {
                                ...baseStyle,
                                backgroundColor: alpha(activeMonetColor, existingAlpha)
                            };
                        }
                    }
                };
                existingMonetComponentOverrides.components.MuiPaper = {
                    styleOverrides: {
                        root: (params) => {
                            const baseStyle = typeof basePaperStyleFn === 'function' ? basePaperStyleFn(params) : (basePaperStyleFn || {});
                            const existingAlpha = parseFloat(String(baseStyle.backgroundColor).match(/[\d\.]+(?=\)?$)/)?.[0] || 0.5);
                            return {
                                ...baseStyle,
                                backgroundColor: alpha(activeMonetColor, Math.max(existingAlpha, 0.15)),
                                borderColor: alpha(activeMonetColor, 0.5)
                            };
                        }
                    }
                };
            }
            let themeWithMonetPalette = createTheme(baseThemeObject, monetPaletteAdditions);
            return createTheme(themeWithMonetPalette, existingMonetComponentOverrides);
        }
        return createTheme(baseThemeObject);
    }, [themeMode, isDarkModeActive, activeMonetColor, isMonetActiveForView]);

    const checkPinStatus = useCallback(async () => {
        try {
            const pinIsCurrentlySet = await invoke('is_pin_set_cmd');
            setIsPinSet(pinIsCurrentlySet);
            if (pinIsCurrentlySet) {
                const appIsLocked = await invoke('is_locked_cmd');
                if (appIsLocked) {
                    setIsAppLocked(true);
                    setPinAction('unlock');
                    setShowPinModal(true);
                } else {
                    setIsAppLocked(false);
                }
            } else {
                setIsAppLocked(false);
            }
        } catch (error) {
            console.error("Error checking PIN status:", error);
            setStatus({ message: `Error checking PIN status: ${error.message || String(error)}`, severity: "error" });
            setIsAppLocked(false);
        }
    }, []);

    useEffect(() => {
        window.refreshPinStatus = checkPinStatus;
        checkPinStatus();
        return () => {
            delete window.refreshPinStatus;
        };
    }, [checkPinStatus]);

    useEffect(() => {
        const prefersDarkMQ = window.matchMedia('(prefers-color-scheme: dark)');
        const updateActiveTheme = (event) => {
            if (themeMode === 'dark') setIsDarkModeActive(true);
            else if (themeMode === 'light') setIsDarkModeActive(false);
            else if (themeMode === 'girlboss') setIsDarkModeActive(false);
            else setIsDarkModeActive(event ? event.matches : prefersDarkMQ.matches);
        };
        updateActiveTheme();
        if (themeMode === 'system') {
            prefersDarkMQ.addEventListener('change', updateActiveTheme);
            return () => prefersDarkMQ.removeEventListener('change', updateActiveTheme);
        }
    }, [themeMode]);

    useEffect(() => { localStorage.setItem('appThemeMode', themeMode); }, [themeMode]);
    useEffect(() => { localStorage.setItem('appConfiguredUserName', configuredUserName); }, [configuredUserName]);

    const handleCloseStatus = (event, reason) => {
        if (reason === 'clickaway') return;
        setStatus({ message: "", severity: "info" });
    };

    const flashBackground = (emotion) => {
        const baseFlashColor = getEmotionColor(emotion, muiTheme);
        const disabledColor = muiTheme.palette.text.disabled;
        const girlbossDisabledColor = alpha(muiTheme.palette.text.secondary, 0.8);

        if (baseFlashColor && baseFlashColor !== disabledColor && baseFlashColor !== girlbossDisabledColor) {
            setFlashColor(alpha(baseFlashColor, 0.3));
            setTimeout(() => setFlashColor(null), 1000);
        }
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        const timeOfDay = hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";
        return configuredUserName ? `${timeOfDay}, ${configuredUserName}` : timeOfDay;
    };

    const getCurrentDateString = () => {
        const date = new Date();
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };

    const refreshEntriesList = useCallback(async () => {
        setLoading(true);
        try {
            const freshEntries = (await invoke("read_entries")) || [];
            const sorted = freshEntries.sort((a, b) => new Date(b.date) - new Date(a.date));
            setEntries(sorted); return sorted;
        } catch (err) {
            console.error("Error refreshing entries list:", err);
            setStatus({ message: `Error refreshing entries: ${err.message || String(err)}`, severity: "error" });
            setEntries([]); return [];
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { if (!isAppLocked) refreshEntriesList(); }, [isAppLocked, refreshEntriesList]);

    const handleOpenImageUploadModal = (entry) => {
        setEntryForImageUpload(entry);
        setImageUploadModalOpen(true);
    };

    const handleCloseImageUploadModal = () => {
        setImageUploadModalOpen(false);
        setEntryForImageUpload(null);
    };

    const handleImageUploadConfirm = async (file) => {
        if (!entryForImageUpload || !entryForImageUpload.date) {
            setStatus({ message: "Internal error: No entry context for image upload.", severity: "error" });
            handleCloseImageUploadModal();
            return;
        }
        if (!file) {
            setStatus({ message: "No file selected for upload.", severity: "warning" });
            return;
        }
        setSaving(true);
        try {
            const reader = new FileReader();
            const base64String = await new Promise((resolve, reject) => {
                reader.onload = () => {
                    const result = reader.result;
                    if (typeof result === 'string') resolve(result.split(',')[1]);
                    else reject(new Error("Failed to read file as data URL."));
                };
                reader.onerror = error => reject(error);
                reader.readAsDataURL(file);
            });
            const newImageRelativePath = await invoke("upload_image_file", {
                fileDataBase64: base64String,
                originalFileName: file.name
            });
            await invoke("update_entry", {
                date: entryForImageUpload.date,
                newTitle: entryForImageUpload.title || "Journal Entry",
                newContent: entryForImageUpload.content,
                newPassword: entryForImageUpload.password,
                newImage: newImageRelativePath
            });
            setStatus({ message: "Image uploaded and entry updated successfully!", severity: "success" });
            handleCloseImageUploadModal();
            const updatedEntries = await refreshEntriesList();
            if (selectedEntry && selectedEntry.date === entryForImageUpload.date) {
                const newlySelectedEntry = updatedEntries.find(entry => entry.date === entryForImageUpload.date);
                setSelectedEntry(newlySelectedEntry || null);
            }
        } catch (error) {
            console.error("Failed to upload image or update entry:", error);
            setStatus({ message: `Image upload failed: ${error.message || String(error)}`, severity: "error" });
        } finally {
            setSaving(false);
        }
    };

    const handleStartDictation = async () => {
        if (!navigator.onLine) {
            setStatus({ message: "Error getting response: Failed to get response from MoodJourney: Network request to Web Speech API failed", severity: "error" });
            setIsDictating(false);
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            setStatus({ message: "Speech recognition is not supported by your browser.", severity: "error" });
            return;
        }

        if (isDictating && recognitionInstance) {
            recognitionInstance.stop();
            return;
        }
        
        if (!isDictating) {
            const recognition = new SpeechRecognition();
            setRecognitionInstance(recognition);

            recognition.lang = 'en-US';
            recognition.interimResults = true;
            recognition.continuous = true; 

            let finalTranscriptAggregator = entryText;

            recognition.onstart = () => {
                setIsDictating(true);
                setStatus({ message: "Listening...", severity: "info" });
            };

            recognition.onresult = (event) => {
                let interimTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        const transcriptChunk = event.results[i][0].transcript;
                        finalTranscriptAggregator = finalTranscriptAggregator.trim() ? `${finalTranscriptAggregator.trim()} ${transcriptChunk.trim()}` : transcriptChunk.trim();
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }
                setEntryText(finalTranscriptAggregator + interimTranscript);
            };

            recognition.onerror = (event) => {
                setIsDictating(false);
                setRecognitionInstance(null);
                let errorMessage = "Speech recognition error";

                if (!navigator.onLine) {
                    errorMessage = "Error getting response: Failed to get response from MoodJourney: Network request to Web Speech API failed";
                } else if (event.error) {
                    if (event.error === 'network') {
                        errorMessage = "Error: A network issue occurred with the speech service. Please check your internet connection.";
                    } else if (event.error === 'no-speech') {
                        errorMessage = "No speech was detected. Please try again.";
                    } else if (event.error === 'audio-capture') {
                        errorMessage = "Audio capture failed. Ensure microphone is enabled and permissions are granted.";
                    } else if (event.error === 'not-allowed') {
                        errorMessage = "Microphone access or speech service denied. Please check permissions.";
                    } else {
                        errorMessage += `: ${event.error}`;
                    }
                }
                setStatus({ message: errorMessage, severity: "error" });
            };

            recognition.onend = () => {
                setIsDictating(false);
                setRecognitionInstance(null);
                setEntryText(prev => finalTranscriptAggregator || prev);
                if (status.severity !== 'error' || status.message !== "Error: no internet connection") {
                     setStatus(prevStatus => {
                        if (prevStatus.severity === 'error' && prevStatus.message.includes("Error:")) {
                            return prevStatus;
                        }
                        return { message: "Dictation finished.", severity: "success" };
                    });
                }
            };

            try {
                // await navigator.mediaDevices.getUserMedia({ audio: true });
                recognition.start();
            } catch (err) {
                 setIsDictating(false);
                 setRecognitionInstance(null);
                 if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                    setStatus({ message: "Microphone access denied. Please allow microphone permissions.", severity: "error" });
                 } else if (!navigator.onLine) {
                    setStatus({ message: "Error: no internet connection. Cannot access microphone.", severity: "error" });
                 }
                 else {
                    setStatus({ message: "Could not access microphone. Please check connection and permissions.", severity: "error" });
                 }
                 console.error("Error accessing/starting microphone for SpeechRecognition:", err);
            }
        }
    };

    const handleFileUpload = async () => {
        try {
            const { open: openDialog } = await import('@tauri-apps/plugin-dialog');

            const selectedPath = await openDialog({
                title: "Select Audio File for Dictation",
                multiple: false,
                filters: [{ name: 'Audio', extensions: ['wav', 'mp3', 'm4a', 'flac', 'ogg'] }]
            });

            if (selectedPath && typeof selectedPath === 'string') {
                setStatus({ message: "Transcribing uploaded audio file, this may take a moment...", severity: "info" });
                setIsFileDictating(true); 

                const transcribedText = await invoke("perform_dictation_cmd", { audioFilePath: selectedPath });
                
                setEntryText(prev => prev.trim() ? `${prev.trim()} ${transcribedText.trim()}` : transcribedText.trim());
                setStatus({ message: "Uploaded audio transcribed successfully!", severity: "success" });
            } else if (selectedPath === null) {
                setStatus({ message: "Audio file selection cancelled.", severity: "info" });
            }
        } catch (err) {
            console.error("Error during file upload dictation:", err);
            let errorMessage = "Failed to transcribe audio file.";
            if (typeof err === 'string') {
                if (err.includes("Failed to load dictation model")) {
                    errorMessage = "Error: Could not load the transcription model.";
                } else if (err.includes("Unsupported audio sample rate")) {
                    errorMessage = "Dictation failed: Unsupported audio sample rate (16kHz required).";
                } else if (err.includes("Unsupported audio channel count")) {
                    errorMessage = "Dictation failed: Unsupported audio channel count (mono required).";
                } else {
                    errorMessage = err;
                }
            } else if (err.message) { 
                errorMessage = err.message;
            }
            setStatus({ message: errorMessage, severity: "error" });
        } finally {
            setIsFileDictating(false); 
        }
    };

    const handleSaveEntry = async () => {
        const currentEntryText = entryText.trim();
        if (!currentEntryText) { setStatus({ message: "Entry cannot be empty.", severity: "warning" }); return; }
        setSaving(true); let statusMessage = ""; let statusSeverity = "info"; setLastDetectedEmotion("");
        let classifiedEmotion = "unknown", generatedSuggestion = "Suggestion not available.";
        try { classifiedEmotion = await invoke("classify_emotion", { text: currentEntryText }); setLastDetectedEmotion(classifiedEmotion); }
        catch (classifyError) { statusMessage += `Emotion classification failed. `; statusSeverity = "warning"; }
        try { generatedSuggestion = await invoke("generate_suggestion_cmd", { entryTitle: "Journal Entry", entryContent: currentEntryText }); }
        catch (suggestionError) { statusMessage += `AI suggestion failed.`; statusSeverity = "warning"; }
        const contentToSave = `${currentEntryText}\n\n🧠 Emotion: ${classifiedEmotion}\n\n💡 Suggestion: ${generatedSuggestion}`;
        const currentDate = getCurrentDateString();
        const existingEntryForToday = entries.find(entry => entry.date === currentDate);
        const operation = existingEntryForToday ? "update_entry" : "create_entry";
        const payload = existingEntryForToday ? { date: currentDate, newTitle: existingEntryForToday.title || "Journal Entry", newContent: contentToSave, newPassword: existingEntryForToday.password, newImage: existingEntryForToday.image } : { title: "Journal Entry", content: contentToSave, password: null, image: null };
        try {
            await invoke(operation, payload);
            const verb = operation === "create_entry" ? "saved" : "updated";
            statusMessage = statusSeverity !== "warning" ? `Entry ${verb} successfully!` : `Entry ${verb} with issues: ${statusMessage}`;
            statusSeverity = statusSeverity !== "warning" ? "success" : statusSeverity;
            if (classifiedEmotion && classifiedEmotion.toLowerCase() !== "unknown") { statusMessage += ` Detected Emotion: ${classifiedEmotion.toUpperCase()}`; flashBackground(classifiedEmotion); }
            setEntryText(""); setShowAllEntriesInDrawer(false);
            const updatedEntries = await refreshEntriesList();
            const newOrUpdatedEntry = updatedEntries.find(e => e.date === currentDate);
            if (newOrUpdatedEntry) {
                setSelectedEntry(newOrUpdatedEntry);
                setCurrentView('main');
                setIsEditingSelectedEntry(false);
                setExpandedSuggestionIndices([0, 1, 2]);
            }
            else { statusMessage = `Entry ${verb}, but couldn't auto-select. Find it in the list.`; statusSeverity = "info"; }
        } catch (err) { statusMessage = `Failed to ${operation === "create_entry" ? 'save' : 'update'} entry: ${err.message || String(err)}`; statusSeverity = "error"; }
        finally { setStatus({ message: statusMessage, severity: statusSeverity }); setSaving(false); }
    };

    const handleStartEditSelectedEntry = () => { if (selectedEntry) { setEditedContentText(getContentForEditing(selectedEntry.content)); setIsEditingSelectedEntry(true); setStatus({ message: "", severity: "info" }); setLastDetectedEmotion(""); } };
    const handleCancelEditSelectedEntry = () => { setIsEditingSelectedEntry(false); setEditedContentText(""); setStatus({ message: "Edit cancelled.", severity: "info" }); };

    const handleConfirmUpdateSelectedEntry = async () => {
        const currentEditedContent = editedContentText.trim();
        if (!selectedEntry || !currentEditedContent) { setStatus({ message: "Content cannot be empty.", severity: "warning" }); return; }
        setSaving(true); let statusMessage = ""; let statusSeverity = "info"; setLastDetectedEmotion("");
        let classifiedEmotion = "unknown", generatedSuggestion = "Suggestion not available.";
        try { classifiedEmotion = await invoke("classify_emotion", { text: currentEditedContent }); setLastDetectedEmotion(classifiedEmotion); }
        catch (classifyError) { statusMessage += `Emotion classification failed. `; statusSeverity = "warning"; }
        try { generatedSuggestion = await invoke("generate_suggestion_cmd", { entryTitle: selectedEntry.title || "Journal Entry", entryContent: currentEditedContent }); }
        catch (suggestionError) { statusMessage += `AI suggestion failed.`; statusSeverity = "warning"; }
        const contentToSave = `${currentEditedContent}\n\n🧠 Emotion: ${classifiedEmotion}\n\n💡 Suggestion: ${generatedSuggestion}`;
        try {
            await invoke("update_entry", { date: selectedEntry.date, newTitle: selectedEntry.title || "Journal Entry", newContent: contentToSave, newPassword: selectedEntry.password, newImage: selectedEntry.image });
            statusMessage = statusSeverity !== "warning" ? "Entry updated successfully!" : `Entry updated with issues: ${statusMessage}`;
            statusSeverity = statusSeverity !== "warning" ? "success" : statusSeverity;
            if (classifiedEmotion && classifiedEmotion.toLowerCase() !== "unknown") { statusMessage += ` Detected Emotion: ${classifiedEmotion.toUpperCase()}`; flashBackground(classifiedEmotion); }
            const updatedEntries = await refreshEntriesList();
            const newlySelectedEntry = updatedEntries.find(entry => entry.date === selectedEntry.date) || null;
            setSelectedEntry(newlySelectedEntry);
            if (newlySelectedEntry) {
                setExpandedSuggestionIndices([0, 1, 2]);
            }
            setIsEditingSelectedEntry(false); setEditedContentText("");
        } catch (err) { statusMessage = `Failed to update entry: ${err.message || String(err)}`; statusSeverity = "error"; }
        finally { setStatus({ message: statusMessage, severity: statusSeverity }); setSaving(false); }
    };

    const handleDeleteEntryClick = (entry) => {
        if (!entry || !entry.date) {
            setStatus({ message: "Cannot delete: Invalid entry.", severity: "error" });
            return;
        }
        setEntryToDelete(entry);
        setDeleteConfirmOpen(true);
    };

    const handleCloseDeleteConfirm = () => {
        setDeleteConfirmOpen(false);
        setEntryToDelete(null);
    };

    const handleConfirmDeleteEntry = async () => {
        if (!entryToDelete || !entryToDelete.date) {
            setStatus({ message: "Cannot delete: Invalid entry.", severity: "error" });
            handleCloseDeleteConfirm();
            return;
        }
        setSaving(true);
        try {
            await invoke("delete_entry", { date: entryToDelete.date });
            setStatus({ message: "Entry deleted!", severity: "success" });
            if (isEditingSelectedEntry && selectedEntry?.date === entryToDelete.date) {
                setIsEditingSelectedEntry(false);
                setEditedContentText("");
            }
            await refreshEntriesList();
            setShowAllEntriesInDrawer(false);
            if (selectedEntry?.date === entryToDelete.date) {
                setSelectedEntry(null);
                handleNewEntryClick();
            }
            const currentEntries = await invoke("read_entries");
            if (currentEntries.length === 0) {
                handleNewEntryClick();
            }
        } catch (err) {
            setStatus({ message: `Failed to delete entry: ${err.message || String(err)}`, severity: "error" });
        } finally {
            setSaving(false);
            handleCloseDeleteConfirm();
        }
    };

    const handleDrawerOpen = () => setDrawerOpen(true);
    const handleDrawerClose = () => setDrawerOpen(false);
    const handleDrawerHoverOpen = () => !drawerOpen && setHoverOpen(true);
    const handleDrawerHoverClose = () => setHoverOpen(false);

    const handleEntrySelect = (entry) => {
        setSelectedEntry(entry);
        setIsEditingSelectedEntry(false);
        setEditedContentText("");
        setEntryText("");
        setStatus({ message: "", severity: "info" });
        setLastDetectedEmotion("");
        setCurrentView('main');
        setExpandedSuggestionIndices([0, 1, 2]);
    };
    const handleNewEntryClick = () => {
        setSelectedEntry(null);
        setIsEditingSelectedEntry(false);
        setEditedContentText("");
        setEntryText("");
        setStatus({ message: "", severity: "info" });
        setLastDetectedEmotion("");
        setCurrentView('main');
        setShowAllEntriesInDrawer(false);
        setExpandedSuggestionIndices([]);
    };
    const handleSettingsClick = () => {
        setCurrentView('settings');
        setSelectedEntry(null);
        setIsEditingSelectedEntry(false);
        setStatus({ message: "", severity: "info" });
        setLastDetectedEmotion("");
        setExpandedSuggestionIndices([]);
    };
    const handleInsightsClick = () => {
        setCurrentView('insights');
        setSelectedEntry(null);
        setIsEditingSelectedEntry(false);
        setStatus({ message: "", severity: "info" });
        setLastDetectedEmotion("");
        setExpandedSuggestionIndices([]);
    };
    const handleAssistantClick = () => {
        setCurrentView('assistant');
        setSelectedEntry(null);
        setIsEditingSelectedEntry(false);
        setStatus({ message: "", severity: "info" });
        setLastDetectedEmotion("");
        setExpandedSuggestionIndices([]);
    };

    const handleToggleSuggestionExpand = (index) => {
        setExpandedSuggestionIndices(prevIndices => {
            if (prevIndices.includes(index)) {
                return prevIndices.filter(i => i !== index);
            } else {
                return [...prevIndices, index];
            }
        });
    };

    const handleThemeModeChange = (newMode) => setThemeMode(newMode);
    const handleToggleShowEntries = () => setShowAllEntriesInDrawer(prev => !prev);
    const handleConfiguredUserNameChange = (newName) => {
        setConfiguredUserName(newName);
    };

    const handleOpenPinModal = (action) => {
        setPinAction(action);
        setPinInput("");
        setPinError("");
        setShowPinModal(true);
    };

    const handleClosePinModal = () => {
        setShowPinModal(false);
        setPinInput("");
        setPinError("");
    };

    const handlePinInputChange = (e) => {
        const value = e.target.value;
        if (/^\d*$/.test(value) && value.length <= 4) {
            setPinInput(value);
            setPinError("");
        }
    };

    const handleSubmitPin = async () => {
        if (pinInput.length !== 4) {
            setPinError("PIN must be 4 digits.");
            return;
        }
        setPinError("");
        setSaving(true);
        try {
            if (pinAction === 'create' || pinAction === 'change') {
                await invoke('set_new_password_cmd', { passwordStr: pinInput });
                setStatus({ message: `PIN ${pinAction === 'create' ? 'created' : 'changed'} successfully.`, severity: "success" });
                setIsPinSet(true);
                setIsAppLocked(true);
                await invoke('set_locked_explicit_cmd', { locked: true });
                handleClosePinModal();
            } else if (pinAction === 'unlock') {
                const isValid = await invoke('check_password_attempt_cmd', { passwordStr: pinInput });
                if (isValid) {
                    setStatus({ message: "PIN verified. Unlocked.", severity: "success" });
                    setIsAppLocked(false);
                    handleClosePinModal();
                } else {
                    setPinError("Invalid PIN. Try again.");
                }
            }
        } catch (error) {
            console.error(`Failed to ${pinAction} PIN:`, error);
            setPinError(`Failed: ${error.message || String(error)}`);
            setStatus({ message: `Failed to ${pinAction} PIN: ${error.message || String(error)}`, severity: "error" });
        } finally {
            setSaving(false);
            if (pinAction === 'create' || pinAction === 'change') {
                 await checkPinStatus();
            }
        }
    };

    if (isAppLocked && !showPinModal && isPinSet) {
        setShowPinModal(true);
        setPinAction('unlock');
    }

    useEffect(() => {
        if (currentView !== 'main' || !selectedEntry) {
            setGlobalBackgroundImageUrl(null);
            setActiveMonetColor(null);
            setIsMonetActiveForView(false);
        }
    }, [currentView, selectedEntry]);

    const renderMainContent = () => {
        if (isAppLocked) return <Box sx={{display: 'flex', flexGrow: 1, alignItems: 'center', justifyContent: 'center'}}><CircularProgress /></Box>;

        switch (currentView) {
            case 'settings':
                return <SettingsPage
                    currentThemeMode={themeMode}
                    onThemeModeChange={handleThemeModeChange}
                    onBack={handleNewEntryClick}
                    isPinSet={isPinSet}
                    onOpenPinModal={handleOpenPinModal}
                    setStatus={setStatus}
                    configuredUserName={configuredUserName}
                    onConfiguredUserNameChange={handleConfiguredUserNameChange}
                    refreshPinStatus={checkPinStatus}
                />;
            case 'insights':
                return <InsightsPage
                    entries={entries}
                    onBack={handleNewEntryClick}
                    handleEntrySelect={handleEntrySelect}
                />;
            case 'assistant':
                return <AssistantPage
                    theme={muiTheme}
                    setStatus={setStatus}
                    onBack={handleNewEntryClick}
                />;
            case 'main':
            default:
                if (selectedEntry) {
                    return <JournalEntryView
                        selectedEntry={selectedEntry}
                        isEditingSelectedEntry={isEditingSelectedEntry}
                        editedContentText={editedContentText}
                        onEditedContentTextChange={setEditedContentText}
                        onStartEditSelectedEntry={handleStartEditSelectedEntry}
                        onCancelEditSelectedEntry={handleCancelEditSelectedEntry}
                        onConfirmUpdateSelectedEntry={handleConfirmUpdateSelectedEntry}
                        onDeleteEntryClick={handleDeleteEntryClick}
                        saving={saving}
                        onBackToNewEntry={handleNewEntryClick}
                        expandedSuggestionIndices={expandedSuggestionIndices}
                        onToggleSuggestionExpand={handleToggleSuggestionExpand}
                        onTriggerImageUpload={() => handleOpenImageUploadModal(selectedEntry)}
                        onGlobalBackgroundChange={setGlobalBackgroundImageUrl}
                        currentThemeMode={themeMode}
                        setActiveMonetColor={setActiveMonetColor}
                        setIsMonetActiveForView={setIsMonetActiveForView}
                        deleteConfirmOpen={deleteConfirmOpen}
                        onCloseDeleteConfirm={handleCloseDeleteConfirm}
                        onConfirmDeleteEntry={handleConfirmDeleteEntry}
                        entryToDelete={entryToDelete}
                    />;
                }
                return <NewEntryForm
                    entryText={entryText}
                    onEntryTextChange={setEntryText}
                    onSaveEntry={handleSaveEntry}
                    onUploadAudioFile={handleFileUpload}
                    onStartDictation={handleStartDictation}
                    isDictating={isDictating}
                    isFileDictating={isFileDictating}
                    saving={saving}
                    getGreeting={getGreeting}
                />;
        }
    };

    return (
        <ThemeProvider theme={muiTheme}>
            <CssBaseline />
            <Box sx={{
                display: 'flex',
                height: '100vh',
                transition: 'background-color 0.5s ease, background-image 0.5s ease',
                bgcolor: globalBackgroundImageUrl ? 'transparent' : (flashColor || muiTheme.palette.background.default),
                ...(globalBackgroundImageUrl && {
                    backgroundImage: `url("${globalBackgroundImageUrl}")`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                }),
            }}>
                {!isAppLocked && (
                    <>
                        <StyledAppBar position="fixed" isPinnedOpen={drawerOpen}>
                            <Toolbar>
                                <IconButton color="inherit" aria-label="open drawer" onClick={handleDrawerOpen} edge="start" sx={{ mr: 5, ...(drawerOpen && { display: 'none' }) }}>
                                    <MenuIcon />
                                </IconButton>
                                <Typography variant="h6" noWrap component="div">
                                    {currentView === 'settings' ? 'Settings'
                                        : currentView === 'insights' ? 'Insights'
                                            : currentView === 'assistant' ? 'Assistant'
                                                : selectedEntry ? (isEditingSelectedEntry ? `Editing: ${formatDate(selectedEntry.date)}` : formatDate(selectedEntry.date))
                                                    : "MoodJourney"}
                                </Typography>
                            </Toolbar>
                        </StyledAppBar>
                        <AppDrawer
                            muiTheme={muiTheme}
                            drawerOpen={drawerOpen}
                            hoverOpen={hoverOpen}
                            handleDrawerClose={handleDrawerClose}
                            handleDrawerHoverOpen={handleDrawerHoverOpen}
                            handleDrawerHoverClose={handleDrawerHoverClose}
                            handleNewEntryClick={handleNewEntryClick}
                            loading={loading}
                            entries={entries}
                            selectedEntry={selectedEntry}
                            currentView={currentView}
                            isEditingSelectedEntry={isEditingSelectedEntry}
                            handleEntrySelect={handleEntrySelect}
                            showAllEntriesInDrawer={showAllEntriesInDrawer}
                            handleToggleShowEntries={handleToggleShowEntries}
                            handleAssistantClick={handleAssistantClick}
                            handleInsightsClick={handleInsightsClick}
                            handleSettingsClick={handleSettingsClick}
                        />
                    </>
                )}

                <Box component="main" sx={{
                    flexGrow: 1,
                    p: isAppLocked ? 0 : 3,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-start',
                    height: '100%',
                    overflow: 'hidden',
                    bgcolor: 'transparent',
                }}>
                    {!isAppLocked && <Toolbar />}
                    {renderMainContent()}
                </Box>

                <PinModal
                    open={showPinModal}
                    onClose={handleClosePinModal}
                    pinAction={pinAction}
                    pinInput={pinInput}
                    onPinInputChange={handlePinInputChange}
                    pinError={pinError}
                    onSubmitPin={handleSubmitPin}
                    saving={saving}
                />
                {entryForImageUpload && (
                     <ImageUploadModal
                        open={imageUploadModalOpen}
                        onClose={handleCloseImageUploadModal}
                        currentImagePath={entryForImageUpload?.image}
                        onConfirmUpload={handleImageUploadConfirm}
                        savingImage={saving}
                    />
                )}
                 <ConfirmationDialog
                    open={deleteConfirmOpen && entryToDelete && (!selectedEntry || entryToDelete?.date !== selectedEntry.date)}
                    onClose={handleCloseDeleteConfirm}
                    onConfirm={handleConfirmDeleteEntry}
                    title="Confirm Deletion"
                    contentText="Are you sure you want to delete this journal entry? This action cannot be undone."
                    confirmButtonText="Delete"
                    confirmButtonColor="error"
                    ConfirmButtonIcon={DeleteIcon}
                />
                <Snackbar
                    open={!!(status.message && status.severity !== "info")}
                    autoHideDuration={ALERT_TIMEOUT_DURATION}
                    onClose={handleCloseStatus}
                    anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
                    sx={{ mt: { xs: 7, sm: 8 } }}
                >
                    <MuiAlert
                        onClose={handleCloseStatus}
                        severity={status.severity === "info" ? "success" : status.severity}
                        variant="filled"
                        sx={{ width: '100%', boxShadow: 6 }}
                    >
                        {status.message}
                    </MuiAlert>
                </Snackbar>
            </Box>
        </ThemeProvider>
    );
}

export default App;
