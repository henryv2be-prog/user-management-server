const { app, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const net = require('net');

class TrayMonitor {
    constructor() {
        this.tray = null;
        this.serverProcess = null;
        this.isServerRunning = false;
        this.checkInterval = null;
    }

    createTray() {
        // Create a simple icon (you can replace this with a custom icon)
        const iconPath = path.join(__dirname, 'server-icon.png');
        
        // Create a simple colored icon if custom icon doesn't exist
        let icon;
        try {
            icon = nativeImage.createFromPath(iconPath);
        } catch (e) {
            // Create a simple colored square icon
            icon = nativeImage.createEmpty();
        }

        this.tray = new Tray(icon);
        this.updateTrayIcon();
        this.updateTrayMenu();
    }

    updateTrayIcon() {
        if (!this.tray) return;

        const status = this.isServerRunning ? 'Running' : 'Stopped';
        const color = this.isServerRunning ? 'green' : 'red';
        
        this.tray.setToolTip(`User Management Server - ${status}`);
    }

    updateTrayMenu() {
        if (!this.tray) return;

        const contextMenu = Menu.buildFromTemplate([
            {
                label: `Server: ${this.isServerRunning ? 'Running' : 'Stopped'}`,
                enabled: false
            },
            { type: 'separator' },
            {
                label: this.isServerRunning ? 'Stop Server' : 'Start Server',
                click: () => {
                    if (this.isServerRunning) {
                        this.stopServer();
                    } else {
                        this.startServer();
                    }
                }
            },
            {
                label: 'Restart Server',
                click: () => {
                    this.restartServer();
                }
            },
            { type: 'separator' },
            {
                label: 'Open in Browser',
                click: () => {
                    const { shell } = require('electron');
                    shell.openExternal('http://localhost:3000');
                }
            },
            {
                label: 'View Logs',
                click: () => {
                    // Open a simple log window
                    this.showLogs();
                }
            },
            { type: 'separator' },
            {
                label: 'Exit',
                click: () => {
                    this.stopServer();
                    app.quit();
                }
            }
        ]);

        this.tray.setContextMenu(contextMenu);
    }

    startServer() {
        if (this.isServerRunning) return;

        console.log('Starting server...');
        this.serverProcess = spawn('node', ['server.js'], {
            cwd: __dirname,
            stdio: 'pipe'
        });

        this.serverProcess.stdout.on('data', (data) => {
            console.log(`Server: ${data}`);
        });

        this.serverProcess.stderr.on('data', (data) => {
            console.error(`Server Error: ${data}`);
        });

        this.serverProcess.on('close', (code) => {
            console.log(`Server process exited with code ${code}`);
            this.isServerRunning = false;
            this.updateTrayIcon();
            this.updateTrayMenu();
        });

        // Check if server is actually running
        setTimeout(() => {
            this.checkServerStatus();
        }, 2000);
    }

    stopServer() {
        if (this.serverProcess) {
            console.log('Stopping server...');
            this.serverProcess.kill();
            this.serverProcess = null;
        }
        this.isServerRunning = false;
        this.updateTrayIcon();
        this.updateTrayMenu();
    }

    restartServer() {
        this.stopServer();
        setTimeout(() => {
            this.startServer();
        }, 1000);
    }

    checkServerStatus() {
        const client = new net.Socket();
        
        client.setTimeout(1000);
        
        client.on('connect', () => {
            this.isServerRunning = true;
            this.updateTrayIcon();
            this.updateTrayMenu();
            client.destroy();
        });

        client.on('timeout', () => {
            this.isServerRunning = false;
            this.updateTrayIcon();
            this.updateTrayMenu();
            client.destroy();
        });

        client.on('error', () => {
            this.isServerRunning = false;
            this.updateTrayIcon();
            this.updateTrayMenu();
        });

        client.connect(3000, 'localhost');
    }

    showLogs() {
        // Simple log display - you can enhance this
        console.log('Server logs would be displayed here');
    }

    start() {
        this.createTray();
        
        // Check server status every 5 seconds
        this.checkInterval = setInterval(() => {
            this.checkServerStatus();
        }, 5000);

        // Initial check
        this.checkServerStatus();
    }

    stop() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }
        this.stopServer();
    }
}

// Initialize the app
app.whenReady().then(() => {
    const monitor = new TrayMonitor();
    monitor.start();

    // Handle app events
    app.on('window-all-closed', () => {
        // Keep the app running in the background
    });

    app.on('activate', () => {
        // Handle activation
    });
});

// Handle app termination
app.on('before-quit', () => {
    // Clean up
});

