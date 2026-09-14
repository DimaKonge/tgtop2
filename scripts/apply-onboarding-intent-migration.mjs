import mysql from "mysql2/promise";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required for the onboarding intent migration");

const tableName = "telegram_onboarding_intents";
const expectedColumns = [
  "id", "ownerTelegramId", "kind", "token", "status", "expiresAt", "windowStartedAt",
  "issuedInWindow", "consumedChatId", "consumedAt", "createdAt", "updatedAt",
];

const connection = await mysql.createConnection(databaseUrl);
try {
  const [tableRows] = await connection.execute(
    "SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ? LIMIT 1",
    [tableName],
  );
  const hasTable = Array.isArray(tableRows) && tableRows.length > 0;

  if (!hasTable) {
    await connection.query(`CREATE TABLE \`telegram_onboarding_intents\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`ownerTelegramId\` varchar(64) NOT NULL,
      \`kind\` enum('group','channel') NOT NULL,
      \`token\` varchar(64) NOT NULL,
      \`status\` enum('pending','consumed','expired','rate_limited') NOT NULL DEFAULT 'pending',
      \`expiresAt\` timestamp NOT NULL,
      \`windowStartedAt\` timestamp NOT NULL,
      \`issuedInWindow\` int NOT NULL DEFAULT 1,
      \`consumedChatId\` varchar(64),
      \`consumedAt\` timestamp,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`telegram_onboarding_intents_id\` PRIMARY KEY(\`id\`),
      CONSTRAINT \`telegram_onboarding_intents_token_unique\` UNIQUE(\`token\`),
      CONSTRAINT \`telegram_onboarding_intents_owner_kind_unique\` UNIQUE(\`ownerTelegramId\`, \`kind\`)
    )`);
  } else {
    const [columnRows] = await connection.execute(
      "SELECT column_name AS columnName, column_type AS columnType FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ?",
      [tableName],
    );
    const columns = new Map(columnRows.map(row => [row.columnName, row.columnType]));
    const missing = expectedColumns.filter(column => !columns.has(column));
    if (missing.length) throw new Error(`${tableName} is partially present; missing ${missing.join(", ")}`);
    if (columns.get("kind") !== "enum('group','channel')") throw new Error(`${tableName}.kind has unexpected enum; refusing unsafe migration`);
    if (columns.get("status") !== "enum('pending','consumed','expired','rate_limited')") throw new Error(`${tableName}.status has unexpected enum; refusing unsafe migration`);
  }

  const hasIndex = async indexName => {
    const [rows] = await connection.execute(
      "SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ? LIMIT 1",
      [tableName, indexName],
    );
    return Array.isArray(rows) && rows.length > 0;
  };
  if (!(await hasIndex("telegram_onboarding_intents_pending_expires_idx"))) {
    await connection.query("CREATE INDEX `telegram_onboarding_intents_pending_expires_idx` ON `telegram_onboarding_intents` (`status`, `expiresAt`)");
  }
  if (!(await hasIndex("telegram_onboarding_intents_token_unique"))) {
    throw new Error(`${tableName} is partially present; missing token unique index`);
  }
  if (!(await hasIndex("telegram_onboarding_intents_owner_kind_unique"))) {
    throw new Error(`${tableName} is partially present; missing owner/kind unique index`);
  }
  console.log("telegram_onboarding_intent_schema=ok");
} finally {
  await connection.end();
}
