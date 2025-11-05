// AI Phishing Detector - Background Script
console.log('🛡️ AI Phishing Detector background service started');

// Initialize on install
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
  
  // Set default settings
  chrome.storage.local.set({
    settings: {
      enabled: true,
      alertLevel: 60  // Show warnings for 60+ risk score
    }
  });
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'ANALYSIS_COMPLETE') {
    console.log(`Analysis for ${message.url}:`, message.riskScore);
    
    // Update badge based on risk
    updateBadge(sender.tab.id, message.riskScore);
    
    // Store in history
    storeInHistory(message);
  }
  
  sendResponse({ received: true });
});

// Update extension badge
function updateBadge(tabId, riskScore) {
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
      timestamp: Date.now()
    });
    
    // Keep only last 100 entries
    if (history.length > 100) {
      history.shift();
    }
    
    chrome.storage.local.set({ history: history });
  });
}