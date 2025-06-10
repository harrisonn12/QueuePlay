import React from 'react';

/**
 * Base wrapper component that provides common layout and styling for all games
 * @param {Object} props
 * @param {React.ReactNode} props.children - Game-specific content
 * @param {string} [props.gameType] - Type of game for styling purposes
 * @param {string} [props.className] - Additional CSS classes
 */
const BaseGameWrapper = ({ children, gameType, className = '' }) => {
  return (
    <div className={`game-wrapper ${gameType ? `game-${gameType}` : ''} ${className}`}>
      <div className="game-content">
        {children}
      </div>
    </div>
  );
};

export default BaseGameWrapper; 