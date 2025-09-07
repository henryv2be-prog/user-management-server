const { spawn } = require('child_process');
const path = require('path');

class ServerService {
    constructor() {
        this.serverProcess = null;
        this.isRunning = false;
    }

    start() {
        console.log('Starting User Management Server...');
        
        // Start the main server
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
            this.isRunning = false;
        });

        this.isRunning = true;
        console.log('Server started successfully');
    }

    stop() {
        if (this.serverProcess) {
            console.log('Stopping server...');
            this.serverProcess.kill();
            this.isRunning = false;
            console.log('Server stopped');
        }
    }

    getStatus() {
        return this.isRunning;
    }
}

// If running as main module
if (require.main === module) {
    const service = new ServerService();
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
        console.log('Received SIGINT, shutting down...');
        service.stop();
        process.exit(0);
    });

    process.on('SIGTERM', () => {
        console.log('Received SIGTERM, shutting down...');
        service.stop();
        process.exit(0);
    });

    // Start the service
    service.start();
}

module.exports = ServerService;

