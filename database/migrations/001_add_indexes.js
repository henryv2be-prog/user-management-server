const pool = require('../pool');

async function up() {
  console.log('Running migration: Adding database indexes for performance...');
  
  const indexes = [
    // User indexes
    'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
    'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)',
    'CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)',
    
    // Door indexes
    'CREATE INDEX IF NOT EXISTS idx_doors_esp32_ip ON doors(esp32_ip)',
    'CREATE INDEX IF NOT EXISTS idx_doors_esp32_mac ON doors(esp32_mac)',
    'CREATE INDEX IF NOT EXISTS idx_doors_is_online ON doors(is_online)',
    'CREATE INDEX IF NOT EXISTS idx_doors_last_seen ON doors(last_seen)',
    
    // Access log indexes
    'CREATE INDEX IF NOT EXISTS idx_access_log_user_id ON access_log(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_access_log_door_id ON access_log(door_id)',
    'CREATE INDEX IF NOT EXISTS idx_access_log_timestamp ON access_log(timestamp)',
    'CREATE INDEX IF NOT EXISTS idx_access_log_access_granted ON access_log(access_granted)',
    
    // Event indexes
    'CREATE INDEX IF NOT EXISTS idx_events_type ON events(type)',
    'CREATE INDEX IF NOT EXISTS idx_events_action ON events(action)',
    'CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at)',
    'CREATE INDEX IF NOT EXISTS idx_events_entity_type_id ON events(entity_type, entity_id)',
    
    // Access request indexes
    'CREATE INDEX IF NOT EXISTS idx_access_requests_user_id ON access_requests(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_access_requests_door_id ON access_requests(door_id)',
    'CREATE INDEX IF NOT EXISTS idx_access_requests_status ON access_requests(status)',
    'CREATE INDEX IF NOT EXISTS idx_access_requests_requested_at ON access_requests(requested_at)',
    
    // Junction table indexes
    'CREATE INDEX IF NOT EXISTS idx_user_access_groups_user_id ON user_access_groups(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_user_access_groups_access_group_id ON user_access_groups(access_group_id)',
    'CREATE INDEX IF NOT EXISTS idx_door_access_groups_door_id ON door_access_groups(door_id)',
    'CREATE INDEX IF NOT EXISTS idx_door_access_groups_access_group_id ON door_access_groups(access_group_id)'
  ];
  
  for (const index of indexes) {
    try {
      await pool.run(index);
      console.log(`✓ Created index: ${index.match(/idx_\w+/)[0]}`);
    } catch (error) {
      console.error(`✗ Failed to create index: ${error.message}`);
    }
  }
  
  console.log('Migration completed: Database indexes added');
}

async function down() {
  console.log('This migration cannot be rolled back - indexes are safe to keep');
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