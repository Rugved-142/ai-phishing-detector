const mongoose = require('mongoose');

const threatSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true,
    index: true
  },
  domain: {
    type: String,
    required: true,
    index: true
  },
  riskScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  threatType: {
    type: String,
    enum: ['phishing', 'malware', 'scam', 'impersonation', 'unknown'],
    default: 'unknown'
  },
  features: {
    isHTTPS: Boolean,
    hasIP: Boolean,
    hasPasswordField: Boolean,
    suspiciousWordCount: Number,
    brandImpersonation: String
  },
  aiAnalysis: {
    confidence: Number,
    riskLevel: String,
    threats: [String],
    explanation: String
  },
  reportCount: {
    type: Number,
    default: 1
  },
  status: {
    type: String,
    enum: ['active', 'verified', 'false_positive', 'resolved'],
    default: 'active'
  },
  firstSeen: {
    type: Date,
    default: Date.now
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  reportedBy: [{
    timestamp: Date,
    source: String // 'user', 'ai', 'community'
  }]
}, {
  timestamps: true
});

// Indexes for performance
threatSchema.index({ domain: 1, riskScore: -1 });
threatSchema.index({ lastSeen: -1 });
threatSchema.index({ status: 1, riskScore: -1 });

module.exports = mongoose.model('Threat', threatSchema);