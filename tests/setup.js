// Test setup for Chrome Extension testing
global.chrome = {
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
      clear: jest.fn()
    }
  },
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn()
    },
    onInstalled: {
      addListener: jest.fn()
    },
    getURL: jest.fn((path) => `chrome-extension://test/${path}`)
  },
  tabs: {
    create: jest.fn(),
    query: jest.fn(),
    onUpdated: {
      addListener: jest.fn()
    }
  },
  action: {
    openPopup: jest.fn(),
    setBadgeText: jest.fn(),
    setBadgeBackgroundColor: jest.fn()
  },
  scripting: {
    executeScript: jest.fn()
  }
};

// Mock fetch for API calls
global.fetch = jest.fn();

// Mock DOM methods
Object.defineProperty(window, 'location', {
  value: {
    href: 'https://example.com',
    hostname: 'example.com',
    protocol: 'https:'
  }
});

// Mock sessionStorage
Object.defineProperty(window, 'sessionStorage', {
  value: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
  }
});