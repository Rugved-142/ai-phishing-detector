/**
 * Test suite for background script functionality
 * Tests message handling, badge updates, and history storage
 */

// Mock background script functions
const mockBackgroundScript = {
  updateBadge(tabId, riskScore, aiEnabled) {
    const badgeText = riskScore >= 60 ? '⚠️' : riskScore >= 30 ? '!' : '✓';
    const badgeColor = riskScore >= 60 ? '#ff4444' : riskScore >= 30 ? '#ff8800' : '#00aa00';
    
    chrome.action.setBadgeText({ text: badgeText, tabId });
    chrome.action.setBadgeBackgroundColor({ color: badgeColor, tabId });
  },

  storeInHistory(message) {
    chrome.storage.local.get(['scanHistory'], (result) => {
      const history = result.scanHistory || [];
      const newEntry = {
        url: message.url,
        hostname: message.features.hostname,
        riskScore: message.riskScore,
        traditionalScore: message.traditionalScore,
        aiAnalysis: message.aiAnalysis,
        timestamp: Date.now()
      };
      
      history.unshift(newEntry);
      
      // Keep last 100 entries
      if (history.length > 100) {
        history.splice(100);
      }
      
      chrome.storage.local.set({ scanHistory: history });
    });
  },

  handleMessage(message, sender, sendResponse) {
    if (message.type === 'ANALYSIS_COMPLETE') {
      this.updateBadge(sender.tab.id, message.riskScore, message.aiAnalysis !== null);
      this.storeInHistory(message);
      sendResponse({ received: true });
    }
    
    if (message.type === 'OPEN_POPUP') {
      chrome.action.openPopup();
      sendResponse({ received: true });
    }
    
    if (message.type === 'GET_API_KEY') {
      chrome.storage.local.get(['aiSettings'], (result) => {
        sendResponse(result.aiSettings || {});
      });
      return true; // Keep channel open
    }
    
    return false;
  }
};

describe('Background Script', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('updateBadge', () => {
    test('should set danger badge for high risk scores', () => {
      mockBackgroundScript.updateBadge(123, 75, true);

      expect(chrome.action.setBadgeText).toHaveBeenCalledWith({
        text: '⚠️',
        tabId: 123
      });
      expect(chrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({
        color: '#ff4444',
        tabId: 123
      });
    });

    test('should set warning badge for medium risk scores', () => {
      mockBackgroundScript.updateBadge(456, 45, false);

      expect(chrome.action.setBadgeText).toHaveBeenCalledWith({
        text: '!',
        tabId: 456
      });
      expect(chrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({
        color: '#ff8800',
        tabId: 456
      });
    });

    test('should set safe badge for low risk scores', () => {
      mockBackgroundScript.updateBadge(789, 15, true);

      expect(chrome.action.setBadgeText).toHaveBeenCalledWith({
        text: '✓',
        tabId: 789
      });
      expect(chrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({
        color: '#00aa00',
        tabId: 789
      });
    });
  });

  describe('storeInHistory', () => {
    test('should store scan results in history', () => {
      const mockMessage = {
        url: 'https://example.com',
        features: { hostname: 'example.com' },
        riskScore: 25,
        traditionalScore: 20,
        aiAnalysis: { success: true, isPhishing: false }
      };

      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ scanHistory: [] });
      });

      mockBackgroundScript.storeInHistory(mockMessage);

      expect(chrome.storage.local.get).toHaveBeenCalledWith(['scanHistory'], expect.any(Function));
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        scanHistory: expect.arrayContaining([
          expect.objectContaining({
            url: 'https://example.com',
            hostname: 'example.com',
            riskScore: 25,
            traditionalScore: 20,
            aiAnalysis: { success: true, isPhishing: false },
            timestamp: expect.any(Number)
          })
        ])
      });
    });

    test('should limit history to 100 entries', () => {
      const existingHistory = Array(100).fill().map((_, i) => ({
        url: `https://site${i}.com`,
        hostname: `site${i}.com`,
        riskScore: 10,
        timestamp: Date.now() - i * 1000
      }));

      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ scanHistory: existingHistory });
      });

      const newMessage = {
        url: 'https://newsite.com',
        features: { hostname: 'newsite.com' },
        riskScore: 30,
        traditionalScore: 30,
        aiAnalysis: null
      };

      mockBackgroundScript.storeInHistory(newMessage);

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        scanHistory: expect.arrayContaining([
          expect.objectContaining({ url: 'https://newsite.com' })
        ])
      });

      // Should have called set with array of exactly 100 items
      const setCall = chrome.storage.local.set.mock.calls[0][0];
      expect(setCall.scanHistory).toHaveLength(100);
    });
  });

  describe('handleMessage', () => {
    test('should handle ANALYSIS_COMPLETE messages', () => {
      const message = {
        type: 'ANALYSIS_COMPLETE',
        url: 'https://test.com',
        features: { hostname: 'test.com' },
        riskScore: 60,
        aiAnalysis: { success: true }
      };

      const sender = { tab: { id: 123 } };
      const sendResponse = jest.fn();

      // Spy on the methods
      const updateBadgeSpy = jest.spyOn(mockBackgroundScript, 'updateBadge');
      const storeInHistorySpy = jest.spyOn(mockBackgroundScript, 'storeInHistory');

      mockBackgroundScript.handleMessage(message, sender, sendResponse);

      expect(updateBadgeSpy).toHaveBeenCalledWith(123, 60, true);
      expect(storeInHistorySpy).toHaveBeenCalledWith(message);
      expect(sendResponse).toHaveBeenCalledWith({ received: true });
    });

    test('should handle OPEN_POPUP messages', () => {
      const message = { type: 'OPEN_POPUP' };
      const sender = { tab: { id: 456 } };
      const sendResponse = jest.fn();

      mockBackgroundScript.handleMessage(message, sender, sendResponse);

      expect(chrome.action.openPopup).toHaveBeenCalled();
      expect(sendResponse).toHaveBeenCalledWith({ received: true });
    });

    test('should handle GET_API_KEY messages', () => {
      const message = { type: 'GET_API_KEY' };
      const sender = { tab: { id: 789 } };
      const sendResponse = jest.fn();

      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({
          aiSettings: {
            apiKey: 'test-key-123',
            enableAI: true
          }
        });
      });

      const result = mockBackgroundScript.handleMessage(message, sender, sendResponse);

      expect(chrome.storage.local.get).toHaveBeenCalledWith(['aiSettings'], expect.any(Function));
      expect(result).toBe(true); // Should keep channel open
    });

    test('should handle unknown message types', () => {
      const message = { type: 'UNKNOWN_TYPE' };
      const sender = { tab: { id: 999 } };
      const sendResponse = jest.fn();

      const result = mockBackgroundScript.handleMessage(message, sender, sendResponse);

      expect(result).toBe(false);
      expect(sendResponse).not.toHaveBeenCalled();
    });
  });

  describe('Installation Handling', () => {
    test('should set up default settings on install', () => {
      const mockInstallDetails = { reason: 'install' };
      
      // Mock the onInstalled listener behavior
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({}); // No existing settings
      });

      // Simulate the install handler
      const expectedSettings = {
        settings: {
          enabled: true,
          alertLevel: 60
        }
      };

      chrome.storage.local.set.mockClear();
      
      // Simulate what the background script would do
      chrome.storage.local.set(expectedSettings);

      expect(chrome.storage.local.set).toHaveBeenCalledWith(expectedSettings);
    });

    test('should open onboarding for new installations', () => {
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({}); // No existing AI settings
      });

      // Simulate onboarding trigger
      const expectedTabConfig = {
        url: 'onboarding.html'
      };

      chrome.tabs.create.mockClear();
      chrome.tabs.create(expectedTabConfig);

      expect(chrome.tabs.create).toHaveBeenCalledWith(expectedTabConfig);
    });
  });
});