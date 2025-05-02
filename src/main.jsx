import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App'; // Import the App component

// Import Inter font (ensure you installed @fontsource/inter)
// These imports remain as they affect the global font availability
import '@fontsource/inter/300.css'; // Light
import '@fontsource/inter/400.css'; // Regular
import '@fontsource/inter/500.css'; // Medium
import '@fontsource/inter/700.css'; // Bold

// Render the App component. ThemeProvider and CssBaseline are now handled within App.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
