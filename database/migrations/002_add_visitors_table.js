const pool = require('../pool');

async function up() {
  console.log('Running migration: Adding visitors table...');
  
  const db = await pool.getConnection();
  
  try {
    // Create visitors table
    await pool.run(`CREATE TABLE IF NOT EXISTS visitors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      valid_from DATETIME NOT NULL,
      valid_until DATETIME NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_by INTEGER,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL
    )`);

    // Create indexes for better performance
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_visitors_user_id ON visitors(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_visitors_email ON visitors(email)',
      'CREATE INDEX IF NOT EXISTS idx_visitors_valid_from ON visitors(valid_from)',
      'CREATE INDEX IF NOT EXISTS idx_visitors_valid_until ON visitors(valid_until)',
      'CREATE INDEX IF NOT EXISTS idx_visitors_is_active ON visitors(is_active)',
      'CREATE INDEX IF NOT EXISTS idx_visitors_created_at ON visitors(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_visitors_created_by ON visitors(created_by)'
    ];
    
    for (const index of indexes) {
      try {
        await pool.run(index);
        console.log(`✓ Created index: ${index.match(/idx_\w+/)[0]}`);
      } catch (error) {
        console.error(`✗ Failed to create index: ${error.message}`);
      }
    }
    
    console.log('✓ Visitors table created successfully');
  } catch (error) {
    console.error('✗ Failed to create visitors table:', error);
    throw error;
  } finally {
    pool.releaseConnection(db);
  }
}

async function down() {
  console.log('Running migration rollback: Dropping visitors table...');
  
  try {
    await pool.run('DROP TABLE IF EXISTS visitors');
    console.log('✓ Visitors table dropped successfully');
  } catch (error) {
    console.error('✗ Failed to drop visitors table:', error);
    throw error;
  }
}

module.exports = { up, down };

// Run if called directly
if (require.main === module) {
  up()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}