import React from 'react';
import {
    Box, Button, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
    Toolbar, Typography, CircularProgress, Divider, IconButton
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ArticleIcon from '@mui/icons-material/Article';
import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import SettingsIcon from '@mui/icons-material/Settings';
import { formatDate, scrollbarStyles, INITIAL_VISIBLE_ENTRIES } from '../utils';
import { Drawer as StyledDrawer } from '../theme';

function AppDrawer({
    muiTheme,
    drawerOpen,
    hoverOpen,
    handleDrawerClose,
    handleDrawerHoverOpen,
    handleDrawerHoverClose,
    handleNewEntryClick,
    loading,
    entries,
    selectedEntry,
    currentView,
    isEditingSelectedEntry,
    handleEntrySelect,
    showAllEntriesInDrawer,
    handleToggleShowEntries,
    handleAssistantClick,
    handleInsightsClick,
    handleSettingsClick
}) {
    const isDrawerVisuallyOpen = drawerOpen || hoverOpen;

    return (
        <StyledDrawer
            variant="permanent"
            open={isDrawerVisuallyOpen}
            onMouseEnter={handleDrawerHoverOpen}
            onMouseLeave={handleDrawerHoverClose}
        >
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <Box sx={{ flexGrow: 1, overflowY: 'auto', ...scrollbarStyles(muiTheme) }}>
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
                                borderRadius: '16px',
                                padding: '8px',
                                minWidth: 0,
                                '& .MuiButton-startIcon': { m: isDrawerVisuallyOpen ? '0 8px 0 -4px' : '0' }
                            }}
                        >
                            {isDrawerVisuallyOpen && 'New Entry'}
                        </Button>
                    </Box>
                    {isDrawerVisuallyOpen && (loading || entries.length > 0) && <Divider sx={{ mb: 1 }} />}
                    {isDrawerVisuallyOpen && entries.length > 0 && (
                        <Typography variant="subtitle1" sx={{ p: 2, pt: 0, pb: 0, color: 'text.primary', fontWeight: 'bold' }}>
                            Recent
                        </Typography>
                    )}
                    <List sx={{ pt: 0 }}>
                        {loading && isDrawerVisuallyOpen && (
                            <ListItem sx={{ justifyContent: 'center' }}>
                                <CircularProgress size={24} />
                            </ListItem>
                        )}
                        {!loading && entries.length === 0 && isDrawerVisuallyOpen && (
                            <ListItem disablePadding>
                                <ListItemButton sx={{ minHeight: 48, justifyContent: 'initial', px: 2.5 }}>
                                    <ListItemIcon sx={{ minWidth: 0, mr: 3, justifyContent: 'center' }}>
                                        <ArticleIcon />
                                    </ListItemIcon>
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
                                        minHeight: 48,
                                        justifyContent: 'initial',
                                        px: 2.5,
                                        '&.Mui-selected': { bgcolor: 'action.selected', '&:hover': { bgcolor: 'action.hover' } }
                                    }}
                                >
                                    <ListItemIcon sx={{ minWidth: 0, mr: 3, justifyContent: 'center' }}>
                                        <ArticleIcon />
                                    </ListItemIcon>
                                    <ListItemText primary={formatDate(entry.date)} />
                                </ListItemButton>
                            </ListItem>
                        ))}
                    </List>
                    {isDrawerVisuallyOpen && !loading && entries.length > INITIAL_VISIBLE_ENTRIES && (
                        <Box sx={{ p: 1, display: 'flex', justifyContent: 'center' }}>
                            <Button
                                onClick={handleToggleShowEntries}
                                variant="text"
                                size="small"
                                endIcon={showAllEntriesInDrawer ? <ExpandLessIcon /> : <ExpandMoreIcon />}
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
                                        '&.Mui-selected': { bgcolor: 'action.selected', '&:hover': { bgcolor: 'action.hover' } }
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
        </StyledDrawer>
    );
}

export default AppDrawer;
