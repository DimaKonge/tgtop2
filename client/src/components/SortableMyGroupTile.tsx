import { useRef } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, GripVertical, Pin, PinOff, Star } from "lucide-react";
import { FullBleedCommunityArtwork as FullBleedGroupArtwork } from "@/components/CommunityArtwork";
import type { Group, Language } from "@/lib/tgTop-domain";

export function SortableMyGroupTile({
  group,
  language,
  accessLabel,
  disabled,
  onOpen,
  onTogglePin,
  onCreateGiveaway,
  selectionMode,
  selected,
  onSelect,
}: {
  group: Group;
  language: Language;
  accessLabel: string;
  disabled?: boolean;
  onOpen: () => void;
  onTogglePin: () => void;
  onCreateGiveaway: () => void;
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
          <small className="mt-0.5 block truncate text-[9px] text-slate-300/80">{accessLabel}</small>
        </span>
      </button>
      {status && <span className={`absolute right-0 top-1 z-10 max-w-[76%] truncate border-b border-l px-2.5 pb-1 pt-1 text-[7px] font-semibold leading-none shadow-md shadow-black/20 backdrop-blur-md [clip-path:polygon(12px_0,100%_0,100%_100%,0_100%,0_12px)] ${statusClass}`}>{status}</span>}
      {selectionMode ? (
        <span className={`absolute left-2 top-2 z-20 grid h-6 w-6 place-items-center rounded-full border backdrop-blur-sm ${selected ? "border-[#a6c8ff]/70 bg-[#3f8cff] text-white" : "border-white/25 bg-black/25 text-transparent"}`}><Check className="h-3.5 w-3.5" /></span>
      ) : (
        <>
          <button ref={setActivatorNodeRef} type="button" {...attributes} {...listeners} aria-label={isEnglish ? `Drag ${group.title}` : `Перетащить ${group.title}`} className="absolute bottom-2 left-2 z-20 grid h-6 w-6 touch-none place-items-center rounded-md bg-black/20 text-slate-200/80 backdrop-blur-sm transition-colors hover:bg-white/15 hover:text-white active:bg-[#3f8cff]/30"><GripVertical className="h-3.5 w-3.5" /></button>
          <div className="absolute bottom-2 right-2 z-20 flex items-center gap-1">
            <button type="button" onPointerDown={event => event.stopPropagation()} onClick={event => { event.stopPropagation(); onCreateGiveaway(); }} aria-label={isEnglish ? `Create giveaway for ${group.title}` : `Создать розыгрыш для ${group.title}`} className="grid h-6 w-6 place-items-center rounded-md bg-amber-300/12 text-amber-100 transition-colors hover:bg-amber-300/22"><Star className="h-3.5 w-3.5 fill-current" /></button>
            <button type="button" onPointerDown={event => event.stopPropagation()} onClick={event => { event.stopPropagation(); onTogglePin(); }} aria-label={group.ownerPinned ? (isEnglish ? "Unpin community" : "Открепить группу") : (isEnglish ? "Pin community" : "Закрепить группу")} className={`grid h-6 w-6 place-items-center rounded-md transition-colors ${group.ownerPinned ? "bg-[#3f8cff]/16 text-[#9cc3ff]" : "text-slate-500 hover:bg-white/7 hover:text-slate-200"}`}>{group.ownerPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}</button>
          </div>
        </>
      )}
    </article>
  );
}

export default SortableMyGroupTile;
