#!/usr/bin/env node

/**
 * SimplifiAccess Stress Test Suite
 * Tests maximum capacity for doors, users, and access groups
 * Optimized for Linux server environments
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
    BASE_URL: 'http://localhost:3000',
    MAX_USERS: 10000,
    MAX_DOORS: 1000,
    MAX_ACCESS_GROUPS: 500,
    CONCURRENT_REQUESTS: 50,
    TEST_ADMIN: {
        email: 'admin@example.com',
        password: 'admin123'
    },
    OUTPUT_DIR: './stress_test_results',
    BATCH_SIZE: 100
};

// Test results storage
const results = {
    users: { created: 0, failed: 0, times: [] },
    doors: { created: 0, failed: 0, times: [] },
    accessGroups: { created: 0, failed: 0, times: [] },
    api: { requests: 0, successful: 0, failed: 0, avgResponseTime: 0 },
    database: { queries: 0, errors: 0 },
    memory: { start: 0, peak: 0, end: 0 },
    startTime: null,
    endTime: null
};

let authToken = null;

// Utility functions
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const getMemoryUsage = () => process.memoryUsage().heapUsed / 1024 / 1024; // MB

// API client with error handling
class APIClient {
    constructor(baseURL) {
        this.baseURL = baseURL;
        this.client = axios.create({
            baseURL,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }

    async request(method, url, data = null) {
        const start = Date.now();
        try {
            results.api.requests++;
            const config = {
                method,
                url,
                headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
            };
            
            if (data) config.data = data;
            
            const response = await this.client(config);
            const duration = Date.now() - start;
            
            results.api.successful++;
            results.api.avgResponseTime = (results.api.avgResponseTime * (results.api.successful - 1) + duration) / results.api.successful;
            
            return { success: true, data: response.data, duration };
        } catch (error) {
            const duration = Date.now() - start;
            results.api.failed++;
            
            return {
                success: false,
                error: error.response?.data || error.message,
                status: error.response?.status,
                duration
            };
        }
    }
}

const api = new APIClient(CONFIG.BASE_URL);

// Authentication
async function authenticate() {
    console.log('🔐 Authenticating...');
    const response = await api.request('POST', '/api/auth/login', CONFIG.TEST_ADMIN);
    
    if (response.success && response.data.token) {
        authToken = response.data.token;
        console.log('✅ Authentication successful');
        return true;
    } else {
        console.error('❌ Authentication failed:', response.error);
        return false;
    }
}

// Generate test data
function generateTestUser(index) {
    return {
        username: `testuser${index}`,
        email: `testuser${index}@stresstest.com`,
        password: 'testpass123',
        role: Math.random() > 0.9 ? 'admin' : 'user'
    };
}

function generateTestDoor(index) {
    return {
        name: `Door ${index}`,
        location: `Location ${Math.floor(index / 10) + 1}`,
        esp32Ip: `192.168.1.${(index % 254) + 1}`,
        esp32Mac: `AA:BB:CC:DD:EE:${(index % 256).toString(16).padStart(2, '0').toUpperCase()}`,
        accessGroupId: Math.floor(Math.random() * Math.min(index, CONFIG.MAX_ACCESS_GROUPS)) + 1 || 1
    };
}

function generateTestAccessGroup(index) {
    return {
        name: `Access Group ${index}`,
        description: `Stress test access group number ${index}`
    };
}

// Batch processing with concurrency control
async function processBatch(items, processor, batchName, concurrency = CONFIG.CONCURRENT_REQUESTS) {
    console.log(`\n📦 Processing ${items.length} ${batchName} in batches of ${CONFIG.BATCH_SIZE}...`);
    
    const batches = [];
    for (let i = 0; i < items.length; i += CONFIG.BATCH_SIZE) {
        batches.push(items.slice(i, i + CONFIG.BATCH_SIZE));
    }
    
    let processed = 0;
    const startTime = Date.now();
    
    for (const [batchIndex, batch] of batches.entries()) {
        const batchStart = Date.now();
        
        // Process batch with concurrency control
        const semaphore = new Array(concurrency).fill(null);
        const promises = batch.map(async (item, index) => {
            // Wait for available slot
            const slotIndex = index % concurrency;
            await semaphore[slotIndex];
            
            const promise = processor(item, processed + index);
            semaphore[slotIndex] = promise.catch(() => {}); // Don't let errors block the semaphore
            
            return promise;
        });
        
        const batchResults = await Promise.allSettled(promises);
        processed += batch.length;
        
        const batchDuration = Date.now() - batchStart;
        const successCount = batchResults.filter(r => r.status === 'fulfilled' && r.value?.success).length;
        const failCount = batch.length - successCount;
        
        console.log(`   Batch ${batchIndex + 1}/${batches.length}: ${successCount} success, ${failCount} failed (${batchDuration}ms)`);
        
        // Brief pause between batches to prevent overwhelming the server
        if (batchIndex < batches.length - 1) {
            await sleep(100);
        }
    }
    
    const totalDuration = Date.now() - startTime;
    console.log(`✅ Completed ${processed} ${batchName} in ${totalDuration}ms (${(processed / (totalDuration / 1000)).toFixed(2)} ops/sec)`);
}

// Test processors
async function createUser(userData, index) {
    const start = Date.now();
    const response = await api.request('POST', '/api/auth/register', userData);
    const duration = Date.now() - start;
    
    if (response.success) {
        results.users.created++;
        results.users.times.push(duration);
        return { success: true, duration };
    } else {
        results.users.failed++;
        if (index < 10) { // Only log first few failures
            console.log(`   User creation failed: ${response.error}`);
        }
        return { success: false, error: response.error, duration };
    }
}

async function createDoor(doorData, index) {
    const start = Date.now();
    const response = await api.request('POST', '/api/doors', doorData);
    const duration = Date.now() - start;
    
    if (response.success) {
        results.doors.created++;
        results.doors.times.push(duration);
        return { success: true, duration };
    } else {
        results.doors.failed++;
        if (index < 10) {
            console.log(`   Door creation failed: ${response.error}`);
        }
        return { success: false, error: response.error, duration };
    }
}

async function createAccessGroup(groupData, index) {
    const start = Date.now();
    const response = await api.request('POST', '/api/access-groups', groupData);
    const duration = Date.now() - start;
    
    if (response.success) {
        results.accessGroups.created++;
        results.accessGroups.times.push(duration);
        return { success: true, duration };
    } else {
        results.accessGroups.failed++;
        if (index < 10) {
            console.log(`   Access group creation failed: ${response.error}`);
        }
        return { success: false, error: response.error, duration };
    }
}

// API endpoint stress tests
async function stressTestEndpoints() {
    console.log('\n🚀 Stress testing API endpoints...');
    
    const endpoints = [
        { method: 'GET', url: '/api/users', name: 'List Users' },
        { method: 'GET', url: '/api/doors', name: 'List Doors' },
        { method: 'GET', url: '/api/access-groups', name: 'List Access Groups' },
        { method: 'GET', url: '/api/dashboard/stats', name: 'Dashboard Stats' }
    ];
    
    for (const endpoint of endpoints) {
        console.log(`\n   Testing ${endpoint.name}...`);
        const promises = [];
        const testStart = Date.now();
        
        // Fire concurrent requests
        for (let i = 0; i < CONFIG.CONCURRENT_REQUESTS; i++) {
            promises.push(api.request(endpoint.method, endpoint.url));
        }
        
        const results = await Promise.allSettled(promises);
        const successful = results.filter(r => r.status === 'fulfilled' && r.value?.success).length;
        const failed = CONFIG.CONCURRENT_REQUESTS - successful;
        const duration = Date.now() - testStart;
        
        console.log(`     ${successful} successful, ${failed} failed in ${duration}ms`);
    }
}

// Memory and performance monitoring
function startMemoryMonitoring() {
    results.memory.start = getMemoryUsage();
    results.memory.peak = results.memory.start;
    
    const interval = setInterval(() => {
        const current = getMemoryUsage();
        if (current > results.memory.peak) {
            results.memory.peak = current;
        }
    }, 1000);
    
    return () => {
        clearInterval(interval);
        results.memory.end = getMemoryUsage();
    };
}

// Generate comprehensive report
function generateReport() {
    const report = {
        timestamp: new Date().toISOString(),
        duration: results.endTime - results.startTime,
        configuration: CONFIG,
        results: {
            users: {
                ...results.users,
                avgTime: results.users.times.length > 0 ? 
                    results.users.times.reduce((a, b) => a + b, 0) / results.users.times.length : 0,
                maxTime: results.users.times.length > 0 ? Math.max(...results.users.times) : 0,
                minTime: results.users.times.length > 0 ? Math.min(...results.users.times) : 0
            },
            doors: {
                ...results.doors,
                avgTime: results.doors.times.length > 0 ? 
                    results.doors.times.reduce((a, b) => a + b, 0) / results.doors.times.length : 0,
                maxTime: results.doors.times.length > 0 ? Math.max(...results.doors.times) : 0,
                minTime: results.doors.times.length > 0 ? Math.min(...results.doors.times) : 0
            },
            accessGroups: {
                ...results.accessGroups,
                avgTime: results.accessGroups.times.length > 0 ? 
                    results.accessGroups.times.reduce((a, b) => a + b, 0) / results.accessGroups.times.length : 0,
                maxTime: results.accessGroups.times.length > 0 ? Math.max(...results.accessGroups.times) : 0,
                minTime: results.accessGroups.times.length > 0 ? Math.min(...results.accessGroups.times) : 0
            },
            api: results.api,
            memory: results.memory,
            performance: {
                totalOperations: results.users.created + results.doors.created + results.accessGroups.created,
                operationsPerSecond: (results.users.created + results.doors.created + results.accessGroups.created) / 
                                   ((results.endTime - results.startTime) / 1000),
                successRate: (results.api.successful / results.api.requests) * 100
            }
        }
    };
    
    return report;
}

// Main stress test execution
async function runStressTest() {
    console.log('🔥 SimplifiAccess Stress Test Starting...');
    console.log(`📊 Target: ${CONFIG.MAX_USERS} users, ${CONFIG.MAX_DOORS} doors, ${CONFIG.MAX_ACCESS_GROUPS} access groups`);
    
    // Ensure output directory exists
    if (!fs.existsSync(CONFIG.OUTPUT_DIR)) {
        fs.mkdirSync(CONFIG.OUTPUT_DIR, { recursive: true });
    }
    
    results.startTime = Date.now();
    const stopMemoryMonitoring = startMemoryMonitoring();
    
    try {
        // Authenticate
        if (!await authenticate()) {
            throw new Error('Authentication failed');
        }
        
        // Test 1: Create Access Groups (needed for doors)
        console.log('\n🏷️  Creating Access Groups...');
        const accessGroups = Array.from({ length: CONFIG.MAX_ACCESS_GROUPS }, (_, i) => 
            generateTestAccessGroup(i + 1)
        );
        await processBatch(accessGroups, createAccessGroup, 'access groups');
        
        // Test 2: Create Doors
        console.log('\n🚪 Creating Doors...');
        const doors = Array.from({ length: CONFIG.MAX_DOORS }, (_, i) => 
            generateTestDoor(i + 1)
        );
        await processBatch(doors, createDoor, 'doors');
        
        // Test 3: Create Users
        console.log('\n👥 Creating Users...');
        const users = Array.from({ length: CONFIG.MAX_USERS }, (_, i) => 
            generateTestUser(i + 1)
        );
        await processBatch(users, createUser, 'users');
        
        // Test 4: API Endpoint Stress Test
        await stressTestEndpoints();
        
        results.endTime = Date.now();
        stopMemoryMonitoring();
        
        // Generate and save report
        const report = generateReport();
        const reportPath = path.join(CONFIG.OUTPUT_DIR, `stress_test_report_${Date.now()}.json`);
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        // Display summary
        console.log('\n📈 STRESS TEST COMPLETE!');
        console.log('=====================================');
        console.log(`Duration: ${((report.duration) / 1000).toFixed(2)} seconds`);
        console.log(`Total Operations: ${report.results.performance.totalOperations}`);
        console.log(`Operations/Second: ${report.results.performance.operationsPerSecond.toFixed(2)}`);
        console.log(`API Success Rate: ${report.results.performance.successRate.toFixed(2)}%`);
        console.log(`Memory Usage: ${results.memory.start.toFixed(2)}MB → ${results.memory.peak.toFixed(2)}MB → ${results.memory.end.toFixed(2)}MB`);
        console.log('\nResults by Category:');
        console.log(`  Users: ${results.users.created} created, ${results.users.failed} failed`);
        console.log(`  Doors: ${results.doors.created} created, ${results.doors.failed} failed`);
        console.log(`  Access Groups: ${results.accessGroups.created} created, ${results.accessGroups.failed} failed`);
        console.log(`\nDetailed report saved to: ${reportPath}`);
        
    } catch (error) {
        console.error('❌ Stress test failed:', error.message);
        results.endTime = Date.now();
        stopMemoryMonitoring();
        
        // Save partial results
        const report = generateReport();
        const errorReportPath = path.join(CONFIG.OUTPUT_DIR, `stress_test_error_${Date.now()}.json`);
        fs.writeFileSync(errorReportPath, JSON.stringify({ error: error.message, ...report }, null, 2));
        console.log(`Error report saved to: ${errorReportPath}`);
    }
}

// Command line interface
if (require.main === module) {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const configOverrides = {};
    
    for (let i = 0; i < args.length; i += 2) {
        const key = args[i]?.replace('--', '');
        const value = args[i + 1];
        
        if (key && value) {
            switch (key) {
                case 'users':
                    configOverrides.MAX_USERS = parseInt(value);
                    break;
                case 'doors':
                    configOverrides.MAX_DOORS = parseInt(value);
                    break;
                case 'groups':
                    configOverrides.MAX_ACCESS_GROUPS = parseInt(value);
                    break;
                case 'concurrent':
                    configOverrides.CONCURRENT_REQUESTS = parseInt(value);
                    break;
                case 'url':
                    configOverrides.BASE_URL = value;
                    break;
            }
        }
    }
    
    Object.assign(CONFIG, configOverrides);
    
    console.log('Configuration:', CONFIG);
    runStressTest().then(() => process.exit(0)).catch(err => {
        console.error('Fatal error:', err);
        process.exit(1);
    });
}

module.exports = { runStressTest, CONFIG };
