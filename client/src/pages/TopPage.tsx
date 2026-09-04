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

type TopPageProps = Pick<HomeController, "isAuthenticated" | "category" | "globalDirection" | "topSection" | "subcategory" | "setSubcategory" | "country" | "setCountry" | "city" | "setCity" | "topSearchQuery" | "setTopSearchQuery" | "topSearchOpen" | "setTopSearchOpen" | "language" | "salePriceTon" | "nftAssetFilter" | "setNftAssetFilter" | "nftMarketCategory" | "setNftMarketCategory" | "nftDealCategory" | "setNftDealCategory" | "botCategory" | "setBotCategory" | "ui" | "tx" | "nftsQuery" | "approvedBotsQuery" | "approvedBots" | "botTelegramLinkDraft" | "setBotTelegramLinkDraft" | "botCategorySheetOpen" | "setBotCategorySheetOpen" | "botListingSheetOpen" | "setBotListingSheetOpen" | "deals" | "submitBotListing" | "createNftRentalDeal" | "visibleNfts" | "rankingContinuation" | "automaticPlacementSlot" | "searchedGeneralList" | "leadSlot" | "secondTier" | "thirdTier" | "rankingMotionKey" | "globalCount" | "currentTopTitle" | "currentTopCountry" | "currentTopCity" | "currentTopSubcategory" | "managedCountries" | "managedCities" | "botTopicOptions" | "globalSubcategoryOptions" | "activeRankingBoardScope" | "openGroup" | "openMine" | "openTopListingPicker" | "selectGlobalDirection" | "selectTopSection" | "openNftTransfer">;

export function TopPage(props: TopPageProps) {
  const {
    isAuthenticated,
    category,
    globalDirection,
    topSection,
    subcategory,
    setSubcategory,
    country,
    setCountry,
    city,
    setCity,
    topSearchQuery,
    setTopSearchQuery,
    topSearchOpen,
    setTopSearchOpen,
    language,
    salePriceTon,
    nftAssetFilter,
    setNftAssetFilter,
    nftMarketCategory,
    setNftMarketCategory,
    nftDealCategory,
    setNftDealCategory,
    botCategory,
    setBotCategory,
    ui,
    tx,
    nftsQuery,
    approvedBotsQuery,
    approvedBots,
    botTelegramLinkDraft,
    setBotTelegramLinkDraft,
    botCategorySheetOpen,
    setBotCategorySheetOpen,
    botListingSheetOpen,
    setBotListingSheetOpen,
    deals,
    submitBotListing,
    createNftRentalDeal,
    visibleNfts,
    rankingContinuation,
    automaticPlacementSlot,
    searchedGeneralList,
    leadSlot,
    secondTier,
    thirdTier,
    rankingMotionKey,
    globalCount,
    currentTopTitle,
    currentTopCountry,
    currentTopCity,
    currentTopSubcategory,
    managedCountries,
    managedCities,
    botTopicOptions,
    globalSubcategoryOptions,
    activeRankingBoardScope,
    openGroup,
    openMine,
    openTopListingPicker,
    selectGlobalDirection,
    selectTopSection,
    openNftTransfer,
  } = props;
  return (
          <section className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="contents">
                <div className="contents">
                  <div className={`flex min-w-0 items-center gap-1 px-0.5 ${topSection === "communities" ? "order-4 basis-full border-b border-white/8 pb-2" : "order-3 flex-1"}`}>
                    <span className="flex min-w-0 flex-1 items-baseline gap-1 overflow-hidden whitespace-nowrap">
                      <h1 className="shrink-0 text-[clamp(14px,4.7vw,18px)] font-semibold tracking-tight text-white">{currentTopTitle}</h1>
                      {currentTopSubcategory && <span className="min-w-0 shrink truncate text-[10px] font-medium text-[#7697c7]">· {currentTopSubcategory}</span>}
                      {currentTopCountry && <span className="min-w-0 shrink truncate text-[10px] font-medium text-slate-400">· {currentTopCountry}</span>}
                      {currentTopCity && <span className="max-w-[48px] shrink truncate text-[9px] font-medium text-[#7697c7]">· {currentTopCity}</span>}
                      <span aria-live="polite" className="shrink-0 text-[11px] text-slate-500">{n(globalCount, language)}</span>
                    </span>
                    {topSection === "communities" && (country !== "Все" || city !== "Все" || subcategory !== "Все") && (
                      <button type="button" onClick={() => { setCountry("Все"); setCity("Все"); setSubcategory("Все"); }} aria-label={tx("Сбросить географию и рубрику", "Reset location and topic")} title={tx("Сбросить географию и рубрику", "Reset location and topic")} className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-rose-400/25 bg-rose-500/10 text-rose-300 transition-colors hover:border-rose-300/45 hover:bg-rose-500/18 hover:text-rose-100 active:scale-[0.96]">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <span className="order-3 flex shrink-0 items-center gap-1.5">
                  {topSection === "communities" && (
                    <>
                      <Popover>
                        <PopoverTrigger asChild>
                          <button type="button" aria-label={tx("Гео фильтр", "Geo filter")} title={tx("Гео", "Geo")} className={`grid h-7 w-7 place-items-center rounded-md border transition-colors ${country !== "Все" ? "border-[#3390ec]/50 bg-[#3390ec]/16 text-[#b8d7ff]" : "border-white/10 bg-white/5 text-slate-400 hover:border-[#3390ec]/45 hover:text-[#79a7ff]"}`}>
                            <Globe2 className="h-3.5 w-3.5" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-64 border-white/10 bg-[#111720] p-2 text-slate-100 shadow-xl">
                          <div className="space-y-2">
                            <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
                              <button type="button" onClick={() => { setCountry("Все"); setCity("Все"); }} className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors ${country === "All" || country === "Все" ? "bg-[#3f8cff] text-white font-medium" : "text-slate-300 hover:bg-white/5"}`}>
                                <span>{tx("Весь мир", "Worldwide")}</span>
                                {(country === "All" || country === "Все") && <Check className="h-3 w-3" />}
                              </button>
                              {managedCountries.filter(item => item.code !== "Global").map(item => (
                                <button key={item.code} type="button" onClick={() => { setCountry(item.code); setCity("Все"); }} className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors ${country === item.code ? "bg-[#3f8cff] text-white font-medium" : "text-slate-300 hover:bg-white/5"}`}>
                                  <span>{item.label}</span>
                                  {country === item.code && <Check className="h-3 w-3" />}
                                </button>
                              ))}
                              <div className="mt-2 border-t border-white/8 pt-2">
                                <small className="mb-1 block px-2.5 text-[10px] uppercase tracking-wide text-slate-500">{tx("Город", "City")}</small>
                                <button type="button" onClick={() => setCity("Все")} className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors ${city === "Все" ? "bg-[#3f8cff] text-white font-medium" : "text-slate-300 hover:bg-white/5"}`}>
                                  <span>{tx("Все города", "All cities")}</span>
                                  {city === "Все" && <Check className="h-3 w-3" />}
                                </button>
                                {managedCities.filter(item => country === "Все" || item.countryCode === country).map(item => (
                                  <button key={`${item.countryCode}:${item.code}`} type="button" onClick={() => { setCountry(item.countryCode); setCity(item.code); }} className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors ${city === item.code && country === item.countryCode ? "bg-[#3f8cff] text-white font-medium" : "text-slate-300 hover:bg-white/5"}`}>
                                    <span>{item.label}</span>
                                    {city === item.code && country === item.countryCode && <Check className="h-3 w-3" />}
                                  </button>
                                ))}
                                <button type="button" onClick={() => openTelegramInNewBrowserTab("https://t.me/TGTOP_Owner/2")} className="mt-2 flex w-full items-center justify-between rounded-lg border border-[#3f8cff]/25 bg-[#3f8cff]/8 px-2.5 py-2 text-xs font-medium text-[#a9caff] hover:bg-[#3f8cff]/15">
                                  <span>{tx("＋ Предложить страну", "＋ Suggest a country")}</span>
                                  <ChevronRight className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>

                      <Popover>
                        <PopoverTrigger asChild>
                          <button type="button" aria-label={tx("Рубрики и категории", "Categories & topics")} title={tx("Категории", "Categories")} className={`grid h-7 w-7 place-items-center rounded-md border transition-colors ${subcategory !== "Все" ? "border-[#3390ec]/50 bg-[#3390ec]/16 text-[#b8d7ff]" : "border-white/10 bg-white/5 text-slate-400 hover:border-[#3390ec]/45 hover:text-[#79a7ff]"}`}>
                            <Filter className="h-3.5 w-3.5" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-64 border-white/10 bg-[#111720] p-2 text-slate-100 shadow-xl">
                          <div className="space-y-2">
                            <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
                              <button type="button" onClick={() => setSubcategory("Все")} className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors ${subcategory === "Все" ? "bg-[#3f8cff] text-white font-medium" : "text-slate-300 hover:bg-white/5"}`}>
                                <span>{tx("Все рубрики", "All topics")}</span>
                                {subcategory === "Все" && <Check className="h-3 w-3" />}
                              </button>
                              {globalSubcategoryOptions.map(code => (
                                <button key={code} type="button" onClick={() => setSubcategory(code)} className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors ${subcategory === code ? "bg-[#3f8cff] text-white font-medium" : "text-slate-300 hover:bg-white/5"}`}>
                                  <span>{getSubcategoryLabel(code, language)}</span>
                                  {subcategory === code && <Check className="h-3 w-3" />}
                                </button>
                              ))}
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </>
                  )}
                  <button type="button" onClick={() => setTopSearchOpen(current => !current)} aria-label={topSearchOpen ? tx("Скрыть поиск", "Hide search") : tx("Открыть поиск", "Open search")} title={topSearchOpen ? tx("Скрыть поиск", "Hide search") : tx("Поиск", "Search")} className={`grid h-7 w-7 shrink-0 place-items-center rounded-md border transition-colors ${topSearchOpen ? "border-[#3390ec]/50 bg-[#3390ec]/16 text-[#b8d7ff]" : "border-white/10 bg-white/5 text-slate-400 hover:border-[#3390ec]/45 hover:text-[#79a7ff]"}`}>
                    <Search className="h-3.5 w-3.5" />
                  </button>
                  </span>
                </div>
              </div>
              <div className="order-1 grid basis-full grid-cols-3 rounded-xl border border-white/8 bg-[#111720] p-0.5">
              {([
                ["communities", tx("Сообщества", "Communities")],
                ["nft", "NFT"],
                ["bots", tx("Боты", "Bots")],
              ] as const).map(([value, label]) => (
                <button key={value} type="button" onClick={() => selectTopSection(value)} className={`h-8 rounded-lg text-[10px] font-semibold transition-colors ${topSection === value ? "bg-[#2b4158] text-[#d7e7f6]" : "text-slate-500 hover:bg-white/5 hover:text-slate-200"}`}>{label}</button>
              ))}
            </div>
              {topSearchOpen && <Input value={topSearchQuery} onChange={event => setTopSearchQuery(event.target.value)} aria-label={topSection === "nft" ? tx("Поиск NFT", "Search NFT") : tx("Поиск группы", "Search communities")} placeholder={topSection === "nft" ? tx("Поиск NFT или @username", "Search NFT or @username") : tx("Поиск по названию или @username", "Search by name or @username")} className="order-5 h-9 basis-full border-white/10 bg-[#111720] px-3 text-xs text-slate-200 placeholder:text-slate-600" />}
              {topSection === "communities" && <div className="order-2 grid min-w-0 flex-1 grid-cols-3 rounded-lg border border-white/8 bg-[#111720] p-0.5">
              {([
                ["Все", tx("Все", "All")],
                ["Каналы", tx("Каналы", "Channels")],
                ["Чаты", tx("Чаты", "Chats")],
              ] as const).map(([value, label]) => (
                <button key={value} type="button" onClick={() => selectGlobalDirection(value)} className={`h-7 rounded-md text-[9px] font-semibold transition-colors ${globalDirection === value ? "bg-[#293d52] text-[#d1e2f2]" : "text-slate-500 hover:bg-white/5 hover:text-slate-200"}`}>{label}</button>
              ))}
              </div>}
            </div>
            {topSection === "bots" ? (
              <section className="space-y-3 pt-1">
                <div className="flex items-center justify-between gap-3 px-1"><span><h2 className="text-sm font-semibold text-slate-200">{tx("Боты", "Bots")}</h2><small className="text-[10px] text-slate-500">{approvedBots.length} {tx("в каталоге", "in catalog")}</small></span><button type="button" onClick={() => setBotCategorySheetOpen(true)} className="inline-flex h-8 max-w-[58%] items-center gap-1.5 rounded-lg border border-[#3f8cff]/30 bg-[#3f8cff]/10 px-2.5 text-[10px] font-semibold text-[#c8ddff]"><SlidersHorizontal className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{botCategory === "Все" ? tx("Все рубрики", "All categories") : botTopicOptions.find(topic => topic.code === botCategory)?.label ?? botCategory}</span></button></div>
                {approvedBotsQuery.isLoading ? (
                  <div className="rounded-2xl border border-white/8 bg-[#111720] px-5 py-10 text-center text-xs text-slate-500">{tx("Загружаем каталог ботов…", "Loading bot catalog…")}</div>
                ) : approvedBots.length ? (
                  <div className="space-y-2">
                    {approvedBots[0] && <BotRankingTile bot={approvedBots[0]} variant="lead" categoryLabel={approvedBots[0].category === "General" ? tx("Без рубрики", "Uncategorized") : botTopicOptions.find(topic => topic.code === approvedBots[0].category)?.label ?? approvedBots[0].category} onOpen={() => openTelegramInNewBrowserTab(approvedBots[0].telegramLink)} />}
                    {approvedBots.slice(1, 3).length > 0 && <div className="grid grid-cols-2 gap-2">{approvedBots.slice(1, 3).map(bot => <BotRankingTile key={bot.id} bot={bot} variant="secondary" categoryLabel={bot.category === "General" ? tx("Без рубрики", "Uncategorized") : botTopicOptions.find(topic => topic.code === bot.category)?.label ?? bot.category} onOpen={() => openTelegramInNewBrowserTab(bot.telegramLink)} />)}</div>}
                    {approvedBots.slice(3, 7).length > 0 && <div className="grid grid-cols-4 gap-2">{approvedBots.slice(3, 7).map(bot => <BotRankingTile key={bot.id} bot={bot} variant="compact" categoryLabel={bot.category === "General" ? tx("Без рубрики", "Uncategorized") : botTopicOptions.find(topic => topic.code === bot.category)?.label ?? bot.category} onOpen={() => openTelegramInNewBrowserTab(bot.telegramLink)} />)}</div>}
                    {approvedBots.slice(7).length > 0 && <div className="grid grid-cols-2 gap-2">{approvedBots.slice(7).map(bot => <BotRankingTile key={bot.id} bot={bot} variant="secondary" categoryLabel={bot.category === "General" ? tx("Без рубрики", "Uncategorized") : botTopicOptions.find(topic => topic.code === bot.category)?.label ?? bot.category} onOpen={() => openTelegramInNewBrowserTab(bot.telegramLink)} />)}</div>}
                  </div>
                ) : (
                  <section className="rounded-2xl border border-dashed border-[#3390ec]/25 bg-[#202b3a] px-5 py-10 text-center">
                    <b className="block text-sm text-slate-200">{tx("Одобренных ботов пока нет", "No approved bots yet")}</b>
                    <p className="mx-auto mt-2 max-w-[280px] text-xs leading-5 text-slate-500">{tx("Владельцы добавляют ссылку в рабочем пространстве, а модератор вручную проверяет заявку перед публикацией.", "Owners submit a link from their workspace, then a moderator manually reviews it before publication.")}</p>
                  </section>
                )}
                <button type="button" onClick={() => isAuthenticated ? setBotListingSheetOpen(true) : toast.error(tx("Войдите в аккаунт, чтобы добавить бота", "Sign in to add a bot"))} aria-label={tx("Залистить бота", "List a bot")} title={tx("Залистить бота", "List a bot")} className="flex h-10 w-full items-center justify-center rounded-xl border border-dashed border-[#3f8cff]/28 bg-[#3f8cff]/[0.035] text-[#a6c8ff] transition-colors hover:bg-[#3f8cff]/10 active:scale-[0.985]"><Plus className="h-5 w-5" /></button>
                <Sheet open={botCategorySheetOpen} onOpenChange={setBotCategorySheetOpen}><SheetContent side="bottom" className="rounded-t-[26px] border-white/10 bg-[#10161f] text-slate-100"><SheetHeader className="px-4 pb-2"><SheetTitle className="text-slate-100">{tx("Рубрика ботов", "Bot category")}</SheetTitle></SheetHeader><div className="max-h-[54dvh] space-y-1 overflow-y-auto px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-2"><button type="button" onClick={() => { setBotCategory("Все"); setBotCategorySheetOpen(false); }} className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm ${botCategory === "Все" ? "bg-[#3f8cff]/15 text-[#d7e7f6]" : "text-slate-300 hover:bg-white/5"}`}><span>{tx("Все рубрики", "All categories")}</span>{botCategory === "Все" && <Check className="h-4 w-4 text-[#8fb9ff]" />}</button>{botTopicOptions.map(topic => <button key={topic.id} type="button" onClick={() => { setBotCategory(topic.code); setBotCategorySheetOpen(false); }} className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm ${botCategory === topic.code ? "bg-[#3f8cff]/15 text-[#d7e7f6]" : "text-slate-300 hover:bg-white/5"}`}><span>{topic.label}</span>{botCategory === topic.code && <Check className="h-4 w-4 text-[#8fb9ff]" />}</button>)}</div></SheetContent></Sheet>
                <Sheet open={botListingSheetOpen} onOpenChange={setBotListingSheetOpen}><SheetContent side="bottom" className="rounded-t-[26px] border-white/10 bg-[#10161f] text-slate-100"><SheetHeader className="px-4 pb-2"><SheetTitle className="text-slate-100">{tx("Залистить бота", "List a bot")}</SheetTitle><p className="text-xs leading-5 text-slate-500">{tx("Вставьте публичную ссылку. Бот появится в каталоге только после ручной проверки модератором.", "Paste a public link. The bot appears only after manual moderation.")}</p></SheetHeader><div className="space-y-3 px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3"><Input autoFocus value={botTelegramLinkDraft} onChange={event => setBotTelegramLinkDraft(event.target.value)} placeholder="https://t.me/username" className="h-11 border-white/10 bg-[#17212b] px-3 text-sm text-slate-100 placeholder:text-slate-600" /><button type="button" onClick={() => submitBotListing.mutate({ telegramLink: botTelegramLinkDraft })} disabled={botTelegramLinkDraft.trim().length < 3 || submitBotListing.isPending} className="h-11 w-full rounded-xl bg-[#3f8cff] text-sm font-semibold text-white disabled:opacity-45">{submitBotListing.isPending ? tx("Отправляем…", "Sending…") : tx("Отправить на проверку", "Submit for review")}</button></div></SheetContent></Sheet>
              </section>
            ) : topSection === "nft" ? (
              <section className="space-y-2 pt-1">
                <div className="flex items-baseline justify-between px-1">
                  <span>
                    <h2 className="text-sm font-semibold text-slate-200">{tx("NFT-направление", "NFT marketplace")}</h2>
                    <span className="text-[10px] text-slate-500">{tx("цифровые активы Telegram", "Telegram digital assets")}</span>
                  </span>
                  {isAuthenticated && (
                    <button onClick={openNftTransfer} className="rounded-lg border border-[#3f8cff]/35 bg-[#3f8cff]/10 px-2.5 py-1.5 text-[10px] font-semibold text-[#a6c8ff]">
                      {tx("Заявка на передачу", "Transfer request")}
                    </button>
                  )}
                </div>
                <div aria-label="Рубрики NFT" className="flex gap-1.5 overflow-x-auto rounded-lg border border-white/8 bg-[#111720] p-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {([
                    ["all", tx("Все", "All")],
                    ["gifts", tx("Гифты", "Gifts")],
                    ["usernames", tx("Юзернеймы", "Usernames")],
                    ["anonymous_numbers", tx("Анонимные номера", "Anonymous numbers")],
                    ["other", tx("Другие NFT", "Other NFTs")],
                  ] as const).map(([value, label]) => (
                    <button key={value} type="button" onClick={() => setNftMarketCategory(value)} className={`h-8 shrink-0 rounded-md px-3 text-[10px] font-semibold transition-colors ${nftMarketCategory === value ? "bg-[#3f8cff] text-white shadow-sm" : "text-slate-500 hover:bg-white/5 hover:text-slate-200"}`}>{label}</button>
                  ))}
                </div>
                <div aria-label="Режимы сделок NFT" className="flex gap-1.5 overflow-x-auto rounded-lg border border-white/8 bg-[#111720] p-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {([
                    ["all", tx("Все сделки", "All deals")],
                    ["sale", tx("Продажа", "Sale")],
                    ["auction", tx("Аукцион", "Auction")],
                    ["installments", tx("Рассрочка", "Installments")],
                    ["rent", tx("Аренда", "Rent")],
                    ["collateral", tx("Залог", "Collateral")],
                  ] as const).map(([value, label]) => (
                    <button key={value} type="button" onClick={() => setNftDealCategory(value)} className={`h-8 shrink-0 rounded-md px-3 text-[10px] font-semibold transition-colors ${nftDealCategory === value ? "bg-[#3f8cff] text-white shadow-sm" : "text-slate-500 hover:bg-white/5 hover:text-slate-200"}`}>{label}</button>
                  ))}
                </div>
                <ToggleGroup type="single" value={nftAssetFilter} onValueChange={value => value && setNftAssetFilter(value as typeof nftAssetFilter)} className="grid w-full grid-cols-3 rounded-lg border border-white/8 bg-[#111720] p-0.5">
                  <ToggleGroupItem value="all" className="h-8 border-0 text-[10px] text-slate-400 data-[state=on]:rounded-md data-[state=on]:bg-[#3f8cff] data-[state=on]:text-white">{tx("Все", "All")}</ToggleGroupItem>
                  <ToggleGroupItem value="onchain" className="h-8 border-0 text-[10px] text-slate-400 data-[state=on]:rounded-md data-[state=on]:bg-[#3f8cff] data-[state=on]:text-white">On-chain</ToggleGroupItem>
                  <ToggleGroupItem value="offchain" className="h-8 border-0 text-[10px] text-slate-400 data-[state=on]:rounded-md data-[state=on]:bg-[#3f8cff] data-[state=on]:text-white">Off-chain</ToggleGroupItem>
                </ToggleGroup>
                {nftsQuery.isLoading ? (
                  <div className="rounded-2xl border border-white/8 bg-[#111720] p-6 text-center text-sm text-slate-500">{ui.loading}</div>
                ) : visibleNfts.length ? (
                  <div className="space-y-2">{visibleNfts.map(nft => <NftCard key={nft.id} nft={nft} language={language} onRent={nft => {
                    const entered = window.prompt(language === "en" ? `Rental days (${nft.minRentalDays}-${nft.maxRentalDays})` : `Срок аренды в днях (${nft.minRentalDays}–${nft.maxRentalDays})`, String(nft.minRentalDays));
                    if (entered === null) return;
                    const rentalDays = Number(entered.trim());
                    if (!Number.isInteger(rentalDays) || rentalDays < nft.minRentalDays || rentalDays > nft.maxRentalDays) {
                      toast.error(language === "en" ? "Enter a valid rental period." : "Укажите корректный срок аренды.");
                      return;
                    }
                    const confirmed = window.confirm(language === "en"
                      ? `Create a rental request for @${nft.username} for ${rentalDays} days? No payment or Telegram assignment will happen automatically.`
                      : `Создать заявку на аренду @${nft.username} на ${rentalDays} дней? Оплата и назначение в Telegram автоматически не выполняются.`);
                    if (confirmed) createNftRentalDeal.mutate({ nftId: nft.id, rentalDays });
                  }} />)}</div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/12 bg-[#111720] p-7 text-center">
                    <p className="text-sm font-medium text-slate-300">{tx("В этой категории NFT пока нет", "No NFTs in this category yet")}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{nftDealCategory === "auction" || nftDealCategory === "installments" || nftDealCategory === "collateral" ? tx("Первые предложения появятся после безопасного листинга владельцами. Никакие платежи или передачи здесь ещё не создаются.", "Offers will appear after owners create secure listings. No payment or transfer is created here.") : nftMarketCategory === "usernames" ? tx("Юзернеймы появятся здесь после размещения владельцем.", "Usernames will appear here after owner listing.") : tx("Раздел появится после добавления первых активов.", "This category will appear after the first assets are added.")}</p>
                  </div>
                )}
              </section>
            ) : (
            <>
            <div className="w-full space-y-2">
              {!topSearchQuery.trim() && <div key={rankingMotionKey} className="w-full space-y-2" aria-live="polite">
              <div className="ranking-slot-enter ranking-slot-lead w-full" style={{ animationDelay: "0ms" }}>
                <TopRankingCard
                  group={leadSlot.group}
                  variant="lead"
                  language={language}
                  avatarSrc={leadSlot.group ? getTelegramAvatarSrc(leadSlot.group) : null}
                  showTgTopPyramidAvatar={Boolean(leadSlot.group?.topPyramidAvatar)}
                  onOpenCommunity={openTelegramCommunityLink}
                  onClick={() =>
                    leadSlot.group
                      ? openGroup(leadSlot.group.id, activeRankingBoardScope)
                      : openMine(leadSlot.isOccupied ? automaticPlacementSlot ?? undefined : leadSlot)
                  }
                />
              </div>
              <div className="grid w-full grid-cols-2 gap-2">
                {secondTier.map((slot, index) => (
                  <div key={slot.slotNumber} className="ranking-slot-enter ranking-slot-secondary" style={{ animationDelay: `${90 + index * 45}ms` }}>
                    <TopRankingCard
                      group={slot.group}
                      variant="secondary"
                      language={language}
                      avatarSrc={slot.group ? getTelegramAvatarSrc(slot.group) : null}
                      showTgTopPyramidAvatar={Boolean(slot.group?.topPyramidAvatar)}
                      onOpenCommunity={openTelegramCommunityLink}
                      onClick={() =>
                        slot.group ? openGroup(slot.group.id, activeRankingBoardScope) : openMine(slot.isOccupied ? automaticPlacementSlot ?? undefined : slot)
                      }
                    />
                  </div>
                ))}
              </div>
              <div className="grid w-full grid-cols-4 gap-2">
                {thirdTier.map((slot, index) => (
                  <div key={slot.slotNumber} className="ranking-slot-enter ranking-slot-compact" style={{ animationDelay: `${185 + index * 34}ms` }}>
                    <TopRankingCard
                      group={slot.group}
                      variant="compact"
                      language={language}
                      avatarSrc={slot.group ? getTelegramAvatarSrc(slot.group) : null}
                      showTgTopPyramidAvatar={Boolean(slot.group?.topPyramidAvatar)}
                      onOpenCommunity={openTelegramCommunityLink}
                      onClick={() =>
                        slot.group ? openGroup(slot.group.id, activeRankingBoardScope) : openMine(slot.isOccupied ? automaticPlacementSlot ?? undefined : slot)
                      }
                    />
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={openTopListingPicker}
                aria-label={tx("Добавить свою группу", "Add your community")}
                title={tx("Добавить свою группу", "Add your community")}
                className="grid h-8 w-full place-items-center rounded-lg border border-dashed border-[#3f8cff]/45 bg-[#3f8cff]/[0.055] text-[#a6c8ff] transition-colors hover:bg-[#3f8cff]/[0.13] active:scale-[0.985]"
              >
                <Plus className="h-4 w-4" />
              </button>
              </div>}
            </div>
            <section>
              <div className="space-y-2">
                {!topSearchQuery.trim() && rankingContinuation.map((slot, index) => (
                  <div key={`ranking-continuation-${slot.id}`} className="relative w-full animate-in fade-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: `${index * 35}ms` }}>
                    <CompactCommunityRow
                      group={slot.group}
                      language={language}
                      accessLabel={slot.group ? getCommunityAccessLabel(slot.group, language) : undefined}
                      salePrice={slot.group?.listingType === "sale" && slot.group.salePriceTon ? formatTon(slot.group.salePriceTon) : undefined}
                      onOpen={() => slot.group ? openGroup(slot.group.id, activeRankingBoardScope) : openMine(slot.isOccupied ? automaticPlacementSlot ?? undefined : slot)}
                    />
                  </div>
                ))}
                {searchedGeneralList.map((group, index) => {
                  const isSale = group.listingType === "sale" && group.salePriceTon;
                  return (
                    <div
                      key={group.id}
                      style={{ animationDelay: `${index * 35}ms` }}
                      className="w-full animate-in fade-in slide-in-from-bottom-2 duration-300"
                    >
                      <CompactCommunityRow
                        group={group}
                        language={language}
                        accessLabel={getCommunityAccessLabel(group, language)}
                        salePrice={isSale ? formatTon(group.salePriceTon!) : undefined}
                        onOpen={() => openGroup(group.id)}
                      />
                    </div>
                  );
                })}
                {topSearchQuery.trim() && searchedGeneralList.length === 0 && (
                  <button
                    onClick={() => openMine()}
                    className="flex h-[68px] w-full items-center gap-3 rounded-2xl border border-dashed border-[#3f8cff]/35 bg-[#111720] px-3 py-2 text-left transition-colors hover:bg-[#151d28]"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-dashed border-[#3f8cff]/35 bg-[#3f8cff]/10 text-[#a6c8ff]">
                      <Plus className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <b className="block truncate text-xs font-medium text-slate-200">{topSearchQuery ? tx("Ничего не найдено", "Nothing found") : tx("Добавить свою группу", "Add your community")}</b>
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-600" />
                  </button>
                )}
              </div>
            </section>
            </>
            )}
          </section>
  );
}
