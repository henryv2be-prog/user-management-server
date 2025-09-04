const express = require('express');
const { License } = require('../database/license');
const { 
  validateLicense, 
  validateLicenseUpdate, 
  validateId, 
  validatePagination 
} = require('../middleware/validation');
const { 
  authenticate, 
  requireAdmin, 
  authorizeSelfOrAdmin 
} = require('../middleware/auth');

const router = express.Router();

// Get all licenses (admin only)
router.get('/', authenticate, requireAdmin, validatePagination, async (req, res) => {
  try {
    const { page = 1, limit = 10, licenseType, isActive } = req.query;
    
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      licenseType,
      isActive: isActive !== undefined ? isActive === 'true' : undefined
    };
    
    const [licenses, totalCount] = await Promise.all([
      License.findAll(options),
      License.count(options)
    ]);
    
    const totalPages = Math.ceil(totalCount / options.limit);
    
    res.json({
      licenses: licenses.map(license => license.toJSON()),
      pagination: {
        page: options.page,
        limit: options.limit,
        totalCount,
        totalPages,
        hasNext: options.page < totalPages,
        hasPrev: options.page > 1
      }
    });
  } catch (error) {
    console.error('Get licenses error:', error);
    res.status(500).json({
      error: 'Failed to fetch licenses',
      details: error.message
    });
  }
});

// Get active license
router.get('/active', authenticate, requireAdmin, async (req, res) => {
  try {
    const license = await License.findActive();
    
    if (!license) {
      return res.status(404).json({
        error: 'No active license found'
      });
    }
    
    res.json(license.toJSON());
  } catch (error) {
    console.error('Get active license error:', error);
    res.status(500).json({
      error: 'Failed to fetch active license',
      details: error.message
    });
  }
});

// Get license by ID
router.get('/:id', authenticate, requireAdmin, validateId, async (req, res) => {
  try {
    const license = await License.findById(req.params.id);
    
    if (!license) {
      return res.status(404).json({
        error: 'License not found'
      });
    }
    
    res.json(license.toJSON());
  } catch (error) {
    console.error('Get license error:', error);
    res.status(500).json({
      error: 'Failed to fetch license',
      details: error.message
    });
  }
});

// Get license by key
router.get('/key/:licenseKey', authenticate, requireAdmin, async (req, res) => {
  try {
    const license = await License.findByLicenseKey(req.params.licenseKey);
    
    if (!license) {
      return res.status(404).json({
        error: 'License not found'
      });
    }
    
    res.json(license.toJSON());
  } catch (error) {
    console.error('Get license by key error:', error);
    res.status(500).json({
      error: 'Failed to fetch license',
      details: error.message
    });
  }
});

// Create new license
router.post('/', authenticate, requireAdmin, validateLicense, async (req, res) => {
  try {
    const licenseData = req.body;
    const license = await License.create(licenseData);
    
    res.status(201).json(license.toJSON());
  } catch (error) {
    console.error('Create license error:', error);
    res.status(500).json({
      error: 'Failed to create license',
      details: error.message
    });
  }
});

// Update license
router.put('/:id', authenticate, requireAdmin, validateId, validateLicenseUpdate, async (req, res) => {
  try {
    const license = await License.findById(req.params.id);
    
    if (!license) {
      return res.status(404).json({
        error: 'License not found'
      });
    }
    
    const updatedLicense = await license.update(req.body);
    res.json(updatedLicense.toJSON());
  } catch (error) {
    console.error('Update license error:', error);
    res.status(500).json({
      error: 'Failed to update license',
      details: error.message
    });
  }
});

// Delete license
router.delete('/:id', authenticate, requireAdmin, validateId, async (req, res) => {
  try {
    const license = await License.findById(req.params.id);
    
    if (!license) {
      return res.status(404).json({
        error: 'License not found'
      });
    }
    
    await license.delete();
    res.json({ message: 'License deleted successfully' });
  } catch (error) {
    console.error('Delete license error:', error);
    res.status(500).json({
      error: 'Failed to delete license',
      details: error.message
    });
  }
});

// Activate license
router.post('/:id/activate', authenticate, requireAdmin, validateId, async (req, res) => {
  try {
    const license = await License.findById(req.params.id);
    
    if (!license) {
      return res.status(404).json({
        error: 'License not found'
      });
    }
    
    const updatedLicense = await license.activate();
    res.json({
      success: true,
      message: 'License activated',
      license: updatedLicense.toJSON()
    });
  } catch (error) {
    console.error('Activate license error:', error);
    res.status(500).json({
      error: 'Failed to activate license',
      details: error.message
    });
  }
});

// Deactivate license
router.post('/:id/deactivate', authenticate, requireAdmin, validateId, async (req, res) => {
  try {
    const license = await License.findById(req.params.id);
    
    if (!license) {
      return res.status(404).json({
        error: 'License not found'
      });
    }
    
    const updatedLicense = await license.deactivate();
    res.json({
      success: true,
      message: 'License deactivated',
      license: updatedLicense.toJSON()
    });
  } catch (error) {
    console.error('Deactivate license error:', error);
    res.status(500).json({
      error: 'Failed to deactivate license',
      details: error.message
    });
  }
});

// Check license usage
router.get('/:id/usage', authenticate, requireAdmin, validateId, async (req, res) => {
  try {
    const license = await License.findById(req.params.id);
    
    if (!license) {
      return res.status(404).json({
        error: 'License not found'
      });
    }
    
    const usage = await license.checkUsage();
    res.json(usage);
  } catch (error) {
    console.error('Check license usage error:', error);
    res.status(500).json({
      error: 'Failed to check license usage',
      details: error.message
    });
  }
});

// Validate license key
router.post('/validate', async (req, res) => {
  try {
    const { licenseKey } = req.body;
    
    if (!licenseKey) {
      return res.status(400).json({
        error: 'License key is required'
      });
    }
    
    const license = await License.findByLicenseKey(licenseKey);
    
    if (!license) {
      return res.status(404).json({
        error: 'Invalid license key'
      });
    }
    
    const isValid = license.isValid();
    const status = license.getStatus();
    const daysUntilExpiration = license.getDaysUntilExpiration();
    const limits = license.getLimits();
    
    res.json({
      valid: isValid,
      status,
      daysUntilExpiration,
      limits,
      license: license.toJSON()
    });
  } catch (error) {
    console.error('Validate license error:', error);
    res.status(500).json({
      error: 'Failed to validate license',
      details: error.message
    });
  }
});

// Get license status
router.get('/:id/status', authenticate, requireAdmin, validateId, async (req, res) => {
  try {
    const license = await License.findById(req.params.id);
    
    if (!license) {
      return res.status(404).json({
        error: 'License not found'
      });
    }
    
    const status = license.getStatus();
    const daysUntilExpiration = license.getDaysUntilExpiration();
    const isValid = license.isValid();
    
    res.json({
      status,
      daysUntilExpiration,
      isValid,
      expiresAt: license.expiresAt
    });
  } catch (error) {
    console.error('Get license status error:', error);
    res.status(500).json({
      error: 'Failed to get license status',
      details: error.message
    });
  }
});

module.exports = router;