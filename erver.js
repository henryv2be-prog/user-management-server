[33mcommit 61f49532e70bc92093f2c1dee89709e5246653f5[m[33m ([m[1;36mHEAD[m[33m -> [m[1;32mwebhook[m[33m, [m[1;31morigin/webhook[m[33m)[m
Author: Henry <henry.v2be@gmail.com>
Date:   Fri Oct 3 00:27:13 2025 +0200

    Add debugging logs to ESP32 command polling endpoint

[1mdiff --git a/routes/doors.js b/routes/doors.js[m
[1mindex 562415f..cce4636 100644[m
[1m--- a/routes/doors.js[m
[1m+++ b/routes/doors.js[m
[36m@@ -1110,8 +1110,10 @@[m [mrouter.delete('/:id/tags/:tagId', authenticate, requireAdmin, validateId, async[m
 router.get('/commands/:doorId', async (req, res) => {[m
   try {[m
     const doorId = parseInt(req.params.doorId);[m
[32m+[m[32m    console.log(`ESP32 polling for commands - Door ID: ${doorId}`);[m
     [m
     if (isNaN(doorId)) {[m
[32m+[m[32m      console.log(`Invalid door ID received: ${req.params.doorId}`);[m
       return res.status(400).json({[m
         error: 'Invalid door ID',[m
         message: 'Door ID must be a number'[m
[36m@@ -1146,33 +1148,47 @@[m [mrouter.get('/commands/:doorId', async (req, res) => {[m
       db.all('SELECT * FROM door_commands WHERE door_id = ? AND status = ? ORDER BY created_at ASC', [m
              [doorId, 'pending'], (err, rows) => {[m
         db.close();[m
[31m-        if (err) reject(err);[m
[31m-        else resolve(rows);[m
[32m+[m[32m        if (err) {[m
[32m+[m[32m          console.error(`Error fetching commands for door ${doorId}:`, err);[m
[32m+[m[32m          reject(err);[m
[32m+[m[32m        } else {[m
[32m+[m[32m          console.log(`Found ${rows.length} pending commands for door ${doorId}`);[m
[32m+[m[32m          resolve(rows);[m
[32m+[m[32m        }[m
       });[m
     });[m
     [m
     // Mark commands as executed[m
     if (commands.length > 0) {[m
       const commandIds = commands.map(cmd => cmd.id);[m
[32m+[m[32m      console.log(`Marking ${commandIds.length} commands as executed for door ${doorId}:`, commandIds);[m
       const db2 = new sqlite3.Database(path.join(__dirname, '..', 'database', 'users.db'));[m
       await new Promise((resolve, reject) => {[m
         db2.run(`UPDATE door_commands SET status = 'executed', executed_at = CURRENT_TIMESTAMP WHERE id IN (${commandIds.map(() => '?').join(',')})`, [m
                  commandIds, (err) => {[m
           db2.close();[m
[31m-          if (err) reject(err);[m
[31m-          else resolve();[m
[32m+[m[32m          if (err) {[m
[32m+[m[32m            console.error(`Error marking commands as executed:`, err);[m
[32m+[m[32m            reject(err);[m
[32m+[m[32m          } else {[m
[32m+[m[32m            console.log(`Successfully marked ${commandIds.length} commands as executed`);[m
[32m+[m[32m            resolve();[m
[32m+[m[32m          }[m
         });[m
       });[m
     }[m
     [m
[31m-    res.json({[m
[32m+[m[32m    const response = {[m
       success: true,[m
       commands: commands.map(cmd => ({[m
         id: cmd.id,[m
         command: cmd.command,[m
         created_at: cmd.created_at[m
       }))[m
[31m-    });[m
[32m+[m[32m    };[m
[32m+[m[41m    [m
[32m+[m[32m    console.log(`Sending response to ESP32 for door ${doorId}:`, JSON.stringify(response));[m
[32m+[m[32m    res.json(response);[m
     [m
   } catch (error) {[m
     console.error('Command polling error:', error);[m
