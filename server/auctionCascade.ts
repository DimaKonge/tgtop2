export type CascadeSlot<T> = { slotNumber: number; occupant: T | null };

/**
 * Moves an incoming occupant into a target rank. A displaced occupant moves one
 * rank lower, cascading only as far as needed. If the incoming occupant already
 * has a lower rank, that position closes the cascade instead of duplicating it.
 */
export function cascadeRankedOccupants<T>(
  slots: CascadeSlot<T>[],
  targetSlotNumber: number,
  incomingOccupant: T
): CascadeSlot<T>[] {
  const result = [...slots]
    .sort((left, right) => left.slotNumber - right.slotNumber)
    .map(slot => ({ ...slot }));
  const targetIndex = result.findIndex(slot => slot.slotNumber === targetSlotNumber);
  if (targetIndex < 0) throw new Error("Target rank does not exist");
  if (result[targetIndex].occupant === incomingOccupant) return result;

  const currentIndex = result.findIndex(slot => slot.occupant === incomingOccupant);
  if (result[targetIndex].occupant === null) {
    result[targetIndex].occupant = incomingOccupant;
    if (currentIndex >= 0) result[currentIndex].occupant = null;
    return result;
  }

  const lastAffectedIndex = currentIndex > targetIndex ? currentIndex : result.length - 1;
  for (let index = lastAffectedIndex; index > targetIndex; index -= 1) {
    result[index].occupant = result[index - 1].occupant;
  }
  result[targetIndex].occupant = incomingOccupant;
  return result;
}
