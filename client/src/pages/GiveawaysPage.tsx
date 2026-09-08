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

type GiveawaysPageProps = Pick<HomeController, "user" | "isAuthenticated" | "giveaways" | "mine" | "giveawayCreateOpen" | "setGiveawayCreateOpen" | "giveawayGroupId" | "setGiveawayGroupId" | "giveawayTitle" | "setGiveawayTitle" | "giveawayPrizeTitle" | "setGiveawayPrizeTitle" | "giveawayRules" | "setGiveawayRules" | "giveawayEndsAt" | "setGiveawayEndsAt" | "giveawayBoostOnly" | "setGiveawayBoostOnly" | "createGiveaway" | "joinGiveaway">;

export function GiveawaysPage(props: GiveawaysPageProps) {
  const {
    user,
    isAuthenticated,
    giveaways,
    mine,
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
    createGiveaway,
    joinGiveaway,
  } = props;
  return (
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
  );
}
