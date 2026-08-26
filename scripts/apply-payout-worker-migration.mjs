import { readFile } from "node:fs/promises";
import mysql from "mysql2/promise";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is not configured");

const connection = await mysql.createConnection(databaseUrl);
try {
  const [existing] = await connection.execute(
    "SELECT TABLE_NAME AS tableName FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name IN ('ton_payout_jobs', 'ton_payout_wallet_leases')",
  );
  const names = new Set(existing.map(row => row.tableName));
  if (names.size === 2) {
    console.log("payout_worker_schema=already_present");
  } else if (names.size !== 0) {
    throw new Error("Payout worker schema is partially present; refusing unsafe migration");
  } else {
    const migration = await readFile(new URL("../drizzle/0050_wakeful_puff_adder.sql", import.meta.url), "utf8");
    for (const statement of migration.split("--> statement-breakpoint").map(value => value.trim()).filter(Boolean)) {
      await connection.query(statement);
    }
    console.log("payout_worker_schema=created");
  }
} finally {
  await connection.end();
}
