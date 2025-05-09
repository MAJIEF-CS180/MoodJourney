import React, { useState, useEffect, useMemo } from 'react';
import { invoke } from "@tauri-apps/api/core";

import { styled, useTheme, ThemeProvider, createTheme } from '@mui/material/styles';
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
import InfoIcon from '@mui/icons-material/Info';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
// EmojiEmotionsIcon is no longer needed here as the separate display is removed.

// Constants for drawer width
const drawerWidth = 240;
const miniDrawerWidth = 65;

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

// SettingsPage component
function SettingsPage({ darkMode, onDarkModeChange, onBack }) {
    return (
        <Paper
            sx={{
                p: 3, width: '100%', maxWidth: '800px', mx: 'auto', flexGrow: 1,
                overflowY: 'auto', mb: 2, borderRadius: '16px', display: 'flex',
                flexDirection: 'column',
            }}
        >
            <Box sx={{ mb: 2 }}>
                <Button startIcon={<ArrowBackIcon />} onClick={onBack} variant="outlined">
                    Back to Journal
                </Button>
            </Box>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                Settings
            </Typography>
            <Divider sx={{ mb: 3 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', mb: 2 }}>
                <Typography variant="body1" id="dark-mode-label">Dark Mode</Typography>
                <Switch
                    checked={darkMode}
                    onChange={onDarkModeChange}
                    name="darkModeToggle"
                    color="primary"
                    inputProps={{ 'aria-labelledby': 'dark-mode-label' }}
                />
            </Box>
            <Typography variant="body2" color="text.secondary">
                More settings will be available here in the future.
            </Typography>
        </Paper>
    );
}

// AboutPage component
function AboutPage({ onBack }) {
    return (
        <Paper
            sx={{
                p: 3, width: '100%', maxWidth: '800px', mx: 'auto', flexGrow: 1,
                overflowY: 'auto', mb: 2, borderRadius: '16px', display: 'flex',
                flexDirection: 'column',
            }}
        >
            <Box sx={{ mb: 2 }}>
                <Button startIcon={<ArrowBackIcon />} onClick={onBack} variant="outlined">
                    Back to Journal
                </Button>
            </Box>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                About
            </Typography>
            <Divider sx={{ mb: 3 }} />
            <Typography variant="body1" color="text.primary">
                MoodJourney v1.00
            </Typography>
        </Paper>
    );
}

// Base theme options
const baseThemeOptions = {
    typography: { fontFamily: '"Inter", Arial, sans-serif' },
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
        }
    }
};

// Light theme
const lightTheme = createTheme({
    ...baseThemeOptions,
    palette: {
        mode: 'light',
        primary: { main: '#23325A' },
        secondary: { main: '#625B71' },
        background: { default: '#F1F1F1', paper: '#FFFFFF' },
        text: { primary: 'rgba(0, 0, 0, 0.87)', secondary: 'rgba(0, 0, 0, 0.6)' },
        action: { hover: 'rgba(0, 0, 0, 0.04)', selected: 'rgba(0, 0, 0, 0.08)' },
        divider: 'rgba(0, 0, 0, 0.12)',
    },
});

// Dark theme
const darkTheme = createTheme({
    ...baseThemeOptions,
    palette: {
        mode: 'dark',
        primary: { main: '#AEC6FF' },
        secondary: { main: '#CCC2DC' },
        background: { default: '#1B1B1B', paper: '#303030' },
        text: { primary: '#E2E2E2', secondary: 'rgba(230, 225, 229, 0.6)' },
        action: { hover: 'rgba(255, 255, 255, 0.08)', selected: 'rgba(255, 255, 255, 0.12)' },
        divider: 'rgba(255, 255, 255, 0.12)',
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
    // lastDetectedEmotion is still useful internally for constructing status messages
    const [lastDetectedEmotion, setLastDetectedEmotion] = useState(""); 

    const theme = useMemo(() => (darkMode ? darkTheme : lightTheme), [darkMode]);
    const userName = "Michael";
    const isDrawerVisuallyOpen = drawerOpen || hoverOpen;

    // Formats date string
    const formatDate = (dateString) => {
        if (!dateString) return "Invalid Date";
        const date = new Date(dateString + 'T00:00:00Z');
        return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
    };

    // Generates greeting
    const getGreeting = (name) => {
        const hour = new Date().getHours();
        const timeOfDay = hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";
        return name ? `${timeOfDay}, ${name}` : timeOfDay;
    };

    // Gets current date string
    const getCurrentDateString = () => new Date().toISOString().split('T')[0];

    // Fetches entries
    const fetchEntries = async () => {
        setLoading(true);
        try {
            const result = await invoke("read_entries");
            const sorted = (result || []).sort((a, b) => new Date(b.date) - new Date(a.date));
            setEntries(sorted);
        } catch (err) {
            console.error("Error fetching entries:", err);
            setStatus({ message: `Error fetching entries: ${err.message || String(err)}`, severity: "error" });
            setEntries([]);
        } finally {
            setLoading(false);
        }
    };

    // Saves or updates today's entry (from main input field)
    const handleSaveEntry = async () => {
        if (!entryText.trim()) {
            setStatus({ message: "Entry cannot be empty.", severity: "warning" });
            return;
        }
        setSaving(true);
        let currentStatus = { message: "", severity: "info" }; // Local status for this operation
        setLastDetectedEmotion(""); 

        let emotionForMessage = ""; // Store emotion specifically for the status message
        let contentWithEmotion = entryText;

        try {
            const detectedEmotion = await invoke("classify_emotion", { text: entryText });
            setLastDetectedEmotion(detectedEmotion); // Keep track of it if needed elsewhere or for logic
            emotionForMessage = detectedEmotion; // Use this for the status message
            contentWithEmotion = `${entryText}\n\n🧠 Emotion: ${detectedEmotion}`;
        } catch (classifyError) {
            console.error("Error classifying emotion:", classifyError);
            // Set a warning status that will be displayed, but proceed with saving
            currentStatus = { message: `Entry to be saved. Emotion classification failed: ${classifyError.message || String(classifyError)}`, severity: "warning" };
        }
        
        const currentDate = getCurrentDateString();
        const existingEntryForToday = entries.find(entry => entry.date === currentDate);
        const operation = existingEntryForToday ? "update_entry" : "create_entry";
        
        let payload;
        if (existingEntryForToday) { 
            payload = { 
                date: currentDate, 
                newTitle: existingEntryForToday.title || "Journal Entry", 
                newContent: contentWithEmotion, 
                newPassword: existingEntryForToday.password 
            };
        } else { 
            payload = { 
                title: "Journal Entry", 
                content: contentWithEmotion, 
                password: null, 
            };
        }

        try {
            await invoke(operation, payload);
            const successVerb = operation === "create_entry" ? 'saved' : 'updated';
            
            // Construct success message based on whether emotion was classified
            if (emotionForMessage && emotionForMessage !== "unknown") {
                currentStatus = { message: `Entry ${successVerb} successfully! Detected Emotion: ${emotionForMessage.toUpperCase()}`, severity: "success" };
            } else if (currentStatus.severity !== "warning") { // Don't overwrite classification warning
                currentStatus = { message: `Entry ${successVerb} successfully!`, severity: "success" };
            }
            // If a classification warning was set, it will be preserved unless a save success happens.
            // If classification failed BUT save succeeded, the warning about classification is more informative.
            // However, user wants "Entry saved successfully! Detected Emotion: POSITIVE"
            // So, if save is successful, we prioritize that message structure.

            setEntryText("");
            await fetchEntries();

            const updatedEntriesList = await invoke("read_entries");
            const currentEntryAfterSave = updatedEntriesList.find(entry => entry.date === currentDate);
            setSelectedEntry(currentEntryAfterSave || null);
            if (currentEntryAfterSave) { 
                setCurrentView('main');
                setIsEditingSelectedEntry(false); 
            }
        } catch (err) {
            console.error(`Error ${operation === "create_entry" ? 'saving' : 'updating'} entry:`, err);
            // If save/update fails, this error is more critical than a classification warning
            currentStatus = { message: `Failed to ${operation === "create_entry" ? 'save' : 'update'} entry: ${err.message || String(err)}`, severity: "error" };
        } finally {
            setStatus(currentStatus); // Set the final status for the Alert
            setSaving(false);
        }
    };

    // Starts editing a selected entry
    const handleStartEditSelectedEntry = () => {
        if (selectedEntry) {
            const contentWithoutEmotion = selectedEntry.content.replace(/\n\n🧠 Emotion: \w+$/, "");
            setEditedContentText(contentWithoutEmotion);
            setIsEditingSelectedEntry(true);
            setStatus({ message: "", severity: "info" }); 
            setLastDetectedEmotion(""); 
        }
    };

    // Cancels editing a selected entry
    const handleCancelEditSelectedEntry = () => {
        setIsEditingSelectedEntry(false);
        setEditedContentText(""); 
        setStatus({ message: "Edit cancelled.", severity: "info" });
        setLastDetectedEmotion("");
    };

    // Confirms and saves changes to a selected (older) entry
    const handleConfirmUpdateSelectedEntry = async () => {
        if (!selectedEntry || !editedContentText.trim()) {
            setStatus({ message: "Content cannot be empty.", severity: "warning" });
            return;
        }
        setSaving(true); 
        let currentStatus = { message: "", severity: "info" };
        setLastDetectedEmotion("");

        let emotionForMessage = "";
        let contentWithEmotion = editedContentText;

        try {
            const detectedEmotion = await invoke("classify_emotion", { text: editedContentText });
            setLastDetectedEmotion(detectedEmotion);
            emotionForMessage = detectedEmotion;
            contentWithEmotion = `${editedContentText}\n\n🧠 Emotion: ${detectedEmotion}`;
        } catch (classifyError) {
            console.error("Error classifying emotion during edit:", classifyError);
            currentStatus = { message: `Update to be saved. Emotion classification failed: ${classifyError.message || String(classifyError)}`, severity: "warning" };
        }

        try {
            await invoke("update_entry", {
                date: selectedEntry.date,
                newTitle: selectedEntry.title || "Journal Entry", 
                newContent: contentWithEmotion, 
                newPassword: selectedEntry.password, 
            });
            
            if (emotionForMessage && emotionForMessage !== "unknown") {
                 currentStatus = { message: `Entry updated successfully! Detected Emotion: ${emotionForMessage.toUpperCase()}`, severity: "success" };
            } else if (currentStatus.severity !== "warning") {
                 currentStatus = { message: "Entry updated successfully!", severity: "success" };
            }
            
            await fetchEntries(); 

            const updatedEntriesList = await invoke("read_entries");
            const newlyUpdatedEntry = updatedEntriesList.find(entry => entry.date === selectedEntry.date);
            setSelectedEntry(newlyUpdatedEntry || null); 

            setIsEditingSelectedEntry(false); 
            setEditedContentText(""); 
        } catch (err) {
            console.error("Error updating entry:", err);
            currentStatus = { message: `Failed to update entry: ${err.message || String(err)}`, severity: "error" };
        } finally {
            setStatus(currentStatus);
            setSaving(false);
        }
    };

    // Handles deleting an entry
    const handleDeleteEntry = async (entryToDelete) => {
        if (!entryToDelete || !entryToDelete.date) {
            setStatus({ message: "Cannot delete: Invalid entry data.", severity: "error" });
            return;
        }
        
        setSaving(true);
        setStatus({ message: "", severity: "info" });
        setLastDetectedEmotion("");
        try {
            await invoke("delete_entry", { date: entryToDelete.date }); 
            setStatus({ message: "Entry deleted successfully!", severity: "success" });
            
            if (isEditingSelectedEntry && selectedEntry && selectedEntry.date === entryToDelete.date) {
                setIsEditingSelectedEntry(false);
                setEditedContentText("");
            }

            await fetchEntries();

            if (selectedEntry && selectedEntry.date === entryToDelete.date) {
                setSelectedEntry(null);
                setEntryText(""); 
                handleNewEntryClick(); 
            } else {
                const currentEntries = await invoke("read_entries"); 
                if (currentEntries.length === 0) {
                    handleNewEntryClick();
                }
            }
        } catch (err) {
            console.error("Error deleting entry:", err);
            setStatus({ message: `Failed to delete entry: ${err.message || String(err)}`, severity: "error" });
        } finally {
            setSaving(false);
        }
    };

    // Drawer control handlers
    const handleDrawerOpen = () => setDrawerOpen(true);
    const handleDrawerClose = () => setDrawerOpen(false);
    const handleDrawerHoverOpen = () => !drawerOpen && setHoverOpen(true);
    const handleDrawerHoverClose = () => setHoverOpen(false);
    const handleCloseStatus = () => setStatus({ message: "", severity: "info" });

    // Handles selecting an entry
    const handleEntrySelect = (entry) => {
        setSelectedEntry(entry);
        setIsEditingSelectedEntry(false); 
        setEditedContentText(""); 
        setEntryText(""); 
        setStatus({ message: "", severity: "info" });
        setLastDetectedEmotion(""); 
        setCurrentView('main');
    };

    // Handles "New Entry" click
    const handleNewEntryClick = () => {
        setSelectedEntry(null);
        setIsEditingSelectedEntry(false);
        setEditedContentText("");
        setEntryText(""); 
        setStatus({ message: "", severity: "info" });
        setLastDetectedEmotion(""); 
        setCurrentView('main');
    };

    // Navigation handlers
    const handleSettingsClick = () => {
        setCurrentView('settings');
        setSelectedEntry(null);
        setIsEditingSelectedEntry(false);
        setStatus({ message: "", severity: "info" });
        setLastDetectedEmotion("");
    };

    const handleAboutClick = () => {
        setCurrentView('about');
        setSelectedEntry(null);
        setIsEditingSelectedEntry(false);
        setStatus({ message: "", severity: "info" });
        setLastDetectedEmotion("");
    };

    // Dark mode toggle
    const handleDarkModeChange = (event) => {
        setDarkMode(event.target.checked);
    };

    // Initial fetch of entries
    useEffect(() => {
        fetchEntries();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Drawer content
    const drawerContent = (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Box>
                {drawerOpen && (
                    <Toolbar sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', px: [1] }}>
                        <IconButton onClick={handleDrawerClose} color="inherit">
                            {theme.direction === 'rtl' ? <ChevronRightIcon /> : <ChevronLeftIcon />}
                        </IconButton>
                    </Toolbar>
                )}
                {!drawerOpen && <Toolbar sx={{ minHeight: { xs: 56, sm: 64 } }} />}

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

                {isDrawerVisuallyOpen && (
                    <Typography variant="subtitle1" sx={{ p: 2, pt: 1, color: 'text.primary', fontWeight: 'bold' }}>
                        Recent
                    </Typography>
                )}
                {isDrawerVisuallyOpen && (loading || entries.length > 0) && <Divider />}

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
                    {!loading && isDrawerVisuallyOpen && entries.map((entry) => (
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
            </Box>

            <Box sx={{ marginTop: 'auto' }}>
                <Divider />
                <List>
                    {[
                        { text: 'Settings', icon: <SettingsIcon />, handler: handleSettingsClick, view: 'settings' },
                        { text: 'About', icon: <InfoIcon />, handler: handleAboutClick, view: 'about' },
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
            <Box sx={{ display: 'flex', height: '100vh', bgcolor: 'background.default' }}>
                <AppBar position="fixed" isPinnedOpen={drawerOpen}>
                    <Toolbar>
                        <IconButton
                            color="inherit"
                            aria-label="open drawer"
                            onClick={handleDrawerOpen}
                            edge="start"
                            sx={{ mr: 5, ...(drawerOpen && { display: 'none' }) }}
                        >
                            <MenuIcon />
                        </IconButton>
                        <Typography variant="h6" noWrap component="div">
                            {currentView === 'settings' ? 'Settings'
                                : currentView === 'about' ? 'About'
                                    : selectedEntry ? (isEditingSelectedEntry ? `Editing: ${formatDate(selectedEntry.date)}` : formatDate(selectedEntry.date))
                                        : "MoodJourney"}
                        </Typography>
                    </Toolbar>
                </AppBar>

                <Drawer
                    variant="permanent"
                    open={isDrawerVisuallyOpen}
                    onMouseEnter={handleDrawerHoverOpen}
                    onMouseLeave={handleDrawerHoverClose}
                >
                    {drawerContent}
                </Drawer>

                <Box
                    component="main"
                    sx={{
                        flexGrow: 1, p: 3, display: 'flex', flexDirection: 'column',
                        justifyContent: currentView !== 'main' || selectedEntry ? 'flex-start' : 'flex-end',
                        height: '100%', overflow: 'hidden'
                    }}
                >
                    <Toolbar />

                    {status.message && status.severity !== "info" && (
                        <Alert
                            severity={status.severity}
                            sx={{ mb: 2, width: '100%', maxWidth: '800px', mx: 'auto', flexShrink: 0 }}
                            onClose={handleCloseStatus}
                        >
                            {status.message}
                        </Alert>
                    )}

                    {currentView === 'settings' ? (
                        <SettingsPage darkMode={darkMode} onDarkModeChange={handleDarkModeChange} onBack={handleNewEntryClick} />
                    ) : currentView === 'about' ? (
                        <AboutPage onBack={handleNewEntryClick} />
                    ) : selectedEntry ? (
                        // Display selected entry (view or edit mode)
                        <Paper
                            sx={{
                                p: 3, width: '100%', maxWidth: '800px', mx: 'auto', flexGrow: 1,
                                overflowY: 'auto', mb: 2, borderRadius: '16px', display: 'flex',
                                flexDirection: 'column',
                            }}
                        >
                            <Box sx={{ mb: 2, flexShrink: 0, width: '100%' }}>
                                <Button 
                                    startIcon={<ArrowBackIcon />} 
                                    onClick={handleNewEntryClick} 
                                    variant="outlined" 
                                    sx={{ mb: 1.5 }} 
                                >
                                    Back to Journal
                                </Button>
                                <Typography variant="h5" sx={{ fontWeight: 'bold', textAlign: 'left', width: '100%' }}>
                                    {isEditingSelectedEntry ? `Editing Entry` : formatDate(selectedEntry.date)}
                                </Typography>
                            </Box>
                            <Divider sx={{ mb: 3, flexShrink: 0 }} />

                            {isEditingSelectedEntry ? (
                                // EDITING MODE for selected entry
                                <>
                                    <TextField
                                        value={editedContentText}
                                        onChange={(e) => setEditedContentText(e.target.value)}
                                        multiline
                                        minRows={10} 
                                        fullWidth
                                        variant="outlined" 
                                        sx={{ mb: 2, flexGrow: 1, '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                                        placeholder="Edit your thoughts here..."
                                    />
                                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 'auto', pt: 2, flexShrink: 0 }}>
                                        <Button
                                            variant="outlined"
                                            color="inherit"
                                            startIcon={<CancelIcon />}
                                            onClick={handleCancelEditSelectedEntry}
                                            disabled={saving}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            variant="contained"
                                            color="primary"
                                            startIcon={<SaveIcon />}
                                            onClick={handleConfirmUpdateSelectedEntry}
                                            disabled={saving || !editedContentText.trim()}
                                        >
                                            Save Changes
                                        </Button>
                                    </Box>
                                </>
                            ) : (
                                // VIEW MODE for selected entry
                                <>
                                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', flexGrow: 1, mb: 2 }}>
                                        {selectedEntry.content} 
                                    </Typography>
                                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 'auto', pt: 2, flexShrink: 0 }}>
                                        <Button
                                            variant="outlined"
                                            startIcon={<EditIcon />}
                                            onClick={handleStartEditSelectedEntry}
                                            disabled={saving} 
                                        >
                                            Edit Entry
                                        </Button>
                                        <Button
                                            variant="outlined"
                                            color="error"
                                            startIcon={<DeleteIcon />}
                                            onClick={() => handleDeleteEntry(selectedEntry)}
                                            disabled={saving}
                                        >
                                            Delete Entry
                                        </Button>
                                    </Box>
                                </>
                            )}
                        </Paper>
                    ) : (
                        // New entry input area (main screen when no entry is selected)
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
                                        sx={{ flexGrow: 1, mb: 1, fontSize: '1rem', p: 1, borderRadius: '4px' }}
                                    />
                                    {/* REMOVED: Dedicated emotion display below text input */}
                                    {/* {lastDetectedEmotion && (
                                        <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', p: 1, color: 'text.secondary' }}>
                                            <EmojiEmotionsIcon sx={{ mr: 0.5, fontSize: '1rem' }} /> Detected Emotion: {lastDetectedEmotion}
                                        </Typography>
                                    )} */}
                                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                                        <IconButton
                                            color="primary"
                                            onClick={handleSaveEntry}
                                            disabled={saving || !entryText.trim()}
                                            size="large"
                                        >
                                            {saving ? <CircularProgress size={24} color="inherit" /> : <SendIcon />}
                                        </IconButton>
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
