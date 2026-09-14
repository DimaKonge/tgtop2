import mysql from "mysql2/promise";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

const connection = await mysql.createConnection(process.env.DATABASE_URL);

try {
  const [rows] = await connection.query(`
    SELECT id, category, subcategory, country, slotNumber, groupId, title, bidAmount, currentBid, updatedAt
    FROM auction_slots
    ORDER BY category ASC, subcategory ASC, country ASC, slotNumber ASC
  `);
  console.table(rows);
} finally {
  await connection.end();
}
