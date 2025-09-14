# Terminal Stress Test Script

A simple, reliable stress test script that runs in the terminal to test your access control system.

## Usage

```bash
# Basic usage (default settings)
node stress-test-terminal.js

# Custom configuration
node stress-test-terminal.js [users] [doors] [access-groups] [duration-seconds] [events-per-second]
```

## Examples

```bash
# Quick test: 3 users, 2 doors, 1 access group, 10 seconds, 1 event/second
node stress-test-terminal.js 3 2 1 10 1

# Medium test: 5 users, 3 doors, 2 access groups, 30 seconds, 2 events/second
node stress-test-terminal.js 5 3 2 30 2

# Heavy test: 10 users, 5 doors, 3 access groups, 60 seconds, 5 events/second
node stress-test-terminal.js 10 5 3 60 5
```

## What It Does

### Phase 1: Create Test Data
- Creates test users with realistic data
- Creates test doors with ESP32 configurations
- Creates test access groups
- All data appears in your dashboard

### Phase 2: Simulate Access Events
- Randomly selects users and doors
- Simulates access granted/denied events (70% success rate)
- Creates realistic event logs
- Events appear in your event dashboard

### Phase 3: Cleanup
- Removes all test data
- Cleans up users, doors, access groups, and events
- Dashboard returns to original state

## Features

- ✅ **Color-coded output** - Easy to read progress
- ✅ **Realistic test data** - Creates actual users, doors, access groups
- ✅ **Access event simulation** - Tests real access control scenarios
- ✅ **Automatic cleanup** - No leftover test data
- ✅ **Error handling** - Graceful failure handling
- ✅ **Progress tracking** - Shows what's happening at each step

## Output Example

```
==================================================
  STRESS TEST STARTING
==================================================
ℹ️  Configuration:
ℹ️    Users: 5
ℹ️    Doors: 3
ℹ️    Access Groups: 2
ℹ️    Duration: 30 seconds
ℹ️    Request Rate: 2 events/second

==================================================
  PHASE 1: CREATING TEST DATA
==================================================
[1] Creating 5 test users...
✅ Created user: testuser12345678900@test.com (ID: 123)
✅ Created user: testuser12345678901@test.com (ID: 124)
...

==================================================
  PHASE 2: SIMULATING ACCESS EVENTS
==================================================
[4] Simulating access events for 30 seconds...
ℹ️  Simulated access_granted for user 123 at door 125 (Event ID: 456)
ℹ️  Simulated access_denied for user 124 at door 126 (Event ID: 457)
...

==================================================
  TEST RESULTS
==================================================
ℹ️  Users created: 5
ℹ️  Doors created: 3
ℹ️  Access groups created: 2
ℹ️  Access events simulated: 60

==================================================
  PHASE 3: CLEANUP
==================================================
[5] Cleaning up test data...
✅ Cleaned up 60 test events
✅ Cleaned up user 123
...

==================================================
  STRESS TEST COMPLETED
==================================================
✅ All phases completed successfully!
ℹ️  Check your dashboard to see the test data that was created and cleaned up.
```

## Requirements

- Node.js
- SQLite3 database
- bcryptjs package

## Installation

The script uses the same dependencies as your main application, so no additional installation is needed.