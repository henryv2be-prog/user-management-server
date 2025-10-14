// Simple Webhook Receiver for Testing
// Run this locally to receive and display webhooks from SimplifiAccess

const express = require('express');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3001;

// Webhook secret (optional - for signature verification)
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'your-webhook-secret-here';

// Middleware to parse JSON
app.use(express.json());

// Store received webhooks for display
let receivedWebhooks = [];

// Verify webhook signature (optional)
function verifyWebhookSignature(req, res, next) {
  const signature = req.headers['x-webhook-signature'];
  
  if (!signature) {
    console.log('⚠️ No signature provided - skipping verification');
    return next();
  }

  // Extract signature hash
  const hash = signature.replace('sha256=', '');
  
  // Generate expected signature
  const payload = JSON.stringify(req.body);
  const expectedHash = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(payload, 'utf8')
    .digest('hex');

  // Verify signature
  if (!crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(expectedHash, 'hex'))) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  next();
}

// Webhook endpoint
app.post('/webhook', verifyWebhookSignature, (req, res) => {
  try {
    const { event, timestamp, data } = req.body;
    const webhookEvent = req.headers['x-webhook-event'];
    const deliveryId = req.headers['x-webhook-delivery'];
    
    console.log(`\n📡 WEBHOOK RECEIVED!`);
    console.log(`   Event: ${event || webhookEvent}`);
    console.log(`   Delivery ID: ${deliveryId}`);
    console.log(`   Timestamp: ${timestamp}`);
    console.log(`   Data:`, JSON.stringify(data, null, 2));
    console.log(`   Headers:`, JSON.stringify(req.headers, null, 2));

    // Store webhook for display
    receivedWebhooks.unshift({
      id: deliveryId,
      event: event || webhookEvent,
      timestamp: timestamp,
      data: data,
      receivedAt: new Date().toISOString()
    });

    // Keep only last 50 webhooks
    if (receivedWebhooks.length > 50) {
      receivedWebhooks = receivedWebhooks.slice(0, 50);
    }

    // Respond with success
    res.status(200).json({ 
      success: true, 
      message: 'Webhook received and processed',
      delivery: deliveryId
    });

  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: 'Failed to process webhook'
    });
  }
});

// Display received webhooks
app.get('/', (req, res) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>SimplifiAccess Webhook Receiver</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .webhook { border: 1px solid #ddd; margin: 10px 0; padding: 15px; border-radius: 5px; }
            .event { font-weight: bold; color: #2c5aa0; }
            .timestamp { color: #666; font-size: 0.9em; }
            .data { background: #f5f5f5; padding: 10px; margin: 10px 0; border-radius: 3px; }
            .no-webhooks { color: #666; font-style: italic; }
            .refresh { margin: 20px 0; }
            .refresh button { padding: 10px 20px; background: #2c5aa0; color: white; border: none; border-radius: 3px; cursor: pointer; }
        </style>
    </head>
    <body>
        <h1>🔗 SimplifiAccess Webhook Receiver</h1>
        <p>This page shows webhooks received from your SimplifiAccess system.</p>
        
        <div class="refresh">
            <button onclick="location.reload()">🔄 Refresh</button>
        </div>

        <h2>📡 Received Webhooks (${receivedWebhooks.length})</h2>
        
        ${receivedWebhooks.length === 0 ? 
          '<div class="no-webhooks">No webhooks received yet. Make sure your webhook URL is configured correctly in SimplifiAccess.</div>' :
          receivedWebhooks.map(webhook => `
            <div class="webhook">
                <div class="event">${webhook.event}</div>
                <div class="timestamp">Received: ${new Date(webhook.receivedAt).toLocaleString()}</div>
                <div class="timestamp">Event Time: ${new Date(webhook.timestamp).toLocaleString()}</div>
                <div class="data">
                    <pre>${JSON.stringify(webhook.data, null, 2)}</pre>
                </div>
            </div>
          `).join('')
        }

        <h2>🔧 Setup Instructions</h2>
        <ol>
            <li>Make sure this server is running on port ${PORT}</li>
            <li>Use this URL in your SimplifiAccess webhook configuration: <code>http://localhost:${PORT}/webhook</code></li>
            <li>For external access, use a service like ngrok: <code>ngrok http ${PORT}</code></li>
            <li>Grant/deny access using your mobile app to trigger webhooks</li>
        </ol>

        <h2>📋 Webhook URL</h2>
        <p>Use this URL in your SimplifiAccess webhook configuration:</p>
        <code>http://localhost:${PORT}/webhook</code>
        
        <h2>🌐 External Access</h2>
        <p>To receive webhooks from external services (like Railway), use ngrok:</p>
        <ol>
            <li>Install ngrok: <code>npm install -g ngrok</code></li>
            <li>Run: <code>ngrok http ${PORT}</code></li>
            <li>Use the HTTPS URL provided by ngrok</li>
        </ol>
    </body>
    </html>
  `;
  
  res.send(html);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    webhooksReceived: receivedWebhooks.length,
    service: 'SimplifiAccess Webhook Receiver'
  });
});

// Clear webhooks endpoint
app.post('/clear', (req, res) => {
  receivedWebhooks = [];
  res.json({ success: true, message: 'Webhooks cleared' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Webhook receiver server running on port ${PORT}`);
  console.log(`📡 Webhook endpoint: http://localhost:${PORT}/webhook`);
  console.log(`🌐 Web interface: http://localhost:${PORT}`);
  console.log(`❤️ Health check: http://localhost:${PORT}/health`);
  console.log(`\n📋 Next steps:`);
  console.log(`1. Configure webhook in SimplifiAccess with URL: http://localhost:${PORT}/webhook`);
  console.log(`2. Grant/deny access using your mobile app`);
  console.log(`3. Watch webhooks appear here!`);
  console.log(`\n💡 For external access, use ngrok: ngrok http ${PORT}`);
});

module.exports = app;