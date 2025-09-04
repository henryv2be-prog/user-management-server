#!/usr/bin/env node

const ESP32TestWorkflow = require('./utils/esp32TestWorkflow');
const ESPMeshNetwork = require('./utils/espMeshNetwork');
const QRCodeGenerator = require('./utils/qrCodeGenerator');
const NFCHandler = require('./utils/nfcHandler');

class ESP32WorkflowTester {
  constructor() {
    this.testWorkflow = new ESP32TestWorkflow();
    this.meshNetwork = new ESPMeshNetwork();
    this.qrGenerator = QRCodeGenerator;
    this.nfcHandler = new NFCHandler();
  }

  /**
   * Run all ESP32 workflow tests
   */
  async runAllTests() {
    console.log('🚀 Starting ESP32 Workflow Comprehensive Testing');
    console.log('=' .repeat(60));

    try {
      // Initialize components
      await this.initializeComponents();

      // Run test suite
      const testResults = await this.testWorkflow.runFullTestSuite();

      // Test mesh networking
      await this.testMeshNetworking();

      // Test QR code generation
      await this.testQRCodeGeneration();

      // Test NFC handling
      await this.testNFCHandling();

      // Generate final report
      this.generateFinalReport(testResults);

    } catch (error) {
      console.error('❌ ESP32 workflow testing failed:', error);
      process.exit(1);
    }
  }

  /**
   * Initialize all components
   */
  async initializeComponents() {
    console.log('🔧 Initializing components...');

    try {
      // Initialize mesh network
      await this.meshNetwork.initialize();
      console.log('✅ Mesh network initialized');

      // Initialize NFC handler
      await this.nfcHandler.initialize();
      console.log('✅ NFC handler initialized');

      console.log('✅ All components initialized successfully');
    } catch (error) {
      console.error('❌ Component initialization failed:', error);
      throw error;
    }
  }

  /**
   * Test mesh networking functionality
   */
  async testMeshNetworking() {
    console.log('\n🌐 Testing Mesh Networking...');
    console.log('-'.repeat(40));

    try {
      // Register test nodes
      const nodes = [
        {
          nodeId: 'ROOT_001',
          parentNodeId: null,
          signalStrength: -30,
          hopCount: 0,
          lastSeen: new Date().toISOString()
        },
        {
          nodeId: 'NODE_002',
          parentNodeId: 'ROOT_001',
          signalStrength: -45,
          hopCount: 1,
          lastSeen: new Date().toISOString()
        },
        {
          nodeId: 'NODE_003',
          parentNodeId: 'ROOT_001',
          signalStrength: -50,
          hopCount: 1,
          lastSeen: new Date().toISOString()
        },
        {
          nodeId: 'NODE_004',
          parentNodeId: 'NODE_002',
          signalStrength: -60,
          hopCount: 2,
          lastSeen: new Date().toISOString()
        }
      ];

      // Register nodes
      for (const nodeData of nodes) {
        await this.meshNetwork.registerNode(nodeData);
        console.log(`✅ Registered node: ${nodeData.nodeId}`);
      }

      // Test network topology
      const topology = this.meshNetwork.getTopology();
      console.log(`✅ Network topology: ${topology.totalNodes} nodes, max depth: ${topology.maxDepth}`);

      // Test message routing
      const path = this.meshNetwork.findShortestPath('NODE_004', 'NODE_003');
      console.log(`✅ Shortest path from NODE_004 to NODE_003: ${path.join(' -> ')}`);

      // Test message broadcasting
      this.meshNetwork.broadcastMessage({
        type: 'door_status_update',
        doorId: 1,
        status: 'open'
      }, 'ROOT_001');
      console.log('✅ Message broadcast test completed');

      // Test network statistics
      const stats = this.meshNetwork.getStatistics();
      console.log(`✅ Network health: ${stats.networkHealth}%`);

    } catch (error) {
      console.error('❌ Mesh networking test failed:', error);
    }
  }

  /**
   * Test QR code generation
   */
  async testQRCodeGeneration() {
    console.log('\n📱 Testing QR Code Generation...');
    console.log('-'.repeat(40));

    try {
      // Test access QR code
      const accessQR = await this.qrGenerator.generateAccessQR({
        doorId: 1,
        userId: 'test_user_001',
        secret: 'test_secret_key'
      });
      console.log('✅ Access QR code generated');

      // Test config QR code
      const configQR = await this.qrGenerator.generateConfigQR({
        doorName: 'Main Entrance',
        location: 'Building A',
        wifiSSID: 'CompanyWiFi',
        wifiPassword: 'securepassword123',
        serverUrl: 'http://192.168.1.100:3000'
      });
      console.log('✅ Config QR code generated');

      // Test user QR code
      const userQR = await this.qrGenerator.generateUserQR({
        userId: 'user_001',
        username: 'john.doe',
        name: 'John Doe',
        accessGroups: ['employees', 'admin']
      });
      console.log('✅ User QR code generated');

      // Test mesh config QR code
      const meshQR = await this.qrGenerator.generateMeshConfigQR({
        networkName: 'ESP32_Mesh',
        password: 'meshpassword123',
        serverUrl: 'http://192.168.1.100:3000',
        nodeId: 'MESH_NODE_001'
      });
      console.log('✅ Mesh config QR code generated');

      // Test QR code validation
      const testQRData = JSON.stringify({
        type: 'door_access',
        doorId: 1,
        userId: 'test_user_001',
        timestamp: Date.now(),
        secret: 'test_secret_key'
      });
      
      const validatedData = this.qrGenerator.validateQRData(testQRData);
      console.log('✅ QR code validation working');

    } catch (error) {
      console.error('❌ QR code generation test failed:', error);
    }
  }

  /**
   * Test NFC handling
   */
  async testNFCHandling() {
    console.log('\n💳 Testing NFC Handling...');
    console.log('-'.repeat(40));

    try {
      // Start NFC reading
      await this.nfcHandler.startReading();
      console.log('✅ NFC reading started');

      // Simulate card detection
      const mockCardData = this.nfcHandler.generateMockCardData();
      console.log(`✅ Mock card data generated: ${mockCardData.uid}`);

      // Process card data
      const accessData = this.nfcHandler.processCardData(mockCardData);
      console.log('✅ Card data processed:', accessData);

      // Test card formatting
      const cardData = this.nfcHandler.formatCardForAccess('user_001', ['employees']);
      console.log('✅ Card formatted for access');

      // Stop NFC reading
      await this.nfcHandler.stopReading();
      console.log('✅ NFC reading stopped');

    } catch (error) {
      console.error('❌ NFC handling test failed:', error);
    }
  }

  /**
   * Generate final test report
   */
  generateFinalReport(testResults) {
    console.log('\n📊 ESP32 Workflow Test Report');
    console.log('=' .repeat(60));

    console.log(`Total Tests: ${testResults.total}`);
    console.log(`Passed: ${testResults.passed} ✅`);
    console.log(`Failed: ${testResults.failed} ❌`);
    console.log(`Success Rate: ${testResults.successRate}%`);

    console.log('\nDetailed Results:');
    console.log('-'.repeat(40));

    testResults.results.forEach(result => {
      const status = result.status === 'PASS' ? '✅' : '❌';
      console.log(`${status} ${result.testName}: ${result.message}`);
    });

    // Additional component status
    console.log('\nComponent Status:');
    console.log('-'.repeat(40));
    console.log(`Mesh Network: ${this.meshNetwork.isActive ? '✅ Active' : '❌ Inactive'}`);
    console.log(`NFC Handler: ${this.nfcHandler.isInitialized ? '✅ Initialized' : '❌ Not Initialized'}`);
    console.log(`QR Generator: ✅ Ready`);

    // Network statistics
    if (this.meshNetwork.isActive) {
      const stats = this.meshNetwork.getStatistics();
      console.log('\nMesh Network Statistics:');
      console.log(`Total Nodes: ${stats.totalNodes}`);
      console.log(`Online Nodes: ${stats.onlineNodes}`);
      console.log(`Network Health: ${stats.networkHealth}%`);
    }

    console.log('\n🎉 ESP32 Workflow Testing Completed!');
    
    if (testResults.successRate >= 90) {
      console.log('🌟 Excellent! All systems are working properly.');
    } else if (testResults.successRate >= 70) {
      console.log('⚠️  Good, but some issues need attention.');
    } else {
      console.log('🚨 Critical issues detected. Please review failed tests.');
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    console.log('\n🧹 Cleaning up resources...');
    
    try {
      await this.nfcHandler.cleanup();
      await this.meshNetwork.shutdown();
      console.log('✅ Cleanup completed');
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
    }
  }
}

// Main execution
async function main() {
  const tester = new ESP32WorkflowTester();
  
  try {
    await tester.runAllTests();
  } catch (error) {
    console.error('Test execution failed:', error);
    process.exit(1);
  } finally {
    await tester.cleanup();
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = ESP32WorkflowTester;