const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Paths
const svgPath = path.join(__dirname, '../assets/logos/logo-icon-alt.svg');
const iconPath = path.join(__dirname, '../assets/images/icon.png');
const splashIconPath = path.join(__dirname, '../assets/images/splash-icon.png');
const faviconPath = path.join(__dirname, '../assets/images/favicon.png');

// Icon sizes
const ICON_SIZE = 1024;
const SPLASH_ICON_SIZE = 512;
const FAVICON_SIZE = 48;

async function convertSvgToPng() {
  try {
    console.log('🎨 Converting logo-icon-alt.svg to PNG icons...');

    // Check if SVG exists
    if (!fs.existsSync(svgPath)) {
      console.error('❌ SVG file not found:', svgPath);
      process.exit(1);
    }

    // Read SVG file
    const svgBuffer = fs.readFileSync(svgPath);

    // Generate main app icon (1024x1024)
    console.log('📱 Generating app icon (1024x1024)...');
    await sharp(svgBuffer)
      .resize(ICON_SIZE, ICON_SIZE)
      .png()
      .toFile(iconPath);
    console.log('✅ App icon created:', iconPath);

    // Generate splash icon (512x512)
    console.log('🌊 Generating splash icon (512x512)...');
    await sharp(svgBuffer)
      .resize(SPLASH_ICON_SIZE, SPLASH_ICON_SIZE)
      .png()
      .toFile(splashIconPath);
    console.log('✅ Splash icon created:', splashIconPath);

    // Generate favicon (48x48)
    console.log('🌐 Generating favicon (48x48)...');
    await sharp(svgBuffer)
      .resize(FAVICON_SIZE, FAVICON_SIZE)
      .png()
      .toFile(faviconPath);
    console.log('✅ Favicon created:', faviconPath);

    console.log('\n🎉 All icons generated successfully!');
    console.log('📝 Next steps:');
    console.log('   1. Run: npx expo prebuild --clean');
    console.log('   2. Restart your development server');
    
  } catch (error) {
    console.error('❌ Error converting SVG to PNG:', error);
    process.exit(1);
  }
}

convertSvgToPng();
