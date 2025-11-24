document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Load statistics
    const history = await chrome.storage.local.get(['history']);
    const historyData = history.history || [];
    
    // Update stats
    document.getElementById('totalScans').textContent = historyData.length;
    
    const threats = historyData.filter(h => h.riskScore >= 60).length;
    document.getElementById('threatsDetected').textContent = threats;
    
    const aiAnalyses = historyData.filter(h => h.aiAnalysis && h.aiAnalysis.success).length;
    document.getElementById('aiAnalyses').textContent = aiAnalyses;
    
    const avgScore = historyData.length > 0 
      ? Math.round(historyData.reduce((sum, h) => sum + h.riskScore, 0) / historyData.length)
      : 0;
    document.getElementById('avgRiskScore').textContent = avgScore + '%';
    
    // Display history
    const historyBody = document.getElementById('historyBody');
    if (historyData.length > 0) {
      historyBody.innerHTML = historyData
        .slice(-20)
        .reverse()
        .map(item => {
          const riskClass = item.riskScore < 30 ? 'risk-low' : 
                           item.riskScore < 60 ? 'risk-medium' : 'risk-high';
          
          // AI analysis status
          let aiStatus = '❌';
          let aiDebug = 'AI analysis: null';
          
          if (item.aiAnalysis) {
            if (item.aiAnalysis.success === true) {
              aiStatus = '✅';
              aiDebug = `AI: success, confidence: ${item.aiAnalysis.confidence}%`;
            } else {
              aiStatus = '⚠️';
              aiDebug = 'AI analysis: failed';
            }
          }
          
          const date = new Date(item.timestamp).toLocaleString();
          
          return `
            <tr>
              <td>${new URL(item.url).hostname}</td>
              <td><span class="risk-badge ${riskClass}">${item.riskScore}%</span></td>
              <td title="${aiDebug}">${aiStatus}</td>
              <td>${date}</td>
            </tr>
          `;
        }).join('');
    } else {
      historyBody.innerHTML = '<tr><td colspan="4">No scan history available</td></tr>';
    }
    
    // Clear history button
    document.getElementById('clearHistory').addEventListener('click', async () => {
      if (confirm('Are you sure you want to clear all history?')) {
        await chrome.storage.local.set({ history: [] });
        location.reload();
      }
    });
    
  } catch (error) {
    document.body.innerHTML = `
      <div style="padding: 20px; text-align: center;">
        <h2>Dashboard Error</h2>
        <p>There was an error loading the dashboard data.</p>
        <button onclick="location.reload()">Retry</button>
      </div>
    `;
  }
});
