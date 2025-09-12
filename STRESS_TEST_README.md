# SimplifiAccess Stress Test

This directory contains stress testing tools for the SimplifiAccess application deployed on Render.

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm
- Your Render app URL

### Running the Stress Test

1. **Update the URL**: Edit `stress-test.js` and replace `https://your-app-name.onrender.com` with your actual Render app URL.

2. **Run the test**:
   ```bash
   # Using the script
   ./run-stress-test.sh https://your-app-name.onrender.com
   
   # Or directly with Node.js
   TEST_URL=https://your-app-name.onrender.com node stress-test.js
   ```

## 📊 What the Stress Test Does

### Test Scenarios

1. **Health Check**
   - Tests basic connectivity to your app
   - Measures response time for the root endpoint

2. **Authentication Performance**
   - Tests login performance with multiple users
   - Measures token generation speed

3. **Database Operations**
   - Creates test users, doors, and access groups
   - Tests CRUD operations under load

4. **Concurrent User Simulation**
   - Simulates 10 concurrent users
   - Each user makes 20 requests with random delays
   - Tests various API endpoints

5. **Sustained Load Test**
   - Runs continuous requests for 30 seconds
   - Tests server stability under sustained load

### Metrics Tracked

- **Response Times**: Min, max, and average
- **Success Rate**: Percentage of successful requests
- **Throughput**: Requests per second
- **Error Analysis**: Categorized error tracking
- **Performance Analysis**: Automated performance assessment

## ⚙️ Configuration

You can modify the test parameters in `stress-test.js`:

```javascript
const CONFIG = {
    BASE_URL: 'https://your-app-name.onrender.com',
    CONCURRENT_USERS: 10,           // Number of concurrent users
    REQUESTS_PER_USER: 20,          // Requests per user
    DELAY_BETWEEN_REQUESTS: 100,    // Delay in milliseconds
    TEST_DURATION: 30000,           // Test duration in milliseconds
    TIMEOUT: 10000                  // Request timeout in milliseconds
};
```

## 📈 Understanding the Results

### Success Indicators
- ✅ **Success Rate > 95%**: Server is stable
- ✅ **Average Response Time < 1000ms**: Good performance
- ✅ **Throughput > 5 req/s**: Good capacity
- ✅ **Max Response Time < 10000ms**: No major bottlenecks

### Warning Signs
- ⚠️ **Success Rate < 95%**: Server instability
- ⚠️ **Average Response Time > 2000ms**: Performance issues
- ⚠️ **Max Response Time > 10000ms**: Potential bottlenecks
- ⚠️ **Throughput < 1 req/s**: Low capacity

## 🔧 Troubleshooting

### Common Issues

1. **Connection Timeouts**
   - Check if your Render app is running
   - Verify the URL is correct
   - Check Render app logs for errors

2. **High Error Rates**
   - Check server logs on Render
   - Verify database connections
   - Check memory usage on Render

3. **Slow Response Times**
   - Check Render app performance metrics
   - Consider upgrading Render plan
   - Check for database bottlenecks

### Render-Specific Considerations

- **Cold Starts**: Render apps may have cold start delays
- **Resource Limits**: Free tier has limited resources
- **Database Connections**: Check connection pooling
- **Memory Usage**: Monitor memory consumption

## 📋 Test Data

The stress test uses the following test users:

```javascript
const TEST_USERS = [
    { email: 'testuser1@example.com', password: 'password123', role: 'user' },
    { email: 'testuser2@example.com', password: 'password123', role: 'user' },
    { email: 'testuser3@example.com', password: 'password123', role: 'user' },
    { email: 'admin@example.com', password: 'admin123', role: 'admin' }
];
```

**Note**: Make sure these test users exist in your database before running the test.

## 🎯 Performance Benchmarks

### Expected Performance (Render Free Tier)
- **Success Rate**: 90-95%
- **Average Response Time**: 500-1500ms
- **Throughput**: 2-5 requests/second
- **Max Response Time**: 5000-10000ms

### Expected Performance (Render Paid Tier)
- **Success Rate**: 95-99%
- **Average Response Time**: 200-800ms
- **Throughput**: 10-50 requests/second
- **Max Response Time**: 2000-5000ms

## 🔄 Continuous Testing

To run stress tests regularly:

1. **Set up a cron job**:
   ```bash
   # Run every hour
   0 * * * * cd /path/to/stress-test && ./run-stress-test.sh
   ```

2. **Integrate with CI/CD**:
   ```yaml
   # GitHub Actions example
   - name: Run Stress Test
     run: |
       cd stress-test
       ./run-stress-test.sh ${{ secrets.RENDER_URL }}
   ```

## 📞 Support

If you encounter issues with the stress test:

1. Check the Render app logs
2. Verify all test users exist in the database
3. Ensure the app is running and accessible
4. Check network connectivity

## 📝 Customization

You can customize the stress test by:

1. **Adding new test scenarios** in `stress-test.js`
2. **Modifying test data** in the `TEST_USERS` array
3. **Adjusting load parameters** in the `CONFIG` object
4. **Adding new endpoints** to test

## 🚨 Important Notes

- The stress test creates test data in your database
- Run tests during off-peak hours
- Monitor your Render app during testing
- Consider the impact on other users
- Clean up test data after testing if needed