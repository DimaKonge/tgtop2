import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { Language, Nft } from "@/lib/tgTop-domain";
import { ShoppingCart, ShieldCheck, CheckCircle2 } from "lucide-react";

export interface NftBuySheetProps {
  nft: Nft | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  language: Language;
  onSuccess?: () => void;
}

export function NftBuySheet({
  nft,
  open,
  onOpenChange,
  language,
  onSuccess,
}: NftBuySheetProps) {
  const tx = (ru: string, en: string) => (language === "en" ? en : ru);

  if (!nft) return null;

  const handleConfirmBuy = () => {
    toast.success(
      tx(
        `Заявка на покупку @${nft.username} отправлена владельцу @${nft.ownerUsername}`,
        `Purchase request for @${nft.username} sent to owner @${nft.ownerUsername}`
      )
    );
    onOpenChange(false);
    onSuccess?.();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="!bottom-[calc(4.75rem+env(safe-area-inset-bottom))] max-h-[85dvh] overflow-y-auto rounded-t-[24px] border-white/10 bg-[#10161f] pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-slate-100"
      >
        <SheetHeader className="px-4 pb-2">
          <SheetTitle className="flex items-center gap-2 text-base text-slate-100">
            <ShoppingCart className="h-4 w-4 text-[#3f8cff]" />
            <span>{tx("Покупка NFT через Escrow", "Buy NFT via Escrow")}</span>
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 px-4 text-xs">
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#16202c] p-4">
            <div>
              <b className="block text-base text-white">@{nft.username}</b>
              <small className="mt-0.5 block text-slate-400">
                {tx("Владелец", "Owner")}: {nft.ownerUsername}
              </small>
            </div>
            <div className="text-right">
              <span className="text-lg font-bold text-white">{nft.price}</span>
              <small className="block text-[10px] text-[#8fb9ff]">
                {nft.assetClass === "onchain" ? "On-chain" : "Off-chain"}
              </small>
            </div>
          </div>

          <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
            <b className="block text-xs font-semibold text-slate-200">
              {tx("Как работает безопасная сделка:", "How secure escrow works:")}
            </b>
            <ul className="space-y-2 text-[11px] text-slate-400">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                <span>
                  {tx(
                    "Сумма депонируется на смарт-контракте гаранта TG TOP.",
                    "Funds are deposited into the TG TOP escrow contract."
                  )}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                <span>
                  {tx(
                    "Владелец переоформляет Telegram-юзернейм или NFT на ваш аккаунт/кошелёк.",
                    "The owner transfers the Telegram username or NFT to your account/wallet."
                  )}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                <span>
                  {tx(
                    "После автоматической или ручной проверки права владения деньги переводятся продавцу.",
                    "After ownership verification, funds are released to the seller."
                  )}
                </span>
              </li>
            </ul>
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-white/8 bg-black/20 p-3 text-[11px] leading-relaxed text-slate-400">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#3f8cff]" />
            <p>
              {tx(
                "Полная защита от мошенничества: если продавец не передаст права в течение 24 часов, вы сможете мгновенно отозвать средства.",
                "Full fraud protection: if the seller does not complete the transfer within 24 hours, funds can be instantly reclaimed."
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
              type="button"
              onClick={handleConfirmBuy}
              className="h-10 flex-1 bg-[#3f8cff] text-xs font-semibold text-white hover:bg-[#3478db]"
            >
              {tx("Перейти к оплате", "Proceed to payment")}
            </Button>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default NftBuySheet;
