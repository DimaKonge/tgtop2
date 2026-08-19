import { useEffect, useMemo, useRef, useState } from "react";
import { closestCenter, DndContext, DragOverlay, KeyboardSensor, PointerSensor, type DragEndEvent, type DragStartEvent, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, rectSortingStrategy, SortableContext, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
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
import { useTheme, type Appearance } from "@/contexts/ThemeContext";
import {
  ArrowLeft,
  BarChart3,
  Check,
  ChevronRight,
  Filter,
  FolderPlus,
  Globe2,
  GripVertical,
  LayoutGrid,
  List,
  Moon,
  Plus,
  Pin,
  PinOff,
  Settings2,
  Star,
  Sun,
  Trash2,
  Trophy,
  UserRound,
  Users,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";
import { useIsConnectionRestored, useTonAddress, useTonConnectUI } from "@tonconnect/ui-react";

type Page = "top" | "catalog" | "giveaways" | "earn" | "mine" | "details" | "owner" | "profile";
type Audience = "all" | "small" | "medium" | "large";
type MyGroupsViewMode = "list" | "grid";
type Language = "ru" | "en";
const n = (value: number, language: Language = "ru") =>
  new Intl.NumberFormat(language === "en" ? "en-US" : "ru-RU").format(value);
const date = (value?: Date | null, language: Language = "ru") =>
  value
    ? new Date(value).toLocaleDateString(language === "en" ? "en-US" : "ru-RU", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";
const formatGram = (units: number | null | undefined) => {
  const amount = Math.max(0, Number(units ?? 0)) / 100;
  return amount.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
};
const parseGramInput = (value: string): number | undefined => {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return undefined;
  const units = Math.round(Number(normalized) * 100);
  return Number.isSafeInteger(units) ? units : undefined;
};
type ListingType = "catalog" | "sale";
type ListingCountry = "Global" | "UA" | "PL" | "DE" | "GB" | "US" | "RU" | "FR" | "ES" | "IT" | "NL" | "CZ" | "RO" | "TR" | "CA" | "AU" | "AE" | "KZ";
type GlobalDirection = "Все" | "Каналы" | "Чаты" | "NFT";
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
  "Каналы": ["General", "News", "Crypto", "Technology", "Business", "Education", "Entertainment", "Games", "Memes"],
  "Чаты": ["General", "Community", "Dating", "City", "Support", "Work", "Hobbies", "Learning", "Games"],
} as const;
const SUBCATEGORY_LABELS: Record<string, { ru: string; en: string }> = {
  News: { ru: "Новости", en: "News" }, Crypto: { ru: "Крипто", en: "Crypto" }, Technology: { ru: "Технологии", en: "Technology" }, Business: { ru: "Бизнес", en: "Business" }, Education: { ru: "Образование", en: "Education" }, Entertainment: { ru: "Развлечения", en: "Entertainment" }, Games: { ru: "Игры", en: "Games" }, Memes: { ru: "Мемы", en: "Memes" },
  Community: { ru: "Сообщества", en: "Community" }, Dating: { ru: "Знакомства", en: "Dating" }, City: { ru: "Город", en: "City" }, Support: { ru: "Поддержка", en: "Support" }, Work: { ru: "Работа", en: "Work" }, Hobbies: { ru: "Хобби", en: "Hobbies" }, Learning: { ru: "Обучение", en: "Learning" }, General: { ru: "Общее", en: "General" },
};
type Group = {
  id: number;
  chatId: string;
  title: string;
  username: string | null;
  inviteLink: string | null;
  description: string | null;
  avatarFileId: string | null;
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
type Slot = {
  id: number;
  slotNumber: number;
  bidAmount: number;
  updatedAt?: Date;
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
const getTelegramAvatarSrc = (group: Group) =>
  group.avatarFileId
    ? `/api/telegram-avatar/${group.chatId}`
    : group.username
      ? `https://t.me/i/userpic/320/${group.username}.jpg`
      : null;
const formatTon = (value: number | string | null | undefined) => {
  const amount = typeof value === "number" ? value : Number(value);
  return Number.isFinite(amount) ? amount.toFixed(9).replace(/\.?0+$/, "") : "0";
};
const formatPositionDuration = (updatedAt: Date | string | null | undefined, now: number) => {
  const startedAt = updatedAt ? new Date(updatedAt).getTime() : now;
  const seconds = Math.max(0, Math.floor((now - startedAt) / 1000));
  const hours = Math.floor(seconds / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  const remainingSeconds = seconds % 60;
  return [hours, minutes, remainingSeconds].map(value => String(value).padStart(2, "0")).join(":");
};
const getRankingFloorGram = (slotNumber: number) => slotNumber <= 1 ? 0.3 : slotNumber <= 3 ? 0.2 : 0.1;
const getMinimumRankingBidGram = (slot: Pick<Slot, "slotNumber" | "bidAmount" | "group">) => {
  const floor = getRankingFloorGram(slot.slotNumber);
  if (!slot.group) return floor;
  return Math.max(floor, Math.round((slot.bidAmount / 1000 + 0.1) * 10) / 10);
};
const MAX_RANKING_BID_GRAM = 1_000;
const getSimulatedRankingSlotNumber = (slots: Slot[], candidateGroupId: number, bidAmountGram: number) => {
  const candidateBid = Math.round(bidAmountGram * 1000);
  if (!Number.isSafeInteger(candidateBid) || candidateBid <= 0 || candidateBid > MAX_RANKING_BID_GRAM * 1000) return null;
  const remaining = slots
    .filter(slot => slot.group?.id !== candidateGroupId && slot.group)
    .map(slot => ({ groupId: slot.group!.id, bidAmount: slot.bidAmount, heldSince: new Date(slot.updatedAt ?? 0) }))
    .concat({ groupId: candidateGroupId, bidAmount: candidateBid, heldSince: new Date() })
    .sort((left, right) => right.bidAmount - left.bidAmount || left.heldSince.getTime() - right.heldSince.getTime() || left.groupId - right.groupId);
  for (const slot of [...slots].sort((left, right) => left.slotNumber - right.slotNumber)) {
    const entryIndex = remaining.findIndex(entry => entry.bidAmount >= getRankingFloorGram(slot.slotNumber) * 1000);
    const entry = entryIndex >= 0 ? remaining.splice(entryIndex, 1)[0] : undefined;
    if (entry?.groupId === candidateGroupId) return slot.slotNumber;
  }
  return null;
};
const getCategoryLabel = (category: Group["category"], language: Language) =>
  language === "en" ? (category === "Каналы" ? "Channels" : "Chats") : category;
const getCommunityAccessLabel = (group: Pick<Group, "username">, language: Language) =>
  group.username ? `@${group.username}` : language === "en" ? "Private" : "Приватный";
const openTelegramCommunityLink = (url: string) => {
  const webApp = window.Telegram?.WebApp as unknown as {
    openTelegramLink?: (target: string) => void;
    openLink?: (target: string) => void;
  } | undefined;
  if (/^https:\/\/t\.me\//i.test(url) && webApp?.openTelegramLink) {
    webApp.openTelegramLink(url);
    return;
  }
  if (webApp?.openLink) {
    webApp.openLink(url);
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
};
const getSubcategoryLabel = (subcategory: string, language: Language) =>
  SUBCATEGORY_LABELS[subcategory]?.[language] ?? subcategory;
const getCountryLabel = (country: string, language: Language) =>
  COUNTRY_LABELS[country]?.[language] ?? country;
const getCityLabel = (country: string, city: string, language: Language) =>
  CITY_OPTIONS[country]?.find(item => item.value === city)?.[language] ?? city;
function Avatar({
  group,
  large = false,
  compact = false,
}: {
  group: Group;
  large?: boolean;
  compact?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const size = large ? "h-16 w-16" : compact ? "h-9 w-9" : "h-11 w-11";
  const avatarSrc = getTelegramAvatarSrc(group);
  return (
    <span
      className={`${size} grid shrink-0 place-items-center overflow-hidden rounded-xl border border-white/10 bg-[#1b2430] text-sm font-semibold text-slate-200`}
    >
      {avatarSrc && !failed ? (
        <img
          src={avatarSrc}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        group.title.slice(0, 1).toUpperCase()
      )}
    </span>
  );
}

function FullBleedGroupArtwork({ group }: { group: Group }) {
  const [failed, setFailed] = useState(false);
  const avatarSrc = getTelegramAvatarSrc(group);
  return (
    <span className="absolute inset-0 overflow-hidden bg-[radial-gradient(circle_at_50%_20%,#253a58_0%,#111720_68%)]">
      {avatarSrc && !failed ? (
        <img src={avatarSrc} alt="" draggable={false} className="pointer-events-none h-full w-full select-none object-cover transition-transform duration-300 group-hover:scale-105 [-webkit-touch-callout:none]" onError={() => setFailed(true)} />
      ) : (
        <span className="grid h-full w-full place-items-center text-4xl font-semibold text-white/28">{group.title.slice(0, 1).toUpperCase()}</span>
      )}
    </span>
  );
}

function SortableMyGroupTile({
  group,
  language,
  disabled,
  onOpen,
  onTogglePin,
  selectionMode,
  selected,
  onSelect,
}: {
  group: Group;
  language: Language;
  disabled?: boolean;
  onOpen: () => void;
  onTogglePin: () => void;
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
          <div className="absolute bottom-2 right-2 z-20">
            <button type="button" onPointerDown={event => event.stopPropagation()} onClick={event => { event.stopPropagation(); onTogglePin(); }} aria-label={group.ownerPinned ? (isEnglish ? "Unpin community" : "Открепить группу") : (isEnglish ? "Pin community" : "Закрепить группу")} className={`grid h-6 w-6 place-items-center rounded-md transition-colors ${group.ownerPinned ? "bg-[#3f8cff]/16 text-[#9cc3ff]" : "text-slate-500 hover:bg-white/7 hover:text-slate-200"}`}>{group.ownerPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}</button>
          </div>
        </>
      )}
    </article>
  );
}

type GroupCardVariant = "lead" | "secondary" | "compact" | "list";

function GroupCard({
  group,
  variant = "list",
  onClick,
  language = "ru",
  bidAmount = 0,
}: {
  group?: Group | null;
  variant?: GroupCardVariant;
  onClick: () => void;
  language?: Language;
  bidAmount?: number;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const lead = variant === "lead";
  const compact = variant === "compact";
  const rankingPlacement = variant !== "list";
  const rankingFloor = lead ? 0.3 : variant === "secondary" ? 0.2 : 0.1;
  const rankingPriceLabel = bidAmount > 0
    ? `${formatTon(bidAmount / 1000)} GRAM`
    : `от ${formatTon(rankingFloor)} GRAM`;
  const cardStyle = lead
    ? "h-[300px] border-[#3f8cff]/35 bg-[#141c27] p-5 sm:h-[46vh] sm:p-6"
          : variant === "secondary"
      ? "h-[128px] border-white/10 bg-[#111720] p-3 sm:h-[160px] sm:p-4"
      : compact
        ? "h-[78px] border-white/8 bg-[#111720] p-2 sm:h-[116px]"
        : "h-[68px] border-white/8 bg-[#111720] px-3 py-2";
  const shellStyle = compact
    ? "flex h-full flex-col items-center justify-center gap-2 text-center"
    : "flex h-full items-center gap-3";
  const avatarSrc = group ? getTelegramAvatarSrc(group) : null;
  const groupUrl = group?.username ? `https://t.me/${group.username}` : (group?.inviteLink || null);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      aria-label={group ? `${language === "en" ? "Open" : "Открыть"} ${group.title}` : undefined}
      className={`relative min-w-0 w-full overflow-hidden rounded-2xl border text-left transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:border-[#3f8cff]/55 hover:shadow-[0_10px_28px_rgba(63,140,255,0.16)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3f8cff]/70 active:translate-y-0 active:scale-[0.99] ${cardStyle}`}
    >
      {rankingPlacement && (
        <span className={`absolute left-2 top-2 z-10 rounded-full bg-black/55 px-2 py-1 font-medium tracking-tight text-white/95 shadow-sm shadow-black/25 backdrop-blur-sm ${lead ? "text-[11px]" : compact ? "text-[7px]" : "text-[9px]"}`}>
          {rankingPriceLabel}
        </span>
      )}
      {group?.rewardActive && (group.rewardAmount ?? 0) > 0 && (
        <span aria-label={language === "en" ? `Earn +${formatGram(group.rewardAmount!)} GRAM` : `Получите +${formatGram(group.rewardAmount!)} GRAM`} className={`absolute right-0 top-0 z-10 border-b border-l border-amber-100/25 bg-amber-300/15 px-2.5 py-1 text-[9px] font-bold leading-none text-amber-100 shadow-md shadow-black/20 backdrop-blur-md [clip-path:polygon(12px_0,100%_0,100%_100%,0_100%,0_12px)] ${lead ? "px-3 py-1.5 text-[11px]" : compact ? "px-1.5 py-1 text-[7px]" : "px-2 py-1 text-[8px]"}`}>
          +{formatGram(group.rewardAmount)}
        </span>
      )}
      {group && rankingPlacement ? (
        <>
          <>
            {avatarSrc && !imageFailed ? (
              <img
                src={avatarSrc}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                onError={() => setImageFailed(true)}
              />
            ) : (
              <span className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_30%_22%,#28496f,#111720_62%)] text-4xl font-semibold text-slate-200">
                {group.title.slice(0, 1).toUpperCase()}
              </span>
            )}
          </>
          <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,10,15,0.06)_8%,rgba(7,10,15,0.82)_100%)]" />
          <span className={`absolute inset-x-0 bottom-0 min-w-0 ${compact ? "p-2" : lead ? "p-5 sm:p-6" : "p-3 sm:p-4"}`}>
            <b
              className={`${lead ? "text-xl" : compact ? "text-[11px]" : "text-sm"} block max-w-full truncate font-semibold text-white`}
            >
              {group.title}
            </b>
            <small
              className={`mt-1 block max-w-full truncate text-xs text-slate-200/80 ${compact ? "hidden" : ""}`}
            >
              {groupUrl ? <a href={groupUrl} onClick={event => { event.preventDefault(); event.stopPropagation(); openTelegramCommunityLink(groupUrl); }} className="no-underline hover:text-white">{getCommunityAccessLabel(group, language)}</a> : getCommunityAccessLabel(group, language)} ·{" "}
              {n(group.membersCount, language)} {language === "en" ? "members" : "участников"}
            </small>
          </span>
        </>
      ) : group ? (
        <span className={rankingPlacement ? shellStyle : "flex h-full w-full items-center justify-between gap-3"}>
          <span className="flex min-w-0 flex-1 items-center gap-3">
            <span className="h-9 w-9 shrink-0 overflow-hidden rounded-lg">
              <Avatar group={group} large={lead} compact={compact} />
            </span>
            <span className="min-w-0 flex-1">
              <b
                className={`${lead ? "text-xl" : compact ? "text-[11px]" : "text-xs"} block truncate font-medium text-white`}
              >
                {group.title}
              </b>
              <small
                className={`block truncate text-[11px] text-slate-500 ${compact ? "hidden" : ""}`}
              >
                {getCommunityAccessLabel(group, language)} ·{" "}
                {n(group.membersCount, language)} {language === "en" ? "members" : "участников"}
              </small>
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-3 text-right">
            {group.salePriceTon && group.listingType === "sale" ? (
              <div className="flex flex-col items-end">
                <b className="text-sm font-semibold text-[#72a8ff]">{formatTon(group.salePriceTon)} TON</b>
                <small className="text-[10px] text-slate-400">{language === "en" ? "For sale" : "Продажа"}</small>
              </div>
            ) : null}
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-600" />
          </span>
        </span>
      ) : rankingPlacement ? (
        <span className="absolute inset-0 grid place-items-center">
          <span className="flex max-w-full flex-col items-center gap-2 px-2 text-center">
            <span
              className={`${lead ? "h-16 w-16" : compact ? "h-9 w-9" : "h-11 w-11"} grid place-items-center rounded-xl border border-dashed border-white/20 text-slate-500`}
            >
              <Plus className="h-4 w-4" />
            </span>
            <small
              className={`max-w-full truncate font-light tracking-wide text-slate-500 ${compact ? "text-[9px]" : "text-[11px]"}`}
            >
              {language === "en" ? "Add group" : "Добавить группу"}
            </small>
          </span>
        </span>
      ) : (
        <span className={shellStyle}>
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-dashed border-white/20 text-slate-500">
            <Plus className="h-4 w-4" />
          </span>
          <span>
            <b className="block text-sm font-light text-slate-300">
              {language === "en" ? "Add group" : "Добавить группу"}
            </b>
          </span>
        </span>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-[#111720] p-3">
      <small className="block text-[11px] text-slate-500">{label}</small>
      <b className="mt-1 block text-lg font-semibold">{value}</b>
      <small className="mt-1 block text-[10px] text-slate-500">{note}</small>
    </div>
  );
}

function NftCard({ nft, language }: { nft: Nft; language: Language }) {
  const copy = language === "en"
    ? { sale: "Sale", rent: "Rent", both: "Sale + rent", available: "Available", rented: "Rented", sold: "Sold", owner: "Owner", perDay: "TON / day", days: "days", onchain: "On-chain", offchain: "Off-chain" }
    : { sale: "Продажа", rent: "Аренда", both: "Продажа + аренда", available: "Доступен", rented: "В аренде", sold: "Продан", owner: "Владелец", perDay: "TON / день", days: "дней", onchain: "On-chain", offchain: "Off-chain" };
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
      <span className="mt-3 inline-flex rounded-md bg-white/5 px-2 py-1 text-[10px] text-slate-400">{listingLabel}</span>
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
            <small className="mt-1 block truncate text-[10px] text-slate-500">{nft.assetClass === "onchain" ? "On-chain" : "Off-chain"} · {nft.listingType === "rent" ? nft.rentalPricePerDay : nft.price} TON</small>
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
      className="brand-mark grid h-8 w-8 grid-cols-4 grid-rows-3 gap-[2px] overflow-hidden rounded-[10px] border border-white/15 bg-[#0d1520] p-1.5 shadow-[0_6px_16px_rgba(0,0,0,0.32)]"
    >
      <span className="col-start-2 row-start-1 rounded-[2px] border border-[#a9c7ff]/35 bg-[#3f8cff] shadow-[0_0_8px_rgba(63,140,255,0.55)]" />
      <span className="col-start-2 row-start-2 rounded-[2px] border border-[#a9c7ff]/25 bg-[#4c91ff]" />
      <span className="col-start-3 row-start-2 rounded-[2px] border border-[#a9c7ff]/25 bg-[#4c91ff]" />
      <span className="col-start-1 row-start-3 rounded-[2px] border border-[#a9c7ff]/20 bg-[#5c9bff]" />
      <span className="col-start-2 row-start-3 rounded-[2px] border border-[#a9c7ff]/20 bg-[#5c9bff]" />
      <span className="col-start-3 row-start-3 rounded-[2px] border border-[#a9c7ff]/20 bg-[#5c9bff]" />
      <span className="col-start-4 row-start-3 rounded-[2px] border border-[#a9c7ff]/20 bg-[#5c9bff]" />
    </span>
  );
}

function WalletConnectControl({ language, balanceTon, variant = "compact" }: { language: Language; balanceTon: string; variant?: "compact" | "profile" }) {
  const [tonConnectUi] = useTonConnectUI();
  const address = useTonAddress();
  const restored = useIsConnectionRestored();
  const label = address
    ? language === "en" ? "Connected" : "Подключён"
    : language === "en"
      ? "Connect wallet"
      : "Кошелёк";

  if (variant === "profile") {
    const walletLabel = address
      ? `${address.slice(0, 5)}…${address.slice(-4)}`
      : language === "en" ? "Connect wallet" : "Подключить кошелёк";
    return <button disabled={!restored} onClick={() => tonConnectUi.openModal()} className={`mt-3 flex min-h-11 w-full items-center justify-between rounded-xl border px-3.5 text-left transition-colors disabled:opacity-60 ${address ? "border-white/10 bg-white/[0.035] text-slate-200 hover:bg-white/[0.07]" : "border-[#3f8cff]/45 bg-[#3f8cff]/14 text-[#c8ddff] hover:bg-[#3f8cff]/22"}`}><span className="flex min-w-0 items-center gap-2"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-current/20 bg-black/10"><WalletCards className="h-3.5 w-3.5" /></span><span className="min-w-0"><b className="block text-xs">{restored ? walletLabel : language === "en" ? "Loading wallet…" : "Загрузка кошелька…"}</b><small className="mt-0.5 block truncate text-[10px] text-slate-400">{address ? `${balanceTon} TON` : language === "en" ? "No transfer or signature is requested" : "Перевод и подпись не запрашиваются"}</small></span></span><ChevronRight className="h-4 w-4 shrink-0" /></button>;
  }

  return <button disabled={!restored} onClick={() => tonConnectUi.openModal()} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#3f8cff]/35 bg-[#3f8cff]/10 px-2.5 text-[11px] font-medium text-[#a6c8ff] disabled:opacity-60"><WalletCards className="h-3.5 w-3.5" />{restored ? <><span>{label}</span>{address && <span className="rounded-md bg-[#0b0f14]/70 px-1.5 py-0.5 text-[10px] text-white">{balanceTon} TON</span>}</> : language === "en" ? "Loading…" : "Загрузка…"}</button>;
}

function GramBalanceChart({ transactions, currentBalance, language }: { transactions: Array<{ amount: number; createdAt: Date }>; currentBalance: number; language: Language }) {
  const points = useMemo(() => {
    const actualTransactions = transactions.slice(0, 24).reverse().map(item => ({ amount: item.amount / 100, createdAt: new Date(item.createdAt) }));
    const startingBalance = currentBalance - actualTransactions.reduce((total, item) => total + item.amount, 0);
    let runningBalance = startingBalance;
    return actualTransactions.map(item => {
      runningBalance += item.amount;
      return { balance: runningBalance, createdAt: item.createdAt };
    });
  }, [transactions, currentBalance]);
  const values = points.length ? points.map(point => point.balance) : [currentBalance];
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const range = Math.max(maximum - minimum, 0.01);
  const toY = (value: number) => 58 - ((value - minimum) / range) * 38;
  const linePoints = points.length > 1
    ? points.map((point, index) => `${16 + (index / (points.length - 1)) * 232},${toY(point.balance)}`).join(" ")
    : `16,${toY(currentBalance)} 248,${toY(currentBalance)}`;
  const displayBalance = currentBalance.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");

  return <div className="mt-4 rounded-xl border border-white/8 bg-[#0b1017] p-3">
    <div className="flex items-start justify-between gap-3"><span><small className="block text-[10px] uppercase tracking-[0.12em] text-slate-500">{language === "en" ? "GRAM balance dynamics" : "Динамика GRAM"}</small><b className="mt-1 block text-xl font-semibold text-slate-100">{displayBalance} GRAM</b></span><span className="grid h-8 w-8 place-items-center rounded-lg border border-[#3f8cff]/25 bg-[#3f8cff]/10 text-[#a6c8ff]"><BarChart3 className="h-4 w-4" /></span></div>
    <svg viewBox="0 0 264 74" preserveAspectRatio="none" className="mt-3 h-20 w-full overflow-visible" role="img" aria-label={language === "en" ? "GRAM balance chart based on recorded operations" : "График GRAM на основе зафиксированных операций"}>
      <defs><linearGradient id="gram-balance-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#4b97ff" stopOpacity="0.28" /><stop offset="100%" stopColor="#4b97ff" stopOpacity="0" /></linearGradient></defs>
      <path d={`M 16 66 L ${linePoints.split(" ").join(" L ")} L 248 66 Z`} fill="url(#gram-balance-fill)" />
      <polyline points={linePoints} fill="none" stroke="#64b5ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {points.length > 0 && <circle cx="248" cy={toY(points.at(-1)!.balance)} r="2.75" fill="#b8d8ff" />}
    </svg>
    <div className="mt-1 flex items-center justify-between text-[9px] text-slate-600"><span>{points[0] ? date(points[0].createdAt, language) : language === "en" ? "No operations yet" : "Операций пока нет"}</span><span>{points.at(-1) ? date(points.at(-1)!.createdAt, language) : language === "en" ? "Current" : "Сейчас"}</span></div>
  </div>;
}

function SettingsSheet({
  open,
  onOpenChange,
  language,
  onLanguageChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  language: Language;
  onLanguageChange: (language: Language) => void;
}) {
  const { appearance, setAppearance } = useTheme();
  const isEnglish = language === "en";
  const appearanceItems: Array<{
    value: Appearance;
    label: string;
    icon: typeof Moon;
  }> = [
    { value: "dark", label: isEnglish ? "Dark" : "Темная", icon: Moon },
    { value: "light", label: isEnglish ? "Light" : "Светлая", icon: Sun },
  ];
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[34dvh] rounded-t-[20px] border-white/10 bg-[#10161f] pb-3 text-slate-100"
      >
        <SheetHeader className="px-4 pb-1">
          <SheetTitle className="text-sm font-semibold text-slate-100">
            {isEnglish ? "Preferences" : "Настройки"}
          </SheetTitle>
        </SheetHeader>
        <div className="mx-4 overflow-hidden rounded-xl border border-white/8 bg-black/10">
          <section className="flex h-12 items-center justify-between gap-3 px-3">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <Globe2 className="h-4 w-4" />
              {isEnglish ? "Language" : "Язык"}
            </div>
            <ToggleGroup
              type="single"
              value={language}
              onValueChange={value => {
                if (value) onLanguageChange(value as Language);
              }}
              className="inline-flex w-auto overflow-hidden rounded-md border border-white/8 bg-[#0b0f14] p-0.5"
            >
              <ToggleGroupItem
                value="ru"
                className="h-7 min-w-10 border-0 px-2 text-[10px] text-slate-400 data-[state=on]:rounded data-[state=on]:bg-[#3f8cff] data-[state=on]:text-white"
              >
                RU
              </ToggleGroupItem>
              <ToggleGroupItem
                value="en"
                className="h-7 min-w-10 border-0 px-2 text-[10px] text-slate-400 data-[state=on]:rounded data-[state=on]:bg-[#3f8cff] data-[state=on]:text-white"
              >
                EN
              </ToggleGroupItem>
            </ToggleGroup>
          </section>
          <section className="flex h-12 items-center justify-between gap-3 border-t border-white/8 px-3">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <Sun className="h-4 w-4" />
              {isEnglish ? "Appearance" : "Оформление"}
            </div>
            <div className="inline-flex overflow-hidden rounded-md border border-white/8 bg-[#0b0f14] p-0.5">
              {appearanceItems.map(item => {
                const Icon = item.icon;
                const active = appearance === item.value;
                return (
                  <button
                    key={item.value}
                    onClick={() => setAppearance(item.value)}
                    aria-label={item.label}
                    className={`flex h-7 items-center gap-1 rounded px-2 text-[10px] font-medium ${active ? "bg-[#3f8cff]/15 text-[#a6c8ff]" : "text-slate-400"}`}
                  >
                    <Icon className="h-3 w-3" />
                    {item.value === "dark" ? (isEnglish ? "Dark" : "Темн.") : (isEnglish ? "Light" : "Светл.")}
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function Home({ onReady }: { onReady?: () => void }) {
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const hasSignaledReady = useRef(false);
  const [page, setPage] = useState<Page>("top");
  const [category, setCategory] = useState<"Все" | "Каналы" | "Чаты">("Все");
  const [globalDirection, setGlobalDirection] = useState<GlobalDirection>("Все");
  const [subcategory, setSubcategory] = useState("Все");
  const [country, setCountry] = useState("Все");
  const [city, setCity] = useState("Все");
  const [audience, setAudience] = useState<Audience>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [topSearchQuery, setTopSearchQuery] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [adminGuideKind, setAdminGuideKind] = useState<"channel" | "group" | null>(null);
  const [language, setLanguage] = useState<Language>(() =>
    localStorage.getItem("tg-top-language") === "en" ? "en" : "ru"
  );
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [selectedOwnerOpenId, setSelectedOwnerOpenId] = useState<string | null>(null);
  const [targetSlot, setTargetSlot] = useState<Slot | null>(null);
  const [rankSlotLinkId, setRankSlotLinkId] = useState<number | null>(null);
  const [amount, setAmount] = useState("0.1");
  const [listingRankingBid, setListingRankingBid] = useState("0.1");
  const [starsPaymentGroup, setStarsPaymentGroup] = useState<Group | null>(null);
  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([]);
  const [myGroupsSelectionMode, setMyGroupsSelectionMode] = useState(false);
  const myGroupsSelectionHoldTimer = useRef<number | null>(null);
  const myGroupsSelectionHoldTriggered = useRef(false);
  const [listingOpen, setListingOpen] = useState(false);
  const [listingCountry, setListingCountry] = useState<ListingCountry>("Global");
  const [listingCity, setListingCity] = useState("Все");
  const [listingSubcategory, setListingSubcategory] = useState("General");
  const [salePriceTon, setSalePriceTon] = useState("");
  const [isListingForSale, setIsListingForSale] = useState(false);
  const [showOwnerContact, setShowOwnerContact] = useState(false);
  const [monthlyEntryEnabled, setMonthlyEntryEnabled] = useState(false);
  const [monthlyEntryStars, setMonthlyEntryStars] = useState("");
  const [monthlyEntryLinkName, setMonthlyEntryLinkName] = useState("");
  const [rewardCampaignEnabled, setRewardCampaignEnabled] = useState(false);
  const [rewardBudget, setRewardBudget] = useState("");
  const [rewardPerSubscription, setRewardPerSubscription] = useState("");
  const [rewardPerInvite, setRewardPerInvite] = useState("");
  const [rewardPerManualAdd, setRewardPerManualAdd] = useState("");
  const [nftTransferOpen, setNftTransferOpen] = useState(false);
  const [nftTransferStep, setNftTransferStep] = useState<"select" | "review" | "prepared">("select");
  const [nftAssetFilter, setNftAssetFilter] = useState<"all" | "onchain" | "offchain">("all");
  const [selectedNftId, setSelectedNftId] = useState<number | null>(null);
  const [recipientInput, setRecipientInput] = useState("");
  const [preparedNftTransfer, setPreparedNftTransfer] = useState<PreparedNftTransfer | null>(null);
  const [showcaseNftId, setShowcaseNftId] = useState<number | null>(null);
  const [visibleActivityCount, setVisibleActivityCount] = useState(5);
  const [positionClock, setPositionClock] = useState(() => Date.now());
  const [detailReturnPage, setDetailReturnPage] = useState<Page>("top");
  const detailSwipeStart = useRef<{ x: number; y: number; scrollY: number } | null>(null);

  useEffect(() => {
    localStorage.setItem("tg-top-language", language);
  }, [language]);
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
    enabled: globalDirection === "NFT",
  });
  const nfts = (nftsQuery.data ?? []) as Nft[];
  const myNftsQuery = trpc.tgTop.myNfts.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const myNfts = (myNftsQuery.data ?? []) as Nft[];
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
  const accountActivityQuery = trpc.tgTop.getAccountActivity.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 8_000,
    refetchIntervalInBackground: false,
  });
  const account = accountQuery.data as
    | {
        user?: { bonusBalance: number; mainBalanceTon: string | number; publicProfile?: boolean };
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
  const detail = detailQuery.data as
    | {
        group: Group;
        snapshots: Array<{
          membersCount: number;
          messagesCount: number;
          joinedCount: number;
          recordedAt: Date;
        }>;
        owner?: Group["owner"];
        ownerNfts: ShowcaseNft[];
        analytics: { source: "tgtop_bot_observed"; observedSince: Date };
      }
    | undefined;

  const listWithCredits = trpc.tgTop.listGroupsWithCredits.useMutation({
    onSuccess: () => {
      toast.success(tx("Настройки листинга сохранены", "Listing settings saved."));
      setListingOpen(false);
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
    onSuccess: async ({ inviteLink, existing }) => {
      try {
        await navigator.clipboard.writeText(inviteLink);
        toast.success(tx(existing ? "Ваша ссылка уже готова и скопирована" : "Персональная ссылка создана и скопирована", existing ? "Your existing link is ready and copied" : "Your personal link was created and copied"));
      } catch {
        openTelegramCommunityLink(inviteLink);
        toast.success(tx("Персональная ссылка создана", "Your personal link was created"));
      }
    },
    onError: error => toast.error(error.message),
  });
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
      toast.success(tx("Ставка зафиксирована в журнале TG TOP. TON не отправлялся.", "Bid recorded in the TG TOP journal. No TON was sent."));
      setTargetSlot(null);
      setAmount("0.1");
      void utils.tgTop.getSlots.invalidate();
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
  const completeOffchainNftTransferMutation = trpc.tgTop.completeOffchainNftTransfer.useMutation({
    onSuccess: () => {
      toast.success(tx("Передача Off-chain NFT подтверждена. Комиссия TG TOP · 0%", "Off-chain NFT transfer confirmed. TG TOP fee · 0%."));
      setNftTransferOpen(false);
      setPreparedNftTransfer(null);
      setSelectedNftId(null);
      setRecipientInput("");
      setNftTransferStep("select");
      void utils.tgTop.myNfts.invalidate();
      void utils.tgTop.getNfts.invalidate();
      void utils.tgTop.myNftTransfers.invalidate();
    },
    onError: error => toast.error(language === "en" ? "Could not confirm the off-chain transfer. Please try again." : error.message),
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
      const byAssetClass = nftAssetFilter === "all" ? nfts : nfts.filter(nft => nft.assetClass === nftAssetFilter);
      const query = topSearchQuery.trim().toLowerCase();
      return query
        ? byAssetClass.filter(nft => `${nft.username} ${nft.ownerUsername}`.toLowerCase().includes(query))
        : byAssetClass;
    },
    [nfts, nftAssetFilter, topSearchQuery]
  );
  const board = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const slot = slots.find(item => item.slotNumber === index + 1);
        return slot && matchesAudience(slot.group)
          ? slot
          : {
              id: slot?.id ?? 0,
              slotNumber: index + 1,
              bidAmount: 0,
              group: null,
            };
      }),
    [slots, audience]
  );
  const occupiedIds = new Set(
    board.map(slot => slot.group?.id).filter((id): id is number => Boolean(id))
  );
  const generalList = visibleGroups.filter(group => !occupiedIds.has(group.id));
  const rankedGroups = board.flatMap(slot => slot.group ? [slot.group] : []);
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
  const bonus = (
    (account?.user?.bonusBalance ?? user?.bonusBalance ?? 0) / 100
  ).toFixed(1);
  const mainTon = Number(account?.user?.mainBalanceTon ?? 0).toFixed(2);
  const transactions = account?.transactions ?? [];
  const accountActivity = (accountActivityQuery.data ?? []) as Array<{
    id: string;
    type: "credit" | "stars" | "bid" | "deal" | "nft_transfer";
    status: string;
    createdAt: Date;
    title: string;
    subject: string;
    amount: number | null;
    currency: "GRAM" | "Stars" | "TON" | null;
    direction: "in" | "out" | "neutral";
  }>;
  const visibleAccountActivity = accountActivity.slice(0, visibleActivityCount);
  const referral = account?.referral;
  const verifiedTasks = [
    {
      id: "connect-community",
      title: tx("Подключить сообщество", "Connect a community"),
      description: tx("Добавьте @TGTOP_robot администратором своей группы или канала.", "Add @TGTOP_robot as an administrator of your group or channel."),
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
  const dealStatusLabel = (status: typeof deals[number]["status"]) => {
    const labels = {
      open: tx("Ожидает оплаты", "Awaiting payment"),
      escrow_funded: tx("Средства в эскроу", "Funds in escrow"),
      active: tx("Передача зафиксирована", "Transfer observed"),
      completed: tx("Завершена", "Completed"),
      expired: tx("Срок истек", "Expired"),
      cancelled: tx("Отменена", "Cancelled"),
      disputed: tx("На разборе", "Under review"),
    } as const;
    return labels[status];
  };
  const getDaysRemaining = (expiresAt: Date | null) => {
    if (!expiresAt) return null;
    return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000));
  };
  const getProtectedDealGuidance = (status: string, isBuyer: boolean, buyerConfirmed = false) => {
    const role = isBuyer ? "buyer" : "seller";
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
  const globalCount = globalDirection === "NFT" ? visibleNfts.length : visibleGroups.length;
  const currentTopTitle = [
    globalDirection === "NFT"
      ? "NFT"
      : globalDirection === "Все"
        ? tx("Все сообщества", "All communities")
        : getCategoryLabel(globalDirection, language),
    globalDirection !== "NFT" && subcategory !== "Все" ? getSubcategoryLabel(subcategory, language) : null,
  ].filter((part): part is string => Boolean(part)).join(" · ");
  const currentTopCountry = globalDirection !== "NFT" && country !== "Все" ? getCountryLabel(country, language) : null;
  const currentTopCity = globalDirection !== "NFT" && city !== "Все" ? getCityLabel(country, city, language) : null;
  const telegramAvatar =
    typeof window !== "undefined"
      ? window.Telegram?.WebApp?.initDataUnsafe?.user?.photo_url
      : undefined;
  const selectedSlot = detail
    ? slots.find(slot => slot.group?.id === detail.group.id)
    : undefined;
  const detailMinimumBid = selectedSlot
    ? getMinimumRankingBidGram(selectedSlot)
    : null;
  const ownsDetail = detail?.group.ownerOpenId === user?.openId;
  const detailEntryUrl = detail?.group.monthlyEntryInviteLink ?? (detail?.group.username
    ? `https://t.me/${detail.group.username}`
    : detail?.group.inviteLink ?? null);
  const detailHasPaidEntry = Boolean(detail?.group.monthlyEntryInviteLink && detail.group.monthlyEntryStars);
  const detailOwner = detail?.owner ?? null;
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
  const globalSubcategoryCategory = globalDirection === "Каналы" || globalDirection === "Чаты" ? globalDirection : null;
  const globalSubcategoryOptions = globalSubcategoryCategory ? CATEGORY_SUBCATEGORIES[globalSubcategoryCategory] : [];
  const listingCategory = selectedListingGroups.length && selectedListingGroups.every(group => group.category === selectedListingGroups[0]?.category)
    ? selectedListingGroups[0]?.category
    : null;
  const listingSubcategoryOptions = listingCategory ? CATEGORY_SUBCATEGORIES[listingCategory] : [];
  const monthlyEntryEligibleGroup = selectedListingGroups.length === 1 && selectedListingGroups[0]?.category === "Каналы" && !selectedListingGroups[0]?.username
    ? selectedListingGroups[0]
    : null;
  const selectedListingGroup = selectedListingGroups.length === 1 ? selectedListingGroups[0] : null;
  const rawListingRankingBid = Number(listingRankingBid);
  const listingRankingBidAmount = Number.isFinite(rawListingRankingBid)
    ? Math.min(MAX_RANKING_BID_GRAM, Math.max(0.1, Math.round(rawListingRankingBid * 10) / 10))
    : 0.1;
  const listingRankingPreviewSlotNumber = selectedListingGroup
    ? getSimulatedRankingSlotNumber(slots, selectedListingGroup.id, listingRankingBidAmount)
    : null;
  const listingRankingPreviewSlot = listingRankingPreviewSlotNumber
    ? slots.find(slot => slot.slotNumber === listingRankingPreviewSlotNumber) ?? null
    : null;
  const listingRankingMinimum = listingRankingPreviewSlot ? getMinimumRankingBidGram(listingRankingPreviewSlot) : null;
  const canPayListingRanking = Boolean(listingRankingPreviewSlot && listingRankingMinimum !== null && listingRankingBidAmount >= listingRankingMinimum);
  const selectedNft = myNfts.find(nft => nft.id === selectedNftId) ?? null;
  const showcaseNft = myNfts.find(nft => nft.id === showcaseNftId) ?? null;
  const reviewedRecipient = nftRecipientQuery.data;

  const openGroup = (id: number) => {
    setDetailReturnPage(page === "details" ? "top" : page);
    setSelectedGroupId(id);
    setPage("details");
  };
  const openOwner = (openId: string) => {
    setSelectedOwnerOpenId(openId);
    setPage("owner");
  };
  const openMine = (slot?: Slot) => {
    if (slot) {
      const nextBid = getMinimumRankingBidGram(slot);
      setAmount(formatTon(nextBid));
    }
    setTargetSlot(slot ?? null);
    setPage("mine");
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
  const openListing = (groupIds: number[]) => {
    const listingGroups = mine.filter(group => groupIds.includes(group.id));
    const firstGroup = listingGroups[0];
    const selectedGroupsShareCategory = listingGroups.length > 0 && listingGroups.every(group => group.category === firstGroup?.category);
    setSelectedGroupIds(Array.from(new Set(groupIds)));
    setListingCountry(
      COUNTRY_OPTIONS.includes(firstGroup?.country as ListingCountry)
        ? (firstGroup?.country as ListingCountry)
        : "Global"
    );
    setListingCity(firstGroup?.city ?? "Все");
    setListingSubcategory(selectedGroupsShareCategory ? firstGroup?.subcategory ?? "General" : "");
    setListingRankingBid("0.1");
    setSalePriceTon(firstGroup?.salePriceTon ?? "");
    setIsListingForSale(Boolean(firstGroup?.salePriceTon));
    setShowOwnerContact(Boolean(firstGroup?.showOwnerContact));
    setMonthlyEntryEnabled(Boolean(firstGroup?.monthlyEntryEnabled));
    setMonthlyEntryStars(firstGroup?.monthlyEntryStars ? String(firstGroup.monthlyEntryStars) : "");
    setMonthlyEntryLinkName(firstGroup?.monthlyEntryLinkName ?? "");
    setRewardCampaignEnabled(Boolean(firstGroup?.rewardActive));
    setRewardBudget(firstGroup?.rewardBudget ? formatGram(firstGroup.rewardBudget) : "");
    const initialJoinReward = firstGroup?.category === "Чаты" ? firstGroup?.rewardPerManualAdd : firstGroup?.rewardPerSubscription;
    setRewardPerSubscription(initialJoinReward ? formatGram(initialJoinReward) : "");
    setRewardPerInvite(firstGroup?.rewardPerInvite ? formatGram(firstGroup.rewardPerInvite) : "");
    setRewardPerManualAdd(firstGroup?.rewardPerManualAdd ? formatGram(firstGroup.rewardPerManualAdd) : "0.01");
    setListingOpen(true);
  };
  const saveListing = () => {
    if (!selectedGroupIds.length) return toast.error(tx("Выберите хотя бы одну группу", "Select a community that is already listed."));
    const canConfigureRewards = selectedListingGroups.length === 1;
    const budgetUnits = rewardCampaignEnabled ? parseGramInput(rewardBudget) : 0;
    const joinRewardUnits = rewardCampaignEnabled ? parseGramInput(rewardPerSubscription) : 0;
    const rewardGroup = selectedListingGroups[0];
    const isChatRewardCampaign = rewardGroup?.category === "Чаты";
    if (canConfigureRewards && rewardCampaignEnabled && [budgetUnits, joinRewardUnits].some(value => value === undefined)) {
      return toast.error(tx("Введите сумму в GRAM с точностью до 0.01", "Enter a GRAM amount with up to two decimals."));
    }
    listWithCredits.mutate({
      groupIds: selectedGroupIds,
      country: listingCountry,
      city: listingCity === "Все" ? undefined : listingCity,
      subcategory: listingCategory && listingSubcategory ? listingSubcategory : undefined,
      salePriceTon: isListingForSale ? salePriceTon || undefined : undefined,
      showOwnerContact: selectedListingGroups.length ? showOwnerContact : undefined,
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
  const addBot = (kind: "channel" | "group") => {
    const groupAdminRights = "change_info+delete_messages+invite_users+pin_messages+manage_chat";
    const channelAdminRights = "change_info+post_messages+edit_messages+delete_messages+invite_users+manage_chat";
    const query = kind === "channel"
      ? `startchannel&admin=${channelAdminRights}`
      : `startgroup=tgtop_admin&admin=${groupAdminRights}`;
    window.open(`https://t.me/TGTOP_robot?${query}`, "_blank");
  };
  const startBotAdminSetup = (kind: "channel" | "group") => {
    setAdminGuideKind(kind);
    addBot(kind);
  };
  const selectGlobalDirection = (value: GlobalDirection) => {
    setGlobalDirection(value);
    if (value !== "NFT") {
      setCategory(value);
      setSubcategory("Все");
    }
  };
  const submitPlacement = (group: Group) => {
    if (!targetSlot?.id)
      return toast.error(
        tx("Эта позиция будет доступна после создания рейтинговой доски.", "This placement will be available after the ranking board is created.")
      );
    const value = Number(amount);
    const minimum = getMinimumRankingBidGram(targetSlot);
    if (!Number.isFinite(value) || value < minimum || Math.round(value * 10) !== value * 10)
      return toast.error(tx(`Минимальная ставка: ${formatTon(minimum)} GRAM с шагом 0.1`, `Minimum bid: ${formatTon(minimum)} GRAM in 0.1 steps`));
    placeBid.mutate({
      slotId: targetSlot.id,
      groupId: group.id,
      bidAmount: value,
      currentBid: `${formatTon(value)} GRAM`,
    });
  };
  const openStarsPayment = (group: Group) => {
    if (!targetSlot?.id) return toast.error(tx("Эта позиция пока недоступна.", "This placement is not available yet."));
    const value = Number(amount);
    const minimum = getMinimumRankingBidGram(targetSlot);
    if (!Number.isFinite(value) || value < minimum || Math.round(value * 10) !== value * 10) {
      return toast.error(tx(`Минимальная ставка: ${formatTon(minimum)} GRAM с шагом 0.1`, `Minimum bid: ${formatTon(minimum)} GRAM in 0.1 steps`));
    }
    setStarsPaymentGroup(group);
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
    toast.error(language === "en" ? "Recipient was not found in TG TOP. Ask them to open the app through @TGTOP_robot first." : (result.error?.message ?? "Получатель не найден в TG TOP. Попросите его открыть приложение через @TGTOP_robot."));
  };
  const prepareNftTransfer = () => {
    if (!selectedNft || !reviewedRecipient) return;
    if (selectedNft.assetClass === "onchain") {
      toast.error(tx("Передача On-chain NFT станет доступна после проверки кошельков отправителя и получателя.", "On-chain transfers become available after both sender and recipient wallets are verified."));
      return;
    }
    prepareNftTransferMutation.mutate({ nftId: selectedNft.id, recipientInput });
  };
  const completePreparedOffchainNftTransfer = () => {
    if (!preparedNftTransfer || preparedNftTransfer.transfer.assetClass !== "offchain") return;
    completeOffchainNftTransferMutation.mutate({ transferId: preparedNftTransfer.transfer.id });
  };

  return (
    <div className="tg-shell min-h-screen bg-[#0b0f14] text-slate-100">
      <header className="sticky top-0 z-40 border-b border-white/8 bg-[#0b0f14]/95 px-4 py-2.5 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <button
            onClick={() => setPage("top")}
            className="flex items-center gap-2"
          >
            <BrandMark />
            <b className="text-sm tracking-tight">TG TOP</b>
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSettingsOpen(true)}
              aria-label="Settings"
              className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-[#111720] text-slate-400"
            >
              <Settings2 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage("profile")}
              className="flex items-center gap-2"
            >
              <span className="hidden text-right sm:block">
                <b className="block text-xs">{user?.name ?? "Telegram user"}</b>
                <small className="block text-[10px] text-slate-500">
                  {bonus} GRAM
                </small>
              </span>
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
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-2">
        {page === "top" && (
          <section className="space-y-2">
            <div className="border-b border-white/8 pb-1.5">
              <div className="flex min-w-0 items-center justify-between gap-2 px-0.5">
                <span className="flex min-w-0 flex-1 items-baseline gap-1.5 overflow-hidden whitespace-nowrap">
                  <h1 className="min-w-0 shrink text-[clamp(14px,4.7vw,18px)] font-semibold tracking-tight text-white">{currentTopTitle}</h1>
                  {currentTopCountry && <span className="shrink-0 text-[10px] font-medium text-slate-400">· {currentTopCountry}</span>}
                  {currentTopCity && <span className="max-w-[48px] shrink truncate text-[9px] font-medium text-[#7697c7]">· {currentTopCity}</span>}
                  <span aria-live="polite" className="shrink-0 text-[11px] text-slate-500">{n(globalCount, language)}</span>
                </span>
                {globalDirection !== "NFT" && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="flex h-7 max-w-[132px] shrink-0 items-center gap-1.5 overflow-hidden rounded-md border border-white/10 bg-white/5 px-2 text-[10px] text-slate-400 transition-colors hover:border-[#3f8cff]/35 hover:text-slate-100">
                        <Globe2 className="h-3.5 w-3.5 shrink-0 text-[#79a7ff]" />
                        <span className="truncate">{city !== "Все" ? getCityLabel(country, city, language) : country === "Все" ? tx("Весь мир", "Worldwide") : getCountryLabel(country, language)}</span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-[min(320px,calc(100vw-24px))] rounded-xl border-white/10 bg-[#10161f] p-2.5 text-slate-100 shadow-2xl shadow-black/45">
                      <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">{tx("Страна", "Country")}</p>
                      <div className="max-h-[264px] space-y-1 overflow-y-auto pr-1">
                        {["Все", ...COUNTRY_OPTIONS.filter(item => item !== "Global")].map(item => <button key={item} type="button" onClick={() => { setCountry(item); setCity("Все"); }} className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-[11px] font-medium transition-colors ${country === item ? "border-[#3f8cff]/50 bg-[#3f8cff]/16 text-[#b8d1ff]" : "border-white/8 text-slate-400 hover:border-white/15 hover:bg-white/[0.035] hover:text-slate-200"}`}><span>{item === "Все" ? tx("Весь мир", "Worldwide") : getCountryLabel(item, language)}</span>{country === item && <Check className="h-3.5 w-3.5 shrink-0 text-[#79a7ff]" />}</button>)}
                      </div>
                      {(CITY_OPTIONS[country] ?? []).length > 0 && <>
                        <p className="mb-2 mt-3 px-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#637b9d]">{tx("Город", "City")}</p>
                        <div className="flex flex-wrap gap-1.5">
                          <button type="button" onClick={() => setCity("Все")} className={`rounded-md border px-2 py-1 text-[10px] ${city === "Все" ? "border-[#3f8cff]/50 bg-[#3f8cff]/16 text-[#a6c8ff]" : "border-white/10 text-slate-400"}`}>{tx("Все города", "All cities")}</button>
                          {CITY_OPTIONS[country].map(item => <button key={item.value} type="button" onClick={() => setCity(item.value)} className={`rounded-md border px-2 py-1 text-[10px] ${city === item.value ? "border-[#3f8cff]/50 bg-[#3f8cff]/16 text-[#a6c8ff]" : "border-white/10 text-slate-400"}`}>{item[language]}</button>)}
                        </div>
                      </>}
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </div>
            <Input value={topSearchQuery} onChange={event => setTopSearchQuery(event.target.value)} aria-label={globalDirection === "NFT" ? tx("Поиск NFT", "Search NFT") : tx("Поиск группы", "Search communities")} placeholder={globalDirection === "NFT" ? tx("Поиск NFT или @username", "Search NFT or @username") : tx("Поиск по названию или @username", "Search by name or @username")} className="h-9 border-white/10 bg-[#111720] px-3 text-xs text-slate-200 placeholder:text-slate-600" />
            <div className="grid grid-cols-4 rounded-xl border border-white/8 bg-[#111720] p-0.5">
              {([
                ["Все", tx("Все", "All")],
                ["Каналы", tx("Каналы", "Channels")],
                ["Чаты", tx("Чаты", "Chats")],
                ["NFT", "NFT"],
              ] as const).map(([value, label]) => (
                <button key={value} type="button" onClick={() => selectGlobalDirection(value)} className={`h-8 rounded-lg text-[10px] font-semibold transition-colors ${globalDirection === value ? "bg-[#3f8cff] text-white shadow-sm" : "text-slate-500 hover:bg-white/5 hover:text-slate-200"}`}>{label}</button>
              ))}
            </div>
            {globalDirection === "NFT" ? (
              <section className="space-y-2 pt-1">
                <div className="flex items-baseline justify-between px-1">
                  <span>
                    <h2 className="text-sm font-semibold text-slate-200">{tx("NFT-направление", "NFT marketplace")}</h2>
                    <span className="text-[10px] text-slate-500">{tx("юзернеймы и права", "usernames and rights")}</span>
                  </span>
                  {isAuthenticated && (
                    <button onClick={openNftTransfer} className="rounded-lg border border-[#3f8cff]/35 bg-[#3f8cff]/10 px-2.5 py-1.5 text-[10px] font-semibold text-[#a6c8ff]">
                      {tx("Передать NFT", "Send NFT")}
                    </button>
                  )}
                </div>
                <ToggleGroup type="single" value={nftAssetFilter} onValueChange={value => value && setNftAssetFilter(value as typeof nftAssetFilter)} className="grid w-full grid-cols-3 rounded-lg border border-white/8 bg-[#111720] p-0.5">
                  <ToggleGroupItem value="all" className="h-8 border-0 text-[10px] text-slate-400 data-[state=on]:rounded-md data-[state=on]:bg-[#3f8cff] data-[state=on]:text-white">{tx("Все", "All")}</ToggleGroupItem>
                  <ToggleGroupItem value="onchain" className="h-8 border-0 text-[10px] text-slate-400 data-[state=on]:rounded-md data-[state=on]:bg-[#3f8cff] data-[state=on]:text-white">On-chain</ToggleGroupItem>
                  <ToggleGroupItem value="offchain" className="h-8 border-0 text-[10px] text-slate-400 data-[state=on]:rounded-md data-[state=on]:bg-[#3f8cff] data-[state=on]:text-white">Off-chain</ToggleGroupItem>
                </ToggleGroup>
                {nftsQuery.isLoading ? (
                  <div className="rounded-2xl border border-white/8 bg-[#111720] p-6 text-center text-sm text-slate-500">{ui.loading}</div>
                ) : visibleNfts.length ? (
                  <div className="space-y-2">{visibleNfts.map(nft => <NftCard key={nft.id} nft={nft} language={language} />)}</div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/12 bg-[#111720] p-7 text-center">
                    <p className="text-sm font-medium text-slate-300">{tx("В этой категории NFT пока нет", "No NFTs in this category yet")}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{tx("On-chain активы подтверждаются в TON, Off-chain — в безопасном учете TG TOP.", "On-chain assets are verified on TON; Off-chain assets use TG TOP’s protected ledger.")}</p>
                  </div>
                )}
              </section>
            ) : (
            <>
            <div className="w-full space-y-2">
              {!topSearchQuery.trim() && <div key={rankingMotionKey} className="w-full space-y-2" aria-live="polite">
              <div className="ranking-slot-enter ranking-slot-lead w-full" style={{ animationDelay: "0ms" }}>
                <GroupCard
                  group={leadSlot.group}
                  variant="lead"
                  language={language}
                  bidAmount={leadSlot.bidAmount}
                  onClick={() =>
                    leadSlot.group
                      ? openGroup(leadSlot.group.id)
                      : openMine(leadSlot)
                  }
                />
              </div>
              <div className="grid w-full grid-cols-2 gap-2">
                {secondTier.map((slot, index) => (
                  <div key={slot.slotNumber} className="ranking-slot-enter ranking-slot-secondary" style={{ animationDelay: `${90 + index * 45}ms` }}>
                    <GroupCard
                      group={slot.group}
                      variant="secondary"
                      language={language}
                      bidAmount={slot.bidAmount}
                      onClick={() =>
                        slot.group ? openGroup(slot.group.id) : openMine(slot)
                      }
                    />
                  </div>
                ))}
              </div>
              <div className="grid w-full grid-cols-4 gap-2">
                {thirdTier.map((slot, index) => (
                  <div key={slot.slotNumber} className="ranking-slot-enter ranking-slot-compact" style={{ animationDelay: `${185 + index * 34}ms` }}>
                    <GroupCard
                      group={slot.group}
                      variant="compact"
                      language={language}
                      bidAmount={slot.bidAmount}
                      onClick={() =>
                        slot.group ? openGroup(slot.group.id) : openMine(slot)
                      }
                    />
                  </div>
                ))}
              </div>
              </div>}
            </div>
            <section className="pt-2">
              <div className="space-y-2">
                {searchedGeneralList.map((group, index) => {
                  const isSale = group.listingType === "sale" && group.salePriceTon;
                  return (
                    <div
                      key={group.id}
                      style={{ animationDelay: `${index * 35}ms` }}
                      className="w-full animate-in fade-in slide-in-from-bottom-2 duration-300"
                    >
                      <button
                        onClick={() => openGroup(group.id)}
                        className="group relative flex h-[68px] w-full items-center justify-between gap-3 overflow-hidden rounded-xl border border-white/8 bg-[#111720] px-3.5 py-2 text-left transition-all duration-200 ease-out hover:border-[#3f8cff]/40 hover:bg-[#151e2b] active:scale-[0.99]"
                      >
                        {group.rewardActive && (group.rewardAmount ?? 0) > 0 && (
                          <span className="absolute right-0 top-0 z-10 border-b border-l border-amber-100/25 bg-amber-300/15 px-2 py-1 text-[8px] font-bold leading-none text-amber-100 shadow-md shadow-black/20 backdrop-blur-md [clip-path:polygon(10px_0,100%_0,100%_100%,0_100%,0_10px)]">+{formatGram(group.rewardAmount)}</span>
                        )}
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg">
                            <Avatar group={group} />
                          </div>
                          <span className="min-w-0 flex-1">
                            <b className="block truncate text-xs font-medium text-white transition-colors group-hover:text-[#a6c8ff]">
                              {group.title}
                            </b>
                            <small className="block truncate text-[11px] text-slate-500">
                              {getCommunityAccessLabel(group, language)} · {n(group.membersCount, language)} {language === "en" ? "members" : "участников"}
                            </small>
                          </span>
                        </div>
                        <div className="flex shrink-0 items-center gap-2.5 text-right">
                          {isSale ? (
                            <div className="flex flex-col items-end">
                              <b className="text-xs font-semibold text-[#72a8ff]">{formatTon(group.salePriceTon!)} TON</b>
                              <small className="text-[9px] text-slate-400">{language === "en" ? "For sale" : "Продажа"}</small>
                            </div>
                          ) : null}
                          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-600 transition-transform group-hover:translate-x-0.5 group-hover:text-[#3f8cff]" />
                        </div>
                      </button>
                    </div>
                  );
                })}
                {searchedGeneralList.length > 0 && (
                  <button
                    onClick={() => openMine()}
                    className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[#3f8cff]/35 bg-[#3f8cff]/6 px-4 text-sm font-medium text-[#a6c8ff] transition-colors hover:bg-[#3f8cff]/12"
                  >
                    <Plus className="h-4 w-4" />
                    {tx("Добавить свою группу в список", "Add your community to the list")}
                  </button>
                )}
                {searchedGeneralList.length === 0 && (
                  <button
                    onClick={() => openMine()}
                    className="w-full rounded-2xl border border-dashed border-[#3f8cff]/35 bg-[#111720] p-6 text-center transition-colors hover:bg-[#151d28]"
                  >
                    <span className="mx-auto grid h-10 w-10 place-items-center rounded-full border border-[#3f8cff]/35 bg-[#3f8cff]/10 text-[#a6c8ff]">
                      <Plus className="h-5 w-5" />
                    </span>
                    <p className="text-sm font-medium text-slate-300">{topSearchQuery ? tx("Ничего не найдено", "Nothing found") : ui.globalEmptyTitle}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {ui.globalEmptyBody}
                    </p>
                    <span className="mt-3 inline-block text-xs font-semibold text-[#a6c8ff]">{tx("Добавить свою группу", "Add your community")}</span>
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
                          <b className="text-base font-semibold text-[#72a8ff]">{formatTon(group.salePriceTon!)} TON</b>
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
                  <button type="button" onClick={() => joinGiveaway.mutate({ giveawayId: giveaway.id })} disabled={!isAuthenticated || giveaway.ownerOpenId === user?.openId || giveaway.boostOnly || joinGiveaway.isPending} className="mt-3 w-full rounded-xl bg-[#1688f5] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-45">{giveaway.ownerOpenId === user?.openId ? "Ваш розыгрыш" : giveaway.boostOnly ? "Нужен подтверждённый буст" : isAuthenticated ? "Участвовать" : "Войдите через Telegram"}</button>
                </article>
              ))}
              {!giveaways.length && <div className="rounded-2xl border border-dashed border-white/10 bg-[#111720] p-7 text-center"><Star className="mx-auto h-6 w-6 text-slate-600" /><b className="mt-3 block text-sm text-slate-300">Активных розыгрышей пока нет</b><p className="mt-1 text-xs leading-5 text-slate-500">Первый розыгрыш может создать владелец подключённой группы.</p></div>}
            </div>
            <Sheet open={giveawayCreateOpen} onOpenChange={setGiveawayCreateOpen}>
              <SheetContent side="bottom" className="max-h-[92dvh] overflow-y-auto rounded-t-[22px] border-white/10 bg-[#10161f] text-slate-100"><SheetHeader className="px-4"><SheetTitle className="text-slate-100">Создать розыгрыш</SheetTitle></SheetHeader><div className="space-y-3 px-4 pb-5"><Select value={giveawayGroupId} onValueChange={setGiveawayGroupId}><SelectTrigger className="h-11 border-white/10 bg-[#0b0f14] text-slate-200"><SelectValue placeholder="Выберите свою группу" /></SelectTrigger><SelectContent className="border-white/10 bg-[#111720] text-slate-100">{mine.map(group => <SelectItem key={group.id} value={String(group.id)}>{group.title}</SelectItem>)}</SelectContent></Select><Input value={giveawayTitle} maxLength={160} onChange={event => setGiveawayTitle(event.target.value)} placeholder="Название розыгрыша" className="h-11 border-white/10 bg-[#0b0f14]" /><Input value={giveawayPrizeTitle} maxLength={160} onChange={event => setGiveawayPrizeTitle(event.target.value)} placeholder="Приз" className="h-11 border-white/10 bg-[#0b0f14]" /><Textarea value={giveawayRules} maxLength={2000} onChange={event => setGiveawayRules(event.target.value)} placeholder="Правила участия (необязательно)" className="min-h-20 border-white/10 bg-[#0b0f14]" /><Input value={giveawayEndsAt} type="datetime-local" min={new Date(Date.now() + 5 * 60_000).toISOString().slice(0, 16)} onChange={event => setGiveawayEndsAt(event.target.value)} className="h-11 border-white/10 bg-[#0b0f14]" /><button type="button" onClick={() => { const groupId = Number(giveawayGroupId); const endsAt = new Date(giveawayEndsAt); if (!groupId || giveawayTitle.trim().length < 3 || giveawayPrizeTitle.trim().length < 2 || Number.isNaN(endsAt.getTime())) { toast.error("Заполните группу, название, приз и время окончания"); return; } createGiveaway.mutate({ groupId, title: giveawayTitle, prizeTitle: giveawayPrizeTitle, rules: giveawayRules || undefined, endsAt }); }} disabled={createGiveaway.isPending} className="w-full rounded-xl bg-[#1688f5] px-4 py-3 text-sm font-semibold text-white disabled:opacity-45">{createGiveaway.isPending ? "Публикуем…" : "Опубликовать розыгрыш"}</button></div></SheetContent>
            </Sheet>
          </section>
        )}

        {page === "earn" && (
          <section className="space-y-4">
            <div>
              <h1 className="text-2xl font-semibold text-white">Заработать</h1>
              <p className="mt-1 text-sm text-slate-500">Все подтверждённые вознаграждения и бонусы в одном месте.</p>
            </div>
            <div className="rounded-2xl border border-emerald-300/15 bg-[linear-gradient(135deg,rgba(34,197,94,0.12),rgba(16,24,34,0.96)_60%)] p-5">
              <small className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-200/75">Бонусный баланс</small>
              <b className="mt-2 block text-3xl tracking-tight text-white">{bonus} GRAM</b>
              <p className="mt-2 text-sm leading-6 text-slate-400">Получайте GRAM только после подтверждённого действия через бота TG TOP.</p>
              <button type="button" onClick={() => setPage("profile")} className="mt-5 inline-flex rounded-xl bg-[#1688f5] px-4 py-2.5 text-sm font-semibold text-white">Открыть баланс</button>
            </div>
          </section>
        )}

        {page === "mine" && (
          <section className={`space-y-4 ${myGroupsSelectionMode ? "pb-[12rem]" : ""}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-semibold">{tx("Мои группы", "My groups")}</h1>
                <p className="mt-1 text-sm text-slate-500">
                  {tx("Подключите бота, чтобы получить статистику и разместить площадку.", "Add the bot as an administrator to get analytics and list your community.")}
                </p>
              </div>
            </div>
            {targetSlot && (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-[#3f8cff]/25 bg-[#3f8cff]/8 px-3 py-2.5">
                <span>
                  <b className="block text-xs text-slate-100">{tx("Выберите группу для позиции", "Choose a group for this placement")}</b>
                  <small className="mt-0.5 block text-[11px] text-slate-400">
                    {targetSlot.group
                      ? tx(`Ставка · от ${amount} GRAM`, `Bid · from ${amount} GRAM`)
                      : tx(`Свободная позиция · от ${amount} GRAM`, `Vacant position · from ${amount} GRAM`)}
                  </small>
                  <small className="mt-0.5 block text-[10px] text-slate-500">
                    {tx("После выбора группы откроется ползунок ставки и оплата через Telegram Stars.", "After you select a community, choose the amount and pay via Telegram Stars.")}
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
              <Input
                value={myGroupsSearchQuery}
                onChange={event => setMyGroupsSearchQuery(event.target.value)}
                aria-label={tx("Поиск в моих группах", "Search my groups")}
                placeholder={tx("Поиск по названию или @username", "Search by name or @username")}
                className="h-8 rounded-lg border-white/10 bg-[#111720] px-3 text-[11px] text-slate-200 placeholder:text-slate-600"
              />
            )}
            <button type="button" onClick={() => setMyGroupsAddOpen(true)} className="flex h-14 w-full items-center justify-between rounded-2xl border border-dashed border-[#3f8cff]/45 bg-[#3f8cff]/[0.055] px-4 text-left transition-colors hover:bg-[#3f8cff]/[0.1] active:scale-[0.99]">
              <span><b className="block text-sm text-[#b8d1ff]">{tx("Добавить сообщество", "Add community")}</b><small className="mt-0.5 block text-[10px] text-slate-500">{tx("Канал или чат с ботом-администратором", "Channel or chat with an administrator bot")}</small></span>
              <span className="grid h-8 w-8 place-items-center rounded-xl border border-[#72a8ff]/35 bg-[#3f8cff]/12 text-[#a6c8ff]"><Plus className="h-4 w-4" /></span>
            </button>
            {!targetSlot && mine.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 px-0.5">
                <button type="button" onClick={() => { setMyGroupsViewMode(mode => mode === "list" ? "grid" : "list"); exitMyGroupsSelection(); }} aria-label={myGroupsViewMode === "grid" ? tx("Показать список", "Show list") : tx("Показать сетку", "Show grid")} className="inline-flex h-6 items-center gap-1.5 rounded-full border border-[#3f8cff]/45 bg-[#3f8cff]/12 px-2.5 text-[9px] font-semibold text-[#b8d1ff] transition-colors hover:bg-[#3f8cff]/20">
                  {myGroupsViewMode === "grid" ? <LayoutGrid className="h-3 w-3" /> : <List className="h-3 w-3" />}
                  {myGroupsViewMode === "grid" ? tx("Сетка", "Grid") : tx("Список", "List")}
                </button>
                <button type="button" onClick={() => myGroupsSelectionMode ? exitMyGroupsSelection() : setMyGroupsSelectionMode(true)} className={`inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-[9px] font-semibold transition-colors ${myGroupsSelectionMode ? "border-[#72a8ff]/55 bg-[#3f8cff]/16 text-[#b8d1ff]" : "border-white/10 bg-white/[0.025] text-slate-500 hover:border-white/20 hover:text-slate-200"}`}><Check className="h-3 w-3" />{myGroupsSelectionMode ? tx("Готово", "Done") : tx("Выбрать", "Select")}</button>
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
                          {visiblePinnedMyGroups.map(group => <SortableMyGroupTile key={group.id} group={group} language={language} disabled={saveMyGroupsLayoutMutation.isPending} onOpen={() => openGroup(group.id)} onTogglePin={() => toggleMyGroupPin(group.id)} selectionMode={myGroupsSelectionMode} selected={selectedGroupIds.includes(group.id)} onSelect={() => myGroupsSelectionMode ? toggleGroupSelection(group.id) : selectMyGroup(group.id)} />)}
                        </div>
                      </SortableContext>
                    </section>
                  )}
                  <section className="space-y-2">
                    {visiblePinnedMyGroups.length > 0 && <div className="px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{tx("Остальные", "Others")}</div>}
                    <SortableContext items={visibleUnpinnedMyGroups.map(group => group.id)} strategy={rectSortingStrategy}>
                      <div className="grid grid-cols-3 gap-2">
                        {visibleUnpinnedMyGroups.map(group => <SortableMyGroupTile key={group.id} group={group} language={language} disabled={saveMyGroupsLayoutMutation.isPending} onOpen={() => openGroup(group.id)} onTogglePin={() => toggleMyGroupPin(group.id)} selectionMode={myGroupsSelectionMode} selected={selectedGroupIds.includes(group.id)} onSelect={() => myGroupsSelectionMode ? toggleGroupSelection(group.id) : selectMyGroup(group.id)} />)}
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
                    <p className="mt-1 text-xs text-slate-500">{mine.length ? tx("Смените фильтр или добавьте новую группу.", "Change the filter or add a new community.") : tx("Добавьте @TGTOP_robot в администраторы.", "Add @TGTOP_robot as an administrator.")}</p>
                  </div>
                )}
              </div>
            ) : (
            <div className="space-y-2">
              {isMyGroupsSearchActive && !targetSlot && <p className="px-1 text-[10px] font-medium text-[#8fb9ff]">{tx("Результаты поиска", "Search results")}</p>}
              {(targetSlot ? orderedMyGroups : visibleMyGroups).map(group => (
                <div
                  key={group.id}
                  className={`relative overflow-hidden rounded-xl border border-white/8 bg-[#111720] p-2 ${targetSlot ? "min-h-[116px]" : "h-[64px]"}`}
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
                  {targetSlot && (
                    <div className="mt-3">
                      <button
                        onClick={() => openStarsPayment(group)}
                        className="w-full rounded-lg bg-[#3f8cff] py-2 text-xs font-semibold active:scale-[0.98]"
                      >
                        {tx("Выбрать и настроить ставку", "Choose and set bid")}
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {mine.length === 0 && (
                <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center">
                  <FolderPlus className="mx-auto h-7 w-7 text-slate-600" />
                  <p className="mt-3 text-sm">{tx("Групп пока нет", "No groups yet")}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {tx("Добавьте @TGTOP_robot в администраторы.", "Add @TGTOP_robot as an administrator.")}
                  </p>
                </div>
              )}
            </div>
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
                  className="flex items-center gap-1 text-xs text-slate-400"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {ui.back}
                </button>
                <div className="rounded-2xl border border-white/8 bg-[#111720] p-5">
                  <div className="flex items-start gap-4">
                    <Avatar group={detail.group} large />
                    <span className="min-w-0">
                      <h1 className="truncate text-xl font-semibold">
                        {detail.group.title}
                      </h1>
                      {detail.group.username ? (
                        <p className="mt-1 truncate text-sm text-[#72a8ff]">
                          @{detail.group.username}
                        </p>
                      ) : detail.group.inviteLink ? (
                        <p className="mt-1 text-sm text-[#72a8ff]">
                          {tx("Приватная группа", "Private group")}
                        </p>
                      ) : (
                        <p className="mt-1 text-sm text-[#72a8ff]">
                          {detail.group.chatId && detail.group.chatId.startsWith("-100")
                            ? tx("Приватная группа", "Private group")
                            : detail.group.category}
                        </p>
                      )}
                      <p className="mt-3 text-sm leading-5 text-slate-400">
                        {detail.group.description ||
                          tx("Описание не передано Telegram API.", "Telegram did not provide a description.")}
                      </p>
                    </span>
                  </div>
                  {detailEntryUrl && (
                    <a
                      href={detailEntryUrl}
                      onClick={event => { event.preventDefault(); openTelegramCommunityLink(detailEntryUrl); }}
                      className="mt-4 flex min-h-12 w-full items-center justify-between rounded-xl border border-[#4d96ff]/45 bg-[#3f8cff]/14 px-4 text-sm font-semibold text-[#c8ddff] transition-colors hover:bg-[#3f8cff]/22 active:scale-[0.99]"
                    >
                      <span>{detailHasPaidEntry
                        ? tx(`Войти за ${detail.group.monthlyEntryStars} Stars`, `Join for ${detail.group.monthlyEntryStars} Stars`)
                        : detail.group.inviteLink && !detail.group.username
                          ? tx("Перейти в приватную группу", "Open private community")
                          : tx("Перейти в группу", "Open community")}</span>
                      <ChevronRight className="h-4 w-4" />
                    </a>
                  )}
                  {ownsDetail && detail.group.status !== "listed" && (
                    <button
                      type="button"
                      onClick={() => openListing([detail.group.id])}
                      className="mt-3 flex min-h-12 w-full items-center justify-between rounded-xl border border-[#3f8cff]/35 bg-[#3f8cff]/10 px-4 text-sm font-semibold text-[#a6c8ff] transition-colors hover:bg-[#3f8cff]/16 active:scale-[0.99]"
                    >
                      <span>{tx("Разместить в каталоге", "List in catalog")}</span>
                      <Plus className="h-4 w-4" />
                    </button>
                  )}
                  {detailEntryUrl && subscriptionReward > 0 && (
                    <a
                      href={detailEntryUrl}
                      onClick={event => { event.preventDefault(); openTelegramCommunityLink(detailEntryUrl); }}
                      className="mt-3 flex min-h-12 w-full items-center justify-between rounded-xl border border-amber-200/25 bg-amber-300/[0.09] px-4 text-sm font-semibold text-amber-50 transition-colors hover:bg-amber-300/[0.14] active:scale-[0.99]"
                    >
                      <span>{tx(`Подписаться и получить +${formatGram(subscriptionReward)} GRAM`, `Subscribe and earn +${formatGram(subscriptionReward)} GRAM`)}</span>
                      <Star className="h-4 w-4 fill-current" />
                    </a>
                  )}
                  {inviteReward > 0 && isAuthenticated && (
                    <button
                      type="button"
                      onClick={() => createRewardInviteLink.mutate({ groupId: detail.group.id })}
                      disabled={createRewardInviteLink.isPending}
                      className="mt-3 flex w-full items-center justify-between rounded-xl border border-amber-200/20 bg-amber-300/[0.07] px-4 py-3 text-left text-amber-50 transition-colors hover:bg-amber-300/[0.11] active:scale-[0.99] disabled:opacity-60"
                    >
                      <span>
                        <b className="block text-xs">{createRewardInviteLink.isPending ? ui.loading : tx(`Взять ссылку · +${formatGram(inviteReward)} GRAM за приглашение`, `Get a link · +${formatGram(inviteReward)} GRAM per referral`)}</b>
                        <small className="mt-1 block text-[10px] text-amber-100/60">{tx("Поделитесь личной ссылкой — награда придет после входа нового подписчика.", "Share your personal link — the reward arrives after a new subscriber joins.")}</small>
                      </span>
                      <Star className="h-4 w-4 shrink-0 fill-current" />
                    </button>
                  )}
                  {manualAddReward > 0 && (
                    <div className="mt-3 flex items-start gap-3 rounded-xl border border-amber-200/20 bg-amber-300/[0.06] p-3">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-amber-200/20 bg-amber-300/10 text-amber-200"><Star className="h-4 w-4 fill-current" /></span>
                      <span>
                        <b className="block text-xs text-amber-50">{tx(`Добавьте участника и получите +${formatGram(manualAddReward)} GRAM`, `Add a member and earn +${formatGram(manualAddReward)} GRAM`)}</b>
                        <small className="mt-1 block text-[11px] leading-4 text-amber-100/60">{tx("Добавьте нового участника напрямую в Telegram — бот начислит вознаграждение мгновенно.", "Add a new member directly in Telegram — the bot credits the reward instantly.")}</small>
                      </span>
                    </div>
                  )}
                  {!detailOwner ? (
                    <div className="mt-3 flex w-full items-center gap-3 rounded-xl border border-white/8 bg-white/[0.035] p-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-[#1b2430] text-xs font-semibold text-slate-300">A</span>
                      <span className="min-w-0 flex-1">
                        <small className="block text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500">{tx("Разместил", "Listed by")}</small>
                        <b className="mt-0.5 block truncate text-xs text-slate-200">{tx("Аноним", "Anonymous")}</b>
                      </span>
                    </div>
                  ) : detailOwner && (
                    <button
                      type="button"
                      onClick={() => {
                        if (detailOwner.telegramUsername) openTelegramCommunityLink(`https://t.me/${detailOwner.telegramUsername}`);
                      }}
                      disabled={!detailOwner.telegramUsername}
                      className="mt-3 flex w-full items-center gap-3 rounded-xl border border-white/8 bg-white/[0.035] p-3 text-left transition-colors hover:bg-white/[0.07] active:scale-[0.99] disabled:cursor-default disabled:opacity-70"
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full border border-white/10 bg-[#1b2430] text-xs font-semibold text-slate-200">
                        {detailOwner.avatarUrl ? <img src={detailOwner.avatarUrl} alt="" className="h-full w-full object-cover" /> : (detailOwner.name ?? detailOwner.telegramUsername ?? "T").slice(0, 1).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <small className="block text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500">{tx("Владелец", "Owner")}</small>
                        <b className="mt-0.5 block truncate text-xs text-slate-200">{detailOwner.telegramUsername ? `@${detailOwner.telegramUsername}` : (detailOwner.name ?? tx("Пользователь TG TOP", "TG TOP user"))}</b>
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-600" />
                    </button>
                  )}
                  {ownsDetail && (
                    <button
                      onClick={() => openListing([detail.group.id])}
                      className="mt-3 w-full rounded-lg border border-[#3f8cff]/35 bg-[#3f8cff]/10 py-2 text-xs font-semibold text-[#a6c8ff]"
                    >
                      {tx("Настроить листинг", "Edit listing")}
                    </button>
                  )}
                  {ownsDetail && detail.group.category === "Чаты" && (
                    <div className="mt-3 rounded-xl border border-white/8 bg-white/4 p-3 space-y-3">
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
                  {ownsDetail && (
                    <div className="mt-2 flex items-center gap-2">
                      {detail.group.status === "listed" ? (
                        <button
                          onClick={() => unlistGroups.mutate({ groupIds: [detail.group.id] }, { onSuccess: () => setPage("mine") })}
                          disabled={unlistGroups.isPending}
                          className="flex-1 rounded-lg border border-rose-300/20 bg-rose-300/5 py-2 text-xs font-medium text-rose-200 transition-colors hover:bg-rose-300/10 disabled:opacity-50"
                        >
                          {tx("Снять с листинга", "Remove from listing")}
                        </button>
                      ) : (
                        <div className="flex-1 text-[11px] text-slate-400 px-1">
                          {tx("Группа не в листинге", "Unlisted")}
                        </div>
                      )}
                      <button
                        onClick={() => {
                          if (window.confirm(tx("Удалить группу из кабинета?", "Delete community from account?"))) {
                            deleteGroups.mutate({ groupIds: [detail.group.id] }, { onSuccess: () => setPage("mine") });
                          }
                        }}
                        disabled={deleteGroups.isPending}
                        title={tx("Удалить группу", "Delete community")}
                        className="rounded-lg border border-red-500/20 bg-red-500/5 p-2 text-red-300 transition-colors hover:bg-red-500/10 disabled:opacity-50 flex items-center justify-center"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                  {selectedSlot && (
                    <section className="mt-3 rounded-xl border border-[#3f8cff]/25 bg-[#3f8cff]/[0.07] p-3">
                      <div className="flex items-start justify-between gap-3">
                        <span>
                          <small className="block text-[10px] font-medium uppercase tracking-[0.12em] text-[#8fb9ff]">{tx("Цена лота", "Lot price")}</small>
                          <b className="mt-1 block text-base text-slate-100">{formatTon(selectedSlot.bidAmount / 1000)} GRAM</b>
                        </span>
                        <span className="rounded-full border border-white/10 bg-black/15 px-2 py-1 text-[10px] text-slate-300">{tx(`минимум ${formatTon(detailMinimumBid)} GRAM`, `minimum ${formatTon(detailMinimumBid)} GRAM`)}</span>
                      </div>
                      <div className="mt-3 flex items-center justify-between border-t border-white/8 pt-2 text-[11px]">
                        <span className="text-slate-500">{tx("На этой позиции", "In this position")}</span>
                        <b className="font-mono tabular-nums text-slate-200">{formatPositionDuration(selectedSlot.updatedAt, positionClock)}</b>
                      </div>
                      {!ownsDetail && isAuthenticated && <button onClick={() => openMine(selectedSlot)} className="mt-3 flex w-full items-center justify-between rounded-lg border border-[#3f8cff]/35 bg-[#3f8cff]/10 px-3 py-2.5 text-left transition-colors hover:bg-[#3f8cff]/15"><span><b className="block text-xs text-[#a6c8ff]">{tx("Цена лота", "Lot price")}</b><small className="mt-0.5 block text-[10px] text-slate-400">{tx(`Установить от ${formatTon(detailMinimumBid)} GRAM`, `Set from ${formatTon(detailMinimumBid)} GRAM`)}</small></span><ChevronRight className="h-4 w-4 text-[#a6c8ff]" /></button>}
                    </section>
                  )}
                  {!ownsDetail && detail.group.salePriceTon && detail.group.listingType === "sale" && (
                    <div className="mt-3 rounded-xl border border-[#3f8cff]/25 bg-[#3f8cff]/8 p-3">
                      <div className="flex items-baseline justify-between gap-3">
                        <span>
                          <b className="block text-sm text-slate-100">{tx("Безопасная покупка", "Protected purchase")}</b>
                          <small className="mt-1 block text-[11px] text-slate-400">{tx("Передача owner-прав · до 21 дня", "Owner-rights transfer · up to 21 days")}</small>
                        </span>
                        <b className="text-sm text-[#a6c8ff]">{formatTon(detail.group.salePriceTon)} TON</b>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <small className="text-[10px] text-slate-500">{tx("Комиссия TG TOP · 0%", "TG TOP fee · 0%")}</small>
                        <button
                          onClick={() => createProtectedGroupDeal.mutate({ groupId: detail.group.id })}
                          disabled={createProtectedGroupDeal.isPending || !isAuthenticated}
                          className="rounded-lg bg-[#3f8cff] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                        >
                          {isAuthenticated ? tx(`Купить за ${formatTon(detail.group.salePriceTon)} TON`, `Buy for ${formatTon(detail.group.salePriceTon)} TON`) : tx("Войти через Telegram", "Sign in with Telegram")}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="sticky top-2 z-10 flex items-center justify-between rounded-xl border border-[#3f8cff]/25 bg-[#101a2a]/95 px-4 py-3 shadow-lg backdrop-blur">
                  <span>
                    <small className="block text-[10px] font-medium uppercase tracking-[0.14em] text-[#a6c8ff]">{tx("Участники", "Members")}</small>
                    <b className="mt-0.5 block text-2xl leading-none text-white">{n(detail.group.membersCount)}</b>
                  </span>
                  <Users className="h-5 w-5 text-[#72a8ff]" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {detail.group.joinedCount > 0 && <Metric label={tx("Вступления", "Joins")} value={n(detail.group.joinedCount)} note={tx("замеченные ботом", "observed by the bot")} />}
                  {detail.group.leavesCount > 0 && <Metric label={tx("Выходы", "Leaves")} value={n(detail.group.leavesCount)} note={tx("замеченные ботом", "observed by the bot")} />}
                  <Metric label={tx("Приглашения", "Invites")} value={n(detail.group.invitedCount)} note={tx("зафиксировано ботом", "recorded by the bot")} />
                  {detail.group.messagesCount > 0 && <Metric label={tx("Публикации", "Posts")} value={n(detail.group.messagesCount)} note={tx("увиденные ботом", "observed by the bot")} />}
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
                  {publicOwner.groups.map(group => <GroupCard key={group.id} group={group} variant="list" language={language} onClick={() => openGroup(group.id)} />)}
                </section>
                <NftShowcase nfts={publicOwner.nfts} language={language} title={tx("NFT-витрина владельца", "Owner NFT showcase")} />
              </>
            ) : (
              <p className="py-16 text-center text-sm text-slate-500">{tx("Загружаем профиль владельца…", "Loading owner profile…")}</p>
            )}
          </section>
        )}

        {page === "profile" && (
          <section className="space-y-4">
            <div className="rounded-2xl border border-white/8 bg-[#111720] p-5">
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
                  <h1 className="text-lg font-semibold">
                    {user?.name ?? tx("Пользователь Telegram", "Telegram user")}
                  </h1>
                  <small className="text-xs text-slate-500">
                    {tx("Личный кабинет TG TOP", "TG TOP account")}
                  </small>
                </span>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <Metric
                  label={tx("Основной баланс", "Main balance")}
                  value={`${mainTon} TON`}
                  note={tx("пополнения и оплаты", "top-ups and payments")}
                />
                <Metric
                  label={tx("Бонусный баланс", "Bonus balance")}
                  value={`${bonus} GRAM`}
                  note={tx("для размещения", "for placement")}
                />
              </div>
            </div>
            <section className="rounded-2xl border border-white/8 bg-[#111720] p-4">
              <div className="flex items-start justify-between gap-3">
                <span>
                  <h2 className="text-sm font-semibold">{tx("Баланс", "Balance")}</h2>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{tx("Реальные начисления и списания внутреннего GRAM.", "Recorded internal GRAM credits and debits.")}</p>
                </span>
                <span className="rounded-md border border-[#3f8cff]/25 bg-[#3f8cff]/8 px-2 py-1 text-[10px] font-medium text-[#a6c8ff]">GRAM</span>
              </div>
              <GramBalanceChart transactions={transactions} currentBalance={Number(bonus)} language={language} />
              <WalletConnectControl language={language} balanceTon={formatTon(Number(mainTon))} variant="profile" />
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button type="button" disabled aria-label={tx("Пополнение пока недоступно", "Deposit is not available yet")} className="rounded-xl border border-white/10 bg-white/[0.025] px-3 py-2 text-left opacity-65"><b className="block text-[11px] text-slate-300">{tx("Пополнить", "Deposit")}</b><small className="mt-0.5 block text-[9px] text-slate-500">{tx("Скоро", "Coming soon")}</small></button>
                <button type="button" disabled aria-label={tx("Вывод пока недоступен", "Withdrawal is not available yet")} className="rounded-xl border border-white/10 bg-white/[0.025] px-3 py-2 text-left opacity-65"><b className="block text-[11px] text-slate-300">{tx("Вывести", "Withdraw")}</b><small className="mt-0.5 block text-[9px] text-slate-500">{tx("После проверки", "After verification")}</small></button>
              </div>
            </section>
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
                  <p className="mt-1 text-xs leading-5 text-slate-500">{tx("По суммарной аудитории активных площадок в TG TOP.", "By recorded audience across active TG TOP communities.")}</p>
                </span>
                <span className="rounded-md border border-[#3f8cff]/25 bg-[#3f8cff]/8 px-2 py-1 text-[10px] font-medium text-[#a6c8ff]">{tx("Данные TG TOP", "TG TOP data")}</span>
              </div>
              {ownerLeaderboard.length ? (
                <div className="divide-y divide-white/7">
                  {ownerLeaderboard.map(entry => {
                    const ownerLabel = entry.owner.telegramUsername ? `@${entry.owner.telegramUsername}` : (entry.owner.name ?? tx("Владелец TG TOP", "TG TOP owner"));
                    return <button key={entry.owner.openId} onClick={() => openOwner(entry.owner.openId)} className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.025]">
                      <span className="w-5 text-center text-xs font-semibold text-[#72a8ff]">{entry.rank}</span>
                      <span className="grid h-8 w-8 overflow-hidden rounded-full border border-white/10 bg-[#1b2430] text-[10px] font-semibold">
                        {entry.owner.avatarUrl ? <img src={entry.owner.avatarUrl} alt="" className="h-full w-full object-cover" /> : (ownerLabel.slice(0, 1).toUpperCase())}
                      </span>
                      <span className="min-w-0 flex-1">
                        <b className="block truncate text-xs text-slate-200">{ownerLabel}</b>
                        <small className="mt-0.5 block text-[10px] text-slate-500">{entry.activeListings} {tx("площадок", "active listings")}</small>
                      </span>
                      <span className="text-right">
                        <b className="block text-xs text-[#a6c8ff]">{n(entry.totalMembers, language)}</b>
                        <small className="block text-[9px] text-slate-500">{tx("аудитория", "audience")}</small>
                      </span>
                    </button>;
                  })}
                </div>
              ) : (
                <p className="px-4 py-8 text-center text-sm text-slate-500">{tx("Лидерборд появится после первых активных листингов.", "The leaderboard appears after the first active listings.")}</p>
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
                      : item.status;
                    const absoluteAmount = item.amount === null ? null : Math.abs(item.amount);
                    const amount = absoluteAmount === null || !item.currency ? null : `${item.direction === "in" ? "+" : item.direction === "out" ? "−" : ""}${item.currency === "Stars" ? n(absoluteAmount, language) : formatTon(absoluteAmount)} ${item.currency}`;
                    return <div key={item.id} className="flex items-center justify-between gap-3 px-4 py-3.5">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[#3f8cff]/25 bg-[#3f8cff]/8 text-[11px] font-semibold text-[#a6c8ff]">{item.type === "stars" ? "★" : item.type === "nft_transfer" ? "NFT" : item.type === "deal" ? "D" : item.type === "bid" ? "B" : "G"}</span>
                      <span className="min-w-0 flex-1">
                        <b className="block truncate text-sm">{title}</b>
                        <small className="mt-1 block truncate text-xs text-slate-500">{item.subject} · {date(item.createdAt, language)}</small>
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
                    const title = deal.groupUsername ? `@${deal.groupUsername}` : (deal.groupTitle ?? tx("Группа TG TOP", "TG TOP community"));
                    return (
                      <div key={deal.id} className="px-4 py-3.5">
                        <div className="flex items-start justify-between gap-3">
                          <span className="min-w-0">
                            <b className="block truncate text-sm">{title}</b>
                            <small className="mt-1 block text-[11px] text-slate-500">
                              {isBuyer ? tx("Покупатель", "Buyer") : tx("Продавец", "Seller")} · {date(deal.createdAt, language)}
                            </small>
                          </span>
                          <b className="shrink-0 text-sm text-[#a6c8ff]">{deal.price} TON</b>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                          <span className="rounded-md bg-white/5 px-2 py-1 text-[10px] text-slate-300">
                            {dealStatusLabel(deal.status)}
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
                          {getProtectedDealGuidance(deal.status, isBuyer, Boolean(deal.buyerConfirmedAt))}
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
                    value={referral?.earnings ?? "0 TON"}
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
                  [tx("Кошелек", "Wallet"), tx("Подключение кошелька только показывает ваш TON-адрес. TG TOP пока не запрашивает подпись или перевод TON.", "Connecting a wallet shows your TON address. TG TOP does not yet request a TON signature or transfer.")],
                  [tx("Листинг", "Listing"), tx("Подключите @TGTOP_robot как администратора, получите 0.1 GRAM и настройте каталог, продажу или аренду в личной папке.", "Add @TGTOP_robot as an administrator, receive 0.1 GRAM, then configure catalog, sale, or rental settings in My Groups.")],
                  [tx("Рейтинг", "Ranking"), tx("Место в топе меняется при большей ставке. Перед оплатой будет отдельное подтверждение — автоматические TON-платежи еще не включены.", "A higher bid changes the top placement. Payment will require a separate confirmation; automatic TON payments are not enabled yet.")],
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
            <button
              onClick={() => openMine()}
              className="flex w-full items-center justify-between rounded-xl border border-white/8 bg-[#111720] p-4 text-left"
            >
              <span className="flex items-center gap-3">
                <Users className="h-5 w-5 text-[#72a8ff]" />
                <span>
                  <b className="block text-sm">{tx("Мои группы", "My groups")}</b>
                  <small className="block mt-0.5 text-xs text-slate-500">
                    {tx("Управление и листинг", "Management and listing")}
                  </small>
                </span>
              </span>
              <ChevronRight className="h-4 w-4 text-slate-600" />
            </button>
          </section>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/8 bg-[#0b0f14]/95 backdrop-blur">
        <div className="mx-auto grid max-w-3xl grid-cols-4 px-3 py-2">
          {(
            [
              { key: "top", label: "Каталог", icon: Trophy },
              { key: "giveaways", label: "Розыгрыши", icon: Star },
              { key: "earn", label: "Заработать", icon: WalletCards },
              { key: "mine", label: "Мой кабинет", icon: Users },
            ] as const
          ).map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                onClick={() =>
                  item.key === "mine" ? openMine() : setPage(item.key)
                }
                className={`flex flex-col items-center gap-1 py-1 text-[10px] ${page === item.key ? "text-[#72a8ff]" : "text-slate-500"}`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
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

      <Sheet open={Boolean(starsPaymentGroup)} onOpenChange={open => !open && setStarsPaymentGroup(null)}>
        <SheetContent side="bottom" className="max-h-[88dvh] rounded-t-[26px] border-white/10 bg-[#10161f] text-slate-100">
          <SheetHeader className="px-4">
            <SheetTitle className="text-slate-100">{tx("Выберите цену места", "Set placement price")}</SheetTitle>
            <p className="text-xs leading-5 text-slate-500">
              {starsPaymentGroup?.title} · {tx(`позиция ${targetSlot?.slotNumber ?? "—"}`, `placement ${targetSlot?.slotNumber ?? "—"}`)}
            </p>
          </SheetHeader>
          <div className="space-y-4 px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-2">
            {starsPaymentGroup && targetSlot && (() => {
              const minimum = getMinimumRankingBidGram(targetSlot);
              const rawAmount = Number(amount);
              const bidAmount = Number.isFinite(rawAmount) ? Math.max(minimum, Math.round(rawAmount * 10) / 10) : minimum;
              const maximum = Math.min(MAX_RANKING_BID_GRAM, Math.max(minimum + 3, Math.ceil(bidAmount * 1.5 * 10) / 10));
              const ratio = bidAmount / minimum;
              const tone = ratio <= 1.2
                ? { text: "text-emerald-300", range: "[&_[data-slot=slider-range]]:!bg-emerald-400 [&_[data-slot=slider-thumb]]:!border-emerald-100 [&_[data-slot=slider-thumb]]:!bg-emerald-400" }
                : ratio <= 1.5
                  ? { text: "text-amber-300", range: "[&_[data-slot=slider-range]]:!bg-amber-400 [&_[data-slot=slider-thumb]]:!border-amber-100 [&_[data-slot=slider-thumb]]:!bg-amber-400" }
                  : { text: "text-fuchsia-300", range: "[&_[data-slot=slider-range]]:!bg-fuchsia-400 [&_[data-slot=slider-thumb]]:!border-fuchsia-100 [&_[data-slot=slider-thumb]]:!bg-fuchsia-400" };
              const setBid = (next: number) => setAmount(formatTon(Math.min(MAX_RANKING_BID_GRAM, Math.max(minimum, Math.round(next * 10) / 10))));
              const starsAmount = Math.max(10, Math.ceil(bidAmount * 100));
              return <>
                <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.035] p-3">
                  <Avatar group={starsPaymentGroup} compact />
                  <span className="min-w-0 flex-1"><b className="block truncate text-sm text-white">{starsPaymentGroup.title}</b><small className="mt-0.5 block text-[11px] text-slate-500">{tx(`Минимум для позиции: ${formatTon(minimum)} GRAM`, `Placement minimum: ${formatTon(minimum)} GRAM`)}</small></span>
                </div>
                <label className="block"><span className="mb-2 block text-xs text-slate-400">{tx("Ваша ставка", "Your bid")}</span><span className="flex items-center rounded-2xl border border-white/8 bg-[#0b0f14] px-4"><Input value={amount} inputMode="decimal" onChange={event => { const value = event.target.value.replace(",", "."); if (/^\d*(\.\d?)?$/.test(value)) setAmount(value); }} onBlur={() => setBid(Number(amount))} aria-label={tx("Сумма ставки в GRAM", "Bid amount in GRAM")} className="h-14 border-0 bg-transparent px-0 text-3xl font-semibold text-white focus-visible:ring-0" /><b className="text-sm text-slate-400">GRAM</b></span></label>
                <div><div className="mb-2 flex items-center justify-between text-[10px] text-slate-500"><span>{formatTon(minimum)} GRAM</span><span className={tone.text}>{ratio <= 1.2 ? tx("Минимальная", "Minimum") : ratio <= 1.5 ? tx("Уверенная", "Confident") : tx("Максимальная", "Maximum")}</span><span>{formatTon(maximum)} GRAM</span></div><Slider value={[bidAmount]} min={minimum} max={maximum} step={0.1} onValueChange={([value]) => setBid(value)} className={`py-3 [&_[data-slot=slider-track]]:h-3 [&_[data-slot=slider-track]]:bg-white/10 [&_[data-slot=slider-thumb]]:size-7 ${tone.range}`} /></div>
                <div className="grid grid-cols-4 gap-2">{[{ label: "+10%", value: bidAmount * 1.1 }, { label: "+30%", value: bidAmount * 1.3 }, { label: "+50%", value: bidAmount * 1.5 }, { label: tx("Минимум", "Minimum"), value: minimum }].map(item => <button key={item.label} onClick={() => setBid(item.value)} className="rounded-xl border border-white/8 bg-white/[0.04] px-2 py-2.5 text-xs font-semibold text-slate-300 transition-colors hover:bg-white/[0.08] active:scale-[0.97]">{item.label}</button>)}</div>
                <p className="text-center text-xs text-slate-400">{tx(`${formatTon(bidAmount)} GRAM · шаг 0.1 GRAM`, `${formatTon(bidAmount)} GRAM · 0.1 GRAM step`)}</p>
                <button onClick={() => createStarsRankingPayment.mutate({ slotId: targetSlot.id, groupId: starsPaymentGroup.id, bidAmount })} disabled={createStarsRankingPayment.isPending || !isAuthenticated} className="flex w-full items-center justify-between rounded-2xl bg-[#1688f5] px-5 py-4 text-left text-white shadow-lg shadow-[#1688f5]/20 transition-transform active:scale-[0.98] disabled:opacity-55"><span><b className="block text-base">{isAuthenticated ? tx("Оплатить место", "Pay for placement") : tx("Войти через Telegram", "Sign in with Telegram")}</b><small className="mt-0.5 block text-[11px] text-white/70">{tx("Telegram покажет защищённое подтверждение.", "Telegram will show a protected confirmation.")}</small></span><b className="text-lg">{starsAmount} ★</b></button>
              </>;
            })()}
          </div>
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
              <p className="mb-2 text-xs text-slate-400">{tx("Страна / регион в каталоге", "Catalog country / region")}</p>
              <Select value={listingCountry} onValueChange={value => { setListingCountry(value as ListingCountry); setListingCity("Все"); }}>
                <SelectTrigger className="h-11 w-full rounded-xl border-white/10 bg-[#0b0f14] text-sm text-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[70] border-white/10 bg-[#111720] text-slate-100">
                  {COUNTRY_OPTIONS.map(item => <SelectItem key={item} value={item} className="text-sm text-slate-200 focus:bg-[#3f8cff]/15 focus:text-[#c8ddff]">{getCountryLabel(item, language)}</SelectItem>)}
                </SelectContent>
              </Select>
            </section>

            {(CITY_OPTIONS[listingCountry] ?? []).length > 0 && (
              <section>
                <p className="mb-2 text-xs text-slate-400">{tx("Город", "City")}</p>
                <Select value={listingCity} onValueChange={setListingCity}>
                  <SelectTrigger className="h-11 w-full rounded-xl border-white/10 bg-[#0b0f14] text-sm text-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[70] border-white/10 bg-[#111720] text-slate-100">
                    <SelectItem value="Все" className="text-sm text-slate-200 focus:bg-[#3f8cff]/15 focus:text-[#c8ddff]">{tx("Не указан", "Not specified")}</SelectItem>
                    {CITY_OPTIONS[listingCountry].map(item => <SelectItem key={item.value} value={item.value} className="text-sm text-slate-200 focus:bg-[#3f8cff]/15 focus:text-[#c8ddff]">{item[language]}</SelectItem>)}
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
                    {listingSubcategoryOptions.map(item => <SelectItem key={item} value={item} className="text-sm text-slate-200 focus:bg-[#3f8cff]/15 focus:text-[#c8ddff]">{getSubcategoryLabel(item, language)}</SelectItem>)}
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
                  <span className="rounded-full border border-[#72a8ff]/25 bg-[#3f8cff]/10 px-2 py-1 text-[10px] font-semibold text-[#a6c8ff]">{tx("до 1 000 GRAM", "up to 1,000 GRAM")}</span>
                </div>
                <div className="mt-3 flex items-center rounded-xl border border-white/8 bg-[#0b0f14] px-3">
                  <Input value={listingRankingBid} inputMode="decimal" onChange={event => { const value = event.target.value.replace(",", "."); if (/^\d*(\.\d?)?$/.test(value)) setListingRankingBid(value); }} onBlur={() => setListingRankingBid(formatTon(listingRankingBidAmount))} aria-label={tx("Цена места в GRAM", "Ranking price in GRAM")} className="h-12 border-0 bg-transparent px-0 text-xl font-semibold text-white focus-visible:ring-0" />
                  <b className="text-xs text-slate-400">GRAM</b>
                </div>
                <Slider value={[listingRankingBidAmount]} min={0.1} max={MAX_RANKING_BID_GRAM} step={0.1} onValueChange={([value]) => setListingRankingBid(formatTon(value))} className="mt-3 py-2 [&_[data-slot=slider-track]]:h-2.5 [&_[data-slot=slider-track]]:bg-white/10 [&_[data-slot=slider-range]]:!bg-[#3f8cff] [&_[data-slot=slider-thumb]]:size-6 [&_[data-slot=slider-thumb]]:!border-[#b9d6ff] [&_[data-slot=slider-thumb]]:!bg-[#3f8cff]" />
                <div className="mt-3 rounded-xl border border-white/8 bg-white/[0.035] px-3 py-2.5">
                  {listingRankingPreviewSlotNumber ? <><small className="block text-[10px] uppercase tracking-[0.1em] text-slate-500">{tx("Предпросмотр позиции", "Placement preview")}</small><b className="mt-1 block text-sm text-white">{tx(`Займёт ${listingRankingPreviewSlotNumber}-ю позицию`, `Will take position ${listingRankingPreviewSlotNumber}`)}</b><small className="mt-1 block text-[10px] text-slate-400">{listingRankingMinimum !== null ? tx(`Для этой ячейки нужно от ${formatTon(listingRankingMinimum)} GRAM`, `This cell requires at least ${formatTon(listingRankingMinimum)} GRAM`) : ""}</small></> : <><b className="block text-sm text-amber-100">{tx("С этой суммой группа не попадёт в Top", "This amount will not enter Top")}</b><small className="mt-1 block text-[10px] text-slate-500">{tx("Увеличьте ставку, чтобы занять доступную ячейку.", "Increase the bid to take an available cell.")}</small></>}
                </div>
                <button type="button" onClick={() => { if (!listingRankingPreviewSlot || !canPayListingRanking) return; setTargetSlot(listingRankingPreviewSlot); setAmount(formatTon(listingRankingBidAmount)); setListingOpen(false); window.setTimeout(() => setStarsPaymentGroup(selectedListingGroup), 160); }} disabled={!canPayListingRanking} className="mt-3 flex w-full items-center justify-between rounded-xl bg-[#1688f5] px-4 py-3 text-left text-sm font-semibold text-white transition-transform active:scale-[0.98] disabled:opacity-45"><span>{tx("Оплатить место", "Pay for placement")}</span><span>{Math.max(10, Math.ceil(listingRankingBidAmount * 100))} ★</span></button>
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
                    onChange={event => setSalePriceTon(event.target.value)}
                    placeholder={tx("Например, 250", "For example, 250")}
                    className="h-11 border-white/10 bg-[#0b0f14] pr-12 text-sm"
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



            {selectedListingGroups.length > 0 && (
              <section className="rounded-xl border border-white/8 bg-white/[0.035] p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs">
                    <b className="block text-slate-200">{tx("Показать контакт владельца", "Show owner contact")}</b>
                    <small className="mt-0.5 block text-[11px] leading-4 text-slate-500">{tx("Показывает только @username в деталях площадки, даже если сам профиль скрыт.", "Shows only the @username in community details even when the profile stays hidden.")}</small>
                  </span>
                  <button type="button" role="switch" aria-checked={showOwnerContact} aria-label={tx("Переключить контакт владельца", "Toggle owner contact")} onClick={() => setShowOwnerContact(value => !value)} className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors ${showOwnerContact ? "border-[#72a8ff] bg-[#3f8cff]" : "border-white/15 bg-white/8"}`}>
                    <span className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${showOwnerContact ? "translate-x-6" : "translate-x-0"}`} />
                  </button>
                </div>
              </section>
            )}

            <div className="rounded-xl border border-[#3f8cff]/18 bg-[#3f8cff]/8 p-3 text-[11px] leading-4 text-slate-400">
              {tx("Новая публикация использует", "A new publication uses")} <b className="font-medium text-[#a6c8ff]">0.1 GRAM</b> {tx("за группу. Повторное редактирование уже опубликованного листинга не списывает бонусы. Оплата TON и передача прав пока не запускаются автоматически.", "per community. Editing an existing listing does not spend more bonuses. TON payments and ownership transfers do not start automatically yet.")}
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
            <p className="text-xs leading-5 text-slate-500">{tx("Выберите тип — Telegram предложит добавить @TGTOP_robot администратором.", "Choose a type — Telegram will offer to add @TGTOP_robot as an administrator.")}</p>
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
              <p className="rounded-xl border border-white/8 bg-white/[0.025] p-3 text-[11px] leading-5 text-slate-500">{tx("Off-chain NFT передается внутри защищенного учета TG TOP. On-chain NFT требует проверки обоих кошельков и подписи транзакции в TON.", "Off-chain NFTs move through TG TOP’s protected ledger. On-chain NFTs require both wallets to be verified and a TON transaction signature.")}</p>
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
              {selectedNft.assetClass === "onchain" && <p className="rounded-xl border border-amber-300/20 bg-amber-300/5 p-3 text-[11px] leading-5 text-amber-100/75">{tx("On-chain перевод необратим. Он станет доступен только после криптографической проверки кошельков отправителя и получателя; сеть TON взимает свою комиссию.", "On-chain transfers are irreversible. They become available only after cryptographic wallet verification for both parties; the TON network charges its own fee.")}</p>}
            </div>
          )}

          {nftTransferStep === "prepared" && preparedNftTransfer && (
            <div className="space-y-4 px-4 pb-4">
              <div className="rounded-2xl border border-[#3f8cff]/25 bg-[#3f8cff]/8 p-4 text-center">
                <Check className="mx-auto h-7 w-7 text-[#72a8ff]" />
                <b className="mt-2 block text-base text-slate-100">{preparedNftTransfer.transfer.assetClass === "offchain" ? tx("Подтвердите передачу", "Confirm transfer") : tx("Проверка кошельков требуется", "Wallet verification required")}</b>
                <p className="mt-1 text-xs leading-5 text-slate-500">{preparedNftTransfer.transfer.assetClass === "offchain" ? tx("После подтверждения NFT перейдет получателю внутри TG TOP. Комиссия платформы — 0%.", "After confirmation, the NFT will move to the recipient inside TG TOP. Platform fee — 0%.") : tx("Этот On-chain NFT останется в безопасности до завершения проверки адресов и подготовки подписи в TON Connect.", "This on-chain NFT remains safe until address verification and TON Connect signing are ready.")}</p>
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
              {preparedNftTransfer?.transfer.assetClass === "offchain" && <Button onClick={completePreparedOffchainNftTransfer} disabled={completeOffchainNftTransferMutation.isPending} className="bg-[#3f8cff] text-white">{completeOffchainNftTransferMutation.isPending ? ui.loading : tx("Подтвердить передачу", "Confirm transfer")}</Button>}
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
        language={language}
        onLanguageChange={setLanguage}
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
