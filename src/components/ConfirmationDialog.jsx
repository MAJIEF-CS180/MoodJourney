import React from 'react';
import {
    Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle
} from '@mui/material';

function ConfirmationDialog({
    open,
    onClose,
    onConfirm,
    title,
    contentText,
    confirmButtonText = "Confirm",
    confirmButtonColor = "primary",
    ConfirmButtonIcon,
    cancelButtonText = "Cancel"
}) {
    return (
        <Dialog
            open={open}
            onClose={onClose}
            aria-labelledby="confirmation-dialog-title"
            aria-describedby="confirmation-dialog-description"
        >
            <DialogTitle id="confirmation-dialog-title">{title}</DialogTitle>
            <DialogContent>
                <DialogContentText id="confirmation-dialog-description">
                    {contentText}
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="inherit" variant="outlined">
                    {cancelButtonText}
                </Button>
                <Button
                    onClick={onConfirm}
                    color={confirmButtonColor}
                    variant="contained"
                    startIcon={ConfirmButtonIcon ? <ConfirmButtonIcon /> : null}
                    autoFocus
                >
                    {confirmButtonText}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export default ConfirmationDialog;
