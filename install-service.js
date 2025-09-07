const Service = require('node-windows').Service;
const path = require('path');

// Create a new service object
const svc = new Service({
  name: 'User Management Server',
  description: 'User Management System with ESP32 Door Control and Tray Monitor',
  script: path.join(__dirname, 'service-wrapper.js'),
  nodeOptions: [
    '--max_old_space_size=4096'
  ],
  env: {
    name: "NODE_ENV",
    value: "production"
  }
});

// Listen for the "install" event, which indicates the
// process is available as a service.
svc.on('install', function() {
  console.log('✅ Service installed successfully!');
  console.log('🚀 Starting service...');
  svc.start();
});

svc.on('start', function() {
  console.log('✅ Service started successfully!');
  console.log('📱 Server should be running on http://localhost:3000');
  console.log('🔧 You can now use the tray monitor to control the service');
});

svc.on('error', function(err) {
  console.error('❌ Service error:', err);
});

// Install the service
console.log('Installing User Management Server as Windows Service...');
svc.install();