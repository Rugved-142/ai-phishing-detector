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

function extractDOMFeatures() {
  const passwordFields = document.querySelectorAll('input[type="password"]');
  const forms = document.querySelectorAll('form');
  const inputs = document.querySelectorAll('input');
  const hiddenFields = document.querySelectorAll('input[type="hidden"]');
  const iframes = document.querySelectorAll('iframe');
  
  return {
    hasPasswordField: passwordFields.length > 0,
    passwordFieldCount: passwordFields.length,
    formCount: forms.length,
    inputFieldCount: inputs.length,
    hasHiddenFields: hiddenFields.length > 0,
    hiddenFieldCount: hiddenFields.length,
    iframeCount: iframes.length,
    iframePresent: iframes.length > 0,
    hasMultipleForms: forms.length > 1
  };
}

//Main analysis function
function analyzePage() {
  
  const basicFeatures = extractBasicFeatures();
  const domFeatures = extractDOMFeatures();
  const linkFeatures = analyzeLinks();
  const patternFeatures = detectSuspiciousPatterns();
  
  // Build features object
  const features = {
    ...basicFeatures,
    ...domFeatures,
    ...linkFeatures,
    ...patternFeatures
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
  
  // DOM-based checks
  if (features.hasPasswordField && !features.isHTTPS) score += 30;
  if (features.iframePresent) score += 5;
  if (features.hasHiddenFields) score += 5;
  if (features.formCount > 3) score += 5;

  // Link-based checks
  if (features.externalLinkRatio > 75) score += 10;
  if (features.hasExcessiveExternalLinks) score += 5;
  if (features.suspiciousRedirects > 0) score += 10;
  
  return Math.min(score, 100);
}

function analyzeLinks() {
  const links = document.querySelectorAll('a[href]');
  let externalCount = 0;
  let internalCount = 0;
  let suspiciousRedirects = 0;
  
  links.forEach(link => {
    try {
      const linkUrl = new URL(link.href);
      
      // Check if external
      if (linkUrl.hostname === window.location.hostname) {
        internalCount++;
      } else {
        externalCount++;
      }
      
      // Check for suspicious redirects
      if (link.href.includes('redirect') || link.href.includes('url=')) {
        suspiciousRedirects++;
      }
    } catch (e) {
      // Invalid URL
    }
  });
  
  const totalLinks = links.length;
  
  return {
    totalLinks: totalLinks,
    externalLinks: externalCount,
    internalLinks: internalCount,
    suspiciousRedirects: suspiciousRedirects,
    externalLinkRatio: totalLinks > 0 ? (externalCount / totalLinks) * 100 : 0,
    hasExcessiveExternalLinks: externalCount > 50
  };
}

function detectSuspiciousPatterns(){
  const url = window.location.href.toLowerCase();
  const pageText = document.body.innerText.toLowerCase();
  const title = document.title.toLowerCase();

  const suspiciousWords = [
    'verify', 'account', 'secure', 'update', 'suspend',
    'confirm', 'banking', 'paypal', 'amazon', 'microsoft',
    'refund', 'locked', 'expired', 'validate', 'restore'
  ];

  const urgencyWords = [
    'urgent', 'immediate', 'expire', 'deadline', 'limited',
    'act now', 'hurry', 'quick', 'fast', 'ends today'
  ];

  const financialWords = [
    'credit card', 'social security', 'ssn', 'tax', 'irs',
    'bitcoin', 'cryptocurrency', 'wallet', 'payment'
  ];

  let suspiciousCount = 0;
  let urgencyCount = 0;
  let financialCount = 0;

  suspiciousWords.forEach(word => {
    if(url.includes(word) || pageText.includes(word) || title.includes(word))
    {
      suspiciousCount++;
    }
  });

  urgencyWords.forEach(word =>{
    if(url.includes(word) || pageText.includes(word) || title.includes(word))
    {
      urgencyCount++;
    }
  });
  financialWords.forEach(word =>{
    if(url.includes(word) || pageText.includes(word) || title.includes(word))
    {
      financialCount++;
    }
  });

  // check for common phishing patterns
  const hasDoubleSlash = url.includes('//') && url.indexOf('//') > 8;
  const hasMisleadingDomain = /\.(tk|ml|ga|cf)$/.test(window.location.hostname);
  const hasHomograph = /[а-яА-Я]/.test(url); // Cyrillic characters

  return{
    uspiciousWordCount: suspiciousCount,
    urgencyWordCount: urgencyCount,
    financialTermCount: financialCount,
    hasSuspiciousPatterns: suspiciousCount > 2,
    hasUrgencyIndicators: urgencyCount > 1,
    hasFinancialTerms: financialCount > 0,
    hasDoubleSlash: hasDoubleSlash,
    hasMisleadingDomain: hasMisleadingDomain,
    hasHomograph: hasHomograph
  }
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