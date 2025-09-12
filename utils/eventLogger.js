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
        userName: user ? `${user.firstName} ${user.lastName}` : 'System',
        ipAddress,
        userAgent
      };

      await Event.create(event);
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
      entityName: `${user.firstName} ${user.lastName}`,
      details: `User account created with role: ${user.role}`
    });
  }

  static async logUserUpdated(req, user, changes = {}) {
    await this.logEvent(req, {
      type: 'user',
      action: 'updated',
      entityType: 'user',
      entityId: user.id,
      entityName: `${user.firstName} ${user.lastName}`,
      details: `User updated: ${Object.keys(changes).join(', ')}`
    });
  }

  static async logUserDeleted(req, user) {
    await this.logEvent(req, {
      type: 'user',
      action: 'deleted',
      entityType: 'user',
      entityId: user.id,
      entityName: `${user.firstName} ${user.lastName}`,
      details: 'User account deleted'
    });
  }

  static async logUserLogin(req, user) {
    await this.logEvent(req, {
      type: 'auth',
      action: 'login',
      entityType: 'user',
      entityId: user.id,
      entityName: `${user.firstName} ${user.lastName}`,
      details: 'User logged in successfully'
    });
  }

  static async logUserLogout(req, user) {
    await this.logEvent(req, {
      type: 'auth',
      action: 'logout',
      entityType: 'user',
      entityId: user.id,
      entityName: `${user.firstName} ${user.lastName}`,
      details: 'User logged out'
    });
  }

  static async logUserRegistration(req, user) {
    await this.logEvent(req, {
      type: 'auth',
      action: 'registered',
      entityType: 'user',
      entityId: user.id,
      entityName: `${user.firstName} ${user.lastName}`,
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
      entityName: `${user.firstName} ${user.lastName}`,
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
      details: `Door access ${granted ? 'granted' : 'denied'} for ${user.firstName} ${user.lastName}${reason ? ` - ${reason}` : ''}`
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
    await this.logEvent(req, {
      type: 'access_group',
      action: 'user_added',
      entityType: 'access_group',
      entityId: accessGroup.id,
      entityName: accessGroup.name,
      details: `User "${user.firstName} ${user.lastName}" added to access group "${accessGroup.name}"`
    });
  }

  static async logUserRemovedFromAccessGroup(req, user, accessGroup) {
    await this.logEvent(req, {
      type: 'access_group',
      action: 'user_removed',
      entityType: 'access_group',
      entityId: accessGroup.id,
      entityName: accessGroup.name,
      details: `User "${user.firstName} ${user.lastName}" removed from access group "${accessGroup.name}"`
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
}

module.exports = EventLogger;
