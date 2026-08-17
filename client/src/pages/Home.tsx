import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
  Moon,
  Plus,
  Settings2,
  Sun,
  Trash2,
  Trophy,
  UserRound,
  Users,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";
import { useIsConnectionRestored, useTonAddress, useTonConnectUI } from "@tonconnect/ui-react";

type Page = "top" | "catalog" | "mine" | "details" | "owner" | "profile";
type Audience = "all" | "small" | "medium" | "large";
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
type ListingType = "catalog" | "sale";
type ListingCountry = "Global" | "UA" | "PL" | "DE" | "GB" | "US" | "RU";
type GlobalDirection = "Все" | "Каналы" | "Чаты" | "NFT";
const COUNTRY_OPTIONS = ["Global", "UA", "PL", "DE", "GB", "US", "RU"] as const;
const COUNTRY_LABELS: Record<string, { ru: string; en: string }> = {
  Global: { ru: "Весь мир", en: "Worldwide" },
  UA: { ru: "Украина", en: "Ukraine" },
  PL: { ru: "Польша", en: "Poland" },
  DE: { ru: "Германия", en: "Germany" },
  GB: { ru: "Великобритания", en: "United Kingdom" },
  US: { ru: "США", en: "United States" },
  RU: { ru: "Россия", en: "Russia" },
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
  deleteServiceMessages?: boolean;
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
const getCategoryLabel = (category: Group["category"], language: Language) =>
  language === "en" ? (category === "Каналы" ? "Channels" : "Chats") : category;
const getSubcategoryLabel = (subcategory: string, language: Language) =>
  SUBCATEGORY_LABELS[subcategory]?.[language] ?? subcategory;
const getCountryLabel = (country: string, language: Language) =>
  COUNTRY_LABELS[country]?.[language] ?? country;
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

function OwnerEntry({ group, language, onOpen, inverse = false }: { group: Group; language: Language; onOpen?: () => void; inverse?: boolean }) {
  const owner = group.owner;
  if (!owner) return null;
  const label = owner.telegramUsername ? `@${owner.telegramUsername}` : (owner.name ?? (language === "en" ? "TG TOP user" : "Пользователь TG TOP"));
  const content = <>{language === "en" ? "Listed by" : "Разместил"} <b className="font-medium">{label}</b></>;
  if (!onOpen) return <small className={`mt-1 block truncate text-[10px] ${inverse ? "text-slate-200/65" : "text-slate-500"}`}>{content}</small>;
  return <button type="button" onClick={event => { event.stopPropagation(); onOpen(); }} onKeyDown={event => event.stopPropagation()} className={`mt-1 block max-w-full truncate text-left text-[10px] no-underline transition-colors ${inverse ? "text-slate-200/75 hover:text-white" : "text-slate-500 hover:text-[#a6c8ff]"}`}>{content}</button>;
}

type GroupCardVariant = "lead" | "secondary" | "compact" | "list";

function GroupCard({
  group,
  variant = "list",
  onClick,
  onOwnerClick,
  language = "ru",
}: {
  group?: Group | null;
  variant?: GroupCardVariant;
  onClick: () => void;
  onOwnerClick?: () => void;
  language?: Language;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const lead = variant === "lead";
  const compact = variant === "compact";
  const rankingPlacement = variant !== "list";
  const cardStyle = lead
    ? "h-[286px] border-[#3f8cff]/35 bg-[#141c27] p-5 sm:h-[42vh] sm:p-6"
          : variant === "secondary"
      ? "h-[116px] border-white/10 bg-[#111720] p-3 sm:h-[140px] sm:p-4"
      : compact
        ? "h-[84px] border-white/8 bg-[#111720] p-2 sm:h-[106px]"
        : "h-[52px] border-white/8 bg-[#111720] px-3 py-1.5";
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
              {groupUrl ? <a href={groupUrl} target="_blank" rel="noreferrer" onClick={event => event.stopPropagation()} className="no-underline hover:text-white">@{group.username}</a> : getCategoryLabel(group.category, language)} ·{" "}
              {n(group.membersCount, language)} {language === "en" ? "members" : "участников"}
            </small>
            {!compact && <OwnerEntry group={group} language={language} onOpen={onOwnerClick} inverse />}
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
                {group.username ? `@${group.username}` : group.inviteLink ? (language === "en" ? "Private group" : "Приватная группа") : getCategoryLabel(group.category, language)} ·{" "}
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
            ) : !rankingPlacement ? (
              <span className="rounded bg-white/5 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                {language === "en" ? "Catalog" : "Каталог"}
              </span>
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
      className="brand-mark relative grid h-8 w-8 place-items-center overflow-hidden rounded-[10px] border border-white/20 bg-black shadow-[0_6px_16px_rgba(0,0,0,0.32)]"
    >
      <span className="absolute -right-2 -top-3 h-7 w-7 rounded-full bg-white/12 blur-[1px]" />
      <b className="brand-mark-symbol relative text-[16px] font-black leading-none tracking-[-0.12em] text-white">
        T
      </b>
    </span>
  );
}

function WalletConnectControl({ language, balanceTon }: { language: Language; balanceTon: string }) {
  const [tonConnectUi] = useTonConnectUI();
  const address = useTonAddress();
  const restored = useIsConnectionRestored();
  const label = address
    ? language === "en" ? "Connected" : "Подключён"
    : language === "en"
      ? "Connect wallet"
      : "Кошелёк";

  return <button disabled={!restored} onClick={() => tonConnectUi.openModal()} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#3f8cff]/35 bg-[#3f8cff]/10 px-2.5 text-[11px] font-medium text-[#a6c8ff] disabled:opacity-60"><WalletCards className="h-3.5 w-3.5" />{restored ? <><span>{label}</span>{address && <span className="rounded-md bg-[#0b0f14]/70 px-1.5 py-0.5 text-[10px] text-white">{balanceTon} TON</span>}</> : language === "en" ? "Loading…" : "Загрузка…"}</button>;
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
  const [audience, setAudience] = useState<Audience>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [adminGuideKind, setAdminGuideKind] = useState<"channel" | "group" | null>(null);
  const [language, setLanguage] = useState<Language>(() =>
    localStorage.getItem("tg-top-language") === "en" ? "en" : "ru"
  );
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [selectedOwnerOpenId, setSelectedOwnerOpenId] = useState<string | null>(null);
  const [targetSlot, setTargetSlot] = useState<Slot | null>(null);
  const [amount, setAmount] = useState("0.1");
  const [starsPaymentGroup, setStarsPaymentGroup] = useState<Group | null>(null);
  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([]);
  const [listingOpen, setListingOpen] = useState(false);
  const [listingType, setListingType] = useState<ListingType>("catalog");
  const [listingCountry, setListingCountry] = useState<ListingCountry>("Global");
  const [listingSubcategory, setListingSubcategory] = useState("General");
  const [salePriceTon, setSalePriceTon] = useState("");
  const [nftTransferOpen, setNftTransferOpen] = useState(false);
  const [nftTransferStep, setNftTransferStep] = useState<"select" | "review" | "prepared">("select");
  const [nftAssetFilter, setNftAssetFilter] = useState<"all" | "onchain" | "offchain">("all");
  const [selectedNftId, setSelectedNftId] = useState<number | null>(null);
  const [recipientInput, setRecipientInput] = useState("");
  const [preparedNftTransfer, setPreparedNftTransfer] = useState<PreparedNftTransfer | null>(null);
  const [showcaseNftId, setShowcaseNftId] = useState<number | null>(null);

  useEffect(() => {
    localStorage.setItem("tg-top-language", language);
  }, [language]);
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
  });
  const slots = (slotsQuery.data ?? []) as Slot[];
  const groupsQuery = trpc.tgTop.getGroups.useQuery({ category, country, subcategory });
  const listedGroups = (groupsQuery.data ?? []) as Group[];
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
  const accountQuery = trpc.tgTop.getAccount.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const accountActivityQuery = trpc.tgTop.getAccountActivity.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const account = accountQuery.data as
    | {
        user?: { bonusBalance: number; mainBalanceTon: string | number };
      transactions: Array<{
          id: number;
          amount: number;
          kind: "group_connection_bonus" | "listing_spend";
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
  const detail = detailQuery.data as
    | {
        group: Group;
        snapshots: Array<{
          membersCount: number;
          messagesCount: number;
          joinedCount: number;
          recordedAt: Date;
        }>;
        ownerNfts: ShowcaseNft[];
        analytics: { source: "tgtop_bot_observed"; observedSince: Date };
      }
    | undefined;

  const listWithCredits = trpc.tgTop.listGroupsWithCredits.useMutation({
    onSuccess: () => {
      toast.success(tx("Настройки листинга сохранены", "Listing settings saved."));
      setListingOpen(false);
      setSelectedGroupIds([]);
      void utils.tgTop.myGroups.invalidate();
      void utils.tgTop.getGroups.invalidate();
      void utils.tgTop.getSlots.invalidate();
      void utils.tgTop.getAccount.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const unlistGroups = trpc.tgTop.unlistGroups.useMutation({
    onSuccess: () => {
      toast.success(tx("Группы сняты с листинга", "Communities removed from listings."));
      setSelectedGroupIds([]);
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
    () => nftAssetFilter === "all" ? nfts : nfts.filter(nft => nft.assetClass === nftAssetFilter),
    [nfts, nftAssetFilter]
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
  const leadSlot = board[0];
  const secondTier = board.slice(1, 3);
  const thirdTier = board.slice(3, 7);
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
    globalDirection !== "NFT" && country !== "Все" ? getCountryLabel(country, language) : null,
  ].filter((part): part is string => Boolean(part)).join(" · ");
  const telegramAvatar =
    typeof window !== "undefined"
      ? window.Telegram?.WebApp?.initDataUnsafe?.user?.photo_url
      : undefined;
  const selectedSlot = detail
    ? slots.find(slot => slot.group?.id === detail.group.id)
    : undefined;
  const ownsDetail = detail?.group.ownerOpenId === user?.openId;
  const selectedListingGroups = mine.filter(group => selectedGroupIds.includes(group.id));
  const globalSubcategoryCategory = globalDirection === "Каналы" || globalDirection === "Чаты" ? globalDirection : null;
  const globalSubcategoryOptions = globalSubcategoryCategory ? CATEGORY_SUBCATEGORIES[globalSubcategoryCategory] : [];
  const listingCategory = selectedListingGroups.length && selectedListingGroups.every(group => group.category === selectedListingGroups[0]?.category)
    ? selectedListingGroups[0]?.category
    : null;
  const listingSubcategoryOptions = listingCategory ? CATEGORY_SUBCATEGORIES[listingCategory] : [];
  const includesSale = listingType === "sale";
  const selectedNft = myNfts.find(nft => nft.id === selectedNftId) ?? null;
  const showcaseNft = myNfts.find(nft => nft.id === showcaseNftId) ?? null;
  const reviewedRecipient = nftRecipientQuery.data;

  const openGroup = (id: number) => {
    setSelectedGroupId(id);
    setPage("details");
  };
  const openOwner = (openId: string) => {
    setSelectedOwnerOpenId(openId);
    setPage("owner");
  };
  const openMine = (slot?: Slot) => {
    if (slot) {
      const nextBid = slot.group ? Math.max(0.1, slot.bidAmount / 1000 + 0.001) : 0.1;
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
  const openListing = (groupIds: number[]) => {
    const firstGroup = mine.find(group => group.id === groupIds[0]);
    setSelectedGroupIds(Array.from(new Set(groupIds)));
    setListingType(firstGroup?.listingType ?? "catalog");
    setListingCountry(
      COUNTRY_OPTIONS.includes(firstGroup?.country as ListingCountry)
        ? (firstGroup?.country as ListingCountry)
        : "Global"
    );
    setListingSubcategory(firstGroup?.subcategory ?? "General");
    setSalePriceTon(firstGroup?.salePriceTon ?? "");
    setListingOpen(true);
  };
  const saveListing = () => {
    if (!selectedGroupIds.length) return toast.error(tx("Выберите хотя бы одну группу", "Select at least one community."));
    listWithCredits.mutate({
      groupIds: selectedGroupIds,
      listingType,
      country: listingCountry,
      subcategory: listingSubcategory,
      salePriceTon: salePriceTon || undefined,
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
  const copyReferralLink = async () => {
    if (!referral?.referralLink) return toast.error(tx("Реферальная ссылка загружается", "Your referral link is still loading."));
    try {
      await navigator.clipboard.writeText(referral.referralLink);
      toast.success(tx("Реферальная ссылка скопирована", "Referral link copied."));
    } catch {
      toast.error(tx("Не удалось скопировать ссылку. Скопируйте ее вручную.", "Could not copy the link. Please copy it manually."));
    }
  };
  const addBot = (kind: "channel" | "group") =>
    window.open(
      `https://t.me/TGTOP_robot?${kind === "channel" ? "startchannel=admin" : "startgroup=admin"}`,
      "_blank"
    );
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
    const current = targetSlot.bidAmount / 1000;
    const minimum = targetSlot.group ? Math.max(0.1, current + 0.001) : 0.1;
    if (!Number.isFinite(value) || value < minimum)
      return toast.error(tx(`Минимальная ставка: ${formatTon(minimum)} TON`, `Minimum bid: ${formatTon(minimum)} TON`));
    placeBid.mutate({
      slotId: targetSlot.id,
      groupId: group.id,
      bidAmount: value,
      currentBid: `${formatTon(value)} TON`,
    });
  };
  const openStarsPayment = (group: Group) => {
    if (!targetSlot?.id) return toast.error(tx("Эта позиция пока недоступна.", "This placement is not available yet."));
    const value = Number(amount);
    const current = targetSlot.bidAmount / 1000;
    const minimum = targetSlot.group ? Math.max(0.1, current + 0.001) : 0.1;
    if (!Number.isFinite(value) || value < minimum) {
      return toast.error(tx(`Минимальная ставка: ${formatTon(minimum)} TON`, `Minimum bid: ${formatTon(minimum)} TON`));
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
              <WalletConnectControl language={language} balanceTon={formatTon(Number(mainTon))} />
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

      <main className="mx-auto max-w-3xl px-4 pb-28 pt-2">
        {page === "top" && (
          <section className="space-y-2">
            <div className="border-b border-white/8 pb-1.5">
              <div className="flex min-w-0 items-center justify-between gap-2 px-0.5">
                <span className="flex min-w-0 flex-1 items-baseline gap-2">
                  <h1 className="min-w-0 flex-1 truncate text-lg font-semibold tracking-tight text-white">{currentTopTitle}</h1>
                  <span aria-live="polite" className="shrink-0 text-[11px] text-slate-500">{n(globalCount, language)} {globalDirection === "NFT" ? "NFT" : ui.groups}</span>
                </span>
                {globalDirection !== "NFT" && (
                  <button onClick={() => setFiltersOpen(true)} className="flex h-7 max-w-[112px] shrink-0 items-center gap-1.5 overflow-hidden rounded-md border border-white/10 bg-white/5 px-2 text-[10px] text-slate-400 transition-colors hover:text-slate-100">
                    <Globe2 className="h-3.5 w-3.5 shrink-0 text-[#79a7ff]" />
                    <span className="truncate">{country === "Все" ? tx("Весь мир", "Worldwide") : getCountryLabel(country, language)}</span>
                  </button>
                )}
              </div>
              <div className="mt-1.5 flex items-center gap-4 overflow-x-auto border-b border-white/8 px-0.5 [scrollbar-width:none]">
                {([
                  ["Все", ui.all],
                  ["Каналы", ui.channels],
                  ["Чаты", ui.chats],
                  ["NFT", "NFT"],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => selectGlobalDirection(value)}
                    className={`relative shrink-0 pb-1.5 text-[12px] font-medium transition-colors ${globalDirection === value ? "text-white" : "text-slate-500 hover:text-slate-300"}`}
                  >
                    {label}
                    {globalDirection === value && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-[#4a90ff]" />}
                  </button>
                ))}
              </div>
              {globalDirection !== "NFT" && (
                <button onClick={() => setFiltersOpen(true)} className="mt-1.5 flex h-6 max-w-full items-center gap-1.5 overflow-hidden rounded-md border border-white/8 bg-white/5 px-2 text-[10px] text-slate-500 transition-colors hover:text-slate-200">
                  <Filter className="h-3.5 w-3.5 shrink-0" />
                  <span className="min-w-0 truncate">{subcategory === "Все" ? tx("Все темы", "All topics") : getSubcategoryLabel(subcategory, language)}</span>
                  <span className="shrink-0 text-slate-700">·</span>
                  <span className="shrink-0 truncate">{country === "Все" ? tx("Весь мир", "Worldwide") : getCountryLabel(country, language)}</span>
                </button>
              )}
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
            <div className="space-y-2">
              <GroupCard
                group={leadSlot.group}
                variant="lead"
                language={language}
                onClick={() =>
                  leadSlot.group
                    ? openGroup(leadSlot.group.id)
                    : openMine(leadSlot)
                }
                onOwnerClick={() => leadSlot.group && openOwner(leadSlot.group.ownerOpenId)}
              />
              <div className="grid grid-cols-2 gap-2">
                {secondTier.map(slot => (
                  <GroupCard
                    key={slot.slotNumber}
                    group={slot.group}
                    variant="secondary"
                    language={language}
                    onClick={() =>
                      slot.group ? openGroup(slot.group.id) : openMine(slot)
                    }
                    onOwnerClick={() => slot.group && openOwner(slot.group.ownerOpenId)}
                  />
                ))}
              </div>
              <div className="grid grid-cols-4 gap-2">
                {thirdTier.map(slot => (
                  <GroupCard
                    key={slot.slotNumber}
                    group={slot.group}
                    variant="compact"
                    language={language}
                    onClick={() =>
                      slot.group ? openGroup(slot.group.id) : openMine(slot)
                    }
                    onOwnerClick={() => slot.group && openOwner(slot.group.ownerOpenId)}
                  />
                ))}
              </div>
            </div>
            <section className="pt-2">
              <div className="space-y-2">
                {generalList.map((group, index) => {
                  const isSale = group.listingType === "sale" && group.salePriceTon;
                  return (
                    <div
                      key={group.id}
                      style={{ animationDelay: `${index * 35}ms` }}
                      className="w-full animate-in fade-in slide-in-from-bottom-2 duration-300"
                    >
                      <button
                        onClick={() => openGroup(group.id)}
                        className="group flex h-[52px] w-full items-center justify-between gap-3 rounded-xl border border-white/8 bg-[#111720] px-3.5 py-2 text-left transition-all duration-200 ease-out hover:border-[#3f8cff]/40 hover:bg-[#151e2b] active:scale-[0.99]"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg">
                            <Avatar group={group} />
                          </div>
                          <span className="min-w-0 flex-1">
                            <b className="block truncate text-xs font-medium text-white transition-colors group-hover:text-[#a6c8ff]">
                              {group.title}
                            </b>
                            <small className="block truncate text-[11px] text-slate-500">
                              {group.username ? `@${group.username}` : group.inviteLink ? (language === "en" ? "Private group" : "Приватная группа") : getCategoryLabel(group.category, language)} · {n(group.membersCount, language)} {language === "en" ? "members" : "участников"}
                            </small>
                          </span>
                        </div>
                        <div className="flex shrink-0 items-center gap-2.5 text-right">
                          {isSale ? (
                            <div className="flex flex-col items-end">
                              <b className="text-xs font-semibold text-[#72a8ff]">{formatTon(group.salePriceTon!)} TON</b>
                              <small className="text-[9px] text-slate-400">{language === "en" ? "For sale" : "Продажа"}</small>
                            </div>
                          ) : (
                            <span className="rounded bg-white/5 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                              {language === "en" ? "Catalog" : "Каталог"}
                            </span>
                          )}
                          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-600 transition-transform group-hover:translate-x-0.5 group-hover:text-[#3f8cff]" />
                        </div>
                      </button>
                    </div>
                  );
                })}
                {generalList.length > 0 && (
                  <button
                    onClick={() => openMine()}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[#3f8cff]/35 bg-[#3f8cff]/6 px-4 py-4 text-sm font-medium text-[#a6c8ff] transition-colors hover:bg-[#3f8cff]/12"
                  >
                    <Plus className="h-4 w-4" />
                    {tx("Добавить свою группу в список", "Add your community to the list")}
                  </button>
                )}
                {generalList.length === 0 && (
                  <button
                    onClick={() => openMine()}
                    className="w-full rounded-2xl border border-dashed border-[#3f8cff]/35 bg-[#111720] p-6 text-center transition-colors hover:bg-[#151d28]"
                  >
                    <span className="mx-auto grid h-10 w-10 place-items-center rounded-full border border-[#3f8cff]/35 bg-[#3f8cff]/10 text-[#a6c8ff]">
                      <Plus className="h-5 w-5" />
                    </span>
                    <p className="text-sm font-medium text-slate-300">
                      {ui.globalEmptyTitle}
                    </p>
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
                          {group.username ? `@${group.username}` : group.inviteLink ? tx("Приватная группа", "Private group") : group.category} · {n(group.membersCount)} {tx("участников", "members")}
                        </small>
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-3 text-right">
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

        {page === "mine" && (
          <section className="space-y-4">
            <button
              onClick={() => setPage(targetSlot ? "top" : "profile")}
              className="flex items-center gap-1 text-xs text-slate-400"
            >
              <ArrowLeft className="h-4 w-4" />
              {ui.back}
            </button>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#72a8ff]">
                {tx("Личная папка", "Personal cabinet")}
              </p>
              <h1 className="mt-1 text-2xl font-semibold">{tx("Мои группы", "My groups")}</h1>
              <p className="mt-1 text-sm text-slate-500">
                {tx("Подключите бота, чтобы получить статистику и разместить площадку.", "Add the bot as an administrator to get analytics and list your community.")}
              </p>
            </div>
            {targetSlot && (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-[#3f8cff]/25 bg-[#3f8cff]/8 px-3 py-2.5">
                <span>
                  <b className="block text-xs text-slate-100">{tx("Выберите группу для позиции", "Choose a group for this placement")}</b>
                  <small className="mt-0.5 block text-[11px] text-slate-400">
                    {targetSlot.group
                      ? tx(`Перебитие · от ${amount} TON`, `Outbid · from ${amount} TON`)
                      : tx(`Свободная позиция · от ${formatTon(0.1)} TON`, `Vacant position · from ${formatTon(0.1)} TON`)}
                  </small>
                  <small className="mt-0.5 block text-[10px] text-slate-500">
                    {tx("Ставка фиксируется в журнале и в боте; TON пока не отправляется.", "The bid is recorded in the journal and bot; TON is not sent yet.")}
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
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => startBotAdminSetup("channel")}
                className="rounded-xl border border-white/10 bg-[#111720] px-3 py-3 text-sm font-semibold"
              >
                {tx("+ Канал", "+ Channel")}
              </button>
              <button
                onClick={() => startBotAdminSetup("group")}
                className="rounded-xl border border-white/10 bg-[#111720] px-3 py-3 text-sm font-semibold"
              >
                {tx("+ Чат", "+ Chat")}
              </button>
            </div>
            {!targetSlot && selectedGroupIds.length > 0 && (
              <div className="sticky top-[62px] z-20 rounded-xl border border-[#3f8cff]/30 bg-[#101a2a]/95 p-2.5 shadow-lg backdrop-blur">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-300">
                    {tx("Выбрано:", "Selected:")} <b className="text-white">{selectedGroupIds.length}</b>
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={removeSelectedFromListing}
                      disabled={unlistGroups.isPending}
                      className="rounded-lg border border-white/12 px-2.5 py-1.5 text-[11px] font-medium text-slate-300 disabled:opacity-50"
                    >
                      {tx("Снять", "Unlist")}
                    </button>
                    <button
                      onClick={deleteSelectedGroups}
                      disabled={deleteGroups.isPending}
                      className="rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-[11px] font-medium text-red-300 disabled:opacity-50"
                    >
                      {tx("Удалить", "Delete")}
                    </button>
                    <button
                      onClick={() => openListing(selectedGroupIds)}
                      className="rounded-lg bg-[#3f8cff] px-2.5 py-1.5 text-[11px] font-semibold text-white"
                    >
                      {ui.listing}
                    </button>
                  </div>
                </div>
              </div>
            )}
            <div className="space-y-2">
              {mine.map(group => (
                <div
                  key={group.id}
                  className="rounded-xl border border-white/8 bg-[#111720] p-3"
                >
                  <div className="flex items-center gap-2">
                    {!targetSlot && <button
                      onClick={() => toggleGroupSelection(group.id)}
                      aria-label={tx(`Выбрать ${group.title}`, `Select ${group.title}`)}
                      aria-pressed={selectedGroupIds.includes(group.id)}
                      className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border ${selectedGroupIds.includes(group.id) ? "border-[#3f8cff] bg-[#3f8cff] text-white" : "border-white/20 text-transparent"}`}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>}
                    <button
                      onClick={() => openGroup(group.id)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <Avatar group={group} />
                      <span className="min-w-0 flex-1">
                        <b className="block truncate text-sm">{group.title}</b>
                        <small className="mt-1 block text-xs text-slate-500">
                          {group.username ? `@${group.username}` : group.inviteLink ? tx("Приватная группа", "Private group") : group.category} · {n(group.membersCount)} {tx("участников", "members")}
                        </small>
                      </span>
                      <ChevronRight className="h-4 w-4 text-slate-600" />
                    </button>
                  </div>
                  {targetSlot && (
                    <div className="mt-3">
                      <button
                        onClick={() => openStarsPayment(group)}
                        className="w-full rounded-lg bg-[#3f8cff] py-2 text-xs font-semibold"
                      >
                        {tx("Выбрать для ставки", "Choose for placement")}
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
          </section>
        )}

        {page === "details" && (
          <section className="space-y-4">
            {detail ? (
              <>
                <button
                  onClick={() => setPage("top")}
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
                        <a href={`https://t.me/${detail.group.username}`} target="_blank" rel="noreferrer" className="mt-1 inline-block text-sm text-[#72a8ff] underline decoration-[#72a8ff]/50 underline-offset-4 hover:text-[#a6c8ff]">
                          @{detail.group.username}
                        </a>
                      ) : detail.group.inviteLink ? (
                        <a href={detail.group.inviteLink} target="_blank" rel="noreferrer" className="mt-1 inline-block text-sm text-[#72a8ff] underline decoration-[#72a8ff]/50 underline-offset-4 hover:text-[#a6c8ff]">
                          {tx("Приватная группа · Войти в чат", "Private group · Join chat")}
                        </a>
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
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-white/8 pt-4 text-xs">
                    <span className="rounded-md bg-white/5 px-2 py-1 text-slate-300">
                      {detail.group.status === "listed"
                        ? tx(`В каталоге с ${date(detail.group.listedAt)}`, `Listed since ${date(detail.group.listedAt)}`)
                        : tx("Не размещена в каталоге", "Not listed")}
                    </span>
                    <span className="rounded-md bg-white/5 px-2 py-1 text-slate-400">
                      {selectedSlot ? tx("Выделенная позиция", "Featured placement") : tx("Общий список", "General list")}
                    </span>
                  </div>
                  {ownsDetail && (
                    <button
                      onClick={() => openMine()}
                      className="mt-3 w-full rounded-lg border border-[#3f8cff]/35 bg-[#3f8cff]/10 py-2 text-xs font-semibold text-[#a6c8ff]"
                    >
                      {tx("Управлять этой группой", "Manage this group")}
                    </button>
                  )}
                  {ownsDetail && (
                    <div className="mt-3 rounded-xl border border-white/8 bg-white/4 p-3 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs">
                          <b className="block text-slate-200">{tx("Автоочистка чата", "Chat auto-cleanup")}</b>
                          <small className="mt-0.5 block text-[11px] text-slate-400">
                            {tx("Удалять системные уведомления (вход, выход, закреп)", "Delete service messages (joins, leaves, pins)")}
                          </small>
                        </span>
                        <input
                          type="checkbox"
                          checked={Boolean(detail.group.deleteServiceMessages)}
                          onChange={e => toggleServiceMessagesMutation.mutate({ groupId: detail.group.id, deleteServiceMessages: e.target.checked })}
                          className="h-4 w-4 rounded border-white/20 bg-black/40 text-[#3f8cff] focus:ring-0 cursor-pointer"
                        />
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
                          {tx("Группа не в каталоге", "Not in catalog")}
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
                  {!ownsDetail && selectedSlot && isAuthenticated && (
                    <button
                      onClick={() => openMine(selectedSlot)}
                      className="mt-3 flex w-full items-center justify-between rounded-lg border border-[#3f8cff]/35 bg-[#3f8cff]/10 px-3 py-2.5 text-left transition-colors hover:bg-[#3f8cff]/15"
                    >
                      <span>
                        <b className="block text-xs text-[#a6c8ff]">{tx("Перебить ставку", "Outbid placement")}</b>
                        <small className="mt-0.5 block text-[10px] text-slate-400">
                          {tx(`От ${formatTon(Math.max(0.1, selectedSlot.bidAmount / 1000 + 0.001))} TON`, `From ${formatTon(Math.max(0.1, selectedSlot.bidAmount / 1000 + 0.001))} TON`)}
                        </small>
                      </span>
                      <ChevronRight className="h-4 w-4 text-[#a6c8ff]" />
                    </button>
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
                          {isAuthenticated ? tx("Создать офер", "Create offer") : tx("Войти через Telegram", "Sign in with Telegram")}
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
                </div>
              </section>
            )}
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
                  {accountActivity.map(item => {
                    const title = item.title === "connection_bonus" ? tx("Бонус за подключение", "Connection bonus")
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
                    const amount = item.amount === null || !item.currency ? null : `${item.direction === "in" ? "+" : item.direction === "out" ? "−" : ""}${item.currency === "Stars" ? n(item.amount, language) : formatTon(item.amount)} ${item.currency}`;
                    return <div key={item.id} className="flex items-center justify-between gap-3 px-4 py-3.5">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[#3f8cff]/25 bg-[#3f8cff]/8 text-[11px] font-semibold text-[#a6c8ff]">{item.type === "stars" ? "★" : item.type === "nft_transfer" ? "NFT" : item.type === "deal" ? "D" : item.type === "bid" ? "B" : "G"}</span>
                      <span className="min-w-0 flex-1">
                        <b className="block truncate text-sm">{title}</b>
                        <small className="mt-1 block truncate text-xs text-slate-500">{item.subject} · {date(item.createdAt, language)}</small>
                      </span>
                      <span className="shrink-0 text-right">
                        {amount && <b className={`block text-sm ${item.direction === "in" ? "text-[#72a8ff]" : "text-slate-200"}`}>{amount}</b>}
                        <small className="mt-1 inline-block rounded-md bg-white/5 px-1.5 py-0.5 text-[9px] text-slate-400">{status}</small>
                      </span>
                    </div>;
                  })}
                </div>
              ) : (
                <p className="px-4 py-8 text-center text-sm text-slate-500">{tx("Операций пока нет.", "No activity yet.")}</p>
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
        <div className="mx-auto grid max-w-3xl grid-cols-3 px-3 py-2">
          {(
            [
              { key: "top", label: ui.top, icon: Trophy },
              { key: "mine", label: ui.mine, icon: Users },
              { key: "profile", label: ui.profile, icon: UserRound },
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
                <span className="min-w-0 flex-1"><b className="block truncate text-sm">{group.title}</b><small className="mt-0.5 block truncate text-[10px] text-slate-500">{group.username ? `@${group.username}` : getCategoryLabel(group.category, language)}</small></span>
                <ChevronRight className="h-4 w-4 text-[#a6c8ff]" />
              </button>
            )) : <p className="rounded-xl border border-dashed border-white/12 p-5 text-center text-xs leading-5 text-slate-500">{tx("Сначала подключите свою площадку в личной папке.", "Connect a community in My Groups first.")}</p>}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={Boolean(starsPaymentGroup)} onOpenChange={open => !open && setStarsPaymentGroup(null)}>
        <SheetContent side="bottom" className="rounded-t-[22px] border-white/10 bg-[#10161f] text-slate-100">
          <SheetHeader className="px-4">
            <SheetTitle className="text-slate-100">{tx("Оплата ставки", "Bid payment")}</SheetTitle>
            <p className="text-xs leading-5 text-slate-500">
              {starsPaymentGroup?.title} · {tx(`позиция ${targetSlot?.slotNumber ?? "—"}`, `placement ${targetSlot?.slotNumber ?? "—"}`)}
            </p>
          </SheetHeader>
          <div className="space-y-3 px-4 pb-5">
            <button
              onClick={() => starsPaymentGroup && createStarsRankingPayment.mutate({ slotId: targetSlot!.id, groupId: starsPaymentGroup.id, bidAmount: Number(amount) })}
              disabled={createStarsRankingPayment.isPending}
              className="flex w-full items-center justify-between rounded-xl border border-[#3f8cff]/35 bg-[#3f8cff]/10 p-4 text-left disabled:opacity-55"
            >
              <span>
                <b className="block text-sm text-[#a6c8ff]">{tx("Оплатить Telegram Stars", "Pay with Telegram Stars")}</b>
                <small className="mt-1 block text-[11px] leading-4 text-slate-400">{tx("Telegram покажет защищённое подтверждение списания.", "Telegram will show its protected payment confirmation.")}</small>
              </span>
              <b className="shrink-0 text-lg text-white">{Math.max(10, Math.ceil(Number(amount) * 100))} ★</b>
            </button>
            <button
              onClick={() => {
                if (starsPaymentGroup) submitPlacement(starsPaymentGroup);
                setStarsPaymentGroup(null);
              }}
              disabled={placeBid.isPending}
              className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-left disabled:opacity-55"
            >
              <b className="block text-xs text-slate-200">{tx("Записать TON-ставку без оплаты", "Record a TON bid without payment")}</b>
              <small className="mt-1 block text-[10px] leading-4 text-slate-500">{tx("Только журнал TG TOP. TON не списывается и не отправляется.", "TG TOP journal only. No TON is charged or sent.")}</small>
            </button>
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
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs text-slate-400">{tx("Формат листинга", "Listing format")}</p>
                <span className="text-[10px] text-slate-600">
                  {tx("Подходит для", "Suitable for")} {Array.from(new Set(selectedListingGroups.map(group => getCategoryLabel(group.category, language)))).join(" · ") || tx("групп", "communities")}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { value: "catalog", title: tx("Каталог", "Catalog"), note: tx("Без цены", "No price") },
                    { value: "sale", title: tx("Продажа", "Sale"), note: tx("Цена по желанию", "Optional price") },
                  ] as Array<{ value: ListingType; title: string; note: string }>
                ).map(item => (
                  <button
                    key={item.value}
                    onClick={() => setListingType(item.value)}
                    className={`rounded-xl border p-3 text-left transition-colors ${listingType === item.value ? "border-[#3f8cff] bg-[#3f8cff]/14" : "border-white/10 bg-[#0b0f14]"}`}
                  >
                    <span className={`block text-xs font-semibold ${listingType === item.value ? "text-[#a6c8ff]" : "text-slate-200"}`}>{item.title}</span>
                    <span className="mt-1 block text-[10px] text-slate-500">{item.note}</span>
                  </button>
                ))}
              </div>
            </section>

            <section>
              <p className="mb-2 text-xs text-slate-400">{tx("Страна / регион в каталоге", "Catalog country / region")}</p>
              <div className="grid grid-cols-5 gap-1.5">
                {COUNTRY_OPTIONS.map(item => (
                  <button
                    key={item}
                    onClick={() => setListingCountry(item)}
                    className={`rounded-lg border py-2 text-[10px] font-medium ${listingCountry === item ? "border-[#3f8cff] bg-[#3f8cff]/15 text-[#a6c8ff]" : "border-white/10 text-slate-400"}`}
                  >
                    {getCountryLabel(item, language)}
                  </button>
                ))}
              </div>
            </section>

            <section>
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <p className="text-xs text-slate-400">{tx("Подкатегория", "Subcategory")}</p>
                {!listingCategory && <span className="text-[10px] text-amber-100/70">{tx("Выберите группы одного типа", "Select one community type")}</span>}
              </div>
              {listingCategory ? (
                <div className="flex flex-wrap gap-1.5">
                  {listingSubcategoryOptions.map(item => (
                    <button key={item} onClick={() => setListingSubcategory(item)} className={`rounded-lg border px-2.5 py-1.5 text-[10px] ${listingSubcategory === item ? "border-[#3f8cff] bg-[#3f8cff]/15 text-[#a6c8ff]" : "border-white/10 text-slate-400"}`}>{getSubcategoryLabel(item, language)}</button>
                  ))}
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-white/10 bg-[#0b0f14] px-3 py-2 text-[11px] text-slate-500">{tx("Подкатегории задаются отдельно для каналов и чатов.", "Subcategories are configured separately for channels and chats.")}</p>
              )}
            </section>

            {includesSale && (
              <section>
                <div className="mb-2 flex items-baseline justify-between">
                  <p className="text-xs text-slate-400">{tx("Цена продажи", "Sale price")}</p>
                  <span className="text-[10px] text-slate-600">{tx("Необязательно — можно договориться в чате", "Optional — you can agree in chat")}</span>
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
                    className="h-10 border-white/10 bg-[#0b0f14] pr-12 text-sm"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-500">TON</span>
                </div>
              </section>
            )}

            <div className="rounded-xl border border-[#3f8cff]/18 bg-[#3f8cff]/8 p-3 text-[11px] leading-4 text-slate-400">
              {tx("Новая публикация использует", "A new publication uses")} <b className="font-medium text-[#a6c8ff]">0.1 GRAM</b> {tx("за группу. Повторное редактирование уже опубликованного листинга не списывает бонусы. Оплата TON и передача прав пока не запускаются автоматически.", "per community. Editing an existing listing does not spend more bonuses. TON payments and ownership transfers do not start automatically yet.")}
            </div>
          </div>
          <SheetFooter className="sticky bottom-0 border-t border-white/8 bg-[#10161f] px-4 py-3 sm:flex-row">
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
          className="max-h-[62dvh] rounded-t-[22px] border-white/10 bg-[#10161f] pb-3 text-slate-100"
        >
          <SheetHeader className="px-4 pb-2">
            <SheetTitle className="text-base text-slate-100">{tx("Настроить выдачу", "Refine results")}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 overflow-y-auto px-4 pb-2">
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
              <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
                {["Все", "UA", "PL", "DE", "GB", "US", "RU"].map(item => (
                  <button
                    key={item}
                    onClick={() => setCountry(item)}
                    className={`shrink-0 rounded-md border px-2.5 py-1.5 text-[11px] ${country === item ? "border-[#3f8cff] bg-[#3f8cff]/15 text-[#a6c8ff]" : "border-white/10 text-slate-400"}`}
                  >
                    {item === "Все" ? tx("Все", "All") : getCountryLabel(item, language)}
                  </button>
                ))}
              </div>
            </div>
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
        <SheetContent side="bottom" className="max-h-[52dvh] rounded-t-[22px] border-white/10 bg-[#10161f] pb-4 text-slate-100">
          <SheetHeader className="px-4 pb-2">
            <SheetTitle className="text-base text-slate-100">
              {tx("Подтвердите права администратора", "Confirm administrator rights")}
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-3 px-4 text-sm leading-5 text-slate-300">
            <p>{tx("Telegram открыл выбор сообщества. Добавьте @TGTOP_robot, затем обязательно подтвердите для него роль администратора.", "Telegram opened community selection. Add @TGTOP_robot, then explicitly confirm its administrator role.")}</p>
            <ol className="space-y-2 rounded-xl border border-white/8 bg-black/15 p-3 text-[12px] text-slate-400">
              <li><b className="mr-1 text-[#a6c8ff]">1.</b>{tx("Выберите свой ", "Select your ")}{adminGuideKind === "channel" ? tx("канал", "channel") : tx("чат", "chat")}.</li>
              <li><b className="mr-1 text-[#a6c8ff]">2.</b>{tx("В окне Telegram включите «Сделать администратором».", "Enable “Make administrator” in the Telegram confirmation screen.")}</li>
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
