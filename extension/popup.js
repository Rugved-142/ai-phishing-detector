document.addEventListener('DOMContentLoaded', async () => {
  const statusEl = document.getElementById('status');
  const checkBtn = document.getElementById('check');
  
  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  // Display URL
  const urlDisplay = document.createElement('div');
  urlDisplay.style.fontSize = '12px';
  urlDisplay.style.marginTop = '10px';
  urlDisplay.style.wordBreak = 'break-all';
  urlDisplay.textContent = tab.url;
  statusEl.parentElement.insertBefore(urlDisplay, statusEl.nextSibling);
  
  // Get stored analysis for this site
  if (tab.url) {
    const hostname = new URL(tab.url).hostname;
    const result = await chrome.storage.local.get([hostname]);
    
    if (result[hostname]) {
      displayAnalysis(result[hostname]);
    } else {
      statusEl.textContent = 'Not analyzed yet';
    }
  }
  
  // Check button functionality
  checkBtn.addEventListener('click', async () => {
    statusEl.textContent = 'Analyzing...';
    
    // Reload tab to trigger fresh analysis
    await chrome.tabs.reload(tab.id);
    
    // Wait for analysis
    setTimeout(async () => {
      const hostname = new URL(tab.url).hostname;
      const result = await chrome.storage.local.get([hostname]);
      
      if (result[hostname]) {
        displayAnalysis(result[hostname]);
      }
    }, 2000);
  });
  
  function displayAnalysis(data) {
    const { riskScore, features } = data;
    
    // Update status with risk score
    statusEl.innerHTML = `Risk Score: <strong>${riskScore}%</strong>`;
    
    // Color code based on risk
    if (riskScore < 30) {
      statusEl.style.color = 'green';
      statusEl.innerHTML += ' ✅ (Safe)';
    } else if (riskScore < 60) {
      statusEl.style.color = 'orange';
      statusEl.innerHTML += ' ⚠️ (Caution)';
    } else {
      statusEl.style.color = 'red';
      statusEl.innerHTML += ' 🚨 (Dangerous)';
    }
    
    // Show risk factors
    const factors = document.createElement('div');
    factors.style.marginTop = '15px';
    factors.style.fontSize = '12px';
    factors.innerHTML = '<strong>Risk Factors:</strong><br>';
    
    if (!features.isHTTPS) {
      factors.innerHTML += '• Not using HTTPS<br>';
    }
    if (features.hasIP) {
      factors.innerHTML += '• Uses IP address<br>';
    }
    if (features.hasSuspiciousWords) {
      factors.innerHTML += '• Suspicious keywords<br>';
    }
    if (features.hasPasswordField && !features.isHTTPS) {
      factors.innerHTML += '• Insecure password field<br>';
    }
    
    document.body.appendChild(factors);
  }
});