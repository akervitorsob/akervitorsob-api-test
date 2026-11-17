
const router = require("express").Router();

const repo = require("../database/repository");
const auth = require("../middleware/roleAuth");

// ======================================
// VALIDATION HELPERS
// ======================================

function parseQuantity(value, fieldName) {
  const quantity = Number(value);

  if (
    value === undefined ||
    value === null ||
    value === "" ||
    !Number.isFinite(quantity) ||
    quantity < 0
  ) {
    throw new Error(fieldName + " must be a valid non-negative number.");
  }

  return quantity;
}

function parseBoolean(value) {
  if (typeof value === "boolean") return value;
  if (value === 1 || value === "1" || value === "true") return true;
  if (value === 0 || value === "0" || value === "false") return false;

  throw new Error("Invalid active value.");
}

function getErrorStatus(error) {
  if (
    String(error.message || "").includes("UNIQUE constraint failed")
  ) {
    return 409;
  }

  if (
    error.message &&
    (
      error.message.includes("must be") ||
      error.message.includes("required")
    )
  ) {
    return 400;
  }

  return 500;
}

// ======================================
// GET ALL WAREHOUSES
// GET /api/warehouse
// ADMIN ONLY
// ======================================

router.get(
  "/",
  auth("admin"),
  async (req, res) => {
    try {
      const warehouses = await repo.listWarehouses();

      return res.status(200).json(warehouses);

    } catch (error) {
      console.error("GET WAREHOUSES ERROR:", error);

      return res.status(500).json({
        success: false,
        message: "Could not load warehouses"
      });
    }
  }
);

// ======================================
// CREATE WAREHOUSE
// POST /api/warehouse
// ADMIN ONLY
// ======================================

router.post(
  "/",
  auth("admin"),
  async (req, res) => {
    try {
      const body = req.body || {};

      const name = String(body.name || "").trim();
      const code = String(body.code || "").trim();

      if (!name || !code) {
        return res.status(400).json({
          success: false,
          message: "Warehouse name and code are required"
        });
      }

      // Validate location if provided.
      if (
        body.location !== undefined &&
        (
          !body.location ||
          typeof body.location !== "object" ||
          Array.isArray(body.location)
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid warehouse location"
        });
      }

      // Validate active status.
      let active = true;

      if (body.active !== undefined) {
        try {
          active = parseBoolean(body.active);
        } catch (error) {
          return res.status(400).json({
            success: false,
            message: error.message
          });
        }
      }

      // Validate initial inventory.
      if (
        body.inventory !== undefined &&
        !Array.isArray(body.inventory)
      ) {
        return res.status(400).json({
          success: false,
          message: "Inventory must be an array"
        });
      }

      const inventory = [];

      for (const item of (body.inventory || [])) {
        const productId = String(item.productId || "").trim();

        if (!productId) {
          return res.status(400).json({
            success: false,
            message: "Product ID is required for inventory"
          });
        }

        const product = await repo.getProduct(productId);

        if (!product) {
          return res.status(404).json({
            success: false,
            message: "Product not found: " + productId
          });
        }

        inventory.push({
          productId,
          quantity: parseQuantity(
            item.quantity === undefined ? 0 : item.quantity,
            "Inventory quantity"
          ),
          reserved: parseQuantity(
            item.reserved === undefined ? 0 : item.reserved,
            "Reserved quantity"
          ),
          lowStockAlert: parseQuantity(
            item.lowStockAlert === undefined ? 10 : item.lowStockAlert,
            "Low stock alert"
          )
        });
      }

      const warehouseData = {
        name,
        code,
        country: String(body.country || "BD").trim(),
        city: String(body.city || "").trim(),
        address: String(body.address || "").trim(),
        location: body.location,
        active,
        inventory
      };

      const warehouse = await repo.createWarehouse(
        warehouseData
      );

      return res.status(201).json(warehouse);

    } catch (error) {
      console.error("CREATE WAREHOUSE ERROR:", error);

      return res.status(getErrorStatus(error)).json({
        success: false,
        message:
          getErrorStatus(error) === 409
            ? "Warehouse code already exists"
            : getErrorStatus(error) === 400
              ? error.message
              : "Could not create warehouse"
      });
    }
  }
);

// ======================================
// UPDATE WAREHOUSE INVENTORY
// PATCH /api/warehouse/:id/inventory
// ADMIN ONLY
// ======================================

router.patch(
  "/:id/inventory",
  auth("admin"),
  async (req, res) => {
    try {
      const warehouseId = String(req.params.id || "").trim();

      const body = req.body || {};

      const productId = String(body.productId || "").trim();

      if (!warehouseId || !productId) {
        return res.status(400).json({
          success: false,
          message: "Warehouse ID and product ID are required"
        });
      }

      if (body.quantity === undefined) {
        return res.status(400).json({
          success: false,
          message: "Quantity is required"
        });
      }

      const quantity = parseQuantity(
        body.quantity,
        "Inventory quantity"
      );

      // Verify product exists.
      const product = await repo.getProduct(productId);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found"
        });
      }

      const warehouse = await repo.updateWarehouseInventory(
        warehouseId,
        productId,
        quantity
      );

      if (!warehouse) {
        return res.status(404).json({
          success: false,
          message: "Warehouse not found"
        });
      }

      return res.status(200).json(warehouse);

    } catch (error) {
      console.error("UPDATE WAREHOUSE INVENTORY ERROR:", error);

      return res.status(400).json({
        success: false,
        message: error.message || "Could not update warehouse inventory"
      });
    }
  }
);

// ======================================
// EXPORT ROUTER
// ======================================

module.exports = router;
