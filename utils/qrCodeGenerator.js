const QRCode = require('qrcode');

class QRCodeGenerator {
  /**
   * Generate QR code for door access
   * @param {Object} accessData - Access data to encode
   * @param {number} accessData.doorId - Door ID
   * @param {string} accessData.userId - User ID
   * @param {number} accessData.timestamp - Timestamp
   * @param {string} accessData.secret - Secret key for validation
   * @param {Object} options - QR code options
   * @returns {Promise<string>} Base64 encoded QR code image
   */
  static async generateAccessQR(accessData, options = {}) {
    try {
      const {
        doorId,
        userId,
        timestamp = Date.now(),
        secret
      } = accessData;

      const qrData = {
        type: 'door_access',
        doorId,
        userId,
        timestamp,
        secret
      };

      const qrOptions = {
        type: 'png',
        quality: 0.92,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        width: 256,
        ...options
      };

      const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData), qrOptions);
      return qrCodeDataURL;
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * Generate QR code for door configuration
   * @param {Object} configData - Configuration data to encode
   * @param {string} configData.doorName - Door name
   * @param {string} configData.location - Door location
   * @param {string} configData.wifiSSID - WiFi SSID
   * @param {string} configData.wifiPassword - WiFi password
   * @param {string} configData.serverUrl - Server URL
   * @param {Object} options - QR code options
   * @returns {Promise<string>} Base64 encoded QR code image
   */
  static async generateConfigQR(configData, options = {}) {
    try {
      const {
        doorName,
        location,
        wifiSSID,
        wifiPassword,
        serverUrl
      } = configData;

      const qrData = {
        type: 'door_config',
        doorName,
        location,
        wifi: {
          ssid: wifiSSID,
          password: wifiPassword
        },
        server: {
          url: serverUrl
        },
        timestamp: Date.now()
      };

      const qrOptions = {
        type: 'png',
        quality: 0.92,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        width: 256,
        ...options
      };

      const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData), qrOptions);
      return qrCodeDataURL;
    } catch (error) {
      console.error('Error generating config QR code:', error);
      throw new Error('Failed to generate config QR code');
    }
  }

  /**
   * Generate QR code for user access card
   * @param {Object} userData - User data to encode
   * @param {string} userData.userId - User ID
   * @param {string} userData.username - Username
   * @param {string} userData.name - User's full name
   * @param {Array} userData.accessGroups - User's access groups
   * @param {Object} options - QR code options
   * @returns {Promise<string>} Base64 encoded QR code image
   */
  static async generateUserQR(userData, options = {}) {
    try {
      const {
        userId,
        username,
        name,
        accessGroups = []
      } = userData;

      const qrData = {
        type: 'user_access',
        userId,
        username,
        name,
        accessGroups,
        timestamp: Date.now()
      };

      const qrOptions = {
        type: 'png',
        quality: 0.92,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        width: 256,
        ...options
      };

      const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData), qrOptions);
      return qrCodeDataURL;
    } catch (error) {
      console.error('Error generating user QR code:', error);
      throw new Error('Failed to generate user QR code');
    }
  }

  /**
   * Validate QR code data
   * @param {string} qrDataString - QR code data string
   * @returns {Object} Parsed and validated QR code data
   */
  static validateQRData(qrDataString) {
    try {
      const qrData = JSON.parse(qrDataString);
      
      if (!qrData.type) {
        throw new Error('Invalid QR code: missing type');
      }

      const validTypes = ['door_access', 'door_config', 'user_access'];
      if (!validTypes.includes(qrData.type)) {
        throw new Error('Invalid QR code: unknown type');
      }

      // Check if QR code is not too old (5 minutes for access codes)
      if (qrData.type === 'door_access' && qrData.timestamp) {
        const age = Date.now() - qrData.timestamp;
        const maxAge = 5 * 60 * 1000; // 5 minutes
        if (age > maxAge) {
          throw new Error('QR code expired');
        }
      }

      return qrData;
    } catch (error) {
      console.error('Error validating QR code data:', error);
      throw new Error('Invalid QR code data');
    }
  }

  /**
   * Generate QR code for ESP32 mesh network configuration
   * @param {Object} meshData - Mesh configuration data
   * @param {string} meshData.networkName - Mesh network name
   * @param {string} meshData.password - Mesh network password
   * @param {string} meshData.serverUrl - Server URL
   * @param {Object} options - QR code options
   * @returns {Promise<string>} Base64 encoded QR code image
   */
  static async generateMeshConfigQR(meshData, options = {}) {
    try {
      const {
        networkName,
        password,
        serverUrl,
        nodeId
      } = meshData;

      const qrData = {
        type: 'mesh_config',
        networkName,
        password,
        serverUrl,
        nodeId,
        timestamp: Date.now()
      };

      const qrOptions = {
        type: 'png',
        quality: 0.92,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        width: 256,
        ...options
      };

      const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData), qrOptions);
      return qrCodeDataURL;
    } catch (error) {
      console.error('Error generating mesh config QR code:', error);
      throw new Error('Failed to generate mesh config QR code');
    }
  }
}

module.exports = QRCodeGenerator;