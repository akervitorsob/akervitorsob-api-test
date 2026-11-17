
const cloudinary = require("../config/cloudinary");

// ======================================
// UPLOAD PRODUCT IMAGE TO CLOUDINARY
// ======================================

function uploadProductImage(buffer) {
  // Validate image buffer
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    return Promise.reject(
      new Error("Valid image buffer is required.")
    );
  }

  // Check Cloudinary configuration
  const config = cloudinary.config();

  if (
    !config.cloud_name ||
    !config.api_key ||
    !config.api_secret
  ) {
    return Promise.reject(
      new Error(
        "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET."
      )
    );
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "akervitorsob/products",
        resource_type: "image",
        overwrite: false,
        unique_filename: true
      },
      (error, result) => {
        if (error) {
          console.error("CLOUDINARY UPLOAD ERROR:", error.message);
          return reject(error);
        }

        if (!result || !result.secure_url) {
          return reject(
            new Error("Cloudinary did not return a valid image URL.")
          );
        }

        return resolve({
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
          format: result.format
        });
      }
    );

    stream.on("error", (error) => {
      reject(error);
    });

    stream.end(buffer);
  });
}

// ======================================
// EXPORT FUNCTION
// ======================================

module.exports = {
  uploadProductImage
};
