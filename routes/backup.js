const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
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
router.post('/import/upload', authenticate, requireAdmin, async (req, res) => {
    try {
        // This would typically use multer middleware for file uploads
        // For now, we'll expect the file to be uploaded to a specific location
        const { fileName, importOptions = {} } = req.body;
        
        if (!fileName) {
            return res.status(400).json({
                success: false,
                error: 'File name is required'
            });
        }
        
        const uploadDir = './uploads';
        const filePath = path.join(uploadDir, fileName);
        
        // Validate the uploaded file
        const validation = await validateImportFile(filePath);
        if (!validation.valid) {
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
        const results = await importDatabase(filePath, importOptions);
        
        res.json({
            success: true,
            message: 'Database imported successfully from uploaded file',
            results: results,
            backupCreated: backupPath
        });
        
    } catch (error) {
        console.error('Error importing uploaded file:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to import uploaded file',
            message: error.message
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