/**
 * Post-export script for PWA
 * Copies PWA files to the dist folder after expo export
 * 
 * This script is run automatically after `expo export --platform web`
 */

const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const DIST_DIR = path.join(__dirname, '..', 'dist');

// Files to copy from public to dist
const FILES_TO_COPY = [
  'manifest.json',
  'service-worker.js',
  'offline.html',
  'favicon.png',
  'icon-192.png',
  'icon-512.png'
];

// Directories to copy
const DIRS_TO_COPY = [
  'icons'
];

function copyFile(src, dest) {
  try {
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      console.log(`✓ Copied: ${path.basename(src)}`);
    } else {
      console.log(`⚠ Skipped (not found): ${path.basename(src)}`);
    }
  } catch (error) {
    console.error(`✗ Failed to copy ${path.basename(src)}:`, error.message);
  }
}

function copyDirectory(src, dest) {
  try {
    if (fs.existsSync(src)) {
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
      }
      
      const files = fs.readdirSync(src);
      for (const file of files) {
        const srcFile = path.join(src, file);
        const destFile = path.join(dest, file);
        
        if (fs.statSync(srcFile).isDirectory()) {
          copyDirectory(srcFile, destFile);
        } else {
          fs.copyFileSync(srcFile, destFile);
        }
      }
      console.log(`✓ Copied directory: ${path.basename(src)}`);
    } else {
      console.log(`⚠ Skipped directory (not found): ${path.basename(src)}`);
    }
  } catch (error) {
    console.error(`✗ Failed to copy directory ${path.basename(src)}:`, error.message);
  }
}

function main() {
  console.log('\n📦 Copying PWA files to dist...\n');

  // Check if dist folder exists
  if (!fs.existsSync(DIST_DIR)) {
    console.error('Error: dist folder not found. Run `expo export --platform web` first.');
    process.exit(1);
  }

  // Copy individual files
  for (const file of FILES_TO_COPY) {
    const src = path.join(PUBLIC_DIR, file);
    const dest = path.join(DIST_DIR, file);
    copyFile(src, dest);
  }

  // Copy directories
  for (const dir of DIRS_TO_COPY) {
    const src = path.join(PUBLIC_DIR, dir);
    const dest = path.join(DIST_DIR, dir);
    copyDirectory(src, dest);
  }

  console.log('\n✅ PWA files copied successfully!\n');
}

main();
