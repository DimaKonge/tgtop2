export const SEARCH_INDEXING_ERROR = "Для публикации в Google у группы должен быть публичный @username";

export function canIndexPublicGroup(input: { status: string; username: string | null; searchIndexable: boolean }) {
  return input.searchIndexable && input.status === "listed" && Boolean(input.username);
}

export function getSearchIndexingError(input: { username: string | null; searchIndexable?: boolean }) {
  return input.searchIndexable && !input.username ? SEARCH_INDEXING_ERROR : undefined;
}
