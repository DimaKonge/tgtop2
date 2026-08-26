import mysql from "mysql2/promise";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required for the entry-link audit migration");

const connection = await mysql.createConnection(databaseUrl);
try {
  const [tables] = await connection.execute(
    "SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ? LIMIT 1",
    ["group_entry_link_audits"],
  );
  if (!Array.isArray(tables) || tables.length === 0) {
    await connection.query(`CREATE TABLE \`group_entry_link_audits\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`groupId\` int NOT NULL,
      \`chatId\` varchar(64) NOT NULL,
      \`previousUsername\` varchar(128),
      \`verifiedUsername\` varchar(128) NOT NULL,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      CONSTRAINT \`group_entry_link_audits_id\` PRIMARY KEY(\`id\`)
    )`);
  }

  const [indexes] = await connection.execute(
    "SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ? LIMIT 1",
    ["group_entry_link_audits", "group_entry_link_audits_group_created_idx"],
  );
  if (!Array.isArray(indexes) || indexes.length === 0) {
    await connection.query("CREATE INDEX `group_entry_link_audits_group_created_idx` ON `group_entry_link_audits` (`groupId`, `createdAt`)");
  }
  console.log("entry_link_audit_migration=ok");
} finally {
  await connection.end();
}
