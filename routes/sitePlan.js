const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const { authenticate, requireAdmin } = require('../middleware/auth');
const EventLogger = require('../utils/eventLogger');
const pool = require('../database/pool');

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

// GET /api/site-plan - Get site plan background image
router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const db = await pool.getConnection();
    
    db.get('SELECT background_image FROM site_plan ORDER BY updated_at DESC LIMIT 1', (err, row) => {
      pool.releaseConnection(db);
      
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
    });
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ error: 'Database connection failed' });
  }
});

// POST /api/site-plan - Save site plan background image
router.post('/', authenticate, requireAdmin, async (req, res) => {
  const { backgroundImage } = req.body;
  
  if (!backgroundImage) {
    res.status(400).json({ error: 'Background image is required' });
    return;
  }
  
  try {
    const db = await pool.getConnection();
    
    // Insert or update the site plan background
    db.run(`
      INSERT OR REPLACE INTO site_plan (id, background_image, updated_at) 
      VALUES (1, ?, CURRENT_TIMESTAMP)
    `, [backgroundImage], function(err) {
      pool.releaseConnection(db);
      
      if (err) {
        console.error('Error saving site plan:', err);
        res.status(500).json({ error: 'Failed to save site plan' });
        return;
      }
      
      console.log('Site plan background saved successfully');
      res.json({ success: true, message: 'Site plan saved successfully' });
      
      // Log the event
      EventLogger.log(req, 'site_plan', 'updated', 'site_plan', 1, 'Site Plan', 'Site plan background image updated');
    });
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ error: 'Database connection failed' });
  }
});

// GET /api/site-plan/positions - Get door positions
router.get('/positions', authenticate, requireAdmin, async (req, res) => {
  try {
    const db = await pool.getConnection();
    
    db.all('SELECT door_id, x, y FROM door_positions', (err, rows) => {
      pool.releaseConnection(db);
      
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
    });
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ error: 'Database connection failed' });
  }
});

// POST /api/site-plan/positions - Save door positions
router.post('/positions', authenticate, requireAdmin, async (req, res) => {
  const { positions } = req.body;
  
  console.log('Received positions to save:', positions);
  
  if (!positions || !Array.isArray(positions)) {
    console.error('Invalid positions data:', positions);
    res.status(400).json({ error: 'Positions array is required' });
    return;
  }
  
  try {
    const db = await pool.getConnection();
    
    // Start transaction
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      
      // Clear existing positions
      db.run('DELETE FROM door_positions', (err) => {
        if (err) {
          console.error('Error clearing door positions:', err);
          db.run('ROLLBACK');
          pool.releaseConnection(db);
          res.status(500).json({ error: 'Failed to clear existing positions' });
          return;
        }
        
        // Insert new positions
        const stmt = db.prepare('INSERT INTO door_positions (door_id, x, y) VALUES (?, ?, ?)');
        
        let completed = 0;
        let hasError = false;
        
        positions.forEach(position => {
          console.log('Inserting position:', position);
          stmt.run([position.id, position.x, position.y], (err) => {
            if (err && !hasError) {
              hasError = true;
              console.error('Error saving door position:', err);
              db.run('ROLLBACK');
              pool.releaseConnection(db);
              res.status(500).json({ error: 'Failed to save door positions' });
              return;
            }
            
            completed++;
            if (completed === positions.length && !hasError) {
              stmt.finalize();
              db.run('COMMIT', (err) => {
                pool.releaseConnection(db);
                if (err) {
                  console.error('Error committing transaction:', err);
                  res.status(500).json({ error: 'Failed to save door positions' });
                  return;
                }
                
                console.log('Door positions saved successfully');
                res.json({ success: true, message: 'Door positions saved successfully' });
                
                // Log the event
                EventLogger.log(req, 'site_plan', 'updated', 'site_plan', 1, 'Site Plan', `Door positions updated for ${positions.length} doors`);
              });
            }
          });
        });
      });
    });
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ error: 'Database connection failed' });
  }
});

module.exports = router;