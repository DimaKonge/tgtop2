import mysql from "mysql2/promise";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required for operations-topic migrations");

const connection = await mysql.createConnection(databaseUrl);

async function hasTable(tableName) {
  const [rows] = await connection.execute(
    "SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ? LIMIT 1",
    [tableName],
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function getColumnNames(tableName) {
  const [rows] = await connection.execute(
    "SELECT column_name AS columnName FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ?",
    [tableName],
  );
  return new Set(rows.map(row => row.columnName));
}

async function hasIndex(tableName, indexName) {
  const [rows] = await connection.execute(
    "SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ? LIMIT 1",
    [tableName, indexName],
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function ensureExpectedColumns(tableName, expectedColumns) {
  const actualColumns = await getColumnNames(tableName);
  const missingColumns = expectedColumns.filter(column => !actualColumns.has(column));
  if (missingColumns.length) throw new Error(`${tableName} is partially present; missing ${missingColumns.join(", ")}`);
}

try {
  if (!(await hasTable("mini_app_launch_events"))) {
    await connection.query(`CREATE TABLE \`mini_app_launch_events\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`userOpenId\` varchar(64) NOT NULL,
      \`source\` varchar(32) NOT NULL,
      \`startParam\` varchar(128),
      \`sessionKey\` varchar(128) NOT NULL,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      CONSTRAINT \`mini_app_launch_events_id\` PRIMARY KEY(\`id\`),
      CONSTRAINT \`mini_app_launch_session_unique\` UNIQUE(\`sessionKey\`)
    )`);
  }
  await ensureExpectedColumns("mini_app_launch_events", ["id", "userOpenId", "source", "startParam", "sessionKey", "createdAt"]);
  if (!(await hasIndex("mini_app_launch_events", "mini_app_launch_created_idx"))) {
    await connection.query("CREATE INDEX `mini_app_launch_created_idx` ON `mini_app_launch_events` (`createdAt`)");
  }
  if (!(await hasIndex("mini_app_launch_events", "mini_app_launch_source_created_idx"))) {
    await connection.query("CREATE INDEX `mini_app_launch_source_created_idx` ON `mini_app_launch_events` (`source`, `createdAt`)");
  }

  if (!(await hasTable("telegram_support_messages"))) {
    await connection.query(`CREATE TABLE \`telegram_support_messages\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`telegramUserId\` varchar(64) NOT NULL,
      \`telegramUsername\` varchar(128),
      \`direction\` enum('inbound','outbound') NOT NULL,
      \`text\` text NOT NULL,
      \`telegramMessageId\` varchar(64) NOT NULL,
      \`ownerNotificationMessageId\` varchar(64),
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      CONSTRAINT \`telegram_support_messages_id\` PRIMARY KEY(\`id\`),
      CONSTRAINT \`telegram_support_message_unique\` UNIQUE(\`telegramUserId\`,\`telegramMessageId\`,\`direction\`),
      CONSTRAINT \`telegram_support_owner_notification_unique\` UNIQUE(\`ownerNotificationMessageId\`)
    )`);
  }
  await ensureExpectedColumns("telegram_support_messages", ["id", "telegramUserId", "telegramUsername", "direction", "text", "telegramMessageId", "ownerNotificationMessageId", "createdAt"]);
  if (!(await hasIndex("telegram_support_messages", "telegram_support_user_created_idx"))) {
    await connection.query("CREATE INDEX `telegram_support_user_created_idx` ON `telegram_support_messages` (`telegramUserId`, `createdAt`)");
  }
  if (!(await hasIndex("telegram_support_messages", "telegram_support_created_idx"))) {
    await connection.query("CREATE INDEX `telegram_support_created_idx` ON `telegram_support_messages` (`createdAt`)");
  }

  if (!(await hasTable("telegram_operation_log_destinations"))) {
    throw new Error("telegram_operation_log_destinations is missing; the base release migration must run first");
  }
  const [kindRows] = await connection.execute(
    "SELECT column_type AS columnType FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'telegram_operation_log_destinations' AND column_name = 'kind' LIMIT 1",
  );
  const kindType = kindRows[0]?.columnType;
  const oldKindTypes = new Set([
    "enum('top_activity','finance')",
    "enum('top_activity','finance','support')",
    "enum('top_activity','finance','support','launches')",
  ]);
  if (!oldKindTypes.has(kindType)) throw new Error("telegram_operation_log_destinations.kind has an unexpected enum; refusing unsafe migration");
  if (kindType !== "enum('top_activity','finance','support','launches')") {
    await connection.query("ALTER TABLE `telegram_operation_log_destinations` MODIFY COLUMN `kind` enum('top_activity','finance','support','launches') NOT NULL");
  }
  const destinationColumns = await getColumnNames("telegram_operation_log_destinations");
  if (!destinationColumns.has("messageThreadId")) {
    await connection.query("ALTER TABLE `telegram_operation_log_destinations` ADD `messageThreadId` int");
  }
  await ensureExpectedColumns("telegram_operation_log_destinations", ["id", "kind", "chatId", "messageThreadId", "chatTitle", "configuredByOpenId", "updatedAt"]);

  console.log("operations_topic_schema=ok");
} finally {
  await connection.end();
}
