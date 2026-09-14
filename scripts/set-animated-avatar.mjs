import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import mysql from "mysql2/promise";

const [inputPath, chatId] = process.argv.slice(2);

if (!inputPath || !chatId || !/^-?\d+$/.test(chatId)) {
  throw new Error("Usage: node scripts/set-animated-avatar.mjs <mp4-path> <chat-id>");
}

const forgeUrl = process.env.BUILT_IN_FORGE_API_URL?.replace(/\/+$/, "");
const forgeKey = process.env.BUILT_IN_FORGE_API_KEY;
const databaseUrl = process.env.DATABASE_URL;

if (!forgeUrl || !forgeKey || !databaseUrl) {
  throw new Error("Missing production storage or database configuration");
}

const video = await readFile(inputPath);
if (video.byteLength === 0) throw new Error("Provided MP4 is empty");

const objectKey = `telegram/animated-avatars/${chatId}_${randomUUID().replace(/-/g, "").slice(0, 8)}.mp4`;
const presignUrl = new URL("v1/storage/presign/put", `${forgeUrl}/`);
presignUrl.searchParams.set("path", objectKey);

const presignResponse = await fetch(presignUrl, {
  headers: { Authorization: `Bearer ${forgeKey}` },
});
if (!presignResponse.ok) {
  throw new Error(`Storage presign failed with ${presignResponse.status}`);
}

const { url: uploadUrl } = await presignResponse.json();
if (!uploadUrl) throw new Error("Storage did not return an upload URL");

const uploadResponse = await fetch(uploadUrl, {
  method: "PUT",
  headers: { "Content-Type": "video/mp4" },
  body: video,
});
if (!uploadResponse.ok) {
  throw new Error(`Storage upload failed with ${uploadResponse.status}`);
}

const publicUrl = `/manus-storage/${objectKey}`;
const connection = await mysql.createConnection(databaseUrl);
try {
  const [result] = await connection.execute(
    "UPDATE groups_catalog SET animatedAvatarUrl = ? WHERE chatId = ?",
    [publicUrl, chatId],
  );
  if (result.affectedRows !== 1) {
    throw new Error(`Expected one community for chat ${chatId}, updated ${result.affectedRows}`);
  }
} finally {
  await connection.end();
}

console.log(JSON.stringify({ chatId, publicUrl, bytes: video.byteLength }));
