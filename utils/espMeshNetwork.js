const EventEmitter = require('events');

class ESPMeshNetwork extends EventEmitter {
  constructor() {
    super();
    this.nodes = new Map();
    this.routes = new Map();
    this.isActive = false;
  }

  /**
   * Initialize mesh network
   */
  async initialize() {
    try {
      console.log('Initializing ESP32 mesh network...');
      this.isActive = true;
      this.emit('networkInitialized');
      return true;
    } catch (error) {
      console.error('Failed to initialize mesh network:', error);
      this.emit('error', error);
      return false;
    }
  }

  /**
   * Register a new mesh node
   * @param {Object} nodeData - Node data
   * @param {string} nodeData.nodeId - Node ID
   * @param {string} nodeData.parentNodeId - Parent node ID
   * @param {number} nodeData.signalStrength - Signal strength
   * @param {number} nodeData.hopCount - Hop count from root
   * @param {string} nodeData.lastSeen - Last seen timestamp
   */
  registerNode(nodeData) {
    try {
      const {
        nodeId,
        parentNodeId,
        signalStrength,
        hopCount,
        lastSeen
      } = nodeData;

      const node = {
        nodeId,
        parentNodeId,
        signalStrength,
        hopCount,
        lastSeen: new Date(lastSeen),
        status: 'online',
        children: [],
        registeredAt: new Date()
      };

      this.nodes.set(nodeId, node);

      // Update parent's children list
      if (parentNodeId && this.nodes.has(parentNodeId)) {
        const parent = this.nodes.get(parentNodeId);
        if (!parent.children.includes(nodeId)) {
          parent.children.push(nodeId);
        }
      }

      console.log(`Mesh node registered: ${nodeId}`);
      this.emit('nodeRegistered', node);
      
      return node;
    } catch (error) {
      console.error('Failed to register mesh node:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Update node status
   * @param {string} nodeId - Node ID
   * @param {Object} updateData - Update data
   */
  updateNode(nodeId, updateData) {
    try {
      if (!this.nodes.has(nodeId)) {
        throw new Error(`Node ${nodeId} not found`);
      }

      const node = this.nodes.get(nodeId);
      Object.assign(node, updateData);
      node.lastSeen = new Date();

      this.nodes.set(nodeId, node);
      console.log(`Mesh node updated: ${nodeId}`);
      this.emit('nodeUpdated', node);
      
      return node;
    } catch (error) {
      console.error('Failed to update mesh node:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Remove node from mesh
   * @param {string} nodeId - Node ID
   */
  removeNode(nodeId) {
    try {
      if (!this.nodes.has(nodeId)) {
        throw new Error(`Node ${nodeId} not found`);
      }

      const node = this.nodes.get(nodeId);
      
      // Update parent's children list
      if (node.parentNodeId && this.nodes.has(node.parentNodeId)) {
        const parent = this.nodes.get(node.parentNodeId);
        parent.children = parent.children.filter(id => id !== nodeId);
      }

      // Update children to find new parent
      node.children.forEach(childId => {
        if (this.nodes.has(childId)) {
          const child = this.nodes.get(childId);
          child.parentNodeId = node.parentNodeId;
          this.nodes.set(childId, child);
        }
      });

      this.nodes.delete(nodeId);
      console.log(`Mesh node removed: ${nodeId}`);
      this.emit('nodeRemoved', nodeId);
      
      return true;
    } catch (error) {
      console.error('Failed to remove mesh node:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Get all nodes
   * @returns {Array} Array of nodes
   */
  getAllNodes() {
    return Array.from(this.nodes.values());
  }

  /**
   * Get node by ID
   * @param {string} nodeId - Node ID
   * @returns {Object|null} Node data or null
   */
  getNode(nodeId) {
    return this.nodes.get(nodeId) || null;
  }

  /**
   * Get root nodes (nodes with no parent)
   * @returns {Array} Array of root nodes
   */
  getRootNodes() {
    return Array.from(this.nodes.values()).filter(node => !node.parentNodeId);
  }

  /**
   * Get leaf nodes (nodes with no children)
   * @returns {Array} Array of leaf nodes
   */
  getLeafNodes() {
    return Array.from(this.nodes.values()).filter(node => node.children.length === 0);
  }

  /**
   * Get network topology
   * @returns {Object} Network topology
   */
  getTopology() {
    const topology = {
      totalNodes: this.nodes.size,
      rootNodes: this.getRootNodes().length,
      leafNodes: this.getLeafNodes().length,
      maxDepth: this.calculateMaxDepth(),
      nodes: this.getAllNodes()
    };

    return topology;
  }

  /**
   * Calculate maximum depth of the network
   * @returns {number} Maximum depth
   */
  calculateMaxDepth() {
    let maxDepth = 0;
    
    const calculateDepth = (nodeId, depth = 0) => {
      const node = this.nodes.get(nodeId);
      if (!node) return depth;
      
      maxDepth = Math.max(maxDepth, depth);
      
      node.children.forEach(childId => {
        calculateDepth(childId, depth + 1);
      });
    };

    this.getRootNodes().forEach(rootNode => {
      calculateDepth(rootNode.nodeId);
    });

    return maxDepth;
  }

  /**
   * Find shortest path between two nodes
   * @param {string} fromNodeId - Source node ID
   * @param {string} toNodeId - Destination node ID
   * @returns {Array} Path array or empty array
   */
  findShortestPath(fromNodeId, toNodeId) {
    if (fromNodeId === toNodeId) {
      return [fromNodeId];
    }

    const visited = new Set();
    const queue = [{ nodeId: fromNodeId, path: [fromNodeId] }];

    while (queue.length > 0) {
      const { nodeId, path } = queue.shift();
      
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);

      const node = this.nodes.get(nodeId);
      if (!node) continue;

      // Check if we found the target
      if (nodeId === toNodeId) {
        return path;
      }

      // Add parent to queue
      if (node.parentNodeId && !visited.has(node.parentNodeId)) {
        queue.push({
          nodeId: node.parentNodeId,
          path: [...path, node.parentNodeId]
        });
      }

      // Add children to queue
      node.children.forEach(childId => {
        if (!visited.has(childId)) {
          queue.push({
            nodeId: childId,
            path: [...path, childId]
          });
        }
      });
    }

    return []; // No path found
  }

  /**
   * Broadcast message to all nodes
   * @param {Object} message - Message to broadcast
   * @param {string} fromNodeId - Source node ID
   */
  broadcastMessage(message, fromNodeId) {
    try {
      const broadcastData = {
        message,
        fromNodeId,
        timestamp: new Date().toISOString(),
        messageId: this.generateMessageId()
      };

      console.log(`Broadcasting message from ${fromNodeId}:`, message);
      this.emit('messageBroadcast', broadcastData);
      
      return broadcastData;
    } catch (error) {
      console.error('Failed to broadcast message:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Send message to specific node
   * @param {string} toNodeId - Destination node ID
   * @param {Object} message - Message to send
   * @param {string} fromNodeId - Source node ID
   */
  sendMessage(toNodeId, message, fromNodeId) {
    try {
      const messageData = {
        toNodeId,
        message,
        fromNodeId,
        timestamp: new Date().toISOString(),
        messageId: this.generateMessageId()
      };

      console.log(`Sending message from ${fromNodeId} to ${toNodeId}:`, message);
      this.emit('messageSent', messageData);
      
      return messageData;
    } catch (error) {
      console.error('Failed to send message:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Generate unique message ID
   * @returns {string} Message ID
   */
  generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get network statistics
   * @returns {Object} Network statistics
   */
  getStatistics() {
    const nodes = this.getAllNodes();
    const onlineNodes = nodes.filter(node => node.status === 'online');
    const offlineNodes = nodes.filter(node => node.status === 'offline');

    return {
      totalNodes: nodes.length,
      onlineNodes: onlineNodes.length,
      offlineNodes: offlineNodes.length,
      averageSignalStrength: this.calculateAverageSignalStrength(onlineNodes),
      maxDepth: this.calculateMaxDepth(),
      networkHealth: this.calculateNetworkHealth()
    };
  }

  /**
   * Calculate average signal strength
   * @param {Array} nodes - Array of nodes
   * @returns {number} Average signal strength
   */
  calculateAverageSignalStrength(nodes) {
    if (nodes.length === 0) return 0;
    
    const totalSignal = nodes.reduce((sum, node) => sum + node.signalStrength, 0);
    return totalSignal / nodes.length;
  }

  /**
   * Calculate network health score
   * @returns {number} Health score (0-100)
   */
  calculateNetworkHealth() {
    const stats = this.getStatistics();
    
    if (stats.totalNodes === 0) return 0;
    
    const onlineRatio = stats.onlineNodes / stats.totalNodes;
    const signalScore = Math.max(0, (stats.averageSignalStrength + 100) / 100); // Convert to 0-1 scale
    
    return Math.round((onlineRatio * 0.7 + signalScore * 0.3) * 100);
  }

  /**
   * Cleanup offline nodes
   * @param {number} timeoutMinutes - Timeout in minutes
   */
  cleanupOfflineNodes(timeoutMinutes = 30) {
    const cutoffTime = new Date(Date.now() - timeoutMinutes * 60 * 1000);
    const offlineNodes = [];

    this.nodes.forEach((node, nodeId) => {
      if (node.lastSeen < cutoffTime) {
        offlineNodes.push(nodeId);
      }
    });

    offlineNodes.forEach(nodeId => {
      this.removeNode(nodeId);
    });

    if (offlineNodes.length > 0) {
      console.log(`Cleaned up ${offlineNodes.length} offline nodes`);
      this.emit('nodesCleanedUp', offlineNodes);
    }
  }

  /**
   * Shutdown mesh network
   */
  async shutdown() {
    try {
      console.log('Shutting down ESP32 mesh network...');
      this.isActive = false;
      this.nodes.clear();
      this.routes.clear();
      this.emit('networkShutdown');
      return true;
    } catch (error) {
      console.error('Failed to shutdown mesh network:', error);
      this.emit('error', error);
      return false;
    }
  }
}

module.exports = ESPMeshNetwork;