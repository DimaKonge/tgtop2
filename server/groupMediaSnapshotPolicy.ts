export function canRefreshGroupMediaSnapshot(status: string, forceListedRefresh = false) {
  return forceListedRefresh || !["listed", "rented"].includes(status);
}

export function shouldPersistAnimatedAvatar(mediaType: string | null, reason: string) {
  return mediaType === "video" && reason === "updated";
}
