import type { Group, Slot } from "@/lib/tgTop-domain";

export const getRankingFloorGram = (_slotNumber: number) => 0.1;
export const getMinimumRankingBidGram = (slot: Pick<Slot, "slotNumber" | "bidAmount" | "group">) => {
  const floor = getRankingFloorGram(slot.slotNumber);
  if (!slot.group) return floor;
  return Math.max(floor, Math.round((slot.bidAmount / 1000 + 0.1) * 10) / 10);
};
export const MAX_RANKING_BID_GRAM = 1_000;
export const MAX_RANKING_SLIDER_GRAM = 100;
export const getSimulatedRankingEntries = (slots: Slot[], candidateGroupId: number, candidateCategory: Group["category"], bidAmountGram: number) => {
  const candidateBid = Math.round(bidAmountGram * 1000);
  if (!Number.isSafeInteger(candidateBid) || candidateBid <= 0 || candidateBid > MAX_RANKING_BID_GRAM * 1000) return [];
  const remaining = slots.reduce<Array<{ groupId: number; category: Group["category"]; bidAmount: number; heldSince: Date }>>((entries, slot) => {
    if (slot.group && slot.group.id !== candidateGroupId) entries.push({ groupId: slot.group.id, category: slot.group.category, bidAmount: slot.bidAmount, heldSince: new Date(slot.updatedAt ?? 0) });
    return entries;
  }, []).concat({ groupId: candidateGroupId, category: candidateCategory, bidAmount: candidateBid, heldSince: new Date() })
    .sort((left, right) => right.bidAmount - left.bidAmount || left.heldSince.getTime() - right.heldSince.getTime() || left.groupId - right.groupId);
  const placements: Array<{ slotNumber: number; groupId: number; category: Group["category"] }> = [];
  for (const slot of [...slots].sort((left, right) => left.slotNumber - right.slotNumber)) {
    const entryIndex = remaining.findIndex(entry => entry.bidAmount >= getRankingFloorGram(slot.slotNumber) * 1000);
    const entry = entryIndex >= 0 ? remaining.splice(entryIndex, 1)[0] : undefined;
    if (entry) placements.push({ slotNumber: slot.slotNumber, groupId: entry.groupId, category: entry.category });
  }
  return placements;
};
export const getSimulatedRankingSlotNumber = (slots: Slot[], candidateGroupId: number, bidAmountGram: number, candidateCategory?: Group["category"]) => {
  const category = candidateCategory ?? slots.find(slot => slot.group?.id === candidateGroupId)?.group?.category ?? "Каналы";
  return getSimulatedRankingEntries(slots, candidateGroupId, category, bidAmountGram).find(entry => entry.groupId === candidateGroupId)?.slotNumber ?? null;
};
export const getSimulatedRankingTypePosition = (slots: Slot[], candidateGroupId: number, candidateCategory: Group["category"], bidAmountGram: number) => {
  const typeEntries = getSimulatedRankingEntries(slots, candidateGroupId, candidateCategory, bidAmountGram).filter(entry => entry.category === candidateCategory);
  const index = typeEntries.findIndex(entry => entry.groupId === candidateGroupId);
  return index >= 0 ? index + 1 : null;
};
