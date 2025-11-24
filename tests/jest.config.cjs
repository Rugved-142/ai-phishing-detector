/**
 * Test configuration for Chrome Extension testing
 */

module.exports = {
  // Test environment
  testEnvironment: 'jsdom',
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/setup.js'],
  
  // Test file patterns
  testMatch: [
    '**/*.test.js'
  ],

  // Enable ES modules support
  transform: {},
  
  // Coverage collection
  collectCoverageFrom: [
    '../extension/**/*.js',
    '!../extension/node_modules/**',
    '!**/node_modules/**'
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 80,
      statements: 80
    }
  },
  
  // Module directories
  moduleDirectories: ['node_modules', '<rootDir>'],
  
  // Transform files
  transform: {},
  
  // Verbose output
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks after each test
  restoreMocks: true
};