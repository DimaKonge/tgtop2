import { useState, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import type { Language, WalletNft, WalletNftFilter } from "@/lib/tgTop-domain";
import { Gift, WalletCards, RefreshCw, Search, ShieldCheck, Check, Copy, Tag, Sparkles, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export interface WalletNftPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  walletAddress?: string | null;
  language: Language;
  onSelectNft: (nft: WalletNft) => void;
  onConnectWallet: () => void;
}

export function WalletNftPickerModal({
  open,
  onOpenChange,
  walletAddress,
  language,
  onSelectNft,
  onConnectWallet,
}: WalletNftPickerModalProps) {
  const [activeTab, setActiveTab] = useState<"wallet" | "manual">("wallet");
  const [filter, setFilter] = useState<WalletNftFilter>("all");
  const [manualQuery, setManualQuery] = useState("");
  const [copied, setCopied] = useState(false);

  const tx = (ru: string, en: string) => (language === "en" ? en : ru);

  // Query wallet NFTs when open and address is available
  const walletNftsQuery = trpc.tgTop.getWalletNfts.useQuery(
    { walletAddress: walletAddress ?? "" },
    {
      enabled: open && Boolean(walletAddress),
      staleTime: 60_000,
    }
  );

  // Manual resolution query
  const [searchedQuery, setSearchedQuery] = useState("");
  const resolveQuery = trpc.tgTop.resolveTonNft.useQuery(
    { addressOrName: searchedQuery },
    {
      enabled: open && searchedQuery.trim().length > 10,
      retry: false,
    }
  );

  const walletItems = walletNftsQuery.data?.items ?? [];

  const filteredItems = useMemo(() => {
    if (filter === "all") return walletItems;
    return walletItems.filter((item) => item.category === filter);
  }, [walletItems, filter]);

  const copyAddress = () => {
    if (!walletAddress) return;
    void navigator.clipboard?.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success(tx("Адрес скопирован", "Address copied"));
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = manualQuery.trim();
    if (!clean) return;
    setSearchedQuery(clean);
  };

  const handleSelect = (nft: WalletNft) => {
    onSelectNft(nft);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="!bottom-[calc(4.75rem+env(safe-area-inset-bottom))] max-h-[88dvh] overflow-y-auto rounded-t-[24px] border-white/10 bg-[#0f151f] pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-slate-100"
      >
        <SheetHeader className="px-4 pb-2">
          <SheetTitle className="flex items-center justify-between text-base text-slate-100">
            <span className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-[#3f8cff]" />
              <span>{tx("Выставить реальный NFT", "List real NFT")}</span>
            </span>
            {walletAddress && (
              <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-0.5 text-[10px] font-medium text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-mono">{walletAddress.slice(0, 4)}…{walletAddress.slice(-4)}</span>
              </span>
            )}
          </SheetTitle>
          <p className="text-left text-xs text-slate-400">
            {tx(
              "Выберите актив из подключённого кошелька TON (Telegram Gifts, юзернеймы, анонимные номера).",
              "Select an asset from your connected TON wallet (Telegram Gifts, usernames, anonymous numbers)."
            )}
          </p>
        </SheetHeader>

        {/* Tab switcher */}
        <div className="flex border-b border-white/8 px-4 pt-1">
          <button
            type="button"
            onClick={() => setActiveTab("wallet")}
            className={`border-b-2 px-3 py-2 text-xs font-semibold transition-colors ${
              activeTab === "wallet"
                ? "border-[#3f8cff] text-[#3f8cff]"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            {tx("Из кошелька", "From wallet")}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("manual")}
            className={`border-b-2 px-3 py-2 text-xs font-semibold transition-colors ${
              activeTab === "manual"
                ? "border-[#3f8cff] text-[#3f8cff]"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            {tx("Указать адрес вручную", "Manual address")}
          </button>
        </div>

        <div className="p-4">
          {activeTab === "wallet" ? (
            !walletAddress ? (
              /* Wallet not connected */
              <div className="rounded-2xl border border-dashed border-[#3f8cff]/30 bg-[#3f8cff]/[0.04] p-6 text-center">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-[#3f8cff]/30 bg-[#3f8cff]/15">
                  <WalletCards className="h-6 w-6 text-[#3f8cff]" />
                </div>
                <b className="mt-3 block text-sm text-slate-100">
                  {tx("Подключите TON-кошелёк", "Connect your TON wallet")}
                </b>
                <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-400">
                  {tx(
                    "Подключите Telegram Wallet, Tonkeeper или другой кошелёк, чтобы мы автоматически нашли все ваши подарки, юзернеймы и номера.",
                    "Connect Telegram Wallet, Tonkeeper or another wallet to automatically load your gifts, usernames, and anonymous numbers."
                  )}
                </p>
                <button
                  type="button"
                  onClick={onConnectWallet}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#3f8cff] px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-[#3f8cff]/20 transition-all hover:bg-[#327be2] active:scale-[0.98]"
                >
                  <WalletCards className="h-4 w-4" />
                  <span>{tx("Подключить кошелёк", "Connect wallet")}</span>
                </button>
              </div>
            ) : (
              /* Wallet is connected */
              <div className="space-y-3">
                {/* Header bar with address & refresh */}
                <div className="flex items-center justify-between rounded-xl border border-white/8 bg-[#141b26] p-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#3f8cff]/15 text-[#3f8cff]">
                      <ShieldCheck className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <small className="block text-[10px] text-slate-400">{tx("Подключённый кошелёк", "Connected wallet")}</small>
                      <span className="font-mono text-xs text-slate-200">
                        {walletAddress.slice(0, 8)}…{walletAddress.slice(-6)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={copyAddress}
                      className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                      title={tx("Скопировать адрес", "Copy address")}
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => void walletNftsQuery.refetch()}
                      disabled={walletNftsQuery.isFetching}
                      className="flex h-8 items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 text-[11px] font-medium text-slate-300 hover:bg-white/10 disabled:opacity-50"
                    >
                      <RefreshCw className={`h-3 w-3 ${walletNftsQuery.isFetching ? "animate-spin" : ""}`} />
                      <span>{tx("Обновить", "Refresh")}</span>
                    </button>
                  </div>
                </div>

                {/* Categories */}
                <div className="flex gap-1.5 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
                  {([
                    ["all", tx("Все", "All")],
                    ["gifts", tx("Подарки", "Gifts")],
                    ["usernames", tx("Юзернеймы", "Usernames")],
                    ["anonymous_numbers", tx("Номера", "Numbers")],
                    ["domains", tx("Домены", "Domains")],
                    ["other", tx("Другие", "Other")],
                  ] as const).map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setFilter(val)}
                      className={`h-7 shrink-0 rounded-full border px-3 text-[10px] font-medium transition-colors ${
                        filter === val
                          ? "border-[#3f8cff]/50 bg-[#3f8cff]/15 text-[#9cc4ff]"
                          : "border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/5"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Items grid or status */}
                {walletNftsQuery.isLoading ? (
                  <div className="grid grid-cols-2 gap-2.5">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="aspect-[0.85] animate-pulse rounded-xl border border-white/8 bg-white/[0.03]" />
                    ))}
                  </div>
                ) : walletNftsQuery.isError ? (
                  <div className="rounded-xl border border-rose-400/20 bg-rose-500/[0.08] p-4 text-center">
                    <AlertCircle className="mx-auto h-5 w-5 text-rose-400" />
                    <b className="mt-1 block text-xs text-rose-200">{tx("Не удалось загрузить NFT", "Could not load NFTs")}</b>
                    <p className="mt-1 text-[10px] text-rose-300/70">{walletNftsQuery.error.message}</p>
                    <button
                      type="button"
                      onClick={() => void walletNftsQuery.refetch()}
                      className="mt-2 rounded-lg bg-rose-500/20 px-3 py-1 text-xs font-semibold text-rose-100 hover:bg-rose-500/30"
                    >
                      {tx("Повторить", "Retry")}
                    </button>
                  </div>
                ) : filteredItems.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2.5">
                    {filteredItems.map((item) => (
                      <article
                        key={item.address}
                        onClick={() => handleSelect(item)}
                        className="group relative cursor-pointer overflow-hidden rounded-xl border border-white/10 bg-[#131b27] p-2.5 transition-all hover:border-[#3f8cff]/40 hover:bg-[#182332] active:scale-[0.98]"
                      >
                        <div className="relative aspect-square overflow-hidden rounded-lg border border-white/8 bg-[#1a2331]">
                          {item.imageUrl ? (
                            item.mediaKind === "video" ? (
                              <video
                                src={item.imageUrl}
                                autoPlay
                                muted
                                loop
                                playsInline
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                loading="lazy"
                                className="h-full w-full object-cover"
                              />
                            )
                          ) : (
                            <span className="grid h-full w-full place-items-center bg-[radial-gradient(circle_at_30%_20%,rgba(84,143,255,.32),transparent 42%),#152131] text-lg font-bold text-[#aacaff]">
                              {item.name.slice(0, 1).toUpperCase()}
                            </span>
                          )}
                          <span className="absolute left-1.5 top-1.5 rounded-md border border-white/10 bg-black/60 px-1.5 py-0.5 text-[8px] font-semibold text-white backdrop-blur-sm">
                            {item.category === "gifts"
                              ? tx("Гифт", "Gift")
                              : item.category === "usernames"
                              ? tx("Юзернейм", "Username")
                              : item.category === "anonymous_numbers"
                              ? tx("Номер", "Number")
                              : tx("NFT", "NFT")}
                          </span>
                        </div>

                        <b className="mt-2 block truncate text-[11px] text-slate-100">{item.name}</b>
                        <small className="mt-0.5 block truncate text-[9px] text-slate-400">
                          {item.collectionName || tx("Коллекция TON", "TON Collection")}
                        </small>
                        <small className="mt-0.5 block truncate font-mono text-[8px] text-slate-500">
                          {item.address.slice(0, 6)}…{item.address.slice(-4)}
                        </small>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelect(item);
                          }}
                          className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg bg-[#3f8cff] py-1.5 text-[10px] font-semibold text-white shadow-sm transition-colors hover:bg-[#3478db]"
                        >
                          <Tag className="h-3 w-3" />
                          <span>{tx("Выставить", "List")}</span>
                        </button>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center">
                    <Gift className="mx-auto h-6 w-6 text-slate-500" />
                    <b className="mt-2 block text-xs text-slate-200">
                      {walletItems.length
                        ? tx("В этой категории нет NFT", "No NFTs in this category")
                        : tx("NFT в кошельке не найдено", "No NFTs found in this wallet")}
                    </b>
                    <p className="mx-auto mt-1 max-w-xs text-[10px] leading-4 text-slate-400">
                      {walletItems.length
                        ? tx("Попробуйте выбрать другую категорию.", "Try selecting another category.")
                        : tx(
                            "Сеть TON не вернула NFT для этого адреса. Если актив новый, укажите его адрес во вкладке «Указать адрес вручную».",
                            "TON network returned no NFTs for this address. If it is new, enter its address in the manual tab."
                          )}
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab("manual")}
                      className="mt-3 text-xs font-semibold text-[#3f8cff] underline underline-offset-4"
                    >
                      {tx("Указать адрес вручную →", "Enter address manually →")}
                    </button>
                  </div>
                )}
              </div>
            )
          ) : (
            /* Manual address lookup tab */
            <div className="space-y-4">
              <form onSubmit={handleManualSearch} className="space-y-2">
                <label className="block text-xs font-medium text-slate-300">
                  {tx("Адрес контракта NFT или юзернейм", "NFT contract address or username")}
                </label>
                <div className="flex gap-2">
                  <Input
                    value={manualQuery}
                    onChange={(e) => setManualQuery(e.target.value)}
                    placeholder="EQ... / UQ... / @username"
                    className="border-white/15 bg-black/20 text-xs text-white"
                  />
                  <button
                    type="submit"
                    disabled={!manualQuery.trim() || resolveQuery.isFetching}
                    className="shrink-0 rounded-lg bg-[#3f8cff] px-3 text-xs font-semibold text-white disabled:opacity-40"
                  >
                    {resolveQuery.isFetching ? tx("Поиск…", "Searching…") : tx("Найти", "Find")}
                  </button>
                </div>
                <small className="block text-[10px] text-slate-400">
                  {tx(
                    "Поддерживаются адреса NFT (EQ... / UQ...), Telegram Gifts, юзернеймы Fragment.",
                    "Supports NFT addresses (EQ... / UQ...), Telegram Gifts, Fragment usernames."
                  )}
                </small>
              </form>

              {resolveQuery.isLoading && (
                <div className="aspect-[2] animate-pulse rounded-xl border border-white/8 bg-white/[0.03]" />
              )}

              {resolveQuery.data ? (
                <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/[0.06] p-3">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-[#16202c]">
                      {resolveQuery.data.imageUrl ? (
                        <img
                          src={resolveQuery.data.imageUrl}
                          alt={resolveQuery.data.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="grid h-full w-full place-items-center text-sm font-bold text-[#8fb9ff]">
                          {resolveQuery.data.name.slice(0, 1).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <b className="block truncate text-xs text-slate-100">{resolveQuery.data.name}</b>
                      <small className="block truncate text-[10px] text-slate-400">
                        {resolveQuery.data.collectionName || tx("Коллекция TON", "TON Collection")}
                      </small>
                      <small className="block font-mono text-[9px] text-slate-500">
                        {resolveQuery.data.address.slice(0, 8)}…{resolveQuery.data.address.slice(-6)}
                      </small>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSelect(resolveQuery.data!)}
                    className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#3f8cff] py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#3478db]"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>{tx("Перейти к настройке цены и листингу", "Proceed to listing & price")}</span>
                  </button>
                </div>
              ) : searchedQuery && !resolveQuery.isLoading ? (
                <div className="rounded-xl border border-rose-400/20 bg-rose-500/[0.06] p-4 text-center">
                  <p className="text-xs text-rose-200">
                    {tx("NFT с таким адресом не найден в блокчейне TON.", "NFT with this address was not found in TON.")}
                  </p>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default WalletNftPickerModal;
