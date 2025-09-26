const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'database', 'users.db');

async function checkAndSetupDoors() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH);
    
    // Check if there are any doors
    db.get('SELECT COUNT(*) as count FROM doors', (err, row) => {
      if (err) {
        console.error('Error checking doors:', err);
        reject(err);
        return;
      }
      
      console.log(`Found ${row.count} doors in database`);
      
      if (row.count === 0) {
        console.log('No doors found. Creating a test door...');
        
        // Create a test door
        const testDoor = {
          name: 'Test Door',
          location: 'Main Entrance',
          esp32Ip: '192.168.1.100',
          esp32Mac: 'AA:BB:CC:DD:EE:FF',
          secretKey: 'test123',
          isOnline: true
        };
        
        db.run(`INSERT INTO doors (name, location, esp32_ip, esp32_mac, secret_key, is_online, created_at, updated_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [testDoor.name, testDoor.location, testDoor.esp32Ip, testDoor.esp32Mac, 
           testDoor.secretKey, testDoor.isOnline ? 1 : 0, 
           new Date().toISOString(), new Date().toISOString()],
          function(err) {
            if (err) {
              console.error('Error creating test door:', err);
              reject(err);
            } else {
              console.log(`✅ Test door created with ID: ${this.lastID}`);
              console.log('Door details:', testDoor);
              resolve();
            }
            db.close();
          }
        );
      } else {
        // Get existing doors
        db.all('SELECT * FROM doors', (err, doors) => {
          if (err) {
            console.error('Error getting doors:', err);
            reject(err);
          } else {
            console.log('Existing doors:');
            doors.forEach(door => {
              console.log(`- ID: ${door.id}, Name: ${door.name}, Location: ${door.location}, Online: ${door.is_online ? 'Yes' : 'No'}`);
            });
            resolve();
          }
          db.close();
        });
      }
    });
  });
}

checkAndSetupDoors()
  .then(() => {
    console.log('✅ Door setup completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
