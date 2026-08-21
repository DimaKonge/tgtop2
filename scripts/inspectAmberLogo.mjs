import mysql from "mysql2/promise";

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await connection.execute(
  `SELECT id, title, username, avatar_url, animated_avatar_url, status
   FROM groups_catalog
   WHERE title = ? OR username = ?`,
  ["Amber WIN", "amberlend"],
);

console.log(JSON.stringify(rows, null, 2));
await connection.end();
