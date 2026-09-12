import { useState } from "react";
import { TgTopAnimatedPyramidAvatar } from "@/components/TgTopAnimatedPyramidAvatar";

export type CommunityArtworkGroup = {
  chatId: string;
  title: string;
  username: string | null;
  avatarFileId: string | null;
  animatedAvatarUrl?: string | null;
};

export const getTelegramAvatarSrc = (group: CommunityArtworkGroup) =>
  // The server can refresh a missing/stale file id via getChat. Always use the
  // bounded local proxy for Telegram media instead of a browser-side t.me URL.
  group.chatId ? `/api/telegram-avatar/${group.chatId}` : null;

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
  const [videoFailed, setVideoFailed] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const size = hero ? "h-32 w-32" : large ? "h-16 w-16" : compact ? "h-12 w-12" : "h-11 w-11";
  const avatarSrc = getTelegramAvatarSrc(group);
  return (
    <span className={`${size} grid shrink-0 place-items-center overflow-hidden rounded-xl border border-white/10 bg-[#1b2430] text-sm font-semibold text-slate-200`}>
      {allowAnimatedMedia && group.animatedAvatarUrl && !videoFailed ? (
        <video key={group.animatedAvatarUrl} src={group.animatedAvatarUrl} poster={avatarSrc ?? undefined} muted loop autoPlay playsInline preload="metadata" disablePictureInPicture className="h-full w-full object-cover" onLoadedData={event => { void event.currentTarget.play().catch(() => undefined); }} onError={() => setVideoFailed(true)} />
      ) : avatarSrc && !imageFailed ? (
        <img src={avatarSrc} alt="" className="h-full w-full object-cover" onError={() => setImageFailed(true)} />
      ) : (
        <TgTopAnimatedPyramidAvatar className="h-[62%] w-[62%]" title="TG TOP" />
      )}
    </span>
  );
}

export function FullBleedCommunityArtwork({ group, allowAnimatedMedia = false }: { group: CommunityArtworkGroup; allowAnimatedMedia?: boolean }) {
  const [videoFailed, setVideoFailed] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const avatarSrc = getTelegramAvatarSrc(group);
  return (
    <span className="absolute inset-0 overflow-hidden bg-[radial-gradient(circle_at_50%_20%,#253a58_0%,#111720_68%)]">
      {allowAnimatedMedia && group.animatedAvatarUrl && !videoFailed ? (
        <video key={group.animatedAvatarUrl} src={group.animatedAvatarUrl} poster={avatarSrc ?? undefined} muted loop autoPlay playsInline preload="metadata" disablePictureInPicture className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover transition-transform duration-300 group-hover:scale-105 [-webkit-touch-callout:none]" onLoadedData={event => { void event.currentTarget.play().catch(() => undefined); }} onError={() => setVideoFailed(true)} />
      ) : avatarSrc && !imageFailed ? (
        <img src={avatarSrc} alt="" draggable={false} className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover transition-transform duration-300 group-hover:scale-105 [-webkit-touch-callout:none]" onError={() => setImageFailed(true)} />
      ) : (
        <span className="grid h-full w-full place-items-center bg-[radial-gradient(circle_at_35%_22%,#254e7a_0%,#111720_70%)] p-[24%]"><TgTopAnimatedPyramidAvatar className="h-full w-full" title="TG TOP" /></span>
      )}
    </span>
  );
}
