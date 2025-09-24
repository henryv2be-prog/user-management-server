const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const { authenticate, requireAdmin } = require('../middleware/auth');
const EventLogger = require('../utils/eventLogger');

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

// Initialize database table for site plan data
const initSitePlanTable = () => {
  const db = new sqlite3.Database('./database.db');
  
  db.serialize(() => {
    // Create site plan table if it doesn't exist
    db.run(`
      CREATE TABLE IF NOT EXISTS site_plan (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        background_image TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create door positions table if it doesn't exist
    db.run(`
      CREATE TABLE IF NOT EXISTS door_positions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        door_id INTEGER,
        x REAL,
        y REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(door_id)
      )
    `);
  });
  
  db.close();
};

// Initialize the table on module load
initSitePlanTable();

// GET /api/site-plan - Get site plan background image
router.get('/', authenticate, requireAdmin, (req, res) => {
  const db = new sqlite3.Database('./database.db');
  
  db.get('SELECT background_image FROM site_plan ORDER BY updated_at DESC LIMIT 1', (err, row) => {
    if (err) {
      console.error('Error fetching site plan:', err);
      res.status(500).json({ error: 'Failed to fetch site plan' });
      return;
    }
    
    if (row && row.background_image) {
      res.json({ backgroundImage: row.background_image });
    } else {
      res.json({ backgroundImage: null });
    }
    
    db.close();
  });
});

// POST /api/site-plan - Save site plan background image
router.post('/', authenticate, requireAdmin, (req, res) => {
  const { backgroundImage } = req.body;
  
  if (!backgroundImage) {
    res.status(400).json({ error: 'Background image is required' });
    return;
  }
  
  const db = new sqlite3.Database('./database.db');
  
  // Insert or update the site plan background
  db.run(`
    INSERT OR REPLACE INTO site_plan (id, background_image, updated_at) 
    VALUES (1, ?, CURRENT_TIMESTAMP)
  `, [backgroundImage], function(err) {
    if (err) {
      console.error('Error saving site plan:', err);
      res.status(500).json({ error: 'Failed to save site plan' });
      return;
    }
    
    console.log('Site plan background saved successfully');
    res.json({ success: true, message: 'Site plan saved successfully' });
    
    // Log the event
    EventLogger.logEvent('site_plan_updated', {
      userId: req.user.id,
      username: req.user.username,
      action: 'site_plan_background_uploaded'
    });
    
    db.close();
  });
});

// GET /api/site-plan/positions - Get door positions
router.get('/positions', authenticate, requireAdmin, (req, res) => {
  const db = new sqlite3.Database('./database.db');
  
  db.all('SELECT door_id, x, y FROM door_positions', (err, rows) => {
    if (err) {
      console.error('Error fetching door positions:', err);
      res.status(500).json({ error: 'Failed to fetch door positions' });
      return;
    }
    
    // Convert rows to object format expected by frontend
    const positions = {};
    rows.forEach(row => {
      positions[row.door_id] = {
        x: row.x,
        y: row.y
      };
    });
    
    res.json({ positions });
    db.close();
  });
});

// POST /api/site-plan/positions - Save door positions
router.post('/positions', authenticate, requireAdmin, (req, res) => {
  const { positions } = req.body;
  
  if (!positions || !Array.isArray(positions)) {
    res.status(400).json({ error: 'Positions array is required' });
    return;
  }
  
  const db = new sqlite3.Database('./database.db');
  
  // Start transaction
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    // Clear existing positions
    db.run('DELETE FROM door_positions', (err) => {
      if (err) {
        console.error('Error clearing door positions:', err);
        db.run('ROLLBACK');
        res.status(500).json({ error: 'Failed to clear existing positions' });
        return;
      }
      
      // Insert new positions
      const stmt = db.prepare('INSERT INTO door_positions (door_id, x, y) VALUES (?, ?, ?)');
      
      let completed = 0;
      let hasError = false;
      
      positions.forEach(position => {
        stmt.run([position.id, position.x, position.y], (err) => {
          if (err && !hasError) {
            hasError = true;
            console.error('Error saving door position:', err);
            db.run('ROLLBACK');
            res.status(500).json({ error: 'Failed to save door positions' });
            return;
          }
          
          completed++;
          if (completed === positions.length && !hasError) {
            stmt.finalize();
            db.run('COMMIT', (err) => {
              if (err) {
                console.error('Error committing transaction:', err);
                res.status(500).json({ error: 'Failed to save door positions' });
                return;
              }
              
              console.log('Door positions saved successfully');
              res.json({ success: true, message: 'Door positions saved successfully' });
              
              // Log the event
              EventLogger.logEvent('site_plan_updated', {
                userId: req.user.id,
                username: req.user.username,
                action: 'door_positions_updated',
                doorCount: positions.length
              });
              
              db.close();
            });
          }
        });
      });
    });
  });
});

module.exports = router;