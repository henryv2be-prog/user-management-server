// Mobile-Friendly Settings Integration
// This creates a simple settings page that can be accessed from mobile browsers

const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');

// Mobile settings page with webhook integration
router.get('/mobile', authenticate, requireAdmin, async (req, res) => {
  try {
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Settings - SimplifiAccess</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                margin: 0; 
                padding: 20px; 
                background: #f5f5f5;
            }
            .container { 
                max-width: 600px; 
                margin: 0 auto; 
                background: white; 
                padding: 20px; 
                border-radius: 10px; 
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            h1 { color: #2c5aa0; margin-bottom: 20px; }
            .settings-section { 
                background: #f8f9fa; 
                padding: 20px; 
                margin: 20px 0; 
                border-radius: 8px; 
                border: 1px solid #ddd;
            }
            .settings-section h3 { margin-top: 0; color: #2c5aa0; }
            button { 
                background: #2c5aa0; 
                color: white; 
                padding: 15px 25px; 
                border: none; 
                border-radius: 8px; 
                cursor: pointer; 
                font-size: 16px;
                margin: 10px 5px;
                width: 100%;
                box-sizing: border-box;
            }
            button:hover { background: #1e3d6f; }
            button:disabled { background: #ccc; cursor: not-allowed; }
            .success { background: #d4edda; color: #155724; padding: 15px; border-radius: 5px; margin: 15px 0; }
            .error { background: #f8d7da; color: #721c24; padding: 15px; border-radius: 5px; margin: 15px 0; }
            .info { background: #d1ecf1; color: #0c5460; padding: 15px; border-radius: 5px; margin: 15px 0; }
            .loading { 
                display: inline-block; 
                width: 20px; 
                height: 20px; 
                border: 3px solid #f3f3f3; 
                border-top: 3px solid #2c5aa0; 
                border-radius: 50%; 
                animation: spin 1s linear infinite;
            }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            .status-indicator { 
                display: inline-block; 
                width: 12px; 
                height: 12px; 
                border-radius: 50%; 
                margin-right: 8px;
            }
            .status-active { background: #28a745; }
            .status-inactive { background: #dc3545; }
            .status-unknown { background: #ffc107; }
            .webhook-item { 
                background: white; 
                padding: 15px; 
                margin: 10px 0; 
                border-radius: 5px; 
                border: 1px solid #ddd;
            }
            .webhook-name { font-weight: bold; color: #2c5aa0; }
            .webhook-url { color: #666; font-size: 0.9em; word-break: break-all; }
            .webhook-events { color: #666; font-size: 0.9em; margin-top: 5px; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>⚙️ Settings</h1>
            <p>Manage your SimplifiAccess system settings and webhooks.</p>

            <!-- Webhook Status -->
            <div class="settings-section">
                <h3>🔗 Webhook Status</h3>
                <div id="webhookStatus">
                    <span class="loading"></span> Checking webhook status...
                </div>
                <button onclick="loadWebhookStatus()">Refresh Status</button>
            </div>

            <!-- Quick Test -->
            <div class="settings-section">
                <h3>🧪 Quick Test</h3>
                <p>Test your webhook configuration to ensure it's working.</p>
                <button id="testWebhookBtn" onclick="testWebhook()">Test Webhook</button>
                <div id="testResult"></div>
            </div>

            <!-- Webhook Management -->
            <div class="settings-section">
                <h3>📡 Webhook Management</h3>
                <button onclick="openWebhookSetup()">Setup Webhooks</button>
                <button onclick="openWebhookTest()">Test Webhooks</button>
            </div>

            <!-- System Status -->
            <div class="settings-section">
                <h3>📊 System Status</h3>
                <div id="systemStatus">
                    <span class="loading"></span> Loading system status...
                </div>
                <button onclick="loadSystemStatus()">Refresh Status</button>
            </div>

            <!-- Quick Actions -->
            <div class="settings-section">
                <h3>⚡ Quick Actions</h3>
                <button onclick="triggerTestEvent()">Trigger Test Event</button>
                <button onclick="viewRecentEvents()">View Recent Events</button>
            </div>
        </div>

        <script>
            // Load status on page load
            loadWebhookStatus();
            loadSystemStatus();

            // Load webhook status
            async function loadWebhookStatus() {
                try {
                    const response = await fetch('/api/webhooks', {
                        headers: {
                            'Authorization': 'Bearer ' + getAuthToken()
                        }
                    });

                    const result = await response.json();
                    const statusDiv = document.getElementById('webhookStatus');
                    
                    if (result.webhooks && result.webhooks.length > 0) {
                        const activeWebhooks = result.webhooks.filter(w => w.active);
                        const inactiveWebhooks = result.webhooks.filter(w => !w.active);
                        
                        statusDiv.innerHTML = \`
                            <div style="margin: 10px 0;">
                                <span class="status-indicator status-active"></span>
                                <strong>\${activeWebhooks.length} active webhook(s)</strong><br>
                                <small>\${inactiveWebhooks.length} inactive webhook(s)</small>
                            </div>
                            \${result.webhooks.map(webhook => \`
                                <div class="webhook-item">
                                    <div class="webhook-name">\${webhook.name}</div>
                                    <div class="webhook-url">\${webhook.url}</div>
                                    <div class="webhook-events">Events: \${webhook.events.join(', ')}</div>
                                    <div style="margin-top: 5px;">
                                        <span class="status-indicator \${webhook.active ? 'status-active' : 'status-inactive'}"></span>
                                        \${webhook.active ? 'Active' : 'Inactive'}
                                    </div>
                                </div>
                            \`).join('')}
                        \`;
                    } else {
                        statusDiv.innerHTML = \`
                            <div class="info">
                                <span class="status-indicator status-inactive"></span> 
                                <strong>No webhooks configured</strong><br>
                                <small>Set up webhooks to receive notifications</small>
                            </div>
                        \`;
                    }
                } catch (error) {
                    document.getElementById('webhookStatus').innerHTML = \`
                        <div class="error">
                            <span class="status-indicator status-unknown"></span> 
                            <strong>Error loading webhooks</strong><br>
                            <small>\${error.message}</small>
                        </div>
                    \`;
                }
            }

            // Load system status
            async function loadSystemStatus() {
                try {
                    const response = await fetch('/api/health');
                    const result = await response.json();
                    
                    document.getElementById('systemStatus').innerHTML = \`
                        <div style="margin: 10px 0;">
                            <span class="status-indicator status-active"></span>
                            <strong>System Status: \${result.status}</strong><br>
                            <small>Uptime: \${Math.floor(result.uptime / 60)} minutes</small><br>
                            <small>Memory: \${Math.round(result.memory.used / 1024 / 1024)} MB</small>
                        </div>
                    \`;
                } catch (error) {
                    document.getElementById('systemStatus').innerHTML = \`
                        <div class="error">
                            <span class="status-indicator status-unknown"></span> 
                            <strong>Error loading system status</strong><br>
                            <small>\${error.message}</small>
                        </div>
                    \`;
                }
            }

            // Test webhook
            async function testWebhook() {
                const btn = document.getElementById('testWebhookBtn');
                const resultDiv = document.getElementById('testResult');
                
                btn.disabled = true;
                btn.innerHTML = '<span class="loading"></span> Testing...';
                resultDiv.innerHTML = '';

                try {
                    const testData = {
                        event: 'webhook.test',
                        timestamp: new Date().toISOString(),
                        data: {
                            message: 'Test webhook from mobile settings',
                            testType: 'mobile_test',
                            timestamp: new Date().toISOString()
                        }
                    };

                    const response = await fetch('/api/webhook-test/trigger-test', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer ' + getAuthToken()
                        },
                        body: JSON.stringify(testData)
                    });

                    const result = await response.json();
                    
                    if (result.success) {
                        resultDiv.innerHTML = \`
                            <div class="success">
                                ✅ Test webhook sent successfully!<br>
                                <small>Event: \${testData.event}</small><br>
                                <small>Time: \${new Date().toLocaleString()}</small>
                            </div>
                        \`;
                    } else {
                        resultDiv.innerHTML = '<div class="error">❌ Test failed: ' + (result.message || 'Unknown error') + '</div>';
                    }
                } catch (error) {
                    resultDiv.innerHTML = '<div class="error">❌ Error: ' + error.message + '</div>';
                } finally {
                    btn.disabled = false;
                    btn.innerHTML = 'Test Webhook';
                }
            }

            // Open webhook setup
            function openWebhookSetup() {
                window.open('/api/webhook-setup/setup', '_blank');
            }

            // Open webhook test
            function openWebhookTest() {
                window.open('/api/webhook-test/test-interface', '_blank');
            }

            // Trigger test event
            async function triggerTestEvent() {
                try {
                    const response = await fetch('/api/webhook-test/trigger-test', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer ' + getAuthToken()
                        },
                        body: JSON.stringify({
                            event: 'access_request.granted',
                            timestamp: new Date().toISOString(),
                            data: {
                                requestId: 999,
                                userId: 123,
                                doorId: 456,
                                requestType: 'qr_scan',
                                status: 'granted',
                                reason: 'Test event from mobile settings',
                                user: {
                                    id: 123,
                                    email: 'test@example.com',
                                    firstName: 'Test',
                                    lastName: 'User'
                                },
                                door: {
                                    id: 456,
                                    name: 'Test Door',
                                    location: 'Test Location'
                                }
                            }
                        })
                    });

                    const result = await response.json();
                    
                    if (result.success) {
                        showMessage('Test event triggered successfully!', 'success');
                    } else {
                        showMessage('Test failed: ' + (result.message || 'Unknown error'), 'error');
                    }
                } catch (error) {
                    showMessage('Error: ' + error.message, 'error');
                }
            }

            // View recent events
            function viewRecentEvents() {
                window.open('/api/events', '_blank');
            }

            // Show message
            function showMessage(message, type) {
                const div = document.createElement('div');
                div.className = type;
                div.textContent = message;
                document.querySelector('.container').insertBefore(div, document.querySelector('.settings-section'));
                
                setTimeout(() => {
                    div.remove();
                }, 5000);
            }

            // Get auth token
            function getAuthToken() {
                // Try to get from localStorage first
                let token = localStorage.getItem('authToken');
                if (token) return token;
                
                // Try to get from cookies
                const cookies = document.cookie.split(';');
                for (let cookie of cookies) {
                    const [name, value] = cookie.trim().split('=');
                    if (name === 'authToken') {
                        return value;
                    }
                }
                
                // Fallback - you might need to adjust this based on your auth system
                return 'your-admin-token-here';
            }
        </script>
    </body>
    </html>
    `;
    
    res.send(html);
  } catch (error) {
    console.error('Mobile settings page error:', error);
    res.status(500).send('Error loading mobile settings page');
  }
});

module.exports = router;