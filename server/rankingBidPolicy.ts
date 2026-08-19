export const VACANT_RANKING_MINIMUM_MILLITON = 100;
export const RANKING_BID_STEP_MILLITON = 100;
export const MAX_RANKING_BID_MILLITON = 1_000_000;

export function getRankingFloorMilliTon(_slotNumber: number) {
  return VACANT_RANKING_MINIMUM_MILLITON;
}

export function getMinimumRankingBidMilliTon(currentBidMilliTon: number, occupied: boolean, floorMilliTon = VACANT_RANKING_MINIMUM_MILLITON) {
  return occupied
    ? Math.max(floorMilliTon, currentBidMilliTon + RANKING_BID_STEP_MILLITON)
    : floorMilliTon;
}

export function isQualifyingRankingBid(bidMilliTon: number, currentBidMilliTon: number, occupied: boolean, floorMilliTon = VACANT_RANKING_MINIMUM_MILLITON) {
  return bidMilliTon <= MAX_RANKING_BID_MILLITON
    && bidMilliTon % RANKING_BID_STEP_MILLITON === 0
    && bidMilliTon >= getMinimumRankingBidMilliTon(currentBidMilliTon, occupied, floorMilliTon);
}

export type RankingEntry = {
  bidAmount: number;
  heldSince: Date;
  groupId: number | null;
};

export function sortRankingEntriesByBid<T extends RankingEntry>(entries: T[]) {
  return [...entries].sort((left, right) => {
    const priceOrder = right.bidAmount - left.bidAmount;
    if (priceOrder) return priceOrder;
    const occupancyOrder = left.heldSince.getTime() - right.heldSince.getTime();
    if (occupancyOrder) return occupancyOrder;
    return Number(left.groupId ?? 0) - Number(right.groupId ?? 0);
  });
}

export function assignRankingEntriesToSlots<T extends RankingEntry>(entries: T[], slots: Array<{ slotNumber: number }>) {
  const remaining = sortRankingEntriesByBid(entries);
  return slots.map(slot => {
    const entryIndex = remaining.findIndex(entry => entry.bidAmount >= getRankingFloorMilliTon(slot.slotNumber));
    return entryIndex >= 0 ? remaining.splice(entryIndex, 1)[0] : undefined;
  });
}
