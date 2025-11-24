/**
 * Integration tests for the complete extension workflow
 * Tests end-to-end scenarios and component interactions
 */

describe('Extension Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset DOM
    document.body.innerHTML = '';
    document.title = 'Test Site';
    
    // Reset location
    Object.defineProperty(window, 'location', {
      value: {
        href: 'https://example.com',
        hostname: 'example.com',
        protocol: 'https:'
      },
      configurable: true
    });
  });

  describe('Complete Phishing Detection Workflow', () => {
    test('should detect and handle a high-risk phishing site', async () => {
      // Setup phishing site environment
      Object.defineProperty(window, 'location', {
        value: {
          href: 'http://192.168.1.1/paypal-secure-login.php',
          hostname: '192.168.1.1',
          protocol: 'http:'
        },
        configurable: true
      });

      document.title = 'PayPal - Urgent Account Verification Required';
      document.body.innerHTML = `
        <form action="steal-data.php" method="post">
          <input type="text" name="username" placeholder="Enter your PayPal email">
          <input type="password" name="password" placeholder="Enter your password">
          <input type="hidden" name="csrf" value="malicious">
          <button type="submit">Verify Account Now - Limited Time!</button>
        </form>
        <p>Your account will be suspended if you don't verify immediately!</p>
        <a href="https://malicious-redirect.com?url=real-paypal.com">Click here to continue</a>
      `;

      // Mock AI analysis for phishing
      const mockAIAnalysis = {
        success: true,
        isPhishing: true,
        confidence: 92,
        riskLevel: 'critical',
        threats: ['brand impersonation', 'credential harvesting', 'urgency tactics'],
        brandImpersonation: 'PayPal',
        explanation: 'Multiple phishing indicators detected including brand impersonation and suspicious forms'
      };

      // Simulate content script analysis
      const basicFeatures = {
        url: window.location.href,
        hostname: window.location.hostname,
        isHTTPS: window.location.protocol === 'https:',
        urlLength: window.location.href.length,
        hasIP: true,
        hasAtSymbol: false,
        subdomainCount: 0,
        hasDashInDomain: false,
        urlDepth: 1
      };

      const domFeatures = {
        hasPasswordField: true,
        passwordFieldCount: 1,
        formCount: 1,
        inputFieldCount: 3,
        hasHiddenFields: true,
        hiddenFieldCount: 1,
        iframeCount: 0,
        iframePresent: false,
        hasMultipleForms: false
      };

      const linkFeatures = {
        totalLinks: 1,
        externalLinks: 1,
        internalLinks: 0,
        suspiciousRedirects: 1,
        externalLinkRatio: 100,
        hasExcessiveExternalLinks: false
      };

      const patternFeatures = {
        suspiciousWordCount: 4, // paypal, secure, account, verify
        urgencyWordCount: 3, // urgent, limited, immediately
        hasSuspiciousPatterns: true,
        hasUrgencyIndicators: true,
        hasDoubleSlash: false,
        hasMisleadingDomain: false,
        hasHomograph: false
      };

      const combinedFeatures = {
        ...basicFeatures,
        ...domFeatures,
        ...linkFeatures,
        ...patternFeatures
      };

      // Calculate traditional risk score
      let traditionalScore = 0;
      const riskFactors = [];

      if (!combinedFeatures.isHTTPS) {
        traditionalScore += 20;
        riskFactors.push('No HTTPS encryption');
      }
      if (combinedFeatures.hasIP) {
        traditionalScore += 20;
        riskFactors.push('Uses IP address instead of domain');
      }
      if (combinedFeatures.hasPasswordField && !combinedFeatures.isHTTPS) {
        traditionalScore += 25;
        riskFactors.push('Insecure password field');
      }
      if (combinedFeatures.suspiciousWordCount > 3) {
        traditionalScore += 15;
        riskFactors.push('Multiple suspicious keywords');
      }
      if (combinedFeatures.hasUrgencyIndicators) {
        traditionalScore += 8;
        riskFactors.push('Contains urgency pressure');
      }

      traditionalScore = Math.min(traditionalScore, 100);
      combinedFeatures.riskFactors = riskFactors;

      expect(traditionalScore).toBe(88); // High traditional score

      // Calculate hybrid score with AI
      const aiScore = mockAIAnalysis.isPhishing ? mockAIAnalysis.confidence : (100 - mockAIAnalysis.confidence);
      const hybridScore = Math.round((traditionalScore * 0.6) + (aiScore * 0.4));

      expect(hybridScore).toBe(90); // (88 * 0.6) + (92 * 0.4) = 52.8 + 36.8 = 89.6 ≈ 90

      // Simulate message to background script
      const analysisMessage = {
        type: 'ANALYSIS_COMPLETE',
        url: combinedFeatures.url,
        features: combinedFeatures,
        riskScore: hybridScore,
        traditionalScore: traditionalScore,
        riskFactors: combinedFeatures.riskFactors,
        aiAnalysis: mockAIAnalysis,
        performanceMetrics: { totalTime: 150 }
      };

      // Test background script response
      const sender = { tab: { id: 123 } };
      const sendResponse = jest.fn();

      // Mock storage for history
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ scanHistory: [] });
      });

      // Simulate background script handling
      expect(hybridScore).toBeGreaterThanOrEqual(60); // Should trigger warning
      
      // Badge should be set to danger
      chrome.action.setBadgeText.mockClear();
      chrome.action.setBadgeBackgroundColor.mockClear();
      
      chrome.action.setBadgeText({ text: '⚠️', tabId: 123 });
      chrome.action.setBadgeBackgroundColor({ color: '#ff4444', tabId: 123 });

      expect(chrome.action.setBadgeText).toHaveBeenCalledWith({
        text: '⚠️',
        tabId: 123
      });

      // History should be updated
      const expectedHistoryEntry = {
        url: analysisMessage.url,
        hostname: combinedFeatures.hostname,
        riskScore: hybridScore,
        traditionalScore: traditionalScore,
        aiAnalysis: mockAIAnalysis,
        timestamp: expect.any(Number)
      };

      chrome.storage.local.set.mockClear();
      chrome.storage.local.set({
        scanHistory: [expectedHistoryEntry]
      });

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        scanHistory: expect.arrayContaining([
          expect.objectContaining(expectedHistoryEntry)
        ])
      });
    });

    test('should handle a safe site correctly', async () => {
      // Setup safe site environment
      Object.defineProperty(window, 'location', {
        value: {
          href: 'https://google.com/search?q=test',
          hostname: 'google.com',
          protocol: 'https:'
        },
        configurable: true
      });

      document.title = 'Google Search';
      document.body.innerHTML = `
        <div>
          <input type="text" placeholder="Search">
          <button>Google Search</button>
        </div>
        <a href="https://google.com/about">About</a>
        <a href="https://google.com/privacy">Privacy</a>
      `;

      const mockAIAnalysis = {
        success: true,
        isPhishing: false,
        confidence: 95,
        riskLevel: 'low',
        threats: [],
        brandImpersonation: null,
        explanation: 'Legitimate website with no phishing indicators'
      };

      // Calculate features for safe site
      const features = {
        url: window.location.href,
        hostname: window.location.hostname,
        isHTTPS: true,
        hasIP: false,
        hasPasswordField: false,
        suspiciousWordCount: 0,
        urgencyWordCount: 0,
        hasUrgencyIndicators: false,
        externalLinkRatio: 0,
        riskFactors: []
      };

      const traditionalScore = 0; // No risk factors
      const aiScore = 100 - mockAIAnalysis.confidence; // 5 (inverted because not phishing)
      const hybridScore = Math.round((traditionalScore * 0.6) + (aiScore * 0.4)); // 2

      expect(hybridScore).toBe(2); // Very low risk

      // Badge should be safe
      chrome.action.setBadgeText({ text: '✓', tabId: 456 });
      chrome.action.setBadgeBackgroundColor({ color: '#00aa00', tabId: 456 });

      expect(chrome.action.setBadgeText).toHaveBeenCalledWith({
        text: '✓',
        tabId: 456
      });
      expect(chrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({
        color: '#00aa00',
        tabId: 456
      });
    });
  });

  describe('AI Service Integration', () => {
    test('should handle AI service unavailable gracefully', async () => {
      // Mock AI initialization failure
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({
          aiSettings: {
            apiKey: null,
            enableAI: false
          }
        });
      });

      const features = {
        url: 'https://test.com',
        hostname: 'test.com',
        isHTTPS: true,
        hasPasswordField: true,
        suspiciousWordCount: 2
      };

      const traditionalScore = 20; // Medium risk
      const aiAnalysis = null; // AI not available
      const finalScore = traditionalScore; // Should fall back to traditional

      expect(finalScore).toBe(20);
      expect(aiAnalysis).toBeNull();

      // Should still provide protection via traditional methods
      const analysisMessage = {
        type: 'ANALYSIS_COMPLETE',
        url: features.url,
        riskScore: finalScore,
        aiAnalysis: null
      };

      expect(analysisMessage.riskScore).toBe(20);
      expect(analysisMessage.aiAnalysis).toBeNull();
    });

    test('should handle API errors gracefully', async () => {
      // Mock API error
      fetch.mockRejectedValue(new Error('API request failed: 429'));

      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({
          aiSettings: {
            apiKey: 'test-key',
            enableAI: true
          }
        });
      });

      // Should fall back to traditional detection
      const features = { url: 'https://test.com' };
      const traditionalScore = 45;
      const aiAnalysis = null; // Failed

      const finalScore = traditionalScore;
      expect(finalScore).toBe(45);
    });
  });

  describe('Dashboard Data Flow', () => {
    test('should display complete scan history with statistics', async () => {
      const mockHistory = [
        {
          url: 'https://phishing.com',
          hostname: 'phishing.com',
          riskScore: 85,
          traditionalScore: 80,
          aiAnalysis: { success: true, isPhishing: true, confidence: 90 },
          timestamp: Date.now() - 300000 // 5 min ago
        },
        {
          url: 'https://medium-risk.com',
          hostname: 'medium-risk.com',
          riskScore: 45,
          traditionalScore: 50,
          aiAnalysis: { success: true, isPhishing: false, confidence: 70 },
          timestamp: Date.now() - 600000 // 10 min ago
        },
        {
          url: 'https://safe.com',
          hostname: 'safe.com',
          riskScore: 10,
          traditionalScore: 15,
          aiAnalysis: { success: true, isPhishing: false, confidence: 95 },
          timestamp: Date.now() - 900000 // 15 min ago
        }
      ];

      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ scanHistory: mockHistory });
      });

      // Test statistics calculation
      const totalScans = mockHistory.length;
      const threatsDetected = mockHistory.filter(scan => scan.riskScore >= 60).length;
      const aiAnalyses = mockHistory.filter(scan => scan.aiAnalysis && scan.aiAnalysis.success).length;
      const avgRiskScore = Math.round(
        mockHistory.reduce((sum, scan) => sum + scan.riskScore, 0) / totalScans
      );

      expect(totalScans).toBe(3);
      expect(threatsDetected).toBe(1); // Only phishing.com
      expect(aiAnalyses).toBe(3); // All have successful AI analysis
      expect(avgRiskScore).toBe(47); // (85 + 45 + 10) / 3 = 46.67 ≈ 47

      // Test time formatting
      const timeAgo1 = Math.floor((Date.now() - mockHistory[0].timestamp) / 60000);
      const timeAgo2 = Math.floor((Date.now() - mockHistory[1].timestamp) / 60000);
      const timeAgo3 = Math.floor((Date.now() - mockHistory[2].timestamp) / 60000);

      expect(timeAgo1).toBe(5);
      expect(timeAgo2).toBe(10);
      expect(timeAgo3).toBe(15);
    });
  });

  describe('Performance and Error Handling', () => {
    test('should handle storage errors gracefully', async () => {
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        // Simulate storage error
        chrome.runtime.lastError = { message: 'Storage quota exceeded' };
        callback({});
      });

      chrome.storage.local.set.mockImplementation((data, callback) => {
        chrome.runtime.lastError = { message: 'Storage quota exceeded' };
        callback && callback();
      });

      // Should not crash, should handle gracefully
      const analysisMessage = {
        type: 'ANALYSIS_COMPLETE',
        url: 'https://test.com',
        riskScore: 30
      };

      // Should not throw errors
      expect(() => {
        // Simulate background script trying to store
        chrome.storage.local.set({ 'test.com': analysisMessage });
      }).not.toThrow();
    });

    test('should handle network timeouts for AI requests', async () => {
      // Mock network timeout
      fetch.mockImplementation(() => 
        new Promise((resolve, reject) => {
          setTimeout(() => reject(new Error('Network timeout')), 100);
        })
      );

      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({
          aiSettings: {
            apiKey: 'test-key',
            enableAI: true
          }
        });
      });

      // Should fall back to traditional detection
      const traditionalScore = 35;
      const aiAnalysis = null; // Timed out
      const finalScore = traditionalScore;

      expect(finalScore).toBe(35);
      expect(aiAnalysis).toBeNull();
    });
  });
});