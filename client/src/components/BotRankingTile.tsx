import { BotAvatar } from "@/components/BotAvatar";

export type PublicBotTile = { id: number; username: string; telegramLink: string; category: string };

export function BotRankingTile({ bot, categoryLabel, variant, onOpen }: { bot: PublicBotTile; categoryLabel: string; variant: "lead" | "secondary" | "compact"; onOpen: () => void }) {
  const height = variant === "lead" ? "h-[214px]" : variant === "secondary" ? "h-[142px]" : "h-[96px]";
  return <button type="button" onClick={onOpen} className={`group relative w-full overflow-hidden rounded-2xl border border-white/10 bg-[#111720] text-left transition-all hover:border-[#3f8cff]/45 active:scale-[0.985] ${height}`}>
    <BotAvatar username={bot.username} className="absolute inset-0 h-full w-full rounded-none border-0 bg-[#111720]" imageClassName="brightness-[0.76] saturate-[1.08]" />
    <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,13,22,0.05)_10%,rgba(8,13,22,0.4)_48%,rgba(8,13,22,0.94)_100%)]" />
    <span className={`relative flex h-full flex-col justify-end ${variant === "lead" ? "p-4" : "p-3"}`}>
      <b className={`${variant === "lead" ? "text-lg" : variant === "secondary" ? "text-sm" : "text-xs"} block truncate text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.85)]`}>@{bot.username}</b>
      <small className="mt-1 block truncate text-[10px] text-slate-200/85">{categoryLabel}</small>
      {variant !== "compact" && <small className="mt-2 inline-flex w-fit rounded-md border border-[#b9d7ff]/25 bg-[#0e1c31]/80 px-1.5 py-1 text-[9px] font-semibold text-[#d4e6ff]">Открыть</small>}
    </span>
  </button>;
}

export default BotRankingTile;
