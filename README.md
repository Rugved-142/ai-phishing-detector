# 🛡️ AI Phishing Detector

AI-powered Chrome extension that detects phishing websites in real-time using advanced pattern recognition.

## ✨ Features

- **Real-time Detection** - Analyzes websites instantly as you browse
- **Risk Scoring** - Advanced algorithm evaluates 20+ risk factors (0-100 scale)
- **Visual Warnings** - Shows alerts for dangerous sites
- **Brand Protection** - Detects fake versions of major brands
- **Privacy First** - All analysis happens locally, no data collection

## 🚀 Quick Start

1. Clone the repository
```bash
git clone https://github.com/yourusername/ai-phishing-detector.git
```

2. Load in Chrome
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `/extension` folder

3. Click the extension icon to see analysis of any website

## 📊 Development Progress

- [x] Core detection engine
- [x] Risk scoring system
- [x] Warning system
- [x] Brand impersonation detection
- [x] Performance optimization
- [ ] AI integration (in progress)
- [ ] Backend server
- [ ] Chrome Web Store deployment

## 📁 Project Structure

```
ai-phishing-detector/
├── extension/          # Chrome extension files
│   ├── manifest.json   # Extension configuration
│   ├── background.js   # Service worker
│   ├── content.js      # Detection engine
│   ├── popup.html      # Extension popup
│   └── popup.js        # Popup functionality
├── server/            # Backend API (coming soon)
├── docs/              # Documentation
└── tests/             # Test files
```

## 🔧 How It Works

1. **Analyzes** - URL patterns, page content, and DOM structure
2. **Calculates** - Risk score based on suspicious indicators
3. **Warns** - Shows banner for high-risk sites (60+ score)
4. **Protects** - Helps users avoid phishing attempts

## 📈 Performance

- Analysis time: < 50ms
- Risk factors: 20+
- Zero external dependencies
- Works completely offline
