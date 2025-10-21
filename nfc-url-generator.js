#!/usr/bin/env node

/**
 * NFC URL Generator for SimplifiAccess
 * 
 * This script generates NFC-compatible URLs that can be written to NFC cards.
 * When the NFC card is scanned, it will open the SimplifiAccess mobile app
 * and automatically process the door access request.
 * 
 * Usage:
 *   node nfc-url-generator.js --tag-id TEST123
 *   node nfc-url-generator.js --list-tags
 *   node nfc-url-generator.js --generate-all
 */

const { DoorTag } = require('./database/doorTag');
const { Door } = require('./database/door');
const fs = require('fs');
const path = require('path');

// URL scheme for the mobile app
const URL_SCHEME = 'simplifiaccess://scan';

class NFCUrlGenerator {
  constructor() {
    this.results = [];
  }

  /**
   * Generate NFC URL for a specific tag ID
   */
  generateUrlForTag(tagId) {
    return `${URL_SCHEME}?tagId=${encodeURIComponent(tagId)}`;
  }

  /**
   * List all available door tags
   */
  async listDoorTags() {
    try {
      console.log('🔍 Fetching door tags from database...\n');
      
      const doorTags = await DoorTag.findAll();
      
      if (doorTags.length === 0) {
        console.log('❌ No door tags found in database.');
        console.log('   You need to create door tags first using the admin interface.\n');
        return [];
      }

      console.log('📋 Available Door Tags:\n');
      console.log('┌─────────────┬─────────────┬─────────────┬─────────────────────────────┐');
      console.log('│ Tag ID      │ Door ID     │ Type        │ Door Name                   │');
      console.log('├─────────────┼─────────────┼─────────────┼─────────────────────────────┤');

      for (const tag of doorTags) {
        const doorName = tag.door ? tag.door.name : 'Unknown';
        const doorId = tag.doorId || 'N/A';
        console.log(`│ ${tag.tagId.padEnd(11)} │ ${doorId.toString().padEnd(11)} │ ${tag.tagType.padEnd(11)} │ ${doorName.padEnd(27)} │`);
      }
      
      console.log('└─────────────┴─────────────┴─────────────┴─────────────────────────────┘\n');
      
      return doorTags;
    } catch (error) {
      console.error('❌ Error fetching door tags:', error.message);
      return [];
    }
  }

  /**
   * Generate URLs for all door tags
   */
  async generateAllUrls() {
    const doorTags = await this.listDoorTags();
    
    if (doorTags.length === 0) {
      return;
    }

    console.log('🔗 Generated NFC URLs:\n');
    
    for (const tag of doorTags) {
      const url = this.generateUrlForTag(tag.tagId);
      const doorName = tag.door ? tag.door.name : 'Unknown Door';
      
      console.log(`📱 Tag ID: ${tag.tagId}`);
      console.log(`🚪 Door: ${doorName} (ID: ${tag.doorId})`);
      console.log(`🔗 URL: ${url}`);
      console.log('─'.repeat(80));
      
      this.results.push({
        tagId: tag.tagId,
        doorId: tag.doorId,
        doorName: doorName,
        url: url,
        tagType: tag.tagType
      });
    }
  }

  /**
   * Generate URL for a specific tag ID
   */
  async generateUrlForSpecificTag(tagId) {
    try {
      console.log(`🔍 Looking for tag ID: ${tagId}\n`);
      
      const doorTag = await DoorTag.findByTagId(tagId);
      
      if (!doorTag) {
        console.log(`❌ Tag ID '${tagId}' not found in database.`);
        console.log('   Available tag IDs:');
        
        const allTags = await DoorTag.findAll();
        if (allTags.length > 0) {
          allTags.forEach(tag => console.log(`   - ${tag.tagId}`));
        } else {
          console.log('   No tags found in database.');
        }
        return null;
      }

      const url = this.generateUrlForTag(tagId);
      const doorName = doorTag.door ? doorTag.door.name : 'Unknown Door';
      
      console.log('✅ Tag found!');
      console.log(`📱 Tag ID: ${tagId}`);
      console.log(`🚪 Door: ${doorName} (ID: ${doorTag.doorId})`);
      console.log(`🔗 NFC URL: ${url}\n`);
      
      console.log('📋 Instructions:');
      console.log('1. Copy the URL above');
      console.log('2. Use an NFC writing app (like NFC Tools) to write this URL to your NFC card');
      console.log('3. When someone scans the NFC card, it will open the SimplifiAccess app');
      console.log('4. The app will automatically process the door access request\n');
      
      return {
        tagId: tagId,
        doorId: doorTag.doorId,
        doorName: doorName,
        url: url,
        tagType: doorTag.tagType
      };
    } catch (error) {
      console.error('❌ Error generating URL for tag:', error.message);
      return null;
    }
  }

  /**
   * Save results to a file
   */
  saveResults(filename = 'nfc-urls.json') {
    if (this.results.length === 0) {
      console.log('⚠️  No results to save.');
      return;
    }

    const outputPath = path.join(__dirname, filename);
    
    try {
      fs.writeFileSync(outputPath, JSON.stringify(this.results, null, 2));
      console.log(`💾 Results saved to: ${outputPath}`);
    } catch (error) {
      console.error('❌ Error saving results:', error.message);
    }
  }

  /**
   * Generate QR codes for URLs (requires qrcode package)
   */
  async generateQRCodes() {
    try {
      const qrcode = require('qrcode');
      
      console.log('📱 Generating QR codes...\n');
      
      for (const result of this.results) {
        const qrCodePath = path.join(__dirname, `qr-${result.tagId}.png`);
        
        try {
          await qrcode.toFile(qrCodePath, result.url, {
            width: 300,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            }
          });
          
          console.log(`✅ QR code generated: ${qrCodePath}`);
        } catch (error) {
          console.error(`❌ Error generating QR code for ${result.tagId}:`, error.message);
        }
      }
    } catch (error) {
      console.log('⚠️  QR code generation requires the "qrcode" package.');
      console.log('   Install it with: npm install qrcode');
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const generator = new NFCUrlGenerator();

  console.log('🔐 SimplifiAccess NFC URL Generator\n');

  if (args.includes('--help') || args.includes('-h')) {
    console.log('Usage:');
    console.log('  node nfc-url-generator.js --tag-id <TAG_ID>     Generate URL for specific tag');
    console.log('  node nfc-url-generator.js --list-tags           List all available tags');
    console.log('  node nfc-url-generator.js --generate-all        Generate URLs for all tags');
    console.log('  node nfc-url-generator.js --help                Show this help message');
    console.log('');
    console.log('Examples:');
    console.log('  node nfc-url-generator.js --tag-id TEST123');
    console.log('  node nfc-url-generator.js --generate-all');
    return;
  }

  if (args.includes('--list-tags')) {
    await generator.listDoorTags();
  } else if (args.includes('--generate-all')) {
    await generator.generateAllUrls();
    generator.saveResults();
    
    // Ask if user wants QR codes
    if (generator.results.length > 0) {
      console.log('\n💡 Tip: Install "qrcode" package to generate QR codes for these URLs');
      console.log('   Run: npm install qrcode');
    }
  } else if (args.includes('--tag-id')) {
    const tagIdIndex = args.indexOf('--tag-id');
    const tagId = args[tagIdIndex + 1];
    
    if (!tagId) {
      console.log('❌ Error: --tag-id requires a tag ID value');
      console.log('   Example: node nfc-url-generator.js --tag-id TEST123');
      return;
    }
    
    const result = await generator.generateUrlForSpecificTag(tagId);
    if (result) {
      generator.results.push(result);
      generator.saveResults(`nfc-url-${tagId}.json`);
    }
  } else {
    console.log('❌ No valid command provided.');
    console.log('   Use --help to see available commands.');
  }
}

// Run the CLI
if (require.main === module) {
  main().catch(console.error);
}

module.exports = NFCUrlGenerator;