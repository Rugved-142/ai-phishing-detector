document.addEventListener('DOMContentLoaded', async () => {
  const statusEl = document.getElementById('status');
  const checkBtn = document.getElementById('check');
  
  // Check if AI is configured
  const aiSettings = await chrome.storage.local.get(['aiSettings']);
  const hasApiKey = aiSettings.aiSettings && aiSettings.aiSettings.apiKey;
  
  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  // Display URL
  const urlDisplay = document.createElement('div');
  urlDisplay.style.fontSize = '12px';
  urlDisplay.style.marginTop = '10px';
  urlDisplay.style.wordBreak = 'break-all';
  urlDisplay.style.color = '#666';
  urlDisplay.textContent = tab.url;
  statusEl.parentElement.insertBefore(urlDisplay, statusEl.nextSibling);
  
  // Show AI status indicator
  if (hasApiKey) {
    const aiIndicator = document.createElement('div');
    aiIndicator.style.cssText = `
      display: inline-block;
      background: #e8f0fe;
      color: #1967d2;
      padding: 3px 8px;
      border-radius: 12px;
      font-size: 11px;
      margin-top: 8px;
    `;
    aiIndicator.innerHTML = '🤖 AI Enabled';
    urlDisplay.appendChild(aiIndicator);
  }
  
  // Get stored analysis for this site
  if (tab.url) {
    try {
      const hostname = new URL(tab.url).hostname;
      const result = await chrome.storage.local.get([hostname]);
      
      if (result[hostname]) {
        displayAnalysis(result[hostname]);
      } else {
        statusEl.textContent = 'Not analyzed yet';
      }
    } catch (error) {
      statusEl.textContent = 'Cannot analyze this page';
    }
  }
  
  // Check button functionality
  checkBtn.addEventListener('click', async () => {
    statusEl.textContent = hasApiKey ? 'Analyzing with AI...' : 'Analyzing...';
    checkBtn.disabled = true;
    
    // Reload tab to trigger fresh analysis
    await chrome.tabs.reload(tab.id);
    
    // Wait for analysis
    setTimeout(async () => {
      const hostname = new URL(tab.url).hostname;
      const result = await chrome.storage.local.get([hostname]);
      
      if (result[hostname]) {
        displayAnalysis(result[hostname]);
      }
      checkBtn.disabled = false;
    }, hasApiKey ? 3000 : 2000);
  });
  
  // Add settings button
  const settingsBtn = document.createElement('button');
  settingsBtn.textContent = '⚙️ Settings';
  settingsBtn.style.cssText = `
    margin-top: 15px;
    padding: 8px 15px;
    background: #f1f3f4;
    color: #5f6368;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-size: 13px;
    width: 100%;
  `;
  settingsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
  document.body.appendChild(settingsBtn);
  
  function displayAnalysis(data) {
    const { riskScore, traditionalScore, features, riskFactors, brandCheck, aiAnalysis, performanceMetrics } = data;
    
    // Update status with risk score
    statusEl.innerHTML = `Risk Score: <strong>${riskScore}%</strong>`;
    
    // Show if AI was used
    if (aiAnalysis && aiAnalysis.success) {
      statusEl.innerHTML += ' <span style="color: #4285f4; font-size: 10px;">🤖</span>';
    }
    
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
    
    // Clear previous analysis details
    const existingDetails = document.querySelectorAll('.analysis-detail');
    existingDetails.forEach(el => el.remove());
    
    // Show AI insights if available
    if (aiAnalysis && aiAnalysis.success) {
      const aiInsights = document.createElement('div');
      aiInsights.className = 'analysis-detail';
      aiInsights.style.cssText = `
        margin-top: 15px;
        padding: 10px;
        background: #e8f0fe;
        border-left: 3px solid #4285f4;
        color: #1967d2;
        font-size: 12px;
        border-radius: 4px;
      `;
      aiInsights.innerHTML = `
        <strong>🤖 AI Analysis</strong><br>
        Confidence: ${aiAnalysis.confidence}%<br>
        Risk Level: ${aiAnalysis.riskLevel}<br>
        ${aiAnalysis.explanation ? `<em style="color: #333; margin-top: 5px; display: block;">${aiAnalysis.explanation}</em>` : ''}
      `;
      checkBtn.parentElement.insertBefore(aiInsights, settingsBtn);
    }
    
    // Show brand impersonation warning if detected
    if (brandCheck && brandCheck.isSuspicious) {
      const brandWarning = document.createElement('div');
      brandWarning.className = 'analysis-detail';
      brandWarning.style.cssText = `
        margin-top: 15px;
        padding: 10px;
        background: #ffebee;
        border-left: 3px solid #f44336;
        color: #c62828;
        font-size: 13px;
        border-radius: 4px;
      `;
      brandWarning.innerHTML = `
        <strong>⚠️ Brand Alert</strong><br>
        ${brandCheck.brandName ? `Possible ${brandCheck.brandName} impersonation` : 'Suspicious domain detected'}
      `;
      checkBtn.parentElement.insertBefore(brandWarning, settingsBtn);
    }
    
    // Show top risk factors
    if (riskFactors && riskFactors.length > 0) {
      const factors = document.createElement('div');
      factors.className = 'analysis-detail';
      factors.style.cssText = `
        margin-top: 15px;
        font-size: 12px;
        color: #555;
      `;
      factors.innerHTML = '<strong>Risk Factors:</strong><br>';
      
      riskFactors.slice(0, 3).forEach(factor => {
        const isAI = factor.startsWith('AI:');
        factors.innerHTML += `${isAI ? '🤖' : '•'} ${factor}<br>`;
      });
      
      if (riskFactors.length > 3) {
        factors.innerHTML += `<em style="color: #999;">+${riskFactors.length - 3} more...</em>`;
      }
      
      checkBtn.parentElement.insertBefore(factors, settingsBtn);
    }
    
    // Show performance metrics
    if (performanceMetrics && performanceMetrics.totalAnalysis) {
      const perfDiv = document.createElement('div');
      perfDiv.className = 'analysis-detail';
      perfDiv.style.cssText = `
        margin-top: 15px;
        padding-top: 10px;
        border-top: 1px solid #e0e0e0;
        font-size: 11px;
        color: #999;
        text-align: center;
      `;
      const aiTime = performanceMetrics.aiAnalysis ? 
        ` (AI: ${performanceMetrics.aiAnalysis.duration.toFixed(0)}ms)` : '';
      perfDiv.innerHTML = `Analysis: ${performanceMetrics.totalAnalysis.duration.toFixed(0)}ms${aiTime}`;
      checkBtn.parentElement.insertBefore(perfDiv, settingsBtn);
    }
  }
});