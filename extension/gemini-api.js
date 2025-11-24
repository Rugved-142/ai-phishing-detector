// Gemini API Module - User-Provided Key Version
class GeminiAnalyzer {
  constructor() {
    this.apiKey = null;
    this.enabled = false;
    this.modelName = 'gemini-2.5-flash';
    this.cache = new Map();
    this.initialized = false;
  }

  /**
   * Initialize settings from storage
   */
  async initializeSettings() {
    if (this.initialized) return;
    
    try {
      const settings = await chrome.storage.local.get(['aiSettings']);
      if (settings.aiSettings) {
        this.apiKey = settings.aiSettings.apiKey;
        this.enabled = settings.aiSettings.enableAI && !!settings.aiSettings.apiKey;
        this.initialized = true;
      } else {
        this.enabled = false;
      }
    } catch (error) {
      console.error('Failed to load AI settings:', error);
      this.enabled = false;
    }
  }

  /**
   * Check if AI is available
   */
  isAvailable() {
    return this.enabled && this.apiKey;
  }

  /**
   * Analyze page content for phishing using Gemini
   */
  async analyzePage(pageData) {
    // Initialize settings if not done
    if (!this.initialized) {
      await this.initializeSettings();
    }
    
    if (!this.isAvailable()) {
      return null;
    }

    // Check cache first
    const cacheKey = pageData.url;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const prompt = this.buildPrompt(pageData);
      const response = await this.callGeminiAPI(prompt);
      const analysis = this.parseResponse(response);
      
      // Cache the result for 5 minutes
      if (analysis.success) {
        this.cache.set(cacheKey, analysis);
        setTimeout(() => this.cache.delete(cacheKey), 5 * 60 * 1000);
      }
      
      return analysis;
    } catch (error) {
      // If API key is invalid, disable AI
      if (error.message.includes('401') || error.message.includes('403')) {
        this.enabled = false;
        await chrome.storage.local.set({
          aiSettings: {
            ...await this.getSettings(),
            enableAI: false,
            lastError: 'Invalid API key'
          }
        });
      }
      
      return this.getFallbackAnalysis();
    }
  }

  /**
   * Get current settings
   */
  async getSettings() {
    const settings = await chrome.storage.local.get(['aiSettings']);
    return settings.aiSettings || {};
  }

  /**
   * Build optimized prompt for phishing detection
   */
  buildPrompt(pageData) {
    const { url, title, content, features } = pageData;
    
    // Limit content to prevent token overflow
    const contentSample = (content || '').substring(0, 500);
    
    return `You are a cybersecurity expert analyzing a webpage for phishing indicators.

WEBPAGE DATA:
- URL: ${url}
- Title: ${title || 'No title'}
- Domain: ${features.hostname}
- HTTPS: ${features.isHTTPS}
- Has Password Fields: ${features.hasPasswordField}
- Suspicious Words Count: ${features.suspiciousWordCount || 0}
- External Links Ratio: ${Math.round(features.externalLinkRatio || 0)}%

PAGE CONTENT SAMPLE:
${contentSample || 'No content available'}

Analyze for phishing indicators and respond with ONLY valid JSON (no markdown):
{
  "isPhishing": true or false,
  "confidence": number between 0-100,
  "riskLevel": "low" or "medium" or "high" or "critical",
  "threats": ["array", "of", "threats"],
  "brandImpersonation": "brand name" or null,
  "explanation": "brief explanation"
}`;
  }

  /**
   * Call Gemini API with user's key
   */
  async callGeminiAPI(prompt) {
    if (!this.apiKey) {
      throw new Error('No API key available');
    }

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${this.modelName}:generateContent`;
    
    const requestBody = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.2,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_NONE"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_NONE"
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_NONE"
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_NONE"
        }
      ]
    };

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey,
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Parse Gemini API response
   */
  parseResponse(response) {
    try {
      if (!response || !response.candidates || !response.candidates[0]) {
        throw new Error('Invalid API response structure');
      }
      
      const candidate = response.candidates[0];
      if (!candidate.content || !candidate.content.parts || !candidate.content.parts[0]) {
        throw new Error('Invalid response content structure');
      }
      
      const text = candidate.content.parts[0].text;
      if (!text) {
        throw new Error('Empty response text');
      }
      
      // Clean the response (remove any markdown formatting)
      const cleanedText = text
        .replace(/```json\n?/gi, '')
        .replace(/```\n?/gi, '')
        .replace(/^[\s\n]*{/, '{')
        .replace(/}[\s\n]*$/, '}')
        .trim();
      
      // Parse JSON
      const analysis = JSON.parse(cleanedText);
      
      // Validate required fields
      if (typeof analysis.isPhishing !== 'boolean' || 
          typeof analysis.confidence !== 'number') {
        throw new Error('Invalid response format - missing required fields');
      }
      
      // Ensure confidence is within valid range
      const confidence = Math.min(100, Math.max(0, analysis.confidence));
      
      return {
        success: true,
        isPhishing: Boolean(analysis.isPhishing),
        confidence: confidence,
        riskLevel: analysis.riskLevel || 'unknown',
        threats: Array.isArray(analysis.threats) ? analysis.threats : [],
        brandImpersonation: analysis.brandImpersonation || null,
        explanation: analysis.explanation || 'AI analysis completed'
      };
    } catch (error) {
      return this.getFallbackAnalysis();
    }
  }

  /**
   * Fallback analysis when AI fails
   */
  getFallbackAnalysis() {
    return {
      success: false,
      isPhishing: null,
      confidence: 0,
      riskLevel: 'unknown',
      threats: [],
      brandImpersonation: null,
      explanation: 'AI analysis unavailable - using traditional detection only'
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }
}

// Create instance and make it available globally
window.GeminiAnalyzer = GeminiAnalyzer;

// Also make it available as a global variable
if (typeof globalThis !== 'undefined') {
  globalThis.GeminiAnalyzer = GeminiAnalyzer;
}