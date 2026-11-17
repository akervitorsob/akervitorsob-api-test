require("dotenv").config();

const bcrypt = require("bcrypt");
const repo = require("./database/repository");
const { initializeDatabase, closeDatabase } = require("./database/db");

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD before running this script.");
  }
  if (password.length < 12) {
    throw new Error("ADMIN_PASSWORD must be at least 12 characters.");
  }

  await initializeDatabase();
  const passwordHash = await bcrypt.hash(password, 12);
  const admin = await repo.updateAdminUser(email.trim(), passwordHash);

  console.log("Admin account is ready:", admin.email);
  console.log("Do not share this account or password.");
}

main()
  .catch((error) => {
    console.error("Admin setup failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try { await closeDatabase(); } catch (_) {}
  });
