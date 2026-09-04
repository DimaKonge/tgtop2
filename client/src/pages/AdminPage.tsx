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

type AdminPageProps = Pick<HomeController, "user" | "category" | "country" | "city" | "pendingModerationGroup" | "setPendingModerationGroup" | "language" | "ui" | "moderationAccess" | "telegramUserAgentStatus" | "catalogTaxonomy" | "botModerationQueue" | "allBotListings" | "activeModerationListings" | "tonWithdrawalsForManualReview" | "moderators" | "moderationReasonDraft" | "setModerationReasonDraft" | "moderatorUsernameDraft" | "setModeratorUsernameDraft" | "catalogCountryCodeDraft" | "setCatalogCountryCodeDraft" | "catalogCountryLabelDraft" | "setCatalogCountryLabelDraft" | "catalogCityCountryDraft" | "setCatalogCityCountryDraft" | "catalogCityCodeDraft" | "setCatalogCityCodeDraft" | "catalogCityLabelDraft" | "setCatalogCityLabelDraft" | "catalogTopicCategoryDraft" | "setCatalogTopicCategoryDraft" | "catalogTopicCodeDraft" | "setCatalogTopicCodeDraft" | "catalogTopicLabelDraft" | "setCatalogTopicLabelDraft" | "botModerationDrafts" | "setBotModerationDrafts" | "moderationWindowOpen" | "setModerationWindowOpen" | "telegramUserAgentSheetOpen" | "setTelegramUserAgentSheetOpen" | "telegramUserAgentPhone" | "setTelegramUserAgentPhone" | "telegramUserAgentCode" | "setTelegramUserAgentCode" | "telegramUserAgentPassword" | "setTelegramUserAgentPassword" | "telegramOwnerDmUsername" | "setTelegramOwnerDmUsername" | "moderationTab" | "setModerationTab" | "botModerationFilter" | "setBotModerationFilter" | "requestTelegramUserAgentCode" | "confirmTelegramUserAgentCode" | "confirmTelegramUserAgentPassword" | "disconnectTelegramUserAgent" | "bootstrapTelegramOwnerDm" | "moderateGroup" | "moderateBotListing" | "deleteBotListing" | "reviewTonWithdrawal" | "setModeratorRole" | "addCatalogCountry" | "deleteCatalogCountry" | "addCatalogCity" | "deleteCatalogCity" | "addCatalogTopic" | "deleteCatalogTopic" | "botTopicOptions" | "filteredModerationBots">;

export function AdminPage(props: AdminPageProps) {
  const {
    user,
    category,
    country,
    city,
    pendingModerationGroup,
    setPendingModerationGroup,
    language,
    ui,
    moderationAccess,
    telegramUserAgentStatus,
    catalogTaxonomy,
    botModerationQueue,
    allBotListings,
    activeModerationListings,
    tonWithdrawalsForManualReview,
    moderators,
    moderationReasonDraft,
    setModerationReasonDraft,
    moderatorUsernameDraft,
    setModeratorUsernameDraft,
    catalogCountryCodeDraft,
    setCatalogCountryCodeDraft,
    catalogCountryLabelDraft,
    setCatalogCountryLabelDraft,
    catalogCityCountryDraft,
    setCatalogCityCountryDraft,
    catalogCityCodeDraft,
    setCatalogCityCodeDraft,
    catalogCityLabelDraft,
    setCatalogCityLabelDraft,
    catalogTopicCategoryDraft,
    setCatalogTopicCategoryDraft,
    catalogTopicCodeDraft,
    setCatalogTopicCodeDraft,
    catalogTopicLabelDraft,
    setCatalogTopicLabelDraft,
    botModerationDrafts,
    setBotModerationDrafts,
    moderationWindowOpen,
    setModerationWindowOpen,
    telegramUserAgentSheetOpen,
    setTelegramUserAgentSheetOpen,
    telegramUserAgentPhone,
    setTelegramUserAgentPhone,
    telegramUserAgentCode,
    setTelegramUserAgentCode,
    telegramUserAgentPassword,
    setTelegramUserAgentPassword,
    telegramOwnerDmUsername,
    setTelegramOwnerDmUsername,
    moderationTab,
    setModerationTab,
    botModerationFilter,
    setBotModerationFilter,
    requestTelegramUserAgentCode,
    confirmTelegramUserAgentCode,
    confirmTelegramUserAgentPassword,
    disconnectTelegramUserAgent,
    bootstrapTelegramOwnerDm,
    moderateGroup,
    moderateBotListing,
    deleteBotListing,
    reviewTonWithdrawal,
    setModeratorRole,
    addCatalogCountry,
    deleteCatalogCountry,
    addCatalogCity,
    deleteCatalogCity,
    addCatalogTopic,
    deleteCatalogTopic,
    botTopicOptions,
    filteredModerationBots,
  } = props;
  if (!moderationAccess) return null;
  return (
          <section className="space-y-4">
            <div className="flex items-start justify-between gap-3 px-1">
              <span>
                <h1 className="text-sm font-semibold text-slate-200">Админ-панель</h1>
                <p className="mt-1 text-[11px] leading-4 text-slate-500">Ручное управление активными размещениями TG TOP.</p>
              </span>
              <span className="rounded-md border border-[#3390ec]/30 bg-[#3390ec]/10 px-2 py-1 text-[10px] font-medium text-[#a6c8ff]">{moderationAccess.role === "admin" ? "Администратор" : "Модератор"}</span>
            </div>

            <button type="button" onClick={() => setModerationWindowOpen(true)} className="flex w-full items-center justify-between gap-3 rounded-2xl border border-[#3f8cff]/25 bg-[#3f8cff]/[0.07] p-4 text-left transition-colors hover:bg-[#3f8cff]/[0.11] active:scale-[0.99]">
              <span className="flex min-w-0 items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#72a8ff]/25 bg-[#3f8cff]/10 text-[#a6c8ff]"><ShieldCheck className="h-5 w-5" /></span><span className="min-w-0"><b className="block text-sm text-slate-100">Модерация</b><small className="mt-1 block truncate text-[11px] text-slate-400">Сообщества и боты · {botModerationQueue.length} заявок на проверке</small></span></span><span className="rounded-lg border border-[#72a8ff]/25 px-2.5 py-2 text-[10px] font-semibold text-[#c8ddff]">Открыть</span>
            </button>

            {moderationAccess.role === "admin" && (
              <>
                <button type="button" onClick={() => setTelegramUserAgentSheetOpen(true)} className="flex w-full items-center justify-between gap-3 rounded-2xl border border-emerald-300/20 bg-emerald-400/[0.055] p-4 text-left transition-colors hover:bg-emerald-400/[0.09] active:scale-[0.99]">
                  <span className="flex min-w-0 items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-emerald-300/20 bg-emerald-400/10 text-emerald-100"><ShieldCheck className="h-5 w-5" /></span><span className="min-w-0"><b className="block text-sm text-slate-100">Рабочий аккаунт Telegram</b><small className="mt-1 block truncate text-[11px] text-slate-400">{telegramUserAgentStatus?.status === "connected" ? `Read-only · ${telegramUserAgentStatus.accountUsername ? `@${telegramUserAgentStatus.accountUsername}` : "подключён"}` : "Подключение API-клиента и безопасная синхронизация"}</small></span></span><span className={`rounded-lg border px-2.5 py-2 text-[10px] font-semibold ${telegramUserAgentStatus?.status === "connected" ? "border-emerald-300/25 text-emerald-100" : "border-white/10 text-slate-300"}`}>{telegramUserAgentStatus?.status === "connected" ? "Активен" : "Настроить"}</span>
                </button>

                <Sheet open={telegramUserAgentSheetOpen} onOpenChange={open => { if (!open && (requestTelegramUserAgentCode.isPending || confirmTelegramUserAgentCode.isPending || confirmTelegramUserAgentPassword.isPending || disconnectTelegramUserAgent.isPending)) return; setTelegramUserAgentSheetOpen(open); }}>
                  <SheetContent side="bottom" className="max-h-[88dvh] overflow-y-auto rounded-t-[26px] border-white/10 bg-[#10161f] text-slate-100">
                    <SheetHeader className="px-4 pb-2"><SheetTitle className="text-slate-100">Рабочий аккаунт Telegram</SheetTitle><p className="text-xs leading-5 text-slate-500">Отдельный аккаунт TG TOP. По умолчанию он только читает разрешённые данные и не публикует посты, не меняет права и не выполняет финансовые действия.</p></SheetHeader>
                    <div className="space-y-3 px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-2">
                      {!telegramUserAgentStatus || telegramUserAgentStatus.status === "disconnected" || telegramUserAgentStatus.status === "error" ? <>
                        <div className="rounded-xl border border-white/8 bg-white/[0.035] p-3 text-[11px] leading-4 text-slate-400">Введи номер отдельного рабочего аккаунта в международном формате. Код Telegram и 2FA вводятся только здесь, не в сообщениях.</div>
                        <Input value={telegramUserAgentPhone} onChange={event => setTelegramUserAgentPhone(event.target.value)} inputMode="tel" autoComplete="tel" placeholder="+380…" className="h-11 border-white/10 bg-[#17212b] text-sm text-slate-100" />
                        <Button onClick={() => requestTelegramUserAgentCode.mutate({ phone: telegramUserAgentPhone })} disabled={requestTelegramUserAgentCode.isPending || telegramUserAgentPhone.trim().length < 8} className="h-11 w-full bg-[#3f8cff] text-sm text-white">{requestTelegramUserAgentCode.isPending ? ui.loading : "Получить код Telegram"}</Button>
                      </> : telegramUserAgentStatus.status === "code_pending" ? <>
                        <div className="rounded-xl border border-[#72a8ff]/20 bg-[#3f8cff]/[0.07] p-3 text-[11px] leading-4 text-[#c8ddff]">Код уже отправлен. Введи его здесь — он не сохраняется в журнале и не попадает в чат.</div>
                        <Input value={telegramUserAgentCode} onChange={event => setTelegramUserAgentCode(event.target.value.replace(/\s/g, ""))} inputMode="numeric" autoComplete="one-time-code" maxLength={8} placeholder="Код Telegram" className="h-11 border-white/10 bg-[#17212b] text-center text-lg tracking-[0.35em] text-slate-100" />
                        <Button onClick={() => confirmTelegramUserAgentCode.mutate({ code: telegramUserAgentCode })} disabled={confirmTelegramUserAgentCode.isPending || telegramUserAgentCode.length < 4} className="h-11 w-full bg-[#3f8cff] text-sm text-white">{confirmTelegramUserAgentCode.isPending ? ui.loading : "Подтвердить код"}</Button>
                      </> : telegramUserAgentStatus.status === "password_pending" ? <>
                        <div className="rounded-xl border border-amber-300/20 bg-amber-400/[0.07] p-3 text-[11px] leading-4 text-amber-100">Telegram запросил пароль двухэтапной защиты. Он используется только для этого входа и не сохраняется.</div>
                        <Input value={telegramUserAgentPassword} onChange={event => setTelegramUserAgentPassword(event.target.value)} type="password" autoComplete="current-password" placeholder="Пароль 2FA" className="h-11 border-white/10 bg-[#17212b] text-sm text-slate-100" />
                        <Button onClick={() => confirmTelegramUserAgentPassword.mutate({ password: telegramUserAgentPassword })} disabled={confirmTelegramUserAgentPassword.isPending || !telegramUserAgentPassword} className="h-11 w-full bg-[#3f8cff] text-sm text-white">{confirmTelegramUserAgentPassword.isPending ? ui.loading : "Подтвердить пароль"}</Button>
                      </> : <>
                        <div className="rounded-xl border border-emerald-300/20 bg-emerald-400/[0.07] p-3"><b className="block text-xs text-emerald-100">Read-only контур активен</b><p className="mt-1 text-[11px] leading-4 text-slate-400">{telegramUserAgentStatus.accountUsername ? `@${telegramUserAgentStatus.accountUsername}` : telegramUserAgentStatus.accountTelegramId ? `Telegram ID ${telegramUserAgentStatus.accountTelegramId}` : "Рабочий аккаунт"}. Любое действие записи будет требовать отдельного подтверждения.</p></div>
                        {telegramUserAgentStatus.ownerDm?.active ? <div className="rounded-xl border border-[#72a8ff]/20 bg-[#3f8cff]/[0.07] p-3 text-[11px] leading-4 text-[#c8ddff]">Личный канал TG TOP Assistant закреплён за @{telegramUserAgentStatus.ownerDm.username}. Другие личные сообщения не будут иметь доступа.</div> : <div className="space-y-2 rounded-xl border border-white/8 bg-white/[0.035] p-3"><p className="text-[11px] leading-4 text-slate-400">Одно стартовое приветствие будет отправлено только указанному owner-аккаунту. Username сразу закрепится как постоянный Telegram ID.</p><Input value={telegramOwnerDmUsername} onChange={event => setTelegramOwnerDmUsername(event.target.value)} autoComplete="off" placeholder="@username владельца" className="h-10 border-white/10 bg-[#17212b] text-sm text-slate-100" /><Button onClick={() => bootstrapTelegramOwnerDm.mutate({ username: telegramOwnerDmUsername })} disabled={bootstrapTelegramOwnerDm.isPending || telegramOwnerDmUsername.trim().length < 5} className="h-10 w-full bg-[#3f8cff] text-sm text-white">{bootstrapTelegramOwnerDm.isPending ? ui.loading : "Отправить стартовое приветствие"}</Button></div>}
                        <Button variant="outline" onClick={() => disconnectTelegramUserAgent.mutate()} disabled={disconnectTelegramUserAgent.isPending} className="h-11 w-full border-red-300/25 text-red-100">{disconnectTelegramUserAgent.isPending ? ui.loading : "Отключить рабочий аккаунт"}</Button>
                      </>}
                    </div>
                  </SheetContent>
                </Sheet>
              </>
            )}

            <Sheet open={moderationWindowOpen} onOpenChange={setModerationWindowOpen}>
              <SheetContent side="bottom" className="max-h-[88dvh] overflow-y-auto rounded-t-[26px] border-white/10 bg-[#10161f] text-slate-100">
                <SheetHeader className="px-4 pb-2"><SheetTitle className="text-slate-100">Модерация</SheetTitle><p className="text-xs leading-5 text-slate-500">Проверяйте свежие листинги и управляйте всеми заявками ботов.</p></SheetHeader>
                <div className="space-y-3 px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-2">
                  <div className="grid grid-cols-2 rounded-xl border border-white/8 bg-[#111720] p-0.5">
                    <button type="button" onClick={() => setModerationTab("communities")} className={`h-9 rounded-lg text-xs font-semibold transition-colors ${moderationTab === "communities" ? "bg-[#2b4158] text-[#d7e7f6]" : "text-slate-500 hover:text-slate-200"}`}>Сообщества <span className="ml-1 text-[10px] opacity-70">{activeModerationListings.length}</span></button>
                    <button type="button" onClick={() => setModerationTab("bots")} className={`h-9 rounded-lg text-xs font-semibold transition-colors ${moderationTab === "bots" ? "bg-[#2b4158] text-[#d7e7f6]" : "text-slate-500 hover:text-slate-200"}`}>Боты <span className="ml-1 text-[10px] opacity-70">{allBotListings.length}</span></button>
                  </div>
                  {moderationTab === "communities" ? (
                    <section className="overflow-hidden rounded-2xl border border-[#3390ec]/25 bg-[#202b3a]"><div className="border-b border-white/8 px-3 py-3"><b className="text-sm text-slate-100">Залистенные сообщества</b><p className="mt-1 text-[11px] leading-4 text-slate-400">Полный список по времени листинга: свежие сверху.</p></div>{activeModerationListings.length ? <div className="divide-y divide-white/8">{activeModerationListings.map(group => { const groupUrl = group.inviteLink ?? (group.username ? `https://t.me/${group.username}` : null); return <article key={group.id} className="flex items-center gap-2 px-3 py-2.5"><span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg border border-white/10 bg-[#17212b] text-[10px] font-semibold text-slate-300">{group.avatarFileId ? <img src={`/api/telegram-avatar/${encodeURIComponent(group.chatId)}`} alt="" className="h-full w-full object-cover" /> : group.title.slice(0, 1).toUpperCase()}</span><button type="button" onClick={() => groupUrl && openTelegramInNewBrowserTab(groupUrl)} disabled={!groupUrl} className="min-w-0 flex-1 text-left disabled:opacity-50"><b className="block truncate text-xs text-slate-100">{group.title}</b><small className="block truncate text-[10px] text-slate-400">{group.category} · {group.ownerName ?? "Владелец"} · {group.listedAt ? new Date(group.listedAt).toLocaleString() : "—"}</small></button><button type="button" onClick={() => { setModerationReasonDraft(""); setPendingModerationGroup({ id: group.id, title: group.title }); }} disabled={moderateGroup.isPending} aria-label={`Снять ${group.title} с ТОПа`} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-red-400/35 bg-red-500/10 text-red-200 disabled:opacity-35"><Trash2 className="h-4 w-4" /></button></article>; })}</div> : <p className="px-4 py-8 text-center text-xs text-slate-500">Залистенных сообществ сейчас нет.</p>}</section>
                  ) : (
                    <section className="space-y-2"><div className="grid grid-cols-4 rounded-xl border border-white/8 bg-[#111720] p-0.5">{([{ key: "all", label: "Все" }, { key: "pending", label: "Заявки" }, { key: "approved", label: "Лист" }, { key: "rejected", label: "Отказ" }] as const).map(item => <button key={item.key} type="button" onClick={() => setBotModerationFilter(item.key)} className={`h-8 rounded-lg text-[10px] font-semibold transition-colors ${botModerationFilter === item.key ? "bg-[#2b4158] text-[#d7e7f6]" : "text-slate-500 hover:text-slate-200"}`}>{item.label}</button>)}</div><div className="overflow-hidden rounded-2xl border border-violet-300/20 bg-[#202b3a]"><div className="border-b border-white/8 px-3 py-3"><b className="text-sm text-slate-100">Боты</b><p className="mt-1 text-[11px] leading-4 text-slate-400">Все, на заявке, залистенные и отклонённые.</p></div>{filteredModerationBots.length ? <div className="divide-y divide-white/8">{filteredModerationBots.map(bot => { const draft = botModerationDrafts[bot.id] ?? { category: bot.category, reason: "" }; const statusLabel = bot.moderationStatus === "pending" ? "На заявке" : bot.moderationStatus === "approved" ? "Залистен" : "Отклонён"; const statusStyle = bot.moderationStatus === "pending" ? "border-amber-300/25 bg-amber-300/10 text-amber-100" : bot.moderationStatus === "approved" ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-100" : "border-rose-300/25 bg-rose-400/10 text-rose-100"; return <article key={bot.id} className="space-y-2 px-3 py-3"><div className="flex items-center gap-2"><BotAvatar username={bot.username} className="h-9 w-9 rounded-lg" /><button type="button" onClick={() => openTelegramInNewBrowserTab(bot.telegramLink)} className="min-w-0 flex-1 text-left"><b className="block truncate text-xs text-slate-100">@{bot.username}</b><small className="block truncate text-[10px] text-slate-500">{bot.ownerName ?? bot.ownerTelegramUsername ?? "Владелец"} · {bot.category === "General" ? "Без рубрики" : botTopicOptions.find(topic => topic.code === bot.category)?.label ?? bot.category}</small></button><span className={`shrink-0 rounded-md border px-1.5 py-1 text-[9px] font-semibold ${statusStyle}`}>{statusLabel}</span><button type="button" onClick={() => { if (window.confirm(`Удалить @${bot.username} из каталога?`)) deleteBotListing.mutate({ botListingId: bot.id }); }} disabled={deleteBotListing.isPending} aria-label={`Удалить @${bot.username}`} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-red-400/35 bg-red-500/10 text-red-200 disabled:opacity-35"><Trash2 className="h-4 w-4" /></button></div>{bot.moderationStatus === "pending" && <><div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-2"><Select value={draft.category} onValueChange={category => setBotModerationDrafts(current => ({ ...current, [bot.id]: { ...draft, category } }))}><SelectTrigger className="h-9 border-white/10 bg-[#17212b] text-[10px] text-slate-200"><SelectValue /></SelectTrigger><SelectContent className="border-white/10 bg-[#111720] text-slate-100"><SelectItem value="General" className="text-xs text-slate-200">Без рубрики</SelectItem>{botTopicOptions.map(topic => <SelectItem key={topic.id} value={topic.code} className="text-xs text-slate-200">{topic.label}</SelectItem>)}</SelectContent></Select><button type="button" onClick={() => moderateBotListing.mutate({ botListingId: bot.id, action: "approve", category: draft.category })} disabled={moderateBotListing.isPending} className="rounded-lg border border-emerald-300/25 bg-emerald-500/10 px-2 text-[10px] font-semibold text-emerald-100 disabled:opacity-45">Да</button><button type="button" onClick={() => moderateBotListing.mutate({ botListingId: bot.id, action: "reject", reason: draft.reason })} disabled={draft.reason.trim().length < 3 || moderateBotListing.isPending} className="rounded-lg border border-rose-300/25 bg-rose-500/10 px-2 text-[10px] font-semibold text-rose-100 disabled:opacity-45">Нет</button></div><Input value={draft.reason} onChange={event => setBotModerationDrafts(current => ({ ...current, [bot.id]: { ...draft, reason: event.target.value } }))} maxLength={255} placeholder="Причина — обязательна при отказе" className="h-8 border-white/10 bg-[#17212b] px-2 text-[10px] text-slate-100 placeholder:text-slate-600" /></>}{bot.moderationStatus === "rejected" && bot.moderationReason && <p className="text-[10px] leading-4 text-rose-200/90">Причина: {bot.moderationReason}</p>}</article>; })}</div> : <p className="px-4 py-8 text-center text-xs text-slate-500">В этом фильтре ботов нет.</p>}</div></section>
                  )}
                </div>
              </SheetContent>
            </Sheet>

            <section className="hidden overflow-hidden rounded-2xl border border-violet-300/20 bg-[#202b3a]">
              <div className="border-b border-white/8 px-4 py-4"><div className="flex items-start justify-between gap-3"><span><h2 className="text-sm font-semibold text-slate-100">Заявки на ботов</h2><p className="mt-1 text-xs leading-5 text-slate-400">Проверяйте публичную ссылку и выберите рубрику перед публикацией.</p></span><span className="rounded-md border border-violet-300/25 bg-violet-400/10 px-2 py-1 text-[10px] font-semibold text-violet-100">{botModerationQueue.length}</span></div></div>
              {botModerationQueue.length ? <div className="divide-y divide-white/8">{botModerationQueue.map(bot => {
                const draft = botModerationDrafts[bot.id] ?? { category: "General", reason: "" };
                return <article key={bot.id} className="space-y-2 px-4 py-3"><div className="flex items-center gap-2"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-violet-300/20 bg-violet-400/10 text-violet-100"><Bot className="h-4 w-4" /></span><button type="button" onClick={() => openTelegramInNewBrowserTab(bot.telegramLink)} className="min-w-0 flex-1 text-left"><b className="block truncate text-xs text-slate-100">@{bot.username}</b><small className="block truncate text-[10px] text-slate-500">{bot.ownerName ?? bot.ownerTelegramUsername ?? "Владелец"}</small></button><button type="button" onClick={() => openTelegramInNewBrowserTab(bot.telegramLink)} className="rounded-lg border border-white/10 px-2 py-1.5 text-[9px] font-semibold text-slate-300">Открыть</button></div><div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-2"><Select value={draft.category} onValueChange={category => setBotModerationDrafts(current => ({ ...current, [bot.id]: { ...draft, category } }))}><SelectTrigger className="h-9 border-white/10 bg-[#17212b] text-[10px] text-slate-200"><SelectValue /></SelectTrigger><SelectContent className="border-white/10 bg-[#111720] text-slate-100"><SelectItem value="General" className="text-xs text-slate-200">Без рубрики</SelectItem>{botTopicOptions.map(topic => <SelectItem key={topic.id} value={topic.code} className="text-xs text-slate-200">{topic.label}</SelectItem>)}</SelectContent></Select><button type="button" onClick={() => moderateBotListing.mutate({ botListingId: bot.id, action: "approve", category: draft.category })} disabled={moderateBotListing.isPending} className="rounded-lg border border-emerald-300/25 bg-emerald-500/10 px-2.5 text-[10px] font-semibold text-emerald-100 disabled:opacity-45">Одобрить</button><button type="button" onClick={() => moderateBotListing.mutate({ botListingId: bot.id, action: "reject", reason: draft.reason })} disabled={draft.reason.trim().length < 3 || moderateBotListing.isPending} className="rounded-lg border border-rose-300/25 bg-rose-500/10 px-2.5 text-[10px] font-semibold text-rose-100 disabled:opacity-45">Отклонить</button></div><Input value={draft.reason} onChange={event => setBotModerationDrafts(current => ({ ...current, [bot.id]: { ...draft, reason: event.target.value } }))} maxLength={255} placeholder="Причина отклонения — обязательно только при отклонении" className="h-9 border-white/10 bg-[#17212b] px-2 text-[10px] text-slate-100 placeholder:text-slate-600" /></article>;
              })}</div> : <p className="px-4 py-8 text-center text-xs text-slate-500">Заявок на ботов сейчас нет.</p>}
            </section>

            <section className="hidden overflow-hidden rounded-2xl border border-[#3390ec]/25 bg-[#202b3a]">
              <div className="border-b border-white/8 px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <span>
                    <h2 className="text-sm font-semibold text-slate-100">Активные лоты</h2>
                    <p className="mt-1 text-xs leading-5 text-slate-400">Сначала показаны новые размещения. Список обновляется автоматически.</p>
                  </span>
                  <span className="rounded-md border border-[#3390ec]/25 bg-[#3390ec]/10 px-2 py-1 text-[10px] font-semibold text-[#b8d7ff]">{activeModerationListings.length}</span>
                </div>
              </div>
              {activeModerationListings.length ? (
                <div className="divide-y divide-white/8">
                  {activeModerationListings.map(group => {
                    const groupUrl = group.inviteLink ?? (group.username ? `https://t.me/${group.username}` : null);
                    return (
                      <article key={group.id} className="flex items-center gap-2 px-3 py-2">
                        <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-lg border border-white/10 bg-[#17212b] text-[10px] font-semibold text-slate-300">
                          {group.avatarFileId ? <img src={`/api/telegram-avatar/${encodeURIComponent(group.chatId)}`} alt="" className="h-full w-full object-cover" /> : group.title.slice(0, 1).toUpperCase()}
                        </span>
                        <button
                          type="button"
                          onClick={() => groupUrl && openTelegramInNewBrowserTab(groupUrl)}
                          disabled={!groupUrl}
                          className="min-w-0 flex-1 text-left disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <b className="block truncate text-[12px] text-slate-100">{group.title}</b>
                          <small className="block truncate text-[10px] text-slate-400">{group.ownerName ?? "Владелец"} · {n(group.membersCount, language)} участников</small>
                        </button>
                        <button
                          type="button"
                          aria-label={`Снять ${group.title} с ТОПа`}
                          title="Снять с ТОПа"
                          onClick={() => { setModerationReasonDraft(""); setPendingModerationGroup({ id: group.id, title: group.title }); }}
                          disabled={moderateGroup.isPending}
                          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-red-400/35 bg-red-500/10 text-red-200 transition-colors hover:bg-red-500/20 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-35"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <p className="px-4 py-8 text-center text-xs text-slate-500">Активных лотов сейчас нет.</p>
              )}
            </section>

            <section className="overflow-hidden rounded-2xl border border-amber-300/20 bg-[#202b3a]">
              <div className="border-b border-white/8 px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <span><h2 className="text-sm font-semibold text-slate-100">Проверка выводов GRAM</h2><p className="mt-1 text-xs leading-5 text-slate-400">Подозрительные заявки не отправляются автоматически. Одобрение запускает предтрансляционную проверку комиссии.</p></span>
                  <span className="rounded-md border border-amber-300/25 bg-amber-300/10 px-2 py-1 text-[10px] font-semibold text-amber-100">{tonWithdrawalsForManualReview.length}</span>
                </div>
              </div>
              {tonWithdrawalsForManualReview.length ? <div className="divide-y divide-white/8">{tonWithdrawalsForManualReview.map(withdrawal => <article key={withdrawal.id} className="px-4 py-3"><div className="flex items-start justify-between gap-3"><span className="min-w-0"><b className="block text-xs text-slate-100">{formatFinancialGram(Number(withdrawal.grossAmountNano) / 1_000_000_000)} GRAM</b><small className="mt-1 block break-all font-mono text-[9px] text-slate-500">{withdrawal.destinationWalletAddress}</small><small className="mt-1 block text-[10px] text-amber-200/85">{withdrawal.riskLabels.join(" · ") || "требуется ручная проверка"}</small></span><div className="flex shrink-0 gap-1.5"><button type="button" onClick={() => reviewTonWithdrawal.mutate({ withdrawalId: withdrawal.id, action: "reject", reason: "Отклонено при ручной проверке" })} disabled={reviewTonWithdrawal.isPending} className="rounded-lg border border-rose-300/25 bg-rose-500/10 px-2.5 py-2 text-[10px] font-semibold text-rose-100 disabled:opacity-50">Вернуть</button><button type="button" onClick={() => reviewTonWithdrawal.mutate({ withdrawalId: withdrawal.id, action: "approve" })} disabled={reviewTonWithdrawal.isPending} className="rounded-lg border border-emerald-300/25 bg-emerald-500/10 px-2.5 py-2 text-[10px] font-semibold text-emerald-100 disabled:opacity-50">Допустить</button></div></div></article>)}</div> : <p className="px-4 py-8 text-center text-xs text-slate-500">Заявок на ручную проверку нет.</p>}
            </section>

            <Sheet open={Boolean(pendingModerationGroup)} onOpenChange={open => !open && setPendingModerationGroup(null)}>
              <SheetContent side="bottom" className="rounded-t-[26px] border-rose-300/15 bg-[#10161f] text-slate-100">
                <SheetHeader className="px-4 pb-2">
                  <SheetTitle className="text-slate-100">Снять лот с ТОПа?</SheetTitle>
                  <p className="text-xs leading-5 text-slate-500">Причина будет отправлена владельцу «{pendingModerationGroup?.title}» в личном сообщении от бота TG TOP.</p>
                </SheetHeader>
                <div className="space-y-3 px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3">
                  <Input value={moderationReasonDraft} onChange={event => setModerationReasonDraft(event.target.value)} maxLength={255} placeholder="Укажите причину" className="h-11 border-rose-300/15 bg-rose-500/[0.04] text-sm text-slate-100 placeholder:text-slate-600" />
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setPendingModerationGroup(null)} className="flex-1 rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-300">Отмена</button>
                    <button type="button" onClick={() => pendingModerationGroup && moderateGroup.mutate({ groupId: pendingModerationGroup.id, action: "review", reason: moderationReasonDraft.trim() }, { onSuccess: () => setPendingModerationGroup(null) })} disabled={moderationReasonDraft.trim().length < 3 || moderateGroup.isPending} className="flex-1 rounded-xl bg-rose-500 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{moderateGroup.isPending ? "Снимаем…" : "Снять"}</button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <section className="overflow-hidden rounded-2xl border border-white/8 bg-[#202b3a]">
              <div className="border-b border-white/8 px-4 py-4">
                <h2 className="text-sm font-semibold text-slate-100">География и рубрики</h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">Все пользователи с доступом к админ-панели могут менять эти списки. Удаление недоступно, пока значение используется в размещении.</p>
              </div>

              <details open className="border-b border-white/8 px-4 py-3">
                <summary className="cursor-pointer text-xs font-semibold text-slate-200">Страны · {catalogTaxonomy?.countries.length ?? 0}</summary>
                <div className="mt-3 grid grid-cols-[92px_minmax(0,1fr)_auto] gap-2">
                  <Input value={catalogCountryCodeDraft} onChange={event => setCatalogCountryCodeDraft(event.target.value.toUpperCase())} placeholder="Код" className="h-9 border-white/10 bg-[#17212b] px-2 text-[11px] text-slate-100 placeholder:text-slate-600" />
                  <Input value={catalogCountryLabelDraft} onChange={event => setCatalogCountryLabelDraft(event.target.value)} placeholder="Название страны" className="h-9 min-w-0 border-white/10 bg-[#17212b] px-2 text-[11px] text-slate-100 placeholder:text-slate-600" />
                  <button type="button" onClick={() => addCatalogCountry.mutate({ code: catalogCountryCodeDraft, label: catalogCountryLabelDraft })} disabled={catalogCountryCodeDraft.trim().length < 2 || catalogCountryLabelDraft.trim().length < 2 || addCatalogCountry.isPending} className="rounded-lg border border-[#3390ec]/35 bg-[#3390ec]/10 px-2 text-[10px] font-semibold text-[#b8d7ff] disabled:opacity-40">Добавить</button>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(catalogTaxonomy?.countries ?? []).map(country => <span key={country.id} className="flex items-center gap-1 rounded-lg border border-white/8 bg-[#17212b] py-1 pl-2 pr-1 text-[10px] text-slate-300"><b>{country.label}</b><small className="text-slate-600">{country.code}</small>{country.code !== "Global" && <button type="button" onClick={() => deleteCatalogCountry.mutate({ countryCode: country.code })} disabled={deleteCatalogCountry.isPending} aria-label={`Удалить страну ${country.label}`} className="grid h-5 w-5 place-items-center rounded text-red-200 hover:bg-red-500/15"><X className="h-3 w-3" /></button>}</span>)}
                </div>
              </details>

              <details className="border-b border-white/8 px-4 py-3">
                <summary className="cursor-pointer text-xs font-semibold text-slate-200">Города · {catalogTaxonomy?.cities.length ?? 0}</summary>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Select value={catalogCityCountryDraft} onValueChange={setCatalogCityCountryDraft}>
                    <SelectTrigger className="h-9 border-white/10 bg-[#17212b] text-[11px] text-slate-200"><SelectValue placeholder="Страна" /></SelectTrigger>
                    <SelectContent className="border-white/10 bg-[#111720] text-slate-100">{(catalogTaxonomy?.countries ?? []).map(country => <SelectItem key={country.id} value={country.code} className="text-xs text-slate-200">{country.label}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input value={catalogCityCodeDraft} onChange={event => setCatalogCityCodeDraft(event.target.value)} placeholder="Код города" className="h-9 border-white/10 bg-[#17212b] px-2 text-[11px] text-slate-100 placeholder:text-slate-600" />
                  <Input value={catalogCityLabelDraft} onChange={event => setCatalogCityLabelDraft(event.target.value)} placeholder="Название города" className="col-span-2 h-9 border-white/10 bg-[#17212b] px-2 text-[11px] text-slate-100 placeholder:text-slate-600" />
                </div>
                <button type="button" onClick={() => addCatalogCity.mutate({ countryCode: catalogCityCountryDraft, code: catalogCityCodeDraft, label: catalogCityLabelDraft })} disabled={catalogCityCodeDraft.trim().length < 2 || catalogCityLabelDraft.trim().length < 2 || addCatalogCity.isPending} className="mt-2 w-full rounded-lg border border-[#3390ec]/35 bg-[#3390ec]/10 py-2 text-[10px] font-semibold text-[#b8d7ff] disabled:opacity-40">Добавить город</button>
                <div className="mt-3 space-y-1.5">{(catalogTaxonomy?.cities ?? []).map(city => <div key={city.id} className="flex items-center justify-between gap-3 rounded-lg bg-[#17212b] px-2.5 py-2"><span className="min-w-0"><b className="block truncate text-[11px] text-slate-200">{city.label}</b><small className="text-[9px] text-slate-500">{city.countryCode} · {city.code}</small></span><button type="button" onClick={() => deleteCatalogCity.mutate({ cityId: city.id })} disabled={deleteCatalogCity.isPending} aria-label={`Удалить город ${city.label}`} className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-red-200 hover:bg-red-500/15"><X className="h-3.5 w-3.5" /></button></div>)}</div>
              </details>

              <details className="px-4 py-3">
                <summary className="cursor-pointer text-xs font-semibold text-slate-200">Рубрики сообществ и ботов · {catalogTaxonomy?.topics.length ?? 0}</summary>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Select value={catalogTopicCategoryDraft} onValueChange={value => setCatalogTopicCategoryDraft(value as "Каналы" | "Чаты" | "Боты")}><SelectTrigger className="h-9 border-white/10 bg-[#17212b] text-[11px] text-slate-200"><SelectValue /></SelectTrigger><SelectContent className="border-white/10 bg-[#111720] text-slate-100"><SelectItem value="Каналы" className="text-xs text-slate-200">Каналы</SelectItem><SelectItem value="Чаты" className="text-xs text-slate-200">Чаты</SelectItem><SelectItem value="Боты" className="text-xs text-slate-200">Боты</SelectItem></SelectContent></Select>
                  <Input value={catalogTopicCodeDraft} onChange={event => setCatalogTopicCodeDraft(event.target.value)} placeholder="Код рубрики" className="h-9 border-white/10 bg-[#17212b] px-2 text-[11px] text-slate-100 placeholder:text-slate-600" />
                  <Input value={catalogTopicLabelDraft} onChange={event => setCatalogTopicLabelDraft(event.target.value)} placeholder="Название рубрики" className="col-span-2 h-9 border-white/10 bg-[#17212b] px-2 text-[11px] text-slate-100 placeholder:text-slate-600" />
                </div>
                <button type="button" onClick={() => addCatalogTopic.mutate({ category: catalogTopicCategoryDraft, code: catalogTopicCodeDraft, label: catalogTopicLabelDraft })} disabled={catalogTopicCodeDraft.trim().length < 2 || catalogTopicLabelDraft.trim().length < 2 || addCatalogTopic.isPending} className="mt-2 w-full rounded-lg border border-[#3390ec]/35 bg-[#3390ec]/10 py-2 text-[10px] font-semibold text-[#b8d7ff] disabled:opacity-40">Добавить рубрику</button>
                <div className="mt-3 space-y-1.5">{(catalogTaxonomy?.topics ?? []).map(topic => <div key={topic.id} className="flex items-center justify-between gap-3 rounded-lg bg-[#17212b] px-2.5 py-2"><span className="min-w-0"><b className="block truncate text-[11px] text-slate-200">{topic.label}</b><small className="text-[9px] text-slate-500">{topic.category} · {topic.code}</small></span><button type="button" onClick={() => deleteCatalogTopic.mutate({ topicId: topic.id })} disabled={deleteCatalogTopic.isPending} aria-label={`Удалить рубрику ${topic.label}`} className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-red-200 hover:bg-red-500/15"><X className="h-3.5 w-3.5" /></button></div>)}</div>
              </details>
            </section>

            {moderationAccess.canManageModerators && (
              <section className="rounded-2xl border border-white/8 bg-[#202b3a] p-4">
                <h2 className="text-sm font-semibold text-slate-100">Доступ к админ-панели</h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">Укажите @username: пользователь получит полный доступ к лотам, странам, городам и рубрикам. Для выдачи доступа он должен хотя бы один раз войти в TG TOP через Telegram.</p>
                <div className="mt-3 flex gap-2">
                  <Input value={moderatorUsernameDraft} onChange={event => setModeratorUsernameDraft(event.target.value)} placeholder="@username" className="h-10 min-w-0 flex-1 border-white/10 bg-[#17212b] text-xs text-slate-100 placeholder:text-slate-600" />
                  <button onClick={() => moderatorUsernameDraft.trim().length >= 2 && setModeratorRole.mutate({ telegramUsername: moderatorUsernameDraft, role: "moderator" })} disabled={moderatorUsernameDraft.trim().length < 2 || setModeratorRole.isPending} className="rounded-xl border border-[#3390ec]/35 bg-[#3390ec]/10 px-3 text-[11px] font-medium text-[#b8d7ff] disabled:opacity-40">Дать доступ</button>
                </div>
                <div className="mt-3 space-y-1.5">
                  {moderators.map(moderator => <div key={moderator.openId} className="flex items-center justify-between gap-3 rounded-xl bg-[#17212b] px-3 py-2.5"><span className="min-w-0"><b className="block truncate text-[11px] text-slate-200">{moderator.telegramUsername ? `@${moderator.telegramUsername}` : moderator.name ?? moderator.openId}</b><small className="text-[9px] text-slate-500">{moderator.role === "admin" ? "Главный администратор" : "Доступ к админ-панели"}</small></span>{moderator.role === "moderator" && moderator.telegramUsername && <button onClick={() => setModeratorRole.mutate({ telegramUsername: moderator.telegramUsername!, role: "user" })} className="text-[10px] text-red-200">Забрать доступ</button>}</div>)}
                </div>
              </section>
            )}
          </section>
  );
}
