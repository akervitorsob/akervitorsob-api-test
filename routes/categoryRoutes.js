
const router = require("express").Router();

const repo = require("../database/repository");
const auth = require("../middleware/roleAuth");

// ======================================
// GET ALL CATEGORIES (PUBLIC)
// ======================================

router.get("/", async (req, res) => {
  try {
    const categories = await repo.listCategories();

    return res.status(200).json(categories);

  } catch (error) {
    console.error("GET CATEGORIES ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Could not load categories"
    });
  }
});

// ======================================
// CREATE CATEGORY (ADMIN ONLY)
// ======================================

router.post("/", auth("admin"), async (req, res) => {
  try {
    const body = req.body || {};

    if (
      typeof body.name !== "string" ||
      !body.name.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Category name is required"
      });
    }

    const categoryData = {
      name: body.name.trim(),
      image: body.image || "",
      description: body.description || "",
      active: body.active === undefined ? true : body.active
    };

    const category = await repo.createCategory(categoryData);

    return res.status(201).json(category);

  } catch (error) {
    const errorMessage = String(error.message || "");

    const duplicate =
      errorMessage.includes("UNIQUE constraint failed") ||
      error.code === "SQLITE_CONSTRAINT_UNIQUE";

    console.error("CREATE CATEGORY ERROR:", error);

    return res.status(duplicate ? 409 : 500).json({
      success: false,
      message: duplicate
        ? "Category already exists"
        : "Could not create category"
    });
  }
});

// ======================================
// DELETE CATEGORY (ADMIN ONLY)
// ======================================

router.delete("/:id", auth("admin"), async (req, res) => {
  try {
    const categoryId = req.params.id;

    if (!categoryId) {
      return res.status(400).json({
        success: false,
        message: "Category ID is required"
      });
    }

    const deleted = await repo.deleteCategory(categoryId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Category not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Category deleted"
    });

  } catch (error) {
    console.error("DELETE CATEGORY ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Could not delete category"
    });
  }
});

// ======================================
// EXPORT ROUTER
// ======================================

module.exports = router;
