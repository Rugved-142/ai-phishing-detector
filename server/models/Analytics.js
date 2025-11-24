const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  date: {
    type: Date,
    default: Date.now,
    index: true
  },
  eventType: {
    type: String,
    enum: ['scan', 'threat_detected', 'warning_shown', 'report_submitted'],
    required: true
  },
  url: String,
  domain: String,
  riskScore: Number,
  aiEnabled: Boolean,
  userAction: String, // 'dismissed', 'left_site', 'continued'
  extensionVersion: String,
  metadata: Object
}, {
  timestamps: true
});

// Auto-delete old analytics after 90 days
analyticsSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

module.exports = mongoose.model('Analytics', analyticsSchema);