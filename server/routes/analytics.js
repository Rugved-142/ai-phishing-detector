const express = require('express');
const router = express.Router();
const Analytics = require('../models/Analytics');

// Log analytics event
router.post('/log', async (req, res) => {
  try {
    const event = new Analytics(req.body);
    await event.save();
    
    res.json({ success: true });
  } catch (error) {
    console.error('Analytics log error:', error);
    res.status(500).json({ error: 'Failed to log analytics' });
  }
});

// Get analytics summary
router.get('/summary', async (req, res) => {
  try {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const summary = await Analytics.aggregate([
      {
        $match: {
          createdAt: { $gte: last24Hours }
        }
      },
      {
        $group: {
          _id: '$eventType',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const result = {};
    summary.forEach(item => {
      result[item._id] = item.count;
    });
    
    res.json({
      period: '24_hours',
      scans: result.scan || 0,
      threatsDetected: result.threat_detected || 0,
      warningsShown: result.warning_shown || 0,
      reports: result.report_submitted || 0
    });
  } catch (error) {
    console.error('Analytics summary error:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

module.exports = router;