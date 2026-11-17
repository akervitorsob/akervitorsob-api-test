
const express = require("express");
const router = express.Router();

// Configuration
const upload = require("../config/multer");

// Authentication
const auth = require("../middleware/roleAuth");

// Product Controllers
const {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct
} = require("../controllers/ProductController");

// ======================================
// GET ALL PRODUCTS (PUBLIC)
// ======================================

router.get("/", getProducts);

// ======================================
// GET SINGLE PRODUCT (PUBLIC)
// ======================================

router.get("/:id", getProductById);

// ======================================
// ADD PRODUCT (ADMIN ONLY)
// ======================================

router.post(
  "/add",
  auth("admin"),
  upload.single("image"),
  createProduct
);

// ======================================
// UPDATE PRODUCT (ADMIN ONLY)
// ======================================

router.put(
  "/:id",
  auth("admin"),
  upload.single("image"),
  updateProduct
);

// ======================================
// DELETE PRODUCT (ADMIN ONLY)
// ======================================

router.delete(
  "/:id",
  auth("admin"),
  deleteProduct
);

// ======================================
// EXPORT ROUTER
// ======================================

module.exports = router;
