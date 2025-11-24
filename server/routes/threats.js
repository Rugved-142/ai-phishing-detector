const express = require('express');
const router = express.Router();
const Threat = require('../models/Threat');

// Check if URL is a known threat
router.get('/check', async (req, res) => {
  try {
    const { url, domain } = req.query;
    
    if (!url && !domain) {
      return res.status(400).json({ error: 'URL or domain required' });
    }
    
    const query = url ? { url } : { domain };
    const threat = await Threat.findOne(query);
    
    if (threat) {
      // Update last seen
      threat.lastSeen = new Date();
      await threat.save();
      
      res.json({
        isThreat: true,
        threat: {
          riskScore: threat.riskScore,
          threatType: threat.threatType,
          reportCount: threat.reportCount,
          firstSeen: threat.firstSeen
        }
      });
    } else {
      res.json({ isThreat: false });
    }
  } catch (error) {
    console.error('Threat check error:', error);
    res.status(500).json({ error: 'Failed to check threat' });
  }
});

// Report a new threat
router.post('/report', async (req, res) => {
  try {
    const { url, domain, riskScore, features, aiAnalysis } = req.body;
    
    // Check if threat already exists
    let threat = await Threat.findOne({ url });
    
    if (threat) {
      // Update existing threat
      threat.reportCount += 1;
      threat.lastSeen = new Date();
      threat.reportedBy.push({
        timestamp: new Date(),
        source: 'user'
      });
      
      // Update risk score (average)
      threat.riskScore = Math.round(
        (threat.riskScore * (threat.reportCount - 1) + riskScore) / threat.reportCount
      );
      
      await threat.save();
    } else {
      // Create new threat
      threat = new Threat({
        url,
        domain,
        riskScore,
        features,
        aiAnalysis,
        reportedBy: [{
          timestamp: new Date(),
          source: 'user'
        }]
      });
      
      await threat.save();
    }
    
    res.json({ 
      success: true, 
      threatId: threat._id,
      reportCount: threat.reportCount 
    });
  } catch (error) {
    console.error('Threat report error:', error);
    res.status(500).json({ error: 'Failed to report threat' });
  }
});

// Get recent threats (for community protection)
router.get('/recent', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 100, 500);
    
    const threats = await Threat.find({ 
      status: 'active',
      riskScore: { $gte: 60 }
    })
    .sort({ lastSeen: -1 })
    .limit(limit)
    .select('domain riskScore threatType reportCount firstSeen');
    
    res.json(threats);
  } catch (error) {
    console.error('Get recent threats error:', error);
    res.status(500).json({ error: 'Failed to get recent threats' });
  }
});

// Get threat statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await Threat.aggregate([
      {
        $group: {
          _id: null,
          totalThreats: { $sum: 1 },
          avgRiskScore: { $avg: '$riskScore' },
          totalReports: { $sum: '$reportCount' }
        }
      }
    ]);
    
    const recentThreats = await Threat.countDocuments({
      lastSeen: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });
    
    res.json({
      totalThreats: stats[0]?.totalThreats || 0,
      avgRiskScore: Math.round(stats[0]?.avgRiskScore || 0),
      totalReports: stats[0]?.totalReports || 0,
      last24Hours: recentThreats
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

module.exports = router;