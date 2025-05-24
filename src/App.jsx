import React, { useState, useEffect, useMemo, useRef } from 'react';
import { invoke } from "@tauri-apps/api/core";

import { styled, useTheme, ThemeProvider, createTheme, alpha } from '@mui/material/styles';
import {
    AppBar as MuiAppBar, Box, Button, Drawer as MuiDrawer, List, ListItem,
    ListItemButton, ListItemIcon, ListItemText, Toolbar, Typography,
    CircularProgress, Alert as MuiAlert, CssBaseline, Divider, Paper, IconButton,
    TextField, Switch, FormControlLabel,
    Select, MenuItem, FormControl, InputLabel, Card, CardActionArea, CardContent, Grid,
    Tooltip as MuiTooltip, Snackbar, Menu, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle
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
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import VisibilityIcon from '@mui/icons-material/Visibility';
import InfoIcon from '@mui/icons-material/Info';
import CloseIcon from '@mui/icons-material/Close';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import ChatIcon from '@mui/icons-material/Chat'; // For chat history items
import MoreVertIcon from '@mui/icons-material/MoreVert'; // For three-dot menu

const drawerWidth = 240;
const miniDrawerWidth = 65;
const INITIAL_VISIBLE_ENTRIES = 5;
const ALERT_TIMEOUT_DURATION = 10000;

const openedMixin = (theme) => ({
    width: drawerWidth,
    transition: theme.transitions.create('width', {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.enteringScreen,
    }),
    overflowX: 'hidden',
});

const closedMixin = (theme) => ({
    transition: theme.transitions.create('width', {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.leavingScreen,
    }),
    overflowX: 'hidden',
    width: `${miniDrawerWidth}px`,
});

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
        ...(open && { ...openedMixin(theme), '& .MuiDrawer-paper': openedMixin(theme) }),
        ...(!open && { ...closedMixin(theme), '& .MuiDrawer-paper': closedMixin(theme) }),
    }),
);

const getMainContent = (fullContent) => {
    if (!fullContent) return "";
    const emotionTagIndex = fullContent.indexOf("\n\n🧠 Emotion:");
    const suggestionTagIndex = fullContent.indexOf("\n\n💡 Suggestion:");
    let endOfMain = fullContent.length;
    if (emotionTagIndex !== -1) endOfMain = Math.min(endOfMain, emotionTagIndex);
    if (suggestionTagIndex !== -1) endOfMain = Math.min(endOfMain, suggestionTagIndex);
    return fullContent.substring(0, endOfMain).trim();
};

const extractEmotionFromContent = (fullContent) => {
    if (!fullContent) return null;
    const match = fullContent.match(/\n\n🧠 Emotion: (\w+)/);
    return match ? match[1] : null;
};

const extractSuggestionFromContent = (fullContent) => {
    if (!fullContent) return null;
    const match = fullContent.match(/\n\n💡 Suggestion: ([\s\S]+)$/);
    return match ? match[1].trim() : null;
};

const getContentForEditing = (fullContent) => getMainContent(fullContent);

const formatDate = (dateString) => {
    if (!dateString) return "Invalid Date";
    const date = new Date(dateString.includes('T') ? dateString : dateString + 'T00:00:00');
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
};

const formatChatTimestamp = (timestamp) => {
    if (!timestamp) return "";
    try {
        const date = new Date(timestamp);
        // More concise format for chat history
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) {
        console.error("Error formatting chat timestamp:", e);
        return "Invalid Date";
    }
};


const getEmotionColor = (emotion, theme) => {
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

const scrollbarStyles = (theme) => ({
    overflowY: 'auto',
    pr: 0.5, 
    mr: -0.5, 
    '&::-webkit-scrollbar': { width: '8px' },
    '&::-webkit-scrollbar-track': { background: 'transparent' },
    '&::-webkit-scrollbar-thumb': {
        background: theme.palette.mode === 'dark' ? alpha(theme.palette.common.white, 0.25) : alpha(theme.palette.common.black, 0.25),
        borderRadius: '4px',
        '&:hover': { background: theme.palette.mode === 'dark' ? alpha(theme.palette.common.white, 0.4) : alpha(theme.palette.common.black, 0.4) }
    },
});

function CombinedSettingsPage({ currentThemeMode, onThemeModeChange, onBack }) {
    const theme = useTheme();
    return (
        <>
            <Box sx={{ mb: 2, alignSelf: 'flex-start', flexShrink: 0 }}>
                <Button startIcon={<ArrowBackIcon />} onClick={onBack} variant="outlined">Back to Journal</Button>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, width: '100%', flexGrow: 1, overflow: 'hidden' }}>
                <Paper sx={{ p: 1, flex: { xs: '1 1 auto', md: '2 1 0%' }, minWidth: 0, borderRadius: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <Box sx={{...scrollbarStyles(theme), height: '100%'}}> 
                        <Box sx={{ p: theme.spacing(1.5), pr: theme.spacing(1), display: 'flex', flexDirection: 'column', height: '100%' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', width: '100%', mb: 2, flexShrink: 0 }}>
                                <Typography variant="body1" id="theme-select-label" sx={{ fontSize: '1.125rem', mr: 2, pb: '0px' }}>Theme</Typography>
                                <FormControl sx={{ minWidth: 240, mt: '0px' }} size="small">
                                    <Select labelId="theme-select-label-helper" id="theme-select" value={currentThemeMode} onChange={(e) => onThemeModeChange(e.target.value)} sx={{ borderRadius: '8px' }}>
                                        <MenuItem value="light">Light</MenuItem>
                                        <MenuItem value="dark">Dark</MenuItem>
                                        <MenuItem value="system">System</MenuItem>
                                    </Select>
                                </FormControl>
                            </Box>
                            <Typography variant="body1" color="text.secondary" sx={{ mt: 'auto', fontSize: '1.125rem', flexShrink: 0, textAlign:'left', pt: 2 }}>MoodJourney v0.1.0</Typography>
                        </Box>
                    </Box>
                </Paper>
                <Paper sx={{ p: 1, flex: { xs: '1 1 auto', md: '1 1 0%' }, minWidth: 0, borderRadius: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <Box sx={{p: theme.spacing(1.5), pr: theme.spacing(1)}}>{/* Intentionally empty */}</Box>
                </Paper>
            </Box>
        </>
    );
}

function InsightsPage({ entries, theme, onBack, handleEntrySelect }) {
    const [insightsViewMode, setInsightsViewMode] = useState("Informative");
    const [calendarGranularity, setCalendarGranularity] = useState("month");
    const [currentDisplayYear, setCurrentDisplayYear] = useState(new Date().getFullYear());
    const [currentDisplayMonth, setCurrentDisplayMonth] = useState(new Date().getMonth());
    const [selectedInsightEntry, setSelectedInsightEntry] = useState(null);

    const dayAbbreviations = useMemo(() => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], []);
    const monthNames = useMemo(() => ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"], []);

    const availableYears = useMemo(() => {
        const entryYears = new Set(entries.map(entry => new Date(entry.date.includes('T') ? entry.date : entry.date + 'T00:00:00').getFullYear()));
        const currentSystemYear = new Date().getFullYear();
        entryYears.add(currentSystemYear);
        if (entryYears.size === 0) return [currentSystemYear];
        const sortedYears = Array.from(entryYears).sort((a, b) => a - b);
        const minDataYear = sortedYears[0];
        const maxDataYear = sortedYears[sortedYears.length - 1];
        const startRange = Math.min(minDataYear, currentSystemYear - 3);
        const endRange = Math.max(maxDataYear, currentSystemYear + 3);
        const yearOptions = [];
        for (let y = startRange; y <= endRange; y++) yearOptions.push(y);
        return yearOptions.length > 0 ? yearOptions : [currentSystemYear];
    }, [entries]);

    useEffect(() => {
        if (availableYears.length > 0 && !availableYears.includes(currentDisplayYear)) {
            const currentSystemYear = new Date().getFullYear();
            setCurrentDisplayYear(availableYears.includes(currentSystemYear) ? currentSystemYear : availableYears[availableYears.length - 1]);
        }
    }, [availableYears, currentDisplayYear]);

    useEffect(() => {
        setSelectedInsightEntry(null);
    }, [insightsViewMode]);

    const entriesByDate = useMemo(() => {
        const map = new Map();
        entries.forEach(entry => map.set(entry.date, entry));
        return map;
    }, [entries]);

    const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

    const emotionCounts = useMemo(() => {
        const counts = { sadness: 0, angry: 0, neutral: 0, joy: 0, disgust: 0, fear: 0, surprise: 0, unknown: 0 };
        entries.forEach(entry => {
            const extractedEmotion = extractEmotionFromContent(entry.content)?.toLowerCase();
            let targetKey = extractedEmotion === "anger" ? "angry" : extractedEmotion;
            if (targetKey && counts.hasOwnProperty(targetKey)) counts[targetKey]++;
            else if (extractedEmotion) counts.unknown++;
            else counts.unknown++;
        });
        return counts;
    }, [entries]);

    const getEntryPreview = (content) => {
        const main = getMainContent(content);
        const lines = main.split('\n');
        return lines.slice(0, 5).join('\n') + (lines.length > 5 ? '...' : ''); 
    };
    
    const EmotionSummaryList = () => {
        const orderedEmotionKeys = ['angry', 'disgust', 'fear', 'joy', 'neutral', 'sadness', 'surprise'];
        let hasDisplayedEmotions = false;
        return (
            <Box sx={{ p: theme.spacing(1.5) }}>
                {orderedEmotionKeys.map((emotionKey) => {
                    const count = emotionCounts[emotionKey];
                    if (count > 0) {
                        hasDisplayedEmotions = true;
                        let displayName = emotionKey.charAt(0).toUpperCase() + emotionKey.slice(1);
                        if (emotionKey === 'angry') displayName = 'Anger';
                        return (
                            <Box key={emotionKey} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, p:1, borderRadius: '8px', background: alpha(getEmotionColor(emotionKey, theme), 0.1) }}>
                                <Typography variant="body1" sx={{ textTransform: 'capitalize', color: getEmotionColor(emotionKey, theme) }}>{displayName}</Typography>
                                <Typography variant="body1" sx={{ fontWeight: 'bold', color: getEmotionColor(emotionKey, theme) }}>{count}</Typography>
                            </Box>
                        );
                    } return null;
                })}
                {emotionCounts.unknown > 0 && (() => {
                    hasDisplayedEmotions = true;
                    return (
                        <Box key="unknown" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, p:1, borderRadius: '8px', background: alpha(getEmotionColor("unknown", theme), 0.1) }}>
                            <Typography variant="body1" sx={{ textTransform: 'capitalize', color: getEmotionColor("unknown", theme) }}>Unknown</Typography>
                            <Typography variant="body1" sx={{ fontWeight: 'bold', color: getEmotionColor("unknown", theme) }}>{emotionCounts.unknown}</Typography>
                        </Box>
                    );
                })()}
                {entries.length > 0 && !hasDisplayedEmotions && <Typography sx={{ textAlign: 'center', mt: 1 }} color="text.secondary">No categorized emotions.</Typography>}
                {entries.length === 0 && <Typography sx={{ textAlign: 'center', mt: 1 }} color="text.secondary">No data for summary.</Typography>}
            </Box>
        );
    };

    const renderDayCell = (dateStr, dayNumber, entryForDay) => {
        const rawEmotion = entryForDay ? extractEmotionFromContent(entryForDay.content) : null;
        const squareColor = rawEmotion ? getEmotionColor(rawEmotion, theme) : (entryForDay ? theme.palette.grey[700] : alpha(theme.palette.background.paper, 0.8));
        let displayEmotionText = rawEmotion || (entryForDay ? "Unknown" : "No Entry");
        if (rawEmotion?.toLowerCase() === 'anger' || rawEmotion?.toLowerCase() === 'angry') displayEmotionText = 'Anger';

        return (
            <MuiTooltip
                key={dateStr}
                title={<><Typography variant="caption" display="block" sx={{ fontWeight: 'bold' }}>{formatDate(dateStr)}</Typography>{entryForDay && <Typography variant="caption" display="block" sx={{ textTransform: 'capitalize' }}>{displayEmotionText}</Typography>}</>}
                arrow
                placement="top"
            >
                <Box
                    onClick={() => entryForDay && setSelectedInsightEntry(entryForDay)}
                    sx={{
                        aspectRatio: '1 / 1',
                        bgcolor: squareColor,
                        border: entryForDay ? 'none' : `1px solid ${theme.palette.divider}`,
                        borderRadius: '4px',
                        cursor: entryForDay ? 'pointer' : 'default',
                        transition: 'transform 0.1s ease-out, box-shadow 0.1s ease-out',
                        '&:hover': entryForDay ? { transform: 'scale(1.05)', boxShadow: theme.shadows[4] } : {},
                        display: 'flex',
                        alignItems: 'flex-start', 
                        justifyContent: 'flex-start', 
                        p: 0.5, 
                        position: 'relative', 
                        opacity: entryForDay ? 1 : 0.7,
                    }}
                >
                    <Typography variant="caption" sx={{ 
                        fontSize: '0.6rem', 
                        color: entryForDay ? alpha(theme.palette.getContrastText(squareColor), 0.8) : theme.palette.text.secondary,
                        lineHeight: 1,
                     }}>
                        {dayNumber}
                    </Typography>
                </Box>
            </MuiTooltip>
        );
    };
    
    const renderDayHeaders = () => (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: theme.spacing(0.75), p: `${theme.spacing(0.25)} ${theme.spacing(0.75)} 0 ${theme.spacing(0.75)}` , mb: 0.5}}>
            {dayAbbreviations.map(day => (
                <Typography key={day} variant="caption" align="center" sx={{ fontWeight: 'bold', color: theme.palette.text.secondary }}>
                    {day}
                </Typography>
            ))}
        </Box>
    );

    return (
        <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexShrink: 0 }}>
                <Button startIcon={<ArrowBackIcon />} onClick={onBack} variant="outlined">Back to Journal</Button>
                <Box>
                    <Button onClick={() => setInsightsViewMode("Informative")} variant={insightsViewMode === 'Informative' ? 'contained' : 'outlined'} startIcon={<InfoIcon />} sx={{ mr: 1 }}>Informative</Button>
                    <Button onClick={() => setInsightsViewMode("Visual")} variant={insightsViewMode === 'Visual' ? 'contained' : 'outlined'} startIcon={<VisibilityIcon />}>Visual</Button>
                </Box>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, width: '100%', flexGrow: 1, overflow: 'hidden' }}>
                <Paper sx={{ p: 1, flex: { xs: '1 1 auto', md: '2 1 0%' }, minWidth: 0, borderRadius: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {insightsViewMode === "Informative" ? (
                        entries.length > 0 ? (
                            <Box sx={{...scrollbarStyles(theme), height: '100%'}}>
                                <Box sx={{ p: theme.spacing(1.5) }}>
                                    {entries.map(entry => {
                                        const rawEmotion = extractEmotionFromContent(entry.content);
                                        const cardEmotionColor = rawEmotion ? getEmotionColor(rawEmotion, theme) : theme.palette.text.disabled;
                                        let cardDisplayText = rawEmotion;
                                        if (rawEmotion?.toLowerCase() === 'anger' || rawEmotion?.toLowerCase() === 'angry') cardDisplayText = 'Anger';
                                        
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
                                                    '&:last-child': { mb: 0 },
                                                }}
                                            >
                                                <CardActionArea onClick={() => setSelectedInsightEntry(entry)} sx={{ flexGrow: 1 }}>
                                                    <CardContent sx={{ p: 2, display: 'flex', flexDirection: 'column', flexGrow: 1, height: '100%' }}>
                                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                                                            <Typography
                                                                variant="subtitle1"
                                                                color="text.secondary"
                                                                sx={{ fontSize: theme.typography.pxToRem(18), fontWeight: 'bold' }}
                                                            >
                                                                {formatDate(entry.date)}
                                                            </Typography>
                                                            {cardDisplayText && (
                                                                <Box sx={{
                                                                    bgcolor: cardEmotionColor,
                                                                    color: theme.palette.getContrastText(cardEmotionColor),
                                                                    py: theme.spacing(0.75), 
                                                                    px: theme.spacing(2),   
                                                                    borderRadius: '8px', 
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    minWidth: '80px', 
                                                                }}>
                                                                    <Typography
                                                                        variant="body2" 
                                                                        sx={{ fontWeight: 'bold', textTransform: 'capitalize', lineHeight: '1.3' }}
                                                                    >
                                                                        {cardDisplayText}
                                                                    </Typography>
                                                                </Box>
                                                            )}
                                                        </Box>

                                                        <Typography
                                                            variant="body1"
                                                            sx={{
                                                                fontSize: theme.typography.pxToRem(17),
                                                                lineHeight: 1.6, 
                                                                display: '-webkit-box',
                                                                WebkitLineClamp: 5, 
                                                                WebkitBoxOrient: 'vertical',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                minHeight: '8em', 
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
                        ) : <Typography sx={{ textAlign: 'center', mt: 3 }}>No journal entries to display.</Typography>
                    ) : ( 
                        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
                            <Box sx={{ 
                                p: 1, 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center', 
                                flexWrap: 'wrap', 
                                borderBottom: `1px solid ${theme.palette.divider}`, 
                                mb: 1, 
                                flexShrink: 0 
                            }}>
                                <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', color: theme.palette.text.primary }}>
                                    {calendarGranularity === "month" 
                                        ? `${monthNames[currentDisplayMonth]} ${currentDisplayYear}`
                                        : `${currentDisplayYear}`
                                    }
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                    <FormControlLabel control={<Switch checked={calendarGranularity === "year"} onChange={(e) => setCalendarGranularity(e.target.checked ? "year" : "month")} />} label={calendarGranularity === "year" ? "Year View" : "Month View"} sx={{mr:1}} />
                                    {calendarGranularity === "month" && ( /* Month dropdown first */
                                        <FormControl size="small" sx={{ minWidth: 130 }}>
                                            <InputLabel id="month-select-label">Month</InputLabel>
                                            <Select labelId="month-select-label" value={currentDisplayMonth} label="Month" onChange={(e) => setCurrentDisplayMonth(parseInt(e.target.value))} MenuProps={{ PaperProps: { sx: { maxHeight: 200 } } }}>
                                                {monthNames.map((name, index) => <MenuItem key={index} value={index}>{name}</MenuItem>)}
                                            </Select>
                                        </FormControl>
                                    )}
                                    <FormControl size="small" sx={{ minWidth: 100 }}>
                                        <InputLabel id="year-select-label">Year</InputLabel>
                                        <Select labelId="year-select-label" value={currentDisplayYear} label="Year" onChange={(e) => setCurrentDisplayYear(parseInt(e.target.value))} MenuProps={{ PaperProps: { sx: { maxHeight: 200 } } }}>
                                            {availableYears.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                                        </Select>
                                    </FormControl>
                                </Box>
                            </Box>

                            <Box sx={{ flexGrow: 1, ...scrollbarStyles(theme), p: `${theme.spacing(0.25)} ${theme.spacing(0.75)} ${theme.spacing(0.75)} ${theme.spacing(0.75)}` }}>
                                {calendarGranularity === "month" && (
                                    <>
                                        {renderDayHeaders()}
                                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: theme.spacing(0.75), alignContent: 'flex-start' }}>
                                            {(() => {
                                                const daysInMonth = getDaysInMonth(currentDisplayYear, currentDisplayMonth);
                                                const firstDayOffset = getFirstDayOfMonth(currentDisplayYear, currentDisplayMonth);
                                                const cells = [];
                                                for (let i = 0; i < firstDayOffset; i++) {
                                                    cells.push(<Box key={`empty-start-${i}`} sx={{ aspectRatio: '1 / 1', borderRadius: '4px', bgcolor: alpha(theme.palette.action.disabledBackground, 0.15) }} />);
                                                }
                                                for (let day = 1; day <= daysInMonth; day++) {
                                                    const dateStr = `${currentDisplayYear}-${String(currentDisplayMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                                    cells.push(renderDayCell(dateStr, day, entriesByDate.get(dateStr)));
                                                }
                                                return cells;
                                            })()}
                                        </Box>
                                    </>
                                )}

                                {calendarGranularity === "year" && (
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        {monthNames.map((monthName, monthIndex) => (
                                            <Box key={monthIndex} sx={{mb: 1}}>
                                                <Typography variant="h6" component="div" sx={{ textAlign: 'center', mb: 0.5, fontWeight:'medium', color: theme.palette.text.primary }}>
                                                    {monthName} {currentDisplayYear}
                                                </Typography>
                                                {renderDayHeaders()}
                                                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: theme.spacing(0.75), alignContent: 'flex-start' }}>
                                                    {(() => {
                                                        const daysInMonth = getDaysInMonth(currentDisplayYear, monthIndex);
                                                        const firstDayOffset = getFirstDayOfMonth(currentDisplayYear, monthIndex);
                                                        const cells = [];
                                                        for (let i = 0; i < firstDayOffset; i++) {
                                                            cells.push(<Box key={`empty-${monthIndex}-${i}`} sx={{ aspectRatio: '1 / 1', borderRadius: '4px', bgcolor: alpha(theme.palette.action.disabledBackground, 0.15) }} />);
                                                        }
                                                        for (let day = 1; day <= daysInMonth; day++) {
                                                            const dateStr = `${currentDisplayYear}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                                            cells.push(renderDayCell(dateStr, day, entriesByDate.get(dateStr)));
                                                        }
                                                        return cells;
                                                    })()}
                                                </Box>
                                            </Box>
                                        ))}
                                    </Box>
                                )}
                            </Box>
                        </Box>
                    )}
                </Paper>
                <Paper sx={{ 
                    p: 1, 
                    flex: { xs: '1 1 auto', md: '1 1 0%' }, 
                    minWidth: 0, 
                    borderRadius: '16px', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    borderLeft: { md: `1px solid ${theme.palette.divider}` },
                }}>
                    <Box sx={{flexShrink: 0, ...scrollbarStyles(theme) }}> 
                        <EmotionSummaryList />
                    </Box>
                    <Divider sx={{ my: 1, flexShrink: 0 }} />
                    <Box sx={{ 
                        flexGrow: 1, 
                        display: 'flex',      
                        flexDirection: 'column', 
                        justifyContent: 'flex-end', 
                        pt: theme.spacing(1.5), 
                        pr: theme.spacing(1.5), 
                        pb: theme.spacing(1.5), 
                        pl: theme.spacing(1),   // Adjusted Left padding for centering
                        ...scrollbarStyles(theme),
                    }}>
                        {selectedInsightEntry ? (
                            <Paper variant="outlined" sx={{ p: 2, borderRadius: '8px', position: 'relative' }}>
                                <IconButton
                                    aria-label="close"
                                    onClick={() => setSelectedInsightEntry(null)}
                                    sx={{ position: 'absolute', right: 8, top: 8, color: (theme) => theme.palette.grey[500] }}
                                >
                                    <CloseIcon />
                                </IconButton>
                                <Typography variant="h6" gutterBottom sx={{fontWeight: 'bold'}}>
                                    {formatDate(selectedInsightEntry.date)}
                                </Typography>
                                {(() => {
                                    const rawEmotion = extractEmotionFromContent(selectedInsightEntry.content);
                                    const emotionColor = rawEmotion ? getEmotionColor(rawEmotion, theme) : theme.palette.text.disabled;
                                    let displayText = rawEmotion;
                                    if (rawEmotion?.toLowerCase() === 'anger' || rawEmotion?.toLowerCase() === 'angry') displayText = 'Anger';
                                    return displayText ? (
                                        <Box sx={{ 
                                            bgcolor: emotionColor, 
                                            color: theme.palette.getContrastText(emotionColor),
                                            py: 0.5, px: 1.5, borderRadius: '8px', display: 'inline-block', mb: 2 
                                        }}>
                                            <Typography variant="body1" sx={{ fontWeight: 'bold', textTransform: 'capitalize' }}>
                                                {displayText}
                                            </Typography>
                                        </Box>
                                    ) : null;
                                })()}
                                <Typography 
                                    sx={{ 
                                        fontSize: theme.typography.pxToRem(17), 
                                        lineHeight: 1.6,
                                        whiteSpace: 'pre-wrap', 
                                        wordBreak: 'break-word', 
                                        mb: 2, 
                                        display: '-webkit-box',
                                        WebkitLineClamp: 5, 
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        minHeight: '8em', 
                                    }}
                                >
                                    {getMainContent(selectedInsightEntry.content)}
                                </Typography>
                                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 'auto' }}>
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        startIcon={<ArticleIcon />}
                                        onClick={() => {
                                            if (handleEntrySelect) handleEntrySelect(selectedInsightEntry);
                                            setSelectedInsightEntry(null); 
                                        }}
                                    >
                                        View Entry
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        startIcon={<AutoAwesomeIcon />}
                                        onClick={() => console.log("Talk to Assistant for:", selectedInsightEntry.date)} // This button functionality is NOT to be changed
                                    >
                                        Talk to Assistant
                                    </Button>
                                </Box>
                            </Paper>
                        ) : (
                            <Typography sx={{ textAlign: 'center', color: 'text.secondary' }}>
                                No Entry Selected
                            </Typography>
                        )}
                    </Box>
                </Paper>
            </Box>
        </>
    );
}

// Updated AssistantPage Component
function AssistantPage({ theme, setStatus, onBack }) {
    const [messages, setMessages] = useState([]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false); // For sending message
    const messagesEndRef = useRef(null);

    const [chatSessions, setChatSessions] = useState([]);
    const [currentSessionId, setCurrentSessionId] = useState(null); // null means new chat
    const [isLoadingSessions, setIsLoadingSessions] = useState(true);
    const [isLoadingChatMessages, setIsLoadingChatMessages] = useState(false);

    const [menuAnchorEl, setMenuAnchorEl] = useState(null);
    const [openedMenuSessionId, setOpenedMenuSessionId] = useState(null);

    // State for delete chat confirmation dialog
    const [deleteChatConfirmOpen, setDeleteChatConfirmOpen] = useState(false);
    const [chatSessionToDeleteId, setChatSessionToDeleteId] = useState(null);


    const handleMenuOpen = (event, sessionId) => {
        setMenuAnchorEl(event.currentTarget);
        setOpenedMenuSessionId(sessionId);
    };

    const handleMenuClose = () => {
        setMenuAnchorEl(null);
        setOpenedMenuSessionId(null);
    };

    // Opens the delete chat confirmation dialog
    const handleDeleteChatClick = (sessionId) => {
        if (!sessionId) {
            setStatus({ message: "Cannot delete: Invalid chat session.", severity: "error" });
            return;
        }
        setChatSessionToDeleteId(sessionId);
        setDeleteChatConfirmOpen(true);
        handleMenuClose(); // Close the three-dot menu
    };

    // Closes the delete chat confirmation dialog
    const handleCloseDeleteChatConfirm = () => {
        setDeleteChatConfirmOpen(false);
        setChatSessionToDeleteId(null);
    };

    // Placeholder for actual delete logic
    const handleConfirmDeleteChat = async () => {
        if (!chatSessionToDeleteId) {
            setStatus({ message: "Cannot delete: No chat session selected.", severity: "error" });
            handleCloseDeleteChatConfirm();
            return;
        }
        // Backend delete logic will go here in the future
        console.log(`Attempting to delete chat session: ${chatSessionToDeleteId} (Backend not implemented)`);
        setStatus({ message: `Delete for chat ${chatSessionToDeleteId} initiated (simulated).`, severity: "info" });
        
        // For now, just close the dialog. Later, you might want to refresh the chat list.
        handleCloseDeleteChatConfirm();
    };


    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    const fetchChatSessions = async (selectLatest = false) => {
        setIsLoadingSessions(true);
        try {
            const sessions = await invoke("load_chat_sessions");
            setChatSessions(sessions || []);
            if (selectLatest) { 
                if (sessions && sessions.length > 0) {
                    setCurrentSessionId(sessions[0].id); 
                } else {
                    setCurrentSessionId(null); 
                }
            }
        } catch (error) {
            console.error("Failed to load chat sessions:", error);
            setStatus({ message: `Failed to load chat history: ${error.message || String(error)}`, severity: "error" });
            setChatSessions([]); 
        } finally {
            setIsLoadingSessions(false);
        }
    };

    const fetchMessagesForSession = async (sessionId) => {
        if (!sessionId) { 
            setMessages([{ id: `new-chat-${Date.now()}`, sender: 'assistant', text: "Starting a new chat. What's on your mind?" }]);
            setIsLoadingChatMessages(false);
            setUserInput(''); 
            return;
        }
        setIsLoadingChatMessages(true);
        try {
            const loadedMessages = await invoke("load_messages_for_session_cmd", { sessionId });
            const formatted = loadedMessages.map(msg => ({
                id: msg.id, 
                sender: msg.sender,
                text: msg.content, 
                timestamp: msg.timestamp,
            }));
            setMessages(formatted.length > 0 ? formatted : [{id: `empty-${sessionId}-${Date.now()}`, sender: 'assistant', text: "This chat is empty. Send a message to start!"}]);
        } catch (error) {
            console.error(`Failed to load messages for session ${sessionId}:`, error);
            setStatus({ message: `Failed to load messages: ${error.message || String(error)}`, severity: "error" });
            setMessages([{id: `error-${Date.now()}`, sender: 'assistant', text: "Could not load chat messages."}]);
        } finally {
            setIsLoadingChatMessages(false);
        }
    };
    
    useEffect(() => {
        fetchChatSessions(false); 
        setCurrentSessionId(null); 
    }, []); 

    useEffect(() => {
        fetchMessagesForSession(currentSessionId);
    }, [currentSessionId]);


    const handleSendMessage = async () => {
        const trimmedInput = userInput.trim();
        if (!trimmedInput) return;

        const sessionIdAtTimeOfSend = currentSessionId; 

        const optimisticUserMessage = { id: `temp-user-${Date.now()}`, sender: 'user', text: trimmedInput, timestamp: new Date().toISOString() };
        setMessages(prevMessages => {
            if (prevMessages.length === 1 && prevMessages[0].text.startsWith("Starting a new chat")) {
                return [optimisticUserMessage];
            }
            return [...prevMessages, optimisticUserMessage];
        });
        
        setUserInput('');
        setIsLoading(true); 
        setStatus({ message: "Assistant is thinking...", severity: "info" });

        try {
            const response = await invoke("chat_with_moodjourney_cmd", { 
                userMessage: trimmedInput,
                sessionIdOption: sessionIdAtTimeOfSend 
            });

            if (sessionIdAtTimeOfSend !== currentSessionId) {
                console.log("Session changed while message was in flight. UI update for old session's response is skipped.");
                return; 
            }
            
            const newAssistantMessage = { 
                id: `assistant-${response.session_id || 'new'}-${Date.now()}-${Math.random().toString(36).substring(7)}`, 
                sender: 'assistant', 
                text: response.assistant_response,
                timestamp: new Date().toISOString() 
            };
            
            if (!sessionIdAtTimeOfSend) { 
                setCurrentSessionId(response.session_id);
                await fetchChatSessions(); 
            } else { 
                setMessages(prevMessages => [...prevMessages, newAssistantMessage]);
                await fetchChatSessions();
            }
            setStatus({ message: "Response received.", severity: "success" });

        } catch (error) {
            console.error("Error calling chat_with_moodjourney_cmd:", error);

            if (sessionIdAtTimeOfSend !== currentSessionId) {
                console.log("Session changed while message (which errored) was in flight. Error UI update for old session is skipped.");
                return; 
            }
            
            setMessages(prevMessages => prevMessages.filter(msg => msg.id !== optimisticUserMessage.id));
            
            const errorMessageText = `Sorry, I encountered an error. Please try again.`;
            const errorMessage = { id: `error-msg-${Date.now()}`, sender: 'assistant', text: errorMessageText, timestamp: new Date().toISOString() };
            setMessages(prevMessages => [...prevMessages, errorMessage]); 
            setStatus({ message: `Error getting response: ${error.message || String(error)}`, severity: "error" });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleNewChatClick = () => {
        setCurrentSessionId(null); 
    };

    const handleSessionSelect = (sessionId) => {
        if (sessionId === currentSessionId) return; 
        setCurrentSessionId(sessionId);
    };

    return (
        <> 
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexShrink: 0 }}>
                <Button startIcon={<ArrowBackIcon />} onClick={onBack} variant="outlined">Back to Journal</Button>
                <Button startIcon={<AddIcon />} onClick={handleNewChatClick} variant="outlined">New Chat</Button>
            </Box>
            <Box sx={{ 
                display: 'flex', 
                flexDirection: { xs: 'column', md: 'row' }, 
                gap: 2, 
                width: '100%', 
                flexGrow: 1, 
                overflow: 'hidden' 
            }}>
                {/* Chat Interface Container (2/3 box) - Now a Paper component */}
                <Paper sx={{ 
                    p: 1, // Outer padding for the Paper itself
                    flex: { xs: '1 1 auto', md: '2 1 0%' }, 
                    minWidth: 0, 
                    borderRadius: '16px', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    overflow: 'hidden', // Important for scrollbar behavior of children
                    position: 'relative' // For the loading overlay
                }}>
                    {isLoadingChatMessages && (
                        <Box sx={{position:'absolute', top:0,left:0,right:0,bottom:0,display:'flex',justifyContent:'center',alignItems:'center',bgcolor:alpha(theme.palette.background.paper,0.7),zIndex:10, borderRadius: '16px'}}>
                            <CircularProgress />
                        </Box>
                    )}
                    {/* Message list area */}
                    <Box sx={{ flexGrow: 1, ...scrollbarStyles(theme), p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {messages.map((msg) => (
                            <Box
                                key={msg.id} 
                                sx={{
                                    alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                                    maxWidth: '75%',
                                }}
                            >
                                <Paper
                                    elevation={1}
                                    sx={{
                                        p: 1.5,
                                        borderRadius: '12px',
                                        bgcolor: msg.sender === 'user' ? alpha(theme.palette.primary.main, 0.2) : alpha(theme.palette.secondary.main, 0.2),
                                        color: theme.palette.text.primary,
                                        border: `1px solid ${msg.sender === 'user' ? theme.palette.primary.main : theme.palette.secondary.main}`,
                                    }}
                                >
                                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.text}</Typography>
                                </Paper>
                            </Box>
                        ))}
                        {isLoading && messages.length > 0 && messages[messages.length-1].sender === 'user' && ( 
                            <Box sx={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Paper elevation={1} sx={{ p: 1.5, borderRadius: '12px', bgcolor: alpha(theme.palette.secondary.main, 0.2), color: theme.palette.text.primary, border: `1px solid ${theme.palette.secondary.main}` }}>
                                    <CircularProgress size={20} color="inherit" sx={{color: theme.palette.text.primary}} />
                                    <Typography variant="body2" sx={{ml:1, display: 'inline', color: theme.palette.text.primary}}>Assistant is typing...</Typography>
                                </Paper>
                            </Box>
                        )}
                        <div ref={messagesEndRef} />
                    </Box>
                    {/* Input area */}
                    <Box sx={{ p: 2, borderTop: `1px solid ${theme.palette.divider}`, display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                        <TextField
                            fullWidth
                            variant="filled"
                            placeholder="Type your message..."
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            onKeyPress={(e) => { if (e.key === 'Enter' && !e.shiftKey && !isLoading) { e.preventDefault(); handleSendMessage(); } }}
                            disabled={isLoading || isLoadingChatMessages}
                            multiline
                            maxRows={3} 
                            sx={{ '& .MuiFilledInput-root': { borderRadius: '8px' } }}
                        />
                        <IconButton color="primary" onClick={handleSendMessage} disabled={isLoading || isLoadingChatMessages || !userInput.trim()}>
                            {isLoading ? <CircularProgress size={24} /> : <SendIcon />}
                        </IconButton>
                    </Box>
                    {/* Disclaimer area */}
                    <Box sx={{ pt: 1, pb: 1, px: 2, flexShrink: 0 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'left', display: 'block' }}>
                            Assistant can make mistakes. Please do not consult it for professional advice, and make sure to verify all information.
                        </Typography>
                    </Box>
                </Paper>

                {/* Chat History (1/3 box) */}
                <Paper sx={{ p: 1, flex: { xs: '1 1 auto', md: '1 1 0%' }, minWidth: 0, borderRadius: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {isLoadingSessions ? (
                        <Box sx={{display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1, pt: 2}}><CircularProgress /></Box>
                    ) : chatSessions.length === 0 ? (
                        <Typography sx={{p:2, textAlign: 'center', color: 'text.secondary', flexGrow:1, display:'flex', alignItems:'center', justifyContent:'center'}}>No chat history.</Typography>
                    ) : (
                        <List sx={{ overflowY: 'auto', flexGrow: 1, ...scrollbarStyles(theme), p:0, '& .MuiListItemButton-root': {pt:0.75, pb:0.75} }}>
                            {chatSessions.map(session => (
                                <ListItem 
                                    key={session.id} 
                                    disablePadding 
                                    sx={{px: 0.5, mb: 0.5}}
                                    secondaryAction={
                                        <IconButton edge="end" aria-label="options" onClick={(event) => handleMenuOpen(event, session.id)}>
                                            <MoreVertIcon />
                                        </IconButton>
                                    }
                                >
                                    <ListItemButton
                                        selected={session.id === currentSessionId}
                                        onClick={() => handleSessionSelect(session.id)}
                                        sx={{borderRadius: '8px', pr: openedMenuSessionId === session.id ? '48px' : 'inherit', '&.Mui-selected': {bgcolor: alpha(theme.palette.primary.main, 0.15), '&:hover': {bgcolor: alpha(theme.palette.primary.main, 0.2)} }, '&:hover': {bgcolor: alpha(theme.palette.action.hover, 0.5)}}}
                                    >
                                        <ListItemIcon sx={{minWidth: 'auto', mr: 1.5, color: session.id === currentSessionId ? theme.palette.primary.main : theme.palette.text.secondary }}>
                                            <ChatIcon fontSize="small" />
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={session.title || "Chat"}
                                            primaryTypographyProps={{ 
                                                noWrap: true, 
                                                sx: { fontWeight: session.id === currentSessionId ? 'bold' : 'normal', fontSize: '0.9rem', color: session.id === currentSessionId ? theme.palette.primary.main : theme.palette.text.primary } 
                                            }}
                                            secondary={formatChatTimestamp(session.last_modified_at)}
                                            secondaryTypographyProps={{noWrap: true, fontSize: '0.75rem'}}
                                        />
                                    </ListItemButton>
                                </ListItem>
                            ))}
                        </List>
                    )}
                </Paper>
                <Menu
                    anchorEl={menuAnchorEl}
                    open={Boolean(menuAnchorEl)}
                    onClose={handleMenuClose}
                    MenuListProps={{
                        'aria-labelledby': 'chat-options-button',
                    }}
                >
                    {/* Updated Delete Chat MenuItem */}
                    <MenuItem onClick={() => handleDeleteChatClick(openedMenuSessionId)}>
                        <ListItemIcon>
                            <DeleteIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>Delete Chat</ListItemText>
                    </MenuItem>
                </Menu>
            </Box>
            {/* Delete Chat Confirmation Dialog */}
            <Dialog
                open={deleteChatConfirmOpen}
                onClose={handleCloseDeleteChatConfirm}
                aria-labelledby="delete-chat-dialog-title"
                aria-describedby="delete-chat-dialog-description"
            >
                <DialogTitle id="delete-chat-dialog-title">{"Confirm Deletion"}</DialogTitle>
                <DialogContent>
                    <DialogContentText id="delete-chat-dialog-description">
                        Are you sure you want to delete this chat session? This action cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDeleteChatConfirm} color="inherit" variant="outlined">
                        Cancel
                    </Button>
                    <Button onClick={handleConfirmDeleteChat} color="error" variant="contained" startIcon={<DeleteIcon />} autoFocus>
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}


const baseThemeOptions = {
    typography: { fontFamily: '"Inter", Arial, sans-serif' },
    shape: { borderRadius: 12 },
    components: {
        MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { textTransform: 'none', borderRadius: 20 }, contained: { borderRadius: 20 } } },
        MuiTextField: { defaultProps: { variant: 'filled' }, styleOverrides: { root: ({ theme }) => ({ '& .MuiFilledInput-underline:before, & .MuiFilledInput-underline:after, & .MuiFilledInput-underline:hover:not(.Mui-disabled):before': { borderBottom: 'none' }, '& .MuiFilledInput-root': { backgroundColor: theme.palette.action.hover, borderRadius: '4px', '&:hover, &.Mui-focused': { backgroundColor: theme.palette.action.selected } } }) } },
        MuiPaper: { defaultProps: { elevation: 0 }, styleOverrides: { root: ({ theme }) => ({ backgroundColor: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}` }) } },
        MuiDrawer: { styleOverrides: { paper: ({ theme }) => ({ backgroundColor: theme.palette.background.paper, borderRight: `1px solid ${theme.palette.divider}` }) } },
        MuiAppBar: { defaultProps: { elevation: 0 }, styleOverrides: { root: ({ theme }) => ({ backgroundColor: theme.palette.background.paper, color: theme.palette.text.primary, borderBottom: `1px solid ${theme.palette.divider}` }) } },
        MuiAlert: { styleOverrides: { root: { borderRadius: '8px'}, standardSuccess: ({ theme }) => ({ color: theme.palette.primary.main, backgroundColor: alpha(theme.palette.primary.main, theme.palette.mode === 'light' ? 0.12 : 0.18), '& .MuiAlert-icon': { color: theme.palette.primary.main } }), standardError: ({ theme }) => ({ color: theme.palette.error.main, backgroundColor: alpha(theme.palette.error.main, theme.palette.mode === 'light' ? 0.12 : 0.18), '& .MuiAlert-icon': { color: theme.palette.error.main } }), standardWarning: ({ theme }) => ({ color: theme.palette.mode === 'light' ? theme.palette.warning.dark : theme.palette.warning.light, backgroundColor: alpha(theme.palette.warning.main, theme.palette.mode === 'light' ? 0.12 : 0.18), '& .MuiAlert-icon': { color: theme.palette.mode === 'light' ? theme.palette.warning.dark : theme.palette.warning.light } }), standardInfo: ({ theme }) => ({ color: theme.palette.info.main, backgroundColor: alpha(theme.palette.info.main, theme.palette.mode === 'light' ? 0.12 : 0.18), '& .MuiAlert-icon': { color: theme.palette.info.main } }) } },
        MuiSelect: { styleOverrides: { root: ({theme}) => ({ }) } }
    }
};
const lightTheme = createTheme({ ...baseThemeOptions, palette: { mode: 'light', primary: { main: '#23325A' }, secondary: { main: '#653666' }, background: { default: '#F3EEEB', paper: '#FFFCF9' }, text: { primary: '#23325A', secondary: alpha('#23325A', 0.7) }, action: { hover: alpha('#23325A', 0.06), selected: alpha('#23325A', 0.12) }, divider: alpha('#23325A', 0.2), warning: { main: '#FFA726', light: '#FFB74D', dark: '#F57C00' }, error: { main: '#D32F2F' }, info: {main: '#0288d1'} } });
const darkTheme = createTheme({ ...baseThemeOptions, palette: { mode: 'dark', primary: { main: '#F3EEEB' }, secondary: { main: '#DECCCA' }, background: { default: '#1A2238', paper: '#23325A' }, text: { primary: '#F3EEEB', secondary: alpha('#F3EEEB', 0.7) }, action: { hover: alpha('#F3EEEB', 0.08), selected: alpha('#F3EEEB', 0.16) }, divider: alpha('#F3EEEB', 0.12), warning: { main: '#FFB74D', light: '#FFCC80', dark: '#FFA726' }, error: { main: '#E57373' }, info: {main: '#29b6f6'} } });

function App() {
    const [themeMode, setThemeMode] = useState(() => localStorage.getItem('appThemeMode') || 'system');
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
    // State for delete confirmation dialog
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [entryToDelete, setEntryToDelete] = useState(null);


    useEffect(() => {
        const prefersDarkMQ = window.matchMedia('(prefers-color-scheme: dark)');
        const updateActiveTheme = (event) => {
            if (themeMode === 'dark') setIsDarkModeActive(true);
            else if (themeMode === 'light') setIsDarkModeActive(false);
            else setIsDarkModeActive(event ? event.matches : prefersDarkMQ.matches);
        };
        updateActiveTheme();
        if (themeMode === 'system') {
            prefersDarkMQ.addEventListener('change', updateActiveTheme);
            return () => prefersDarkMQ.removeEventListener('change', updateActiveTheme);
        }
    }, [themeMode]);

    useEffect(() => { localStorage.setItem('appThemeMode', themeMode); }, [themeMode]);
    const muiTheme = useMemo(() => (isDarkModeActive ? darkTheme : lightTheme), [isDarkModeActive]);
    const userName = "Michael";
    const isDrawerVisuallyOpen = drawerOpen || hoverOpen;
    
    const handleCloseStatus = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        setStatus({ message: "", severity: "info" });
    };

    const flashBackground = (emotion) => {
        const baseFlashColor = getEmotionColor(emotion, muiTheme);
        if (baseFlashColor !== muiTheme.palette.text.disabled) {
            setFlashColor(alpha(baseFlashColor, 0.3));
            setTimeout(() => setFlashColor(null), 1000);
        }
    };

    const getGreeting = (name) => {
        const hour = new Date().getHours();
        const timeOfDay = hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";
        return name ? `${timeOfDay}, ${name}` : timeOfDay;
    };

    const getCurrentDateString = () => {
        const date = new Date();
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };

    const refreshEntriesList = async () => {
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
    };

    useEffect(() => { refreshEntriesList(); }, []);

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
        try { generatedSuggestion = await invoke("generate_suggestion_cmd", { entryTitle: "Journal Entry", entryContent: currentEntryText }); } // Removed suggestionType
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
        try { generatedSuggestion = await invoke("generate_suggestion_cmd", { entryTitle: selectedEntry.title || "Journal Entry", entryContent: currentEditedContent }); } // Removed suggestionType
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

    // Opens the delete confirmation dialog
    const handleDeleteEntryClick = (entry) => {
        if (!entry || !entry.date) {
            setStatus({ message: "Cannot delete: Invalid entry.", severity: "error" });
            return;
        }
        setEntryToDelete(entry);
        setDeleteConfirmOpen(true);
    };

    // Closes the delete confirmation dialog
    const handleCloseDeleteConfirm = () => {
        setDeleteConfirmOpen(false);
        setEntryToDelete(null);
    };
    
    // Actually deletes the entry after confirmation
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

    const handleEntrySelect = (entry) => { setSelectedEntry(entry); setIsEditingSelectedEntry(false); setEditedContentText(""); setEntryText(""); setStatus({ message: "", severity: "info" }); setLastDetectedEmotion(""); setCurrentView('main'); };
    const handleNewEntryClick = () => { setSelectedEntry(null); setIsEditingSelectedEntry(false); setEditedContentText(""); setEntryText(""); setStatus({ message: "", severity: "info" }); setLastDetectedEmotion(""); setCurrentView('main'); setShowAllEntriesInDrawer(false); };
    const handleSettingsClick = () => { setCurrentView('settings'); setSelectedEntry(null); setIsEditingSelectedEntry(false); setStatus({ message: "", severity: "info" }); setLastDetectedEmotion(""); };
    const handleInsightsClick = () => { setCurrentView('insights'); setSelectedEntry(null); setIsEditingSelectedEntry(false); setStatus({ message: "", severity: "info" }); setLastDetectedEmotion(""); };
    const handleAssistantClick = () => { 
        setCurrentView('assistant'); 
        setSelectedEntry(null); 
        setIsEditingSelectedEntry(false); 
        setStatus({ message: "", severity: "info" }); 
        setLastDetectedEmotion(""); 
    };
    const handleThemeModeChange = (newMode) => setThemeMode(newMode);
    const handleToggleShowEntries = () => setShowAllEntriesInDrawer(prev => !prev);

    const drawerContent = (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
                {drawerOpen && <Toolbar sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', px: [1] }}><IconButton onClick={handleDrawerClose} color="inherit">{muiTheme.direction === 'rtl' ? <ChevronRightIcon /> : <ChevronLeftIcon />}</IconButton></Toolbar>}
                {!drawerOpen && <Toolbar sx={{ minHeight: { xs: 56, sm: 64 } }} />}
                <Box sx={{ p: 1, mt: 2, mb: 1, overflow: 'hidden' }}><Button variant="contained" startIcon={<AddIcon />} fullWidth onClick={handleNewEntryClick} sx={{ justifyContent: isDrawerVisuallyOpen ? 'flex-start' : 'center', borderRadius: '16px', padding: '8px', minWidth: 0, '& .MuiButton-startIcon': { m: isDrawerVisuallyOpen ? '0 8px 0 -4px' : '0' } }}>{isDrawerVisuallyOpen && 'New Entry'}</Button></Box>
                {isDrawerVisuallyOpen && (loading || entries.length > 0) && <Divider sx={{mb:1}}/>}
                {isDrawerVisuallyOpen && entries.length > 0 && <Typography variant="subtitle1" sx={{ p: 2, pt:0, pb:0, color: 'text.primary', fontWeight: 'bold' }}>Recent</Typography>}
                <List sx={{ pt: 0 }}>
                    {loading && isDrawerVisuallyOpen && <ListItem sx={{ justifyContent: 'center' }}><CircularProgress size={24} /></ListItem>}
                    {!loading && entries.length === 0 && isDrawerVisuallyOpen && <ListItem disablePadding><ListItemButton sx={{ minHeight: 48, justifyContent: 'initial', px: 2.5 }}><ListItemIcon sx={{ minWidth: 0, mr: 3, justifyContent: 'center' }}><ArticleIcon /></ListItemIcon><ListItemText primary="No entries" /></ListItemButton></ListItem>}
                    {!loading && isDrawerVisuallyOpen && entries.slice(0, showAllEntriesInDrawer ? entries.length : INITIAL_VISIBLE_ENTRIES).map((entry) => (<ListItem key={entry.date} disablePadding><ListItemButton selected={selectedEntry?.date === entry.date && currentView === 'main' && !isEditingSelectedEntry} onClick={() => handleEntrySelect(entry)} sx={{ minHeight: 48, justifyContent: 'initial', px: 2.5, '&.Mui-selected': { bgcolor: 'action.selected', '&:hover': { bgcolor: 'action.hover' } } }}><ListItemIcon sx={{ minWidth: 0, mr: 3, justifyContent: 'center' }}><ArticleIcon /></ListItemIcon><ListItemText primary={formatDate(entry.date)} /></ListItemButton></ListItem>))}
                </List>
                {isDrawerVisuallyOpen && !loading && entries.length > INITIAL_VISIBLE_ENTRIES && <Box sx={{ p: 1, display: 'flex', justifyContent: 'center' }}><Button onClick={handleToggleShowEntries} variant="text" size="small" endIcon={showAllEntriesInDrawer ? <ExpandLessIcon /> : <ExpandMoreIcon/>} sx={{ textTransform: 'none', color: 'text.secondary' }}>{showAllEntriesInDrawer ? 'Show Less' : `Show ${entries.length - INITIAL_VISIBLE_ENTRIES} More`}</Button></Box>}
            </Box>
            <Box sx={{ marginTop: 'auto', flexShrink: 0 }}><Divider />
                <List>
                    {[
                        { text: 'Assistant', icon: <AutoAwesomeIcon />, handler: handleAssistantClick, view: 'assistant' }, 
                        { text: 'Insights', icon: <ShowChartIcon />, handler: handleInsightsClick, view: 'insights' },
                        { text: 'Settings', icon: <SettingsIcon />, handler: handleSettingsClick, view: 'settings' }
                    ].map((item) => (
                        <ListItem key={item.text} disablePadding>
                            <ListItemButton 
                                onClick={item.handler} 
                                title={item.text} 
                                selected={currentView === item.view} 
                                sx={{ 
                                    minHeight: 48, 
                                    justifyContent: isDrawerVisuallyOpen ? 'initial' : 'center', 
                                    px: 2.5, 
                                    '&.Mui-selected': { bgcolor: 'action.selected', '&:hover': { bgcolor: 'action.hover' }} 
                                }}
                            >
                                <ListItemIcon sx={{ minWidth: 0, mr: isDrawerVisuallyOpen ? 3 : 'auto', justifyContent: 'center' }}>{item.icon}</ListItemIcon>
                                {isDrawerVisuallyOpen && <ListItemText primary={item.text} />}
                            </ListItemButton>
                        </ListItem>
                    ))}
                </List>
            </Box>
        </Box>
    );

    return (
        <ThemeProvider theme={muiTheme}>
            <CssBaseline />
            <Box sx={{ display: 'flex', height: '100vh', bgcolor: flashColor || muiTheme.palette.background.default, transition: 'background-color 0.5s ease' }}>
                <AppBar position="fixed" isPinnedOpen={drawerOpen}>
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
                </AppBar>
                <Drawer variant="permanent" open={isDrawerVisuallyOpen} onMouseEnter={handleDrawerHoverOpen} onMouseLeave={handleDrawerHoverClose}>{drawerContent}</Drawer>
                
                <Box component="main" sx={{ flexGrow: 1, p: 3, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', height: '100%', overflow: 'hidden' }}>
                    <Toolbar /> 
                    
                    {currentView === 'settings' ? <CombinedSettingsPage currentThemeMode={themeMode} onThemeModeChange={handleThemeModeChange} onBack={handleNewEntryClick} />
                    : currentView === 'insights' ? <InsightsPage entries={entries} theme={muiTheme} onBack={handleNewEntryClick} handleEntrySelect={handleEntrySelect} />
                    : currentView === 'assistant' ? <AssistantPage theme={muiTheme} setStatus={setStatus} onBack={handleNewEntryClick} /> 
                    : selectedEntry && currentView === 'main' ? (
                        <><Box sx={{ mb: 2, alignSelf: 'flex-start', flexShrink: 0 }}><Button startIcon={<ArrowBackIcon />} onClick={handleNewEntryClick} variant="outlined">Back to Journal</Button></Box>
                        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, width: '100%', flexGrow: 1, overflow: 'hidden' }}>
                            <Paper sx={{ p: 1, flex: { xs: '1 1 auto', md: '2 1 0%' }, minWidth: 0, borderRadius: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                {isEditingSelectedEntry ? (<Box sx={{...scrollbarStyles(muiTheme), height: '100%'}}><Box sx={{ p: muiTheme.spacing(1.5), pr: muiTheme.spacing(1), height: '100%', display: 'flex', flexDirection: 'column' }}><TextField value={editedContentText} onChange={(e) => setEditedContentText(e.target.value)} multiline rows={10} fullWidth variant="outlined" sx={{ fontSize: '1.125rem', flexGrow: 1, '& .MuiOutlinedInput-root': { borderRadius: '8px', height: '100%', '& .MuiOutlinedInput-input': { height: '100% !important', overflowY: 'auto !important' } }, pt: muiTheme.spacing(1), mb: 2 }} placeholder="Edit your thoughts here..." /><Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 'auto', pt: 2, flexShrink: 0 }}><Button variant="outlined" color="inherit" startIcon={<CancelIcon />} onClick={handleCancelEditSelectedEntry} disabled={saving}>Cancel</Button><Button variant="contained" color="primary" startIcon={<SaveIcon />} onClick={handleConfirmUpdateSelectedEntry} disabled={saving || !editedContentText.trim()}>Save Changes</Button></Box></Box></Box>)
                                : (<Box sx={{...scrollbarStyles(muiTheme), height: '100%'}}><Box sx={{p: muiTheme.spacing(1.5), pr: muiTheme.spacing(1) }}><Typography variant="body1" sx={{ fontSize: '1.125rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word', mb: 2, pt: muiTheme.spacing(1) }}>{getMainContent(selectedEntry.content)}</Typography></Box></Box>)}
                                {/* Updated Delete Button to call handleDeleteEntryClick */}
                                {!isEditingSelectedEntry && <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 'auto', pt: 2, flexShrink: 0, pl: muiTheme.spacing(1), pr: muiTheme.spacing(1), pb: muiTheme.spacing(1) }}><Button variant="outlined" startIcon={<EditIcon />} onClick={handleStartEditSelectedEntry} disabled={saving}>Edit Entry</Button><Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={() => handleDeleteEntryClick(selectedEntry)} disabled={saving}>Delete Entry</Button></Box>}
                            </Paper>
                            {selectedEntry && (
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
                                    {!isEditingSelectedEntry && (
                                        <Box sx={{...scrollbarStyles(muiTheme), height: '100%', display: 'flex', flexDirection: 'column', p: 1.5, gap: 2 }}>
                                            <Box sx={{ flexShrink: 0 }}>
                                                <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 0.5, textAlign:'center' }}>
                                                    Emotion
                                                </Typography>
                                                <Paper elevation={0} sx={{
                                                    p: 1.5,
                                                    bgcolor: alpha(getEmotionColor(extractEmotionFromContent(selectedEntry.content), muiTheme), 0.15),
                                                    borderRadius: '8px', 
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                }}>
                                                    <Typography variant="h6" sx={{ 
                                                        color: getEmotionColor(extractEmotionFromContent(selectedEntry.content), muiTheme), 
                                                        fontWeight: 'bold', 
                                                        textTransform: 'capitalize' 
                                                    }}>
                                                        {extractEmotionFromContent(selectedEntry.content) || "N/A"}
                                                    </Typography>
                                                </Paper>
                                            </Box>
                                            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                                                <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 0.5, textAlign:'center' }}>
                                                    Feedback
                                                </Typography>
                                                <Paper variant="outlined" sx={{ 
                                                    p: 1.5, 
                                                    borderRadius: '8px', 
                                                    flexGrow: 1, 
                                                    overflow: 'hidden', 
                                                    display: 'flex', 
                                                    flexDirection: 'column' 
                                                }}>
                                                    <Box sx={{...scrollbarStyles(muiTheme), flexGrow: 1 }}>
                                                        <Typography variant="body1" sx={{ 
                                                            fontSize: '1.125rem', 
                                                            whiteSpace: 'pre-wrap', 
                                                            wordBreak: 'break-word',
                                                            color: 'text.primary' 
                                                        }}>
                                                            {extractSuggestionFromContent(selectedEntry.content) || "No suggestion available for this entry."}
                                                        </Typography>
                                                    </Box>
                                                </Paper>
                                            </Box>
                                        </Box>
                                    )}
                                </Paper>
                            )}
                        </Box></>
                    ) : (
                        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', width: '100%'}}>
                            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', overflowY: 'auto' }}>
                                <Typography variant="h4" color="text.secondary" sx={{ fontWeight: 'bold', mb: 3 }}>{getGreeting(userName)}</Typography>
                            </Box>
                            <Box sx={{ width: '100%', maxWidth: '800px', mx: 'auto', mb: 2, flexShrink: 0 }}>
                                <Paper sx={{ p: 2, borderRadius: '16px', display: 'flex', flexDirection: 'column' }}>
                                    <TextField id="journal-entry-input" placeholder="Write your thoughts here..." multiline minRows={4} value={entryText} onChange={(e) => setEntryText(e.target.value)} variant="standard" fullWidth InputProps={{ disableUnderline: true }} sx={{ flexGrow: 1, mb: 1, fontSize: '1.125rem', p: 1, borderRadius: '4px' }} />
                                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                                        {entryText.trim() === "" ? <IconButton color="primary" onClick={handleStartDictation} disabled={isDictating} size="large" aria-label="start dictation">{isDictating ? <CircularProgress size={24} color="inherit" /> : <MicIcon />}</IconButton>
                                        : <IconButton color="primary" onClick={handleSaveEntry} disabled={saving || !entryText.trim()} size="large" aria-label="save entry">{saving ? <CircularProgress size={24} color="inherit" /> : <SendIcon />}</IconButton>}
                                    </Box>
                                </Paper>
                            </Box>
                        </Box>
                    )}
                </Box>

                {/* Delete Entry Confirmation Dialog */}
                <Dialog
                    open={deleteConfirmOpen}
                    onClose={handleCloseDeleteConfirm}
                    aria-labelledby="alert-dialog-title"
                    aria-describedby="alert-dialog-description"
                >
                    <DialogTitle id="alert-dialog-title">{"Confirm Deletion"}</DialogTitle>
                    <DialogContent>
                        <DialogContentText id="alert-dialog-description">
                            Are you sure you want to delete this journal entry? This action cannot be undone.
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseDeleteConfirm} color="inherit" variant="outlined">
                            Cancel
                        </Button>
                        <Button onClick={handleConfirmDeleteEntry} color="error" variant="contained" startIcon={<DeleteIcon />} autoFocus>
                            Delete
                        </Button>
                    </DialogActions>
                </Dialog>

                <Snackbar
                    open={status.message && status.severity !== "info"} 
                    autoHideDuration={ALERT_TIMEOUT_DURATION}
                    onClose={handleCloseStatus}
                    anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
                    sx={{ mt: {xs: 7, sm: 8} }} 
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
