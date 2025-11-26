// AI Phishing Detector - Content Script

// Performance monitoring system
const performanceMonitor = {
  metrics: {},
  
  start(operation) {
    this.metrics[operation] = {
      startTime: performance.now()
    };
  },
  
  end(operation) {
    if (!this.metrics[operation]) return;
    
    const duration = performance.now() - this.metrics[operation].startTime;
    this.metrics[operation].duration = duration;
    return duration;
  },
  
  getMetrics() {
    return this.metrics;
  },
  
  reset() {
    this.metrics = {};
  }
};

// Initialize Gemini analyzer safely
let geminiAnalyzer = null;
let aiInitialized = false;

// Blocking feature variables
let isBlocked = false;
let blockingOverlay = null;
const RISK_THRESHOLD = 60;

// Load API settings and initialize if available
async function initializeAI() {
  if (aiInitialized) return true;
  
  try {
    // Get settings from storage via background script
    const response = await chrome.runtime.sendMessage({ type: 'GET_API_KEY' });
    
    if (response && response.apiKey && response.enableAI) {
      // Check if GeminiAnalyzer class is available (loaded via manifest)
      const AnalyzerClass = window.GeminiAnalyzer || GeminiAnalyzer;
      
      if (AnalyzerClass) {
        geminiAnalyzer = new AnalyzerClass();
        aiInitialized = true;
        return true;
      }
    }
  } catch (error) {
    // AI initialization failed - continue with traditional detection
  }
  
  return false;
}

// AI analysis function
async function performAIAnalysis(features) {
  if (!geminiAnalyzer) return null;
  
  performanceMonitor.start('aiAnalysis');
  
  try {
    const pageData = {
      url: window.location.href,
      title: document.title,
      content: document.body.innerText.substring(0, 2000),
      features: features
    };
    
    const aiResult = await geminiAnalyzer.analyzePage(pageData);
    
    performanceMonitor.end('aiAnalysis');
    return aiResult;
  } catch (error) {
    performanceMonitor.end('aiAnalysis');
    return null;
  }
}

// Calculate hybrid score
function calculateHybridRisk(traditionalScore, aiAnalysis) {
  if (!aiAnalysis || !aiAnalysis.success) {
    return traditionalScore;
  }
  
  const aiScore = aiAnalysis.isPhishing ? aiAnalysis.confidence : (100 - aiAnalysis.confidence);
  const hybridScore = Math.round((traditionalScore * 0.6) + (aiScore * 0.4));
  return Math.min(hybridScore, 100);
}

// Extract basic URL and domain features
function extractBasicFeatures() {
  performanceMonitor.start('basicFeatures');
  
  const url = window.location.href;
  const hostname = window.location.hostname;
  
  // Create a consistent storage key that works for both web and file URLs
  let storageKey;
  if (url.startsWith('file://')) {
    // For file URLs, use the full path as the key
    storageKey = url;
  } else {
    // For web URLs, use hostname as before
    storageKey = hostname;
  }
  
  const features = {
    url: url,
    hostname: hostname,
    storageKey: storageKey,
    isHTTPS: url.startsWith('https://'),
    urlLength: url.length,
    hasIP: /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(hostname),
    hasAtSymbol: url.includes('@'),
    subdomainCount: hostname.split('.').length - 2,
    hasDashInDomain: hostname.includes('-'),
    urlDepth: url.split('/').length - 3
  };
  
  performanceMonitor.end('basicFeatures');
  return features;
}

// Extract DOM-based features
function extractDOMFeatures() {
  performanceMonitor.start('domFeatures');
  
  const passwordFields = document.querySelectorAll('input[type="password"]');
  const forms = document.querySelectorAll('form');
  const inputs = document.querySelectorAll('input');
  const hiddenFields = document.querySelectorAll('input[type="hidden"]');
  const iframes = document.querySelectorAll('iframe');
  
  const features = {
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
  
  performanceMonitor.end('domFeatures');
  return features;
}

// Analyze internal vs external links
function analyzeLinks() {
  performanceMonitor.start('linkAnalysis');
  
  const links = document.querySelectorAll('a[href]');
  let externalCount = 0;
  let internalCount = 0;
  let suspiciousRedirects = 0;
  
  links.forEach(link => {
    try {
      const linkUrl = new URL(link.href);
      
      if (linkUrl.hostname === window.location.hostname) {
        internalCount++;
      } else {
        externalCount++;
      }
      
      if (link.href.includes('redirect') || link.href.includes('url=')) {
        suspiciousRedirects++;
      }
    } catch (e) {
      // Invalid URL
    }
  });
  
  const totalLinks = links.length;
  
  const features = {
    totalLinks: totalLinks,
    externalLinks: externalCount,
    internalLinks: internalCount,
    suspiciousRedirects: suspiciousRedirects,
    externalLinkRatio: totalLinks > 0 ? (externalCount / totalLinks) * 100 : 0,
    hasExcessiveExternalLinks: externalCount > 50
  };
  
  performanceMonitor.end('linkAnalysis');
  return features;
}

// Detect suspicious patterns in content
function detectSuspiciousPatterns() {
  performanceMonitor.start('patternDetection');
  
  const url = window.location.href.toLowerCase();
  const pageText = document.body.innerText.toLowerCase();
  const title = document.title.toLowerCase();
  
  // Suspicious keywords often used in phishing
  const suspiciousWords = [
    'verify', 'account', 'secure', 'update', 'suspend',
    'confirm', 'banking', 'paypal', 'amazon', 'microsoft',
    'refund', 'locked', 'expired', 'validate', 'restore'
  ];
  
  // Urgency indicators that create pressure
  const urgencyWords = [
    'urgent', 'immediate', 'expire', 'deadline', 'limited',
    'act now', 'hurry', 'quick', 'fast', 'ends today'
  ];
  
  // Financial terms
  const financialWords = [
    'credit card', 'social security', 'ssn', 'tax', 'irs',
    'bitcoin', 'cryptocurrency', 'wallet', 'payment'
  ];
  
  let suspiciousCount = 0;
  let urgencyCount = 0;
  let financialCount = 0;
  
  // Check URL and page content for patterns
  suspiciousWords.forEach(word => {
    if (url.includes(word) || pageText.includes(word)) {
      suspiciousCount++;
    }
  });
  
  urgencyWords.forEach(word => {
    if (pageText.includes(word) || title.includes(word)) {
      urgencyCount++;
    }
  });
  
  financialWords.forEach(word => {
    if (pageText.includes(word)) {
      financialCount++;
    }
  });
  
  // Check for common phishing URL patterns
  const hasDoubleSlash = url.includes('//') && url.indexOf('//') > 8;
  const hasMisleadingDomain = /\.(tk|ml|ga|cf)$/.test(window.location.hostname);
  const hasHomograph = /[а-яА-Я]/.test(url); // Cyrillic characters
  
  const features = {
    suspiciousWordCount: suspiciousCount,
    urgencyWordCount: urgencyCount,
    financialTermCount: financialCount,
    hasSuspiciousPatterns: suspiciousCount > 2,
    hasUrgencyIndicators: urgencyCount > 1,
    hasFinancialTerms: financialCount > 0,
    hasDoubleSlash: hasDoubleSlash,
    hasMisleadingDomain: hasMisleadingDomain,
    hasHomograph: hasHomograph
  };
  
  performanceMonitor.end('patternDetection');
  return features;
}

// Check for brand impersonation
function checkBrandImpersonation() {
  performanceMonitor.start('brandCheck');
  
  const url = window.location.href.toLowerCase();
  const hostname = window.location.hostname.toLowerCase();
  const pageText = document.body.innerText.toLowerCase();
  const title = document.title.toLowerCase();
  
  // Major brands often targeted by phishing
  const brands = [
    { name: 'paypal', domain: 'paypal.com', keywords: ['payment', 'money'] },
    { name: 'amazon', domain: 'amazon.com', keywords: ['order', 'delivery', 'prime'] },
    { name: 'microsoft', domain: 'microsoft.com', keywords: ['outlook', 'office', 'windows'] },
    { name: 'google', domain: 'google.com', keywords: ['gmail', 'drive', 'account'] },
    { name: 'apple', domain: 'apple.com', keywords: ['icloud', 'iphone', 'apple id'] },
    { name: 'facebook', domain: 'facebook.com', keywords: ['login', 'social'] },
    { name: 'netflix', domain: 'netflix.com', keywords: ['streaming', 'subscription'] },
    { name: 'bank of america', domain: 'bankofamerica.com', keywords: ['banking', 'account'] },
    { name: 'chase', domain: 'chase.com', keywords: ['banking', 'credit'] },
    { name: 'wells fargo', domain: 'wellsfargo.com', keywords: ['banking', 'account'] }
  ];
  
  // Check for typosquatting patterns
  const typosquatPatterns = [
    /payp[ae]l/, /amaz[o0]n/, /micr[o0]s[o0]ft/, /g[o0][o0]gle/,
    /app1e/, /faceb[o0][o0]k/, /netf1ix/
  ];
  
  let detectedBrand = null;
  let impersonationReason = null;
  let confidenceLevel = 0;
  
  for (let brand of brands) {
    const brandInUrl = url.includes(brand.name.replace(' ', ''));
    const brandInTitle = title.includes(brand.name);
    const brandInContent = pageText.includes(brand.name);
    const officialDomain = hostname.includes(brand.domain);
    
    // Check for brand keywords
    let keywordMatches = 0;
    brand.keywords.forEach(keyword => {
      if (pageText.includes(keyword)) keywordMatches++;
    });
    
    // High confidence impersonation
    if ((brandInUrl || brandInTitle) && !officialDomain) {
      detectedBrand = brand.name;
      impersonationReason = 'Brand name in URL but not official domain';
      confidenceLevel = 90;
      break;
    }
    
    // Medium confidence impersonation
    if (brandInContent && keywordMatches >= 2 && !officialDomain) {
      detectedBrand = brand.name;
      impersonationReason = 'Brand mentioned with related keywords';
      confidenceLevel = 60;
    }
  }
  
  // Check for typosquatting
  let hasTyposquat = false;
  for (let pattern of typosquatPatterns) {
    if (pattern.test(hostname)) {
      hasTyposquat = true;
      break;
    }
  }
  
  // Check for homograph attacks (lookalike characters)
  const homographSubstitutions = {
    'a': ['а', 'ɑ', '@'],  // Cyrillic 'a'
    'e': ['е', 'ė', '3'],  // Cyrillic 'e'
    'o': ['о', '0', 'ο'],  // Cyrillic 'o', zero, Greek omicron
    'i': ['і', '1', 'l'],  // Cyrillic 'i', one, lowercase L
    'c': ['с', 'ϲ'],       // Cyrillic 'c'
    'p': ['р'],            // Cyrillic 'p'
    'x': ['х'],            // Cyrillic 'x'
    'y': ['у'],            // Cyrillic 'y'
  };
  
  let hasHomograph = false;
  for (let char in homographSubstitutions) {
    homographSubstitutions[char].forEach(substitute => {
      if (hostname.includes(substitute)) {
        hasHomograph = true;
      }
    });
  }
  
  const result = {
    isSuspicious: detectedBrand !== null || hasTyposquat || hasHomograph,
    brandName: detectedBrand,
    reason: impersonationReason,
    confidenceLevel: confidenceLevel,
    hasTyposquat: hasTyposquat,
    hasHomograph: hasHomograph
  };
  
  performanceMonitor.end('brandCheck');
  return result;
}

// Calculate weighted risk score
function calculateWeightedRisk(features) {
  let score = 0;
  const riskFactors = [];
  
  // Critical factors (15-20 points each)
  if (!features.isHTTPS) {
    score += 20;
    riskFactors.push('No HTTPS encryption');
  }
  if (features.hasIP) {
    score += 20;
    riskFactors.push('Uses IP address instead of domain');
  }
  if (features.hasPasswordField && !features.isHTTPS) {
    score += 25;
    riskFactors.push('Insecure password field');
  }
  if (features.hasHomograph) {
    score += 20;
    riskFactors.push('Contains lookalike characters');
  }
  
  // High risk factors (10-15 points)
  if (features.hasAtSymbol) {
    score += 15;
    riskFactors.push('Contains @ symbol in URL');
  }
  if (features.suspiciousWordCount > 3) {
    score += 15;
    riskFactors.push('Multiple suspicious keywords');
  }
  if (features.urlLength > 100) {
    score += 10;
    riskFactors.push('Unusually long URL');
  }
  if (features.hasMisleadingDomain) {
    score += 15;
    riskFactors.push('Uses suspicious domain extension');
  }
  
  // Medium risk factors (5-10 points)
  if (features.subdomainCount > 3) {
    score += 10;
    riskFactors.push('Excessive subdomains');
  }
  if (features.externalLinkRatio > 75) {
    score += 10;
    riskFactors.push('Too many external links');
  }
  if (features.hasUrgencyIndicators) {
    score += 8;
    riskFactors.push('Contains urgency pressure');
  }
  if (features.hasDoubleSlash) {
    score += 8;
    riskFactors.push('Suspicious URL structure');
  }
  
  // Low risk factors (2-5 points)
  if (features.iframePresent) {
    score += 5;
    riskFactors.push('Contains iframes');
  }
  if (features.hasHiddenFields) {
    score += 5;
    riskFactors.push('Has hidden form fields');
  }
  if (features.formCount > 3) {
    score += 3;
    riskFactors.push('Multiple forms detected');
  }
  if (features.hasDashInDomain) {
    score += 3;
    riskFactors.push('Domain contains dashes');
  }
  if (features.urlDepth > 5) {
    score += 3;
    riskFactors.push('Deep URL structure');
  }
  
  // Store risk factors for display
  features.riskFactors = riskFactors;
  
  return Math.min(score, 100);
}

// Block high-risk sites with full-screen overlay
function blockHighRiskSite(riskScore, riskFactors, aiAnalysis) {
  // Don't duplicate blocking overlay
  if (document.getElementById('phishing-blocking-overlay') || isBlocked) return;
  
  // Don't block extension pages, but allow testing with local files
  if (window.location.protocol === 'chrome-extension:') return;
      
  // Check if user already bypassed this site in current session
  if (sessionStorage.getItem('phishing-bypass-' + window.location.hostname) === 'true') {
    return;
  }
  
  isBlocked = true;
  
  // Hide page content immediately
  const originalBodyStyle = document.body.style.cssText;
  document.body.style.cssText = 'overflow: hidden !important; height: 100vh !important;';
  
  // Create full-screen blocking overlay
  const overlay = document.createElement('div');
  overlay.id = 'phishing-blocking-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
    color: white;
    z-index: 2147483647;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    animation: fadeIn 0.3s ease-out;
  `;
  
  // Add animation keyframes
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes pulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.05); }
      100% { transform: scale(1); }
    }
  `;
  document.head.appendChild(style);
  
  // Build threat summary
  const threatLevel = riskScore >= 80 ? 'CRITICAL' : 'HIGH';
  const threatColor = riskScore >= 80 ? '#ff4757' : '#ff6348';
  
  const factorsList = riskFactors && riskFactors.length > 0 
    ? riskFactors.slice(0, 4).map(f => `<li>• ${f}</li>`).join('')
    : '<li>• Multiple security indicators detected</li>';
    
  const aiInsight = aiAnalysis && aiAnalysis.success 
    ? `<div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 8px; margin: 20px 0;">
         <strong>🤖 AI Analysis:</strong> ${aiAnalysis.explanation || 'Advanced threat patterns detected'}
       </div>`
    : '';
  
  overlay.innerHTML = `
    <div style="max-width: 600px; text-align: center; padding: 40px; background: rgba(255,255,255,0.05); border-radius: 16px; backdrop-filter: blur(10px);">
      <div style="font-size: 64px; margin-bottom: 20px; animation: pulse 2s infinite;">🛡️</div>
      
      <h1 style="font-size: 32px; margin: 0 0 10px 0; color: ${threatColor};">SITE BLOCKED</h1>
      <div style="font-size: 18px; color: #ff9ff3; margin-bottom: 30px;">${threatLevel} THREAT DETECTED</div>
      
      <div style="background: rgba(255,71,87,0.2); border: 1px solid rgba(255,71,87,0.5); border-radius: 8px; padding: 20px; margin: 20px 0;">
        <div style="font-size: 16px; margin-bottom: 15px;">⚠️ <strong>Risk Score: ${riskScore}%</strong></div>
        <div style="text-align: left; font-size: 14px; line-height: 1.6;">
          <strong>Security Issues Detected:</strong>
          <ul style="margin: 10px 0; padding-left: 20px;">
            ${factorsList}
          </ul>
        </div>
      </div>
      
      ${aiInsight}
      
      <div style="font-size: 14px; color: #888; margin: 20px 0; line-height: 1.5;">
        This website has been blocked because it shows characteristics commonly associated with phishing attacks.
        Continuing could put your personal information at risk.
      </div>
      
      <div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap; margin-top: 30px;">
        <button id="phishing-go-back" style="
          background: #2ed573;
          color: white;
          border: none;
          padding: 15px 30px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          font-size: 16px;
          transition: all 0.2s;
          box-shadow: 0 4px 12px rgba(46,213,115,0.3);
        ">← Go Back Safely</button>
        
        <button id="phishing-view-details" style="
          background: rgba(255,255,255,0.1);
          color: white;
          border: 1px solid rgba(255,255,255,0.3);
          padding: 15px 30px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 16px;
          transition: all 0.2s;
        ">📊 View Details</button>
      </div>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1);">
        <details style="color: #888; cursor: pointer;">
          <summary style="font-size: 14px; margin-bottom: 15px;">⚠️ Advanced: Bypass Protection (Not Recommended)</summary>
          <div style="text-align: left; background: rgba(255,0,0,0.1); padding: 15px; border-radius: 8px; margin: 10px 0;">
            <p style="margin: 0 0 10px 0; color: #ff6b6b; font-weight: bold;">WARNING: Proceeding is dangerous!</p>
            <p style="margin: 0 0 15px 0; font-size: 13px; line-height: 1.4;">This site has a ${riskScore}% risk score. Bypassing protection could expose you to:</p>
            <ul style="font-size: 13px; margin: 0 0 15px 20px; line-height: 1.4;">
              <li>Identity theft and credential harvesting</li>
              <li>Financial fraud and unauthorized transactions</li>
              <li>Malware installation and system compromise</li>
            </ul>
            <button id="phishing-bypass-warning" style="
              background: #ff4757;
              color: white;
              border: none;
              padding: 10px 20px;
              border-radius: 4px;
              cursor: pointer;
              font-size: 14px;
              font-weight: 600;
              transition: all 0.2s;
            ">I Understand the Risks - Proceed Anyway</button>
          </div>
        </details>
      </div>
    </div>
  `;
  
  // Insert overlay as first child to ensure it's on top
  document.body.insertBefore(overlay, document.body.firstChild);
  blockingOverlay = overlay;
  
  // Add event listeners
  document.getElementById('phishing-go-back').addEventListener('click', () => {
    // Try to go back in history
    if (window.history.length > 1) {
      window.history.back();
    } else {
      // No history, close tab or go to safe page
      window.location.href = 'about:blank';
    }
  });
  
  document.getElementById('phishing-view-details').addEventListener('click', () => {
    // Open extension popup with detailed analysis
    chrome.runtime.sendMessage({ type: 'OPEN_POPUP' });
  });
  
  document.getElementById('phishing-bypass-warning').addEventListener('click', () => {
    // Log bypass attempt
    chrome.runtime.sendMessage({
      type: 'SECURITY_BYPASS',
      url: window.location.href,
      riskScore: riskScore,
      timestamp: new Date().toISOString()
    });
    
    // Remember bypass for this session
    sessionStorage.setItem('phishing-bypass-' + window.location.hostname, 'true');
    
    // Remove overlay and restore page
    overlay.style.animation = 'fadeIn 0.3s ease-out reverse';
    setTimeout(() => {
      overlay.remove();
      document.body.style.cssText = originalBodyStyle;
      isBlocked = false;
      blockingOverlay = null;
    }, 300);
  });
  
  // Prevent page interactions while blocked
  const preventInteraction = (e) => {
    if (e.target.closest('#phishing-blocking-overlay')) return;
    e.preventDefault();
    e.stopPropagation();
    return false;
  };
  
  // Block all page interactions except overlay
  document.addEventListener('click', preventInteraction, true);
  document.addEventListener('keydown', preventInteraction, true);
  document.addEventListener('keyup', preventInteraction, true);
  document.addEventListener('mousedown', preventInteraction, true);
  document.addEventListener('mouseup', preventInteraction, true);
  
  // Store event listeners for cleanup
  overlay.preventInteraction = preventInteraction;
}

// Report performance metrics
function reportPerformance() {
  try {
    if (chrome && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['performanceHistory'], (result) => {
        if (chrome.runtime.lastError) {
          console.warn('Storage error:', chrome.runtime.lastError);
          return;
        }
        const history = result.performanceHistory || [];
        
        // Performance data available if needed
      });
    }
  } catch (error) {
    console.warn('Chrome storage not available in reportPerformance:', error);
  }
}

// Report threats to backend server
async function reportToBackend(features, riskScore, aiAnalysis) {
  if (riskScore < 60) return; // Only report high-risk sites
  
  try {
    const response = await fetch('http://localhost:3000/api/threats/report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: features.url,
        domain: features.hostname,
        riskScore: riskScore,
        features: {
          isHTTPS: features.isHTTPS,
          hasIP: features.hasIP,
          hasPasswordField: features.hasPasswordField,
          suspiciousWordCount: features.suspiciousWordCount,
          brandImpersonation: features.suspectedBrand
        },
        aiAnalysis: aiAnalysis
      })
    });
    
    // Threat reported successfully
  } catch (error) {
    // Continue working even if backend is down
  }
}

// Main analysis function with AI integration
let analysisCount = 0;
async function analyzePage() {
  performanceMonitor.reset();
  performanceMonitor.start('totalAnalysis');
  
  // Check if warning was dismissed this session
  if (sessionStorage.getItem('phishing-warning-dismissed') === 'true') {
    return;
  }
  
  // Initialize AI if available
  await initializeAI();
  
  const basicFeatures = extractBasicFeatures();
  const domFeatures = extractDOMFeatures();
  const linkFeatures = analyzeLinks();
  const patternFeatures = detectSuspiciousPatterns();
  const brandCheck = checkBrandImpersonation();
  
  performanceMonitor.start('riskCalculation');
  
  const features = {
    ...basicFeatures,
    ...domFeatures,
    ...linkFeatures,
    ...patternFeatures,
    brandImpersonation: brandCheck.isSuspicious,
    suspectedBrand: brandCheck.brandName,
    impersonationReason: brandCheck.reason,
    hasTyposquat: brandCheck.hasTyposquat
  };
  
  let traditionalScore = calculateWeightedRisk(features);
  
  // Boost score for brand impersonation
  if (brandCheck.isSuspicious) {
    const boost = Math.floor(brandCheck.confidenceLevel * 0.3);
    traditionalScore = Math.min(traditionalScore + boost, 100);
    
    if (!features.riskFactors) features.riskFactors = [];
    if (brandCheck.brandName) {
      features.riskFactors.unshift(`Possible ${brandCheck.brandName} impersonation`);
    } else if (brandCheck.hasTyposquat) {
      features.riskFactors.unshift('Typosquatting detected');
    }
  }
  
  // Perform AI analysis if available
  let aiAnalysis = null;
  let finalRiskScore = traditionalScore;
  
  if (geminiAnalyzer) {
    try {
      aiAnalysis = await performAIAnalysis(features);
      
      if (aiAnalysis && aiAnalysis.success) {
        // Calculate hybrid score
        finalRiskScore = calculateHybridRisk(traditionalScore, aiAnalysis);
        
        // Add AI insights to risk factors
        if (aiAnalysis.threats && aiAnalysis.threats.length > 0) {
          features.riskFactors = features.riskFactors || [];
          aiAnalysis.threats.forEach(threat => {
            features.riskFactors.push(`AI: ${threat}`);
          });
        }
      }
    } catch (error) {
      // AI analysis failed - continue with traditional detection
    }
  }
  
  performanceMonitor.end('riskCalculation');
  
  // Block high-risk sites
  if (finalRiskScore > RISK_THRESHOLD) {
    performanceMonitor.start('blockingSite');
    blockHighRiskSite(finalRiskScore, features.riskFactors, aiAnalysis);
    performanceMonitor.end('blockingSite');
    
    // Report to backend
    reportToBackend(features, finalRiskScore, aiAnalysis);
  }
  
  const totalTime = performanceMonitor.end('totalAnalysis');
  const metrics = performanceMonitor.getMetrics();
  
  // Store performance data
  try {
    if (chrome && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['performanceHistory'], (result) => {
        if (chrome.runtime.lastError) {
          console.warn('Storage error:', chrome.runtime.lastError);
          return;
        }
        
        const history = result.performanceHistory || [];
        history.push({
          url: features.url,
          totalTime: totalTime,
          metrics: metrics,
          aiEnabled: aiAnalysis !== null,
          timestamp: Date.now()
        });
        
        // Keep last 50 measurements
        if (history.length > 50) {
          history.shift();
        }
        
        chrome.storage.local.set({ 
          performanceHistory: history
        }, () => {
          if (chrome.runtime.lastError) {
            console.warn('Failed to save performance data:', chrome.runtime.lastError);
          }
        });
      });
    }
  } catch (error) {
    console.warn('Chrome storage not available:', error);
  }
  
  // Send analysis results
  chrome.runtime.sendMessage({
    type: 'ANALYSIS_COMPLETE',
    url: features.url,
    features: features,
    riskScore: finalRiskScore,
    traditionalScore: traditionalScore,
    riskFactors: features.riskFactors,
    brandCheck: brandCheck,
    aiAnalysis: aiAnalysis,
    performanceMetrics: metrics
  });
  
  // Store results
  try {
    if (chrome && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({
        [features.storageKey]: {
          riskScore: finalRiskScore,
          traditionalScore: traditionalScore,
          features: features,
          riskFactors: features.riskFactors,
          brandCheck: brandCheck,
          aiAnalysis: aiAnalysis,
          performanceMetrics: metrics,
          timestamp: Date.now()
        }
      }, () => {
        if (chrome.runtime.lastError) {
          console.warn('Failed to store results:', chrome.runtime.lastError);
        }
      });
    }
  } catch (error) {
    console.warn('Chrome storage not available for results:', error);
  }
  
  // Report performance every 10 analyses
  analysisCount++;
  if (analysisCount % 10 === 0) {
    reportPerformance();
  }
  
  return { features, riskScore: finalRiskScore, brandCheck, aiAnalysis, performance: metrics };
}

// Run analysis when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', analyzePage);
} else {
  // Small delay to ensure page is ready
  setTimeout(analyzePage, 100);
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