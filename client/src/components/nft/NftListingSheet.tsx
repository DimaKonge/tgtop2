import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import type { Language, WalletNft } from "@/lib/tgTop-domain";
import { Tag, Sparkles, ShieldCheck } from "lucide-react";

export interface NftListingSheetProps {
  nft: WalletNft | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  language: Language;
  walletAddress?: string | null;
  onSuccess?: () => void;
}

export function NftListingSheet({
  nft,
  open,
  onOpenChange,
  language,
  walletAddress,
  onSuccess,
}: NftListingSheetProps) {
  const [dealType, setDealType] = useState<"sale" | "rent" | "both" | "installments">("sale");
  const [price, setPrice] = useState("10");
  const [rentalPrice, setRentalPrice] = useState("1");
  const [minDays, setMinDays] = useState("3");
  const [maxDays, setMaxDays] = useState("30");

  const utils = trpc.useUtils();

  const createNftMutation = trpc.tgTop.createNft.useMutation({
    onSuccess: () => {
      toast.success(
        language === "en"
          ? "NFT successfully listed on the marketplace!"
          : "NFT успешно выставлен на маркетплейсе!"
      );
      void utils.tgTop.getNfts.invalidate();
      void utils.tgTop.myNfts.invalidate();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err) => {
      toast.error(err.message || (language === "en" ? "Failed to list NFT" : "Ошибка листинга NFT"));
    },
  });

  if (!nft) return null;

  const cleanName = nft.name.replace(/^@/, "").trim();
  const tx = (ru: string, en: string) => (language === "en" ? en : ru);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = Number(price);
    const rentalNum = Number(rentalPrice);

    if (dealType !== "rent" && (!priceNum || priceNum <= 0)) {
      toast.error(tx("Укажите корректную цену продажи", "Enter a valid sale price"));
      return;
    }

    if ((dealType === "rent" || dealType === "both") && (!rentalNum || rentalNum <= 0)) {
      toast.error(tx("Укажите корректную стоимость аренды", "Enter a valid rental price"));
      return;
    }

    createNftMutation.mutate({
      username: cleanName,
      price: `${price} GRAM`,
      priceAmount: priceNum || 0,
      rentalPricePerDay: `${rentalPrice} GRAM`,
      rentalAmountPerDay: rentalNum || 0,
      minRentalDays: Math.max(1, Number(minDays) || 1),
      maxRentalDays: Math.max(1, Number(maxDays) || 30),
      listingType: dealType === "rent" ? "rent" : dealType === "sale" ? "sale" : "both",
      assetClass: nft.address ? "onchain" : "offchain",
      nftItemAddress: nft.address,
      ownerWalletAddress: walletAddress || undefined,
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="!bottom-[calc(4.75rem+env(safe-area-inset-bottom))] max-h-[85dvh] overflow-y-auto rounded-t-[24px] border-white/10 bg-[#10161f] pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-slate-100"
      >
        <SheetHeader className="px-4 pb-2">
          <SheetTitle className="flex items-center gap-2 text-base text-slate-100">
            <Tag className="h-4 w-4 text-[#3f8cff]" />
            <span>{tx("Листинг NFT на маркетплейсе", "List NFT on Marketplace")}</span>
          </SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 px-4 text-xs">
          {/* NFT preview banner */}
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#16202c] p-3">
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-[#1b2430]">
              {nft.imageUrl ? (
                <img
                  src={nft.imageUrl}
                  alt={nft.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="grid h-full w-full place-items-center text-sm font-bold text-[#8fb9ff]">
                  {nft.name.slice(0, 1).toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <b className="block truncate text-sm text-slate-100">{nft.name}</b>
              <small className="block truncate text-[10px] text-slate-400">
                {nft.collectionName || tx("Коллекция Telegram", "Telegram Collection")}
              </small>
              <small className="block font-mono text-[9px] text-slate-500">
                {nft.address.slice(0, 8)}…{nft.address.slice(-6)}
              </small>
            </div>
          </div>

          {/* Deal type selection */}
          <div>
            <label className="mb-1.5 block font-medium text-slate-400">
              {tx("Формат размещения", "Listing format")}
            </label>
            <div className="grid grid-cols-2 gap-1.5 min-[440px]:grid-cols-4">
              {[
                { key: "sale", label: tx("Продажа", "Sale") },
                { key: "rent", label: tx("Аренда", "Rent") },
                { key: "both", label: tx("Продажа + аренда", "Sale & Rent") },
                { key: "installments", label: tx("Рассрочка", "Installments") },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setDealType(item.key as typeof dealType)}
                  className={`rounded-lg border px-2 py-2 text-center text-[11px] font-medium transition-colors ${
                    dealType === item.key
                      ? "border-[#3f8cff] bg-[#3f8cff]/15 text-[#a6c8ff]"
                      : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/10"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sale price */}
          {dealType !== "rent" && (
            <div>
              <label className="mb-1.5 block font-medium text-slate-400">
                {dealType === "installments"
                  ? tx("Полная цена выкупа (GRAM)", "Total buyout price (GRAM)")
                  : tx("Цена продажи (GRAM)", "Sale price (GRAM)")}
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="any"
                  min="0.1"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="10"
                  className="border-white/15 bg-black/20 text-sm text-white"
                  required
                />
                <span className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300">
                  GRAM
                </span>
              </div>
            </div>
          )}

          {/* Rent options */}
          {(dealType === "rent" || dealType === "both") && (
            <div className="space-y-3 rounded-xl border border-[#3f8cff]/20 bg-[#3f8cff]/5 p-3">
              <div>
                <label className="mb-1 block font-medium text-slate-300">
                  {tx("Аренда в день (GRAM)", "Daily rental price (GRAM)")}
                </label>
                <Input
                  type="number"
                  step="any"
                  min="0.1"
                  value={rentalPrice}
                  onChange={(e) => setRentalPrice(e.target.value)}
                  placeholder="1"
                  className="border-white/15 bg-black/20 text-sm text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-[10px] text-slate-400">
                    {tx("Мин. дней", "Min days")}
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={minDays}
                    onChange={(e) => setMinDays(e.target.value)}
                    className="border-white/15 bg-black/20 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] text-slate-400">
                    {tx("Макс. дней", "Max days")}
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={maxDays}
                    onChange={(e) => setMaxDays(e.target.value)}
                    className="border-white/15 bg-black/20 text-xs text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Guarantee info */}
          <div className="flex items-start gap-2 rounded-xl border border-white/8 bg-black/20 p-3 text-[11px] leading-relaxed text-slate-400">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#3f8cff]" />
            <p>
              {tx(
                "Сделка защищена escrow-протоколом TG TOP. Передача юзернейма или права пользования подтверждается владельцем после депонирования средств покупателем.",
                "The transaction is secured by TG TOP escrow. Transfer or usage rights are confirmed by the owner after buyer funds are escrowed."
              )}
            </p>
          </div>

          <SheetFooter className="mt-4 flex-row gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-10 flex-1 border-white/10 text-xs text-slate-300"
            >
              {tx("Отмена", "Cancel")}
            </Button>
            <Button
              type="submit"
              disabled={createNftMutation.isPending}
              className="h-10 flex-1 bg-[#3f8cff] text-xs font-semibold text-white hover:bg-[#3478db]"
            >
              {createNftMutation.isPending ? (
                <span className="flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 animate-spin" />
                  {tx("Размещение…", "Listing…")}
                </span>
              ) : (
                tx("Выставить на витрину", "Publish listing")
              )}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export default NftListingSheet;
