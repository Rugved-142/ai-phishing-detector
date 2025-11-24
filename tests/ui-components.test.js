/**
 * Test suite for popup and dashboard functionality
 * Tests UI interactions, data display, and user actions
 */

// Mock popup script functions
const mockPopupScript = {
  displayCurrentSiteInfo(hostname, riskScore, aiAnalysis) {
    const siteInfo = {
      hostname,
      riskScore,
      riskLevel: riskScore >= 60 ? 'High' : riskScore >= 30 ? 'Medium' : 'Low',
      aiStatus: aiAnalysis ? (aiAnalysis.success ? 'Active' : 'Failed') : 'Disabled'
    };
    return siteInfo;
  },

  formatRiskBadge(score) {
    if (score >= 60) {
      return { class: 'risk-high', text: `${score}% High Risk`, color: '#ff4444' };
    } else if (score >= 30) {
      return { class: 'risk-medium', text: `${score}% Medium Risk`, color: '#ff8800' };
    } else {
      return { class: 'risk-low', text: `${score}% Low Risk`, color: '#00aa00' };
    }
  },

  async getCurrentTabInfo() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length > 0) {
      return {
        url: tabs[0].url,
        hostname: new URL(tabs[0].url).hostname,
        title: tabs[0].title
      };
    }
    return null;
  }
};

// Mock dashboard script functions
const mockDashboardScript = {
  async loadScanHistory() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['scanHistory'], (result) => {
        resolve(result.scanHistory || []);
      });
    });
  },

  calculateStats(history) {
    const totalScans = history.length;
    const threatsDetected = history.filter(scan => scan.riskScore >= 60).length;
    const aiAnalyses = history.filter(scan => scan.aiAnalysis && scan.aiAnalysis.success).length;
    const avgRiskScore = totalScans > 0 
      ? Math.round(history.reduce((sum, scan) => sum + scan.riskScore, 0) / totalScans)
      : 0;

    return {
      totalScans,
      threatsDetected,
      aiAnalyses,
      avgRiskScore
    };
  },

  formatTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  },

  async clearHistory() {
    return new Promise((resolve) => {
      chrome.storage.local.set({ scanHistory: [] }, resolve);
    });
  }
};

describe('Popup Script', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('displayCurrentSiteInfo', () => {
    test('should display high risk site info correctly', () => {
      const siteInfo = mockPopupScript.displayCurrentSiteInfo(
        'suspicious.com',
        75,
        { success: true, isPhishing: true }
      );

      expect(siteInfo).toEqual({
        hostname: 'suspicious.com',
        riskScore: 75,
        riskLevel: 'High',
        aiStatus: 'Active'
      });
    });

    test('should display safe site info correctly', () => {
      const siteInfo = mockPopupScript.displayCurrentSiteInfo(
        'google.com',
        15,
        { success: true, isPhishing: false }
      );

      expect(siteInfo).toEqual({
        hostname: 'google.com',
        riskScore: 15,
        riskLevel: 'Low',
        aiStatus: 'Active'
      });
    });

    test('should handle disabled AI correctly', () => {
      const siteInfo = mockPopupScript.displayCurrentSiteInfo(
        'example.com',
        40,
        null
      );

      expect(siteInfo).toEqual({
        hostname: 'example.com',
        riskScore: 40,
        riskLevel: 'Medium',
        aiStatus: 'Disabled'
      });
    });

    test('should handle failed AI analysis', () => {
      const siteInfo = mockPopupScript.displayCurrentSiteInfo(
        'test.com',
        30,
        { success: false }
      );

      expect(siteInfo).toEqual({
        hostname: 'test.com',
        riskScore: 30,
        riskLevel: 'Medium',
        aiStatus: 'Failed'
      });
    });
  });

  describe('formatRiskBadge', () => {
    test('should format high risk badge', () => {
      const badge = mockPopupScript.formatRiskBadge(80);

      expect(badge).toEqual({
        class: 'risk-high',
        text: '80% High Risk',
        color: '#ff4444'
      });
    });

    test('should format medium risk badge', () => {
      const badge = mockPopupScript.formatRiskBadge(45);

      expect(badge).toEqual({
        class: 'risk-medium',
        text: '45% Medium Risk',
        color: '#ff8800'
      });
    });

    test('should format low risk badge', () => {
      const badge = mockPopupScript.formatRiskBadge(20);

      expect(badge).toEqual({
        class: 'risk-low',
        text: '20% Low Risk',
        color: '#00aa00'
      });
    });

    test('should handle edge case scores', () => {
      expect(mockPopupScript.formatRiskBadge(60).class).toBe('risk-high');
      expect(mockPopupScript.formatRiskBadge(30).class).toBe('risk-medium');
      expect(mockPopupScript.formatRiskBadge(0).class).toBe('risk-low');
    });
  });

  describe('getCurrentTabInfo', () => {
    test('should get current tab info successfully', async () => {
      chrome.tabs.query.mockResolvedValue([{
        url: 'https://example.com/page',
        title: 'Example Page'
      }]);

      const tabInfo = await mockPopupScript.getCurrentTabInfo();

      expect(tabInfo).toEqual({
        url: 'https://example.com/page',
        hostname: 'example.com',
        title: 'Example Page'
      });
      expect(chrome.tabs.query).toHaveBeenCalledWith({
        active: true,
        currentWindow: true
      });
    });

    test('should handle no active tabs', async () => {
      chrome.tabs.query.mockResolvedValue([]);

      const tabInfo = await mockPopupScript.getCurrentTabInfo();

      expect(tabInfo).toBeNull();
    });
  });
});

describe('Dashboard Script', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loadScanHistory', () => {
    test('should load scan history from storage', async () => {
      const mockHistory = [
        { url: 'https://site1.com', riskScore: 20, timestamp: Date.now() },
        { url: 'https://site2.com', riskScore: 70, timestamp: Date.now() - 1000 }
      ];

      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ scanHistory: mockHistory });
      });

      const history = await mockDashboardScript.loadScanHistory();

      expect(history).toEqual(mockHistory);
      expect(chrome.storage.local.get).toHaveBeenCalledWith(['scanHistory'], expect.any(Function));
    });

    test('should handle empty history', async () => {
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({});
      });

      const history = await mockDashboardScript.loadScanHistory();

      expect(history).toEqual([]);
    });
  });

  describe('calculateStats', () => {
    test('should calculate statistics correctly', () => {
      const mockHistory = [
        { riskScore: 80, aiAnalysis: { success: true } },
        { riskScore: 20, aiAnalysis: { success: true } },
        { riskScore: 60, aiAnalysis: { success: false } },
        { riskScore: 40, aiAnalysis: null },
        { riskScore: 30, aiAnalysis: { success: true } }
      ];

      const stats = mockDashboardScript.calculateStats(mockHistory);

      expect(stats).toEqual({
        totalScans: 5,
        threatsDetected: 2, // scores >= 60
        aiAnalyses: 3, // successful AI analyses
        avgRiskScore: 46 // (80+20+60+40+30)/5
      });
    });

    test('should handle empty history', () => {
      const stats = mockDashboardScript.calculateStats([]);

      expect(stats).toEqual({
        totalScans: 0,
        threatsDetected: 0,
        aiAnalyses: 0,
        avgRiskScore: 0
      });
    });
  });

  describe('formatTimeAgo', () => {
    const now = Date.now();

    test('should format recent timestamps', () => {
      expect(mockDashboardScript.formatTimeAgo(now - 30000)).toBe('Just now'); // 30 seconds
      expect(mockDashboardScript.formatTimeAgo(now - 120000)).toBe('2m ago'); // 2 minutes
      expect(mockDashboardScript.formatTimeAgo(now - 3600000)).toBe('1h ago'); // 1 hour
      expect(mockDashboardScript.formatTimeAgo(now - 86400000)).toBe('1d ago'); // 1 day
    });

    test('should handle edge cases', () => {
      expect(mockDashboardScript.formatTimeAgo(now)).toBe('Just now');
      expect(mockDashboardScript.formatTimeAgo(now - 59000)).toBe('Just now'); // 59 seconds
      expect(mockDashboardScript.formatTimeAgo(now - 61000)).toBe('1m ago'); // 61 seconds
    });
  });

  describe('clearHistory', () => {
    test('should clear scan history', async () => {
      chrome.storage.local.set.mockImplementation((data, callback) => {
        callback && callback();
      });

      await mockDashboardScript.clearHistory();

      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        { scanHistory: [] },
        expect.any(Function)
      );
    });
  });
});

describe('UI Integration Tests', () => {
  test('should display dashboard with correct data flow', async () => {
    // Mock scan history
    const mockHistory = [
      {
        url: 'https://phishing.com',
        hostname: 'phishing.com',
        riskScore: 85,
        aiAnalysis: { success: true, isPhishing: true },
        timestamp: Date.now() - 300000 // 5 minutes ago
      },
      {
        url: 'https://safe.com',
        hostname: 'safe.com',
        riskScore: 15,
        aiAnalysis: { success: true, isPhishing: false },
        timestamp: Date.now() - 600000 // 10 minutes ago
      }
    ];

    chrome.storage.local.get.mockImplementation((keys, callback) => {
      callback({ scanHistory: mockHistory });
    });

    // Load and calculate stats
    const history = await mockDashboardScript.loadScanHistory();
    const stats = mockDashboardScript.calculateStats(history);

    expect(stats.totalScans).toBe(2);
    expect(stats.threatsDetected).toBe(1);
    expect(stats.aiAnalyses).toBe(2);
    expect(stats.avgRiskScore).toBe(50);

    // Test time formatting
    const timeAgo1 = mockDashboardScript.formatTimeAgo(mockHistory[0].timestamp);
    const timeAgo2 = mockDashboardScript.formatTimeAgo(mockHistory[1].timestamp);

    expect(timeAgo1).toBe('5m ago');
    expect(timeAgo2).toBe('10m ago');
  });

  test('should handle popup display with current tab info', async () => {
    chrome.tabs.query.mockResolvedValue([{
      url: 'https://suspicious-bank.com',
      title: 'Login - Secure Banking'
    }]);

    const tabInfo = await mockPopupScript.getCurrentTabInfo();
    const siteInfo = mockPopupScript.displayCurrentSiteInfo(
      tabInfo.hostname,
      75,
      { success: true, isPhishing: true, confidence: 90 }
    );
    const badge = mockPopupScript.formatRiskBadge(75);

    expect(siteInfo.riskLevel).toBe('High');
    expect(siteInfo.aiStatus).toBe('Active');
    expect(badge.class).toBe('risk-high');
    expect(badge.color).toBe('#ff4444');
  });
});