import { getGroupsCatalog, updateGroupAnimatedAvatarSnapshot } from "../server/db.ts";
import { fetchTelegramGroupProfileMedia } from "../server/telegramUserAgent.ts";

const group = (await getGroupsCatalog()).find(item => item.title.trim().toLowerCase() === "market");
if (!group) throw new Error("Listed Market group was not found");

const result = await fetchTelegramGroupProfileMedia(group.chatId, group.id);
if (result.reason === "updated" && result.animatedAvatarKey && result.animatedAvatarUrl) {
  await updateGroupAnimatedAvatarSnapshot(group.id, {
    animatedAvatarKey: result.animatedAvatarKey,
    animatedAvatarUrl: result.animatedAvatarUrl,
  });
}

console.log(JSON.stringify({ groupId: group.id, title: group.title, status: group.status, result }, null, 2));
