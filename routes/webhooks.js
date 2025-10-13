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

// Webhook event types
const WEBHOOK_EVENTS = {
  // Special: subscribe to ALL events
  EVENTS_ALL: 'events.all',

  // Access request lifecycle
  ACCESS_REQUEST_CREATED: 'access_request.created',
  ACCESS_REQUEST_GRANTED: 'access_request.granted',
  ACCESS_REQUEST_DENIED: 'access_request.denied',
  ACCESS_REQUEST_EXPIRED: 'access_request.expired',
  ACCESS_REQUEST_STATUS_CHANGED: 'access_request.status_changed',
  ACCESS_REQUEST_DELETED: 'access_request.deleted',

  // Door events
  DOOR_OPENED: 'door.opened',
  DOOR_CLOSED: 'door.closed',
  DOOR_OFFLINE: 'door.offline',
  DOOR_ONLINE: 'door.online',
  DOOR_CONTROLLED: 'door.controlled',
  DOOR_TAG_ASSOCIATED: 'door.tag_associated',
  DOOR_TAG_REMOVED: 'door.tag_removed',
  DOOR_AUTO_REGISTERED: 'door.auto_registered',

  // User/auth events
  USER_LOGIN: 'user.login',
  USER_LOGOUT: 'user.logout',

  // Visitor events
  VISITOR_CREATED: 'visitor.created',
  VISITOR_UPDATED: 'visitor.updated',
  VISITOR_DELETED: 'visitor.deleted',

  // Access group events
  ACCESS_GROUP_CREATED: 'access_group.created',
  ACCESS_GROUP_UPDATED: 'access_group.updated',
  ACCESS_GROUP_DELETED: 'access_group.deleted',
  ACCESS_GROUP_USER_ADDED: 'access_group.user_added',
  ACCESS_GROUP_USER_REMOVED: 'access_group.user_removed',
  ACCESS_GROUP_DOOR_ADDED: 'access_group.door_added',
  ACCESS_GROUP_DOOR_REMOVED: 'access_group.door_removed',

  // Site plan / configuration
  SITE_PLAN_UPDATED: 'site_plan.updated',

  // Webhook system itself
  WEBHOOK_CREATED: 'webhook.created',
  WEBHOOK_UPDATED: 'webhook.updated',
  WEBHOOK_DELETED: 'webhook.deleted',

  // System/runtime
  SYSTEM_ERROR: 'system.error',
  SYSTEM_STARTUP: 'system.startup',
  SYSTEM_SHUTDOWN: 'system.shutdown'
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

    // Structured payload by default
    const structuredPayload = typeof delivery.payload === 'object' && delivery.payload.event
      ? delivery.payload
      : {
          event: delivery.event,
          timestamp: new Date().toISOString(),
          data: delivery.payload || {}
        };

    const payloadString = JSON.stringify(structuredPayload);
    const signature = generateSignature(payloadString, config.secret);

    console.log(`📤 Sending webhook to ${config.url}:`, structuredPayload);
    console.log(`📤 Headers:`, {
      'Content-Type': 'application/json',
      'X-Webhook-Signature': `sha256=${signature}`,
      'X-Webhook-Event': delivery.event,
      'X-Webhook-Delivery': delivery.id,
      'User-Agent': 'SimplifiAccess-Webhook/1.0'
    });

    const response = await axios.post(config.url, structuredPayload, {
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
    
    // Build comprehensive error details
    const errorMessage = error.response?.status 
      ? `Request failed with status code ${error.response.status}`
      : error.message;
    
    delivery.error = {
      message: errorMessage,
      code: error.code,
      status: error.response?.status,
      responseData: error.response?.data
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
      console.error(`💀 Event: ${delivery.event}, Error: ${errorMessage}`);
      
      // Log failed delivery with comprehensive details
      await EventLogger.log(
        { ip: '127.0.0.1', headers: { 'user-agent': 'SimplifiAccess-Webhook' } },
        'webhook',
        'failed',
        'WebhookDelivery',
        delivery.id,
        `Webhook delivery permanently failed to ${config.name}`,
        `Event: ${delivery.event}, Error: ${errorMessage}`
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
  
  const activeWebhooks = Array.from(webhookConfigs.values())
    .filter(config => config.active && (config.events.includes(event) || config.events.includes(WEBHOOK_EVENTS.EVENTS_ALL)));

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

// Helper function to get event descriptions
function getEventDescription(event) {
  const descriptions = {
    [WEBHOOK_EVENTS.EVENTS_ALL]: 'Receive all events (catch-all subscription)',
    [WEBHOOK_EVENTS.ACCESS_REQUEST_CREATED]: 'Triggered when a new access request is created',
    [WEBHOOK_EVENTS.ACCESS_REQUEST_GRANTED]: 'Triggered when an access request is granted',
    [WEBHOOK_EVENTS.ACCESS_REQUEST_DENIED]: 'Triggered when an access request is denied',
    [WEBHOOK_EVENTS.ACCESS_REQUEST_EXPIRED]: 'Triggered when an access request expires',
    [WEBHOOK_EVENTS.ACCESS_REQUEST_STATUS_CHANGED]: 'Triggered when an access request status changes',
    [WEBHOOK_EVENTS.ACCESS_REQUEST_DELETED]: 'Triggered when an access request is deleted',
    [WEBHOOK_EVENTS.DOOR_OPENED]: 'Triggered when a door is opened',
    [WEBHOOK_EVENTS.DOOR_CLOSED]: 'Triggered when a door is closed',
    [WEBHOOK_EVENTS.DOOR_OFFLINE]: 'Triggered when a door goes offline',
    [WEBHOOK_EVENTS.DOOR_ONLINE]: 'Triggered when a door comes online',
    [WEBHOOK_EVENTS.DOOR_CONTROLLED]: 'Triggered when a door control command is sent',
    [WEBHOOK_EVENTS.DOOR_TAG_ASSOCIATED]: 'Triggered when a tag is associated with a door',
    [WEBHOOK_EVENTS.DOOR_TAG_REMOVED]: 'Triggered when a tag is removed from a door',
    [WEBHOOK_EVENTS.DOOR_AUTO_REGISTERED]: 'Triggered when a door is auto-registered from discovery',
    [WEBHOOK_EVENTS.USER_LOGIN]: 'Triggered when a user logs in',
    [WEBHOOK_EVENTS.USER_LOGOUT]: 'Triggered when a user logs out',
    [WEBHOOK_EVENTS.VISITOR_CREATED]: 'Triggered when a visitor is created',
    [WEBHOOK_EVENTS.VISITOR_UPDATED]: 'Triggered when a visitor is updated',
    [WEBHOOK_EVENTS.VISITOR_DELETED]: 'Triggered when a visitor is deleted',
    [WEBHOOK_EVENTS.ACCESS_GROUP_CREATED]: 'Triggered when an access group is created',
    [WEBHOOK_EVENTS.ACCESS_GROUP_UPDATED]: 'Triggered when an access group is updated',
    [WEBHOOK_EVENTS.ACCESS_GROUP_DELETED]: 'Triggered when an access group is deleted',
    [WEBHOOK_EVENTS.ACCESS_GROUP_USER_ADDED]: 'Triggered when a user is added to an access group',
    [WEBHOOK_EVENTS.ACCESS_GROUP_USER_REMOVED]: 'Triggered when a user is removed from an access group',
    [WEBHOOK_EVENTS.ACCESS_GROUP_DOOR_ADDED]: 'Triggered when a door is added to an access group',
    [WEBHOOK_EVENTS.ACCESS_GROUP_DOOR_REMOVED]: 'Triggered when a door is removed from an access group',
    [WEBHOOK_EVENTS.SITE_PLAN_UPDATED]: 'Triggered when the site plan is updated',
    [WEBHOOK_EVENTS.WEBHOOK_CREATED]: 'Triggered when a webhook configuration is created',
    [WEBHOOK_EVENTS.WEBHOOK_UPDATED]: 'Triggered when a webhook configuration is updated',
    [WEBHOOK_EVENTS.WEBHOOK_DELETED]: 'Triggered when a webhook configuration is deleted',
    [WEBHOOK_EVENTS.SYSTEM_ERROR]: 'Triggered when a system error occurs',
    [WEBHOOK_EVENTS.SYSTEM_STARTUP]: 'Triggered when the system starts up',
    [WEBHOOK_EVENTS.SYSTEM_SHUTDOWN]: 'Triggered when the system shuts down'
  };
  
  return descriptions[event] || 'No description available';
}

module.exports = router;