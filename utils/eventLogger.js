const Event = require('../database/event');

class EventLogger {
  static async logEvent(req, eventData) {
    try {
      const user = req.user || null;
      const ipAddress = req.ip || req.connection?.remoteAddress || 'unknown';
      
      // Safely get User-Agent header
      let userAgent = 'unknown';
      if (req && typeof req.get === 'function') {
        userAgent = req.get('User-Agent') || 'unknown';
      } else if (req && req.headers && req.headers['user-agent']) {
        userAgent = req.headers['user-agent'];
      }

      const event = {
        ...eventData,
        userId: user ? user.id : null,
        userName: user ? (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email || `User ${user.id}`) : 'System',
        ipAddress,
        userAgent
      };

      const createdEvent = await Event.create(event);
      
      // Broadcast the event to connected SSE clients
      if (global.broadcastEvent) {
        try {
          console.log('📡 EventLogger: Broadcasting event:', createdEvent.id, createdEvent.type, createdEvent.action, createdEvent.entityName);
          global.broadcastEvent(createdEvent);
          console.log('📡 EventLogger: Broadcast completed');
        } catch (broadcastError) {
          console.error('❌ EventLogger: Error broadcasting event:', broadcastError);
        }
      } else {
        console.log('❌ EventLogger: broadcastEvent function not available globally');
      }

      // Trigger webhooks for relevant events
      if (global.triggerWebhook) {
        try {
          await this.triggerWebhookForEvent(createdEvent, req);
        } catch (webhookError) {
          console.error('❌ EventLogger: Error triggering webhook:', webhookError);
          // Don't fail the main operation if webhook fails
        }
      } else {
        console.log('ℹ️ EventLogger: triggerWebhook function not available globally');
      }
    } catch (error) {
      console.error('Error logging event:', error);
      // Don't throw error to avoid breaking the main operation
    }
  }

  // User events
  static async logUserCreated(req, user) {
    await this.logEvent(req, {
      type: 'user',
      action: 'created',
      entityType: 'user',
      entityId: user.id,
      entityName: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email || `User ${user.id}`,
      details: `User account created with role: ${user.role}`
    });
  }

  static async logUserUpdated(req, user, changes = {}) {
    await this.logEvent(req, {
      type: 'user',
      action: 'updated',
      entityType: 'user',
      entityId: user.id,
      entityName: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email || `User ${user.id}`,
      details: `User updated: ${Object.keys(changes).join(', ')}`
    });
  }

  static async logUserDeleted(req, user) {
    await this.logEvent(req, {
      type: 'user',
      action: 'deleted',
      entityType: 'user',
      entityId: user.id,
      entityName: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email || `User ${user.id}`,
      details: 'User account deleted'
    });
  }

  static async logUserLogin(req, user) {
    await this.logEvent(req, {
      type: 'auth',
      action: 'login',
      entityType: 'user',
      entityId: user.id,
      entityName: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email || `User ${user.id}`,
      details: 'User logged in successfully'
    });
  }

  static async logUserLogout(req, user) {
    await this.logEvent(req, {
      type: 'auth',
      action: 'logout',
      entityType: 'user',
      entityId: user.id,
      entityName: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email || `User ${user.id}`,
      details: 'User logged out'
    });
  }

  static async logUserRegistration(req, user) {
    await this.logEvent(req, {
      type: 'auth',
      action: 'registered',
      entityType: 'user',
      entityId: user.id,
      entityName: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email || `User ${user.id}`,
      details: `User registered with email: ${user.email}`
    });
  }

  static async logFailedLogin(req, email, reason) {
    await this.logEvent(req, {
      type: 'auth',
      action: 'login_failed',
      entityType: 'user',
      entityId: null,
      entityName: email,
      details: `Failed login attempt: ${reason}`
    });
  }

  static async logPasswordChange(req, user) {
    await this.logEvent(req, {
      type: 'auth',
      action: 'password_changed',
      entityType: 'user',
      entityId: user.id,
      entityName: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email || `User ${user.id}`,
      details: 'User changed password'
    });
  }

  // Door events
  static async logDoorCreated(req, door) {
    await this.logEvent(req, {
      type: 'door',
      action: 'created',
      entityType: 'door',
      entityId: door.id,
      entityName: door.name,
      details: `Door created: ${door.name} at ${door.location} (IP: ${door.esp32Ip})`
    });
  }

  static async logDoorUpdated(req, door, changes = {}) {
    await this.logEvent(req, {
      type: 'door',
      action: 'updated',
      entityType: 'door',
      entityId: door.id,
      entityName: door.name,
      details: `Door updated: ${Object.keys(changes).join(', ')}`
    });
  }

  static async logDoorDeleted(req, door) {
    await this.logEvent(req, {
      type: 'door',
      action: 'deleted',
      entityType: 'door',
      entityId: door.id,
      entityName: door.name,
      details: `Door deleted: ${door.name} at ${door.location}`
    });
  }

  static async logDoorAccess(req, user, door, granted, reason = '') {
    await this.logEvent(req, {
      type: 'access',
      action: granted ? 'granted' : 'denied',
      entityType: 'door',
      entityId: door.id,
      entityName: door.name,
      details: `Door access ${granted ? 'granted' : 'denied'} for ${user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email || `User ${user.id}`}${reason ? ` - ${reason}` : ''}`
    });
  }

  // Access Group events
  static async logAccessGroupCreated(req, accessGroup) {
    await this.logEvent(req, {
      type: 'access_group',
      action: 'created',
      entityType: 'access_group',
      entityId: accessGroup.id,
      entityName: accessGroup.name,
      details: `Access group created: ${accessGroup.name}`
    });
  }

  static async logAccessGroupUpdated(req, accessGroup, changes = {}) {
    await this.logEvent(req, {
      type: 'access_group',
      action: 'updated',
      entityType: 'access_group',
      entityId: accessGroup.id,
      entityName: accessGroup.name,
      details: `Access group updated: ${Object.keys(changes).join(', ')}`
    });
  }

  static async logAccessGroupDeleted(req, accessGroup) {
    await this.logEvent(req, {
      type: 'access_group',
      action: 'deleted',
      entityType: 'access_group',
      entityId: accessGroup.id,
      entityName: accessGroup.name,
      details: `Access group deleted: ${accessGroup.name}`
    });
  }

  static async logDoorAddedToAccessGroup(req, door, accessGroup) {
    await this.logEvent(req, {
      type: 'access_group',
      action: 'door_added',
      entityType: 'access_group',
      entityId: accessGroup.id,
      entityName: accessGroup.name,
      details: `Door "${door.name}" added to access group "${accessGroup.name}"`
    });
  }

  static async logDoorRemovedFromAccessGroup(req, door, accessGroup) {
    await this.logEvent(req, {
      type: 'access_group',
      action: 'door_removed',
      entityType: 'access_group',
      entityId: accessGroup.id,
      entityName: accessGroup.name,
      details: `Door "${door.name}" removed from access group "${accessGroup.name}"`
    });
  }

  static async logUserAddedToAccessGroup(req, user, accessGroup) {
    const userName = user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email || `User ${user.id}`;
    await this.logEvent(req, {
      type: 'access_group',
      action: 'user_added',
      entityType: 'access_group',
      entityId: accessGroup.id,
      entityName: accessGroup.name,
      details: `User "${userName}" added to access group "${accessGroup.name}"`
    });
  }

  static async logUserRemovedFromAccessGroup(req, user, accessGroup) {
    const userName = user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email || `User ${user.id}`;
    await this.logEvent(req, {
      type: 'access_group',
      action: 'user_removed',
      entityType: 'access_group',
      entityId: accessGroup.id,
      entityName: accessGroup.name,
      details: `User "${userName}" removed from access group "${accessGroup.name}"`
    });
  }

  // System events
  static async logSystemEvent(req, action, details) {
    await this.logEvent(req, {
      type: 'system',
      action,
      entityType: 'system',
      entityId: null,
      entityName: 'System',
      details
    });
  }

  // Error events
  static async logError(req, error, context = '') {
    await this.logEvent(req, {
      type: 'error',
      action: 'occurred',
      entityType: 'system',
      entityId: null,
      entityName: 'System',
      details: `Error: ${error.message}${context ? ` - ${context}` : ''}`
    });
  }

  // Generic log method for custom events
  static async log(req, type, action, entityType, entityId, entityName, details) {
    await this.logEvent(req, {
      type,
      action,
      entityType,
      entityId,
      entityName,
      details
    });
  }

  // Webhook triggering method
  static async triggerWebhookForEvent(event, req) {
    try {
      // Map event types to webhook events
      const webhookEventMap = {
        // Access events
        'access.granted': 'access_request.granted',
        'access.denied': 'access_request.denied',
        'access.status_changed': 'access_request.status_changed',
        
        // Door events
        'door.opened': 'door.opened',
        'door.closed': 'door.closed',
        'door.online': 'door.online',
        'door.offline': 'door.offline',
        'door.controlled': 'door.opened', // Map door controlled to door opened
        
        // User events
        'auth.login': 'user.login',
        'auth.logout': 'user.logout',
        
        // System events
        'system.startup': 'system.startup',
        'system.shutdown': 'system.shutdown',
        'error.occurred': 'system.error'
      };

      const webhookEvent = webhookEventMap[`${event.type}.${event.action}`];
      
      if (!webhookEvent) {
        // No webhook event mapped for this event type
        return;
      }

      console.log(`🔗 EventLogger: Triggering webhook for event: ${webhookEvent}`);

      // Prepare webhook payload based on event type
      let webhookPayload = {
        event: webhookEvent,
        timestamp: event.createdAt,
        data: {
          eventId: event.id,
          type: event.type,
          action: event.action,
          entityType: event.entityType,
          entityId: event.entityId,
          entityName: event.entityName,
          details: event.details,
          userId: event.userId,
          userName: event.userName,
          ipAddress: event.ipAddress
        }
      };

      // Add specific data based on event type
      if (event.type === 'access') {
        // For access events, we need to get additional data
        try {
          const AccessRequest = require('../database/accessRequest');
          const accessRequest = await AccessRequest.findById(event.entityId);
          
          if (accessRequest) {
            webhookPayload.data.requestId = accessRequest.id;
            webhookPayload.data.requestType = accessRequest.requestType;
            webhookPayload.data.status = accessRequest.status;
            webhookPayload.data.reason = accessRequest.reason;
            webhookPayload.data.user = {
              id: accessRequest.userId,
              email: accessRequest.user?.email,
              firstName: accessRequest.user?.firstName,
              lastName: accessRequest.user?.lastName
            };
            webhookPayload.data.door = {
              id: accessRequest.doorId,
              name: accessRequest.door?.name,
              location: accessRequest.door?.location
            };
          }
        } catch (error) {
          console.error('Error getting access request data for webhook:', error);
        }
      } else if (event.type === 'door') {
        // For door events, add door-specific data
        try {
          const { Door } = require('../database/door');
          const door = await Door.findById(event.entityId);
          
          if (door) {
            webhookPayload.data.doorId = door.id;
            webhookPayload.data.doorName = door.name;
            webhookPayload.data.location = door.location;
            webhookPayload.data.esp32Ip = door.esp32Ip;
            webhookPayload.data.isOnline = door.isOnline;
          }
        } catch (error) {
          console.error('Error getting door data for webhook:', error);
        }
      } else if (event.type === 'auth') {
        // For auth events, add user-specific data
        webhookPayload.data.user = {
          id: event.userId,
          email: event.userName,
          ipAddress: event.ipAddress
        };
      }

      // Trigger the webhook
      await global.triggerWebhook(webhookEvent, webhookPayload.data);
      
      console.log(`✅ EventLogger: Webhook triggered successfully for event: ${webhookEvent}`);

    } catch (error) {
      console.error('❌ EventLogger: Error in triggerWebhookForEvent:', error);
      // Don't throw error to avoid breaking the main operation
    }
  }
}

module.exports = EventLogger;
