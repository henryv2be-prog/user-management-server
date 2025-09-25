class AccessMutex {
  constructor() {
    this.locks = new Map();
    this.waitQueues = new Map();
    this.lockTimeout = 30000; // 30 seconds default timeout
  }

  async acquire(doorId, userId) {
    const key = `door:${doorId}`;
    
    // Check if already locked
    if (this.locks.has(key)) {
      // Add to wait queue
      if (!this.waitQueues.has(key)) {
        this.waitQueues.set(key, []);
      }
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          // Remove from queue if timeout
          const queue = this.waitQueues.get(key);
          const index = queue.findIndex(item => item.userId === userId);
          if (index > -1) {
            queue.splice(index, 1);
          }
          reject(new Error('Lock acquisition timeout'));
        }, this.lockTimeout);

        this.waitQueues.get(key).push({ 
          userId, 
          resolve: () => {
            clearTimeout(timeout);
            resolve(true);
          },
          reject 
        });
      });
    }

    // Acquire lock
    this.locks.set(key, { 
      userId, 
      timestamp: Date.now(),
      doorId 
    });
    return true;
  }

  release(doorId) {
    const key = `door:${doorId}`;
    
    // Release lock
    this.locks.delete(key);
    
    // Process wait queue
    const queue = this.waitQueues.get(key);
    if (queue && queue.length > 0) {
      const next = queue.shift();
      this.locks.set(key, { 
        userId: next.userId, 
        timestamp: Date.now(),
        doorId 
      });
      next.resolve(true);
      
      if (queue.length === 0) {
        this.waitQueues.delete(key);
      }
    }
  }

  // Check if a door is currently locked
  isLocked(doorId) {
    return this.locks.has(`door:${doorId}`);
  }

  // Get lock info
  getLockInfo(doorId) {
    return this.locks.get(`door:${doorId}`);
  }

  // Auto-release locks after timeout
  startCleanup(timeout = 30000) {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const expiredLocks = [];
      
      for (const [key, lock] of this.locks.entries()) {
        if (now - lock.timestamp > timeout) {
          expiredLocks.push(key);
        }
      }
      
      // Release expired locks
      for (const key of expiredLocks) {
        console.warn(`Auto-releasing stale lock for ${key} (user: ${this.locks.get(key).userId})`);
        const doorId = key.replace('door:', '');
        this.release(doorId);
      }
    }, 10000); // Check every 10 seconds
  }

  // Stop cleanup interval
  stopCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  // Get statistics
  getStats() {
    return {
      activeLocks: this.locks.size,
      waitingRequests: Array.from(this.waitQueues.values()).reduce((sum, queue) => sum + queue.length, 0),
      locks: Array.from(this.locks.entries()).map(([key, lock]) => ({
        key,
        ...lock,
        age: Date.now() - lock.timestamp
      }))
    };
  }
}

// Create singleton instance
const accessMutex = new AccessMutex();
accessMutex.startCleanup();

module.exports = accessMutex;