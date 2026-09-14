import { useState, useMemo, useEffect } from "react";

export interface UserAvatarProps {
  src?: string | null;
  userId?: string | null;
  username?: string | null;
  name?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  onClick?: () => void;
}

const SIZE_CLASSES = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-9 w-9 text-xs",
  md: "h-12 w-12 text-base",
  lg: "h-16 w-16 text-xl",
};

export function UserAvatar({
  src,
  userId,
  username,
  name,
  size = "sm",
  className = "",
  onClick,
}: UserAvatarProps) {
  const cleanUsername = username?.replace(/^@/, "").trim() || null;

  // Build ordered candidate list of image sources:
  // 1. Direct photo URL (e.g. from Telegram WebApp initData or profile)
  // 2. Direct Telegram CDN userpic if username is known
  // 3. Server-side proxy for user ID
  const candidateUrls = useMemo(() => {
    const urls: string[] = [];
    if (src && typeof src === "string" && src.trim()) {
      urls.push(src.trim());
    }
    if (cleanUsername) {
      urls.push(`https://t.me/i/userpic/320/${encodeURIComponent(cleanUsername)}.jpg`);
    }
    if (userId && typeof userId === "string" && userId.trim()) {
      urls.push(`/api/telegram-user-avatar/${encodeURIComponent(userId.trim())}`);
    }
    return Array.from(new Set(urls));
  }, [src, cleanUsername, userId]);

  const [candidateIndex, setCandidateIndex] = useState(0);

  useEffect(() => {
    setCandidateIndex(0);
  }, [candidateUrls]);

  const currentUrl = candidateUrls[candidateIndex] ?? null;

  const initial = (
    name?.replace(/^@/, "").trim().slice(0, 1) ||
    cleanUsername?.slice(0, 1) ||
    "T"
  ).toUpperCase();

  const sizeClass = SIZE_CLASSES[size] ?? SIZE_CLASSES.sm;

  return (
    <span
      onClick={onClick}
      className={`grid ${sizeClass} shrink-0 place-items-center overflow-hidden rounded-full border border-white/15 bg-[#17212b] font-bold text-white shadow-sm ring-1 ring-white/10 ${onClick ? "cursor-pointer hover:opacity-90" : ""} ${className}`}
    >
      {currentUrl ? (
        <img
          key={currentUrl}
          src={currentUrl}
          alt={name || cleanUsername || "User avatar"}
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover"
          onError={() => setCandidateIndex(prev => prev + 1)}
        />
      ) : (
        <span className="grid h-full w-full place-items-center bg-gradient-to-br from-[#2563eb] via-[#1d4ed8] to-[#0f172a] text-white font-bold drop-shadow-sm select-none">
          {initial}
        </span>
      )}
    </span>
  );
}

export default UserAvatar;
