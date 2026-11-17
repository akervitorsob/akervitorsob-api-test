
const cloudinary = require("cloudinary").v2;

// ======================================
// CLOUDINARY CONFIGURATION
// ======================================

const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

// ======================================
// INITIALIZE CLOUDINARY
// ======================================

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true
});

// ======================================
// EXPORT CLOUDINARY
// ======================================

module.exports = cloudinary;
