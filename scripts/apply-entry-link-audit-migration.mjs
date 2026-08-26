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

  if (!(await hasTable("telegram_owner_dm_bindings"))) {
    await connection.query(`CREATE TABLE \`telegram_owner_dm_bindings\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`scope\` varchar(32) NOT NULL,
      \`ownerTelegramId\` varchar(64) NOT NULL,
      \`expectedUsername\` varchar(128) NOT NULL,
      \`boundByOpenId\` varchar(64) NOT NULL,
      \`greetingSentAt\` timestamp NOT NULL,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`telegram_owner_dm_bindings_id\` PRIMARY KEY(\`id\`),
      CONSTRAINT \`telegram_owner_dm_bindings_scope_unique\` UNIQUE(\`scope\`),
      CONSTRAINT \`telegram_owner_dm_bindings_owner_unique\` UNIQUE(\`ownerTelegramId\`)
    )`);
  }

  if (!(await hasTable("telegram_owner_dm_worker_states"))) {
    await connection.query(`CREATE TABLE \`telegram_owner_dm_worker_states\` (
      \`scope\` varchar(32) NOT NULL,
      \`enabled\` boolean NOT NULL DEFAULT true,
      \`manusTaskId\` varchar(128),
      \`activationSentAt\` timestamp,
      \`lastError\` varchar(255),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`telegram_owner_dm_worker_states_scope\` PRIMARY KEY(\`scope\`)
    )`);
  }

  if (!(await hasTable("telegram_owner_dm_jobs"))) {
    await connection.query(`CREATE TABLE \`telegram_owner_dm_jobs\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`telegramMessageId\` varchar(64) NOT NULL,
      \`ownerTelegramId\` varchar(64) NOT NULL,
      \`encryptedInput\` text NOT NULL,
      \`status\` enum('queued','leased','waiting_agent','completed','manual_review','cancelled') NOT NULL DEFAULT 'queued',
      \`availableAt\` timestamp NOT NULL DEFAULT (now()),
      \`leaseToken\` varchar(96),
      \`leaseExpiresAt\` timestamp,
      \`attempts\` int NOT NULL DEFAULT 0,
      \`manusTaskId\` varchar(128),
      \`dispatchedAt\` timestamp,
      \`deliveredEventId\` varchar(128),
      \`lastError\` varchar(255),
      \`completedAt\` timestamp,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`telegram_owner_dm_jobs_id\` PRIMARY KEY(\`id\`),
      CONSTRAINT \`telegram_owner_dm_jobs_message_unique\` UNIQUE(\`ownerTelegramId\`, \`telegramMessageId\`)
    )`);
  }
  if (!(await hasIndex("telegram_owner_dm_jobs", "telegram_owner_dm_jobs_status_available_idx"))) {
    await connection.query("CREATE INDEX `telegram_owner_dm_jobs_status_available_idx` ON `telegram_owner_dm_jobs` (`status`, `availableAt`, `id`)");
  }
  if (!(await hasIndex("telegram_owner_dm_jobs", "telegram_owner_dm_jobs_lease_expires_idx"))) {
    await connection.query("CREATE INDEX `telegram_owner_dm_jobs_lease_expires_idx` ON `telegram_owner_dm_jobs` (`status`, `leaseExpiresAt`)");
  }

  if (!(await hasTable("telegram_operation_log_destinations"))) {
    await connection.query(`CREATE TABLE \`telegram_operation_log_destinations\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`kind\` enum('top_activity','finance') NOT NULL,
      \`chatId\` varchar(64) NOT NULL,
      \`chatTitle\` varchar(255),
      \`configuredByOpenId\` varchar(64) NOT NULL,
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`telegram_operation_log_destinations_id\` PRIMARY KEY(\`id\`),
      CONSTRAINT \`telegram_operation_log_destinations_kind_unique\` UNIQUE(\`kind\`)
    )`);
  }
  console.log("entry_link_telegram_user_agent_and_log_destinations_migration=ok");
} finally {
  await connection.end();
}
