export function canEnterTopRanking(groupStatus: string) {
  return groupStatus === "pending" || groupStatus === "listed";
}
