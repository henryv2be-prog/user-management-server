// Webhook integration for access requests
// This file shows how to integrate webhooks into your existing access request flow

const { triggerWebhook } = require('./webhooks');

// Example integration in accessRequests.js
// Add this to your access request creation logic:

async function createAccessRequestWithWebhooks(requestData, req) {
  try {
    // Create the access request (existing logic)
    const accessRequest = await AccessRequest.create(requestData);

    // Determine webhook event based on status
    let webhookEvent;
    let webhookPayload;

    if (requestData.status === 'granted') {
      webhookEvent = 'access_request.granted';
      webhookPayload = {
        event: webhookEvent,
        timestamp: new Date().toISOString(),
        data: {
          requestId: accessRequest.id,
          userId: accessRequest.userId,
          doorId: accessRequest.doorId,
          requestType: accessRequest.requestType,
          status: accessRequest.status,
          reason: accessRequest.reason,
          user: {
            id: req.user.id,
            email: req.user.email,
            firstName: req.user.firstName,
            lastName: req.user.lastName
          },
          door: {
            id: accessRequest.doorId,
            name: accessRequest.door?.name,
            location: accessRequest.door?.location
          }
        }
      };
    } else if (requestData.status === 'denied') {
      webhookEvent = 'access_request.denied';
      webhookPayload = {
        event: webhookEvent,
        timestamp: new Date().toISOString(),
        data: {
          requestId: accessRequest.id,
          userId: accessRequest.userId,
          doorId: accessRequest.doorId,
          requestType: accessRequest.requestType,
          status: accessRequest.status,
          reason: accessRequest.reason,
          user: {
            id: req.user.id,
            email: req.user.email,
            firstName: req.user.firstName,
            lastName: req.user.lastName
          },
          door: {
            id: accessRequest.doorId,
            name: accessRequest.door?.name,
            location: accessRequest.door?.location
          }
        }
      };
    } else {
      webhookEvent = 'access_request.created';
      webhookPayload = {
        event: webhookEvent,
        timestamp: new Date().toISOString(),
        data: {
          requestId: accessRequest.id,
          userId: accessRequest.userId,
          doorId: accessRequest.doorId,
          requestType: accessRequest.requestType,
          status: accessRequest.status,
          user: {
            id: req.user.id,
            email: req.user.email,
            firstName: req.user.firstName,
            lastName: req.user.lastName
          },
          door: {
            id: accessRequest.doorId,
            name: accessRequest.door?.name,
            location: accessRequest.door?.location
          }
        }
      };
    }

    // Trigger webhook (non-blocking)
    triggerWebhook(webhookEvent, webhookPayload).catch(error => {
      console.error('Webhook trigger failed:', error);
      // Don't fail the main request if webhook fails
    });

    return accessRequest;

  } catch (error) {
    console.error('Create access request with webhooks error:', error);
    throw error;
  }
}

// Example integration in doors.js for door status changes
async function updateDoorStatusWithWebhooks(doorId, status, req) {
  try {
    // Update door status (existing logic)
    const door = await Door.findById(doorId);
    if (!door) {
      throw new Error('Door not found');
    }

    const oldStatus = door.isOnline;
    door.isOnline = status === 'online';
    await door.update({ isOnline: door.isOnline });

    // Determine webhook event
    let webhookEvent;
    if (status === 'online' && !oldStatus) {
      webhookEvent = 'door.online';
    } else if (status === 'offline' && oldStatus) {
      webhookEvent = 'door.offline';
    }

    if (webhookEvent) {
      const webhookPayload = {
        event: webhookEvent,
        timestamp: new Date().toISOString(),
        data: {
          doorId: door.id,
          doorName: door.name,
          location: door.location,
          esp32Ip: door.esp32Ip,
          status: status,
          previousStatus: oldStatus ? 'online' : 'offline'
        }
      };

      // Trigger webhook (non-blocking)
      triggerWebhook(webhookEvent, webhookPayload).catch(error => {
        console.error('Door status webhook trigger failed:', error);
      });
    }

    return door;

  } catch (error) {
    console.error('Update door status with webhooks error:', error);
    throw error;
  }
}

// Example integration for door control events
async function controlDoorWithWebhooks(doorId, action, req) {
  try {
    const door = await Door.findById(doorId);
    if (!door) {
      throw new Error('Door not found');
    }

    // Send command to ESP32 (existing logic)
    const response = await fetch(`http://${door.esp32Ip}/door`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ action: action })
    });

    if (response.ok) {
      // Determine webhook event based on action
      let webhookEvent;
      if (action === 'open') {
        webhookEvent = 'door.opened';
      } else if (action === 'close') {
        webhookEvent = 'door.closed';
      }

      if (webhookEvent) {
        const webhookPayload = {
          event: webhookEvent,
          timestamp: new Date().toISOString(),
          data: {
            doorId: door.id,
            doorName: door.name,
            location: door.location,
            esp32Ip: door.esp32Ip,
            action: action,
            triggeredBy: req.user ? {
              id: req.user.id,
              email: req.user.email,
              firstName: req.user.firstName,
              lastName: req.user.lastName
            } : null
          }
        };

        // Trigger webhook (non-blocking)
        triggerWebhook(webhookEvent, webhookPayload).catch(error => {
          console.error('Door control webhook trigger failed:', error);
        });
      }
    }

    return response.ok;

  } catch (error) {
    console.error('Control door with webhooks error:', error);
    throw error;
  }
}

// Example integration for user authentication events
async function logUserAuthWithWebhooks(user, action, req) {
  try {
    let webhookEvent;
    if (action === 'login') {
      webhookEvent = 'user.login';
    } else if (action === 'logout') {
      webhookEvent = 'user.logout';
    }

    if (webhookEvent) {
      const webhookPayload = {
        event: webhookEvent,
        timestamp: new Date().toISOString(),
        data: {
          userId: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          action: action,
          ipAddress: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
          userAgent: req.headers['user-agent']
        }
      };

      // Trigger webhook (non-blocking)
      triggerWebhook(webhookEvent, webhookPayload).catch(error => {
        console.error('User auth webhook trigger failed:', error);
      });
    }

  } catch (error) {
    console.error('Log user auth with webhooks error:', error);
    // Don't fail the main auth flow if webhook fails
  }
}

// Example integration for system events
async function logSystemEventWithWebhooks(eventType, message, req) {
  try {
    let webhookEvent;
    if (eventType === 'startup') {
      webhookEvent = 'system.startup';
    } else if (eventType === 'shutdown') {
      webhookEvent = 'system.shutdown';
    } else if (eventType === 'error') {
      webhookEvent = 'system.error';
    }

    if (webhookEvent) {
      const webhookPayload = {
        event: webhookEvent,
        timestamp: new Date().toISOString(),
        data: {
          eventType: eventType,
          message: message,
          serverInfo: {
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            version: process.version,
            environment: process.env.NODE_ENV || 'development'
          }
        }
      };

      // Trigger webhook (non-blocking)
      triggerWebhook(webhookEvent, webhookPayload).catch(error => {
        console.error('System event webhook trigger failed:', error);
      });
    }

  } catch (error) {
    console.error('Log system event with webhooks error:', error);
    // Don't fail the main system flow if webhook fails
  }
}

module.exports = {
  createAccessRequestWithWebhooks,
  updateDoorStatusWithWebhooks,
  controlDoorWithWebhooks,
  logUserAuthWithWebhooks,
  logSystemEventWithWebhooks
};