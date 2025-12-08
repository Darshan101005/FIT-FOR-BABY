const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Paths
const svgPath = path.join(__dirname, '../assets/logos/logo-icon-alt.svg');
const androidForeground = path.join(__dirname, '../assets/images/android-icon-foreground.png');
const androidBackground = path.join(__dirname, '../assets/images/android-icon-background.png');
const androidMonochrome = path.join(__dirname, '../assets/images/android-icon-monochrome.png');

async function generateAndroidIcons() {
  try {
    console.log('🤖 Generating Android adaptive icons...');

    // Check if SVG exists
    if (!fs.existsSync(svgPath)) {
      console.error('❌ SVG file not found:', svgPath);
      process.exit(1);
    }

    // Read SVG file
    const svgBuffer = fs.readFileSync(svgPath);

    // Generate foreground icon (1024x1024)
    console.log('📱 Generating android-icon-foreground.png...');
    await sharp(svgBuffer)
      .resize(1024, 1024)
      .png()
      .toFile(androidForeground);
    console.log('✅ Foreground icon created');

    // Generate background (solid color - light blue)
    console.log('🎨 Generating android-icon-background.png...');
    await sharp({
      create: {
        width: 1024,
        height: 1024,
        channels: 4,
        background: { r: 230, g: 244, b: 254, alpha: 1 } // #E6F4FE
      }
    })
      .png()
      .toFile(androidBackground);
    console.log('✅ Background icon created');

    // Generate monochrome icon (for themed icons on Android 13+)
    console.log('⚫ Generating android-icon-monochrome.png...');
    await sharp(svgBuffer)
      .resize(1024, 1024)
      .greyscale()
      .png()
      .toFile(androidMonochrome);
    console.log('✅ Monochrome icon created');

    console.log('\n🎉 All Android icons generated successfully!');
    
  } catch (error) {
    console.error('❌ Error generating Android icons:', error);
    process.exit(1);
  }
}

generateAndroidIcons();
