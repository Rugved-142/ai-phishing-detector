document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput = document.getElementById('apiKey');
  const saveBtn = document.getElementById('saveBtn');
  const skipBtn = document.getElementById('skipBtn');
  const statusDiv = document.getElementById('status');
  
  // Save API key
  saveBtn.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();
    
    if (!apiKey) {
      showStatus('Please enter your API key', 'error');
      return;
    }
    
    // Quick validation - API key should start with AIzaSy
    if (!apiKey.startsWith('AIzaSy')) {
      showStatus('Invalid API key format', 'error');
      return;
    }
    
    // Save settings
    await chrome.storage.local.set({
      aiSettings: {
        apiKey: apiKey,
        enableAI: true,
        onboardingComplete: true
      }
    });
    
    showStatus('✅ Setup complete! You can close this tab.', 'success');
    
    // Close tab after 2 seconds
    setTimeout(() => {
      window.close();
    }, 2000);
  });
  
  // Skip setup
  skipBtn.addEventListener('click', async () => {
    await chrome.storage.local.set({
      aiSettings: {
        apiKey: '',
        enableAI: false,
        onboardingComplete: true
      }
    });
    
    showStatus('You can add your API key later in settings', 'success');
    
    setTimeout(() => {
      window.close();
    }, 2000);
  });
  
  // Show status message
  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.style.display = 'block';
  }
  
  // Allow Enter key to save
  apiKeyInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      saveBtn.click();
    }
  });
});