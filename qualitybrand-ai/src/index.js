import React from 'react';
import ReactDOM from 'react-dom/client';
import './App.css';
import App from './App';

// Create root element for React 18
const root = ReactDOM.createRoot(document.getElementById('root'));

// Render the QualityBrand AI application
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Performance monitoring (optional)
if (process.env.NODE_ENV === 'development') {
  console.log('🔍 QualityBrand AI - Development Mode');
  console.log('📊 AI-Powered Visual Inspection System');
  console.log('🏭 Built for Manufacturing Excellence');
}

// Service Worker registration for PWA capabilities (future enhancement)
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}