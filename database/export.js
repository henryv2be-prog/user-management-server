const { getDatabase, DB_PATH } = require('./connection');
const pool = require('./pool');
const fs = require('fs').promises;
const path = require('path');

/**
 * Export all database data to a JSON file
 * @param {string} exportPath - Path where to save the export file
 * @returns {Promise<Object>} - Export metadata
 */
const exportDatabase = async (exportPath) => {
    return new Promise(async (resolve, reject) => {
        try {
            const db = await pool.getConnection();
            const exportData = {
                metadata: {
                    exportDate: new Date().toISOString(),
                    version: '1.0',
                    databasePath: DB_PATH,
                    tables: []
                },
                data: {}
            };

            // List of all tables to export
            const tables = [
                'users',
                'doors', 
                'door_commands',
                'access_groups',
                'door_access_groups',
                'user_access_groups',
                'access_log',
                'access_requests',
                'events',
                'site_plan',
                'door_positions',
                'door_tags',
                'visitors'
            ];

            let completedTables = 0;
            const totalTables = tables.length;

            const checkCompletion = () => {
                completedTables++;
                if (completedTables === totalTables) {
                    pool.releaseConnection(db);
                    resolve(exportData);
                }
            };

            // Export each table
            tables.forEach(tableName => {
                db.all(`SELECT * FROM ${tableName}`, (err, rows) => {
                    if (err) {
                        console.error(`Error exporting table ${tableName}:`, err.message);
                        pool.releaseConnection(db);
                        reject(err);
                        return;
                    }

                    exportData.data[tableName] = rows;
                    exportData.metadata.tables.push({
                        name: tableName,
                        recordCount: rows.length,
                        exportedAt: new Date().toISOString()
                    });

                    console.log(`Exported table ${tableName}: ${rows.length} records`);
                    checkCompletion();
                });
            });

        } catch (error) {
            console.error('Database export error:', error);
            reject(error);
        }
    });
};

/**
 * Save export data to file
 * @param {Object} exportData - The export data object
 * @param {string} filePath - Path where to save the file
 * @returns {Promise<string>} - The saved file path
 */
const saveExportToFile = async (exportData, filePath) => {
    try {
        // Ensure the directory exists
        const dir = path.dirname(filePath);
        await fs.mkdir(dir, { recursive: true });

        // Write the export data to file
        await fs.writeFile(filePath, JSON.stringify(exportData, null, 2), 'utf8');
        
        console.log(`Database export saved to: ${filePath}`);
        return filePath;
    } catch (error) {
        console.error('Error saving export file:', error);
        throw error;
    }
};

/**
 * Create a timestamped backup file
 * @param {string} backupDir - Directory to save the backup
 * @returns {Promise<string>} - The backup file path
 */
const createTimestampedBackup = async (backupDir = './backups') => {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `database-backup-${timestamp}.json`;
        const filePath = path.join(backupDir, fileName);

        const exportData = await exportDatabase();
        const savedPath = await saveExportToFile(exportData, filePath);

        return {
            filePath: savedPath,
            fileName: fileName,
            metadata: exportData.metadata
        };
    } catch (error) {
        console.error('Error creating timestamped backup:', error);
        throw error;
    }
};

/**
 * Get list of available backup files
 * @param {string} backupDir - Directory containing backup files
 * @returns {Promise<Array>} - List of backup files with metadata
 */
const getBackupFiles = async (backupDir = './backups') => {
    try {
        await fs.mkdir(backupDir, { recursive: true });
        const files = await fs.readdir(backupDir);
        
        const backupFiles = [];
        
        for (const file of files) {
            if (file.endsWith('.json') && file.startsWith('database-backup-')) {
                const filePath = path.join(backupDir, file);
                const stats = await fs.stat(filePath);
                
                try {
                    const content = await fs.readFile(filePath, 'utf8');
                    const data = JSON.parse(content);
                    
                    backupFiles.push({
                        fileName: file,
                        filePath: filePath,
                        size: stats.size,
                        created: stats.birthtime,
                        modified: stats.mtime,
                        metadata: data.metadata
                    });
                } catch (parseError) {
                    console.warn(`Skipping invalid backup file: ${file}`);
                }
            }
        }
        
        // Sort by creation date (newest first)
        return backupFiles.sort((a, b) => new Date(b.created) - new Date(a.created));
    } catch (error) {
        console.error('Error getting backup files:', error);
        throw error;
    }
};

module.exports = {
    exportDatabase,
    saveExportToFile,
    createTimestampedBackup,
    getBackupFiles
};