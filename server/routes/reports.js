const express = require('express');
const router = express.Router();
const Report = require('../models/Report');

// Submit a user report
router.post('/submit', async (req, res) => {
  try {
    const report = new Report(req.body);
    await report.save();
    
    res.json({ 
      success: true, 
      reportId: report._id,
      message: 'Thank you for your report!' 
    });
  } catch (error) {
    console.error('Report submission error:', error);
    res.status(500).json({ error: 'Failed to submit report' });
  }
});

// Get pending reports (admin endpoint)
router.get('/pending', async (req, res) => {
  try {
    // In production, add authentication here
    const reports = await Report.find({ status: 'pending' })
      .sort({ createdAt: -1 })
      .limit(50);
    
    res.json(reports);
  } catch (error) {
    console.error('Get pending reports error:', error);
    res.status(500).json({ error: 'Failed to get pending reports' });
  }
});

module.exports = router;