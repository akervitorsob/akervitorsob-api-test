// Production security middleware for Express.
// Install if missing:
// npm install helmet express-rate-limit hpp cors

const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const hpp = require("hpp");
const cors = require("cors");

function applySecurity(app) {
  app.disable("x-powered-by");

  app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
  }));

  app.use(hpp());

  app.use(cors({
    origin: (process.env.CORS_ORIGINS || "http://localhost:3000")
      .split(",")
      .map(v => v.trim()),
    credentials: true,
    methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"]
  }));

  app.use("/api", rateLimit({
    windowMs: 15 * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_MAX || 500),
    standardHeaders: true,
    legacyHeaders: false
  }));
}

module.exports = { applySecurity };
