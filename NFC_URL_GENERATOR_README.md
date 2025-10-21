# NFC URL Generator for SimplifiAccess

This tool allows you to generate NFC-compatible URLs that can be written to NFC cards. When someone scans the NFC card, it will automatically open the SimplifiAccess mobile app and process the door access request.

## 🚀 Quick Start

### Option 1: Web Interface (Recommended)
1. Start your SimplifiAccess server
2. Open your browser and go to: `http://your-server-ip:3000/nfc-generator`
3. Select a door tag from the dropdown
4. Copy the generated URL
5. Use an NFC writing app to write the URL to your NFC card

### Option 2: Command Line Tool
```bash
# Generate URL for a specific tag
node nfc-url-generator.js --tag-id TEST123

# List all available door tags
node nfc-url-generator.js --list-tags

# Generate URLs for all door tags
node nfc-url-generator.js --generate-all
```

## 📱 How It Works

1. **URL Format**: `simplifiaccess://scan?tagId=<TAG_ID>`
2. **Mobile App**: The SimplifiAccess mobile app is configured to handle this URL scheme
3. **Deep Linking**: When the URL is opened, it automatically navigates to the NFC scanner screen
4. **Access Request**: The app processes the tagId and sends an access request to the server

## 🔧 Prerequisites

### Server Setup
- SimplifiAccess server must be running
- Door tags must be created and associated with doors
- Mobile app must be installed on the target device

### Door Tags
Before generating NFC URLs, you need to create door tags:
1. Go to the admin interface
2. Navigate to Door Management
3. Select a door
4. Add a new door tag with a unique tag ID

### Mobile App Configuration
The mobile app must be configured with:
- Server URL (where your SimplifiAccess server is running)
- User authentication (login credentials)

## 📋 Step-by-Step Instructions

### 1. Create Door Tags
First, create door tags in your admin interface:
- Tag ID: A unique identifier (e.g., "MAIN_DOOR_001")
- Tag Type: "nfc" for NFC cards
- Associated Door: Select which door this tag should open

### 2. Generate NFC URL
Use either the web interface or command line tool:
- **Web Interface**: Visit `/nfc-generator` on your server
- **Command Line**: Run `node nfc-url-generator.js --tag-id YOUR_TAG_ID`

### 3. Write to NFC Card
Use an NFC writing app (like "NFC Tools" on Android or "NFC TagWriter" on iOS):
1. Open the NFC writing app
2. Select "Write" or "Write URL"
3. Paste the generated URL
4. Place your phone over the NFC card
5. Confirm the write operation

### 4. Test the NFC Card
1. Open the SimplifiAccess mobile app
2. Make sure you're logged in
3. Tap the NFC card with your phone
4. The app should automatically open and process the access request

## 🛠️ Technical Details

### URL Scheme
The mobile app uses the custom URL scheme: `simplifiaccess://`

### Deep Link Handling
The app's `App.js` file contains the deep link handler:
```javascript
const handleUrl = (url) => {
  if (url.includes('scan')) {
    const urlObj = new URL(url);
    const tagId = urlObj.searchParams.get('tagId');
    // Process the tagId...
  }
};
```

### Access Request Flow
1. NFC card contains URL: `simplifiaccess://scan?tagId=TEST123`
2. Mobile app opens and extracts `tagId=TEST123`
3. App sends POST request to `/api/access-requests/request` with the tagId
4. Server looks up the door associated with the tagId
5. Server checks user permissions and grants/denies access
6. If granted, door opens via ESP32 controller

## 🔍 Troubleshooting

### Common Issues

**"Tag ID not found"**
- Verify the tag exists in the database
- Check the tag ID spelling
- Ensure the door tag is properly associated with a door

**"App doesn't open when scanning NFC"**
- Verify the URL was written correctly to the NFC card
- Check that the SimplifiAccess app is installed
- Test the URL by opening it manually in a browser

**"Access denied"**
- Ensure the user is logged into the mobile app
- Check that the user has permission to access the door
- Verify the door is online and accessible

**"Server connection failed"**
- Check that the server is running
- Verify the server URL in the mobile app settings
- Ensure both devices are on the same network

### Debug Steps

1. **Test URL manually**: Copy the generated URL and paste it into a browser
2. **Check server logs**: Look for access request attempts in the server console
3. **Verify database**: Check that door tags exist in the database
4. **Test mobile app**: Try scanning the NFC card with the mobile app

## 📊 Database Schema

The door tags are stored in the `door_tags` table:
```sql
CREATE TABLE door_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  door_id INTEGER NOT NULL,
  tag_id TEXT NOT NULL UNIQUE,
  tag_type TEXT NOT NULL CHECK (tag_type IN ('nfc', 'qr')),
  tag_data TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (door_id) REFERENCES doors (id) ON DELETE CASCADE
);
```

## 🔐 Security Considerations

- NFC cards can be easily copied, so use them for convenience, not security
- Always verify user permissions on the server side
- Consider implementing time-based access or usage limits
- Monitor access logs for suspicious activity

## 📱 Supported NFC Apps

### Android
- **NFC Tools** (Recommended)
- **NFC TagWriter by NXP**
- **Trigger**

### iOS
- **NFC TagWriter by NXP**
- **NFC Tools**
- **Shortcuts** (for advanced users)

## 🚀 Advanced Usage

### Batch Generation
Generate URLs for multiple tags at once:
```bash
node nfc-url-generator.js --generate-all
```

### QR Code Generation
Install the qrcode package to generate QR codes:
```bash
npm install qrcode
node nfc-url-generator.js --generate-all
```

### Custom URL Schemes
You can modify the URL scheme in the generator by changing the `URL_SCHEME` constant in `nfc-url-generator.js`.

## 📞 Support

If you encounter issues:
1. Check the server logs for error messages
2. Verify your database has the required tables and data
3. Test the mobile app connection to the server
4. Ensure all prerequisites are met

For additional help, refer to the main SimplifiAccess documentation or check the GitHub repository.