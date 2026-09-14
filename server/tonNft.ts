import { Address } from "@ton/core";

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
  const previewUrls = [...(item.previews ?? [])]
    .sort((left, right) => {
      const area = (value?: string) => {
        const match = value?.match(/(\d+)x(\d+)/i);
        return match ? Number(match[1]) * Number(match[2]) : 0;
      };
      return area(right.resolution) - area(left.resolution);
    })
    .map(preview => getSafeImageUrl(preview.url));
  const imageUrls = Array.from(new Set([
    animationUrl,
    getSafeImageUrl(item.metadata?.image),
    getSafeImageUrl(item.metadata?.image_url),
    ...previewUrls,
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
    // Request with indirect_ownership=true so Telegram gifts, numbers, and usernames are included
    const response = await fetch(`${TON_API_BASE_URL}/accounts/${encodeURIComponent(address)}/nfts?limit=1000&indirect_ownership=true`, {
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

export function areTonAddressesEqual(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  const cleanA = a.trim();
  const cleanB = b.trim();
  if (cleanA.toLowerCase() === cleanB.toLowerCase()) return true;
  try {
    return Address.parse(cleanA).equals(Address.parse(cleanB));
  } catch {
    return false;
  }
}

export async function verifyTonNftOwnership(nftItemAddress: string, walletAddress?: string | null): Promise<boolean> {
  if (!walletAddress || !isTonWalletAddress(walletAddress)) return false;
  const nftAddr = nftItemAddress.trim();
  const ownerAddr = walletAddress.trim();

  // 1. Direct TonAPI item lookup
  try {
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), 8_000);
    const response = await fetch(`${TON_API_BASE_URL}/nfts/${encodeURIComponent(nftAddr)}`, {
      headers: process.env.TONAPI_API_KEY ? { Authorization: `Bearer ${process.env.TONAPI_API_KEY}` } : undefined,
      signal: abortController.signal,
    }).finally(() => clearTimeout(timeout));

    if (response.ok) {
      const data = await response.json() as { owner?: { address?: string } };
      if (data.owner?.address) {
        if (areTonAddressesEqual(data.owner.address, ownerAddr)) {
          return true;
        }
      }
    }
  } catch (err) {
    console.warn("Direct NFT ownership check warning:", err);
  }

  // 2. Lookup within user's wallet items
  try {
    const walletNfts = await getWalletNfts(ownerAddr);
    return walletNfts.items.some(item => areTonAddressesEqual(item.address, nftAddr));
  } catch {
    return false;
  }
}

export async function resolveNftItemByAddress(nftAddressOrName: string): Promise<WalletNftItem | null> {
  const query = nftAddressOrName.trim();
  if (!query) return null;

  try {
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), 8_000);
    const response = await fetch(`${TON_API_BASE_URL}/nfts/${encodeURIComponent(query)}`, {
      headers: process.env.TONAPI_API_KEY ? { Authorization: `Bearer ${process.env.TONAPI_API_KEY}` } : undefined,
      signal: abortController.signal,
    }).finally(() => clearTimeout(timeout));

    if (!response.ok) return null;
    const data = await response.json() as TonApiNftItem;
    return normalizeWalletNft(data);
  } catch (err) {
    console.warn("Resolve NFT warning:", err);
    return null;
  }
}

