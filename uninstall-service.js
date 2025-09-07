const Service = require('node-windows').Service;
const path = require('path');

// Create a new service object
const svc = new Service({
  name: 'User Management Server',
  script: path.join(__dirname, 'server.js')
});

// Listen for the "uninstall" event
svc.on('uninstall', function() {
  console.log('✅ Service uninstalled successfully!');
  console.log('🛑 The service has been stopped and removed');
});

svc.on('error', function(err) {
  console.error('❌ Service error:', err);
});

// Uninstall the service
console.log('Uninstalling User Management Server Windows Service...');
svc.uninstall();


