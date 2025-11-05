// AI Phishing Detector - Content Script
console.log('🛡️ AI Phishing Detector is analyzing:', window.location.href);

// Analyze current page
function analyzePage() {
  const url = window.location.href;
  const hostname = window.location.hostname;
  
  // Extract basic features
  const features = {
    url: url,
    hostname: hostname,
    isHTTPS: url.startsWith('https://'),
    hasIP: /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(hostname),
    urlLength: url.length,
    hasAtSymbol: url.includes('@'),
    hasSuspiciousWords: checkSuspiciousWords(url),
    hasPasswordField: checkPasswordFields(),
    formCount: document.querySelectorAll('form').length,
    externalLinks: countExternalLinks()
  };
  
  // Calculate risk score
  const riskScore = calculateRisk(features);
  
  // Log results
  console.log('Page features:', features);
  console.log('Risk score:', riskScore);
  
  // Send to extension
  chrome.runtime.sendMessage({
    type: 'ANALYSIS_COMPLETE',
    url: url,
    features: features,
    riskScore: riskScore
  });
  
  // Store results
  chrome.storage.local.set({
    [hostname]: {
      riskScore: riskScore,
      features: features,
      timestamp: Date.now()
    }
  });
  
  return { features, riskScore };
}

// Check for suspicious words
function checkSuspiciousWords(url) {
  const suspicious = [
    'verify', 'account', 'secure', 'update',
    'suspend', 'confirm', 'banking', 'paypal'
  ];
  const urlLower = url.toLowerCase();
  return suspicious.some(word => urlLower.includes(word));
}

// Check for password fields
function checkPasswordFields() {
  const passwordFields = document.querySelectorAll('input[type="password"]');
  return passwordFields.length > 0;
}

// Count external links
function countExternalLinks() {
  const links = document.querySelectorAll('a[href]');
  let externalCount = 0;
  
  links.forEach(link => {
    try {
      const linkUrl = new URL(link.href);
      if (linkUrl.hostname !== window.location.hostname) {
        externalCount++;
      }
    } catch (e) {
      // Invalid URL
    }
  });
  
  return externalCount;
}

// Calculate risk score
function calculateRisk(features) {
  let score = 0;
  
  // Basic scoring
  if (!features.isHTTPS) score += 25;
  if (features.hasIP) score += 30;
  if (features.urlLength > 100) score += 10;
  if (features.hasAtSymbol) score += 25;
  if (features.hasSuspiciousWords) score += 15;
  if (features.hasPasswordField && !features.isHTTPS) score += 30;
  if (features.externalLinks > 50) score += 10;
  
  return Math.min(score, 100);
}

// Run analysis when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', analyzePage);
} else {
  analyzePage();
}

// Listen for URL changes (for single-page apps)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    analyzePage();
  }
}).observe(document, { subtree: true, childList: true });