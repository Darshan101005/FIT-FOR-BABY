/**
 * PWA Icon Generator Script
 * 
 * This script generates PWA icons from the main app icon.
 * 
 * Usage: node scripts/generate-pwa-icons.js
 * 
 * Prerequisites: npm install sharp --save-dev
 */

const fs = require('fs');
const path = require('path');

// Try to load sharp, provide helpful message if not installed
let sharp;
try {
  sharp = require('sharp');
} catch (error) {
  console.log('Sharp is not installed. Installing it now...');
  console.log('Run: npm install sharp --save-dev');
  console.log('\nAlternatively, you can manually create icons using:');
  console.log('- https://www.pwabuilder.com/imageGenerator');
  console.log('- Any image editor');
  process.exit(1);
}

const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const SOURCE_ICON = path.join(__dirname, '..', 'assets', 'images', 'icon.png');
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'icons');

async function generateIcons() {
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Check if source icon exists
  if (!fs.existsSync(SOURCE_ICON)) {
    console.error(`Source icon not found: ${SOURCE_ICON}`);
    process.exit(1);
  }

  console.log('Generating PWA icons...\n');

  for (const size of ICON_SIZES) {
    const outputPath = path.join(OUTPUT_DIR, `icon-${size}x${size}.png`);
    
    try {
      await sharp(SOURCE_ICON)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .png()
        .toFile(outputPath);
      
      console.log(`✓ Generated: icon-${size}x${size}.png`);
    } catch (error) {
      console.error(`✗ Failed to generate icon-${size}x${size}.png:`, error.message);
    }
  }

  console.log('\n✓ PWA icons generated successfully!');
  console.log(`  Output directory: ${OUTPUT_DIR}`);
}

generateIcons().catch(console.error);
