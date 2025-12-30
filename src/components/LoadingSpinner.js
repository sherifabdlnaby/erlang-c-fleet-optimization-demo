import React from 'react';
import './LoadingSpinner.css';

function LoadingSpinner({ size = 'medium', message = 'Loading...', fullScreen = false }) {
  return (
    <div 
      className={`loading-container ${fullScreen ? 'loading-fullscreen' : ''}`}
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      <div className={`spinner spinner-${size}`}>
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
      </div>
      {message && <p className="loading-message">{message}</p>}
    </div>
  );
}

export default LoadingSpinner;
