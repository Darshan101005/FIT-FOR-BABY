# PWA Icons

This directory should contain PWA icons in the following sizes:
- icon-72x72.png
- icon-96x96.png
- icon-128x128.png
- icon-144x144.png
- icon-152x152.png
- icon-192x192.png
- icon-384x384.png
- icon-512x512.png

## How to Generate Icons

You can generate these icons from your main app icon (`assets/images/icon.png`) using:

### Option 1: Online Tool
1. Go to https://www.pwabuilder.com/imageGenerator
2. Upload your icon.png
3. Download the generated icons
4. Place them in this folder

### Option 2: Using Sharp (Node.js)
```bash
npm install sharp --save-dev
node scripts/generate-pwa-icons.js
```

### Option 3: Manual
Use any image editor to resize your icon.png to the required sizes.

## Quick Setup (Copy existing icon temporarily)
For now, you can copy your existing icon.png to this folder with these names to get started.
