// Content script for integrating with shopping websites and handling context verification

// Define supported shopping domains and their API patterns
const SUPPORTED_SITES = {
  'walmart.com': {
    apiPattern: 'api.walmart.com',
    storePattern: '/store/'
  },
  'amazon.com': {
    apiPattern: 'api.amazon.com',
    storePattern: '/dp/'
  },
  'target.com': {
    apiPattern: 'api.target.com',
    storePattern: '/p/'
  },
  'bestbuy.com': {
    apiPattern: 'api.bestbuy.com',
    storePattern: '/products/'
  },
  'ebay.com': {
    apiPattern: 'api.ebay.com',
    storePattern: '/itm/'
  },
  'costco.com': {
    apiPattern: 'api.costco.com',
    storePattern: '/product/'
  }
};

// Helper function to get current site configuration
function getCurrentSite() {
  const currentDomain = window.location.hostname.replace('www.', '');
  return Object.entries(SUPPORTED_SITES).find(([domain]) => currentDomain.includes(domain));
}

// Initialize context verification
let activeToken = null;
let verificationInterval = null;
let consistencyThreshold = 0.7; // Minimum required consistency score

// Start periodic context verification
function startContextVerification() {
  // Clear any existing interval
  if (verificationInterval) {
    clearInterval(verificationInterval);
  }

  // Verify context immediately
  verifyContext();

  // Set up periodic verification (every 25 seconds since tokens expire in 30)
  verificationInterval = setInterval(verifyContext, 25000);
}

// Stop context verification
function stopContextVerification() {
  if (verificationInterval) {
    clearInterval(verificationInterval);
    verificationInterval = null;
  }
  activeToken = null;
  notifyPageContextStatus('inactive');
}

// Verify context and obtain new token
async function verifyContext() {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'VERIFY_CONTEXT'
    });

    if (response.success && response.token.consistencyScore >= consistencyThreshold) {
      activeToken = response.token;
      // Inject token into page for API requests
      injectTokenToPage(activeToken);
      notifyPageContextStatus('active', response.token.consistencyScore);
    } else {
      console.error('Context verification failed:', 
        response.success ? 'Insufficient consistency score' : response.error);
      handleVerificationFailure(response.token?.consistencyScore);
    }
  } catch (error) {
    console.error('Error during context verification:', error);
    handleVerificationFailure();
  }
}

// Inject token into page for API requests
function injectTokenToPage(token) {
  const script = document.createElement('script');
  script.textContent = `
    window.secureContextToken = ${JSON.stringify(token)};
    // Dispatch event to notify page of new token
    window.dispatchEvent(new CustomEvent('secureContextTokenUpdated', {
      detail: { 
        token: window.secureContextToken,
        consistencyScore: ${token.consistencyScore}
      }
    }));
  `;
  document.head.appendChild(script);
  script.remove();
}

// Notify page of context status changes
function notifyPageContextStatus(status, consistencyScore = 0) {
  const script = document.createElement('script');
  script.textContent = `
    window.dispatchEvent(new CustomEvent('secureContextStatusChanged', {
      detail: { 
        status: '${status}',
        consistencyScore: ${consistencyScore}
      }
    }));
  `;
  document.head.appendChild(script);
  script.remove();
}

// Handle verification failure
function handleVerificationFailure(consistencyScore = 0) {
  activeToken = null;
  
  // Notify page that context verification failed
  const script = document.createElement('script');
  script.textContent = `
    window.secureContextToken = null;
    window.dispatchEvent(new CustomEvent('secureContextVerificationFailed', {
      detail: { 
        reason: ${consistencyScore ? '"Insufficient consistency score"' : '"Verification error"'},
        consistencyScore: ${consistencyScore}
      }
    }));
  `;
  document.head.appendChild(script);
  script.remove();
}

// Listen for navigation events to start/stop verification
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'NAVIGATION_CHANGE') {
    if (request.inStore) {
      startContextVerification();
    } else {
      stopContextVerification();
    }
  }
});

// Intercept and modify API requests to include context token
const originalFetch = window.fetch;
window.fetch = async function(...args) {
  const currentSite = getCurrentSite();
  if (currentSite && args[0].includes(currentSite[1].apiPattern)) {
    const request = args[1] || {};
    request.headers = request.headers || {};
    
    if (activeToken) {
      request.headers['X-Secure-Context-Token'] = activeToken.token;
      request.headers['X-Context-Consistency-Score'] = activeToken.consistencyScore.toString();
      // Add site-specific header
      request.headers['X-Shopping-Site'] = currentSite[0];
    }
    
    args[1] = request;
  }
  
  return originalFetch.apply(this, args);
};

// Initialize context verification if we're on a supported store page
const currentSite = getCurrentSite();
if (currentSite && window.location.href.includes(currentSite[1].storePattern)) {
  startContextVerification();
}