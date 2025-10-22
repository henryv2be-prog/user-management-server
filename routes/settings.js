const express = require('express');
const axios = require('axios');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { User } = require('../database/models');
const { Door } = require('../database/door');
const AccessGroup = require('../database/accessGroup');
const Event = require('../database/event');

const router = express.Router();

// Cache prevention middleware for all routes
router.use((req, res, next) => {
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate, private',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Last-Modified': new Date().toUTCString(),
    'ETag': `"${Date.now()}"`
  });
  next();
});

// Get system information
router.get('/system-info', authenticate, requireAdmin, async (req, res) => {
  try {
    const [totalUsers, totalDoors, totalAccessGroups, totalEvents] = await Promise.all([
      User.count({}),
      Door.count({}),
      AccessGroup.count({}),
      Event.count({})
    ]);

    const systemInfo = {
      serverStatus: 'online',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      databaseStatus: 'connected',
      totalUsers,
      totalDoors,
      totalAccessGroups,
      totalEvents,
      memoryUsage: process.memoryUsage(),
      nodeVersion: process.version,
      platform: process.platform
    };

    res.json(systemInfo);
  } catch (error) {
    console.error('Get system info error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve system information'
    });
  }
});

// Get version information
router.get('/version-info', authenticate, requireAdmin, async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    // Try to get git commit SHA
    let commitSha = 'unknown';
    let buildDate = new Date().toISOString();
    
    try {
      // Try to read from .git/HEAD and .git/refs/heads/master
      const gitHeadPath = path.join(__dirname, '../.git/HEAD');
      if (fs.existsSync(gitHeadPath)) {
        const headContent = fs.readFileSync(gitHeadPath, 'utf8').trim();
        if (headContent.startsWith('ref: ')) {
          const refPath = path.join(__dirname, '../.git', headContent.substring(5));
          if (fs.existsSync(refPath)) {
            commitSha = fs.readFileSync(refPath, 'utf8').trim().substring(0, 7);
          }
        } else {
          commitSha = headContent.substring(0, 7);
        }
      }
    } catch (gitError) {
      console.log('Could not read git info:', gitError.message);
    }
    
    // Try to get build date from package.json or use current time
    try {
      const packagePath = path.join(__dirname, '../package.json');
      if (fs.existsSync(packagePath)) {
        const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        if (packageJson.buildDate) {
          buildDate = packageJson.buildDate;
        }
      }
    } catch (packageError) {
      console.log('Could not read package.json:', packageError.message);
    }

    const versionInfo = {
      commitSha,
      buildDate,
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch
    };

    res.json(versionInfo);
  } catch (error) {
    console.error('Get version info error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve version information'
    });
  }
});










module.exports = router;