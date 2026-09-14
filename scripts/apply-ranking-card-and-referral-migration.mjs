import mysql from "mysql2/promise";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required for ranking-card and referral migration");

const connection = await mysql.createConnection(databaseUrl);

async function hasTable(tableName) {
  const [rows] = await connection.execute(
    "SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ? LIMIT 1",
    [tableName],
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function hasColumn(tableName, columnName) {
  const [rows] = await connection.execute(
    "SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ? LIMIT 1",
    [tableName, columnName],
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function hasIndex(tableName, indexName) {
  const [rows] = await connection.execute(
    "SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ? LIMIT 1",
    [tableName, indexName],
  );
  return Array.isArray(rows) && rows.length > 0;
}

try {
  // 1. Add cardBackgroundPreset to groups_catalog (Migration 0064)
  if (await hasTable("groups_catalog")) {
    if (!(await hasColumn("groups_catalog", "cardBackgroundPreset"))) {
      console.log("Adding cardBackgroundPreset column to groups_catalog...");
      await connection.query("ALTER TABLE `groups_catalog` ADD COLUMN `cardBackgroundPreset` varchar(64) NULL");
      console.log("Column cardBackgroundPreset added successfully.");
    } else {
      console.log("Column groups_catalog.cardBackgroundPreset already exists.");
    }
  }

  // 2. Add bonus_credit_audits (Migration 0065)
  if (!(await hasTable("bonus_credit_audits"))) {
    console.log("Creating bonus_credit_audits table...");
    await connection.query(`CREATE TABLE \`bonus_credit_audits\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`actorOpenId\` varchar(64) NOT NULL,
      \`targetOpenId\` varchar(64) NOT NULL,
      \`targetTelegramUsername\` varchar(128),
      \`amount\` int NOT NULL,
      \`reason\` varchar(255) NOT NULL,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      CONSTRAINT \`bonus_credit_audits_id\` PRIMARY KEY(\`id\`)
    )`);
  }
  if (!(await hasIndex("bonus_credit_audits", "bonus_credit_audits_target_created_idx"))) {
    await connection.query("CREATE INDEX `bonus_credit_audits_target_created_idx` ON `bonus_credit_audits` (`targetOpenId`,`createdAt`)");
  }
  if (!(await hasIndex("bonus_credit_audits", "bonus_credit_audits_actor_created_idx"))) {
    await connection.query("CREATE INDEX `bonus_credit_audits_actor_created_idx` ON `bonus_credit_audits` (`actorOpenId`,`createdAt`)");
  }

  // 3. Add referral_bonus_grants (Migration 0065)
  if (!(await hasTable("referral_bonus_grants"))) {
    console.log("Creating referral_bonus_grants table...");
    await connection.query(`CREATE TABLE \`referral_bonus_grants\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`inviterOpenId\` varchar(64) NOT NULL,
      \`inviteeOpenId\` varchar(64) NOT NULL,
      \`amount\` int NOT NULL,
      \`source\` varchar(32) NOT NULL DEFAULT 'beta_referral',
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      CONSTRAINT \`referral_bonus_grants_id\` PRIMARY KEY(\`id\`),
      CONSTRAINT \`referral_bonus_grants_invitee_unique\` UNIQUE(\`inviteeOpenId\`)
    )`);
  }
  if (!(await hasIndex("referral_bonus_grants", "referral_bonus_grants_inviter_created_idx"))) {
    await connection.query("CREATE INDEX `referral_bonus_grants_inviter_created_idx` ON `referral_bonus_grants` (`inviterOpenId`,`createdAt`)");
  }

  // 4. Add referral_reward_configs (Migration 0065)
  if (!(await hasTable("referral_reward_configs"))) {
    console.log("Creating referral_reward_configs table...");
    await connection.query(`CREATE TABLE \`referral_reward_configs\` (
      \`id\` int NOT NULL DEFAULT 1,
      \`rewardAmount\` int NOT NULL DEFAULT 100,
      \`lifetimeLimit\` int NOT NULL DEFAULT 2,
      \`enabled\` boolean NOT NULL DEFAULT true,
      \`updatedByOpenId\` varchar(64),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`referral_reward_configs_id\` PRIMARY KEY(\`id\`)
    )`);
  }

  // Ensure default config exists
  await connection.query(`INSERT IGNORE INTO \`referral_reward_configs\` (\`id\`, \`rewardAmount\`, \`lifetimeLimit\`, \`enabled\`) VALUES (1, 100, 2, true)`);

  console.log("ranking_card_and_referral_migration=ok");
} finally {
  await connection.end();
}
