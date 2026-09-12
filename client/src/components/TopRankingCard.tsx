import { useState } from "react";
import { Plus, Star } from "lucide-react";
import { formatCatalogNumber } from "@/lib/catalog-format";
import { TgTopAnimatedPyramidAvatar } from "@/components/TgTopAnimatedPyramidAvatar";
import { getCommunityCardBackgroundStyle } from "@/lib/community-card-background";

export type TopRankingCardVariant = "lead" | "secondary" | "compact";

export type TopRankingCardGroup = {
  title: string;
  username: string | null;
  inviteLink: string | null;
  avatarFileId: string | null;
  animatedAvatarUrl?: string | null;
  membersCount: number;
  joinedCount: number;
  rewardActive?: boolean;
  rewardAmount?: number;
  cardBackgroundPreset?: string | null;
  /** Set only by the verified server-side TOP identity configuration. */
  topPyramidAvatar?: boolean;
};

type TopRankingCardProps = {
  group?: TopRankingCardGroup | null;
  variant: TopRankingCardVariant;
  language: "ru" | "en";
  avatarSrc?: string | null;
  showTgTopPyramidAvatar?: boolean;
  onClick: () => void;
  onOpenCommunity?: (url: string) => void;
};

/**
 * Presentation-only TOP card. It is deliberately limited to the upper 1+2+4
 * ranking grid: catalog rows keep their lightweight list renderer in Home.
 */
export function TopRankingCard({ group, variant, language, avatarSrc, showTgTopPyramidAvatar = false, onClick, onOpenCommunity }: TopRankingCardProps) {
  const [videoFailed, setVideoFailed] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const lead = variant === "lead";
  const compact = variant === "compact";
  const cardStyle = lead
    ? "h-[300px] border-[#3f8cff]/35 bg-[#141c27] p-5 sm:h-[46vh] sm:p-6"
    : variant === "secondary"
      ? "h-[136px] border-white/10 bg-[#111720] p-3 sm:h-[168px] sm:p-4"
      : "h-[88px] border-white/8 bg-[#111720] p-2 sm:h-[124px]";
  const groupUrl = group?.inviteLink ?? (group?.username ? `https://t.me/${group.username}` : null);
  const accessLabel = group?.username ? `@${group.username}` : language === "en" ? "Private" : "Приватный";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      aria-label={group ? `${language === "en" ? "Open" : "Открыть"} ${group.title}` : undefined}
      style={getCommunityCardBackgroundStyle(group?.cardBackgroundPreset)}
      className={`tg-community-card relative min-w-0 w-full overflow-hidden rounded-2xl border text-left transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:border-[#3f8cff]/55 hover:shadow-[0_10px_28px_rgba(63,140,255,0.16)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3f8cff]/70 active:translate-y-0 active:scale-[0.99] ${cardStyle}`}
    >
      {group?.rewardActive && (group.rewardAmount ?? 0) > 0 && (
        <span aria-label={language === "en" ? "Rewards available" : "Вознаграждение активно"} className={`absolute right-1.5 top-1.5 z-10 grid place-items-center rounded-full border border-amber-100/25 bg-[#202b3a]/90 text-amber-200 shadow-md shadow-black/20 ${lead ? "h-7 w-7" : compact ? "h-4 w-4" : "h-5 w-5"}`}>
          <Star className={lead ? "h-4 w-4 fill-current" : compact ? "h-2.5 w-2.5 fill-current" : "h-3 w-3 fill-current"} />
        </span>
      )}
      {group ? (
        <>
          {showTgTopPyramidAvatar ? (
            <span className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_35%_22%,#254e7a_0%,#111720_70%)] p-[16%]">
              <TgTopAnimatedPyramidAvatar className="h-full w-full" title="TG TOP" />
            </span>
          ) : group.animatedAvatarUrl && !videoFailed ? (
            <video key={group.animatedAvatarUrl} src={group.animatedAvatarUrl} poster={avatarSrc ?? undefined} muted loop autoPlay playsInline preload="metadata" disablePictureInPicture className="pointer-events-none absolute inset-0 h-full w-full object-cover" onLoadedData={event => { void event.currentTarget.play().catch(() => undefined); }} onError={() => setVideoFailed(true)} />
          ) : avatarSrc && !imageFailed ? (
            <img src={avatarSrc} alt="" className="absolute inset-0 h-full w-full object-cover" onError={() => setImageFailed(true)} />
          ) : (
            <span className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_35%_22%,#254e7a_0%,#111720_70%)] p-[24%]"><TgTopAnimatedPyramidAvatar className="h-full w-full" title="TG TOP" /></span>
          )}
          <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,10,15,0.06)_8%,rgba(7,10,15,0.82)_100%)]" />
          <span className={`tg-media-overlay-content absolute inset-x-0 bottom-0 min-w-0 ${compact ? "p-2" : lead ? "p-5 sm:p-6" : "p-3 sm:p-4"}`}>
            <b className={`${lead ? "text-xl" : compact ? "text-[11px]" : "text-sm"} tg-media-overlay-title block max-w-full truncate font-semibold text-white`}>{group.title}</b>
            <small className={`tg-media-overlay-meta mt-1 block max-w-full truncate text-slate-200/80 ${compact ? "text-[8px]" : "text-xs"}`}>
              {lead && <>{groupUrl && onOpenCommunity ? <a href={groupUrl} onClick={event => { event.preventDefault(); event.stopPropagation(); onOpenCommunity(groupUrl); }} className="no-underline hover:text-white">{accessLabel}</a> : accessLabel} · </>}
              {formatCatalogNumber(group.membersCount, language)} {language === "en" ? "members" : "участников"} · +{formatCatalogNumber(group.joinedCount, language)}
            </small>
          </span>
        </>
      ) : (
        <span className="absolute inset-0 grid place-items-center">
          <span className="flex max-w-full flex-col items-center gap-2 px-2 text-center">
            <span className={`${lead ? "h-16 w-16" : compact ? "h-9 w-9" : "h-11 w-11"} grid place-items-center rounded-xl border border-dashed border-white/20 text-slate-500`}><Plus className="h-4 w-4" /></span>
            <small className={`max-w-full truncate font-light tracking-wide text-slate-500 ${compact ? "text-[9px]" : "text-[11px]"}`}>{language === "en" ? "Available" : "Свободно"}</small>
          </span>
        </span>
      )}
    </div>
  );
}
