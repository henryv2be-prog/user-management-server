# 🔥 SimplifiAccess Stress Test Suite

Comprehensive stress testing tool to measure the maximum capacity and performance of your door access control system.

## 🎯 What It Tests

- **User Creation**: Up to 10,000 test users
- **Door Management**: Up to 1,000 doors with ESP32 integration
- **Access Groups**: Up to 500 access groups with door linking
- **API Performance**: Concurrent request handling
- **Database Performance**: SQLite under heavy load
- **Memory Usage**: System resource monitoring
- **Response Times**: Detailed timing analysis

## 🚀 Quick Start

### Prerequisites
Make sure your server is running:
```bash
npm start
```

### Run Default Stress Test
```bash
npm run stress-test
```
*Tests: 10,000 users, 1,000 doors, 500 access groups*

### Predefined Test Sizes

#### Small Test (Development)
```bash
npm run stress-test-small
```
*Tests: 100 users, 50 doors, 25 access groups*

#### Medium Test (Production Simulation)
```bash
npm run stress-test-medium
```
*Tests: 1,000 users, 100 doors, 50 access groups*

#### Large Test (Maximum Capacity)
```bash
npm run stress-test-large
```
*Tests: 10,000 users, 1,000 doors, 500 access groups*

## ⚙️ Custom Configuration

### Command Line Options
```bash
node stress_test.js --users 5000 --doors 500 --groups 100 --concurrent 25 --url http://localhost:3000
```

### Available Parameters
- `--users`: Number of test users to create (default: 10000)
- `--doors`: Number of test doors to create (default: 1000)
- `--groups`: Number of access groups to create (default: 500)
- `--concurrent`: Concurrent requests (default: 50)
- `--url`: Server URL (default: http://localhost:3000)

## 📊 Test Results

### Console Output
Real-time progress with:
- Batch processing status
- Success/failure counts
- Response times
- Memory usage
- Operations per second

### Detailed Reports
JSON reports saved to `./stress_test_results/`:
- `stress_test_report_[timestamp].json` - Successful test results
- `stress_test_error_[timestamp].json` - Error reports with partial results

### Sample Report Structure
```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "duration": 45000,
  "results": {
    "users": {
      "created": 10000,
      "failed": 0,
      "avgTime": 125.5,
      "maxTime": 500,
      "minTime": 50
    },
    "doors": {
      "created": 1000,
      "failed": 0,
      "avgTime": 89.2
    },
    "accessGroups": {
      "created": 500,
      "failed": 0,
      "avgTime": 45.8
    },
    "performance": {
      "totalOperations": 11500,
      "operationsPerSecond": 255.6,
      "successRate": 100
    },
    "memory": {
      "start": 25.4,
      "peak": 187.9,
      "end": 156.2
    }
  }
}
```

## 🎛️ Test Configuration

### Default Limits
- **Users**: 10,000 (realistic for large organizations)
- **Doors**: 1,000 (suitable for campus/building complex)
- **Access Groups**: 500 (departmental/role-based groups)
- **Concurrency**: 50 simultaneous requests
- **Batch Size**: 100 items per batch

### Test Data Generation
- **Users**: `testuser1@stresstest.com` to `testuser10000@stresstest.com`
- **Doors**: Sequential naming with realistic ESP32 IPs/MACs
- **Access Groups**: Numbered groups with descriptions
- **Passwords**: Secure test passwords for all users

## 🔍 What Gets Tested

### 1. Data Creation Performance
- Batch processing with concurrency control
- Database insertion speed
- API response times
- Error handling under load

### 2. API Endpoint Stress Testing
- `/api/users` - User listing performance
- `/api/doors` - Door listing with access groups
- `/api/access-groups` - Group management
- `/api/dashboard/stats` - Dashboard statistics

### 3. System Resource Monitoring
- Memory usage patterns
- Response time distribution
- Success/failure rates
- Database query performance

### 4. Concurrent Request Handling
- Multiple simultaneous API calls
- Database connection pooling
- Server stability under load

## 🚨 Important Notes

### Before Running Tests
1. **Backup your database** - Tests create thousands of records
2. **Use a test environment** - Don't run on production data
3. **Ensure sufficient resources** - Tests are resource-intensive
4. **Monitor system performance** - Watch CPU/memory usage

### Test Impact
- Creates thousands of database records
- Generates significant server load
- May temporarily slow down the system
- Results in large database files

### Cleanup
After testing, you may want to:
```bash
# Reset database to clean state
npm run init-db
```

## 📈 Performance Benchmarks

### Expected Results (Development Machine)
- **Small Test**: ~30 seconds, 500+ ops/sec
- **Medium Test**: ~3-5 minutes, 300+ ops/sec  
- **Large Test**: ~15-30 minutes, 200+ ops/sec

### Performance Indicators
- ✅ **Good**: >90% success rate, <200ms avg response
- ⚠️ **Acceptable**: >80% success rate, <500ms avg response
- ❌ **Poor**: <80% success rate, >1000ms avg response

## 🛠️ Troubleshooting

### Common Issues
1. **Authentication Failed**: Ensure default admin exists
2. **Connection Refused**: Start the server first
3. **Out of Memory**: Reduce test sizes or increase system resources
4. **Database Locked**: Close other database connections

### Error Recovery
The test suite includes:
- Automatic retry logic
- Graceful error handling
- Partial result preservation
- Detailed error reporting

## 🎯 Use Cases

### Development
- Validate code changes don't break under load
- Identify performance bottlenecks
- Test database optimization

### Pre-Production
- Capacity planning
- Performance validation
- Load testing before deployment

### Production Monitoring
- Baseline performance measurement
- Regression testing
- System health validation

---

**Happy Stress Testing!** 🚀💪

*This tool helps ensure your SimplifiAccess system can handle real-world loads with confidence.*
