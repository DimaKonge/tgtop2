import mysql from "mysql2/promise";

const connectionUrl = process.env.DATABASE_URL;

if (!connectionUrl) {
  throw new Error("DATABASE_URL is required");
}

const connection = await mysql.createConnection(connectionUrl);

try {
  await connection.execute(
    "ALTER TABLE `credit_transactions` MODIFY COLUMN `kind` enum('group_connection_bonus','listing_spend','ranking_spend','ranking_refund','manual_bonus','reward_campaign_reserve','reward_campaign_release','reward_subscription','reward_invite_referral','reward_manual_add') NOT NULL"
  );
  console.log("Applied production migration 0034");
} finally {
  await connection.end();
}
