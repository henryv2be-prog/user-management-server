// Webhook Test Interface for Settings Page
// This creates a simple test interface that can be embedded in the settings page

const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');

// Webhook test endpoint for settings page
router.get('/test-interface', authenticate, requireAdmin, async (req, res) => {
  try {
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Webhook Test - SimplifiAccess</title>
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
            .test-section { 
                background: #e7f3ff; 
                padding: 20px; 
                border-radius: 8px; 
                margin: 20px 0;
                border: 1px solid #b3d9ff;
            }
            button { 
                background: #2c5aa0; 
                color: white; 
                padding: 12px 24px; 
                border: none; 
                border-radius: 5px; 
                cursor: pointer; 
                font-size: 16px;
                margin: 10px 5px;
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
            .webhook-status { 
                background: #f8f9fa; 
                padding: 15px; 
                border-radius: 5px; 
                margin: 15px 0;
                border: 1px solid #ddd;
            }
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
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🔗 Webhook Test</h1>
            <p>Test your webhook configuration to ensure it's working correctly.</p>

            <!-- Webhook Status -->
            <div class="webhook-status">
                <h3>Webhook Status</h3>
                <div id="webhookStatus">
                    <span class="loading"></span> Checking webhook status...
                </div>
            </div>

            <!-- Test Section -->
            <div class="test-section">
                <h3>Quick Test</h3>
                <p>Send a test webhook to verify your configuration is working.</p>
                
                <button id="testAllWebhooksBtn">Test All Webhooks</button>
                <button id="testAccessGrantedBtn">Test Access Granted</button>
                <button id="testAccessDeniedBtn">Test Access Denied</button>
                
                <div id="testResult"></div>
            </div>

            <!-- Webhook List -->
            <div class="webhook-status">
                <h3>Configured Webhooks</h3>
                <div id="webhookList">
                    <span class="loading"></span> Loading webhooks...
                </div>
            </div>

            <!-- Setup Link -->
            <div class="info">
                <strong>Need to set up webhooks?</strong><br>
                <a href="/api/webhook-setup/setup" target="_blank">Open Webhook Setup</a>
            </div>
        </div>

        <script>
            // Load webhook status on page load
            loadWebhookStatus();

            // Test all webhooks
            document.getElementById('testAllWebhooksBtn').addEventListener('click', async () => {
                await testWebhooks('all');
            });

            // Test access granted
            document.getElementById('testAccessGrantedBtn').addEventListener('click', async () => {
                await testWebhooks('access_request.granted');
            });

            // Test access denied
            document.getElementById('testAccessDeniedBtn').addEventListener('click', async () => {
                await testWebhooks('access_request.denied');
            });

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
                    const listDiv = document.getElementById('webhookList');
                    
                    if (result.webhooks && result.webhooks.length > 0) {
                        const activeWebhooks = result.webhooks.filter(w => w.active);
                        const inactiveWebhooks = result.webhooks.filter(w => !w.active);
                        
                        statusDiv.innerHTML = \`
                            <span class="status-indicator status-active"></span>
                            <strong>\${activeWebhooks.length} active webhook(s)</strong><br>
                            <small>\${inactiveWebhooks.length} inactive webhook(s)</small>
                        \`;
                        
                        listDiv.innerHTML = result.webhooks.map(webhook => \`
                            <div style="margin: 10px 0; padding: 10px; background: white; border-radius: 5px; border: 1px solid #ddd;">
                                <div style="font-weight: bold; color: #2c5aa0;">\${webhook.name}</div>
                                <div style="font-size: 0.9em; color: #666;">\${webhook.url}</div>
                                <div style="font-size: 0.9em; color: #666;">Events: \${webhook.events.join(', ')}</div>
                                <div style="margin-top: 5px;">
                                    <span class="status-indicator \${webhook.active ? 'status-active' : 'status-inactive'}"></span>
                                    \${webhook.active ? 'Active' : 'Inactive'}
                                    <button onclick="testWebhook('\${webhook.id}')" style="float: right; padding: 5px 10px; font-size: 12px;">Test</button>
                                </div>
                            </div>
                        \`).join('');
                    } else {
                        statusDiv.innerHTML = '<span class="status-indicator status-inactive"></span> <strong>No webhooks configured</strong>';
                        listDiv.innerHTML = '<div class="info">No webhooks configured yet. <a href="/api/webhook-setup/setup" target="_blank">Set up webhooks</a></div>';
                    }
                } catch (error) {
                    document.getElementById('webhookStatus').innerHTML = '<span class="status-indicator status-unknown"></span> <strong>Error loading webhooks</strong>';
                    document.getElementById('webhookList').innerHTML = '<div class="error">Error: ' + error.message + '</div>';
                }
            }

            // Test webhooks
            async function testWebhooks(eventType = 'all') {
                const resultDiv = document.getElementById('testResult');
                const buttons = document.querySelectorAll('button[id$="Btn"]');
                
                // Disable buttons
                buttons.forEach(btn => btn.disabled = true);
                buttons.forEach(btn => btn.innerHTML = '<span class="loading"></span> Testing...');
                resultDiv.innerHTML = '';

                try {
                    let testData = {};
                    
                    if (eventType === 'access_request.granted') {
                        testData = {
                            event: 'access_request.granted',
                            timestamp: new Date().toISOString(),
                            data: {
                                requestId: 999,
                                userId: 123,
                                doorId: 456,
                                requestType: 'qr_scan',
                                status: 'granted',
                                reason: 'Test webhook - Access granted',
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
                        };
                    } else if (eventType === 'access_request.denied') {
                        testData = {
                            event: 'access_request.denied',
                            timestamp: new Date().toISOString(),
                            data: {
                                requestId: 998,
                                userId: 123,
                                doorId: 456,
                                requestType: 'qr_scan',
                                status: 'denied',
                                reason: 'Test webhook - Access denied',
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
                        };
                    } else {
                        testData = {
                            event: 'webhook.test',
                            timestamp: new Date().toISOString(),
                            data: {
                                message: 'This is a test webhook from SimplifiAccess',
                                testType: 'all_webhooks',
                                timestamp: new Date().toISOString()
                            }
                        };
                    }

                    // Trigger webhook
                    const response = await fetch('/api/webhooks/trigger-test', {
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
                                <strong>Event:</strong> \${testData.event}<br>
                                <strong>Webhooks triggered:</strong> \${result.triggered || 'Unknown'}<br>
                                <strong>Time:</strong> \${new Date().toLocaleString()}
                            </div>
                        \`;
                    } else {
                        resultDiv.innerHTML = '<div class="error">❌ Test failed: ' + (result.message || 'Unknown error') + '</div>';
                    }
                } catch (error) {
                    resultDiv.innerHTML = '<div class="error">❌ Error: ' + error.message + '</div>';
                } finally {
                    // Re-enable buttons
                    buttons.forEach(btn => btn.disabled = false);
                    document.getElementById('testAllWebhooksBtn').innerHTML = 'Test All Webhooks';
                    document.getElementById('testAccessGrantedBtn').innerHTML = 'Test Access Granted';
                    document.getElementById('testAccessDeniedBtn').innerHTML = 'Test Access Denied';
                }
            }

            // Test specific webhook
            async function testWebhook(webhookId) {
                try {
                    const response = await fetch('/api/webhooks/' + webhookId + '/test', {
                        method: 'POST',
                        headers: {
                            'Authorization': 'Bearer ' + getAuthToken()
                        }
                    });

                    const result = await response.json();
                    
                    if (result.success) {
                        showMessage('Test webhook sent successfully!', 'success');
                    } else {
                        showMessage('Test failed: ' + (result.message || 'Unknown error'), 'error');
                    }
                } catch (error) {
                    showMessage('Error: ' + error.message, 'error');
                }
            }

            // Show message
            function showMessage(message, type) {
                const div = document.createElement('div');
                div.className = type;
                div.textContent = message;
                document.querySelector('.container').insertBefore(div, document.querySelector('.test-section'));
                
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
    console.error('Webhook test page error:', error);
    res.status(500).send('Error loading webhook test page');
  }
});

// Test webhook trigger endpoint
router.post('/trigger-test', authenticate, requireAdmin, async (req, res) => {
  try {
    const { event, timestamp, data } = req.body;
    
    if (!event || !data) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Event and data are required'
      });
    }

    // Trigger webhook using the global function
    if (global.triggerWebhook) {
      await global.triggerWebhook(event, data);
      
      res.json({
        success: true,
        message: 'Test webhook triggered successfully',
        event: event,
        triggered: 'All configured webhooks'
      });
    } else {
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Webhook system not available'
      });
    }

  } catch (error) {
    console.error('Test webhook trigger error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to trigger test webhook'
    });
  }
});

module.exports = router;