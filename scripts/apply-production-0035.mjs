import mysql from "mysql2/promise";

const connectionUrl = process.env.DATABASE_URL;

if (!connectionUrl) {
  throw new Error("DATABASE_URL is required");
}

const connection = await mysql.createConnection(connectionUrl);

try {
  await connection.execute("ALTER TABLE `auction_slots` DROP INDEX `auction_slots_board_slot_unique`");
  await connection.execute("ALTER TABLE `auction_slots` MODIFY COLUMN `currentBid` varchar(64) NOT NULL DEFAULT '0 GRAM'");
  await connection.execute("ALTER TABLE `auction_slots` ADD `subcategory` varchar(64) DEFAULT 'Все' NOT NULL");
  await connection.execute("ALTER TABLE `auction_slots` ADD CONSTRAINT `auction_slots_board_slot_unique` UNIQUE(`category`,`subcategory`,`country`,`slotNumber`)");
  console.log("Applied production migration 0035");
} finally {
  await connection.end();
}
