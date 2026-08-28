import { ChevronRight, Plus, Star } from "lucide-react";
import { formatCatalogNumber } from "@/lib/catalog-format";
import { CommunityAvatar, type CommunityArtworkGroup } from "@/components/CommunityArtwork";

export type CompactCommunityRowGroup = CommunityArtworkGroup & {
  membersCount: number;
  rewardActive?: boolean | null;
  rewardAmount?: number | null;
};

export function CompactCommunityRow({
  group,
  language = "ru",
  accessLabel,
  salePrice,
  onOpen,
}: {
  group?: CompactCommunityRowGroup | null;
  language?: "ru" | "en";
  accessLabel?: string;
  salePrice?: string | null;
  onOpen: () => void;
}) {
  const emptyLabel = language === "en" ? "Add group" : "Добавить группу";
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={group ? `${language === "en" ? "Open" : "Открыть"} ${group.title}` : emptyLabel}
      className="group relative flex h-[68px] w-full min-w-0 items-center justify-between gap-2.5 overflow-hidden rounded-2xl border border-white/8 bg-[#111720] px-3 py-1.5 text-left transition-[transform,box-shadow,border-color,background-color] duration-200 ease-out hover:-translate-y-0.5 hover:border-[#3f8cff]/55 hover:bg-[#151e2b] hover:shadow-[0_10px_28px_rgba(63,140,255,0.16)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3f8cff]/70 active:translate-y-0 active:scale-[0.99]"
    >
      {group?.rewardActive && (group.rewardAmount ?? 0) > 0 && (
        <span aria-label={language === "en" ? "Rewards available" : "Вознаграждение активно"} className="absolute right-1.5 top-1.5 z-10 grid h-5 w-5 place-items-center rounded-full border border-amber-100/25 bg-[#202b3a]/90 text-amber-200 shadow-md shadow-black/20">
          <Star className="h-3 w-3 fill-current" />
        </span>
      )}
      {group ? (
        <>
          <span className="flex min-w-0 flex-1 items-center gap-2.5">
            <CommunityAvatar group={group} compact />
            <span className="min-w-0 flex-1">
              <b className="block truncate text-xs font-medium text-white transition-colors group-hover:text-[#a6c8ff]">{group.title}</b>
              <small className="block truncate text-[11px] text-slate-500">
                {accessLabel} · {formatCatalogNumber(group.membersCount, language)} {language === "en" ? "members" : "участников"}
              </small>
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-2 text-right">
            {salePrice ? (
              <span className="flex flex-col items-end">
                <b className="text-xs font-semibold text-[#72a8ff]">{salePrice} GRAM</b>
                <small className="text-[9px] text-slate-400">{language === "en" ? "For sale" : "Продажа"}</small>
              </span>
            ) : null}
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-600 transition-transform group-hover:translate-x-0.5 group-hover:text-[#3f8cff]" />
          </span>
        </>
      ) : (
        <span className="flex h-full items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-dashed border-white/20 text-slate-500"><Plus className="h-4 w-4" /></span>
          <b className="block text-sm font-light text-slate-300">{emptyLabel}</b>
        </span>
      )}
    </button>
  );
}
