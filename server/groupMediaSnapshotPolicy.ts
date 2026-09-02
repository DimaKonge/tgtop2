export function canRefreshGroupMediaSnapshot(status: string, forceListedRefresh = false) {
  return forceListedRefresh || !["listed", "rented"].includes(status);
}

export function shouldUpdateAnimatedAvatarSnapshot(mediaType: string | null, reason: string) {
  return (mediaType === "video" && reason === "updated") || reason === "static_profile_media" || reason === "no_profile_media";
}
