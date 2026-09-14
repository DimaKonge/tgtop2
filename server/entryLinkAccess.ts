export type EntryLinkAccessTarget = {
  ownerOpenId: string;
  username: string | null;
};

/**
 * A public @username can be opened by any signed-in visitor. A stored invite
 * link is a private capability and may only be resolved for its owner or a
 * current moderator.
 */
export function canResolveVerifiedEntryLink(input: {
  target: EntryLinkAccessTarget;
  viewerOpenId: string;
  canModerate: boolean;
}) {
  return Boolean(input.target.username) || input.target.ownerOpenId === input.viewerOpenId || input.canModerate;
}
