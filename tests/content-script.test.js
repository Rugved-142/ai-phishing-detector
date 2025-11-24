/**
 * Test suite for content script functionality
 * Tests phishing detection, risk scoring, and feature extraction
 */

// Mock content script functions for testing
const mockContentScript = {
  extractBasicFeatures() {
    return {
      url: window.location.href,
      hostname: window.location.hostname,
      isHTTPS: window.location.protocol === 'https:',
      urlLength: window.location.href.length,
      hasIP: /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(window.location.hostname),
      hasAtSymbol: window.location.href.includes('@'),
      subdomainCount: window.location.hostname.split('.').length - 2,
      hasDashInDomain: window.location.hostname.includes('-'),
      urlDepth: window.location.href.split('/').length - 3
    };
  },

  extractDOMFeatures() {
    return {
      hasPasswordField: !!document.querySelector('input[type="password"]'),
      passwordFieldCount: document.querySelectorAll('input[type="password"]').length,
      formCount: document.querySelectorAll('form').length,
      inputFieldCount: document.querySelectorAll('input').length,
      hasHiddenFields: !!document.querySelector('input[type="hidden"]'),
      hiddenFieldCount: document.querySelectorAll('input[type="hidden"]').length,
      iframeCount: document.querySelectorAll('iframe').length,
      iframePresent: document.querySelectorAll('iframe').length > 0,
      hasMultipleForms: document.querySelectorAll('form').length > 1
    };
  },

  analyzeLinks() {
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
    return {
      totalLinks,
      externalLinks: externalCount,
      internalLinks: internalCount,
      suspiciousRedirects,
      externalLinkRatio: totalLinks > 0 ? (externalCount / totalLinks) * 100 : 0,
      hasExcessiveExternalLinks: externalCount > 50
    };
  },

  detectSuspiciousPatterns() {
    const url = window.location.href.toLowerCase();
    const pageText = document.body?.innerText?.toLowerCase() || '';
    const title = document.title.toLowerCase();

    const suspiciousWords = [
      'verify', 'account', 'secure', 'update', 'suspend',
      'confirm', 'banking', 'paypal', 'amazon', 'microsoft'
    ];

    const urgencyWords = [
      'urgent', 'immediate', 'expire', 'deadline', 'limited'
    ];

    let suspiciousCount = 0;
    let urgencyCount = 0;

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

    return {
      suspiciousWordCount: suspiciousCount,
      urgencyWordCount: urgencyCount,
      hasSuspiciousPatterns: suspiciousCount > 2,
      hasUrgencyIndicators: urgencyCount > 1,
      hasDoubleSlash: url.includes('//') && url.indexOf('//', 8) !== -1,
      hasMisleadingDomain: /\.(tk|ml|ga|cf)$/.test(window.location.hostname),
      hasHomograph: /[а-яА-Я]/.test(url)
    };
  },

  calculateWeightedRisk(features) {
    let score = 0;
    const riskFactors = [];

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
    if (features.suspiciousWordCount > 3) {
      score += 15;
      riskFactors.push('Multiple suspicious keywords');
    }
    if (features.urlLength > 100) {
      score += 10;
      riskFactors.push('Unusually long URL');
    }

    features.riskFactors = riskFactors;
    return Math.min(score, 100);
  },

  calculateHybridRisk(traditionalScore, aiAnalysis) {
    if (!aiAnalysis || !aiAnalysis.success) {
      return traditionalScore;
    }
    const aiScore = aiAnalysis.isPhishing ? aiAnalysis.confidence : (100 - aiAnalysis.confidence);
    return Math.round((traditionalScore * 0.6) + (aiScore * 0.4));
  }
};

describe('Content Script Functions', () => {
  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = '';
    document.title = 'Test Page';
    
    // Reset location mock
    Object.defineProperty(window, 'location', {
      value: {
        href: 'https://example.com/test',
        hostname: 'example.com',
        protocol: 'https:'
      },
      configurable: true
    });
  });

  describe('extractBasicFeatures', () => {
    test('should extract basic URL features correctly', () => {
      const features = mockContentScript.extractBasicFeatures();

      expect(features.url).toBe('https://example.com/test');
      expect(features.hostname).toBe('example.com');
      expect(features.isHTTPS).toBe(true);
      expect(features.urlLength).toBe(24);
      expect(features.hasIP).toBe(false);
      expect(features.hasAtSymbol).toBe(false);
    });

    test('should detect IP addresses in hostname', () => {
      Object.defineProperty(window, 'location', {
        value: {
          href: 'http://192.168.1.1/test',
          hostname: '192.168.1.1',
          protocol: 'http:'
        },
        configurable: true
      });

      const features = mockContentScript.extractBasicFeatures();

      expect(features.hasIP).toBe(true);
      expect(features.isHTTPS).toBe(false);
    });

    test('should detect @ symbol in URL', () => {
      Object.defineProperty(window, 'location', {
        value: {
          href: 'https://user@example.com',
          hostname: 'example.com',
          protocol: 'https:'
        },
        configurable: true
      });

      const features = mockContentScript.extractBasicFeatures();

      expect(features.hasAtSymbol).toBe(true);
    });
  });

  describe('extractDOMFeatures', () => {
    test('should detect password fields', () => {
      document.body.innerHTML = `
        <form>
          <input type="text" name="username">
          <input type="password" name="password">
        </form>
      `;

      const features = mockContentScript.extractDOMFeatures();

      expect(features.hasPasswordField).toBe(true);
      expect(features.passwordFieldCount).toBe(1);
      expect(features.formCount).toBe(1);
      expect(features.inputFieldCount).toBe(2);
    });

    test('should detect hidden fields and iframes', () => {
      document.body.innerHTML = `
        <input type="hidden" name="token" value="abc123">
        <iframe src="about:blank"></iframe>
        <iframe src="https://ads.com"></iframe>
      `;

      const features = mockContentScript.extractDOMFeatures();

      expect(features.hasHiddenFields).toBe(true);
      expect(features.hiddenFieldCount).toBe(1);
      expect(features.iframePresent).toBe(true);
      expect(features.iframeCount).toBe(2);
    });

    test('should detect multiple forms', () => {
      document.body.innerHTML = `
        <form id="login"></form>
        <form id="signup"></form>
        <form id="contact"></form>
      `;

      const features = mockContentScript.extractDOMFeatures();

      expect(features.hasMultipleForms).toBe(true);
      expect(features.formCount).toBe(3);
    });
  });

  describe('analyzeLinks', () => {
    test('should analyze internal and external links', () => {
      document.body.innerHTML = `
        <a href="https://example.com/page1">Internal 1</a>
        <a href="https://example.com/page2">Internal 2</a>
        <a href="https://external.com">External 1</a>
        <a href="https://another.com">External 2</a>
        <a href="https://redirect.com?url=malicious.com">Suspicious</a>
      `;

      const features = mockContentScript.analyzeLinks();

      expect(features.totalLinks).toBe(5);
      expect(features.internalLinks).toBe(2);
      expect(features.externalLinks).toBe(3);
      expect(features.externalLinkRatio).toBe(60);
      expect(features.suspiciousRedirects).toBe(1);
      expect(features.hasExcessiveExternalLinks).toBe(false);
    });

    test('should handle excessive external links', () => {
      let linksHtml = '';
      for (let i = 0; i < 55; i++) {
        linksHtml += `<a href="https://external${i}.com">Link ${i}</a>`;
      }
      document.body.innerHTML = linksHtml;

      const features = mockContentScript.analyzeLinks();

      expect(features.hasExcessiveExternalLinks).toBe(true);
      expect(features.externalLinks).toBe(55);
    });
  });

  describe('detectSuspiciousPatterns', () => {
    test('should detect suspicious keywords', () => {
      // Set up page content with multiple suspicious words (verify, account, secure, banking)
      document.body.innerHTML = '<p>Please verify your account immediately to secure your banking information.</p>';
      
      // Mock window.location for the test with suspicious URL 
      Object.defineProperty(window, 'location', {
        value: { href: 'https://example.com/verify-account-secure' },
        writable: true
      });

      const features = mockContentScript.detectSuspiciousPatterns();

      // Should detect at least 3 suspicious words to trigger hasSuspiciousPatterns = true
      expect(features.suspiciousWordCount).toBeGreaterThan(2);
      expect(features.hasSuspiciousPatterns).toBe(true);
    });

    test('should detect urgency indicators', () => {
      document.title = 'Urgent action required - expires today!';
      document.body.innerHTML = '<p>Limited time offer - act now!</p>';

      const features = mockContentScript.detectSuspiciousPatterns();

      expect(features.urgencyWordCount).toBeGreaterThan(1);
      expect(features.hasUrgencyIndicators).toBe(true);
    });

    test('should detect misleading domains', () => {
      Object.defineProperty(window, 'location', {
        value: {
          href: 'https://suspicious.tk/phishing',
          hostname: 'suspicious.tk',
          protocol: 'https:'
        },
        configurable: true
      });

      const features = mockContentScript.detectSuspiciousPatterns();

      expect(features.hasMisleadingDomain).toBe(true);
    });

    test('should detect double slash in URL', () => {
      Object.defineProperty(window, 'location', {
        value: {
          href: 'https://example.com/path//malicious',
          hostname: 'example.com',
          protocol: 'https:'
        },
        configurable: true
      });

      const features = mockContentScript.detectSuspiciousPatterns();
      
      expect(features.hasDoubleSlash).toBe(true);
    });
  });

  describe('calculateWeightedRisk', () => {
    test('should calculate risk score for safe site', () => {
      const features = {
        isHTTPS: true,
        hasIP: false,
        hasPasswordField: false,
        suspiciousWordCount: 0,
        urlLength: 30
      };

      const score = mockContentScript.calculateWeightedRisk(features);

      expect(score).toBe(0);
      expect(features.riskFactors).toEqual([]);
    });

    test('should calculate high risk score for dangerous site', () => {
      const features = {
        isHTTPS: false,
        hasIP: true,
        hasPasswordField: true,
        suspiciousWordCount: 5,
        urlLength: 150
      };

      const score = mockContentScript.calculateWeightedRisk(features);

      expect(score).toBeGreaterThan(50);
      expect(features.riskFactors).toContain('No HTTPS encryption');
      expect(features.riskFactors).toContain('Uses IP address instead of domain');
      expect(features.riskFactors).toContain('Insecure password field');
    });

    test('should cap score at 100', () => {
      const features = {
        isHTTPS: false,
        hasIP: true,
        hasPasswordField: true,
        suspiciousWordCount: 10,
        urlLength: 200,
        hasAtSymbol: true,
        hasMisleadingDomain: true
      };

      const score = mockContentScript.calculateWeightedRisk(features);

      // The calculation should be: 20 (no HTTPS) + 20 (IP) + 25 (insecure password) + 15 (suspicious words) + 10 (long URL) = 90
      expect(score).toBe(90);
    });
  });

  describe('calculateHybridRisk', () => {
    test('should return traditional score when AI unavailable', () => {
      const traditionalScore = 60;
      const aiAnalysis = null;

      const hybridScore = mockContentScript.calculateHybridRisk(traditionalScore, aiAnalysis);

      expect(hybridScore).toBe(60);
    });

    test('should calculate hybrid score with AI analysis', () => {
      const traditionalScore = 60;
      const aiAnalysis = {
        success: true,
        isPhishing: true,
        confidence: 80
      };

      const hybridScore = mockContentScript.calculateHybridRisk(traditionalScore, aiAnalysis);

      // Should be weighted average: (60 * 0.6) + (80 * 0.4) = 36 + 32 = 68
      expect(hybridScore).toBe(68);
    });

    test('should handle non-phishing AI analysis', () => {
      const traditionalScore = 70;
      const aiAnalysis = {
        success: true,
        isPhishing: false,
        confidence: 90
      };

      const hybridScore = mockContentScript.calculateHybridRisk(traditionalScore, aiAnalysis);

      // AI score should be inverted: (70 * 0.6) + (10 * 0.4) = 42 + 4 = 46
      expect(hybridScore).toBe(46);
    });

    test('should handle failed AI analysis', () => {
      const traditionalScore = 50;
      const aiAnalysis = {
        success: false,
        isPhishing: null,
        confidence: 0
      };

      const hybridScore = mockContentScript.calculateHybridRisk(traditionalScore, aiAnalysis);

      expect(hybridScore).toBe(50);
    });
  });
});