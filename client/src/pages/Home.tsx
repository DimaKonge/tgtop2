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

import { TopPage } from "./TopPage";
import { CatalogPage } from "./CatalogPage";
import { GiveawaysPage } from "./GiveawaysPage";
import { MinePage } from "./MinePage";
import { DetailsPage } from "./DetailsPage";
import { OwnerPage } from "./OwnerPage";
import { AdminPage } from "./AdminPage";
import { ProfilePage } from "./ProfilePage";
import { useHomeController } from "./useHomeController";

export default function Home({ onReady }: { onReady?: () => void }) {
  const ctx = useHomeController({ onReady });
  const {
    user,
    isAuthenticated,
    page,
    setPage,
    category,
    setCategory,
    globalDirection,
    setGlobalDirection,
    subcategory,
    setSubcategory,
    country,
    setCountry,
    city,
    setCity,
    audience,
    setAudience,
    filtersOpen,
    setFiltersOpen,
    selectedGroupId,
    selectedGroupIds,
    pendingGroupDeletion,
    setPendingGroupDeletion,
    targetSlot,
    setTargetSlot,
    amount,
    setAmount,
    listingRankingBid,
    setListingRankingBid,
    outbidOpen,
    setOutbidOpen,
    outbidGroupId,
    setOutbidGroupId,
    outbidBidInput,
    setOutbidBidInput,
    outbidVisibility,
    setOutbidVisibility,
    setPaymentMethod,
    settingsOpen,
    setSettingsOpen,
    adminGuideKind,
    setAdminGuideKind,
    language,
    starsPaymentGroup,
    setStarsPaymentGroup,
    lotGroupPickerOpen,
    setLotGroupPickerOpen,
    lotGroupId,
    setLotGroupId,
    topListingPickerOpen,
    setTopListingPickerOpen,
    topListingGroupIds,
    listingOpen,
    setListingOpen,
    managerSheetOpen,
    setManagerSheetOpen,
    listingCountrySheetOpen,
    setListingCountrySheetOpen,
    listingSubcategorySheetOpen,
    setListingSubcategorySheetOpen,
    selectedManagerTelegramUserId,
    setSelectedManagerTelegramUserId,
    listingCountry,
    setListingCountry,
    listingCity,
    setListingCity,
    listingSubcategory,
    setListingSubcategory,
    salePriceTon,
    setSalePriceTon,
    isListingForSale,
    setIsListingForSale,
    showOwnerContact,
    managerPublic,
    setManagerPublic,
    listingAnnouncementEnabled,
    setListingAnnouncementEnabled,
    monthlyEntryEnabled,
    setMonthlyEntryEnabled,
    monthlyEntryStars,
    setMonthlyEntryStars,
    monthlyEntryLinkName,
    setMonthlyEntryLinkName,
    rewardCampaignEnabled,
    setRewardCampaignEnabled,
    rewardBudget,
    setRewardBudget,
    rewardPerSubscription,
    setRewardPerSubscription,
    nftTransferOpen,
    setNftTransferOpen,
    nftTransferStep,
    setNftTransferStep,
    selectedNftId,
    setSelectedNftId,
    recipientInput,
    setRecipientInput,
    preparedNftTransfer,
    setPreparedNftTransfer,
    setShowcaseNftId,
    ui,
    tx,
    giveaways,
    myNftsQuery,
    myNfts,
    nftRecipientQuery,
    mineQuery,
    mine,
    myGroupsAddOpen,
    setMyGroupsAddOpen,
    moderationAccess,
    groupAdministratorsQuery,
    setGroupManager,
    listWithCredits,
    createMonthlyEntryLink,
    createPrivateEntryLink,
    unlistGroups,
    placeBid,
    setNftShowcase,
    prepareNftTransferMutation,
    totalBalanceLabel,
    displayUserAvatar,
    placementSlot,
    outbidCandidates,
    lotGroupPickerCandidates,
    lotGroupCandidates,
    selectedLotGroup,
    selectedOutbidGroup,
    outbidMinimum,
    outbidBidAmount,
    selectedListingGroups,
    privateEntryEligibleGroup,
    managedCountries,
    managedCities,
    managedTopics,
    getManagedTopicLabel,
    listingCategory,
    listingSubcategoryOptions,
    monthlyEntryEligibleGroup,
    selectedListingGroup,
    listingRankingBidAmount,
    listingRankingPreviewSlotNumber,
    listingRankingPreviewSlot,
    listingRankingMinimum,
    canPayListingRanking,
    listingRankingScope,
    selectedNft,
    showcaseNft,
    reviewedRecipient,
    openMine,
    toggleTopListingGroup,
    continueTopListingPicker,
    getTargetSlotAddress,
    applyLotGroupSettings,
    saveListing,
    copyPrivateEntryLink,
    addBot,
    startBotAdminSetup,
    selectGlobalDirection,
    submitPlacement,
    reviewNftRecipient,
    prepareNftTransfer,
  } = ctx;
  return (
    <div className="tg-shell min-h-screen bg-[#0b0f14] text-slate-100">
      <header className="sticky top-0 z-40 border-b border-white/8 bg-[#0b0f14]/95 px-4 py-2.5 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <button
            type="button"
            onClick={() => setPage("top")}
            aria-label="Открыть главную страницу TG TOP"
            title="На главную"
            className="flex shrink-0 items-center gap-2"
          >
            <BrandMark />
            <b className="whitespace-nowrap text-sm tracking-tight">TG TOP</b>
          </button>
          <div className="flex items-center gap-2">
            {isAuthenticated && (
              <button
                onClick={() => setPage("profile")}
                aria-label="Открыть кабинет с балансом"
                className="hidden min-[360px]:block rounded-xl border border-[#3f8cff]/20 bg-[#14263b]/35 px-3 py-2 text-right leading-tight shadow-[0_4px_14px_rgba(0,0,0,0.12)] backdrop-blur-sm transition-colors hover:border-[#3f8cff]/35 hover:bg-[#14263b]/55"
              >
                <b className="block whitespace-nowrap text-[12px] font-semibold tracking-tight text-[#b9d6ff]">{totalBalanceLabel}</b>
              </button>
            )}
            <button
              onClick={() => setSettingsOpen(true)}
              aria-label="Settings"
              className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-[#111720] text-slate-400"
            >
              <Settings2 className="h-4 w-4" />
            </button>
            {isAuthenticated ? (
              <button
                onClick={() => setPage("profile")}
                aria-label="Открыть профиль"
                className="flex items-center"
              >
                <span className="grid h-9 w-9 overflow-hidden rounded-full border border-white/10 bg-[#1b2430] text-xs font-semibold">
                  <>
                    {displayUserAvatar ? (
                      <img
                        src={displayUserAvatar}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      (user?.name?.slice(0, 1).toUpperCase() ?? "T")
                    )}
                  </>
                </span>
              </button>
            ) : (
              <button
                onClick={() => startTelegramLogin()}
                className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border border-[#3f8cff]/40 bg-[#3f8cff]/15 px-3 py-1.5 text-[11px] font-semibold text-[#a6c8ff] transition-colors hover:bg-[#3f8cff]/25"
              >
                <Send className="h-3.5 w-3.5 text-[#72a8ff]" />
                <span className="min-[440px]:hidden">Войти</span>
                <span className="hidden min-[440px]:inline">Войти через Telegram</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-2 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-2">
        {page === "top" && <TopPage {...ctx} />}
        {page === "catalog" && <CatalogPage {...ctx} />}
        {page === "giveaways" && <GiveawaysPage {...ctx} />}
        {page === "mine" && <MinePage {...ctx} />}
        {page === "details" && <DetailsPage {...ctx} />}
        {page === "owner" && <OwnerPage {...ctx} />}
        {page === "admin" && moderationAccess?.canModerate && <AdminPage {...ctx} />}
        {page === "profile" && <ProfilePage {...ctx} />}
      </main>

      <nav className="pointer-events-none fixed inset-x-3 bottom-[calc(0.65rem+env(safe-area-inset-bottom))] z-40">
        <div className="tg-bottom-nav pointer-events-auto mx-auto flex max-w-3xl items-center justify-center rounded-[22px] border border-white/15 bg-[#132338]/80 p-1.25 shadow-[0_12px_36px_rgba(0,0,0,0.34)] backdrop-blur-2xl">
          {isAuthenticated ? (
            <div className={`grid w-full gap-1 ${moderationAccess?.canModerate ? "grid-cols-4" : "grid-cols-3"}`}>
              {(
                [
                  { key: "top", label: "ТОП", icon: Trophy },
                  { key: "mine", label: "Рабочее пространство", icon: LayoutGrid },
                  { key: "profile", label: "Мой кабинет", icon: UserRound },
                  ...(moderationAccess?.canModerate ? [{ key: "admin", label: "Админ", icon: ShieldCheck }] : []),
                ] as const
              ).map(item => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.key}
                    onClick={() =>
                      item.key === "mine" ? openMine() : setPage(item.key as Page)
                    }
                    aria-label={item.label}
                    className={`flex h-[50px] min-w-0 flex-col items-center justify-center gap-[3px] rounded-[16px] px-1 transition-all duration-200 ${page === item.key ? "tg-bottom-nav-active" : "tg-bottom-nav-inactive text-slate-400 hover:bg-white/[0.06] hover:text-slate-200"}`}
                  >
                    {item.key === "top" ? <TgTopPyramidIcon className="h-[18px] w-[22px] shrink-0" /> : <Icon className="h-[18px] w-[18px] shrink-0" />}
                    <span className="max-w-full truncate px-0.5 text-[10px] font-medium leading-none">{item.key === "mine" ? tx("Рабочее", "Workspace") : item.key === "profile" ? tx("Профиль", "Profile") : item.label}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <button
              onClick={() => setPage("top")}
              aria-label="ТОП"
              className="tg-bottom-nav-active flex h-[50px] flex-col items-center justify-center gap-[3px] rounded-[16px]"
            >
              <TgTopPyramidIcon className="h-[18px] w-[22px]" />
              <span className="text-[10px] font-medium leading-none">ТОП</span>
            </button>
          )}
        </div>
      </nav>

      <Sheet open={Boolean(showcaseNft)} onOpenChange={open => !open && setShowcaseNftId(null)}>
        <SheetContent side="bottom" className="rounded-t-[22px] border-white/10 bg-[#10161f] text-slate-100">
          <SheetHeader className="px-4">
            <SheetTitle className="text-slate-100">{tx("Выберите площадку для NFT", "Choose a community for the NFT")}</SheetTitle>
          </SheetHeader>
          <div className="space-y-2 px-4 pb-5 pt-3">
            {showcaseNft && <p className="text-xs text-slate-400">@{showcaseNft.username} · {tx("будет показан только на выбранной площадке", "will be shown only on the selected community")}</p>}
            {mine.length ? mine.map(group => (
              <button key={group.id} onClick={() => showcaseNft && setNftShowcase.mutate({ nftId: showcaseNft.id, target: "group", groupId: group.id })} disabled={setNftShowcase.isPending} className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-[#111720] p-3 text-left transition-colors hover:bg-white/[0.04] disabled:opacity-50">
                <Avatar group={group} compact />
                <span className="min-w-0 flex-1"><b className="block truncate text-sm">{group.title}</b><small className="mt-0.5 block truncate text-[10px] text-slate-500">{getCommunityAccessLabel(group, language)}</small></span>
                <ChevronRight className="h-4 w-4 text-[#a6c8ff]" />
              </button>
            )) : <p className="rounded-xl border border-dashed border-white/12 p-5 text-center text-xs leading-5 text-slate-500">{tx("Сначала подключите свою площадку в личной папке.", "Connect a community in My Groups first.")}</p>}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={Boolean(pendingGroupDeletion)} onOpenChange={open => !open && setPendingGroupDeletion(null)}>
        <SheetContent side="bottom" className="rounded-t-[26px] border-rose-300/15 bg-[#10161f] text-slate-100">
          <SheetHeader className="px-4 pb-2">
            <SheetTitle className="text-slate-100">{tx("Снять группу с листинга?", "Remove community from listing?")}</SheetTitle>
            <p className="text-xs leading-5 text-slate-500">{pendingGroupDeletion?.title}. {tx("Оплата за лот после этого не возвращается. Группа останется в вашем рабочем пространстве.", "The lot payment is not refunded. The community stays in your workspace.")}</p>
          </SheetHeader>
          <div className="flex gap-2 px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3">
            <button type="button" onClick={() => setPendingGroupDeletion(null)} className="flex-1 rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/[0.05]">{tx("Отмена", "Cancel")}</button>
            <button type="button" onClick={() => { if (!pendingGroupDeletion) return; unlistGroups.mutate({ groupIds: [pendingGroupDeletion.id] }, { onSuccess: () => { setPendingGroupDeletion(null); setPage("mine"); } }); }} disabled={unlistGroups.isPending} className="flex-1 rounded-xl bg-rose-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-rose-400 disabled:opacity-50">{unlistGroups.isPending ? tx("Снимаем…", "Removing…") : tx("Снять с листинга", "Remove from listing")}</button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={lotGroupPickerOpen} onOpenChange={setLotGroupPickerOpen}>
        <SheetContent side="bottom" className="max-h-[72dvh] overflow-y-auto rounded-t-[26px] border-white/10 bg-[#10161f] text-slate-100">
          <SheetHeader className="px-4">
            <SheetTitle className="text-slate-100">Ваша группа</SheetTitle>
            <p className="text-xs leading-5 text-slate-500">Выберите одну из уже подключённых групп для обновления этого лота.</p>
          </SheetHeader>
          <div className="space-y-2 px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3">
            {lotGroupPickerCandidates.length ? lotGroupPickerCandidates.map(group => {
              const compatible = lotGroupCandidates.some(candidate => candidate.id === group.id);
              const selected = group.id === selectedLotGroup?.id;
              return <button key={group.id} type="button" disabled={!compatible} onClick={() => { if (!compatible) return; applyLotGroupSettings(group); setLotGroupPickerOpen(false); }} className={`flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${selected ? "border-[#3f8cff]/65 bg-[#3f8cff]/12" : "border-white/8 bg-white/[0.025] hover:bg-white/[0.055]"}`}>
                <Avatar group={group} compact />
                <span className="min-w-0 flex-1"><b className="block truncate text-sm text-slate-100">{group.title}</b><small className="mt-0.5 block truncate text-[10px] text-slate-500">{group.username ? `@${group.username}` : "Подключена к TG TOP"}{!compatible && placementSlot ? ` · слот только ${placementSlot.category === "Каналы" ? "для каналов" : placementSlot.category === "Чаты" ? "для чатов" : "другой рубрики"}` : ""}</small></span>
                <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full ${selected ? "bg-[#3390ec] text-white" : "border border-white/20 text-transparent"}`}><Check className="h-3.5 w-3.5" /></span>
              </button>;
            }) : <div className="space-y-2">
              <p className="rounded-xl border border-dashed border-white/12 px-3 py-4 text-center text-xs leading-5 text-slate-500">Сначала добавьте бота администратором своей группы.</p>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => startBotAdminSetup("channel")} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl border border-[#354966] bg-[#202b3a] px-2 text-[10px] font-semibold text-slate-200 transition-colors hover:bg-[#253247] active:scale-[0.98]"><Plus className="h-3.5 w-3.5 text-[#8fc4ff]" />Добавить канал</button>
                <button type="button" onClick={() => startBotAdminSetup("group")} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl border border-[#354966] bg-[#202b3a] px-2 text-[10px] font-semibold text-slate-200 transition-colors hover:bg-[#253247] active:scale-[0.98]"><Plus className="h-3.5 w-3.5 text-[#8fc4ff]" />Добавить чат</button>
              </div>
            </div>}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={listingCountrySheetOpen} onOpenChange={setListingCountrySheetOpen}>
        <SheetContent side="bottom" className="!bottom-[calc(4.75rem+env(safe-area-inset-bottom))] max-h-[62dvh] overflow-y-auto rounded-t-[26px] border-white/10 bg-[#10161f] text-slate-100">
          <SheetHeader className="px-4 pb-2">
            <SheetTitle className="text-slate-100">География размещения</SheetTitle>
            <p className="text-[11px] leading-4 text-slate-500">Выберите страну или оставьте размещение доступным по всему миру.</p>
          </SheetHeader>
          <div className="space-y-1 px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-1">
            <button type="button" onClick={() => { setListingCountry("Все"); setListingCity("Все"); setListingCountrySheetOpen(false); }} className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors ${listingCountry === "Все" || listingCountry === "Global" ? "border-[#3f8cff]/60 bg-[#3f8cff]/12" : "border-white/8 bg-white/[0.025] hover:bg-white/[0.055]"}`}>
              <span className="min-w-0 flex-1"><b className="block truncate text-sm text-slate-100">Весь мир</b></span>
              <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${listingCountry === "Все" || listingCountry === "Global" ? "border-[#3f8cff] bg-[#3f8cff] text-white" : "border-white/20 text-transparent"}`}><Check className="h-3.5 w-3.5" /></span>
            </button>
            {managedCountries.filter(country => country.code !== "Global" && country.code !== "Все").map(country => {
              const selected = country.code === listingCountry;
              return <button key={country.id} type="button" onClick={() => { setListingCountry(country.code); setListingCity("Все"); setListingCountrySheetOpen(false); }} className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors ${selected ? "border-[#3f8cff]/60 bg-[#3f8cff]/12" : "border-white/8 bg-white/[0.025] hover:bg-white/[0.055]"}`}>
                <span className="min-w-0 flex-1"><b className="block truncate text-sm text-slate-100">{country.label}</b></span>
                <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${selected ? "border-[#3f8cff] bg-[#3f8cff] text-white" : "border-white/20 text-transparent"}`}><Check className="h-3.5 w-3.5" /></span>
              </button>;
            })}
            <button type="button" onClick={() => openTelegramInNewBrowserTab("https://t.me/TGTOP_Owner/2")} className="flex w-full items-center justify-between rounded-xl border border-[#3f8cff]/25 bg-[#3f8cff]/8 px-3 py-3 text-left text-sm font-medium text-[#a9caff] hover:bg-[#3f8cff]/15">
              <span>＋ Предложить страну</span><ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={listingSubcategorySheetOpen} onOpenChange={setListingSubcategorySheetOpen}>
        <SheetContent side="bottom" className="!bottom-[calc(4.75rem+env(safe-area-inset-bottom))] max-h-[62dvh] overflow-y-auto rounded-t-[26px] border-white/10 bg-[#10161f] text-slate-100">
          <SheetHeader className="px-4 pb-2">
            <SheetTitle className="text-slate-100">Подкатегория</SheetTitle>
            <p className="text-[11px] leading-4 text-slate-500">Рубрика задаёт, в каком разделе рейтинга будет показано сообщество.</p>
          </SheetHeader>
          <div className="space-y-1 px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-1">
            <button type="button" onClick={() => { setListingSubcategory("General"); setListingSubcategorySheetOpen(false); }} className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors ${listingSubcategory === "General" ? "border-[#3f8cff]/60 bg-[#3f8cff]/12" : "border-white/8 bg-white/[0.025] hover:bg-white/[0.055]"}`}>
              <span className="min-w-0 flex-1"><b className="block truncate text-sm text-slate-100">{tx("Все рубрики", "All topics")}</b></span>
              <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${listingSubcategory === "General" ? "border-[#3f8cff] bg-[#3f8cff] text-white" : "border-white/20 text-transparent"}`}><Check className="h-3.5 w-3.5" /></span>
            </button>
            {managedTopics.filter(topic => topic.category === (selectedLotGroup?.category ?? "Каналы") && topic.code !== "General").map(topic => {
              const selected = topic.code === listingSubcategory;
              return <button key={topic.id} type="button" onClick={() => { setListingSubcategory(topic.code); setListingSubcategorySheetOpen(false); }} className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors ${selected ? "border-[#3f8cff]/60 bg-[#3f8cff]/12" : "border-white/8 bg-white/[0.025] hover:bg-white/[0.055]"}`}>
                <span className="min-w-0 flex-1"><b className="block truncate text-sm text-slate-100">{topic.label}</b></span>
                <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${selected ? "border-[#3f8cff] bg-[#3f8cff] text-white" : "border-white/20 text-transparent"}`}><Check className="h-3.5 w-3.5" /></span>
              </button>;
            })}
            <button type="button" onClick={() => openTelegramInNewBrowserTab("https://t.me/TGTOP_Owner/2")} className="flex w-full items-center justify-between rounded-xl border border-[#3f8cff]/25 bg-[#3f8cff]/8 px-3 py-3 text-left text-sm font-medium text-[#a9caff] hover:bg-[#3f8cff]/15">
              <span>＋ Предложить категорию</span><ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={managerSheetOpen} onOpenChange={open => setManagerSheetOpen(open)}>
        <SheetContent side="bottom" className="max-h-[78dvh] overflow-y-auto rounded-t-[26px] border-white/10 bg-[#10161f] text-slate-100">
          <SheetHeader className="px-4">
            <SheetTitle className="text-slate-100">{tx("Менеджер группы", "Community manager")}</SheetTitle>
            <p className="text-xs leading-5 text-slate-500">{tx("Выберите администратора Telegram. Он будет указан как менеджер этой площадки в TG TOP.", "Choose a Telegram administrator to display as the community manager in TG TOP.")}</p>
          </SheetHeader>
          <div className="space-y-3 px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3">
            <button type="button" onClick={() => { setSelectedManagerTelegramUserId(null); setManagerPublic(false); }} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${!managerPublic ? "border-[#3f8cff]/65 bg-[#3f8cff]/12" : "border-white/8 bg-white/[0.025] hover:bg-white/[0.055]"}`}>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-[#1b2430] text-slate-300"><UserRound className="h-4 w-4" /></span>
              <span className="min-w-0 flex-1"><b className="block text-sm text-slate-100">Анонимно</b><small className="mt-0.5 block text-[10px] text-slate-500">Не показывать менеджера в карточке</small></span>
              <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border ${!managerPublic ? "border-[#3f8cff] bg-[#3f8cff] text-white" : "border-white/20 text-transparent"}`}><Check className="h-3.5 w-3.5" /></span>
            </button>
            {groupAdministratorsQuery.isLoading ? (
              <p className="rounded-xl border border-white/8 bg-white/[0.035] px-3 py-5 text-center text-xs text-slate-500">{ui.loading}</p>
            ) : groupAdministratorsQuery.error ? (
              <div className="rounded-xl border border-rose-300/15 bg-rose-300/[0.05] px-3 py-4 text-center"><p className="text-xs leading-5 text-rose-200">{groupAdministratorsQuery.error.message}</p><button type="button" onClick={() => void groupAdministratorsQuery.refetch()} className="mt-2 rounded-lg border border-rose-200/20 bg-rose-200/[0.06] px-3 py-1.5 text-[11px] font-semibold text-rose-100 transition-colors hover:bg-rose-200/[0.12]">{tx("Обновить список", "Refresh list")}</button></div>
            ) : (groupAdministratorsQuery.data ?? []).length ? (
              <div className="space-y-2">
                {(groupAdministratorsQuery.data ?? []).map(admin => {
                  const selected = managerPublic && admin.telegramUserId === selectedManagerTelegramUserId;
                  return (
                    <button key={admin.telegramUserId} type="button" onClick={() => { setSelectedManagerTelegramUserId(admin.telegramUserId); setManagerPublic(true); }} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${selected ? "border-[#3f8cff]/65 bg-[#3f8cff]/12" : "border-white/8 bg-white/[0.025] hover:bg-white/[0.055]"}`}>
                      <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full border border-white/10 bg-[#1b2430] text-xs font-semibold text-slate-300">{admin.avatarUrl ? <img src={admin.avatarUrl} alt="" className="h-full w-full object-cover" /> : admin.name.slice(0, 1).toUpperCase()}</span>
                      <span className="min-w-0 flex-1"><b className="block truncate text-sm text-slate-100">{admin.name}</b>{admin.username && <small className="mt-0.5 block truncate text-[10px] text-slate-500">@{admin.username}</small>}</span>
                      <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border ${selected ? "border-[#3f8cff] bg-[#3f8cff] text-white" : "border-white/20 text-transparent"}`}><Check className="h-3.5 w-3.5" /></span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-white/12 px-3 py-5 text-center text-xs leading-5 text-slate-500">{tx("Администраторы не найдены. Добавьте @TG_TOPBOT в администраторы группы и обновите список.", "No administrators found. Add @TG_TOPBOT as an admin and try again.")}</p>
            )}
            <button type="button" onClick={() => { const managerGroupId = lotGroupId ?? selectedGroupId; if (!managerPublic) return setManagerSheetOpen(false); if (!selectedManagerTelegramUserId || !managerGroupId) return; setGroupManager.mutate({ groupId: managerGroupId, telegramUserId: selectedManagerTelegramUserId }, { onSuccess: () => { setManagerPublic(true); setManagerSheetOpen(false); } }); }} disabled={(managerPublic && !selectedManagerTelegramUserId) || setGroupManager.isPending || groupAdministratorsQuery.isLoading} className="flex w-full items-center justify-center rounded-xl bg-[#1688f5] px-4 py-3.5 text-sm font-semibold text-white transition-transform active:scale-[0.98] disabled:opacity-45">
              {setGroupManager.isPending ? ui.loading : !managerPublic ? "Сохранить анонимный режим" : tx("Сохранить менеджера", "Save manager")}
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={outbidOpen} onOpenChange={open => { setOutbidOpen(open); if (!open) setTargetSlot(null); }}>
        <SheetContent side="bottom" className="max-h-[82dvh] overflow-y-auto rounded-t-[26px] border-white/10 bg-[#10161f] text-slate-100">
          <SheetHeader className="px-4">
            <SheetTitle className="text-slate-100">{tx("Перебить лот", "Outbid lot")}</SheetTitle>
            <p className="text-xs leading-5 text-slate-500">{tx(`Новая ставка — от ${formatTon(outbidMinimum)} GRAM`, `New bid starts at ${formatTon(outbidMinimum)} GRAM`)}</p>
          </SheetHeader>
          <div className="space-y-4 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-2">
            <section>
              <div className="mb-2 flex items-center justify-between"><b className="text-xs text-slate-200">{tx("Ваша группа", "Your community")}</b><small className="text-[10px] text-slate-500">{tx("Одна группа", "One community")}</small></div>
              <div className="space-y-2">
                {outbidCandidates.map(group => {
                  const selected = group.id === outbidGroupId;
                  return <button key={group.id} type="button" onClick={() => setOutbidGroupId(group.id)} className={`flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-colors ${selected ? "border-[#3f8cff]/65 bg-[#3f8cff]/12" : "border-white/8 bg-white/[0.025] hover:bg-white/[0.055]"}`}>
                    <Avatar group={group} compact />
                    <span className="min-w-0 flex-1"><b className="block truncate text-sm text-slate-100">{group.title}</b><small className="mt-0.5 block truncate text-[10px] text-slate-500">{getCommunityAccessLabel(group, language)}</small></span>
                    <span className={`grid h-5 w-5 place-items-center rounded-md border ${selected ? "border-[#3f8cff] bg-[#3f8cff] text-white" : "border-white/20 text-transparent"}`}><Check className="h-3.5 w-3.5" /></span>
                  </button>;
                })}
                {!outbidCandidates.length && <div className="rounded-xl border border-dashed border-white/12 px-3 py-4 text-center">
                  <b className="block text-xs font-medium text-slate-300">{mine.length ? tx("Нет подключённой группы для этого рейтинга.", "No connected community matches this ranking.") : tx("Чтобы добавить свою группу, назначьте бота администратором вашей группы.", "To add your community, make the bot an administrator of your community.")}</b>
                  <small className="mt-1 block text-[10px] leading-4 text-slate-500">{mine.length ? tx("Выберите уже подключённую группу с подходящей категорией.", "Choose an already connected community in the matching category.") : tx("После подключения группа появится здесь для выбора.", "After connection, the community will appear here for selection.")}</small>
                </div>}
              </div>
            </section>
            <section className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-black/15 p-3">
              <span><b className="block text-xs text-slate-200">{outbidVisibility === "public" ? tx("Публичное размещение", "Public placement") : tx("Анонимное размещение", "Anonymous placement")}</b><small className="mt-0.5 block text-[10px] text-slate-500">{outbidVisibility === "public" ? tx("Другие смогут перейти в ваш профиль", "Others can open your profile") : tx("Постинг будет анонимным", "Placement stays anonymous")}</small></span>
              <button type="button" role="switch" aria-checked={outbidVisibility === "public"} aria-label={tx("Переключить доступность профиля", "Toggle profile availability")} onClick={() => setOutbidVisibility(value => value === "public" ? "anonymous" : "public")} className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors ${outbidVisibility === "public" ? "border-[#72a8ff] bg-[#3f8cff]" : "border-white/15 bg-white/8"}`}><span className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${outbidVisibility === "public" ? "translate-x-6" : "translate-x-0"}`} /></button>
            </section>
            <section>
              <div className="mb-2 flex items-center justify-between"><b className="text-xs text-slate-200">{tx("Ваша ставка", "Your bid")}</b><small className="text-[10px] text-slate-500">{tx("Только выше текущей", "Higher only")}</small></div>
              <div className="flex items-center rounded-xl border border-white/8 bg-[#0b0f14] p-1"><button type="button" onClick={() => setOutbidBidInput(formatTon(Math.max(outbidMinimum, outbidBidAmount - 0.1)))} className="grid h-10 w-10 place-items-center rounded-lg text-slate-300"><Minus className="h-4 w-4" /></button><Input value={outbidBidInput} inputMode="decimal" onChange={event => { const value = event.target.value.replace(",", "."); if (/^\d*(\.\d?)?$/.test(value)) setOutbidBidInput(value); }} onBlur={() => setOutbidBidInput(formatTon(outbidBidAmount))} aria-label={tx("Ставка перебития в GRAM", "Outbid in GRAM")} className="h-10 flex-1 border-0 bg-transparent px-0 text-center text-lg font-semibold text-white focus-visible:ring-0" /><b className="mr-2 text-xs text-slate-400">GRAM</b><button type="button" onClick={() => setOutbidBidInput(formatTon(Math.min(MAX_RANKING_BID_GRAM, outbidBidAmount + 0.1)))} className="grid h-10 w-10 place-items-center rounded-lg text-[#a6c8ff]"><Plus className="h-4 w-4" /></button></div>
              <Slider value={[Math.min(MAX_RANKING_SLIDER_GRAM, outbidBidAmount)]} min={outbidMinimum} max={Math.max(outbidMinimum, MAX_RANKING_SLIDER_GRAM)} step={0.1} onValueChange={([value]) => setOutbidBidInput(formatTon(value))} className="mt-2 py-1.5 [&_[data-slot=slider-track]]:h-2 [&_[data-slot=slider-track]]:bg-white/10 [&_[data-slot=slider-range]]:!bg-[#3f8cff] [&_[data-slot=slider-thumb]]:size-5 [&_[data-slot=slider-thumb]]:!border-[#b9d6ff] [&_[data-slot=slider-thumb]]:!bg-[#3f8cff]" />
            </section>
            <button type="button" onClick={() => { if (!targetSlot || !selectedOutbidGroup) return; placeBid.mutate({ slotId: targetSlot.id, groupId: selectedOutbidGroup.id, bidAmount: outbidBidAmount, currentBid: `${formatTon(outbidBidAmount)} GRAM`, showOwnerContact: outbidVisibility === "public", anonymousListing: outbidVisibility === "anonymous" }); }} disabled={!selectedOutbidGroup || placeBid.isPending} className="flex w-full items-center justify-between rounded-xl bg-[#1688f5] px-4 py-3.5 text-left text-sm font-semibold text-white transition-transform active:scale-[0.98] disabled:opacity-45"><span>{placeBid.isPending ? tx("Оплата…", "Paying…") : tx("Перебить лот", "Outbid lot")}</span><span>{formatTon(outbidBidAmount)} GRAM</span></button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={Boolean(starsPaymentGroup)} onOpenChange={open => !open && setStarsPaymentGroup(null)}>
        <SheetContent side="bottom" className="max-h-[calc(100dvh-3.5rem)] overflow-y-auto rounded-t-[26px] border-white/10 bg-[#10161f] text-slate-100">
          <SheetHeader className="px-4">
            <SheetTitle className="text-slate-100">{tx("Параметры лота", "Lot settings")}</SheetTitle>
            <p className="text-xs leading-5 text-slate-500">
              {starsPaymentGroup?.title} · {tx(`позиция ${targetSlot?.slotNumber ?? "—"}`, `placement ${targetSlot?.slotNumber ?? "—"}`)}{targetSlot ? ` · ${getTargetSlotAddress(targetSlot)}` : ""}
            </p>
          </SheetHeader>
          <div className="space-y-4 px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-2">
            {starsPaymentGroup && targetSlot && (() => {
              const minimum = getMinimumRankingBidGram(targetSlot);
              const rawAmount = Number(amount);
              const bidAmount = Number.isFinite(rawAmount) ? Math.max(minimum, Math.round(rawAmount * 10) / 10) : minimum;
              const maximum = Math.max(minimum, MAX_RANKING_SLIDER_GRAM);
              const rewardBudgetUnits = rewardCampaignEnabled ? parseGramInput(rewardBudget) : 0;
              const rewardBudgetGram = rewardBudgetUnits === undefined ? null : rewardBudgetUnits / 100;
              const totalPlacementCost = rewardBudgetGram === null ? null : bidAmount + rewardBudgetGram;
              const ratio = bidAmount / minimum;
              const tone = ratio <= 1.2
                ? { text: "text-emerald-300", range: "[&_[data-slot=slider-range]]:!bg-emerald-400 [&_[data-slot=slider-thumb]]:!border-emerald-100 [&_[data-slot=slider-thumb]]:!bg-emerald-400" }
                : ratio <= 1.5
                  ? { text: "text-amber-300", range: "[&_[data-slot=slider-range]]:!bg-amber-400 [&_[data-slot=slider-thumb]]:!border-amber-100 [&_[data-slot=slider-thumb]]:!bg-amber-400" }
                  : { text: "text-fuchsia-300", range: "[&_[data-slot=slider-range]]:!bg-fuchsia-400 [&_[data-slot=slider-thumb]]:!border-fuchsia-100 [&_[data-slot=slider-thumb]]:!bg-fuchsia-400" };
              const setBid = (next: number) => setAmount(formatTon(Math.min(MAX_RANKING_BID_GRAM, Math.max(minimum, Math.round(next * 10) / 10))));
              return <div className="flex flex-col gap-3">
                <div className="order-1 flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.035] p-3">
                  <Avatar group={starsPaymentGroup} compact />
                  <span className="min-w-0 flex-1"><b className="block truncate text-sm text-white">{starsPaymentGroup.title}</b><small className="mt-0.5 block text-[11px] text-slate-500">{tx(`Минимум для позиции: ${formatTon(minimum)} GRAM`, `Placement minimum: ${formatTon(minimum)} GRAM`)}</small></span>
                </div>
                <div className="order-2 grid grid-cols-[1fr_auto] gap-2 rounded-xl border border-[#3f8cff]/25 bg-[#3f8cff]/8 px-3 py-2.5">
                  <span className="min-w-0"><small className="block text-[9px] font-semibold uppercase tracking-[0.1em] text-[#8fb9ff]">{tx("Адрес лота", "Placement address")}</small><b className="mt-1 block truncate text-[11px] text-slate-100">#{targetSlot.slotNumber} · {getTargetSlotAddress(targetSlot)}</b></span>
                  <span className="text-right"><small className="block text-[9px] text-slate-500">{tx("Минимум", "Minimum")}</small><b className="mt-1 block text-sm text-[#a6c8ff]">{formatTon(minimum)} GRAM</b></span>
                </div>
                <section className="order-3 rounded-2xl border border-white/8 bg-white/[0.025] p-3">
                  <div className="flex items-center gap-2.5"><span className="grid h-8 w-8 place-items-center rounded-lg border border-[#3f8cff]/20 bg-[#3f8cff]/10 text-[#8fb9ff]"><Settings2 className="h-4 w-4" /></span><span><b className="block text-xs text-slate-100">{tx("Настройки размещения", "Placement settings")}</b><small className="mt-0.5 block text-[10px] text-slate-500">{tx("Объявление, менеджер, продажа и вознаграждения", "Announcement, manager, sale, and rewards")}</small></span></div>
                  <div className="mt-3 flex flex-col gap-2 border-t border-white/8 pt-2">
                    <div className="order-1 grid grid-cols-2 gap-2"><button type="button" onClick={() => setListingAnnouncementEnabled(value => !value)} className={`rounded-lg border px-2.5 py-2 text-left transition-colors ${listingAnnouncementEnabled ? "border-[#3f8cff]/35 bg-[#3f8cff]/10" : "border-white/8 bg-black/15"}`}><b className="block text-[11px] text-slate-200">{tx("Объявление", "Announcement")}</b><small className={`mt-0.5 block text-[10px] ${listingAnnouncementEnabled ? "text-[#8fb9ff]" : "text-slate-500"}`}>{listingAnnouncementEnabled ? tx("Бот напишет в группе", "Bot will post") : tx("Отключено", "Off")}</small></button><button type="button" onClick={() => { setLotGroupId(starsPaymentGroup.id); setSelectedManagerTelegramUserId(starsPaymentGroup.managerTelegramUserId ?? null); setManagerPublic(starsPaymentGroup.managerPublic !== false); setManagerSheetOpen(true); }} className="rounded-lg border border-white/8 bg-black/15 px-2.5 py-2 text-left transition-colors hover:bg-white/[0.055]"><b className="block text-[11px] text-slate-200">{tx("Менеджер", "Manager")}</b><small className="mt-0.5 block truncate text-[10px] text-[#8fb9ff]">{starsPaymentGroup.managerName ?? tx("Выбрать администратора", "Choose administrator")}</small></button></div>
                    {starsPaymentGroup.managerName && <div className="order-2 flex items-center justify-between gap-3 rounded-lg bg-black/15 px-2.5 py-2"><span><b className="block text-[11px] text-slate-200">{tx("Показывать менеджера", "Show manager")}</b><small className="mt-0.5 block text-[10px] text-slate-500">{managerPublic ? tx("Гости увидят менеджера", "Guests will see the manager") : tx("Скрыт из карточки", "Hidden from details")}</small></span><button type="button" role="switch" aria-checked={managerPublic} onClick={() => setManagerPublic(value => !value)} className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors ${managerPublic ? "border-[#72a8ff] bg-[#3f8cff]" : "border-white/15 bg-white/8"}`}><span className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${managerPublic ? "translate-x-6" : "translate-x-0"}`} /></button></div>}
                    <div className="order-3 flex items-center justify-between gap-3 rounded-lg bg-black/15 px-2.5 py-2"><span><b className="block text-[11px] text-slate-200">{tx("Выставить на продажу", "Offer for sale")}</b><small className="mt-0.5 block text-[10px] text-slate-500">{isListingForSale ? tx("Цена будет видна покупателям", "Buyers will see the price") : tx("Без продажи", "Not for sale")}</small></span><button type="button" role="switch" aria-checked={isListingForSale} onClick={() => setIsListingForSale(value => !value)} className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors ${isListingForSale ? "border-[#72a8ff] bg-[#3f8cff]" : "border-white/15 bg-white/8"}`}><span className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${isListingForSale ? "translate-x-6" : "translate-x-0"}`} /></button></div>
                    {isListingForSale && <div className="order-3 relative"><Input value={salePriceTon} inputMode="decimal" onChange={event => { const value = event.target.value.replace(",", "."); if (/^\d*(\.\d?)?$/.test(value)) setSalePriceTon(value); }} placeholder={tx("Цена продажи", "Sale price")} className="h-9 border-white/10 bg-black/15 pr-10 text-[11px] placeholder:text-[11px]" /><span className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] font-medium text-slate-500">GRAM</span></div>}
                    <div className="order-4 flex items-center justify-between gap-3 rounded-lg bg-black/15 px-2.5 py-2"><span><b className="block text-[11px] text-slate-200">{tx("Вознаграждения", "Rewards")}</b><small className="mt-0.5 block text-[10px] text-slate-500">{rewardCampaignEnabled ? tx("GRAM за подтверждённые действия", "GRAM for confirmed actions") : tx("Выключены", "Off")}</small></span><button type="button" role="switch" aria-checked={rewardCampaignEnabled} onClick={() => setRewardCampaignEnabled(value => !value)} className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors ${rewardCampaignEnabled ? "border-[#72a8ff] bg-[#3f8cff]" : "border-white/15 bg-white/8"}`}><span className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${rewardCampaignEnabled ? "translate-x-6" : "translate-x-0"}`} /></button></div>
                    {rewardCampaignEnabled && <div className="order-4 grid grid-cols-2 gap-2"><div className="relative"><Input value={rewardBudget} inputMode="decimal" onChange={event => setRewardBudget(event.target.value)} placeholder={tx("Бюджет", "Budget")} className="h-9 border-white/10 bg-black/15 pr-10 text-[11px] placeholder:text-[11px]" /><span className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] font-medium text-slate-500">GRAM</span></div><div className="relative"><Input value={rewardPerSubscription} inputMode="decimal" onChange={event => setRewardPerSubscription(event.target.value)} placeholder={starsPaymentGroup.category === "Чаты" ? tx("За участника", "Per member") : tx("За подписчика", "Per subscriber")} className="h-9 border-white/10 bg-black/15 pr-10 text-[11px] placeholder:text-[11px]" /><span className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] font-medium text-slate-500">GRAM</span></div></div>}
                  </div>
                </section>
                <label className="order-4 block"><span className="mb-2 block text-xs text-slate-400">{tx("Ваша ставка", "Your bid")}</span><span className="flex items-center rounded-2xl border border-white/8 bg-[#0b0f14] p-1"><button type="button" onClick={() => setBid(bidAmount - 0.1)} aria-label={tx("Уменьшить ставку", "Decrease bid")} className="grid h-12 w-12 place-items-center rounded-xl text-slate-300 transition-colors hover:bg-white/[0.06]"><Minus className="h-4 w-4" /></button><Input value={amount} inputMode="decimal" onChange={event => { const value = event.target.value.replace(",", "."); if (/^\d*(\.\d?)?$/.test(value)) setAmount(value); }} onBlur={() => setBid(Number(amount))} aria-label={tx("Сумма ставки в GRAM", "Bid amount in GRAM")} className="h-12 flex-1 border-0 bg-transparent px-0 text-center text-3xl font-semibold text-white focus-visible:ring-0" /><b className="mr-2 text-sm text-slate-400">GRAM</b><button type="button" onClick={() => setBid(bidAmount + 0.1)} aria-label={tx("Увеличить ставку", "Increase bid")} className="grid h-12 w-12 place-items-center rounded-xl text-[#a6c8ff] transition-colors hover:bg-[#3f8cff]/10"><Plus className="h-4 w-4" /></button></span></label>
                <div className="order-5"><Slider value={[bidAmount]} min={minimum} max={maximum} step={0.1} onValueChange={([value]) => setBid(value)} className={`py-3 [&_[data-slot=slider-track]]:h-3 [&_[data-slot=slider-thumb]]:size-7 ${tone.range}`} /></div>
                {rewardCampaignEnabled && <div className="order-6 rounded-xl border border-[#63f5b1]/25 bg-[#16342f]/80 px-3 py-2.5"><div className="flex items-center justify-between gap-3"><span className="text-xs font-medium text-[#b6e8d1]">{tx("Итого к списанию", "Total to deduct")}</span><b className="text-sm text-[#63f5b1]">{totalPlacementCost === null ? tx("Укажите бюджет", "Enter budget") : `${formatTon(totalPlacementCost)} GRAM`}</b></div><small className="mt-1 block text-[10px] text-[#8fcbb0]">{totalPlacementCost === null ? tx("Укажите бюджет вознаграждений, чтобы увидеть общую сумму. Шаг 0.1 GRAM.", "Enter the rewards budget to see the total. Step 0.1 GRAM.") : tx(`Ставка ${formatTon(bidAmount)} + вознаграждения ${formatTon(rewardBudgetGram ?? 0)} GRAM · шаг 0.1 GRAM`, `Bid ${formatTon(bidAmount)} + rewards ${formatTon(rewardBudgetGram ?? 0)} GRAM · 0.1 GRAM step`)}</small></div>}
                <button onClick={() => submitPlacement(starsPaymentGroup)} disabled={placeBid.isPending || !isAuthenticated} className="order-7 flex w-full items-center justify-between rounded-2xl bg-[#1688f5] px-5 py-4 text-left text-white shadow-lg shadow-[#1688f5]/20 transition-transform active:scale-[0.98] disabled:opacity-55"><span><b className="block text-base">{isAuthenticated ? tx("Оплатить GRAM", "Pay with GRAM") : tx("Войти через Telegram", "Sign in with Telegram")}</b><small className="mt-0.5 block text-[11px] text-white/70">{tx("Сумма спишется с баланса TG TOP.", "The amount will be deducted from your TG TOP balance.")}</small></span><b className="text-lg">{totalPlacementCost === null ? `${formatTon(bidAmount)} GRAM` : `${formatTon(totalPlacementCost)} GRAM`}</b></button>
              </div>;
            })()}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={topListingPickerOpen} onOpenChange={setTopListingPickerOpen}>
        <SheetContent side="bottom" className="max-h-[82dvh] overflow-y-auto rounded-t-[26px] border-white/10 bg-[#10161f] text-slate-100">
          <SheetHeader className="px-4 pb-2 text-left">
            <SheetTitle className="text-lg text-slate-100">{tx("Выберите свои группы", "Choose your communities")}</SheetTitle>
            <p className="text-xs leading-5 text-slate-500">{tx("Отметьте одну или несколько групп. На следующем шаге вы настроите листинг — сейчас ничего не публикуется и GRAM не списываются.", "Choose one or more communities. You will configure listing on the next step — nothing is published or charged yet.")}</p>
          </SheetHeader>
          <div className="space-y-2 px-4 pb-4 pt-2">
            {mineQuery.isPending ? (
              <div className="space-y-2">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-[60px] animate-pulse rounded-xl bg-white/[0.045]" />)}</div>
            ) : mine.length ? mine.map(group => {
              const selected = topListingGroupIds.includes(group.id);
              const status = group.status === "listed"
                ? tx("Уже в каталоге", "Already in catalog")
                : group.status === "pending"
                  ? tx("Ожидает проверки", "Awaiting review")
                  : tx("Не в листинге", "Not listed");
              return (
                <button key={group.id} type="button" onClick={() => toggleTopListingGroup(group.id)} className={`flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-colors active:scale-[0.99] ${selected ? "border-[#3f8cff]/65 bg-[#3f8cff]/12" : "border-white/8 bg-white/[0.025] hover:bg-white/[0.055]"}`}>
                  <Avatar group={group} compact />
                  <span className="min-w-0 flex-1"><b className="block truncate text-sm text-slate-100">{group.title}</b><small className="mt-0.5 block truncate text-[10px] text-slate-500">{group.category} · {status}</small></span>
                  <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg border transition-colors ${selected ? "border-[#72a8ff] bg-[#3f8cff] text-white" : "border-white/15 bg-black/15 text-transparent"}`}><Check className="h-3.5 w-3.5" /></span>
                </button>
              );
            }) : (
              <div className="rounded-xl border border-dashed border-[#3f8cff]/30 bg-[#3f8cff]/[0.035] p-4 text-center">
                <b className="block text-sm text-slate-200">{tx("Пока нет подключённых групп", "No connected communities yet")}</b>
                <p className="mt-1 text-[11px] leading-4 text-slate-500">{tx("Добавьте канал или чат — Telegram предложит выдать @TG_TOPBOT права администратора.", "Add a channel or chat — Telegram will offer to grant @TG_TOPBOT administrator rights.")}</p>
                <button type="button" onClick={() => { setTopListingPickerOpen(false); setMyGroupsAddOpen(true); }} className="mt-3 rounded-lg border border-[#3f8cff]/35 bg-[#3f8cff]/10 px-3 py-2 text-xs font-semibold text-[#a6c8ff]">{tx("Добавить площадку", "Add community")}</button>
              </div>
            )}
          </div>
          <SheetFooter className="sticky bottom-0 border-t border-white/8 bg-[#10161f] px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 sm:flex-row">
            <Button variant="outline" onClick={() => setTopListingPickerOpen(false)} className="border-white/10 text-slate-300">{tx("Отмена", "Cancel")}</Button>
            <Button onClick={continueTopListingPicker} disabled={!topListingGroupIds.length} className="bg-[#3f8cff] text-white disabled:opacity-45">
              {topListingGroupIds.length ? tx(`Продолжить · ${topListingGroupIds.length}`, `Continue · ${topListingGroupIds.length}`) : tx("Выберите группы", "Choose communities")}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={listingOpen} onOpenChange={setListingOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[92dvh] overflow-y-auto rounded-t-[22px] border-white/10 bg-[#10161f] text-slate-100"
        >
          <SheetHeader className="px-4">
            <SheetTitle className="text-slate-100">{tx("Настроить листинг", "Configure listing")}</SheetTitle>
            <p className="text-xs leading-5 text-slate-500">
              {selectedListingGroups.length === 1
                ? selectedListingGroups[0]?.title
                : tx(`${selectedListingGroups.length} выбранных групп`, `${selectedListingGroups.length} selected communities`)}
            </p>
          </SheetHeader>
          <div className="space-y-5 px-4 pb-4">
            <section>
              <p className="mb-2 text-xs text-slate-400">{tx("Категория", "Category")}</p>
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#0b0f14] px-3 py-3">
                <span className="text-sm font-medium text-slate-200">{listingCategory || tx("Не определена", "Not determined")}</span>
                <span className="text-[10px] text-slate-500">{tx("Тип площадки", "Community type")}</span>
              </div>
              <small className="mt-1.5 block text-[10px] leading-4 text-slate-500">{tx("Категория определяется типом Telegram-площадки; подкатегорию можно изменить ниже.", "Category follows the Telegram community type; you can change the subcategory below.")}</small>
            </section>
            <section>
              <p className="mb-2 text-xs text-slate-400">{tx("Страна / регион в каталоге", "Catalog country / region")}</p>
              <Select value={listingCountry} onValueChange={value => { setListingCountry(value); setListingCity("Все"); }}>
                <SelectTrigger className="h-11 w-full rounded-xl border-white/10 bg-[#0b0f14] text-sm text-slate-200">
                  <SelectValue />
                </SelectTrigger>
                  <SelectContent className="z-[70] border-white/10 bg-[#111720] text-slate-100">
                    <SelectItem value="Все" className="text-sm text-slate-200 focus:bg-[#3f8cff]/15 focus:text-[#c8ddff]">Весь мир</SelectItem>
                    {managedCountries.filter(item => item.code !== "Global" && item.code !== "Все").map(item => <SelectItem key={item.id} value={item.code} className="text-sm text-slate-200 focus:bg-[#3f8cff]/15 focus:text-[#c8ddff]">{item.label}</SelectItem>)}
                  </SelectContent>
              </Select>
            </section>

            {managedCities.filter(city => city.countryCode === listingCountry).length > 0 && (
              <section>
                <p className="mb-2 text-xs text-slate-400">{tx("Город", "City")}</p>
                <Select value={listingCity} onValueChange={setListingCity}>
                  <SelectTrigger className="h-11 w-full rounded-xl border-white/10 bg-[#0b0f14] text-sm text-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[70] border-white/10 bg-[#111720] text-slate-100">
                    <SelectItem value="Все" className="text-sm text-slate-200 focus:bg-[#3f8cff]/15 focus:text-[#c8ddff]">{tx("Не указан", "Not specified")}</SelectItem>
                    {managedCities.filter(city => city.countryCode === listingCountry).map(item => <SelectItem key={item.id} value={item.code} className="text-sm text-slate-200 focus:bg-[#3f8cff]/15 focus:text-[#c8ddff]">{item.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </section>
            )}

            <section>
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <p className="text-xs text-slate-400">{tx("Подкатегория", "Subcategory")}</p>
                {!listingCategory && <span className="text-[10px] text-amber-100/70">{tx("Выберите группы одного типа", "Select one community type")}</span>}
              </div>
              {listingCategory ? (
                <>
                <Select value={listingSubcategory} onValueChange={setListingSubcategory}>
                  <SelectTrigger className="h-11 w-full rounded-xl border-white/10 bg-[#0b0f14] text-sm text-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[70] border-white/10 bg-[#111720] text-slate-100">
                    <SelectItem value="General" className="text-sm text-slate-200 focus:bg-[#3f8cff]/15 focus:text-[#c8ddff]">{tx("Все рубрики", "All topics")}</SelectItem>
                    {listingSubcategoryOptions.filter(item => item !== "General").map(item => <SelectItem key={item} value={item} className="text-sm text-slate-200 focus:bg-[#3f8cff]/15 focus:text-[#c8ddff]">{listingCategory ? getManagedTopicLabel(listingCategory, item) : item}</SelectItem>)}
                  </SelectContent>
                </Select>
                <button type="button" onClick={() => openTelegramInNewBrowserTab("https://t.me/TGTOP_Owner/2")} className="mt-2 flex w-full items-center justify-between rounded-xl border border-[#3f8cff]/25 bg-[#3f8cff]/8 px-3 py-2.5 text-left text-xs font-medium text-[#a9caff] transition-colors hover:bg-[#3f8cff]/15 active:scale-[0.99]">
                  <span>{tx("＋ Добавить категорию", "＋ Suggest a category")}</span>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                </button>
                <p className="mt-1.5 text-[10px] leading-4 text-slate-500">{tx("Откроется тема предложений. Если чат закрытый, сначала вступите в него.", "Opens the suggestions topic. If the chat is private, join it first.")}</p>
                </>
              ) : null}
            </section>

            {selectedListingGroup && (
              <section className="rounded-2xl border border-[#3f8cff]/30 bg-[#3f8cff]/[0.06] p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <span>
                    <b className="block text-sm text-[#c7dcff]">{tx("Цена места в рейтинге", "Ranking placement price")}</b>
                    <small className="mt-1 block text-[11px] leading-4 text-slate-400">{tx("Перед оплатой посмотрите, на какую ячейку попадёт эта группа.", "Preview the exact cell this community will receive before paying.")}</small>
                  </span>
                </div>
                <div className="mt-3 flex items-center rounded-xl border border-white/8 bg-[#0b0f14] p-1">
                  <button type="button" onClick={() => setListingRankingBid(formatTon(Math.max(0.1, listingRankingBidAmount - 0.1)))} aria-label={tx("Уменьшить цену", "Decrease price")} className="grid h-10 w-10 place-items-center rounded-lg text-slate-300 transition-colors hover:bg-white/[0.06]"><Minus className="h-4 w-4" /></button>
                  <Input value={listingRankingBid} inputMode="decimal" onChange={event => { const value = event.target.value.replace(",", "."); if (/^\d*(\.\d?)?$/.test(value)) setListingRankingBid(value); }} onBlur={() => setListingRankingBid(formatTon(listingRankingBidAmount))} aria-label={tx("Цена места в GRAM", "Ranking price in GRAM")} className="h-10 flex-1 border-0 bg-transparent px-0 text-center text-xl font-semibold text-white focus-visible:ring-0" />
                  <b className="mr-1 text-xs text-slate-400">GRAM</b>
                  <button type="button" onClick={() => setListingRankingBid(formatTon(Math.min(MAX_RANKING_BID_GRAM, listingRankingBidAmount + 0.1)))} aria-label={tx("Увеличить цену", "Increase price")} className="grid h-10 w-10 place-items-center rounded-lg text-[#a6c8ff] transition-colors hover:bg-[#3f8cff]/10"><Plus className="h-4 w-4" /></button>
                </div>
                <Slider value={[Math.min(MAX_RANKING_SLIDER_GRAM, listingRankingBidAmount)]} min={0.1} max={MAX_RANKING_SLIDER_GRAM} step={0.1} onValueChange={([value]) => setListingRankingBid(formatTon(value))} className="mt-3 py-2 [&_[data-slot=slider-track]]:h-2.5 [&_[data-slot=slider-track]]:bg-white/10 [&_[data-slot=slider-range]]:!bg-[#3f8cff] [&_[data-slot=slider-thumb]]:size-6 [&_[data-slot=slider-thumb]]:!border-[#b9d6ff] [&_[data-slot=slider-thumb]]:!bg-[#3f8cff]" />
                <div className="mt-3 rounded-xl border border-white/8 bg-white/[0.035] px-3 py-2.5">
                  {listingRankingPreviewSlotNumber ? <><small className="block text-[10px] uppercase tracking-[0.1em] text-slate-500">{tx("Предпросмотр позиции", "Placement preview")}</small><small className="mt-1 block truncate text-[10px] font-medium text-[#a6c8ff]">{tx("Рейтинг: ", "Ranking: ")}{listingRankingScope}</small><b className="mt-1 block text-sm text-white">{tx(`Займёт ${listingRankingPreviewSlotNumber}-ю позицию`, `Will take position ${listingRankingPreviewSlotNumber}`)}</b><small className="mt-1 block text-[10px] text-slate-400">{listingRankingMinimum !== null ? tx(`Для этой ячейки нужно от ${formatTon(listingRankingMinimum)} GRAM`, `This cell requires at least ${formatTon(listingRankingMinimum)} GRAM`) : ""}</small></> : <><b className="block text-sm text-amber-100">{tx("С этой суммой группа не попадёт в Top", "This amount will not enter Top")}</b><small className="mt-1 block text-[10px] text-slate-500">{tx("Увеличьте ставку, чтобы занять доступную ячейку.", "Increase the bid to take an available cell.")}</small></>}
                </div>
              </section>
            )}

            {selectedListingGroups.length === 1 && (
              <section className="rounded-xl border border-white/8 bg-white/[0.035] p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs">
                    <b className="block text-slate-200">{tx("Объявление о листинге", "Listing announcement")}</b>
                    <small className="mt-0.5 block text-[11px] leading-4 text-slate-500">{tx("@TG_TOPBOT опубликует сообщение в группе после сохранения листинга.", "@TG_TOPBOT will post a message in the community after saving the listing.")}</small>
                  </span>
                  <button type="button" role="switch" aria-checked={listingAnnouncementEnabled} aria-label={tx("Переключить объявление о листинге", "Toggle listing announcement")} onClick={() => setListingAnnouncementEnabled(value => !value)} className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors ${listingAnnouncementEnabled ? "border-[#72a8ff] bg-[#3f8cff]" : "border-white/15 bg-white/8"}`}>
                    <span className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${listingAnnouncementEnabled ? "translate-x-6" : "translate-x-0"}`} />
                  </button>
                </div>
              </section>
            )}

            <section className="rounded-xl border border-white/8 bg-white/[0.035] p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs">
                  <b className="block text-slate-200">{tx("Выставить на продажу", "Offer for sale")}</b>
                  <small className="mt-0.5 block text-[11px] leading-4 text-slate-500">{tx("После включения укажите цену в GRAM", "Set a GRAM price after enabling")}</small>
                </span>
                <button type="button" role="switch" aria-checked={isListingForSale} onClick={() => setIsListingForSale(value => !value)} className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors ${isListingForSale ? "border-[#72a8ff] bg-[#3f8cff]" : "border-white/15 bg-white/8"}`}>
                  <span className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${isListingForSale ? "translate-x-6" : "translate-x-0"}`} />
                </button>
              </div>
            </section>

            {isListingForSale && (
              <section>
                <div className="mb-2 flex items-baseline justify-between">
                  <p className="text-xs text-slate-400">{tx("Цена в GRAM", "Price in GRAM")}</p>
                  <span className="text-[10px] text-slate-600">{tx("Необязательно", "Optional")}</span>
                </div>
                <div className="relative">
                  <Input
                    value={salePriceTon}
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.1"
                    onChange={event => { const value = event.target.value.replace(",", "."); if (/^\d*(\.\d?)?$/.test(value)) setSalePriceTon(value); }}
                    onBlur={() => setSalePriceTon(salePriceTon ? formatTon(salePriceTon) : "")}
                    placeholder={tx("Например, 250", "For example, 250")}
                    className="h-11 appearance-none border-white/10 bg-[#0b0f14] pr-12 text-sm [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-500">GRAM</span>
                </div>
              </section>
            )}

            {privateEntryEligibleGroup && (
              <section className="rounded-xl border border-[#3f8cff]/20 bg-[#3f8cff]/[0.045] p-3">
                <b className="block text-sm text-slate-200">{tx("Закрытая ссылка для входа", "Private entry link")}</b>
                <p className="mt-1 text-[11px] leading-4 text-slate-500">{tx("Нужна для приватного сообщества без @username. Бот создаёт ссылку, которую можно поставить главным входом в карточке.", "For a private community without @username. The bot creates a link that can be used as the main entry in the card.")}</p>
                <div className="mt-3 rounded-lg border border-white/8 bg-[#0b0f14] px-3 py-2 text-[11px] leading-4 text-slate-400">
                  <p><b className="text-[#a6c8ff]">1.</b> {tx("Нажмите «Создать ссылку».", "Press Create link.")}</p>
                  <p className="mt-1"><b className="text-[#a6c8ff]">2.</b> {tx("Бот создаст приглашение Telegram и сохранит его в карточке.", "The bot creates a Telegram invite and saves it to the card.")}</p>
                  <p className="mt-1"><b className="text-[#a6c8ff]">3.</b> {tx("Откройте ссылку для проверки или скопируйте её.", "Open the link to check it or copy it.")}</p>
                </div>
                {!privateEntryEligibleGroup.inviteLink ? (
                  <button type="button" onClick={() => createPrivateEntryLink.mutate({ groupId: privateEntryEligibleGroup.id })} disabled={createPrivateEntryLink.isPending} className="mt-3 flex w-full items-center justify-center rounded-lg border border-[#3f8cff]/35 bg-[#3f8cff]/12 px-3 py-2.5 text-xs font-semibold text-[#a6c8ff] disabled:opacity-45">
                    {createPrivateEntryLink.isPending ? ui.loading : tx("Создать ссылку", "Create link")}
                  </button>
                ) : (
                  <div className="mt-3 space-y-2">
                    <code className="block truncate rounded-lg border border-white/8 bg-[#0b0f14] px-3 py-2 text-[10px] text-[#a6c8ff]">{privateEntryEligibleGroup.inviteLink}</code>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => openTelegramCommunityLink(privateEntryEligibleGroup.inviteLink!)} className="rounded-lg border border-[#3f8cff]/35 bg-[#3f8cff]/12 px-2 py-2 text-[10px] font-semibold text-[#a6c8ff]">{tx("Открыть", "Open")}</button>
                      <button type="button" onClick={() => void copyPrivateEntryLink(privateEntryEligibleGroup.inviteLink!)} className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-2 text-[10px] font-semibold text-slate-300">{tx("Скопировать", "Copy")}</button>
                    </div>
                  </div>
                )}
              </section>
            )}

            {monthlyEntryEligibleGroup && (
              <section className="rounded-xl border border-amber-300/15 bg-amber-300/[0.035] p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs">
                      <b className="block text-slate-200">{tx("Сделать вход платным", "Make entry paid")}</b>
                    <small className="mt-0.5 block text-[11px] leading-4 text-slate-500">{tx("Telegram будет списывать Stars каждый месяц за доступ к каналу", "Telegram will charge Stars monthly for channel access")}</small>
                  </span>
                  <button type="button" role="switch" aria-checked={monthlyEntryEnabled} onClick={() => setMonthlyEntryEnabled(value => !value)} className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors ${monthlyEntryEnabled ? "border-amber-200/70 bg-amber-400" : "border-white/15 bg-white/8"}`}>
                    <span className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${monthlyEntryEnabled ? "translate-x-6" : "translate-x-0"}`} />
                  </button>
                </div>
                {monthlyEntryEnabled && (
                  <div className="mt-3 space-y-2.5">
                    <div className="relative">
                      <Input value={monthlyEntryStars} type="number" inputMode="numeric" min="1" max="10000" step="1" onChange={event => setMonthlyEntryStars(event.target.value)} placeholder={tx("Цена за месяц", "Monthly price")} className="h-10 border-white/10 bg-[#0b0f14] pr-14 text-sm" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-amber-100/80">★ / {tx("мес.", "mo.")}</span>
                    </div>
                    <Input value={monthlyEntryLinkName} maxLength={64} onChange={event => setMonthlyEntryLinkName(event.target.value)} placeholder={tx("Название ссылки (необязательно)", "Link name (optional)")} className="h-10 border-white/10 bg-[#0b0f14] text-sm" />
                    <button type="button" onClick={() => createMonthlyEntryLink.mutate({ groupId: monthlyEntryEligibleGroup.id })} disabled={createMonthlyEntryLink.isPending || !monthlyEntryEligibleGroup.monthlyEntryEnabled || monthlyEntryEligibleGroup.monthlyEntryStars !== Number(monthlyEntryStars) || (monthlyEntryEligibleGroup.monthlyEntryLinkName ?? "") !== monthlyEntryLinkName.trim()} className="flex w-full items-center justify-between rounded-lg border border-amber-200/20 bg-amber-300/10 px-3 py-2 text-left text-[11px] font-semibold text-amber-100 disabled:opacity-45">
                      <span>{createMonthlyEntryLink.isPending ? ui.loading : tx("Создать платную ссылку", "Create paid link")}</span>
                      <span>★</span>
                    </button>
                    {monthlyEntryEligibleGroup.monthlyEntryInviteLink ? (
                      <button type="button" onClick={() => openTelegramCommunityLink(monthlyEntryEligibleGroup.monthlyEntryInviteLink!)} className="block max-w-full truncate text-left text-[10px] font-medium text-[#9cc3ff] hover:text-white">{tx("Открыть активную платную ссылку", "Open active paid link")}</button>
                    ) : (
                      <p className="text-[10px] leading-4 text-slate-500">{tx("Сначала сохраните цену, затем создайте ссылку Telegram.", "Save the price first, then create the Telegram link.")}</p>
                    )}
                  </div>
                )}
              </section>
            )}



            {selectedListingGroups.length === 1 && (() => {
              const rewardGroup = selectedListingGroups[0];
              const isChannel = rewardGroup?.category === "Каналы";
              return (
                <section className="rounded-xl border border-[#3f8cff]/20 bg-[#3f8cff]/[0.045] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs">
                      <b className="block text-slate-200">{tx("Вознаграждения", "Rewards")}</b>
                      <small className="mt-0.5 block text-[11px] leading-4 text-slate-500">
                        {tx("Резервируйте внутренний GRAM и начисляйте его только за подтвержденные ботом действия.", "Reserve internal GRAM and award it only for bot-confirmed actions.")}
                      </small>
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={rewardCampaignEnabled}
                      aria-label={tx("Переключить кампанию вознаграждений", "Toggle reward campaign")}
                      onClick={() => setRewardCampaignEnabled(value => !value)}
                      className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors ${rewardCampaignEnabled ? "border-[#72a8ff] bg-[#3f8cff]" : "border-white/15 bg-white/8"}`}
                    >
                      <span className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${rewardCampaignEnabled ? "translate-x-6" : "translate-x-0"}`} />
                    </button>
                  </div>
                  {rewardCampaignEnabled && (
                    <div className="mt-3 space-y-2.5">
                      <div className="relative">
                        <Input value={rewardBudget} type="number" inputMode="decimal" min="0.01" step="0.01" onChange={event => setRewardBudget(event.target.value)} placeholder={tx("Бюджет кампании", "Campaign budget")} className="h-10 border-white/10 bg-[#0b0f14] pr-14 text-sm" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#a6c8ff]">GRAM</span>
                      </div>
                      <div className="relative">
                        <Input value={rewardPerSubscription} type="number" inputMode="decimal" min="0.01" step="0.01" onChange={event => setRewardPerSubscription(event.target.value)} placeholder={isChannel ? tx("За подписчика", "Per subscriber") : tx("За добавленного участника", "Per added member")} className="h-10 border-white/10 bg-[#0b0f14] pr-14 text-sm" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#a6c8ff]">GRAM</span>
                      </div>
                      <p className="text-[10px] leading-4 text-slate-500">
                        {isChannel
                          ? tx("Одна ставка применяется и к подписке, и к вступлению по персональной ссылке.", "One amount applies to subscriptions and personal invite-link joins.")
                          : tx("Вознаграждение получает тот, кто добавил нового участника напрямую, без ссылки.", "The reward goes to the user who adds a new member directly, without an invite link.")}
                      </p>
                    </div>
                  )}
                </section>
              );
            })()}

            {selectedListingGroups.length === 1 && selectedListingGroups[0]?.category === "Каналы" && selectedListingGroups[0]?.username && (
              <p className="rounded-lg border border-dashed border-white/10 bg-[#0b0f14] px-3 py-2 text-[11px] leading-4 text-slate-500">{tx("Ежемесячный вход в Stars доступен после перевода канала в приватный режим.", "Monthly Stars entry is available after the channel becomes private.")}</p>
            )}



            {selectedListingGroups.length === 1 && (() => {
              const managerGroup = selectedListingGroups[0];
              return (
                <section className="rounded-xl border border-[#3f8cff]/20 bg-[#3f8cff]/[0.045] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="min-w-0 text-xs">
                      <b className="block text-slate-200">{tx("Менеджер площадки", "Community manager")}</b>
                      <small className="mt-0.5 block truncate text-[11px] text-slate-500">{managerGroup.managerName ? `${managerGroup.managerName}${managerPublic ? " · виден в карточке" : " · скрыт"}` : tx("Выберите администратора из Telegram", "Choose an administrator from Telegram")}</small>
                    </span>
                    <button type="button" onClick={() => { setLotGroupId(managerGroup.id); setSelectedManagerTelegramUserId(managerGroup.managerTelegramUserId ?? null); setManagerPublic(managerGroup.managerPublic !== false); setManagerSheetOpen(true); }} className="shrink-0 rounded-lg border border-[#3f8cff]/35 bg-[#3f8cff]/12 px-3 py-2 text-[10px] font-semibold text-[#a6c8ff] transition-colors hover:bg-[#3f8cff]/20">{managerGroup.managerName ? tx("Изменить", "Change") : tx("Выбрать", "Choose")}</button>
                  </div>
                </section>
              );
            })()}

            <div className="rounded-xl border border-[#3f8cff]/18 bg-[#3f8cff]/8 p-3 text-[11px] leading-4 text-slate-400">
              {tx("Новая публикация использует", "A new publication uses")} <b className="font-medium text-[#a6c8ff]">0.1 GRAM</b> {tx("за группу. Повторное редактирование уже опубликованного листинга не списывает бонусы. Оплата GRAM и передача прав пока не запускаются автоматически.", "per community. Editing an existing listing does not spend more bonuses. GRAM payments and ownership transfers do not start automatically yet.")}
            </div>
            {selectedListingGroup && (
              <button type="button" onClick={() => { if (!listingRankingPreviewSlot || !canPayListingRanking) return; setTargetSlot(listingRankingPreviewSlot); setAmount(formatTon(listingRankingBidAmount)); setPaymentMethod("gram"); setListingOpen(false); window.setTimeout(() => setStarsPaymentGroup(selectedListingGroup), 160); }} disabled={!canPayListingRanking} className="flex w-full items-center justify-between rounded-xl bg-[#1688f5] px-4 py-3 text-left text-sm font-semibold text-white transition-transform active:scale-[0.98] disabled:opacity-45"><span>{tx("Залистить", "List community")}</span><span>{formatTon(listingRankingBidAmount)} GRAM</span></button>
            )}
          </div>
          <SheetFooter className="sticky bottom-0 border-t border-white/8 bg-[#10161f] px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => setListingOpen(false)}
              className="border-white/10 text-slate-300"
            >
              {tx("Отмена", "Cancel")}
            </Button>
            <Button
              onClick={saveListing}
              disabled={listWithCredits.isPending || !selectedGroupIds.length}
              className="bg-[#3f8cff] text-white disabled:opacity-60"
            >
              {listWithCredits.isPending ? ui.loading : tx("Сохранить листинг", "Save listing")}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={myGroupsAddOpen} onOpenChange={setMyGroupsAddOpen}>
        <SheetContent side="bottom" className="rounded-t-[22px] border-white/10 bg-[#10161f] pb-5 text-slate-100">
          <SheetHeader className="px-4">
            <SheetTitle className="text-slate-100">{tx("Добавить площадку", "Add community")}</SheetTitle>
            <p className="text-xs leading-5 text-slate-500">{tx("Выберите тип — Telegram предложит добавить @TG_TOPBOT администратором.", "Choose a type — Telegram will offer to add @TG_TOPBOT as an administrator.")}</p>
          </SheetHeader>
          <div className="grid grid-cols-2 gap-2 px-4">
            <button type="button" onClick={() => { setMyGroupsAddOpen(false); startBotAdminSetup("channel"); }} className="rounded-xl border border-[#3f8cff]/35 bg-[#3f8cff]/10 p-4 text-left transition-colors hover:bg-[#3f8cff]/18">
              <b className="block text-sm text-[#a6c8ff]">{tx("+ Канал", "+ Channel")}</b>
              <small className="mt-1 block text-[10px] leading-4 text-slate-400">{tx("Публичный или приватный", "Public or private")}</small>
            </button>
            <button type="button" onClick={() => { setMyGroupsAddOpen(false); startBotAdminSetup("group"); }} className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-left transition-colors hover:bg-white/[0.08]">
              <b className="block text-sm text-slate-200">{tx("+ Чат", "+ Chat")}</b>
              <small className="mt-1 block text-[10px] leading-4 text-slate-400">{tx("С настройками модерации", "With moderation settings")}</small>
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet
        open={nftTransferOpen}
        onOpenChange={open => {
          setNftTransferOpen(open);
          if (!open) {
            setSelectedNftId(null);
            setRecipientInput("");
            setPreparedNftTransfer(null);
            setNftTransferStep("select");
          }
        }}
      >
        <SheetContent side="bottom" className="max-h-[92dvh] overflow-y-auto rounded-t-[22px] border-white/10 bg-[#10161f] text-slate-100">
          <SheetHeader className="px-4">
            <SheetTitle className="text-center text-slate-100">{tx("Передать NFT", "Send NFT")}</SheetTitle>
            <p className="text-center text-xs leading-5 text-slate-500">
              {tx("Комиссия TG TOP · 0%. Всегда проверяйте получателя перед подтверждением.", "TG TOP fee · 0%. Always check the recipient before confirming.")}
            </p>
          </SheetHeader>

          {nftTransferStep === "select" && (
            <div className="space-y-4 px-4 pb-4">
              <label className="block space-y-2">
                <span className="text-xs text-slate-400">{tx("Username или Telegram ID получателя", "Recipient username or Telegram ID")}</span>
                <div className="flex h-12 items-center gap-2 rounded-xl border border-white/12 bg-[#0b0f14] px-3 focus-within:border-[#3f8cff]/70">
                  <span className="text-lg text-[#a6c8ff]">@</span>
                  <Input value={recipientInput} onChange={event => setRecipientInput(event.target.value)} placeholder={tx("username или 123456789", "username or 123456789")} className="h-9 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0" />
                </div>
              </label>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs text-slate-400">{tx("Выберите NFT", "Select NFTs")}</span>
                  <span className="text-[10px] text-slate-600">{tx("доступно для передачи", "available to transfer")}</span>
                </div>
                {myNftsQuery.isLoading ? (
                  <div className="rounded-xl border border-white/8 bg-[#0b0f14] p-5 text-center text-xs text-slate-500">{ui.loading}</div>
                ) : myNfts.length ? (
                  <div className="grid grid-cols-2 gap-2">
                    {myNfts.map(nft => {
                      const selected = selectedNftId === nft.id;
                      const transferable = nft.status === "available";
                      return (
                        <button key={nft.id} disabled={!transferable} onClick={() => setSelectedNftId(nft.id)} className={`rounded-xl border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${selected ? "border-[#a6c8ff] bg-[#3f8cff]/12" : "border-white/10 bg-[#0b0f14]"}`}>
                          <span className="flex items-center justify-between gap-2">
                            <span className="rounded-md bg-white/5 px-2 py-1 text-[9px] font-medium uppercase tracking-[0.08em] text-slate-400">{nft.assetClass === "onchain" ? "On-chain" : "Off-chain"}</span>
                            {selected && <Check className="h-4 w-4 text-[#a6c8ff]" />}
                          </span>
                          <b className="mt-4 block truncate text-sm text-slate-100">@{nft.username}</b>
                          <small className="mt-1 block text-[10px] text-slate-500">{nft.status === "available" ? tx("Доступен", "Available") : tx("Недоступен", "Unavailable")}</small>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-white/12 bg-[#0b0f14] p-5 text-center text-xs leading-5 text-slate-500">{tx("В вашем профиле пока нет NFT, доступных для передачи.", "There are no NFTs available to transfer in your profile yet.")}</div>
                )}
              </div>
              <p className="rounded-xl border border-white/8 bg-white/[0.025] p-3 text-[11px] leading-5 text-slate-500">{tx("TG TOP фиксирует заявку, но не передает NFT автоматически. Назначение подтверждается только через официальный Telegram/Fragment-процесс. On-chain листинг появится после независимой проверки владения.", "TG TOP records a request but never transfers an NFT automatically. Assignment is confirmed only through the official Telegram/Fragment process. On-chain listings appear after independent ownership verification.")}</p>
            </div>
          )}

          {nftTransferStep === "review" && selectedNft && reviewedRecipient && (
            <div className="space-y-4 px-4 pb-4">
              <div className="rounded-2xl border border-white/10 bg-[#0b0f14] p-4">
                <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500">{tx("Получатель", "Recipient")}</span>
                <div className="mt-2 flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-[#1b2430] text-sm font-semibold text-slate-300">
                    {reviewedRecipient.avatarUrl ? <img src={reviewedRecipient.avatarUrl} alt="" className="h-full w-full object-cover" /> : (reviewedRecipient.name ?? "T").slice(0, 1).toUpperCase()}
                  </span>
                  <span className="min-w-0">
                    <b className="block truncate text-sm text-slate-100">{reviewedRecipient.name ?? tx("Пользователь TG TOP", "TG TOP user")}</b>
                    <small className="block truncate text-[11px] text-slate-500">{reviewedRecipient.telegramUsername ? `@${reviewedRecipient.telegramUsername}` : reviewedRecipient.openId.replace("telegram:", "ID ")}</small>
                  </span>
                  <Check className="ml-auto h-5 w-5 text-[#72a8ff]" />
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#0b0f14] p-4">
                <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500">{tx("Передаваемый актив", "Asset to send")}</span>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span><b className="block text-sm text-slate-100">@{selectedNft.username}</b><small className="mt-1 block text-[11px] text-slate-500">{selectedNft.assetClass === "onchain" ? "On-chain" : "Off-chain"}</small></span>
                  <span className="rounded-md border border-[#3f8cff]/25 bg-[#3f8cff]/10 px-2 py-1 text-[10px] font-medium text-[#a6c8ff]">{tx("TG TOP · 0%", "TG TOP · 0%")}</span>
                </div>
              </div>
              {selectedNft.assetClass === "onchain" && <p className="rounded-xl border border-amber-300/20 bg-amber-300/5 p-3 text-[11px] leading-5 text-amber-100/75">{tx("On-chain перевод необратим. Он станет доступен только после криптографической проверки кошельков отправителя и получателя; сеть GRAM взимает свою комиссию.", "On-chain transfers are irreversible. They become available only after cryptographic wallet verification for both parties; the GRAM network charges its own fee.")}</p>}
            </div>
          )}

          {nftTransferStep === "prepared" && preparedNftTransfer && (
            <div className="space-y-4 px-4 pb-4">
              <div className="rounded-2xl border border-[#3f8cff]/25 bg-[#3f8cff]/8 p-4 text-center">
                <Check className="mx-auto h-7 w-7 text-[#72a8ff]" />
                <b className="mt-2 block text-base text-slate-100">{preparedNftTransfer.transfer.assetClass === "offchain" ? tx("Подтвердите передачу", "Confirm transfer") : tx("Проверка кошельков требуется", "Wallet verification required")}</b>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{preparedNftTransfer.transfer.assetClass === "offchain" ? tx("TG TOP зафиксировал запрос. Передача не выполняется автоматически: назначение нужно подтвердить через официальный Telegram/Fragment-процесс.", "TG TOP recorded the request. No transfer is automatic: confirm assignment through the official Telegram/Fragment process.") : tx("Этот On-chain NFT останется в безопасности до завершения проверки адресов и подготовки подписи в GRAM Connect.", "This on-chain NFT remains safe until address verification and GRAM Connect signing are ready.")}</p>
              </div>
            </div>
          )}

          <SheetFooter className="sticky bottom-0 border-t border-white/8 bg-[#10161f] px-4 py-3 sm:flex-row">
            {nftTransferStep === "select" && <>
              <Button variant="outline" onClick={() => setNftTransferOpen(false)} className="border-white/10 text-slate-300">{tx("Отмена", "Cancel")}</Button>
              <Button onClick={reviewNftRecipient} disabled={!selectedNft || !recipientInput.trim() || nftRecipientQuery.isFetching} className="bg-[#3f8cff] text-white">{nftRecipientQuery.isFetching ? ui.loading : tx("Продолжить", "Continue")}</Button>
            </>}
            {nftTransferStep === "review" && <>
              <Button variant="outline" onClick={() => setNftTransferStep("select")} className="border-white/10 text-slate-300">{tx("Назад", "Back")}</Button>
              <Button onClick={prepareNftTransfer} disabled={prepareNftTransferMutation.isPending} className="bg-[#3f8cff] text-white">{prepareNftTransferMutation.isPending ? ui.loading : selectedNft?.assetClass === "onchain" ? tx("Проверить кошельки", "Check wallets") : tx("Продолжить", "Continue")}</Button>
            </>}
            {nftTransferStep === "prepared" && <>
              <Button variant="outline" onClick={() => setNftTransferOpen(false)} className="border-white/10 text-slate-300">{tx("Закрыть", "Close")}</Button>
            </>}
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[82dvh] rounded-t-[22px] border-white/10 bg-[#10161f] pb-3 text-slate-100"
        >
          <SheetHeader className="px-4 pb-2">
            <SheetTitle className="text-base text-slate-100">{tx("Настроить выдачу", "Refine results")}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 overflow-y-auto px-4 pb-2">
            <div>
              <p className="mb-2 text-[11px] text-slate-500">{tx("Категория", "Category")}</p>
              <div className="grid grid-cols-2 gap-1.5">
                {([
                  ["Все", ui.all],
                  ["Каналы", ui.channels],
                  ["Чаты", ui.chats],
                  ["NFT", "NFT"],
                ] as const).map(([value, label]) => (
                  <button key={value} onClick={() => selectGlobalDirection(value)} className={`rounded-md border px-2 py-2 text-[11px] ${globalDirection === value ? "border-[#3f8cff] bg-[#3f8cff]/15 text-[#a6c8ff]" : "border-white/10 text-slate-400"}`}>{label}</button>
                ))}
              </div>
            </div>
            {(category === "Каналы" || category === "Чаты") && (
              <div>
                <p className="mb-2 text-[11px] text-slate-500">{tx("Тема", "Topic")}</p>
                <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
                  <button onClick={() => setSubcategory("Все")} className={`shrink-0 rounded-md border px-2.5 py-1.5 text-[11px] ${subcategory === "Все" ? "border-[#3f8cff] bg-[#3f8cff]/15 text-[#a6c8ff]" : "border-white/10 text-slate-400"}`}>{tx("Все", "All")}</button>
                  {CATEGORY_SUBCATEGORIES[category].map(item => (
                    <button key={item} onClick={() => setSubcategory(item)} className={`shrink-0 rounded-md border px-2.5 py-1.5 text-[11px] ${subcategory === item ? "border-[#3f8cff] bg-[#3f8cff]/15 text-[#a6c8ff]" : "border-white/10 text-slate-400"}`}>{getSubcategoryLabel(item, language)}</button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <p className="mb-2 text-[11px] text-slate-500">{tx("Страна", "Country")}</p>
              <div className="grid grid-cols-3 gap-1.5">
                {["Все", ...COUNTRY_OPTIONS.filter(item => item !== "Global")].map(item => (
                  <button
                    key={item}
                    onClick={() => { setCountry(item); setCity("Все"); }}
                    className={`rounded-md border px-2 py-2 text-[10px] ${country === item ? "border-[#3f8cff] bg-[#3f8cff]/15 text-[#a6c8ff]" : "border-white/10 text-slate-400"}`}
                  >
                    {item === "Все" ? tx("Все", "All") : getCountryLabel(item, language)}
                  </button>
                ))}
              </div>
            </div>
            {(CITY_OPTIONS[country] ?? []).length > 0 && (
              <div>
                <p className="mb-2 text-[11px] text-slate-500">{tx("Город", "City")}</p>
                <div className="flex flex-wrap gap-1.5">
                  <button onClick={() => setCity("Все")} className={`rounded-md border px-2.5 py-1.5 text-[11px] ${city === "Все" ? "border-[#3f8cff] bg-[#3f8cff]/15 text-[#a6c8ff]" : "border-white/10 text-slate-400"}`}>{tx("Все города", "All cities")}</button>
                  {CITY_OPTIONS[country].map(item => <button key={item.value} onClick={() => setCity(item.value)} className={`rounded-md border px-2.5 py-1.5 text-[11px] ${city === item.value ? "border-[#3f8cff] bg-[#3f8cff]/15 text-[#a6c8ff]" : "border-white/10 text-slate-400"}`}>{item[language]}</button>)}
                </div>
              </div>
            )}
            <div>
              <p className="mb-2 text-[11px] text-slate-500">
                {tx("Количество участников", "Audience size")}
              </p>
              <div className="grid grid-cols-4 gap-1.5">
                {(
                  [
                    { key: "all", label: tx("Все", "All") },
                    { key: "small", label: tx("<1K", "<1K") },
                    { key: "medium", label: tx("1–10K", "1–10K") },
                    { key: "large", label: tx("10K+", "10K+") },
                  ] as const
                ).map(item => (
                  <button
                    key={item.key}
                    onClick={() => setAudience(item.key)}
                    className={`rounded-md border px-1 py-1.5 text-center text-[10px] ${audience === item.key ? "border-[#3f8cff] bg-[#3f8cff]/15 text-[#a6c8ff]" : "border-white/10 text-slate-400"}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <SheetFooter className="mt-1 flex-row gap-2 px-4">
            <Button
              variant="outline"
              onClick={() => {
                setCategory("Все");
                setGlobalDirection("Все");
                setSubcategory("Все");
                setCountry("Все");
                setCity("Все");
                setAudience("all");
              }}
              className="h-9 flex-1 border-white/10 text-xs text-slate-300"
            >
              {tx("Сбросить", "Reset")}
            </Button>
            <Button
              onClick={() => setFiltersOpen(false)}
              className="h-9 flex-1 bg-[#3f8cff] text-xs"
            >
              {tx("Показать", "Show results")}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      <SettingsSheet
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />
      <Sheet open={Boolean(adminGuideKind)} onOpenChange={open => !open && setAdminGuideKind(null)}>
        <SheetContent side="bottom" className="!bottom-[calc(4.75rem+env(safe-area-inset-bottom))] max-h-[52dvh] rounded-t-[22px] border-white/10 bg-[#10161f] pb-[calc(1rem+env(safe-area-inset-bottom))] text-slate-100">
          <SheetHeader className="px-4 pb-2">
            <SheetTitle className="text-base text-slate-100">
              {tx("Подтвердите права администратора", "Confirm administrator rights")}
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-3 px-4 text-sm leading-5 text-slate-300">
            <p>{tx("Telegram открыл добавление администратора с заранее выбранными правами TG TOP. Проверьте их и подтвердите добавление.", "Telegram opened the administrator flow with TG TOP permissions preselected. Review them and confirm the addition.")}</p>
            <ol className="space-y-2 rounded-xl border border-white/8 bg-black/15 p-3 text-[12px] text-slate-400">
              <li><b className="mr-1 text-[#a6c8ff]">1.</b>{tx("Выберите свой ", "Select your ")}{adminGuideKind === "channel" ? tx("канал", "channel") : tx("чат", "chat")}.</li>
              <li><b className="mr-1 text-[#a6c8ff]">2.</b>{tx("В Telegram должна быть кнопка добавления как администратора, а не как участника. Не отключайте права удаления сообщений и управления группой.", "Telegram should show Add as administrator, not Add as member. Keep message deletion and group-management rights enabled.")}</li>
              <li><b className="mr-1 text-[#a6c8ff]">3.</b>{tx("Вернитесь сюда — группа появится только после подтверждения прав ботом.", "Return here — the community appears only after the bot confirms its rights.")}</li>
            </ol>
            <p className="text-[11px] text-slate-500">{tx("Telegram не позволяет приложению выдать права автоматически — это подтверждает только владелец сообщества.", "Telegram requires the community owner to confirm admin rights; the app cannot grant them automatically.")}</p>
          </div>
          <SheetFooter className="mt-4 flex-row gap-2 px-4">
            <Button variant="outline" onClick={() => setAdminGuideKind(null)} className="h-10 flex-1 border-white/10 text-xs text-slate-300">{tx("Понятно", "Got it")}</Button>
            <Button onClick={() => adminGuideKind && addBot(adminGuideKind)} className="h-10 flex-1 bg-[#3f8cff] text-xs">{tx("Открыть Telegram снова", "Open Telegram again")}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
