export const VACANT_RANKING_MINIMUM_MILLITON = 100;

export function getMinimumRankingBidMilliTon(currentBidMilliTon: number, occupied: boolean) {
  return occupied
    ? Math.max(VACANT_RANKING_MINIMUM_MILLITON, currentBidMilliTon + 1)
    : VACANT_RANKING_MINIMUM_MILLITON;
}

export function isQualifyingRankingBid(bidMilliTon: number, currentBidMilliTon: number, occupied: boolean) {
  return bidMilliTon >= getMinimumRankingBidMilliTon(currentBidMilliTon, occupied);
}
