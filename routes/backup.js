const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const multer = require('multer');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { 
    exportDatabase, 
    saveExportToFile, 
    createTimestampedBackup, 
    getBackupFiles 
} = require('../database/export');
const { 
    importDatabase, 
    validateImportFile, 
    createPreImportBackup 
} = require('../database/import');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        try {
            const uploadDir = './uploads';
            await fs.mkdir(uploadDir, { recursive: true });
            cb(null, uploadDir);
        } catch (error) {
            console.error('Error creating upload directory:', error);
            cb(error, null);
        }
    },
    filename: (req, file, cb) => {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `import-${timestamp}-${file.originalname}`;
        cb(null, fileName);
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/json' || file.originalname.endsWith('.json')) {
            cb(null, true);
        } else {
            cb(new Error('Only JSON files are allowed'), false);
        }
    },
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
    }
});

// Get list of available backups
router.get('/backups', authenticate, requireAdmin, async (req, res) => {
    try {
        const backupFiles = await getBackupFiles();
        res.json({
            success: true,
            backups: backupFiles
        });
    } catch (error) {
        console.error('Error getting backup files:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get backup files',
            message: error.message
        });
    }
});

// Create a new backup
router.post('/backup/create', authenticate, requireAdmin, async (req, res) => {
    try {
        const { backupDir = './backups' } = req.body;
        const backup = await createTimestampedBackup(backupDir);
        
        res.json({
            success: true,
            message: 'Backup created successfully',
            backup: {
                fileName: backup.fileName,
                filePath: backup.filePath,
                metadata: backup.metadata
            }
        });
    } catch (error) {
        console.error('Error creating backup:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create backup',
            message: error.message
        });
    }
});

// Download a specific backup file
router.get('/backup/download/:fileName', authenticate, requireAdmin, async (req, res) => {
    try {
        const { fileName } = req.params;
        const backupDir = './backups';
        const filePath = path.join(backupDir, fileName);
        
        // Check if file exists
        try {
            await fs.access(filePath);
        } catch (error) {
            return res.status(404).json({
                success: false,
                error: 'Backup file not found',
                message: `File ${fileName} does not exist`
            });
        }
        
        // Set appropriate headers for file download
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
        
        // Stream the file
        const fileStream = require('fs').createReadStream(filePath);
        fileStream.pipe(res);
        
    } catch (error) {
        console.error('Error downloading backup:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to download backup',
            message: error.message
        });
    }
});

// Delete a backup file
router.delete('/backup/:fileName', authenticate, requireAdmin, async (req, res) => {
    try {
        const { fileName } = req.params;
        const backupDir = './backups';
        const filePath = path.join(backupDir, fileName);
        
        await fs.unlink(filePath);
        
        res.json({
            success: true,
            message: 'Backup file deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting backup:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete backup',
            message: error.message
        });
    }
});

// Validate an import file
router.post('/import/validate', authenticate, requireAdmin, async (req, res) => {
    try {
        const { filePath } = req.body;
        
        if (!filePath) {
            return res.status(400).json({
                success: false,
                error: 'File path is required'
            });
        }
        
        const validation = await validateImportFile(filePath);
        
        res.json({
            success: true,
            validation: validation
        });
    } catch (error) {
        console.error('Error validating import file:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to validate import file',
            message: error.message
        });
    }
});

// Import database from file
router.post('/import', authenticate, requireAdmin, async (req, res) => {
    try {
        const { 
            filePath, 
            clearExisting = false, 
            skipUsers = false, 
            skipEvents = false, 
            skipAccessLog = false,
            createBackup = true 
        } = req.body;
        
        if (!filePath) {
            return res.status(400).json({
                success: false,
                error: 'File path is required'
            });
        }
        
        // Create backup before importing if requested
        let backupPath = null;
        if (createBackup) {
            try {
                backupPath = await createPreImportBackup();
            } catch (backupError) {
                console.warn('Failed to create pre-import backup:', backupError.message);
            }
        }
        
        // Validate the import file first
        const validation = await validateImportFile(filePath);
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                error: 'Invalid import file',
                validation: validation
            });
        }
        
        // Import the database
        const importOptions = {
            clearExisting,
            skipUsers,
            skipEvents,
            skipAccessLog
        };
        
        const results = await importDatabase(filePath, importOptions);
        
        res.json({
            success: true,
            message: 'Database imported successfully',
            results: results,
            backupCreated: backupPath
        });
        
    } catch (error) {
        console.error('Error importing database:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to import database',
            message: error.message
        });
    }
});

// Upload and import backup file
router.post('/import/upload', authenticate, requireAdmin, (req, res, next) => {
    upload.single('backupFile')(req, res, (err) => {
        if (err) {
            console.error('Multer error:', err);
            return res.status(400).json({
                success: false,
                error: 'File upload error',
                message: err.message
            });
        }
        next();
    });
}, async (req, res) => {
    try {
        console.log('Import upload request received');
        console.log('Request body:', req.body);
        console.log('Request file:', req.file);
        
        if (!req.file) {
            console.log('No file uploaded');
            return res.status(400).json({
                success: false,
                error: 'No file uploaded'
            });
        }
        
        const filePath = req.file.path;
        const importOptions = req.body.importOptions ? JSON.parse(req.body.importOptions) : {};
        
        console.log(`Processing uploaded file: ${req.file.originalname}`);
        console.log(`File saved to: ${filePath}`);
        console.log(`Import options:`, importOptions);
        
        // Validate the uploaded file
        const validation = await validateImportFile(filePath);
        if (!validation.valid) {
            // Clean up uploaded file
            await fs.unlink(filePath).catch(console.error);
            return res.status(400).json({
                success: false,
                error: 'Invalid import file',
                validation: validation
            });
        }
        
        // Create backup before importing
        let backupPath = null;
        try {
            backupPath = await createPreImportBackup();
        } catch (backupError) {
            console.warn('Failed to create pre-import backup:', backupError.message);
        }
        
        // Import the database
        console.log('Starting database import...');
        const results = await importDatabase(filePath, importOptions);
        console.log('Import results:', results);
        
        // Clean up uploaded file after successful import
        await fs.unlink(filePath).catch(console.error);
        
        res.json({
            success: true,
            message: 'Database imported successfully from uploaded file',
            results: results,
            backupCreated: backupPath
        });
        
    } catch (error) {
        console.error('Error importing uploaded file:', error);
        
        // Clean up uploaded file on error
        if (req.file && req.file.path) {
            await fs.unlink(req.file.path).catch(console.error);
        }
        
        res.status(500).json({
            success: false,
            error: 'Failed to import uploaded file',
            message: error.message
        });
    }
});

// Test file upload endpoint
router.post('/test-upload', authenticate, requireAdmin, upload.single('testFile'), (req, res) => {
    try {
        console.log('Test upload received');
        console.log('File:', req.file);
        console.log('Body:', req.body);
        
        if (req.file) {
            // Clean up test file
            fs.unlink(req.file.path).catch(console.error);
        }
        
        res.json({
            success: true,
            message: 'Upload test successful',
            file: req.file ? {
                originalname: req.file.originalname,
                size: req.file.size,
                mimetype: req.file.mimetype
            } : null
        });
    } catch (error) {
        console.error('Test upload error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get system status and backup info
router.get('/status', authenticate, requireAdmin, async (req, res) => {
    try {
        const backupFiles = await getBackupFiles();
        const latestBackup = backupFiles.length > 0 ? backupFiles[0] : null;
        
        res.json({
            success: true,
            status: {
                totalBackups: backupFiles.length,
                latestBackup: latestBackup,
                backupDirectory: './backups',
                databasePath: process.env.DB_PATH || './database/users.db'
            }
        });
    } catch (error) {
        console.error('Error getting backup status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get backup status',
            message: error.message
        });
    }
});

module.exports = router;