
const repo = require("../database/repository");
const { uploadProductImage } = require("../services/cloudinaryUpload");

// ==========================
// PRODUCT CONFIGURATION
// ==========================

const PRODUCT_STATUSES = [
  "active",
  "inactive",
  "outofstock"
];

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ValidationError";
  }
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

// ==========================
// DATA CONVERSION HELPERS
// ==========================

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;

  const normalized = String(value).trim().toLowerCase();

  if (["true", "1", "yes", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "off"].includes(normalized)) return false;

  return fallback;
}

function parseNumber(value, fieldName, fallback) {
  if (value === undefined || value === null || value === "") {
    if (fallback !== undefined) return fallback;
    throw new ValidationError(fieldName + " is required");
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new ValidationError(fieldName + " must be a valid number");
  }

  if (parsed < 0) {
    throw new ValidationError(fieldName + " cannot be negative");
  }

  if (fieldName === "Stock" && !Number.isInteger(parsed)) {
    throw new ValidationError("Stock must be a whole number");
  }

  if (fieldName === "Rating" && parsed > 5) {
    throw new ValidationError("Rating must be between 0 and 5");
  }

  return parsed;
}

function parseArray(value, fieldName, fallback = []) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  if (Array.isArray(value)) return value;

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) return fallback;

    try {
      const parsed = JSON.parse(trimmed);

      if (Array.isArray(parsed)) return parsed;

      throw new ValidationError(fieldName + " must be a valid array");

    } catch (error) {
      if (error instanceof ValidationError) throw error;

      if (["images", "weights", "colors"].includes(fieldName)) {
        return trimmed
          .split(",")
          .map(item => item.trim())
          .filter(Boolean);
      }

      throw new ValidationError(fieldName + " must be a valid array");
    }
  }

  throw new ValidationError(fieldName + " must be a valid array");
}

// ==========================
// NORMALIZE PRODUCT DATA
// ==========================

function normalizeProductInput(body = {}, options = {}) {
  const creating = options.creating === true;
  const data = {};

  if (creating || hasOwn(body, "name")) {
    const name = String(body.name || "").trim();

    if (!name) {
      throw new ValidationError("Product name is required");
    }

    data.name = name;
  }

  if (creating || hasOwn(body, "category")) {
    const category = String(body.category || "").trim();

    if (!category) {
      throw new ValidationError("Product category is required");
    }

    data.category = category;
  }

  if (creating || hasOwn(body, "price")) {
    data.price = parseNumber(body.price, "Product price");
  }

  if (creating || hasOwn(body, "description")) {
    data.description = body.description == null
      ? ""
      : String(body.description);
  }

  if (creating || hasOwn(body, "discountPrice")) {
    data.discountPrice = parseNumber(
      body.discountPrice,
      "Discount price",
      0
    );
  }

  if (creating || hasOwn(body, "stock")) {
    data.stock = parseNumber(body.stock, "Stock", 0);
  }

  if (creating || hasOwn(body, "image")) {
    data.image = body.image == null
      ? ""
      : String(body.image);
  }

  if (creating || hasOwn(body, "images")) {
    data.images = parseArray(body.images, "images", []);
  }

  if (creating || hasOwn(body, "weights")) {
    data.weights = parseArray(
      body.weights,
      "weights",
      ["250g", "500g", "750g", "1kg"]
    );
  }

  if (creating || hasOwn(body, "colors")) {
    data.colors = parseArray(body.colors, "colors", []);
  }

  if (creating || hasOwn(body, "sellerId")) {
    const sellerId = body.sellerId == null
      ? ""
      : String(body.sellerId).trim();

    data.sellerId = sellerId || null;
  }

  if (creating || hasOwn(body, "status")) {
    const status = String(
      body.status || "active"
    ).trim().toLowerCase();

    if (!PRODUCT_STATUSES.includes(status)) {
      throw new ValidationError("Invalid product status");
    }

    data.status = status;
  }

  if (creating || hasOwn(body, "featured")) {
    data.featured = parseBoolean(body.featured, false);
  }

  if (creating || hasOwn(body, "rating")) {
    data.rating = parseNumber(body.rating, "Rating", 0);
  }

  if (creating || hasOwn(body, "reviews")) {
    data.reviews = parseArray(body.reviews, "reviews", []);
  }

  return data;
}

// ==========================
// PRODUCT IMAGE UPLOAD
// ==========================

async function applyUploadedImage(req, productData) {
  if (!req.file) return;

  if (!Buffer.isBuffer(req.file.buffer)) {
    throw new Error(
      "Uploaded image is missing its file buffer. Check config/multer.js uses memoryStorage()."
    );
  }

  const uploaded = await uploadProductImage(req.file.buffer);

  const imageUrl = typeof uploaded === "string"
    ? uploaded
    : uploaded && (uploaded.url || uploaded.secure_url);

  if (!imageUrl || typeof imageUrl !== "string") {
    throw new Error("Cloudinary did not return a valid image URL.");
  }

  productData.image = imageUrl;
}

// ==========================
// ERROR HANDLER
// ==========================

function sendControllerError(res, error, operation) {
  console.error(operation + " ERROR:", error);

  if (error instanceof ValidationError) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  return res.status(500).json({
    success: false,
    message:
      operation === "CREATE PRODUCT"
        ? "Could not create product"
        : operation === "UPDATE PRODUCT"
          ? "Could not update product"
          : operation === "GET PRODUCT"
            ? "Could not load product"
            : operation === "GET PRODUCTS"
              ? "Could not load products"
              : "Could not delete product"
  });
}

// ==========================
// CREATE PRODUCT
// ==========================

const createProduct = async (req, res) => {
  try {
    const productData = normalizeProductInput(
      req.body || {},
      { creating: true }
    );

    await applyUploadedImage(req, productData);

    const product = await repo.createProduct(productData);

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      product
    });

  } catch (error) {
    return sendControllerError(res, error, "CREATE PRODUCT");
  }
};

// ==========================
// GET ALL PRODUCTS
// ==========================

const getProducts = async (req, res) => {
  try {
    const products = await repo.listProducts();

    return res.status(200).json({
      success: true,
      count: products.length,
      products
    });

  } catch (error) {
    return sendControllerError(res, error, "GET PRODUCTS");
  }
};

// ==========================
// GET SINGLE PRODUCT
// ==========================

const getProductById = async (req, res) => {
  try {
    const product = await repo.getProduct(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    return res.status(200).json({
      success: true,
      product
    });

  } catch (error) {
    return sendControllerError(res, error, "GET PRODUCT");
  }
};

// ==========================
// UPDATE PRODUCT
// ==========================

const updateProduct = async (req, res) => {
  try {
    const updates = normalizeProductInput(req.body || {});

    await applyUploadedImage(req, updates);

    if (Object.keys(updates).length === 0) {
      throw new ValidationError(
        "At least one product field or a new image is required"
      );
    }

    const product = await repo.updateProduct(
      req.params.id,
      updates
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      product
    });

  } catch (error) {
    return sendControllerError(res, error, "UPDATE PRODUCT");
  }
};

// ==========================
// DELETE PRODUCT
// ==========================

const deleteProduct = async (req, res) => {
  try {
    const deleted = await repo.deleteProduct(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully"
    });

  } catch (error) {
    return sendControllerError(res, error, "DELETE PRODUCT");
  }
};

// ==========================
// EXPORT ALL FUNCTIONS
// ==========================

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct
};
