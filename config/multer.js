
const multer = require("multer");

// ======================================
// MULTER CONFIGURATION
// ======================================

const upload = multer({

  // Keep uploaded image in memory
  storage: multer.memoryStorage(),

  // Upload limits
  limits: {
    fileSize: 8 * 1024 * 1024,
    files: 1
  },

  // Validate uploaded file
  fileFilter: (req, file, callback) => {

    if (
      !file.mimetype ||
      typeof file.mimetype !== "string" ||
      !file.mimetype.toLowerCase().startsWith("image/")
    ) {
      const error = new Error(
        "Only image files are allowed."
      );

      error.status = 400;
      error.code = "INVALID_FILE_TYPE";

      return callback(error);
    }

    return callback(null, true);
  }

});

// ======================================
// EXPORT MULTER
// ======================================

module.exports = upload;
