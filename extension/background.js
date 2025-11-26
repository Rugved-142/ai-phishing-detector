// AI Phishing Detector - Background Script

// Known phishing patterns and risky domains
const RISKY_PATTERNS = [
  /paypal.*[^\w](com|net|org)/i,
  /microsoft.*security/i,
  /amazon.*verification/i,
  /apple.*security/i,
  /google.*verification/i,
  /facebook.*security/i,
  /[^\w]paypal[^\w]/i,
  /secure.*bank/i,
  /verify.*account/i
];

const SUSPICIOUS_DOMAINS = [
  'bit.ly',
  'tinyurl.com',
  'shortlink',
  'secure-bank',
  'paypal-security'
];

// Pre-screen URLs before loading
chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  // Only check main frame navigation (not iframes)
  if (details.frameId === 0) {
    const url = details.url;
    
    // Skip internal pages and extensions
    if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('moz-extension://')) {
      return;
    }
    
    // Quick risk assessment
    if (isHighRiskURL(url)) {
      // Block the navigation and show warning page
      chrome.tabs.update(details.tabId, {
        url: chrome.runtime.getURL('blocked.html') + '?blocked=' + encodeURIComponent(url)
      });
    }
  }
});

// Quick risk assessment function
function isHighRiskURL(url) {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    const fullUrl = url.toLowerCase();
    
    // For testing: Check file:// URLs for blocking patterns
    if (url.startsWith('file://')) {
      if (fullUrl.includes('test-blocking.html') || 
          fullUrl.includes('high-risk') ||
          (fullUrl.includes('paypal') && fullUrl.includes('verify'))) {
        return true;
      }
      return false;
    }
    
    // Check suspicious domains
    for (const domain of SUSPICIOUS_DOMAINS) {
      if (hostname.includes(domain)) {
        return true;
      }
    }
    
    // Check risky patterns
    for (const pattern of RISKY_PATTERNS) {
      if (pattern.test(fullUrl) || pattern.test(hostname)) {
        return true;
      }
    }
    
    // Check for common phishing indicators
    if (hostname.includes('secure-') || 
        hostname.includes('-secure') ||
        hostname.includes('verification') ||
        hostname.includes('account-update') ||
        (hostname.includes('paypal') && !hostname.endsWith('paypal.com')) ||
        (hostname.includes('amazon') && !hostname.endsWith('amazon.com')) ||
        (hostname.includes('microsoft') && !hostname.endsWith('microsoft.com'))) {
      return true;
    }
    
    return false;
  } catch (e) {
    return false;
  }
}

// Show onboarding on install
chrome.runtime.onInstalled.addListener(async (details) => {
  
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
  
  if (message.type === 'SECURITY_BYPASS') {
    // Log security bypass attempts
    chrome.storage.local.get(['securityBypassLog'], (result) => {
      const log = result.securityBypassLog || [];
      log.push({
        url: message.url,
        riskScore: message.riskScore,
        timestamp: message.timestamp,
        tabId: sender.tab?.id
      });
      
      // Keep last 100 bypass attempts
      if (log.length > 100) {
        log.shift();
      }
      
      chrome.storage.local.set({ securityBypassLog: log });
    });
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