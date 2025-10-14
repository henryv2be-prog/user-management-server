const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Use the same database path as the application
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'database', 'users.db');

console.log('Testing database at:', DB_PATH);

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
  console.log('✅ Connected to database successfully');
});

// Test 1: Check if door_tags table exists
console.log('\n=== Test 1: Check door_tags table ===');
db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='door_tags'", (err, rows) => {
  if (err) {
    console.error('❌ Error checking tables:', err.message);
    return;
  }
  
  if (rows.length === 0) {
    console.log('❌ door_tags table does not exist');
    console.log('Creating door_tags table...');
    
    // Create the door_tags table
    db.run(`CREATE TABLE door_tags (
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
        console.error('❌ Error creating door_tags table:', err.message);
        return;
      }
      console.log('✅ door_tags table created successfully');
      runTests();
    });
  } else {
    console.log('✅ door_tags table exists');
    runTests();
  }
});

function runTests() {
  // Test 2: Check doors table
  console.log('\n=== Test 2: Check doors table ===');
  db.all("SELECT id, name, location FROM doors LIMIT 5", (err, rows) => {
    if (err) {
      console.error('❌ Error querying doors:', err.message);
      return;
    }
    
    console.log(`✅ Found ${rows.length} doors:`);
    rows.forEach(door => {
      console.log(`  - Door ${door.id}: ${door.name} (${door.location})`);
    });
    
    if (rows.length === 0) {
      console.log('⚠️  No doors found - this might be the issue');
      return;
    }
    
    // Test 3: Test door_tags query
    console.log('\n=== Test 3: Test door_tags query ===');
    const testDoorId = rows[0].id;
    console.log(`Testing with door ID: ${testDoorId}`);
    
    db.all(`
      SELECT dt.*, d.name as door_name, d.location as door_location
      FROM door_tags dt
      LEFT JOIN doors d ON dt.door_id = d.id
      WHERE dt.door_id = ?
      ORDER BY dt.created_at DESC
    `, [testDoorId], (err, tagRows) => {
      if (err) {
        console.error('❌ Error querying door_tags:', err.message);
        return;
      }
      
      console.log(`✅ Query successful - found ${tagRows.length} tags for door ${testDoorId}`);
      
      // Test 4: Insert a test tag
      console.log('\n=== Test 4: Insert test tag ===');
      db.run(`
        INSERT INTO door_tags (door_id, tag_id, tag_type, tag_data)
        VALUES (?, ?, ?, ?)
      `, [testDoorId, 'TEST123', 'nfc', 'Test tag data'], function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            console.log('✅ Test tag already exists (this is fine)');
          } else {
            console.error('❌ Error inserting test tag:', err.message);
            return;
          }
        } else {
          console.log('✅ Test tag inserted successfully');
        }
        
        // Test 5: Query again
        console.log('\n=== Test 5: Query after insert ===');
        db.all(`
          SELECT dt.*, d.name as door_name, d.location as door_location
          FROM door_tags dt
          LEFT JOIN doors d ON dt.door_id = d.id
          WHERE dt.door_id = ?
          ORDER BY dt.created_at DESC
        `, [testDoorId], (err, finalRows) => {
          if (err) {
            console.error('❌ Error in final query:', err.message);
            return;
          }
          
          console.log(`✅ Final query successful - found ${finalRows.length} tags:`);
          finalRows.forEach(tag => {
            console.log(`  - Tag ${tag.id}: ${tag.tag_id} (${tag.tag_type})`);
          });
          
          db.close();
          console.log('\n✅ All tests completed successfully!');
        });
      });
    });
  });
}
