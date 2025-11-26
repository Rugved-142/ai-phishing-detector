// Blocked page functionality

// Get blocked URL from query parameters
const urlParams = new URLSearchParams(window.location.search);
const blockedUrl = urlParams.get('blocked');

// Initialize page when DOM loads
document.addEventListener('DOMContentLoaded', function() {
  if (blockedUrl) {
    document.getElementById('blockedUrl').textContent = decodeURIComponent(blockedUrl);
  }
  
  // Add event listeners
  document.getElementById('goBackBtn').addEventListener('click', goBack);
  document.getElementById('proceedBtn').addEventListener('click', proceedAnyway);
  document.getElementById('reportBtn').addEventListener('click', reportFalsePositive);
});

function goBack() {
  if (window.history.length > 1) {
    window.history.back();
  } else {
    window.close();
  }
}

function proceedAnyway() {
  if (confirm('⚠️ WARNING: You are about to visit a potentially dangerous website that could steal your personal information, passwords, or financial data.\n\nAre you absolutely sure you want to continue?')) {
    // Log the security bypass
    chrome.runtime.sendMessage({
      type: 'SECURITY_BYPASS',
      url: blockedUrl,
      riskScore: 90, // High risk for pre-blocked sites
      timestamp: Date.now()
    });
    
    // Navigate to the original URL
    window.location.href = decodeURIComponent(blockedUrl);
  }
}

function reportFalsePositive() {
  // Create email template for reporting
  const subject = encodeURIComponent('False Positive Report - AI Phishing Detector');
  const body = encodeURIComponent(`I believe the following URL was incorrectly blocked:\n\nURL: ${blockedUrl}\n\nReason: [Please describe why you think this is a legitimate website]\n\nAdditional context: `);
  
  const mailtoLink = `mailto:support@example.com?subject=${subject}&body=${body}`;
  window.open(mailtoLink);
}