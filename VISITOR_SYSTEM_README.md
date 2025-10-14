# Visitor Management System

This document describes the visitor management system that has been added to the SimplifiAccess server.

## Overview

The visitor system allows users to add visitors to their profile. Each visitor is associated with a specific user and has a validity period. Admin users can view and manage all visitors across the system.

## Features

- **User Association**: Each visitor is linked to a specific user account
- **Validity Period**: Visitors have a start date (`validFrom`) and end date (`validUntil`)
- **Contact Information**: Visitors can have name, email, and phone number
- **Admin Management**: Admin users can view and edit all visitors
- **Self-Service**: Users can manage their own visitors
- **Audit Trail**: All visitor operations are logged in the events system

## Database Schema

### Visitors Table

```sql
CREATE TABLE visitors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    valid_from DATETIME NOT NULL,
    valid_until DATETIME NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL
);
```

## API Endpoints

### Base URL: `/api/visitors`

#### 1. Get All Visitors (Admin Only)
- **GET** `/all`
- **Query Parameters:**
  - `userId` (optional): Filter by specific user ID
  - `search` (optional): Search by name or email
  - `page` (optional): Page number for pagination
  - `limit` (optional): Number of items per page
  - `activeOnly` (optional): Show only active visitors
  - `validOnly` (optional): Show only currently valid visitors

#### 2. Get Visitors for Specific User
- **GET** `/user/:userId`
- **Query Parameters:** Same as above (except `userId`)

#### 3. Get Visitor by ID
- **GET** `/:id`
- **Authorization:** User can access their own visitors, admin can access all

#### 4. Create Visitor
- **POST** `/`
- **Body:**
  ```json
  {
    "userId": 1,
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "phone": "+1234567890",
    "validFrom": "2024-01-01T00:00:00.000Z",
    "validUntil": "2024-01-08T00:00:00.000Z"
  }
  ```

#### 5. Update Visitor
- **PUT** `/:id`
- **Body:** Same as create (all fields optional)

#### 6. Delete Visitor
- **DELETE** `/:id`

#### 7. Get Visitor Statistics (Admin Only)
- **GET** `/stats/overview`

## User Roles

The system now supports three user roles:
- **user**: Regular users who can manage their own visitors
- **admin**: Can manage all visitors and access admin-only endpoints
- **visitor**: Reserved for future use (currently not implemented in authentication)

## Authorization Rules

1. **Users** can only:
   - Create visitors for their own account
   - View and manage their own visitors
   - Access visitor statistics (if admin)

2. **Admins** can:
   - View all visitors across the system
   - Create visitors for any user
   - Edit and delete any visitor
   - Access visitor statistics

## Validation Rules

- **firstName**: Required, 1-50 characters
- **lastName**: Required, 1-50 characters
- **email**: Optional, must be valid email format
- **phone**: Optional, max 20 characters
- **validFrom**: Required, must be valid ISO8601 date
- **validUntil**: Required, must be valid ISO8601 date and after validFrom
- **userId**: Required, must be positive integer

## Event Logging

All visitor operations are logged in the events system:
- `visitor:created`
- `visitor:updated`
- `visitor:deleted`

## Usage Examples

### Creating a Visitor (User)
```javascript
const response = await fetch('/api/visitors', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify({
    userId: 1,
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@example.com',
    phone: '+1234567890',
    validFrom: '2024-01-01T00:00:00.000Z',
    validUntil: '2024-01-07T23:59:59.000Z'
  })
});
```

### Getting All Visitors (Admin)
```javascript
const response = await fetch('/api/visitors/all?page=1&limit=10&activeOnly=true', {
  headers: {
    'Authorization': 'Bearer ADMIN_TOKEN'
  }
});
```

### Updating a Visitor
```javascript
const response = await fetch('/api/visitors/123', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify({
    firstName: 'Updated Name',
    validUntil: '2024-01-15T23:59:59.000Z'
  })
});
```

## Database Migration

The visitor system includes a database migration that:
1. Creates the `visitors` table
2. Adds necessary indexes for performance
3. Sets up foreign key relationships

To run the migration:
```bash
node database/migrations/002_add_visitors_table.js
```

## Testing

A test script is provided to verify the visitor API functionality:
```bash
node test_visitor_api.js
```

## Future Enhancements

Potential future improvements:
1. Visitor access control integration with doors
2. QR code generation for visitors
3. Visitor check-in/check-out functionality
4. Email notifications for visitor creation/expiration
5. Bulk visitor import/export
6. Visitor photo upload
7. Visitor access reports and analytics