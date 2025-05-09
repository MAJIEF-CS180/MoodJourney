import React, { useState, useEffect, useMemo } from 'react';
import { invoke } from "@tauri-apps/api/core";
// We'll use tauri's dialog API to select the audio file for dictation
// It will be imported dynamically in the handler function to keep initial load small.

import { styled, useTheme, ThemeProvider, createTheme, alpha } from '@mui/material/styles';
import {
    AppBar as MuiAppBar, Box, Button, Drawer as MuiDrawer, List, ListItem,
    ListItemButton, ListItemIcon, ListItemText, Toolbar, Typography,
    CircularProgress, Alert, CssBaseline, Divider, Paper, IconButton,
    TextField, Switch
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import AddIcon from '@mui/icons-material/Add';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ArticleIcon from '@mui/icons-material/Article';
import SendIcon from '@mui/icons-material/Send';
import SettingsIcon from '@mui/icons-material/Settings';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
// import InfoIcon from '@mui/icons-material/Info'; // Keep if used elsewhere, or remove
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import MicIcon from '@mui/icons-material/Mic'; // Added Microphone Icon

// Constants for drawer width
const drawerWidth = 240;
const miniDrawerWidth = 65;
const INITIAL_VISIBLE_ENTRIES = 5;
const ALERT_TIMEOUT_DURATION = 10000; // 10 seconds in milliseconds


// Mixin for opened drawer style
const openedMixin = (theme) => ({
    width: drawerWidth,
    transition: theme.transitions.create('width', {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.enteringScreen,
    }),
    overflowX: 'hidden',
});

// Mixin for closed drawer style
const closedMixin = (theme) => ({
    transition: theme.transitions.create('width', {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.leavingScreen,
    }),
    overflowX: 'hidden',
    width: `${miniDrawerWidth}px`,
});

// Styled AppBar component
const AppBar = styled(MuiAppBar, {
    shouldForwardProp: (prop) => prop !== 'isPinnedOpen',
})(({ theme, isPinnedOpen }) => ({
    zIndex: theme.zIndex.drawer + 1,
    transition: theme.transitions.create(['width', 'margin'], {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.leavingScreen,
    }),
    ...(isPinnedOpen && {
        marginLeft: drawerWidth,
        width: `calc(100% - ${drawerWidth}px)`,
        transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
        }),
    }),
}));

// Styled Drawer component
const Drawer = styled(MuiDrawer, { shouldForwardProp: (prop) => prop !== 'open' })(
    ({ theme, open }) => ({
        width: drawerWidth,
        flexShrink: 0,
        whiteSpace: 'nowrap',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        '& .MuiDrawer-paper': {
            boxShadow: 'none',
            display: 'flex',
            flexDirection: 'column',
        },
        ...(open && {
            ...openedMixin(theme),
            '& .MuiDrawer-paper': openedMixin(theme),
        }),
        ...(!open && {
            ...closedMixin(theme),
            '& .MuiDrawer-paper': closedMixin(theme),
        }),
    }),
);

// Combined Settings and About Page
function CombinedSettingsPage({ darkMode, onDarkModeChange, onBack }) {
    const theme = useTheme();
    return (
        <>
            <Box sx={{ mb: 2, alignSelf: 'flex-start', flexShrink: 0 }}>
                <Button
                    startIcon={<ArrowBackIcon />}
                    onClick={onBack}
                    variant="outlined"
                >
                    Back to Journal
                </Button>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, width: '100%', flexGrow: 1, overflow: 'auto' }}>
                {/* Main Settings Content Area (Larger Box) */}
                <Paper
                    sx={{
                        p: 3,
                        flex: { xs: '1 1 auto', md: '2 1 0%' },
                        minWidth: 0,
                        overflowY: 'auto',
                        borderRadius: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                    }}
                >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', mb: 2, pt: 1 }}>
                        <Typography variant="body1" id="dark-mode-label" sx={{ fontSize: '1.125rem' }}>
                            Dark Mode
                        </Typography>
                        <Switch
                            checked={darkMode}
                            onChange={onDarkModeChange}
                            name="darkModeToggle"
                            color="primary"
                            inputProps={{ 'aria-labelledby': 'dark-mode-label' }}
                        />
                    </Box>
                    <Typography variant="body1" color="text.secondary" sx={{mt: 'auto', pt: 2, fontSize: '1.125rem' }}>
                        More settings will be available here in the future.
                    </Typography>
                </Paper>

                {/* About Information Area (Smaller Box) */}
                <Paper
                    sx={{
                        p: 2.5,
                        flex: { xs: '1 1 auto', md: '1 1 0%' },
                        minWidth: 0,
                        borderRadius: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        overflowY: 'auto',
                        borderLeft: { md: `1px solid ${theme.palette.divider}` },
                    }}
                >
                    <Box sx={{ flexGrow: 1, pt: 1 }}>
                        <Typography variant="body1" sx={{ fontSize: '1.125rem', color: 'text.primary', pt: 1 }}>
                            MoodJourney v0.10
                        </Typography>
                    </Box>
                </Paper>
            </Box>
        </>
    );
}


// Base theme options
const baseThemeOptions = {
    typography: {
        fontFamily: '"Inter", Arial, sans-serif',
    },
    shape: { borderRadius: 12 },
    components: {
        MuiButton: {
            defaultProps: { disableElevation: true },
            styleOverrides: {
                root: { textTransform: 'none', borderRadius: 20 },
                contained: { borderRadius: 20 }
            }
        },
        MuiTextField: {
            defaultProps: { variant: 'filled' },
            styleOverrides: {
                root: ({ theme }) => ({
                    '& .MuiFilledInput-underline:before, & .MuiFilledInput-underline:after, & .MuiFilledInput-underline:hover:not(.Mui-disabled):before': { borderBottom: 'none' },
                    '& .MuiFilledInput-root': {
                        backgroundColor: theme.palette.action.hover,
                        borderRadius: '4px',
                        '&:hover, &.Mui-focused': { backgroundColor: theme.palette.action.selected }
                    }
                })
            }
        },
        MuiPaper: {
            defaultProps: { elevation: 0 },
            styleOverrides: {
                root: ({ theme }) => ({
                    backgroundColor: theme.palette.background.paper,
                    border: `1px solid ${theme.palette.divider}`,
                })
            }
        },
        MuiDrawer: {
            styleOverrides: {
                paper: ({ theme }) => ({
                    backgroundColor: theme.palette.background.paper,
                    borderRight: `1px solid ${theme.palette.divider}`,
                })
            }
        },
        MuiAppBar: {
            defaultProps: { elevation: 0 },
            styleOverrides: {
                root: ({ theme }) => ({
                    backgroundColor: theme.palette.background.paper,
                    color: theme.palette.text.primary,
                    borderBottom: `1px solid ${theme.palette.divider}`,
                })
            }
        },
        MuiAlert: {
            styleOverrides: {
                standardSuccess: ({ theme }) => ({
                    color: theme.palette.primary.main,
                    backgroundColor: alpha(theme.palette.primary.main, theme.palette.mode === 'light' ? 0.12 : 0.18),
                    '& .MuiAlert-icon': {
                        color: theme.palette.primary.main,
                    },
                }),
                standardError: ({ theme }) => ({
                    color: theme.palette.primary.main, // Using primary for error as well, consider theme.palette.error.main
                    backgroundColor: alpha(theme.palette.primary.main, theme.palette.mode === 'light' ? 0.12 : 0.18), // Consider theme.palette.error.light
                    '& .MuiAlert-icon': {
                        color: theme.palette.primary.main, // Consider theme.palette.error.main
                    },
                }),
                 // Add styles for warning and info if needed, or ensure they use defaults
                standardWarning: ({ theme }) => ({
                    color: theme.palette.mode === 'light' ? theme.palette.warning.dark : theme.palette.warning.light,
                    backgroundColor: alpha(theme.palette.warning.main, theme.palette.mode === 'light' ? 0.12 : 0.18),
                     '& .MuiAlert-icon': {
                        color: theme.palette.mode === 'light' ? theme.palette.warning.dark : theme.palette.warning.light,
                    },
                }),
            },
        },
    }
};

// Light theme
const lightTheme = createTheme({
    ...baseThemeOptions,
    palette: {
        mode: 'light',
        primary: { main: '#23325A' }, // Midnight Blue
        secondary: { main: '#653666' }, // Wineberry
        background: {
            default: '#F3EEEB', // Sweet Cream - Main app background
            paper: '#FFFCF9',    // Off-white (very light cream) for paper surfaces
        },
        text: {
            primary: '#23325A',   // Midnight Blue - Main text color
            secondary: alpha('#23325A', 0.7), // Lighter Midnight Blue for secondary text
        },
        action: {
            hover: alpha('#23325A', 0.06),
            selected: alpha('#23325A', 0.12),
        },
        divider: alpha('#23325A', 0.2),
        warning: { // Added warning palette for light theme
            main: '#FFA726', // Amber
            light: '#FFB74D',
            dark: '#F57C00',
        },
    },
});

// Dark theme
const darkTheme = createTheme({
    ...baseThemeOptions,
    palette: {
        mode: 'dark',
        primary: { main: '#F3EEEB' }, // Sweet Cream (light for contrast on dark)
        secondary: { main: '#DECCCA' }, // Misty Blush (also light for contrast)
        background: {
            default: '#1A2238', // Darker Midnight Blue
            paper: '#23325A',    // Midnight Blue (for cards, drawer, appbar)
        },
        text: {
            primary: '#F3EEEB',   // Sweet Cream - Main text color for readability
            secondary: alpha('#F3EEEB', 0.7), // Lighter Sweet Cream for secondary text
        },
        action: {
            hover: alpha('#F3EEEB', 0.08),
            selected: alpha('#F3EEEB', 0.16),
        },
        divider: alpha('#F3EEEB', 0.12),
        warning: { // Added warning palette for dark theme
            main: '#FFB74D', // Lighter Amber for dark mode
            light: '#FFCC80',
            dark: '#FFA726',
        },
    },
});


// Main App component
function App() {
    // State hooks
    const [darkMode, setDarkMode] = useState(false);
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
    const [isDictating, setIsDictating] = useState(false); // New state for dictation process

    const theme = useMemo(() => (darkMode ? darkTheme : lightTheme), [darkMode]);
    const userName = "Michael"; // Example user name
    const isDrawerVisuallyOpen = drawerOpen || hoverOpen;

    // Function to clear status message
    const handleCloseStatus = () => setStatus({ message: "", severity: "info" });

    // useEffect for auto-closing status messages
    useEffect(() => {
        let timer;
        // Check if there's a message and it's not a simple 'info' one (or if you want all to auto-close, adjust condition)
        if (status.message && status.severity !== "info") {
            timer = setTimeout(() => {
                handleCloseStatus();
            }, ALERT_TIMEOUT_DURATION); // Use the constant for 10 seconds
        }
        // Cleanup function to clear the timer if the component unmounts
        // or if the status changes again before the timer finishes
        return () => {
            clearTimeout(timer);
        };
    }, [status]); // Re-run this effect if the status object changes


    const flashBackground = (emotion) => {
        const emotionUpper = emotion?.toUpperCase();
        let colorToSet = null;

        if (emotionUpper === "POSITIVE") {
            colorToSet = darkMode ? '#2E7D32' : '#D4EDDA';
        } else if (emotionUpper === "NEGATIVE") {
            colorToSet = darkMode ? '#C62828' : '#F8D7DA';
        }
        
        if (colorToSet) {
            setFlashColor(colorToSet);
            setTimeout(() => {
                setFlashColor(null);
            }, 1000);
        }
    };

    const extractEmotionFromContent = (content) => {
        if (!content) return null;
        const match = content.match(/\n\n🧠 Emotion: (\w+)$/);
        return match ? match[1] : null;
    };

    const getContentForDisplay = (content) => {
        if (!content) return "";
        return content.replace(/\n\n🧠 Emotion: \w+$/, "");
    };

    const formatDate = (dateString) => {
        if (!dateString) return "Invalid Date";
        const date = new Date(dateString + 'T00:00:00Z'); // Ensure date is treated as UTC
        return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
    };

    const getGreeting = (name) => {
        const hour = new Date().getHours();
        const timeOfDay = hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";
        return name ? `${timeOfDay}, ${name}` : timeOfDay;
    };

    const getCurrentDateString = () => new Date().toISOString().split('T')[0];

    const refreshEntriesList = async () => {
        setLoading(true);
        let freshEntries = [];
        try {
            freshEntries = (await invoke("read_entries")) || [];
            const sorted = freshEntries.sort((a, b) => new Date(b.date) - new Date(a.date));
            setEntries(sorted);
        } catch (err) {
            console.error("Error refreshing entries list:", err);
            setStatus({ message: `Error refreshing entries: ${err.message || String(err)}`, severity: "error" });
            setEntries([]); // Clear entries on error to avoid displaying stale data
        } finally {
            setLoading(false);
        }
        return freshEntries; // Return for immediate use if needed
    };
    
    useEffect(() => {
        refreshEntriesList();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Initial load

    // NEW: Handler for starting dictation
    const handleStartDictation = async () => {
        let selectedPath = null;
        try {
            // Dynamically import tauri's dialog API
            const { open } = await import('@tauri-apps/plugin-dialog');
            const dialogResult = await open({
                title: "Select Audio File for Dictation",
                multiple: false,
                filters: [{
                    name: 'Audio',
                    // Common audio formats; ensure your whisper.rs setup supports these.
                    // WAV is generally safest for whisper.cpp.
                    extensions: ['wav', 'mp3', 'm4a', 'flac', 'ogg'] 
                }]
            });

            if (Array.isArray(dialogResult)) { // Should not happen with multiple: false
                selectedPath = dialogResult[0];
            } else { // string (path) or null (if cancelled)
                selectedPath = dialogResult;
            }

        } catch (dialogError) {
            console.error("Error opening file dialog:", dialogError);
            setStatus({ message: `Could not open file dialog: ${dialogError.message || String(dialogError)}`, severity: "error" });
            return; // Exit if dialog fails
        }

        if (!selectedPath) {
            // User cancelled the dialog or no file was selected
            setStatus({ message: "Dictation cancelled: No audio file selected.", severity: "info" }); // This will not auto-close
            return; 
        }

        // Proceed with dictation if a file was selected
        setIsDictating(true);
        setStatus({ message: "Transcribing audio, please wait...", severity: "info" }); // This will not auto-close

        try {
            // Invoke the Rust backend command for dictation
            const transcribedText = await invoke("perform_dictation", { audioFilePath: selectedPath });
            // Append transcribed text to existing entry text, adding a space if needed
            setEntryText(prevText => prevText.trim() ? `${prevText.trim()} ${transcribedText}` : transcribedText);
            setStatus({ message: "Dictation successful! Text has been added.", severity: "success" });
        } catch (err) {
            console.error("Error during dictation:", err);
            let errorMessage = "Dictation failed. Please try again.";
            // Attempt to provide more specific error messages from the backend
            if (err && typeof err === 'string') {
                if (err.includes("Unsupported audio sample rate")) {
                    errorMessage = "Dictation failed: Unsupported audio sample rate. Whisper requires 16kHz.";
                } else if (err.includes("Unsupported audio channel count")) {
                    errorMessage = "Dictation failed: Unsupported audio channel count. Whisper requires mono audio.";
                } else if (err.includes("Model") && err.includes("not found")) {
                    errorMessage = "Dictation failed: Transcription model not found. Please check application setup.";
                } else if (err.includes("Audio file not found")) {
                    errorMessage = "Dictation failed: Audio file could not be found or accessed.";
                } else {
                     errorMessage = `Dictation failed: ${err}`;
                }
            } else if (err && err.message) {
                errorMessage = `Dictation failed: ${err.message}`;
            }
            setStatus({ message: errorMessage, severity: "error" });
        } finally {
            setIsDictating(false);
        }
    };


    const handleSaveEntry = async () => {
        if (!entryText.trim()) {
            setStatus({ message: "Entry cannot be empty.", severity: "warning" });
            return;
        }
        setSaving(true);
        let currentStatusObject = { message: "", severity: "info" };
        setLastDetectedEmotion(""); // Reset last detected emotion

        let classifiedEmotion = "";
        let contentToSave = entryText;

        try {
            const detectedEmotion = await invoke("classify_emotion", { text: entryText });
            classifiedEmotion = detectedEmotion;
            setLastDetectedEmotion(detectedEmotion);
            contentToSave = `${entryText}\n\n🧠 Emotion: ${detectedEmotion}`;
        } catch (classifyError) {
            console.error("Error classifying emotion:", classifyError);
            currentStatusObject = { message: `Entry to be saved. Emotion classification failed: ${classifyError.message || String(classifyError)}`, severity: "warning" };
            if (!contentToSave.includes("\n\n🧠 Emotion:")) { // Ensure emotion tag exists even if unknown
                 contentToSave = `${entryText}\n\n🧠 Emotion: unknown`;
            }
        }
        
        const currentDate = getCurrentDateString();
        const originalEntriesCount = entries.length; // For checking if a new entry was added
        const existingEntryForToday = entries.find(entry => entry.date === currentDate);
        const operation = existingEntryForToday ? "update_entry" : "create_entry";
        
        let payload;
        if (existingEntryForToday) { // Update existing entry for today
            payload = { 
                date: currentDate, 
                newTitle: existingEntryForToday.title || "Journal Entry", 
                newContent: contentToSave, 
                newPassword: existingEntryForToday.password // Preserve existing password if any
            };
        } else { // Create new entry
            payload = { 
                title: "Journal Entry", // Default title
                content: contentToSave, 
                password: null, // No password by default for new entries
            };
        }

        try {
            await invoke(operation, payload);
            const successVerbText = operation === "create_entry" ? "saved" : "updated";
            
            if (classifiedEmotion) { // Flash background based on emotion
                flashBackground(classifiedEmotion);
            }

            if (classifiedEmotion && classifiedEmotion.toLowerCase() !== "unknown") {
                currentStatusObject = { message: `Entry ${successVerbText} successfully! Detected Emotion: ${classifiedEmotion.toUpperCase()}`, severity: "success" };
            } else if (currentStatusObject.severity !== "warning") { // If no classification error
                currentStatusObject = { message: `Entry ${successVerbText} successfully!`, severity: "success" };
            }

            setEntryText(""); // Clear input field
            setShowAllEntriesInDrawer(false); // Collapse entry list if expanded

            const allEntriesAfterOperation = await refreshEntriesList(); // Refresh list and get updated entries
            let entryToSelect = null;

            // Try to select the newly created/updated entry
            if (operation === "create_entry") {
                entryToSelect = allEntriesAfterOperation.find(e => e.date === currentDate);
                // Fallback if new entry not found by date (should ideally not happen)
                if (!entryToSelect && allEntriesAfterOperation.length > originalEntriesCount && allEntriesAfterOperation.length > 0) {
                    console.warn(`Newly created entry not found by date '${currentDate}'. Selecting newest entry ('${allEntriesAfterOperation[0].date}') as a fallback.`);
                    entryToSelect = allEntriesAfterOperation[0]; // Select the newest entry (top of sorted list)
                }
            } else { // For update operation
                entryToSelect = allEntriesAfterOperation.find(entry => entry.date === currentDate);
            }
            
            if (entryToSelect) {
                setSelectedEntry(entryToSelect); // Display the saved/updated entry
                setCurrentView('main'); // Ensure main view is active
                setIsEditingSelectedEntry(false); // Not in edit mode for the selected entry
            } else {
                // If entry wasn't auto-selected, adjust status message
                if (currentStatusObject.severity === "success") { 
                     currentStatusObject = { message: `Entry ${successVerbText} successfully, but could not automatically display it. Please select it from the list.`, severity: "info" }; 
                }
            }

        } catch (err) {
            console.error(`Error ${operation} entry:`, err);
            currentStatusObject = { message: `Failed to ${operation === "create_entry" ? 'save' : 'update'} entry: ${err.message || String(err)}`, severity: "error" };
        } finally {
            setStatus(currentStatusObject); // Update status message
            setSaving(false); // Reset saving state
        }
    };

    const handleStartEditSelectedEntry = () => {
        if (selectedEntry) {
            const contentWithoutEmotion = getContentForDisplay(selectedEntry.content);
            setEditedContentText(contentWithoutEmotion);
            setIsEditingSelectedEntry(true);
            setStatus({ message: "", severity: "info" }); // Clear previous status
            setLastDetectedEmotion(""); // Clear previous emotion
        }
    };

    const handleCancelEditSelectedEntry = () => {
        setIsEditingSelectedEntry(false);
        setEditedContentText(""); // Clear edited text
        setStatus({ message: "Edit cancelled.", severity: "info" }); // This will not auto-close
        setLastDetectedEmotion("");
    };

    const handleConfirmUpdateSelectedEntry = async () => {
        if (!selectedEntry || !editedContentText.trim()) {
            setStatus({ message: "Content cannot be empty.", severity: "warning" });
            return;
        }
        setSaving(true); // Indicate saving process
        let currentStatusObject = { message: "", severity: "info" };
        setLastDetectedEmotion("");

        let classifiedEmotion = "";
        let contentToSave = editedContentText;

        try {
            const detectedEmotion = await invoke("classify_emotion", { text: editedContentText });
            classifiedEmotion = detectedEmotion;
            setLastDetectedEmotion(detectedEmotion);
            contentToSave = `${editedContentText}\n\n🧠 Emotion: ${detectedEmotion}`;
        } catch (classifyError) {
            console.error("Error classifying emotion during edit:", classifyError);
            currentStatusObject = { message: `Update to be saved. Emotion classification failed: ${classifyError.message || String(classifyError)}`, severity: "warning" };
            if (!contentToSave.includes("\n\n🧠 Emotion:")) {
                 contentToSave = `${editedContentText}\n\n🧠 Emotion: unknown`;
            }
        }

        try {
            await invoke("update_entry", { 
                date: selectedEntry.date,
                newTitle: selectedEntry.title || "Journal Entry", // Use existing title or default
                newContent: contentToSave, 
                newPassword: selectedEntry.password, // Preserve existing password
            });

            if (classifiedEmotion) { // Flash background based on emotion
                 flashBackground(classifiedEmotion);
            }
            
            if (classifiedEmotion && classifiedEmotion.toLowerCase() !== "unknown") {
                 currentStatusObject = { message: `Entry updated successfully! Detected Emotion: ${classifiedEmotion.toUpperCase()}`, severity: "success" };
            } else if (currentStatusObject.severity !== "warning") {
                 currentStatusObject = { message: "Entry updated successfully!", severity: "success" };
            }
            
            const allEntriesAfterUpdate = await refreshEntriesList(); // Refresh list
            const entryToSelect = allEntriesAfterUpdate.find(entry => entry.date === selectedEntry.date); // Find the updated entry
            
            setSelectedEntry(entryToSelect || null); // Update selected entry state

            setIsEditingSelectedEntry(false); // Exit edit mode
            setEditedContentText(""); // Clear edit text field
        } catch (err) {
            console.error("Error updating entry:", err);
            currentStatusObject = { message: `Failed to update entry: ${err.message || String(err)}`, severity: "error" };
        } finally {
            setStatus(currentStatusObject);
            setSaving(false); // Reset saving state
        }
    };

    const handleDeleteEntry = async (entryToDelete) => {
        if (!entryToDelete || !entryToDelete.date) {
            setStatus({ message: "Cannot delete: Invalid entry data.", severity: "error" });
            return;
        }
        
        setSaving(true); // Indicate operation in progress
        setStatus({ message: "", severity: "info" }); // Clear status
        setLastDetectedEmotion("");
        try {
            await invoke("delete_entry", { date: entryToDelete.date }); // Call backend to delete
            setStatus({ message: "Entry deleted successfully!", severity: "success" });
            
            // If the currently edited entry was deleted, exit edit mode
            if (isEditingSelectedEntry && selectedEntry && selectedEntry.date === entryToDelete.date) {
                setIsEditingSelectedEntry(false);
                setEditedContentText("");
            }

            const remainingEntries = await refreshEntriesList(); // Refresh entry list
            setShowAllEntriesInDrawer(false); // Collapse drawer list if expanded

            // If the deleted entry was selected, clear selection and go to new entry mode
            if (selectedEntry && selectedEntry.date === entryToDelete.date) {
                setSelectedEntry(null); 
                setEntryText(""); // Clear main input field
                handleNewEntryClick(); // Switch to "new entry" view
            } else if (remainingEntries.length === 0) { // If no entries left, go to new entry mode
                 handleNewEntryClick(); 
            }
        } catch (err) {
            console.error("Error deleting entry:", err);
            setStatus({ message: `Failed to delete entry: ${err.message || String(err)}`, severity: "error" });
        } finally {
            setSaving(false); // Reset saving state
        }
    };

    // Drawer visibility handlers
    const handleDrawerOpen = () => setDrawerOpen(true);
    const handleDrawerClose = () => setDrawerOpen(false);
    const handleDrawerHoverOpen = () => !drawerOpen && setHoverOpen(true); // Open on hover only if not pinned open
    const handleDrawerHoverClose = () => setHoverOpen(false);
    

    // Entry selection and navigation handlers
    const handleEntrySelect = (entry) => {
        setSelectedEntry(entry);
        setIsEditingSelectedEntry(false); // Ensure not in edit mode when selecting
        setEditedContentText(""); // Clear any lingering edit text
        setEntryText(""); // Clear main input field (as we are viewing an old entry)
        setStatus({ message: "", severity: "info" }); // Clear status
        setLastDetectedEmotion(""); // Clear emotion
        setCurrentView('main'); // Ensure main view
    };

    const handleNewEntryClick = () => {
        setSelectedEntry(null); // No entry selected
        setIsEditingSelectedEntry(false);
        setEditedContentText("");
        setEntryText(""); // Clear main input field for new entry
        setStatus({ message: "", severity: "info" });
        setLastDetectedEmotion("");
        setCurrentView('main');
        setShowAllEntriesInDrawer(false); // Collapse drawer list
    };

    const handleSettingsClick = () => {
        setCurrentView('settings'); // Switch to settings view
        setSelectedEntry(null); // Deselect any entry
        setIsEditingSelectedEntry(false);
        setStatus({ message: "", severity: "info" });
        setLastDetectedEmotion("");
    };

    const handleDarkModeChange = (event) => {
        setDarkMode(event.target.checked);
    };

    const handleToggleShowEntries = () => {
        setShowAllEntriesInDrawer(prevShowAll => !prevShowAll);
    };


    // Drawer content JSX
    const drawerContent = (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
                {/* Drawer header with close button (only when pinned open) */}
                {drawerOpen && (
                    <Toolbar sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', px: [1] }}>
                        <IconButton onClick={handleDrawerClose} color="inherit">
                            {theme.direction === 'rtl' ? <ChevronRightIcon /> : <ChevronLeftIcon />}
                        </IconButton>
                    </Toolbar>
                )}
                {/* Placeholder for toolbar height when drawer is closed (mini) */}
                {!drawerOpen && <Toolbar sx={{ minHeight: { xs: 56, sm: 64 } }} />}

                {/* New Entry Button */}
                <Box sx={{ p: 1, mt: 2, mb: 1, overflow: 'hidden' }}>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        fullWidth
                        onClick={handleNewEntryClick}
                        sx={{
                            justifyContent: isDrawerVisuallyOpen ? 'flex-start' : 'center',
                            borderRadius: '16px',
                            padding: '8px',
                            minWidth: 0, 
                            '& .MuiButton-startIcon': { m: isDrawerVisuallyOpen ? '0 8px 0 -4px' : '0' }, 
                        }}
                    >
                        {isDrawerVisuallyOpen && 'New Entry'}
                    </Button>
                </Box>

                {/* "Recent" label and divider */}
                {isDrawerVisuallyOpen && (
                    <Typography variant="subtitle1" sx={{ p: 2, pt: 1, color: 'text.primary', fontWeight: 'bold' }}>
                        Recent
                    </Typography>
                )}
                {isDrawerVisuallyOpen && (loading || entries.length > 0) && <Divider />}

                {/* List of journal entries */}
                <List sx={{ pt: 0 }}>
                    {loading && isDrawerVisuallyOpen && ( 
                        <ListItem sx={{ justifyContent: 'center' }}><CircularProgress size={24} /></ListItem>
                    )}
                    {!loading && entries.length === 0 && isDrawerVisuallyOpen && (
                        <ListItem disablePadding>
                            <ListItemButton sx={{ minHeight: 48, justifyContent: 'initial', px: 2.5 }}>
                                <ListItemIcon sx={{ minWidth: 0, mr: 3, justifyContent: 'center' }}><ArticleIcon /></ListItemIcon>
                                <ListItemText primary="No entries" />
                            </ListItemButton>
                        </ListItem>
                    )}
                    {!loading && isDrawerVisuallyOpen && entries.slice(0, showAllEntriesInDrawer ? entries.length : INITIAL_VISIBLE_ENTRIES).map((entry) => (
                        <ListItem key={entry.date} disablePadding>
                            <ListItemButton
                                selected={selectedEntry?.date === entry.date && currentView === 'main' && !isEditingSelectedEntry}
                                onClick={() => handleEntrySelect(entry)}
                                sx={{
                                    minHeight: 48, justifyContent: 'initial', px: 2.5,
                                    '&.Mui-selected': { 
                                        bgcolor: 'action.selected',
                                        '&:hover': { bgcolor: 'action.hover' }
                                    }
                                }}
                            >
                                <ListItemIcon sx={{ minWidth: 0, mr: 3, justifyContent: 'center' }}><ArticleIcon /></ListItemIcon>
                                <ListItemText primary={formatDate(entry.date)} />
                            </ListItemButton>
                        </ListItem>
                    ))}
                </List>
                {/* Show More/Less button for entries */}
                {isDrawerVisuallyOpen && !loading && entries.length > INITIAL_VISIBLE_ENTRIES && (
                    <Box sx={{ p: 1, display: 'flex', justifyContent: 'center' }}>
                        <Button 
                            onClick={handleToggleShowEntries} 
                            variant="text" 
                            size="small"
                            endIcon={showAllEntriesInDrawer ? <ExpandLessIcon /> : <ExpandMoreIcon/>}
                            sx={{ textTransform: 'none', color: 'text.secondary' }}
                        >
                            {showAllEntriesInDrawer ? 'Show Less' : `Show ${entries.length - INITIAL_VISIBLE_ENTRIES} More`}
                        </Button>
                    </Box>
                )}
            </Box>

            {/* Bottom section of the drawer (Settings) */}
            <Box sx={{ marginTop: 'auto', flexShrink: 0 }}>
                <Divider />
                <List>
                    {[
                        { text: 'Settings', icon: <SettingsIcon />, handler: handleSettingsClick, view: 'settings' },
                    ].map((item) => (
                        <ListItem key={item.text} disablePadding>
                            <ListItemButton
                                onClick={item.handler}
                                title={item.text} 
                                selected={currentView === item.view}
                                sx={{
                                    minHeight: 48, justifyContent: isDrawerVisuallyOpen ? 'initial' : 'center', px: 2.5,
                                    '&.Mui-selected': { 
                                        bgcolor: 'action.selected',
                                        '&:hover': { bgcolor: 'action.hover' }
                                    }
                                }}
                            >
                                <ListItemIcon sx={{ minWidth: 0, mr: isDrawerVisuallyOpen ? 3 : 'auto', justifyContent: 'center' }}>
                                    {item.icon}
                                </ListItemIcon>
                                {isDrawerVisuallyOpen && <ListItemText primary={item.text} />}
                            </ListItemButton>
                        </ListItem>
                    ))}
                </List>
            </Box>
        </Box>
    );

    // Main application layout
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <Box sx={{ 
                display: 'flex', 
                height: '100vh', 
                bgcolor: flashColor || theme.palette.background.default, // Apply flash color or default
                transition: 'background-color 0.5s ease', // Smooth transition for flash
            }}>
                {/* AppBar */}
                <AppBar position="fixed" isPinnedOpen={drawerOpen}>
                    <Toolbar>
                        <IconButton
                            color="inherit"
                            aria-label="open drawer"
                            onClick={handleDrawerOpen}
                            edge="start"
                            sx={{ mr: 5, ...(drawerOpen && { display: 'none' }) }} // Hide if drawer is pinned open
                        >
                            <MenuIcon />
                        </IconButton>
                        <Typography variant="h6" noWrap component="div">
                            {currentView === 'settings' ? 'Settings' 
                                : selectedEntry ? (isEditingSelectedEntry ? `Editing: ${formatDate(selectedEntry.date)}` : formatDate(selectedEntry.date))
                                        : "MoodJourney"} {/* Default title or new entry title */}
                        </Typography>
                    </Toolbar>
                </AppBar>

                {/* Drawer */}
                <Drawer
                    variant="permanent"
                    open={isDrawerVisuallyOpen} // Controlled by pinned state or hover state
                    onMouseEnter={handleDrawerHoverOpen}
                    onMouseLeave={handleDrawerHoverClose}
                >
                    {drawerContent}
                </Drawer>

                {/* Main content area */}
                <Box
                    component="main"
                    sx={{
                        flexGrow: 1, p: 3, display: 'flex', flexDirection: 'column',
                        // Justify content to bottom for new entry, top for selected/settings
                        justifyContent: (currentView === 'main' && selectedEntry) || currentView === 'settings' ? 'flex-start' : 'flex-end',
                        height: '100%', overflow: 'hidden' // Prevent main box from causing scroll issues
                    }}
                >
                    <Toolbar /> {/* Spacer for AppBar */}

                    {/* Status Alert Message */}
                    {/* The condition status.message && status.severity !== "info" ensures only relevant alerts are shown */}
                    {/* The onClose prop on Alert allows manual dismissal, which will also clear the timeout via the useEffect cleanup */}
                    {status.message && status.severity !== "info" && ( 
                        <Alert
                            severity={status.severity} 
                            sx={{ mb: 2, width: '100%', maxWidth: '800px', mx: 'auto', flexShrink: 0 }}
                            onClose={handleCloseStatus} // Allow dismissing the alert, which also clears the auto-close timer
                        >
                            {status.message}
                        </Alert>
                    )}

                    {/* Conditional rendering based on current view */}
                    {currentView === 'settings' ? (
                        <CombinedSettingsPage darkMode={darkMode} onDarkModeChange={handleDarkModeChange} onBack={handleNewEntryClick} />
                    ) : selectedEntry && currentView === 'main' ? ( 
                        // Displaying a selected entry (view or edit mode)
                        <>
                            <Box sx={{ mb: 2, alignSelf: 'flex-start', flexShrink: 0 }}> 
                                <Button
                                    startIcon={<ArrowBackIcon />}
                                    onClick={handleNewEntryClick} // Go back to new entry mode
                                    variant="outlined"
                                >
                                    Back to Journal
                                </Button>
                            </Box>
                            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, width: '100%', flexGrow: 1, overflow: 'auto' }}>
                                {/* Main content of the selected entry */}
                                <Paper
                                    sx={{
                                        p: 3,
                                        flex: { xs: '1 1 auto', md: '2 1 0%' }, 
                                        minWidth: 0, 
                                        overflowY: 'auto', 
                                        borderRadius: '16px',
                                        display: 'flex',
                                        flexDirection: 'column', 
                                    }}
                                >
                                    {isEditingSelectedEntry ? (
                                        // Edit mode for the selected entry
                                        <>
                                            <TextField
                                                value={editedContentText} 
                                                onChange={(e) => setEditedContentText(e.target.value)}
                                                multiline
                                                minRows={10} 
                                                fullWidth
                                                variant="outlined" // Using outlined for better visibility in edit mode
                                                sx={{ 
                                                    fontSize: '1.125rem', 
                                                    mb: 2, 
                                                    flexGrow: 1, 
                                                    '& .MuiOutlinedInput-root': { borderRadius: '8px' },
                                                    pt: 0.5, // Padding top
                                                }}
                                                placeholder="Edit your thoughts here..."
                                            />
                                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 'auto', pt: 2, flexShrink: 0 }}>
                                                <Button variant="outlined" color="inherit" startIcon={<CancelIcon />} onClick={handleCancelEditSelectedEntry} disabled={saving}>
                                                    Cancel
                                                </Button>
                                                <Button variant="contained" color="primary" startIcon={<SaveIcon />} onClick={handleConfirmUpdateSelectedEntry} disabled={saving || !editedContentText.trim()}>
                                                    Save Changes
                                                </Button>
                                            </Box>
                                        </>
                                    ) : (
                                        // View mode for the selected entry
                                        <>
                                            <Typography 
                                                variant="body1" 
                                                sx={{ 
                                                    fontSize: '1.125rem', 
                                                    whiteSpace: 'pre-wrap', 
                                                    wordBreak: 'break-word', 
                                                    flexGrow: 1, 
                                                    mb: 2, 
                                                    overflowY: 'auto', 
                                                    pt: 1 
                                                }}
                                            >
                                                {getContentForDisplay(selectedEntry.content)}
                                            </Typography>
                                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 'auto', pt: 2, flexShrink: 0 }}>
                                                <Button variant="outlined" startIcon={<EditIcon />} onClick={handleStartEditSelectedEntry} disabled={saving}>
                                                    Edit Entry
                                                </Button>
                                                <Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={() => handleDeleteEntry(selectedEntry)} disabled={saving}>
                                                    Delete Entry
                                                </Button>
                                            </Box>
                                        </>
                                    )}
                                </Paper>

                                {/* Sidebar for emotion and suggestions (if entry selected) */}
                                {selectedEntry && ( 
                                    <Paper
                                        sx={{
                                            p: 2.5, 
                                            flex: { xs: '1 1 auto', md: '1 1 0%' }, 
                                            minWidth: 0, 
                                            borderRadius: '16px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            overflowY: 'auto', 
                                            borderLeft: {md: `1px solid ${theme.palette.divider}`}, 
                                        }}
                                    >
                                        <Box sx={{ flexGrow: 1, pt:1 }}>
                                            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium', fontSize: '1.1rem' }}> 
                                                Detected Emotion:
                                            </Typography>
                                            <Typography variant="body1" sx={{ fontSize: '1.2rem', mb: 2.5, color: extractEmotionFromContent(selectedEntry.content) ? 'text.primary' : 'text.secondary', textTransform: 'capitalize' }}> 
                                                {extractEmotionFromContent(selectedEntry.content) || "Not available"}
                                            </Typography>

                                            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium', fontSize: '1.1rem' }}> 
                                                Suggestions:
                                            </Typography>
                                            <Typography variant="body1" sx={{ fontSize: '1.2rem', color: 'text.secondary' }}> 
                                                No suggestions available at the moment.
                                            </Typography>
                                        </Box>
                                    </Paper>
                                )}
                            </Box>
                           
                        </>
                    ) : ( 
                        // New entry input mode (no entry selected)
                        <>
                            <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                                <Typography variant="h4" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                                    {getGreeting(userName)}
                                </Typography>
                            </Box>
                            <Box sx={{ width: '100%', maxWidth: '800px', mx: 'auto', mb: 2, flexShrink: 0 }}>
                                <Paper sx={{ p: 2, borderRadius: '16px', display: 'flex', flexDirection: 'column' }}>
                                    <TextField
                                        id="journal-entry-input"
                                        placeholder="Write your thoughts here..."
                                        multiline
                                        minRows={4}
                                        value={entryText}
                                        onChange={(e) => setEntryText(e.target.value)}
                                        variant="standard" 
                                        fullWidth
                                        InputProps={{ disableUnderline: true }} 
                                        sx={{ 
                                            flexGrow: 1, 
                                            mb: 1, 
                                            fontSize: '1.125rem', 
                                            p: 1, 
                                            borderRadius: '4px' 
                                        }}
                                    />
                                    {/* MODIFIED: Conditional rendering for Mic/Send button */}
                                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                                        {entryText.trim() === "" ? (
                                            // Show Microphone button if entryText is empty
                                            <IconButton
                                                color="primary"
                                                onClick={handleStartDictation}
                                                disabled={isDictating} // Disable while dictating
                                                size="large"
                                                aria-label="start dictation"
                                            >
                                                {isDictating ? <CircularProgress size={24} color="inherit" /> : <MicIcon />}
                                            </IconButton>
                                        ) : (
                                            // Show Send button if entryText has content
                                            <IconButton
                                                color="primary"
                                                onClick={handleSaveEntry}
                                                disabled={saving || !entryText.trim()} // Disable while saving or if text is empty
                                                size="large"
                                                aria-label="save entry"
                                            >
                                                {saving ? <CircularProgress size={24} color="inherit" /> : <SendIcon />}
                                            </IconButton>
                                        )}
                                    </Box>
                                </Paper>
                            </Box>
                        </>
                    )}
                </Box>
            </Box>
        </ThemeProvider>
    );
}

export default App;
