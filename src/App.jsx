import React, { useState, useEffect, useMemo } from 'react';
import { invoke } from "@tauri-apps/api/core";
// import dayjs from "dayjs"; // No longer needed for InsightsPage, but kept if other parts use it
// Recharts components are no longer used in InsightsPage, can be removed if not used elsewhere
// import {
//     BarChart,
//     Bar,
//     XAxis,
//     YAxis,
//     Tooltip,
//     ResponsiveContainer,
//     Legend
// } from "recharts";

import { styled, useTheme, ThemeProvider, createTheme, alpha } from '@mui/material/styles';
import {
    AppBar as MuiAppBar, Box, Button, Drawer as MuiDrawer, List, ListItem,
    ListItemButton, ListItemIcon, ListItemText, Toolbar, Typography,
    CircularProgress, Alert, CssBaseline, Divider, Paper, IconButton,
    TextField, Switch,
    Select, MenuItem, FormControl, InputLabel, Card, CardActionArea, CardContent, Grid,
    Tooltip as MuiTooltip
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
import VisibilityIcon from '@mui/icons-material/Visibility'; // For "Visual" button
import InfoIcon from '@mui/icons-material/Info'; // For "Informative" button

// Constants for drawer width, entry visibility, and alert timeout
const drawerWidth = 240;
const miniDrawerWidth = 65;
const INITIAL_VISIBLE_ENTRIES = 5;
const ALERT_TIMEOUT_DURATION = 10000;
const TOTAL_GRID_SQUARES_TARGET = 150;


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
const extractSuggestionFromContent = (fullContent) => {
    if (!fullContent) return null;
    const match = fullContent.match(/\n\n💡 Suggestion: ([\s\S]+)$/);
    return match ? match[1].trim() : null;
};

// Helper function to get content for editing (which is the main user text)
const getContentForEditing = (fullContent) => {
    return getMainContent(fullContent);
};

// Helper function to format date string (used in App and potentially InsightsPage)
const formatDate = (dateString) => {
    if (!dateString) return "Invalid Date";
    // Ensuring the date is parsed as local if no timezone info, then displayed
    const date = new Date(dateString.includes('T') ? dateString : dateString + 'T00:00:00');
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
};

// Helper function to get emotion color (used in InsightsPage)
const getEmotionColor = (emotion, theme) => {
    const emotionLower = emotion?.toLowerCase();
    const isDark = theme.palette.mode === 'dark';
    switch (emotionLower) {
        case 'sadness': return isDark ? '#64B5F6' : '#1976D2'; // Blue
        case 'anger':
        case 'angry': return isDark ? '#E57373' : '#D32F2F'; // Red
        case 'neutral': return isDark ? '#B0BEC5' : '#607D8B'; // Grey
        case 'joy': return isDark ? '#FFF176' : '#FBC02D'; // Yellow
        case 'disgust': return isDark ? '#81C784' : '#388E3C'; // Green
        case 'fear': return isDark ? '#CE93D8' : '#7B1FA2'; // Purple
        case 'surprise': return isDark ? '#FFB74D' : '#F57C00'; // Orange
        default: return theme.palette.text.disabled;
    }
};

// Common scrollbar styling
const scrollbarStyles = (theme) => ({
    height: '100%',
    overflowY: 'auto',
    pr: 0.5,
    mr: -0.5,
    '&::-webkit-scrollbar': {
        width: '8px',
    },
    '&::-webkit-scrollbar-track': {
        background: 'transparent',
    },
    '&::-webkit-scrollbar-thumb': {
        background: theme.palette.mode === 'dark' ? alpha(theme.palette.common.white, 0.25) : alpha(theme.palette.common.black, 0.25),
        borderRadius: '4px',
        '&:hover': {
            background: theme.palette.mode === 'dark' ? alpha(theme.palette.common.white, 0.4) : alpha(theme.palette.common.black, 0.4),
        }
    },
});


// Settings Page Component - MODIFIED
function CombinedSettingsPage({ currentThemeMode, onThemeModeChange, onBack }) {
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
            <Paper
                sx={{
                    p: 1,
                    width: '100%',
                    flexGrow: 1,
                    borderRadius: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                }}
            >
                <Box sx={scrollbarStyles(theme)}>
                    <Box sx={{ p: theme.spacing(1.5), pr: theme.spacing(1), display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', width: '100%', mb: 2, flexShrink: 0 }}>
                            <Typography variant="body1" id="theme-select-label" sx={{ fontSize: '1.125rem', mr: 2, pb: '0px' }}>
                                Theme
                            </Typography>
                            {/* MODIFICATION: Added small marginTop to the FormControl */}
                            <FormControl sx={{ minWidth: 240, mt: '0px' /* Adjust as needed */ }} size="small">
                                <Select
                                    labelId="theme-select-label-helper"
                                    id="theme-select"
                                    value={currentThemeMode}
                                    onChange={(e) => onThemeModeChange(e.target.value)}
                                    sx={{ borderRadius: '8px' }}
                                >
                                    <MenuItem value="light">Light</MenuItem>
                                    <MenuItem value="dark">Dark</MenuItem>
                                    <MenuItem value="system">System</MenuItem>
                                </Select>
                            </FormControl>
                        </Box>
                        <Typography variant="body1" color="text.secondary" sx={{ mt: 'auto', fontSize: '1.125rem', flexShrink: 0, textAlign:'left' }}>
                            MoodJourney v0.1.0
                        </Typography>
                    </Box>
                </Box>
            </Paper>
        </>
    );
}

// Insights Page Component
function InsightsPage({ entries, theme, onBack, handleEntrySelect }) {
    const [insightsViewMode, setInsightsViewMode] = useState("Informative");

    const emotionCounts = useMemo(() => {
        const counts = {
            sadness: 0, angry: 0, neutral: 0, joy: 0,
            disgust: 0, fear: 0, surprise: 0, unknown: 0
        };
        entries.forEach(entry => {
            const extractedEmotion = extractEmotionFromContent(entry.content)?.toLowerCase();
            let targetKey = extractedEmotion;

            if (extractedEmotion === "anger") {
                targetKey = "angry";
            }

            if (targetKey && counts.hasOwnProperty(targetKey)) {
                counts[targetKey]++;
            } else if (extractedEmotion) {
                counts.unknown++;
            } else {
                counts.unknown++;
            }
        });
        return counts;
    }, [entries]);

    const getEntryPreview = (content) => {
        const main = getMainContent(content);
        const lines = main.split('\n');
        return lines.slice(0, 5).join('\n') + (lines.length > 5 ? '...' : '');
    };

    const handleCardClick = (entry) => {
        if (handleEntrySelect) {
            handleEntrySelect(entry);
        }
    };

    // JSX for the emotion summary list, to be reused
    const EmotionSummaryList = () => {
        const orderedEmotionKeys = ['angry', 'disgust', 'fear', 'joy', 'neutral', 'sadness', 'surprise'];
        let hasDisplayedEmotions = false;

        return (
            <Box sx={{ p: theme.spacing(1.5), pr: theme.spacing(1) }}>
                {orderedEmotionKeys.map((emotionKey) => {
                    const count = emotionCounts[emotionKey];
                    if (count > 0) {
                        hasDisplayedEmotions = true;
                        let displayName = emotionKey.charAt(0).toUpperCase() + emotionKey.slice(1);
                        if (emotionKey === 'angry') {
                            displayName = 'Anger';
                        }
                        return (
                            <Box key={emotionKey} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, p:1, borderRadius: '8px', background: alpha(getEmotionColor(emotionKey, theme), 0.1) }}>
                                <Typography variant="body1" sx={{ textTransform: 'capitalize', color: getEmotionColor(emotionKey, theme) }}>
                                    {displayName}
                                </Typography>
                                <Typography variant="body1" sx={{ fontWeight: 'bold', color: getEmotionColor(emotionKey, theme) }}>
                                    {count}
                                </Typography>
                            </Box>
                        );
                    }
                    return null;
                })}
                {emotionCounts.unknown > 0 && (() => {
                    hasDisplayedEmotions = true;
                    return (
                        <Box key="unknown" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, p:1, borderRadius: '8px', background: alpha(getEmotionColor("unknown", theme), 0.1) }}>
                            <Typography variant="body1" sx={{ textTransform: 'capitalize', color: getEmotionColor("unknown", theme) }}>
                                Unknown
                            </Typography>
                            <Typography variant="body1" sx={{ fontWeight: 'bold', color: getEmotionColor("unknown", theme) }}>
                                {emotionCounts.unknown}
                            </Typography>
                        </Box>
                    );
                })()}

                {entries.length > 0 && !hasDisplayedEmotions && (
                     <Typography sx={{ textAlign: 'center', mt: 1 }} color="text.secondary">No categorized emotions found.</Typography>
                )}
                {entries.length === 0 && (
                     <Typography sx={{ textAlign: 'center', mt: 1 }} color="text.secondary">No data for summary.</Typography>
                )}
            </Box>
        );
    };


    return (
        <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexShrink: 0 }}>
                <Button
                    startIcon={<ArrowBackIcon />}
                    onClick={onBack}
                    variant="outlined"
                >
                    Back to Journal
                </Button>
                <Box>
                    <Button
                        onClick={() => setInsightsViewMode("Informative")}
                        variant={insightsViewMode === 'Informative' ? 'contained' : 'outlined'}
                        startIcon={<InfoIcon />}
                        sx={{ mr: 1 }}
                    >
                        Informative
                    </Button>
                    <Button
                        onClick={() => setInsightsViewMode("Visual")}
                        variant={insightsViewMode === 'Visual' ? 'contained' : 'outlined'}
                        startIcon={<VisibilityIcon />}
                    >
                        Visual
                    </Button>
                </Box>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, width: '100%', flexGrow: 1, overflow: 'hidden' }}>
                <Paper
                    sx={{
                        p: 1,
                        flex: { xs: '1 1 auto', md: '2 1 0%' },
                        minWidth: 0,
                        borderRadius: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                    }}
                >
                    {insightsViewMode === "Informative" ? (
                        entries.length > 0 ? (
                            <Box sx={scrollbarStyles(theme)}>
                                <Box sx={{ p: theme.spacing(1.5), pr: theme.spacing(1)  }}>
                                    {entries.map(entry => {
                                        const rawEmotion = extractEmotionFromContent(entry.content);
                                        const cardEmotionColor = rawEmotion ? getEmotionColor(rawEmotion, theme) : theme.palette.text.disabled;

                                        let cardDisplayText = rawEmotion;
                                        if (rawEmotion?.toLowerCase() === 'anger' || rawEmotion?.toLowerCase() === 'angry') {
                                            cardDisplayText = 'Anger';
                                        }

                                        return (
                                            <Card
                                                key={entry.date}
                                                sx={{
                                                    width: '100%',
                                                    mb: 2,
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    borderLeft: `5px solid ${cardEmotionColor}`,
                                                    borderRadius: '8px',
                                                    '&:last-child': {
                                                        mb: 0,
                                                    }
                                                }}
                                            >
                                                <CardActionArea onClick={() => handleCardClick(entry)} sx={{ flexGrow: 1 }}>
                                                    <CardContent sx={{ p: 3 }}>
                                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5  }}>
                                                            <Typography
                                                                variant="subtitle1"
                                                                color="text.secondary"
                                                                sx={{ fontSize: theme.typography.pxToRem(18), fontWeight: 'bold' }}
                                                            >
                                                                {formatDate(entry.date)}
                                                            </Typography>
                                                            {cardDisplayText && (
                                                                <Typography
                                                                    variant="body1"
                                                                    sx={{ fontSize: theme.typography.pxToRem(16), color: cardEmotionColor, fontWeight: 'bold', textTransform: 'capitalize' }}
                                                                >
                                                                    {cardDisplayText}
                                                                </Typography>
                                                            )}
                                                        </Box>

                                                        <Typography
                                                            variant="body1"
                                                            sx={{
                                                                fontSize: theme.typography.pxToRem(17),
                                                                lineHeight: 1.65,
                                                                display: '-webkit-box',
                                                                WebkitLineClamp: 5,
                                                                WebkitBoxOrient: 'vertical',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                minHeight: '8.25em'
                                                            }}
                                                        >
                                                            {getEntryPreview(entry.content)}
                                                        </Typography>
                                                    </CardContent>
                                                </CardActionArea>
                                            </Card>
                                        );
                                    })}
                                </Box>
                            </Box>
                        ) : (
                            <Typography sx={{ textAlign: 'center', mt: 3 }}>No journal entries to display.</Typography>
                        )
                    ) : (
                        <Box sx={{
                            flexGrow: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            height: '100%',
                        }}>
                            {entries.length > 0 || TOTAL_GRID_SQUARES_TARGET > 0 ? (
                                <Box
                                    sx={{
                                        flexGrow: 1,
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(10, 1fr)',
                                        gap: theme.spacing(0.75),
                                        p: theme.spacing(0.75),
                                        direction: 'ltr',
                                        alignContent: 'flex-start',
                                        ...scrollbarStyles(theme)
                                    }}
                                >
                                    {[...entries].reverse().map(entry => {
                                        const rawEmotion = extractEmotionFromContent(entry.content);
                                        const squareColor = rawEmotion ? getEmotionColor(rawEmotion, theme) : theme.palette.grey[700];
                                        let displayEmotionText = rawEmotion || "Unknown";
                                        if (rawEmotion?.toLowerCase() === 'anger' || rawEmotion?.toLowerCase() === 'angry') {
                                            displayEmotionText = 'Anger';
                                        }

                                        return (
                                            <MuiTooltip
                                                key={entry.date}
                                                title={
                                                    <React.Fragment>
                                                        <Typography variant="caption" display="block" sx={{ fontWeight: 'bold' }}>{formatDate(entry.date)}</Typography>
                                                        <Typography variant="caption" display="block" sx={{ textTransform: 'capitalize' }}>{displayEmotionText}</Typography>
                                                    </React.Fragment>
                                                }
                                                arrow
                                                placement="top"
                                            >
                                                <Box
                                                    onClick={() => handleEntrySelect(entry)}
                                                    sx={{
                                                        aspectRatio: '1 / 1',
                                                        bgcolor: squareColor,
                                                        borderRadius: '4px',
                                                        cursor: 'pointer',
                                                        transition: 'transform 0.15s ease-out, box-shadow 0.15s ease-out',
                                                        '&:hover': {
                                                            transform: 'scale(1.05)',
                                                            boxShadow: theme.shadows[6],
                                                        }
                                                    }}
                                                />
                                            </MuiTooltip>
                                        );
                                    })}
                                    {Array.from({ length: Math.max(0, TOTAL_GRID_SQUARES_TARGET - entries.length) }).map((_, index) => (
                                        <Box
                                            key={`placeholder-${index}`}
                                            sx={{
                                                aspectRatio: '1 / 1',
                                                border: `1px dashed ${theme.palette.divider}`,
                                                borderRadius: '4px',
                                                bgcolor: alpha(theme.palette.action.hover, 0.05),
                                            }}
                                        />
                                    ))}
                                </Box>
                            ) : (
                                <Box sx={{flexGrow:1, display:'flex', alignItems:'center', justifyContent:'center'}}>
                                    <Typography color="text.secondary" variant="h6">
                                        No entries to visualize.
                                    </Typography>
                                </Box>
                            )}
                        </Box>
                    )}
                </Paper>

                <Paper
                    sx={{
                        p: 1,
                        flex: { xs: '1 1 auto', md: '1 1 0%' },
                        minWidth: 0,
                        borderRadius: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        overflowY: 'auto',
                        borderLeft: { md: `1px solid ${theme.palette.divider}` },
                    }}
                >
                    <EmotionSummaryList />
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
         MuiSelect: {
            styleOverrides: {
                root: ({theme}) => ({
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
        const storedThemeMode = localStorage.getItem('appThemeMode');
        return storedThemeMode || 'system';
    });
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
    // const [reportMode, setReportMode] = useState("week"); // No longer used by InsightsPage directly


    // Effect to update the active theme based on themeMode and system preference
    useEffect(() => {
        const prefersDarkMQ = window.matchMedia('(prefers-color-scheme: dark)');

        const updateActiveTheme = (event) => {
            if (themeMode === 'dark') {
                setIsDarkModeActive(true);
            } else if (themeMode === 'light') {
                setIsDarkModeActive(false);
            } else {
                setIsDarkModeActive(event ? event.matches : prefersDarkMQ.matches);
            }
        };

        updateActiveTheme();

        if (themeMode === 'system') {
            prefersDarkMQ.addEventListener('change', updateActiveTheme);
            return () => prefersDarkMQ.removeEventListener('change', updateActiveTheme);
        }
    }, [themeMode]);

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
        const currentPalette = isDarkModeActive ? darkTheme.palette : lightTheme.palette;
        let colorToSet = null;
        const baseFlashColor = getEmotionColor(emotion, muiTheme);
        if (baseFlashColor !== muiTheme.palette.text.disabled) {
             colorToSet = alpha(baseFlashColor, 0.3);
        }


        if (colorToSet) {
            setFlashColor(colorToSet);
            setTimeout(() => setFlashColor(null), 1000);
        }
    };

    // Function to get time-based greeting
    const getGreeting = (name) => {
        const hour = new Date().getHours();
        const timeOfDay = hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";
        return name ? `${timeOfDay}, ${name}` : timeOfDay;
    };

    // Function to get current date string in<y_bin_358>-MM-DD format
    const getCurrentDateString = () => new Date().toISOString().split('T')[0];

    // Function to refresh the list of entries
    const refreshEntriesList = async () => {
        setLoading(true);
        try {
            const freshEntries = (await invoke("read_entries")) || [];
            const sorted = freshEntries.sort((a, b) => new Date(b.date) - new Date(a.date));
            setEntries(sorted);
            return sorted;
        } catch (err) {
            console.error("Error refreshing entries list:", err);
            setStatus({ message: `Error refreshing entries: ${err.message || String(err)}`, severity: "error" });
            setEntries([]);
            return [];
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
        const currentEntryText = entryText.trim();
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
            generatedSuggestion = await invoke("generate_suggestion_cmd", {
                entryTitle: "Journal Entry",
                entryContent: currentEntryText,
                suggestionType: null
            });
        } catch (suggestionError) {
            console.error("Error generating suggestion:", suggestionError);
            statusMessage += `AI suggestion generation failed: ${suggestionError.message || String(suggestionError)}.`;
            statusSeverity = "warning";
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

            if (statusSeverity !== "warning") {
                 statusMessage = `Entry ${successVerbText} successfully!`;
                 statusSeverity = "success";
            } else {
                statusMessage = `Entry ${successVerbText} with issues: ${statusMessage}`;
            }
            if (classifiedEmotion && classifiedEmotion.toLowerCase() !== "unknown") {
                statusMessage += ` Detected Emotion: ${classifiedEmotion.toUpperCase()}`;
                flashBackground(classifiedEmotion);
            }

            setEntryText("");
            setShowAllEntriesInDrawer(false);
            const updatedEntries = await refreshEntriesList();
            const newOrUpdatedEntry = updatedEntries.find(e => e.date === currentDate);

            if (newOrUpdatedEntry) {
                setSelectedEntry(newOrUpdatedEntry);
                setCurrentView('main');
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
            setStatus({ message: "", severity: "info" });
            setLastDetectedEmotion("");
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
            generatedSuggestion = await invoke("generate_suggestion_cmd", {
                entryTitle: selectedEntry.title || "Journal Entry",
                entryContent: currentEditedContent,
                suggestionType: null
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
                setSelectedEntry(null);
                handleNewEntryClick();
            } else if (remainingEntries.length === 0) {
                 handleNewEntryClick();
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


    // Handler for selecting an entry from the drawer OR Insights page card
    const handleEntrySelect = (entry) => {
        setSelectedEntry(entry);
        setIsEditingSelectedEntry(false);
        setEditedContentText("");
        setEntryText("");
        setStatus({ message: "", severity: "info" });
        setLastDetectedEmotion("");
        setCurrentView('main');
    };

    // Handler for "New Entry" button click
    const handleNewEntryClick = () => {
        setSelectedEntry(null);
        setIsEditingSelectedEntry(false);
        setEditedContentText("");
        setEntryText("");
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
                bgcolor: flashColor || muiTheme.palette.background.default,
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
                        height: '100%', overflow: 'hidden' // Outer main box should hide overflow
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
                            entries={entries}
                            theme={muiTheme}
                            onBack={handleNewEntryClick}
                            handleEntrySelect={handleEntrySelect}
                        />
                    ) : selectedEntry && currentView === 'main' ? (
                        <>
                            <Box sx={{ mb: 2, alignSelf: 'flex-start', flexShrink: 0 }}>
                                <Button startIcon={<ArrowBackIcon />} onClick={handleNewEntryClick} variant="outlined">
                                    Back to Journal
                                </Button>
                            </Box>
                            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, width: '100%', flexGrow: 1, overflow: 'hidden' }}>
                                <Paper sx={{
                                    p: 1,
                                    flex: { xs: '1 1 auto', md: '2 1 0%' },
                                    minWidth: 0,
                                    borderRadius: '16px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    overflow: 'hidden'
                                }}>
                                    {isEditingSelectedEntry ? (
                                        <Box sx={scrollbarStyles(muiTheme)}>
                                           <Box sx={{
                                               p: muiTheme.spacing(1.5),
                                               pr: muiTheme.spacing(1),
                                               height: '100%',
                                               display: 'flex',
                                               flexDirection: 'column'
                                            }}>
                                                <TextField
                                                    value={editedContentText}
                                                    onChange={(e) => setEditedContentText(e.target.value)}
                                                    multiline
                                                    rows={10}
                                                    fullWidth
                                                    variant="outlined"
                                                    sx={{
                                                        fontSize: '1.125rem',
                                                        flexGrow: 1,
                                                        '& .MuiOutlinedInput-root': {
                                                            borderRadius: '8px',
                                                            height: '100%',
                                                            '& .MuiOutlinedInput-input': {
                                                                height: '100% !important',
                                                                overflowY: 'auto !important',
                                                            }
                                                        },
                                                        pt: muiTheme.spacing(1),
                                                        mb: 2,
                                                    }}
                                                    placeholder="Edit your thoughts here..."
                                                />
                                                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 'auto', pt: 2, flexShrink: 0 }}>
                                                    <Button variant="outlined" color="inherit" startIcon={<CancelIcon />} onClick={handleCancelEditSelectedEntry} disabled={saving}>Cancel</Button>
                                                    <Button variant="contained" color="primary" startIcon={<SaveIcon />} onClick={handleConfirmUpdateSelectedEntry} disabled={saving || !editedContentText.trim()}>Save Changes</Button>
                                                </Box>
                                            </Box>
                                        </Box>
                                    ) : (
                                        <Box sx={scrollbarStyles(muiTheme)}>
                                            <Box sx={{p: muiTheme.spacing(1.5), pr: muiTheme.spacing(1) }}>
                                                <Typography variant="body1" sx={{ fontSize: '1.125rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word', mb: 2,
                                                    pt: muiTheme.spacing(1)
                                                }}>
                                                    {getMainContent(selectedEntry.content)}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    )}
                                    {!isEditingSelectedEntry && (
                                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 'auto', pt: 2, flexShrink: 0,
                                                    pl: muiTheme.spacing(1), pr: muiTheme.spacing(1), pb: muiTheme.spacing(1)
                                                }}>
                                            <Button variant="outlined" startIcon={<EditIcon />} onClick={handleStartEditSelectedEntry} disabled={saving}>Edit Entry</Button>
                                            <Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={() => handleDeleteEntry(selectedEntry)} disabled={saving}>Delete Entry</Button>
                                        </Box>
                                    )}
                                </Paper>

                                {selectedEntry && !isEditingSelectedEntry && (
                                    <Paper sx={{
                                        p: 1,
                                        flex: { xs: '1 1 auto', md: '1 1 0%' },
                                        minWidth: 0,
                                        borderRadius: '16px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        overflow: 'hidden',
                                        borderLeft: {md: `1px solid ${muiTheme.palette.divider}`}
                                    }}>
                                        <Box sx={scrollbarStyles(muiTheme)}>
                                          <Box sx={{p: muiTheme.spacing(1.5), pr: muiTheme.spacing(1)}}>
                                            {/* MODIFIED: Detected Emotion Card */}
                                            <Card sx={{ 
                                                mb: 2, 
                                                borderRadius: '8px', 
                                                border: `1.5px solid ${alpha(muiTheme.palette.text.primary, 0.25)}` /* More apparent border */
                                            }}>
                                                <CardContent sx={{ p: 2 }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75 /* Space between label and value */ }}>
                                                        <Typography variant="subtitle1" sx={{ fontWeight: 'medium', fontSize: '1.1rem' }}>
                                                            Detected Emotion:
                                                        </Typography>
                                                        <Typography variant="body1" sx={{ fontSize: '1.2rem', color: getEmotionColor(extractEmotionFromContent(selectedEntry.content), muiTheme) , textTransform: 'capitalize' }}>
                                                            {extractEmotionFromContent(selectedEntry.content) || "Not available"}
                                                        </Typography>
                                                    </Box>
                                                </CardContent>
                                            </Card>

                                            {/* MODIFIED: AI Suggestions Card */}
                                            <Card sx={{ 
                                                borderRadius: '8px',
                                                border: `1.5px solid ${alpha(muiTheme.palette.text.primary, 0.25)}` /* More apparent border */
                                            }}>
                                                <CardContent sx={{ p: 2 }}>
                                                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium', fontSize: '1.1rem', mb:1, pt: muiTheme.spacing(0.5) }}>
                                                        AI Suggestions:
                                                    </Typography>
                                                    {(() => {
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
                                                </CardContent>
                                            </Card>
                                          </Box>
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
