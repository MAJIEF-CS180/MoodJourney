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

const drawerWidth = 240;
const miniDrawerWidth = 65;

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
                        borderRadius: '4px 4px 0 0',
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

function App() {
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

    const theme = useMemo(() => (darkMode ? darkTheme : lightTheme), [darkMode]);

    const userName = "Michael";
    const isDrawerVisuallyOpen = drawerOpen || hoverOpen;

    const formatDate = (dateString) => {
        const date = new Date(dateString + 'T00:00:00');
        return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    };

    const getGreeting = (name) => {
        const hour = new Date().getHours();
        const timeOfDay = hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";
        return name ? `${timeOfDay}, ${name}` : timeOfDay;
    };

    const getCurrentDateString = () => new Date().toISOString().split('T')[0];

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

    const handleSaveEntry = async () => {
        if (!entryText.trim()) {
            setStatus({ message: "Entry cannot be empty.", severity: "warning" });
            return;
        }
        setSaving(true);
        setStatus({ message: "", severity: "info" });

        const currentDate = getCurrentDateString();
        const existingEntry = entries.find(entry => entry.date === currentDate);
        const operation = existingEntry ? "update_entry" : "create_entry";
        const payload = existingEntry
            ? { date: currentDate, new_title: existingEntry.title, new_content: entryText, new_password: existingEntry.password }
            : { title: "Journal Entry", content: entryText, password: null, date: currentDate };

        try {
            await invoke(operation, payload);
            if (operation === "create_entry") {
                setStatus({ message: "Entry saved successfully!", severity: "success" });
            } else {
                setStatus({ message: "Entry updated successfully!", severity: "success" });
            }
            setEntryText("");
            await fetchEntries();

            const updatedEntriesList = await invoke("read_entries");
            const currentEntryAfterSave = updatedEntriesList.find(entry => entry.date === currentDate);
            setSelectedEntry(currentEntryAfterSave || null);

        } catch (err) {
            console.error(`Error ${operation === "create_entry" ? 'saving' : 'updating'} entry:`, err);
            setStatus({ message: `Failed to ${operation === "create_entry" ? 'save' : 'update'} entry: ${err.message || String(err)}`, severity: "error" });
        } finally {
            setSaving(false);
        }
    };

    const handleDrawerOpen = () => setDrawerOpen(true);
    const handleDrawerClose = () => setDrawerOpen(false);
    const handleDrawerHoverOpen = () => !drawerOpen && setHoverOpen(true);
    const handleDrawerHoverClose = () => setHoverOpen(false);
    const handleCloseStatus = () => setStatus({ message: "", severity: "info" });

    const handleEntrySelect = (entry) => {
        setSelectedEntry(entry);
        setEntryText("");
        setStatus({ message: "", severity: "info" });
        setCurrentView('main');
    };

    const handleNewEntryClick = () => {
        setSelectedEntry(null);
        setEntryText("");
        setStatus({ message: "", severity: "info" });
        setCurrentView('main');
    };

    const handleSettingsClick = () => {
        setCurrentView('settings');
        setSelectedEntry(null);
        setStatus({ message: "", severity: "info" });
    };

    const handleAboutClick = () => {
        setCurrentView('about');
        setSelectedEntry(null);
        setStatus({ message: "", severity: "info" });
    };

    const handleDarkModeChange = (event) => {
        setDarkMode(event.target.checked);
    };

    useEffect(() => {
        fetchEntries();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
                                selected={selectedEntry?.date === entry.date && currentView === 'main'}
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
                                    : selectedEntry ? formatDate(selectedEntry.date)
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
                        <Paper
                            sx={{
                                p: 3, width: '100%', maxWidth: '800px', mx: 'auto', flexGrow: 1,
                                overflowY: 'auto', mb: 2, borderRadius: '16px', display: 'flex',
                                flexDirection: 'column',
                            }}
                        >
                            <Box sx={{ mb: 2, flexShrink: 0 }}>
                                <Button startIcon={<ArrowBackIcon />} onClick={handleNewEntryClick} variant="outlined">
                                    Back to Journal
                                </Button>
                            </Box>
                            <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', flexShrink: 0 }}>
                                {formatDate(selectedEntry.date)}
                            </Typography>
                            <Divider sx={{ mb: 3, flexShrink: 0 }} />
                            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', flexGrow: 1, mb: 2 }}>
                                {selectedEntry.content}
                            </Typography>
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 'auto', pt: 2, flexShrink: 0 }}>
                                <Button variant="outlined" startIcon={<EditIcon />}>
                                    Edit Entry
                                </Button>
                                <Button variant="outlined" color="error" startIcon={<DeleteIcon />}>
                                    Delete Entry
                                </Button>
                            </Box>
                        </Paper>
                    ) : (
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
