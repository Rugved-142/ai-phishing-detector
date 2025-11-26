document.addEventListener('DOMContentLoaded', async () => {
  // Elements
  const urlDisplay = document.getElementById('urlDisplay');
  const loadingState = document.getElementById('loadingState');
  const analysisResults = document.getElementById('analysisResults');
  const aiBadge = document.getElementById('aiBadge');
  const riskScoreText = document.getElementById('riskScoreText');
  const riskScoreCircle = document.getElementById('riskScoreCircle');
  const riskLabel = document.getElementById('riskLabel');
  const riskDescription = document.getElementById('riskDescription');
  const aiInsight = document.getElementById('aiInsight');
  const aiInsightText = document.getElementById('aiInsightText');
  const threatDetails = document.getElementById('threatDetails');
  const riskFactors = document.getElementById('riskFactors');
  const securityStatus = document.getElementById('securityStatus');
  const rescanBtn = document.getElementById('rescanBtn');
  const reportBtn = document.getElementById('reportBtn');
  const dashboardBtn = document.getElementById('dashboardBtn');
  const settingsBtn = document.getElementById('settingsBtn');
  const helpBtn = document.getElementById('helpBtn');
  
  // Check AI status
  const aiSettings = await chrome.storage.local.get(['aiSettings']);
  const hasApiKey = aiSettings.aiSettings && aiSettings.aiSettings.apiKey && aiSettings.aiSettings.apiKey.trim() !== '';
  const isAiEnabled = hasApiKey && aiSettings.aiSettings.enableAI;
  
  if (isAiEnabled) {
    aiBadge.style.display = 'inline-flex';
  } else {
    aiBadge.style.display = 'none';
  }
  
  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  // Check if URL can be analyzed (allow file:// for testing)
  const canAnalyze = tab.url && 
    !tab.url.startsWith('chrome://') && 
    !tab.url.startsWith('chrome-extension://') && 
    !tab.url.startsWith('moz-extension://') && 
    !tab.url.startsWith('edge://') && 
    !tab.url.startsWith('about:');
  
  if (canAnalyze) {
    try {
      if (tab.url.startsWith('file://')) {
        // Special handling for local test files
        const filename = tab.url.split('/').pop();
        urlDisplay.textContent = `Test File: ${filename}`;
      } else {
        urlDisplay.textContent = new URL(tab.url).hostname;
      }
    } catch (e) {
      urlDisplay.textContent = 'Invalid URL';
    }
    // Load analysis
    await loadAnalysis();
  } else {
    urlDisplay.textContent = 'Protected page';
    displayCannotAnalyze();
  }
  
  async function loadAnalysis() {
    try {
      let storageKey;
      if (tab.url.startsWith('file://')) {
        // For file:// URLs, use the full path as key
        storageKey = tab.url;
      } else {
        storageKey = new URL(tab.url).hostname;
      }
      
      const result = await chrome.storage.local.get([storageKey]);
      
      if (result[storageKey]) {
        displayAnalysis(result[storageKey]);
      } else {
        // No analysis available for this site yet
        displayNoAnalysis();
      }
    } catch (error) {
      displayNoAnalysis();
    }
  }
  
  function displayAnalysis(data) {
    loadingState.style.display = 'none';
    analysisResults.style.display = 'block';
    
    const { riskScore, aiAnalysis, riskFactors: factors, brandCheck } = data;
    
    // Update risk score display
    riskScoreText.textContent = `${riskScore}%`;
    updateRiskMeter(riskScore);
    
    // Check if site is currently blocked (risk score > 60)
    const isBlocked = riskScore > 60;
    
    // Update risk label and description
    if (riskScore < 30) {
      riskLabel.textContent = 'Safe';
      riskLabel.className = 'risk-label safe';
      riskDescription.textContent = 'This website appears to be legitimate';
    } else if (riskScore < 60) {
      riskLabel.textContent = 'Caution';
      riskLabel.className = 'risk-label caution';
      riskDescription.textContent = 'Some suspicious elements detected';
    } else {
      riskLabel.textContent = 'Dangerous';
      riskLabel.className = 'risk-label danger';
      riskDescription.textContent = 'High risk of phishing or scam';
    }
    
    // Show security status for blocked sites
    if (isBlocked) {
      securityStatus.style.display = 'block';
      
      // Check if user bypassed the block for this session
      chrome.tabs.executeScript(tab.id, {
        code: `sessionStorage.getItem('phishing-bypass-${new URL('${tab.url}').hostname}') === 'true'`
      }, (result) => {
        const isBypassed = result && result[0];
        const statusText = securityStatus.querySelector('.status-text');
        
        if (isBypassed) {
          statusText.innerHTML = '<strong>Security Bypassed</strong><span>User chose to proceed with caution</span>';
          securityStatus.style.borderColor = '#f39c12';
        } else {
          statusText.innerHTML = '<strong>Site Blocked</strong><span>High-risk content detected</span>';
        }
      });
    } else {
      securityStatus.style.display = 'none';
    }
    
    // AI Insight
    if (aiAnalysis && aiAnalysis.success) {
      aiInsight.style.display = 'block';
      aiInsightText.innerHTML = `
        <strong>Confidence:</strong> ${aiAnalysis.confidence}%<br>
        <strong>Risk Level:</strong> ${aiAnalysis.riskLevel}<br>
        ${aiAnalysis.explanation ? `<em>${aiAnalysis.explanation}</em>` : ''}
      `;
    } else {
      aiInsight.style.display = 'none';
    }
    
    // Brand check
    if (brandCheck && brandCheck.isSuspicious) {
      threatDetails.innerHTML = `
        <div class="detail-title">
          <span class=\"detail-icon\" style=\"background: #e74c3c; color: white; border-radius: 50%; width: 16px; height: 16px; display: inline-flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; margin-right: 6px;\">!</span>
          Threat Detected
        </div>
        <div class="detail-item">
          <span class=\"detail-icon\" style=\"background: #f39c12; color: white; border-radius: 50%; width: 16px; height: 16px; display: inline-flex; align-items: center; justify-content: center; font-size: 8px; font-weight: bold;\">⚠</span>
          <span>${brandCheck.brandName ? 
            `Possible ${brandCheck.brandName} impersonation` : 
            'Suspicious domain detected'}</span>
        </div>
      `;
    }
    
    // Risk factors
    if (factors && factors.length > 0) {
      let factorsHtml = '<div class="detail-title">Risk Factors</div>';
      factors.slice(0, 5).forEach(factor => {
        const isAI = factor.startsWith('AI:');
        factorsHtml += `
          <div class="detail-item">
            <span class="detail-icon" style="background: ${isAI ? '#667eea' : '#f39c12'}; color: white; border-radius: 50%; width: 16px; height: 16px; display: inline-flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold;">${isAI ? 'AI' : '!'}</span>
            <span>${factor}</span>
          </div>
        `;
      });
      riskFactors.innerHTML = factorsHtml;
    }
  }
  
  function updateRiskMeter(score) {
    const circle = document.getElementById('riskScoreCircle');
    const circumference = 314; // 2 * π * r (r=50)
    const offset = circumference - (score / 100) * circumference;
    
    circle.style.strokeDashoffset = offset;
    
    // Color based on risk
    if (score < 30) {
      circle.style.stroke = '#27ae60';
    } else if (score < 60) {
      circle.style.stroke = '#f39c12';
    } else {
      circle.style.stroke = '#e74c3c';
    }
  }
  
  function displayNoAnalysis() {
    loadingState.style.display = 'none';
    analysisResults.style.display = 'block';
    
    // Reset risk score display
    riskScoreText.textContent = '0%';
    riskScoreCircle.style.stroke = '#e9ecef';
    riskScoreCircle.style.strokeDashoffset = '314';
    
    riskLabel.textContent = 'Not analyzed yet';
    riskLabel.className = 'risk-label';
    riskDescription.textContent = 'Click "Rescan Website" to analyze this page';
    
    // Hide AI insight and other details
    aiInsight.style.display = 'none';
    threatDetails.innerHTML = '';
    riskFactors.innerHTML = '<div class="detail-title">Click rescan to analyze this website</div>';
  }
  
  function displayCannotAnalyze() {
    loadingState.style.display = 'none';
    analysisResults.style.display = 'block';
    
    // Reset risk score display
    riskScoreText.textContent = '-';
    riskScoreCircle.style.stroke = '#e9ecef';
    riskScoreCircle.style.strokeDashoffset = '314';
    
    riskLabel.textContent = 'Cannot analyze';
    riskLabel.className = 'risk-label';
    riskDescription.textContent = 'This page cannot be analyzed for security reasons';
    
    // Hide AI insight and other details
    aiInsight.style.display = 'none';
    threatDetails.innerHTML = '';
    riskFactors.innerHTML = '<div class="detail-title">Protected browser pages cannot be analyzed</div>';
    
    // Disable rescan button for protected pages
    rescanBtn.disabled = true;
    rescanBtn.style.opacity = '0.5';
    rescanBtn.style.cursor = 'not-allowed';
  }
  
  // Button handlers
  rescanBtn.addEventListener('click', async () => {
    loadingState.style.display = 'block';
    analysisResults.style.display = 'none';
    
    // Reload the tab to trigger fresh analysis
    await chrome.tabs.reload(tab.id);
    
    // Wait a bit for the page to load and analyze
    setTimeout(async () => {
      await loadAnalysis();
    }, 3000);
  });
  
  reportBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'report.html' });
  });
  
  dashboardBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'dashboard.html' });
  });
  
  settingsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
  
  helpBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://github.com/Rugved-142/ai-phishing-detector' });
  });
});