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

type CatalogPageProps = Pick<HomeController, "setFiltersOpen" | "language" | "salePriceTon" | "tx" | "visibleGroups" | "openGroup">;

export function CatalogPage(props: CatalogPageProps) {
  const {
    setFiltersOpen,
    language,
    salePriceTon,
    tx,
    visibleGroups,
    openGroup,
  } = props;
  return (
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
  );
}
