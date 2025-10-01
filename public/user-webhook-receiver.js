// Real-time event polling system for logged-in users
// Uses polling instead of webhooks for simplicity and reliability

class UserEventPoller {
  constructor(userId) {
    this.userId = userId;
    this.isActive = false;
    this.pollInterval = null;
    this.lastEventId = null;
    this.pollIntervalMs = 2000; // Poll every 2 seconds
  }

  // Start polling for new events
  async start() {
    if (this.isActive) return;

    console.log(`🔄 Starting event polling for user ${this.userId}`);
    this.isActive = true;

    // Get the latest event ID to start from
    await this.getLatestEventId();

    // Start polling
    this.pollInterval = setInterval(() => {
      this.pollForNewEvents();
    }, this.pollIntervalMs);

    console.log(`✅ Event polling started (every ${this.pollIntervalMs}ms)`);
  }

  // Stop polling
  stop() {
    if (!this.isActive) return;

    console.log(`🛑 Stopping event polling for user ${this.userId}`);
    this.isActive = false;

    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  // Get the latest event ID to start polling from
  async getLatestEventId() {
    try {
      const response = await fetch('/api/events/recent?limit=1', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.events && data.events.length > 0) {
          this.lastEventId = data.events[0].id;
          console.log(`📡 Starting polling from event ID: ${this.lastEventId}`);
        }
      }
    } catch (error) {
      console.error('Error getting latest event ID:', error);
    }
  }

  // Poll for new events
  async pollForNewEvents() {
    if (!this.isActive) return;

    try {
      const response = await fetch('/api/events/recent?limit=10', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.events && data.events.length > 0) {
          // Find new events since last poll
          const newEvents = data.events.filter(event => 
            this.lastEventId === null || event.id > this.lastEventId
          );

          if (newEvents.length > 0) {
            console.log(`📡 Found ${newEvents.length} new events`);
            
            // Update last event ID
            this.lastEventId = Math.max(...newEvents.map(e => e.id));

            // Handle new events
            newEvents.forEach(event => {
              this.handleNewEvent(event);
            });

            // Refresh events section
            if (typeof loadEvents === 'function') {
              loadEvents(currentEventPage || 1, currentEventType || '');
            }
          }
        }
      }
    } catch (error) {
      console.error('Error polling for events:', error);
    }
  }

  // Handle a new event
  handleNewEvent(event) {
    console.log('📡 New event detected:', event.type, event.action, event.details);
    
    // Show toast notification
    if (typeof showToast === 'function') {
      const emoji = this.getEventEmoji(event.type, event.action);
      const message = event.details || `${event.type} ${event.action}`;
      showToast(`${emoji} ${message}`, 'info');
    }
  }

  // Get emoji for event type
  getEventEmoji(type, action) {
    if (type === 'access' && action === 'granted') return '🔓';
    if (type === 'access' && action === 'denied') return '🔒';
    if (type === 'door' && action === 'online') return '🟢';
    if (type === 'door' && action === 'offline') return '🔴';
    if (type === 'door' && action === 'opened') return '🚪';
    if (type === 'auth' && action === 'login') return '👤';
    if (type === 'system') return '⚙️';
    return '📢';
  }
}

// Global user event poller instance
let userEventPoller = null;

// Initialize user event poller when user logs in
async function initializeUserWebhook() {
    if (!localStorage.getItem('token') || !currentUser) {
        console.log('User not logged in, skipping event poller initialization.');
        return;
    }

    console.log('🔄 Initializing user event poller...');
    
    // Create new poller instance
    userEventPoller = new UserEventPoller(currentUser.id);
    
    // Start polling
    await userEventPoller.start();
    
    console.log('✅ User event poller initialized successfully');
}

// Cleanup user event poller when user logs out
async function cleanupUserWebhook() {
    if (userEventPoller) {
        console.log('🔄 Cleaning up user event poller...');
        userEventPoller.stop();
        userEventPoller = null;
        console.log('✅ User event poller cleaned up');
    }
}

// Legacy function names for compatibility
function handleUserWebhookEvent(eventPayload) {
    console.log('📡 Legacy webhook handler called:', eventPayload);
    // This is now handled by the polling system
}

// Export for use in other modules
window.UserEventPoller = UserEventPoller;
window.initializeUserWebhook = initializeUserWebhook;
window.cleanupUserWebhook = cleanupUserWebhook;