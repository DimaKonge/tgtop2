import { WalletConnectControl } from "@/components/WalletConnectControl";
import { WalletNftCard } from "@/components/WalletNftCard";
import type { Language, WalletNft, WalletNftFilter } from "@/lib/tgTop-domain";
import { Gift, Hash } from "lucide-react";

export interface WorkspaceNftSectionProps {
  language: Language;
  mainTon: string | number;
  safeWalletAddress: string | null;
  walletConnectionRestored: boolean;
  userOpenId?: string;
  openWalletForCurrentUser: () => void;
  disconnectTonWallet: () => Promise<void> | void;
  walletNfts: WalletNft[];
  visibleWalletNfts: WalletNft[];
  walletNftFilter: WalletNftFilter;
  setWalletNftFilter: (filter: WalletNftFilter) => void;
  isPending: boolean;
  isError: boolean;
  errorMessage?: string | null;
  refetch: () => void;
  onListNft?: (nft: WalletNft) => void;
}

export function WorkspaceNftSection({
  language,
  mainTon,
  safeWalletAddress,
  walletConnectionRestored,
  userOpenId,
  openWalletForCurrentUser,
  disconnectTonWallet,
  walletNfts,
  visibleWalletNfts,
  walletNftFilter,
  setWalletNftFilter,
  isPending,
  isError,
  errorMessage,
  refetch,
  onListNft,
}: WorkspaceNftSectionProps) {
  const tx = (ru: string, en: string) => (language === "en" ? en : ru);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <b className="block text-sm font-semibold text-slate-100">
            {tx("NFT и активы кошелька", "Wallet NFTs and Assets")}
          </b>
          <small className="block text-[11px] text-slate-400">
            {tx(
              "Юзернеймы, подарки и анонимные номера, доступные для листинга и аренды",
              "Usernames, gifts and anonymous numbers available for listing and rental"
            )}
          </small>
        </div>
        <WalletConnectControl
          language={language}
          balanceTon={String(mainTon)}
          variant="profile"
          ownerOpenId={userOpenId}
          address={safeWalletAddress}
          restored={walletConnectionRestored}
          onDisconnect={async () => {
            await disconnectTonWallet();
          }}
        />
      </div>

      {!walletConnectionRestored ? (
        <div className="rounded-xl border border-white/8 bg-white/[0.025] p-5 text-center text-xs text-slate-500">
          {tx("Проверяем подключение кошелька…", "Checking wallet connection…")}
        </div>
      ) : !safeWalletAddress ? (
        <div className="rounded-xl border border-dashed border-[#3f8cff]/28 bg-[#3f8cff]/[0.035] p-6 text-center">
          <Gift className="mx-auto h-6 w-6 text-[#8fb9ff]" />
          <b className="mt-3 block text-sm text-slate-200">
            {tx("Подключите GRAM-кошелёк", "Connect a GRAM wallet")}
          </b>
          <p className="mx-auto mt-1 max-w-xs text-[11px] leading-5 text-slate-500">
            {tx(
              "После подключения покажем NFT этого адреса. Нажмите на юзернейм или подарок, чтобы настроить листинг на продажу или в аренду.",
              "After connection, your NFTs will be shown. Click any username or gift to configure sale or rental listings."
            )}
          </p>
          <button
            type="button"
            onClick={openWalletForCurrentUser}
            className="mt-3 rounded-lg bg-[#1688f5] px-3 py-2 text-[11px] font-semibold text-white transition-transform active:scale-[0.98]"
          >
            {tx("Подключить кошелёк", "Connect wallet")}
          </button>
        </div>
      ) : isPending ? (
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="aspect-[.8] animate-pulse rounded-xl border border-white/7 bg-white/[0.035]"
            />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-rose-300/15 bg-rose-500/[0.06] p-4 text-center">
          <b className="block text-xs text-rose-100">
            {tx("NFT пока не загрузились", "NFTs could not be loaded")}
          </b>
          <p className="mt-1 text-[11px] leading-5 text-rose-100/60">{errorMessage}</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-2 text-[11px] font-semibold text-rose-100 underline underline-offset-4"
          >
            {tx("Повторить", "Retry")}
          </button>
        </div>
      ) : (
        <>
          <div className="flex gap-1 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
            {(
              [
                ["all", tx("Все", "All")],
                ["gifts", tx("Подарки", "Gifts")],
                ["usernames", tx("Юзернеймы", "Usernames")],
                ["anonymous_numbers", tx("Номера", "Numbers")],
                ["domains", tx("Домены", "Domains")],
                ["other", tx("Другие", "Other")],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setWalletNftFilter(value)}
                className={`h-7 shrink-0 rounded-full border px-2.5 text-[9px] font-medium transition-colors ${
                  walletNftFilter === value
                    ? "border-[#3f8cff]/45 bg-[#3f8cff]/12 text-[#c8ddff]"
                    : "border-white/10 bg-white/[0.025] text-slate-500 hover:text-slate-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between px-0.5 text-[10px] text-slate-500">
            <span>
              {visibleWalletNfts.length} {tx("NFT", "NFTs")}
            </span>
            <span className="font-mono">
              {safeWalletAddress.slice(0, 5)}…{safeWalletAddress.slice(-4)}
            </span>
          </div>

          {visibleWalletNfts.length ? (
            <div className="grid grid-cols-2 gap-2">
              {visibleWalletNfts.map((item) => (
                <WalletNftCard
                  key={item.address}
                  item={item}
                  language={language}
                  onList={onListNft}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-white/12 p-6 text-center">
              <Hash className="mx-auto h-5 w-5 text-slate-600" />
              <b className="mt-2 block text-xs text-slate-300">
                {walletNfts.length
                  ? tx("В этой категории пока нет NFT", "No NFTs in this category")
                  : tx("NFT в кошельке не найдено", "No NFTs found in this wallet")}
              </b>
              <small className="mt-1 block text-[10px] leading-4 text-slate-500">
                {walletNfts.length
                  ? tx("Выберите другую категорию.", "Choose a different category.")
                  : tx(
                      "Сеть GRAM не вернула NFT для подключённого адреса.",
                      "The GRAM network returned no NFTs for the connected address."
                    )}
              </small>
            </div>
          )}
        </>
      )}
    </section>
  );
}

export default WorkspaceNftSection;
