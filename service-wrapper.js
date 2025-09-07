const { spawn } = require('child_process');
const path = require('path');

console.log('Starting User Management Server with Tray Monitor...');

// Start the server
const serverProcess = spawn('node', ['server.js'], {
  cwd: __dirname,
  stdio: 'pipe'
});

serverProcess.stdout.on('data', (data) => {
  console.log(`Server: ${data}`);
});

serverProcess.stderr.on('data', (data) => {
  console.error(`Server Error: ${data}`);
});

serverProcess.on('error', (err) => {
  console.error('Failed to start server:', err);
});

// Wait a moment for server to start, then start tray monitor
setTimeout(() => {
  console.log('Starting tray monitor...');
  
  const trayProcess = spawn('node', ['simple-tray.js'], {
    cwd: __dirname,
    stdio: 'pipe'
  });

  trayProcess.stdout.on('data', (data) => {
    console.log(`Tray: ${data}`);
  });

  trayProcess.stderr.on('data', (data) => {
    console.error(`Tray Error: ${data}`);
  });

  trayProcess.on('error', (err) => {
    console.error('Failed to start tray monitor:', err);
  });

  // Handle cleanup
  process.on('SIGTERM', () => {
    console.log('Shutting down...');
    serverProcess.kill();
    trayProcess.kill();
    process.exit(0);
  });

  process.on('SIGINT', () => {
    console.log('Shutting down...');
    serverProcess.kill();
    trayProcess.kill();
    process.exit(0);
  });

}, 3000); // Wait 3 seconds for server to start


