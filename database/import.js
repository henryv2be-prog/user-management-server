const { getDatabase, DB_PATH } = require('./connection');
const pool = require('./pool');
const fs = require('fs').promises;
const path = require('path');

/**
 * Import database data from a JSON file
 * @param {string} filePath - Path to the import file
 * @param {Object} options - Import options
 * @returns {Promise<Object>} - Import results
 */
const importDatabase = async (filePath, options = {}) => {
    const {
        clearExisting = false,
        skipUsers = false,
        skipEvents = false,
        skipAccessLog = false
    } = options;

    return new Promise(async (resolve, reject) => {
        try {
            // Read and parse the import file
            const fileContent = await fs.readFile(filePath, 'utf8');
            const importData = JSON.parse(fileContent);

            if (!importData.metadata || !importData.data) {
                throw new Error('Invalid import file format');
            }

            console.log(`Importing database from: ${filePath}`);
            console.log(`Export date: ${importData.metadata.exportDate}`);
            console.log(`Version: ${importData.metadata.version}`);

            const db = await pool.getConnection();
            const results = {
                success: true,
                importedTables: [],
                errors: [],
                totalRecords: 0
            };

            // Define table import order (respecting foreign key constraints)
            const importOrder = [
                'users',
                'doors',
                'access_groups',
                'door_commands',
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

            // Clear existing data if requested
            if (clearExisting) {
                console.log('Clearing existing data...');
                for (const tableName of importOrder.reverse()) {
                    await new Promise((resolve, reject) => {
                        db.run(`DELETE FROM ${tableName}`, (err) => {
                            if (err) {
                                console.error(`Error clearing table ${tableName}:`, err.message);
                                reject(err);
                            } else {
                                console.log(`Cleared table ${tableName}`);
                                resolve();
                            }
                        });
                    });
                }
                // Reset import order
                importOrder.reverse();
            }

            // Import each table
            for (const tableName of importOrder) {
                if (!importData.data[tableName]) {
                    console.log(`Skipping table ${tableName} (not found in import data)`);
                    continue;
                }

                // Skip certain tables based on options
                if (skipUsers && tableName === 'users') {
                    console.log(`Skipping users table (skipUsers = true)`);
                    continue;
                }
                if (skipEvents && tableName === 'events') {
                    console.log(`Skipping events table (skipEvents = true)`);
                    continue;
                }
                if (skipAccessLog && tableName === 'access_log') {
                    console.log(`Skipping access_log table (skipAccessLog = true)`);
                    continue;
                }

                const records = importData.data[tableName];
                if (records.length === 0) {
                    console.log(`Skipping empty table ${tableName}`);
                    continue;
                }

                try {
                    await importTableData(db, tableName, records);
                    results.importedTables.push({
                        name: tableName,
                        recordCount: records.length
                    });
                    results.totalRecords += records.length;
                    console.log(`Imported table ${tableName}: ${records.length} records`);
                } catch (error) {
                    console.error(`Error importing table ${tableName}:`, error.message);
                    results.errors.push({
                        table: tableName,
                        error: error.message
                    });
                }
            }

            pool.releaseConnection(db);
            resolve(results);

        } catch (error) {
            console.error('Database import error:', error);
            reject(error);
        }
    });
};

/**
 * Import data for a specific table
 * @param {Object} db - Database connection
 * @param {string} tableName - Name of the table
 * @param {Array} records - Array of records to import
 */
const importTableData = async (db, tableName, records) => {
    return new Promise((resolve, reject) => {
        // Get table schema to determine which fields to insert
        db.all(`PRAGMA table_info(${tableName})`, (err, columns) => {
            if (err) {
                reject(err);
                return;
            }

            const columnNames = columns.map(col => col.name);
            const placeholders = columnNames.map(() => '?').join(', ');
            const sql = `INSERT OR REPLACE INTO ${tableName} (${columnNames.join(', ')}) VALUES (${placeholders})`;

            let completed = 0;
            const total = records.length;

            if (total === 0) {
                resolve();
                return;
            }

            records.forEach((record, index) => {
                const values = columnNames.map(colName => {
                    // Handle different data types
                    const value = record[colName];
                    if (value === null || value === undefined) {
                        return null;
                    }
                    // Convert boolean values to integers for SQLite
                    if (typeof value === 'boolean') {
                        return value ? 1 : 0;
                    }
                    return value;
                });

                db.run(sql, values, (err) => {
                    if (err) {
                        console.error(`Error inserting record ${index + 1} into ${tableName}:`, err.message);
                        reject(err);
                        return;
                    }

                    completed++;
                    if (completed === total) {
                        resolve();
                    }
                });
            });
        });
    });
};

/**
 * Validate import file before importing
 * @param {string} filePath - Path to the import file
 * @returns {Promise<Object>} - Validation results
 */
const validateImportFile = async (filePath) => {
    try {
        const fileContent = await fs.readFile(filePath, 'utf8');
        const importData = JSON.parse(fileContent);

        const validation = {
            valid: true,
            errors: [],
            warnings: [],
            metadata: null
        };

        // Check file structure
        if (!importData.metadata) {
            validation.errors.push('Missing metadata section');
            validation.valid = false;
        } else {
            validation.metadata = importData.metadata;
        }

        if (!importData.data) {
            validation.errors.push('Missing data section');
            validation.valid = false;
        }

        // Check for required tables
        const requiredTables = ['users', 'doors', 'access_groups'];
        requiredTables.forEach(tableName => {
            if (!importData.data || !importData.data[tableName]) {
                validation.warnings.push(`Missing required table: ${tableName}`);
            }
        });

        // Check metadata
        if (importData.metadata) {
            if (!importData.metadata.exportDate) {
                validation.warnings.push('Missing export date in metadata');
            }
            if (!importData.metadata.version) {
                validation.warnings.push('Missing version in metadata');
            }
        }

        return validation;
    } catch (error) {
        return {
            valid: false,
            errors: [`File read/parse error: ${error.message}`],
            warnings: [],
            metadata: null
        };
    }
};

/**
 * Create a backup before importing
 * @param {string} backupDir - Directory to save the backup
 * @returns {Promise<string>} - Path to the created backup
 */
const createPreImportBackup = async (backupDir = './backups') => {
    const { createTimestampedBackup } = require('./export');
    const backup = await createTimestampedBackup(backupDir);
    console.log(`Pre-import backup created: ${backup.filePath}`);
    return backup.filePath;
};

module.exports = {
    importDatabase,
    validateImportFile,
    createPreImportBackup
};