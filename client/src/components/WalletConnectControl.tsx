import { useState } from "react";
import { useTonConnectUI } from "@tonconnect/ui-react";
import { ChevronRight, WalletCards, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Language } from "@/lib/tgTop-domain";

export function WalletConnectControl({ language, balanceTon, variant = "compact", ownerOpenId, address, restored, onDisconnect }: { language: Language; balanceTon: string; variant?: "compact" | "profile"; ownerOpenId?: string; address: string | null; restored: boolean; onDisconnect: () => Promise<void> }) {
  const [tonConnectUi] = useTonConnectUI();
  const [walletMenuOpen, setWalletMenuOpen] = useState(false);
  const openWalletForOwner = () => {
    if (ownerOpenId) window.localStorage.setItem("tgtop:ton-wallet-pending-owner", ownerOpenId);
    tonConnectUi.openModal();
  };
  const label = address
    ? language === "en" ? "Connected" : "Подключён"
    : language === "en"
      ? "Connect wallet"
      : "Кошелёк";
  const disconnectWallet = async () => {
    try {
      await onDisconnect();
    } finally {
      setWalletMenuOpen(false);
    }
  };

  if (variant === "profile") {
    const walletLabel = address
      ? `${address.slice(0, 5)}…${address.slice(-4)}`
      : language === "en" ? "Connect wallet" : "Подключить кошелёк";
    const trigger = <button disabled={!restored} onClick={() => address ? setWalletMenuOpen(true) : openWalletForOwner()} className={`mt-3 flex min-h-11 w-full items-center justify-between rounded-xl border px-3.5 text-left transition-colors disabled:opacity-60 ${address ? "border-white/10 bg-white/[0.035] text-slate-200 hover:bg-white/[0.07]" : "border-[#3f8cff]/45 bg-[#3f8cff]/14 text-[#c8ddff] hover:bg-[#3f8cff]/22"}`}><span className="flex min-w-0 items-center gap-2"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-current/20 bg-black/10"><WalletCards className="h-3.5 w-3.5" /></span><span className="min-w-0"><b className="block text-xs">{restored ? walletLabel : language === "en" ? "Loading wallet…" : "Загрузка кошелька…"}</b><small className="mt-0.5 block truncate text-[10px] text-slate-400">{address ? `${balanceTon} GRAM` : language === "en" ? "No transfer or signature is requested" : "Перевод и подпись не запрашиваются"}</small></span></span><ChevronRight className="h-4 w-4 shrink-0" /></button>;
    if (!address) return trigger;
    return <Popover open={walletMenuOpen} onOpenChange={setWalletMenuOpen}><PopoverTrigger asChild>{trigger}</PopoverTrigger><PopoverContent align="center" className="w-[min(22rem,calc(100vw-2rem))] border-white/10 bg-[#111720] p-3 text-slate-100 shadow-xl"><div className="space-y-3"><div><b className="block text-xs">{language === "en" ? "Personal wallet" : "Личный кошелёк"}</b><code className="mt-1 block break-all text-[10px] text-slate-400">{address}</code></div><button type="button" onClick={() => void disconnectWallet()} className="flex w-full items-center justify-center gap-2 rounded-lg border border-rose-300/25 bg-rose-500/[0.08] px-3 py-2 text-xs font-semibold text-rose-100 transition-colors hover:bg-rose-500/[0.14]"><X className="h-3.5 w-3.5" />{language === "en" ? "Disconnect wallet" : "Отключить кошелёк"}</button><small className="block text-center text-[9px] leading-4 text-slate-500">{language === "en" ? "Balances and operation history are not affected." : "Баланс и история операций не изменятся."}</small></div></PopoverContent></Popover>;
  }

  return <button disabled={!restored} onClick={openWalletForOwner} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#3f8cff]/35 bg-[#3f8cff]/10 px-2.5 text-[11px] font-medium text-[#a6c8ff] disabled:opacity-60"><WalletCards className="h-3.5 w-3.5" />{restored ? <><span>{label}</span>{address && <span className="rounded-md bg-[#0b0f14]/70 px-1.5 py-0.5 text-[10px] text-white">{balanceTon} GRAM</span>}</> : language === "en" ? "Loading…" : "Загрузка…"}</button>;
}

export default WalletConnectControl;
