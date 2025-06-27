import React from 'react';

/**
 * Component for displaying a QR code image
 * @param {Object} props
 * @param {string} props.qrCodeData - Base64 encoded QR code image data
 * @param {string} [props.alt="Scan to join game"] - Alt text for the QR code image
 * @param {number} [props.size=200] - Size of the QR code in pixels
 */
const QRCodeDisplay = ({ qrCodeData, alt = "Scan to join game", size = 200 }) => {
  if (!qrCodeData) {
    return (
      <div className="qr-code-container">
        <div className="qr-code-placeholder" style={{ width: size, height: size }}>
          <div className="loading-spinner"></div>
          <p>Generating QR Code...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="qr-code-container">
      <div className="qr-code-frame">
        <img 
          src={`data:image/jpeg;base64,${qrCodeData}`}
          alt={alt}
          width={size}
          height={size}
          className="qr-code-image"
        />
      </div>
      <p className="qr-code-instructions">
        Scan this QR code to join the game
      </p>
    </div>
  );
};

export default QRCodeDisplay;