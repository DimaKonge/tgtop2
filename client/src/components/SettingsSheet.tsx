import { Check, Moon, Palette, Settings2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { THEME_BACKGROUND_OPTIONS, useTheme, type Appearance, type ThemeAccent, type ThemeStyle } from "@/contexts/ThemeContext";
import { TgTopPyramidIcon } from "@/components/TgTopPyramidIcon";

export function SettingsSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { appearance, setAppearance, style, setStyle, accent, setAccent, background, setBackground } = useTheme();
  const appearanceItems: Array<{ value: Appearance; label: string; icon: typeof Moon }> = [
    { value: "dark", label: "Темная", icon: Moon },
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
              <Settings2 className="h-4 w-4 text-[color:var(--tg-accent)]" />
              Стиль интерфейса
            </div>
            <div className="grid grid-cols-2 gap-1 rounded-xl border border-white/8 bg-[#0b0f14] p-1">
              {styleItems.map(item => (
                <button
                  key={item.value}
                  onClick={() => setStyle(item.value)}
                  aria-pressed={style === item.value}
                  className={`h-8 rounded-md text-[11px] font-semibold transition-colors ${
                    style === item.value
                      ? "border border-[color:var(--tg-accent-border)] bg-[color:var(--tg-accent-soft)] text-[color:var(--tg-accent)] font-bold shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[10px] leading-4 text-slate-500">TG TOP сохраняет фирменную сетку, Clean делает оболочку спокойнее и ближе к Telegram-native интерфейсам.</p>
          </section>
          <section className="tg-clean-surface rounded-xl border border-white/8 bg-black/10 p-3 shadow-[0_8px_22px_rgba(2,8,16,0.12)]">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-300">
              <Moon className="h-4 w-4 text-[color:var(--tg-accent)]" />
              Тема
            </div>
            <div className="grid grid-cols-1 gap-1 rounded-xl border border-white/8 bg-[#0b0f14] p-1">
              {appearanceItems.map(item => {
                const Icon = item.icon;
                const active = appearance === item.value;
                return (
                  <button
                    key={item.value}
                    onClick={() => setAppearance(item.value)}
                    aria-label={item.label}
                    aria-pressed={active}
                    className={`flex h-8 items-center justify-center gap-1 rounded-md px-1 text-[10px] font-medium transition-colors ${
                      active
                        ? "border border-[color:var(--tg-accent-border)] bg-[color:var(--tg-accent-soft)] text-[color:var(--tg-accent)] font-semibold shadow-sm"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Icon className="h-3 w-3" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </section>
          <section className="tg-clean-surface rounded-xl border border-white/8 bg-black/10 p-3 shadow-[0_8px_22px_rgba(2,8,16,0.12)]">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-300">
              <Palette className="h-4 w-4 text-[color:var(--tg-accent)]" />
              Цветовой акцент
            </div>
            <div className="grid grid-cols-3 gap-2">
              {accentItems.map(item => (
                <button
                  key={item.value}
                  onClick={() => setAccent(item.value)}
                  aria-label={item.label}
                  aria-pressed={accent === item.value}
                  className={`flex min-h-[54px] flex-col items-center justify-center gap-1 rounded-lg border px-1 transition-colors ${
                    accent === item.value
                      ? "border-[color:var(--tg-accent)] bg-[color:var(--tg-accent-soft)] text-[color:var(--tg-accent)] font-medium shadow-sm"
                      : "border-white/8 bg-[#0b0f14] hover:border-white/20"
                  }`}
                >
                  <span className="h-6 w-6 rounded-md shadow-inner" style={{ backgroundColor: item.color }} />
                  <span className={`max-w-full truncate text-[9px] ${accent === item.value ? "font-semibold text-[color:var(--tg-accent)]" : "text-slate-400"}`}>{item.label}</span>
                </button>
              ))}
            </div>
          </section>
          <section className="tg-clean-surface rounded-xl border border-white/8 bg-black/10 p-3 shadow-[0_8px_22px_rgba(2,8,16,0.12)]">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-300">
              <Palette className="h-4 w-4 text-[color:var(--tg-accent)]" />
              Telegram-style фон
            </div>
            <p className="mb-2 text-[10px] leading-4 text-slate-500">Выбранный цвет также обновляет кубики, загрузку, кнопки, графики, фильтры и навигацию.</p>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-[380px] overflow-y-auto pr-1">
              {THEME_BACKGROUND_OPTIONS.map(item => {
                const active = background === item.value;
                const isTopHero = item.value === "black" || item.value === "ivory_white";
                const isBrandBlack = item.value === "black";
                const isWhite = item.value === "ivory_white";
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setBackground(item.value)}
                    aria-label={item.label}
                    aria-pressed={active}
                    style={{
                      background: isBrandBlack
                        ? "radial-gradient(circle at 50% 20%, #254e7a 0%, #080a0e 75%)"
                        : isWhite
                        ? "radial-gradient(circle at 50% 20%, #ffffff 0%, #d5dde8 85%)"
                        : `radial-gradient(circle at 50% 25%, color-mix(in srgb, ${item.accent} 70%, ${item.color}) 0%, ${item.color} 80%)`,
                    }}
                    className={`group relative flex w-full flex-col items-center justify-between overflow-hidden rounded-xl p-1.5 transition-all duration-150 ${
                      isTopHero ? "col-span-2 sm:col-span-2 h-[78px]" : "col-span-1 h-[74px]"
                    } ${
                      active
                        ? "ring-2 ring-white shadow-[0_0_14px_rgba(255,255,255,0.45)] scale-[1.03] z-10"
                        : "border border-white/15 hover:border-white/40 hover:scale-[1.02] shadow-sm"
                    }`}
                  >
                    <span className="flex w-full items-center justify-between">
                      {isBrandBlack ? (
                        <TgTopPyramidIcon className="h-4 w-4 text-[#72a8ff] drop-shadow-sm opacity-90 transition-transform group-hover:scale-110" />
                      ) : isWhite ? (
                        <TgTopPyramidIcon className="h-4 w-4 text-[#0f172a] drop-shadow-sm opacity-90 transition-transform group-hover:scale-110" />
                      ) : (
                        <span />
                      )}
                      {active ? (
                        <span className="grid h-4 w-4 place-items-center rounded-full bg-slate-900 text-white shadow-sm ring-1 ring-white/30">
                          <Check className="h-2.5 w-2.5 stroke-[3]" />
                        </span>
                      ) : (
                        <span className="h-4 w-4" />
                      )}
                    </span>
                    <span className="w-full truncate rounded-md bg-black/60 backdrop-blur-xs px-1 py-0.5 text-center text-[9.5px] font-medium text-white shadow-sm">
                      {isBrandBlack ? "TG TOP Black" : isWhite ? "White" : item.label}
                    </span>
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

export default SettingsSheet;
