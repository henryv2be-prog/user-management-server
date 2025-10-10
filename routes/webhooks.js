const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const { authenticate, requireAdmin } = require('../middleware/auth');
const EventLogger = require('../utils/eventLogger');

const router = express.Router();

// Webhook configuration storage (in production, use database)
const webhookConfigs = new Map();

// Webhook delivery queue for retry logic
const deliveryQueue = new Map();

// Duplicate prevention for webhook deliveries
const processedWebhookEvents = new Set();

// Webhook event types
const WEBHOOK_EVENTS = {
  ACCESS_REQUEST_CREATED: 'access_request.created',
  ACCESS_REQUEST_GRANTED: 'access_request.granted',
  ACCESS_REQUEST_DENIED: 'access_request.denied',
  ACCESS_REQUEST_EXPIRED: 'access_request.expired',
  ACCESS_REQUEST_STATUS_CHANGED: 'access_request.status_changed',
  DOOR_OPENED: 'door.opened',
  DOOR_CLOSED: 'door.closed',
  DOOR_OFFLINE: 'door.offline',
  DOOR_ONLINE: 'door.online',
  USER_LOGIN: 'user.login',
  USER_LOGOUT: 'user.logout',
  SYSTEM_ERROR: 'system.error',
  SYSTEM_STARTUP: 'system.startup',
  SYSTEM_SHUTDOWN: 'system.shutdown',
  // ESP32 Command events
  ESP32_COMMAND_SENT: 'esp32.command_sent',
  ESP32_COMMAND_RECEIVED: 'esp32.command_received',
  ESP32_COMMAND_EXECUTED: 'esp32.command_executed'
};

// Webhook configuration model
class WebhookConfig {
  constructor(data) {
    this.id = data.id || uuidv4();
    this.name = data.name;
    this.url = data.url;
    this.events = data.events || [];
    this.secret = data.secret || crypto.randomBytes(32).toString('hex');
    this.active = data.active !== false;
    this.retryAttempts = data.retryAttempts || 3;
    this.timeout = data.timeout || 5000;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      url: this.url,
      events: this.events,
      active: this.active,
      retryAttempts: this.retryAttempts,
      timeout: this.timeout,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
      // Note: secret is not included in JSON for security
    };
  }
}

// Webhook delivery result
class WebhookDelivery {
  constructor(config, event, payload) {
    this.id = uuidv4();
    this.webhookId = config.id;
    this.event = event;
    this.payload = payload;
    this.attempts = 0;
    this.maxAttempts = config.retryAttempts;
    this.status = 'pending';
    this.response = null;
    this.error = null;
    this.createdAt = new Date().toISOString();
    this.lastAttemptAt = null;
    this.nextRetryAt = null;
  }

  toJSON() {
    return {
      id: this.id,
      webhookId: this.webhookId,
      event: this.event,
      attempts: this.attempts,
      maxAttempts: this.maxAttempts,
      status: this.status,
      response: this.response,
      error: this.error,
      createdAt: this.createdAt,
      lastAttemptAt: this.lastAttemptAt,
      nextRetryAt: this.nextRetryAt
    };
  }
}

// Generate webhook signature for verification
function generateSignature(payload, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');
}

// Validate webhook signature
function validateSignature(payload, signature, secret) {
  const expectedSignature = generateSignature(payload, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

// Send webhook delivery
async function sendWebhookDelivery(delivery, config) {
  try {
    delivery.attempts++;
    delivery.lastAttemptAt = new Date().toISOString();

    // Create Slack-compatible payload
    let payload;
    if (delivery.event === 'webhook.test') {
      payload = {
        text: `🧪 Test webhook from SimplifiAccess`,
        attachments: [{
          color: 'good',
          fields: [{
            title: 'Test Type',
            value: delivery.payload.testType || 'admin_panel_test',
            short: true
          }, {
            title: 'Timestamp',
            value: new Date().toLocaleString(),
            short: true
          }]
        }]
      };
    } else if (delivery.event.startsWith('access_request.')) {
      const isGranted = delivery.event === 'access_request.granted';
      payload = {
        text: `${isGranted ? '🔓' : '🔒'} Access ${isGranted ? 'Granted' : 'Denied'}`,
        attachments: [{
          color: isGranted ? 'good' : 'danger',
          fields: [{
            title: 'User',
            value: delivery.payload.userName || 'Unknown',
            short: true
          }, {
            title: 'Door',
            value: delivery.payload.entityName || 'Unknown',
            short: true
          }, {
            title: 'Time',
            value: new Date().toLocaleString(),
            short: true
          }]
        }]
      };
    } else if (delivery.event.startsWith('door.')) {
      const isOnline = delivery.event === 'door.online';
      payload = {
        text: `${isOnline ? '🟢' : '🔴'} Door ${isOnline ? 'Online' : 'Offline'}`,
        attachments: [{
          color: isOnline ? 'good' : 'warning',
          fields: [{
            title: 'Door',
            value: delivery.payload.entityName || 'Unknown',
            short: true
          }, {
            title: 'Status',
            value: isOnline ? 'Online' : 'Offline',
            short: true
          }, {
            title: 'Time',
            value: new Date().toLocaleString(),
            short: true
          }]
        }]
      };
    } else {
      // Default payload for other events
      payload = {
        text: `📢 ${delivery.event.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
        attachments: [{
          color: 'good',
          fields: [{
            title: 'Event',
            value: delivery.event,
            short: true
          }, {
            title: 'Time',
            value: new Date().toLocaleString(),
            short: true
          }]
        }]
      };
    }

    const payloadString = JSON.stringify(payload);
    const signature = generateSignature(payloadString, config.secret);

    console.log(`📤 Sending webhook to ${config.url}:`, payload);
    console.log(`📤 Headers:`, {
      'Content-Type': 'application/json',
      'X-Webhook-Signature': `sha256=${signature}`,
      'X-Webhook-Event': delivery.event,
      'X-Webhook-Delivery': delivery.id,
      'User-Agent': 'SimplifiAccess-Webhook/1.0'
    });

    const response = await axios.post(config.url, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': `sha256=${signature}`,
        'X-Webhook-Event': delivery.event,
        'X-Webhook-Delivery': delivery.id,
        'User-Agent': 'SimplifiAccess-Webhook/1.0'
      },
      timeout: config.timeout,
      validateStatus: (status) => status >= 200 && status < 300
    });

    delivery.status = 'delivered';
    delivery.response = {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    };

    console.log(`✅ Webhook delivered successfully: ${config.name} (${delivery.event})`);
    
    // Don't log webhook delivery as an event to prevent duplicates
    // await EventLogger.log(
    //   { ip: '127.0.0.1', headers: { 'user-agent': 'SimplifiAccess-Webhook' } },
    //   'webhook',
    //   'delivered',
    //   'WebhookDelivery',
    //   delivery.id,
    //   `Webhook delivered successfully to ${config.name}`,
    //   `Event: ${delivery.event}, Attempts: ${delivery.attempts}`
    // );

    return true;

  } catch (error) {
    console.error(`❌ Webhook delivery failed: ${config.name} (${delivery.event})`, error.message);
    console.error(`❌ Error response:`, error.response?.data);
    console.error(`❌ Error status:`, error.response?.status);
    
    delivery.error = {
      message: error.message,
      code: error.code,
      status: error.response?.status
    };

    // Determine if we should retry
    if (delivery.attempts < delivery.maxAttempts) {
      delivery.status = 'retrying';
      // Exponential backoff: 1s, 2s, 4s, 8s...
      const delay = Math.pow(2, delivery.attempts - 1) * 1000;
      delivery.nextRetryAt = new Date(Date.now() + delay).toISOString();
      
      console.log(`🔄 Webhook will retry in ${delay}ms: ${config.name}`);
      
      // Schedule retry
      setTimeout(() => {
        processWebhookDelivery(delivery);
      }, delay);
    } else {
      delivery.status = 'failed';
      console.error(`💀 Webhook delivery permanently failed: ${config.name}`);
      
      // Log failed delivery
      await EventLogger.log(
        { ip: '127.0.0.1', headers: { 'user-agent': 'SimplifiAccess-Webhook' } },
        'webhook',
        'failed',
        'WebhookDelivery',
        delivery.id,
        `Webhook delivery permanently failed to ${config.name}`,
        `Event: ${delivery.event}, Error: ${error.message}`
      );
    }

    return false;
  }
}

// Process webhook delivery (with retry logic)
async function processWebhookDelivery(delivery) {
  const config = webhookConfigs.get(delivery.webhookId);
  if (!config || !config.active) {
    console.log(`⚠️ Webhook config not found or inactive: ${delivery.webhookId}`);
    return;
  }

  await sendWebhookDelivery(delivery, config);
}

// Trigger webhook for an event
async function triggerWebhook(event, payload) {
  console.log(`📡 Triggering webhook for event: ${event}`);
  
  // Create a unique key for duplicate prevention
  const eventKey = `${event}-${payload.eventId || payload.id || Date.now()}`;
  
  // Check for duplicates
  if (processedWebhookEvents.has(eventKey)) {
    console.log(`📡 Skipping duplicate webhook event: ${eventKey}`);
    return;
  }
  
  // Mark as processed
  processedWebhookEvents.add(eventKey);
  
  // Clean up old processed events (keep only last 1000)
  if (processedWebhookEvents.size > 1000) {
    const eventsArray = Array.from(processedWebhookEvents);
    const toRemove = eventsArray.slice(0, eventsArray.length - 1000);
    toRemove.forEach(key => processedWebhookEvents.delete(key));
  }
  
  const activeWebhooks = Array.from(webhookConfigs.values())
    .filter(config => config.active && config.events.includes(event));

  if (activeWebhooks.length === 0) {
    console.log(`ℹ️ No active webhooks configured for event: ${event}`);
    return;
  }

  console.log(`📡 Found ${activeWebhooks.length} active webhooks for event: ${event}`);

  for (const config of activeWebhooks) {
    const delivery = new WebhookDelivery(config, event, payload);
    deliveryQueue.set(delivery.id, delivery);
    
    // Process immediately
    processWebhookDelivery(delivery);
  }
}

// Global webhook trigger function (to be used throughout the app)
global.triggerWebhook = triggerWebhook;

// Webhook management routes

// Create webhook configuration
router.post('/', authenticate, requireAdmin, [
  body('name').notEmpty().withMessage('Name is required'),
  body('url').isURL().withMessage('Valid URL is required'),
  body('events').isArray().withMessage('Events must be an array'),
  body('events.*').custom((value) => {
    const validEvents = Object.values(WEBHOOK_EVENTS);
    if (!validEvents.includes(value)) {
      throw new Error(`Invalid event type: ${value}. Valid events are: ${validEvents.join(', ')}`);
    }
    return true;
  })
], async (req, res) => {
  try {
    console.log('Create webhook request body:', req.body);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({
        error: 'Validation Error',
        errors: errors.array()
      });
    }

    const { name, url, events, retryAttempts, timeout } = req.body;

    // Check if webhook with same URL already exists
    const existingWebhook = Array.from(webhookConfigs.values())
      .find(config => config.url === url);
    
    if (existingWebhook) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'Webhook with this URL already exists'
      });
    }

    const config = new WebhookConfig({
      name,
      url,
      events,
      retryAttempts,
      timeout
    });

    webhookConfigs.set(config.id, config);

    // Log webhook creation (don't let this fail the webhook creation)
    try {
      await EventLogger.log(req, 'webhook', 'created', 'WebhookConfig', config.id, `Webhook created: ${config.name}`, `URL: ${config.url}`);
    } catch (logError) {
      console.warn('Failed to log webhook creation:', logError);
    }

    res.status(201).json({
      success: true,
      message: 'Webhook created successfully',
      webhook: config.toJSON()
    });

  } catch (error) {
    console.error('Create webhook error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create webhook',
      details: error.message
    });
  }
});

// Get all webhook configurations
router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const webhooks = Array.from(webhookConfigs.values()).map(config => config.toJSON());
    
    res.json({
      success: true,
      webhooks
    });
  } catch (error) {
    console.error('Get webhooks error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve webhooks'
    });
  }
});

// Get webhook configuration by ID
router.get('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const config = webhookConfigs.get(req.params.id);
    
    if (!config) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Webhook not found'
      });
    }

    res.json({
      success: true,
      webhook: config.toJSON()
    });
  } catch (error) {
    console.error('Get webhook error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve webhook'
    });
  }
});

// Update webhook configuration
router.put('/:id', authenticate, requireAdmin, [
  body('name').optional().notEmpty().withMessage('Name cannot be empty'),
  body('url').optional().isURL().withMessage('Valid URL is required'),
  body('events').optional().isArray().withMessage('Events must be an array'),
  body('events.*').optional().isIn(Object.values(WEBHOOK_EVENTS)).withMessage('Invalid event type')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        errors: errors.array()
      });
    }

    const config = webhookConfigs.get(req.params.id);
    
    if (!config) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Webhook not found'
      });
    }

    const { name, url, events, active, retryAttempts, timeout } = req.body;

    // Update configuration
    if (name !== undefined) config.name = name;
    if (url !== undefined) config.url = url;
    if (events !== undefined) config.events = events;
    if (active !== undefined) config.active = active;
    if (retryAttempts !== undefined) config.retryAttempts = retryAttempts;
    if (timeout !== undefined) config.timeout = timeout;
    
    config.updatedAt = new Date().toISOString();

    // Log webhook update
    await EventLogger.log(req, 'webhook', 'updated', 'WebhookConfig', config.id, `Webhook updated: ${config.name}`, `URL: ${config.url}`);

    res.json({
      success: true,
      message: 'Webhook updated successfully',
      webhook: config.toJSON()
    });

  } catch (error) {
    console.error('Update webhook error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update webhook'
    });
  }
});

// Delete webhook configuration
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const config = webhookConfigs.get(req.params.id);
    
    if (!config) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Webhook not found'
      });
    }

    webhookConfigs.delete(req.params.id);

    // Log webhook deletion
    await EventLogger.log(req, 'webhook', 'deleted', 'WebhookConfig', config.id, `Webhook deleted: ${config.name}`, `URL: ${config.url}`);

    res.json({
      success: true,
      message: 'Webhook deleted successfully'
    });

  } catch (error) {
    console.error('Delete webhook error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete webhook'
    });
  }
});

// Test webhook (send test event)
router.post('/:id/test', authenticate, requireAdmin, async (req, res) => {
  try {
    const config = webhookConfigs.get(req.params.id);
    
    if (!config) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Webhook not found'
      });
    }

    const testPayload = {
      event: 'webhook.test',
      timestamp: new Date().toISOString(),
      data: {
        message: 'This is a test webhook from SimplifiAccess',
        webhookId: config.id,
        webhookName: config.name
      }
    };

    const delivery = new WebhookDelivery(config, 'webhook.test', testPayload);
    deliveryQueue.set(delivery.id, delivery);

    // Process test delivery
    await processWebhookDelivery(delivery);

    res.json({
      success: true,
      message: 'Test webhook sent',
      delivery: delivery.toJSON()
    });

  } catch (error) {
    console.error('Test webhook error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to send test webhook'
    });
  }
});

// Get webhook delivery history
router.get('/:id/deliveries', authenticate, requireAdmin, async (req, res) => {
  try {
    const config = webhookConfigs.get(req.params.id);
    
    if (!config) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Webhook not found'
      });
    }

    const deliveries = Array.from(deliveryQueue.values())
      .filter(delivery => delivery.webhookId === req.params.id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 100); // Limit to last 100 deliveries

    res.json({
      success: true,
      deliveries: deliveries.map(delivery => delivery.toJSON())
    });

  } catch (error) {
    console.error('Get webhook deliveries error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve webhook deliveries'
    });
  }
});

// Get available webhook events
router.get('/events/available', authenticate, requireAdmin, async (req, res) => {
  try {
    res.json({
      success: true,
      events: Object.entries(WEBHOOK_EVENTS).map(([key, value]) => ({
        key,
        value,
        description: getEventDescription(value)
      }))
    });
  } catch (error) {
    console.error('Get available events error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve available events'
    });
  }
});

// ESP32 Webhook Command endpoint (for sending commands to ESP32 via webhook)
router.post('/esp32/command', authenticate, requireAdmin, [
  body('doorId').isInt({ min: 1 }).withMessage('Door ID is required and must be a positive integer'),
  body('command').isString().notEmpty().withMessage('Command is required'),
  body('webhookUrl').optional().isURL().withMessage('Webhook URL must be a valid URL')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        errors: errors.array()
      });
    }

    const { doorId, command, webhookUrl } = req.body;
    
    // Get door information
    const { Door } = require('../database/door');
    const door = await Door.findById(doorId);
    
    if (!door) {
      return res.status(404).json({
        error: 'Door Not Found',
        message: 'The specified door does not exist'
      });
    }

    // Create webhook payload for ESP32 command
    const webhookPayload = {
      event: 'esp32.command_sent',
      timestamp: new Date().toISOString(),
      data: {
        doorId: door.id,
        doorName: door.name,
        doorIp: door.esp32Ip,
        doorMac: door.esp32Mac,
        command: command,
        commandId: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sentBy: {
          userId: req.user.id,
          userName: req.user.firstName && req.user.lastName ? 
            `${req.user.firstName} ${req.user.lastName}` : req.user.email
        },
        webhookUrl: webhookUrl || null
      }
    };

    // If webhook URL is provided, send command directly to ESP32
    if (webhookUrl) {
      try {
        const axios = require('axios');
        const response = await axios.post(webhookUrl, webhookPayload, {
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'SimplifiAccess-ESP32-Command/1.0'
          },
          timeout: 5000
        });

        console.log(`✅ ESP32 command sent via webhook to ${webhookUrl}:`, command);
        
        // Log the command
        const EventLogger = require('../utils/eventLogger');
        await EventLogger.log(req, 'esp32', 'command_sent', 'Door', door.id, door.name, 
          `Command '${command}' sent to ESP32 via webhook`);

        res.json({
          success: true,
          message: 'ESP32 command sent successfully via webhook',
          command: command,
          door: door.toJSON(),
          webhookResponse: {
            status: response.status,
            statusText: response.statusText
          }
        });

      } catch (webhookError) {
        console.error('❌ Error sending ESP32 command via webhook:', webhookError.message);
        
        res.status(500).json({
          error: 'Webhook Delivery Failed',
          message: 'Failed to send command to ESP32 via webhook',
          details: webhookError.message
        });
      }
    } else {
      // Store command in database for ESP32 to poll (existing method)
      try {
        const pool = require('../database/pool');
        const db = await pool.getConnection();
        
        try {
          // Ensure door_commands table exists
          await new Promise((resolve, reject) => {
            db.run(`CREATE TABLE IF NOT EXISTS door_commands (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              door_id INTEGER NOT NULL,
              command TEXT NOT NULL,
              status TEXT DEFAULT 'pending',
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              executed_at DATETIME,
              FOREIGN KEY (door_id) REFERENCES doors (id)
            )`, (err) => {
              if (err) reject(err);
              else resolve();
            });
          });
          
          // Insert command
          await new Promise((resolve, reject) => {
            db.run('INSERT INTO door_commands (door_id, command) VALUES (?, ?)', 
                   [door.id, command], (err) => {
              if (err) reject(err);
              else resolve();
            });
          });
          
          console.log(`✅ ESP32 command queued for polling: ${command}`);
          
          // Log the command
          const EventLogger = require('../utils/eventLogger');
          await EventLogger.log(req, 'esp32', 'command_queued', 'Door', door.id, door.name, 
            `Command '${command}' queued for ESP32 polling`);

          res.json({
            success: true,
            message: 'ESP32 command queued successfully for polling',
            command: command,
            door: door.toJSON()
          });
          
        } finally {
          pool.releaseConnection(db);
        }
        
      } catch (dbError) {
        console.error('❌ Error queuing ESP32 command:', dbError.message);
        
        res.status(500).json({
          error: 'Command Queue Failed',
          message: 'Failed to queue command for ESP32',
          details: dbError.message
        });
      }
    }

  } catch (error) {
    console.error('ESP32 webhook command error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to process ESP32 command'
    });
  }
});

// Helper function to get event descriptions
function getEventDescription(event) {
  const descriptions = {
    [WEBHOOK_EVENTS.ACCESS_REQUEST_CREATED]: 'Triggered when a new access request is created',
    [WEBHOOK_EVENTS.ACCESS_REQUEST_GRANTED]: 'Triggered when an access request is granted',
    [WEBHOOK_EVENTS.ACCESS_REQUEST_DENIED]: 'Triggered when an access request is denied',
    [WEBHOOK_EVENTS.ACCESS_REQUEST_EXPIRED]: 'Triggered when an access request expires',
    [WEBHOOK_EVENTS.ACCESS_REQUEST_STATUS_CHANGED]: 'Triggered when an access request status changes',
    [WEBHOOK_EVENTS.DOOR_OPENED]: 'Triggered when a door is opened',
    [WEBHOOK_EVENTS.DOOR_CLOSED]: 'Triggered when a door is closed',
    [WEBHOOK_EVENTS.DOOR_OFFLINE]: 'Triggered when a door goes offline',
    [WEBHOOK_EVENTS.DOOR_ONLINE]: 'Triggered when a door comes online',
    [WEBHOOK_EVENTS.USER_LOGIN]: 'Triggered when a user logs in',
    [WEBHOOK_EVENTS.USER_LOGOUT]: 'Triggered when a user logs out',
    [WEBHOOK_EVENTS.SYSTEM_ERROR]: 'Triggered when a system error occurs',
    [WEBHOOK_EVENTS.SYSTEM_STARTUP]: 'Triggered when the system starts up',
    [WEBHOOK_EVENTS.SYSTEM_SHUTDOWN]: 'Triggered when the system shuts down',
    [WEBHOOK_EVENTS.ESP32_COMMAND_SENT]: 'Triggered when a command is sent to an ESP32 device',
    [WEBHOOK_EVENTS.ESP32_COMMAND_RECEIVED]: 'Triggered when an ESP32 device receives a command',
    [WEBHOOK_EVENTS.ESP32_COMMAND_EXECUTED]: 'Triggered when an ESP32 device executes a command'
  };
  
  return descriptions[event] || 'No description available';
}

module.exports = router;