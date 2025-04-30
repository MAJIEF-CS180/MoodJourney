import React, { useState, useEffect } from 'react';
import { invoke } from "@tauri-apps/api/core";
import { styled, useTheme } from '@mui/material/styles';

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
  CssBaseline,
  Divider,
  Paper,
  IconButton,
  TextField
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import AddIcon from '@mui/icons-material/Add';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ArticleIcon from '@mui/icons-material/Article';
import SendIcon from '@mui/icons-material/Send';
import SettingsIcon from '@mui/icons-material/Settings';

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

// Styled AppBar - Depends only on the persistent 'open' state (drawerOpen)
const AppBar = styled(MuiAppBar, {
  shouldForwardProp: (prop) => prop !== 'open',
})(({ theme, open }) => ({
  zIndex: theme.zIndex.drawer + 1,
  transition: theme.transitions.create(['width', 'margin'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  ...(open && {
    marginLeft: drawerWidth,
    width: `calc(100% - ${drawerWidth}px)`,
    transition: theme.transitions.create(['width', 'margin'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
}));

// Styled Drawer - Styling depends on the visual 'open' state (isDrawerVisuallyOpen)
const Drawer = styled(MuiDrawer, { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme, open }) => ({ // 'open' here refers to the visual open state
    width: drawerWidth, // Start with max width for calculation base
    flexShrink: 0,
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
    // Apply styles to Drawer itself for flex layout to push settings down
    display: 'flex',
    flexDirection: 'column',
    ...(open && { // Styles when visually open (hover or pinned)
      ...openedMixin(theme),
      '& .MuiDrawer-paper': {
        ...openedMixin(theme),
         boxShadow: 'none', // Keep shadow consistent or manage based on hover/pin state if needed
         // Ensure paper also uses flex layout
         display: 'flex',
         flexDirection: 'column',
      },
    }),
    ...(!open && { // Styles when visually closed (mini state)
      ...closedMixin(theme),
      '& .MuiDrawer-paper': {
        ...closedMixin(theme),
         boxShadow: 'none',
         // Ensure paper also uses flex layout
         display: 'flex',
         flexDirection: 'column',
      },
    }),
  }),
);

// --- App Component ---
function App() {
  const theme = useTheme();
  const [entries, setEntries] = useState([]);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ message: "", severity: "info" });
  const [drawerOpen, setDrawerOpen] = useState(false); // Persistent state (pinned open/closed)
  const [hoverOpen, setHoverOpen] = useState(false); // Transient state for hover
  const [entryText, setEntryText] = useState("");
  const [saving, setSaving] = useState(false);

  // Placeholder for the user's name
  const userName = "Michael"; // Replace with actual user name logic later

  // --- Tauri Interaction Functions ---
  const fetchEntries = async () => {
    setLoading(true);
    // Don't clear status here automatically, let user dismiss errors
    // setStatus({ message: "", severity: "info" });
    try {
      const result = await invoke("read_entries");
      console.log("Fetched entries:", result);
      const sortedEntries = (result || []).sort((a, b) => new Date(b.date) - new Date(a.date));
      setEntries(sortedEntries);
    } catch (err) {
      console.error("Error fetching entries:", err);
      setStatus({ message: `Error fetching entries: ${err.message || err}`, severity: "error" }); // Show fetch errors
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
    // Check against currently loaded entries
    return entries.some(entry => entry.date === currentDate);
  };


  const updateEntry = async (currentDate) => {
    setSaving(true);
    setStatus({ message: "", severity: "info" }); // Clear previous status before trying
    try {
      const currEntry = entries.find(entry => entry.date === currentDate);
      if (!currEntry) {
         // This case might happen if entries weren't fetched correctly or state is stale
         throw new Error("Could not find the entry for today to update.");
      }
      const updatedContent = entryText;
      // Ensure all required fields are passed to the backend invoke call
      await invoke("update_entry", {
        date: currEntry.date,
        new_title: currEntry.title, // Make sure title is included if required by backend
        new_content: updatedContent,
        new_password: currEntry.password // Make sure password is included if required
      });
      setEntryText(""); // Clear input on successful update
      setStatus({ message: "Entry updated successfully!", severity: "success" });
      await fetchEntries(); // Refresh entries list
      // Reselect the updated entry
      const updatedEntriesList = await invoke("read_entries"); // Fetch again to get latest ID/data if needed
      const newlyUpdatedEntry = updatedEntriesList.find(entry => entry.date === currentDate);
      if (newlyUpdatedEntry) {
        setSelectedEntry(newlyUpdatedEntry);
      } else {
        setSelectedEntry(null); // Fallback if it couldn't be found after update
      }

    } catch (err) {
      console.error("Error updating entry:", err);
      // Display the specific error from Tauri/backend
      setStatus({ message: `Failed to update entry: ${err.message || err}`, severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  const saveNewEntry = async (currentDate) => {
    setSaving(true);
    setStatus({ message: "", severity: "info" }); // Clear previous status
    try {
      // Ensure all required fields are passed
      await invoke("create_entry", {
        title: "Journal Entry", // Default or derive title if needed
        content: entryText,
        password: null, // Provide null or a default if required
        date: currentDate // Pass date if backend expects it for creation
      });
      setEntryText(""); // Clear input on successful save
      setStatus({ message: "Entry saved successfully!", severity: "success" });
      await fetchEntries(); // Refresh list
       // Select the newly saved entry
      const updatedEntriesList = await invoke("read_entries");
      const newlySavedEntry = updatedEntriesList.find(entry => entry.date === currentDate);
      if (newlySavedEntry) {
        setSelectedEntry(newlySavedEntry);
      } else {
         setSelectedEntry(null); // Fallback
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
      return; // Prevent saving empty entry
    }
    const currentDate = getCurrentDateString();
    // Use the checkEntries function based on the current frontend state
    if (checkEntries(currentDate)) {
      await updateEntry(currentDate);
    } else {
      await saveNewEntry(currentDate);
    }
  };

  // --- Helper Functions ---
  const formatDate = (dateString) => {
    // Add time component to avoid potential timezone issues with date-only strings
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Function to get the appropriate greeting based on the time of day, including a name
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
    // Return the full greeting including the name, if a name is provided
    return name ? `${timeOfDayGreeting}, ${name}` : timeOfDayGreeting;
  };

  // --- Event Handlers ---
  const handleDrawerOpen = () => setDrawerOpen(true); // Pin open
  const handleDrawerClose = () => setDrawerOpen(false); // Unpin

  // New handlers for hover state
  const handleDrawerHoverOpen = () => {
    if (!drawerOpen) { // Only open on hover if not permanently pinned open
      setHoverOpen(true);
    }
  };
  const handleDrawerHoverClose = () => {
    setHoverOpen(false); // Always close hover state on mouse leave
  };

  const handleEntrySelect = (entry) => {
    setSelectedEntry(entry);
    setEntryText(""); // Clear input field when selecting an old entry
    setStatus({ message: "", severity: "info" }); // Clear status when selecting an entry
  };

  const handleNewEntryClick = () => {
    setSelectedEntry(null); // Switch to the new/edit view
    setEntryText(""); // Always clear the text field
    setStatus({ message: "", severity: "info" }); // Clear status when starting new entry
    console.log("New Entry button clicked - Input cleared.");
  };

  const handleSettingsClick = () => {
      console.log("Settings clicked (no action defined yet).");
      setStatus({ message: "Settings not implemented yet.", severity: "info"}) // Example info message
  }

  // Handler to close/dismiss the status alert
  const handleCloseStatus = () => {
    setStatus({ message: "", severity: "info" }); // Reset status
  };


  // --- Effects ---
  useEffect(() => {
    fetchEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Fetch entries only on initial mount

  // --- Render ---

  // Determine if the drawer should be visually open (pinned or hovered)
  const isDrawerVisuallyOpen = drawerOpen || hoverOpen;

  // Content for the sidebar drawer - Updated to use isDrawerVisuallyOpen
  const drawerContent = (
     <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
       {/* Top section (Toolbar, Button, Recent List) */}
       <Box>
         {/* Toolbar with close button - Only visible when pinned open */}
         {drawerOpen && ( // Show close button only when drawer is pinned open
             <Toolbar sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  px: [1],
                  backgroundColor: theme.palette.primary.main,
                  color: theme.palette.primary.contrastText,
                  boxShadow: theme.shadows[4], // Always show shadow when pinned open
              }}>
               <IconButton onClick={handleDrawerClose} color="inherit">
                 {theme.direction === 'rtl' ? <ChevronRightIcon /> : <ChevronLeftIcon />}
               </IconButton>
             </Toolbar>
         )}
         {/* Add a spacer Toolbar when drawer is closed or only hovered to align content */}
         {!drawerOpen && <Toolbar sx={{ minHeight: { xs: 56, sm: 64 } }} />} {/* Match AppBar height */}
         <Divider />

         {/* New Entry Button - Always visible, style changes */}
         <Box sx={{ p: 1, mt: 2, mb: 1, overflow: 'hidden' }}>
           <Button
              variant="contained"
              startIcon={<AddIcon />}
              fullWidth
              onClick={handleNewEntryClick}
              sx={{
                  justifyContent: isDrawerVisuallyOpen ? 'flex-start' : 'center', // Adjust based on visual state
                  textTransform: 'none',
                  borderRadius: '16px',
                  padding: '8px',
                  minWidth: 0,
                  '& .MuiButton-startIcon': {
                      margin: isDrawerVisuallyOpen ? '0 8px 0 -4px' : '0', // Adjust icon margin
                  },
              }}
            >
             {isDrawerVisuallyOpen && 'New Entry'} {/* Show text based on visual state */}
           </Button>
         </Box>

         {/* Recent Title - Only show when drawer is visually open */}
         {isDrawerVisuallyOpen && (
            <Typography
              variant="subtitle1"
              sx={{ p: 2, pt: 1, color: 'text.primary', fontWeight: 'bold' }}
            >
              Recent
            </Typography>
          )}
         {/* Divider - Only show when visually open and there are entries or loading */}
         {isDrawerVisuallyOpen && (loading || entries.length > 0) && <Divider />}

         {/* List of Entries - Renders items ONLY when drawer is visually open */}
         <List sx={{ pt: 0 }}>
           {/* Loading indicator - Show only when visually open */}
           {loading && isDrawerVisuallyOpen && (
              <ListItem sx={{ justifyContent: 'center' }}>
                <CircularProgress size={24} />
              </ListItem>
            )}
            {/* No entries message - Show only when visually open and not loading */}
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
            {/* Map over entries - Items only rendered if isDrawerVisuallyOpen is true */}
            {!loading && entries.map((entry) => (
                isDrawerVisuallyOpen ? (
                    <ListItem key={entry.date} disablePadding sx={{ display: 'block' }}>
                    <ListItemButton
                        selected={selectedEntry?.date === entry.date}
                        onClick={() => handleEntrySelect(entry)}
                        sx={{
                            minHeight: 48,
                            justifyContent: 'initial',
                            px: 2.5,
                        }}
                    >
                        <ListItemIcon
                        sx={{
                            minWidth: 0,
                            mr: 3,
                            justifyContent: 'center',
                        }}
                        >
                        <ArticleIcon />
                        </ListItemIcon>
                        <ListItemText primary={formatDate(entry.date)} />
                    </ListItemButton>
                    </ListItem>
                ) : null // Render nothing for entries when minimized
            ))}
         </List>
       </Box>

       {/* Bottom section (Settings) - Always visible, style changes */}
       <Box sx={{ marginTop: 'auto' }}>
         <Divider />
         <List>
           <ListItem disablePadding sx={{ display: 'block' }}>
             <ListItemButton
               onClick={handleSettingsClick}
               title="Settings" // Tooltip always useful
               sx={{
                 minHeight: 48,
                 justifyContent: isDrawerVisuallyOpen ? 'initial' : 'center', // Adjust based on visual state
                 px: 2.5,
               }}
             >
               <ListItemIcon
                 sx={{
                   minWidth: 0,
                   mr: isDrawerVisuallyOpen ? 3 : 'auto', // Adjust margin based on visual state
                   justifyContent: 'center',
                 }}
               >
                 <SettingsIcon />
               </ListItemIcon>
               {/* Only render text when visually open */}
               {isDrawerVisuallyOpen && <ListItemText primary="Settings" />}
             </ListItemButton>
           </ListItem>
         </List>
       </Box>
     </Box>
   );


  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <CssBaseline />

      {/* AppBar (Styled) - Position depends only on pinned state (drawerOpen) */}
      <AppBar position="fixed" open={drawerOpen}>
        <Toolbar>
          {/* Hamburger Menu - Only show when drawer is not pinned open */}
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={handleDrawerOpen} // Pins the drawer open
            edge="start"
            sx={{
                marginRight: 5,
                ...(drawerOpen && { display: 'none' }), // Hide when pinned open
            }}
          >
            <MenuIcon />
          </IconButton>
          {/* AppBar Title Logic */}
          <Typography variant="h6" noWrap component="div">
            {selectedEntry ? formatDate(selectedEntry.date) : "MoodJourney"}
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Drawer (Styled) - Pass visual state and hover handlers */}
      <Drawer
        variant="permanent"
        open={isDrawerVisuallyOpen} // Controls visual appearance (width, mixins)
        onMouseEnter={handleDrawerHoverOpen}
        onMouseLeave={handleDrawerHoverClose}
      >
        {drawerContent}
      </Drawer>

      {/* Main content area - Layout depends only on pinned state (drawerOpen via AppBar) */}
      <Box
        component="main"
        sx={{
            flexGrow: 1,
            p: 3,
            display: 'flex',
            flexDirection: 'column',
            // Keep justifyContent logic as it correctly pushes input to bottom when !selectedEntry
            justifyContent: selectedEntry ? 'flex-start' : 'flex-end',
            height: '100%',
            overflow: 'auto' // Keep overall scroll for the main area
        }}
      >
        {/* Toolbar for spacing below AppBar */}
        <Toolbar />

        {/* Display status messages - Now dismissible */}
        {status.message && status.severity !== "info" && (
          <Alert
            severity={status.severity}
            sx={{ mb: 2, width: '100%', maxWidth: '800px', mx: 'auto', flexShrink: 0 }}
            onClose={handleCloseStatus} // Add the close handler here
          >
            {status.message}
          </Alert>
        )}

        {/* Conditional rendering for main content (Viewing vs Editing) */}
        {selectedEntry ? (
          // --- VIEWING AN OLD ENTRY ---
          // *** MODIFIED Paper component below ***
          <Paper
             elevation={2}
             sx={{
                p: 3,
                width: '100%', // Take full width
                maxWidth: '800px', // Max width for readability
                mx: 'auto', // Center horizontally
                flexGrow: 1, // Allow paper to grow if content is short
                overflowY: 'auto', // Allow internal scrolling if content exceeds height
                mb: 2, // Add margin bottom
                borderRadius: '16px', // Added matching border radius
                border: '1px solid rgba(0, 0, 0, 0.23)' // Added border for visibility
            }}
          >
             <Typography
                variant="body1"
                sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
             >
               {selectedEntry.content}
             </Typography>
          </Paper>

        ) : (
          // --- NEW / EDITING TODAY'S ENTRY ---
          // Use React Fragment to group Welcome message and Input Box
          <>
            {/* Box to center the Greeting message */}
            <Box
              sx={{
                flexGrow: 1, // Takes up available space above the input box
                display: 'flex',
                alignItems: 'center', // Center vertically
                justifyContent: 'center', // Center horizontally
                width: '100%', // Ensure it spans width for centering
              }}
            >
              {/* Updated Typography: Uses getGreeting() with the userName */}
              <Typography
                variant="h3"
                color="textSecondary"
                sx={{ fontWeight: 'bold' }}
              >
                {getGreeting(userName)} {/* Pass the userName to the function */}
              </Typography>
            </Box>

            {/* Input Box Container (remains at the bottom due to main Box justifyContent: 'flex-end') */}
            <Box sx={{ width: '100%', maxWidth: '800px', mx: 'auto', mb: 2, flexShrink: 0 }}>
              <Paper
                elevation={2}
                sx={{
                  p: 2,
                  borderRadius: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  border: '1px solid rgba(0, 0, 0, 0.23)' // Added border for visibility
                }}
              >
                  <TextField
                      id="journal-entry-input"
                      placeholder="Write your thoughts here..."
                      multiline
                      minRows={4} // Minimum rows
                      value={entryText}
                      onChange={(e) => setEntryText(e.target.value)}
                      variant="standard" // Use standard variant without underline
                      fullWidth
                      InputProps={{ disableUnderline: true }} // Hide the underline
                      sx={{ flexGrow: 1, mb: 1, fontSize: '1rem' }} // Allow text field to grow if needed
                  />
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                      <IconButton
                          color="primary"
                          onClick={handleSaveEntry}
                          disabled={saving || !entryText.trim()} // Disable if saving or text is empty/whitespace
                          size="large"
                      >
                          {saving ? <CircularProgress size={24} color="inherit" /> : <SendIcon />}
                      </IconButton>
                  </Box>
              </Paper>
            </Box>
          </> // End React Fragment
        )}
      </Box>
    </Box>
  );
}

export default App;
