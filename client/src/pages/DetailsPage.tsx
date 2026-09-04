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

type DetailsPageProps = Pick<HomeController, "isAuthenticated" | "setPage" | "detailStatsPeriod" | "setDetailStatsPeriod" | "category" | "subcategory" | "country" | "city" | "setPendingGroupDeletion" | "setPendingModerationGroup" | "amount" | "detailVisibility" | "setDetailVisibility" | "detailBidInput" | "setDetailBidInput" | "language" | "setLotGroupPickerOpen" | "setLotGroupId" | "inlineListingOpen" | "setInlineListingOpen" | "setManagerSheetOpen" | "setListingCountrySheetOpen" | "setListingSubcategorySheetOpen" | "setSelectedManagerTelegramUserId" | "listingCountry" | "listingCity" | "listingSubcategory" | "salePriceTon" | "setSalePriceTon" | "isListingForSale" | "setIsListingForSale" | "managerPublic" | "setManagerPublic" | "listingAnnouncementEnabled" | "setListingAnnouncementEnabled" | "searchIndexable" | "setSearchIndexable" | "rewardCampaignEnabled" | "setRewardCampaignEnabled" | "rewardBudget" | "setRewardBudget" | "rewardPerSubscription" | "setRewardPerSubscription" | "rewardPerManualAdd" | "channelGiftsOpen" | "setChannelGiftsOpen" | "positionClock" | "detailReturnPage" | "detailSwipeStart" | "ui" | "tx" | "nfts" | "mine" | "moderationAccess" | "detailModerationReason" | "setDetailModerationReason" | "channelGiftsQuery" | "channelGifts" | "moderateGroup" | "detail" | "rewardCampaignStats" | "listWithCredits" | "createRewardInviteLink" | "resolveVerifiedEntryLink" | "unlistGroups" | "toggleServiceMessagesMutation" | "placeBid" | "createProtectedGroupDeal" | "selectedSlot" | "ownsDetail" | "placementSlot" | "detailMinimumBid" | "detailRankingBidAmount" | "detailRewardBudgetUnits" | "detailHeaderPath" | "detailHeaderAddress" | "selectedLotGroup" | "detailPlacementTotalUnits" | "detailBalanceChangeUnits" | "lotSettingsLocked" | "detailRankingPreviewSlotNumber" | "detailDisplayedSlotNumber" | "detailTypeRankingPreviewPosition" | "detailWillDrop" | "dailyGrowthPct" | "detailMessagesForPeriod" | "detailJoinedForPeriod" | "detailLeavesForPeriod" | "detailInvitedForPeriod" | "detailMembersLabel" | "detailEntryReward" | "detailRewardActive" | "openRewardAwareEntry" | "detailSalePrice" | "detailSaleEnabled" | "detailCanBeBought" | "detailHasEnoughBalanceToBuy" | "managedCountries" | "getManagedTopicLabel" | "openListing" | "openGiveawayCreate" | "getSalePriceForSave" | "saveInlineDetailListing">;

export function DetailsPage(props: DetailsPageProps) {
  const {
    isAuthenticated,
    setPage,
    detailStatsPeriod,
    setDetailStatsPeriod,
    category,
    subcategory,
    country,
    city,
    setPendingGroupDeletion,
    setPendingModerationGroup,
    amount,
    detailVisibility,
    setDetailVisibility,
    detailBidInput,
    setDetailBidInput,
    language,
    setLotGroupPickerOpen,
    setLotGroupId,
    inlineListingOpen,
    setInlineListingOpen,
    setManagerSheetOpen,
    setListingCountrySheetOpen,
    setListingSubcategorySheetOpen,
    setSelectedManagerTelegramUserId,
    listingCountry,
    listingCity,
    listingSubcategory,
    salePriceTon,
    setSalePriceTon,
    isListingForSale,
    setIsListingForSale,
    managerPublic,
    setManagerPublic,
    listingAnnouncementEnabled,
    setListingAnnouncementEnabled,
    searchIndexable,
    setSearchIndexable,
    rewardCampaignEnabled,
    setRewardCampaignEnabled,
    rewardBudget,
    setRewardBudget,
    rewardPerSubscription,
    setRewardPerSubscription,
    rewardPerManualAdd,
    channelGiftsOpen,
    setChannelGiftsOpen,
    positionClock,
    detailReturnPage,
    detailSwipeStart,
    ui,
    tx,
    nfts,
    mine,
    moderationAccess,
    detailModerationReason,
    setDetailModerationReason,
    channelGiftsQuery,
    channelGifts,
    moderateGroup,
    detail,
    rewardCampaignStats,
    listWithCredits,
    createRewardInviteLink,
    resolveVerifiedEntryLink,
    unlistGroups,
    toggleServiceMessagesMutation,
    placeBid,
    createProtectedGroupDeal,
    selectedSlot,
    ownsDetail,
    placementSlot,
    detailMinimumBid,
    detailRankingBidAmount,
    detailRewardBudgetUnits,
    detailHeaderPath,
    detailHeaderAddress,
    selectedLotGroup,
    detailPlacementTotalUnits,
    detailBalanceChangeUnits,
    lotSettingsLocked,
    detailRankingPreviewSlotNumber,
    detailDisplayedSlotNumber,
    detailTypeRankingPreviewPosition,
    detailWillDrop,
    dailyGrowthPct,
    detailMessagesForPeriod,
    detailJoinedForPeriod,
    detailLeavesForPeriod,
    detailInvitedForPeriod,
    detailMembersLabel,
    detailEntryReward,
    detailRewardActive,
    openRewardAwareEntry,
    detailSalePrice,
    detailSaleEnabled,
    detailCanBeBought,
    detailHasEnoughBalanceToBuy,
    managedCountries,
    getManagedTopicLabel,
    openListing,
    openGiveawayCreate,
    getSalePriceForSave,
    saveInlineDetailListing,
  } = props;
  return (
          <section
            className="space-y-4"
            onTouchStart={event => {
              detailSwipeStart.current = { x: event.touches[0]?.clientX ?? 0, y: event.touches[0]?.clientY ?? 0, scrollY: window.scrollY };
            }}
            onTouchEnd={event => {
              const start = detailSwipeStart.current;
              const end = event.changedTouches[0];
              detailSwipeStart.current = null;
              if (!start || !end || !ownsDetail || start.scrollY > 8) return;
              const distanceY = end.clientY - start.y;
              const distanceX = Math.abs(end.clientX - start.x);
              if (distanceY >= 88 && distanceX <= 72) setPage(detailReturnPage);
            }}
          >
            {detail ? (
              <>
                <button
                  onClick={() => setPage(detailReturnPage)}
                  className="flex h-11 w-full min-w-0 items-center gap-2 rounded-lg px-1.5 text-left transition-colors hover:bg-white/[0.035] active:bg-white/[0.06]"
                >
                  <ArrowLeft className="h-5 w-5 shrink-0 text-slate-300" />
                  <b className="shrink-0 text-sm font-medium text-slate-200">{ui.back}</b>
                  <span className="shrink-0 text-[10px] text-slate-600">·</span>
                  <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-slate-500">{detailHeaderPath}</span>
                </button>
                <div className="relative flex flex-col overflow-hidden rounded-[22px] border border-[#31435f] bg-[#17212b] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-1.5">
                      {detailDisplayedSlotNumber ? (
                        <>
                          <span className="rounded-lg border border-[#354966] bg-[#202b3a] px-2 py-1 text-[10px] font-bold tracking-[0.08em] text-[#c4d8f6]">{selectedSlot ? `#${detailDisplayedSlotNumber}` : `Прогноз #${detailDisplayedSlotNumber}`}</span>
                          {selectedSlot && <b className="shrink-0 font-mono text-[10px] font-semibold tracking-[0.04em] text-slate-300">{formatPositionDuration(selectedSlot.updatedAt, positionClock)}</b>}
                        </>
                      ) : (
                        <span className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-semibold text-slate-400">Место не выбрано</span>
                      )}
                    </div>
                    <span className="flex items-center gap-1.5">
                      {detailRewardActive && <Star className="h-4 w-4 shrink-0 fill-[#ffd766] text-[#ffd766]" aria-label="Вознаграждение активно" />}
                    </span>
                  </div>

                  <div className="mt-3 flex items-start gap-3">
                    <div className="relative shrink-0">
                      <button type="button" onClick={openRewardAwareEntry} disabled={resolveVerifiedEntryLink.isPending || createRewardInviteLink.isPending} className="rounded-[22px] transition-transform active:scale-[0.98] disabled:cursor-default">
                        <Avatar group={detail.group} hero />
                      </button>
                      <span className={`absolute bottom-1 right-1 inline-flex items-center gap-0.5 whitespace-nowrap text-[8px] font-medium leading-none ${dailyGrowthPct !== null && dailyGrowthPct < 0 ? "text-rose-300/75" : "text-emerald-300/75"}`}>
                        {dailyGrowthPct !== null && dailyGrowthPct < 0 ? <TrendingDown className="h-2 w-2" /> : <TrendingUp className="h-2 w-2" />}{dailyGrowthPct !== null && dailyGrowthPct > 0 ? "+" : ""}{dailyGrowthPct !== null ? `${dailyGrowthPct.toFixed(1)}%` : "0%"}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <h1 className="mt-1 truncate text-[21px] font-bold tracking-tight text-white">{detail.group.title}</h1>
                      <p className="mt-1 flex items-center gap-1 text-xs font-medium text-slate-400"><span className="text-sm">▣</span>{detail.group.inviteLink && !detail.group.username ? "Приватное сообщество" : detail.group.category === "Каналы" ? "Канал" : "Группа"}</p>
                      {detail.group.description ? <p className="mt-2 line-clamp-4 text-xs leading-4 text-slate-300">{detail.group.description}</p> : <p className="mt-2 text-xs leading-4 text-slate-500">Описание сообщества не добавлено.</p>}
                      <p className="mt-1.5 truncate text-[11px] font-medium text-[#92b8ed]">{detailHeaderAddress}</p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-stretch gap-1.5">
                    <button
                      type="button"
                      onClick={openRewardAwareEntry}
                      disabled={resolveVerifiedEntryLink.isPending || createRewardInviteLink.isPending}
                      className="flex min-h-[40px] min-w-0 flex-1 flex-col items-center justify-center rounded-xl border border-[#5ba8f2] bg-[#3390ec] px-2 text-center text-white transition-colors hover:bg-[#4199ee] active:scale-[0.98] disabled:opacity-50"
                    >
                      <span className="flex items-center justify-center gap-1"><Send className="h-3.5 w-3.5 text-white/90" /><b className="text-[12px] leading-3">Перейти</b></span>
                      {detailRewardActive && <span className="mt-0.5 block text-[7px] leading-2 text-[#d7ffec]">За вступление получите <b className="font-extrabold text-[#63f5b1]">+{formatGram(detailEntryReward)} GRAM</b></span>}
                    </button>
                    {detailSaleEnabled && <button
                      type="button"
                      onClick={() => {
                        if (!detailCanBeBought) return;
                        if (!detailHasEnoughBalanceToBuy) return toast.error("Недостаточно средств на балансе");
                        createProtectedGroupDeal.mutate({ groupId: detail.group.id });
                      }}
                      disabled={!detailCanBeBought}
                      className="flex min-h-[38px] w-[76px] shrink-0 flex-col items-center justify-center rounded-xl border border-[#386a5f] bg-[#203a35] px-1.5 text-center text-white transition-colors hover:bg-[#26443e] active:scale-[0.98] disabled:cursor-default"
                    >
                      <b className="text-[12px] leading-3">{detailSalePrice} <small className="text-[7px] font-medium text-[#b7d8ce]">GRAM</small></b><small className="mt-0.5 text-[7px] leading-2 text-[#b7d8ce]">Купить</small>
                    </button>}
                    {managerPublic && <button
                      type="button"
                      onClick={() => { if (managerPublic && detail.group.managerUsername) openTelegramInNewBrowserTab(`https://t.me/${detail.group.managerUsername}`); }}
                      disabled={!managerPublic || !detail.group.managerUsername}
                      className="flex min-h-[38px] w-[76px] shrink-0 items-center gap-1.5 rounded-xl border border-[#354966] bg-[#202b3a] px-2 text-left text-slate-100 transition-colors hover:bg-[#253247] active:scale-[0.98] disabled:cursor-default"
                    >
                      {detail.group.managerAvatarUrl ? <img src={detail.group.managerAvatarUrl} alt="" className="h-5 w-5 shrink-0 rounded-full object-cover" /> : <UserRound className="h-4 w-4 shrink-0 text-slate-400" />}
                      <b className="truncate text-[9px] leading-3">{detail.group.managerName ?? "Менеджер"}</b>
                    </button>}
                  </div>

                  {detail && <section className="mt-3 rounded-xl border border-[#31435f] bg-[#202b3a] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="text-base font-bold text-white">Динамика аудитории</h2>
                      <span className="text-xs font-semibold text-[#75adff]">{n(detail.group.membersCount)} {detailMembersLabel}</span>
                    </div>
                    <div aria-label="Период статистики" className="mt-2 flex gap-1 rounded-lg border border-white/8 bg-[#151d29] p-0.5">
                      {([['day', 'День'], ['month', 'Месяц'], ['all', 'Всё время']] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setDetailStatsPeriod(value)} className={`h-7 flex-1 rounded-md text-[10px] font-semibold transition-colors ${detailStatsPeriod === value ? 'bg-[#3f8cff]/18 text-[#b9d4ff]' : 'text-slate-500'}`}>{label}</button>)}
                    </div>
                    <div className="mt-2">
                      <AudienceGrowthChart snapshots={detail.snapshots} language={language} embedded />
                    </div>
                  </section>}

                  {detail && <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-[#31435f] bg-[#202b3a] p-3">
                      <div className="flex items-center gap-2.5"><span className="grid h-9 w-9 place-items-center rounded-full bg-emerald-400/10 text-emerald-300"><TrendingUp className="h-4 w-4" /></span><span><small className="block text-[11px] text-slate-400">Вступления</small><b className="mt-0.5 block text-2xl leading-none text-white">{detailJoinedForPeriod === null ? '—' : n(detailJoinedForPeriod)}</b></span></div>
                      <small className="mt-2 block text-[10px] text-emerald-300">зафиксировано ботом</small>
                    </div>
                    <div className="rounded-xl border border-[#31435f] bg-[#202b3a] p-3">
                      <div className="flex items-center gap-2.5"><span className="grid h-9 w-9 place-items-center rounded-full bg-rose-400/10 text-rose-300"><TrendingDown className="h-4 w-4" /></span><span><small className="block text-[11px] text-slate-400">Отписались</small><b className="mt-0.5 block text-2xl leading-none text-white">{detailLeavesForPeriod === null ? '—' : n(detailLeavesForPeriod)}</b></span></div>
                      <small className="mt-2 block text-[10px] text-rose-300">зафиксировано ботом</small>
                    </div>
                    {detail.group.category === "Каналы" ? <>
                      <div className="rounded-xl border border-[#31435f] bg-[#202b3a] p-3"><div className="flex items-center gap-2.5"><span className="grid h-9 w-9 place-items-center rounded-full bg-[#3f8cff]/10 text-[#8fb9ff]"><Send className="h-4 w-4" /></span><span><small className="block text-[11px] text-slate-400">{detailStatsPeriod === 'day' ? 'Постов сегодня' : detailStatsPeriod === 'month' ? 'Постов за месяц' : 'Постов всего'}</small><b className="mt-0.5 block text-2xl leading-none text-white">{detailMessagesForPeriod === null ? "—" : n(detailMessagesForPeriod)}</b></span></div><small className="mt-2 block text-[10px] text-[#8fb9ff]">по наблюдениям бота</small></div>
                      <div className="rounded-xl border border-[#31435f] bg-[#202b3a] p-3"><div className="flex items-center gap-2.5"><span className="grid h-9 w-9 place-items-center rounded-full bg-amber-300/10 text-amber-200"><BarChart3 className="h-4 w-4" /></span><span><small className="block text-[11px] text-slate-400">Просмотры последнего поста</small><b className="mt-0.5 block text-2xl leading-none text-white">{detail.group.lastPostAt ? n(detail.group.lastPostViews) : "—"}</b></span></div><small className="mt-2 block text-[10px] text-amber-200">из Telegram</small></div>
                    </> : <>
                      <div className="rounded-xl border border-[#31435f] bg-[#202b3a] p-3"><div className="flex items-center gap-2.5"><span className="grid h-9 w-9 place-items-center rounded-full bg-violet-400/10 text-violet-300"><UserPlus className="h-4 w-4" /></span><span><small className="block text-[11px] text-slate-400">Пригласили</small><b className="mt-0.5 block text-2xl leading-none text-white">{detailInvitedForPeriod === null ? '—' : n(detailInvitedForPeriod)}</b></span></div><small className="mt-2 block text-[10px] text-violet-300">подтверждено ботом</small></div>
                      <div className="rounded-xl border border-[#31435f] bg-[#202b3a] p-3"><div className="flex items-center gap-2.5"><span className="grid h-9 w-9 place-items-center rounded-full bg-[#3f8cff]/10 text-[#8fb9ff]"><MessageSquare className="h-4 w-4" /></span><span><small className="block text-[11px] text-slate-400">{detailStatsPeriod === 'day' ? 'Сообщений сегодня' : detailStatsPeriod === 'month' ? 'Сообщений за месяц' : 'Сообщений всего'}</small><b className="mt-0.5 block text-2xl leading-none text-white">{detailMessagesForPeriod === null ? "—" : n(detailMessagesForPeriod)}</b></span></div><small className="mt-2 block text-[10px] text-[#8fb9ff]">по наблюдениям бота</small></div>
                    </>}
                  </div>}
                  {detailReturnPage === "mine" && ownsDetail && rewardCampaignStats && (rewardCampaignStats.budgetReserved > 0 || rewardCampaignStats.confirmedParticipants > 0) && (
                    <section className="mt-3 overflow-hidden rounded-xl border border-emerald-300/20 bg-emerald-400/[0.055] p-3">
                      <div className="flex items-start justify-between gap-3">
                        <span>
                          <h2 className="text-sm font-bold text-emerald-50">Вознаграждения</h2>
                          <small className="mt-0.5 block text-[10px] leading-4 text-emerald-100/60">Личные ссылки создаются только при включённой кампании.</small>
                        </span>
                        <span className={`rounded-lg px-2 py-1 text-[9px] font-semibold ${rewardCampaignStats.campaignActive ? "bg-emerald-300/15 text-emerald-200" : "bg-white/8 text-slate-300"}`}>{rewardCampaignStats.campaignActive ? "Кампания активна" : "Кампания завершена"}</span>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        <span className="rounded-lg border border-white/8 bg-black/10 p-2"><small className="block text-[9px] text-slate-400">Внесено</small><b className="mt-0.5 block text-xs text-white">{formatGram(rewardCampaignStats.budgetReserved)} GRAM</b></span>
                        <span className="rounded-lg border border-white/8 bg-black/10 p-2"><small className="block text-[9px] text-slate-400">Выплачено</small><b className="mt-0.5 block text-xs text-emerald-200">{formatGram(rewardCampaignStats.paidOut)} GRAM</b></span>
                        <span className="rounded-lg border border-white/8 bg-black/10 p-2"><small className="block text-[9px] text-slate-400">Остаток</small><b className="mt-0.5 block text-xs text-amber-100">{formatGram(rewardCampaignStats.refundableRemainder)} GRAM</b></span>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3 text-[10px]"><span className="text-slate-300">Подтверждённые участники: <b className="text-white">{rewardCampaignStats.confirmedParticipants}</b></span><span className="text-slate-400">Персональных ссылок: {rewardCampaignStats.personalLinks}</span></div>
                      {rewardCampaignStats.participants.length > 0 && <div className="mt-2 space-y-1 border-t border-white/8 pt-2">{rewardCampaignStats.participants.slice(0, 5).map(participant => <div key={participant.id} className="flex items-center justify-between gap-3 text-[10px]"><span className="min-w-0 truncate text-slate-300">{participant.username ? `@${participant.username}` : participant.name}</span><b className="shrink-0 text-emerald-200">+{formatGram(participant.amount)} GRAM</b></div>)}</div>}
                      <small className="mt-3 block text-[9px] leading-4 text-slate-400">При снятии лота ставка за место не возвращается. Возвращается только этот неиспользованный остаток бюджета.</small>
                    </section>
                  )}
                  {detailReturnPage === "mine" && ownsDetail && detail.group.category === "Каналы" && (
                    <section className="mt-3 overflow-hidden rounded-xl border border-[#31435f] bg-[#202b3a]">
                      <button type="button" onClick={() => setChannelGiftsOpen(value => !value)} className="flex w-full items-center justify-between gap-3 p-3 text-left transition-colors hover:bg-white/[0.035] active:scale-[0.99]">
                        <span className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg border border-amber-200/20 bg-amber-300/[0.08] text-amber-100"><Gift className="h-4 w-4" /></span><span><b className="block text-xs text-slate-100">Подарки</b><small className="mt-0.5 block text-[10px] text-slate-500">Подарки, которыми владеет канал · только просмотр</small></span></span>
                        <ChevronRight className={`h-4 w-4 text-slate-500 transition-transform ${channelGiftsOpen ? "rotate-90" : ""}`} />
                      </button>
                      {channelGiftsOpen && <div className="border-t border-white/8 p-2.5">
                        {channelGiftsQuery.isPending ? <div className="grid grid-cols-3 gap-2">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="aspect-square animate-pulse rounded-xl bg-white/[0.04]" />)}</div> : channelGiftsQuery.isError ? <p className="rounded-lg bg-rose-500/[0.06] px-2.5 py-2 text-[10px] leading-4 text-rose-100/80">{channelGiftsQuery.error.message}</p> : channelGifts.length ? <div className="grid grid-cols-3 gap-2">{channelGifts.map(gift => <div key={gift.id} className="min-w-0 rounded-xl border border-white/8 bg-[#17212b] p-1.5"><div className="aspect-square overflow-hidden rounded-lg bg-[radial-gradient(circle_at_50%_35%,rgba(255,206,84,.16),transparent_55%),#111925]"><ChannelGiftMediaPreview gift={gift} /></div><b className="mt-1 block truncate text-center text-[8px] text-slate-100">{gift.title}</b><small className="mt-0.5 block truncate text-center text-[7px] text-slate-500">{gift.unique ? "Уникальный" : "Подарок"} · только просмотр</small></div>)}</div> : <p className="px-1 py-2 text-[10px] leading-4 text-slate-500">Telegram не вернул подарки для этого канала.</p>}
                      </div>}
                    </section>
                  )}
                </div>
                <div className="relative flex flex-col">
                  {detail && ownsDetail && (
                    <section className="order-3 mt-2 rounded-xl border border-[#30415d] bg-[#111d32]/90 p-1.5">
                      <button type="button" onClick={() => setInlineListingOpen(value => !value)} className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-1 text-left transition-colors hover:bg-white/[0.045] active:scale-[0.99]">
                        <span className="flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-lg border border-[#3f8cff]/20 bg-[#3f8cff]/10 text-[#8fb9ff]"><Settings2 className="h-3.5 w-3.5" /></span><span><b className="block text-xs text-slate-100">{tx("Параметры публикации", "Publication settings")}</b><small className="mt-0.5 block text-[10px] text-slate-500">{detail.group.status === "listed" ? tx("Видимость, объявление, продажа", "Visibility, announcement, sale") : tx("Настройте перед размещением", "Configure before listing")}</small></span></span>
                        <ChevronRight className={`h-4 w-4 text-slate-500 transition-transform ${inlineListingOpen ? "rotate-90" : ""}`} />
                      </button>
                      {inlineListingOpen && (
                        <div className="mt-1.5 space-y-1.5 border-t border-white/8 pt-1.5">
                          <button type="button" onClick={() => openListing([detail.group.id])} className="flex w-full items-center justify-between gap-3 rounded-lg border border-[#3f8cff]/25 bg-[#3f8cff]/[0.08] px-2.5 py-2 text-left transition-colors hover:bg-[#3f8cff]/[0.13] active:scale-[0.99]">
                            <span><b className="block text-[11px] text-[#c7dcff]">{tx("Цена, место, категория и гео", "Price, placement, category and geo")}</b><small className="mt-0.5 block text-[10px] text-slate-400">{tx("Открыть полный листинг: от 0.1 GRAM с прогнозом позиции", "Open full listing: from 0.1 GRAM with placement preview")}</small></span><ChevronRight className="h-4 w-4 shrink-0 text-[#8fb9ff]" />
                          </button>
                          <div className="flex items-center justify-between gap-3 rounded-lg bg-black/15 px-2.5 py-1.5">
                            <span><b className="block text-[11px] text-slate-200">{detailVisibility === "public" ? tx("Публичная публикация", "Public publication") : tx("Анонимная публикация", "Anonymous publication")}</b><small className="mt-0.5 block text-[10px] text-slate-500">{detailVisibility === "public" ? tx("Другие смогут перейти в ваш профиль", "Others can open your profile") : tx("Владелец не показывается в карточке", "The owner stays hidden in the card")}</small></span>
                            <button type="button" role="switch" aria-checked={detailVisibility === "public"} onClick={() => setDetailVisibility(value => value === "public" ? "anonymous" : "public")} className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors ${detailVisibility === "public" ? "border-[#72a8ff] bg-[#3f8cff]" : "border-white/15 bg-white/8"}`}><span className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${detailVisibility === "public" ? "translate-x-6" : "translate-x-0"}`} /></button>
                          </div>
                          <div className="grid grid-cols-2 gap-1.5">
                            <button type="button" onClick={() => setListingAnnouncementEnabled(value => !value)} className={`rounded-lg border px-2 py-1.5 text-left transition-colors ${listingAnnouncementEnabled ? "border-[#3f8cff]/35 bg-[#3f8cff]/10" : "border-white/8 bg-black/15"}`}><b className="block text-[11px] text-slate-200">{tx("Объявление", "Announcement")}</b><small className={`mt-0.5 block text-[10px] ${listingAnnouncementEnabled ? "text-[#8fb9ff]" : "text-slate-500"}`}>{listingAnnouncementEnabled ? tx("Бот напишет в группе", "Bot will post") : tx("Отключено", "Off")}</small></button>
                            <button type="button" onClick={() => { setLotGroupId(detail.group.id); setSelectedManagerTelegramUserId(detail.group.managerTelegramUserId ?? null); setManagerPublic(detail.group.managerPublic !== false); setManagerSheetOpen(true); }} className="rounded-lg border border-[#3f8cff]/25 bg-[#3f8cff]/[0.08] px-2 py-1.5 text-left transition-colors hover:bg-[#3f8cff]/[0.13]"><b className="block text-[11px] text-slate-200">{tx("Менеджер", "Manager")}</b><small className="mt-0.5 block truncate text-[10px] text-[#8fb9ff]">{detail.group.managerName ?? tx("Выбрать администратора", "Choose administrator")}</small></button>
                          </div>
                          {detail.group.managerName && <div className="flex items-center justify-between gap-3 rounded-lg bg-black/15 px-2.5 py-1.5"><span><b className="block text-[11px] text-slate-200">{tx("Показывать менеджера", "Show manager")}</b><small className="mt-0.5 block text-[10px] text-slate-500">{managerPublic ? tx("Гости увидят профиль менеджера", "Guests can open the manager profile") : tx("Скрыт из публичной карточки", "Hidden from public details")}</small></span><button type="button" role="switch" aria-checked={managerPublic} onClick={() => setManagerPublic(value => !value)} className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors ${managerPublic ? "border-[#72a8ff] bg-[#3f8cff]" : "border-white/15 bg-white/8"}`}><span className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${managerPublic ? "translate-x-6" : "translate-x-0"}`} /></button></div>}
                          {detail.group.username && <div className="flex items-center justify-between gap-3 rounded-lg bg-black/15 px-2.5 py-1.5"><span><b className="block text-[11px] text-slate-200">Показывать в Google</b><small className="mt-0.5 block text-[10px] text-slate-500">Создаст публичную страницу tgtop.me/c/{detail.group.username}</small></span><button type="button" role="switch" aria-checked={searchIndexable} onClick={() => setSearchIndexable(value => !value)} className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors ${searchIndexable ? "border-[#72a8ff] bg-[#3f8cff]" : "border-white/15 bg-white/8"}`}><span className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${searchIndexable ? "translate-x-6" : "translate-x-0"}`} /></button></div>}
                          <div className="flex items-center justify-between gap-3 rounded-lg bg-black/15 px-2.5 py-1.5">
                            <span><b className="block text-[11px] text-slate-200">{tx("Выставить на продажу", "Offer for sale")}</b><small className="mt-0.5 block text-[10px] text-slate-500">{isListingForSale ? tx("Цена будет видна покупателям", "Buyers will see the price") : tx("Без продажи", "Not for sale")}</small></span>
                            <button type="button" role="switch" aria-checked={isListingForSale} onClick={() => setIsListingForSale(value => !value)} className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors ${isListingForSale ? "border-[#72a8ff] bg-[#3f8cff]" : "border-white/15 bg-white/8"}`}><span className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${isListingForSale ? "translate-x-6" : "translate-x-0"}`} /></button>
                          </div>
                          {isListingForSale && <div className="relative"><Input value={salePriceTon} inputMode="decimal" onChange={event => { const value = event.target.value.replace(",", "."); if (/^\d*(\.\d?)?$/.test(value)) setSalePriceTon(value); }} placeholder={tx("Цена продажи", "Sale price")} className="h-9 border-white/10 bg-black/15 pr-14 text-sm" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-slate-500">GRAM</span></div>}
                          <div className="flex items-center justify-between gap-3 rounded-lg bg-black/15 px-2.5 py-1.5">
                            <span><b className="block text-[11px] text-slate-200">{tx("Вознаграждения", "Rewards")}</b><small className="mt-0.5 block text-[10px] text-slate-500">{rewardCampaignEnabled ? tx("GRAM за подтверждённые действия", "GRAM for confirmed actions") : tx("Выключены", "Off")}</small></span>
                            <button type="button" role="switch" aria-checked={rewardCampaignEnabled} onClick={() => setRewardCampaignEnabled(value => !value)} className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors ${rewardCampaignEnabled ? "border-[#72a8ff] bg-[#3f8cff]" : "border-white/15 bg-white/8"}`}><span className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${rewardCampaignEnabled ? "translate-x-6" : "translate-x-0"}`} /></button>
                          </div>
                          {rewardCampaignEnabled && <div className="grid grid-cols-2 gap-2"><div className="relative"><Input value={rewardBudget} inputMode="decimal" onChange={event => setRewardBudget(event.target.value)} placeholder={tx("Бюджет", "Budget")} className="h-9 border-white/10 bg-black/15 pr-10 text-[11px] placeholder:text-[11px]" /><span className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] font-medium text-slate-500">GRAM</span></div><div className="relative"><Input value={rewardPerSubscription} inputMode="decimal" onChange={event => setRewardPerSubscription(event.target.value)} placeholder={detail.group.category === "Чаты" ? tx("За участника", "Per member") : tx("За подписчика", "Per subscriber")} className="h-9 border-white/10 bg-black/15 pr-10 text-[11px] placeholder:text-[11px]" /><span className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] font-medium text-slate-500">GRAM</span></div></div>}
                          <button type="button" onClick={saveInlineDetailListing} disabled={listWithCredits.isPending} className="flex w-full items-center justify-between rounded-lg bg-[#1688f5] px-3 py-2 text-left text-white shadow-md shadow-[#1688f5]/20 transition-transform active:scale-[0.985] disabled:opacity-50"><span><b className="block text-xs">{listWithCredits.isPending ? tx("Сохраняем…", "Saving…") : detail.group.status === "listed" ? tx("Сохранить изменения", "Save changes") : tx("Разместить в каталоге", "List in catalog")}</b><small className="mt-0.5 block text-[10px] text-white/70">{detail.group.status === "listed" ? tx("Без повторной оплаты", "No repeat charge") : tx("От 0.1 GRAM", "From 0.1 GRAM")}</small></span><ChevronRight className="h-4 w-4" /></button>
                        </div>
                      )}
                    </section>
                  )}
                  {detail && ownsDetail && (
                    <div className="hidden order-3 mt-1.5 grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setLotGroupId(detail.group.id);
                          setSelectedManagerTelegramUserId(detail.group.managerTelegramUserId ?? null);
                          setManagerSheetOpen(true);
                        }}
                        className="flex min-w-0 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-2 py-1.5 text-left transition-colors hover:bg-white/[0.065] active:scale-[0.99]"
                      >
                        <UserRound className="h-4 w-4 shrink-0 text-[#8fb9ff]" />
                        <span className="min-w-0"><b className="block text-[11px] text-slate-200">{tx("Менеджер", "Manager")}</b><small className="mt-0.5 block truncate text-[10px] text-slate-500">{detail.group.managerName ?? tx("Не выбран", "Not selected")}</small></span>
                      </button>
                      <button onClick={() => openGiveawayCreate(detail.group)} className="flex items-center justify-between rounded-lg border border-amber-200/25 bg-amber-300/[0.08] px-2 py-1.5 text-left text-[11px] font-semibold text-amber-100 transition-colors hover:bg-amber-300/[0.12] active:scale-[0.99]">
                        <span>{tx("Розыгрыш", "Giveaway")}</span>
                        <Star className="h-3.5 w-3.5 fill-current" />
                      </button>
                    </div>
                  )}
                  {detail && ownsDetail && detail.group.category === "Чаты" && (
                    <div className="hidden order-3 mt-3 space-y-3 rounded-xl border border-white/8 bg-white/4 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs">
                          <b className="block text-slate-200">{tx("Автоочистка чата", "Chat auto-cleanup")}</b>
                          <small className="mt-0.5 block text-[11px] text-slate-400">
                            {tx("Удалять системные уведомления (вход, выход, закреп)", "Delete service messages (joins, leaves, pins)")}
                          </small>
                        </span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={Boolean(detail.group.deleteServiceMessages)}
                          aria-label={tx("Переключить автоочистку чата", "Toggle chat auto-cleanup")}
                          onClick={() => toggleServiceMessagesMutation.mutate({ groupId: detail.group.id, deleteServiceMessages: !detail.group.deleteServiceMessages })}
                          disabled={toggleServiceMessagesMutation.isPending}
                          className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors disabled:opacity-50 ${detail.group.deleteServiceMessages ? "border-[#72a8ff] bg-[#3f8cff]" : "border-white/15 bg-white/8"}`}
                        >
                          <span className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${detail.group.deleteServiceMessages ? "translate-x-6" : "translate-x-0"}`} />
                        </button>
                      </div>
                    </div>
                  )}
                  {detail && !ownsDetail && moderationAccess?.canModerate && detail.group.status === "listed" && (
                    <div className="order-3 mt-3 flex items-center gap-1.5 rounded-xl border border-white/8 bg-[#111720] p-2">
                      <div className="flex min-w-0 flex-1 items-center gap-1.5">
                        <Input value={detailModerationReason} onChange={event => setDetailModerationReason(event.target.value)} placeholder="Причина снятия" className="h-8 min-w-0 flex-1 border-red-300/15 bg-red-500/[0.04] px-2 text-[10px] text-slate-100 placeholder:text-slate-600" />
                        <button type="button" onClick={() => moderateGroup.mutate({ groupId: detail.group.id, action: "review", reason: detailModerationReason.trim() })} disabled={detailModerationReason.trim().length < 3 || moderateGroup.isPending} className="shrink-0 rounded-lg border border-rose-300/20 bg-rose-300/5 px-2.5 py-2 text-[10px] font-semibold text-rose-200 transition-colors hover:bg-rose-300/10 disabled:opacity-50">{moderateGroup.isPending ? "Снимаем…" : "Снять"}</button>
                      </div>
                    </div>
                  )}
                  {placementSlot && (
                    <section className="mt-3 rounded-xl border border-[#31435f] bg-[#17212b] p-3">
                      <div className="flex items-center justify-between gap-2">
                        <h2 className="text-sm font-bold text-slate-100">{selectedSlot ? (ownsDetail ? "Обновить лот" : "Перебить лот") : "Вывести в ТОП"}</h2>
                        {(ownsDetail || moderationAccess?.canModerate) && detail.group.status === "listed" && <button
                          type="button"
                          onClick={() => {
                            if (ownsDetail) setPendingGroupDeletion(detail.group);
                            else setPendingModerationGroup({ id: detail.group.id, title: detail.group.title });
                          }}
                          disabled={ownsDetail && unlistGroups.isPending}
                          className="inline-flex h-7 shrink-0 items-center gap-1 rounded-lg border border-rose-300/25 bg-rose-300/[0.07] px-2 text-[9px] font-semibold text-rose-100 transition-colors hover:bg-rose-300/[0.13] disabled:opacity-50"
                        ><X className="h-3.5 w-3.5" />{tx("Снять лот", "Remove lot")}</button>}
                      </div>

                      {!selectedLotGroup ? (
                        <div className="mt-2 rounded-xl border border-[#31435f] bg-[#101a2d] p-2">
                          <span className="block px-1"><small className="block text-[9px] font-medium uppercase tracking-wide text-slate-500">Текущая ставка за лот</small><b className="mt-0.5 block text-sm text-[#63f5b1]">{formatTon(selectedSlot ? selectedSlot.bidAmount / 1000 : detailMinimumBid ?? 0.1)} GRAM</b></span>
                          <button type="button" onClick={() => { if (!isAuthenticated) { toast.message(tx("Войдите через Telegram, чтобы добавить свою группу", "Sign in with Telegram to add your community")); return; } setLotGroupPickerOpen(true); }} aria-label="Добавить свою группу" title="Добавить свою группу" className="mt-2 flex h-10 w-full items-center justify-center rounded-xl border border-dashed border-[#3f8cff]/35 bg-[#3f8cff]/[0.045] text-[#a6c8ff] transition-colors hover:bg-[#3f8cff]/12 active:scale-[0.985]">
                            <Plus className="h-5 w-5" />
                          </button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => setLotGroupPickerOpen(true)} className="mt-2 flex w-full items-center gap-2 rounded-xl border border-[#3390ec]/55 bg-[#213750] p-2 text-left transition-colors hover:bg-[#274363]">
                          <Avatar group={selectedLotGroup} compact />
                          <span className="min-w-0 flex-1"><small className="block text-[9px] uppercase tracking-wide text-[#8fc4ff]">Выбрана ваша группа</small><b className="block truncate text-xs text-slate-100">{selectedLotGroup.title}</b></span>
                          <span className="text-[10px] font-semibold text-[#8fc4ff]">Изменить</span>
                        </button>
                      )}

                      {selectedLotGroup && detailReturnPage === "mine" && <div className="mt-2 grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => setListingCountrySheetOpen(true)} className="flex min-h-[58px] items-center justify-between gap-2 rounded-xl border border-[#354966] bg-[#202b3a] p-2 text-left transition-colors hover:bg-[#253247] active:scale-[0.99]">
                          <span className="min-w-0"><small className="block text-[9px] font-medium uppercase tracking-wide text-slate-500">Гео</small><b className="mt-1 block truncate text-[11px] text-slate-100">{managedCountries.find(country => country.code === listingCountry)?.label ?? "Весь мир"}</b></span>
                          <ChevronRight className="h-4 w-4 shrink-0 rotate-90 text-[#8fc4ff]" />
                        </button>
                        <button type="button" onClick={() => setListingSubcategorySheetOpen(true)} className="flex min-h-[58px] items-center justify-between gap-2 rounded-xl border border-[#354966] bg-[#202b3a] p-2 text-left transition-colors hover:bg-[#253247] active:scale-[0.99]">
                          <span className="min-w-0"><small className="block text-[9px] font-medium uppercase tracking-wide text-slate-500">Подкатегория</small><b className="mt-1 block truncate text-[11px] text-slate-100">{getManagedTopicLabel(selectedLotGroup.category, listingSubcategory)}</b></span>
                          <ChevronRight className="h-4 w-4 shrink-0 rotate-90 text-[#8fc4ff]" />
                        </button>
                      </div>}

                      {selectedLotGroup && <div className="mt-2 grid grid-cols-2 gap-2">
                        <button type="button" disabled={lotSettingsLocked} onClick={() => setListingAnnouncementEnabled(value => !value)} className={`rounded-xl border p-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${listingAnnouncementEnabled ? "border-[#3b80c4]/55 bg-[#213750]" : "border-[#354966] bg-[#202b3a]"}`}>
                          <b className="block text-[11px] text-slate-100">Объявление</b><small className={`mt-1 block text-[10px] ${listingAnnouncementEnabled ? "text-[#8fc4ff]" : "text-slate-500"}`}>{listingAnnouncementEnabled ? "Бот напишет в группе" : "Выключено"}</small>
                        </button>
                        <button type="button" disabled={lotSettingsLocked} onClick={() => { if (!selectedLotGroup) return; setSelectedManagerTelegramUserId(managerPublic ? selectedLotGroup.managerTelegramUserId ?? null : null); setManagerSheetOpen(true); }} className="rounded-xl border border-[#354966] bg-[#202b3a] p-2 text-left transition-colors hover:bg-[#253247] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-35">
                          <b className="block text-[11px] text-slate-100">Менеджер</b><small className="mt-1 block truncate text-[10px] text-[#8fc4ff]">{managerPublic && selectedLotGroup?.managerName ? selectedLotGroup.managerName : "Анонимно"}</small>
                        </button>
                      </div>}

                      {selectedLotGroup && <div aria-disabled={lotSettingsLocked} className="mt-2 space-y-1 border-t border-white/[0.06] pt-2">
                        <div className="flex items-center justify-between gap-3 rounded-lg px-1 py-1"><span><b className="block text-[11px] text-slate-200">Выставить на продажу</b><small className="block text-[10px] text-slate-500">{isListingForSale ? "Цена видна покупателям" : "Без продажи"}</small></span><button type="button" role="switch" aria-checked={isListingForSale} onClick={() => setIsListingForSale(value => !value)} className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors ${isListingForSale ? "border-[#3390ec] bg-[#3390ec]" : "border-white/15 bg-[#2b3648]"}`}><span className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${isListingForSale ? "translate-x-6" : "translate-x-0"}`} /></button></div>
                        {isListingForSale && <div className="relative"><Input value={salePriceTon} inputMode="decimal" onChange={event => { const value = event.target.value.replace(",", "."); if (/^\d*(\.\d?)?$/.test(value)) setSalePriceTon(value); }} placeholder="Цена продажи" className="h-9 border-[#354966] bg-[#202b3a] pr-12 text-xs" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-slate-500">GRAM</span></div>}
                        <div className="flex items-center justify-between gap-3 rounded-lg px-1 py-1"><span><b className="flex items-center gap-1 text-[11px] text-slate-200"><Star className="h-3.5 w-3.5 fill-[#ffd766] text-[#ffd766]" />Вознаграждения</b><small className="block text-[10px] text-slate-500">{rewardCampaignEnabled ? "Включены" : "Выключены"}</small></span><button type="button" role="switch" aria-checked={rewardCampaignEnabled} onClick={() => setRewardCampaignEnabled(value => !value)} className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors ${rewardCampaignEnabled ? "border-[#3390ec] bg-[#3390ec]" : "border-white/15 bg-[#2b3648]"}`}><span className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${rewardCampaignEnabled ? "translate-x-6" : "translate-x-0"}`} /></button></div>
                        {rewardCampaignEnabled && <div className="grid grid-cols-2 gap-2"><Input value={rewardBudget} inputMode="decimal" onChange={event => setRewardBudget(event.target.value)} placeholder="Бюджет, GRAM" className="h-9 border-[#354966] bg-[#202b3a] text-[11px]" /><Input value={rewardPerSubscription} inputMode="decimal" onChange={event => setRewardPerSubscription(event.target.value)} placeholder="За подписчика" className="h-9 border-[#354966] bg-[#202b3a] text-[11px]" /></div>}
                      </div>}
                    </section>
                  )}
                  {placementSlot && selectedLotGroup && (
                    <section aria-disabled={lotSettingsLocked} className={`mt-3 rounded-xl border border-[#31435f] bg-[#17212b] p-3 ${lotSettingsLocked ? "opacity-35 grayscale" : ""}`}>
                      <div className="flex items-center justify-between">
                        <span><h2 className="text-sm font-bold text-slate-100">{selectedSlot ? "Текущая ставка за лот" : "Ставка для размещения"}</h2><small className="mt-0.5 block text-[10px] text-slate-500">Место #{placementSlot.slotNumber}</small></span>
                        <b className="text-sm text-[#63f5b1]">{formatTon(selectedSlot ? selectedSlot.bidAmount / 1000 : detailMinimumBid ?? 0.1)} GRAM</b>
                      </div>
                      <div className="mt-3 flex h-12 items-center rounded-xl border border-[#354966] bg-[#101a2d] p-1.5">
                        <button type="button" disabled={!selectedLotGroup} onClick={() => setDetailBidInput(formatTon(Math.max(detailMinimumBid ?? 0.1, detailRankingBidAmount - 0.1)))} aria-label="Уменьшить ставку" className="grid h-9 w-12 place-items-center rounded-lg text-slate-300 transition-colors hover:bg-white/[0.07] disabled:opacity-35"><Minus className="h-5 w-5" /></button>
                        <Input value={detailBidInput} disabled={lotSettingsLocked} readOnly={lotSettingsLocked} inputMode="decimal" onChange={event => { const value = event.target.value.replace(",", "."); if (/^\d*(\.\d?)?$/.test(value)) setDetailBidInput(value); }} onBlur={() => setDetailBidInput(formatTon(detailRankingBidAmount))} aria-label="Новая ставка в GRAM" className="h-9 min-w-0 flex-1 rounded-lg border-0 bg-[#17212b] px-1 text-center text-lg font-bold text-white focus-visible:ring-0" />
                        <button type="button" disabled={!selectedLotGroup} onClick={() => setDetailBidInput(formatTon(Math.min(MAX_RANKING_BID_GRAM, detailRankingBidAmount + 0.1)))} aria-label="Увеличить ставку" className="grid h-9 w-12 place-items-center rounded-lg text-[#8fc4ff] transition-colors hover:bg-[#3f8cff]/12 disabled:opacity-35"><Plus className="h-5 w-5" /></button>
                      </div>
                      <div className="mt-2 rounded-xl border border-[#31435f] bg-[#202b3a] px-3 pb-2 pt-1"><Slider disabled={!selectedLotGroup} value={[Math.min(MAX_RANKING_SLIDER_GRAM, detailRankingBidAmount)]} min={detailMinimumBid ?? 0.1} max={Math.max(detailMinimumBid ?? 0.1, MAX_RANKING_SLIDER_GRAM)} step={0.1} onValueChange={([value]) => setDetailBidInput(formatTon(value))} className="py-1.5 [&_[data-slot=slider-track]]:h-2 [&_[data-slot=slider-track]]:bg-[#0f1825] [&_[data-slot=slider-range]]:!bg-[#3390ec] [&_[data-slot=slider-thumb]]:size-5 [&_[data-slot=slider-thumb]]:!border-[#c8e1ff] [&_[data-slot=slider-thumb]]:!bg-[#3390ec]" /><div className="mt-1 flex justify-between text-[9px] font-medium text-slate-500"><span>от {formatTon(detailMinimumBid)} GRAM</span><span>шаг 0.1</span><span>до {formatTon(MAX_RANKING_SLIDER_GRAM)}</span></div></div>
                      {selectedLotGroup && detailRankingPreviewSlotNumber && <div className="mt-2 rounded-xl border border-[#3390ec]/45 bg-[#18314d] p-2.5 text-center"><small className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8fc4ff]">Ваша группа займёт</small><div className="mt-2 grid grid-cols-2 gap-2"><div className="rounded-lg bg-[#17212b] px-2 py-1.5"><small className="block text-[9px] text-slate-400">Общий ТОП</small><b className="text-lg leading-none text-white">#{detailRankingPreviewSlotNumber}</b></div><div className="rounded-lg bg-[#17212b] px-2 py-1.5"><small className="block text-[9px] text-slate-400">ТОП {selectedLotGroup.category === "Каналы" ? "каналов" : "чатов"}</small><b className="text-lg leading-none text-[#63f5b1]">#{detailTypeRankingPreviewPosition ?? "—"}</b></div></div></div>}
                      <p className={`mt-2 text-center text-[10px] ${detailWillDrop ? "font-medium text-rose-300" : "text-slate-500"}`}>{detailWillDrop ? `Ваша цена ниже текущей ставки. Лот переместится на место #${detailRankingPreviewSlotNumber}` : ownsDetail ? `Минимальная ставка: ${formatTon(detailMinimumBid)} GRAM` : `Перебить можно от ${formatTon(detailMinimumBid)} GRAM`}</p>
                      <div className="mt-2 rounded-xl border border-[#63f5b1]/30 bg-[#16342f] px-3 py-2"><div className="flex items-center justify-between gap-3"><span className="text-[10px] font-medium text-[#b6e8d1]">Итого размещение</span><b className="text-sm text-[#63f5b1]">{detailPlacementTotalUnits === undefined ? "Укажите бюджет" : `${formatGram(detailPlacementTotalUnits)} GRAM`}</b></div>{detailPlacementTotalUnits !== undefined && detailBalanceChangeUnits !== undefined && <small className="mt-1 block text-[9px] text-[#8fcbb0]">Ставка {formatTon(detailRankingBidAmount)}{rewardCampaignEnabled ? ` + бюджет вознаграждений ${formatGram(detailRewardBudgetUnits)} GRAM` : " · вознаграждения выключены"}. {detailBalanceChangeUnits >= 0 ? `Сейчас спишется ${formatGram(detailBalanceChangeUnits)} GRAM` : `Вернётся ${formatGram(Math.abs(detailBalanceChangeUnits))} GRAM`}</small>}</div>
                      <button type="button" onClick={() => { if (!selectedLotGroup) return setLotGroupPickerOpen(true); const value = normalizeRankingBid(detailRankingBidAmount); const minimum = detailMinimumBid ?? 0.1; const normalizedSalePrice = getSalePriceForSave(); if (normalizedSalePrice === undefined) return; if (value === undefined || value < minimum) return toast.error(`Минимальная ставка: ${formatTon(minimum)} GRAM с шагом 0.1`); const detailRewardPerSubscriptionUnits = rewardCampaignEnabled ? parseGramInput(rewardPerSubscription) : 0; if (rewardCampaignEnabled && (detailRewardBudgetUnits === undefined || detailRewardPerSubscriptionUnits === undefined)) return toast.error("Укажите бюджет и награду за подписчика"); placeBid.mutate({ slotId: placementSlot.id, groupId: selectedLotGroup.id, bidAmount: value, currentBid: `${formatTon(value)} GRAM`, anonymousListing: detailVisibility === "anonymous", managerPublic, listingAnnouncementEnabled, country: listingCountry === "Global" ? undefined : listingCountry, city: listingCity === "Все" ? undefined : listingCity, subcategory: listingSubcategory, salePriceTon: normalizedSalePrice, rewardActive: rewardCampaignEnabled, rewardBudget: detailRewardBudgetUnits, rewardPerSubscription: detailRewardPerSubscriptionUnits, rewardPerManualAdd: selectedLotGroup.category === "Чаты" ? detailRewardPerSubscriptionUnits : 0 }); }} disabled={Boolean(selectedLotGroup && (!detailRankingPreviewSlotNumber || placeBid.isPending)) || (!ownsDetail && !isAuthenticated)} className="mt-2 flex w-full items-center justify-center rounded-lg bg-[#3390ec] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4199ee] active:scale-[0.985] disabled:opacity-45"><span>{placeBid.isPending ? "Оплата…" : !selectedLotGroup ? "Выбрать свою группу" : !selectedSlot ? "Вывести в ТОП" : ownsDetail ? "Обновить ставку" : "Перебить ставку"}</span></button>
                    </section>
                  )}
                </div>
                <NftShowcase nfts={detail.ownerNfts} language={language} title={tx("NFT-витрина площадки", "Community NFT showcase")} />
              </>
            ) : (
              <p className="py-16 text-center text-sm text-slate-500">
                {tx("Загружаем статистику…", "Loading statistics…")}
              </p>
            )}
          </section>
  );
}
