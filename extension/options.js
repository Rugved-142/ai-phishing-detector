document.addEventListener('DOMContentLoaded', async () => {
  const apiKeyInput = document.getElementById('apiKey');
  const enableAICheckbox = document.getElementById('enableAI');
  const saveBtn = document.getElementById('saveBtn');
  const testBtn = document.getElementById('testBtn');
  const statusDiv = document.getElementById('status');
  const aiStatusSpan = document.getElementById('aiStatus');
  
  // Load current settings
  const settings = await chrome.storage.local.get(['aiSettings']);
  if (settings.aiSettings) {
    apiKeyInput.value = settings.aiSettings.apiKey || '';
    enableAICheckbox.checked = settings.aiSettings.enableAI || false;
    updateAIStatus(settings.aiSettings.enableAI && settings.aiSettings.apiKey);
  }
  
  // Save settings
  saveBtn.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();
    
    await chrome.storage.local.set({
      aiSettings: {
        apiKey: apiKey,
        enableAI: enableAICheckbox.checked && apiKey !== '',
        onboardingComplete: true
      }
    });
    
    showStatus('Settings saved!', 'success');
    updateAIStatus(enableAICheckbox.checked && apiKey);
  });
  
  // Test API key
  testBtn.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();
    
    if (!apiKey) {
      showStatus('Please enter an API key', 'error');
      return;
    }
    
    showStatus('Testing API key...', 'success');
    testBtn.disabled = true;
    
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: 'Hello, can you confirm this API key is working?'
              }]
            }],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 100
            }
          })
        }
      );
      
      const responseText = await response.text();
      console.log('API Test Response:', response.status, responseText);
      
      if (response.ok) {
        const data = JSON.parse(responseText);
        if (data.candidates && data.candidates[0]) {
          showStatus('✅ API key is valid and working!', 'success');
          updateAIStatus(true);
        } else {
          showStatus('❌ API key valid but unexpected response format', 'error');
          updateAIStatus(false);
        }
      } else {
        let errorMessage = '❌ API key test failed';
        try {
          const errorData = JSON.parse(responseText);
          if (errorData.error && errorData.error.message) {
            errorMessage += `: ${errorData.error.message}`;
          }
        } catch (e) {
          errorMessage += ` (Status: ${response.status})`;
        }
        showStatus(errorMessage, 'error');
        updateAIStatus(false);
      }
    } catch (error) {
      console.error('API Test Error:', error);
      showStatus('❌ Connection failed: ' + error.message, 'error');
      updateAIStatus(false);
    } finally {
      testBtn.disabled = false;
    }
  });
  
  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.style.display = 'block';
    
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 3000);
  }
  
  function updateAIStatus(isActive) {
    aiStatusSpan.className = 'ai-status ' + (isActive ? 'active' : 'inactive');
    aiStatusSpan.textContent = isActive ? 'AI Active' : 'AI Inactive';
  }
});