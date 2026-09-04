import { useEffect, useMemo, useRef, useState } from "react";
import { closestCenter, DndContext, DragOverlay, KeyboardSensor, PointerSensor, type DragEndEvent, type DragStartEvent, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, rectSortingStrategy, SortableContext, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useAuth } from "@/_core/hooks/useAuth";
import { startTelegramLogin } from "@/lib/telegramLogin";
import { trpc } from "@/lib/trpc";
import { formatCatalogDate as date, formatCatalogDateTime as dateTime, formatCatalogNumber as n, formatGram, normalizeRankingBid, parseGramInput } from "@/lib/catalog-format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { AudienceGrowthChart, GramBalanceChart, Metric, TelegramAnalyticsChart, telegramNotificationPercent, type AudienceSnapshot, type TelegramAnalyticsGraph, type TelegramAnalyticsSummary } from "@/components/analytics/ChartPanels";
import { TgTopPyramidIcon } from "@/components/TgTopPyramidIcon";
import { TopRankingCard } from "@/components/TopRankingCard";
import { CommunityAvatar as Avatar, FullBleedCommunityArtwork as FullBleedGroupArtwork, getTelegramAvatarSrc } from "@/components/CommunityArtwork";
import { CompactCommunityRow } from "@/components/CompactCommunityRow";
import { SortableMyGroupTile } from "@/components/SortableMyGroupTile";
import { NftCard } from "@/components/NftCard";
import { NftShowcase } from "@/components/NftShowcase";
import { BrandMark } from "@/components/BrandMark";
import { WalletConnectControl } from "@/components/WalletConnectControl";
import { WalletNftCard } from "@/components/WalletNftCard";
import { ChannelGiftMediaPreview } from "@/components/ChannelGiftMediaPreview";
import { SettingsSheet } from "@/components/SettingsSheet";
import { BotAvatar } from "@/components/BotAvatar";
import { BotRankingTile, type PublicBotTile } from "@/components/BotRankingTile";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useTheme, type Appearance, type ThemeAccent, type ThemeStyle } from "@/contexts/ThemeContext";
import {
  ArrowLeft,
  BarChart3,
  Bot,
  Check,
  ChevronRight,
  Filter,
  FolderPlus,
  Gift,
  Globe2,
  GripVertical,
  Hash,
  LayoutGrid,
   List,
   MessageSquare,
   Minus,
  Moon,
  PackageOpen,
  Palette,
  Plus,
  Pin,
  PinOff,
  Send,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  Sun,
  Trash2,
  TrendingDown,
  TrendingUp,
  Trophy,
  UserPlus,
  UserRound,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { toast } from "sonner";
import lottie from "lottie-web";
import { CATEGORY_SUBCATEGORIES, CITY_OPTIONS, COUNTRY_LABELS, COUNTRY_OPTIONS, SUBCATEGORY_LABELS, type Audience, type DetailStatsPeriod, type GlobalDirection, type Group, type Language, type ListingCountry, type ListingType, type MyGroupsViewMode, type Nft, type NftDealCategory, type NftMarketCategory, type Page, type PreparedNftTransfer, type ShowcaseNft, type Slot, type TopSection, type WalletNft, type WalletNftFilter, type WorkspaceSection, getRussianLanguage, hasConfiguredRewardCampaign } from "@/lib/tgTop-domain";
import { formatFinancialGram, formatPositionDuration, formatTon } from "@/lib/ton-format";
import { getMinimumRankingBidGram, getRankingFloorGram, getSimulatedRankingEntries, getSimulatedRankingSlotNumber, getSimulatedRankingTypePosition, MAX_RANKING_BID_GRAM, MAX_RANKING_SLIDER_GRAM } from "@/lib/ranking-utils";
import { useTonWallet } from "@/hooks/useTonWallet";
import { useTopFilters } from "@/hooks/useTopFilters";
import { useMyGroups } from "@/hooks/useMyGroups";
import { useRankingAuction } from "@/hooks/useRankingAuction";
import {
  getCategoryLabel,
  getCommunityAccessLabel,
  openTelegramCommunityLink,
  openTonviewerTransaction,
  openTelegramInNewBrowserTab,
  getSubcategoryLabel,
  getCountryLabel,
  getCityLabel,
} from "./home-helpers";

import type { HomeController } from "./useHomeController";

type ProfilePageProps = Pick<HomeController, "user" | "page" | "walletConnectionRestored" | "safeWalletAddress" | "tonDepositOpen" | "setTonDepositOpen" | "tonDepositAmount" | "setTonDepositAmount" | "tonWithdrawalOpen" | "setTonWithdrawalOpen" | "tonWithdrawalAmount" | "setTonWithdrawalAmount" | "tonWithdrawalAddress" | "setTonWithdrawalAddress" | "tonWithdrawalFlow" | "setTonWithdrawalFlow" | "setActiveTonWithdrawalId" | "financialHistoryOpen" | "setFinancialHistoryOpen" | "tonWithdrawalDefaultRecipient" | "tonDeposits" | "tonWithdrawals" | "createTonDepositMutation" | "markTonDepositSubmittedMutation" | "quoteTonWithdrawalMutation" | "createTonWithdrawalMutation" | "openTonWalletForCurrentUser" | "disconnectTonWallet" | "startTonDeposit" | "prepareTonWithdrawal" | "audience" | "amount" | "language" | "setShowcaseNftId" | "visibleActivityCount" | "setVisibleActivityCount" | "tx" | "myNfts" | "account" | "deals" | "ownerLeaderboard" | "setPublicProfile" | "setNftShowcase" | "cancelProtectedGroupDeal" | "confirmProtectedGroupTransfer" | "bonus" | "mainTon" | "canWithdrawMinimum" | "activeTonWithdrawal" | "withdrawalProcessingTitle" | "withdrawalProcessingNote" | "transactions" | "accountActivity" | "visibleAccountActivity" | "getFinancialActivityTitle" | "referral" | "verifiedTasks" | "dealStatusLabel" | "getDaysRemaining" | "getProtectedDealGuidance" | "displayUserAvatar" | "visibleMyGroups" | "isMyGroupsSearchActive" | "openOwner" | "copyReferralLink">;

export function ProfilePage(props: ProfilePageProps) {
  const {
    user,
    page,
    walletConnectionRestored,
    safeWalletAddress,
    tonDepositOpen,
    setTonDepositOpen,
    tonDepositAmount,
    setTonDepositAmount,
    tonWithdrawalOpen,
    setTonWithdrawalOpen,
    tonWithdrawalAmount,
    setTonWithdrawalAmount,
    tonWithdrawalAddress,
    setTonWithdrawalAddress,
    tonWithdrawalFlow,
    setTonWithdrawalFlow,
    setActiveTonWithdrawalId,
    financialHistoryOpen,
    setFinancialHistoryOpen,
    tonWithdrawalDefaultRecipient,
    tonDeposits,
    tonWithdrawals,
    createTonDepositMutation,
    markTonDepositSubmittedMutation,
    quoteTonWithdrawalMutation,
    createTonWithdrawalMutation,
    openTonWalletForCurrentUser,
    disconnectTonWallet,
    startTonDeposit,
    prepareTonWithdrawal,
    audience,
    amount,
    language,
    setShowcaseNftId,
    visibleActivityCount,
    setVisibleActivityCount,
    tx,
    myNfts,
    account,
    deals,
    ownerLeaderboard,
    setPublicProfile,
    setNftShowcase,
    cancelProtectedGroupDeal,
    confirmProtectedGroupTransfer,
    bonus,
    mainTon,
    canWithdrawMinimum,
    activeTonWithdrawal,
    withdrawalProcessingTitle,
    withdrawalProcessingNote,
    transactions,
    accountActivity,
    visibleAccountActivity,
    getFinancialActivityTitle,
    referral,
    verifiedTasks,
    dealStatusLabel,
    getDaysRemaining,
    getProtectedDealGuidance,
    displayUserAvatar,
    visibleMyGroups,
    isMyGroupsSearchActive,
    openOwner,
    copyReferralLink,
  } = props;
  return (
          <section className="space-y-4">
            <h1 className="px-1 text-sm font-semibold text-slate-300">{tx("Личный кабинет", "Account")}</h1>
            <div className="tg-clean-surface rounded-2xl border border-white/8 bg-[#111720] p-5 shadow-[0_10px_28px_rgba(2,8,16,0.14)]">
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 overflow-hidden rounded-full border border-white/10 bg-[#1b2430] text-sm font-semibold">
                  {displayUserAvatar ? (
                    <img
                      src={displayUserAvatar}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    (user?.name?.slice(0, 1).toUpperCase() ?? "T")
                  )}
                </span>
                <span>
                  <h2 className="text-lg font-semibold">
                    {user?.name ?? tx("Пользователь Telegram", "Telegram user")}
                  </h2>
                </span>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <Metric
                  label={tx("Основной баланс", "Main balance")}
                  value={`${mainTon} GRAM`}
                  note={tx("пополнения и оплаты", "top-ups and payments")}
                />
                <Metric
                  label={tx("Бонусный баланс", "Bonus balance")}
                  value={`${bonus} GRAM`}
                  note={tx("для размещения", "for placement")}
                />
              </div>
              <div className="mt-3">
                <WalletConnectControl language={language} balanceTon={formatTon(Number(mainTon))} variant="profile" ownerOpenId={user?.openId} address={safeWalletAddress} restored={walletConnectionRestored} onDisconnect={disconnectTonWallet} />
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Sheet open={tonDepositOpen} onOpenChange={setTonDepositOpen}>
                    <button type="button" onClick={() => setTonDepositOpen(true)} aria-label={tx("Пополнить баланс GRAM", "Deposit GRAM balance")} className="rounded-xl border border-[#3f8cff]/35 bg-[#3f8cff]/10 px-3 py-2 text-left transition-colors hover:bg-[#3f8cff]/18"><b className="block text-[11px] text-[#c8ddff]">{tx("Пополнить", "Deposit")}</b><small className="mt-0.5 block text-[9px] text-[#8fb9ff]">GRAM</small></button>
                    <SheetContent side="bottom" onOpenAutoFocus={event => event.preventDefault()} className="max-h-[84dvh] rounded-t-[22px] border-white/10 bg-[#10161f] text-slate-100">
                      <SheetHeader className="px-4 pb-3 text-left">
                        <SheetTitle className="text-base text-slate-100">{tx("Пополнить баланс GRAM", "Deposit GRAM balance")}</SheetTitle>
                        <p className="text-[11px] leading-4 text-slate-500">{tx("Сумму и перевод подтверждаете только вы в своём кошельке. Баланс обновится после проверки сети.", "Only you confirm the amount and transfer in your wallet. The balance updates after network verification.")}</p>
                      </SheetHeader>
                      <div className="space-y-3 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                        {!safeWalletAddress ? <button type="button" onClick={openTonWalletForCurrentUser} className="flex w-full items-center justify-center rounded-xl bg-[#3390ec] px-3 py-3 text-sm font-semibold text-white">{tx("Подключить кошелёк", "Connect wallet")}</button> : <>
                          <label className="block"><span className="mb-2 block text-center text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">{tx("Сумма · GRAM", "Amount · GRAM")}</span><div className="relative"><Input value={tonDepositAmount} inputMode="decimal" onChange={event => { const value = event.target.value.replace(",", "."); if (/^\d*(\.\d{0,9})?$/.test(value)) setTonDepositAmount(value); }} placeholder="1" className="h-16 rounded-2xl border-white/10 bg-white/[0.045] px-16 text-center text-6xl leading-none font-semibold tracking-tight text-[#bcd8ff]" /><span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#8fb9ff]">GRAM</span></div><small className="mt-2 block text-center text-[11px] text-slate-500">{tx("Минимум 0.01 GRAM", "Minimum 0.01 GRAM")}</small></label>
                          <button type="button" disabled={!walletConnectionRestored || createTonDepositMutation.isPending || markTonDepositSubmittedMutation.isPending} onClick={() => void startTonDeposit()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#3390ec] px-3 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#4199ee] disabled:opacity-50"><WalletCards className="h-4 w-4" />{createTonDepositMutation.isPending ? tx("Готовим перевод…", "Preparing transfer…") : tx("Подтвердить в кошельке", "Confirm in wallet")}</button>
                        </>}
                        {tonDeposits.slice(0, 3).length > 0 && <section className="border-t border-white/8 pt-3"><div className="mb-2 flex items-center justify-between"><b className="text-[11px] text-slate-200">{tx("История пополнений", "Deposit history")}</b><span className="text-[9px] text-slate-500">GRAM</span></div><div className="space-y-2">{tonDeposits.slice(0, 3).map(deposit => <div key={deposit.id} className="rounded-xl border border-white/8 bg-white/[0.025] px-3 py-2.5"><div className="flex items-center justify-between gap-2"><b className="text-sm text-slate-100">{formatFinancialGram(deposit.creditedAmountTon ?? Number(deposit.requestedAmountNano) / 1_000_000_000)} GRAM</b><span className={deposit.status === "confirmed" ? "text-[10px] font-medium text-emerald-300" : deposit.status === "expired" || deposit.status === "rejected" ? "text-[10px] font-medium text-rose-300" : "text-[10px] font-medium text-amber-200"}>{deposit.status === "confirmed" ? tx("Зачислено", "Credited") : deposit.status === "submitted" ? tx("В обработке", "Processing") : deposit.status === "created" ? tx("Ожидает подписи", "Awaiting signature") : deposit.status === "rejected" ? tx("Возвращён", "Returned") : tx("Не подтверждено", "Not confirmed")}</span></div></div>)}</div></section>}
                      </div>
                    </SheetContent>
                  </Sheet>
                    <Sheet open={tonWithdrawalOpen} onOpenChange={open => {
                      setTonWithdrawalOpen(open);
                      if (!open) {
                        setTonWithdrawalFlow("form");
                        setActiveTonWithdrawalId(null);
                        return;
                      }
                      if (open) {
                      setTonWithdrawalAddress(current => safeWalletAddress ? current || tonWithdrawalDefaultRecipient : "");
                      const pending = tonWithdrawals.find(item => item.status === "broadcast_pending" || item.status === "sent");
                      if (pending) {
                        setActiveTonWithdrawalId(pending.id);
                        setTonWithdrawalFlow("processing");
                      } else {
                        setTonWithdrawalFlow("form");
                        setActiveTonWithdrawalId(null);
                      }
                    }
                  }}>
                    <button type="button" onClick={() => setTonWithdrawalOpen(true)} aria-label={tx("Вывести GRAM", "Withdraw GRAM")} className="rounded-xl border border-emerald-400/25 bg-emerald-400/[0.07] px-3 py-2 text-left transition-colors hover:bg-emerald-400/[0.13]"><b className="block text-[11px] text-emerald-100">{tx("Вывести", "Withdraw")}</b><small className="mt-0.5 block text-[9px] text-emerald-300/75">GRAM</small></button>
                    <SheetContent side="bottom" onOpenAutoFocus={event => event.preventDefault()} className="max-h-[76dvh] overflow-y-auto rounded-t-[24px] border-white/10 bg-[#10161f] text-slate-100">
                      <SheetHeader className="px-4 pb-2 text-left">
                        <SheetTitle className="text-base font-semibold text-slate-100">{tx("Вывод GRAM", "Withdraw GRAM")}</SheetTitle>
                        <p className="mt-0.5 text-[11px] leading-4 text-slate-500">{tx("Доступен только основной баланс. Бонусные GRAM не выводятся.", "Only your main balance is withdrawable. Bonus GRAM cannot be withdrawn.")}</p>
                      </SheetHeader>
                      <div className="space-y-2.5 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                        {tonWithdrawalFlow === "form" && (!safeWalletAddress ? <button type="button" onClick={openTonWalletForCurrentUser} className="flex w-full items-center justify-center rounded-xl bg-[#3390ec] px-3 py-3 text-sm font-semibold text-white">{tx("Подключить кошелёк", "Connect wallet")}</button> : <>
                          <div className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2"><span className="min-w-0"><span className="block text-[9px] uppercase tracking-[0.1em] text-slate-500">{tx("Кошелёк вывода", "Withdrawal wallet")}</span><span className="mt-0.5 flex items-center gap-1.5 font-mono text-xs text-slate-100"><WalletCards className="h-3.5 w-3.5 shrink-0 text-[#8fb9ff]" />{tonWithdrawalAddress ? `${tonWithdrawalAddress.slice(0, 5)}…${tonWithdrawalAddress.slice(-4)}` : tx("Загрузка…", "Loading…")}</span></span><button type="button" onClick={() => void disconnectTonWallet()} className="shrink-0 rounded-lg border border-rose-300/25 bg-rose-500/[0.08] px-2 py-1.5 text-[10px] font-semibold text-rose-100 transition-colors hover:bg-rose-500/[0.14]">{tx("Отключить", "Disconnect")}</button></div>
                          <div className="flex items-baseline justify-between rounded-xl border border-emerald-300/15 bg-emerald-400/[0.045] px-3 py-2"><span className="text-[10px] uppercase tracking-[0.1em] text-slate-500">{tx("Доступно", "Available")}</span><b className="text-xl font-semibold tracking-tight text-emerald-200">{mainTon} <span className="text-xs font-medium">GRAM</span></b></div>
                          <label className="block"><span className="mb-1.5 block text-center text-[10px] font-medium uppercase tracking-[0.1em] text-slate-400">{tx("Сумма вывода · GRAM", "Withdrawal amount · GRAM")}</span><div className="relative"><Input value={tonWithdrawalAmount} inputMode="decimal" onChange={event => { const value = event.target.value.replace(",", "."); if (/^\d*(\.\d{0,9})?$/.test(value)) setTonWithdrawalAmount(value); }} className="h-12 rounded-xl border-white/10 bg-white/[0.045] px-16 text-center text-3xl leading-none font-semibold tracking-tight text-emerald-100" placeholder="0.1" /><button type="button" onClick={() => setTonWithdrawalAmount(mainTon)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg border border-emerald-300/25 bg-emerald-400/[0.12] px-2 py-1.5 text-[10px] font-semibold text-emerald-100 transition-colors hover:bg-emerald-400/[0.2]">{tx("Макс", "Max")}</button></div><button type="button" disabled={!canWithdrawMinimum} onClick={() => setTonWithdrawalAmount(mainTon)} className="mx-auto mt-1.5 block text-[10px] font-medium text-emerald-300/90 disabled:cursor-not-allowed disabled:opacity-50">{canWithdrawMinimum ? tx(`Вывести всё ${mainTon} GRAM`, `Withdraw all ${mainTon} GRAM`) : tx("Минимум для вывода — 0.10 GRAM", "Minimum withdrawal — 0.10 GRAM")}</button></label>
                          <button type="button" disabled={!canWithdrawMinimum || quoteTonWithdrawalMutation.isPending || createTonWithdrawalMutation.isPending || !tonWithdrawalAddress || !tonWithdrawalAmount} onClick={() => void prepareTonWithdrawal()} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 text-base font-semibold text-slate-950 transition-colors hover:bg-emerald-400 disabled:opacity-50"><Send className="h-4 w-4" />{quoteTonWithdrawalMutation.isPending || createTonWithdrawalMutation.isPending ? tx("Отправляем…", "Sending…") : tx("Вывести", "Withdraw")}</button>
                        </>)}

                        {tonWithdrawalFlow === "processing" && <div className="py-4 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-sky-300/25 bg-sky-300/[0.1]"><Send className="h-5 w-5 text-sky-200" /></span><h3 className="mt-3 text-base font-semibold">{withdrawalProcessingTitle}</h3><p className="mx-auto mt-1 max-w-[260px] text-xs leading-5 text-slate-500">{withdrawalProcessingNote}</p>{activeTonWithdrawal?.failureReason && <p className="mt-3 text-[11px] text-amber-200">{activeTonWithdrawal.failureReason}</p>}</div>}
                        {tonWithdrawals.slice(0, 3).length > 0 && <section className="border-t border-white/8 pt-3"><div className="mb-2 flex items-center justify-between"><b className="text-[11px] text-slate-200">{tx("История выводов", "Withdrawal history")}</b><span className="text-[9px] text-slate-500">GRAM</span></div><div className="space-y-2">{tonWithdrawals.slice(0, 3).map(withdrawal => <div key={withdrawal.id} className="rounded-xl border border-white/8 bg-white/[0.025] px-3 py-2.5"><div className="flex items-center justify-between gap-2"><b className="text-sm text-slate-100">{formatFinancialGram(Number(withdrawal.grossAmountNano) / 1_000_000_000)} GRAM</b><span className={withdrawal.status === "confirmed" ? "text-[10px] font-medium text-emerald-300" : withdrawal.status === "cancelled" ? "text-[10px] font-medium text-rose-300" : "text-[10px] font-medium text-sky-200"}>{withdrawal.status === "confirmed" ? tx("Отправлено", "Sent") : withdrawal.status === "cancelled" ? tx("Отмена", "Cancelled") : tx("В обработке", "Processing")}</span></div></div>)}</div></section>}
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>
              </div>
            </div>
            <section className="tg-clean-surface rounded-2xl border border-white/8 bg-[#111720] p-4 shadow-[0_10px_28px_rgba(2,8,16,0.14)]">
              <button type="button" onClick={() => setFinancialHistoryOpen(true)} className="block w-full text-left transition-opacity hover:opacity-90 active:opacity-75" aria-label={tx("Открыть полную статистику операций", "Open full transaction statistics")}>
                <div className="flex items-start justify-between gap-3">
                  <span>
                    <h2 className="text-sm font-semibold">{tx("Баланс", "Balance")}</h2>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{tx("Нажмите, чтобы посмотреть все операции GRAM.", "Tap to view all GRAM activity.")}</p>
                  </span>
                  <span className="flex items-center gap-1 rounded-md border border-[#3f8cff]/25 bg-[#3f8cff]/8 px-2 py-1 text-[10px] font-medium text-[#a6c8ff]">GRAM<ChevronRight className="h-3 w-3" /></span>
                </div>
                <GramBalanceChart transactions={transactions} currentBalance={Number(bonus)} language={language} />
              </button>
            </section>
            <Sheet open={financialHistoryOpen} onOpenChange={setFinancialHistoryOpen}>
              <SheetContent side="bottom" className="max-h-[88dvh] overflow-y-auto rounded-t-[28px] border-white/10 bg-[#10161f] text-slate-100">
                <SheetHeader className="px-5 pb-3 text-left"><SheetTitle className="text-xl font-semibold">{tx("Все операции", "All transactions")}</SheetTitle><p className="mt-1 text-xs leading-5 text-slate-500">{tx("Пополнения, выводы, ставки, награды и возвраты из журнала TG TOP.", "Deposits, withdrawals, bids, rewards, and refunds recorded by TG TOP.")}</p></SheetHeader>
                <div className="divide-y divide-white/7 px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
                  {accountActivity.length ? accountActivity.map(item => {
                    const absoluteAmount = item.amount === null ? null : Math.abs(item.amount);
                    const amount = absoluteAmount === null || !item.currency ? null : `${item.direction === "in" ? "+" : item.direction === "out" ? "−" : ""}${item.currency === "Stars" ? n(absoluteAmount, language) : formatTon(absoluteAmount)} ${item.currency}`;
                    const symbol = item.type === "deposit" ? "↓" : item.type === "withdrawal" ? "↑" : item.type === "stars" ? "★" : item.type === "nft_transfer" ? "NFT" : item.type === "deal" ? "D" : item.type === "bid" ? "B" : "G";
                    const tonviewerHash = item.type === "withdrawal" && item.status === "confirmed" && typeof item.transactionHash === "string" && /^[0-9a-f]{64}$/i.test(item.transactionHash) ? item.transactionHash : null;
                    const rowContent = <><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border text-[11px] font-semibold ${item.direction === "in" ? "border-emerald-300/25 bg-emerald-400/[0.08] text-emerald-200" : item.direction === "out" ? "border-rose-300/25 bg-rose-500/[0.08] text-rose-100" : "border-[#3f8cff]/25 bg-[#3f8cff]/8 text-[#a6c8ff]"}`}>{symbol}</span><span className="min-w-0 flex-1"><b className="block truncate text-sm">{getFinancialActivityTitle(item)}</b><small className="mt-1 block truncate text-[11px] text-slate-500">{item.subject} · {dateTime(item.createdAt, language)}{tonviewerHash ? ` · ${tx("Открыть в Tonviewer", "Open in Tonviewer")}` : ""}</small></span><span className="flex shrink-0 items-center gap-1 text-right">{amount && <b className={`block text-sm ${item.direction === "in" ? "text-emerald-200" : item.direction === "out" ? "text-rose-100" : "text-slate-200"}`}>{amount}</b>}{tonviewerHash && <ChevronRight className="h-4 w-4 text-[#a6c8ff]" />}</span></>;
                    return tonviewerHash ? <button key={item.id} type="button" onClick={() => openTonviewerTransaction(tonviewerHash)} className="flex w-full items-center justify-between gap-3 py-3.5 text-left transition-opacity hover:opacity-90 active:opacity-75" aria-label={tx("Открыть транзакцию вывода в Tonviewer", "Open withdrawal transaction in Tonviewer")}>{rowContent}</button> : <div key={item.id} className="flex items-center justify-between gap-3 py-3.5">{rowContent}</div>;
                  }) : <p className="py-10 text-center text-sm text-slate-500">{tx("Операций пока нет.", "No activity yet.")}</p>}
                </div>
              </SheetContent>
            </Sheet>
            {myNfts.length > 0 && (
              <section className="overflow-hidden rounded-2xl border border-white/8 bg-[#111720]">
                <div className="border-b border-white/8 px-4 py-4">
                  <h2 className="text-sm font-semibold">{tx("Моя NFT-витрина", "My NFT showcase")}</h2>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{tx("Показывайте NFT только в профиле или на выбранной подключенной площадке.", "Show an NFT only on your profile or on a selected connected community.")}</p>
                </div>
                <div className="divide-y divide-white/7">
                  {myNfts.map(nft => (
                    <div key={nft.id} className="px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="min-w-0"><b className="block truncate text-sm">@{nft.username}</b><small className="mt-0.5 block text-[10px] text-slate-500">{nft.assetClass === "onchain" ? "On-chain" : "Off-chain"}</small></span>
                        <span className="text-[10px] text-slate-500">{nft.showcaseProfile ? tx("В профиле", "On profile") : nft.showcaseGroupId ? tx("На площадке", "On community") : tx("Скрыт", "Hidden")}</span>
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        <button onClick={() => setNftShowcase.mutate({ nftId: nft.id, target: "profile" })} disabled={setNftShowcase.isPending} className="rounded-md border border-[#3f8cff]/35 bg-[#3f8cff]/10 px-2 py-1.5 text-[10px] font-medium text-[#a6c8ff]">{tx("Профиль", "Profile")}</button>
                        <button onClick={() => setShowcaseNftId(nft.id)} disabled={setNftShowcase.isPending} className="rounded-md border border-white/10 px-2 py-1.5 text-[10px] font-medium text-slate-300">{tx("Площадка", "Community")}</button>
                        <button onClick={() => setNftShowcase.mutate({ nftId: nft.id, target: "hidden" })} disabled={setNftShowcase.isPending} className="rounded-md border border-white/10 px-2 py-1.5 text-[10px] font-medium text-slate-400">{tx("Скрыть", "Hide")}</button>
                  </div>
                </div>
              ))}
              {isMyGroupsSearchActive && visibleMyGroups.length === 0 && (
                <div className="rounded-xl border border-dashed border-white/12 px-4 py-7 text-center text-xs text-slate-500">
                  {tx("Подходящих групп не найдено", "No matching groups found")}
                </div>
              )}
            </div>
              </section>
            )}
            <section className="rounded-2xl border border-white/8 bg-[#111720] p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs">
                  <b className="block text-slate-200">Публичный аккаунт</b>
                  <small className="mt-1 block max-w-[240px] text-[11px] leading-4 text-slate-500">Вы появитесь в списке, только если сделаете профиль публичным.</small>
                </span>
                <button type="button" role="switch" aria-checked={Boolean(account?.user?.publicProfile)} onClick={() => setPublicProfile.mutate({ publicProfile: !account?.user?.publicProfile })} disabled={setPublicProfile.isPending} className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors disabled:opacity-50 ${account?.user?.publicProfile ? "border-[#72a8ff] bg-[#3f8cff]" : "border-white/15 bg-white/8"}`}>
                  <span className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${account?.user?.publicProfile ? "translate-x-6" : "translate-x-0"}`} />
                </button>
              </div>
            </section>
            <section className="overflow-hidden rounded-2xl border border-white/8 bg-[#111720]">
              <div className="flex items-start justify-between gap-3 border-b border-white/8 px-4 py-4">
                <span>
                  <h2 className="text-sm font-semibold">{tx("Лидерборд владельцев", "Owner leaderboard")}</h2>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{tx("По суммарной аудитории подключённых площадок в TG TOP.", "By recorded audience across connected TG TOP communities.")}</p>
                </span>
                <span className="rounded-md border border-[#3f8cff]/25 bg-[#3f8cff]/8 px-2 py-1 text-[10px] font-medium text-[#a6c8ff]">{tx("Данные TG TOP", "TG TOP data")}</span>
              </div>
              {ownerLeaderboard.length ? (
                <div className="divide-y divide-white/7">
                  {ownerLeaderboard.map(entry => {
                    const ownerLabel = entry.owner.name ?? tx("Владелец TG TOP", "TG TOP owner");
                    return <button key={entry.owner.openId} onClick={() => openOwner(entry.owner.openId)} className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.025]">
                      <span className="w-5 text-center text-xs font-semibold text-[#72a8ff]">{entry.rank}</span>
                      <span className="grid h-8 w-8 overflow-hidden rounded-full border border-white/10 bg-[#1b2430] text-[10px] font-semibold">
                        {entry.owner.avatarUrl ? <img src={entry.owner.avatarUrl} alt="" className="h-full w-full object-cover" /> : (ownerLabel.slice(0, 1).toUpperCase())}
                      </span>
                      <span className="min-w-0 flex-1">
                        <b className="block truncate text-xs text-slate-200">{ownerLabel}</b>
                        <small className="mt-0.5 block text-[10px] text-slate-500">{entry.activeListings} {tx("площадок", "communities")}</small>
                      </span>
                      <span className="text-right">
                        <b className="block text-xs text-[#a6c8ff]">{n(entry.totalMembers, language)}</b>
                        <small className="block text-[9px] text-slate-500">{tx("аудитория", "audience")}</small>
                      </span>
                    </button>;
                  })}
                </div>
              ) : (
                <p className="px-4 py-8 text-center text-sm text-slate-500">{tx("Включите публичный аккаунт и подключите первую площадку.", "Enable a public account and connect your first community.")}</p>
              )}
            </section>
            <section className="overflow-hidden rounded-2xl border border-white/8 bg-[#111720]">
              <div className="border-b border-white/8 px-4 py-4">
                <h2 className="text-sm font-semibold">{tx("Задачи", "Tasks")}</h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">{tx("Прогресс подтверждается только действиями, зафиксированными в TG TOP. Награды не начисляются автоматически.", "Progress is confirmed only by actions recorded in TG TOP. Rewards are not issued automatically.")}</p>
              </div>
              <div className="divide-y divide-white/7">
                {verifiedTasks.map(task => <button key={task.id} onClick={task.action} className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-white/[0.025]">
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border text-xs ${task.complete ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300" : "border-white/10 bg-white/[0.03] text-slate-500"}`}>{task.complete ? <Check className="h-4 w-4" /> : <Trophy className="h-4 w-4" />}</span>
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-sm">{task.title}</b>
                    <small className="mt-1 block text-[11px] leading-4 text-slate-500">{task.description}</small>
                  </span>
                  {task.complete ? <span className="text-[11px] font-medium text-emerald-300">{tx("Готово", "Done")}</span> : <ChevronRight className="h-4 w-4 text-slate-600" />}
                </button>)}
              </div>
            </section>
            <section className="overflow-hidden rounded-2xl border border-white/8 bg-[#111720]">
              <div className="border-b border-white/8 px-4 py-4">
                <h2 className="text-sm font-semibold">{tx("История активности", "Activity history")}</h2>
                <p className="mt-1 text-xs text-slate-500">{tx("Реальные бонусы, ставки, Stars, сделки и передачи NFT.", "Real credits, bids, Stars, deals, and NFT transfers.")}</p>
              </div>
              {accountActivity.length ? (
                <div className="divide-y divide-white/7">
                  {visibleAccountActivity.map(item => {
                    const title = item.title === "connection_bonus" ? tx("Бонус за подключение", "Connection bonus")
                      : item.title === "manual_bonus" ? tx("Бонус TG TOP", "TG TOP bonus")
                      : item.title === "reward_campaign_reserve" ? tx("Резерв кампании вознаграждений", "Reward campaign reserve")
                      : item.title === "reward_campaign_release" ? tx("Возврат бюджета кампании", "Reward campaign budget release")
                      : item.title === "reward_subscription" ? tx("Награда за подписку", "Subscription reward")
                      : item.title === "reward_invite_referral" ? tx("Награда за приглашение", "Invite referral reward")
                      : item.title === "reward_manual_add" ? tx("Награда за добавление участника", "Manual member-add reward")
                      : item.title === "catalog_listing" ? tx("Размещение в каталоге", "Catalog listing")
                      : item.title === "ranking_spend" ? tx("Оплата места в рейтинге", "Ranking placement payment")
                      : item.title === "ranking_refund" ? tx("Возврат оплаты за место", "Ranking placement refund")
                      : item.title === "ranking_stars" ? tx("Ставка через Telegram Stars", "Telegram Stars bid")
                      : item.title === "ranking_bid" ? tx("Зафиксированная ставка", "Recorded bid")
                      : item.title === "group_buy" ? tx("Защищённая покупка группы", "Protected group purchase")
                      : item.title === "nft_buy" ? tx("Покупка NFT", "NFT purchase")
                      : item.title === "nft_rent" ? tx("Аренда NFT", "NFT rental")
                      : tx("Передача NFT", "NFT transfer");
                    const status = item.status === "paid" ? tx("Оплачено", "Paid")
                      : item.status === "recorded" ? tx("Зафиксировано", "Recorded")
                      : item.status === "completed" ? tx("Завершено", "Completed")
                      : item.status === "pending" ? tx("Ожидает оплаты", "Awaiting payment")
                      : item.status === "cancelled" ? tx("Отменено", "Cancelled")
                      : item.status === "expired" ? tx("Истекло", "Expired")
                      : item.status === "listing_spend" ? tx("Списано", "Debited")
                      : item.status === "ranking_spend" ? tx("Оплачено GRAM", "Paid with GRAM")
                      : item.status === "ranking_refund" ? tx("Возвращено", "Refunded")
                      : item.status === "group_connection_bonus" ? tx("Начислено", "Credited")
                      : item.status === "manual_bonus" ? tx("Начислено", "Credited")
                      : item.status === "reward_campaign_reserve" ? tx("Зарезервировано", "Reserved")
                      : item.status === "reward_campaign_release" ? tx("Возвращено", "Released")
                      : item.status === "reward_subscription" ? tx("Начислено", "Credited")
                      : item.status === "reward_invite_referral" ? tx("Начислено", "Credited")
                      : item.status === "reward_manual_add" ? tx("Начислено", "Credited")
                      : tx("Зафиксировано", "Recorded");
                    const absoluteAmount = item.amount === null ? null : Math.abs(item.amount);
                    const amount = absoluteAmount === null || !item.currency ? null : `${item.direction === "in" ? "+" : item.direction === "out" ? "−" : ""}${item.currency === "Stars" ? n(absoluteAmount, language) : formatTon(absoluteAmount)} ${item.currency}`;
                    return <div key={item.id} className="flex items-center justify-between gap-3 px-4 py-3.5">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[#3f8cff]/25 bg-[#3f8cff]/8 text-[11px] font-semibold text-[#a6c8ff]">{item.type === "stars" ? "★" : item.type === "nft_transfer" ? "NFT" : item.type === "deal" ? "D" : item.type === "bid" ? "B" : "G"}</span>
                      <span className="min-w-0 flex-1">
                        <b className="block truncate text-sm">{title}</b>
                        <small className="mt-1 block truncate text-xs text-slate-500">{item.subject} · {dateTime(item.createdAt, language)}</small>
                      </span>
                      <span className="shrink-0 text-right">
                        {amount && <b className={`block text-sm ${item.direction === "in" ? "text-[#72a8ff]" : "text-slate-200"}`}>{amount}</b>}
                      </span>
                    </div>;
                  })}
                </div>
              ) : (
                <p className="px-4 py-8 text-center text-sm text-slate-500">{tx("Операций пока нет.", "No activity yet.")}</p>
              )}
              {accountActivity.length > visibleActivityCount && (
                <button type="button" onClick={() => setVisibleActivityCount(count => count + 5)} className="m-3 w-[calc(100%-1.5rem)] rounded-lg border border-white/10 bg-white/[0.025] py-2 text-xs font-medium text-slate-300 transition-colors hover:bg-white/[0.06]">
                  {tx("Показать предыдущие", "Show previous")}
                </button>
              )}
            </section>
            <section className="overflow-hidden rounded-2xl border border-white/8 bg-[#111720]">
              <div className="flex items-start justify-between gap-3 border-b border-white/8 px-4 py-4">
                <span>
                  <h2 className="text-sm font-semibold">{tx("История оферов", "Offer history")}</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {tx("Покупки и продажи с защищенным сценарием передачи", "Purchases and sales with a protected transfer flow")}
                  </p>
                </span>
                <span className="rounded-md border border-[#3f8cff]/25 bg-[#3f8cff]/8 px-2 py-1 text-[10px] font-medium text-[#a6c8ff]">
                  {tx("Комиссия · 0%", "Fee · 0%")}
                </span>
              </div>
              {deals.length ? (
                <div className="divide-y divide-white/7">
                  {deals.map(deal => {
                    const isBuyer = deal.buyerOpenId === user?.openId;
                    const canCancel = isBuyer && (deal.status === "open" || deal.status === "escrow_funded");
                    const canConfirmTransfer = isBuyer && deal.status === "active" && !deal.buyerConfirmedAt;
                    const remainingDays = getDaysRemaining(deal.expiresAt);
                    const title = deal.dealType === "nft_rent" ? tx("Аренда collectible-юзернейма", "Collectible username rental") : deal.groupUsername ? `@${deal.groupUsername}` : (deal.groupTitle ?? tx("Группа TG TOP", "TG TOP community"));
                    return (
                      <div key={deal.id} className="px-4 py-3.5">
                        <div className="flex items-start justify-between gap-3">
                          <span className="min-w-0">
                            <b className="block truncate text-sm">{title}</b>
                            <small className="mt-1 block text-[11px] text-slate-500">
                              {isBuyer ? tx("Покупатель", "Buyer") : tx("Продавец", "Seller")} · {date(deal.createdAt, language)}
                            </small>
                          </span>
                          <b className="shrink-0 text-sm text-[#a6c8ff]">{formatTon(deal.price)} GRAM</b>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                          <span className="rounded-md bg-white/5 px-2 py-1 text-[10px] text-slate-300">
                            {dealStatusLabel(deal.status, deal.dealType)}
                          </span>
                          {remainingDays !== null && deal.status === "escrow_funded" && (
                            <small className="text-[10px] text-slate-500">
                              {tx(`До дедлайна: ${remainingDays} дн.`, `${remainingDays} days to deadline`)}
                            </small>
                          )}
                          {canCancel && (
                            <button
                              onClick={() => cancelProtectedGroupDeal.mutate({ dealId: deal.id })}
                              disabled={cancelProtectedGroupDeal.isPending}
                              className="ml-auto text-[11px] font-medium text-slate-400 underline decoration-white/20 underline-offset-4 disabled:opacity-50"
                            >
                              {tx("Отменить офер", "Cancel offer")}
                            </button>
                          )}
                          {canConfirmTransfer && (
                            <button
                              onClick={() => confirmProtectedGroupTransfer.mutate({ dealId: deal.id })}
                              disabled={confirmProtectedGroupTransfer.isPending}
                              className="ml-auto rounded-md border border-[#3f8cff]/35 bg-[#3f8cff]/10 px-2 py-1 text-[10px] font-medium text-[#a6c8ff] disabled:opacity-50"
                            >
                              {tx("Подтвердить получение", "Confirm receipt")}
                            </button>
                          )}
                        </div>
                        <p className="mt-2 text-[11px] leading-4 text-slate-500">
                          {getProtectedDealGuidance(deal.status, isBuyer, Boolean(deal.buyerConfirmedAt), deal.dealType)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="px-4 py-8 text-center text-sm text-slate-500">
                  {tx("Оферов пока нет. Создайте безопасный офер со страницы группы.", "No offers yet. Create a protected offer from a community page.")}
                </p>
              )}
            </section>
            <section className="overflow-hidden rounded-2xl border border-white/8 bg-[#111720]">
              <div className="border-b border-white/8 px-4 py-4">
                <h2 className="text-sm font-semibold">{tx("Реферальная программа", "Referral program")}</h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {tx("Приглашайте владельцев площадок. Доход отражается только после закрытых сделок с комиссией TG TOP.", "Invite community owners. Earnings appear only after completed TG TOP fee-bearing deals.")}
                </p>
              </div>
              <div className="space-y-3 p-4">
                <div className="grid grid-cols-2 gap-3">
                  <Metric
                    label={tx("Приглашено", "Invited")}
                    value={String(referral?.referralsCount ?? 0)}
                    note={tx("активированных аккаунтов", "activated accounts")}
                  />
                  <Metric
                    label={tx("Заработано", "Earned")}
                    value={(referral?.earnings ?? "0").replace(/TON/g, "GRAM")}
                    note={tx("из комиссий платформы", "from platform fees")}
                  />
                </div>
                <div className="rounded-xl border border-white/8 bg-[#0b0f14] p-3">
                  <span className="text-[10px] uppercase tracking-[0.12em] text-slate-500">{tx("Ваша ссылка", "Your link")}</span>
                  <code className="mt-1.5 block truncate text-xs text-[#a6c8ff]">
                    {referral?.referralLink ?? tx("Готовим персональную ссылку…", "Preparing your personal link…")}
                  </code>
                  <button
                    onClick={copyReferralLink}
                    disabled={!referral}
                    className="mt-3 w-full rounded-lg border border-[#3f8cff]/35 bg-[#3f8cff]/10 py-2 text-xs font-semibold text-[#a6c8ff] disabled:opacity-50"
                  >
                    {tx("Скопировать ссылку", "Copy link")}
                  </button>
                </div>
              </div>
            </section>
            <section className="overflow-hidden rounded-2xl border border-white/8 bg-[#111720]">
              <div className="border-b border-white/8 px-4 py-4">
                <h2 className="text-sm font-semibold">{tx("Как это работает", "How it works")}</h2>
                <p className="mt-1 text-xs text-slate-500">{tx("Коротко о безопасном использовании TG TOP.", "A quick guide to using TG TOP safely.")}</p>
              </div>
              <div className="divide-y divide-white/7">
                {[
                  [tx("Кошелек", "Wallet"), tx("Подключение кошелька только показывает ваш GRAM-адрес. TG TOP пока не запрашивает подпись или перевод GRAM.", "Connecting a wallet shows your GRAM address. TG TOP does not yet request a GRAM signature or transfer.")],
                  [tx("Листинг", "Listing"), tx("Подключите @TG_TOPBOT как администратора, получите 0.1 GRAM и настройте каталог, продажу или аренду в личной папке.", "Add @TG_TOPBOT as an administrator, receive 0.1 GRAM, then configure catalog, sale, or rental settings in My Groups.")],
                  [tx("Рейтинг", "Ranking"), tx("Место в топе меняется при большей ставке. Перед оплатой будет отдельное подтверждение — автоматические GRAM-платежи еще не включены.", "A higher bid changes the top placement. Payment will require a separate confirmation; automatic GRAM payments are not enabled yet.")],
                  [tx("NFT и сделки", "NFTs and deals"), tx("Проверяйте владельца и условия вручную. Передача прав и денег будет доступна только через защищенный сценарий сделки после запуска проверки платежей.", "Check the owner and terms manually. Rights and funds transfer only through a protected deal after payment verification launches.")],
                ].map(([title, text]) => (
                  <details key={title} className="group px-4">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-3 text-sm font-medium text-slate-200">
                      {title}
                      <ChevronRight className="h-4 w-4 text-slate-600 transition-transform group-open:rotate-90" />
                    </summary>
                    <p className="pb-3 text-xs leading-5 text-slate-500">{text}</p>
                  </details>
                ))}
              </div>
            </section>
          </section>
  );
}
