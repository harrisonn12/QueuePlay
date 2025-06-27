import React from 'react';

/**
 * Gaming-themed loading spinner component
 * @param {Object} props
 * @param {string} [props.message="Loading..."] - Loading message to display
 * @param {string} [props.size="large"] - Size of the spinner (small, medium, large)
 */
const LoadingSpinner = ({ message = "Loading...", size = "large" }) => {
  const sizeClasses = {
    small: 'loading-spinner-small',
    medium: 'loading-spinner-medium',
    large: 'loading-spinner-large'
  };

  return (
    <div className="loading-container">
      <div className={`loading-spinner-gaming ${sizeClasses[size]}`}>
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
                 <div className="loading-icon"></div>
      </div>
      {message && (
        <p className="loading-message">{message}</p>
      )}
    </div>
  );
};

export default LoadingSpinner; 