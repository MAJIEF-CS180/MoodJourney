import React, { useState } from 'react';
import {
    Box, Paper, Typography, TextField, IconButton, CircularProgress, Menu, MenuItem
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import MicIcon from '@mui/icons-material/Mic';
import AddIcon from '@mui/icons-material/Add';

function NewEntryForm({
    entryText,
    onEntryTextChange,
    onSaveEntry,
    onUploadAudioFile,
    onStartDictation,
    isDictating,
    isFileDictating,
    saving,
    getGreeting,
}) {
    const [anchorEl, setAnchorEl] = useState(null);
    const openMenu = Boolean(anchorEl);

    const handleClickPlus = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
    };

    const handleUploadAudio = () => {
        onUploadAudioFile();
        handleCloseMenu();
    };

    return (
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', width: '100%' }}>
            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', overflowY: 'auto' }}>
                <Typography variant="h4" color="text.secondary" sx={{ fontWeight: 'bold', mb: 3 }}>
                    {getGreeting()}
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
                        onChange={(e) => onEntryTextChange(e.target.value)}
                        variant="standard"
                        fullWidth
                        InputProps={{ disableUnderline: true }}
                        sx={{ flexGrow: 1, mb: 1, fontSize: '1.125rem', p: 1, borderRadius: '4px' }}
                        disabled={isDictating || isFileDictating}
                    />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <IconButton
                            color="primary"
                            onClick={handleClickPlus}
                            size="large"
                            aria-label="add options"
                            aria-controls={openMenu ? 'add-menu' : undefined}
                            aria-haspopup="true"
                            aria-expanded={openMenu ? 'true' : undefined}
                            disabled={isDictating || isFileDictating}
                        >
                            <AddIcon />
                        </IconButton>
                        <Menu
                            id="add-menu"
                            anchorEl={anchorEl}
                            open={openMenu}
                            onClose={handleCloseMenu}
                            MenuListProps={{
                                'aria-labelledby': 'add-button',
                            }}
                        >
                            <MenuItem onClick={handleUploadAudio}>Upload Audio File</MenuItem>
                        </Menu>
                        <Box>
                            <IconButton
                                color={isDictating ? "error" : "primary"}
                                onClick={onStartDictation}
                                size="large"
                                aria-label={isDictating ? "stop dictation" : "start dictation"}
                                sx={{ mr: 1 }}
                                disabled={isFileDictating}
                            >
                                <MicIcon />
                            </IconButton>
                            <IconButton
                                color="primary"
                                onClick={onSaveEntry}
                                disabled={saving || !entryText.trim() || isDictating || isFileDictating}
                                size="large"
                                aria-label="save entry"
                            >
                                {saving ? <CircularProgress size={24} color="inherit" /> : <SendIcon />}
                            </IconButton>
                        </Box>
                    </Box>
                </Paper>
            </Box>
        </Box>
    );
}

export default NewEntryForm;
