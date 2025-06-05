import React from 'react';
import {
    Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField, CircularProgress
} from '@mui/material';

function PinModal({
    open,
    onClose,
    pinAction,
    pinInput,
    onPinInputChange,
    pinError,
    onSubmitPin,
    saving
}) {
    let pinModalTitle = "PIN";
    if (pinAction === 'create') pinModalTitle = "Create New PIN";
    else if (pinAction === 'change') pinModalTitle = "Change PIN";
    else if (pinAction === 'unlock') pinModalTitle = "Enter PIN to Unlock";

    return (
        <Dialog
            open={open}
            onClose={pinAction === 'unlock' ? null : onClose}
            aria-labelledby="pin-dialog-title"
            disableEscapeKeyDown={pinAction === 'unlock'}
        >
            <DialogTitle id="pin-dialog-title">{pinModalTitle}</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    {pinAction === 'create' && "Enter a 4-digit PIN to secure your journal."}
                    {pinAction === 'change' && "Enter your new 4-digit PIN."}
                    {pinAction === 'unlock' && "Please enter your 4-digit PIN to continue."}
                </DialogContentText>
                <TextField
                    autoFocus
                    margin="dense"
                    id="pin"
                    label="PIN"
                    type="password"
                    fullWidth
                    variant="standard"
                    value={pinInput}
                    onChange={onPinInputChange}
                    error={!!pinError}
                    helperText={pinError}
                    inputProps={{
                        maxLength: 4,
                        inputMode: 'numeric',
                        pattern: '[0-9]*',
                        style: { textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5em' }
                    }}
                    sx={{ my: 2 }}
                />
            </DialogContent>
            <DialogActions>
                {pinAction !== 'unlock' && <Button onClick={onClose} disabled={saving}>Cancel</Button>}
                <Button onClick={onSubmitPin} disabled={saving || pinInput.length !== 4}>
                    {saving ? <CircularProgress size={24} /> : (pinAction === 'unlock' ? "Unlock" : "Submit")}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export default PinModal;
