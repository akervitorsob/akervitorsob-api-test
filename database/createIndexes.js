require("dotenv").config();

const { initializeDatabase, closeDatabase } = require("./db");

initializeDatabase()
  .then(() => console.log("Turso schema and indexes are ready."))
  .catch((error) => {
    console.error("Database initialization failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try { await closeDatabase(); } catch (_) {}
  });
