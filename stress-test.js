#!/usr/bin/env node

/**
 * SimplifiAccess Stress Test Script
 * Tests the application under load to identify performance bottlenecks
 */

const axios = require('axios');
const { performance } = require('perf_hooks');

// Configuration
const CONFIG = {
    // Update this with your Render app URL
    BASE_URL: process.env.TEST_URL || 'https://your-app-name.onrender.com',
    CONCURRENT_USERS: 10,
    REQUESTS_PER_USER: 20,
    DELAY_BETWEEN_REQUESTS: 100, // ms
    TEST_DURATION: 30000, // 30 seconds
    TIMEOUT: 10000 // 10 seconds
};

// Test data
const TEST_USERS = [
    { email: 'testuser1@example.com', password: 'password123', role: 'user' },
    { email: 'testuser2@example.com', password: 'password123', role: 'user' },
    { email: 'testuser3@example.com', password: 'password123', role: 'user' },
    { email: 'admin@example.com', password: 'admin123', role: 'admin' }
];

// Statistics tracking
const stats = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    responseTimes: [],
    errors: {},
    startTime: null,
    endTime: null
};

// Create axios instance with timeout
const api = axios.create({
    baseURL: CONFIG.BASE_URL,
    timeout: CONFIG.TIMEOUT,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Utility functions
function log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
}

function recordResponseTime(responseTime) {
    stats.responseTimes.push(responseTime);
    stats.totalRequests++;
}

function recordSuccess() {
    stats.successfulRequests++;
}

function recordError(error) {
    stats.failedRequests++;
    const errorType = error.code || error.message || 'Unknown';
    stats.errors[errorType] = (stats.errors[errorType] || 0) + 1;
}

// Test functions
async function testHealthCheck() {
    try {
        const start = performance.now();
        const response = await api.get('/');
        const end = performance.now();
        
        recordResponseTime(end - start);
        recordSuccess();
        log(`Health check: ${response.status} (${Math.round(end - start)}ms)`, 'success');
        return true;
    } catch (error) {
        recordError(error);
        log(`Health check failed: ${error.message}`, 'error');
        return false;
    }
}

async function testLogin(user) {
    try {
        const start = performance.now();
        const response = await api.post('/api/auth/login', {
            email: user.email,
            password: user.password
        });
        const end = performance.now();
        
        recordResponseTime(end - start);
        recordSuccess();
        log(`Login ${user.email}: ${response.status} (${Math.round(end - start)}ms)`, 'success');
        return response.data.token;
    } catch (error) {
        recordError(error);
        log(`Login ${user.email} failed: ${error.message}`, 'error');
        return null;
    }
}

async function testAuthenticatedEndpoint(token, endpoint, method = 'GET', data = null) {
    try {
        const start = performance.now();
        const config = {
            headers: { Authorization: `Bearer ${token}` }
        };
        
        let response;
        if (method === 'GET') {
            response = await api.get(endpoint, config);
        } else if (method === 'POST') {
            response = await api.post(endpoint, data, config);
        } else if (method === 'PUT') {
            response = await api.put(endpoint, data, config);
        } else if (method === 'DELETE') {
            response = await api.delete(endpoint, config);
        }
        
        const end = performance.now();
        
        recordResponseTime(end - start);
        recordSuccess();
        log(`${method} ${endpoint}: ${response.status} (${Math.round(end - start)}ms)`, 'success');
        return response.data;
    } catch (error) {
        recordError(error);
        log(`${method} ${endpoint} failed: ${error.message}`, 'error');
        return null;
    }
}

async function testConcurrentUsers() {
    log(`Starting stress test with ${CONFIG.CONCURRENT_USERS} concurrent users...`);
    
    const promises = [];
    for (let i = 0; i < CONFIG.CONCURRENT_USERS; i++) {
        const user = TEST_USERS[i % TEST_USERS.length];
        promises.push(simulateUser(user, i));
    }
    
    await Promise.all(promises);
}

async function simulateUser(user, userId) {
    log(`User ${userId} (${user.email}) starting simulation...`);
    
    // Login
    const token = await testLogin(user);
    if (!token) {
        log(`User ${userId} failed to login, skipping...`, 'error');
        return;
    }
    
    // Simulate user activity
    for (let i = 0; i < CONFIG.REQUESTS_PER_USER; i++) {
        // Random delay between requests
        await new Promise(resolve => setTimeout(resolve, Math.random() * CONFIG.DELAY_BETWEEN_REQUESTS));
        
        // Random endpoint selection
        const endpoints = [
            { url: '/api/users', method: 'GET' },
            { url: '/api/doors', method: 'GET' },
            { url: '/api/access-groups', method: 'GET' },
            { url: '/api/events', method: 'GET' },
            { url: '/api/users/stats/overview', method: 'GET' }
        ];
        
        const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
        await testAuthenticatedEndpoint(token, endpoint.url, endpoint.method);
    }
    
    log(`User ${userId} completed simulation`);
}

async function testDatabaseOperations(token) {
    log('Testing database operations...');
    
    // Test user creation
    const newUser = {
        username: `stress_test_${Date.now()}`,
        email: `stress_test_${Date.now()}@example.com`,
        password: 'password123',
        role: 'user'
    };
    
    await testAuthenticatedEndpoint(token, '/api/users', 'POST', newUser);
    
    // Test door creation
    const newDoor = {
        name: `Stress Test Door ${Date.now()}`,
        location: 'Test Location',
        controllerIp: '192.168.1.100',
        controllerMac: 'AA:BB:CC:DD:EE:FF'
    };
    
    await testAuthenticatedEndpoint(token, '/api/doors', 'POST', newDoor);
    
    // Test access group creation
    const newAccessGroup = {
        name: `Stress Test Group ${Date.now()}`,
        description: 'Test access group for stress testing'
    };
    
    await testAuthenticatedEndpoint(token, '/api/access-groups', 'POST', newAccessGroup);
}

async function runLoadTest() {
    log('🚀 Starting SimplifiAccess Stress Test');
    log(`Target URL: ${CONFIG.BASE_URL}`);
    log(`Concurrent Users: ${CONFIG.CONCURRENT_USERS}`);
    log(`Requests per User: ${CONFIG.REQUESTS_PER_USER}`);
    log(`Test Duration: ${CONFIG.TEST_DURATION / 1000} seconds`);
    log('─'.repeat(50));
    
    stats.startTime = performance.now();
    
    // Test 1: Health Check
    log('Test 1: Health Check');
    await testHealthCheck();
    
    // Test 2: Login Performance
    log('Test 2: Login Performance');
    const adminToken = await testLogin(TEST_USERS.find(u => u.role === 'admin'));
    if (!adminToken) {
        log('Failed to get admin token, some tests will be skipped', 'error');
    }
    
    // Test 3: Database Operations (if admin token available)
    if (adminToken) {
        await testDatabaseOperations(adminToken);
    }
    
    // Test 4: Concurrent User Simulation
    log('Test 4: Concurrent User Simulation');
    await testConcurrentUsers();
    
    // Test 5: Sustained Load
    log('Test 5: Sustained Load Test');
    const loadTestDuration = CONFIG.TEST_DURATION;
    const loadTestStart = performance.now();
    
    while (performance.now() - loadTestStart < loadTestDuration) {
        await testHealthCheck();
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    stats.endTime = performance.now();
    
    // Generate Report
    generateReport();
}

function generateReport() {
    const duration = stats.endTime - stats.startTime;
    const avgResponseTime = stats.responseTimes.reduce((a, b) => a + b, 0) / stats.responseTimes.length;
    const minResponseTime = Math.min(...stats.responseTimes);
    const maxResponseTime = Math.max(...stats.responseTimes);
    const successRate = (stats.successfulRequests / stats.totalRequests) * 100;
    const requestsPerSecond = stats.totalRequests / (duration / 1000);
    
    log('─'.repeat(50));
    log('📊 STRESS TEST REPORT');
    log('─'.repeat(50));
    log(`Total Duration: ${Math.round(duration / 1000)}s`);
    log(`Total Requests: ${stats.totalRequests}`);
    log(`Successful Requests: ${stats.successfulRequests}`);
    log(`Failed Requests: ${stats.failedRequests}`);
    log(`Success Rate: ${successRate.toFixed(2)}%`);
    log(`Requests per Second: ${requestsPerSecond.toFixed(2)}`);
    log(`Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
    log(`Min Response Time: ${minResponseTime.toFixed(2)}ms`);
    log(`Max Response Time: ${maxResponseTime.toFixed(2)}ms`);
    
    if (Object.keys(stats.errors).length > 0) {
        log('─'.repeat(30));
        log('❌ ERRORS:');
        Object.entries(stats.errors).forEach(([error, count]) => {
            log(`  ${error}: ${count} occurrences`);
        });
    }
    
    // Performance Analysis
    log('─'.repeat(30));
    log('📈 PERFORMANCE ANALYSIS:');
    
    if (successRate < 95) {
        log('⚠️  Low success rate detected - check server stability', 'error');
    }
    
    if (avgResponseTime > 2000) {
        log('⚠️  High average response time - check server performance', 'error');
    }
    
    if (maxResponseTime > 10000) {
        log('⚠️  Very high max response time - check for bottlenecks', 'error');
    }
    
    if (requestsPerSecond < 1) {
        log('⚠️  Low throughput - check server capacity', 'error');
    }
    
    if (successRate >= 95 && avgResponseTime < 1000 && requestsPerSecond > 5) {
        log('✅ Excellent performance! Server is handling load well', 'success');
    }
    
    log('─'.repeat(50));
    log('🏁 Stress test completed!');
}

// Error handling
process.on('unhandledRejection', (reason, promise) => {
    log(`Unhandled Rejection at: ${promise}, reason: ${reason}`, 'error');
});

process.on('uncaughtException', (error) => {
    log(`Uncaught Exception: ${error.message}`, 'error');
    process.exit(1);
});

// Main execution
if (require.main === module) {
    runLoadTest().catch(error => {
        log(`Stress test failed: ${error.message}`, 'error');
        process.exit(1);
    });
}

module.exports = { runLoadTest, CONFIG };