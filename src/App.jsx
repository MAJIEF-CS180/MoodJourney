import React, { useState, useEffect, useMemo } from 'react'; // Added useMemo
import { invoke } from "@tauri-apps/api/core";
import { styled, useTheme, ThemeProvider, createTheme } from '@mui/material/styles'; // Added ThemeProvider, createTheme

// Import Material UI components & icons
import {
  AppBar as MuiAppBar,
  Box,
  Button,
  Drawer as MuiDrawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  CircularProgress,
  Alert,
  CssBaseline, // Keep CssBaseline
  Divider,
  Paper,
  IconButton,
  TextField,
  Switch,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import AddIcon from '@mui/icons-material/Add';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ArticleIcon from '@mui/icons-material/Article';
import SendIcon from '@mui/icons-material/Send';
import SettingsIcon from '@mui/icons-material/Settings';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import InfoIcon from '@mui/icons-material/Info'; // <<< Added InfoIcon import

// Define the widths for full and mini drawer
const drawerWidth = 240;
const miniDrawerWidth = 65;

// --- Styled Components ---

// Helper function for smooth transitions when opening drawer
const openedMixin = (theme) => ({
  width: drawerWidth,
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
  overflowX: 'hidden',
});

// Helper function for smooth transitions when closing drawer
const closedMixin = (theme) => ({
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  overflowX: 'hidden',
  width: `${miniDrawerWidth}px`,
});

// AppBar Styled Component
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
  backgroundColor: theme.palette.background.paper,
  color: theme.palette.text.primary,
  borderBottom: `1px solid ${theme.palette.divider}`,
  elevation: 0,
}));

// Drawer Styled Component
const Drawer = styled(MuiDrawer, { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme, open }) => ({
    width: drawerWidth,
    flexShrink: 0,
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    '& .MuiDrawer-paper': {
        borderRight: `1px solid ${theme.palette.divider}`,
        boxShadow: 'none',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: theme.palette.background.default,
    },
    ...(open && {
      ...openedMixin(theme),
      '& .MuiDrawer-paper': {
        ...openedMixin(theme),
      },
    }),
    ...(!open && {
      ...closedMixin(theme),
      '& .MuiDrawer-paper': {
        ...closedMixin(theme),
      },
    }),
  }),
);


// --- Settings Page Component ---
function SettingsPage({ darkMode, onDarkModeChange, onBack }) {
    const theme = useTheme();
    return (
        <Paper
            elevation={0}
            sx={{
                p: 3,
                width: '100%',
                maxWidth: '800px',
                mx: 'auto',
                flexGrow: 1,
                overflowY: 'auto',
                mb: 2,
                borderRadius: '16px',
                border: `1px solid ${theme.palette.divider}`,
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: theme.palette.background.paper,
            }}
        >
            {/* Back Button */}
            <Box sx={{ mb: 2 }}>
                <Button
                    startIcon={<ArrowBackIcon />}
                    onClick={onBack}
                    variant="outlined"
                >
                    Back to Journal
                </Button>
            </Box>

            <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                Settings
            </Typography>
            <Divider sx={{ mb: 3 }} />

            {/* Dark Mode Row */}
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    width: '100%',
                    mb: 2,
                }}
            >
                <Typography variant="body1" id="dark-mode-label">
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

            <Typography variant="body2" color="text.secondary">
                More settings will be available here in the future.
            </Typography>

        </Paper>
    );
}

// --- About Page Component --- <<< NEW COMPONENT
function AboutPage({ onBack }) {
    const theme = useTheme();
    return (
        <Paper
            elevation={0}
            sx={{
                p: 3,
                width: '100%',
                maxWidth: '800px',
                mx: 'auto',
                flexGrow: 1,
                overflowY: 'auto',
                mb: 2,
                borderRadius: '16px',
                border: `1px solid ${theme.palette.divider}`,
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: theme.palette.background.paper,
            }}
        >
            {/* Back Button */}
            <Box sx={{ mb: 2 }}>
                <Button
                    startIcon={<ArrowBackIcon />}
                    onClick={onBack}
                    variant="outlined"
                >
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


// --- Base Theme Options ---
const baseThemeOptions = {
    typography: {
        fontFamily: '"Inter", Arial, sans-serif',
    },
    shape: {
        borderRadius: 12,
    },
    components: {
        MuiButton: {
            defaultProps: {
                disableElevation: true,
            },
            styleOverrides: {
                root: {
                    textTransform: 'none',
                    borderRadius: 20,
                },
                contained: {
                    borderRadius: 20,
                }
            }
        },
        MuiTextField: {
            defaultProps: {
                variant: 'filled',
            },
            styleOverrides: {
                root: ({ theme }) => ({
                    '& .MuiFilledInput-underline:before': { borderBottom: 'none' },
                    '& .MuiFilledInput-underline:after': { borderBottom: 'none' },
                    '& .MuiFilledInput-underline:hover:not(.Mui-disabled):before': { borderBottom: 'none' },
                    '& .MuiFilledInput-root': {
                        backgroundColor: theme.palette.action.hover,
                        borderRadius: '4px 4px 0 0',
                        '&:hover': {
                            backgroundColor: theme.palette.action.selected,
                        },
                        '&.Mui-focused': {
                            backgroundColor: theme.palette.action.selected,
                        },
                    }
                })
            }
        },
        MuiPaper: {
           defaultProps: {
                elevation: 0,
           },
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
                })
            }
        },
        MuiAppBar: {
             defaultProps: {
                elevation: 0,
             },
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

// --- Light Theme ---
const lightTheme = createTheme({
    ...baseThemeOptions,
    palette: {
        mode: 'light',
        primary: {
            main: '#23325A',
        },
        secondary: {
            main: '#625B71',
        },
        background: {
            default: '#F1F1F1',
            paper: '#FFFFFF',
        },
        text: {
            primary: 'rgba(0, 0, 0, 0.87)',
            secondary: 'rgba(0, 0, 0, 0.6)',
        },
        action: {
            hover: 'rgba(0, 0, 0, 0.04)',
            selected: 'rgba(0, 0, 0, 0.08)',
        }
    },
});

// --- Dark Theme ---
const darkTheme = createTheme({
    ...baseThemeOptions,
    palette: {
        mode: 'dark',
        primary: {
            main: '#AEC6FF',
        },
        secondary: {
            main: '#CCC2DC',
        },
        background: {
            default: '#1B1B1B',
            paper: '#303030',
        },
        text: {
            primary: '#E2E2E2',
            secondary: 'rgba(230, 225, 229, 0.6)',
        },
        action: {
            hover: 'rgba(255, 255, 255, 0.08)',
            selected: 'rgba(255, 255, 255, 0.12)',
        },
        divider: 'rgba(255, 255, 255, 0.12)',
    },
    components: {
        ...baseThemeOptions.components,
        MuiTextField: {
            ...baseThemeOptions.components.MuiTextField,
            styleOverrides: {
                 ...baseThemeOptions.components.MuiTextField.styleOverrides,
                 root: ({ theme }) => ({
                    ...baseThemeOptions.components.MuiTextField.styleOverrides.root({ theme }),
                    '& .MuiFilledInput-root': {
                        backgroundColor: theme.palette.action.hover,
                         '&:hover': {
                            backgroundColor: theme.palette.action.selected,
                        },
                        '&.Mui-focused': {
                            backgroundColor: theme.palette.action.selected,
                        },
                    }
                })
            }
        },
         MuiPaper: {
             ...baseThemeOptions.components.MuiPaper,
             styleOverrides: {
                 root: ({ theme }) => ({
                      backgroundColor: theme.palette.background.paper,
                      border: `1px solid ${theme.palette.divider}`,
                 })
             }
         },
          MuiDrawer: {
            ...baseThemeOptions.components.MuiDrawer,
            styleOverrides: {
                paper: ({ theme }) => ({
                    backgroundColor: theme.palette.background.paper,
                    borderRight: `1px solid ${theme.palette.divider}`,
                })
            }
        },
         MuiAppBar: {
             ...baseThemeOptions.components.MuiAppBar,
             styleOverrides: {
                root: ({ theme }) => ({
                    backgroundColor: theme.palette.background.paper,
                    color: theme.palette.text.primary,
                    borderBottom: `1px solid ${theme.palette.divider}`,
                })
             }
        }
    }
});


// --- App Component ---
function App() {
  // THEME STATE
  const [darkMode, setDarkMode] = useState(false);
  const theme = useMemo(() => (darkMode ? darkTheme : lightTheme), [darkMode]);

  // Application States
  const [entries, setEntries] = useState([]);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ message: "", severity: "info" });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [hoverOpen, setHoverOpen] = useState(false);
  const [entryText, setEntryText] = useState("");
  const [saving, setSaving] = useState(false);
  // <<< MODIFIED STATE: Added 'about' view >>>
  const [currentView, setCurrentView] = useState('main'); // 'main', 'settings', or 'about'

  // Placeholder user name
  const userName = "Michael";

  // --- Tauri Interaction Functions ---
  const fetchEntries = async () => {
    setLoading(true);
    try {
      const result = await invoke("read_entries");
      console.log("Fetched entries:", result);
      const sortedEntries = (result || []).sort((a, b) => new Date(b.date) - new Date(a.date));
      setEntries(sortedEntries);
    } catch (err) {
      console.error("Error fetching entries:", err);
      setStatus({ message: `Error fetching entries: ${err.message || err}`, severity: "error" });
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentDateString = () => {
    const date = new Date();
    const currYear = date.getFullYear();
    const currMonth = String(date.getMonth() + 1).padStart(2, '0');
    const currDay = String(date.getDate()).padStart(2, '0');
    return `${currYear}-${currMonth}-${currDay}`;
  };

  const checkEntries = (currentDate) => {
    return entries.some(entry => entry.date === currentDate);
  };

  const updateEntry = async (currentDate) => {
    setSaving(true);
    setStatus({ message: "", severity: "info" });
    try {
      const currEntry = entries.find(entry => entry.date === currentDate);
      if (!currEntry) {
         throw new Error("Could not find the entry for today to update.");
      }
      const updatedContent = entryText;
      await invoke("update_entry", {
        date: currEntry.date,
        new_title: currEntry.title,
        new_content: updatedContent,
        new_password: currEntry.password
      });
      setEntryText("");
      setStatus({ message: "Entry updated successfully!", severity: "success" });
      await fetchEntries();
      const updatedEntriesList = await invoke("read_entries");
      const newlyUpdatedEntry = updatedEntriesList.find(entry => entry.date === currentDate);
      if (newlyUpdatedEntry) {
        setSelectedEntry(newlyUpdatedEntry);
      } else {
        setSelectedEntry(null);
      }
    } catch (err) {
      console.error("Error updating entry:", err);
      setStatus({ message: `Failed to update entry: ${err.message || err}`, severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  const saveNewEntry = async (currentDate) => {
    setSaving(true);
    setStatus({ message: "", severity: "info" });
    try {
      await invoke("create_entry", {
        title: "Journal Entry",
        content: entryText,
        password: null,
        date: currentDate
      });
      setEntryText("");
      setStatus({ message: "Entry saved successfully!", severity: "success" });
      await fetchEntries();
      const updatedEntriesList = await invoke("read_entries");
      const newlySavedEntry = updatedEntriesList.find(entry => entry.date === currentDate);
      if (newlySavedEntry) {
        setSelectedEntry(newlySavedEntry);
      } else {
         setSelectedEntry(null);
      }
    } catch (err) {
      console.error("Error saving new entry:", err);
      setStatus({ message: `Failed to save entry: ${err.message || err}`, severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEntry = async () => {
    if (!entryText.trim()) {
      setStatus({ message: "Entry cannot be empty.", severity: "warning" });
      return;
    }
    const currentDate = getCurrentDateString();
    if (checkEntries(currentDate)) {
      await updateEntry(currentDate);
    } else {
      await saveNewEntry(currentDate);
    }
  };

  // --- Helper Functions ---
  const formatDate = (dateString) => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getGreeting = (name) => {
    const currentHour = new Date().getHours();
    let timeOfDayGreeting = "";
    if (currentHour < 12) {
      timeOfDayGreeting = "Good Morning";
    } else if (currentHour < 18) {
      timeOfDayGreeting = "Good Afternoon";
    } else {
      timeOfDayGreeting = "Good Evening";
    }
    return name ? `${timeOfDayGreeting}, ${name}` : timeOfDayGreeting;
  };

  // --- Event Handlers ---
  const handleDrawerOpen = () => setDrawerOpen(true);
  const handleDrawerClose = () => setDrawerOpen(false);
  const handleDrawerHoverOpen = () => {
    if (!drawerOpen) {
      setHoverOpen(true);
    }
  };
  const handleDrawerHoverClose = () => {
    setHoverOpen(false);
  };

  const handleEntrySelect = (entry) => {
    setSelectedEntry(entry);
    setEntryText("");
    setStatus({ message: "", severity: "info" });
    setCurrentView('main'); // <<< MODIFIED: Ensure view is main
  };

  const handleNewEntryClick = () => {
    setSelectedEntry(null);
    setEntryText("");
    setStatus({ message: "", severity: "info" });
    setCurrentView('main'); // <<< MODIFIED: Ensure view is main
    console.log("New Entry / Back to Journal button clicked.");
  };

  // --- Settings/About Handlers ---
  const handleSettingsClick = () => {
      setCurrentView('settings');
      setSelectedEntry(null);
      setStatus({ message: "", severity: "info" });
  };

  // <<< NEW HANDLER >>>
  const handleAboutClick = () => {
      setCurrentView('about');
      setSelectedEntry(null);
      setStatus({ message: "", severity: "info" });
  };

  const handleDarkModeChange = (event) => {
      setDarkMode(event.target.checked);
      console.log("Dark Mode Toggled:", event.target.checked);
  };

  const handleCloseStatus = () => {
    setStatus({ message: "", severity: "info" });
  };

  // --- Effects ---
  useEffect(() => {
    fetchEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Render ---

  const isDrawerVisuallyOpen = drawerOpen || hoverOpen;

  // Drawer content
  const drawerContent = (
     <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
       {/* Top section */}
       <Box>
         {/* Toolbar with close button */}
         {drawerOpen && (
             <Toolbar sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  px: [1],
                  backgroundColor: (th) => th.palette.background.paper,
                  color: (th) => th.palette.text.primary,
                  borderBottom: (th) => `1px solid ${th.palette.divider}`,
              }}>
               <IconButton onClick={handleDrawerClose} color="inherit">
                 {theme.direction === 'rtl' ? <ChevronRightIcon /> : <ChevronLeftIcon />}
               </IconButton>
             </Toolbar>
         )}
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
                  textTransform: 'none',
                  borderRadius: '16px',
                  padding: '8px',
                  minWidth: 0,
                  '& .MuiButton-startIcon': {
                      margin: isDrawerVisuallyOpen ? '0 8px 0 -4px' : '0',
                  },
              }}
            >
             {isDrawerVisuallyOpen && 'New Entry'}
           </Button>
         </Box>

         {/* Recent Title */}
         {isDrawerVisuallyOpen && (
            <Typography
              variant="subtitle1"
              sx={{ p: 2, pt: 1, color: 'text.primary', fontWeight: 'bold' }}
            >
              Recent
            </Typography>
          )}
         {isDrawerVisuallyOpen && (loading || entries.length > 0) && <Divider />}

         {/* List of Entries */}
         <List sx={{ pt: 0 }}>
           {loading && isDrawerVisuallyOpen && (
              <ListItem sx={{ justifyContent: 'center' }}>
                <CircularProgress size={24} />
              </ListItem>
            )}
            {!loading && entries.length === 0 && isDrawerVisuallyOpen && (
               <ListItem disablePadding sx={{ display: 'block' }}>
                 <ListItemButton sx={{ minHeight: 48, justifyContent: 'initial', px: 2.5 }}>
                   <ListItemIcon sx={{ minWidth: 0, mr: 3, justifyContent: 'center' }}>
                     <ArticleIcon />
                   </ListItemIcon>
                   <ListItemText primary="No entries" />
                 </ListItemButton>
               </ListItem>
            )}
            {!loading && entries.map((entry) => (
                isDrawerVisuallyOpen ? (
                    <ListItem key={entry.date} disablePadding sx={{ display: 'block' }}>
                    <ListItemButton
                        selected={selectedEntry?.date === entry.date && currentView === 'main'}
                        onClick={() => handleEntrySelect(entry)}
                        sx={{
                            minHeight: 48,
                            justifyContent: 'initial',
                            px: 2.5,
                            '&.Mui-selected': {
                                backgroundColor: (th) => th.palette.action.selected,
                                '&:hover': {
                                    backgroundColor: (th) => th.palette.action.hover,
                                }
                            }
                        }}
                    >
                        <ListItemIcon sx={{ minWidth: 0, mr: 3, justifyContent: 'center' }}>
                           <ArticleIcon />
                        </ListItemIcon>
                        <ListItemText primary={formatDate(entry.date)} />
                    </ListItemButton>
                    </ListItem>
                ) : null
            ))}
         </List>
       </Box>

       {/* Bottom section (Settings & About) */}
       {/* <<< MODIFIED SECTION >>> */}
       <Box sx={{ marginTop: 'auto' }}>
         <Divider />
         <List>
           {/* Settings Button */}
           <ListItem disablePadding sx={{ display: 'block' }}>
             <ListItemButton
               onClick={handleSettingsClick}
               title="Settings"
               selected={currentView === 'settings'} // Highlight if settings view is active
               sx={{
                 minHeight: 48,
                 justifyContent: isDrawerVisuallyOpen ? 'initial' : 'center',
                 px: 2.5,
                 '&.Mui-selected': {
                    backgroundColor: (th) => th.palette.action.selected,
                    '&:hover': {
                        backgroundColor: (th) => th.palette.action.hover,
                    }
                 },
               }}
             >
               <ListItemIcon
                 sx={{
                   minWidth: 0,
                   mr: isDrawerVisuallyOpen ? 3 : 'auto',
                   justifyContent: 'center',
                 }}
               >
                 <SettingsIcon />
               </ListItemIcon>
               {isDrawerVisuallyOpen && <ListItemText primary="Settings" />}
             </ListItemButton>
           </ListItem>

           {/* About Button <<< NEW BUTTON >>> */}
           <ListItem disablePadding sx={{ display: 'block' }}>
             <ListItemButton
               onClick={handleAboutClick} // Use the new handler
               title="About"
               selected={currentView === 'about'} // Highlight if about view is active
               sx={{
                 minHeight: 48,
                 justifyContent: isDrawerVisuallyOpen ? 'initial' : 'center',
                 px: 2.5,
                 '&.Mui-selected': {
                    backgroundColor: (th) => th.palette.action.selected,
                    '&:hover': {
                        backgroundColor: (th) => th.palette.action.hover,
                    }
                 },
               }}
             >
               <ListItemIcon
                 sx={{
                   minWidth: 0,
                   mr: isDrawerVisuallyOpen ? 3 : 'auto',
                   justifyContent: 'center',
                 }}
               >
                 <InfoIcon /> {/* Use the Info icon */}
               </ListItemIcon>
               {isDrawerVisuallyOpen && <ListItemText primary="About" />}
             </ListItemButton>
           </ListItem>
         </List>
       </Box>
     </Box>
   );


  // Wrap the entire output in ThemeProvider
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', height: '100vh', bgcolor: 'background.default' }}>

        {/* AppBar */}
        <AppBar position="fixed" isPinnedOpen={drawerOpen}>
          <Toolbar>
            {/* Hamburger Menu */}
            <IconButton
              color="inherit"
              aria-label="open drawer"
              onClick={handleDrawerOpen}
              edge="start"
              sx={{ marginRight: 5, ...(drawerOpen && { display: 'none' }) }}
            >
              <MenuIcon />
            </IconButton>
            {/* AppBar Title Logic <<< MODIFIED >>> */}
            <Typography variant="h6" noWrap component="div">
              {currentView === 'settings'
                  ? 'Settings'
                  : currentView === 'about' // <<< Added check for about view >>>
                  ? 'About'
                  : selectedEntry
                  ? formatDate(selectedEntry.date)
                  : "MoodJourney"}
            </Typography>
          </Toolbar>
        </AppBar>

        {/* Drawer */}
        <Drawer
          variant="permanent"
          open={isDrawerVisuallyOpen}
          onMouseEnter={handleDrawerHoverOpen}
          onMouseLeave={handleDrawerHoverClose}
        >
          {drawerContent}
        </Drawer>

        {/* Main content area */}
        <Box
          component="main"
          sx={{
              flexGrow: 1,
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              // Adjust justifyContent based on view <<< MODIFIED >>>
              justifyContent: currentView === 'settings' || currentView === 'about' || selectedEntry ? 'flex-start' : 'flex-end',
              height: '100%',
              overflow: 'auto'
          }}
        >
          {/* Toolbar for spacing */}
          <Toolbar />

          {/* Status messages */}
          {status.message && status.severity !== "info" && (
            <Alert
              severity={status.severity}
              sx={{ mb: 2, width: '100%', maxWidth: '800px', mx: 'auto', flexShrink: 0 }}
              onClose={handleCloseStatus}
            >
              {status.message}
            </Alert>
          )}

          {/* --- Conditional Rendering based on currentView <<< MODIFIED >>> --- */}
          {currentView === 'settings' ? (
              // --- SETTINGS VIEW ---
              <SettingsPage
                  darkMode={darkMode}
                  onDarkModeChange={handleDarkModeChange}
                  onBack={() => setCurrentView('main')}
              />
          ) : currentView === 'about' ? ( // <<< Added condition for 'about' view >>>
              // --- ABOUT VIEW ---
              <AboutPage
                  onBack={() => setCurrentView('main')}
              />
          ) : selectedEntry ? (
              // --- VIEWING AN OLD ENTRY ---
              <Paper
                  elevation={0}
                  sx={{
                      p: 3,
                      width: '100%',
                      maxWidth: '800px',
                      mx: 'auto',
                      flexGrow: 1,
                      overflowY: 'auto',
                      mb: 2,
                      borderRadius: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                  }}
              >
                  {/* Back Button */}
                  <Box sx={{ mb: 2 }}>
                      <Button
                          startIcon={<ArrowBackIcon />}
                          onClick={handleNewEntryClick}
                          variant="outlined"
                      >
                          Back to Journal
                      </Button>
                  </Box>
                  {/* Date Title */}
                  <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                      {formatDate(selectedEntry.date)}
                  </Typography>
                  <Divider sx={{ mb: 3 }} />
                  {/* Entry Content */}
                  <Typography
                      variant="body1"
                      sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                  >
                      {selectedEntry.content}
                  </Typography>
              </Paper>
          ) : (
              // --- NEW / EDITING TODAY'S ENTRY ---
              <>
                  {/* Greeting Message */}
                  <Box
                      sx={{
                          flexGrow: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '100%',
                      }}
                  >
                      <Typography
                          variant="h4"
                          color="textSecondary"
                          sx={{ fontWeight: 'bold' }}
                      >
                          {getGreeting(userName)}
                      </Typography>
                  </Box>

                  {/* Input Box Container */}
                  <Box sx={{ width: '100%', maxWidth: '800px', mx: 'auto', mb: 2, flexShrink: 0 }}>
                      <Paper
                          elevation={0}
                          sx={{ p: 2, borderRadius: '16px', display: 'flex', flexDirection: 'column' }}
                      >
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
                                  fontSize: '1rem',
                                  p: 1,
                                  borderRadius: '4px',
                              }}
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
          {/* --- End Conditional Rendering --- */}

        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;
