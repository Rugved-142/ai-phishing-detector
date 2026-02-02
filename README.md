# 🛡️ AI Phishing Detector

An advanced Chrome extension that combines traditional pattern recognition with AI-powered analysis to detect phishing websites in real-time. Built with Google's Gemini AI for enhanced accuracy and comprehensive threat detection.

## 🛠️ Tech Stack

### **Frontend (Chrome Extension)**
- **Manifest V3**: Latest Chrome extension architecture
- **JavaScript ES6+**: Modern JavaScript with async/await
- **HTML5/CSS3**: Responsive UI with modern design
- **Chrome APIs**: Storage, tabs, runtime, and badge management

### **AI Integration**
- **Google Gemini API**: 2.5 Flash model for content analysis
- **RESTful Integration**: Secure API communication
- **Response Parsing**: JSON-based AI result processing
- **Fallback Handling**: Graceful degradation when AI unavailable

### **Backend/Server (Optional)**
- **Node.js**: JavaScript runtime environment
- **Express.js**: Web application framework
- **MongoDB**: NoSQL database for data storage
- **RESTful APIs**: Threat intelligence, analytics, and reporting endpoints
- **Authentication Middleware**: Secure API access control

### **Testing Infrastructure**
- **Jest**: JavaScript testing framework
- **JSDOM**: DOM environment simulation for testing
- **Chrome API Mocking**: Complete extension functionality testing
- **Test Cases**: 71 passing tests across 5 test suites with comprehensive coverage

## ✨ Key Features

### 🔍 **Hybrid Detection System**
- **Traditional Algorithm**: Analyzes 20+ risk factors including URL patterns, DOM structure, and suspicious keywords
- **AI Integration**: Google Gemini 2.5 Flash model for advanced content analysis
- **Hybrid Scoring**: Combines both approaches for maximum accuracy (Traditional 60% + AI 40%)

### 🛡️ **Real-time Protection**
- **Pre-loading Block**: Prevents high-risk sites from loading completely
- **Instant Analysis**: Fast detection on page load (typically <100ms)
- **Visual Indicators**: Color-coded risk badges and detailed warnings
- **Professional Blocking Page**: Clean warning interface with user options
- **Browser Integration**: Seamless Chrome extension with popup and dashboard
- **Offline Capable**: Traditional detection works without internet

### 📊 **Comprehensive Dashboard**
- **Scan History**: Track all analyzed websites with timestamps
- **Risk Statistics**: View safety metrics and threat trends
- **Detailed Reports**: Per-site analysis with specific risk factors
- **Export Functionality**: Save scan history for security audits

### 🎯 **Advanced Detection Capabilities**
- **Pre-navigation Blocking**: Intercepts and blocks risky URLs before page loads
- **Pattern-based Screening**: Real-time URL analysis for known phishing indicators
- **Phishing Patterns**: Detects credential harvesting attempts
- **Brand Impersonation**: Identifies fake versions of legitimate sites
- **URL Manipulation**: Catches homograph attacks and suspicious redirects
- **Content Analysis**: AI-powered examination of page text and structure
- **User Override Options**: Professional warning with safe exit or informed proceed


## 🚀 Installation & Setup

### **Option 1: Development Mode**
1. **Clone the repository**
   ```bash
   git clone https://github.com/Rugved-142/ai-phishing-detector.git
   cd ai-phishing-detector
   ```

2. **Set up AI integration (Optional)**
   - Get a Google Gemini API key from [Google AI Studio](https://makersuite.google.com/)
   - The extension works without AI using traditional detection

3. **Load in Chrome**
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode" (top right toggle)
   - Click "Load unpacked"
   - Select the `/extension` folder

4. **Verify Installation**
   - Look for the 🛡️ icon in your browser toolbar
   - Click it on any website to see the security analysis

### **Option 2: Production Build**
```bash
# Install dependencies and run tests
cd tests
npm install
npm test

# Extension is ready to use from /extension folder
```

### **Option 3: Backend Server Setup (Optional)**
The extension works independently, but you can optionally set up the backend server for enhanced features:

1. **Prerequisites**
   - Node.js (v14 or higher)
   - MongoDB (local or cloud instance)

2. **Server Installation**
   ```bash
   cd server
   npm install
   ```

3. **Environment Configuration**
   ```bash
   # Create .env file in /server directory
   cp .env.example .env
   
   # Edit .env with your configuration:
   # MONGODB_URI=mongodb://localhost:27017/phishing-detector
   # JWT_SECRET=your-secret-key
   # PORT=3000
   ```

4. **Start the Server**
   ```bash
   npm start
   # Server runs on http://localhost:3000
   ```

5. **Available Endpoints**
   - `GET /api/threats` - Threat intelligence data
   - `POST /api/reports` - Submit phishing reports
   - `GET /api/analytics` - Security analytics

## 📊 Project Status - COMPLETED ✅

### **Core Development**
- ✅ **Traditional Detection Engine**: 20+ risk factors implemented
- ✅ **AI Integration**: Google Gemini API fully integrated
- ✅ **Hybrid Scoring System**: Traditional + AI combined analysis
- ✅ **Chrome Extension**: Complete Manifest V3 implementation
- ✅ **User Interface**: Popup, dashboard, and settings pages
- ✅ **Background Processing**: Service worker for continuous monitoring

### **Testing & Quality Assurance**
- ✅ **Comprehensive Test Suite**: test cases covering all functionality
- ✅ **Unit Testing**: Individual component testing
- ✅ **Integration Testing**: End-to-end workflow validation
- ✅ **Error Handling**: Graceful degradation and error recovery
- ✅ **Performance Testing**: Sub-50ms analysis time validated

### **Documentation & Deployment Ready**
- ✅ **Complete Documentation**: Technical specs and user guides
- ✅ **Code Quality**: Clean, maintainable, well-commented code
- ✅ **Security Review**: No sensitive data exposure
- ✅ **Chrome Web Store Ready**: Meets all extension guidelines

## 📁 Project Architecture

```
ai-phishing-detector/
├── 📂 extension/                    # Chrome Extension (Manifest V3)
│   ├── 📄 manifest.json            # Extension configuration & permissions
│   ├── 🔧 background.js            # Service worker & pre-loading protection
│   ├── 🛡️ blocked.html             # Professional blocking warning page
│   ├── ⚠️ blocked.js               # Blocking page functionality
│   ├── 🕵️ content.js               # Page analysis & detection engine
│   ├── 🤖 gemini-api.js            # Google Gemini AI integration
│   ├── 🎨 popup.html               # Extension popup interface
│   ├── ⚡ popup.js                 # Popup functionality & interactions
│   ├── 📊 dashboard.html           # Comprehensive security dashboard
│   ├── 🎯 dashboard.js             # Dashboard data & visualization
│   └── 🧪 test-blocking.html       # Testing file for blocking feature
│
├── 🧪 tests/                       # Comprehensive Test Suite
│   ├── 📦 package.json             # Test dependencies & scripts
│   ├── ⚙️ jest.config.cjs          # Jest testing configuration
│   ├── 🔧 setup.js                 # Chrome API mocking setup
│   ├── 🤖 gemini-api.test.js       # AI integration tests (15 tests)
│   ├── 📝 content-script.test.js   # Detection engine tests (17 tests)
│   ├── 🔙 background.test.js       # Service worker tests (10 tests)
│   ├── 🎨 ui-components.test.js    # UI functionality tests (22 tests)
│   ├── 🔗 integration.test.js      # End-to-end tests (7 tests)
│   └── 📚 README.md                # Testing documentation
│
├── 📂 server/                      # Backend API (Optional/Legacy)
│   ├── 🖥️ server.js                # Express.js main server
│   ├── 📦 package.json             # Server dependencies & scripts
│   ├── 🔐 .env                     # Environment variables
│   ├── 📂 models/                  # MongoDB data models
│   │   ├── 📊 Analytics.js         # Analytics data model
│   │   ├── 📝 Report.js            # User reports model
│   │   └── ⚠️ Threat.js            # Threat intelligence model
│   ├── 📂 routes/                  # API endpoint routes
│   │   ├── 📊 analytics.js         # Analytics endpoints
│   │   ├── 📝 reports.js           # User reporting endpoints
│   │   └── ⚠️ threats.js           # Threat data endpoints
│   └── 📂 middleware/              # Express middleware
│       └── 🔐 auth.js              # Authentication middleware
│
├── 📂 docs/                        # Project Documentation
├── 📄 README.md                    # This comprehensive guide
└── 📜 LICENSE                      # MIT License
```

## 🔧 Detection Algorithm

### **Traditional Analysis Pipeline**
1. **URL Pattern Analysis**: Domain reputation, IP usage, URL length, suspicious characters
2. **DOM Structure Examination**: Form fields, hidden elements, iframe usage, external links
3. **Content Scanning**: Suspicious keywords, urgency indicators, brand impersonation attempts
4. **Security Headers**: HTTPS usage, certificate validation, redirect patterns
5. **Risk Scoring**: Weighted algorithm producing 0-100 risk score

### **AI-Enhanced Detection**
1. **Content Extraction**: Page text, meta information, and structural data
2. **Gemini API Analysis**: Natural language processing for phishing indicators
3. **Confidence Assessment**: AI-generated confidence scores and threat categorization
4. **Hybrid Scoring**: 60% traditional + 40% AI for optimal accuracy

### **Enhanced Protection Workflow**
```
Navigation Request → URL Pre-screening → Block/Allow Decision → Page Analysis (if allowed)
        ↓                   ↓                    ↓                        ↓
    Instant             Pattern matching      Block page or        Traditional + AI analysis
                       Brand indicators       Continue loading          Visual warnings
```

**Two-Layer Protection:**
1. **Pre-loading Shield**: Blocks obvious threats before any content loads
2. **Content Analysis**: Deep scanning of allowed pages for subtle threats

## 📊 Performance Metrics

### **Speed & Efficiency**
- ⚡ **Analysis Time**: Fast page scanning (typically <100ms)
- 🔍 **Risk Factors**: 20+ indicators analyzed
- 🎯 **Accuracy**: High accuracy with hybrid AI+traditional approach
- 💾 **Memory Usage**: Lightweight extension footprint (<5MB)
- 🌐 **Offline Capable**: Traditional detection works without internet


## 🚀 Usage Guide

### **Basic Operation**
1. **Pre-loading Protection**: High-risk sites blocked before loading
2. **Automatic Scanning**: Extension analyzes every page you visit
3. **Visual Indicators**: Badge color indicates risk level (🟢 Safe, 🟡 Medium, 🔴 High)
4. **Professional Warnings**: Clean blocking interface with user options
5. **Detailed Analysis**: Click extension icon for comprehensive report
6. **Dashboard Access**: View scan history and security statistics

### **Risk Levels**
- 🟢 **Low Risk (0-30)**: Safe to proceed
- 🟡 **Medium Risk (31-60)**: Exercise caution
- 🔴 **High Risk (61-100)**: Potential phishing threat

### **AI Configuration** 
1. Click extension icon → "Settings"
2. Enter your Google Gemini API key
3. Enable AI analysis for enhanced accuracy
4. Traditional detection continues working without AI

## 🧪 Development & Testing

### **Run Test Suite**
```bash
cd tests
npm install
npm test                 # Run all tests
```

## 🔒 Security & Privacy

### **Privacy First Design**
- 🔒 **Local Processing**: Traditional analysis happens entirely in browser
- 🌐 **Minimal API Calls**: AI analysis only when explicitly enabled
- 💾 **Local Storage**: Scan history stored locally, never transmitted
- 🚫 **No Tracking**: Extension doesn't collect or transmit personal data
- 🛡️ **Secure Communications**: HTTPS-only API communications

### **Permissions Explained**
- `activeTab`: Read current page content for analysis
- `storage`: Save settings and scan history locally
- `host_permissions`: Access websites for real-time scanning
- 
## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

<div align="center">

**🛡️ Stay Safe Online with AI-Powered Phishing Detection**

</div>
