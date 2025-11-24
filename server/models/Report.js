const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true
  },
  reportType: {
    type: String,
    enum: ['false_positive', 'missed_threat', 'confirmed_threat'],
    required: true
  },
  description: String,
  userAgent: String,
  extensionVersion: String,
  features: Object,
  aiAnalysis: Object,
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'actioned', 'dismissed'],
    default: 'pending'
  },
  reviewNotes: String
}, {
  timestamps: true
});

module.exports = mongoose.model('Report', reportSchema);