import React, { useState, useEffect } from 'react';
import {
    Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Typography, Box, CircularProgress
} from '@mui/material';
import { styled } from '@mui/material/styles';

const Input = styled('input')({
    display: 'none',
});

function ImageUploadModal({
    open,
    onClose,
    currentImagePath,
    onConfirmUpload,
    savingImage
}) {
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);

    useEffect(() => {
        if (open) {
            setSelectedFile(null);
            setPreviewUrl(null);
        }
    }, [open]);

    useEffect(() => {
        if (!selectedFile) {
            setPreviewUrl(null);
            return;
        }
        const objectUrl = URL.createObjectURL(selectedFile);
        setPreviewUrl(objectUrl);

        return () => URL.revokeObjectURL(objectUrl);
    }, [selectedFile]);

    const handleFileChange = (event) => {
        if (event.target.files && event.target.files[0]) {
            setSelectedFile(event.target.files[0]);
        } else {
            setSelectedFile(null);
        }
    };

    const handleConfirm = () => {
        if (selectedFile) {
            onConfirmUpload(selectedFile);
        }
    };

    const handleCancel = () => {
        setSelectedFile(null);
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleCancel} aria-labelledby="image-upload-dialog-title" maxWidth="xs" fullWidth>
            <DialogTitle id="image-upload-dialog-title">Upload Journal Image</DialogTitle>
            <DialogContent>
                <DialogContentText sx={{ mb: 2 }}>
                    {currentImagePath ? `Current image: ${currentImagePath.split('/').pop()}` : "No image currently associated with this entry."}
                </DialogContentText>

                {previewUrl && (
                    <Box sx={{ mb: 2, textAlign: 'center', border: '1px dashed grey', padding: 1, borderRadius: 1 }}>
                        <Typography variant="caption">New image preview:</Typography>
                        <img src={previewUrl} alt="New selection preview" style={{ display: 'block', maxWidth: '100%', maxHeight: '200px', marginTop: '8px', margin: 'auto' }} />
                    </Box>
                )}

                <label htmlFor="image-upload-file-input">
                    <Input accept="image/*" id="image-upload-file-input" type="file" onChange={handleFileChange} />
                    <Button 
                        variant="contained" 
                        component="span" 
                        fullWidth 
                        disabled={savingImage}
                        color={selectedFile ? "secondary" : "primary"}
                    >
                        {selectedFile ? `Change: ${selectedFile.name}` : "Choose Image"}
                    </Button>
                </label>
            </DialogContent>
            <DialogActions sx={{p: '16px 24px'}}>
                <Button onClick={handleCancel} disabled={savingImage} variant="outlined" color="inherit">Cancel</Button>
                <Button onClick={handleConfirm} color="primary" variant="contained" disabled={!selectedFile || savingImage}>
                    {savingImage ? <CircularProgress size={24} sx={{ color: 'inherit' }}/> : "Confirm Upload"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export default ImageUploadModal;