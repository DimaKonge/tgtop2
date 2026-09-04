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

type OwnerPageProps = Pick<HomeController, "user" | "setPage" | "language" | "salePriceTon" | "ui" | "tx" | "nfts" | "publicOwner" | "openGroup">;

export function OwnerPage(props: OwnerPageProps) {
  const {
    user,
    setPage,
    language,
    salePriceTon,
    ui,
    tx,
    nfts,
    publicOwner,
    openGroup,
  } = props;
  return (
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
  );
}
