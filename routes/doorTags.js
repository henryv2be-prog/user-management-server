const express = require('express');
const { body, validationResult } = require('express-validator');
const { DoorTag } = require('../database/doorTag');
const { Door } = require('../database/door');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { validatePagination } = require('../middleware/validation');
const EventLogger = require('../utils/eventLogger');

const router = express.Router();

// Validation middleware
const validateDoorTag = [
  body('doorId').isInt({ min: 1 }).withMessage('Door ID must be a positive integer'),
  body('tagId').isString().notEmpty().withMessage('Tag ID is required and must be a string'),
  body('tagType').optional().isIn(['nfc', 'qr']).withMessage('Tag type must be either "nfc" or "qr"'),
  body('tagData').optional().isString().withMessage('Tag data must be a string')
];

const validateDoorTagUpdate = [
  body('doorId').optional().isInt({ min: 1 }).withMessage('Door ID must be a positive integer'),
  body('tagType').optional().isIn(['nfc', 'qr']).withMessage('Tag type must be either "nfc" or "qr"'),
  body('tagData').optional().isString().withMessage('Tag data must be a string')
];

// Get all door tags (admin only)
router.get('/', authenticate, requireAdmin, validatePagination, async (req, res) => {
  try {
    const { page = 1, limit = 10, doorId, tagType } = req.query;

    const options = { 
      page: parseInt(page), 
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    };
    
    if (doorId) options.doorId = parseInt(doorId);
    if (tagType) options.tagType = tagType;

    const doorTags = await DoorTag.findAll(options);
    const totalCount = await DoorTag.count(options);

    res.json({
      doorTags: doorTags.map(tag => tag.toJSON()),
      pagination: {
        totalCount,
        currentPage: options.page,
        perPage: options.limit,
        totalPages: Math.ceil(totalCount / options.limit)
      }
    });
  } catch (error) {
    console.error('Get door tags error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve door tags'
    });
  }
});

// Get door tag by ID (admin only)
router.get('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const doorTag = await DoorTag.findById(id);
    if (!doorTag) {
      return res.status(404).json({
        error: 'Door Tag Not Found',
        message: 'The requested door tag does not exist'
      });
    }

    res.json(doorTag.toJSON());
  } catch (error) {
    console.error('Get door tag by ID error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve door tag'
    });
  }
});

// Get door tags by door ID (admin only)
router.get('/door/:doorId', authenticate, requireAdmin, async (req, res) => {
  try {
    const { doorId } = req.params;
    console.log(`Getting tags for door ${doorId}, user: ${req.user.username} (${req.user.role})`);
    
    // Verify door exists
    const door = await Door.findById(doorId);
    if (!door) {
      console.log(`Door ${doorId} not found`);
      return res.status(404).json({
        error: 'Door Not Found',
        message: 'The requested door does not exist'
      });
    }

    console.log(`Door found: ${door.name}, loading tags...`);
    
    // Ensure door_tags table exists and get tags
    let doorTags;
    try {
      doorTags = await DoorTag.findByDoorId(doorId);
      console.log(`Found ${doorTags.length} tags for door ${doorId}`);
    } catch (dbError) {
      if (dbError.message.includes('no such table: door_tags')) {
        console.log('door_tags table missing, creating it...');
        // Create the table
        const sqlite3 = require('sqlite3').verbose();
        const path = require('path');
        const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'database', 'users.db');
        
        await new Promise((resolve, reject) => {
          const db = new sqlite3.Database(DB_PATH);
          db.run(`CREATE TABLE IF NOT EXISTS door_tags (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            door_id INTEGER NOT NULL,
            tag_id TEXT NOT NULL,
            tag_type TEXT NOT NULL CHECK (tag_type IN ('nfc', 'qr')),
            tag_data TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (door_id) REFERENCES doors (id) ON DELETE CASCADE,
            UNIQUE (tag_id)
          )`, (err) => {
            if (err) {
              console.error('Error creating door_tags table:', err);
              reject(err);
            } else {
              console.log('door_tags table created successfully');
              resolve();
            }
            db.close();
          });
        });
        
        // Create indexes
        await new Promise((resolve, reject) => {
          const db = new sqlite3.Database(DB_PATH);
          db.run(`CREATE INDEX IF NOT EXISTS idx_door_tags_door_id ON door_tags(door_id)`, (err) => {
            if (err) {
              console.error('Error creating door_id index:', err);
            } else {
              console.log('door_id index created');
            }
            db.close();
            resolve();
          });
        });
        
        await new Promise((resolve, reject) => {
          const db = new sqlite3.Database(DB_PATH);
          db.run(`CREATE INDEX IF NOT EXISTS idx_door_tags_tag_id ON door_tags(tag_id)`, (err) => {
            if (err) {
              console.error('Error creating tag_id index:', err);
            } else {
              console.log('tag_id index created');
            }
            db.close();
            resolve();
          });
        });
        
        // Now try to get tags again
        doorTags = await DoorTag.findByDoorId(doorId);
        console.log(`Found ${doorTags.length} tags for door ${doorId} after table creation`);
      } else {
        throw dbError;
      }
    }

    res.json({
      door: door.toJSON(),
      doorTags: doorTags.map(tag => tag.toJSON())
    });
  } catch (error) {
    console.error('Get door tags by door ID error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve door tags'
    });
  }
});

// Create new door tag association (admin only)
router.post('/', authenticate, requireAdmin, validateDoorTag, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Please fix the validation errors below',
        errors: errors.array()
      });
    }

    const { doorId, tagId, tagType = 'nfc', tagData } = req.body;

    // Verify door exists
    const door = await Door.findById(doorId);
    if (!door) {
      return res.status(404).json({
        error: 'Door Not Found',
        message: 'The requested door does not exist'
      });
    }

    // Check if tag is already associated
    const existingTag = await DoorTag.findByTagId(tagId);
    if (existingTag) {
      return res.status(409).json({
        error: 'Tag Already Associated',
        message: `Tag ${tagId} is already associated with door ${existingTag.doorId}`
      });
    }

    // Create door tag association
    const tagId_result = await DoorTag.create({
      doorId,
      tagId,
      tagType,
      tagData
    });

    const doorTag = await DoorTag.findById(tagId_result);

    // Log the creation
    await EventLogger.log(req, 'create', 'success', 'DoorTag', doorTag.id, 
      `Door tag association created: ${tagId} -> Door ${door.name}`, 
      `Tag: ${tagId}, Door: ${door.name}`);

    res.status(201).json({
      success: true,
      message: 'Door tag association created successfully',
      doorTag: doorTag.toJSON()
    });
  } catch (error) {
    console.error('Create door tag error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create door tag association'
    });
  }
});

// Update door tag association (admin only)
router.put('/:id', authenticate, requireAdmin, validateDoorTagUpdate, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Please fix the validation errors below',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { doorId, tagType, tagData } = req.body;

    // Check if door tag exists
    const existingTag = await DoorTag.findById(id);
    if (!existingTag) {
      return res.status(404).json({
        error: 'Door Tag Not Found',
        message: 'The requested door tag does not exist'
      });
    }

    // If changing door, verify new door exists
    if (doorId && doorId !== existingTag.doorId) {
      const door = await Door.findById(doorId);
      if (!door) {
        return res.status(404).json({
          error: 'Door Not Found',
          message: 'The requested door does not exist'
        });
      }
    }

    // Update door tag (Note: DoorTag model doesn't have update method yet)
    // For now, we'll delete and recreate
    await DoorTag.delete(id);
    
    const newTagId = await DoorTag.create({
      doorId: doorId || existingTag.doorId,
      tagId: existingTag.tagId,
      tagType: tagType || existingTag.tagType,
      tagData: tagData !== undefined ? tagData : existingTag.tagData
    });

    const updatedTag = await DoorTag.findById(newTagId);

    // Log the update
    await EventLogger.log(req, 'update', 'success', 'DoorTag', updatedTag.id, 
      `Door tag association updated: ${updatedTag.tagId}`, 
      `Tag: ${updatedTag.tagId}, Door: ${doorId || existingTag.doorId}`);

    res.json({
      success: true,
      message: 'Door tag association updated successfully',
      doorTag: updatedTag.toJSON()
    });
  } catch (error) {
    console.error('Update door tag error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update door tag association'
    });
  }
});

// Delete door tag association (admin only)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if door tag exists
    const doorTag = await DoorTag.findById(id);
    if (!doorTag) {
      return res.status(404).json({
        error: 'Door Tag Not Found',
        message: 'The requested door tag does not exist'
      });
    }

    // Delete door tag association
    const deleted = await DoorTag.delete(id);
    if (!deleted) {
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to delete door tag association'
      });
    }

    // Log the deletion
    await EventLogger.log(req, 'delete', 'success', 'DoorTag', id, 
      `Door tag association deleted: ${doorTag.tagId}`, 
      `Tag: ${doorTag.tagId}, Door: ${doorTag.doorId}`);

    res.json({
      success: true,
      message: 'Door tag association deleted successfully'
    });
  } catch (error) {
    console.error('Delete door tag error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete door tag association'
    });
  }
});

// Delete door tag by tag ID (admin only)
router.delete('/tag/:tagId', authenticate, requireAdmin, async (req, res) => {
  try {
    const { tagId } = req.params;

    // Check if door tag exists
    const doorTag = await DoorTag.findByTagId(tagId);
    if (!doorTag) {
      return res.status(404).json({
        error: 'Door Tag Not Found',
        message: 'The requested door tag does not exist'
      });
    }

    // Delete door tag association
    const deleted = await DoorTag.deleteByTagId(tagId);
    if (!deleted) {
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to delete door tag association'
      });
    }

    // Log the deletion
    await EventLogger.log(req, 'delete', 'success', 'DoorTag', doorTag.id, 
      `Door tag association deleted by tag ID: ${tagId}`, 
      `Tag: ${tagId}, Door: ${doorTag.doorId}`);

    res.json({
      success: true,
      message: 'Door tag association deleted successfully'
    });
  } catch (error) {
    console.error('Delete door tag by tag ID error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete door tag association'
    });
  }
});

module.exports = router;
