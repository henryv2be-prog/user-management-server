// Webhook Client Example
// This shows how external systems can receive and process webhooks from SimplifiAccess

const express = require('express');
const crypto = require('crypto');

const app = express();
const PORT = process.env.WEBHOOK_PORT || 3001;

// Webhook secret (should match the one configured in SimplifiAccess)
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'your-webhook-secret-here';

// Middleware to parse JSON
app.use(express.json());

// Verify webhook signature
function verifyWebhookSignature(req, res, next) {
  const signature = req.headers['x-webhook-signature'];
  const event = req.headers['x-webhook-event'];
  const delivery = req.headers['x-webhook-delivery'];

  if (!signature || !event || !delivery) {
    return res.status(400).json({ error: 'Missing webhook headers' });
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

  // Add webhook metadata to request
  req.webhookEvent = event;
  req.webhookDelivery = delivery;
  
  next();
}

// Webhook endpoint
app.post('/webhook', verifyWebhookSignature, (req, res) => {
  try {
    const { event, timestamp, data } = req.body;
    
    console.log(`📡 Received webhook: ${event} (${req.webhookDelivery})`);
    console.log(`📡 Timestamp: ${timestamp}`);
    console.log(`📡 Data:`, JSON.stringify(data, null, 2));

    // Process different event types
    switch (event) {
      case 'access_request.created':
        handleAccessRequestCreated(data);
        break;
        
      case 'access_request.granted':
        handleAccessRequestGranted(data);
        break;
        
      case 'access_request.denied':
        handleAccessRequestDenied(data);
        break;
        
      case 'door.opened':
        handleDoorOpened(data);
        break;
        
      case 'door.closed':
        handleDoorClosed(data);
        break;
        
      case 'door.online':
        handleDoorOnline(data);
        break;
        
      case 'door.offline':
        handleDoorOffline(data);
        break;
        
      case 'user.login':
        handleUserLogin(data);
        break;
        
      case 'user.logout':
        handleUserLogout(data);
        break;
        
      case 'system.error':
        handleSystemError(data);
        break;
        
      case 'webhook.test':
        handleWebhookTest(data);
        break;
        
      default:
        console.log(`⚠️ Unknown webhook event: ${event}`);
    }

    // Respond with success
    res.status(200).json({ 
      success: true, 
      message: 'Webhook received and processed',
      delivery: req.webhookDelivery
    });

  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: 'Failed to process webhook'
    });
  }
});

// Event handlers
function handleAccessRequestCreated(data) {
  console.log(`🔐 New access request created:`);
  console.log(`   Request ID: ${data.requestId}`);
  console.log(`   User: ${data.user.email} (${data.user.firstName} ${data.user.lastName})`);
  console.log(`   Door: ${data.door.name} (${data.door.location})`);
  console.log(`   Type: ${data.requestType}`);
  
  // Example: Send notification to security team
  // sendSlackNotification(`New access request from ${data.user.email} for ${data.door.name}`);
  
  // Example: Log to external audit system
  // logToAuditSystem('access_request_created', data);
}

function handleAccessRequestGranted(data) {
  console.log(`✅ Access request granted:`);
  console.log(`   Request ID: ${data.requestId}`);
  console.log(`   User: ${data.user.email}`);
  console.log(`   Door: ${data.door.name}`);
  console.log(`   Reason: ${data.reason}`);
  
  // Example: Send success notification
  // sendEmailNotification(data.user.email, 'Access Granted', `Your access request for ${data.door.name} has been granted.`);
}

function handleAccessRequestDenied(data) {
  console.log(`❌ Access request denied:`);
  console.log(`   Request ID: ${data.requestId}`);
  console.log(`   User: ${data.user.email}`);
  console.log(`   Door: ${data.door.name}`);
  console.log(`   Reason: ${data.reason}`);
  
  // Example: Send denial notification
  // sendEmailNotification(data.user.email, 'Access Denied', `Your access request for ${data.door.name} has been denied. Reason: ${data.reason}`);
  
  // Example: Alert security team
  // sendSlackNotification(`🚨 Access denied for ${data.user.email} at ${data.door.name}`);
}

function handleDoorOpened(data) {
  console.log(`🚪 Door opened:`);
  console.log(`   Door: ${data.doorName} (${data.location})`);
  console.log(`   Triggered by: ${data.triggeredBy ? data.triggeredBy.email : 'System'}`);
  
  // Example: Log door opening event
  // logToAuditSystem('door_opened', data);
  
  // Example: Send real-time notification
  // sendPushNotification(`Door ${data.doorName} has been opened`);
}

function handleDoorClosed(data) {
  console.log(`🔒 Door closed:`);
  console.log(`   Door: ${data.doorName} (${data.location})`);
  console.log(`   Triggered by: ${data.triggeredBy ? data.triggeredBy.email : 'System'}`);
  
  // Example: Log door closing event
  // logToAuditSystem('door_closed', data);
}

function handleDoorOnline(data) {
  console.log(`🟢 Door came online:`);
  console.log(`   Door: ${data.doorName} (${data.location})`);
  console.log(`   IP: ${data.esp32Ip}`);
  
  // Example: Send system status update
  // sendSlackNotification(`✅ Door ${data.doorName} is now online`);
}

function handleDoorOffline(data) {
  console.log(`🔴 Door went offline:`);
  console.log(`   Door: ${data.doorName} (${data.location})`);
  console.log(`   IP: ${data.esp32Ip}`);
  
  // Example: Send alert to maintenance team
  // sendSlackNotification(`🚨 Door ${data.doorName} is offline!`);
  // sendEmailNotification('maintenance@company.com', 'Door Offline Alert', `Door ${data.doorName} has gone offline.`);
}

function handleUserLogin(data) {
  console.log(`👤 User logged in:`);
  console.log(`   User: ${data.email} (${data.firstName} ${data.lastName})`);
  console.log(`   Role: ${data.role}`);
  console.log(`   IP: ${data.ipAddress}`);
  
  // Example: Log login event
  // logToAuditSystem('user_login', data);
}

function handleUserLogout(data) {
  console.log(`👋 User logged out:`);
  console.log(`   User: ${data.email} (${data.firstName} ${data.lastName})`);
  console.log(`   Role: ${data.role}`);
  console.log(`   IP: ${data.ipAddress}`);
  
  // Example: Log logout event
  // logToAuditSystem('user_logout', data);
}

function handleSystemError(data) {
  console.log(`💥 System error occurred:`);
  console.log(`   Event Type: ${data.eventType}`);
  console.log(`   Message: ${data.message}`);
  console.log(`   Server Info:`, data.serverInfo);
  
  // Example: Send critical alert
  // sendSlackNotification(`🚨 System Error: ${data.message}`);
  // sendEmailNotification('admin@company.com', 'System Error Alert', data.message);
}

function handleWebhookTest(data) {
  console.log(`🧪 Webhook test received:`);
  console.log(`   Message: ${data.message}`);
  console.log(`   Webhook ID: ${data.webhookId}`);
  console.log(`   Webhook Name: ${data.webhookName}`);
  
  // Example: Send test confirmation
  // sendSlackNotification(`✅ Webhook test successful for ${data.webhookName}`);
}

// Example helper functions (implement based on your needs)
function sendSlackNotification(message) {
  // Implementation for Slack notifications
  console.log(`📱 Slack notification: ${message}`);
}

function sendEmailNotification(to, subject, body) {
  // Implementation for email notifications
  console.log(`📧 Email notification to ${to}: ${subject}`);
}

function sendPushNotification(message) {
  // Implementation for push notifications
  console.log(`📲 Push notification: ${message}`);
}

function logToAuditSystem(eventType, data) {
  // Implementation for external audit logging
  console.log(`📋 Audit log: ${eventType}`, data);
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'SimplifiAccess Webhook Client'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Webhook client server running on port ${PORT}`);
  console.log(`📡 Webhook endpoint: http://localhost:${PORT}/webhook`);
  console.log(`❤️ Health check: http://localhost:${PORT}/health`);
  console.log(`\n📋 Configuration:`);
  console.log(`   Webhook Secret: ${WEBHOOK_SECRET.substring(0, 8)}...`);
  console.log(`   Port: ${PORT}`);
});

module.exports = app;