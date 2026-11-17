
const fs = require("node:fs");
const path = require("node:path");
const { createClient } = require("@libsql/client");

// Environment variables
const databaseUrl = process.env.TURSO_DATABASE_URL?.trim();
const authToken = process.env.TURSO_AUTH_TOKEN?.trim();

// Validate database configuration
if (!databaseUrl) {
  throw new Error("TURSO_DATABASE_URL is required.");
}

const isRemoteDatabase = /^(libsql|https?):\/\//i.test(databaseUrl);

if (isRemoteDatabase && !authToken) {
  throw new Error(
    "TURSO_AUTH_TOKEN is required for a remote Turso database."
  );
}

// Create Turso database client
const client = createClient({
  url: databaseUrl,
  ...(authToken ? { authToken } : {}),
  intMode: "number",
  concurrency: 10
});

// Locate schema file
const schemaPath = path.join(__dirname, "schema.sql");

if (!fs.existsSync(schemaPath)) {
  throw new Error(
    `Database schema file not found: ${schemaPath}`
  );
}

// Read database schema
const schemaSql = fs.readFileSync(schemaPath, "utf8");

if (!schemaSql.trim()) {
  throw new Error("Database schema file is empty.");
}

// Database initialization
let initializationPromise = null;

async function initializeDatabase() {
  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    try {
      await client.execute("PRAGMA foreign_keys = ON");

      await client.executeMultiple(schemaSql);

      await client.execute("SELECT 1");

      console.log(
        "Turso database initialized successfully."
      );

      return true;

    } catch (error) {
      initializationPromise = null;

      console.error(
        "Turso database initialization failed:",
        error.message
      );

      throw error;
    }
  })();

  return initializationPromise;
}

// Close database connection
async function closeDatabase() {
  await client.close();
  initializationPromise = null;

  console.log("Turso database connection closed.");
}

// Export database functions
module.exports = {
  client,
  initializeDatabase,
  closeDatabase
};
