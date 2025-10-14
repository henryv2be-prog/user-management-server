// Webhook Setup Interface for Admin Panel
// This creates a web-based interface for setting up webhooks

const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');

// Webhook setup page
router.get('/setup', authenticate, requireAdmin, async (req, res) => {
  try {
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Webhook Setup - SimplifiAccess</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                margin: 0; 
                padding: 20px; 
                background: #f5f5f5;
                line-height: 1.6;
            }
            .container { 
                max-width: 800px; 
                margin: 0 auto; 
                background: white; 
                padding: 30px; 
                border-radius: 10px; 
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            h1 { color: #2c5aa0; margin-bottom: 30px; }
            h2 { color: #333; margin-top: 30px; margin-bottom: 15px; }
            .step { 
                background: #f8f9fa; 
                padding: 20px; 
                margin: 20px 0; 
                border-radius: 8px; 
                border-left: 4px solid #2c5aa0;
            }
            .step h3 { margin-top: 0; color: #2c5aa0; }
            .form-group { margin: 15px 0; }
            label { display: block; margin-bottom: 5px; font-weight: bold; }
            input, select, textarea { 
                width: 100%; 
                padding: 12px; 
                border: 1px solid #ddd; 
                border-radius: 5px; 
                font-size: 16px;
                box-sizing: border-box;
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
            .webhook-list { margin: 20px 0; }
            .webhook-item { 
                background: #f8f9fa; 
                padding: 15px; 
                margin: 10px 0; 
                border-radius: 5px; 
                border: 1px solid #ddd;
            }
            .webhook-name { font-weight: bold; color: #2c5aa0; }
            .webhook-url { color: #666; font-size: 0.9em; }
            .webhook-events { color: #666; font-size: 0.9em; margin-top: 5px; }
            .test-section { 
                background: #e7f3ff; 
                padding: 20px; 
                border-radius: 8px; 
                margin: 20px 0;
                border: 1px solid #b3d9ff;
            }
            .test-result { 
                margin: 10px 0; 
                padding: 10px; 
                border-radius: 5px; 
                font-family: monospace;
                white-space: pre-wrap;
            }
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
            .copy-btn { 
                background: #28a745; 
                color: white; 
                padding: 5px 10px; 
                border: none; 
                border-radius: 3px; 
                cursor: pointer; 
                font-size: 12px;
                margin-left: 10px;
            }
            .copy-btn:hover { background: #218838; }
            .event-checkbox { 
                display: inline-block; 
                margin: 5px 10px 5px 0; 
                width: auto;
            }
            .event-checkbox input { width: auto; margin-right: 5px; }
            .event-checkbox label { display: inline; font-weight: normal; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🔗 Webhook Setup</h1>
            <p>Set up webhooks to receive real-time notifications when access requests are granted, denied, or when doors go offline.</p>

            <!-- Step 1: Create Webhook -->
            <div class="step">
                <h3>Step 1: Create Your First Webhook</h3>
                <form id="webhookForm">
                    <div class="form-group">
                        <label for="webhookName">Webhook Name:</label>
                        <input type="text" id="webhookName" placeholder="e.g., Slack Notifications" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="webhookUrl">Webhook URL:</label>
                        <input type="url" id="webhookUrl" placeholder="https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK" required>
                        <small>For testing, you can use: <a href="https://webhook.site" target="_blank">webhook.site</a></small>
                    </div>
                    
                    <div class="form-group">
                        <label>Events to Subscribe To:</label>
                        <div>
                            <label class="event-checkbox">
                                <input type="checkbox" value="access_request.granted" checked> Access Granted
                            </label>
                            <label class="event-checkbox">
                                <input type="checkbox" value="access_request.denied" checked> Access Denied
                            </label>
                            <label class="event-checkbox">
                                <input type="checkbox" value="door.offline"> Door Offline
                            </label>
                            <label class="event-checkbox">
                                <input type="checkbox" value="door.online"> Door Online
                            </label>
                            <label class="event-checkbox">
                                <input type="checkbox" value="user.login"> User Login
                            </label>
                            <label class="event-checkbox">
                                <input type="checkbox" value="system.error"> System Error
                            </label>
                        </div>
                    </div>
                    
                    <button type="submit">Create Webhook</button>
                </form>
            </div>

            <!-- Step 2: Test Webhook -->
            <div class="test-section">
                <h3>Step 2: Test Your Webhook</h3>
                <p>Test your webhook to make sure it's working correctly.</p>
                
                <div id="testWebhookSection" style="display: none;">
                    <button id="testWebhookBtn">Send Test Webhook</button>
                    <div id="testResult"></div>
                </div>
            </div>

            <!-- Step 3: View Webhooks -->
            <div class="step">
                <h3>Step 3: Manage Your Webhooks</h3>
                <button onclick="loadWebhooks()">Refresh Webhooks</button>
                <div id="webhookList" class="webhook-list"></div>
            </div>

            <!-- Quick Examples -->
            <div class="step">
                <h3>Quick Examples</h3>
                
                <h4>Slack Integration:</h4>
                <div class="info">
                    <strong>1.</strong> Go to <a href="https://api.slack.com/apps" target="_blank">Slack API</a><br>
                    <strong>2.</strong> Create a new app → "From scratch"<br>
                    <strong>3.</strong> Go to "Incoming Webhooks" → Activate<br>
                    <strong>4.</strong> Add webhook to workspace → Choose channel<br>
                    <strong>5.</strong> Copy the webhook URL and use it above
                </div>

                <h4>Email Notifications:</h4>
                <div class="info">
                    Use services like <a href="https://zapier.com" target="_blank">Zapier</a> or <a href="https://ifttt.com" target="_blank">IFTTT</a> to receive webhooks and send emails automatically.
                </div>

                <h4>Mobile App Push Notifications:</h4>
                <div class="info">
                    Set up Firebase Cloud Messaging (FCM) and create a webhook endpoint in your mobile app to receive push notifications.
                </div>
            </div>

            <!-- Webhook Payload Example -->
            <div class="step">
                <h3>Webhook Payload Example</h3>
                <p>When an access request is granted, your webhook will receive data like this:</p>
                <div class="test-result" id="payloadExample">
{
  "event": "access_request.granted",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "data": {
    "requestId": 123,
    "userId": 456,
    "doorId": 789,
    "requestType": "qr_scan",
    "status": "granted",
    "reason": "Access granted",
    "user": {
      "id": 456,
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe"
    },
    "door": {
      "id": 789,
      "name": "Main Entrance",
      "location": "Building A"
    }
  }
}
                </div>
                <button class="copy-btn" onclick="copyToClipboard('payloadExample')">Copy</button>
            </div>
        </div>

        <script>
            let currentWebhookId = null;

            // Create webhook
            document.getElementById('webhookForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const name = document.getElementById('webhookName').value;
                const url = document.getElementById('webhookUrl').value;
                const events = Array.from(document.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
                
                if (events.length === 0) {
                    showMessage('Please select at least one event.', 'error');
                    return;
                }

                try {
                    const response = await fetch('/api/webhooks', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer ' + getAuthToken()
                        },
                        body: JSON.stringify({ name, url, events })
                    });

                    const result = await response.json();
                    
                    if (result.success) {
                        showMessage('Webhook created successfully!', 'success');
                        currentWebhookId = result.webhook.id;
                        document.getElementById('testWebhookSection').style.display = 'block';
                        loadWebhooks();
                    } else {
                        showMessage('Error: ' + (result.message || 'Failed to create webhook'), 'error');
                    }
                } catch (error) {
                    showMessage('Error: ' + error.message, 'error');
                }
            });

            // Test webhook
            document.getElementById('testWebhookBtn').addEventListener('click', async () => {
                if (!currentWebhookId) {
                    showMessage('Please create a webhook first.', 'error');
                    return;
                }

                const btn = document.getElementById('testWebhookBtn');
                const resultDiv = document.getElementById('testResult');
                
                btn.disabled = true;
                btn.innerHTML = '<span class="loading"></span> Testing...';
                resultDiv.innerHTML = '';

                try {
                    const response = await fetch('/api/webhooks/' + currentWebhookId + '/test', {
                        method: 'POST',
                        headers: {
                            'Authorization': 'Bearer ' + getAuthToken()
                        }
                    });

                    const result = await response.json();
                    
                    if (result.success) {
                        resultDiv.innerHTML = '<div class="success">✅ Test webhook sent successfully!<br>Check your webhook URL to see the data.</div>';
                    } else {
                        resultDiv.innerHTML = '<div class="error">❌ Test failed: ' + (result.message || 'Unknown error') + '</div>';
                    }
                } catch (error) {
                    resultDiv.innerHTML = '<div class="error">❌ Error: ' + error.message + '</div>';
                } finally {
                    btn.disabled = false;
                    btn.innerHTML = 'Send Test Webhook';
                }
            });

            // Load webhooks
            async function loadWebhooks() {
                try {
                    const response = await fetch('/api/webhooks', {
                        headers: {
                            'Authorization': 'Bearer ' + getAuthToken()
                        }
                    });

                    const result = await response.json();
                    const webhookList = document.getElementById('webhookList');
                    
                    if (result.webhooks && result.webhooks.length > 0) {
                        webhookList.innerHTML = result.webhooks.map(webhook => \`
                            <div class="webhook-item">
                                <div class="webhook-name">\${webhook.name}</div>
                                <div class="webhook-url">\${webhook.url}</div>
                                <div class="webhook-events">Events: \${webhook.events.join(', ')}</div>
                                <div style="margin-top: 10px;">
                                    <button onclick="testWebhook('\${webhook.id}')">Test</button>
                                    <button onclick="deleteWebhook('\${webhook.id}')" style="background: #dc3545;">Delete</button>
                                </div>
                            </div>
                        \`).join('');
                    } else {
                        webhookList.innerHTML = '<div class="info">No webhooks configured yet.</div>';
                    }
                } catch (error) {
                    document.getElementById('webhookList').innerHTML = '<div class="error">Error loading webhooks: ' + error.message + '</div>';
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

            // Delete webhook
            async function deleteWebhook(webhookId) {
                if (!confirm('Are you sure you want to delete this webhook?')) {
                    return;
                }

                try {
                    const response = await fetch('/api/webhooks/' + webhookId, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': 'Bearer ' + getAuthToken()
                        }
                    });

                    const result = await response.json();
                    
                    if (result.success) {
                        showMessage('Webhook deleted successfully!', 'success');
                        loadWebhooks();
                    } else {
                        showMessage('Error: ' + (result.message || 'Failed to delete webhook'), 'error');
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
                document.querySelector('.container').insertBefore(div, document.querySelector('.step'));
                
                setTimeout(() => {
                    div.remove();
                }, 5000);
            }

            // Copy to clipboard
            function copyToClipboard(elementId) {
                const element = document.getElementById(elementId);
                const text = element.textContent;
                navigator.clipboard.writeText(text).then(() => {
                    showMessage('Copied to clipboard!', 'success');
                });
            }

            // Get auth token from localStorage or cookie
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
                
                // If not found, try to get from the current page's auth
                // This is a fallback - you might need to adjust based on your auth system
                return 'your-admin-token-here';
            }

            // Load webhooks on page load
            loadWebhooks();
        </script>
    </body>
    </html>
    `;
    
    res.send(html);
  } catch (error) {
    console.error('Webhook setup page error:', error);
    res.status(500).send('Error loading webhook setup page');
  }
});

module.exports = router;