import { fetchTelegramGroupProfileMedia } from "../server/telegramUserAgent";
import { updateGroupAnimatedAvatarSnapshot } from "../server/db";

const groupId = 26;
const chatId = "-1001295827057";
const result = await fetchTelegramGroupProfileMedia(chatId, groupId);
console.log(JSON.stringify({
  groupId,
  chatId,
  mediaType: result.mediaType,
  reason: result.reason,
  animatedAvatarKey: result.animatedAvatarKey ?? null,
  animatedAvatarUrl: result.animatedAvatarUrl ?? null,
}, null, 2));

const shouldPersist =
  (result.mediaType === "video" && result.reason === "updated") ||
  result.reason === "static_profile_media" ||
  result.reason === "no_profile_media";

if (shouldPersist) {
  await updateGroupAnimatedAvatarSnapshot(groupId, {
    animatedAvatarKey: result.animatedAvatarKey,
    animatedAvatarUrl: result.animatedAvatarUrl,
  });
  console.log(JSON.stringify({ persisted: true, groupId }));
} else {
  console.log(JSON.stringify({ persisted: false, groupId, reason: result.reason }));
}
