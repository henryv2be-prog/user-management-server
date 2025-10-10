# SimplifiAccess Webhook System

## Overview

The SimplifiAccess webhook system provides a robust, event-driven architecture for integrating with external systems. It complements the existing Server-Sent Events (SSE) system by providing reliable, asynchronous notifications to external services.

## Architecture

### Hybrid Approach
- **SSE**: Real-time updates for web dashboards and admin interfaces
- **Webhooks**: Reliable notifications for external systems, mobile apps, and third-party integrations

### Key Features
- ✅ **Reliable Delivery**: Automatic retry with exponential backoff
- ✅ **Signature Verification**: HMAC-SHA256 signature validation
- ✅ **Event Filtering**: Subscribe to specific events only
- ✅ **Delivery Tracking**: Monitor webhook delivery status
- ✅ **Test Endpoints**: Built-in webhook testing capabilities
- ✅ **Non-blocking**: Webhook failures don't affect main operations

## Webhook Events

### Access Request Events
- `access_request.created` - New access request submitted
- `access_request.granted` - Access request approved
- `access_request.denied` - Access request rejected
- `access_request.expired` - Access request expired

### Door Events
- `door.opened` - Door opened successfully
- `door.closed` - Door closed
- `door.online` - Door came online
- `door.offline` - Door went offline

### User Events
- `user.login` - User logged in
- `user.logout` - User logged out

### System Events
- `system.startup` - System started
- `system.shutdown` - System shutting down
- `system.error` - System error occurred

## API Endpoints

### Webhook Management

#### Create Webhook
```http
POST /api/webhooks
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "name": "Slack Notifications",
  "url": "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK",
  "events": ["access_request.granted", "access_request.denied", "door.offline"],
  "retryAttempts": 3,
  "timeout": 5000
}
```

#### List Webhooks
```http
GET /api/webhooks
Authorization: Bearer <admin-token>
```

#### Update Webhook
```http
PUT /api/webhooks/{id}
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "name": "Updated Name",
  "active": false
}
```

#### Delete Webhook
```http
DELETE /api/webhooks/{id}
Authorization: Bearer <admin-token>
```

#### Test Webhook
```http
POST /api/webhooks/{id}/test
Authorization: Bearer <admin-token>
```

#### Get Delivery History
```http
GET /api/webhooks/{id}/deliveries
Authorization: Bearer <admin-token>
```

## Webhook Payload Format

### Access Request Granted
```json
{
  "event": "access_request.granted",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "data": {
    "requestId": 123,
    "userId": 456,
    "doorId": 789,
    "requestType": "qr_scan",
    "status": "granted",
    "reason": "Access granted",
    "user": {
      "id": 456,
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe"
    },
    "door": {
      "id": 789,
      "name": "Main Entrance",
      "location": "Building A"
    }
  }
}
```

### Door Opened
```json
{
  "event": "door.opened",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "data": {
    "doorId": 789,
    "doorName": "Main Entrance",
    "location": "Building A",
    "esp32Ip": "192.168.1.100",
    "action": "open",
    "triggeredBy": {
      "id": 456,
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe"
    }
  }
}
```

## Webhook Headers

Each webhook request includes these headers:
- `Content-Type: application/json`
- `X-Webhook-Signature: sha256=<signature>`
- `X-Webhook-Event: <event-name>`
- `X-Webhook-Delivery: <delivery-id>`
- `User-Agent: SimplifiAccess-Webhook/1.0`

## Signature Verification

Webhooks are signed using HMAC-SHA256. Verify signatures to ensure authenticity:

```javascript
const crypto = require('crypto');

function verifySignature(payload, signature, secret) {
  const hash = signature.replace('sha256=', '');
  const expectedHash = crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(hash, 'hex'),
    Buffer.from(expectedHash, 'hex')
  );
}
```

## Integration Examples

### Slack Integration
```javascript
// Slack webhook handler
app.post('/webhook', (req, res) => {
  const { event, data } = req.body;
  
  if (event === 'access_request.denied') {
    const message = `🚨 Access denied for ${data.user.email} at ${data.door.name}`;
    sendSlackMessage(message);
  }
  
  res.status(200).json({ success: true });
});
```

### Email Notifications
```javascript
// Email webhook handler
app.post('/webhook', (req, res) => {
  const { event, data } = req.body;
  
  if (event === 'access_request.granted') {
    sendEmail({
      to: data.user.email,
      subject: 'Access Granted',
      body: `Your access request for ${data.door.name} has been granted.`
    });
  }
  
  res.status(200).json({ success: true });
});
```

### Mobile App Push Notifications
```javascript
// Mobile push notification handler
app.post('/webhook', (req, res) => {
  const { event, data } = req.body;
  
  if (event === 'door.offline') {
    sendPushNotification({
      userId: data.userId,
      title: 'Door Offline',
      body: `${data.doorName} is currently offline`
    });
  }
  
  res.status(200).json({ success: true });
});
```

## Retry Logic

Webhooks use exponential backoff for retries:
- **Attempt 1**: Immediate
- **Attempt 2**: 1 second delay
- **Attempt 3**: 2 second delay
- **Attempt 4**: 4 second delay
- **Max Attempts**: Configurable (default: 3)

## Delivery Status

Track webhook delivery status:
- `pending` - Waiting to be sent
- `delivered` - Successfully delivered
- `retrying` - Retrying after failure
- `failed` - Permanently failed

## Security Considerations

1. **Signature Verification**: Always verify webhook signatures
2. **HTTPS Only**: Use HTTPS endpoints for webhooks
3. **Secret Management**: Store webhook secrets securely
4. **Rate Limiting**: Implement rate limiting on webhook endpoints
5. **Input Validation**: Validate all webhook payloads

## Performance Impact

- **Non-blocking**: Webhook processing doesn't block main operations
- **Async Processing**: Webhooks are sent asynchronously
- **Memory Efficient**: Failed webhooks are cleaned up automatically
- **Scalable**: Supports multiple webhook endpoints per event

## Monitoring and Debugging

### Webhook Delivery Logs
```javascript
// Check delivery status
GET /api/webhooks/{id}/deliveries
```

### Test Webhooks
```javascript
// Send test webhook
POST /api/webhooks/{id}/test
```

### Event Logging
All webhook activities are logged in the main event system for audit purposes.

## Migration from SSE

If you're currently using SSE and want to migrate to webhooks:

1. **Keep SSE** for real-time dashboard updates
2. **Add Webhooks** for external integrations
3. **Gradually migrate** external systems to webhooks
4. **Monitor performance** during transition

## Best Practices

1. **Idempotency**: Make webhook handlers idempotent
2. **Timeout Handling**: Set appropriate timeouts
3. **Error Handling**: Handle webhook failures gracefully
4. **Logging**: Log all webhook activities
5. **Testing**: Test webhooks thoroughly before production

## Troubleshooting

### Common Issues

1. **Webhook Not Received**
   - Check webhook URL accessibility
   - Verify signature validation
   - Check firewall/proxy settings

2. **Signature Verification Failed**
   - Ensure secret matches exactly
   - Check payload encoding
   - Verify signature format

3. **Webhook Timeout**
   - Increase timeout setting
   - Optimize webhook handler performance
   - Check network connectivity

4. **Retry Loops**
   - Check webhook endpoint health
   - Verify response format
   - Review error handling

### Debug Commands

```bash
# Test webhook endpoint
curl -X POST http://localhost:3000/api/webhooks/{id}/test \
  -H "Authorization: Bearer <token>"

# Check webhook deliveries
curl -X GET http://localhost:3000/api/webhooks/{id}/deliveries \
  -H "Authorization: Bearer <token>"
```

## Conclusion

The webhook system provides a robust, scalable solution for integrating SimplifiAccess with external systems. It complements the existing SSE system while providing better reliability and integration capabilities for third-party services.

For questions or support, please refer to the main SimplifiAccess documentation or contact the development team.

---

Note: This guide was updated to reflect standardized webhook payloads
(`{ event, timestamp, data }`), expanded event coverage (including a catch-all
subscription), and recommendations for client-side polling for in-app live
events.