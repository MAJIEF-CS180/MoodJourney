import React, { useState, useEffect, useMemo } from 'react';
import { invoke } from "@tauri-apps/api/core";
import dayjs from "dayjs"; // Added for graph
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Legend
} from "recharts"; // Added for graph

import { styled, useTheme, ThemeProvider, createTheme, alpha } from '@mui/material/styles';
import {
    AppBar as MuiAppBar, Box, Button, Drawer as MuiDrawer, List, ListItem,
    ListItemButton, ListItemIcon, ListItemText, Toolbar, Typography,
    CircularProgress, Alert, CssBaseline, Divider, Paper, IconButton,
    TextField, Switch, // Switch might be removed or repurposed from SettingsPage
    Select, MenuItem, FormControl, InputLabel // Added for theme selection
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import AddIcon from '@mui/icons-material/Add';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ArticleIcon from '@mui/icons-material/Article';
import SendIcon from '@mui/icons-material/Send';
import SettingsIcon from '@mui/icons-material/Settings';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import MicIcon from '@mui/icons-material/Mic';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'; // Sparkles Icon for Insights

// Constants for drawer width, entry visibility, and alert timeout
const drawerWidth = 240;
const miniDrawerWidth = 65;
const INITIAL_VISIBLE_ENTRIES = 5;
const ALERT_TIMEOUT_DURATION = 10000;


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

// Helper function to get the main user-written content, excluding tags
const getMainContent = (fullContent) => {
    if (!fullContent) return "";
    // Find the first occurrence of either tag
    const emotionTagIndex = fullContent.indexOf("\n\n🧠 Emotion:");
    const suggestionTagIndex = fullContent.indexOf("\n\n💡 Suggestion:");

    let endOfMain = fullContent.length;
    if (emotionTagIndex !== -1) {
        endOfMain = Math.min(endOfMain, emotionTagIndex);
    }
    if (suggestionTagIndex !== -1) {
        endOfMain = Math.min(endOfMain, suggestionTagIndex);
    }
    return fullContent.substring(0, endOfMain).trim();
};

// Helper function to extract the emotion value from the full content
const extractEmotionFromContent = (fullContent) => {
    if (!fullContent) return null;
    const match = fullContent.match(/\n\n🧠 Emotion: (\w+)/);
    return match ? match[1] : null;
};

// Helper function to extract the suggestion text from the full content
// Assumes the suggestion tag is the last special tag and its content goes to the end of the string.
const extractSuggestionFromContent = (fullContent) => {
    if (!fullContent) return null;
    const match = fullContent.match(/\n\n💡 Suggestion: ([\s\S]+)$/);
    return match ? match[1].trim() : null;
};

// Helper function to get content for editing (which is the main user text)
const getContentForEditing = (fullContent) => {
    return getMainContent(fullContent);
};


// Settings Page Component
function CombinedSettingsPage({ currentThemeMode, onThemeModeChange, onBack }) {
    const theme = useTheme(); // MUI theme for styling consistency
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
                        <Typography variant="body1" id="theme-select-label" sx={{ fontSize: '1.125rem' }}>
                            Theme
                        </Typography>
                        <FormControl sx={{ minWidth: 120 }} size="small">
                            {/* The InputLabel is not strictly necessary if the Select has a label prop and is not variant="standard"
                                but can be kept for consistency or if a floating label is desired.
                                For a simpler look without a floating label, you can remove InputLabel and the labelId from Select,
                                and rely on the Typography "Theme" as the visual label.
                            */}
                            {/* <InputLabel id="theme-select-label-helper">Theme</InputLabel> */}
                            <Select
                                labelId="theme-select-label-helper" // Can be removed if InputLabel is removed
                                id="theme-select"
                                value={currentThemeMode}
                                // label="Theme" // Use this if you want an outlined label on the Select itself
                                onChange={(e) => onThemeModeChange(e.target.value)}
                                sx={{ borderRadius: '8px' }} // Consistent border radius
                            >
                                <MenuItem value="light">Light</MenuItem>
                                <MenuItem value="dark">Dark</MenuItem>
                                <MenuItem value="system">System</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>
                    <Typography variant="body1" color="text.secondary" sx={{mt: 'auto', pt: 2, fontSize: '1.125rem' }}>
                        More settings will be available here in the future.
                    </Typography>
                </Paper>

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

// Insights Page Component
function InsightsPage({ entries, theme, reportMode, setReportMode, aggregateEmotions, onBack }) {
    const renderLegendText = (value, entry) => {
        const capitalizedValue = value.charAt(0).toUpperCase() + value.slice(1);
        return <span style={{ color: theme.palette.text.primary }}>{capitalizedValue}</span>;
    };

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
                    <Typography variant="h6" gutterBottom sx={{ textAlign: 'center', pt:1 }}>
                        Mood Report
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                        <Button
                            onClick={() => setReportMode("day")}
                            disabled={reportMode === "day"}
                            variant={reportMode === 'day' ? 'contained' : 'outlined'}
                            sx={{ mr: 1 }}
                        >
                            Daily
                        </Button>
                        <Button
                            onClick={() => setReportMode("week")}
                            disabled={reportMode === "week"}
                            variant={reportMode === 'week' ? 'contained' : 'outlined'}
                            sx={{ mr: 1 }}
                        >
                            Weekly
                        </Button>
                        <Button
                            onClick={() => setReportMode("month")}
                            disabled={reportMode === "month"}
                            variant={reportMode === 'month' ? 'contained' : 'outlined'}
                        >
                            Monthly
                        </Button>
                    </Box>
                    <Box sx={{ width: "100%", height: 300, flexGrow: 1 }}>
                        <ResponsiveContainer>
                            <BarChart data={aggregateEmotions(entries, reportMode)}>
                                <XAxis dataKey="period" />
                                <YAxis allowDecimals={false} />
                                <Tooltip />
                                <Legend formatter={renderLegendText} /> 
                                <Bar dataKey="sadness" fill={theme.palette.mode === 'dark' ? '#1565C0' : '#BBDEFB'} /> 
                                <Bar dataKey="angry" fill={theme.palette.mode === 'dark' ? '#f44336' : '#ef5350'} />
                                <Bar dataKey="neutral" fill={theme.palette.mode === 'dark' ? '#bdbdbd' : '#9e9e9e'} />
                                <Bar dataKey="joy" fill={theme.palette.mode === 'dark' ? '#F9A825' : '#FFF59D'} />
                                <Bar dataKey="disgust" fill={theme.palette.mode === 'dark' ? '#2E7D32' : '#D4EDDA'} />
                                <Bar dataKey="fear" fill={theme.palette.mode === 'dark' ? '#6A1B9A' : '#E1BEE7'} />
                                <Bar dataKey="surprise" fill={theme.palette.mode === 'dark' ? '#EC407A' : '#F8BBD0'} />
                            </BarChart>
                        </ResponsiveContainer>
                    </Box>
                </Paper>

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
                            Additional Insights
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{mt: 1, fontSize: '1rem' }}>
                            More detailed analysis and trends will be available here in future updates.
                        </Typography>
                    </Box>
                </Paper>
            </Box>
        </>
    );
}


// Base theme options for both light and dark modes
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
                    color: theme.palette.primary.main, 
                    backgroundColor: alpha(theme.palette.primary.main, theme.palette.mode === 'light' ? 0.12 : 0.18), 
                    '& .MuiAlert-icon': {
                        color: theme.palette.primary.main, 
                    },
                }),
                standardWarning: ({ theme }) => ({
                    color: theme.palette.mode === 'light' ? theme.palette.warning.dark : theme.palette.warning.light,
                    backgroundColor: alpha(theme.palette.warning.main, theme.palette.mode === 'light' ? 0.12 : 0.18),
                     '& .MuiAlert-icon': {
                        color: theme.palette.mode === 'light' ? theme.palette.warning.dark : theme.palette.warning.light,
                    },
                }),
            },
        },
         MuiSelect: { // Added default styles for Select for consistency
            styleOverrides: {
                root: ({theme}) => ({
                    // Example: if you want to ensure the Select border matches other inputs
                    // '& .MuiOutlinedInput-notchedOutline': {
                    //     borderColor: theme.palette.divider,
                    // },
                    // '&:hover .MuiOutlinedInput-notchedOutline': {
                    //     borderColor: theme.palette.text.primary,
                    // },
                    // '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    //     borderColor: theme.palette.primary.main,
                    // },
                }),
            }
        }
    }
};

// Light theme configuration
const lightTheme = createTheme({
    ...baseThemeOptions,
    palette: {
        mode: 'light',
        primary: { main: '#23325A' },
        secondary: { main: '#653666' },
        background: {
            default: '#F3EEEB',
            paper: '#FFFCF9',
        },
        text: {
            primary: '#23325A',
            secondary: alpha('#23325A', 0.7),
        },
        action: {
            hover: alpha('#23325A', 0.06),
            selected: alpha('#23325A', 0.12),
        },
        divider: alpha('#23325A', 0.2),
        warning: {
            main: '#FFA726',
            light: '#FFB74D',
            dark: '#F57C00',
        },
    },
});

// Dark theme configuration
const darkTheme = createTheme({
    ...baseThemeOptions,
    palette: {
        mode: 'dark',
        primary: { main: '#F3EEEB' },
        secondary: { main: '#DECCCA' },
        background: {
            default: '#1A2238',
            paper: '#23325A',
        },
        text: {
            primary: '#F3EEEB',
            secondary: alpha('#F3EEEB', 0.7),
        },
        action: {
            hover: alpha('#F3EEEB', 0.08),
            selected: alpha('#F3EEEB', 0.16),
        },
        divider: alpha('#F3EEEB', 0.12),
        warning: {
            main: '#FFB74D',
            light: '#FFCC80',
            dark: '#FFA726',
        },
    },
});

// Main App component
function App() {
    // State hooks
    const [themeMode, setThemeMode] = useState(() => {
        // Load theme preference from localStorage or default to 'system'
        const storedThemeMode = localStorage.getItem('appThemeMode');
        return storedThemeMode || 'system';
    });
    const [isDarkModeActive, setIsDarkModeActive] = useState(false); // Actual theme state (light/dark)

    const [entries, setEntries] = useState([]);
    const [selectedEntry, setSelectedEntry] = useState(null);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState({ message: "", severity: "info" });
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [hoverOpen, setHoverOpen] = useState(false);
    const [entryText, setEntryText] = useState(""); // For the new entry text field
    const [saving, setSaving] = useState(false);
    const [currentView, setCurrentView] = useState('main'); 
    const [isEditingSelectedEntry, setIsEditingSelectedEntry] = useState(false);
    const [editedContentText, setEditedContentText] = useState(""); // For editing an existing entry's main text
    const [lastDetectedEmotion, setLastDetectedEmotion] = useState(""); // Used for flash background
    const [flashColor, setFlashColor] = useState(null);
    const [showAllEntriesInDrawer, setShowAllEntriesInDrawer] = useState(false);
    const [isDictating, setIsDictating] = useState(false);
    const [reportMode, setReportMode] = useState("week"); 


    // Effect to update the active theme based on themeMode and system preference
    useEffect(() => {
        const prefersDarkMQ = window.matchMedia('(prefers-color-scheme: dark)');

        const updateActiveTheme = (event) => { // event is optional, used by listener
            if (themeMode === 'dark') {
                setIsDarkModeActive(true);
            } else if (themeMode === 'light') {
                setIsDarkModeActive(false);
            } else { // 'system'
                // Use event.matches if available (from listener), otherwise query directly
                setIsDarkModeActive(event ? event.matches : prefersDarkMQ.matches);
            }
        };

        updateActiveTheme(); // Set initial theme based on current settings

        if (themeMode === 'system') {
            prefersDarkMQ.addEventListener('change', updateActiveTheme);
            return () => prefersDarkMQ.removeEventListener('change', updateActiveTheme);
        }
    }, [themeMode]); // Re-run when themeMode changes

    // Effect to save theme preference to localStorage
    useEffect(() => {
        localStorage.setItem('appThemeMode', themeMode);
    }, [themeMode]);

    // Memoized MUI theme based on the active dark mode state
    const muiTheme = useMemo(() => (isDarkModeActive ? darkTheme : lightTheme), [isDarkModeActive]);
    const userName = "Michael"; 
    const isDrawerVisuallyOpen = drawerOpen || hoverOpen; 

    // Function to close status alert
    const handleCloseStatus = () => setStatus({ message: "", severity: "info" });

    // Effect to auto-hide status alerts
    useEffect(() => {
        let timer;
        if (status.message && status.severity !== "info") {
            timer = setTimeout(() => {
                handleCloseStatus();
            }, ALERT_TIMEOUT_DURATION);
        }
        return () => {
            clearTimeout(timer);
        };
    }, [status]);

    // Function to flash background color based on emotion
    const flashBackground = (emotion) => {
        const emotionUpper = emotion?.toUpperCase(); 
        // Determine flash color based on current theme (isDarkModeActive)
        const currentPalette = isDarkModeActive ? darkTheme.palette : lightTheme.palette;
        let colorToSet = null;
        if (emotionUpper === "ANGER") colorToSet = isDarkModeActive ? '#C62828' : '#F8D7DA'; 
        else if (emotionUpper === "DISGUST") colorToSet = isDarkModeActive ? '#2E7D32' : '#D4EDDA'; 
        else if (emotionUpper === "FEAR") colorToSet = isDarkModeActive ? '#6A1B9A' : '#E1BEE7'; 
        else if (emotionUpper === "JOY") colorToSet = isDarkModeActive ? '#F9A825' : '#FFF59D'; 
        else if (emotionUpper === "NEUTRAL") colorToSet = isDarkModeActive ? '#616161' : '#E0E0E0'; 
        else if (emotionUpper === "SADNESS") colorToSet = isDarkModeActive ? '#1565C0' : '#BBDEFB'; 
        else if (emotionUpper === "SURPRISE") colorToSet = isDarkModeActive ? '#EC407A' : '#F8BBD0'; 

        if (colorToSet) {
            setFlashColor(colorToSet);
            setTimeout(() => setFlashColor(null), 1000); 
        }
    };

    // Function to format date string
    const formatDate = (dateString) => {
        if (!dateString) return "Invalid Date";
        const date = new Date(dateString + 'T00:00:00Z');
        return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
    };

    // Function to get time-based greeting
    const getGreeting = (name) => {
        const hour = new Date().getHours();
        const timeOfDay = hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";
        return name ? `${timeOfDay}, ${name}` : timeOfDay;
    };

    // Function to get current date string in YYYY-MM-DD format
    const getCurrentDateString = () => new Date().toISOString().split('T')[0];

    // Function to refresh the list of entries
    const refreshEntriesList = async () => {
        setLoading(true);
        try {
            const freshEntries = (await invoke("read_entries")) || [];
            const sorted = freshEntries.sort((a, b) => new Date(b.date) - new Date(a.date));
            setEntries(sorted);
            return sorted; // Return sorted entries for immediate use
        } catch (err) {
            console.error("Error refreshing entries list:", err);
            setStatus({ message: `Error refreshing entries: ${err.message || String(err)}`, severity: "error" });
            setEntries([]);
            return []; // Return empty array on error
        } finally {
            setLoading(false);
        }
    };

    // Effect to fetch entries on component mount
    useEffect(() => {
        refreshEntriesList();
    }, []);


    // Function to handle starting dictation
    const handleStartDictation = async () => {
        let selectedPath = null;
        try {
            const { open } = await import('@tauri-apps/plugin-dialog');
            const dialogResult = await open({
                title: "Select Audio File for Dictation",
                multiple: false,
                filters: [{ name: 'Audio', extensions: ['wav', 'mp3', 'm4a', 'flac', 'ogg'] }]
            });
            selectedPath = Array.isArray(dialogResult) ? dialogResult[0] : dialogResult;
        } catch (dialogError) {
            console.error("Error opening file dialog:", dialogError);
            setStatus({ message: `Could not open file dialog: ${dialogError.message || String(dialogError)}`, severity: "error" });
            return;
        }

        if (!selectedPath) {
            setStatus({ message: "Dictation cancelled: No audio file selected.", severity: "info" });
            return;
        }

        setIsDictating(true);
        setStatus({ message: "Transcribing audio, please wait...", severity: "info" });
        try {
            const transcribedText = await invoke("perform_dictation_cmd", { audioFilePath: selectedPath });
            setEntryText(prevText => prevText.trim() ? `${prevText.trim()} ${transcribedText}` : transcribedText);
            setStatus({ message: "Dictation successful! Text has been added.", severity: "success" });
        } catch (err) {
            console.error("Error during dictation:", err);
            let errorMessage = "Dictation failed. Please try again.";
            if (err && typeof err === 'string') {
                if (err.includes("Unsupported audio sample rate")) errorMessage = "Dictation failed: Unsupported audio sample rate. Whisper requires 16kHz.";
                else if (err.includes("Unsupported audio channel count")) errorMessage = "Dictation failed: Unsupported audio channel count. Whisper requires mono audio.";
                else if (err.includes("Model") && err.includes("not found")) errorMessage = "Dictation failed: Transcription model not found.";
                else if (err.includes("Audio file not found")) errorMessage = "Dictation failed: Audio file could not be found.";
                else errorMessage = `Dictation failed: ${err}`;
            } else if (err && err.message) {
                errorMessage = `Dictation failed: ${err.message}`;
            }
            setStatus({ message: errorMessage, severity: "error" });
        } finally {
            setIsDictating(false);
        }
    };

    // Function to save a new journal entry or update today's entry
    const handleSaveEntry = async () => {
        const currentEntryText = entryText.trim(); // Use the text from the new entry field
        if (!currentEntryText) {
            setStatus({ message: "Entry cannot be empty.", severity: "warning" });
            return;
        }
        setSaving(true);
        let statusMessage = "";
        let statusSeverity = "info";
        setLastDetectedEmotion("");

        let classifiedEmotion = "unknown";
        try {
            classifiedEmotion = await invoke("classify_emotion", { text: currentEntryText });
            setLastDetectedEmotion(classifiedEmotion);
        } catch (classifyError) {
            console.error("Error classifying emotion:", classifyError);
            statusMessage = `Emotion classification failed: ${classifyError.message || String(classifyError)}. `;
            statusSeverity = "warning";
        }

        let generatedSuggestion = "Suggestion not available.";
        try {
            // *** MODIFIED INVOKE CALL FOR generate_suggestion_cmd ***
            generatedSuggestion = await invoke("generate_suggestion_cmd", { 
                entryTitle: "Journal Entry", // Default title for new entries
                entryContent: currentEntryText,
                suggestionType: null // Defaulting to null as requested
            });
        } catch (suggestionError) {
            console.error("Error generating suggestion:", suggestionError);
            statusMessage += `AI suggestion generation failed: ${suggestionError.message || String(suggestionError)}.`;
            statusSeverity = "warning"; // Keep warning or escalate if it was info
        }

        const contentToSave = `${currentEntryText}\n\n🧠 Emotion: ${classifiedEmotion}\n\n💡 Suggestion: ${generatedSuggestion}`;
        const currentDate = getCurrentDateString();
        const existingEntryForToday = entries.find(entry => entry.date === currentDate);
        const operation = existingEntryForToday ? "update_entry" : "create_entry";
        const payload = existingEntryForToday 
            ? { date: currentDate, newTitle: existingEntryForToday.title || "Journal Entry", newContent: contentToSave, newPassword: existingEntryForToday.password }
            : { title: "Journal Entry", content: contentToSave, password: null };

        try {
            await invoke(operation, payload);
            const successVerbText = operation === "create_entry" ? "saved" : "updated";
            
            if (statusSeverity !== "warning") { // If no errors so far
                 statusMessage = `Entry ${successVerbText} successfully!`;
                 statusSeverity = "success";
            } else { // Prepend to existing warning message
                statusMessage = `Entry ${successVerbText} with issues: ${statusMessage}`;
            }
            if (classifiedEmotion && classifiedEmotion.toLowerCase() !== "unknown") {
                statusMessage += ` Detected Emotion: ${classifiedEmotion.toUpperCase()}`;
                flashBackground(classifiedEmotion);
            }
            
            setEntryText(""); // Clear the new entry field
            setShowAllEntriesInDrawer(false);
            const updatedEntries = await refreshEntriesList();
            const newOrUpdatedEntry = updatedEntries.find(e => e.date === currentDate);
            
            if (newOrUpdatedEntry) {
                setSelectedEntry(newOrUpdatedEntry);
                setCurrentView('main'); // Ensure view is main to show the selected entry
                setIsEditingSelectedEntry(false);
            } else {
                 statusMessage = `Entry ${successVerbText}, but could not auto-select it.`;
                 statusSeverity = "info";
            }
        } catch (err) {
            console.error(`Error ${operation} entry:`, err);
            statusMessage = `Failed to ${operation === "create_entry" ? 'save' : 'update'} entry: ${err.message || String(err)}`;
            statusSeverity = "error";
        } finally {
            setStatus({ message: statusMessage, severity: statusSeverity });
            setSaving(false);
        }
    };

    // Function to start editing the currently selected entry
    const handleStartEditSelectedEntry = () => {
        if (selectedEntry) {
            setEditedContentText(getContentForEditing(selectedEntry.content));
            setIsEditingSelectedEntry(true);
            setStatus({ message: "", severity: "info" }); // Clear previous status
            setLastDetectedEmotion(""); // Clear last emotion before new edit
        }
    };

    // Function to cancel editing the selected entry
    const handleCancelEditSelectedEntry = () => {
        setIsEditingSelectedEntry(false);
        setEditedContentText("");
        setStatus({ message: "Edit cancelled.", severity: "info" });
    };

    // Function to confirm and save updates to the selected entry
    const handleConfirmUpdateSelectedEntry = async () => {
        const currentEditedContent = editedContentText.trim();
        if (!selectedEntry || !currentEditedContent) {
            setStatus({ message: "Content cannot be empty.", severity: "warning" });
            return;
        }
        setSaving(true);
        let statusMessage = "";
        let statusSeverity = "info";
        setLastDetectedEmotion("");

        let classifiedEmotion = "unknown";
        try {
            classifiedEmotion = await invoke("classify_emotion", { text: currentEditedContent });
            setLastDetectedEmotion(classifiedEmotion);
        } catch (classifyError) {
            console.error("Error classifying emotion during edit:", classifyError);
            statusMessage = `Emotion classification failed: ${classifyError.message || String(classifyError)}. `;
            statusSeverity = "warning";
        }

        let generatedSuggestion = "Suggestion not available.";
        try {
            // *** MODIFIED INVOKE CALL FOR generate_suggestion_cmd ***
            generatedSuggestion = await invoke("generate_suggestion_cmd", { 
                entryTitle: selectedEntry.title || "Journal Entry", // Use existing title or default
                entryContent: currentEditedContent,
                suggestionType: null // Defaulting to null as requested
            });
        } catch (suggestionError) {
            console.error("Error generating suggestion during edit:", suggestionError);
            statusMessage += `AI suggestion generation failed: ${suggestionError.message || String(suggestionError)}.`;
            statusSeverity = "warning";
        }
        
        const contentToSave = `${currentEditedContent}\n\n🧠 Emotion: ${classifiedEmotion}\n\n💡 Suggestion: ${generatedSuggestion}`;

        try {
            await invoke("update_entry", {
                date: selectedEntry.date,
                newTitle: selectedEntry.title || "Journal Entry",
                newContent: contentToSave,
                newPassword: selectedEntry.password,
            });

            if (statusSeverity !== "warning") {
                 statusMessage = "Entry updated successfully!";
                 statusSeverity = "success";
            } else {
                statusMessage = `Entry updated with issues: ${statusMessage}`;
            }
            if (classifiedEmotion && classifiedEmotion.toLowerCase() !== "unknown") {
                statusMessage += ` Detected Emotion: ${classifiedEmotion.toUpperCase()}`;
                flashBackground(classifiedEmotion);
            }

            const updatedEntries = await refreshEntriesList();
            const updatedEntry = updatedEntries.find(entry => entry.date === selectedEntry.date);
            setSelectedEntry(updatedEntry || null); 
            setIsEditingSelectedEntry(false);
            setEditedContentText("");
        } catch (err) {
            console.error("Error updating entry:", err);
            statusMessage = `Failed to update entry: ${err.message || String(err)}`;
            statusSeverity = "error";
        } finally {
            setStatus({ message: statusMessage, severity: statusSeverity });
            setSaving(false);
        }
    };

    // Function to delete an entry
    const handleDeleteEntry = async (entryToDelete) => {
        if (!entryToDelete || !entryToDelete.date) {
            setStatus({ message: "Cannot delete: Invalid entry data.", severity: "error" });
            return;
        }
        setSaving(true);
        try {
            await invoke("delete_entry", { date: entryToDelete.date });
            setStatus({ message: "Entry deleted successfully!", severity: "success" });
            if (isEditingSelectedEntry && selectedEntry && selectedEntry.date === entryToDelete.date) {
                setIsEditingSelectedEntry(false);
                setEditedContentText("");
            }
            const remainingEntries = await refreshEntriesList();
            setShowAllEntriesInDrawer(false);
            if (selectedEntry && selectedEntry.date === entryToDelete.date) {
                setSelectedEntry(null); // Deselect if it was the one deleted
                handleNewEntryClick(); // Go to new entry view
            } else if (remainingEntries.length === 0) {
                 handleNewEntryClick(); // Go to new entry view if no entries left
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


    // Handler for selecting an entry from the drawer
    const handleEntrySelect = (entry) => {
        setSelectedEntry(entry);
        setIsEditingSelectedEntry(false);
        setEditedContentText(""); // Clear any stale edited text
        setEntryText(""); // Clear new entry field
        setStatus({ message: "", severity: "info" }); // Clear status
        setLastDetectedEmotion("");
        setCurrentView('main');
    };

    // Handler for "New Entry" button click
    const handleNewEntryClick = () => {
        setSelectedEntry(null);
        setIsEditingSelectedEntry(false);
        setEditedContentText("");
        setEntryText(""); // Clear new entry field
        setStatus({ message: "", severity: "info" });
        setLastDetectedEmotion("");
        setCurrentView('main');
        setShowAllEntriesInDrawer(false);
    };

    // Handler for "Settings" button click
    const handleSettingsClick = () => {
        setCurrentView('settings');
        setSelectedEntry(null);
        setIsEditingSelectedEntry(false);
        setStatus({ message: "", severity: "info" });
        setLastDetectedEmotion("");
    };

    // Handler for "Insights" button click
    const handleInsightsClick = () => {
        setCurrentView('insights');
        setSelectedEntry(null); 
        setIsEditingSelectedEntry(false);
        setStatus({ message: "", severity: "info" });
        setLastDetectedEmotion("");
    };


    // Handler for theme mode change (passed to SettingsPage)
    const handleThemeModeChange = (newMode) => {
        setThemeMode(newMode);
    };

    // Handler to toggle showing all entries in the drawer
    const handleToggleShowEntries = () => {
        setShowAllEntriesInDrawer(prevShowAll => !prevShowAll);
    };

    // Function to aggregate emotions for the graph
    const aggregateEmotions = (entriesToAggregate, mode = "week") => {
        const grouped = {};
        const normalizeEmotion = (e) => {
            if (!e) return null;
            const lower = e.toLowerCase();
            if (lower === "anger") return "angry"; 
            if (lower === "disgust") return "disgust";
            if (lower === "fear") return "fear";
            if (lower === "joy") return "joy";
            if (lower === "neutral") return "neutral";
            if (lower === "sadness") return "sadness"; 
            if (lower === "surprise") return "surprise";
            return lower; 
        };

        entriesToAggregate.forEach((entry) => {
            // Use extractEmotionFromContent which now correctly parses from the full content string
            const rawEmotion = extractEmotionFromContent(entry.content);
            const emotion = normalizeEmotion(rawEmotion); 
            if (!emotion) return;

            let key;
            if (mode === "day") key = dayjs(entry.date).format("YYYY-MM-DD"); 
            else if (mode === "week") key = dayjs(entry.date).startOf("week").format("YYYY-MM-DD");
            else key = dayjs(entry.date).startOf("month").format("YYYY-MM");

            if (!grouped[key]) grouped[key] = {};
            grouped[key][emotion] = (grouped[key][emotion] || 0) + 1;
        });

        return Object.entries(grouped).map(([period, emotions]) => ({
            period, ...emotions,
        })).sort((a,b) => dayjs(a.period).valueOf() - dayjs(b.period).valueOf());
    };


    // JSX for drawer content
    const drawerContent = (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
                {drawerOpen && (
                    <Toolbar sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', px: [1] }}>
                        <IconButton onClick={handleDrawerClose} color="inherit">
                            {muiTheme.direction === 'rtl' ? <ChevronRightIcon /> : <ChevronLeftIcon />}
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
                            borderRadius: '16px', padding: '8px', minWidth: 0,
                            '& .MuiButton-startIcon': { m: isDrawerVisuallyOpen ? '0 8px 0 -4px' : '0' },
                        }}
                    >
                        {isDrawerVisuallyOpen && 'New Entry'}
                    </Button>
                </Box>

                {isDrawerVisuallyOpen && (loading || entries.length > 0) && <Divider sx={{mb:1}}/>}
                {isDrawerVisuallyOpen && entries.length > 0 && (
                     <Typography variant="subtitle1" sx={{ p: 2, pt:0, pb:0, color: 'text.primary', fontWeight: 'bold' }}>
                        Recent
                    </Typography>
                )}
               

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
                                    '&.Mui-selected': { bgcolor: 'action.selected', '&:hover': { bgcolor: 'action.hover' } }
                                }}
                            >
                                <ListItemIcon sx={{ minWidth: 0, mr: 3, justifyContent: 'center' }}><ArticleIcon /></ListItemIcon>
                                <ListItemText primary={formatDate(entry.date)} />
                            </ListItemButton>
                        </ListItem>
                    ))}
                </List>
                {isDrawerVisuallyOpen && !loading && entries.length > INITIAL_VISIBLE_ENTRIES && (
                    <Box sx={{ p: 1, display: 'flex', justifyContent: 'center' }}>
                        <Button
                            onClick={handleToggleShowEntries} variant="text" size="small"
                            endIcon={showAllEntriesInDrawer ? <ExpandLessIcon /> : <ExpandMoreIcon/>}
                            sx={{ textTransform: 'none', color: 'text.secondary' }}
                        >
                            {showAllEntriesInDrawer ? 'Show Less' : `Show ${entries.length - INITIAL_VISIBLE_ENTRIES} More`}
                        </Button>
                    </Box>
                )}
            </Box>

            <Box sx={{ marginTop: 'auto', flexShrink: 0 }}>
                <Divider />
                <List>
                    {[ 
                        { text: 'Insights', icon: <AutoAwesomeIcon />, handler: handleInsightsClick, view: 'insights' },
                        { text: 'Settings', icon: <SettingsIcon />, handler: handleSettingsClick, view: 'settings' },
                    ].map((item) => (
                        <ListItem key={item.text} disablePadding>
                            <ListItemButton
                                onClick={item.handler} title={item.text} selected={currentView === item.view}
                                sx={{
                                    minHeight: 48, justifyContent: isDrawerVisuallyOpen ? 'initial' : 'center', px: 2.5,
                                    '&.Mui-selected': { bgcolor: 'action.selected', '&:hover': { bgcolor: 'action.hover' }}
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

    // Main component render
    return (
        <ThemeProvider theme={muiTheme}>
            <CssBaseline />
            <Box sx={{
                display: 'flex', height: '100vh',
                bgcolor: flashColor || muiTheme.palette.background.default, // Use muiTheme here
                transition: 'background-color 0.5s ease',
            }}>
                <AppBar position="fixed" isPinnedOpen={drawerOpen}>
                    <Toolbar>
                        <IconButton
                            color="inherit" aria-label="open drawer" onClick={handleDrawerOpen} edge="start"
                            sx={{ mr: 5, ...(drawerOpen && { display: 'none' }) }}
                        >
                            <MenuIcon />
                        </IconButton>
                        <Typography variant="h6" noWrap component="div">
                            {currentView === 'settings' ? 'Settings'
                                : currentView === 'insights' ? 'Insights'
                                : selectedEntry ? (isEditingSelectedEntry ? `Editing: ${formatDate(selectedEntry.date)}` : formatDate(selectedEntry.date))
                                        : "MoodJourney"}
                        </Typography>
                    </Toolbar>
                </AppBar>

                <Drawer
                    variant="permanent" open={isDrawerVisuallyOpen}
                    onMouseEnter={handleDrawerHoverOpen} onMouseLeave={handleDrawerHoverClose}
                >
                    {drawerContent}
                </Drawer>

                <Box
                    component="main"
                    sx={{
                        flexGrow: 1, p: 3, display: 'flex', flexDirection: 'column',
                        justifyContent: (currentView === 'main' && selectedEntry) || currentView === 'settings' || currentView === 'insights'
                                          ? 'flex-start' : 'flex-end',
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
                        <CombinedSettingsPage 
                            currentThemeMode={themeMode} 
                            onThemeModeChange={handleThemeModeChange} 
                            onBack={handleNewEntryClick} 
                        />
                    ) : currentView === 'insights' ? (
                        <InsightsPage
                            entries={entries} theme={muiTheme} reportMode={reportMode} // Pass muiTheme to InsightsPage
                            setReportMode={setReportMode} aggregateEmotions={aggregateEmotions}
                            onBack={handleNewEntryClick} 
                        />
                    ) : selectedEntry && currentView === 'main' ? ( 
                        <>
                            <Box sx={{ mb: 2, alignSelf: 'flex-start', flexShrink: 0 }}>
                                <Button startIcon={<ArrowBackIcon />} onClick={handleNewEntryClick} variant="outlined">
                                    Back to Journal
                                </Button>
                            </Box>
                            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, width: '100%', flexGrow: 1, overflow: 'auto' }}>
                                <Paper sx={{ p: 3, flex: { xs: '1 1 auto', md: '2 1 0%' }, minWidth: 0, overflowY: 'auto', borderRadius: '16px', display: 'flex', flexDirection: 'column' }}>
                                    {isEditingSelectedEntry ? (
                                        <>
                                            <TextField
                                                value={editedContentText} // This is set by getContentForEditing
                                                onChange={(e) => setEditedContentText(e.target.value)}
                                                multiline minRows={10} fullWidth variant="outlined"
                                                sx={{ fontSize: '1.125rem', mb: 2, flexGrow: 1, '& .MuiOutlinedInput-root': { borderRadius: '8px' }, pt: 0.5 }}
                                                placeholder="Edit your thoughts here..."
                                            />
                                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 'auto', pt: 2, flexShrink: 0 }}>
                                                <Button variant="outlined" color="inherit" startIcon={<CancelIcon />} onClick={handleCancelEditSelectedEntry} disabled={saving}>Cancel</Button>
                                                <Button variant="contained" color="primary" startIcon={<SaveIcon />} onClick={handleConfirmUpdateSelectedEntry} disabled={saving || !editedContentText.trim()}>Save Changes</Button>
                                            </Box>
                                        </>
                                    ) : (
                                        <>
                                            <Typography variant="body1" sx={{ fontSize: '1.125rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word', flexGrow: 1, mb: 2, overflowY: 'auto', pt: 1 }}>
                                                {getMainContent(selectedEntry.content)}
                                            </Typography>
                                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 'auto', pt: 2, flexShrink: 0 }}>
                                                <Button variant="outlined" startIcon={<EditIcon />} onClick={handleStartEditSelectedEntry} disabled={saving}>Edit Entry</Button>
                                                <Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={() => handleDeleteEntry(selectedEntry)} disabled={saving}>Delete Entry</Button>
                                            </Box>
                                        </>
                                    )}
                                </Paper>

                                {selectedEntry && !isEditingSelectedEntry && ( 
                                    <Paper sx={{ p: 2.5, flex: { xs: '1 1 auto', md: '1 1 0%' }, minWidth: 0, borderRadius: '16px', display: 'flex', flexDirection: 'column', overflowY: 'auto', borderLeft: {md: `1px solid ${muiTheme.palette.divider}`} }}>
                                        <Box sx={{ flexGrow: 1, pt:1 }}>
                                            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium', fontSize: '1.1rem' }}>Detected Emotion:</Typography>
                                            <Typography variant="body1" sx={{ fontSize: '1.2rem', mb: 2.5, color: extractEmotionFromContent(selectedEntry.content) ? 'text.primary' : 'text.secondary', textTransform: 'capitalize' }}>
                                                {extractEmotionFromContent(selectedEntry.content) || "Not available"}
                                            </Typography>

                                            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium', fontSize: '1.1rem', mb:1 }}>AI Suggestions:</Typography>
                                            {(() => { // IIFE to handle suggestion display
                                                const suggestion = extractSuggestionFromContent(selectedEntry.content);
                                                if (suggestion) {
                                                    return (
                                                        <Typography variant="body1" sx={{ fontSize: '1.1rem', color: 'text.secondary', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                                            {suggestion}
                                                        </Typography>
                                                    );
                                                } else {
                                                    return (
                                                        <Typography variant="body1" sx={{ fontSize: '1.1rem', color: 'text.disabled' }}>
                                                            No suggestion available for this entry.
                                                        </Typography>
                                                    );
                                                }
                                            })()}
                                        </Box>
                                    </Paper>
                                )}
                            </Box>
                        </>
                    ) : ( 
                        <>
                            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', overflowY: 'auto' }}>
                                <Typography variant="h4" color="text.secondary" sx={{ fontWeight: 'bold', mb: 3 }}>
                                    {getGreeting(userName)}
                                </Typography>
                            </Box>
                            <Box sx={{ width: '100%', maxWidth: '800px', mx: 'auto', mb: 2, flexShrink: 0, mt: 'auto'  }}>
                                <Paper sx={{ p: 2, borderRadius: '16px', display: 'flex', flexDirection: 'column' }}>
                                    <TextField
                                        id="journal-entry-input"
                                        placeholder="Write your thoughts here..."
                                        multiline minRows={4} value={entryText}
                                        onChange={(e) => setEntryText(e.target.value)}
                                        variant="standard" fullWidth InputProps={{ disableUnderline: true }}
                                        sx={{ flexGrow: 1, mb: 1, fontSize: '1.125rem', p: 1, borderRadius: '4px' }}
                                    />
                                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                                        {entryText.trim() === "" ? (
                                            <IconButton color="primary" onClick={handleStartDictation} disabled={isDictating} size="large" aria-label="start dictation">
                                                {isDictating ? <CircularProgress size={24} color="inherit" /> : <MicIcon />}
                                            </IconButton>
                                        ) : (
                                            <IconButton color="primary" onClick={handleSaveEntry} disabled={saving || !entryText.trim()} size="large" aria-label="save entry">
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
