// AI Phishing Detector - Content Script
console.log('🛡️ AI Phishing Detector v3 is analyzing:', window.location.href);


function extractBasicFeatures() {
  const url = window.location.href;
  const hostname = window.location.hostname;
  
  return {
    url: url,
    hostname: hostname,
    isHTTPS: url.startsWith('https://'),
    urlLength: url.length,
    hasIP: /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(hostname),
    hasAtSymbol: url.includes('@'),
    subdomainCount: hostname.split('.').length - 2,
    hasDashInDomain: hostname.includes('-'),
    urlDepth: url.split('/').length - 3
  };
}


//Main analysis function
function analyzePage() {
  
  const basicFeatures = extractBasicFeatures();
  
  // Build features object
  const features = {
    ...basicFeatures
  };
  
  // Calculate risk score
  const riskScore = calculateRisk(features);
  
  // Log results
  console.log('📊 Risk score:', riskScore);
  
  // Send to background script
  chrome.runtime.sendMessage({
    type: 'ANALYSIS_COMPLETE',
    url: features.url,
    features: features,
    riskScore: riskScore
  });
  
  // Store results in local storage
  chrome.storage.local.set({
    [features.hostname]: {
      riskScore: riskScore,
      features: features,
      timestamp: Date.now()
    }
  });
  
  return { features, riskScore };
}

/**
 * Calculate risk score based on features
 */
function calculateRisk(features) {
  let score = 0;
  
  // Basic URL checks
  if (!features.isHTTPS) score += 25;
  if (features.hasIP) score += 30;
  if (features.urlLength > 100) score += 10;
  if (features.hasAtSymbol) score += 25;
  if (features.subdomainCount > 3) score += 10;
  if (features.urlDepth > 5) score += 5;
  
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
    console.log('🔄 URL changed, re-analyzing...');
    analyzePage();
  }
}).observe(document, { subtree: true, childList: true });