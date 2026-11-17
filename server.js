
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const hpp = require("hpp");
const rateLimit = require("express-rate-limit");
const path = require("node:path");

const {
  initializeDatabase,
  closeDatabase,
  client
} = require("./database/db");

// ==========================
// APP CONFIGURATION
// ==========================

const app = express();

app.disable("x-powered-by");

// Render reverse proxy support
app.set("trust proxy", 1);

// ==========================
// ENVIRONMENT VALIDATION
// ==========================

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error(
    "JWT_SECRET is required and must contain at least 32 characters."
  );
}

const defaultOrigins = [
  "https://akervitorsob.com",
  "https://www.akervitorsob.com"
];

const allowedOrigins = new Set(
  (process.env.CORS_ORIGINS || defaultOrigins.join(","))
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
);

// ==========================
// SECURITY MIDDLEWARE
// ==========================

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin"
    }
  })
);

app.use(hpp());

// ==========================
// CORS CONFIGURATION
// ==========================

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      return callback(null, true);
    }

    const error = new Error("Origin is not allowed by CORS.");
    error.status = 403;

    return callback(error);
  },

  methods: [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS"
  ],

  allowedHeaders: [
    "Content-Type",
    "Authorization"
  ],

  credentials: false
};

app.use(cors(corsOptions));

// ==========================
// BODY PARSER
// ==========================

app.use(express.json({
  limit: "2mb"
}));

app.use(express.urlencoded({
  extended: true,
  limit: "2mb"
}));

// ==========================
// LEGACY CPANEL URL SUPPORT
// ==========================

app.use((req, res, next) => {
  const mountPrefix = "/backend";

  if (
    req.url === mountPrefix ||
    req.url.startsWith(mountPrefix + "/")
  ) {
    req.url =
      req.url.slice(mountPrefix.length) || "/";
  }

  next();
});

// ==========================
// RATE LIMIT
// ==========================

const configuredLimit = Number.parseInt(
  process.env.RATE_LIMIT_MAX || "300",
  10
);

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,

  limit:
    Number.isFinite(configuredLimit) && configuredLimit > 0
      ? configuredLimit
      : 300,

  standardHeaders: "draft-7",

  legacyHeaders: false,

  message: {
    success: false,
    message: "Too many requests. Please try again later."
  }
});

app.use("/api", apiLimiter);

// ==========================
// IMAGE UPLOAD ACCESS
// ==========================

// Legacy uploaded images
app.use(
  "/uploads",
  express.static(
    path.join(__dirname, "uploads")
  )
);

// New uploads should use Cloudinary.
// Render local filesystem is temporary.

// ==========================
// IMPORT ALL API ROUTES
// ==========================

const authRoutes = require("./routes/authRoutes");
const orderRoutes = require("./routes/orderRoutes");
const productRoutes = require("./routes/productRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const adminRoutes = require("./routes/adminRoutes");
const warehouseRoutes = require("./routes/warehouseRoutes");
const cartRoutes = require("./routes/cartRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const userRoutes = require("./routes/userRoutes");
const sellerRoutes = require("./routes/sellerRoutes");

// ==========================
// REGISTER API ROUTES
// ==========================

app.use("/api/auth", authRoutes);

app.use("/api/orders", orderRoutes);

app.use("/api/products", productRoutes);

app.use("/api/payment", paymentRoutes);

app.use("/api/admin", adminRoutes);

app.use("/api/warehouse", warehouseRoutes);

app.use("/api/cart", cartRoutes);

app.use("/api/categories", categoryRoutes);

app.use("/api/users", userRoutes);

app.use("/api/sellers", sellerRoutes);

// ==========================
// DATABASE HEALTH CHECK
// ==========================

app.get("/api/health", async (req, res) => {
  try {
    await client.execute("SELECT 1 AS ok");

    return res.status(200).json({
      success: true,
      message: "AkerVitorSob API Running",
      database: true,
      databaseType: "Turso (libSQL)"
    });

  } catch (error) {
    console.error(
      "Turso health check failed:",
      error.message
    );

    return res.status(503).json({
      success: false,
      message: "Database health check failed",
      database: false
    });
  }
});

// ==========================
// ROOT ROUTE
// ==========================

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "AkerVitorSob API is running."
  });
});

// ==========================
// 404 HANDLER
// ==========================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found."
  });
});

// ==========================
// GLOBAL ERROR HANDLER
// ==========================

app.use((err, req, res, next) => {

  if (res.headersSent) {
    return next(err);
  }

  console.error("API Error:", err);

  const status = err.status || 500;

  res.status(status).json({
    success: false,
    message:
      status >= 500
        ? "Server Error"
        : err.message
  });
});

// ==========================
// SERVER CONFIGURATION
// ==========================

const PORT = process.env.PORT || 5000;

let server = null;
let shuttingDown = false;

// ==========================
// START SERVER
// ==========================

async function start() {
  try {

    console.log("Initializing Turso Database...");

    await initializeDatabase();

    console.log("Database Ready.");

    server = app.listen(
      PORT,
      "0.0.0.0",
      () => {
        console.log(
          `AkerVitorSob API running on port ${PORT}`
        );
      }
    );

    server.on("error", (error) => {
      console.error(
        "Server error:",
        error.message
      );

      process.exitCode = 1;
    });

  } catch (error) {

    console.error(
      "Backend startup failed:",
      error
    );

    try {
      await closeDatabase();
    } catch (closeError) {
      console.error(
        "Database cleanup failed:",
        closeError.message
      );
    }

    process.exit(1);
  }
}

// ==========================
// GRACEFUL SHUTDOWN
// ==========================

async function shutdown(signal) {

  if (shuttingDown) return;

  shuttingDown = true;

  console.log(
    `${signal} received. Shutting down...`
  );

  if (server) {
    await new Promise((resolve) => {
      server.close(resolve);
    });
  }

  try {

    await closeDatabase();

    console.log(
      "Turso Database connection closed."
    );

  } catch (error) {

    console.error(
      "Database close error:",
      error.message
    );

  }

  process.exit(0);
}

process.once("SIGTERM", () => {
  shutdown("SIGTERM");
});

process.once("SIGINT", () => {
  shutdown("SIGINT");
});

// ==========================
// RUN APPLICATION
// ==========================

start();
