import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Import MUI Theme and CSS Baseline components
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

// Import Inter font (ensure you installed @fontsource/inter)
import '@fontsource/inter/300.css'; // Light
import '@fontsource/inter/400.css'; // Regular
import '@fontsource/inter/500.css'; // Medium
import '@fontsource/inter/700.css'; // Bold

// Define a basic Material Design 3 theme using Inter font
const md3Theme = createTheme({
  // Example: Using Material 3 baseline palette colors
  palette: {
    mode: 'light', // or 'dark'
    primary: {
      main: '#23325A', // Updated primary color
    },
    secondary: {
      main: '#625B71', // Example M3 secondary color (kept the same)
    },
    background: {
      default: '#F3EEEB', // Updated default background color
      paper: '#F3EEEB',   // Updated paper background color
    },
    // Add other M3 color roles like tertiary, error, surface variants etc. if needed
  },
  typography: {
    // Use Inter as the primary font
    fontFamily: '"Inter", Arial, sans-serif',
  },
  // Add shape, motion, etc. customizations here for M3
  shape: {
    borderRadius: 12, // Example: Slightly larger border radius common in M3
  },
  components: {
    // Example: Default props for Button to match M3 style
    MuiButton: {
        defaultProps: {
            disableElevation: true, // M3 buttons often have no elevation unless specified
        },
        styleOverrides: {
            root: {
                textTransform: 'none', // Buttons often aren't fully uppercase in M3
                borderRadius: 20, // Fully rounded pill shape for some M3 buttons
            },
            contained: { // Style specific variants
                 borderRadius: 20,
            }
        }
    },
    MuiTextField: {
        defaultProps: {
            variant: 'filled', // Filled is a common M3 text field style
        },
         styleOverrides: {
            root: {
                // Remove the default underline in filled variant if desired
                '& .MuiFilledInput-underline:before': {
                    borderBottom: 'none',
                },
                 '& .MuiFilledInput-underline:after': {
                    borderBottom: 'none',
                },
                 '& .MuiFilledInput-underline:hover:not(.Mui-disabled):before': {
                    borderBottom: 'none',
                },
                 // Adjust TextField background for new theme background
                 '& .MuiFilledInput-root': {
                    backgroundColor: 'rgba(0, 0, 0, 0.04)', // Keep a slight contrast or adjust as needed
                    borderRadius: '4px 4px 0 0', // M3 specific rounding
                     '&:hover': {
                        backgroundColor: 'rgba(0, 0, 0, 0.08)',
                    },
                    '&.Mui-focused': {
                        backgroundColor: 'rgba(0, 0, 0, 0.08)',
                    },
                }
            }
        }
    },
     MuiPaper: {
        styleOverrides: {
            // Ensure Paper component uses the theme's paper background
            root: {
                 backgroundColor: '#F3EEEB' // Explicitly set if needed, though theme should handle it
            }
        }
     }
    // Add customizations for other components (Card, List, etc.)
  }
});


ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* Wrap the App with ThemeProvider and apply the theme */}
    <ThemeProvider theme={md3Theme}>
      {/* CssBaseline kickstarts an elegant, consistent baseline */}
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>,
);
