// Popup script for managing device enrollment and status display

const API_ENDPOINT = 'https://api.walmart.com/secure-context';

// Initialize popup with animations
document.addEventListener('DOMContentLoaded', async () => {
  animateStatusCard();
  await updateStatus();
  loadDeviceInfo();
  setupEventListeners();
});

// Set up event listeners with ripple effect
function setupEventListeners() {
  const buttons = document.querySelectorAll('.button');
  buttons.forEach(button => {
    button.addEventListener('click', createRippleEffect);
  });

  document.getElementById('enrollDevice').addEventListener('click', startDeviceEnrollment);
  document.getElementById('revokeDevice').addEventListener('click', revokeDevice);
}

// Create ripple effect on button click
function createRippleEffect(event) {
  const button = event.currentTarget;
  const ripple = document.createElement('span');
  const rect = button.getBoundingClientRect();
  
  const size = Math.max(rect.width, rect.height);
  const x = event.clientX - rect.left - size / 2;
  const y = event.clientY - rect.top - size / 2;
  
  ripple.style.width = ripple.style.height = `${size}px`;
  ripple.style.left = `${x}px`;
  ripple.style.top = `${y}px`;
  ripple.className = 'ripple';
  
  button.appendChild(ripple);
  ripple.addEventListener('animationend', () => ripple.remove());
}

// Animate status card on load
function animateStatusCard() {
  const card = document.querySelector('.status-card');
  card.style.opacity = '0';
  card.style.transform = 'translateY(20px)';
  
  setTimeout(() => {
    card.style.transition = 'all 0.3s ease';
    card.style.opacity = '1';
    card.style.transform = 'translateY(0)';
  }, 100);
}

// Update context status display with animations
async function updateStatus() {
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const locationStatus = document.getElementById('locationStatus');

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const isStorePage = tab.url.includes('walmart.com/store/');

    if (isStorePage) {
      const response = await chrome.runtime.sendMessage({ type: 'VERIFY_CONTEXT' });

      if (response.success) {
        updateStatusWithAnimation(statusDot, statusText, locationStatus, {
          dot: 'active',
          text: 'Context Verified',
          location: 'Location: Verified In-Store'
        });
      } else {
        throw new Error(response.error);
      }
    } else {
      updateStatusWithAnimation(statusDot, statusText, locationStatus, {
        dot: 'inactive',
        text: 'Not in Store',
        location: 'Location: Outside Store'
      });
    }
  } catch (error) {
    updateStatusWithAnimation(statusDot, statusText, locationStatus, {
      dot: 'inactive',
      text: 'Verification Failed',
      location: 'Location: Unknown'
    });
    showError(error.message);
  }
}

// Animate status updates
function updateStatusWithAnimation(dot, text, location, status) {
  // Fade out
  [text, location].forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(-10px)';
  });

  setTimeout(() => {
    // Update content
    dot.className = `status-dot ${status.dot}`;
    text.textContent = status.text;
    location.textContent = status.location;

    // Fade in
    [text, location].forEach(el => {
      el.style.transition = 'all 0.3s ease';
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    });
  }, 300);
}

// Load and display device information with animation
async function loadDeviceInfo() {
  try {
    const { publicKey } = await chrome.storage.local.get('publicKey');
    if (publicKey) {
      const deviceIdElement = document.getElementById('deviceId');
      deviceIdElement.style.opacity = '0';
      
      setTimeout(() => {
        deviceIdElement.textContent = `${publicKey.slice(0, 20)}...${publicKey.slice(-20)}`;
        deviceIdElement.style.transition = 'opacity 0.3s ease';
        deviceIdElement.style.opacity = '1';
      }, 300);
    }
  } catch (error) {
    showError('Failed to load device information');
  }
}

// Start device enrollment process with animations
async function startDeviceEnrollment() {
  try {
    const { publicKey } = await chrome.storage.local.get('publicKey');
    
    const response = await fetch(`${API_ENDPOINT}/generate-enrollment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ publicKey })
    });

    if (!response.ok) {
      throw new Error('Failed to generate enrollment token');
    }

    const { enrollmentToken, enrollmentUrl } = await response.json();

    // Show QR container with animation
    const qrContainer = document.getElementById('qrContainer');
    qrContainer.style.display = 'block';
    qrContainer.style.opacity = '0';
    qrContainer.style.transform = 'translateY(20px)';

    setTimeout(() => {
      qrContainer.style.transition = 'all 0.3s ease';
      qrContainer.style.opacity = '1';
      qrContainer.style.transform = 'translateY(0)';

      // Generate and display QR code
      const qrCode = document.getElementById('qrCode');
      qrCode.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(enrollmentUrl)}&size=200x200" alt="Enrollment QR Code">`;

      // Display enrollment link with animation
      const enrollmentLink = document.getElementById('enrollmentLink');
      enrollmentLink.textContent = enrollmentUrl;
      enrollmentLink.style.opacity = '0';
      
      setTimeout(() => {
        enrollmentLink.style.transition = 'opacity 0.3s ease';
        enrollmentLink.style.opacity = '1';
      }, 300);
    }, 100);

  } catch (error) {
    showError('Failed to start device enrollment');
  }
}

// Revoke current device with confirmation
async function revokeDevice() {
  if (!confirm('Are you sure you want to revoke this device? This action cannot be undone.')) {
    return;
  }

  try {
    const { publicKey } = await chrome.storage.local.get('publicKey');
    
    const response = await fetch(`${API_ENDPOINT}/revoke-device`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ publicKey })
    });

    if (!response.ok) {
      throw new Error('Failed to revoke device');
    }

    // Clear local storage and reload with fade out animation
    document.body.style.opacity = '0';
    document.body.style.transform = 'translateY(-20px)';
    
    setTimeout(async () => {
      await chrome.storage.local.clear();
      chrome.runtime.reload();
    }, 300);

  } catch (error) {
    showError('Failed to revoke device');
  }
}

// Display error message with animation
function showError(message) {
  const errorElement = document.getElementById('errorMessage');
  const errorText = document.getElementById('errorText');
  
  errorElement.style.opacity = '0';
  errorElement.style.transform = 'translateY(-10px)';
  errorElement.style.display = 'flex';
  errorText.textContent = message;

  setTimeout(() => {
    errorElement.style.transition = 'all 0.3s ease';
    errorElement.style.opacity = '1';
    errorElement.style.transform = 'translateY(0)';
  }, 100);

  // Auto-hide error after 5 seconds
  setTimeout(() => {
    errorElement.style.opacity = '0';
    errorElement.style.transform = 'translateY(-10px)';
    
    setTimeout(() => {
      errorElement.style.display = 'none';
    }, 300);
  }, 5000);
}