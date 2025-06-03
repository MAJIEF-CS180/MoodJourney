import React, { useState, useEffect, useRef } from 'react';
import { invoke } from "@tauri-apps/api/core";
import {
    Box, Button, Paper, Typography, CircularProgress, TextField, IconButton,
    List, ListItem, ListItemButton, ListItemIcon, ListItemText, Menu, MenuItem,
    Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import SendIcon from '@mui/icons-material/Send';
import ChatIcon from '@mui/icons-material/Chat';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteIcon from '@mui/icons-material/Delete';
import { scrollbarStyles, formatChatTimestamp } from '../utils';
import ConfirmationDialog from './ConfirmationDialog';


function AssistantPage({ theme, setStatus, onBack }) {
    const [messages, setMessages] = useState([]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const [chatSessions, setChatSessions] = useState([]);
    const [currentSessionId, setCurrentSessionId] = useState(null);
    const [isLoadingSessions, setIsLoadingSessions] = useState(true);
    const [isLoadingChatMessages, setIsLoadingChatMessages] = useState(false);

    const [menuAnchorEl, setMenuAnchorEl] = useState(null);
    const [openedMenuSessionId, setOpenedMenuSessionId] = useState(null);

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

    const handleDeleteChatClick = (sessionId) => {
        if (!sessionId) {
            setStatus({ message: "Cannot delete: Invalid chat session.", severity: "error" });
            return;
        }
        setChatSessionToDeleteId(sessionId);
        setDeleteChatConfirmOpen(true);
        handleMenuClose();
    };

    const handleCloseDeleteChatConfirm = () => {
        setDeleteChatConfirmOpen(false);
        setChatSessionToDeleteId(null);
    };

    const handleConfirmDeleteChat = async () => {
        if (!chatSessionToDeleteId) {
            setStatus({ message: "Cannot delete: No chat session selected.", severity: "error" });
            handleCloseDeleteChatConfirm();
            return;
        }

        const sessionWasCurrentlySelected = chatSessionToDeleteId === currentSessionId;

        try {
            await invoke("delete_chat_session_cmd", { sessionId: chatSessionToDeleteId });
            setStatus({ message: "Chat session deleted successfully.", severity: "success" });
            await fetchChatSessions(sessionWasCurrentlySelected);

        } catch (error) {
            console.error("Failed to delete chat session:", error);
            setStatus({ message: `Failed to delete chat: ${error.message || String(error)}`, severity: "error" });
        } finally {
            handleCloseDeleteChatConfirm();
        }
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
            setMessages(formatted.length > 0 ? formatted : [{ id: `empty-${sessionId}-${Date.now()}`, sender: 'assistant', text: "This chat is empty. Send a message to start!" }]);
        } catch (error) {
            console.error(`Failed to load messages for session ${sessionId}:`, error);
            setStatus({ message: `Failed to load messages: ${error.message || String(error)}`, severity: "error" });
            setMessages([{ id: `error-${Date.now()}`, sender: 'assistant', text: "Could not load chat messages." }]);
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
                 setMessages(prevMessages => {
                    const filteredMessages = prevMessages.filter(msg => msg.id !== optimisticUserMessage.id);
                    return [...filteredMessages, optimisticUserMessage, newAssistantMessage];
                });
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
                <Paper sx={{
                    p: 1,
                    flex: { xs: '1 1 auto', md: '2 1 0%' },
                    minWidth: 0,
                    borderRadius: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    position: 'relative'
                }}>
                    {isLoadingChatMessages && (
                        <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', bgcolor: alpha(theme.palette.background.paper, 0.7), zIndex: 10, borderRadius: '16px' }}>
                            <CircularProgress />
                        </Box>
                    )}
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
                        {isLoading && messages.length > 0 && messages[messages.length - 1].sender === 'user' && (
                            <Box sx={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Paper elevation={1} sx={{ p: 1.5, borderRadius: '12px', bgcolor: alpha(theme.palette.secondary.main, 0.2), color: theme.palette.text.primary, border: `1px solid ${theme.palette.secondary.main}` }}>
                                    <CircularProgress size={20} color="inherit" sx={{ color: theme.palette.text.primary }} />
                                    <Typography variant="body2" sx={{ ml: 1, display: 'inline', color: theme.palette.text.primary }}>Assistant is typing...</Typography>
                                </Paper>
                            </Box>
                        )}
                        <div ref={messagesEndRef} />
                    </Box>
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
                    <Box sx={{ pt: 1, pb: 1, px: 2, flexShrink: 0 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'left', display: 'block' }}>
                            Assistant can make mistakes. Please do not consult it for professional advice, and make sure to verify all information.
                        </Typography>
                    </Box>
                </Paper>

                <Paper sx={{ p: 1, flex: { xs: '1 1 auto', md: '1 1 0%' }, minWidth: 0, borderRadius: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {isLoadingSessions ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1, pt: 2 }}><CircularProgress /></Box>
                    ) : chatSessions.length === 0 ? (
                        <Typography sx={{ p: 2, textAlign: 'center', color: 'text.secondary', flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>No chat history.</Typography>
                    ) : (
                        <List sx={{ overflowY: 'auto', flexGrow: 1, ...scrollbarStyles(theme), p: 0, '& .MuiListItemButton-root': { pt: 0.75, pb: 0.75 } }}>
                            {chatSessions.map(session => (
                                <ListItem
                                    key={session.id}
                                    disablePadding
                                    sx={{ px: 0.5, mb: 0.5 }}
                                    secondaryAction={
                                        <IconButton edge="end" aria-label="options" onClick={(event) => handleMenuOpen(event, session.id)}>
                                            <MoreVertIcon />
                                        </IconButton>
                                    }
                                >
                                    <ListItemButton
                                        selected={session.id === currentSessionId}
                                        onClick={() => handleSessionSelect(session.id)}
                                        sx={{ borderRadius: '8px', pr: openedMenuSessionId === session.id ? '48px' : 'inherit', '&.Mui-selected': { bgcolor: alpha(theme.palette.primary.main, 0.15), '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2) } }, '&:hover': { bgcolor: alpha(theme.palette.action.hover, 0.5) } }}
                                    >
                                        <ListItemIcon sx={{ minWidth: 'auto', mr: 1.5, color: session.id === currentSessionId ? theme.palette.primary.main : theme.palette.text.secondary }}>
                                            <ChatIcon fontSize="small" />
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={session.title || "Chat"}
                                            primaryTypographyProps={{
                                                noWrap: true,
                                                sx: { fontWeight: session.id === currentSessionId ? 'bold' : 'normal', fontSize: '0.9rem', color: session.id === currentSessionId ? theme.palette.primary.main : theme.palette.text.primary }
                                            }}
                                            secondary={formatChatTimestamp(session.last_modified_at)}
                                            secondaryTypographyProps={{ noWrap: true, fontSize: '0.75rem' }}
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
                    <MenuItem onClick={() => handleDeleteChatClick(openedMenuSessionId)}>
                        <ListItemIcon>
                            <DeleteIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>Delete Chat</ListItemText>
                    </MenuItem>
                </Menu>
            </Box>
            <ConfirmationDialog
                open={deleteChatConfirmOpen}
                onClose={handleCloseDeleteChatConfirm}
                onConfirm={handleConfirmDeleteChat}
                title="Confirm Deletion"
                contentText="Are you sure you want to delete this chat session? This action cannot be undone."
                confirmButtonText="Delete"
                confirmButtonColor="error"
                ConfirmButtonIcon={DeleteIcon}
            />
        </>
    );
}

export default AssistantPage;
