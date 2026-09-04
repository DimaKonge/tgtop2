import { useState } from "react";
import type { Language, WalletNft } from "@/lib/tgTop-domain";

export function WalletNftCard({ item, language }: { item: WalletNft; language: Language }) {
  const [imageFailed, setImageFailed] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  const categoryLabel: Record<WalletNft["category"], string> = {
    gifts: language === "en" ? "Gifts" : "Гифты",
    usernames: language === "en" ? "Username" : "Юзернейм",
    anonymous_numbers: language === "en" ? "Anonymous number" : "Анон-номер",
    domains: language === "en" ? "Domain" : "Домен",
    other: language === "en" ? "Other NFT" : "Другой NFT",
  };
  const categoryClass: Record<WalletNft["category"], string> = {
    gifts: "border-amber-200/20 bg-amber-300/[0.08] text-amber-100",
    usernames: "border-[#82b6ff]/25 bg-[#3f8cff]/10 text-[#c8ddff]",
    anonymous_numbers: "border-violet-200/20 bg-violet-400/[0.09] text-violet-100",
    domains: "border-emerald-200/20 bg-emerald-400/[0.09] text-emerald-100",
    other: "border-white/10 bg-white/[0.045] text-slate-300",
  };
  const shortAddress = item.address.length > 16 ? `${item.address.slice(0, 7)}…${item.address.slice(-5)}` : item.address;
  const imageUrls = Array.from(new Set([...(item.imageUrls ?? []), item.imageUrl].filter((url): url is string => Boolean(url))));
  const imageUrl = imageUrls[imageIndex] ?? null;
  const tryNextImage = () => {
    if (imageIndex + 1 < imageUrls.length) setImageIndex(index => index + 1);
    else setImageFailed(true);
  };

  return <article className="overflow-hidden rounded-xl border border-white/9 bg-[#111720] p-2.5 transition-colors hover:border-white/16 hover:bg-[#151d29]">
    <div className="relative aspect-square overflow-hidden rounded-lg border border-white/8 bg-[#1b2430]">
      {imageUrl && !imageFailed ? item.mediaKind === "video" && imageIndex === 0 ? <video src={imageUrl} autoPlay muted loop playsInline className="h-full w-full object-cover" onError={tryNextImage} /> : <img src={imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-cover" onError={tryNextImage} /> : <span className="grid h-full w-full place-items-center bg-[radial-gradient(circle_at_30%_20%,rgba(84,143,255,.32),transparent 42%),#152131] text-lg font-semibold text-[#aacaff]">{item.name.slice(0, 1).toUpperCase()}</span>}
      <span className={`absolute left-1.5 top-1.5 rounded-md border px-1.5 py-1 text-[8px] font-semibold backdrop-blur-sm ${categoryClass[item.category]}`}>{categoryLabel[item.category]}</span>
    </div>
    <b className="mt-2 block truncate text-[11px] text-slate-100">{item.name}</b>
    <small className="mt-0.5 block truncate text-[9px] text-slate-500">{item.collectionName ?? categoryLabel[item.category]}</small>
    <small className="mt-1 block truncate font-mono text-[8px] text-slate-600">{shortAddress}</small>
  </article>;
}

export default WalletNftCard;
