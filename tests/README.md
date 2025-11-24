# AI Phishing Detector - Test Suite

This directory contains comprehensive test suites for the AI Phishing Detector Chrome extension.

## Test Structure

```
tests/
├── package.json              # Test dependencies and scripts
├── setup.js                  # Test environment setup
├── jest.config.js            # Jest configuration
├── gemini-api.test.js        # AI integration tests
├── content-script.test.js    # Content script functionality tests
├── background.test.js        # Background script tests
├── ui-components.test.js     # Popup and dashboard tests
└── integration.test.js       # End-to-end integration tests
```

## Running Tests

### Prerequisites

```bash
cd tests
npm install
```

### Test Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Test Coverage

The test suite covers:

### Core Functionality (90%+ coverage)
- ✅ **Phishing Detection Algorithm**: Traditional risk scoring, feature extraction
- ✅ **AI Integration**: Gemini API calls, response parsing, error handling
- ✅ **Content Script**: DOM analysis, pattern detection, brand impersonation
- ✅ **Background Script**: Message handling, badge updates, history storage

### User Interface (85%+ coverage)
- ✅ **Popup Interface**: Risk display, current site info, user interactions
- ✅ **Dashboard**: Statistics calculation, history display, data formatting
- ✅ **Options Page**: Settings management, API key validation

### Integration Scenarios (80%+ coverage)
- ✅ **End-to-End Workflows**: Complete detection and response cycles
- ✅ **Error Handling**: Network failures, storage errors, API timeouts
- ✅ **Edge Cases**: Malformed data, missing permissions, invalid URLs

## Test Categories

### Unit Tests

**Gemini API (`gemini-api.test.js`)**
- Class initialization and settings loading
- API key validation and availability checks
- HTTP request formation and response handling
- JSON response parsing and validation
- Error handling and fallback mechanisms

**Content Script (`content-script.test.js`)**
- URL and DOM feature extraction
- Link analysis and external link detection
- Suspicious pattern recognition
- Risk score calculation algorithms
- Hybrid scoring with AI integration

**Background Script (`background.test.js`)**
- Chrome runtime message handling
- Extension badge updates based on risk levels
- Scan history storage and management
- Installation and onboarding triggers

### UI Tests

**UI Components (`ui-components.test.js`)**
- Popup site information display
- Risk badge formatting and styling
- Dashboard statistics calculation
- History data loading and formatting
- User interaction handling

### Integration Tests

**End-to-End (`integration.test.js`)**
- Complete phishing detection workflows
- High-risk site handling with AI analysis
- Safe site processing and badge updates
- AI service failure scenarios
- Performance under various conditions

## Mock Infrastructure

### Chrome APIs
- `chrome.storage.local`: Data persistence simulation
- `chrome.runtime`: Message passing and extension lifecycle
- `chrome.tabs`: Tab information and management
- `chrome.action`: Extension badge and popup control

### Network Requests
- Fetch API mocking for Gemini AI calls
- Request/response simulation with various scenarios
- Network timeout and error condition testing

### DOM Environment
- JSDOM for browser environment simulation
- Dynamic DOM manipulation testing
- Event handling and user interaction simulation

## Test Data

### Sample Phishing Scenarios
```javascript
// High-risk phishing site
{
  url: 'http://192.168.1.1/paypal-secure-login.php',
  features: {
    hasIP: true,
    isHTTPS: false,
    hasPasswordField: true,
    suspiciousWordCount: 4,
    hasUrgencyIndicators: true
  },
  expectedRisk: 85-95
}

// Safe legitimate site
{
  url: 'https://google.com/search',
  features: {
    hasIP: false,
    isHTTPS: true,
    hasPasswordField: false,
    suspiciousWordCount: 0
  },
  expectedRisk: 0-15
}
```

### AI Response Samples
```javascript
// Phishing detection
{
  success: true,
  isPhishing: true,
  confidence: 92,
  threats: ['brand impersonation', 'credential harvesting'],
  explanation: 'Multiple phishing indicators detected'
}

// Safe site
{
  success: true,
  isPhishing: false,
  confidence: 95,
  threats: [],
  explanation: 'Legitimate website with no threats detected'
}
```

## Performance Testing

### Metrics Tracked
- **Analysis Speed**: Time to complete phishing detection
- **Memory Usage**: Extension memory footprint during operation
- **API Response Time**: Gemini AI request/response latency
- **Storage Operations**: Chrome storage read/write performance

### Benchmarks
- Traditional analysis: < 50ms
- AI analysis: < 2000ms (network dependent)
- Total workflow: < 2500ms
- Memory usage: < 10MB during active scanning

## Continuous Integration

### Automated Testing
- All tests run automatically on commits
- Coverage reports generated for each build
- Performance benchmarks tracked over time
- Cross-browser compatibility validation

### Quality Gates
- Minimum 80% test coverage required
- All critical path tests must pass
- Performance benchmarks must be met
- No security vulnerabilities in dependencies

## Contributing to Tests

When adding new features:

1. **Write tests first** (TDD approach)
2. **Cover edge cases** and error conditions
3. **Mock external dependencies** properly
4. **Test user interactions** and workflows
5. **Maintain performance benchmarks**

### Example Test Addition

```javascript
describe('New Feature', () => {
  test('should handle specific scenario', () => {
    // Arrange
    const mockData = setupTestData();
    
    // Act
    const result = newFeatureFunction(mockData);
    
    // Assert
    expect(result).toEqual(expectedOutput);
  });
});
```

## Debugging Tests

### Common Issues
- **Mock not working**: Check setup.js configuration
- **Async test timeout**: Increase Jest timeout or fix async handling
- **Chrome API errors**: Verify mock implementation matches real API
- **Coverage gaps**: Add tests for uncovered code paths

### Debug Commands
```bash
# Run single test file
npm test -- gemini-api.test.js

# Run with debug output
npm test -- --verbose

# Run specific test
npm test -- --testNamePattern="should detect phishing"
```