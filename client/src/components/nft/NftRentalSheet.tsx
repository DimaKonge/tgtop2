import { useState, useId } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import type { Language, Nft } from "@/lib/tgTop-domain";
import { Clock, ShieldCheck, Sparkles } from "lucide-react";

export interface NftRentalSheetProps {
  nft: Nft | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  language: Language;
  onSuccess?: () => void;
}

export function NftRentalSheet({
  nft,
  open,
  onOpenChange,
  language,
  onSuccess,
}: NftRentalSheetProps) {
  const daysInputId = useId();
  const minDays = nft?.minRentalDays ?? 1;
  const maxDays = Math.max(minDays, nft?.maxRentalDays ?? 30);
  const [rentalDays, setRentalDays] = useState(minDays);

  const utils = trpc.useUtils();
  const tx = (ru: string, en: string) => (language === "en" ? en : ru);

  const createRentalMutation = trpc.tgTop.createNftRentalDeal.useMutation({
    onSuccess: (result) => {
      toast.success(
        tx(
          `Заявка на аренду @${result.nft.username} создана.`,
          `Rental request for @${result.nft.username} created.`
        )
      );
      void utils.tgTop.myDeals.invalidate();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err) => {
      toast.error(err.message || tx("Не удалось создать заявку на аренду", "Failed to create rental request"));
    },
  });

  if (!nft) return null;

  const perDayPrice = parseFloat(nft.rentalPricePerDay) || 0;
  const totalPrice = (perDayPrice * rentalDays).toFixed(2);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createRentalMutation.mutate({
      nftId: nft.id,
      rentalDays,
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
            <Clock className="h-4 w-4 text-[#3f8cff]" />
            <span>{tx("Аренда юзернейма", "Rent Username")}</span>
          </SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 px-4 text-xs">
          {/* Header info */}
          <div className="rounded-xl border border-white/10 bg-[#16202c] p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-base font-bold text-white">@{nft.username}</span>
              <span className="rounded-md border border-[#3f8cff]/30 bg-[#3f8cff]/10 px-2 py-0.5 text-[10px] font-medium text-[#a6c8ff]">
                {nft.rentalPricePerDay} GRAM / {tx("день", "day")}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              {tx("Владелец", "Owner")}: {nft.ownerUsername}
            </p>
          </div>

          {/* Duration slider */}
          <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor={daysInputId} className="font-medium text-slate-300">
                {tx("Срок аренды", "Rental duration")}:
              </label>
              <span className="font-bold text-[#a6c8ff]">
                {rentalDays} {tx("дней", "days")}
              </span>
            </div>

            <Slider
              value={[rentalDays]}
              min={minDays}
              max={maxDays}
              step={1}
              onValueChange={([val]) => setRentalDays(val)}
              className="py-2"
            />

            <div className="flex justify-between text-[10px] text-slate-500">
              <span>{minDays} {tx("дн.", "days")}</span>
              <span>{maxDays} {tx("дн.", "days")}</span>
            </div>
          </div>

          {/* Total calculation */}
          <div className="flex items-center justify-between rounded-xl border border-[#3f8cff]/25 bg-[#3f8cff]/10 p-3">
            <span className="font-medium text-slate-200">{tx("Итого к оплате", "Total payable")}:</span>
            <span className="text-base font-bold text-white">{totalPrice} GRAM</span>
          </div>

          {/* Notice */}
          <div className="flex items-start gap-2 rounded-xl border border-white/8 bg-black/20 p-3 text-[11px] leading-relaxed text-slate-400">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#3f8cff]" />
            <p>
              {tx(
                "Средства замораживаются в смарт-контракте эскроу и переводятся владельцу по мере истечения срока аренды. При нарушении условий депозит возвращается.",
                "Funds are held in escrow and released to the owner incrementally. Upon breach of terms, the remaining deposit is returned."
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
              disabled={createRentalMutation.isPending}
              className="h-10 flex-1 bg-[#3f8cff] text-xs font-semibold text-white hover:bg-[#3478db]"
            >
              {createRentalMutation.isPending ? (
                <span className="flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 animate-spin" />
                  {tx("Создание…", "Creating…")}
                </span>
              ) : (
                tx("Подтвердить заявку", "Confirm rental")
              )}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export default NftRentalSheet;
