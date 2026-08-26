import mysql from "mysql2/promise";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required for the entry-link audit migration");

const connection = await mysql.createConnection(databaseUrl);
try {
  const hasTable = async (tableName) => {
    const [rows] = await connection.execute(
      "SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ? LIMIT 1",
      [tableName],
    );
    return Array.isArray(rows) && rows.length > 0;
  };
  const hasIndex = async (tableName, indexName) => {
    const [rows] = await connection.execute(
      "SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ? LIMIT 1",
      [tableName, indexName],
    );
    return Array.isArray(rows) && rows.length > 0;
  };

  if (!(await hasTable("group_entry_link_audits"))) {
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

  if (!(await hasIndex("group_entry_link_audits", "group_entry_link_audits_group_created_idx"))) {
    await connection.query("CREATE INDEX `group_entry_link_audits_group_created_idx` ON `group_entry_link_audits` (`groupId`, `createdAt`)");
  }

  if (!(await hasTable("telegram_user_agent_audit_events"))) {
    await connection.query(`CREATE TABLE \`telegram_user_agent_audit_events\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`action\` varchar(64) NOT NULL,
      \`actorOpenId\` varchar(64) NOT NULL,
      \`details\` varchar(255),
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      CONSTRAINT \`telegram_user_agent_audit_events_id\` PRIMARY KEY(\`id\`)
    )`);
  }
  if (!(await hasIndex("telegram_user_agent_audit_events", "telegram_user_agent_audit_created_idx"))) {
    await connection.query("CREATE INDEX `telegram_user_agent_audit_created_idx` ON `telegram_user_agent_audit_events` (`createdAt`)");
  }

  if (!(await hasTable("telegram_user_agent_sessions"))) {
    await connection.query(`CREATE TABLE \`telegram_user_agent_sessions\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`scope\` varchar(32) NOT NULL,
      \`status\` enum('disconnected','code_pending','password_pending','connected','error') NOT NULL DEFAULT 'disconnected',
      \`encryptedSession\` text,
      \`encryptedPhone\` text,
      \`encryptedPhoneCodeHash\` text,
      \`accountTelegramId\` varchar(64),
      \`accountUsername\` varchar(128),
      \`expiresAt\` timestamp,
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`telegram_user_agent_sessions_id\` PRIMARY KEY(\`id\`),
      CONSTRAINT \`telegram_user_agent_sessions_scope_unique\` UNIQUE(\`scope\`)
    )`);
  }
  console.log("entry_link_and_telegram_user_agent_migration=ok");
} finally {
  await connection.end();
}
