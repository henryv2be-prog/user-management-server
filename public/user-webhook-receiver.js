// Simple webhook receiver for logged-in users
// This can be used by each logged-in user to receive real-time event updates

class UserWebhookReceiver {
  constructor(userId) {
    this.userId = userId;
    this.webhookUrl = null;
    this.isRegistered = false;
  }

  // Generate a unique webhook URL for this user session
  generateWebhookUrl() {
    const sessionId = Math.random().toString(36).substring(2, 15);
    this.webhookUrl = `${window.location.origin}/api/user-webhook/${this.userId}/${sessionId}`;
    return this.webhookUrl;
  }

  // Register this user's webhook with the server
  async register() {
    if (!this.webhookUrl) {
      this.generateWebhookUrl();
    }

    try {
      const response = await fetch('/api/events/register-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ webhookUrl: this.webhookUrl })
      });

      if (response.ok) {
        this.isRegistered = true;
        console.log(`✅ User webhook registered: ${this.webhookUrl}`);
        return true;
      } else {
        console.error('Failed to register user webhook:', await response.text());
        return false;
      }
    } catch (error) {
      console.error('Error registering user webhook:', error);
      return false;
    }
  }

  // Unregister this user's webhook
  async unregister() {
    if (!this.isRegistered) return;

    try {
      const response = await fetch('/api/events/unregister-webhook', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        this.isRegistered = false;
        console.log(`✅ User webhook unregistered: ${this.webhookUrl}`);
        return true;
      } else {
        console.error('Failed to unregister user webhook:', await response.text());
        return false;
      }
    } catch (error) {
      console.error('Error unregistering user webhook:', error);
      return false;
    }
  }

  // Handle incoming webhook events
  handleEvent(eventData) {
    console.log('📡 Received event via webhook:', eventData);
    
    // Update the events section in real-time
    if (typeof loadEvents === 'function') {
      loadEvents(currentEventPage || 1, currentEventType || '');
    }
    
    // Show a toast notification
    if (typeof showToast === 'function') {
      showToast(`New event: ${eventData.event.message}`, 'info');
    }
  }
}

// Global user webhook receiver instance
let userWebhookReceiver = null;

// Initialize user webhook receiver when user logs in
function initializeUserWebhook() {
  if (currentUser && currentUser.id) {
    userWebhookReceiver = new UserWebhookReceiver(currentUser.id);
    userWebhookReceiver.register().then(success => {
      if (success) {
        console.log('🎉 User webhook system initialized');
      } else {
        console.warn('⚠️ User webhook system failed to initialize');
      }
    });
  }
}

// Cleanup user webhook when user logs out
function cleanupUserWebhook() {
  if (userWebhookReceiver) {
    userWebhookReceiver.unregister();
    userWebhookReceiver = null;
  }
}

// Export for use in other modules
window.UserWebhookReceiver = UserWebhookReceiver;
window.initializeUserWebhook = initializeUserWebhook;
window.cleanupUserWebhook = cleanupUserWebhook;