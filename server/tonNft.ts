export type WalletNftCategory = "gifts" | "usernames" | "anonymous_numbers" | "domains" | "other";

export type WalletNftItem = {
  address: string;
  index: number;
  name: string;
  description: string | null;
  imageUrl: string | null;
  imageUrls: string[];
  mediaKind: "video" | "image" | null;
  collectionName: string | null;
  collectionAddress: string | null;
  category: WalletNftCategory;
};

type TonApiNftItem = {
  address?: string;
  index?: number;
  interfaces?: string[];
  metadata?: { name?: string; description?: string; image?: string; image_url?: string; animation_url?: string; attributes?: Array<{ trait_type?: string; value?: string }> };
  collection?: { name?: string; address?: string };
  previews?: Array<{ url?: string; resolution?: string }>;
};

const TON_API_BASE_URL = "https://tonapi.io/v2";
const TON_WALLET_ADDRESS_PATTERN = /^(?:[EU]Q[A-Za-z0-9_-]{46}|0:[a-fA-F0-9]{64})$/;

function getSafeImageUrl(value: unknown) {
  if (typeof value !== "string") return null;
  const source = value.trim();
  if (/^ipfs:\/\//i.test(source)) {
    const contentPath = source.replace(/^ipfs:\/\/(?:ipfs\/)?/i, "").replace(/^\/+/, "");
    return contentPath ? `https://ipfs.io/ipfs/${contentPath}` : null;
  }
  try {
    const url = new URL(source);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function isTonWalletAddress(value: string) {
  return TON_WALLET_ADDRESS_PATTERN.test(value.trim());
}

export function classifyWalletNft(item: TonApiNftItem): WalletNftCategory {
  const fingerprint = [
    item.metadata?.name,
    item.metadata?.description,
    item.collection?.name,
    ...(item.interfaces ?? []),
    ...(item.metadata?.attributes ?? []).flatMap(attribute => [attribute.trait_type, attribute.value]),
  ].filter(Boolean).join(" ").toLocaleLowerCase();

  if (/(anonymous\s*number|anon\s*number|аноним|анон\s*номер)/i.test(fingerprint)) return "anonymous_numbers";
  if (/(ton\s*dns|dns\.ton|\.ton\b|\bdomain\b|домен)/i.test(fingerprint)) return "domains";
  if (/(username|user\s*name|юзернейм|fragment)/i.test(fingerprint)) return "usernames";
  if (/(telegram\s*gift|\bgift\b|подарок|candy\s*canes?)/i.test(fingerprint)) return "gifts";
  return "other";
}

export function normalizeWalletNft(item: TonApiNftItem): WalletNftItem | null {
  if (!item.address || typeof item.address !== "string") return null;
  const name = item.metadata?.name?.trim() || item.collection?.name?.trim() || `NFT #${item.index ?? "—"}`;
  const animationUrl = getSafeImageUrl(item.metadata?.animation_url);
  const imageUrls = Array.from(new Set([
    animationUrl,
    getSafeImageUrl(item.metadata?.image),
    getSafeImageUrl(item.metadata?.image_url),
    ...(item.previews ?? []).map(preview => getSafeImageUrl(preview.url)),
  ].filter((url): url is string => Boolean(url))));
  const mediaKind = animationUrl && /\.(?:mp4|webm|mov)(?:$|[?#])/i.test(animationUrl) ? "video" : imageUrls.length ? "image" : null;

  return {
    address: item.address,
    index: Number.isSafeInteger(item.index) ? item.index! : 0,
    name,
    description: item.metadata?.description?.trim() || null,
    imageUrl: imageUrls[0] ?? null,
    imageUrls,
    mediaKind,
    collectionName: item.collection?.name?.trim() || null,
    collectionAddress: item.collection?.address?.trim() || null,
    category: classifyWalletNft(item),
  };
}

export async function getWalletNfts(walletAddress: string): Promise<{ items: WalletNftItem[]; total: number }> {
  const address = walletAddress.trim();
  if (!isTonWalletAddress(address)) throw new Error("Некорректный адрес TON-кошелька");

  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), 10_000);
  try {
    const response = await fetch(`${TON_API_BASE_URL}/accounts/${encodeURIComponent(address)}/nfts?limit=1000&indirect_ownership=false`, {
      headers: process.env.TONAPI_API_KEY ? { Authorization: `Bearer ${process.env.TONAPI_API_KEY}` } : undefined,
      signal: abortController.signal,
    });
    if (!response.ok) throw new Error(response.status === 429 ? "Сервис NFT временно перегружен. Попробуйте ещё раз." : "Не удалось получить NFT кошелька");

    const payload = await response.json() as { nft_items?: TonApiNftItem[] };
    const items = (payload.nft_items ?? []).map(normalizeWalletNft).filter((item): item is WalletNftItem => item !== null);
    return { items, total: items.length };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw new Error("Загрузка NFT заняла слишком много времени. Попробуйте ещё раз.");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
