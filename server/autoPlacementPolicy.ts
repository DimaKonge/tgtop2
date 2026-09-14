export type RankingBoardSlot = { id: number; slotNumber: number; groupId: number | null };

export function planVacantRankingAssignments(slots: RankingBoardSlot[], groupIds: number[]) {
  const occupied = new Set(slots.flatMap(slot => slot.groupId === null ? [] : [slot.groupId]));
  const vacantSlots = slots
    .filter(slot => slot.groupId === null)
    .sort((a, b) => a.slotNumber - b.slotNumber);
  const uniqueEligibleGroups = Array.from(new Set(groupIds)).filter(groupId => !occupied.has(groupId));

  return vacantSlots.slice(0, uniqueEligibleGroups.length).map((slot, index) => ({
    slotId: slot.id,
    groupId: uniqueEligibleGroups[index],
  }));
}
