require("dotenv").config();

const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const { client, initializeDatabase, closeDatabase } = require("../database/db");

const TABLES_IN_IMPORT_ORDER = [
  "users",
  "categories",
  "products",
  "carts",
  "cart_items",
  "orders",
  "order_items",
  "payments",
  "sellers",
  "warehouses",
  "warehouse_inventory"
];

async function main() {
  const sourcePath = path.resolve(
    process.env.SQLITE_SOURCE_PATH || "./database/akervitorsob.sqlite"
  );

  console.log("Opening source SQLite database:", sourcePath);
  const source = new DatabaseSync(sourcePath);

  try {
    const integrity = source.prepare("PRAGMA integrity_check").get();
    if (!integrity || integrity.integrity_check !== "ok") {
      throw new Error("Source SQLite integrity_check failed. Stop; do not import this file.");
    }

    await initializeDatabase();

    // Never merge into a non-empty destination. This prevents accidental duplicates
    // or overwriting live Turso data during a repeated migration.
    for (const table of TABLES_IN_IMPORT_ORDER) {
      const targetCount = await client.execute(`SELECT COUNT(*) AS count FROM "${table}"`);
      const count = Number(targetCount.rows[0]?.count || 0);
      if (count > 0) {
        throw new Error(
          `Turso table "${table}" already contains ${count} row(s). Import stopped without changing data.`
        );
      }
    }

    const tx = await client.transaction("write");
    const imported = {};

    try {
      for (const table of TABLES_IN_IMPORT_ORDER) {
        const columns = source.prepare(`PRAGMA table_info("${table}")`).all();
        if (!columns.length) {
          throw new Error(`Source SQLite is missing expected table "${table}".`);
        }

        const rows = source.prepare(`SELECT * FROM "${table}"`).all();
        imported[table] = rows.length;

        if (!rows.length) continue;

        const columnNames = columns.map((column) => column.name);
        const quotedColumns = columnNames.map((name) => `"${name}"`).join(",");
        const placeholders = columnNames.map(() => "?").join(",");
        const sql = `INSERT INTO "${table}" (${quotedColumns}) VALUES (${placeholders})`;

        for (const row of rows) {
          const args = columnNames.map((column) => row[column] === undefined ? null : row[column]);
          await tx.execute({ sql, args });
        }
      }

      await tx.commit();
    } catch (error) {
      try { await tx.rollback(); } catch (_) {}
      throw error;
    }

    console.log("SQLite → Turso import completed.");
    console.log("Imported row counts:", JSON.stringify(imported, null, 2));
  } finally {
    source.close();
    await closeDatabase();
  }
}

main().catch((error) => {
  console.error("Migration failed:", error.message);
  process.exitCode = 1;
});
