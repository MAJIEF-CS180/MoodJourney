import React from 'react';
import {
    Box, Button, Paper, Typography, TextField, Card, CardActionArea, CardContent, Grid, IconButton
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import {
    scrollbarStyles,
    getMainContent,
    extractEmotionFromContent,
    extractSuggestionFromContent,
    getEmotionColor,
    parseSuggestions
} from '../utils';
import ConfirmationDialog from './ConfirmationDialog';


function JournalEntryView({
    selectedEntry,
    isEditingSelectedEntry,
    editedContentText,
    onEditedContentTextChange,
    onStartEditSelectedEntry,
    onCancelEditSelectedEntry,
    onConfirmUpdateSelectedEntry,
    onDeleteEntryClick,
    saving,
    onBackToNewEntry,
    expandedSuggestionIndices,
    onToggleSuggestionExpand,
    deleteConfirmOpen,
    onCloseDeleteConfirm,
    onConfirmDeleteEntry,
    entryToDelete
}) {
    const theme = useTheme();

    if (!selectedEntry) return null;

    return (
        <>
            <Box sx={{ mb: 2, alignSelf: 'flex-start', flexShrink: 0 }}>
                <Button startIcon={<ArrowBackIcon />} onClick={onBackToNewEntry} variant="outlined">
                    Back to Journal
                </Button>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, width: '100%', flexGrow: 1, overflow: 'hidden' }}>
                <Paper sx={{ p: 1, flex: { xs: '1 1 auto', md: '2 1 0%' }, minWidth: 0, borderRadius: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {isEditingSelectedEntry ? (
                        <Box sx={{ ...scrollbarStyles(theme), height: '100%' }}>
                            <Box sx={{ p: theme.spacing(1.5), pr: theme.spacing(1), height: '100%', display: 'flex', flexDirection: 'column' }}>
                                <TextField
                                    value={editedContentText}
                                    onChange={(e) => onEditedContentTextChange(e.target.value)}
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
                                            '& .MuiOutlinedInput-input': { height: '100% !important', overflowY: 'auto !important' }
                                        },
                                        pt: theme.spacing(1),
                                        mb: 2
                                    }}
                                    placeholder="Edit your thoughts here..."
                                />
                                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 'auto', pt: 2, flexShrink: 0 }}>
                                    <Button variant="outlined" color="inherit" startIcon={<CancelIcon />} onClick={onCancelEditSelectedEntry} disabled={saving}>Cancel</Button>
                                    <Button variant="contained" color="primary" startIcon={<SaveIcon />} onClick={onConfirmUpdateSelectedEntry} disabled={saving || !editedContentText.trim()}>Save Changes</Button>
                                </Box>
                            </Box>
                        </Box>
                    ) : (
                        <Box sx={{ ...scrollbarStyles(theme), height: '100%' }}>
                            <Box sx={{ p: theme.spacing(1.5), pr: theme.spacing(1) }}>
                                <Typography variant="body1" sx={{ fontSize: '1.125rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word', mb: 2, pt: theme.spacing(1) }}>
                                    {getMainContent(selectedEntry.content)}
                                </Typography>
                            </Box>
                        </Box>
                    )}
                    {!isEditingSelectedEntry && (
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 'auto', pt: 2, flexShrink: 0, pl: theme.spacing(1), pr: theme.spacing(1), pb: theme.spacing(1) }}>
                            <Button variant="outlined" startIcon={<EditIcon />} onClick={onStartEditSelectedEntry} disabled={saving}>Edit Entry</Button>
                            <Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={() => onDeleteEntryClick(selectedEntry)} disabled={saving}>Delete Entry</Button>
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
                    overflow: 'hidden',
                    borderLeft: { md: `1px solid ${theme.palette.divider}` }
                }}>
                    {!isEditingSelectedEntry && (
                        <Box sx={{ ...scrollbarStyles(theme), height: '100%', display: 'flex', flexDirection: 'column', p: 0, gap: 2 }}>
                            <Box sx={{ flexShrink: 0, p: 1.5, pb: 0 }}>
                                <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 0.5, textAlign: 'center' }}>
                                    Emotion
                                </Typography>
                                <Paper elevation={0} sx={{
                                    p: 1.5,
                                    bgcolor: alpha(getEmotionColor(extractEmotionFromContent(selectedEntry.content), theme), 0.15),
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}>
                                    <Typography variant="h6" sx={{
                                        color: getEmotionColor(extractEmotionFromContent(selectedEntry.content), theme),
                                        fontWeight: 'bold',
                                        textTransform: 'capitalize'
                                    }}>
                                        {extractEmotionFromContent(selectedEntry.content) || "N/A"}
                                    </Typography>
                                </Paper>
                            </Box>
                            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minHeight: 0, p: 1.5, pt: 0 }}>
                                <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 0.5, textAlign: 'center' }}>
                                    Feedback
                                </Typography>
                                {(() => {
                                    const rawSuggestionText = extractSuggestionFromContent(selectedEntry.content);
                                    const suggestionsArray = parseSuggestions(rawSuggestionText);
                                    const isExpanded = (idx) => expandedSuggestionIndices.includes(idx);

                                    return (
                                        <Box sx={{ flexGrow: 1, overflowY: 'auto', ...scrollbarStyles(theme), borderRadius: '8px', display: 'flex', flexDirection: 'column' }}>
                                            <Grid container spacing={1.5} sx={{ width: '100%', p: 0.25, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                                                {suggestionsArray.map((suggestion, index) => (
                                                    <Grid item xs={12} key={index} sx={{ display: 'flex', flexDirection: 'column', flexGrow: 0 }}>
                                                        <Card variant="outlined" sx={{ borderRadius: '8px', width: '100%', flexGrow: 0, display: 'flex', flexDirection: 'column' }}>
                                                            <CardActionArea
                                                                onClick={() => onToggleSuggestionExpand(index)}
                                                                sx={{
                                                                    p: 0,
                                                                    flexGrow: 0,
                                                                    minHeight: 'auto',
                                                                    display: 'flex',
                                                                    flexDirection: 'column',
                                                                    justifyContent: 'flex-start',
                                                                }}
                                                            >
                                                                <CardContent sx={{
                                                                    p: 1.5,
                                                                    width: '100%',
                                                                    display: 'flex',
                                                                    flexDirection: 'column',
                                                                    flexGrow: 0,
                                                                    overflowY: isExpanded(index) ? 'auto' : 'hidden',
                                                                }}>
                                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                                                                        <Typography variant="subtitle1" component="div" sx={{ fontWeight: 'bold' }}>
                                                                            Suggestion {index + 1}
                                                                        </Typography>
                                                                        {isExpanded(index) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                                                    </Box>
                                                                    {isExpanded(index) && (
                                                                        <Typography variant="body2" component="div" sx={{ mt: 1, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                                                            {suggestion}
                                                                        </Typography>
                                                                    )}
                                                                </CardContent>
                                                            </CardActionArea>
                                                        </Card>
                                                    </Grid>
                                                ))}
                                            </Grid>
                                        </Box>
                                    );
                                })()}
                            </Box>
                        </Box>
                    )}
                </Paper>
            </Box>
            <ConfirmationDialog
                open={deleteConfirmOpen && entryToDelete?.date === selectedEntry.date}
                onClose={onCloseDeleteConfirm}
                onConfirm={onConfirmDeleteEntry}
                title="Confirm Deletion"
                contentText="Are you sure you want to delete this journal entry? This action cannot be undone."
                confirmButtonText="Delete"
                confirmButtonColor="error"
                ConfirmButtonIcon={DeleteIcon}
            />
        </>
    );
}

export default JournalEntryView;
