// Optional central route registration for applications that prefer one import.
// server.js currently mounts these routes individually.
module.exports = (app) => {
  app.use("/api/auth", require("./authRoutes"));
  app.use("/api/orders", require("./orderRoutes"));
  app.use("/api/products", require("./productRoutes"));
  app.use("/api/payment", require("./paymentRoutes"));
  app.use("/api/admin", require("./adminRoutes"));
  app.use("/api/warehouse", require("./warehouseRoutes"));
  app.use("/api/cart", require("./cartRoutes"));
  app.use("/api/categories", require("./categoryRoutes"));
  app.use("/api/users", require("./userRoutes"));
  app.use("/api/sellers", require("./sellerRoutes"));
};
