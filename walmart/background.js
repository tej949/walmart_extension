// Background service worker for context attestation and token management

// API endpoints for different shopping sites
const API_ENDPOINTS = {
  'walmart.com': 'https://api.walmart.com/secure-context',
  'amazon.com': 'https://api.amazon.com/secure-context',
  'target.com': 'https://api.target.com/secure-context',
  'bestbuy.com': 'https://api.bestbuy.com/secure-context',
  'ebay.com': 'https://api.ebay.com/secure-context',
  'costco.com': 'https://api.costco.com/secure-context'
};

// Helper function to get API endpoint for current site
function getApiEndpoint(url) {
  const domain = new URL(url).hostname.replace('www.', '');
  const site = Object.keys(API_ENDPOINTS).find(site => domain.includes(site));
  return site ? API_ENDPOINTS[site] : null;
}
let deviceKeyPair = null;

// Initialize device key pair on installation
chrome.runtime.onInstalled.addListener(async () => {
  deviceKeyPair = await generateDeviceKeyPair();
  await chrome.storage.local.set({ publicKey: deviceKeyPair.publicKey });
});

// Generate device-bound key pair using Web Crypto API
async function generateDeviceKeyPair() {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: 'ECDSA',
      namedCurve: 'P-256'
    },
    true,
    ['sign', 'verify']
  );
  return keyPair;
}

// Collect sensor data and generate context snapshot
async function collectContextData() {
  return new Promise((resolve, reject) => {
    Promise.all([
      getGeolocationData(),
      getWiFiData(),
      getMotionSignature(),
      getPOSTerminalBeacon()
    ])
    .then(async ([location, wifiData, motionData, posData]) => {
      const contextData = {
        location,
        wifi_fingerprint: wifiData,
        motion_signature: motionData,
        pos_terminal: posData,
        timestamp: Date.now()
      };
      
      const contextHash = await generateContextHash(contextData);
      const consistencyScore = await computeConsistencyScore(contextData);
      
      resolve({
        contextData,
        contextHash,
        consistencyScore
      });
    })
    .catch(reject);
  });
}

// Get geolocation data
async function getGeolocationData() {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
      },
      reject,
      { enableHighAccuracy: true, maximumAge: 0 }
    );
  });
}

// Get Wi-Fi fingerprint data
async function getWiFiData() {
  // Note: This is a mock implementation since Web APIs don't provide direct Wi-Fi access
  // In a real mobile app, we would use native APIs to get actual Wi-Fi data
  return {
    nearby_networks: [],
    connection_strength: 0,
    timestamp: Date.now()
  };
}

// Record motion signature
async function getMotionSignature() {
  return new Promise((resolve) => {
    // Note: This is a mock implementation since we're in a browser extension
    // In a real mobile app, we would use device motion and orientation sensors
    resolve({
      acceleration: { x: 0, y: 0, z: 0 },
      rotation: { alpha: 0, beta: 0, gamma: 0 },
      timestamp: Date.now()
    });
  });
}

// Get POS terminal beacon data
async function getPOSTerminalBeacon() {
  // Note: This is a mock implementation
  // In a real implementation, we would use Web Bluetooth or native APIs
  return {
    terminal_id: null,
    signal_strength: 0,
    timestamp: Date.now()
  };
}

// Compute AI consistency score for sensor fusion data
async function computeConsistencyScore(contextData) {
  // Implement on-device AI to evaluate data consistency
  const scores = {
    location_consistency: evaluateLocationConsistency(contextData.location),
    temporal_consistency: evaluateTemporalConsistency(contextData),
    motion_consistency: evaluateMotionConsistency(contextData.motion_signature),
    network_consistency: evaluateNetworkConsistency(contextData.wifi_fingerprint)
  };

  // Weighted average of individual scores
  return Object.values(scores).reduce((a, b) => a + b, 0) / Object.keys(scores).length;
}

// Individual consistency evaluators
function evaluateLocationConsistency(location) {
  return location.accuracy <= 20 ? 1.0 : 0.5; // Higher score for more accurate locations
}

function evaluateTemporalConsistency(contextData) {
  const timestamps = [
    contextData.timestamp,
    contextData.location.timestamp,
    contextData.wifi_fingerprint.timestamp,
    contextData.motion_signature.timestamp
  ];
  
  const maxDiff = Math.max(...timestamps) - Math.min(...timestamps);
  return maxDiff < 5000 ? 1.0 : 0.5; // Higher score for closely aligned timestamps
}

function evaluateMotionConsistency(motionData) {
  // In a real implementation, we would analyze motion patterns
  return 1.0;
}

function evaluateNetworkConsistency(wifiData) {
  // In a real implementation, we would analyze Wi-Fi fingerprint stability
  return 1.0;
}

// Generate hash of context data
async function generateContextHash(contextData) {
  const contextString = JSON.stringify(contextData);
  const encoder = new TextEncoder();
  const data = encoder.encode(contextString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Request ZKP token from backend
async function requestZKPToken(contextHash, consistencyScore, siteUrl) {
  if (!deviceKeyPair) {
    throw new Error('Device key pair not initialized');
  }

  const apiEndpoint = getApiEndpoint(siteUrl);
  if (!apiEndpoint) {
    throw new Error('Unsupported shopping site');
  }

  const signature = await signData(contextHash, deviceKeyPair.privateKey);
  
  const response = await fetch(`${apiEndpoint}/issue-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contextHash,
      signature,
      consistencyScore,
      publicKey: await exportPublicKey(deviceKeyPair.publicKey)
    })
  });

  if (!response.ok) {
    throw new Error('Failed to obtain ZKP token');
  }

  return response.json();
}

// Sign data with device private key
async function signData(data, privateKey) {
  const encoder = new TextEncoder();
  const signature = await window.crypto.subtle.sign(
    {
      name: 'ECDSA',
      hash: { name: 'SHA-256' },
    },
    privateKey,
    encoder.encode(data)
  );
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Export public key for sending to server
async function exportPublicKey(publicKey) {
  const exported = await window.crypto.subtle.exportKey('raw', publicKey);
  return Array.from(new Uint8Array(exported))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Handle context verification requests from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'VERIFY_CONTEXT') {
    const siteUrl = sender.tab.url;
    collectContextData()
      .then(async ({ contextHash, consistencyScore }) => {
        try {
          const token = await requestZKPToken(contextHash, consistencyScore, siteUrl);
          sendResponse({ success: true, token });
        } catch (error) {
          if (error.message === 'Unsupported shopping site') {
            console.warn(`Context verification skipped: ${error.message}`);
            sendResponse({ success: true, token: { token: null, consistencyScore: 0 } });
          } else {
            throw error;
          }
        }
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    return true; // Indicate async response
  }
});