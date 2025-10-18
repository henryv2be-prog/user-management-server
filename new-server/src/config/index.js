import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

export const config = {
  // Server Configuration
  port: parseInt(process.env.PORT) || 3001,
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database Configuration
  database: {
    path: process.env.DB_PATH || path.join(__dirname, '../../database/users.db'),
    type: process.env.DB_TYPE || 'sqlite'
  },
  
  // Security Configuration
  security: {
    jwtSecret: process.env.JWT_SECRET || 'default-secret-change-in-production',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12
  },
  
  // Admin Configuration
  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@simplifiaccess.com',
    password: process.env.ADMIN_PASSWORD || 'admin123456',
    firstName: process.env.ADMIN_FIRST_NAME || 'Admin',
    lastName: process.env.ADMIN_LAST_NAME || 'User'
  },
  
  // ESP32 Configuration
  esp32: {
    heartbeatTimeout: parseInt(process.env.ESP32_HEARTBEAT_TIMEOUT) || 180000,
    rateLimitWindow: parseInt(process.env.ESP32_RATE_LIMIT_WINDOW) || 60000,
    rateLimitMax: parseInt(process.env.ESP32_RATE_LIMIT_MAX) || 300
  },
  
  // CORS Configuration
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: process.env.CORS_CREDENTIALS === 'true'
  },
  
  // Rate Limiting
  rateLimit: {
    window: parseInt(process.env.RATE_LIMIT_WINDOW) || 900000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX) || 1000,
    authMax: parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 10
  },
  
  // WebSocket Configuration
  websocket: {
    port: parseInt(process.env.WS_PORT) || 3002,
    path: process.env.WS_PATH || '/ws'
  },
  
  // External Services
  external: {
    webhookUrl: process.env.WEBHOOK_URL || '',
    apiUrl: process.env.EXTERNAL_API_URL || ''
  }
};

export default config;