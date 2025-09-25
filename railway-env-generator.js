#!/usr/bin/env node

const crypto = require('crypto');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🚂 Railway Environment Variable Generator for SimplifiAccess v3.0.0\n');

// Generate secrets
const jwtSecret = crypto.randomBytes(64).toString('hex');
const sessionSecret = crypto.randomBytes(64).toString('hex');
const adminPassword = crypto.randomBytes(16).toString('hex');

// Questions to ask
const questions = [
  { key: 'adminEmail', prompt: 'Enter admin email (default: admin@example.com): ', default: 'admin@example.com' },
  { key: 'frontendUrl', prompt: 'Enter frontend URL (default: *, use * for testing): ', default: '*' }
];

let answers = {};
let currentQuestion = 0;

function askQuestion() {
  if (currentQuestion < questions.length) {
    const q = questions[currentQuestion];
    rl.question(q.prompt, (answer) => {
      answers[q.key] = answer || q.default;
      currentQuestion++;
      askQuestion();
    });
  } else {
    generateOutput();
  }
}

function generateOutput() {
  console.log('\n📋 Copy everything below and paste it into Railway\'s RAW editor:\n');
  console.log('='.repeat(70));
  
  const envVars = `# REQUIRED - Your app won't start without these
JWT_SECRET=${jwtSecret}
NODE_ENV=production
PORT=${{PORT}}
DB_PATH=/app/database/users.db

# Admin Account (CHANGE THE PASSWORD AFTER FIRST LOGIN!)
ADMIN_EMAIL=${answers.adminEmail}
ADMIN_PASSWORD=${adminPassword}
ADMIN_FIRST_NAME=Admin
ADMIN_LAST_NAME=User

# Your Domain
FRONTEND_URL=${answers.frontendUrl}
RENDER_EXTERNAL_URL=${{RAILWAY_PUBLIC_DOMAIN}}

# Security Settings
BCRYPT_ROUNDS=12
SESSION_SECRET=${sessionSecret}

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_MAX_REQUESTS=5

# Database Pool
DB_POOL_MAX_CONNECTIONS=10
DB_POOL_IDLE_TIMEOUT=60000

# Logging
LOG_LEVEL=info
LOG_FORMAT=json`;

  console.log(envVars);
  console.log('='.repeat(70));
  
  console.log('\n⚠️  IMPORTANT REMINDERS:');
  console.log(`   - Admin password: ${adminPassword} (CHANGE THIS AFTER FIRST LOGIN!)`);
  console.log('   - Save these secrets somewhere safe');
  console.log('   - Never commit secrets to Git');
  console.log('   - Update FRONTEND_URL when you have your domain\n');
  
  rl.close();
}

// Start the questionnaire
console.log('Please answer a few questions to generate your config:\n');
askQuestion();