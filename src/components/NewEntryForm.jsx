import React from 'react';
import {
    Box, Paper, Typography, TextField, IconButton, CircularProgress
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import MicIcon from '@mui/icons-material/Mic';

function NewEntryForm({
    entryText,
    onEntryTextChange,
    onSaveEntry,
    onStartDictation,
    isDictating,
    saving,
    getGreeting,
}) {
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
                    />
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                        {entryText.trim() === "" ? (
                            <IconButton color="primary" onClick={onStartDictation} disabled={isDictating} size="large" aria-label="start dictation">
                                {isDictating ? <CircularProgress size={24} color="inherit" /> : <MicIcon />}
                            </IconButton>
                        ) : (
                            <IconButton color="primary" onClick={onSaveEntry} disabled={saving || !entryText.trim()} size="large" aria-label="save entry">
                                {saving ? <CircularProgress size={24} color="inherit" /> : <SendIcon />}
                            </IconButton>
                        )}
                    </Box>
                </Paper>
            </Box>
        </Box>
    );
}

export default NewEntryForm;
