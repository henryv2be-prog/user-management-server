const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'users.db');
const db = new sqlite3.Database(dbPath);

console.log('Checking doors in database...\n');

// First, let's see all doors
db.all("SELECT id, name, esp32_ip, esp32_mac, is_online FROM doors ORDER BY id", (err, rows) => {
  if (err) {
    console.error('Error querying doors:', err);
    return;
  }
  
  console.log('Current doors:');
  console.log('ID | Name | IP | MAC | Online');
  console.log('---|------|----|----|-------');
  rows.forEach(row => {
    console.log(`${row.id} | ${row.name} | ${row.esp32_ip} | ${row.esp32_mac} | ${row.is_online ? 'Yes' : 'No'}`);
  });
  
  console.log('\nLooking for door with IP 192.168.1.28...');
  
  // Find the door with IP 192.168.1.28
  db.get("SELECT id, name, esp32_ip, esp32_mac FROM doors WHERE esp32_ip = ?", ['192.168.1.28'], (err, row) => {
    if (err) {
      console.error('Error finding door:', err);
      return;
    }
    
    if (row) {
      console.log(`Found door: ID ${row.id}, Name: ${row.name}, IP: ${row.esp32_ip}, MAC: ${row.esp32_mac}`);
      console.log('Deleting door...');
      
      // Delete the door from access groups first, then the door itself
      db.run("DELETE FROM door_access_groups WHERE door_id = ?", [row.id], function(err) {
        if (err) {
          console.error('Error removing door from access groups:', err);
        } else {
          console.log(`Successfully removed door ${row.id} from all access groups`);
        }
        
        // Now delete the door itself
        db.run("DELETE FROM doors WHERE id = ?", [row.id], function(err) {
          if (err) {
            console.error('Error deleting door:', err);
          } else {
            console.log(`Successfully deleted door with ID ${row.id}`);
          }
          
          // Close database
          db.close();
        });
      });
    } else {
      console.log('No door found with IP 192.168.1.28');
      db.close();
    }
  });
});
