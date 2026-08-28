import { useState } from "react";

export type CommunityArtworkGroup = {
  chatId: string;
  title: string;
  username: string | null;
  avatarFileId: string | null;
  animatedAvatarUrl?: string | null;
};

export const getTelegramAvatarSrc = (group: CommunityArtworkGroup) =>
  group.avatarFileId
    ? `/api/telegram-avatar/${group.chatId}`
    : group.username
      ? `https://t.me/i/userpic/320/${group.username}.jpg`
      : null;

export function CommunityAvatar({
  group,
  large = false,
  hero = false,
  compact = false,
  allowAnimatedMedia = false,
}: {
  group: CommunityArtworkGroup;
  large?: boolean;
  hero?: boolean;
  compact?: boolean;
  /** Animated assets must be explicitly enabled by the context, never by a generic catalog row. */
  allowAnimatedMedia?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const size = hero ? "h-32 w-32" : large ? "h-16 w-16" : compact ? "h-9 w-9" : "h-11 w-11";
  const avatarSrc = getTelegramAvatarSrc(group);
  return (
    <span className={`${size} grid shrink-0 place-items-center overflow-hidden rounded-xl border border-white/10 bg-[#1b2430] text-sm font-semibold text-slate-200`}>
      {allowAnimatedMedia && group.animatedAvatarUrl && !failed ? (
        <video key={group.animatedAvatarUrl} src={group.animatedAvatarUrl} poster={avatarSrc ?? undefined} muted loop autoPlay playsInline preload="metadata" disablePictureInPicture className="h-full w-full object-cover" onLoadedData={event => { void event.currentTarget.play().catch(() => undefined); }} onError={() => setFailed(true)} />
      ) : avatarSrc && !failed ? (
        <img src={avatarSrc} alt="" className="h-full w-full object-cover" onError={() => setFailed(true)} />
      ) : (
        group.title.slice(0, 1).toUpperCase()
      )}
    </span>
  );
}

export function FullBleedCommunityArtwork({ group, allowAnimatedMedia = false }: { group: CommunityArtworkGroup; allowAnimatedMedia?: boolean }) {
  const [failed, setFailed] = useState(false);
  const avatarSrc = getTelegramAvatarSrc(group);
  return (
    <span className="absolute inset-0 overflow-hidden bg-[radial-gradient(circle_at_50%_20%,#253a58_0%,#111720_68%)]">
      {allowAnimatedMedia && group.animatedAvatarUrl && !failed ? (
        <video key={group.animatedAvatarUrl} src={group.animatedAvatarUrl} poster={avatarSrc ?? undefined} muted loop autoPlay playsInline preload="metadata" disablePictureInPicture className="pointer-events-none h-full w-full select-none object-cover transition-transform duration-300 group-hover:scale-105 [-webkit-touch-callout:none]" onLoadedData={event => { void event.currentTarget.play().catch(() => undefined); }} onError={() => setFailed(true)} />
      ) : avatarSrc && !failed ? (
        <img src={avatarSrc} alt="" draggable={false} className="pointer-events-none h-full w-full select-none object-cover transition-transform duration-300 group-hover:scale-105 [-webkit-touch-callout:none]" onError={() => setFailed(true)} />
      ) : (
        <span className="grid h-full w-full place-items-center text-4xl font-semibold text-white/28">{group.title.slice(0, 1).toUpperCase()}</span>
      )}
    </span>
  );
}
