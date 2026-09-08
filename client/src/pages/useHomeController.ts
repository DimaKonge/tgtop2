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


export function useHomeController({ onReady }: { onReady?: () => void }) {
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const hasSignaledReady = useRef(false);
  const [page, setPage] = useState<Page>("top");
  const [detailStatsPeriod, setDetailStatsPeriod] = useState<DetailStatsPeriod>("day");
  const {
    walletConnectionRestored,
    safeWalletAddress, setSafeWalletAddress,
    tonDepositOpen, setTonDepositOpen,
    tonDepositAmount, setTonDepositAmount,
    activeTonDepositId, setActiveTonDepositId,
    tonWithdrawalOpen, setTonWithdrawalOpen,
    tonWithdrawalAmount, setTonWithdrawalAmount,
    tonWithdrawalAddress, setTonWithdrawalAddress,
    tonWithdrawalFlow, setTonWithdrawalFlow,
    activeTonWithdrawalId, setActiveTonWithdrawalId,
    financialHistoryOpen, setFinancialHistoryOpen,
    tonWithdrawalSubmitInFlight,
    tonWithdrawalDefaultRecipient,
    tonDeposits,
    tonWithdrawals,
    createTonDepositMutation,
    markTonDepositSubmittedMutation,
    verifyTonDepositMutation,
    quoteTonWithdrawalMutation,
    createTonWithdrawalMutation,
    reconcileTonWithdrawalMutation,
    openTonWalletForCurrentUser,
    disconnectTonWallet,
    startTonDeposit,
    prepareTonWithdrawal,
  } = useTonWallet({ page, user, isAuthenticated, utils });
  const {
    category, setCategory,
    globalDirection, setGlobalDirection,
    topSection, setTopSection,
    subcategory, setSubcategory,
    country, setCountry,
    city, setCity,
    audience, setAudience,
    filtersOpen, setFiltersOpen,
    topSearchQuery, setTopSearchQuery,
    topSearchOpen, setTopSearchOpen,
  } = useTopFilters();
  const {
    workspaceSection, setWorkspaceSection,
    walletNftFilter, setWalletNftFilter,
    selectedGroupId, setSelectedGroupId,
    selectedGroupIds, setSelectedGroupIds,
    myGroupsSelectionMode, setMyGroupsSelectionMode,
    pendingGroupDeletion, setPendingGroupDeletion,
    pendingModerationGroup, setPendingModerationGroup,
  } = useMyGroups();
  const {
    targetSlot, setTargetSlot,
    rankSlotLinkId, setRankSlotLinkId,
    amount, setAmount,
    listingRankingBid, setListingRankingBid,
    outbidOpen, setOutbidOpen,
    outbidGroupId, setOutbidGroupId,
    outbidBidInput, setOutbidBidInput,
    outbidVisibility, setOutbidVisibility,
    detailVisibility, setDetailVisibility,
    paymentMethod, setPaymentMethod,
    detailBoardScope, setDetailBoardScope,
    detailBidInput, setDetailBidInput,
  } = useRankingAuction();
  useEffect(() => {
    if (!isAuthenticated && page !== "top" && page !== "details" && page !== "owner") {
      setPage("top");
    }
  }, [isAuthenticated, page]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [adminGuideKind, setAdminGuideKind] = useState<"channel" | "group" | null>(null);
  const language = getRussianLanguage();
  const [selectedOwnerOpenId, setSelectedOwnerOpenId] = useState<string | null>(null);
  const [starsPaymentGroup, setStarsPaymentGroup] = useState<Group | null>(null);
  const [lotGroupPickerOpen, setLotGroupPickerOpen] = useState(false);
  const [lotGroupId, setLotGroupId] = useState<number | null>(null);
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
  const accountActivityQuery = trpc.tgTop.getAccountActivity.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 8_000,
    refetchIntervalInBackground: false,
  });
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
    onSuccess: result => {
      setTelegramUserAgentPassword("");
      toast.success("Рабочий Telegram-аккаунт подключён в read-only режиме");
      utils.telegramUserAgent.status.setData(undefined, current => current ? { ...current, status: "connected", accountTelegramId: result.accountTelegramId, accountUsername: result.accountUsername, expiresAt: null } : current);
      void utils.telegramUserAgent.status.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const disconnectTelegramUserAgent = trpc.telegramUserAgent.disconnect.useMutation({
    onSuccess: () => {
      setTelegramUserAgentPhone("");
      setTelegramUserAgentCode("");
      setTelegramUserAgentPassword("");
      utils.telegramUserAgent.status.setData(undefined, current => current ? { ...current, status: "disconnected", accountTelegramId: null, accountUsername: null, expiresAt: null } : current);
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
  const telegramAvatarVersion =
    typeof window !== "undefined"
      ? new URLSearchParams(window.Telegram?.WebApp?.initData ?? "").get("auth_date")
      : null;
  const displayUserAvatar = telegramAvatar
    ? `${telegramAvatar}${telegramAvatar.includes("?") ? "&" : "?"}tgtop_avatar=${encodeURIComponent(telegramAvatarVersion ?? "current")}`
    : user?.avatarUrl;
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
  const copyPrivateEntryLink = async (inviteLink: string) => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      toast.success(tx("Закрытая ссылка скопирована", "Private link copied."));
    } catch {
      toast.error(tx("Не удалось скопировать ссылку. Скопируйте её вручную.", "Could not copy the link. Please copy it manually."));
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

  return {
    user,
    isAuthenticated,
    utils,
    hasSignaledReady,
    page,
    setPage,
    detailStatsPeriod,
    setDetailStatsPeriod,
    walletConnectionRestored,
    safeWalletAddress,
    setSafeWalletAddress,
    tonDepositOpen,
    setTonDepositOpen,
    tonDepositAmount,
    setTonDepositAmount,
    activeTonDepositId,
    setActiveTonDepositId,
    tonWithdrawalOpen,
    setTonWithdrawalOpen,
    tonWithdrawalAmount,
    setTonWithdrawalAmount,
    tonWithdrawalAddress,
    setTonWithdrawalAddress,
    tonWithdrawalFlow,
    setTonWithdrawalFlow,
    activeTonWithdrawalId,
    setActiveTonWithdrawalId,
    financialHistoryOpen,
    setFinancialHistoryOpen,
    tonWithdrawalSubmitInFlight,
    tonWithdrawalDefaultRecipient,
    tonDeposits,
    tonWithdrawals,
    createTonDepositMutation,
    markTonDepositSubmittedMutation,
    verifyTonDepositMutation,
    quoteTonWithdrawalMutation,
    createTonWithdrawalMutation,
    reconcileTonWithdrawalMutation,
    openTonWalletForCurrentUser,
    disconnectTonWallet,
    startTonDeposit,
    prepareTonWithdrawal,
    category,
    setCategory,
    globalDirection,
    setGlobalDirection,
    topSection,
    setTopSection,
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
    topSearchQuery,
    setTopSearchQuery,
    topSearchOpen,
    setTopSearchOpen,
    workspaceSection,
    setWorkspaceSection,
    walletNftFilter,
    setWalletNftFilter,
    selectedGroupId,
    setSelectedGroupId,
    selectedGroupIds,
    setSelectedGroupIds,
    myGroupsSelectionMode,
    setMyGroupsSelectionMode,
    pendingGroupDeletion,
    setPendingGroupDeletion,
    pendingModerationGroup,
    setPendingModerationGroup,
    targetSlot,
    setTargetSlot,
    rankSlotLinkId,
    setRankSlotLinkId,
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
    detailVisibility,
    setDetailVisibility,
    paymentMethod,
    setPaymentMethod,
    detailBoardScope,
    setDetailBoardScope,
    detailBidInput,
    setDetailBidInput,
    settingsOpen,
    setSettingsOpen,
    adminGuideKind,
    setAdminGuideKind,
    language,
    selectedOwnerOpenId,
    setSelectedOwnerOpenId,
    starsPaymentGroup,
    setStarsPaymentGroup,
    lotGroupPickerOpen,
    setLotGroupPickerOpen,
    lotGroupId,
    setLotGroupId,
    myGroupsSelectionHoldTimer,
    myGroupsSelectionHoldTriggered,
    topListingPickerOpen,
    setTopListingPickerOpen,
    topListingGroupIds,
    listingOpen,
    setListingOpen,
    inlineListingOpen,
    setInlineListingOpen,
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
    setShowOwnerContact,
    managerPublic,
    setManagerPublic,
    listingAnnouncementEnabled,
    setListingAnnouncementEnabled,
    searchIndexable,
    setSearchIndexable,
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
    rewardPerInvite,
    setRewardPerInvite,
    rewardPerManualAdd,
    setRewardPerManualAdd,
    nftTransferOpen,
    setNftTransferOpen,
    nftRentalDraft,
    setNftRentalDraft,
    nftTransferStep,
    setNftTransferStep,
    nftAssetFilter,
    setNftAssetFilter,
    nftMarketCategory,
    setNftMarketCategory,
    nftDealCategory,
    setNftDealCategory,
    botCategory,
    setBotCategory,
    channelGiftsOpen,
    setChannelGiftsOpen,
    selectedNftId,
    setSelectedNftId,
    recipientInput,
    setRecipientInput,
    preparedNftTransfer,
    setPreparedNftTransfer,
    showcaseNftId,
    setShowcaseNftId,
    visibleActivityCount,
    setVisibleActivityCount,
    positionClock,
    setPositionClock,
    detailReturnPage,
    setDetailReturnPage,
    detailSwipeStart,
    ui,
    tx,
    errorText,
    slotsQuery,
    slots,
    groupsQuery,
    listedGroups,
    giveawaysQuery,
    giveaways,
    nftsQuery,
    nfts,
    myNftsQuery,
    myNfts,
    walletNftsQuery,
    walletNfts,
    visibleWalletNfts,
    nftRecipientQuery,
    mineQuery,
    mine,
    myGroupsViewMode,
    setMyGroupsViewMode,
    myGroupsLayout,
    myGroupsStatusFilter,
    setMyGroupsStatusFilter,
    myGroupsSearchQuery,
    setMyGroupsSearchQuery,
    myGroupsAddOpen,
    setMyGroupsAddOpen,
    giveawayCreateOpen,
    setGiveawayCreateOpen,
    giveawayGroupId,
    setGiveawayGroupId,
    giveawayTitle,
    setGiveawayTitle,
    giveawayPrizeTitle,
    setGiveawayPrizeTitle,
    giveawayRules,
    setGiveawayRules,
    giveawayEndsAt,
    setGiveawayEndsAt,
    giveawayBoostOnly,
    setGiveawayBoostOnly,
    myGroupsDragActiveId,
    setMyGroupsDragActiveId,
    myGroupsSensors,
    accountQuery,
    accountActivityQuery,
    account,
    moderationAccessQuery,
    moderationAccess,
    telegramUserAgentStatusQuery,
    telegramUserAgentStatus,
    catalogTaxonomyQuery,
    catalogTaxonomy,
    approvedBotsQuery,
    approvedBots,
    myBotListingsQuery,
    myBotListings,
    botModerationQueueQuery,
    botModerationQueue,
    allBotListingsQuery,
    allBotListings,
    activeModerationListingsQuery,
    tonWithdrawalsForManualReviewQuery,
    activeModerationListings,
    tonWithdrawalsForManualReview,
    moderatorsQuery,
    moderators,
    moderationReasonDraft,
    setModerationReasonDraft,
    detailModerationReason,
    setDetailModerationReason,
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
    botTelegramLinkDraft,
    setBotTelegramLinkDraft,
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
    botCategorySheetOpen,
    setBotCategorySheetOpen,
    botListingSheetOpen,
    setBotListingSheetOpen,
    dealsQuery,
    deals,
    detailQuery,
    channelGiftsQuery,
    channelGifts,
    groupAdministratorsQuery,
    publicOwnerQuery,
    publicOwner,
    ownerLeaderboardQuery,
    ownerLeaderboard,
    setPublicProfile,
    requestTelegramUserAgentCode,
    confirmTelegramUserAgentCode,
    confirmTelegramUserAgentPassword,
    disconnectTelegramUserAgent,
    bootstrapTelegramOwnerDm,
    moderateGroup,
    submitBotListing,
    moderateBotListing,
    deleteBotListing,
    reviewTonWithdrawal,
    setModeratorRole,
    refreshCatalogTaxonomy,
    addCatalogCountry,
    deleteCatalogCountry,
    addCatalogCity,
    deleteCatalogCity,
    addCatalogTopic,
    deleteCatalogTopic,
    setGroupManager,
    detail,
    detailSlotsQuery,
    detailSlots,
    detailTopPreviewSlotsQuery,
    detailTopPreviewSlots,
    rewardCampaignStatsQuery,
    rewardCampaignStats,
    listWithCredits,
    createGiveaway,
    joinGiveaway,
    createMonthlyEntryLink,
    createPrivateEntryLink,
    createRewardInviteLink,
    resolveVerifiedEntryLink,
    createCommunityOnboardingIntent,
    unlistGroups,
    deleteGroups,
    toggleServiceMessagesMutation,
    saveMyGroupsLayoutMutation,
    placeBid,
    createStarsRankingPayment,
    setNftShowcase,
    createProtectedGroupDeal,
    cancelProtectedGroupDeal,
    confirmProtectedGroupTransfer,
    prepareNftTransferMutation,
    createNftRentalDeal,
    matchesAudience,
    visibleGroups,
    visibleNfts,
    compactRankedSlots,
    fallbackRankedGroups,
    board,
    rankingContinuation,
    rankedGroups,
    rankedGroupIds,
    firstAvailableRankingSlot,
    automaticPlacementSlot,
    generalList,
    searchCandidates,
    searchedGeneralList,
    leadSlot,
    secondTier,
    thirdTier,
    rankingSnapshotKey,
    rankingMotionKey,
    bonusBalanceUnits,
    bonus,
    mainBalanceTonValue,
    mainTon,
    canWithdrawMinimum,
    activeTonWithdrawal,
    withdrawalProcessingTitle,
    withdrawalProcessingNote,
    totalBalanceLabel,
    transactions,
    accountActivity,
    visibleAccountActivity,
    getFinancialActivityTitle,
    getFinancialActivityStatus,
    referral,
    verifiedTasks,
    dealStatusLabel,
    getDaysRemaining,
    getProtectedDealGuidance,
    globalCount,
    currentTopTitle,
    currentTopCountry,
    currentTopCity,
    currentTopSubcategory,
    topThemeOptions,
    telegramAvatar,
    telegramAvatarVersion,
    displayUserAvatar,
    selectedSlot,
    ownsDetail,
    placementSlot,
    detailPlacementIsPublic,
    detailVisibilityChanged,
    detailOutbidMinimum,
    detailMinimumBid,
    rawDetailRankingBid,
    normalizedDetailRankingBid,
    detailRankingBidAmount,
    detailRewardBudgetUnits,
    detailPriceBelowCurrent,
    detailBoardCategory,
    detailBoardCountry,
    detailBoardSubcategory,
    detailCatalogPath,
    detailHeaderPath,
    detailHeaderAddress,
    outbidCandidates,
    lotGroupPickerCandidates,
    lotGroupCandidates,
    selectedLotGroup,
    existingRewardBudgetUnits,
    detailRewardBudgetDeltaUnits,
    detailPlacementTotalUnits,
    detailBalanceChangeUnits,
    lotSettingsLocked,
    detailRankingPreviewSlotNumber,
    detailDisplayedSlotNumber,
    detailTypeRankingPreviewPosition,
    detailWillDrop,
    selectedOutbidGroup,
    outbidMinimum,
    rawOutbidBid,
    outbidBidAmount,
    detailEntryUrl,
    detailHasPaidEntry,
    detailOwner,
    detailSnapshots,
    latestDetailSnapshot,
    dayAgoDetailSnapshot,
    dailyGrowthPct,
    startOfToday,
    startOfThisMonth,
    detailPeriodStart,
    detailSnapshotBeforePeriod,
    detailPeriodAvailable,
    getDetailPeriodMetric,
    detailMessagesForPeriod,
    detailJoinedForPeriod,
    detailLeavesForPeriod,
    detailInvitedForPeriod,
    detailMembersLabel,
    detailEntryReward,
    detailRewardActive,
    openRewardAwareEntry,
    persistedDetailSalePrice,
    detailSalePrice,
    detailSalePriceUnits,
    detailSaleEnabled,
    detailCanBeBought,
    detailHasEnoughBalanceToBuy,
    subscriptionReward,
    inviteReward,
    manualAddReward,
    selectedListingGroups,
    privateEntryEligibleGroup,
    orderedMyGroups,
    pinnedMyGroups,
    unpinnedMyGroups,
    myGroupsMatchStatus,
    normalizedMyGroupsSearch,
    myGroupsMatchSearch,
    myGroupsMatchFilters,
    visiblePinnedMyGroups,
    visibleUnpinnedMyGroups,
    visibleMyGroups,
    isMyGroupsSearchActive,
    visibleMyGroupsMembers,
    myGroupsDragActiveGroup,
    managedCountries,
    managedCities,
    managedTopics,
    getManagedCountryLabel,
    getManagedCityLabel,
    getManagedTopicLabel,
    botTopicOptions,
    filteredModerationBots,
    globalSubcategoryCategory,
    globalSubcategoryOptions,
    listingCategory,
    listingSubcategoryOptions,
    monthlyEntryEligibleGroup,
    selectedListingGroup,
    rawListingRankingBid,
    listingRankingBidAmount,
    listingSlotsQuery,
    listingSlots,
    listingRankingPreviewSlotNumber,
    listingRankingPreviewSlot,
    listingTargetIsOwnSlot,
    listingRankingMinimum,
    canPayListingRanking,
    listingRankingScope,
    selectedNft,
    showcaseNft,
    reviewedRecipient,
    activeRankingBoardScope,
    openGroup,
    openOwner,
    openMine,
    openTopListingPicker,
    toggleTopListingGroup,
    continueTopListingPicker,
    getTargetSlotAddress,
    openOutbid,
    applyLotGroupSettings,
    toggleGroupSelection,
    selectMyGroup,
    exitMyGroupsSelection,
    beginMyGroupsSelectionHold,
    endMyGroupsSelectionHold,
    openListing,
    openGiveawayCreate,
    saveListing,
    getSalePriceForSave,
    saveInlineDetailListing,
    removeSelectedFromListing,
    deleteSelectedGroups,
    persistMyGroupsLayout,
    toggleMyGroupPin,
    handleMyGroupsDragEnd,
    copyReferralLink,
    copyPrivateEntryLink,
    addBot,
    startBotAdminSetup,
    selectGlobalDirection,
    selectTopSection,
    resetTopFilters,
    submitPlacement,
    openStarsPayment,
    openNftTransfer,
    reviewNftRecipient,
    prepareNftTransfer,
  };
}

export type HomeController = ReturnType<typeof useHomeController>;
