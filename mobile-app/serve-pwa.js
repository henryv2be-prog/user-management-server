const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3001;

// Serve static files from dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// Serve camera test page without authentication
app.get('/camera-test.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'camera-test.html'));
});

// Serve server test page without authentication
app.get('/server-test.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'server-test.html'));
});

// Serve QR test page without authentication
app.get('/qr-test.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'qr-test.html'));
});

// Serve camera debug page without authentication
app.get('/camera-debug.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'camera-debug.html'));
});

// Serve simple camera test page without authentication
app.get('/simple-camera-test.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'simple-camera-test.html'));
});

// Serve pure camera test page without authentication
app.get('/pure-camera-test.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'pure-camera-test.html'));
});

// Handle client-side routing - serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 SimplifiAccess PWA server running on http://192.168.1.20:${PORT}`);
  console.log(`📱 Open this URL on your mobile device to install the app`);
  console.log(`💡 On Android: Chrome will show "Add to Home Screen" option`);
  console.log(`💡 On iOS: Safari will show "Add to Home Screen" option`);
});
