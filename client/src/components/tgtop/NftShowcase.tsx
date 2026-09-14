import type { ShowcaseNft, Language } from "@/lib/tgTop-domain";

export function NftShowcase({ nfts, language, title }: { nfts: ShowcaseNft[]; language: Language; title?: string }) {
  if (!nfts.length) return null;
  return (
    <section className="overflow-hidden rounded-2xl border border-[#3f8cff]/25 bg-[#111720]">
      <div className="flex items-center justify-between gap-3 border-b border-white/8 px-4 py-3">
        <span>
          <h2 className="text-sm font-semibold">{title ?? (language === "en" ? "NFT showcase" : "NFT-витрина")}</h2>
          <p className="mt-0.5 text-[10px] text-slate-500">{language === "en" ? "Selected by the owner" : "Выбрано владельцем"}</p>
        </span>
        <span className="rounded-md border border-[#3f8cff]/25 bg-[#3f8cff]/8 px-2 py-1 text-[9px] font-medium uppercase tracking-[0.1em] text-[#a6c8ff]">NFT</span>
      </div>
      <div className="grid grid-cols-2 gap-px bg-white/8 sm:grid-cols-3">
        {nfts.map(nft => (
          <div key={nft.id} className="min-w-0 bg-[#111720] p-3">
            <span className="grid h-8 w-8 place-items-center rounded-lg border border-[#3f8cff]/25 bg-[#3f8cff]/10 text-sm font-semibold text-[#a6c8ff]">@</span>
            <b className="mt-2 block truncate text-xs text-slate-100">@{nft.username}</b>
            <small className="mt-1 block truncate text-[10px] text-slate-500">{nft.assetClass === "onchain" ? "On-chain" : "Off-chain"} · {nft.listingType === "rent" ? nft.rentalPricePerDay : nft.price} GRAM</small>
          </div>
        ))}
      </div>
    </section>
  );
}
