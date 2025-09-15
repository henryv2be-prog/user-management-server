const { app, Tray, Menu, nativeImage, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let tray = null;
let serverProcess = null;

// Create a simple colored icon using basic approach
function createIcon(color = 'red') {
  console.log(`Creating icon with color: ${color}`);
  
  // Create a simple 16x16 colored square using basic buffer
  const size = 16;
  const buffer = Buffer.alloc(size * size * 4); // RGBA
  
  let r, g, b;
  if (color === 'red') {
    r = 255; g = 0; b = 0;
    console.log('Creating RED icon');
  } else if (color === 'green') {
    r = 0; g = 255; b = 0;
    console.log('Creating GREEN icon');
  } else if (color === 'blue') {
    r = 54; g = 69; b = 79;
    console.log('Creating CHARCOAL icon');
  } else {
    r = 128; g = 128; b = 128;
    console.log('Creating GRAY icon');
  }
  
  // Fill background with transparent
  for (let i = 0; i < buffer.length; i += 4) {
    buffer[i] = 0;       // B (transparent)
    buffer[i + 1] = 0;   // G (transparent)
    buffer[i + 2] = 0;   // R (transparent)
    buffer[i + 3] = 0;   // A (fully transparent)
  }
  
  // Draw "S" letter in the specified color
  // Top horizontal line
  for (let y = 2; y <= 3; y++) {
    for (let x = 3; x <= 12; x++) {
      const i = (y * size + x) * 4;
      buffer[i] = b;       // B
      buffer[i + 1] = g;   // G
      buffer[i + 2] = r;   // R
      buffer[i + 3] = 255; // A (opaque)
    }
  }
  
  // Left vertical line (top part)
  for (let y = 3; y <= 6; y++) {
    for (let x = 3; x <= 4; x++) {
      const i = (y * size + x) * 4;
      buffer[i] = b;       // B
      buffer[i + 1] = g;   // G
      buffer[i + 2] = r;   // R
      buffer[i + 3] = 255; // A (opaque)
    }
  }
  
  // Middle horizontal line
  for (let y = 7; y <= 8; y++) {
    for (let x = 3; x <= 12; x++) {
      const i = (y * size + x) * 4;
      buffer[i] = b;       // B
      buffer[i + 1] = g;   // G
      buffer[i + 2] = r;   // R
      buffer[i + 3] = 255; // A (opaque)
    }
  }
  
  // Right vertical line (bottom part)
  for (let y = 9; y <= 12; y++) {
    for (let x = 11; x <= 12; x++) {
      const i = (y * size + x) * 4;
      buffer[i] = b;       // B
      buffer[i + 1] = g;   // G
      buffer[i + 2] = r;   // R
      buffer[i + 3] = 255; // A (opaque)
    }
  }
  
  // Bottom horizontal line
  for (let y = 13; y <= 14; y++) {
    for (let x = 3; x <= 12; x++) {
      const i = (y * size + x) * 4;
      buffer[i] = b;       // B
      buffer[i + 1] = g;   // G
      buffer[i + 2] = r;   // R
      buffer[i + 3] = 255; // A (opaque)
    }
  }
  
  // Try creating the image with different methods
  try {
    const image = nativeImage.createFromBuffer(buffer, { width: size, height: size });
    console.log(`Buffer method - isEmpty: ${image.isEmpty()}, size: ${JSON.stringify(image.getSize())}`);
    
    if (!image.isEmpty()) {
      return image;
    }
  } catch (error) {
    console.log('Buffer method failed:', error.message);
  }
  
  // Fallback: try with empty image
  console.log('Using empty image as fallback');
  return nativeImage.createEmpty();
}

// Check if server is running
function isServerRunning() {
  return new Promise((resolve) => {
    const http = require('http');
    const req = http.get('http://localhost:3000/api/health', (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

// Update tray icon based on server status
async function updateTrayIcon() {
  const running = await isServerRunning();
  
  // Create a simple colored icon
  const color = running ? 'green' : 'red';
  console.log(`Server status: ${running ? 'Running' : 'Stopped'}, Color: ${color}`);
  const icon = createIcon(color);
  
  console.log(`Setting tray icon to ${color}...`);
  tray.setImage(icon);
  tray.setToolTip(running ? 'Server: Running' : 'Server: Stopped');
  console.log(`Tray icon updated to ${color}`);
}

// Start the server
function startServer() {
  if (serverProcess) return;
  
  serverProcess = spawn('node', ['server.js'], {
    cwd: __dirname,
    stdio: 'pipe'
  });
  
  serverProcess.on('error', (err) => {
    console.error('Failed to start server:', err);
  });
  
  // Update icon after a short delay
  setTimeout(updateTrayIcon, 2000);
}

// Stop the server
function stopServer() {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
  // Wait a moment for the server to fully stop before updating icon
  setTimeout(updateTrayIcon, 500);
}

// Show server logs in a window
function showLogs() {
  // Create a new window to show logs
  const logWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    title: 'Server Logs'
  });

  // Create HTML content for the logs
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Server Logs</title>
      <style>
        body { 
          font-family: 'Courier New', monospace; 
          background: #1e1e1e; 
          color: #ffffff; 
          margin: 0; 
          padding: 20px;
          overflow-x: auto;
        }
        .log-entry { 
          margin: 2px 0; 
          padding: 2px 5px;
          border-left: 3px solid #007acc;
          background: #2d2d2d;
        }
        .error { border-left-color: #ff6b6b; }
        .info { border-left-color: #4ecdc4; }
        .warning { border-left-color: #ffe66d; }
        .success { border-left-color: #51cf66; }
        .timestamp { color: #888; font-size: 0.9em; }
        .refresh-btn {
          background: #007acc;
          color: white;
          border: none;
          padding: 10px 20px;
          margin: 10px 0;
          cursor: pointer;
          border-radius: 4px;
        }
        .refresh-btn:hover { background: #005a9e; }
      </style>
    </head>
    <body>
      <h2>Server Logs</h2>
      <button class="refresh-btn" onclick="refreshLogs()">Refresh Logs</button>
      <div id="logs"></div>
      
      <script>
        function refreshLogs() {
          fetch('http://localhost:3000/api/logs')
            .then(response => response.json())
            .then(data => {
              const logsDiv = document.getElementById('logs');
              logsDiv.innerHTML = data.logs.map(log => 
                '<div class="log-entry ' + (log.level || 'info') + '">' +
                '<span class="timestamp">[' + log.timestamp + ']</span> ' +
                log.message +
                '</div>'
              ).join('');
            })
            .catch(error => {
              document.getElementById('logs').innerHTML = 
                '<div class="log-entry error">Error loading logs: ' + error.message + '</div>' +
                '<div class="log-entry info">Make sure the server is running on port 3000</div>';
            });
        }
        
        // Load logs on page load
        refreshLogs();
        
        // Auto-refresh every 5 seconds
        setInterval(refreshLogs, 5000);
      </script>
    </body>
    </html>
  `;

  logWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent));
  
  // Try to load logs from the server
  logWindow.webContents.on('did-finish-load', () => {
    // The logs will be loaded via the JavaScript in the HTML
  });
}

// Create context menu
function createContextMenu() {
  return Menu.buildFromTemplate([
    {
      label: 'Server Status',
      enabled: false
    },
    { type: 'separator' },
    {
      label: 'Start Server',
      click: startServer
    },
    {
      label: 'Stop Server',
      click: stopServer
    },
    {
      label: 'Restart Server',
      click: () => {
        stopServer();
        setTimeout(startServer, 1000);
      }
    },
    { type: 'separator' },
    {
      label: 'View Logs',
      click: showLogs
    },
    {
      label: 'Open Browser',
      click: () => {
        const { shell } = require('electron');
        shell.openExternal('http://localhost:3000');
      }
    },
    { type: 'separator' },
    {
      label: 'Exit',
      click: () => {
        stopServer();
        app.quit();
      }
    }
  ]);
}

app.whenReady().then(() => {
  // Create tray with initial icon
  tray = new Tray(createIcon('red'));
  
  // Set initial icon
  updateTrayIcon();
  
  // Set context menu
  tray.setContextMenu(createContextMenu());
  
  // Update icon every 5 seconds
  setInterval(updateTrayIcon, 5000);
  
  // Start server automatically
  startServer();
});

app.on('window-all-closed', () => {
  // Keep the app running even when all windows are closed
});

app.on('activate', () => {
  // macOS specific
});
