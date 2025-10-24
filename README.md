# walmart_extension
# Walmart Secure Context Attestation Extension

A Chrome extension implementing a secure context attestation system to prevent fraud through location and device spoofing. This extension uses sensor fusion, device-bound cryptography, and Zero-Knowledge Proofs (ZKP) to ensure genuine in-store presence.

## Features

### Context Attestation
- Real-time geolocation verification
- Device motion pattern analysis (mobile implementation)
- Secure context hash generation
- Privacy-preserving sensor data handling

### Security Measures
- Device-bound key pairs stored in secure storage
- Dynamic ZKP tokens with short expiration
- Cryptographic signing of context data
- TLS-secured API communication

### Device Management
- Multi-device enrollment support
- QR code-based device pairing
- Device revocation capabilities
- Secure key storage and management

## Installation

### Developer Mode Installation
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked" and select the extension directory

### Usage
1. The extension will automatically activate when visiting Walmart store pages
2. Context verification runs automatically every 25 seconds
3. View status and manage devices through the extension popup
4. Use the popup interface to enroll additional devices or revoke access

## Security Considerations

- Private keys never leave the device's secure storage
- Context data is hashed locally before transmission
- ZKP tokens expire after 30 seconds
- All API communications use HTTPS
- Device enrollment requires owner approval

## Development

### Project Structure
```
├── manifest.json           # Extension configuration
├── background.js          # Service worker for context verification
├── content.js             # Website integration
├── popup.html             # Device management UI
├── popup.js               # UI logic
└── icons/                 # Extension icons
    ├── icon16.svg
    ├── icon48.svg
    └── icon128.svg
```

### API Endpoints
The extension communicates with the following endpoints:
- `/issue-token`: Request new ZKP tokens
- `/verify-token`: Validate existing tokens
- `/generate-enrollment`: Create device enrollment tokens
- `/revoke-device`: Remove device access

### Building for Production
1. Ensure all files are present and properly configured
2. Update API endpoints in configuration
3. Test all features thoroughly
4. Package the extension for distribution

## Privacy

This extension is designed with privacy in mind:
- Only hashed sensor data is transmitted
- No raw location or motion data leaves the device
- Context verification is limited to store locations
- User can control device access and revocation

