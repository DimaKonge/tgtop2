import { useEffect, useMemo, useState } from "react";
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
  Monitor,
  Moon,
  Plus,
  Settings2,
  Sun,
  Trophy,
  UserRound,
  Users,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";
import { useIsConnectionRestored, useTonAddress, useTonConnectUI } from "@tonconnect/ui-react";

type Page = "top" | "catalog" | "mine" | "details" | "profile";
type Audience = "all" | "small" | "medium" | "large";
type Language = "ru" | "en";
type ListingType = "catalog" | "sale" | "rent" | "both";
type ListingCountry = "Global" | "UA" | "RU" | "EU" | "US";
type Group = {
  id: number;
  chatId: string;
  title: string;
  username: string | null;
  description: string | null;
  avatarFileId: string | null;
  membersCount: number;
  ownerOpenId: string;
  category: "Каналы" | "Чаты";
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
  rentalPriceTon?: string | null;
  minRentalDays?: number | null;
  maxRentalDays?: number | null;
  createdAt: Date;
};
type Slot = {
  id: number;
  slotNumber: number;
  bidAmount: number;
  group: Group | null;
};
const n = (value: number) => new Intl.NumberFormat("ru-RU").format(value);
const date = (value?: Date | null) =>
  value
    ? new Date(value).toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";
const getTelegramAvatarSrc = (group: Group) =>
  group.avatarFileId
    ? `/api/telegram-avatar/${group.chatId}`
    : group.username
      ? `https://t.me/i/userpic/320/${group.username}.jpg`
      : null;

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

type GroupCardVariant = "lead" | "secondary" | "compact" | "list";

function GroupCard({
  group,
  variant = "list",
  onClick,
}: {
  group?: Group | null;
  variant?: GroupCardVariant;
  onClick: () => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const lead = variant === "lead";
  const compact = variant === "compact";
  const rankingPlacement = variant !== "list";
  const cardStyle = lead
    ? "min-h-[42vh] border-[#3f8cff]/35 bg-[#141c27] p-6"
    : variant === "secondary"
      ? "min-h-[140px] border-white/10 bg-[#111720] p-4"
      : compact
        ? "min-h-[106px] border-white/8 bg-[#111720] p-2"
        : "border-white/8 bg-[#111720] p-3";
  const shellStyle = compact
    ? "flex h-full flex-col items-center justify-center gap-2 text-center"
    : "flex h-full items-center gap-3";
  const avatarSrc = group ? getTelegramAvatarSrc(group) : null;
  return (
    <button
      onClick={onClick}
      className={`relative w-full overflow-hidden rounded-2xl border text-left transition-colors hover:border-[#3f8cff]/45 active:scale-[0.99] ${cardStyle}`}
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
            ) : null}
          </>
          <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,10,15,0.06)_8%,rgba(7,10,15,0.82)_100%)]" />
          <span
            className={`absolute inset-x-0 bottom-0 p-${compact ? "2" : lead ? "6" : "4"}`}
          >
            <b
              className={`${lead ? "text-xl" : compact ? "text-[11px]" : "text-sm"} block truncate font-semibold text-white`}
            >
              {group.title}
            </b>
            <small
              className={`mt-1 block truncate text-xs text-slate-200/80 ${compact ? "hidden" : ""}`}
            >
              {group.username ? `@${group.username}` : group.category} ·{" "}
              {n(group.membersCount)} участников
            </small>
            <small
              className={`mt-1 block text-[10px] font-medium tracking-wide text-[#a6c8ff] ${compact ? "hidden" : ""}`}
            >
              ПРОВЕРЕНА TG TOP
            </small>
          </span>
        </>
      ) : group ? (
        <span className={shellStyle}>
          <Avatar group={group} large={lead} compact={compact} />
          <span className={compact ? "w-full min-w-0" : "min-w-0 flex-1"}>
            <b
              className={`${lead ? "text-xl" : compact ? "text-[11px]" : "text-sm"} block truncate font-semibold text-slate-100`}
            >
              {group.title}
            </b>
            <small
              className={`mt-1 block truncate text-xs text-slate-500 ${compact ? "hidden" : ""}`}
            >
              {group.username ? `@${group.username}` : group.category} ·{" "}
              {n(group.membersCount)} участников
            </small>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-600" />
        </span>
      ) : rankingPlacement ? (
        <span className="absolute inset-0 grid place-items-center">
          <span className="flex flex-col items-center gap-2 text-center">
            <span
              className={`${lead ? "h-16 w-16" : compact ? "h-9 w-9" : "h-11 w-11"} grid place-items-center rounded-xl border border-dashed border-white/20 text-slate-500`}
            >
              <Plus className="h-4 w-4" />
            </span>
            <small
              className={`font-light tracking-wide text-slate-500 ${compact ? "text-[9px]" : "text-[11px]"}`}
            >
              Добавить группу
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
              Добавить группу
            </b>
          </span>
        </span>
      )}
    </button>
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

function BrandMark() {
  return (
    <span
      aria-label="TG TOP"
      className="brand-mark relative grid h-8 w-8 place-items-center overflow-hidden rounded-[10px] border border-[#83b1ff]/45 bg-[linear-gradient(145deg,#61a0ff_0%,#3f8cff_48%,#2859c5_100%)] shadow-[0_6px_16px_rgba(63,140,255,0.28)]"
    >
      <span className="absolute -right-2 -top-3 h-7 w-7 rounded-full bg-white/25 blur-[1px]" />
      <b className="brand-mark-symbol relative text-[16px] font-black leading-none tracking-[-0.12em] text-white">
        T
      </b>
    </span>
  );
}

function WalletConnectControl() {
  const [tonConnectUi] = useTonConnectUI();
  const address = useTonAddress();
  const restored = useIsConnectionRestored();
  const label = address ? `${address.slice(0, 5)}…${address.slice(-4)}` : "Connect Wallet";

  return <button disabled={!restored} onClick={() => tonConnectUi.openModal()} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#3f8cff]/35 bg-[#3f8cff]/10 px-3 text-[11px] font-medium text-[#a6c8ff] disabled:opacity-60"><WalletCards className="h-3.5 w-3.5" />{restored ? label : "Loading…"}</button>;
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
    icon: typeof Monitor;
  }> = [
    { value: "system", label: isEnglish ? "System" : "Система", icon: Monitor },
    { value: "dark", label: isEnglish ? "Dark" : "Темная", icon: Moon },
    { value: "light", label: isEnglish ? "Light" : "Светлая", icon: Sun },
  ];
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="border-white/10 bg-[#10161f] text-slate-100"
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-slate-100">
            <BrandMark />
            {isEnglish ? "Settings" : "Настройки"}
          </SheetTitle>
          <p className="text-xs text-slate-500">
            {isEnglish
              ? "Personalize language and appearance."
              : "Настройте язык и внешний вид."}
          </p>
        </SheetHeader>
        <div className="space-y-6 px-4">
          <section>
            <div className="mb-2 flex items-center gap-2 text-xs text-slate-400">
              <Globe2 className="h-4 w-4" />
              {isEnglish ? "Language" : "Язык"}
            </div>
            <ToggleGroup
              type="single"
              value={language}
              onValueChange={value => {
                if (value) onLanguageChange(value as Language);
              }}
              className="grid w-full grid-cols-2 overflow-hidden rounded-xl border border-white/10 bg-[#0b0f14] p-1"
            >
              <ToggleGroupItem
                value="ru"
                className="h-10 border-0 text-xs text-slate-400 data-[state=on]:rounded-lg data-[state=on]:bg-[#3f8cff] data-[state=on]:text-white"
              >
                Русский
              </ToggleGroupItem>
              <ToggleGroupItem
                value="en"
                className="h-10 border-0 text-xs text-slate-400 data-[state=on]:rounded-lg data-[state=on]:bg-[#3f8cff] data-[state=on]:text-white"
              >
                English
              </ToggleGroupItem>
            </ToggleGroup>
          </section>
          <section>
            <div className="mb-2 flex items-center gap-2 text-xs text-slate-400">
              <Sun className="h-4 w-4" />
              {isEnglish ? "Appearance" : "Оформление"}
            </div>
            <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0b0f14]">
              {appearanceItems.map(item => {
                const Icon = item.icon;
                const active = appearance === item.value;
                return (
                  <button
                    key={item.value}
                    onClick={() => setAppearance(item.value)}
                    className={`flex w-full items-center justify-between border-b border-white/8 px-3 py-3 text-left last:border-b-0 ${active ? "bg-[#3f8cff]/12 text-[#a6c8ff]" : "text-slate-300"}`}
                  >
                    <span className="flex items-center gap-3 text-sm">
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </span>
                    {active && <Check className="h-4 w-4" />}
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

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const [page, setPage] = useState<Page>("top");
  const [category, setCategory] = useState<"Все" | "Каналы" | "Чаты">("Все");
  const [country, setCountry] = useState("Все");
  const [audience, setAudience] = useState<Audience>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [language, setLanguage] = useState<Language>(() =>
    localStorage.getItem("tg-top-language") === "en" ? "en" : "ru"
  );
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [targetSlot, setTargetSlot] = useState<Slot | null>(null);
  const [amount, setAmount] = useState("0.1");
  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([]);
  const [listingOpen, setListingOpen] = useState(false);
  const [listingType, setListingType] = useState<ListingType>("catalog");
  const [listingCountry, setListingCountry] = useState<ListingCountry>("Global");
  const [salePriceTon, setSalePriceTon] = useState("");
  const [rentalPriceTon, setRentalPriceTon] = useState("");
  const [minRentalDays, setMinRentalDays] = useState("7");
  const [maxRentalDays, setMaxRentalDays] = useState("30");

  useEffect(() => {
    localStorage.setItem("tg-top-language", language);
  }, [language]);
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
          catalog: "Catalog",
          mine: "Mine",
          profile: "Profile",
        }
      : {
          filter: "Фильтр",
          all: "Все",
          channels: "Каналы",
          chats: "Чаты",
          groups: "групп",
          addGroup: "Добавить группу",
          top: "Топ",
          catalog: "Каталог",
          mine: "Мои",
          profile: "Профиль",
        };

  const slotsQuery = trpc.tgTop.getSlots.useQuery({
    category,
    country: country === "Все" ? "Global" : country,
  });
  const slots = (slotsQuery.data ?? []) as Slot[];
  const groupsQuery = trpc.tgTop.getGroups.useQuery({ category, country });
  const listedGroups = (groupsQuery.data ?? []) as Group[];
  const mineQuery = trpc.tgTop.myGroups.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const mine = (mineQuery.data ?? []) as Group[];
  const accountQuery = trpc.tgTop.getAccount.useQuery(undefined, {
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
  const detailQuery = trpc.tgTop.getGroupDetail.useQuery(
    { groupId: selectedGroupId ?? 0 },
    { enabled: selectedGroupId !== null }
  );
  const detail = detailQuery.data as
    | {
        group: Group;
        snapshots: Array<{
          membersCount: number;
          messagesCount: number;
          joinedCount: number;
          recordedAt: Date;
        }>;
      }
    | undefined;

  const listWithCredits = trpc.tgTop.listGroupsWithCredits.useMutation({
    onSuccess: () => {
      toast.success("Настройки листинга сохранены");
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
      toast.success("Группы сняты с листинга");
      setSelectedGroupIds([]);
      void utils.tgTop.myGroups.invalidate();
      void utils.tgTop.getGroups.invalidate();
      void utils.tgTop.getSlots.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const placeBid = trpc.tgTop.placeBid.useMutation({
    onSuccess: () => {
      toast.success("Размещение обновлено");
      setTargetSlot(null);
      setAmount("0.1");
      void utils.tgTop.getSlots.invalidate();
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
  const referral = account?.referral;
  const telegramAvatar =
    typeof window !== "undefined"
      ? window.Telegram?.WebApp?.initDataUnsafe?.user?.photo_url
      : undefined;
  const selectedSlot = detail
    ? slots.find(slot => slot.group?.id === detail.group.id)
    : undefined;
  const ownsDetail = detail?.group.ownerOpenId === user?.openId;
  const selectedListingGroups = mine.filter(group => selectedGroupIds.includes(group.id));
  const includesSale = listingType === "sale" || listingType === "both";
  const includesRent = listingType === "rent" || listingType === "both";

  const openGroup = (id: number) => {
    setSelectedGroupId(id);
    setPage("details");
  };
  const openMine = (slot?: Slot) => {
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
      (["Global", "UA", "RU", "EU", "US"] as const).includes(firstGroup?.country as ListingCountry)
        ? (firstGroup?.country as ListingCountry)
        : "Global"
    );
    setSalePriceTon(firstGroup?.salePriceTon ?? "");
    setRentalPriceTon(firstGroup?.rentalPriceTon ?? "");
    setMinRentalDays(String(firstGroup?.minRentalDays ?? 7));
    setMaxRentalDays(String(firstGroup?.maxRentalDays ?? 30));
    setListingOpen(true);
  };
  const saveListing = () => {
    if (!selectedGroupIds.length) return toast.error("Выберите хотя бы одну группу");
    const isRental = listingType === "rent" || listingType === "both";
    const minDays = Number(minRentalDays);
    const maxDays = Number(maxRentalDays);
    if (isRental && (!rentalPriceTon || !Number.isFinite(minDays) || !Number.isFinite(maxDays) || minDays < 1 || maxDays < minDays)) {
      return toast.error("Для аренды укажите цену и корректный срок");
    }
    listWithCredits.mutate({
      groupIds: selectedGroupIds,
      listingType,
      country: listingCountry,
      salePriceTon: salePriceTon || undefined,
      rentalPriceTon: isRental ? rentalPriceTon : undefined,
      minRentalDays: isRental ? minDays : undefined,
      maxRentalDays: isRental ? maxDays : undefined,
    });
  };
  const removeSelectedFromListing = () => {
    const listedIds = mine.filter(group => selectedGroupIds.includes(group.id) && group.status === "listed").map(group => group.id);
    if (!listedIds.length) return toast.error("Выберите группу, которая уже находится в каталоге");
    unlistGroups.mutate({ groupIds: listedIds });
  };
  const copyReferralLink = async () => {
    if (!referral?.referralLink) return toast.error("Реферальная ссылка загружается");
    try {
      await navigator.clipboard.writeText(referral.referralLink);
      toast.success("Реферальная ссылка скопирована");
    } catch {
      toast.error("Не удалось скопировать ссылку. Скопируйте ее вручную.");
    }
  };
  const addBot = (kind: "channel" | "group") =>
    window.open(
      `https://t.me/TGTOP_robot?${kind === "channel" ? "startchannel=admin" : "startgroup=admin"}`,
      "_blank"
    );
  const submitPlacement = (group: Group) => {
    if (!targetSlot?.id)
      return toast.error(
        "Эта позиция будет доступна после создания рейтинговой доски."
      );
    const value = Number(amount);
    const current = targetSlot.bidAmount / 1000;
    if (!Number.isFinite(value) || value <= current)
      return toast.error(`Укажите сумму выше ${current.toFixed(1)} TON`);
    placeBid.mutate({
      slotId: targetSlot.id,
      groupId: group.id,
      bidAmount: value,
      currentBid: `${value.toFixed(1)} TON`,
    });
  };

  return (
    <div className="tg-shell min-h-screen bg-[#0b0f14] text-slate-100">
      <header className="sticky top-0 z-40 border-b border-white/8 bg-[#0b0f14]/95 px-4 py-3 backdrop-blur">
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

      <main className="mx-auto max-w-3xl px-4 pb-28 pt-3">
        {page === "top" && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <WalletConnectControl />
              <Button
                onClick={() => setFiltersOpen(true)}
                variant="outline"
                className="h-8 border-white/10 bg-[#111720] px-3 text-xs text-slate-200"
              >
                <Filter className="mr-1.5 h-3.5 w-3.5" />
                Фильтр
              </Button>
            </div>
            <div className="rounded-xl border border-white/8 bg-[#111720] p-1.5 shadow-[0_12px_28px_rgba(0,0,0,0.12)]">
              <div className="flex items-center px-1.5 pb-1">
                <span className="flex items-center gap-1.5">
                  <h1 className="text-xl font-semibold tracking-tight">
                    Global
                  </h1>
                  <span
                    aria-live="polite"
                    className="rounded-full border border-[#3f8cff]/25 bg-[#3f8cff]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#a6c8ff]"
                  >
                    {n(visibleGroups.length)} групп
                  </span>
                </span>
              </div>
              <ToggleGroup
                type="single"
                value={category}
                onValueChange={value => {
                  if (value) setCategory(value as typeof category);
                }}
                variant="outline"
                size="sm"
                className="grid w-full grid-cols-3 overflow-hidden rounded-lg border border-white/8 bg-[#0b0f14] p-0.5"
              >
                <ToggleGroupItem
                  value="Все"
                  className="h-8 border-0 text-[10px] text-slate-400 data-[state=on]:rounded-md data-[state=on]:bg-[#3f8cff] data-[state=on]:text-white"
                >
                  Все
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="Каналы"
                  className="h-8 border-0 text-[10px] text-slate-400 data-[state=on]:rounded-md data-[state=on]:bg-[#3f8cff] data-[state=on]:text-white"
                >
                  Каналы
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="Чаты"
                  className="h-8 border-0 text-[10px] text-slate-400 data-[state=on]:rounded-md data-[state=on]:bg-[#3f8cff] data-[state=on]:text-white"
                >
                  Чаты
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
            <div className="space-y-3">
              <GroupCard
                group={leadSlot.group}
                variant="lead"
                onClick={() =>
                  leadSlot.group
                    ? openGroup(leadSlot.group.id)
                    : openMine(leadSlot)
                }
              />
              <div className="grid grid-cols-2 gap-3">
                {secondTier.map(slot => (
                  <GroupCard
                    key={slot.slotNumber}
                    group={slot.group}
                    variant="secondary"
                    onClick={() =>
                      slot.group ? openGroup(slot.group.id) : openMine(slot)
                    }
                  />
                ))}
              </div>
              <div className="grid grid-cols-4 gap-2">
                {thirdTier.map(slot => (
                  <GroupCard
                    key={slot.slotNumber}
                    group={slot.group}
                    variant="compact"
                    onClick={() =>
                      slot.group ? openGroup(slot.group.id) : openMine(slot)
                    }
                  />
                ))}
              </div>
            </div>
            <section className="pt-2">
              <div className="space-y-2">
                {generalList.map(group => (
                  <GroupCard
                    key={group.id}
                    group={group}
                    variant="list"
                    onClick={() => openGroup(group.id)}
                  />
                ))}
                {generalList.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-white/12 bg-[#111720] p-6 text-center">
                    <p className="text-sm font-medium text-slate-300">
                      В TG TOP пока нет площадок
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Добавьте первую группу через личную папку.
                    </p>
                  </div>
                )}
              </div>
            </section>
          </section>
        )}

        {page === "catalog" && (
          <section className="space-y-4">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#72a8ff]">
                  Маркетплейс
                </p>
                <h1 className="mt-1 text-2xl font-semibold">Каталог групп</h1>
              </div>
              <Button
                onClick={() => setFiltersOpen(true)}
                variant="outline"
                className="border-white/10 bg-[#111720] text-slate-200"
              >
                <Filter className="mr-2 h-4 w-4" />
                Фильтр
              </Button>
            </div>
            <div className="overflow-hidden rounded-2xl border border-white/8 bg-[#111720] divide-y divide-white/7">
              {visibleGroups.map(group => (
                <button
                  key={group.id}
                  onClick={() => openGroup(group.id)}
                  className="flex w-full items-center gap-3 px-4 py-4 text-left"
                >
                  <Avatar group={group} />
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-sm">{group.title}</b>
                    <small className="mt-1 block text-xs text-slate-500">
                      {group.username ? `@${group.username}` : group.category} ·{" "}
                      {n(group.membersCount)} участников
                    </small>
                  </span>
                  <ChevronRight className="h-4 w-4 text-slate-600" />
                </button>
              ))}
              {visibleGroups.length === 0 && (
                <p className="p-8 text-center text-sm text-slate-500">
                  По этому фильтру площадок пока нет.
                </p>
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
              Назад
            </button>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#72a8ff]">
                Личная папка
              </p>
              <h1 className="mt-1 text-2xl font-semibold">Мои группы</h1>
              <p className="mt-1 text-sm text-slate-500">
                Подключите бота, чтобы получить статистику и разместить
                площадку.
              </p>
            </div>
            {targetSlot && (
              <div className="rounded-xl border border-[#3f8cff]/30 bg-[#3f8cff]/10 p-3">
                <p className="text-sm">Выберите группу для размещения</p>
                <div className="mt-2 flex gap-2">
                  <Input
                    value={amount}
                    type="number"
                    step="0.1"
                    onChange={event => setAmount(event.target.value)}
                    className="h-9 border-white/10 bg-[#0b0f14]"
                  />
                  <span className="flex items-center text-xs text-slate-400">
                    TON
                  </span>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => addBot("channel")}
                className="rounded-xl border border-white/10 bg-[#111720] px-3 py-3 text-sm font-semibold"
              >
                + Канал
              </button>
              <button
                onClick={() => addBot("group")}
                className="rounded-xl border border-white/10 bg-[#111720] px-3 py-3 text-sm font-semibold"
              >
                + Чат
              </button>
            </div>
            {selectedGroupIds.length > 0 && (
              <div className="sticky top-[62px] z-20 rounded-xl border border-[#3f8cff]/30 bg-[#101a2a]/95 p-2.5 shadow-lg backdrop-blur">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-300">
                    Выбрано: <b className="text-white">{selectedGroupIds.length}</b>
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={removeSelectedFromListing}
                      disabled={unlistGroups.isPending}
                      className="rounded-lg border border-white/12 px-2.5 py-1.5 text-[11px] font-medium text-slate-300 disabled:opacity-50"
                    >
                      Снять
                    </button>
                    <button
                      onClick={() => openListing(selectedGroupIds)}
                      className="rounded-lg bg-[#3f8cff] px-2.5 py-1.5 text-[11px] font-semibold text-white"
                    >
                      Листинг
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
                    <button
                      onClick={() => toggleGroupSelection(group.id)}
                      aria-label={`Выбрать ${group.title}`}
                      aria-pressed={selectedGroupIds.includes(group.id)}
                      className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border ${selectedGroupIds.includes(group.id) ? "border-[#3f8cff] bg-[#3f8cff] text-white" : "border-white/20 text-transparent"}`}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => openGroup(group.id)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <Avatar group={group} />
                      <span className="min-w-0 flex-1">
                        <b className="block truncate text-sm">{group.title}</b>
                        <small className="mt-1 block text-xs text-slate-500">
                          {group.username ? `@${group.username}` : group.category} · {n(group.membersCount)}
                        </small>
                      </span>
                      <ChevronRight className="h-4 w-4 text-slate-600" />
                    </button>
                  </div>
                  <div className="mt-3 flex gap-2">
                    {targetSlot && (
                      <button
                        onClick={() => submitPlacement(group)}
                        className="flex-1 rounded-lg bg-[#3f8cff] py-2 text-xs font-semibold"
                      >
                        Разместить
                      </button>
                    )}
                    <button
                      onClick={() => openListing([group.id])}
                      className="flex-1 rounded-lg border border-white/10 py-2 text-xs font-semibold text-slate-200"
                    >
                      {group.status === "listed" ? "Настроить листинг" : "Выставить на листинг"}
                    </button>
                  </div>
                </div>
              ))}
              {mine.length === 0 && (
                <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center">
                  <FolderPlus className="mx-auto h-7 w-7 text-slate-600" />
                  <p className="mt-3 text-sm">Групп пока нет</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Добавьте @TGTOP_robot в администраторы.
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
                  Назад
                </button>
                <div className="rounded-2xl border border-white/8 bg-[#111720] p-5">
                  <div className="flex items-start gap-4">
                    <Avatar group={detail.group} large />
                    <span className="min-w-0">
                      <h1 className="truncate text-xl font-semibold">
                        {detail.group.title}
                      </h1>
                      <p className="mt-1 text-sm text-[#72a8ff]">
                        {detail.group.username
                          ? `@${detail.group.username}`
                          : detail.group.category}
                      </p>
                      <p className="mt-3 text-sm leading-5 text-slate-400">
                        {detail.group.description ||
                          "Описание не передано Telegram API."}
                      </p>
                    </span>
                  </div>
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-white/8 pt-4 text-xs">
                    <span className="rounded-md bg-white/5 px-2 py-1 text-slate-300">
                      {detail.group.status === "listed"
                        ? `В каталоге с ${date(detail.group.listedAt)}`
                        : "Не размещена в каталоге"}
                    </span>
                    <span className="rounded-md bg-white/5 px-2 py-1 text-slate-400">
                      {selectedSlot ? "Выделенная позиция" : "Общий список"}
                    </span>
                  </div>
                  {ownsDetail && (
                    <button
                      onClick={() => openMine()}
                      className="mt-3 w-full rounded-lg border border-[#3f8cff]/35 bg-[#3f8cff]/10 py-2 text-xs font-semibold text-[#a6c8ff]"
                    >
                      Управлять этой группой
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Metric
                    label="Участники"
                    value={n(detail.group.membersCount)}
                    note="последнее измерение"
                  />
                  <Metric
                    label="Прирост"
                    value={
                      detail.snapshots.length > 1
                        ? n(
                            detail.snapshots.at(-1)!.membersCount -
                              detail.snapshots[0].membersCount
                          )
                        : "—"
                    }
                    note={
                      detail.snapshots.length > 1
                        ? "за период наблюдения"
                        : "данные накапливаются"
                    }
                  />
                  <Metric
                    label="Вступления"
                    value={
                      detail.group.joinedCount
                        ? n(detail.group.joinedCount)
                        : "—"
                    }
                    note="замеченные ботом"
                  />
                  <Metric
                    label="Выходы"
                    value={
                      detail.group.leavesCount
                        ? n(detail.group.leavesCount)
                        : "—"
                    }
                    note="замеченные ботом"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Metric
                    label="По приглашениям"
                    value={
                      detail.group.invitedCount
                        ? n(detail.group.invitedCount)
                        : "—"
                    }
                    note="когда Telegram передал ссылку"
                  />
                  <Metric
                    label="Публикации"
                    value={
                      detail.group.messagesCount
                        ? n(detail.group.messagesCount)
                        : "—"
                    }
                    note="увиденные ботом"
                  />
                </div>
                <div className="rounded-2xl border border-white/8 bg-[#111720] p-4">
                  <div className="flex justify-between">
                    <span>
                      <b className="block text-sm">Динамика аудитории</b>
                      <small className="block mt-1 text-xs text-slate-500">
                        Только снимки TG TOP.
                      </small>
                    </span>
                    <BarChart3 className="h-5 w-5 text-slate-500" />
                  </div>
                  <div className="mt-4 flex h-16 items-end gap-1 border-b border-white/8">
                    {detail.snapshots.length ? (
                      detail.snapshots
                        .slice(-16)
                        .map((snapshot, index) => (
                          <span
                            key={index}
                            className="min-w-1 flex-1 rounded-t bg-[#3f8cff]"
                            style={{
                              height: `${Math.max(8, (snapshot.membersCount / Math.max(...detail.snapshots.map(item => item.membersCount), 1)) * 100)}%`,
                            }}
                          />
                        ))
                    ) : (
                      <p className="text-sm text-slate-500">
                        Первый снимок будет создан при следующем обновлении.
                      </p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Metric
                    label="В TG TOP с"
                    value={date(detail.group.createdAt)}
                    note="дата подключения"
                  />
                  <Metric
                    label="Возраст площадки"
                    value="—"
                    note="Telegram не отдал дату создания"
                  />
                  <Metric
                    label="Просмотры"
                    value={
                      detail.group.lastPostViews
                        ? n(detail.group.lastPostViews)
                        : "—"
                    }
                    note="последний доступный пост"
                  />
                  <Metric
                    label="Обновлено"
                    value={date(detail.group.lastStatsAt)}
                    note="последние данные"
                  />
                </div>
              </>
            ) : (
              <p className="py-16 text-center text-sm text-slate-500">
                Загружаем статистику…
              </p>
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
                    {user?.name ?? "Telegram user"}
                  </h1>
                  <small className="text-xs text-slate-500">
                    Личный кабинет TG TOP
                  </small>
                </span>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <Metric
                  label="Основной баланс"
                  value={`${mainTon} TON`}
                  note="пополнения и оплаты"
                />
                <Metric
                  label="Бонусный баланс"
                  value={`${bonus} GRAM`}
                  note="для размещения"
                />
              </div>
            </div>
            <section className="overflow-hidden rounded-2xl border border-white/8 bg-[#111720]">
              <div className="border-b border-white/8 px-4 py-4">
                <h2 className="text-sm font-semibold">История операций</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Бонусы и списания по вашим площадкам
                </p>
              </div>
              {transactions.length ? (
                <div className="divide-y divide-white/7">
                  {transactions.map(transaction => {
                    const earned = transaction.amount > 0;
                    const groupName = transaction.groupUsername
                      ? `@${transaction.groupUsername}`
                      : (transaction.groupTitle ?? "TG TOP");
                    return (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between gap-3 px-4 py-3"
                      >
                        <span className="min-w-0">
                          <b className="block truncate text-sm">
                            {earned
                              ? "Бонус за подключение"
                              : "Размещение в каталоге"}
                          </b>
                          <small className="mt-1 block truncate text-xs text-slate-500">
                            {groupName} · {date(transaction.createdAt)}
                          </small>
                        </span>
                        <b
                          className={`shrink-0 text-sm ${earned ? "text-[#72a8ff]" : "text-slate-300"}`}
                        >
                          {earned ? "+" : ""}
                          {(transaction.amount / 100).toFixed(1)} GRAM
                        </b>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="px-4 py-8 text-center text-sm text-slate-500">
                  Операцій поки немає.
                </p>
              )}
            </section>
            <section className="overflow-hidden rounded-2xl border border-white/8 bg-[#111720]">
              <div className="border-b border-white/8 px-4 py-4">
                <h2 className="text-sm font-semibold">Реферальная программа</h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Приглашайте владельцев площадок. Доход отражается только после закрытых сделок с комиссией TG TOP.
                </p>
              </div>
              <div className="space-y-3 p-4">
                <div className="grid grid-cols-2 gap-3">
                  <Metric
                    label="Приглашено"
                    value={String(referral?.referralsCount ?? 0)}
                    note="активированных аккаунтов"
                  />
                  <Metric
                    label="Заработано"
                    value={referral?.earnings ?? "0 TON"}
                    note="из комиссий платформы"
                  />
                </div>
                <div className="rounded-xl border border-white/8 bg-[#0b0f14] p-3">
                  <span className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Ваша ссылка</span>
                  <code className="mt-1.5 block truncate text-xs text-[#a6c8ff]">
                    {referral?.referralLink ?? "Готовим персональную ссылку…"}
                  </code>
                  <button
                    onClick={copyReferralLink}
                    disabled={!referral}
                    className="mt-3 w-full rounded-lg border border-[#3f8cff]/35 bg-[#3f8cff]/10 py-2 text-xs font-semibold text-[#a6c8ff] disabled:opacity-50"
                  >
                    Скопировать ссылку
                  </button>
                </div>
              </div>
            </section>
            <section className="overflow-hidden rounded-2xl border border-white/8 bg-[#111720]">
              <div className="border-b border-white/8 px-4 py-4">
                <h2 className="text-sm font-semibold">Как это работает</h2>
                <p className="mt-1 text-xs text-slate-500">Коротко о безопасном использовании TG TOP.</p>
              </div>
              <div className="divide-y divide-white/7">
                {[
                  ["Кошелек", "Подключение кошелька только показывает ваш TON-адрес. TG TOP пока не запрашивает подпись или перевод TON."],
                  ["Листинг", "Подключите @TGTOP_robot как администратора, получите 0.1 GRAM и настройте каталог, продажу или аренду в личной папке."],
                  ["Рейтинг", "Место в топе меняется при большей ставке. Перед оплатой будет отдельное подтверждение — автоматические TON-платежи еще не включены."],
                  ["NFT и сделки", "Проверяйте владельца и условия вручную. Передача прав и денег будет доступна только через защищенный сценарий сделки после запуска проверки платежей."],
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
                  <b className="block text-sm">Мои группы</b>
                  <small className="block mt-0.5 text-xs text-slate-500">
                    Управление и листинг
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
              { key: "top", label: "Топ", icon: Trophy },
              { key: "mine", label: "Мои", icon: Users },
              { key: "profile", label: "Профиль", icon: UserRound },
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

      <Sheet open={listingOpen} onOpenChange={setListingOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[92dvh] overflow-y-auto rounded-t-[22px] border-white/10 bg-[#10161f] text-slate-100"
        >
          <SheetHeader className="px-4">
            <SheetTitle className="text-slate-100">Настроить листинг</SheetTitle>
            <p className="text-xs leading-5 text-slate-500">
              {selectedListingGroups.length === 1
                ? selectedListingGroups[0]?.title
                : `${selectedListingGroups.length} выбранных групп`}
            </p>
          </SheetHeader>
          <div className="space-y-5 px-4 pb-4">
            <section>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs text-slate-400">Формат листинга</p>
                <span className="text-[10px] text-slate-600">
                  Подходит для {Array.from(new Set(selectedListingGroups.map(group => group.category))).join(" · ") || "групп"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { value: "catalog", title: "Каталог", note: "Без цены" },
                    { value: "sale", title: "Продажа", note: "Цена по желанию" },
                    { value: "rent", title: "Аренда", note: "Цена и срок" },
                    { value: "both", title: "Продажа + аренда", note: "Оба сценария" },
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
              <p className="mb-2 text-xs text-slate-400">Страна / регион в каталоге</p>
              <div className="grid grid-cols-5 gap-1.5">
                {(["Global", "UA", "RU", "EU", "US"] as ListingCountry[]).map(item => (
                  <button
                    key={item}
                    onClick={() => setListingCountry(item)}
                    className={`rounded-lg border py-2 text-[10px] font-medium ${listingCountry === item ? "border-[#3f8cff] bg-[#3f8cff]/15 text-[#a6c8ff]" : "border-white/10 text-slate-400"}`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </section>

            {includesSale && (
              <section>
                <div className="mb-2 flex items-baseline justify-between">
                  <p className="text-xs text-slate-400">Цена продажи</p>
                  <span className="text-[10px] text-slate-600">Необязательно — можно договориться в чате</span>
                </div>
                <div className="relative">
                  <Input
                    value={salePriceTon}
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.1"
                    onChange={event => setSalePriceTon(event.target.value)}
                    placeholder="Например, 250"
                    className="h-10 border-white/10 bg-[#0b0f14] pr-12 text-sm"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-500">TON</span>
                </div>
              </section>
            )}

            {includesRent && (
              <section className="space-y-3">
                <p className="text-xs text-slate-400">Условия аренды</p>
                <div className="relative">
                  <Input
                    value={rentalPriceTon}
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.1"
                    onChange={event => setRentalPriceTon(event.target.value)}
                    placeholder="Цена за день"
                    className="h-10 border-white/10 bg-[#0b0f14] pr-16 text-sm"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-500">TON / день</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="space-y-1.5">
                    <span className="text-[10px] text-slate-500">Минимум дней</span>
                    <Input
                      value={minRentalDays}
                      type="number"
                      min="1"
                      max="365"
                      onChange={event => setMinRentalDays(event.target.value)}
                      className="h-10 border-white/10 bg-[#0b0f14] text-sm"
                    />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-[10px] text-slate-500">Максимум дней</span>
                    <Input
                      value={maxRentalDays}
                      type="number"
                      min="1"
                      max="365"
                      onChange={event => setMaxRentalDays(event.target.value)}
                      className="h-10 border-white/10 bg-[#0b0f14] text-sm"
                    />
                  </label>
                </div>
              </section>
            )}

            <div className="rounded-xl border border-[#3f8cff]/18 bg-[#3f8cff]/8 p-3 text-[11px] leading-4 text-slate-400">
              Новая публикация использует <b className="font-medium text-[#a6c8ff]">0.1 GRAM</b> за группу. Повторное редактирование уже опубликованного листинга не списывает бонусы. Оплата TON и передача прав пока не запускаются автоматически.
            </div>
          </div>
          <SheetFooter className="sticky bottom-0 border-t border-white/8 bg-[#10161f] px-4 py-3 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => setListingOpen(false)}
              className="border-white/10 text-slate-300"
            >
              Отмена
            </Button>
            <Button
              onClick={saveListing}
              disabled={listWithCredits.isPending || !selectedGroupIds.length}
              className="bg-[#3f8cff] text-white disabled:opacity-60"
            >
              {listWithCredits.isPending ? "Сохраняем…" : "Сохранить листинг"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent
          side="right"
          className="border-white/10 bg-[#10161f] text-slate-100"
        >
          <SheetHeader>
            <SheetTitle className="text-slate-100">Фильтр</SheetTitle>
            <p className="text-xs text-slate-500">
              Обновляет карточки и весь список одновременно.
            </p>
          </SheetHeader>
          <div className="space-y-6 px-4">
            <div>
              <p className="mb-2 text-xs text-slate-400">Тип площадки</p>
              <div className="grid grid-cols-3 gap-2">
                {(["Все", "Каналы", "Чаты"] as const).map(item => (
                  <button
                    key={item}
                    onClick={() => setCategory(item)}
                    className={`rounded-lg border px-2 py-2 text-xs ${category === item ? "border-[#3f8cff] bg-[#3f8cff]/15 text-[#a6c8ff]" : "border-white/10 text-slate-400"}`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs text-slate-400">Страна / регион</p>
              <div className="grid grid-cols-2 gap-2">
                {["Все", "Global", "UA", "RU", "EU", "US"].map(item => (
                  <button
                    key={item}
                    onClick={() => setCountry(item)}
                    className={`rounded-lg border px-2 py-2 text-left text-xs ${country === item ? "border-[#3f8cff] bg-[#3f8cff]/15 text-[#a6c8ff]" : "border-white/10 text-slate-400"}`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs text-slate-400">
                Количество участников
              </p>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { key: "all", label: "Все" },
                    { key: "small", label: "До 1 тыс." },
                    { key: "medium", label: "1–10 тыс." },
                    { key: "large", label: "От 10 тыс." },
                  ] as const
                ).map(item => (
                  <button
                    key={item.key}
                    onClick={() => setAudience(item.key)}
                    className={`rounded-lg border px-2 py-2 text-left text-xs ${audience === item.key ? "border-[#3f8cff] bg-[#3f8cff]/15 text-[#a6c8ff]" : "border-white/10 text-slate-400"}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <SheetFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCategory("Все");
                setCountry("Все");
                setAudience("all");
              }}
              className="border-white/10 text-slate-300"
            >
              Сбросить
            </Button>
            <Button
              onClick={() => setFiltersOpen(false)}
              className="bg-[#3f8cff]"
            >
              Показать
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
    </div>
  );
}
