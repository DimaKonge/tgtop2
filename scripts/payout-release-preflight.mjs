import mysql from "mysql2/promise";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is not configured");

const connection = await mysql.createConnection(databaseUrl);
try {
  const [rows] = await connection.execute(
    "SELECT status, COUNT(*) AS total FROM ton_withdrawals WHERE status IN ('queued', 'manual_review', 'broadcast_pending', 'sent') GROUP BY status ORDER BY status",
  );
  console.log(JSON.stringify(rows));
} finally {
  await connection.end();
}
