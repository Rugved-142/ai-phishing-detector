/**
 * Test suite for GeminiAnalyzer class
 * Tests AI integration, API calls, and response parsing
 */

// Mock the GeminiAnalyzer class for testing
class GeminiAnalyzer {
  constructor() {
    this.apiKey = null;
    this.enabled = false;
    this.modelName = 'gemini-2.5-flash';
    this.cache = new Map();
    this.initialized = false;
  }

  async initializeSettings() {
    const settings = await chrome.storage.local.get(['aiSettings']);
    if (settings.aiSettings) {
      this.apiKey = settings.aiSettings.apiKey;
      this.enabled = settings.aiSettings.enableAI && !!settings.aiSettings.apiKey;
      this.initialized = true;
    } else {
      this.enabled = false;
    }
  }

  isAvailable() {
    return this.enabled && !!this.apiKey;
  }

  async callGeminiAPI(prompt) {
    if (!this.apiKey) {
      throw new Error('No API key available');
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.modelName}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    return response.json();
  }

  parseResponse(response) {
    try {
      if (!response?.candidates?.[0]?.content?.parts?.[0]?.text) {
        throw new Error('Invalid API response structure');
      }

      const text = response.candidates[0].content.parts[0].text;
      const analysis = JSON.parse(text.replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim());

      if (typeof analysis.isPhishing !== 'boolean' || typeof analysis.confidence !== 'number') {
        throw new Error('Invalid response format');
      }

      return {
        success: true,
        isPhishing: Boolean(analysis.isPhishing),
        confidence: Math.min(100, Math.max(0, analysis.confidence)),
        riskLevel: analysis.riskLevel || 'unknown',
        threats: Array.isArray(analysis.threats) ? analysis.threats : [],
        brandImpersonation: analysis.brandImpersonation || null,
        explanation: analysis.explanation || 'AI analysis completed'
      };
    } catch (error) {
      return {
        success: false,
        isPhishing: null,
        confidence: 0,
        riskLevel: 'unknown',
        threats: [],
        brandImpersonation: null,
        explanation: 'AI analysis unavailable'
      };
    }
  }

  async analyzePage(pageData) {
    if (!this.initialized) {
      await this.initializeSettings();
    }

    if (!this.isAvailable()) {
      return null;
    }

    const prompt = `Analyze this webpage for phishing: ${JSON.stringify(pageData)}`;
    const response = await this.callGeminiAPI(prompt);
    return this.parseResponse(response);
  }
}

describe('GeminiAnalyzer', () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new GeminiAnalyzer();
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize with default values', () => {
      expect(analyzer.apiKey).toBeNull();
      expect(analyzer.enabled).toBe(false);
      expect(analyzer.initialized).toBe(false);
      expect(analyzer.modelName).toBe('gemini-2.5-flash');
    });

    test('should initialize settings from storage', async () => {
      const mockSettings = {
        aiSettings: {
          apiKey: 'test-api-key',
          enableAI: true
        }
      };
      chrome.storage.local.get.mockResolvedValue(mockSettings);

      await analyzer.initializeSettings();

      expect(analyzer.apiKey).toBe('test-api-key');
      expect(analyzer.enabled).toBe(true);
      expect(analyzer.initialized).toBe(true);
    });

    test('should handle missing settings', async () => {
      chrome.storage.local.get.mockResolvedValue({});

      await analyzer.initializeSettings();

      expect(analyzer.enabled).toBe(false);
      expect(analyzer.apiKey).toBeNull();
    });
  });

  describe('Availability Check', () => {
    test('should return false when not enabled', () => {
      analyzer.enabled = false;
      analyzer.apiKey = 'test-key';

      expect(analyzer.isAvailable()).toBe(false);
    });

    test('should return false when no API key', () => {
      analyzer.enabled = true;
      analyzer.apiKey = null;

      expect(analyzer.isAvailable()).toBe(false);
    });

    test('should return true when enabled and has API key', () => {
      analyzer.enabled = true;
      analyzer.apiKey = 'test-key';

      expect(analyzer.isAvailable()).toBe(true);
    });
  });

  describe('API Calls', () => {
    test('should make API call with correct parameters', async () => {
      analyzer.apiKey = 'test-api-key';
      
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          candidates: [{
            content: {
              parts: [{ text: '{"isPhishing": false, "confidence": 25}' }]
            }
          }]
        })
      };
      
      fetch.mockResolvedValue(mockResponse);

      const result = await analyzer.callGeminiAPI('test prompt');

      expect(fetch).toHaveBeenCalledWith(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': 'test-api-key'
          }
        })
      );
      expect(result).toBeDefined();
    });

    test('should throw error when no API key', async () => {
      analyzer.apiKey = null;

      await expect(analyzer.callGeminiAPI('test')).rejects.toThrow('No API key available');
    });

    test('should handle API errors', async () => {
      analyzer.apiKey = 'test-key';
      fetch.mockResolvedValue({
        ok: false,
        status: 401
      });

      await expect(analyzer.callGeminiAPI('test')).rejects.toThrow('API request failed: 401');
    });
  });

  describe('Response Parsing', () => {
    test('should parse valid response correctly', () => {
      const mockResponse = {
        candidates: [{
          content: {
            parts: [{
              text: '{"isPhishing": true, "confidence": 85, "riskLevel": "high", "threats": ["suspicious"], "explanation": "test"}'
            }]
          }
        }]
      };

      const result = analyzer.parseResponse(mockResponse);

      expect(result).toEqual({
        success: true,
        isPhishing: true,
        confidence: 85,
        riskLevel: 'high',
        threats: ['suspicious'],
        brandImpersonation: null,
        explanation: 'test'
      });
    });

    test('should handle invalid response structure', () => {
      const result = analyzer.parseResponse({ invalid: 'response' });

      expect(result.success).toBe(false);
      expect(result.explanation).toBe('AI analysis unavailable');
    });

    test('should handle malformed JSON', () => {
      const mockResponse = {
        candidates: [{
          content: {
            parts: [{ text: 'invalid json' }]
          }
        }]
      };

      const result = analyzer.parseResponse(mockResponse);

      expect(result.success).toBe(false);
    });

    test('should clamp confidence values', () => {
      const mockResponse = {
        candidates: [{
          content: {
            parts: [{
              text: '{"isPhishing": false, "confidence": 150}'
            }]
          }
        }]
      };

      const result = analyzer.parseResponse(mockResponse);

      expect(result.confidence).toBe(100);
    });
  });

  describe('Page Analysis', () => {
    test('should analyze page when available', async () => {
      analyzer.initialized = true;
      analyzer.enabled = true;
      analyzer.apiKey = 'test-key';

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          candidates: [{
            content: {
              parts: [{ text: '{"isPhishing": false, "confidence": 30}' }]
            }
          }]
        })
      };
      
      fetch.mockResolvedValue(mockResponse);

      const pageData = {
        url: 'https://example.com',
        title: 'Test Page',
        content: 'Safe content'
      };

      const result = await analyzer.analyzePage(pageData);

      expect(result.success).toBe(true);
      expect(result.isPhishing).toBe(false);
    });

    test('should return null when not available', async () => {
      analyzer.enabled = false;
      chrome.storage.local.get.mockResolvedValue({});

      const result = await analyzer.analyzePage({ url: 'test' });

      expect(result).toBeNull();
    });
  });
});