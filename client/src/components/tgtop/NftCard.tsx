import type { Language, Nft } from "@/lib/tgTop-domain";

export function NftCard({ nft, language, onRent }: { nft: Nft; language: Language; onRent?: (nft: Nft) => void }) {
  const copy = language === "en"
    ? { sale: "Sale", rent: "Rent", both: "Sale + rent", available: "Available", rented: "Rented", sold: "Sold", owner: "Owner", perDay: "GRAM / day", days: "days", onchain: "On-chain", offchain: "Off-chain" }
    : { sale: "Продажа", rent: "Аренда", both: "Продажа + аренда", available: "Доступен", rented: "В аренде", sold: "Продан", owner: "Владелец", perDay: "GRAM / день", days: "дней", onchain: "On-chain", offchain: "Off-chain" };
  const listingLabel = nft.listingType === "sale" ? copy.sale : nft.listingType === "rent" ? copy.rent : copy.both;
  const statusLabel = nft.status === "available" ? copy.available : nft.status === "rented" ? copy.rented : copy.sold;
  return (
    <article className="rounded-2xl border border-white/8 bg-[#111720] p-4">
      <div className="flex items-start justify-between gap-3">
        <span className="min-w-0">
          <b className="block truncate text-base font-semibold text-slate-100">@{nft.username}</b>
          <small className="mt-1 block text-xs text-slate-500">{copy.owner}: {nft.ownerUsername}</small>
        </span>
        <span className="flex flex-col items-end gap-1">
          <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[9px] font-medium uppercase tracking-[0.08em] text-slate-400">{nft.assetClass === "onchain" ? copy.onchain : copy.offchain}</span>
          <span className="rounded-md border border-[#3f8cff]/25 bg-[#3f8cff]/10 px-2 py-1 text-[10px] font-medium text-[#a6c8ff]">{statusLabel}</span>
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        {(nft.listingType === "sale" || nft.listingType === "both") && (
          <div className="rounded-xl bg-white/5 p-2.5">
            <span className="block text-[10px] text-slate-500">{copy.sale}</span>
            <b className="mt-1 block text-sm text-slate-100">{nft.price}</b>
          </div>
        )}
        {(nft.listingType === "rent" || nft.listingType === "both") && (
          <div className="rounded-xl bg-white/5 p-2.5">
            <span className="block text-[10px] text-slate-500">{copy.rent}</span>
            <b className="mt-1 block text-sm text-slate-100">{nft.rentalPricePerDay} {copy.perDay}</b>
            <small className="mt-1 block text-[10px] text-slate-500">{nft.minRentalDays}–{nft.maxRentalDays} {copy.days}</small>
          </div>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="inline-flex rounded-md bg-white/5 px-2 py-1 text-[10px] text-slate-400">{listingLabel}</span>
        {(nft.listingType === "rent" || nft.listingType === "both") && nft.status === "available" && onRent && (
          <button type="button" onClick={() => onRent(nft)} className="rounded-lg border border-[#3f8cff]/35 bg-[#3f8cff]/10 px-2.5 py-1.5 text-[10px] font-semibold text-[#a6c8ff] transition-colors hover:bg-[#3f8cff]/18 active:scale-[0.98]">
            {language === "en" ? "Request rental" : "Запросить аренду"}
          </button>
        )}
      </div>
    </article>
  );
}
