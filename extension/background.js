// AI Phishing Detector - Background Script
console.log('🛡️ AI Phishing Detector background service started');

// Show onboarding on install
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('Extension installed:', details.reason);
  
  if (details.reason === 'install') {
    // Check if onboarding is complete
    const settings = await chrome.storage.local.get(['aiSettings']);
    
    if (!settings.aiSettings || !settings.aiSettings.onboardingComplete) {
      // Open onboarding page
      chrome.tabs.create({
        url: 'onboarding.html'
      });
    }
    
    // Set default settings
    chrome.storage.local.set({
      settings: {
        enabled: true,
        alertLevel: 60
      }
    });
  }
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'ANALYSIS_COMPLETE') {
    console.log(`Analysis for ${message.url}:`, {
      riskScore: message.riskScore,
      aiEnabled: message.aiAnalysis !== null,
      factors: message.riskFactors
    });
    
    // Update badge based on risk
    updateBadge(sender.tab.id, message.riskScore, message.aiAnalysis !== null);
    
    // Store in history
    storeInHistory(message);
  }
  
  if (message.type === 'OPEN_POPUP') {
    chrome.action.openPopup();
  }
  
  if (message.type === 'GET_API_KEY') {
    // Content script requesting API key
    chrome.storage.local.get(['aiSettings'], (result) => {
      sendResponse(result.aiSettings || {});
    });
    return true; // Keep message channel open for async response
  }
  
  sendResponse({ received: true });
});

// Update extension badge
function updateBadge(tabId, riskScore, aiEnabled) {
  let text = '';
  let color = '';
  
  if (riskScore === 0) {
    text = '✓';
    color = '#4CAF50';
  } else if (riskScore < 30) {
    text = riskScore.toString();
    color = '#4CAF50';
  } else if (riskScore < 60) {
    text = riskScore.toString();
    color = '#FF9800';
  } else {
    text = '!';
    color = '#F44336';
  }
  
  // Add AI indicator to badge title
  if (aiEnabled) {
    chrome.action.setTitle({ 
      title: `AI Phishing Detector - Risk: ${riskScore}% (AI Enabled)`,
      tabId: tabId 
    });
  } else {
    chrome.action.setTitle({ 
      title: `AI Phishing Detector - Risk: ${riskScore}%`,
      tabId: tabId 
    });
  }
  
  chrome.action.setBadgeText({ text: text, tabId: tabId });
  chrome.action.setBadgeBackgroundColor({ color: color, tabId: tabId });
}

// Store analysis in history
function storeInHistory(data) {
  chrome.storage.local.get(['history'], (result) => {
    const history = result.history || [];
    history.push({
      url: data.url,
      riskScore: data.riskScore,
      riskFactors: data.riskFactors,
      aiAnalysis: data.aiAnalysis,
      timestamp: Date.now()
    });
    
    // Keep only last 100 entries
    if (history.length > 100) {
      history.shift();
    }
    
    chrome.storage.local.set({ history: history });
  });
}