import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { invoke } from "@tauri-apps/api/core";
import { ThemeProvider, CssBaseline, Box, Toolbar, Typography, Snackbar, Alert as MuiAlert, CircularProgress } from '@mui/material';
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
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [entryToDelete, setEntryToDelete] = useState(null);

    const [isPinSet, setIsPinSet] = useState(false);
    const [showPinModal, setShowPinModal] = useState(false);
    const [pinInput, setPinInput] = useState("");
    const [pinError, setPinError] = useState("");
    const [pinAction, setPinAction] = useState("");
    const [isAppLocked, setIsAppLocked] = useState(true);

    const [expandedSuggestionIndices, setExpandedSuggestionIndices] = useState([]);

    const muiTheme = useMemo(() => {
        if (themeMode === 'girlboss') return girlbossTheme;
        return isDarkModeActive ? darkTheme : lightTheme;
    }, [isDarkModeActive, themeMode]);

    const checkPinStatus = useCallback(async () => {
        try {
            const pinIsCurrentlySet = await invoke('is_pin_set_cmd');
            setIsPinSet(pinIsCurrentlySet);

            if (pinIsCurrentlySet) {
                const appIsLocked = await invoke('is_locked');
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
        window.refreshPinStatus = checkPinStatus; // Make it globally accessible
        checkPinStatus(); // Initial check
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

    useEffect(() => {
        localStorage.setItem('appConfiguredUserName', configuredUserName);
    }, [configuredUserName]);


    const handleCloseStatus = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
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

    const handleStartDictation = async () => {
        let selectedPath = null;
        try {
            const { open } = await import('@tauri-apps/plugin-dialog');
            selectedPath = await open({ title: "Select Audio File", multiple: false, filters: [{ name: 'Audio', extensions: ['wav', 'mp3', 'm4a', 'flac', 'ogg'] }] });
            selectedPath = Array.isArray(selectedPath) ? selectedPath[0] : selectedPath;
        } catch (dialogError) { setStatus({ message: `Could not open file dialog: ${dialogError.message || String(dialogError)}`, severity: "error" }); return; }
        if (!selectedPath) { setStatus({ message: "Dictation cancelled: No audio file selected.", severity: "info" }); return; }
        setIsDictating(true); setStatus({ message: "Transcribing audio...", severity: "info" });
        try {
            const transcribedText = await invoke("perform_dictation_cmd", { audioFilePath: selectedPath });
            setEntryText(prev => prev.trim() ? `${prev.trim()} ${transcribedText}` : transcribedText);
            setStatus({ message: "Dictation successful!", severity: "success" });
        } catch (err) {
            let errMsg = `Dictation failed: ${err.message || String(err)}`;
            if (String(err).includes("Unsupported audio sample rate")) errMsg = "Dictation failed: Unsupported audio sample rate (16kHz required).";
            else if (String(err).includes("Unsupported audio channel count")) errMsg = "Dictation failed: Unsupported audio channel count (mono required).";
            setStatus({ message: errMsg, severity: "error" });
        } finally { setIsDictating(false); }
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
            if (newOrUpdatedEntry) { setSelectedEntry(newOrUpdatedEntry); setCurrentView('main'); setIsEditingSelectedEntry(false); }
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
            setSelectedEntry(updatedEntries.find(entry => entry.date === selectedEntry.date) || null);
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
        setExpandedSuggestionIndices([]);
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
                await invoke('set_new_password', { password: pinInput });
                setStatus({ message: `PIN ${pinAction === 'create' ? 'created' : 'changed'} successfully.`, severity: "success" });
                setIsPinSet(true);
                setIsAppLocked(true);
                await invoke('set_locked_cmd', { locked: true });
                handleClosePinModal();
            } else if (pinAction === 'unlock') {
                const isValid = await invoke('check_password_attempt', { password: pinInput });
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
                    onStartDictation={handleStartDictation}
                    isDictating={isDictating}
                    saving={saving}
                    getGreeting={getGreeting}
                />;
        }
    };

    return (
        <ThemeProvider theme={muiTheme}>
            <CssBaseline />
            <Box sx={{ display: 'flex', height: '100vh', bgcolor: flashColor || muiTheme.palette.background.default, transition: 'background-color 0.5s ease' }}>
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

                <Box component="main" sx={{ flexGrow: 1, p: isAppLocked ? 0 : 3, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', height: '100%', overflow: 'hidden' }}>
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
