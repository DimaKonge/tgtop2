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
import { useIsConnectionRestored, useTonAddress, useTonConnectUI } from "@tonconnect/ui-react";
import lottie from "lottie-web";

type Page = "top" | "catalog" | "giveaways" | "mine" | "details" | "owner" | "profile" | "admin";
type Audience = "all" | "small" | "medium" | "large";
type MyGroupsViewMode = "list" | "grid";
type Language = "ru" | "en";
type DetailStatsPeriod = "day" | "month" | "all";
type WorkspaceSection = "communities" | "bots" | "nft";
type WalletNftFilter = "all" | "gifts" | "usernames" | "anonymous_numbers" | "domains" | "other";
const getRussianLanguage = (): Language => "ru";

type ListingType = "catalog" | "sale";
type ListingCountry = string;
type GlobalDirection = "Все" | "Каналы" | "Чаты" | "NFT";
type TopSection = "communities" | "nft" | "bots";
type NftMarketCategory = "all" | "gifts" | "usernames" | "anonymous_numbers" | "other";
type NftDealCategory = "all" | "sale" | "auction" | "installments" | "rent" | "collateral";
const COUNTRY_OPTIONS = ["Global", "UA", "PL", "DE", "GB", "US", "RU", "FR", "ES", "IT", "NL", "CZ", "RO", "TR", "CA", "AU", "AE", "KZ"] as const;
const COUNTRY_LABELS: Record<string, { ru: string; en: string }> = {
  Global: { ru: "Весь мир", en: "Worldwide" },
  UA: { ru: "Украина", en: "Ukraine" },
  PL: { ru: "Польша", en: "Poland" },
  DE: { ru: "Германия", en: "Germany" },
  GB: { ru: "Великобритания", en: "United Kingdom" },
  US: { ru: "США", en: "United States" },
  RU: { ru: "Россия", en: "Russia" },
  FR: { ru: "Франция", en: "France" },
  ES: { ru: "Испания", en: "Spain" },
  IT: { ru: "Италия", en: "Italy" },
  NL: { ru: "Нидерланды", en: "Netherlands" },
  CZ: { ru: "Чехия", en: "Czechia" },
  RO: { ru: "Румыния", en: "Romania" },
  TR: { ru: "Турция", en: "Türkiye" },
  CA: { ru: "Канада", en: "Canada" },
  AU: { ru: "Австралия", en: "Australia" },
  AE: { ru: "ОАЭ", en: "United Arab Emirates" },
  KZ: { ru: "Казахстан", en: "Kazakhstan" },
};
const CITY_OPTIONS: Record<string, Array<{ value: string; ru: string; en: string }>> = {
  UA: [{ value: "Kyiv", ru: "Киев", en: "Kyiv" }, { value: "Lviv", ru: "Львов", en: "Lviv" }, { value: "Odesa", ru: "Одесса", en: "Odesa" }, { value: "Kharkiv", ru: "Харьков", en: "Kharkiv" }, { value: "Dnipro", ru: "Днепр", en: "Dnipro" }],
  PL: [{ value: "Warsaw", ru: "Варшава", en: "Warsaw" }, { value: "Krakow", ru: "Краков", en: "Krakow" }, { value: "Wroclaw", ru: "Вроцлав", en: "Wroclaw" }],
  DE: [{ value: "Berlin", ru: "Берлин", en: "Berlin" }, { value: "Munich", ru: "Мюнхен", en: "Munich" }, { value: "Hamburg", ru: "Гамбург", en: "Hamburg" }],
  GB: [{ value: "London", ru: "Лондон", en: "London" }, { value: "Manchester", ru: "Манчестер", en: "Manchester" }],
  US: [{ value: "New York", ru: "Нью-Йорк", en: "New York" }, { value: "Los Angeles", ru: "Лос-Анджелес", en: "Los Angeles" }, { value: "Miami", ru: "Майами", en: "Miami" }],
  RU: [{ value: "Moscow", ru: "Москва", en: "Moscow" }, { value: "Saint Petersburg", ru: "Санкт-Петербург", en: "Saint Petersburg" }],
  FR: [{ value: "Paris", ru: "Париж", en: "Paris" }],
  ES: [{ value: "Madrid", ru: "Мадрид", en: "Madrid" }, { value: "Barcelona", ru: "Барселона", en: "Barcelona" }],
  IT: [{ value: "Rome", ru: "Рим", en: "Rome" }, { value: "Milan", ru: "Милан", en: "Milan" }],
  NL: [{ value: "Amsterdam", ru: "Амстердам", en: "Amsterdam" }],
  CZ: [{ value: "Prague", ru: "Прага", en: "Prague" }],
  RO: [{ value: "Bucharest", ru: "Бухарест", en: "Bucharest" }],
  TR: [{ value: "Istanbul", ru: "Стамбул", en: "Istanbul" }, { value: "Ankara", ru: "Анкара", en: "Ankara" }],
  CA: [{ value: "Toronto", ru: "Торонто", en: "Toronto" }, { value: "Vancouver", ru: "Ванкувер", en: "Vancouver" }],
  AU: [{ value: "Sydney", ru: "Сидней", en: "Sydney" }, { value: "Melbourne", ru: "Мельбурн", en: "Melbourne" }],
  AE: [{ value: "Dubai", ru: "Дубай", en: "Dubai" }, { value: "Abu Dhabi", ru: "Абу-Даби", en: "Abu Dhabi" }],
  KZ: [{ value: "Almaty", ru: "Алматы", en: "Almaty" }, { value: "Astana", ru: "Астана", en: "Astana" }],
};
const CATEGORY_SUBCATEGORIES = {
  "Каналы": ["General", "News", "Crypto", "Technology", "Business", "Education", "Entertainment", "Games", "Memes", "Dating", "Markets"],
  "Чаты": ["General", "Community", "Dating", "City", "Support", "Work", "Hobbies", "Learning", "Games", "Markets"],
} as const;
const SUBCATEGORY_LABELS: Record<string, { ru: string; en: string }> = {
  News: { ru: "Новости", en: "News" }, Crypto: { ru: "Крипто", en: "Crypto" }, Technology: { ru: "Технологии", en: "Technology" }, Business: { ru: "Бизнес", en: "Business" }, Education: { ru: "Образование", en: "Education" }, Entertainment: { ru: "Развлечения", en: "Entertainment" }, Games: { ru: "Игры", en: "Games" }, Memes: { ru: "Мемы", en: "Memes" },
  Community: { ru: "Сообщества", en: "Community" }, Dating: { ru: "Знакомства", en: "Dating" }, Markets: { ru: "Маркеты", en: "Markets" }, City: { ru: "Город", en: "City" }, Support: { ru: "Поддержка", en: "Support" }, Work: { ru: "Работа", en: "Work" }, Hobbies: { ru: "Хобби", en: "Hobbies" }, Learning: { ru: "Обучение", en: "Learning" }, General: { ru: "Общее", en: "General" },
};
type Group = {
  id: number;
  chatId: string;
  title: string;
  username: string | null;
  inviteLink: string | null;
  description: string | null;
  avatarFileId: string | null;
  animatedAvatarUrl?: string | null;
  topPyramidAvatar?: boolean;
  membersCount: number;
  ownerOpenId: string;
  category: "Каналы" | "Чаты";
  subcategory: string;
  country: string;
  city?: string | null;
  status: "listed" | "rented" | "sold" | "pending";
  messagesCount: number;
  joinedCount: number;
  leavesCount: number;
  invitedCount: number;
  lastPostViews: number;
  lastPostAt: Date | null;
  lastStatsAt: Date | null;
  listedAt: Date | null;
  salePriceTon?: string | null;
  listingType?: ListingType;
  anonymousListing?: boolean;
  showOwnerContact?: boolean;
  managerTelegramUserId?: string | null;
  managerUsername?: string | null;
  managerName?: string | null;
  managerAvatarUrl?: string | null;
  managerPublic?: boolean;
  listingAnnouncementEnabled?: boolean;
  searchIndexable?: boolean;
  monthlyEntryEnabled?: boolean;
  monthlyEntryStars?: number | null;
  monthlyEntryLinkName?: string | null;
  monthlyEntryInviteLink?: string | null;
  rewardActive?: boolean;
  rewardAmount?: number;
  rewardBudget?: number;
  rewardPerSubscription?: number;
  rewardPerInvite?: number;
  rewardPerManualAdd?: number;
  reward?: {
    subscriptionAmount: number;
    inviteAmount: number;
    manualAddAmount: number;
  };
  deleteServiceMessages?: boolean;
  ownerPinned?: boolean;
  ownerSortOrder?: number;
  createdAt: Date;
  owner?: {
    openId: string;
    name: string | null;
    telegramUsername: string | null;
    avatarUrl: string | null;
  };
};
const hasConfiguredRewardCampaign = (group: Group) => {
  const rewardPerAction = group.category === "Чаты"
    ? Number(group.rewardPerManualAdd ?? group.reward?.manualAddAmount ?? 0)
    : Number(group.rewardPerSubscription ?? group.reward?.subscriptionAmount ?? 0);
  return Boolean(group.rewardActive && Number(group.rewardBudget ?? 0) > 0 && rewardPerAction > 0);
};
type Slot = {
  id: number;
  slotNumber: number;
  bidAmount: number;
  category?: "Все" | "Каналы" | "Чаты";
  country?: string;
  subcategory?: string;
  updatedAt?: Date;
  isOccupied?: boolean;
  group: Group | null;
};
type Nft = {
  id: number;
  username: string;
  price: string;
  rentalPricePerDay: string;
  minRentalDays: number;
  maxRentalDays: number;
  ownerUsername: string;
  assetClass: "onchain" | "offchain";
  nftItemAddress?: string | null;
  ownerWalletAddress?: string | null;
  ownershipVerifiedAt?: Date | null;
  listingType: "sale" | "rent" | "both";
  status: "available" | "rented" | "sold";
  showcaseProfile?: boolean;
  showcaseGroupId?: number | null;
};
type ShowcaseNft = Pick<Nft, "id" | "username" | "price" | "rentalPricePerDay" | "assetClass" | "listingType">;
type WalletNft = {
  address: string;
  index: number;
  name: string;
  description: string | null;
  imageUrl: string | null;
  imageUrls: string[];
  mediaKind: "video" | "image" | null;
  collectionName: string | null;
  collectionAddress: string | null;
  category: Exclude<WalletNftFilter, "all">;
};
type PreparedNftTransfer = {
  transfer: {
    id: number;
    assetClass: "onchain" | "offchain";
    status: "draft" | "awaiting_signature";
    transferReference: string | null;
    expiresAt: Date | null;
  };
  nft: Nft;
  recipient: {
    openId: string;
    name: string | null;
    telegramUsername: string | null;
    avatarUrl: string | null;
  };
  requirements: {
    requiresWalletSignature: boolean;
    requiresVerifiedRecipientWallet: boolean;
    platformFeePercent: number;
  };
};
const formatTon = (value: number | string | null | undefined) => {
  const amount = typeof value === "number" ? value : Number(value);
  return Number.isFinite(amount) ? amount.toFixed(2) : "0.00";
};
const formatFinancialGram = (value: number | string | null | undefined) => {
  const amount = typeof value === "number" ? value : Number(value);
  return Number.isFinite(amount) ? amount.toFixed(2) : "0.00";
};
const formatPositionDuration = (updatedAt: Date | string | null | undefined, now: number) => {
  const startedAt = updatedAt ? new Date(updatedAt).getTime() : now;
  const seconds = Math.max(0, Math.floor((now - startedAt) / 1000));
  const hours = Math.floor(seconds / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  const remainingSeconds = seconds % 60;
  return [hours, minutes, remainingSeconds].map(value => String(value).padStart(2, "0")).join(":");
};
const getRankingFloorGram = (_slotNumber: number) => 0.1;
const getMinimumRankingBidGram = (slot: Pick<Slot, "slotNumber" | "bidAmount" | "group">) => {
  const floor = getRankingFloorGram(slot.slotNumber);
  if (!slot.group) return floor;
  return Math.max(floor, Math.round((slot.bidAmount / 1000 + 0.1) * 10) / 10);
};
const MAX_RANKING_BID_GRAM = 1_000;
const MAX_RANKING_SLIDER_GRAM = 100;
const getSimulatedRankingEntries = (slots: Slot[], candidateGroupId: number, candidateCategory: Group["category"], bidAmountGram: number) => {
  const candidateBid = Math.round(bidAmountGram * 1000);
  if (!Number.isSafeInteger(candidateBid) || candidateBid <= 0 || candidateBid > MAX_RANKING_BID_GRAM * 1000) return [];
  const remaining = slots.reduce<Array<{ groupId: number; category: Group["category"]; bidAmount: number; heldSince: Date }>>((entries, slot) => {
    if (slot.group && slot.group.id !== candidateGroupId) entries.push({ groupId: slot.group.id, category: slot.group.category, bidAmount: slot.bidAmount, heldSince: new Date(slot.updatedAt ?? 0) });
    return entries;
  }, []).concat({ groupId: candidateGroupId, category: candidateCategory, bidAmount: candidateBid, heldSince: new Date() })
    .sort((left, right) => right.bidAmount - left.bidAmount || left.heldSince.getTime() - right.heldSince.getTime() || left.groupId - right.groupId);
  const placements: Array<{ slotNumber: number; groupId: number; category: Group["category"] }> = [];
  for (const slot of [...slots].sort((left, right) => left.slotNumber - right.slotNumber)) {
    const entryIndex = remaining.findIndex(entry => entry.bidAmount >= getRankingFloorGram(slot.slotNumber) * 1000);
    const entry = entryIndex >= 0 ? remaining.splice(entryIndex, 1)[0] : undefined;
    if (entry) placements.push({ slotNumber: slot.slotNumber, groupId: entry.groupId, category: entry.category });
  }
  return placements;
};
const getSimulatedRankingSlotNumber = (slots: Slot[], candidateGroupId: number, bidAmountGram: number, candidateCategory?: Group["category"]) => {
  const category = candidateCategory ?? slots.find(slot => slot.group?.id === candidateGroupId)?.group?.category ?? "Каналы";
  return getSimulatedRankingEntries(slots, candidateGroupId, category, bidAmountGram).find(entry => entry.groupId === candidateGroupId)?.slotNumber ?? null;
};
const getSimulatedRankingTypePosition = (slots: Slot[], candidateGroupId: number, candidateCategory: Group["category"], bidAmountGram: number) => {
  const typeEntries = getSimulatedRankingEntries(slots, candidateGroupId, candidateCategory, bidAmountGram).filter(entry => entry.category === candidateCategory);
  const index = typeEntries.findIndex(entry => entry.groupId === candidateGroupId);
  return index >= 0 ? index + 1 : null;
};
const getCategoryLabel = (category: Group["category"], language: Language) =>
  language === "en" ? (category === "Каналы" ? "Channels" : "Chats") : category;
const getCommunityAccessLabel = (group: Pick<Group, "username">, language: Language) =>
  group.username ? `@${group.username}` : language === "en" ? "Private" : "Приватный";
const openTelegramCommunityLink = (url: string) => {
  const webApp = window.Telegram?.WebApp as unknown as {
    initData?: string;
    openTelegramLink?: (target: string) => void;
    openLink?: (target: string) => void;
  } | undefined;
  const isTelegramMiniApp = Boolean(webApp?.initData);
  if (isTelegramMiniApp && /^https:\/\/t\.me\//i.test(url) && webApp?.openTelegramLink) {
    webApp.openTelegramLink(url);
    return true;
  }
  if (isTelegramMiniApp && webApp?.openLink) {
    webApp.openLink(url);
    return true;
  }
  const tab = window.open(url, "_blank", "noopener,noreferrer");
  if (tab) tab.opener = null;
  return Boolean(tab);
};
const openTonviewerTransaction = (transactionHash: string) => {
  if (!/^[0-9a-f]{64}$/i.test(transactionHash)) return;
  openTelegramCommunityLink(`https://tonviewer.com/transaction/${transactionHash}`);
};
const openTelegramInNewBrowserTab = (url: string) => {
  const tab = window.open(url, "_blank", "noopener,noreferrer");
  if (tab) tab.opener = null;
};
const getSubcategoryLabel = (subcategory: string, language: Language) =>
  SUBCATEGORY_LABELS[subcategory]?.[language] ?? subcategory;
const getCountryLabel = (country: string, language: Language) =>
  COUNTRY_LABELS[country]?.[language] ?? country;
const getCityLabel = (country: string, city: string, language: Language) =>
  CITY_OPTIONS[country]?.find(item => item.value === city)?.[language] ?? city;
function SortableMyGroupTile({
  group,
  language,
  disabled,
  onOpen,
  onTogglePin,
  onCreateGiveaway,
  selectionMode,
  selected,
  onSelect,
}: {
  group: Group;
  language: Language;
  disabled?: boolean;
  onOpen: () => void;
  onTogglePin: () => void;
  onCreateGiveaway: () => void;
  selectionMode: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: group.id, disabled: disabled || selectionMode });
  const selectionHoldTimer = useRef<number | null>(null);
  const selectionTriggered = useRef(false);
  const isEnglish = language === "en";
  const isSale = group.status === "listed" && group.listingType === "sale";
  const status = isSale ? (isEnglish ? "For sale" : "На продаже") : group.status === "listed" ? (isEnglish ? "In catalog" : "В каталоге") : null;
  const statusClass = isSale
    ? "border-emerald-200/20 bg-emerald-500/30 text-emerald-50"
      : "border-blue-200/20 bg-[#3f8cff]/30 text-blue-50";
  const clearSelectionHold = () => {
    if (selectionHoldTimer.current !== null) window.clearTimeout(selectionHoldTimer.current);
    selectionHoldTimer.current = null;
  };
  const beginSelectionHold = () => {
    if (selectionMode) return;
    clearSelectionHold();
    selectionHoldTimer.current = window.setTimeout(() => {
      selectionTriggered.current = true;
      onSelect();
      (window.Telegram?.WebApp as unknown as { HapticFeedback?: { impactOccurred: (style: "medium") => void } } | undefined)?.HapticFeedback?.impactOccurred("medium");
    }, 420);
  };

  return (
    <article
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      onContextMenu={event => event.preventDefault()}
      aria-label={selectionMode ? (isEnglish ? `Select ${group.title}` : `Выбрать ${group.title}`) : (isEnglish ? `${group.title}. Hold to select or drag the handle to reorder.` : `${group.title}. Удерживайте для выбора или тяните за ручку для изменения порядка.`)}
      className={`group relative aspect-square min-w-0 touch-manipulation overflow-hidden rounded-xl border border-white/8 bg-[#111720] shadow-sm transition-[opacity,transform,border-color,box-shadow] ${selected ? "border-[#72a8ff]/70 ring-2 ring-[#3f8cff]/35" : ""} ${isDragging ? "z-20 scale-[.96] border-[#72a8ff]/60 bg-[#182334] opacity-30" : ""}`}
    >
      <FullBleedGroupArtwork group={group} />
      <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(5,9,15,.05)_18%,rgba(5,9,15,.28)_45%,rgba(5,9,15,.92)_100%)]" />
      <button type="button" onPointerDown={beginSelectionHold} onPointerUp={clearSelectionHold} onPointerCancel={clearSelectionHold} onPointerLeave={clearSelectionHold} onClick={() => { clearSelectionHold(); if (selectionTriggered.current) { selectionTriggered.current = false; return; } if (selectionMode) onSelect(); else onOpen(); }} className="relative z-10 flex h-full w-full flex-col justify-end p-2.5 text-left">
        <span className="min-w-0 w-full">
          <b className="line-clamp-2 text-[11px] leading-3.5 text-white drop-shadow-sm">{group.title}</b>
          <small className="mt-0.5 block truncate text-[9px] text-slate-300/80">{getCommunityAccessLabel(group, language)}</small>
        </span>
      </button>
      {status && <span className={`absolute right-0 top-1 z-10 max-w-[76%] truncate border-b border-l px-2.5 pb-1 pt-1 text-[7px] font-semibold leading-none shadow-md shadow-black/20 backdrop-blur-md [clip-path:polygon(12px_0,100%_0,100%_100%,0_100%,0_12px)] ${statusClass}`}>{status}</span>}
      {selectionMode ? (
        <span className={`absolute left-2 top-2 z-20 grid h-6 w-6 place-items-center rounded-full border backdrop-blur-sm ${selected ? "border-[#a6c8ff]/70 bg-[#3f8cff] text-white" : "border-white/25 bg-black/25 text-transparent"}`}><Check className="h-3.5 w-3.5" /></span>
      ) : (
        <>
          <button ref={setActivatorNodeRef} type="button" {...attributes} {...listeners} aria-label={isEnglish ? `Drag ${group.title}` : `Перетащить ${group.title}`} className="absolute bottom-2 left-2 z-20 grid h-6 w-6 touch-none place-items-center rounded-md bg-black/20 text-slate-200/80 backdrop-blur-sm transition-colors hover:bg-white/15 hover:text-white active:bg-[#3f8cff]/30"><GripVertical className="h-3.5 w-3.5" /></button>
          <div className="absolute bottom-2 right-2 z-20 flex items-center gap-1">
            <button type="button" onPointerDown={event => event.stopPropagation()} onClick={event => { event.stopPropagation(); onCreateGiveaway(); }} aria-label={isEnglish ? `Create giveaway for ${group.title}` : `Создать розыгрыш для ${group.title}`} className="grid h-6 w-6 place-items-center rounded-md bg-amber-300/12 text-amber-100 transition-colors hover:bg-amber-300/22"><Star className="h-3.5 w-3.5 fill-current" /></button>
            <button type="button" onPointerDown={event => event.stopPropagation()} onClick={event => { event.stopPropagation(); onTogglePin(); }} aria-label={group.ownerPinned ? (isEnglish ? "Unpin community" : "Открепить группу") : (isEnglish ? "Pin community" : "Закрепить группу")} className={`grid h-6 w-6 place-items-center rounded-md transition-colors ${group.ownerPinned ? "bg-[#3f8cff]/16 text-[#9cc3ff]" : "text-slate-500 hover:bg-white/7 hover:text-slate-200"}`}>{group.ownerPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}</button>
          </div>
        </>
      )}
    </article>
  );
}

function NftCard({ nft, language, onRent }: { nft: Nft; language: Language; onRent?: (nft: Nft) => void }) {
  const copy = language === "en"
    ? { sale: "Sale", rent: "Rent", both: "Sale + rent", available: "Available", rented: "Rented", sold: "Sold", owner: "Owner", perDay: "GRAM / day", days: "days", onchain: "On-chain", offchain: "Off-chain" }
    : { sale: "Продажа", rent: "Аренда", both: "Продажа + аренда", available: "Доступен", rented: "В аренде", sold: "Продан", owner: "Владелец", perDay: "GRAM / день", days: "дней", onchain: "On-chain", offchain: "Off-chain" };
  const listingLabel = nft.listingType === "sale" ? copy.sale : nft.listingType === "rent" ? copy.rent : copy.both;
  const statusLabel = nft.status === "available" ? copy.available : nft.status === "rented" ? copy.rented : copy.sold;
  return (
    <article className="rounded-2xl border border-white/8 bg-[#111720] p-4">
      <div className="flex items-start justify-between gap-3">
        <span className="min-w-0">
          <b className="block truncate text-base font-semibold text-slate-100">@{nft.username}</b>
          <small className="mt-1 block text-xs text-slate-500">{copy.owner}: {nft.ownerUsername}</small>
        </span>
        <span className="flex flex-col items-end gap-1">
          <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[9px] font-medium uppercase tracking-[0.08em] text-slate-400">{nft.assetClass === "onchain" ? copy.onchain : copy.offchain}</span>
          <span className="rounded-md border border-[#3f8cff]/25 bg-[#3f8cff]/10 px-2 py-1 text-[10px] font-medium text-[#a6c8ff]">{statusLabel}</span>
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        {(nft.listingType === "sale" || nft.listingType === "both") && (
          <div className="rounded-xl bg-white/5 p-2.5">
            <span className="block text-[10px] text-slate-500">{copy.sale}</span>
            <b className="mt-1 block text-sm text-slate-100">{nft.price}</b>
          </div>
        )}
        {(nft.listingType === "rent" || nft.listingType === "both") && (
          <div className="rounded-xl bg-white/5 p-2.5">
            <span className="block text-[10px] text-slate-500">{copy.rent}</span>
            <b className="mt-1 block text-sm text-slate-100">{nft.rentalPricePerDay} {copy.perDay}</b>
            <small className="mt-1 block text-[10px] text-slate-500">{nft.minRentalDays}–{nft.maxRentalDays} {copy.days}</small>
          </div>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="inline-flex rounded-md bg-white/5 px-2 py-1 text-[10px] text-slate-400">{listingLabel}</span>
        {(nft.listingType === "rent" || nft.listingType === "both") && nft.status === "available" && onRent && (
          <button type="button" onClick={() => onRent(nft)} className="rounded-lg border border-[#3f8cff]/35 bg-[#3f8cff]/10 px-2.5 py-1.5 text-[10px] font-semibold text-[#a6c8ff] transition-colors hover:bg-[#3f8cff]/18 active:scale-[0.98]">
            {language === "en" ? "Request rental" : "Запросить аренду"}
          </button>
        )}
      </div>
    </article>
  );
}

function NftShowcase({ nfts, language, title }: { nfts: ShowcaseNft[]; language: Language; title?: string }) {
  if (!nfts.length) return null;
  return (
    <section className="overflow-hidden rounded-2xl border border-[#3f8cff]/25 bg-[#111720]">
      <div className="flex items-center justify-between gap-3 border-b border-white/8 px-4 py-3">
        <span>
          <h2 className="text-sm font-semibold">{title ?? (language === "en" ? "NFT showcase" : "NFT-витрина")}</h2>
          <p className="mt-0.5 text-[10px] text-slate-500">{language === "en" ? "Selected by the owner" : "Выбрано владельцем"}</p>
        </span>
        <span className="rounded-md border border-[#3f8cff]/25 bg-[#3f8cff]/8 px-2 py-1 text-[9px] font-medium uppercase tracking-[0.1em] text-[#a6c8ff]">NFT</span>
      </div>
      <div className="grid grid-cols-2 gap-px bg-white/8 sm:grid-cols-3">
        {nfts.map(nft => (
          <div key={nft.id} className="min-w-0 bg-[#111720] p-3">
            <span className="grid h-8 w-8 place-items-center rounded-lg border border-[#3f8cff]/25 bg-[#3f8cff]/10 text-sm font-semibold text-[#a6c8ff]">@</span>
            <b className="mt-2 block truncate text-xs text-slate-100">@{nft.username}</b>
            <small className="mt-1 block truncate text-[10px] text-slate-500">{nft.assetClass === "onchain" ? "On-chain" : "Off-chain"} · {nft.listingType === "rent" ? nft.rentalPricePerDay : nft.price} GRAM</small>
          </div>
        ))}
      </div>
    </section>
  );
}

function BrandMark() {
  return (
    <span
      aria-label="TG TOP"
      className="brand-mark grid h-8 w-8 place-items-center rounded-[9px] border border-[#354966] bg-[#17212b] text-[12px] font-bold tracking-[-0.08em] text-slate-100"
    >
      T
    </span>
  );
}

function WalletConnectControl({ language, balanceTon, variant = "compact", ownerOpenId, address, restored, onDisconnect }: { language: Language; balanceTon: string; variant?: "compact" | "profile"; ownerOpenId?: string; address: string | null; restored: boolean; onDisconnect: () => Promise<void> }) {
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

function WalletNftCard({ item, language }: { item: WalletNft; language: Language }) {
  const [imageFailed, setImageFailed] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  const categoryLabel: Record<WalletNft["category"], string> = {
    gifts: language === "en" ? "Gifts" : "Гифты",
    usernames: language === "en" ? "Username" : "Юзернейм",
    anonymous_numbers: language === "en" ? "Anonymous number" : "Анон-номер",
    domains: language === "en" ? "Domain" : "Домен",
    other: language === "en" ? "Other NFT" : "Другой NFT",
  };
  const categoryClass: Record<WalletNft["category"], string> = {
    gifts: "border-amber-200/20 bg-amber-300/[0.08] text-amber-100",
    usernames: "border-[#82b6ff]/25 bg-[#3f8cff]/10 text-[#c8ddff]",
    anonymous_numbers: "border-violet-200/20 bg-violet-400/[0.09] text-violet-100",
    domains: "border-emerald-200/20 bg-emerald-400/[0.09] text-emerald-100",
    other: "border-white/10 bg-white/[0.045] text-slate-300",
  };
  const shortAddress = item.address.length > 16 ? `${item.address.slice(0, 7)}…${item.address.slice(-5)}` : item.address;
  const imageUrls = Array.from(new Set([...(item.imageUrls ?? []), item.imageUrl].filter((url): url is string => Boolean(url))));
  const imageUrl = imageUrls[imageIndex] ?? null;
  const tryNextImage = () => {
    if (imageIndex + 1 < imageUrls.length) setImageIndex(index => index + 1);
    else setImageFailed(true);
  };

  return <article className="overflow-hidden rounded-xl border border-white/9 bg-[#111720] p-2.5 transition-colors hover:border-white/16 hover:bg-[#151d29]">
    <div className="relative aspect-square overflow-hidden rounded-lg border border-white/8 bg-[#1b2430]">
      {imageUrl && !imageFailed ? item.mediaKind === "video" && imageIndex === 0 ? <video src={imageUrl} autoPlay muted loop playsInline className="h-full w-full object-cover" onError={tryNextImage} /> : <img src={imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-cover" onError={tryNextImage} /> : <span className="grid h-full w-full place-items-center bg-[radial-gradient(circle_at_30%_20%,rgba(84,143,255,.32),transparent 42%),#152131] text-lg font-semibold text-[#aacaff]">{item.name.slice(0, 1).toUpperCase()}</span>}
      <span className={`absolute left-1.5 top-1.5 rounded-md border px-1.5 py-1 text-[8px] font-semibold backdrop-blur-sm ${categoryClass[item.category]}`}>{categoryLabel[item.category]}</span>
    </div>
    <b className="mt-2 block truncate text-[11px] text-slate-100">{item.name}</b>
    <small className="mt-0.5 block truncate text-[9px] text-slate-500">{item.collectionName ?? categoryLabel[item.category]}</small>
    <small className="mt-1 block truncate font-mono text-[8px] text-slate-600">{shortAddress}</small>
  </article>;
}

type ChannelGiftMedia = { mediaUrl: string | null; mediaKind: "video" | "tgs" | "image" | null; emoji: string };

function ChannelGiftMediaPreview({ gift }: { gift: ChannelGiftMedia }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (gift.mediaKind !== "tgs" || !gift.mediaUrl || !containerRef.current) return;
    let cancelled = false;
    let animation: ReturnType<typeof lottie.loadAnimation> | undefined;
    void (async () => {
      try {
        const response = await fetch(gift.mediaUrl!);
        if (!response.ok || typeof DecompressionStream === "undefined") throw new Error("Unsupported TGS animation");
        const compressed = await response.arrayBuffer();
        const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream("gzip"));
        const animationData = await new Response(stream).json();
        if (!cancelled && containerRef.current) animation = lottie.loadAnimation({ container: containerRef.current, renderer: "svg", loop: true, autoplay: true, animationData });
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => { cancelled = true; animation?.destroy(); };
  }, [gift.mediaKind, gift.mediaUrl]);

  if (gift.mediaKind === "video" && gift.mediaUrl && !failed) return <video src={gift.mediaUrl} autoPlay muted loop playsInline onError={() => setFailed(true)} className="h-full w-full object-contain" />;
  if (gift.mediaKind === "image" && gift.mediaUrl && !failed) return <img src={gift.mediaUrl} alt="" onError={() => setFailed(true)} className="h-full w-full object-contain" />;
  if (gift.mediaKind === "tgs" && gift.mediaUrl && !failed) return <div ref={containerRef} className="h-full w-full" />;
  return <span aria-label="Медиа подарка недоступно" className="grid h-full w-full place-items-center px-2 text-center text-[9px] font-medium uppercase tracking-[0.08em] text-slate-500">Медиа недоступно</span>;
}

function SettingsSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { appearance, setAppearance, style, setStyle, accent, setAccent } = useTheme();
  const appearanceItems: Array<{ value: Appearance; label: string; icon: typeof Moon }> = [
    { value: "system", label: "Система", icon: Settings2 },
    { value: "dark", label: "Темная", icon: Moon },
    { value: "light", label: "Светлая", icon: Sun },
  ];
  const styleItems: Array<{ value: ThemeStyle; label: string }> = [
    { value: "original", label: "TG TOP" },
    { value: "clean", label: "Clean" },
  ];
  const accentItems: Array<{ value: ThemeAccent; label: string; color: string }> = [
    { value: "blue", label: "Azure Blue", color: "#3f8cff" },
    { value: "purple", label: "Electric Purple", color: "#9b6cff" },
    { value: "rose", label: "Rose", color: "#f06b91" },
    { value: "gold", label: "Pure Gold", color: "#e9b949" },
    { value: "green", label: "Emerald", color: "#4cc978" },
    { value: "turquoise", label: "Turquoise", color: "#35c6c2" },
  ];
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[78dvh] rounded-t-[22px] border-white/10 bg-[#10161f] pb-4 text-slate-100 shadow-[0_-18px_55px_rgba(2,8,16,0.28)]"
      >
        <SheetHeader className="border-b border-white/8 px-4 pb-3">
          <SheetTitle className="text-base font-semibold tracking-tight text-slate-100">
            Настройки
          </SheetTitle>
        </SheetHeader>
        <div className="mx-4 space-y-3 overflow-y-auto pb-1">
          <section className="tg-clean-surface rounded-xl border border-white/8 bg-black/10 p-3 shadow-[0_8px_22px_rgba(2,8,16,0.12)]">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-300">
              <Settings2 className="h-4 w-4 text-[#72a8ff]" />
              Стиль интерфейса
            </div>
            <div className="grid grid-cols-2 gap-1 rounded-xl border border-white/8 bg-[#0b0f14] p-1">
              {styleItems.map(item => (
                <button key={item.value} onClick={() => setStyle(item.value)} aria-pressed={style === item.value} className={`h-8 rounded-md text-[11px] font-semibold transition-colors ${style === item.value ? "bg-[#3f8cff]/18 text-[#a6c8ff]" : "text-slate-500 hover:text-slate-200"}`}>
                  {item.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[10px] leading-4 text-slate-500">TG TOP сохраняет фирменную сетку, Clean делает оболочку спокойнее и ближе к Telegram-native интерфейсам.</p>
          </section>
          <section className="tg-clean-surface rounded-xl border border-white/8 bg-black/10 p-3 shadow-[0_8px_22px_rgba(2,8,16,0.12)]">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-300">
              <Sun className="h-4 w-4 text-[#72a8ff]" />
              Тема
            </div>
            <div className="grid grid-cols-3 gap-1 rounded-xl border border-white/8 bg-[#0b0f14] p-1">
              {appearanceItems.map(item => {
                const Icon = item.icon;
                const active = appearance === item.value;
                return <button key={item.value} onClick={() => setAppearance(item.value)} aria-label={item.label} aria-pressed={active} className={`flex h-8 items-center justify-center gap-1 rounded-md px-1 text-[10px] font-medium ${active ? "bg-[#3f8cff]/15 text-[#a6c8ff]" : "text-slate-500 hover:text-slate-200"}`}><Icon className="h-3 w-3" />{item.label}</button>;
              })}
            </div>
          </section>
          <section className="tg-clean-surface rounded-xl border border-white/8 bg-black/10 p-3 shadow-[0_8px_22px_rgba(2,8,16,0.12)]">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-300">
              <Palette className="h-4 w-4 text-[#72a8ff]" />
              Цветовой акцент
            </div>
            <div className="grid grid-cols-3 gap-2">
              {accentItems.map(item => <button key={item.value} onClick={() => setAccent(item.value)} aria-label={item.label} aria-pressed={accent === item.value} className={`flex min-h-[54px] flex-col items-center justify-center gap-1 rounded-lg border px-1 transition-colors ${accent === item.value ? "border-[#72a8ff] bg-[#3f8cff]/12" : "border-white/8 bg-[#0b0f14] hover:border-white/20"}`}><span className="h-6 w-6 rounded-md shadow-inner" style={{ backgroundColor: item.color }} /><span className="max-w-full truncate text-[9px] text-slate-400">{item.label}</span></button>)}
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function BotAvatar({ username, className = "", imageClassName = "" }: { username: string; className?: string; imageClassName?: string }) {
  const [imageFailed, setImageFailed] = useState(false);
  return (
    <span className={`relative grid shrink-0 place-items-center overflow-hidden rounded-xl border border-[#72a8ff]/25 bg-[#3f8cff]/10 text-[#a6c8ff] ${className}`}>
      <Bot className="h-5 w-5" />
      {!imageFailed && <img src={`https://t.me/i/userpic/320/${encodeURIComponent(username)}.jpg`} alt="" onError={() => setImageFailed(true)} className={`absolute inset-0 h-full w-full object-cover ${imageClassName}`} />}
    </span>
  );
}

type PublicBotTile = { id: number; username: string; telegramLink: string; category: string };

function BotRankingTile({ bot, categoryLabel, variant, onOpen }: { bot: PublicBotTile; categoryLabel: string; variant: "lead" | "secondary" | "compact"; onOpen: () => void }) {
  const height = variant === "lead" ? "h-[214px]" : variant === "secondary" ? "h-[142px]" : "h-[96px]";
  return <button type="button" onClick={onOpen} className={`group relative w-full overflow-hidden rounded-2xl border border-white/10 bg-[#111720] text-left transition-all hover:border-[#3f8cff]/45 active:scale-[0.985] ${height}`}>
    <BotAvatar username={bot.username} className="absolute inset-0 h-full w-full rounded-none border-0 bg-[#111720]" imageClassName="brightness-[0.76] saturate-[1.08]" />
    <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,13,22,0.05)_10%,rgba(8,13,22,0.4)_48%,rgba(8,13,22,0.94)_100%)]" />
    <span className={`relative flex h-full flex-col justify-end ${variant === "lead" ? "p-4" : "p-3"}`}>
      <b className={`${variant === "lead" ? "text-lg" : variant === "secondary" ? "text-sm" : "text-xs"} block truncate text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.85)]`}>@{bot.username}</b>
      <small className="mt-1 block truncate text-[10px] text-slate-200/85">{categoryLabel}</small>
      {variant !== "compact" && <small className="mt-2 inline-flex w-fit rounded-md border border-[#b9d7ff]/25 bg-[#0e1c31]/80 px-1.5 py-1 text-[9px] font-semibold text-[#d4e6ff]">Открыть</small>}
    </span>
  </button>;
}

export default function Home({ onReady }: { onReady?: () => void }) {
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const [tonConnectUi] = useTonConnectUI();
  const walletAddress = useTonAddress();
  const walletConnectionRestored = useIsConnectionRestored();
  const [safeWalletAddress, setSafeWalletAddress] = useState<string | null>(null);
  const hasSignaledReady = useRef(false);
  const [page, setPage] = useState<Page>("top");
  const [detailStatsPeriod, setDetailStatsPeriod] = useState<DetailStatsPeriod>("day");
  const [workspaceSection, setWorkspaceSection] = useState<WorkspaceSection>("communities");
  const [walletNftFilter, setWalletNftFilter] = useState<WalletNftFilter>("all");
  const [tonDepositOpen, setTonDepositOpen] = useState(false);
  const [tonDepositAmount, setTonDepositAmount] = useState("1");
  const [activeTonDepositId, setActiveTonDepositId] = useState<number | null>(null);
  const [tonWithdrawalOpen, setTonWithdrawalOpen] = useState(false);
  const [tonWithdrawalAmount, setTonWithdrawalAmount] = useState("0.1");
  const [tonWithdrawalAddress, setTonWithdrawalAddress] = useState("");
  const [tonWithdrawalFlow, setTonWithdrawalFlow] = useState<"form" | "processing">("form");
  const [activeTonWithdrawalId, setActiveTonWithdrawalId] = useState<number | null>(null);
  const [financialHistoryOpen, setFinancialHistoryOpen] = useState(false);
  const tonWithdrawalSubmitInFlight = useRef(false);
  const [category, setCategory] = useState<"Все" | "Каналы" | "Чаты">("Все");
  const [globalDirection, setGlobalDirection] = useState<GlobalDirection>("Все");
  const [topSection, setTopSection] = useState<TopSection>("communities");
  const [subcategory, setSubcategory] = useState("Все");
  const [country, setCountry] = useState("Все");
  const [city, setCity] = useState("Все");
  const [audience, setAudience] = useState<Audience>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [topSearchQuery, setTopSearchQuery] = useState("");
  const [topSearchOpen, setTopSearchOpen] = useState(false);
  useEffect(() => {
    if (!isAuthenticated && page !== "top" && page !== "details" && page !== "owner") {
      setPage("top");
    }
  }, [isAuthenticated, page]);
  useEffect(() => {
    if (!walletConnectionRestored) return;
    const ownerKey = "tgtop:ton-wallet-owner";
    const pendingOwnerKey = "tgtop:ton-wallet-pending-owner";
    if (!isAuthenticated || !user?.openId) {
      setSafeWalletAddress(null);
      setTonWithdrawalAddress("");
      return;
    }
    const storedOwner = window.localStorage.getItem(ownerKey);
    const pendingOwner = window.localStorage.getItem(pendingOwnerKey);
    if (walletAddress && storedOwner !== user.openId && pendingOwner !== user.openId) {
      setSafeWalletAddress(null);
      setTonWithdrawalAddress("");
      void tonConnectUi.disconnect().catch(() => undefined);
      window.localStorage.removeItem(ownerKey);
      window.localStorage.removeItem(pendingOwnerKey);
      toast.error(getRussianLanguage() === "en" ? "The previous wallet session was disconnected for your safety." : "Предыдущая сессия кошелька отключена для безопасности.");
      return;
    }
    if (walletAddress && (storedOwner === user.openId || pendingOwner === user.openId)) {
      window.localStorage.setItem(ownerKey, user.openId);
      window.localStorage.removeItem(pendingOwnerKey);
      setSafeWalletAddress(walletAddress);
      return;
    }
    setSafeWalletAddress(null);
    setTonWithdrawalAddress("");
  }, [isAuthenticated, tonConnectUi, user?.openId, walletAddress, walletConnectionRestored]);
  const openTonWalletForCurrentUser = () => {
    if (user?.openId) window.localStorage.setItem("tgtop:ton-wallet-pending-owner", user.openId);
    tonConnectUi.openModal();
  };
  const disconnectTonWallet = async () => {
    try {
      await tonConnectUi.disconnect();
      window.localStorage.removeItem("tgtop:ton-wallet-owner");
      window.localStorage.removeItem("tgtop:ton-wallet-pending-owner");
      setSafeWalletAddress(null);
      setTonWithdrawalAddress("");
      toast.success(getRussianLanguage() === "en" ? "Wallet disconnected" : "Кошелёк отключён");
    } catch {
      toast.error(getRussianLanguage() === "en" ? "Could not disconnect wallet" : "Не удалось отключить кошелёк");
    }
  };
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [adminGuideKind, setAdminGuideKind] = useState<"channel" | "group" | null>(null);
  const language = getRussianLanguage();
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [detailBoardScope, setDetailBoardScope] = useState<{ category: "Все" | "Каналы" | "Чаты"; country: string; subcategory: string; city: string; displayPosition?: number } | null>(null);
  const [detailBidInput, setDetailBidInput] = useState("");
  const [pendingGroupDeletion, setPendingGroupDeletion] = useState<Group | null>(null);
  const [pendingModerationGroup, setPendingModerationGroup] = useState<{ id: number; title: string } | null>(null);
  const [selectedOwnerOpenId, setSelectedOwnerOpenId] = useState<string | null>(null);
  const [targetSlot, setTargetSlot] = useState<Slot | null>(null);
  const [rankSlotLinkId, setRankSlotLinkId] = useState<number | null>(null);
  const [amount, setAmount] = useState("0.1");
  const [listingRankingBid, setListingRankingBid] = useState("0.1");
  const [starsPaymentGroup, setStarsPaymentGroup] = useState<Group | null>(null);
  const [outbidOpen, setOutbidOpen] = useState(false);
  const [outbidGroupId, setOutbidGroupId] = useState<number | null>(null);
  const [lotGroupPickerOpen, setLotGroupPickerOpen] = useState(false);
  const [lotGroupId, setLotGroupId] = useState<number | null>(null);
  const [outbidBidInput, setOutbidBidInput] = useState("0.1");
  const [outbidVisibility, setOutbidVisibility] = useState<"public" | "anonymous">("anonymous");
  const [detailVisibility, setDetailVisibility] = useState<"public" | "anonymous">("anonymous");
  const [paymentMethod, setPaymentMethod] = useState<"gram" | "stars">("gram");
  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([]);
  const [myGroupsSelectionMode, setMyGroupsSelectionMode] = useState(false);
  const myGroupsSelectionHoldTimer = useRef<number | null>(null);
  const myGroupsSelectionHoldTriggered = useRef(false);
  const [topListingPickerOpen, setTopListingPickerOpen] = useState(false);
  const [topListingGroupIds, setTopListingGroupIds] = useState<number[]>([]);
  const [listingOpen, setListingOpen] = useState(false);
  const [inlineListingOpen, setInlineListingOpen] = useState(false);
  const [managerSheetOpen, setManagerSheetOpen] = useState(false);
  const [listingCountrySheetOpen, setListingCountrySheetOpen] = useState(false);
  const [listingSubcategorySheetOpen, setListingSubcategorySheetOpen] = useState(false);
  const [selectedManagerTelegramUserId, setSelectedManagerTelegramUserId] = useState<string | null>(null);
  const [listingCountry, setListingCountry] = useState<ListingCountry>("Global");
  const [listingCity, setListingCity] = useState("Все");
  const [listingSubcategory, setListingSubcategory] = useState("General");
  const [salePriceTon, setSalePriceTon] = useState("");
  const [isListingForSale, setIsListingForSale] = useState(false);
  const [showOwnerContact, setShowOwnerContact] = useState(false); // legacy compatibility for existing detail/outbid payloads; no listing control
  const [managerPublic, setManagerPublic] = useState(true);
  const [listingAnnouncementEnabled, setListingAnnouncementEnabled] = useState(true);
  const [searchIndexable, setSearchIndexable] = useState(false);
  const [monthlyEntryEnabled, setMonthlyEntryEnabled] = useState(false);
  const [monthlyEntryStars, setMonthlyEntryStars] = useState("");
  const [monthlyEntryLinkName, setMonthlyEntryLinkName] = useState("");
  const [rewardCampaignEnabled, setRewardCampaignEnabled] = useState(false);
  const [rewardBudget, setRewardBudget] = useState("");
  const [rewardPerSubscription, setRewardPerSubscription] = useState("");
  const [rewardPerInvite, setRewardPerInvite] = useState("");
  const [rewardPerManualAdd, setRewardPerManualAdd] = useState("");
  const [nftTransferOpen, setNftTransferOpen] = useState(false);
  const [nftRentalDraft, setNftRentalDraft] = useState<Nft | null>(null);
  const [nftTransferStep, setNftTransferStep] = useState<"select" | "review" | "prepared">("select");
  const [nftAssetFilter, setNftAssetFilter] = useState<"all" | "onchain" | "offchain">("all");
  const [nftMarketCategory, setNftMarketCategory] = useState<NftMarketCategory>("all");
  const [nftDealCategory, setNftDealCategory] = useState<NftDealCategory>("all");
  const [botCategory, setBotCategory] = useState("Все");
  const [channelGiftsOpen, setChannelGiftsOpen] = useState(false);
  const [selectedNftId, setSelectedNftId] = useState<number | null>(null);
  const [recipientInput, setRecipientInput] = useState("");
  const [preparedNftTransfer, setPreparedNftTransfer] = useState<PreparedNftTransfer | null>(null);
  const [showcaseNftId, setShowcaseNftId] = useState<number | null>(null);
  const [visibleActivityCount, setVisibleActivityCount] = useState(5);
  const [positionClock, setPositionClock] = useState(() => Date.now());
  const [detailReturnPage, setDetailReturnPage] = useState<Page>("top");
  const detailSwipeStart = useRef<{ x: number; y: number; scrollY: number } | null>(null);

  useEffect(() => {
    const interval = window.setInterval(() => setPositionClock(Date.now()), 1_000);
    return () => window.clearInterval(interval);
  }, []);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let listingId = Number(params.get("listing"));
    if (!Number.isInteger(listingId) || listingId <= 0) {
      const tgWebAppData = window.Telegram?.WebApp;
      const startParam = tgWebAppData?.startParam || tgWebAppData?.initDataUnsafe?.start_param;
      if (startParam) {
        const match = startParam.match(/^listing_(\d+)$/i);
        if (match) {
          listingId = Number(match[1]);
        }
      }
    }
    if (Number.isInteger(listingId) && listingId > 0) {
      setSelectedGroupId(listingId);
      setPage("details");
    }
    const rankSlotId = Number(params.get("rankSlot"));
    if (Number.isInteger(rankSlotId) && rankSlotId > 0) setRankSlotLinkId(rankSlotId);
  }, []);
  const ui =
    language === "en"
      ? {
          filter: "Filter",
          all: "All",
          channels: "Channels",
          chats: "Chats",
          groups: "groups",
          addGroup: "Add group",
          top: "Top",
          mine: "Mine",
          profile: "Profile",
          globalEmptyTitle: "No communities in TG TOP yet",
          globalEmptyBody: "Add the first group from your personal cabinet.",
          loading: "Loading…",
          listing: "Listing",
          back: "Back",
        }
      : {
          filter: "Фильтр",
          all: "Все",
          channels: "Каналы",
          chats: "Чаты",
          groups: "групп",
          addGroup: "Добавить группу",
          top: "Топ",
          mine: "Мои",
          profile: "Профиль",
          globalEmptyTitle: "В TG TOP пока нет площадок",
          globalEmptyBody: "Добавьте первую группу через личную папку.",
          loading: "Загрузка…",
          listing: "Листинг",
          back: "Назад",
        };
  const tx = (ru: string, en: string) => (language === "en" ? en : ru);
  const errorText = (message: string) => {
    if (language === "ru") return message;
    const translations: Record<string, string> = {
      "Выберите хотя бы одну группу": "Select at least one community.",
      "Для аренды укажите цену и корректный срок": "Enter a price and a valid rental period.",
      "Выберите группу, которая уже находится в каталоге": "Select a community that is already listed.",
      "Реферальная ссылка загружается": "Your referral link is still loading.",
      "Не удалось скопировать ссылку. Скопируйте ее вручную.": "Could not copy the link. Please copy it manually.",
      "NFT недоступен для передачи": "This NFT is not available to transfer.",
      "Нельзя передать NFT самому себе": "You cannot transfer an NFT to yourself.",
    };
    return translations[message] ?? "The action could not be completed. Please try again.";
  };

  const slotsQuery = trpc.tgTop.getSlots.useQuery({
    category,
    country: country === "Все" ? "Global" : country,
    subcategory,
    city,
  }, {
    refetchInterval: 12_000,
    refetchIntervalInBackground: false,
  });
  const slots = (slotsQuery.data ?? []) as Slot[];
  useEffect(() => {
    if (!rankSlotLinkId || !slots.length) return;
    const slot = slots.find(item => item.id === rankSlotLinkId);
    if (!slot) return;
    setTargetSlot(slot);
    setAmount(formatTon(getMinimumRankingBidGram(slot)));
    setPage("mine");
    setRankSlotLinkId(null);
  }, [rankSlotLinkId, slots]);
  const groupsQuery = trpc.tgTop.getGroups.useQuery({ category, country, subcategory, city });
  const listedGroups = (groupsQuery.data ?? []) as Group[];
  const giveawaysQuery = trpc.tgTop.openGiveaways.useQuery(undefined, { refetchInterval: 30_000, refetchIntervalInBackground: false });
  const giveaways = (giveawaysQuery.data ?? []) as Array<{
    id: number;
    groupId: number;
    ownerOpenId: string;
    title: string;
    prizeTitle: string;
    rules: string | null;
    boostOnly: boolean;
    endsAt: Date;
    participantCount: number;
    group: { title: string; username: string | null; avatarFileId: string | null } | null;
  }>;
  useEffect(() => {
    if (!onReady || hasSignaledReady.current || !slotsQuery.isFetched || !groupsQuery.isFetched) return;
    hasSignaledReady.current = true;
    const frame = window.requestAnimationFrame(onReady);
    return () => window.cancelAnimationFrame(frame);
  }, [groupsQuery.isFetched, onReady, slotsQuery.isFetched]);
  const nftsQuery = trpc.tgTop.getNfts.useQuery(undefined, {
    enabled: topSection === "nft",
  });
  const nfts = (nftsQuery.data ?? []) as Nft[];
  const myNftsQuery = trpc.tgTop.myNfts.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const myNfts = (myNftsQuery.data ?? []) as Nft[];
  const walletNftsQuery = trpc.tgTop.getWalletNfts.useQuery(
    { walletAddress: safeWalletAddress ?? "" },
    {
      enabled: isAuthenticated && page === "mine" && workspaceSection === "nft" && walletConnectionRestored && Boolean(safeWalletAddress),
      staleTime: 45_000,
      retry: 1,
      refetchOnWindowFocus: false,
    }
  );
  const walletNfts = (walletNftsQuery.data?.items ?? []) as WalletNft[];
  const visibleWalletNfts = useMemo(() => walletNftFilter === "all" ? walletNfts : walletNfts.filter(item => item.category === walletNftFilter), [walletNftFilter, walletNfts]);
  const nftRecipientQuery = trpc.tgTop.resolveNftTransferRecipient.useQuery(
    { recipientInput },
    { enabled: false, retry: false }
  );
  const mineQuery = trpc.tgTop.myGroups.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const mine = (mineQuery.data ?? []) as Group[];
  const [myGroupsViewMode, setMyGroupsViewMode] = useState<MyGroupsViewMode>("list");
  const [myGroupsLayout, setMyGroupsLayout] = useState<Group[]>([]);
  const [myGroupsStatusFilter, setMyGroupsStatusFilter] = useState<"all" | "listed" | "unlisted">("all");
  const [myGroupsSearchQuery, setMyGroupsSearchQuery] = useState("");
  const [myGroupsAddOpen, setMyGroupsAddOpen] = useState(false);
  const [giveawayCreateOpen, setGiveawayCreateOpen] = useState(false);
  const [giveawayGroupId, setGiveawayGroupId] = useState("");
  const [giveawayTitle, setGiveawayTitle] = useState("");
  const [giveawayPrizeTitle, setGiveawayPrizeTitle] = useState("");
  const [giveawayRules, setGiveawayRules] = useState("");
  const [giveawayEndsAt, setGiveawayEndsAt] = useState("");
  const [giveawayBoostOnly, setGiveawayBoostOnly] = useState(false);
  const [myGroupsDragActiveId, setMyGroupsDragActiveId] = useState<number | null>(null);
  const myGroupsSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 320, tolerance: 10 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  useEffect(() => {
    setMyGroupsLayout(mine);
  }, [mineQuery.dataUpdatedAt]);
  const accountQuery = trpc.tgTop.getAccount.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 8_000,
    refetchIntervalInBackground: false,
  });
  const tonWithdrawalDefaultRecipient = safeWalletAddress ?? "";
  useEffect(() => {
    setTonWithdrawalAddress(safeWalletAddress ?? "");
  }, [safeWalletAddress]);
  const accountActivityQuery = trpc.tgTop.getAccountActivity.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 8_000,
    refetchIntervalInBackground: false,
  });
  const tonDepositsQuery = trpc.tgTop.getTonDeposits.useQuery(undefined, {
    enabled: isAuthenticated && page === "profile",
    refetchInterval: activeTonDepositId ? 10_000 : false,
    refetchIntervalInBackground: false,
  });
  const tonWithdrawalsQuery = trpc.tgTop.getTonWithdrawals.useQuery(undefined, {
    enabled: isAuthenticated && page === "profile",
    refetchInterval: activeTonWithdrawalId ? 10_000 : false,
    refetchIntervalInBackground: false,
  });
  const tonDeposits = (tonDepositsQuery.data ?? []) as Array<{
    id: number;
    requestedAmountNano: string;
    creditedAmountTon: string | null;
    reference: string;
    status: "created" | "submitted" | "confirmed" | "expired" | "rejected";
    failureReason: string | null;
    expiresAt: Date;
    confirmedAt: Date | null;
    createdAt: Date;
  }>;
  const tonWithdrawals = (tonWithdrawalsQuery.data ?? []) as Array<{
    id: number; grossAmountNano: string; feeReserveNano: string; actualFeeNano: string | null; netAmountNano: string;
    destinationWalletAddress: string; reference: string; status: "queued" | "manual_review" | "broadcast_pending" | "sent" | "confirmed" | "failed_refunded" | "cancelled";
    riskReasons: string | null; transactionHash: string | null; transactionLt: string | null; failureReason: string | null; createdAt: Date; confirmedAt: Date | null;
  }>;
  const account = accountQuery.data as
    | {
        user?: { bonusBalance: number; mainBalanceTon: string | number; publicProfile?: boolean; role?: "user" | "moderator" | "admin" };
      transactions: Array<{
          id: number;
          amount: number;
          kind: "group_connection_bonus" | "listing_spend" | "manual_bonus" | "reward_campaign_reserve" | "reward_campaign_release" | "reward_subscription" | "reward_invite_referral" | "reward_manual_add";
          createdAt: Date;
          groupId: number | null;
          groupTitle: string | null;
        groupUsername: string | null;
      }>;
      referral?: {
        referralCode: string;
        referralLink: string;
        referralsCount: number;
        earnings: string;
      };
    }
    | undefined;
  const moderationAccessQuery = trpc.tgTop.getModerationAccess.useQuery(undefined, { enabled: isAuthenticated });
  const moderationAccess = moderationAccessQuery.data as { role: "user" | "moderator" | "admin"; canModerate: boolean; canManageModerators: boolean } | undefined;
  const telegramUserAgentStatusQuery = trpc.telegramUserAgent.status.useQuery(undefined, {
    enabled: Boolean(isAuthenticated && page === "admin" && moderationAccess?.role === "admin"),
    retry: false,
  });
  const telegramUserAgentStatus = telegramUserAgentStatusQuery.data as { status: "disconnected" | "code_pending" | "password_pending" | "connected" | "error"; accountTelegramId: string | null; accountUsername: string | null; expiresAt: Date | null; ownerDm?: { username: string; active: boolean } | null } | undefined;
  const telegramHistoricalStatsQuery = trpc.telegramUserAgent.getHistoricalStats.useQuery(undefined, {
    enabled: Boolean(isAuthenticated && page === "admin" && moderationAccess?.role === "admin" && telegramUserAgentStatus?.status === "connected"),
    retry: false,
  });
  const telegramHistoricalStats = (telegramHistoricalStatsQuery.data ?? []) as Array<{
    id: number; username: string; title: string; kind: "channel" | "supergroup"; lastRefreshedAt: Date | null; availability: "pending" | "ready" | "unavailable";
    snapshot: null | { memberCount: number | null; viewsPerPost: number | null; sharesPerPost: number | null; reactionsPerPost: number | null; periodStart: Date | null; periodEnd: Date | null; history: { version?: number; graphs?: Record<string, TelegramAnalyticsGraph>; summary?: TelegramAnalyticsSummary; memberHistory?: Array<{ at: number; value: number }>; activityHistory?: Array<{ at: number; value: number }> } };
  }>;
  const catalogTaxonomyQuery = trpc.tgTop.getCatalogTaxonomy.useQuery();
  const catalogTaxonomy = catalogTaxonomyQuery.data as {
    countries: Array<{ id: number; code: string; label: string; sortOrder: number }>;
    cities: Array<{ id: number; countryCode: string; code: string; label: string; sortOrder: number }>;
    topics: Array<{ id: number; category: "Каналы" | "Чаты" | "Боты"; code: string; label: string; sortOrder: number }>;
  } | undefined;
  const approvedBotsQuery = trpc.tgTop.getApprovedBots.useQuery(
    { category: botCategory === "Все" ? undefined : botCategory },
    { enabled: topSection === "bots" }
  );
  const approvedBots = (approvedBotsQuery.data ?? []) as Array<{
    id: number; username: string; telegramLink: string; category: string; createdAt: Date; moderationReviewedAt: Date | null;
  }>;
  const myBotListingsQuery = trpc.tgTop.myBotListings.useQuery(undefined, {
    enabled: isAuthenticated && page === "mine" && workspaceSection === "bots",
  });
  const myBotListings = (myBotListingsQuery.data ?? []) as Array<{
    id: number; username: string; telegramLink: string; category: string;
    moderationStatus: "pending" | "approved" | "rejected"; moderationReason: string | null; createdAt: Date;
  }>;
  const botModerationQueueQuery = trpc.tgTop.getBotModerationQueue.useQuery(undefined, {
    enabled: Boolean(moderationAccess?.canModerate),
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,
  });
  const botModerationQueue = (botModerationQueueQuery.data ?? []) as Array<{
    id: number; username: string; telegramLink: string; category: string; createdAt: Date;
    ownerName: string | null; ownerTelegramUsername: string | null;
  }>;
  const allBotListingsQuery = trpc.tgTop.getAllBotListings.useQuery(undefined, {
    enabled: Boolean(moderationAccess?.canModerate),
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,
  });
  const allBotListings = (allBotListingsQuery.data ?? []) as Array<{
    id: number; username: string; telegramLink: string; category: string;
    moderationStatus: "pending" | "approved" | "rejected"; moderationReason: string | null;
    createdAt: Date; moderationReviewedAt: Date | null; ownerName: string | null; ownerTelegramUsername: string | null;
  }>;
  const activeModerationListingsQuery = trpc.tgTop.getActiveModerationListings.useQuery(undefined, {
    enabled: Boolean(moderationAccess?.canModerate),
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,
  });
  const tonWithdrawalsForManualReviewQuery = trpc.tgTop.getTonWithdrawalsForManualReview.useQuery(undefined, {
    enabled: Boolean(moderationAccess?.canModerate),
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,
  });
  const activeModerationListings = (activeModerationListingsQuery.data ?? []) as Array<{
    id: number;
    chatId: string;
    title: string;
    avatarFileId: string | null;
    username: string | null;
    inviteLink: string | null;
    category: "Каналы" | "Чаты";
    country: string;
    ownerName: string | null;
    subcategory: string;
    membersCount: number;
    listedAt: Date | null;
    createdAt: Date;
  }>;
  const tonWithdrawalsForManualReview = (tonWithdrawalsForManualReviewQuery.data ?? []) as Array<{
    id: number; userOpenId: string; grossAmountNano: string; feeReserveNano: string; netAmountNano: string;
    destinationWalletAddress: string; reference: string; riskLabels: string[]; createdAt: Date;
  }>;
  const moderatorsQuery = trpc.tgTop.getModerators.useQuery(undefined, { enabled: Boolean(moderationAccess?.canManageModerators) });
  const moderators = (moderatorsQuery.data ?? []) as Array<{ openId: string; name: string | null; telegramUsername: string | null; role: "admin" | "moderator" }>;
  const [moderationReasonDraft, setModerationReasonDraft] = useState("");
  const [detailModerationReason, setDetailModerationReason] = useState("");
  const [moderatorUsernameDraft, setModeratorUsernameDraft] = useState("");
  const [catalogCountryCodeDraft, setCatalogCountryCodeDraft] = useState("");
  const [catalogCountryLabelDraft, setCatalogCountryLabelDraft] = useState("");
  const [catalogCityCountryDraft, setCatalogCityCountryDraft] = useState("Global");
  const [catalogCityCodeDraft, setCatalogCityCodeDraft] = useState("");
  const [catalogCityLabelDraft, setCatalogCityLabelDraft] = useState("");
  const [catalogTopicCategoryDraft, setCatalogTopicCategoryDraft] = useState<"Каналы" | "Чаты" | "Боты">("Каналы");
  const [catalogTopicCodeDraft, setCatalogTopicCodeDraft] = useState("");
  const [catalogTopicLabelDraft, setCatalogTopicLabelDraft] = useState("");
  const [botTelegramLinkDraft, setBotTelegramLinkDraft] = useState("");
  const [botModerationDrafts, setBotModerationDrafts] = useState<Record<number, { category: string; reason: string }>>({});
  const [moderationWindowOpen, setModerationWindowOpen] = useState(false);
  const [telegramUserAgentSheetOpen, setTelegramUserAgentSheetOpen] = useState(false);
  const [telegramUserAgentPhone, setTelegramUserAgentPhone] = useState("");
  const [telegramUserAgentCode, setTelegramUserAgentCode] = useState("");
  const [telegramUserAgentPassword, setTelegramUserAgentPassword] = useState("");
  const [telegramOwnerDmUsername, setTelegramOwnerDmUsername] = useState("");
  const [telegramStatsUsername, setTelegramStatsUsername] = useState("TGTOP_Community");
  const [telegramStatsRange, setTelegramStatsRange] = useState<"day" | "month" | "all">("month");
  const [moderationTab, setModerationTab] = useState<"communities" | "bots">("communities");
  const [botModerationFilter, setBotModerationFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [botCategorySheetOpen, setBotCategorySheetOpen] = useState(false);
  const [botListingSheetOpen, setBotListingSheetOpen] = useState(false);
  const dealsQuery = trpc.tgTop.myDeals.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const deals = (dealsQuery.data ?? []) as Array<{
    id: number;
    groupId: number | null;
    buyerOpenId: string;
    sellerOpenId: string;
    price: string;
    dealType: "group_buy" | "nft_buy" | "nft_rent";
    status: "open" | "escrow_funded" | "active" | "completed" | "expired" | "cancelled" | "disputed";
    fundedAt: Date | null;
    transferObservedAt: Date | null;
    buyerConfirmedAt: Date | null;
    expiresAt: Date | null;
    cancelledAt: Date | null;
    createdAt: Date;
    groupTitle: string | null;
    groupUsername: string | null;
  }>;
  const detailQuery = trpc.tgTop.getGroupDetail.useQuery(
    { groupId: selectedGroupId ?? 0 },
    { enabled: selectedGroupId !== null }
  );
  const channelGiftsQuery = trpc.tgTop.getChannelGifts.useQuery(
    { groupId: selectedGroupId ?? 0 },
    { enabled: isAuthenticated && channelGiftsOpen && selectedGroupId !== null, retry: false }
  );
  const channelGifts = (channelGiftsQuery.data ?? []) as Array<{ id: string; title: string; emoji: string; unique: boolean; mediaUrl: string | null; mediaKind: "video" | "tgs" | "image" | null }>;
  const groupAdministratorsQuery = trpc.tgTop.getGroupAdministrators.useQuery(
    { groupId: lotGroupId ?? selectedGroupId ?? 0 },
    { enabled: managerSheetOpen && (lotGroupId ?? selectedGroupId) !== null }
  );
  const publicOwnerQuery = trpc.tgTop.getPublicOwnerProfile.useQuery(
    { openId: selectedOwnerOpenId ?? "" },
    { enabled: selectedOwnerOpenId !== null }
  );
  const publicOwner = publicOwnerQuery.data as { owner: NonNullable<Group["owner"]>; groups: Group[]; nfts: ShowcaseNft[] } | undefined;
  const ownerLeaderboardQuery = trpc.tgTop.getOwnerLeaderboard.useQuery({ limit: 25 });
  const ownerLeaderboard = (ownerLeaderboardQuery.data ?? []) as Array<{
    rank: number;
    owner: NonNullable<Group["owner"]>;
    activeListings: number;
    totalMembers: number;
  }>;
  const setPublicProfile = trpc.tgTop.setPublicProfile.useMutation({
    onSuccess: () => {
      toast.success("Публичность профиля обновлена");
      void utils.tgTop.getAccount.invalidate();
      void utils.tgTop.getOwnerLeaderboard.invalidate();
      void utils.tgTop.getPublicOwnerProfile.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const requestTelegramUserAgentCode = trpc.telegramUserAgent.requestCode.useMutation({
    onSuccess: result => {
      setTelegramUserAgentCode("");
      toast.success(result.codeViaTelegram ? "Код отправлен в Telegram рабочего аккаунта" : "Код отправлен по SMS");
      void utils.telegramUserAgent.status.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const confirmTelegramUserAgentCode = trpc.telegramUserAgent.confirmCode.useMutation({
    onSuccess: result => {
      setTelegramUserAgentCode("");
      toast.success(result.status === "password_pending" ? "Telegram запросил пароль двухэтапной защиты" : "Рабочий Telegram-аккаунт подключён в read-only режиме");
      void utils.telegramUserAgent.status.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const confirmTelegramUserAgentPassword = trpc.telegramUserAgent.confirmPassword.useMutation({
    onSuccess: () => {
      setTelegramUserAgentPassword("");
      toast.success("Рабочий Telegram-аккаунт подключён в read-only режиме");
      void utils.telegramUserAgent.status.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const disconnectTelegramUserAgent = trpc.telegramUserAgent.disconnect.useMutation({
    onSuccess: () => {
      setTelegramUserAgentPhone("");
      setTelegramUserAgentCode("");
      setTelegramUserAgentPassword("");
      toast.success("Сессия рабочего Telegram-аккаунта отключена");
      void utils.telegramUserAgent.status.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const bootstrapTelegramOwnerDm = trpc.telegramUserAgent.bootstrapOwnerDm.useMutation({
    onSuccess: result => {
      setTelegramOwnerDmUsername(result.username);
      toast.success(`TG TOP Assistant написал @${result.username}`);
      void utils.telegramUserAgent.status.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const allowTelegramHistoricalStats = trpc.telegramUserAgent.allowHistoricalStatsTarget.useMutation({
    onSuccess: result => {
      setTelegramStatsUsername(result.username);
      toast.success(`@${result.username} добавлен в read-only статистику`);
      void utils.telegramUserAgent.getHistoricalStats.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const refreshTelegramHistoricalStats = trpc.telegramUserAgent.refreshHistoricalStats.useMutation({
    onSuccess: result => {
      toast.success(`История @${result.username} обновлена`);
      void utils.telegramUserAgent.getHistoricalStats.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const createTonDepositMutation = trpc.tgTop.createTonDeposit.useMutation({
    onError: error => toast.error(error.message.includes("Failed query") ? "Не удалось подготовить пополнение. Попробуйте ещё раз через минуту." : error.message),
  });
  const markTonDepositSubmittedMutation = trpc.tgTop.markTonDepositSubmitted.useMutation({
    onError: error => toast.error(error.message),
  });
  const verifyTonDepositMutation = trpc.tgTop.verifyTonDeposit.useMutation({
    onSuccess: result => {
      void utils.tgTop.getTonDeposits.invalidate();
      void utils.tgTop.getAccount.invalidate();
      void utils.tgTop.getAccountActivity.invalidate();
      if (result.newlyConfirmed) {
        toast.success(`Зачислено ${formatFinancialGram(result.amountTon)} GRAM`);
        setActiveTonDepositId(null);
        setTonDepositOpen(false);
      }
      if (result.status === "rejected") {
        toast.error("Платёж вернулся в кошелёк. Средства не зачислены.");
        setActiveTonDepositId(null);
      }
    },
    onError: error => toast.error(error.message),
  });
  const quoteTonWithdrawalMutation = trpc.tgTop.quoteTonWithdrawal.useMutation({
    onError: error => toast.error(error.message),
  });
  const createTonWithdrawalMutation = trpc.tgTop.createTonWithdrawal.useMutation({
    onSuccess: () => {
      void utils.tgTop.getTonWithdrawals.invalidate();
      void utils.tgTop.getAccount.invalidate();
      void utils.tgTop.getAccountActivity.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const reconcileTonWithdrawalMutation = trpc.tgTop.reconcileTonWithdrawal.useMutation({
    onSuccess: result => {
      void utils.tgTop.getTonWithdrawals.invalidate();
      void utils.tgTop.getAccount.invalidate();
      if (result.status === "confirmed") {
        toast.success("Средства успешно отправлены на ваш кошелёк");
        setActiveTonWithdrawalId(null);
        setTonWithdrawalOpen(false);
        setTonWithdrawalFlow("form");
      }
      if (result.status === "cancelled") {
        setTonWithdrawalFlow("form");
        setActiveTonWithdrawalId(null);
        toast.error("Вывод отменён. Средства возвращены на основной баланс.");
      }
    },
    // Сверка работает в фоне и повторяется автоматически; временная ошибка сети не должна спамить toast.
    onError: () => undefined,
  });
  useEffect(() => {
    if (!activeTonWithdrawalId) return;
    const active = tonWithdrawals.find(item => item.id === activeTonWithdrawalId);
    if (!active || (active.status !== "broadcast_pending" && active.status !== "sent")) return;
    const reconcile = () => {
      if (!reconcileTonWithdrawalMutation.isPending) {
        reconcileTonWithdrawalMutation.mutate({ withdrawalId: activeTonWithdrawalId });
      }
    };
    reconcile();
    const timer = window.setInterval(reconcile, 4_000);
    return () => window.clearInterval(timer);
  }, [activeTonWithdrawalId, reconcileTonWithdrawalMutation, tonWithdrawals]);
  useEffect(() => {
    if (!activeTonWithdrawalId) return;
    const active = tonWithdrawals.find(item => item.id === activeTonWithdrawalId);
    if (!active || active.status !== "cancelled") return;
    setActiveTonWithdrawalId(null);
    setTonWithdrawalFlow("form");
    setTonWithdrawalOpen(false);
    toast.error("Вывод отменён до отправки. GRAM остались на основном балансе.");
  }, [activeTonWithdrawalId, tonWithdrawals]);
  const startTonDeposit = async () => {
    if (!walletConnectionRestored) return;
    if (!safeWalletAddress) {
      openTonWalletForCurrentUser();
      return;
    }
    const deposit = await createTonDepositMutation.mutateAsync({ amountTon: tonDepositAmount, senderWalletAddress: safeWalletAddress });
    setActiveTonDepositId(deposit.id);
    try {
      await tonConnectUi.sendTransaction({
        validUntil: deposit.validUntil,
        network: "-239",
        messages: [{ address: deposit.recipientWalletAddress, amount: deposit.amountNano, payload: deposit.payload }],
      });
      await markTonDepositSubmittedMutation.mutateAsync({ depositId: deposit.id });
      toast.success("Перевод отправлен. Проверяем поступление в сети GRAM.");
      void verifyTonDepositMutation.mutateAsync({ depositId: deposit.id });
    } catch (error) {
      toast.error(error instanceof Error && error.message.includes("USER_REJECTS") ? "Подтверждение в кошельке отменено" : "Перевод не подтверждён. Средства не зачислены.");
    }
  };
  const prepareTonWithdrawal = async () => {
    if (tonWithdrawalSubmitInFlight.current || quoteTonWithdrawalMutation.isPending || createTonWithdrawalMutation.isPending) return;
    tonWithdrawalSubmitInFlight.current = true;
    try {
      const quote = await quoteTonWithdrawalMutation.mutateAsync({ amountTon: tonWithdrawalAmount, destinationWalletAddress: tonWithdrawalAddress });
      const idempotencyKey = typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID().replace(/-/g, "")
        : `${Date.now()}${Math.random().toString(36).slice(2, 18)}`;
      const withdrawal = await createTonWithdrawalMutation.mutateAsync({
        amountTon: tonWithdrawalAmount,
        destinationWalletAddress: quote.destinationWalletAddress,
        idempotencyKey,
      });
      setActiveTonWithdrawalId(withdrawal.id);
      setTonWithdrawalFlow("processing");
    } finally {
      tonWithdrawalSubmitInFlight.current = false;
    }
  };
  const moderateGroup = trpc.tgTop.moderateGroup.useMutation({
    onSuccess: () => {
      toast.success("Лот снят с ТОПа. Владельцу отправлена причина.");
      setModerationReasonDraft("");
      setDetailModerationReason("");
      void utils.tgTop.getActiveModerationListings.invalidate();
      void utils.tgTop.getGroups.invalidate();
      void utils.tgTop.getSlots.invalidate();
      void utils.tgTop.myGroups.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const submitBotListing = trpc.tgTop.submitBotListing.useMutation({
    onSuccess: () => {
      toast.success(tx("Заявка на бота отправлена на ручную проверку", "Bot submission sent for manual review"));
      setBotTelegramLinkDraft("");
      setBotListingSheetOpen(false);
      void utils.tgTop.myBotListings.invalidate();
      void utils.tgTop.getBotModerationQueue.invalidate();
      void utils.tgTop.getAllBotListings.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const moderateBotListing = trpc.tgTop.moderateBotListing.useMutation({
    onSuccess: result => {
      toast.success(result.moderationStatus === "approved" ? "Бот одобрен и опубликован" : "Заявка на бота отклонена");
      setBotModerationDrafts(current => {
        const next = { ...current };
        delete next[result.id];
        return next;
      });
      void utils.tgTop.getBotModerationQueue.invalidate();
      void utils.tgTop.getApprovedBots.invalidate();
      void utils.tgTop.myBotListings.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const deleteBotListing = trpc.tgTop.deleteBotListing.useMutation({
    onSuccess: bot => {
      toast.success(`@${bot.username} удалён из каталога`);
      void utils.tgTop.getAllBotListings.invalidate();
      void utils.tgTop.getBotModerationQueue.invalidate();
      void utils.tgTop.getApprovedBots.invalidate();
      void utils.tgTop.myBotListings.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const reviewTonWithdrawal = trpc.tgTop.reviewTonWithdrawal.useMutation({
    onSuccess: result => {
      void utils.tgTop.getTonWithdrawalsForManualReview.invalidate();
      void utils.tgTop.getTonWithdrawals.invalidate();
      void utils.tgTop.getAccount.invalidate();
      toast.success(result.status === "cancelled" ? "Вывод отменён, GRAM возвращён на основной баланс" : "Вывод допущен к безопасной отправке");
    },
    onError: error => toast.error(error.message),
  });
  const setModeratorRole = trpc.tgTop.setModeratorRole.useMutation({
    onSuccess: () => {
      toast.success("Доступ к админ-панели обновлён");
      setModeratorUsernameDraft("");
      void utils.tgTop.getModerators.invalidate();
      void utils.tgTop.getModerationAccess.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const refreshCatalogTaxonomy = () => {
    void utils.tgTop.getCatalogTaxonomy.invalidate();
  };
  const addCatalogCountry = trpc.tgTop.addCatalogCountry.useMutation({
    onSuccess: () => {
      toast.success("Страна добавлена");
      setCatalogCountryCodeDraft("");
      setCatalogCountryLabelDraft("");
      refreshCatalogTaxonomy();
    },
    onError: error => toast.error(error.message),
  });
  const deleteCatalogCountry = trpc.tgTop.deleteCatalogCountry.useMutation({
    onSuccess: () => {
      toast.success("Страна удалена");
      refreshCatalogTaxonomy();
    },
    onError: error => toast.error(error.message),
  });
  const addCatalogCity = trpc.tgTop.addCatalogCity.useMutation({
    onSuccess: () => {
      toast.success("Город добавлен");
      setCatalogCityCodeDraft("");
      setCatalogCityLabelDraft("");
      refreshCatalogTaxonomy();
    },
    onError: error => toast.error(error.message),
  });
  const deleteCatalogCity = trpc.tgTop.deleteCatalogCity.useMutation({
    onSuccess: () => {
      toast.success("Город удалён");
      refreshCatalogTaxonomy();
    },
    onError: error => toast.error(error.message),
  });
  const addCatalogTopic = trpc.tgTop.addCatalogTopic.useMutation({
    onSuccess: () => {
      toast.success("Рубрика добавлена");
      setCatalogTopicCodeDraft("");
      setCatalogTopicLabelDraft("");
      refreshCatalogTaxonomy();
    },
    onError: error => toast.error(error.message),
  });
  const deleteCatalogTopic = trpc.tgTop.deleteCatalogTopic.useMutation({
    onSuccess: () => {
      toast.success("Рубрика удалена");
      refreshCatalogTaxonomy();
    },
    onError: error => toast.error(error.message),
  });
  const setGroupManager = trpc.tgTop.setGroupManager.useMutation({
    onSuccess: () => {
      toast.success(tx("Менеджер группы обновлён", "Group manager updated"));
      setManagerSheetOpen(false);
      void utils.tgTop.getGroupDetail.invalidate();
      void utils.tgTop.myGroups.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const detail = detailQuery.data as
    | {
        group: Group;
         snapshots: Array<{
           membersCount: number;
           messagesCount: number;
           joinedCount: number;
           leavesCount: number;
           invitedCount: number;
           recordedAt: Date;
         }>;
        owner?: Group["owner"];
        ownerNfts: ShowcaseNft[];
        analytics: { source: "tgtop_bot_observed"; observedSince: Date };
      }
    | undefined;
  const detailSlotsQuery = trpc.tgTop.getSlots.useQuery({
    category: detail?.group.ownerOpenId === user?.openId ? "Все" : detailBoardScope?.category ?? detail?.group.category ?? "Все",
    country: detail?.group.ownerOpenId === user?.openId ? listingCountry : detailBoardScope?.country ?? detail?.group.country ?? "Global",
    subcategory: detail?.group.ownerOpenId === user?.openId ? "Все" : detailBoardScope?.subcategory ?? detail?.group.subcategory ?? "Все",
    city: detail?.group.ownerOpenId === user?.openId ? listingCity : detailBoardScope?.city ?? detail?.group.city ?? "Все",
  }, { enabled: Boolean(detail), refetchInterval: 12_000, refetchIntervalInBackground: false });
  const detailSlots = (detailSlotsQuery.data ?? []) as Slot[];
  const detailTopPreviewSlotsQuery = trpc.tgTop.getSlots.useQuery({
    category: "Все",
    country: listingCountry,
    subcategory: "Все",
    city: listingCity,
  }, { enabled: Boolean(detail), refetchInterval: 12_000, refetchIntervalInBackground: false });
  const detailTopPreviewSlots = (detailTopPreviewSlotsQuery.data ?? []) as Slot[];
  const rewardCampaignStatsQuery = trpc.tgTop.getRewardCampaignStats.useQuery(
    { groupId: detail?.group.id ?? 0 },
    { enabled: Boolean(detail && detail.group.ownerOpenId === user?.openId), refetchInterval: 12_000, refetchIntervalInBackground: false },
  );
  const rewardCampaignStats = rewardCampaignStatsQuery.data;

  const listWithCredits = trpc.tgTop.listGroupsWithCredits.useMutation({
    onSuccess: () => {
      toast.success(tx("Настройки листинга сохранены", "Listing settings saved."));
      setListingOpen(false);
      setInlineListingOpen(false);
      setSelectedGroupIds([]);
      setMyGroupsSelectionMode(false);
      void utils.tgTop.myGroups.invalidate();
      void utils.tgTop.getGroups.invalidate();
      void utils.tgTop.getSlots.invalidate();
      void utils.tgTop.getAccount.invalidate();
      void utils.tgTop.getGroupDetail.invalidate();
      void utils.tgTop.getPublicOwnerProfile.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const createGiveaway = trpc.tgTop.createGiveaway.useMutation({
    onSuccess: () => {
      setGiveawayCreateOpen(false);
      setGiveawayGroupId("");
      setGiveawayTitle("");
      setGiveawayPrizeTitle("");
      setGiveawayRules("");
      setGiveawayEndsAt("");
      setGiveawayBoostOnly(false);
      void utils.tgTop.openGiveaways.invalidate();
      toast.success("Розыгрыш опубликован");
    },
    onError: error => toast.error(error.message),
  });
  const joinGiveaway = trpc.tgTop.joinGiveaway.useMutation({
    onSuccess: () => {
      void utils.tgTop.openGiveaways.invalidate();
      toast.success("Вы участвуете в розыгрыше");
    },
    onError: error => toast.error(error.message),
  });
  const createMonthlyEntryLink = trpc.tgTop.createMonthlyEntryLink.useMutation({
    onSuccess: ({ inviteLink }) => {
      void utils.tgTop.myGroups.invalidate();
      openTelegramCommunityLink(inviteLink);
      toast.success(tx("Платная ссылка создана и открыта", "Paid link created and opened."));
    },
    onError: error => toast.error(error.message),
  });
  const createPrivateEntryLink = trpc.tgTop.createPrivateEntryLink.useMutation({
    onSuccess: ({ inviteLink }) => {
      void utils.tgTop.myGroups.invalidate();
      void utils.tgTop.getGroups.invalidate();
      void utils.tgTop.getGroupDetail.invalidate();
      openTelegramCommunityLink(inviteLink);
      toast.success(tx("Закрытая ссылка создана и открыта", "Private link created and opened."));
    },
    onError: error => toast.error(error.message),
  });
  const createRewardInviteLink = trpc.tgTop.createRewardInviteLink.useMutation({
    onSuccess: ({ inviteLink }) => {
      if (!openTelegramCommunityLink(inviteLink)) {
        toast.error(tx("Не удалось открыть сообщество. Разрешите открытие ссылок и повторите попытку.", "Could not open the community. Allow links and try again."));
      }
    },
    onError: error => toast.error(error.message),
  });
  const resolveVerifiedEntryLink = trpc.tgTop.resolveVerifiedEntryLink.useMutation({
    onSuccess: ({ entryUrl }) => {
      if (!openTelegramCommunityLink(entryUrl)) {
        toast.error(tx("Не удалось открыть ссылку. Разрешите открытие ссылок и повторите попытку.", "Could not open the link. Allow links and try again."));
      }
    },
    onError: error => toast.error(error.message),
  });
  const createCommunityOnboardingIntent = trpc.tgTop.createCommunityOnboardingIntent.useMutation();
  const unlistGroups = trpc.tgTop.unlistGroups.useMutation({
    onSuccess: () => {
      toast.success(tx("Группы сняты с листинга", "Communities removed from listings."));
      setSelectedGroupIds([]);
      setMyGroupsSelectionMode(false);
      void utils.tgTop.myGroups.invalidate();
      void utils.tgTop.getGroups.invalidate();
      void utils.tgTop.getSlots.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const deleteGroups = trpc.tgTop.deleteGroups.useMutation({
    onSuccess: () => {
      toast.success(tx("Группы удалены из кабинета", "Communities deleted from account."));
      setSelectedGroupIds([]);
      setMyGroupsSelectionMode(false);
      void utils.tgTop.myGroups.invalidate();
      void utils.tgTop.getGroups.invalidate();
      void utils.tgTop.getSlots.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const toggleServiceMessagesMutation = trpc.tgTop.toggleServiceMessages.useMutation({
    onSuccess: () => {
      toast.success(tx("Настройки автоочистки сохранены", "Auto-cleanup settings saved."));
      void utils.tgTop.getGroupDetail.invalidate();
      void utils.tgTop.myGroups.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const saveMyGroupsLayoutMutation = trpc.tgTop.saveMyGroupsLayout.useMutation({
    onSuccess: () => {
      void utils.tgTop.myGroups.invalidate();
    },
    onError: error => {
      toast.error(error.message);
      void utils.tgTop.myGroups.invalidate();
    },
  });
  const placeBid = trpc.tgTop.placeBid.useMutation({
    onSuccess: () => {
      toast.success(tx("Ставка оплачена GRAM и размещена в рейтинге.", "Bid paid with GRAM and placed in the ranking."));
      setTargetSlot(null);
      setStarsPaymentGroup(null);
      setOutbidOpen(false);
      setOutbidGroupId(null);
      setAmount("0.1");
      void utils.tgTop.getSlots.invalidate();
      void utils.tgTop.getGroupDetail.invalidate();
      void detailQuery.refetch();
      void utils.tgTop.getAccount.invalidate();
      void utils.tgTop.getAccountActivity.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const createStarsRankingPayment = trpc.tgTop.createStarsRankingPayment.useMutation({
    onSuccess: result => {
      setStarsPaymentGroup(null);
      const openInvoice = window.Telegram?.WebApp?.openInvoice;
      if (openInvoice) {
        openInvoice(result.invoiceLink, status => {
          if (status === "paid") {
            toast.success(tx("Оплата подтверждена Telegram. Позиция обновляется…", "Telegram confirmed payment. Updating placement…"));
            void utils.tgTop.getSlots.invalidate();
            void utils.tgTop.getAccountActivity.invalidate();
          } else if (status === "cancelled") {
            toast.message(tx("Оплата отменена.", "Payment cancelled."));
          } else if (status === "failed") {
            toast.error(tx("Оплату Stars не удалось завершить.", "Could not complete Stars payment."));
          }
        });
        return;
      }
      window.open(result.invoiceLink, "_blank", "noopener,noreferrer");
    },
    onError: error => toast.error(error.message),
  });
  const setNftShowcase = trpc.tgTop.setNftShowcase.useMutation({
    onSuccess: () => {
      toast.success(tx("NFT-витрина обновлена", "NFT showcase updated."));
      setShowcaseNftId(null);
      void utils.tgTop.myNfts.invalidate();
      void utils.tgTop.getNfts.invalidate();
      void utils.tgTop.getGroupDetail.invalidate();
      void utils.tgTop.getPublicOwnerProfile.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const createProtectedGroupDeal = trpc.tgTop.createProtectedGroupDeal.useMutation({
    onSuccess: () => {
      toast.success(tx("Офер создан. Оплата будет доступна после запуска проверенного эскроу.", "Offer created. Payment will be available after verified escrow launches."));
      void utils.tgTop.myDeals.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const cancelProtectedGroupDeal = trpc.tgTop.cancelProtectedGroupDeal.useMutation({
    onSuccess: result => {
      toast.success(result.requiresEscrowRefund
        ? tx("Офер отменен. Возврат эскроу будет обработан после подключения платежного контура.", "Offer cancelled. The escrow refund will be processed after the payment layer is connected.")
        : tx("Офер отменен.", "Offer cancelled."));
      void utils.tgTop.myDeals.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const confirmProtectedGroupTransfer = trpc.tgTop.confirmProtectedGroupTransfer.useMutation({
    onSuccess: () => {
      toast.success(tx("Подтверждение передачи записано. Расчет остается заблокирован до проверки платежей.", "Transfer acknowledgement recorded. Settlement remains locked until payment verification."));
      void utils.tgTop.myDeals.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const prepareNftTransferMutation = trpc.tgTop.prepareNftTransfer.useMutation({
    onSuccess: result => {
      setPreparedNftTransfer(result as PreparedNftTransfer);
      setNftTransferStep("prepared");
      void utils.tgTop.myNftTransfers.invalidate();
    },
    onError: error => toast.error(language === "en" ? "Could not prepare the NFT transfer. Please check the recipient and try again." : error.message),
  });
  const createNftRentalDeal = trpc.tgTop.createNftRentalDeal.useMutation({
    onSuccess: result => {
      setNftRentalDraft(null);
      toast.success(tx(`Заявка на аренду @${result.nft.username} создана. Назначение через Telegram/Fragment ещё нужно подтвердить.`, `Rental request for @${result.nft.username} created. Telegram/Fragment assignment still requires confirmation.`));
      void utils.tgTop.myDeals.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  const matchesAudience = (group: Group | null) => {
    if (!group || audience === "all") return true;
    if (audience === "small") return group.membersCount < 1000;
    if (audience === "medium")
      return group.membersCount >= 1000 && group.membersCount < 10000;
    return group.membersCount >= 10000;
  };
  const visibleGroups = useMemo(
    () => listedGroups.filter(matchesAudience),
    [listedGroups, audience]
  );
  const visibleNfts = useMemo(
    () => {
      const byMarketCategory = nftMarketCategory === "all" || nftMarketCategory === "usernames" ? nfts : [];
      const byAssetClass = nftAssetFilter === "all" ? byMarketCategory : byMarketCategory.filter(nft => nft.assetClass === nftAssetFilter);
      const byDealCategory = nftDealCategory === "all"
        ? byAssetClass
        : nftDealCategory === "sale"
          ? byAssetClass.filter(nft => nft.listingType === "sale" || nft.listingType === "both")
          : nftDealCategory === "rent"
            ? byAssetClass.filter(nft => nft.listingType === "rent" || nft.listingType === "both")
            : [];
      const query = topSearchQuery.trim().toLowerCase();
      return query
        ? byDealCategory.filter(nft => `${nft.username} ${nft.ownerUsername}`.toLowerCase().includes(query))
        : byDealCategory;
    },
    [nfts, nftAssetFilter, nftMarketCategory, nftDealCategory, topSearchQuery]
  );
  const compactRankedSlots = useMemo(
    () => slots.filter(slot => slot.group && matchesAudience(slot.group)),
    [slots, audience]
  );
  const fallbackRankedGroups = useMemo(() => {
    const rankedIds = new Set(compactRankedSlots.flatMap(slot => slot.group ? [slot.group.id] : []));
    return visibleGroups.filter(group => !rankedIds.has(group.id));
  }, [compactRankedSlots, visibleGroups]);
  const board = useMemo(() => {
    const vacantSlots = slots.filter(slot => !slot.isOccupied).sort((left, right) => left.slotNumber - right.slotNumber);
    let fallbackIndex = 0;
    return Array.from({ length: 7 }, (_, index) => {
      const occupiedSlot = compactRankedSlots[index];
      if (occupiedSlot) return { ...occupiedSlot, slotNumber: index + 1 };
      const vacantSlot = vacantSlots[index - compactRankedSlots.length];
      const fallbackGroup = fallbackRankedGroups[fallbackIndex];
      if (fallbackGroup) {
        fallbackIndex += 1;
        return {
          id: vacantSlot?.id ?? -(index + 1),
          slotNumber: index + 1,
          bidAmount: 0,
          isOccupied: false,
          group: fallbackGroup,
        };
      }
      return {
        id: vacantSlot?.id ?? -(index + 1),
        slotNumber: index + 1,
        bidAmount: 0,
        isOccupied: vacantSlot ? false : true,
        group: null,
      };
    });
  }, [compactRankedSlots, fallbackRankedGroups, slots]);
  const rankingContinuation = compactRankedSlots.slice(7);
  const rankedGroups = [...board, ...rankingContinuation].flatMap(slot => slot.group ? [slot.group] : []);
  const rankedGroupIds = new Set(rankedGroups.map(group => group.id));
  const firstAvailableRankingSlot = slots
    .filter(slot => !slot.isOccupied && matchesAudience(slot.group))
    .sort((left, right) => left.slotNumber - right.slotNumber)[0] ?? null;
  const automaticPlacementSlot = firstAvailableRankingSlot ?? [...slots]
    .filter(slot => Boolean(slot.group) && matchesAudience(slot.group))
    .sort((left, right) => {
      const bidDifference = getMinimumRankingBidGram(left) - getMinimumRankingBidGram(right);
      return bidDifference || left.slotNumber - right.slotNumber;
    })[0] ?? null;
  const generalList = visibleGroups.filter(group => !rankedGroupIds.has(group.id));
  const searchCandidates = topSearchQuery.trim() ? [...rankedGroups, ...generalList] : generalList;
  const searchedGeneralList = searchCandidates.filter(group => {
    const query = topSearchQuery.trim().toLowerCase();
    if (!query) return true;
    return `${group.title} ${group.username ?? ""}`.toLowerCase().includes(query);
  });
  const leadSlot = board[0];
  const secondTier = board.slice(1, 3);
  const thirdTier = board.slice(3, 7);
  const rankingSnapshotKey = board.map(slot => `${slot.slotNumber}:${slot.group?.id ?? 0}:${slot.bidAmount}`).join("|");
  const rankingMotionKey = `${globalDirection}:${category}:${subcategory}:${country}:${city}:${rankingSnapshotKey}`;
  const bonusBalanceUnits = account?.user?.bonusBalance ?? user?.bonusBalance ?? 0;
  const bonus = (bonusBalanceUnits / 100).toFixed(2);
  const mainBalanceTonValue = Number(account?.user?.mainBalanceTon ?? 0);
  const mainTon = mainBalanceTonValue.toFixed(2);
  const canWithdrawMinimum = mainBalanceTonValue >= 0.1;
  const activeTonWithdrawal = activeTonWithdrawalId ? tonWithdrawals.find(item => item.id === activeTonWithdrawalId) ?? null : null;
  const withdrawalProcessingTitle = activeTonWithdrawal?.status === "sent"
    ? tx("Средства отправлены", "Funds sent")
    : tx("Отправляем средства", "Sending funds");
  const withdrawalProcessingNote = activeTonWithdrawal?.status === "sent"
    ? tx("Ожидаем сетевое подтверждение перевода.", "Waiting for network confirmation.")
    : tx("Статус обновится автоматически.", "The status updates automatically.");
  const totalBalanceLabel = `${(Number(mainTon) + bonusBalanceUnits / 100).toFixed(2)} GRAM`;
  const transactions = account?.transactions ?? [];
  const accountActivity = (accountActivityQuery.data ?? []) as Array<{
    id: string;
    type: "credit" | "stars" | "bid" | "deal" | "nft_transfer" | "deposit" | "withdrawal";
    status: string;
    createdAt: Date;
    title: string;
    subject: string;
    amount: number | null;
    currency: "GRAM" | "Stars" | "TON" | null;
    direction: "in" | "out" | "neutral";
    transactionHash?: string | null;
  }>;
  const visibleAccountActivity = accountActivity.slice(0, visibleActivityCount);
  const getFinancialActivityTitle = (item: typeof accountActivity[number]) => item.title === "gram_deposit" ? tx("Пополнение GRAM", "GRAM deposit")
    : item.title === "gram_withdrawal" ? tx("Вывод GRAM", "GRAM withdrawal")
    : item.title === "connection_bonus" ? tx("Бонус за подключение", "Connection bonus")
    : item.title === "manual_bonus" ? tx("Бонус TG TOP", "TG TOP bonus")
    : item.title === "reward_campaign_reserve" ? tx("Резерв кампании наград", "Reward campaign reserve")
    : item.title === "reward_campaign_release" ? tx("Возврат бюджета кампании", "Reward campaign release")
    : item.title === "reward_subscription" ? tx("Награда за подписку", "Subscription reward")
    : item.title === "ranking_spend" ? tx("Оплата места в рейтинге", "Ranking payment")
    : item.title === "ranking_refund" ? tx("Возврат оплаты за место", "Ranking refund")
    : item.title === "ranking_refund_pair" ? tx("Ставка не создана — средства возвращены", "Bid was not placed — funds returned")
    : item.title === "ranking_stars" ? tx("Ставка через Telegram Stars", "Telegram Stars bid")
    : item.title === "ranking_bid" ? tx("Зафиксированная ставка", "Recorded bid")
    : item.title === "nft_transfer" ? tx("Передача NFT", "NFT transfer")
    : tx("Операция TG TOP", "TG TOP operation");
  const getFinancialActivityStatus = (status: string) => status === "confirmed" ? tx("Подтверждено", "Confirmed")
    : status === "sent" ? tx("Отправлено", "Sent")
    : status === "broadcast_pending" || status === "submitted" ? tx("В обработке", "Processing")
    : status === "created" ? tx("Ожидает подтверждения", "Awaiting confirmation")
    : status === "cancelled" ? tx("Отмена", "Cancelled")
    : status === "failed_refunded" ? tx("Возвращено", "Refunded")
    : status === "refunded" ? tx("Итог 0 GRAM", "Net 0 GRAM")
    : status === "expired" ? tx("Истекло", "Expired")
    : status === "rejected" ? tx("Отклонено", "Rejected")
    : status === "paid" ? tx("Оплачено", "Paid")
    : status === "recorded" ? tx("Зафиксировано", "Recorded")
    : tx("Зафиксировано", "Recorded");
  const referral = account?.referral;
  const verifiedTasks = [
    {
      id: "connect-community",
      title: tx("Подключить сообщество", "Connect a community"),
      description: tx("Добавьте @TG_TOPBOT администратором своей группы или канала.", "Add @TG_TOPBOT as an administrator of your group or channel."),
      complete: mine.length > 0,
      action: () => openMine(),
    },
    {
      id: "list-community",
      title: tx("Разместить сообщество", "List a community"),
      description: tx("Появитесь в общем каталоге TG TOP.", "Appear in the TG TOP general catalog."),
      complete: mine.some(group => group.status === "listed"),
      action: () => openMine(),
    },
    {
      id: "ranking-bid",
      title: tx("Участвовать в рейтинге", "Join the ranking"),
      description: tx("Создайте зафиксированную ставку или оплатите позицию Stars.", "Create a recorded bid or pay for a position with Stars."),
      complete: accountActivity.some(item => item.type === "bid" || item.type === "stars"),
      action: () => setPage("top"),
    },
    {
      id: "refer-owner",
      title: tx("Пригласить владельца", "Invite an owner"),
      description: tx("Поделитесь личной ссылкой с другим владельцем сообщества.", "Share your personal link with another community owner."),
      complete: (referral?.referralsCount ?? 0) > 0,
      action: () => void copyReferralLink(),
    },
  ];
  const dealStatusLabel = (status: typeof deals[number]["status"], dealType: typeof deals[number]["dealType"] = "group_buy") => {
    const labels = {
      open: tx("Ожидает оплаты", "Awaiting payment"),
      escrow_funded: tx("Средства в эскроу", "Funds in escrow"),
      active: tx("Передача зафиксирована", "Transfer observed"),
      completed: tx("Завершена", "Completed"),
      expired: tx("Срок истек", "Expired"),
      cancelled: tx("Отменена", "Cancelled"),
      disputed: tx("На разборе", "Under review"),
    } as const;
    if (dealType === "nft_rent") {
      const rentalLabels = {
        open: tx("Заявка создана", "Request created"),
        escrow_funded: tx("Эскроу подтверждено", "Escrow funded"),
        active: tx("Назначение подтверждено", "Assignment observed"),
        completed: tx("Аренда завершена", "Rental completed"),
        expired: tx("Срок истёк", "Rental expired"),
        cancelled: tx("Заявка отменена", "Request cancelled"),
        disputed: tx("На разборе", "Under review"),
      } as const;
      return rentalLabels[status];
    }
    return labels[status];
  };
  const getDaysRemaining = (expiresAt: Date | null) => {
    if (!expiresAt) return null;
    return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000));
  };
  const getProtectedDealGuidance = (status: string, isBuyer: boolean, buyerConfirmed = false, dealType: typeof deals[number]["dealType"] = "group_buy") => {
    const role = isBuyer ? "buyer" : "seller";
    if (dealType === "nft_rent") {
      const rentalGuidance: Record<string, Record<"buyer" | "seller", [string, string]>> = {
        open: { buyer: ["Заявка создана. Оплата и назначение имени не выполняются автоматически.", "Request created. Payment and username assignment are not automatic."], seller: ["Заявка получена. Не передавайте имя до подтверждённого эскроу и официального Telegram/Fragment-действия.", "Request received. Do not assign the username before verified escrow and an official Telegram/Fragment action."] },
        escrow_funded: { buyer: ["Эскроу подтверждено. Дождитесь фиксации назначения в Telegram/Fragment; скрытой передачи нет.", "Escrow is verified. Wait for assignment to be observed in Telegram/Fragment; no hidden transfer occurs."], seller: ["Эскроу подтверждено. Назначение имени ещё не зафиксировано — подтвердите его только после проверки Telegram/Fragment.", "Escrow is verified. Username assignment is not observed yet — confirm only after checking Telegram/Fragment."] },
        active: { buyer: buyerConfirmed ? ["Назначение зафиксировано и ваше подтверждение записано.", "Assignment is observed and your confirmation is recorded."] : ["Назначение зафиксировано. Проверьте имя в Telegram/Fragment и подтвердите аренду.", "Assignment is observed. Verify the username in Telegram/Fragment and confirm the rental."], seller: ["Назначение зафиксировано. Финальный расчёт остаётся защищённым до подтверждения аренды.", "Assignment is observed. Final settlement remains protected until rental confirmation."] },
        completed: { buyer: ["Защищённая аренда завершена.", "Protected rental is complete."], seller: ["Защищённая аренда завершена.", "Protected rental is complete."] },
        expired: { buyer: ["Срок заявки истёк. Автоматического назначения имени не было.", "The request expired. No automatic username assignment occurred."], seller: ["Срок заявки истёк. Проверьте возврат эскроу по защищённому сценарию.", "The request expired. Verify the escrow refund through the protected flow."] },
        cancelled: { buyer: ["Заявка отменена без автоматической передачи имени.", "Request cancelled without automatic username transfer."], seller: ["Заявка отменена без автоматической передачи имени.", "Request cancelled without automatic username transfer."] },
        disputed: { buyer: ["Аренда находится на разборе.", "Rental is under review."], seller: ["Аренда находится на разборе.", "Rental is under review."] },
      };
      const [ru, en] = rentalGuidance[status]?.[role] ?? ["Статус аренды обновляется.", "Rental status is updating."];
      return tx(ru, en);
    }
    const guidance: Record<string, Record<"buyer" | "seller", [string, string]>> = {
      open: {
        buyer: ["Офер создан. Оплата станет доступна только после запуска проверенного эскроу.", "Offer created. Payment will become available only after verified escrow launches."],
        seller: ["Офер получен. Ожидайте подтвержденного финансирования перед передачей owner-прав.", "Offer received. Wait for verified funding before transferring owner rights."],
      },
      escrow_funded: {
        buyer: ["Финансирование подтверждено. Вы можете отменить офер до фиксации передачи owner-прав ботом.", "Funding is verified. You may cancel the offer until the bot observes owner-rights transfer."],
        seller: ["Финансирование подтверждено. Передайте owner-права в Telegram до дедлайна 21 день.", "Funding is verified. Transfer the Telegram owner rights before the 21-day deadline."],
      },
      active: {
        buyer: buyerConfirmed
          ? ["Ваше подтверждение передачи записано. Расчет остается заблокирован до проверки платежного контура.", "Your transfer acknowledgement is recorded. Settlement remains locked until payment-layer verification."]
          : ["Бот зафиксировал передачу owner-прав. Подтвердите получение, чтобы завершить защищенный этап передачи.", "The bot observed owner-rights transfer. Confirm receipt to complete the protected transfer stage."],
        seller: ["Передача owner-прав зафиксирована ботом. Финальный расчет доступен только после проверки платежного контура.", "Owner-rights transfer was observed. Final settlement is available only after payment-layer verification."],
      },
      completed: {
        buyer: ["Защищенный сценарий завершен.", "The protected flow is complete."],
        seller: ["Защищенный сценарий завершен.", "The protected flow is complete."],
      },
      cancelled: {
        buyer: ["Офер отменен до фиксации передачи owner-прав.", "The offer was cancelled before owner-rights transfer was observed."],
        seller: ["Офер отменен покупателем до фиксации передачи owner-прав.", "The buyer cancelled the offer before owner-rights transfer was observed."],
      },
      expired: {
        buyer: ["Срок передачи истек. Обратитесь в поддержку защищенного сценария.", "The transfer deadline expired. Contact protected-flow support."],
        seller: ["Срок передачи истек. Сделка требует ручного разбора.", "The transfer deadline expired. The deal requires manual review."],
      },
      disputed: {
        buyer: ["Сделка находится на разборе.", "The deal is under review."],
        seller: ["Сделка находится на разборе.", "The deal is under review."],
      },
    };
    const [ru, en] = guidance[status]?.[role] ?? ["Статус сделки обновляется.", "The deal status is updating."];
    return tx(ru, en);
  };
  const globalCount = topSection === "nft" ? visibleNfts.length : visibleGroups.length;
  const currentTopTitle = topSection === "bots"
    ? tx("Боты", "Bots")
    : topSection === "nft"
    ? "NFT"
    : globalDirection === "Все" || globalDirection === "NFT"
      ? tx("Все сообщества", "All communities")
      : getCategoryLabel(globalDirection, language);
  const currentTopCountry = topSection === "communities" ? (country === "Все" ? tx("Весь мир", "Worldwide") : getCountryLabel(country, language)) : null;
  const currentTopCity = topSection === "communities" && city !== "Все" ? getCityLabel(country, city, language) : null;
  const currentTopSubcategory = topSection === "communities" && subcategory !== "Все" ? getSubcategoryLabel(subcategory, language) : null;
  const topThemeOptions = Array.from(new Set(globalDirection === "Чаты"
    ? [...CATEGORY_SUBCATEGORIES["Чаты"]]
    : globalDirection === "Каналы"
      ? [...CATEGORY_SUBCATEGORIES["Каналы"]]
      : [...CATEGORY_SUBCATEGORIES["Каналы"], ...CATEGORY_SUBCATEGORIES["Чаты"]]
  )).filter(item => item !== "General");
  const telegramAvatar =
    typeof window !== "undefined"
      ? window.Telegram?.WebApp?.initDataUnsafe?.user?.photo_url
      : undefined;
  const selectedSlot = detail
    ? detailSlots.find(slot => slot.group?.id === detail.group.id)
    : undefined;
  const ownsDetail = detail?.group.ownerOpenId === user?.openId;
  const placementSlot = selectedSlot ?? (ownsDetail ? detailSlots.find(slot => !slot.group) : undefined);
  const detailPlacementIsPublic = Boolean(detail?.group.showOwnerContact && !detail?.group.anonymousListing);
  const detailVisibilityChanged = ownsDetail && detailPlacementIsPublic !== (detailVisibility === "public");
  const detailOutbidMinimum = placementSlot
    ? getMinimumRankingBidGram(placementSlot)
    : null;
  const detailMinimumBid = placementSlot
    ? ownsDetail ? getRankingFloorGram(placementSlot.slotNumber) : detailOutbidMinimum ?? getRankingFloorGram(placementSlot.slotNumber)
    : null;
  const rawDetailRankingBid = Number(detailBidInput);
  const normalizedDetailRankingBid = normalizeRankingBid(rawDetailRankingBid);
  const detailRankingBidAmount = detailMinimumBid !== null && normalizedDetailRankingBid !== undefined
    ? Math.min(MAX_RANKING_BID_GRAM, Math.max(detailMinimumBid, normalizedDetailRankingBid))
    : detailMinimumBid ?? 0.1;
  const detailRewardBudgetUnits = rewardCampaignEnabled ? parseGramInput(rewardBudget) : 0;
  const detailPriceBelowCurrent = Boolean(ownsDetail && selectedSlot && detailRankingBidAmount < selectedSlot.bidAmount / 1000);
  useEffect(() => {
    if (!placementSlot) return setDetailBidInput("");
    setDetailBidInput(formatTon(ownsDetail && selectedSlot ? selectedSlot.bidAmount / 1000 : getMinimumRankingBidGram(placementSlot)));
  }, [placementSlot?.id, selectedSlot?.bidAmount, ownsDetail]);
  useEffect(() => {
    setDetailVisibility(detailPlacementIsPublic ? "public" : "anonymous");
  }, [detail?.group.id, detailPlacementIsPublic]);
  useEffect(() => {
    if (!detail || !ownsDetail || lotGroupId !== null) return;
    const group = detail.group;
    setListingCountry(group.country ?? "Global");
    setListingCity(group.city ?? "Все");
    setListingSubcategory(group.subcategory ?? "General");
    setSalePriceTon(group.salePriceTon ? formatTon(group.salePriceTon) : "");
    setIsListingForSale(group.listingType === "sale" && Boolean(group.salePriceTon));
    setShowOwnerContact(Boolean(group.showOwnerContact));
    setManagerPublic(group.managerPublic !== false);
    setListingAnnouncementEnabled(group.listingAnnouncementEnabled ?? true);
    setSearchIndexable(Boolean(group.searchIndexable));
    setRewardCampaignEnabled(hasConfiguredRewardCampaign(group));
    setRewardBudget(group.rewardBudget ? formatGram(group.rewardBudget) : "");
    const joinReward = group.category === "Чаты" ? group.rewardPerManualAdd : group.rewardPerSubscription;
    setRewardPerSubscription(joinReward ? formatGram(joinReward) : "");
  }, [detail?.group.id, detail?.group.listingType, detail?.group.salePriceTon, ownsDetail, lotGroupId]);
  const detailBoardCategory = selectedSlot?.category ?? detailBoardScope?.category ?? detail?.group.category ?? "Все";
  const detailBoardCountry = selectedSlot?.country ?? detailBoardScope?.country ?? detail?.group.country ?? "Global";
  const detailBoardSubcategory = selectedSlot?.subcategory ?? detailBoardScope?.subcategory ?? detail?.group.subcategory ?? "Все";
  const detailCatalogPath = detail
    ? [
        tx("Все сообщества", "All communities"),
        getCountryLabel(detailBoardCountry, language),
        getCategoryLabel((detailBoardCategory === "Все" ? detail.group.category : detailBoardCategory) as "Каналы" | "Чаты", language),
        detailBoardSubcategory !== "Все" ? getSubcategoryLabel(detailBoardSubcategory, language) : null,
      ].filter((part): part is string => Boolean(part)).join(" · ")
    : "";
  const detailHeaderPath = detail
    ? [
        getCategoryLabel((detailBoardCategory === "Все" ? detail.group.category : detailBoardCategory) as "Каналы" | "Чаты", language),
        getCountryLabel(detailBoardCountry, language),
        detailBoardSubcategory !== "Все" ? getSubcategoryLabel(detailBoardSubcategory, language) : null,
      ].filter((part): part is string => Boolean(part)).join(" · ")
    : "";
  const detailHeaderAddress = detail?.group.username ? `@${detail.group.username}` : tx("Приватный", "Private");
  const outbidCandidates = targetSlot
    ? mine.filter(group =>
        (targetSlot.category === "Все" || targetSlot.category === group.category)
        && (targetSlot.subcategory === "Все" || targetSlot.subcategory === group.subcategory)
      )
    : [];
  const lotGroupPickerCandidates = mine;
  const lotGroupCandidates = placementSlot
    ? lotGroupPickerCandidates.filter(group =>
        (placementSlot.category === "Все" || placementSlot.category === group.category)
        && (placementSlot.subcategory === "Все" || placementSlot.subcategory === group.subcategory)
      )
    : lotGroupPickerCandidates;
  const selectedLotGroup = lotGroupCandidates.find(group => group.id === lotGroupId) ?? null;
  const existingRewardBudgetUnits = selectedLotGroup && hasConfiguredRewardCampaign(selectedLotGroup)
    ? Number(selectedLotGroup.rewardBudget ?? 0)
    : 0;
  const detailRewardBudgetDeltaUnits = detailRewardBudgetUnits === undefined
    ? 0
    : detailRewardBudgetUnits - existingRewardBudgetUnits;
  const detailPlacementTotalUnits = detailRewardBudgetUnits === undefined
    ? undefined
    : Math.round(detailRankingBidAmount * 100) + detailRewardBudgetUnits;
  const detailBalanceChangeUnits = detailRewardBudgetUnits === undefined
    ? undefined
    : Math.round(detailRankingBidAmount * 100) + detailRewardBudgetDeltaUnits;
  const lotSettingsLocked = !selectedLotGroup;
  const detailRankingPreviewSlotNumber = selectedLotGroup
    ? getSimulatedRankingSlotNumber(detailTopPreviewSlots, selectedLotGroup.id, detailRankingBidAmount, selectedLotGroup.category)
    : null;
  const detailDisplayedSlotNumber = detailBoardScope?.displayPosition ?? selectedSlot?.slotNumber ?? detailRankingPreviewSlotNumber;
  const detailTypeRankingPreviewPosition = selectedLotGroup
    ? getSimulatedRankingTypePosition(detailTopPreviewSlots, selectedLotGroup.id, selectedLotGroup.category, detailRankingBidAmount)
    : null;
  const detailWillDrop = Boolean(detailPriceBelowCurrent && detailRankingPreviewSlotNumber && selectedSlot && detailRankingPreviewSlotNumber > selectedSlot.slotNumber);
  const selectedOutbidGroup = outbidCandidates.find(group => group.id === outbidGroupId) ?? null;
  const outbidMinimum = targetSlot ? getMinimumRankingBidGram(targetSlot) : 0.1;
  const rawOutbidBid = Number(outbidBidInput);
  const outbidBidAmount = Number.isFinite(rawOutbidBid)
    ? Math.min(MAX_RANKING_BID_GRAM, Math.max(outbidMinimum, Math.round(rawOutbidBid * 10) / 10))
    : outbidMinimum;
  const detailEntryUrl = detail?.group.monthlyEntryInviteLink
    ?? detail?.group.inviteLink
    ?? null;
  const detailHasPaidEntry = Boolean(detail?.group.monthlyEntryInviteLink && detail.group.monthlyEntryStars);
  const detailOwner = detail?.owner ?? null;
  const detailSnapshots = [...(detail?.snapshots ?? [])].sort((left, right) => new Date(left.recordedAt).getTime() - new Date(right.recordedAt).getTime());
  const latestDetailSnapshot = detailSnapshots.at(-1);
  const dayAgoDetailSnapshot = detailSnapshots.find(snapshot => new Date(snapshot.recordedAt).getTime() >= Date.now() - 86_400_000) ?? detailSnapshots[0];
  const dailyGrowthPct = latestDetailSnapshot && dayAgoDetailSnapshot && dayAgoDetailSnapshot.membersCount > 0
    ? ((latestDetailSnapshot.membersCount - dayAgoDetailSnapshot.membersCount) / dayAgoDetailSnapshot.membersCount) * 100
    : null;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfThisMonth = new Date(startOfToday.getFullYear(), startOfToday.getMonth(), 1);
  const detailPeriodStart = detailStatsPeriod === "day" ? startOfToday : detailStatsPeriod === "month" ? startOfThisMonth : null;
  const detailSnapshotBeforePeriod = detailPeriodStart
    ? detailSnapshots.filter(snapshot => new Date(snapshot.recordedAt).getTime() < detailPeriodStart.getTime()).at(-1)
    : undefined;
  const detailPeriodAvailable = detailStatsPeriod === "all" || Boolean(detailSnapshotBeforePeriod);
  const getDetailPeriodMetric = (field: "messagesCount" | "joinedCount" | "leavesCount" | "invitedCount", currentValue: number) =>
    detailPeriodAvailable ? Math.max(0, currentValue - (detailSnapshotBeforePeriod?.[field] ?? 0)) : null;
  const detailMessagesForPeriod = detail
    ? getDetailPeriodMetric("messagesCount", detail.group.messagesCount)
    : null;
  const detailJoinedForPeriod = detail
    ? getDetailPeriodMetric("joinedCount", detail.group.joinedCount)
    : null;
  const detailLeavesForPeriod = detail
    ? getDetailPeriodMetric("leavesCount", detail.group.leavesCount)
    : null;
  const detailInvitedForPeriod = detail
    ? getDetailPeriodMetric("invitedCount", detail.group.invitedCount)
    : null;
  const detailMembersLabel = detail?.group.category === "Каналы" ? "подписчика" : "участника";
  const detailEntryReward = detail
    ? detail.group.category === "Чаты"
      ? Number(detail.group.rewardPerManualAdd ?? detail.group.reward?.manualAddAmount ?? detail.group.rewardAmount ?? 0)
      : Number(detail.group.rewardPerSubscription ?? detail.group.reward?.subscriptionAmount ?? detail.group.rewardAmount ?? 0)
    : 0;
  const detailRewardActive = Boolean(detail?.group.rewardActive && detailEntryReward > 0);
  const openRewardAwareEntry = () => {
    if (!detail) return;
    const openVerifiedEntry = () => resolveVerifiedEntryLink.mutate({ groupId: detail.group.id });
    if (!detailRewardActive || !isAuthenticated) {
      openVerifiedEntry();
      return;
    }
    createRewardInviteLink.mutate({ groupId: detail.group.id }, {
      onError: () => {
        toast.message(tx("Персональная ссылка пока недоступна — открываем подтверждённый вход без награды.", "Your personal link is unavailable — opening verified entry without a reward."));
        openVerifiedEntry();
      },
    });
  };
  const persistedDetailSalePrice = detail?.group.salePriceTon ? formatTon(detail.group.salePriceTon) : "";
  const detailSalePrice = ownsDetail ? salePriceTon : persistedDetailSalePrice;
  const detailSalePriceUnits = parseGramInput(detailSalePrice);
  const detailSaleEnabled = Boolean((ownsDetail ? isListingForSale : detail?.group.listingType === "sale") && (detailSalePriceUnits ?? 0) > 0);
  const detailCanBeBought = Boolean(!ownsDetail && detailSaleEnabled);
  const detailHasEnoughBalanceToBuy = Boolean(detailSalePriceUnits && bonusBalanceUnits >= detailSalePriceUnits);
  const subscriptionReward = !ownsDetail && detail?.group.category === "Каналы" ? detail.group.reward?.subscriptionAmount ?? 0 : 0;
  const inviteReward = !ownsDetail && detail?.group.category === "Каналы" ? detail.group.reward?.inviteAmount ?? 0 : 0;
  const manualAddReward = !ownsDetail && detail?.group.category === "Чаты" ? detail.group.reward?.manualAddAmount ?? 0 : 0;
  const selectedListingGroups = mine.filter(group => selectedGroupIds.includes(group.id));
  const privateEntryEligibleGroup = selectedListingGroups.length === 1 && !selectedListingGroups[0]?.username ? selectedListingGroups[0] : undefined;
  const orderedMyGroups = myGroupsLayout.length === mine.length ? myGroupsLayout : mine;
  const pinnedMyGroups = orderedMyGroups.filter(group => group.ownerPinned);
  const unpinnedMyGroups = orderedMyGroups.filter(group => !group.ownerPinned);
  const myGroupsMatchStatus = (group: Group) =>
    myGroupsStatusFilter === "all" || (myGroupsStatusFilter === "listed" ? group.status === "listed" : group.status !== "listed");
  const normalizedMyGroupsSearch = myGroupsSearchQuery.trim().toLocaleLowerCase();
  const myGroupsMatchSearch = (group: Group) =>
    !normalizedMyGroupsSearch || [group.title, group.username, group.category, group.subcategory]
      .filter((value): value is string => Boolean(value))
      .some(value => value.toLocaleLowerCase().includes(normalizedMyGroupsSearch));
  const myGroupsMatchFilters = (group: Group) => myGroupsMatchStatus(group) && myGroupsMatchSearch(group);
  const visiblePinnedMyGroups = pinnedMyGroups.filter(myGroupsMatchFilters);
  const visibleUnpinnedMyGroups = unpinnedMyGroups.filter(myGroupsMatchFilters);
  const visibleMyGroups = orderedMyGroups.filter(myGroupsMatchFilters);
  const isMyGroupsSearchActive = normalizedMyGroupsSearch.length > 0;
  const visibleMyGroupsMembers = visibleMyGroups.reduce((sum, group) => sum + Math.max(0, group.membersCount || 0), 0);
  const myGroupsDragActiveGroup = myGroupsDragActiveId ? orderedMyGroups.find(group => group.id === myGroupsDragActiveId) : undefined;
  const managedCountries = catalogTaxonomy?.countries?.length
    ? catalogTaxonomy.countries
    : COUNTRY_OPTIONS.map(code => ({ id: code, code, label: getCountryLabel(code, language), sortOrder: 0 }));
  const managedCities = catalogTaxonomy?.cities?.length
    ? catalogTaxonomy.cities
    : Object.entries(CITY_OPTIONS).flatMap(([countryCode, cities]) => cities.map(city => ({ id: `${countryCode}:${city.value}`, countryCode, code: city.value, label: city[language], sortOrder: 0 })));
  const managedTopics = catalogTaxonomy?.topics?.length
    ? catalogTaxonomy.topics
    : (Object.entries(CATEGORY_SUBCATEGORIES) as Array<["Каналы" | "Чаты", readonly string[]]>).flatMap(([category, topics]) => topics.map(code => ({ id: `${category}:${code}`, category, code, label: getSubcategoryLabel(code, language), sortOrder: 0 })));
  const getManagedCountryLabel = (code: string) => managedCountries.find(country => country.code === code)?.label ?? getCountryLabel(code, language);
  const getManagedCityLabel = (countryCode: string, code: string) => managedCities.find(city => city.countryCode === countryCode && city.code === code)?.label ?? getCityLabel(countryCode, code, language);
  const getManagedTopicLabel = (category: "Каналы" | "Чаты" | "Боты", code: string) => managedTopics.find(topic => topic.category === category && topic.code === code)?.label ?? getSubcategoryLabel(code, language);
  const botTopicOptions = managedTopics.filter(topic => topic.category === "Боты");
  const filteredModerationBots = allBotListings.filter(bot => botModerationFilter === "all" || bot.moderationStatus === botModerationFilter);
  const globalSubcategoryCategory = globalDirection === "Каналы" || globalDirection === "Чаты" ? globalDirection : null;
  const globalSubcategoryOptions = Array.from(new Set(managedTopics
    .filter(topic => topic.category !== "Боты" && (!globalSubcategoryCategory || topic.category === globalSubcategoryCategory) && topic.code !== "General")
    .map(topic => topic.code)));
  const listingCategory = selectedListingGroups.length && selectedListingGroups.every(group => group.category === selectedListingGroups[0]?.category)
    ? selectedListingGroups[0]?.category
    : null;
  const listingSubcategoryOptions = listingCategory ? managedTopics.filter(topic => topic.category === listingCategory).map(topic => topic.code) : [];
  const monthlyEntryEligibleGroup = selectedListingGroups.length === 1 && selectedListingGroups[0]?.category === "Каналы" && !selectedListingGroups[0]?.username
    ? selectedListingGroups[0]
    : null;
  const selectedListingGroup = selectedListingGroups.length === 1 ? selectedListingGroups[0] : null;
  const rawListingRankingBid = Number(listingRankingBid);
  const listingRankingBidAmount = Number.isFinite(rawListingRankingBid)
    ? Math.min(MAX_RANKING_BID_GRAM, Math.max(0.1, Math.round(rawListingRankingBid * 10) / 10))
    : 0.1;
  const listingSlotsQuery = trpc.tgTop.getSlots.useQuery({
    category: selectedListingGroup?.category ?? "Все",
    country: listingCountry,
    subcategory: listingSubcategory || "Все",
    city: listingCity,
  }, { enabled: Boolean(selectedListingGroup), refetchInterval: 12_000, refetchIntervalInBackground: false });
  const listingSlots = (listingSlotsQuery.data ?? []) as Slot[];
  const listingRankingPreviewSlotNumber = selectedListingGroup
    ? getSimulatedRankingSlotNumber(listingSlots, selectedListingGroup.id, listingRankingBidAmount)
    : null;
  const listingRankingPreviewSlot = listingRankingPreviewSlotNumber
    ? listingSlots.find(slot => slot.slotNumber === listingRankingPreviewSlotNumber) ?? null
    : null;
  const listingTargetIsOwnSlot = listingRankingPreviewSlot?.group?.id === selectedListingGroup?.id;
  const listingRankingMinimum = listingRankingPreviewSlot
    ? listingTargetIsOwnSlot ? getRankingFloorGram(listingRankingPreviewSlot.slotNumber) : getMinimumRankingBidGram(listingRankingPreviewSlot)
    : null;
  const canPayListingRanking = Boolean(listingRankingPreviewSlot && listingRankingMinimum !== null && listingRankingBidAmount >= listingRankingMinimum);
  const listingRankingScope = selectedListingGroup
    ? [getCategoryLabel(selectedListingGroup.category, language), listingSubcategory ? getSubcategoryLabel(listingSubcategory, language) : null, getCountryLabel(listingCountry, language)].filter((part): part is string => Boolean(part)).join(" · ")
    : "";
  const selectedNft = myNfts.find(nft => nft.id === selectedNftId) ?? null;
  const showcaseNft = myNfts.find(nft => nft.id === showcaseNftId) ?? null;
  const reviewedRecipient = nftRecipientQuery.data;
  const activeRankingBoardScope = { category, country: country === "Все" ? "Global" : country, subcategory, city };

  const openGroup = (id: number, boardScope?: { category: "Все" | "Каналы" | "Чаты"; country: string; subcategory: string; city: string }) => {
    setDetailReturnPage(page === "details" ? "top" : page);
    const displayPosition = boardScope ? rankedGroups.findIndex(group => group.id === id) + 1 : 0;
    setDetailBoardScope(boardScope ? { ...boardScope, ...(displayPosition > 0 ? { displayPosition } : {}) } : null);
    setLotGroupId(null);
    setSelectedGroupId(id);
    setPage("details");
  };
  const openOwner = (openId: string) => {
    setSelectedOwnerOpenId(openId);
    setPage("owner");
  };
  const openMine = (slot?: Slot) => {
    if (!isAuthenticated) {
      startTelegramLogin();
      return;
    }
    void mineQuery.refetch();
    setStarsPaymentGroup(null);
    if (slot) {
      const nextBid = getMinimumRankingBidGram(slot);
      setAmount(formatTon(nextBid));
    }
    setTargetSlot(slot ?? null);
    setPage("mine");
  };
  const openTopListingPicker = () => {
    if (!isAuthenticated) {
      startTelegramLogin();
      return;
    }
    void mineQuery.refetch();
    setTopListingGroupIds([]);
    setTopListingPickerOpen(true);
  };
  const toggleTopListingGroup = (groupId: number) => {
    setTopListingGroupIds(ids => ids.includes(groupId) ? ids.filter(id => id !== groupId) : [...ids, groupId]);
  };
  const continueTopListingPicker = () => {
    if (!topListingGroupIds.length) return;
    setTopListingPickerOpen(false);
    openListing(topListingGroupIds);
  };
  const getTargetSlotAddress = (slot: Slot) => {
    const slotCategory = slot.category && slot.category !== "Все" ? getCategoryLabel(slot.category, language) : tx("Все сообщества", "All communities");
    const slotCountry = slot.country && slot.country !== "Global" ? getCountryLabel(slot.country, language) : tx("Весь мир", "Worldwide");
    const slotTopic = slot.subcategory && slot.subcategory !== "Все" && slot.subcategory !== "General" ? getSubcategoryLabel(slot.subcategory, language) : null;
    return [slotCategory, slotCountry, slotTopic].filter(Boolean).join(" · ");
  };
  const openOutbid = (slot: Slot) => {
    const minimum = getMinimumRankingBidGram(slot);
    setTargetSlot(slot);
    setOutbidGroupId(null);
    setOutbidBidInput(formatTon(minimum));
    setOutbidVisibility("anonymous");
    setOutbidOpen(true);
  };
  const applyLotGroupSettings = (group: Group) => {
    setLotGroupId(group.id);
    setListingCountry(group.country ?? "Global");
    setListingCity(group.city ?? "Все");
    setDetailVisibility(group.showOwnerContact && !group.anonymousListing ? "public" : "anonymous");
    setSelectedManagerTelegramUserId(group.managerTelegramUserId ?? null);
    setManagerPublic(group.managerPublic !== false);
    setListingAnnouncementEnabled(group.listingAnnouncementEnabled ?? true);
    setListingSubcategory(group.subcategory ?? "General");
    setIsListingForSale(group.listingType === "sale" && Boolean(group.salePriceTon));
    setSalePriceTon(group.salePriceTon ? formatTon(group.salePriceTon) : "");
    setRewardCampaignEnabled(hasConfiguredRewardCampaign(group));
    setRewardBudget(group.rewardBudget ? formatGram(group.rewardBudget) : "");
    const joinReward = group.category === "Чаты" ? group.rewardPerManualAdd : group.rewardPerSubscription;
    setRewardPerSubscription(joinReward ? formatGram(joinReward) : "");
  };
  const toggleGroupSelection = (groupId: number) => {
    setSelectedGroupIds(current =>
      current.includes(groupId)
        ? current.filter(id => id !== groupId)
        : [...current, groupId]
    );
  };
  const selectMyGroup = (groupId: number) => {
    setMyGroupsSelectionMode(true);
    setSelectedGroupIds(current => current.includes(groupId) ? current : [...current, groupId]);
  };
  const exitMyGroupsSelection = () => {
    setMyGroupsSelectionMode(false);
    setSelectedGroupIds([]);
  };
  const beginMyGroupsSelectionHold = (groupId: number) => {
    if (myGroupsSelectionMode) return;
    if (myGroupsSelectionHoldTimer.current !== null) window.clearTimeout(myGroupsSelectionHoldTimer.current);
    myGroupsSelectionHoldTimer.current = window.setTimeout(() => {
      myGroupsSelectionHoldTriggered.current = true;
      selectMyGroup(groupId);
      (window.Telegram?.WebApp as unknown as { HapticFeedback?: { impactOccurred: (style: "medium") => void } } | undefined)?.HapticFeedback?.impactOccurred("medium");
    }, 420);
  };
  const endMyGroupsSelectionHold = () => {
    if (myGroupsSelectionHoldTimer.current !== null) window.clearTimeout(myGroupsSelectionHoldTimer.current);
    myGroupsSelectionHoldTimer.current = null;
  };
  const openListing = (groupIds: number[], options?: { inline?: boolean }) => {
    const listingGroups = mine.filter(group => groupIds.includes(group.id));
    const firstGroup = listingGroups[0];
    const selectedGroupsShareCategory = listingGroups.length > 0 && listingGroups.every(group => group.category === firstGroup?.category);
    setSelectedGroupIds(Array.from(new Set(groupIds)));
    setListingCountry(firstGroup?.country ?? "Global");
    setListingCity(firstGroup?.city ?? "Все");
    setListingSubcategory(selectedGroupsShareCategory ? firstGroup?.subcategory ?? "General" : "");
    setListingRankingBid("0.1");
    setSalePriceTon(firstGroup?.salePriceTon ? formatTon(firstGroup.salePriceTon) : "");
    setIsListingForSale(firstGroup?.listingType === "sale" && Boolean(firstGroup.salePriceTon));
    setManagerPublic(firstGroup?.managerPublic !== false);
    setListingAnnouncementEnabled(firstGroup?.listingAnnouncementEnabled ?? true);
    setMonthlyEntryEnabled(Boolean(firstGroup?.monthlyEntryEnabled));
    setMonthlyEntryStars(firstGroup?.monthlyEntryStars ? String(firstGroup.monthlyEntryStars) : "");
    setMonthlyEntryLinkName(firstGroup?.monthlyEntryLinkName ?? "");
    setRewardCampaignEnabled(firstGroup ? hasConfiguredRewardCampaign(firstGroup) : false);
    setRewardBudget(firstGroup?.rewardBudget ? formatGram(firstGroup.rewardBudget) : "");
    const initialJoinReward = firstGroup?.category === "Чаты" ? firstGroup?.rewardPerManualAdd : firstGroup?.rewardPerSubscription;
    setRewardPerSubscription(initialJoinReward ? formatGram(initialJoinReward) : "");
    setRewardPerInvite(firstGroup?.rewardPerInvite ? formatGram(firstGroup.rewardPerInvite) : "");
    setRewardPerManualAdd(firstGroup?.rewardPerManualAdd ? formatGram(firstGroup.rewardPerManualAdd) : "0.01");
    setInlineListingOpen(Boolean(options?.inline));
    setListingOpen(!options?.inline);
  };
  const openGiveawayCreate = (group: Group) => {
    setGiveawayGroupId(String(group.id));
    setGiveawayTitle(`Розыгрыш ${group.title}`);
    setGiveawayPrizeTitle("");
    setGiveawayRules("");
    setGiveawayEndsAt("");
    setGiveawayBoostOnly(false);
    setPage("giveaways");
    window.setTimeout(() => setGiveawayCreateOpen(true), 0);
  };
  const saveListing = () => {
    if (!selectedGroupIds.length) return toast.error(tx("Выберите хотя бы одну группу", "Select a community that is already listed."));
    const normalizedSalePrice = getSalePriceForSave();
    if (normalizedSalePrice === undefined) return;
    const canConfigureRewards = selectedListingGroups.length === 1;
    const budgetUnits = rewardCampaignEnabled ? parseGramInput(rewardBudget) : 0;
    const joinRewardUnits = rewardCampaignEnabled ? parseGramInput(rewardPerSubscription) : 0;
    const rewardGroup = selectedListingGroups[0];
    const isChatRewardCampaign = rewardGroup?.category === "Чаты";
    if (canConfigureRewards && rewardCampaignEnabled && [budgetUnits, joinRewardUnits].some(value => value === undefined)) {
      return toast.error(tx("Укажите бюджет и награду за подписчика", "Enter the campaign budget and subscriber reward."));
    }
    listWithCredits.mutate({
      groupIds: selectedGroupIds,
      country: listingCountry,
      city: listingCity === "Все" ? undefined : listingCity,
      subcategory: listingCategory && listingSubcategory ? listingSubcategory : undefined,
      salePriceTon: normalizedSalePrice ?? undefined,
      managerPublic,
      listingAnnouncementEnabled,
      searchIndexable: selectedListingGroups.length === 1 ? searchIndexable : undefined,
      monthlyEntryEnabled,
      monthlyEntryStars: monthlyEntryEnabled ? Number(monthlyEntryStars) : undefined,
      monthlyEntryLinkName: monthlyEntryEnabled ? monthlyEntryLinkName.trim() || undefined : undefined,
      ...(canConfigureRewards ? {
        rewardActive: rewardCampaignEnabled,
        rewardBudget: budgetUnits,
        rewardPerSubscription: isChatRewardCampaign ? 0 : joinRewardUnits,
        rewardPerInvite: isChatRewardCampaign ? 0 : joinRewardUnits,
        rewardPerManualAdd: isChatRewardCampaign ? joinRewardUnits : 0,
      } : {}),
    });
  };
  const getSalePriceForSave = (): string | null | undefined => {
    if (!isListingForSale) return null;
    const salePriceUnits = parseGramInput(salePriceTon);
    if (salePriceUnits === undefined || salePriceUnits < 1) {
      toast.error(tx("Укажите цену продажи от 0.01 GRAM", "Enter a sale price of at least 0.01 GRAM."));
      return undefined;
    }
    return formatGram(salePriceUnits);
  };
  const saveInlineDetailListing = () => {
    if (!detail) return;
    const group = detail.group;
    const normalizedSalePrice = getSalePriceForSave();
    if (normalizedSalePrice === undefined) return;
    const budgetUnits = rewardCampaignEnabled ? parseGramInput(rewardBudget) : 0;
    const joinRewardUnits = rewardCampaignEnabled ? parseGramInput(rewardPerSubscription) : 0;
    if (rewardCampaignEnabled && [budgetUnits, joinRewardUnits].some(value => value === undefined)) {
      return toast.error(tx("Укажите бюджет и награду за подписчика", "Enter the campaign budget and subscriber reward."));
    }
    listWithCredits.mutate({
      groupIds: [group.id],
      country: listingCountry,
      city: listingCity === "Все" ? undefined : listingCity,
      subcategory: listingSubcategory || undefined,
      salePriceTon: normalizedSalePrice ?? undefined,
      anonymousListing: detailVisibility === "anonymous",
      showOwnerContact,
      managerPublic,
      listingAnnouncementEnabled,
      searchIndexable,
      rewardActive: rewardCampaignEnabled,
      rewardBudget: budgetUnits,
      rewardPerSubscription: group.category === "Чаты" ? 0 : joinRewardUnits,
      rewardPerInvite: group.category === "Чаты" ? 0 : joinRewardUnits,
      rewardPerManualAdd: group.category === "Чаты" ? joinRewardUnits : 0,
    });
  };
  const removeSelectedFromListing = () => {
    const listedIds = mine.filter(group => selectedGroupIds.includes(group.id) && group.status === "listed").map(group => group.id);
    if (!listedIds.length) return toast.error(tx("Выберите группу, которая уже находится в каталоге", "Select a community that is already listed."));
    unlistGroups.mutate({ groupIds: listedIds });
  };
  const deleteSelectedGroups = () => {
    if (!selectedGroupIds.length) return toast.error(tx("Выберите группы для удаления", "Select communities to delete."));
    if (window.confirm(tx("Удалить выбранные группы из кабинета?", "Delete selected communities from account?"))) {
      deleteGroups.mutate({ groupIds: selectedGroupIds });
    }
  };
  const persistMyGroupsLayout = (nextGroups: Group[]) => {
    setMyGroupsLayout(nextGroups);
    saveMyGroupsLayoutMutation.mutate({
      orderedGroupIds: nextGroups.map(group => group.id),
      pinnedGroupIds: nextGroups.filter(group => group.ownerPinned).map(group => group.id),
    });
  };
  const toggleMyGroupPin = (groupId: number) => {
    const target = orderedMyGroups.find(group => group.id === groupId);
    if (!target) return;
    const updated = orderedMyGroups.map(group => group.id === groupId ? { ...group, ownerPinned: !group.ownerPinned } : group);
    const next = target.ownerPinned
      ? [...updated.filter(group => group.ownerPinned), ...updated.filter(group => !group.ownerPinned)]
      : [updated.find(group => group.id === groupId)!, ...updated.filter(group => group.id !== groupId && group.ownerPinned), ...updated.filter(group => !group.ownerPinned)];
    persistMyGroupsLayout(next);
  };
  const handleMyGroupsDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const activeGroup = orderedMyGroups.find(group => group.id === Number(active.id));
    const overGroup = orderedMyGroups.find(group => group.id === Number(over.id));
    if (!activeGroup || !overGroup || Boolean(activeGroup.ownerPinned) !== Boolean(overGroup.ownerPinned)) return;
    const section = activeGroup.ownerPinned ? pinnedMyGroups : unpinnedMyGroups;
    const from = section.findIndex(group => group.id === activeGroup.id);
    const to = section.findIndex(group => group.id === overGroup.id);
    if (from < 0 || to < 0) return;
    const reorderedSection = arrayMove(section, from, to);
    persistMyGroupsLayout(activeGroup.ownerPinned ? [...reorderedSection, ...unpinnedMyGroups] : [...pinnedMyGroups, ...reorderedSection]);
  };
  const copyReferralLink = async () => {
    if (!referral?.referralLink) return toast.error(tx("Реферальная ссылка загружается", "Your referral link is still loading."));
    try {
      await navigator.clipboard.writeText(referral.referralLink);
      toast.success(tx("Реферальная ссылка скопирована", "Referral link copied."));
    } catch {
      toast.error(tx("Не удалось скопировать ссылку. Скопируйте ее вручную.", "Could not copy the link. Please copy it manually."));
    }
  };
  const addBot = async (kind: "channel" | "group") => {
    if (createCommunityOnboardingIntent.isPending) return;
    const groupAdminRights = "change_info+delete_messages+invite_users+pin_messages+manage_chat";
    const channelAdminRights = "change_info+post_messages+edit_messages+delete_messages+invite_users+manage_chat";
    const webApp = window.Telegram?.WebApp as unknown as { initData?: string } | undefined;
    const desktopTab = webApp?.initData ? null : window.open("about:blank", "_blank");
    if (desktopTab) desktopTab.opener = null;
    try {
      const intent = await createCommunityOnboardingIntent.mutateAsync({ kind });
      const query = kind === "channel"
        ? `startchannel&admin=${channelAdminRights}`
        : `startgroup=${intent.token}&admin=${groupAdminRights}`;
      const target = `https://t.me/TG_TOPBOT?${query}`;
      if (desktopTab && !desktopTab.closed) {
        desktopTab.location.href = target;
        return;
      }
      if (!openTelegramCommunityLink(target)) {
        toast.error(tx("Не удалось открыть выбор сообщества. Разрешите всплывающие окна и попробуйте снова.", "Could not open the community picker. Allow pop-ups and try again."));
      }
    } catch (error) {
      if (desktopTab && !desktopTab.closed) desktopTab.close();
      toast.error(error instanceof Error ? error.message : tx("Не удалось подготовить безопасное подключение.", "Could not prepare a secure connection."));
    }
  };
  const startBotAdminSetup = (kind: "channel" | "group") => {
    setAdminGuideKind(kind);
    addBot(kind);
  };
  const selectGlobalDirection = (value: GlobalDirection) => {
    setTopSection(value === "NFT" ? "nft" : "communities");
    setGlobalDirection(value);
    if (value !== "NFT") {
      setCategory(value);
    }
  };
  const selectTopSection = (section: TopSection) => {
    setTopSection(section);
    if (section === "nft") {
      setGlobalDirection("NFT");
      return;
    }
    if (globalDirection === "NFT") {
      setGlobalDirection("Все");
      setCategory("Все");
    }
  };
  const resetTopFilters = () => {
    setTopSection("communities");
    setGlobalDirection("Все");
    setCategory("Все");
    setSubcategory("Все");
    setCountry("Все");
    setCity("Все");
    setAudience("all");
    setTopSearchQuery("");
    setTopSearchOpen(false);
  };
  const submitPlacement = (group: Group) => {
    if (!targetSlot?.id)
      return toast.error(
        tx("Эта позиция будет доступна после создания рейтинговой доски.", "This placement will be available after the ranking board is created.")
      );
    const value = normalizeRankingBid(Number(amount));
    const minimum = getMinimumRankingBidGram(targetSlot);
    if (value === undefined || value < minimum)
      return toast.error(tx(`Минимальная ставка: ${formatTon(minimum)} GRAM с шагом 0.1`, `Minimum bid: ${formatTon(minimum)} GRAM in 0.1 steps`));
    const normalizedSalePrice = getSalePriceForSave();
    if (normalizedSalePrice === undefined) return;
    const budgetUnits = rewardCampaignEnabled ? parseGramInput(rewardBudget) : 0;
    const joinRewardUnits = rewardCampaignEnabled ? parseGramInput(rewardPerSubscription) : 0;
    if (rewardCampaignEnabled && [budgetUnits, joinRewardUnits].some(item => item === undefined)) {
      return toast.error(tx("Укажите бюджет и награду за подписчика", "Enter the campaign budget and subscriber reward."));
    }
    const isChat = group.category === "Чаты";
    placeBid.mutate({
      slotId: targetSlot.id,
      groupId: group.id,
      bidAmount: value,
      currentBid: `${formatTon(value)} GRAM`,
      anonymousListing: detailVisibility === "anonymous",
      showOwnerContact,
      managerPublic,
      listingAnnouncementEnabled,
      salePriceTon: normalizedSalePrice,
      rewardActive: rewardCampaignEnabled,
      rewardBudget: budgetUnits,
      rewardPerSubscription: isChat ? 0 : joinRewardUnits,
      rewardPerManualAdd: isChat ? joinRewardUnits : 0,
    });
  };
  const openStarsPayment = (group: Group) => {
    if (!targetSlot?.id) return toast.error(tx("Эта позиция пока недоступна.", "This placement is not available yet."));
    const currentGroup = mine.find(item => item.id === group.id) ?? group;
    const value = normalizeRankingBid(Number(amount));
    const minimum = getMinimumRankingBidGram(targetSlot);
    if (value === undefined || value < minimum) {
      return toast.error(tx(`Минимальная ставка: ${formatTon(minimum)} GRAM с шагом 0.1`, `Minimum bid: ${formatTon(minimum)} GRAM in 0.1 steps`));
    }
    setAmount(formatTon(minimum));
    setListingCountry(targetSlot.country && targetSlot.country !== "Все" ? targetSlot.country : "Global");
    setListingCity("Все");
    setListingSubcategory(targetSlot.subcategory && targetSlot.subcategory !== "Все" ? targetSlot.subcategory : "General");
    setDetailVisibility(currentGroup.anonymousListing === false ? "public" : "anonymous");
    setShowOwnerContact(Boolean(currentGroup.showOwnerContact));
    setLotGroupId(currentGroup.id);
    setSelectedManagerTelegramUserId(currentGroup.managerTelegramUserId ?? null);
    setManagerPublic(currentGroup.managerPublic !== false);
    setListingAnnouncementEnabled(currentGroup.listingAnnouncementEnabled ?? true);
    setIsListingForSale(currentGroup.listingType === "sale" && Boolean(currentGroup.salePriceTon));
    setSalePriceTon(currentGroup.salePriceTon ? formatTon(currentGroup.salePriceTon) : "");
    setRewardCampaignEnabled(hasConfiguredRewardCampaign(currentGroup));
    setRewardBudget(currentGroup.rewardBudget ? formatGram(currentGroup.rewardBudget) : "");
    const joinReward = currentGroup.category === "Чаты" ? currentGroup.rewardPerManualAdd : currentGroup.rewardPerSubscription;
    setRewardPerSubscription(joinReward ? formatGram(joinReward) : "");
    setStarsPaymentGroup(currentGroup);
  };
  const openNftTransfer = () => {
    setSelectedNftId(null);
    setRecipientInput("");
    setPreparedNftTransfer(null);
    setNftTransferStep("select");
    setNftTransferOpen(true);
  };
  const reviewNftRecipient = async () => {
    if (!selectedNft) return toast.error(tx("Выберите NFT для передачи", "Select an NFT to transfer."));
    const result = await nftRecipientQuery.refetch();
    if (result.data) {
      setNftTransferStep("review");
      return;
    }
    toast.error(language === "en" ? "Recipient was not found in TG TOP. Ask them to open the app through @TG_TOPBOT first." : (result.error?.message ?? "Получатель не найден в TG TOP. Попросите его открыть приложение через @TG_TOPBOT."));
  };
  const prepareNftTransfer = () => {
    if (!selectedNft || !reviewedRecipient) return;
    if (selectedNft.assetClass === "onchain") {
      toast.error(tx("Передача On-chain NFT станет доступна после проверки кошельков отправителя и получателя.", "On-chain transfers become available after both sender and recipient wallets are verified."));
      return;
    }
    prepareNftTransferMutation.mutate({ nftId: selectedNft.id, recipientInput });
  };

  return (
    <div className="tg-shell min-h-screen bg-[#0b0f14] text-slate-100">
      <header className="sticky top-0 z-40 border-b border-white/8 bg-[#0b0f14]/95 px-4 py-2.5 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <button
            onClick={() => setPage("top")}
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
                    {(user?.avatarUrl ?? telegramAvatar) ? (
                      <img
                        src={user?.avatarUrl ?? telegramAvatar}
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
        {page === "top" && (
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
        )}

        {page === "catalog" && (
          <section className="space-y-4">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#72a8ff]">
                  {tx("Маркетплейс", "Marketplace")}
                </p>
                <h1 className="mt-1 text-2xl font-semibold">{tx("Каталог групп", "Community catalog")}</h1>
              </div>
              <Button
                onClick={() => setFiltersOpen(true)}
                variant="outline"
                className="border-white/10 bg-[#111720] text-slate-200"
              >
                <Filter className="mr-2 h-4 w-4" />
                {tx("Фильтр", "Filter")}
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {visibleGroups.map((group, index) => {
                const isSale = group.listingType === "sale" && group.salePriceTon;
                return (
                  <button
                    key={group.id}
                    onClick={() => openGroup(group.id)}
                    style={{ animationDelay: `${index * 35}ms` }}
                    className="group flex h-[62px] w-full items-center justify-between gap-3 rounded-xl border border-white/8 bg-[#111720] px-3.5 py-2 text-left transition-all duration-300 ease-out hover:border-[#3f8cff]/40 hover:bg-[#151e2b] hover:shadow-lg hover:shadow-[#3f8cff]/5 active:scale-[0.99] animate-in fade-in slide-in-from-bottom-2"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl transition-transform duration-300 group-hover:scale-105">
                        <Avatar group={group} />
                      </div>
                      <span className="min-w-0 flex-1">
                        <b className="block truncate text-sm font-medium text-white transition-colors group-hover:text-[#a6c8ff]">{group.title}</b>
                        <small className="mt-1 block truncate text-xs text-slate-500">
                          {getCommunityAccessLabel(group, language)} · {n(group.membersCount)} {tx("участников", "members")}
                        </small>
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-3 text-right">
                      {group.rewardActive && <Star aria-label={tx("Доступна винагорода", "Rewards available")} className="h-3.5 w-3.5 shrink-0 fill-amber-200 text-amber-200" />}
                      {isSale ? (
                        <div className="flex flex-col items-end">
                          <b className="text-base font-semibold text-[#72a8ff]">{formatTon(group.salePriceTon!)} GRAM</b>
                          <small className="text-[10px] text-slate-400">{tx("Продажа", "For sale")}</small>
                        </div>
                      ) : (
                        <span className="rounded-md bg-white/5 px-2.5 py-1 text-[11px] font-medium text-slate-400">
                          {tx("Каталог", "Catalog")}
                        </span>
                      )}
                      <ChevronRight className="h-4 w-4 text-slate-600 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-[#3f8cff]" />
                    </div>
                  </button>
                );
              })}
              {visibleGroups.length === 0 && (
                <div className="rounded-2xl border border-white/8 bg-[#111720] p-8 text-center">
                  <p className="text-sm text-slate-500">
                    {tx("По этому фильтру площадок пока нет.", "No communities match this filter yet.")}
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {page === "giveaways" && (
          <section className="space-y-4">
            <div>
              <h1 className="text-2xl font-semibold text-white">Розыгрыши</h1>
              <p className="mt-1 text-sm text-slate-500">Участвуйте в активностях сообществ и следите за будущими призами.</p>
            </div>
            {isAuthenticated && <button type="button" onClick={() => setGiveawayCreateOpen(true)} className="flex w-full items-center justify-between rounded-2xl border border-[#72a8ff]/30 bg-[#3f8cff]/10 px-4 py-3 text-left"><span><b className="block text-sm text-[#d5e5ff]">Добавить свой розыгрыш</b><small className="mt-0.5 block text-[11px] text-slate-400">Выберите свою группу, приз и время окончания.</small></span><Plus className="h-5 w-5 text-[#9fc4ff]" /></button>}
            <div className="space-y-3">
              {giveaways.map(giveaway => (
                <article key={giveaway.id} className="rounded-2xl border border-white/8 bg-[#111720] p-4">
                  <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[0.11em] text-[#80aeff]">{giveaway.group?.username ? `@${giveaway.group.username}` : giveaway.group?.title ?? "TG TOP"}</p><h2 className="mt-1 truncate text-base font-semibold text-white">{giveaway.title}</h2></div><Star className="h-5 w-5 shrink-0 text-amber-300" /></div>
                  <div className="mt-3 rounded-xl bg-white/[0.035] px-3 py-2.5"><small className="block text-[10px] uppercase tracking-[0.1em] text-slate-500">Приз</small><b className="mt-1 block text-sm text-slate-100">{giveaway.prizeTitle}</b></div>
                  {giveaway.rules && <p className="mt-3 text-xs leading-5 text-slate-400">{giveaway.rules}</p>}
                  <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-slate-500"><span>{giveaway.participantCount} участников</span><span>до {new Date(giveaway.endsAt).toLocaleString("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span></div>
                  <button type="button" onClick={() => joinGiveaway.mutate({ giveawayId: giveaway.id })} disabled={!isAuthenticated || giveaway.ownerOpenId === user?.openId || joinGiveaway.isPending} className="mt-3 w-full rounded-xl bg-[#1688f5] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-45">{giveaway.ownerOpenId === user?.openId ? "Ваш розыгрыш" : giveaway.boostOnly ? "Проверить буст и участвовать" : isAuthenticated ? "Участвовать" : "Войдите через Telegram"}</button>
                </article>
              ))}
              {!giveaways.length && <div className="rounded-2xl border border-dashed border-white/10 bg-[#111720] p-7 text-center"><Star className="mx-auto h-6 w-6 text-slate-600" /><b className="mt-3 block text-sm text-slate-300">Активных розыгрышей пока нет</b><p className="mt-1 text-xs leading-5 text-slate-500">Первый розыгрыш может создать владелец подключённой группы.</p></div>}
            </div>
            <Sheet open={giveawayCreateOpen} onOpenChange={setGiveawayCreateOpen}>
            <SheetContent side="bottom" className="max-h-[92dvh] overflow-y-auto rounded-t-[22px] border-white/10 bg-[#10161f] text-slate-100"><SheetHeader className="px-4"><SheetTitle className="text-slate-100">Создать розыгрыш</SheetTitle></SheetHeader><div className="space-y-3 px-4 pb-5"><Select value={giveawayGroupId} onValueChange={setGiveawayGroupId}><SelectTrigger className="h-11 border-white/10 bg-[#0b0f14] text-slate-200"><SelectValue placeholder="Выберите свою группу" /></SelectTrigger><SelectContent className="border-white/10 bg-[#111720] text-slate-100">{mine.map(group => <SelectItem key={group.id} value={String(group.id)}>{group.title}</SelectItem>)}</SelectContent></Select><Input value={giveawayTitle} maxLength={160} onChange={event => setGiveawayTitle(event.target.value)} placeholder="Название розыгрыша" className="h-11 border-white/10 bg-[#0b0f14]" /><Input value={giveawayPrizeTitle} maxLength={160} onChange={event => setGiveawayPrizeTitle(event.target.value)} placeholder="Приз" className="h-11 border-white/10 bg-[#0b0f14]" /><Textarea value={giveawayRules} maxLength={2000} onChange={event => setGiveawayRules(event.target.value)} placeholder="Правила участия (необязательно)" className="min-h-20 border-white/10 bg-[#0b0f14]" /><label className="flex items-start gap-3 rounded-xl border border-white/10 bg-[#0b0f14] px-3 py-3"><input type="checkbox" checked={giveawayBoostOnly} onChange={event => setGiveawayBoostOnly(event.target.checked)} className="mt-0.5 h-4 w-4 accent-[#3f8cff]" /><span><b className="block text-xs text-slate-200">Только для бустеров</b><small className="mt-1 block text-[11px] leading-4 text-slate-500">Перед вступлением бот проверит, что пользователь бустит выбранное сообщество.</small></span></label><Input value={giveawayEndsAt} type="datetime-local" min={new Date(Date.now() + 5 * 60_000).toISOString().slice(0, 16)} onChange={event => setGiveawayEndsAt(event.target.value)} className="h-11 border-white/10 bg-[#0b0f14]" /><button type="button" onClick={() => { const groupId = Number(giveawayGroupId); const endsAt = new Date(giveawayEndsAt); if (!groupId || giveawayTitle.trim().length < 3 || giveawayPrizeTitle.trim().length < 2 || Number.isNaN(endsAt.getTime())) { toast.error("Заполните группу, название, приз и время окончания"); return; } createGiveaway.mutate({ groupId, title: giveawayTitle, prizeTitle: giveawayPrizeTitle, rules: giveawayRules || undefined, boostOnly: giveawayBoostOnly, endsAt }); }} disabled={createGiveaway.isPending} className="w-full rounded-xl bg-[#1688f5] px-4 py-3 text-sm font-semibold text-white disabled:opacity-45">{createGiveaway.isPending ? "Публикуем…" : "Опубликовать розыгрыш"}</button></div></SheetContent>
            </Sheet>
          </section>
        )}

        {page === "mine" && (
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
                          {visiblePinnedMyGroups.map(group => <SortableMyGroupTile key={group.id} group={group} language={language} disabled={saveMyGroupsLayoutMutation.isPending} onOpen={() => openGroup(group.id)} onTogglePin={() => toggleMyGroupPin(group.id)} onCreateGiveaway={() => openGiveawayCreate(group)} selectionMode={myGroupsSelectionMode} selected={selectedGroupIds.includes(group.id)} onSelect={() => myGroupsSelectionMode ? toggleGroupSelection(group.id) : selectMyGroup(group.id)} />)}
                        </div>
                      </SortableContext>
                    </section>
                  )}
                  <section className="space-y-2">
                    {visiblePinnedMyGroups.length > 0 && <div className="px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{tx("Остальные", "Others")}</div>}
                    <SortableContext items={visibleUnpinnedMyGroups.map(group => group.id)} strategy={rectSortingStrategy}>
                      <div className="grid grid-cols-3 gap-2">
                        {visibleUnpinnedMyGroups.map(group => <SortableMyGroupTile key={group.id} group={group} language={language} disabled={saveMyGroupsLayoutMutation.isPending} onOpen={() => openGroup(group.id)} onTogglePin={() => toggleMyGroupPin(group.id)} onCreateGiveaway={() => openGiveawayCreate(group)} selectionMode={myGroupsSelectionMode} selected={selectedGroupIds.includes(group.id)} onSelect={() => myGroupsSelectionMode ? toggleGroupSelection(group.id) : selectMyGroup(group.id)} />)}
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
        )}

        {page === "details" && (
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
        )}

        {page === "owner" && (
          <section className="space-y-4">
            <button onClick={() => setPage("top")} className="flex items-center gap-1 text-xs text-slate-400"><ArrowLeft className="h-4 w-4" />{ui.back}</button>
            {publicOwner ? (
              <>
                <div className="rounded-2xl border border-white/8 bg-[#111720] p-5">
                  <div className="flex items-center gap-3">
                    <span className="grid h-12 w-12 overflow-hidden rounded-full border border-white/10 bg-[#1b2430] text-sm font-semibold">
                      {publicOwner.owner.avatarUrl ? <img src={publicOwner.owner.avatarUrl} alt="" className="h-full w-full object-cover" /> : (publicOwner.owner.name?.slice(0, 1).toUpperCase() ?? "T")}
                    </span>
                    <span className="min-w-0">
                      <h1 className="truncate text-lg font-semibold">{publicOwner.owner.name ?? tx("Пользователь TG TOP", "TG TOP user")}</h1>
                      <small className="mt-1 block truncate text-xs text-slate-500">{publicOwner.owner.telegramUsername ? `@${publicOwner.owner.telegramUsername}` : tx("Профиль владельца", "Owner profile")}</small>
                    </span>
                  </div>
                  <div className="mt-5"><Metric label={tx("Активные площадки", "Active communities")} value={n(publicOwner.groups.length, language)} note={tx("в каталоге TG TOP", "listed in TG TOP")} /></div>
                </div>
                <section className="space-y-2">
                  <h2 className="px-1 text-sm font-semibold">{tx("Площадки владельца", "Owner communities")}</h2>
                  {publicOwner.groups.map(group => <CompactCommunityRow key={group.id} group={group} language={language} accessLabel={getCommunityAccessLabel(group, language)} salePrice={group.listingType === "sale" && group.salePriceTon ? formatTon(group.salePriceTon) : undefined} onOpen={() => openGroup(group.id)} />)}
                </section>
                <NftShowcase nfts={publicOwner.nfts} language={language} title={tx("NFT-витрина владельца", "Owner NFT showcase")} />
              </>
            ) : (
              <p className="py-16 text-center text-sm text-slate-500">{tx("Загружаем профиль владельца…", "Loading owner profile…")}</p>
            )}
          </section>
        )}

        {page === "admin" && moderationAccess?.canModerate && (
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

                <Sheet open={telegramUserAgentSheetOpen} onOpenChange={setTelegramUserAgentSheetOpen}>
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
                        <div className="space-y-2 rounded-xl border border-violet-300/15 bg-violet-400/[0.045] p-3"><div><b className="block text-xs text-violet-100">История статистики Telegram</b><p className="mt-1 text-[10px] leading-4 text-slate-400">Только разрешённые каналы и официальные агрегаты Telegram. Текст постов, лички и пользователи не загружаются.</p></div><div className="flex gap-2"><Input value={telegramStatsUsername} onChange={event => setTelegramStatsUsername(event.target.value)} autoComplete="off" placeholder="@username канала" className="h-10 border-white/10 bg-[#17212b] text-sm text-slate-100" /><Button onClick={() => allowTelegramHistoricalStats.mutate({ username: telegramStatsUsername })} disabled={allowTelegramHistoricalStats.isPending || telegramStatsUsername.trim().length < 5} className="h-10 shrink-0 bg-violet-500/85 px-3 text-xs text-white">{allowTelegramHistoricalStats.isPending ? ui.loading : "Разрешить"}</Button></div>{telegramHistoricalStats.map(target => <div key={target.id} className="space-y-3 rounded-xl border border-white/8 bg-black/10 p-3"><div className="flex items-center justify-between gap-2"><span className="min-w-0"><b className="block truncate text-xs text-slate-100">{target.title}</b><small className="block text-[10px] text-slate-500">@{target.username} · {target.kind === "channel" ? "канал" : "группа"}</small></span><Button variant="outline" onClick={() => refreshTelegramHistoricalStats.mutate({ username: target.username })} disabled={refreshTelegramHistoricalStats.isPending} className="h-8 shrink-0 border-violet-200/20 px-2 text-[10px] text-violet-100">Обновить</Button></div>{target.snapshot?.history.version === 2 ? <><p className="text-[10px] text-slate-500">Период Telegram: {target.snapshot.periodStart ? new Date(target.snapshot.periodStart).toLocaleDateString("ru-RU") : "—"} — {target.snapshot.periodEnd ? new Date(target.snapshot.periodEnd).toLocaleDateString("ru-RU") : "—"}</p><div className="grid grid-cols-2 gap-2"><Metric label="Подписчики" value={target.snapshot.memberCount === null ? "—" : target.snapshot.memberCount.toLocaleString("ru-RU")} note="текущая официальная цифра" /><Metric label="Охват / пост" value={target.snapshot.viewsPerPost === null ? "—" : target.snapshot.viewsPerPost.toLocaleString("ru-RU")} note="за период Telegram" /><Metric label="Пересылки / пост" value={target.snapshot.sharesPerPost === null ? "—" : target.snapshot.sharesPerPost.toLocaleString("ru-RU")} note="за период Telegram" /><Metric label="Реакции / пост" value={target.snapshot.reactionsPerPost === null ? "—" : target.snapshot.reactionsPerPost.toLocaleString("ru-RU")} note="за период Telegram" /><Metric label="Уведомления" value={telegramNotificationPercent(target.snapshot.history.summary) === null ? "—" : `${telegramNotificationPercent(target.snapshot.history.summary)}%`} note="включены у аудитории" /></div><div className="grid grid-cols-3 rounded-lg border border-white/8 bg-[#111720] p-1">{(["day", "month", "all"] as const).map(range => <button key={range} type="button" onClick={() => setTelegramStatsRange(range)} className={`h-8 rounded-md text-[10px] font-medium ${telegramStatsRange === range ? "bg-[#3f8cff]/20 text-[#b7d2ff]" : "text-slate-500"}`}>{range === "day" ? "День" : range === "month" ? "Месяц" : "Всё время"}</button>)}</div><TelegramAnalyticsChart title="Рост" graph={target.snapshot.history.graphs?.growth} range={telegramStatsRange} /><TelegramAnalyticsChart title="Подписки / отписки" graph={target.snapshot.history.graphs?.subscriptions} range={telegramStatsRange} accent="#f26667" showLatest={false} /><TelegramAnalyticsChart title="Охват и взаимодействия" graph={target.snapshot.history.graphs?.reach} range={telegramStatsRange} accent="#b38cff" showLatest={false} /><TelegramAnalyticsChart title="Уведомления" graph={target.snapshot.history.graphs?.notifications} range={telegramStatsRange} accent="#62c5f7" showLatest={false} /><TelegramAnalyticsChart title="Активные часы" graph={target.snapshot.history.graphs?.activeHours} range={telegramStatsRange} accent="#f5b84b" showLatest={false} /><TelegramAnalyticsChart title="Источники просмотров" graph={target.snapshot.history.graphs?.viewsBySource ?? target.snapshot.history.graphs?.followersBySource} range={telegramStatsRange} accent="#57d5a2" showLatest={false} /><TelegramAnalyticsChart title="Источники новых подписчиков" graph={target.snapshot.history.graphs?.followersBySource} range={telegramStatsRange} accent="#57d5a2" showLatest={false} /><TelegramAnalyticsChart title="Языки аудитории" graph={target.snapshot.history.graphs?.languages} range={telegramStatsRange} accent="#72a8ff" showLatest={false} /><TelegramAnalyticsChart title="Реакции" graph={target.snapshot.history.graphs?.reactions} range={telegramStatsRange} accent="#f266a1" showLatest={false} /><TelegramAnalyticsChart title="Активность в группе" graph={target.snapshot.history.graphs?.activity} range={telegramStatsRange} accent="#f5b84b" showLatest={false} /><TelegramAnalyticsChart title="Активные дни" graph={target.snapshot.history.graphs?.weekdays} range={telegramStatsRange} accent="#b38cff" showLatest={false} /></> : target.snapshot ? <p className="text-[10px] leading-4 text-slate-400">Есть старая короткая выгрузка. Нажми «Обновить», чтобы загрузить полный набор графиков Telegram.</p> : <p className="text-[10px] leading-4 text-slate-500">{target.availability === "unavailable" ? "Telegram пока не отдал статистику этому аккаунту." : "Канал разрешён. Нажми «Обновить», чтобы получить историю."}</p>}</div>)}</div>
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
        )}

        {page === "profile" && (
          <section className="space-y-4">
            <h1 className="px-1 text-sm font-semibold text-slate-300">{tx("Личный кабинет", "Account")}</h1>
            <div className="tg-clean-surface rounded-2xl border border-white/8 bg-[#111720] p-5 shadow-[0_10px_28px_rgba(2,8,16,0.14)]">
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 overflow-hidden rounded-full border border-white/10 bg-[#1b2430] text-sm font-semibold">
                  {(user?.avatarUrl ?? telegramAvatar) ? (
                    <img
                      src={user?.avatarUrl ?? telegramAvatar}
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
        )}
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
            {managedCountries.map(country => {
              const selected = country.code === listingCountry;
              return <button key={country.id} type="button" onClick={() => { setListingCountry(country.code); setListingCity("Все"); setListingCountrySheetOpen(false); }} className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors ${selected ? "border-[#3f8cff]/60 bg-[#3f8cff]/12" : "border-white/8 bg-white/[0.025] hover:bg-white/[0.055]"}`}>
                <span className="min-w-0 flex-1"><b className="block truncate text-sm text-slate-100">{country.label}</b></span>
                <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${selected ? "border-[#3f8cff] bg-[#3f8cff] text-white" : "border-white/20 text-transparent"}`}><Check className="h-3.5 w-3.5" /></span>
              </button>;
            })}
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
                  {managedCountries.map(item => <SelectItem key={item.id} value={item.code} className="text-sm text-slate-200 focus:bg-[#3f8cff]/15 focus:text-[#c8ddff]">{item.label}</SelectItem>)}
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
                <Select value={listingSubcategory} onValueChange={setListingSubcategory}>
                  <SelectTrigger className="h-11 w-full rounded-xl border-white/10 bg-[#0b0f14] text-sm text-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[70] border-white/10 bg-[#111720] text-slate-100">
                    {listingSubcategoryOptions.map(item => <SelectItem key={item} value={item} className="text-sm text-slate-200 focus:bg-[#3f8cff]/15 focus:text-[#c8ddff]">{listingCategory ? getManagedTopicLabel(listingCategory, item) : item}</SelectItem>)}
                  </SelectContent>
                </Select>
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
                <button type="button" onClick={() => { if (!listingRankingPreviewSlot || !canPayListingRanking) return; setTargetSlot(listingRankingPreviewSlot); setAmount(formatTon(listingRankingBidAmount)); setPaymentMethod("gram"); setListingOpen(false); window.setTimeout(() => setStarsPaymentGroup(selectedListingGroup), 160); }} disabled={!canPayListingRanking} className="mt-3 flex w-full items-center justify-between rounded-xl bg-[#1688f5] px-4 py-3 text-left text-sm font-semibold text-white transition-transform active:scale-[0.98] disabled:opacity-45"><span>{tx("Залистить", "List community")}</span><span>{formatTon(listingRankingBidAmount)} GRAM</span></button>
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
                <div className="flex items-start justify-between gap-3">
                  <span className="text-xs">
                    <b className="block text-slate-200">{tx("Закрытая ссылка для входа", "Private entry link")}</b>
                    <small className="mt-0.5 block text-[11px] leading-4 text-slate-500">{tx("Бот создаст новую ссылку Telegram и закрепит её как главный вход в карточке сообщества.", "The bot will create a new Telegram link and use it as the community’s main entry.")}</small>
                  </span>
                  <button type="button" onClick={() => createPrivateEntryLink.mutate({ groupId: privateEntryEligibleGroup.id })} disabled={createPrivateEntryLink.isPending} className="shrink-0 rounded-lg border border-[#3f8cff]/35 bg-[#3f8cff]/12 px-3 py-2 text-[10px] font-semibold text-[#a6c8ff] disabled:opacity-45">
                    {createPrivateEntryLink.isPending ? ui.loading : tx("Создать", "Create")}
                  </button>
                </div>
                {privateEntryEligibleGroup.inviteLink && <button type="button" onClick={() => openTelegramCommunityLink(privateEntryEligibleGroup.inviteLink!)} className="mt-2 block max-w-full truncate text-left text-[10px] font-medium text-[#9cc3ff] hover:text-white">{tx("Открыть текущую закрытую ссылку", "Open current private link")}</button>}
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
