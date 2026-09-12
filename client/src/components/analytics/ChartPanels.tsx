import { useMemo } from "react";
import { BarChart3 } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { formatCatalogDate as date, formatCatalogNumber as n, type CatalogLanguage } from "@/lib/catalog-format";

export type AudienceSnapshot = {
  membersCount: number;
  messagesCount: number;
  joinedCount: number;
  recordedAt: Date;
};

export type TelegramAnalyticsPoint = { at: number; value: number };
export type TelegramAnalyticsGraph = { series: Array<{ key: string; label: string; points: TelegramAnalyticsPoint[] }> };
export type TelegramAnalyticsSummary = { notificationsEnabled?: { part?: number; total?: number } };

export function AudienceGrowthChart({ snapshots, language, embedded = false }: { snapshots: AudienceSnapshot[]; language: CatalogLanguage; embedded?: boolean }) {
  const dateFormatter = new Intl.DateTimeFormat(language === "en" ? "en-US" : "ru-RU", { day: "numeric", month: "short" });
  const pointsByDate = new Map<string, AudienceSnapshot>();
  [...snapshots]
    .sort((left, right) => new Date(left.recordedAt).getTime() - new Date(right.recordedAt).getTime())
    .forEach(snapshot => {
      const recordedAt = new Date(snapshot.recordedAt);
      pointsByDate.set(recordedAt.toISOString().slice(0, 10), snapshot);
    });
  const chartData = Array.from(pointsByDate.values()).map(snapshot => ({
    date: dateFormatter.format(new Date(snapshot.recordedAt)),
    members: Math.max(0, snapshot.membersCount),
  }));
  const first = chartData[0];
  const last = chartData.at(-1);
  const netGrowth = first && last ? last.members - first.members : 0;
  return (
    <section className={embedded ? "" : "rounded-xl border border-white/8 bg-white/[0.025] p-3"}>
      {!embedded && <div className="flex items-start justify-between gap-3">
        <span>
          <b className="block text-sm text-slate-100">{language === "en" ? "Audience growth" : "Динамика аудитории"}</b>
          <small className="mt-1 block text-[10px] text-slate-500">{language === "en" ? "Recorded by @TG_TOPBOT from the first observation." : "Снимки @TG_TOPBOT с первого наблюдения."}</small>
        </span>
        {first && last && <b className={`text-xs ${netGrowth > 0 ? "text-emerald-300" : netGrowth < 0 ? "text-rose-300" : "text-slate-400"}`}>{netGrowth > 0 ? "+" : ""}{n(netGrowth, language)}</b>}
      </div>}
      {chartData.length >= 2 ? (
        <ChartContainer config={{ members: { label: language === "en" ? "Members" : "Участники", color: "#4d96ff" } }} className={`${embedded ? "" : "mt-3"} h-36 w-full`}>
          <AreaChart accessibilityLayer data={chartData} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="audience-growth-fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="5%" stopColor="#4d96ff" stopOpacity={0.38} />
                <stop offset="95%" stopColor="#4d96ff" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.08)" />
            <XAxis dataKey="date" axisLine={false} tickLine={false} tickMargin={8} minTickGap={22} />
            <ChartTooltip cursor={{ stroke: "rgba(148, 184, 255, 0.4)", strokeWidth: 1 }} content={<ChartTooltipContent indicator="line" />} />
            <Area dataKey="members" type="monotone" stroke="#71a5ff" strokeWidth={2} fill="url(#audience-growth-fill)" />
          </AreaChart>
        </ChartContainer>
      ) : (
        <div aria-label={language === "en" ? "Neutral line: insufficient data" : "Нейтральная линия: данных пока недостаточно"} className={`${embedded ? "" : "mt-3"} flex h-36 items-center rounded-lg bg-black/15 px-3`}>
          <svg viewBox="0 0 320 72" preserveAspectRatio="none" className="h-16 w-full" aria-hidden="true">
            <path d="M4 38 C48 36, 76 40, 116 37 S188 36, 226 38 S278 35, 316 37" fill="none" stroke="rgba(143, 196, 255, 0.52)" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
      )}
    </section>
  );
}

export function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-[#111720] p-3">
      <small className="block text-[11px] text-slate-500">{label}</small>
      <b className="mt-1 block text-lg font-semibold">{value}</b>
      <small className="mt-1 block text-[10px] text-slate-500">{note}</small>
    </div>
  );
}

const TELEGRAM_SERIES_LABELS: Record<string, string> = {
  "Total followers": "Всего подписчиков",
  "Followers": "Подписчики",
  "Joined": "Подписались",
  "Left": "Отписались",
  "Views": "Просмотры",
  "Shares": "Пересылки",
  "Reactions": "Реакции",
  "Messages": "Сообщения",
  "Members": "Участники",
  "New members": "Новые участники",
  "Muted": "Отключили уведомления",
  "Enabled": "Уведомления включены",
};

function telegramSeriesLabel(label: string) {
  return TELEGRAM_SERIES_LABELS[label] ?? label;
}

function telegramSeriesColor(label: string, fallback: string) {
  if (label === "Joined" || label === "New members") return "#57d5a2";
  if (label === "Left") return "#f26667";
  return fallback;
}

export function telegramNotificationPercent(summary: unknown) {
  if (!summary || typeof summary !== "object") return null;
  const notifications = (summary as TelegramAnalyticsSummary).notificationsEnabled;
  const part = Number(notifications?.part);
  const total = Number(notifications?.total);
  return Number.isFinite(part) && Number.isFinite(total) && total > 0 ? Math.round((part / total) * 100) : null;
}

export function TelegramAnalyticsChart({ title, graph, range, accent = "#72a8ff", showLatest = true }: { title: string; graph?: TelegramAnalyticsGraph; range: "day" | "month" | "all"; accent?: string; showLatest?: boolean }) {
  const allPoints = (graph?.series ?? []).flatMap(item => item.points);
  const lastRecordedAt = allPoints.length ? Math.max(...allPoints.map(point => point.at)) : 0;
  const bucketGraph = lastRecordedAt > 0 && lastRecordedAt < Date.UTC(2000, 0, 1);
  const cutoff = range === "day" ? lastRecordedAt - 24 * 60 * 60 * 1_000 : range === "month" ? lastRecordedAt - 31 * 24 * 60 * 60 * 1_000 : 0;
  const series = (graph?.series ?? []).map(item => ({ ...item, points: bucketGraph ? item.points : item.points.filter(point => point.at >= cutoff) })).filter(item => item.points.length > 0).slice(0, 3);
  const points = series.flatMap(item => item.points);
  if (!points.length) return <div className="rounded-xl border border-white/8 bg-black/10 p-3"><b className="block text-xs text-slate-200">{title}</b><p className="mt-1 text-[10px] leading-4 text-slate-500">Telegram не отдал этот график за выбранный период.</p></div>;
  const minX = Math.min(...points.map(point => point.at));
  const maxX = Math.max(...points.map(point => point.at));
  const minY = Math.min(...points.map(point => point.value));
  const maxY = Math.max(...points.map(point => point.value));
  const spanX = Math.max(1, maxX - minX);
  const spanY = Math.max(1, maxY - minY);
  const colors = [accent, "#57d5a2", "#f7b955"];
  const periodLabel = bucketGraph ? "Распределение, которое отдал Telegram" : `до ${new Date(maxX).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}`;
  const latestValue = series.length === 1 ? series[0].points.at(-1)?.value ?? null : null;
  return <div className="rounded-xl border border-white/8 bg-black/10 p-3"><div className="flex items-start justify-between gap-2"><span><b className="block text-xs text-slate-100">{title}</b><small className="mt-0.5 block text-[10px] text-slate-500">Официальный график Telegram · {periodLabel}</small></span>{showLatest && latestValue !== null ? <b className="text-sm text-slate-100">{Math.round(latestValue).toLocaleString("ru-RU")}</b> : null}</div><svg className="mt-3 h-28 w-full overflow-visible" viewBox="0 0 300 112" role="img" aria-label={title}>{[28, 56, 84].map(y => <line key={y} x1="0" y1={y} x2="300" y2={y} stroke="rgba(148,163,184,.16)" strokeWidth="1" />)}{series.map((item, index) => <polyline key={item.key} fill="none" stroke={telegramSeriesColor(item.label, colors[index])} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={item.points.map(point => `${((point.at - minX) / spanX) * 300},${94 - ((point.value - minY) / spanY) * 78}`).join(" ")} />)}</svg><div className="mt-1 flex min-w-0 flex-wrap gap-x-3 gap-y-1">{series.map((item, index) => <small key={item.key} className="flex min-w-0 items-center gap-1 text-[9px] text-slate-500"><i className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: telegramSeriesColor(item.label, colors[index]) }} />{telegramSeriesLabel(item.label)}</small>)}</div></div>;
}

export function GramBalanceChart({ transactions, currentBalance, language }: { transactions: Array<{ amount: number; createdAt: Date }>; currentBalance: number; language: CatalogLanguage }) {
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

  return <div className="tg-gram-balance-chart mt-4 rounded-xl border border-white/8 bg-[#0b1017] p-3">
    <div className="flex items-start justify-between gap-3"><span><small className="block text-[10px] uppercase tracking-[0.12em] text-slate-500">{language === "en" ? "GRAM balance dynamics" : "Динамика GRAM"}</small><b className="mt-1 block text-xl font-semibold text-slate-100">{displayBalance} GRAM</b></span><span className="grid h-8 w-8 place-items-center rounded-lg border border-[#3f8cff]/25 bg-[#3f8cff]/10 text-[#a6c8ff]"><BarChart3 className="h-4 w-4" /></span></div>
    <svg viewBox="0 0 264 74" preserveAspectRatio="none" className="mt-3 h-20 w-full overflow-visible" role="img" aria-label={language === "en" ? "GRAM balance chart based on recorded operations" : "График GRAM на основе зафиксированных операций"}>
      <defs><linearGradient id="gram-balance-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="var(--tg-chart-fill)" stopOpacity="0.28" /><stop offset="100%" stopColor="var(--tg-chart-fill)" stopOpacity="0" /></linearGradient></defs>
      <path d={`M 16 66 L ${linePoints.split(" ").join(" L ")} L 248 66 Z`} fill="url(#gram-balance-fill)" />
      <polyline points={linePoints} fill="none" stroke="var(--tg-chart-stroke)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {points.length > 0 && <circle cx="248" cy={toY(points.at(-1)!.balance)} r="2.75" fill="var(--tg-chart-dot)" />}
    </svg>
    <div className="mt-1 flex items-center justify-between text-[9px] text-slate-600"><span>{points[0] ? date(points[0].createdAt, language) : language === "en" ? "No operations yet" : "Операций пока нет"}</span><span>{points.at(-1) ? date(points.at(-1)!.createdAt, language) : language === "en" ? "Current" : "Сейчас"}</span></div>
  </div>;
}
