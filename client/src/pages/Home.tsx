import { useMemo, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ArrowLeft, BarChart3, ChevronRight, Filter, FolderPlus, LayoutGrid, Plus, Trophy, UserRound, Users } from "lucide-react";
import { toast } from "sonner";

type Page = "top" | "catalog" | "mine" | "details" | "profile";
type Audience = "all" | "small" | "medium" | "large";
type Group = {
  id: number; chatId: string; title: string; username: string | null; description: string | null; avatarFileId: string | null;
  membersCount: number; ownerOpenId: string; category: "Каналы" | "Чаты"; country: string; status: "listed" | "rented" | "sold" | "pending";
  messagesCount: number; joinedCount: number; leavesCount: number; invitedCount: number; lastPostViews: number; lastPostAt: Date | null; lastStatsAt: Date | null; listedAt: Date | null; createdAt: Date;
};
type Slot = { id: number; slotNumber: number; bidAmount: number; group: Group | null };
const n = (value: number) => new Intl.NumberFormat("ru-RU").format(value);
const date = (value?: Date | null) => value ? new Date(value).toLocaleDateString("ru-RU", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const getTelegramAvatarSrc = (group: Group) => group.avatarFileId
  ? `/api/telegram-avatar/${group.chatId}`
  : group.username
    ? `https://t.me/i/userpic/320/${group.username}.jpg`
    : null;

function Avatar({ group, large = false, compact = false }: { group: Group; large?: boolean; compact?: boolean }) {
  const [failed, setFailed] = useState(false);
  const size = large ? "h-16 w-16" : compact ? "h-9 w-9" : "h-11 w-11";
  const avatarSrc = getTelegramAvatarSrc(group);
  return <span className={`${size} grid shrink-0 place-items-center overflow-hidden rounded-xl border border-white/10 bg-[#1b2430] text-sm font-semibold text-slate-200`}>
    {avatarSrc && !failed ? <img src={avatarSrc} alt="" className="h-full w-full object-cover" onError={() => setFailed(true)} /> : group.title.slice(0, 1).toUpperCase()}
  </span>;
}

type GroupCardVariant = "lead" | "secondary" | "compact" | "list";

function GroupCard({ group, variant = "list", onClick }: { group?: Group | null; variant?: GroupCardVariant; onClick: () => void }) {
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
  const shellStyle = compact ? "flex h-full flex-col items-center justify-center gap-2 text-center" : "flex h-full items-center gap-3";
  const avatarSrc = group ? getTelegramAvatarSrc(group) : null;
  return <button onClick={onClick} className={`relative w-full overflow-hidden rounded-2xl border text-left transition-colors hover:border-[#3f8cff]/45 active:scale-[0.99] ${cardStyle}`}>
    {group && rankingPlacement ? <><>{avatarSrc && !imageFailed ? <img src={avatarSrc} alt="" className="absolute inset-0 h-full w-full object-cover" onError={() => setImageFailed(true)} /> : null}</><span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,10,15,0.06)_8%,rgba(7,10,15,0.82)_100%)]" /><span className={`absolute inset-x-0 bottom-0 p-${compact ? "2" : lead ? "6" : "4"}`}><b className={`${lead ? "text-xl" : compact ? "text-[11px]" : "text-sm"} block truncate font-semibold text-white`}>{group.title}</b><small className={`mt-1 block truncate text-xs text-slate-200/80 ${compact ? "hidden" : ""}`}>{group.username ? `@${group.username}` : group.category} · {n(group.membersCount)} участников</small><small className={`mt-1 block text-[10px] font-medium tracking-wide text-[#a6c8ff] ${compact ? "hidden" : ""}`}>ПРОВЕРЕНА TG TOP</small></span></> : group ? <span className={shellStyle}><Avatar group={group} large={lead} compact={compact} /><span className={compact ? "w-full min-w-0" : "min-w-0 flex-1"}><b className={`${lead ? "text-xl" : compact ? "text-[11px]" : "text-sm"} block truncate font-semibold text-slate-100`}>{group.title}</b><small className={`mt-1 block truncate text-xs text-slate-500 ${compact ? "hidden" : ""}`}>{group.username ? `@${group.username}` : group.category} · {n(group.membersCount)} участников</small></span><ChevronRight className="h-4 w-4 shrink-0 text-slate-600" /></span> : rankingPlacement ? <span className="absolute inset-0 grid place-items-center"><span className="flex flex-col items-center gap-2 text-center"><span className={`${lead ? "h-16 w-16" : compact ? "h-9 w-9" : "h-11 w-11"} grid place-items-center rounded-xl border border-dashed border-white/20 text-slate-500`}><Plus className="h-4 w-4" /></span><small className={`font-light tracking-wide text-slate-500 ${compact ? "text-[9px]" : "text-[11px]"}`}>Добавить группу</small></span></span> : <span className={shellStyle}><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-dashed border-white/20 text-slate-500"><Plus className="h-4 w-4" /></span><span><b className="block text-sm font-light text-slate-300">Добавить группу</b></span></span>}
  </button>;
}

function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return <div className="rounded-xl border border-white/8 bg-[#111720] p-3"><small className="block text-[11px] text-slate-500">{label}</small><b className="mt-1 block text-lg font-semibold">{value}</b><small className="mt-1 block text-[10px] text-slate-500">{note}</small></div>;
}

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const [page, setPage] = useState<Page>("top");
  const [category, setCategory] = useState<"Все" | "Каналы" | "Чаты">("Все");
  const [country, setCountry] = useState("Все");
  const [audience, setAudience] = useState<Audience>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [targetSlot, setTargetSlot] = useState<Slot | null>(null);
  const [amount, setAmount] = useState("0.1");

  const slotsQuery = trpc.tgTop.getSlots.useQuery({ category, country: country === "Все" ? "Global" : country });
  const slots = (slotsQuery.data ?? []) as Slot[];
  const groupsQuery = trpc.tgTop.getGroups.useQuery({ category, country });
  const listedGroups = (groupsQuery.data ?? []) as Group[];
  const mineQuery = trpc.tgTop.myGroups.useQuery(undefined, { enabled: isAuthenticated });
  const mine = (mineQuery.data ?? []) as Group[];
  const accountQuery = trpc.tgTop.getAccount.useQuery(undefined, { enabled: isAuthenticated });
  const account = accountQuery.data as { user?: { bonusBalance: number; mainBalanceTon: string | number }; transactions: Array<{ id: number; amount: number; kind: "group_connection_bonus" | "listing_spend"; createdAt: Date; groupId: number | null; groupTitle: string | null; groupUsername: string | null }> } | undefined;
  const detailQuery = trpc.tgTop.getGroupDetail.useQuery({ groupId: selectedGroupId ?? 0 }, { enabled: selectedGroupId !== null });
  const detail = detailQuery.data as { group: Group; snapshots: Array<{ membersCount: number; messagesCount: number; joinedCount: number; recordedAt: Date }> } | undefined;

  const listWithCredits = trpc.tgTop.listGroupWithCredits.useMutation({
    onSuccess: () => { toast.success("Группа размещена в каталоге"); void utils.tgTop.myGroups.invalidate(); void utils.tgTop.getGroups.invalidate(); },
    onError: error => toast.error(error.message),
  });
  const placeBid = trpc.tgTop.placeBid.useMutation({
    onSuccess: () => { toast.success("Размещение обновлено"); setTargetSlot(null); setAmount("0.1"); void utils.tgTop.getSlots.invalidate(); },
    onError: error => toast.error(error.message),
  });

  const matchesAudience = (group: Group | null) => {
    if (!group || audience === "all") return true;
    if (audience === "small") return group.membersCount < 1000;
    if (audience === "medium") return group.membersCount >= 1000 && group.membersCount < 10000;
    return group.membersCount >= 10000;
  };
  const visibleGroups = useMemo(() => listedGroups.filter(matchesAudience), [listedGroups, audience]);
  const board = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const slot = slots.find(item => item.slotNumber === index + 1);
    return slot && matchesAudience(slot.group) ? slot : { id: slot?.id ?? 0, slotNumber: index + 1, bidAmount: 0, group: null };
  }), [slots, audience]);
  const occupiedIds = new Set(board.map(slot => slot.group?.id).filter((id): id is number => Boolean(id)));
  const generalList = visibleGroups.filter(group => !occupiedIds.has(group.id));
  const leadSlot = board[0];
  const secondTier = board.slice(1, 3);
  const thirdTier = board.slice(3, 7);
  const bonus = ((account?.user?.bonusBalance ?? user?.bonusBalance ?? 0) / 100).toFixed(1);
  const mainTon = Number(account?.user?.mainBalanceTon ?? 0).toFixed(2);
  const transactions = account?.transactions ?? [];
  const telegramAvatar = typeof window !== "undefined" ? window.Telegram?.WebApp?.initDataUnsafe?.user?.photo_url : undefined;
  const selectedSlot = detail ? slots.find(slot => slot.group?.id === detail.group.id) : undefined;
  const ownsDetail = detail?.group.ownerOpenId === user?.openId;

  const openGroup = (id: number) => { setSelectedGroupId(id); setPage("details"); };
  const openMine = (slot?: Slot) => { setTargetSlot(slot ?? null); setPage("mine"); };
  const addBot = (kind: "channel" | "group") => window.open(`https://t.me/TGTOP_robot?${kind === "channel" ? "startchannel=admin" : "startgroup=admin"}`, "_blank");
  const submitPlacement = (group: Group) => {
    if (!targetSlot?.id) return toast.error("Эта позиция будет доступна после создания рейтинговой доски.");
    const value = Number(amount);
    const current = targetSlot.bidAmount / 1000;
    if (!Number.isFinite(value) || value <= current) return toast.error(`Укажите сумму выше ${current.toFixed(1)} TON`);
    placeBid.mutate({ slotId: targetSlot.id, groupId: group.id, bidAmount: value, currentBid: `${value.toFixed(1)} TON` });
  };

  return <div className="tg-shell min-h-screen bg-[#0b0f14] text-slate-100">
    <header className="sticky top-0 z-40 border-b border-white/8 bg-[#0b0f14]/95 px-4 py-3 backdrop-blur"><div className="mx-auto flex max-w-3xl items-center justify-between"><button onClick={() => setPage("top")} className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#3f8cff] text-[11px] font-black tracking-tighter">TG</span><b className="text-sm tracking-tight">TG TOP</b></button><button onClick={() => setPage("profile")} className="flex items-center gap-2"><span className="hidden text-right sm:block"><b className="block text-xs">{user?.name ?? "Telegram user"}</b><small className="block text-[10px] text-slate-500">{bonus} GRAM</small></span><span className="grid h-9 w-9 overflow-hidden rounded-full border border-white/10 bg-[#1b2430] text-xs font-semibold"><>{(user?.avatarUrl ?? telegramAvatar) ? <img src={user?.avatarUrl ?? telegramAvatar} alt="" className="h-full w-full object-cover" /> : (user?.name?.slice(0, 1).toUpperCase() ?? "T")}</></span></button></div></header>

    <main className="mx-auto max-w-3xl px-4 pb-28 pt-5">
      {page === "top" && <section className="space-y-4"><div className="rounded-2xl border border-white/8 bg-[#111720] p-2 shadow-[0_16px_40px_rgba(0,0,0,0.14)]"><div className="flex items-center justify-between px-2 py-1"><span className="flex items-center gap-2"><h1 className="text-2xl font-semibold tracking-tight">Global</h1><span aria-live="polite" className="rounded-full border border-[#3f8cff]/25 bg-[#3f8cff]/10 px-2 py-0.5 text-[11px] font-medium text-[#a6c8ff]">{n(visibleGroups.length)} групп</span></span><Button onClick={() => setFiltersOpen(true)} variant="outline" className="h-9 border-white/10 bg-[#0b0f14] px-3 text-slate-200"><Filter className="mr-2 h-4 w-4" />Фильтр</Button></div><ToggleGroup type="single" value={category} onValueChange={value => { if (value) setCategory(value as typeof category); }} variant="outline" size="sm" className="mt-2 grid w-full grid-cols-3 overflow-hidden rounded-xl border border-white/8 bg-[#0b0f14] p-1"><ToggleGroupItem value="Все" className="h-9 border-0 text-xs text-slate-400 data-[state=on]:rounded-lg data-[state=on]:bg-[#3f8cff] data-[state=on]:text-white">Все</ToggleGroupItem><ToggleGroupItem value="Каналы" className="h-9 border-0 text-xs text-slate-400 data-[state=on]:rounded-lg data-[state=on]:bg-[#3f8cff] data-[state=on]:text-white">Каналы</ToggleGroupItem><ToggleGroupItem value="Чаты" className="h-9 border-0 text-xs text-slate-400 data-[state=on]:rounded-lg data-[state=on]:bg-[#3f8cff] data-[state=on]:text-white">Чаты</ToggleGroupItem></ToggleGroup></div><div className="space-y-3"><GroupCard group={leadSlot.group} variant="lead" onClick={() => leadSlot.group ? openGroup(leadSlot.group.id) : openMine(leadSlot)} /><div className="grid grid-cols-2 gap-3">{secondTier.map(slot => <GroupCard key={slot.slotNumber} group={slot.group} variant="secondary" onClick={() => slot.group ? openGroup(slot.group.id) : openMine(slot)} />)}</div><div className="grid grid-cols-4 gap-2">{thirdTier.map(slot => <GroupCard key={slot.slotNumber} group={slot.group} variant="compact" onClick={() => slot.group ? openGroup(slot.group.id) : openMine(slot)} />)}</div></div><section className="pt-2"><div className="space-y-2">{generalList.map(group => <GroupCard key={group.id} group={group} variant="list" onClick={() => openGroup(group.id)} />)}{generalList.length === 0 && <div className="rounded-2xl border border-dashed border-white/12 bg-[#111720] p-6 text-center"><p className="text-sm font-medium text-slate-300">В TG TOP пока нет площадок</p><p className="mt-1 text-xs text-slate-500">Добавьте первую группу через личную папку.</p></div>}</div></section></section>}

      {page === "catalog" && <section className="space-y-4"><div className="flex items-end justify-between"><div><p className="text-xs font-medium uppercase tracking-[0.16em] text-[#72a8ff]">Маркетплейс</p><h1 className="mt-1 text-2xl font-semibold">Каталог групп</h1></div><Button onClick={() => setFiltersOpen(true)} variant="outline" className="border-white/10 bg-[#111720] text-slate-200"><Filter className="mr-2 h-4 w-4" />Фильтр</Button></div><div className="overflow-hidden rounded-2xl border border-white/8 bg-[#111720] divide-y divide-white/7">{visibleGroups.map(group => <button key={group.id} onClick={() => openGroup(group.id)} className="flex w-full items-center gap-3 px-4 py-4 text-left"><Avatar group={group} /><span className="min-w-0 flex-1"><b className="block truncate text-sm">{group.title}</b><small className="mt-1 block text-xs text-slate-500">{group.username ? `@${group.username}` : group.category} · {n(group.membersCount)} участников</small></span><ChevronRight className="h-4 w-4 text-slate-600" /></button>)}{visibleGroups.length === 0 && <p className="p-8 text-center text-sm text-slate-500">По этому фильтру площадок пока нет.</p>}</div></section>}

      {page === "mine" && <section className="space-y-4"><button onClick={() => setPage(targetSlot ? "top" : "profile")} className="flex items-center gap-1 text-xs text-slate-400"><ArrowLeft className="h-4 w-4" />Назад</button><div><p className="text-xs font-medium uppercase tracking-[0.16em] text-[#72a8ff]">Личная папка</p><h1 className="mt-1 text-2xl font-semibold">Мои группы</h1><p className="mt-1 text-sm text-slate-500">Подключите бота, чтобы получить статистику и разместить площадку.</p></div>{targetSlot && <div className="rounded-xl border border-[#3f8cff]/30 bg-[#3f8cff]/10 p-3"><p className="text-sm">Выберите группу для размещения</p><div className="mt-2 flex gap-2"><Input value={amount} type="number" step="0.1" onChange={event => setAmount(event.target.value)} className="h-9 border-white/10 bg-[#0b0f14]" /><span className="flex items-center text-xs text-slate-400">TON</span></div></div>}<div className="grid grid-cols-2 gap-2"><button onClick={() => addBot("channel")} className="rounded-xl border border-white/10 bg-[#111720] px-3 py-3 text-sm font-semibold">+ Канал</button><button onClick={() => addBot("group")} className="rounded-xl border border-white/10 bg-[#111720] px-3 py-3 text-sm font-semibold">+ Чат</button></div><div className="space-y-2">{mine.map(group => <div key={group.id} className="rounded-xl border border-white/8 bg-[#111720] p-3"><button onClick={() => openGroup(group.id)} className="flex w-full items-center gap-3 text-left"><Avatar group={group} /><span className="min-w-0 flex-1"><b className="block truncate text-sm">{group.title}</b><small className="mt-1 block text-xs text-slate-500">{group.username ? `@${group.username}` : group.category} · {n(group.membersCount)}</small></span><ChevronRight className="h-4 w-4 text-slate-600" /></button><div className="mt-3 flex gap-2">{targetSlot && <button onClick={() => submitPlacement(group)} className="flex-1 rounded-lg bg-[#3f8cff] py-2 text-xs font-semibold">Разместить</button>}{group.status === "pending" && <button onClick={() => listWithCredits.mutate({ groupId: group.id })} className="flex-1 rounded-lg border border-white/10 py-2 text-xs font-semibold">В каталог · 0.1 GRAM</button>}</div></div>)}{mine.length === 0 && <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center"><FolderPlus className="mx-auto h-7 w-7 text-slate-600" /><p className="mt-3 text-sm">Групп пока нет</p><p className="mt-1 text-xs text-slate-500">Добавьте @TGTOP_robot в администраторы.</p></div>}</div></section>}

      {page === "details" && <section className="space-y-4">{detail ? <><button onClick={() => setPage("top")} className="flex items-center gap-1 text-xs text-slate-400"><ArrowLeft className="h-4 w-4" />Назад</button><div className="rounded-2xl border border-white/8 bg-[#111720] p-5"><div className="flex items-start gap-4"><Avatar group={detail.group} large /><span className="min-w-0"><h1 className="truncate text-xl font-semibold">{detail.group.title}</h1><p className="mt-1 text-sm text-[#72a8ff]">{detail.group.username ? `@${detail.group.username}` : detail.group.category}</p><p className="mt-3 text-sm leading-5 text-slate-400">{detail.group.description || "Описание не передано Telegram API."}</p></span></div><div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-white/8 pt-4 text-xs"><span className="rounded-md bg-white/5 px-2 py-1 text-slate-300">{detail.group.status === "listed" ? `В каталоге с ${date(detail.group.listedAt)}` : "Не размещена в каталоге"}</span><span className="rounded-md bg-white/5 px-2 py-1 text-slate-400">{selectedSlot ? "Выделенная позиция" : "Общий список"}</span></div>{ownsDetail && <button onClick={() => openMine()} className="mt-3 w-full rounded-lg border border-[#3f8cff]/35 bg-[#3f8cff]/10 py-2 text-xs font-semibold text-[#a6c8ff]">Управлять этой группой</button>}</div><div className="grid grid-cols-2 gap-3"><Metric label="Участники" value={n(detail.group.membersCount)} note="последнее измерение" /><Metric label="Прирост" value={detail.snapshots.length > 1 ? n(detail.snapshots.at(-1)!.membersCount - detail.snapshots[0].membersCount) : "—"} note={detail.snapshots.length > 1 ? "за период наблюдения" : "данные накапливаются"} /><Metric label="Вступления" value={detail.group.joinedCount ? n(detail.group.joinedCount) : "—"} note="замеченные ботом" /><Metric label="Выходы" value={detail.group.leavesCount ? n(detail.group.leavesCount) : "—"} note="замеченные ботом" /></div><div className="grid grid-cols-2 gap-3"><Metric label="По приглашениям" value={detail.group.invitedCount ? n(detail.group.invitedCount) : "—"} note="когда Telegram передал ссылку" /><Metric label="Публикации" value={detail.group.messagesCount ? n(detail.group.messagesCount) : "—"} note="увиденные ботом" /></div><div className="rounded-2xl border border-white/8 bg-[#111720] p-4"><div className="flex justify-between"><span><b className="block text-sm">Динамика аудитории</b><small className="block mt-1 text-xs text-slate-500">Только снимки TG TOP.</small></span><BarChart3 className="h-5 w-5 text-slate-500" /></div><div className="mt-4 flex h-16 items-end gap-1 border-b border-white/8">{detail.snapshots.length ? detail.snapshots.slice(-16).map((snapshot, index) => <span key={index} className="min-w-1 flex-1 rounded-t bg-[#3f8cff]" style={{ height: `${Math.max(8, (snapshot.membersCount / Math.max(...detail.snapshots.map(item => item.membersCount), 1)) * 100)}%` }} />) : <p className="text-sm text-slate-500">Первый снимок будет создан при следующем обновлении.</p>}</div></div><div className="grid grid-cols-2 gap-3"><Metric label="В TG TOP с" value={date(detail.group.createdAt)} note="дата подключения" /><Metric label="Возраст площадки" value="—" note="Telegram не отдал дату создания" /><Metric label="Просмотры" value={detail.group.lastPostViews ? n(detail.group.lastPostViews) : "—"} note="последний доступный пост" /><Metric label="Обновлено" value={date(detail.group.lastStatsAt)} note="последние данные" /></div></> : <p className="py-16 text-center text-sm text-slate-500">Загружаем статистику…</p>}</section>}

      {page === "profile" && <section className="space-y-4"><div className="rounded-2xl border border-white/8 bg-[#111720] p-5"><div className="flex items-center gap-3"><span className="grid h-12 w-12 overflow-hidden rounded-full border border-white/10 bg-[#1b2430] text-sm font-semibold">{(user?.avatarUrl ?? telegramAvatar) ? <img src={user?.avatarUrl ?? telegramAvatar} alt="" className="h-full w-full object-cover" /> : (user?.name?.slice(0, 1).toUpperCase() ?? "T")}</span><span><h1 className="text-lg font-semibold">{user?.name ?? "Telegram user"}</h1><small className="text-xs text-slate-500">Личный кабинет TG TOP</small></span></div><div className="mt-5 grid grid-cols-2 gap-3"><Metric label="Основной баланс" value={`${mainTon} TON`} note="пополнения и оплаты" /><Metric label="Бонусный баланс" value={`${bonus} GRAM`} note="для размещения" /></div></div><section className="overflow-hidden rounded-2xl border border-white/8 bg-[#111720]"><div className="border-b border-white/8 px-4 py-4"><h2 className="text-sm font-semibold">История операций</h2><p className="mt-1 text-xs text-slate-500">Бонусы и списания по вашим площадкам</p></div>{transactions.length ? <div className="divide-y divide-white/7">{transactions.map(transaction => { const earned = transaction.amount > 0; const groupName = transaction.groupUsername ? `@${transaction.groupUsername}` : transaction.groupTitle ?? "TG TOP"; return <div key={transaction.id} className="flex items-center justify-between gap-3 px-4 py-3"><span className="min-w-0"><b className="block truncate text-sm">{earned ? "Бонус за подключение" : "Размещение в каталоге"}</b><small className="mt-1 block truncate text-xs text-slate-500">{groupName} · {date(transaction.createdAt)}</small></span><b className={`shrink-0 text-sm ${earned ? "text-[#72a8ff]" : "text-slate-300"}`}>{earned ? "+" : ""}{(transaction.amount / 100).toFixed(1)} GRAM</b></div>; })}</div> : <p className="px-4 py-8 text-center text-sm text-slate-500">Операцій поки немає.</p>}</section><button onClick={() => openMine()} className="flex w-full items-center justify-between rounded-xl border border-white/8 bg-[#111720] p-4 text-left"><span className="flex items-center gap-3"><Users className="h-5 w-5 text-[#72a8ff]" /><span><b className="block text-sm">Мои группы</b><small className="block mt-0.5 text-xs text-slate-500">Управление и листинг</small></span></span><ChevronRight className="h-4 w-4 text-slate-600" /></button></section>}
    </main>

    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/8 bg-[#0b0f14]/95 backdrop-blur"><div className="mx-auto grid max-w-3xl grid-cols-4 px-3 py-2">{([{ key: "top", label: "Топ", icon: Trophy }, { key: "catalog", label: "Каталог", icon: LayoutGrid }, { key: "mine", label: "Мои", icon: Users }, { key: "profile", label: "Профиль", icon: UserRound }] as const).map(item => { const Icon = item.icon; return <button key={item.key} onClick={() => item.key === "mine" ? openMine() : setPage(item.key)} className={`flex flex-col items-center gap-1 py-1 text-[10px] ${page === item.key ? "text-[#72a8ff]" : "text-slate-500"}`}><Icon className="h-4 w-4" />{item.label}</button>; })}</div></nav>

    <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}><SheetContent side="right" className="border-white/10 bg-[#10161f] text-slate-100"><SheetHeader><SheetTitle className="text-slate-100">Фильтр</SheetTitle><p className="text-xs text-slate-500">Обновляет карточки и весь список одновременно.</p></SheetHeader><div className="space-y-6 px-4"><div><p className="mb-2 text-xs text-slate-400">Тип площадки</p><div className="grid grid-cols-3 gap-2">{(["Все", "Каналы", "Чаты"] as const).map(item => <button key={item} onClick={() => setCategory(item)} className={`rounded-lg border px-2 py-2 text-xs ${category === item ? "border-[#3f8cff] bg-[#3f8cff]/15 text-[#a6c8ff]" : "border-white/10 text-slate-400"}`}>{item}</button>)}</div></div><div><p className="mb-2 text-xs text-slate-400">Страна / регион</p><div className="grid grid-cols-2 gap-2">{["Все", "Global", "UA", "RU", "EU", "US"].map(item => <button key={item} onClick={() => setCountry(item)} className={`rounded-lg border px-2 py-2 text-left text-xs ${country === item ? "border-[#3f8cff] bg-[#3f8cff]/15 text-[#a6c8ff]" : "border-white/10 text-slate-400"}`}>{item}</button>)}</div></div><div><p className="mb-2 text-xs text-slate-400">Количество участников</p><div className="grid grid-cols-2 gap-2">{([{ key: "all", label: "Все" }, { key: "small", label: "До 1 тыс." }, { key: "medium", label: "1–10 тыс." }, { key: "large", label: "От 10 тыс." }] as const).map(item => <button key={item.key} onClick={() => setAudience(item.key)} className={`rounded-lg border px-2 py-2 text-left text-xs ${audience === item.key ? "border-[#3f8cff] bg-[#3f8cff]/15 text-[#a6c8ff]" : "border-white/10 text-slate-400"}`}>{item.label}</button>)}</div></div></div><SheetFooter><Button variant="outline" onClick={() => { setCategory("Все"); setCountry("Все"); setAudience("all"); }} className="border-white/10 text-slate-300">Сбросить</Button><Button onClick={() => setFiltersOpen(false)} className="bg-[#3f8cff]">Показать</Button></SheetFooter></SheetContent></Sheet>
  </div>;
}
