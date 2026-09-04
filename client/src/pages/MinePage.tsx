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

type MinePageProps = Pick<HomeController, "user" | "setPage" | "walletConnectionRestored" | "safeWalletAddress" | "openTonWalletForCurrentUser" | "disconnectTonWallet" | "category" | "workspaceSection" | "setWorkspaceSection" | "walletNftFilter" | "setWalletNftFilter" | "selectedGroupIds" | "setSelectedGroupIds" | "myGroupsSelectionMode" | "setMyGroupsSelectionMode" | "targetSlot" | "language" | "myGroupsSelectionHoldTriggered" | "ui" | "tx" | "walletNftsQuery" | "walletNfts" | "visibleWalletNfts" | "mine" | "myGroupsViewMode" | "setMyGroupsViewMode" | "myGroupsStatusFilter" | "setMyGroupsStatusFilter" | "myGroupsSearchQuery" | "setMyGroupsSearchQuery" | "setMyGroupsAddOpen" | "setMyGroupsDragActiveId" | "myGroupsSensors" | "myBotListings" | "botTelegramLinkDraft" | "setBotTelegramLinkDraft" | "submitBotListing" | "unlistGroups" | "deleteGroups" | "saveMyGroupsLayoutMutation" | "mainTon" | "orderedMyGroups" | "visiblePinnedMyGroups" | "visibleUnpinnedMyGroups" | "visibleMyGroups" | "isMyGroupsSearchActive" | "visibleMyGroupsMembers" | "myGroupsDragActiveGroup" | "botTopicOptions" | "openGroup" | "getTargetSlotAddress" | "toggleGroupSelection" | "selectMyGroup" | "exitMyGroupsSelection" | "beginMyGroupsSelectionHold" | "endMyGroupsSelectionHold" | "openListing" | "openGiveawayCreate" | "removeSelectedFromListing" | "deleteSelectedGroups" | "toggleMyGroupPin" | "handleMyGroupsDragEnd" | "openStarsPayment">;

export function MinePage(props: MinePageProps) {
  const {
    user,
    setPage,
    walletConnectionRestored,
    safeWalletAddress,
    openTonWalletForCurrentUser,
    disconnectTonWallet,
    category,
    workspaceSection,
    setWorkspaceSection,
    walletNftFilter,
    setWalletNftFilter,
    selectedGroupIds,
    setSelectedGroupIds,
    myGroupsSelectionMode,
    setMyGroupsSelectionMode,
    targetSlot,
    language,
    myGroupsSelectionHoldTriggered,
    ui,
    tx,
    walletNftsQuery,
    walletNfts,
    visibleWalletNfts,
    mine,
    myGroupsViewMode,
    setMyGroupsViewMode,
    myGroupsStatusFilter,
    setMyGroupsStatusFilter,
    myGroupsSearchQuery,
    setMyGroupsSearchQuery,
    setMyGroupsAddOpen,
    setMyGroupsDragActiveId,
    myGroupsSensors,
    myBotListings,
    botTelegramLinkDraft,
    setBotTelegramLinkDraft,
    submitBotListing,
    unlistGroups,
    deleteGroups,
    saveMyGroupsLayoutMutation,
    mainTon,
    orderedMyGroups,
    visiblePinnedMyGroups,
    visibleUnpinnedMyGroups,
    visibleMyGroups,
    isMyGroupsSearchActive,
    visibleMyGroupsMembers,
    myGroupsDragActiveGroup,
    botTopicOptions,
    openGroup,
    getTargetSlotAddress,
    toggleGroupSelection,
    selectMyGroup,
    exitMyGroupsSelection,
    beginMyGroupsSelectionHold,
    endMyGroupsSelectionHold,
    openListing,
    openGiveawayCreate,
    removeSelectedFromListing,
    deleteSelectedGroups,
    toggleMyGroupPin,
    handleMyGroupsDragEnd,
    openStarsPayment,
  } = props;
  return (
          <section className={`space-y-4 ${myGroupsSelectionMode ? "pb-[12rem]" : ""}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-sm font-semibold text-slate-300">Рабочее пространство</h1>
                <p className="mt-0.5 text-xs text-slate-500">
                  {tx("Подключите бота, чтобы получить статистику и разместить площадку.", "Add the bot as an administrator to get analytics and list your community.")}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 overflow-hidden rounded-xl border border-white/8 bg-black/15 p-0.5">
              {([
                ["communities", tx("Сообщества", "Communities"), Users],
                ["bots", tx("Боты", "Bots"), Bot],
                ["nft", "NFT", Gift],
              ] as const).map(([value, label, Icon]) => {
                const active = workspaceSection === value;
                return <button key={value} type="button" onClick={() => { setWorkspaceSection(value); if (value !== "communities") exitMyGroupsSelection(); }} className={`flex h-8 min-w-0 items-center justify-center gap-1 rounded-lg px-1 text-[10px] font-medium transition-colors ${active ? "bg-[#3f8cff]/14 text-[#c8ddff]" : "text-slate-500 hover:text-slate-200"}`}><Icon className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{label}</span></button>;
              })}
            </div>
            {workspaceSection === "communities" && <>
            {targetSlot && (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-[#3f8cff]/25 bg-[#3f8cff]/8 px-3 py-2.5">
                <span>
                  <b className="block text-xs text-slate-100">{tx(`Выберите группу для места #${targetSlot.slotNumber}`, `Choose a group for placement #${targetSlot.slotNumber}`)}</b>
                  <small className="mt-0.5 block text-[11px] text-slate-400">
                    {getTargetSlotAddress(targetSlot)}
                  </small>
                  <small className="mt-0.5 block text-[10px] text-slate-500">
                    {tx(`Минимальная цена: ${formatTon(getMinimumRankingBidGram(targetSlot))} GRAM`, `Minimum price: ${formatTon(getMinimumRankingBidGram(targetSlot))} GRAM`)}
                  </small>
                </span>
                <button
                  onClick={() => setPage("top")}
                  className="shrink-0 text-[11px] font-medium text-[#a6c8ff]"
                >
                  {tx("К топу", "View top")}
                </button>
              </div>
            )}
            {!targetSlot && mine.length > 0 && (
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input
                  value={myGroupsSearchQuery}
                  onChange={event => setMyGroupsSearchQuery(event.target.value)}
                  aria-label={tx("Поиск в моих группах", "Search my groups")}
                  placeholder={tx("Поиск по названию или @username", "Search by name or @username")}
                  className="h-12 rounded-xl border-0 bg-[#1b2836] pl-10 pr-3 text-sm text-slate-100 placeholder:text-slate-500 shadow-none"
                />
              </div>
            )}
            <button type="button" onClick={() => setMyGroupsAddOpen(true)} className="flex h-14 w-full items-center gap-3 rounded-xl border-0 bg-[#1b2836] px-4 text-left transition-colors hover:bg-[#223447] active:scale-[0.99]">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#3f8cff]/15 text-[#72b2ff]"><Plus className="h-5 w-5" /></span>
              <span><b className="block text-sm font-semibold text-[#72b2ff]">{tx("Добавить группу или канал", "Add group or channel")}</b><small className="mt-0.5 block text-[10px] text-slate-500">{tx("Подключить @TG_TOPBOT администратором", "Connect @TG_TOPBOT as administrator")}</small></span>
              <ChevronRight className="ml-auto h-4 w-4 text-slate-600" />
            </button>
            {!targetSlot && mine.length > 0 && (
              <div className="flex items-center justify-between gap-2 rounded-xl bg-[#1b2836] p-1">
                <div className="flex min-w-0 items-center gap-1">
                  <button type="button" onClick={() => { setMyGroupsViewMode("list"); exitMyGroupsSelection(); }} aria-label={tx("Показать список", "Show list")} aria-pressed={myGroupsViewMode === "list"} className={`grid h-9 w-10 place-items-center rounded-lg transition-colors ${myGroupsViewMode === "list" ? "bg-white/10 text-[#8fc1ff]" : "text-slate-500 hover:text-slate-200"}`}><List className="h-4 w-4" /></button>
                  <button type="button" onClick={() => { setMyGroupsViewMode("grid"); exitMyGroupsSelection(); }} aria-label={tx("Показать сетку", "Show grid")} aria-pressed={myGroupsViewMode === "grid"} className={`grid h-9 w-10 place-items-center rounded-lg transition-colors ${myGroupsViewMode === "grid" ? "bg-white/10 text-[#8fc1ff]" : "text-slate-500 hover:text-slate-200"}`}><LayoutGrid className="h-4 w-4" /></button>
                  <button type="button" onClick={() => myGroupsSelectionMode ? exitMyGroupsSelection() : setMyGroupsSelectionMode(true)} aria-label={tx("Выбрать группы", "Select groups")} className={`grid h-9 w-10 place-items-center rounded-lg transition-colors ${myGroupsSelectionMode ? "bg-[#3f8cff]/16 text-[#8fc1ff]" : "text-slate-500 hover:text-slate-200"}`}><Check className="h-4 w-4" /></button>
                </div>
                <div className="flex items-center gap-1.5 px-2 text-[10px] text-slate-500"><span>{n(visibleMyGroups.length, language)}</span><span>•</span><span>{tx("групп", "groups")}</span></div>
              </div>
            )}
            {!targetSlot && mine.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 px-0.5">
                {([
                  ["all", tx("Все", "All")],
                  ["listed", tx("В каталоге", "In catalog")],
                  ["unlisted", tx("Не в листинге", "Unlisted")],
                ] as const).map(([value, label]) => (
                  <button key={value} type="button" onClick={() => setMyGroupsStatusFilter(value)} className={`inline-flex h-6 items-center rounded-full border px-2.5 text-[9px] font-medium transition-colors ${myGroupsStatusFilter === value ? "border-[#3f8cff]/45 bg-[#3f8cff]/12 text-[#b8d1ff]" : "border-white/10 bg-white/[0.025] text-slate-500 hover:border-white/20 hover:text-slate-200"}`}>{label}</button>
                ))}
              </div>
            )}
            {!targetSlot && mine.length > 0 && (
              <div className="flex items-center justify-between px-1 text-[10px] text-slate-500">
                <span>{n(visibleMyGroups.length, language)} {tx("групп", "groups")}</span>
                <span className="flex items-center gap-1"><Users className="h-3 w-3 text-slate-600" />{n(visibleMyGroupsMembers, language)} {tx("подписчиков", "subscribers")}</span>
              </div>
            )}
            {!targetSlot && myGroupsSelectionMode && (
              <div className="fixed inset-x-3 bottom-[calc(6.75rem+env(safe-area-inset-bottom))] z-50 mx-auto max-w-md rounded-2xl border border-[#3f8cff]/30 bg-[#101a2a]/95 p-2 shadow-2xl shadow-black/35 backdrop-blur-xl">
                <div className="flex items-center justify-between gap-2 px-1 pb-2">
                  <span className="flex items-center gap-2 text-[11px] font-medium text-slate-300">
                    <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[#3f8cff] px-1 text-[10px] font-bold text-white">{selectedGroupIds.length}</span>
                    {tx("выбрано", "selected")}
                  </span>
                  <span className="flex items-center gap-1">
                    <button onClick={() => setSelectedGroupIds([])} disabled={!selectedGroupIds.length} className="rounded-lg px-2 py-1 text-[10px] font-medium text-slate-400 transition-colors hover:bg-white/8 hover:text-white disabled:opacity-40">{tx("Снять выделение", "Clear selection")}</button>
                    <button onClick={exitMyGroupsSelection} className="rounded-lg px-2 py-1 text-[11px] font-medium text-slate-300 transition-colors hover:bg-white/8 hover:text-white">{tx("Отменить", "Cancel")}</button>
                  </span>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => openListing(selectedGroupIds)} disabled={!selectedGroupIds.length}
                    className="h-10 min-w-0 flex-1 rounded-xl bg-[#3f8cff] px-3 text-[11px] font-semibold text-white shadow-[0_6px_18px_rgba(63,140,255,0.24)] transition-colors hover:bg-[#4b97ff] disabled:opacity-45"
                  >
                    {ui.listing}
                  </button>
                  <button
                    onClick={removeSelectedFromListing}
                    disabled={unlistGroups.isPending || !selectedGroupIds.length}
                    className="h-10 shrink-0 rounded-xl border border-white/10 bg-white/[0.035] px-3 text-[11px] font-medium text-slate-200 transition-colors hover:bg-white/[0.08] disabled:opacity-45"
                  >
                    {tx("Снять с каталога", "Remove from catalog")}
                  </button>
                  <button
                    onClick={deleteSelectedGroups}
                    disabled={deleteGroups.isPending || !selectedGroupIds.length}
                    aria-label={tx("Удалить выбранные группы", "Delete selected communities")}
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-red-400/20 bg-red-500/[0.08] text-red-200 transition-colors hover:bg-red-500/[0.14] disabled:opacity-45"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
            {myGroupsViewMode === "grid" && !targetSlot && !isMyGroupsSearchActive ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] text-slate-400">{myGroupsSelectionMode ? tx("Выберите нужные группы", "Select the communities you need") : tx("Тяните за ручку, чтобы менять порядок", "Drag the grip to reorder")}</span>
                  <span className="text-[10px] text-slate-600">{saveMyGroupsLayoutMutation.isPending ? ui.loading : tx("Сохранено", "Saved")}</span>
                </div>
                <DndContext
                  sensors={myGroupsSensors}
                  collisionDetection={closestCenter}
                  onDragStart={({ active }: DragStartEvent) => setMyGroupsDragActiveId(Number(active.id))}
                  onDragCancel={() => setMyGroupsDragActiveId(null)}
                  onDragEnd={event => { handleMyGroupsDragEnd(event); setMyGroupsDragActiveId(null); }}
                >
                  {visiblePinnedMyGroups.length > 0 && (
                    <section className="space-y-2">
                      <div className="flex items-center gap-1.5 px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#72a8ff]"><Pin className="h-3 w-3" />{tx("Закреплено", "Pinned")}</div>
                      <SortableContext items={visiblePinnedMyGroups.map(group => group.id)} strategy={rectSortingStrategy}>
                        <div className="grid grid-cols-3 gap-2">
                          {visiblePinnedMyGroups.map(group => <SortableMyGroupTile key={group.id} group={group} language={language} accessLabel={getCommunityAccessLabel(group, language)} disabled={saveMyGroupsLayoutMutation.isPending} onOpen={() => openGroup(group.id)} onTogglePin={() => toggleMyGroupPin(group.id)} onCreateGiveaway={() => openGiveawayCreate(group)} selectionMode={myGroupsSelectionMode} selected={selectedGroupIds.includes(group.id)} onSelect={() => myGroupsSelectionMode ? toggleGroupSelection(group.id) : selectMyGroup(group.id)} />)}
                        </div>
                      </SortableContext>
                    </section>
                  )}
                  <section className="space-y-2">
                    {visiblePinnedMyGroups.length > 0 && <div className="px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{tx("Остальные", "Others")}</div>}
                    <SortableContext items={visibleUnpinnedMyGroups.map(group => group.id)} strategy={rectSortingStrategy}>
                      <div className="grid grid-cols-3 gap-2">
                        {visibleUnpinnedMyGroups.map(group => <SortableMyGroupTile key={group.id} group={group} language={language} accessLabel={getCommunityAccessLabel(group, language)} disabled={saveMyGroupsLayoutMutation.isPending} onOpen={() => openGroup(group.id)} onTogglePin={() => toggleMyGroupPin(group.id)} onCreateGiveaway={() => openGiveawayCreate(group)} selectionMode={myGroupsSelectionMode} selected={selectedGroupIds.includes(group.id)} onSelect={() => myGroupsSelectionMode ? toggleGroupSelection(group.id) : selectMyGroup(group.id)} />)}
                        {!myGroupsSelectionMode && Array.from({ length: Math.max(1, 3 - (visibleUnpinnedMyGroups.length % 3)) }).map((_, index) => (
                          <button key={`add-group-${index}`} type="button" onClick={() => setMyGroupsAddOpen(true)} className="aspect-square rounded-xl border border-dashed border-[#3f8cff]/28 bg-[#3f8cff]/[0.035] p-2 text-center text-[#8fb9ff] transition-colors hover:bg-[#3f8cff]/10 active:scale-[0.98]">
                            <Plus className="mx-auto h-4 w-4" />
                            <span className="mt-1 block text-[9px] font-medium leading-3">{tx("Добавить", "Add")}</span>
                          </button>
                        ))}
                      </div>
                    </SortableContext>
                  </section>
                  <DragOverlay dropAnimation={{ duration: 190, easing: "cubic-bezier(0.23, 1, 0.32, 1)" }}>
                    {myGroupsDragActiveGroup ? (
                      <article className="aspect-square w-[calc((100vw-48px)/3)] max-w-[142px] rounded-xl border border-[#72a8ff]/70 bg-[#182334] p-2.5 shadow-2xl shadow-black/45 ring-2 ring-[#3f8cff]/30">
                        <span className="mx-auto block h-11 w-11 overflow-hidden rounded-xl"><Avatar group={myGroupsDragActiveGroup} /></span>
                        <b className="mt-2 line-clamp-2 block text-center text-[10px] leading-3 text-white">{myGroupsDragActiveGroup.title}</b>
                        <small className="mt-1 block truncate text-center text-[9px] text-[#a6c8ff]">{tx("Перемещение", "Moving")}</small>
                      </article>
                    ) : null}
                  </DragOverlay>
                </DndContext>
                {visibleMyGroups.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center">
                    <FolderPlus className="mx-auto h-7 w-7 text-slate-600" />
                    <p className="mt-3 text-sm">{mine.length ? tx("По этому фильтру групп нет", "No groups match this filter") : tx("Групп пока нет", "No groups yet")}</p>
                    <p className="mt-1 text-xs text-slate-500">{mine.length ? tx("Смените фильтр или добавьте новую группу.", "Change the filter or add a new community.") : tx("Добавьте @TG_TOPBOT в администраторы.", "Add @TG_TOPBOT as an administrator.")}</p>
                  </div>
                )}
              </div>
            ) : (
            <div className="space-y-2">
              {isMyGroupsSearchActive && !targetSlot && <p className="px-1 text-[10px] font-medium text-[#8fb9ff]">{tx("Результаты поиска", "Search results")}</p>}
              {(targetSlot ? orderedMyGroups : visibleMyGroups).map(group => (
                <div
                  key={group.id}
                  className="relative overflow-hidden rounded-xl border border-white/8 bg-[#111720] p-2 h-[64px]"
                >
                  <div className="flex items-center gap-2">
                    {!targetSlot && myGroupsSelectionMode && <button
                      onClick={() => toggleGroupSelection(group.id)}
                      aria-label={tx(`Выбрать ${group.title}`, `Select ${group.title}`)}
                      aria-pressed={selectedGroupIds.includes(group.id)}
                      className={`absolute right-3 top-1/2 z-10 grid h-5 w-5 -translate-y-1/2 place-items-center rounded-md border ${selectedGroupIds.includes(group.id) ? "border-[#3f8cff] bg-[#3f8cff] text-white" : "border-white/20 bg-[#111720]/85 text-transparent"}`}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>}
                    <button
                      onPointerDown={() => beginMyGroupsSelectionHold(group.id)}
                      onPointerUp={endMyGroupsSelectionHold}
                      onPointerCancel={endMyGroupsSelectionHold}
                      onPointerLeave={endMyGroupsSelectionHold}
                      onClick={() => {
                        endMyGroupsSelectionHold();
                        if (myGroupsSelectionHoldTriggered.current) {
                          myGroupsSelectionHoldTriggered.current = false;
                          return;
                        }
                        if (myGroupsSelectionMode) toggleGroupSelection(group.id);
                        else if (targetSlot) openStarsPayment(group);
                        else openGroup(group.id);
                      }}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <Avatar group={group} />
                      <span className="min-w-0 flex-1">
                        <b className="block truncate text-sm">{group.title}</b>
                        <small className="mt-1 block truncate text-xs text-slate-500">
                          {getCommunityAccessLabel(group, language)} · {n(group.membersCount)} {tx("участников", "members")}
                        </small>
                      </span>
                      {group.status === "listed" && <span
                        className={`shrink-0 rounded-full border px-2 py-1 text-[9px] font-medium leading-none backdrop-blur-sm ${
                          group.status === "listed" && group.listingType === "sale"
                            ? "border-emerald-200/15 bg-emerald-500/15 text-emerald-100"
                            : group.status === "listed"
                              ? "border-blue-200/15 bg-[#3f8cff]/15 text-blue-100"
                              : ""
                        }`}
                      >
                        {group.status === "listed" && group.listingType === "sale"
                          ? tx("На продаже", "For sale")
                          : tx("В каталоге", "In catalog")}
                      </span>}
                      <ChevronRight className={`h-4 w-4 text-slate-600 ${myGroupsSelectionMode ? "opacity-0" : ""}`} />
                    </button>
                  </div>
                </div>
              ))}
              {mine.length === 0 && (
                <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center">
                  <FolderPlus className="mx-auto h-7 w-7 text-slate-600" />
                  <p className="mt-3 text-sm">{tx("Групп пока нет", "No groups yet")}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {tx("Добавьте @TG_TOPBOT в администраторы.", "Add @TG_TOPBOT as an administrator.")}
                  </p>
                </div>
              )}
            </div>
            )}
            </>}
            {workspaceSection === "bots" && (
              <section className="space-y-3">
                <article className="rounded-2xl border border-[#3f8cff]/20 bg-[#3f8cff]/[0.055] p-3.5">
                  <div className="flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#72a8ff]/25 bg-[#3f8cff]/10 text-[#a6c8ff]"><Bot className="h-5 w-5" /></span>
                    <span className="min-w-0 flex-1"><b className="block text-sm text-slate-100">{tx("Залистить бота", "List a bot")}</b><small className="mt-1 block text-[11px] leading-4 text-slate-400">{tx("Вставьте публичную ссылку на бота. До ручной проверки модератором он не появится в каталоге.", "Paste a public bot link. It will not appear in the catalog until a moderator reviews it.")}</small></span>
                  </div>
                  <div className="mt-3 flex gap-2"><Input value={botTelegramLinkDraft} onChange={event => setBotTelegramLinkDraft(event.target.value)} placeholder="https://t.me/username" className="h-10 min-w-0 flex-1 border-white/10 bg-[#111720] px-3 text-xs text-slate-100 placeholder:text-slate-600" /><button type="button" onClick={() => submitBotListing.mutate({ telegramLink: botTelegramLinkDraft })} disabled={botTelegramLinkDraft.trim().length < 3 || submitBotListing.isPending} className="h-10 shrink-0 rounded-lg border border-[#72a8ff]/30 bg-[#3f8cff]/10 px-3 text-[10px] font-semibold text-[#c8ddff] disabled:opacity-45">{submitBotListing.isPending ? tx("Отправляем…", "Sending…") : tx("На проверку", "Submit")}</button></div>
                </article>
                {myBotListings.length ? <section className="space-y-2">{myBotListings.map(bot => {
                  const status = bot.moderationStatus === "approved" ? tx("Одобрен", "Approved") : bot.moderationStatus === "rejected" ? tx("Отклонён", "Rejected") : tx("На проверке", "Pending review");
                  const statusStyle = bot.moderationStatus === "approved" ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-100" : bot.moderationStatus === "rejected" ? "border-rose-300/25 bg-rose-400/10 text-rose-100" : "border-amber-300/25 bg-amber-300/10 text-amber-100";
                  return <article key={bot.id} className="rounded-xl border border-white/8 bg-[#111720] px-3 py-2.5"><div className="flex items-center gap-2"><Bot className="h-4 w-4 shrink-0 text-[#8fb9ff]" /><button type="button" onClick={() => openTelegramInNewBrowserTab(bot.telegramLink)} className="min-w-0 flex-1 text-left"><b className="block truncate text-xs text-slate-100">@{bot.username}</b><small className="mt-0.5 block text-[10px] text-slate-500">{bot.category === "General" ? tx("Рубрика назначается модератором", "Category assigned by moderator") : botTopicOptions.find(topic => topic.code === bot.category)?.label ?? bot.category}</small></button><span className={`shrink-0 rounded-md border px-2 py-1 text-[9px] font-semibold ${statusStyle}`}>{status}</span></div>{bot.moderationStatus === "rejected" && bot.moderationReason && <p className="mt-2 border-t border-white/7 pt-2 text-[10px] leading-4 text-rose-200/90">{tx("Причина: ", "Reason: ")}{bot.moderationReason}</p>}</article>;
                })}</section> : <p className="px-1 text-center text-xs text-slate-500">{tx("Здесь появятся ваши заявки на ботов.", "Your bot submissions will appear here.")}</p>}
              </section>
            )}
            {workspaceSection === "nft" && (
              <section className="space-y-3">
                <div className="rounded-2xl border border-white/9 bg-[#111720] p-3">
                  <div className="flex items-start justify-between gap-3"><span><b className="block text-sm text-slate-100">{tx("NFT кошелька", "Wallet NFTs")}</b><small className="mt-1 block text-[10px] leading-4 text-slate-500">{tx("Показываем только активы, которые сеть GRAM связывает с подключённым адресом.", "Only assets associated by the GRAM network with the connected address are shown.")}</small></span><PackageOpen className="h-4 w-4 shrink-0 text-[#8fb9ff]" /></div>
                  <WalletConnectControl language={language} balanceTon={formatTon(Number(mainTon))} variant="profile" ownerOpenId={user?.openId} address={safeWalletAddress} restored={walletConnectionRestored} onDisconnect={disconnectTonWallet} />
                </div>
                {!walletConnectionRestored ? (
                  <div className="rounded-xl border border-white/8 bg-white/[0.025] p-5 text-center text-xs text-slate-500">{tx("Проверяем подключение кошелька…", "Checking wallet connection…")}</div>
                ) : !safeWalletAddress ? (
                  <div className="rounded-xl border border-dashed border-[#3f8cff]/28 bg-[#3f8cff]/[0.035] p-6 text-center"><Gift className="mx-auto h-6 w-6 text-[#8fb9ff]" /><b className="mt-3 block text-sm text-slate-200">{tx("Подключите GRAM-кошелёк", "Connect a GRAM wallet")}</b><p className="mx-auto mt-1 max-w-xs text-[11px] leading-5 text-slate-500">{tx("После подключения покажем NFT этого адреса. Подпись, перевод и продажа не запрашиваются.", "After connection, we will show NFTs of this address. No signature, transfer or sale is requested.")}</p><button type="button" onClick={openTonWalletForCurrentUser} className="mt-3 rounded-lg bg-[#1688f5] px-3 py-2 text-[11px] font-semibold text-white">{tx("Подключить кошелёк", "Connect wallet")}</button></div>
                ) : walletNftsQuery.isPending ? (
                  <div className="grid grid-cols-2 gap-2">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="aspect-[.8] animate-pulse rounded-xl border border-white/7 bg-white/[0.035]" />)}</div>
                ) : walletNftsQuery.isError ? (
                  <div className="rounded-xl border border-rose-300/15 bg-rose-500/[0.06] p-4 text-center"><b className="block text-xs text-rose-100">{tx("NFT пока не загрузились", "NFTs could not be loaded")}</b><p className="mt-1 text-[11px] leading-5 text-rose-100/60">{walletNftsQuery.error.message}</p><button type="button" onClick={() => void walletNftsQuery.refetch()} className="mt-2 text-[11px] font-semibold text-rose-100 underline underline-offset-4">{tx("Повторить", "Retry")}</button></div>
                ) : <>
                  <div className="flex gap-1 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
                    {([
                      ["all", tx("Все", "All")],
                      ["gifts", tx("Подарки", "Gifts")],
                      ["usernames", tx("Юзернеймы", "Usernames")],
                      ["anonymous_numbers", tx("Номера", "Numbers")],
                      ["domains", tx("Домены", "Domains")],
                      ["other", tx("Другие", "Other")],
                    ] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setWalletNftFilter(value)} className={`h-7 shrink-0 rounded-full border px-2.5 text-[9px] font-medium ${walletNftFilter === value ? "border-[#3f8cff]/45 bg-[#3f8cff]/12 text-[#c8ddff]" : "border-white/10 bg-white/[0.025] text-slate-500"}`}>{label}</button>)}
                  </div>
                  <div className="flex items-center justify-between px-0.5 text-[10px] text-slate-500"><span>{visibleWalletNfts.length} {tx("NFT", "NFTs")}</span><span className="font-mono">{safeWalletAddress.slice(0, 5)}…{safeWalletAddress.slice(-4)}</span></div>
                  {visibleWalletNfts.length ? <div className="grid grid-cols-2 gap-2">{visibleWalletNfts.map(item => <WalletNftCard key={item.address} item={item} language={language} />)}</div> : <div className="rounded-xl border border-dashed border-white/12 p-6 text-center"><Hash className="mx-auto h-5 w-5 text-slate-600" /><b className="mt-2 block text-xs text-slate-300">{walletNfts.length ? tx("В этой категории пока нет NFT", "No NFTs in this category") : tx("NFT в кошельке не найдено", "No NFTs found in this wallet")}</b><small className="mt-1 block text-[10px] leading-4 text-slate-500">{walletNfts.length ? tx("Выберите другую категорию.", "Choose a different category.") : tx("Сеть GRAM не вернула NFT для подключённого адреса.", "The GRAM network returned no NFTs for the connected address.")}</small></div>}
                </>}
              </section>
            )}
          </section>
  );
}
