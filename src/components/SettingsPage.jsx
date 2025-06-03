import React, { useState, useEffect } from 'react';
import { invoke } from "@tauri-apps/api/core";
import {
    Box, Button, Paper, Typography, Divider, TextField, Switch, FormControlLabel,
    Select, MenuItem, FormControl, InputLabel, Menu, ListItemIcon, ListItemText
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import LockIcon from '@mui/icons-material/Lock';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { scrollbarStyles } from '../utils';

function SettingsPage({
    currentThemeMode,
    onThemeModeChange,
    onBack,
    isPinSet,
    onOpenPinModal,
    setStatus,
    configuredUserName,
    onConfiguredUserNameChange,
    refreshPinStatus // Added prop
}) {
    const theme = useTheme();
    const [pinMenuAnchorEl, setPinMenuAnchorEl] = useState(null);
    const [localUserName, setLocalUserName] = useState(configuredUserName);

    useEffect(() => {
        setLocalUserName(configuredUserName);
    }, [configuredUserName]);

    const handlePinMenuOpen = (event) => {
        setPinMenuAnchorEl(event.currentTarget);
    };

    const handlePinMenuClose = () => {
        setPinMenuAnchorEl(null);
    };

    const handleCreatePin = () => {
        onOpenPinModal('create');
        handlePinMenuClose();
    };

    const handleChangePin = () => {
        onOpenPinModal('change');
        handlePinMenuClose();
    };

    const handleDeletePin = async () => {
        try {
            await invoke('delete_pin_cmd');
            setStatus({ message: "PIN deleted successfully.", severity: "success" });
            if (typeof refreshPinStatus === 'function') {
                refreshPinStatus();
            }
        } catch (error) {
            console.error("Failed to delete PIN:", error);
            setStatus({ message: `Failed to delete PIN: ${error.message || String(error)}`, severity: "error" });
        }
        handlePinMenuClose();
    };

    const handleNameInputChange = (event) => {
        setLocalUserName(event.target.value);
    };

    const handleNameSave = () => {
        onConfiguredUserNameChange(localUserName);
        setStatus({ message: "Name updated successfully.", severity: "success" });
    };


    return (
        <>
            <Box sx={{ mb: 2, alignSelf: 'flex-start', flexShrink: 0 }}>
                <Button startIcon={<ArrowBackIcon />} onClick={onBack} variant="outlined">Back to Journal</Button>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, width: '100%', flexGrow: 1, overflow: 'hidden' }}>
                <Paper sx={{ p: 1, flex: { xs: '1 1 auto', md: '2 1 0%' }, minWidth: 0, borderRadius: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <Box sx={{ ...scrollbarStyles(theme), height: '100%' }}>
                        <Box sx={{ p: theme.spacing(1.5), pr: theme.spacing(1), display: 'flex', flexDirection: 'column', height: '100%' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', mb: 2, flexShrink: 0 }}>
                                <Typography variant="body1" id="name-input-label" sx={{ fontSize: '1.125rem', mr: 2 }}>
                                    Display Name
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <TextField
                                        id="user-name-input"
                                        value={localUserName}
                                        onChange={handleNameInputChange}
                                        size="small"
                                        sx={{
                                            width: 'fit-content',
                                            '& .MuiInputBase-root': {
                                                borderRadius: '8px',
                                                fontSize: '1rem',
                                                width: 'auto',
                                            },
                                            '& input': {
                                                width: 'auto',
                                                fontSize: '1rem',
                                                padding: '6px 8px',
                                            }
                                        }}
                                    />
                                    <Button
                                        variant="contained"
                                        size="small"
                                        onClick={handleNameSave}
                                        disabled={localUserName === configuredUserName}
                                    >
                                        Save
                                    </Button>
                                </Box>
                            </Box>
                            <Divider sx={{ my: 2 }} />

                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', width: '100%', mb: 2, flexShrink: 0 }}>
                                <Typography variant="body1" id="theme-select-label" sx={{ fontSize: '1.125rem', mr: 2, pb: '0px' }}>Theme</Typography>
                                <FormControl sx={{ minWidth: 240, mt: '0px' }} size="small">
                                    <Select labelId="theme-select-label-helper" id="theme-select" value={currentThemeMode} onChange={(e) => onThemeModeChange(e.target.value)} sx={{ borderRadius: '8px' }}>
                                        <MenuItem value="light">Light</MenuItem>
                                        <MenuItem value="dark">Dark</MenuItem>
                                        <MenuItem value="system">System</MenuItem>
                                        <MenuItem value="girlboss">✨ Girlboss ✨</MenuItem>
                                    </Select>
                                </FormControl>
                            </Box>

                            <Divider sx={{ my: 2 }} />
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', mb: 2 }}>
                                <Typography variant="body1" sx={{ fontSize: '1.125rem', mr: 2 }}>
                                    Application PIN
                                </Typography>
                                <Button
                                    variant="outlined"
                                    onClick={handlePinMenuOpen}
                                    endIcon={<MoreVertIcon />}
                                    startIcon={isPinSet ? <LockIcon /> : <LockOpenIcon />}
                                >
                                    {isPinSet ? "Manage PIN" : "Create PIN"}
                                </Button>
                                <Menu
                                    anchorEl={pinMenuAnchorEl}
                                    open={Boolean(pinMenuAnchorEl)}
                                    onClose={handlePinMenuClose}
                                >
                                    {isPinSet ? (
                                        [
                                            <MenuItem key="change" onClick={handleChangePin}>
                                                <ListItemIcon><VpnKeyIcon fontSize="small" /></ListItemIcon>
                                                <ListItemText>Change PIN</ListItemText>
                                            </MenuItem>,
                                            <MenuItem key="delete" onClick={handleDeletePin}>
                                                <ListItemIcon><DeleteIcon fontSize="small" /></ListItemIcon>
                                                <ListItemText>Delete PIN</ListItemText>
                                            </MenuItem>
                                        ]
                                    ) : (
                                        <MenuItem onClick={handleCreatePin}>
                                            <ListItemIcon><AddIcon fontSize="small" /></ListItemIcon>
                                            <ListItemText>Create PIN</ListItemText>
                                        </MenuItem>
                                    )}
                                </Menu>
                            </Box>


                            <Typography variant="body1" color="text.secondary" sx={{ mt: 'auto', fontSize: '1.125rem', flexShrink: 0, textAlign: 'left', pt: 2 }}>MoodJourney v0.1.0</Typography>
                        </Box>
                    </Box>
                </Paper>
                <Paper sx={{ p: 1, flex: { xs: '1 1 auto', md: '1 1 0%' }, minWidth: 0, borderRadius: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <Box sx={{ p: theme.spacing(1.5), pr: theme.spacing(1) }}>
                        <Typography variant="h6" gutterBottom>PIN Security</Typography>
                        <Typography variant="body2" color="text.secondary">
                            {isPinSet
                                ? "A PIN is set for this application. You will be asked to enter it when the application starts."
                                : "No PIN is currently set. You can create a 4-digit PIN to secure your journal."}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            Keep your PIN memorable but secure.
                        </Typography>
                    </Box>
                </Paper>
            </Box>
        </>
    );
}

export default SettingsPage;
