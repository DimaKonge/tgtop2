import {
  CITY_OPTIONS,
  COUNTRY_LABELS,
  SUBCATEGORY_LABELS,
  type Group,
  type Language,
} from "@/lib/tgTop-domain";

// Pure, module-scope helpers shared by Home and its extracted page components.
// Moved verbatim from Home.tsx as part of the Phase 3 decomposition (no logic changes).

export const getCategoryLabel = (category: Group["category"], language: Language) =>
  language === "en" ? (category === "Каналы" ? "Channels" : "Chats") : category;
export const getCommunityAccessLabel = (group: Pick<Group, "username">, language: Language) =>
  group.username ? `@${group.username}` : language === "en" ? "Private" : "Приватный";
export const openTelegramCommunityLink = (url: string) => {
  const webApp = window.Telegram?.WebApp as unknown as {
    initData?: string;
    openTelegramLink?: (target: string) => void;
    openLink?: (target: string) => void;
  } | undefined;
  const isTelegramMiniApp = Boolean(webApp?.initData);
  if (isTelegramMiniApp && /^https:\/\/t\.me\//i.test(url) && webApp?.openTelegramLink) {
    webApp.openTelegramLink(url);
    return true;
  }
  if (isTelegramMiniApp && webApp?.openLink) {
    webApp.openLink(url);
    return true;
  }
  const tab = window.open(url, "_blank", "noopener,noreferrer");
  if (tab) tab.opener = null;
  return Boolean(tab);
};
export const openTonviewerTransaction = (transactionHash: string) => {
  if (!/^[0-9a-f]{64}$/i.test(transactionHash)) return;
  openTelegramCommunityLink(`https://tonviewer.com/transaction/${transactionHash}`);
};
export const openTelegramInNewBrowserTab = (url: string) => {
  const tab = window.open(url, "_blank", "noopener,noreferrer");
  if (tab) tab.opener = null;
};
export const getSubcategoryLabel = (subcategory: string, language: Language) =>
  SUBCATEGORY_LABELS[subcategory]?.[language] ?? subcategory;
export const getCountryLabel = (country: string, language: Language) =>
  COUNTRY_LABELS[country]?.[language] ?? country;
export const getCityLabel = (country: string, city: string, language: Language) =>
  CITY_OPTIONS[country]?.find(item => item.value === city)?.[language] ?? city;
