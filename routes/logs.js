const express = require('express');
const router = express.Router();

// Simple in-memory log storage
let logs = [];

// Add a log entry
function addLog(level, message) {
  const timestamp = new Date().toISOString();
  logs.push({ level, message, timestamp });
  
  // Keep only last 1000 logs to prevent memory issues
  if (logs.length > 1000) {
    logs = logs.slice(-1000);
  }
}

// Get all logs
router.get('/', (req, res) => {
  try {
    res.json({
      success: true,
      logs: logs.reverse() // Show newest first
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve logs'
    });
  }
});

// Clear logs
router.delete('/', (req, res) => {
  try {
    logs = [];
    res.json({
      success: true,
      message: 'Logs cleared'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to clear logs'
    });
  }
});

// Export the router and addLog function
module.exports = { router, addLog };


