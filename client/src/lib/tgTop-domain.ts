export type Page = "top" | "catalog" | "giveaways" | "mine" | "details" | "owner" | "profile" | "admin";
export type Audience = "all" | "small" | "medium" | "large";
export type MyGroupsViewMode = "list" | "grid";
export type Language = "ru" | "en";
export const LANGUAGE_STORAGE_KEY = "tgtop:language";
export type DetailStatsPeriod = "day" | "month" | "all";
export type WorkspaceSection = "communities" | "bots" | "nft";
export type WalletNftFilter = "all" | "gifts" | "usernames" | "anonymous_numbers" | "domains" | "other";
export type ListingType = "catalog" | "sale";
export type ListingCountry = string;
export type GlobalDirection = "Все" | "Каналы" | "Чаты" | "NFT";
export type TopSection = "communities" | "nft" | "bots";
export type NftMarketCategory = "all" | "gifts" | "usernames" | "anonymous_numbers" | "other";
export type NftDealCategory = "all" | "sale" | "auction" | "installments" | "rent" | "collateral";

export const getRussianLanguage = (): Language => {
  if (typeof window === "undefined") return "en";
  return window.localStorage.getItem(LANGUAGE_STORAGE_KEY) === "ru" ? "ru" : "en";
};

export const setLanguagePreference = (language: Language) => {
  if (typeof window !== "undefined") window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
};

export const COUNTRY_OPTIONS = ["Global", "UA", "PL", "DE", "GB", "US", "RU", "FR", "ES", "IT", "NL", "CZ", "RO", "TR", "CA", "AU", "AE", "KZ"] as const;
export const COUNTRY_LABELS: Record<string, { ru: string; en: string }> = {
  Global: { ru: "Весь мир", en: "Worldwide" }, UA: { ru: "Украина", en: "Ukraine" }, PL: { ru: "Польша", en: "Poland" }, DE: { ru: "Германия", en: "Germany" }, GB: { ru: "Великобритания", en: "United Kingdom" }, US: { ru: "США", en: "United States" }, RU: { ru: "Россия", en: "Russia" }, FR: { ru: "Франция", en: "France" }, ES: { ru: "Испания", en: "Spain" }, IT: { ru: "Италия", en: "Italy" }, NL: { ru: "Нидерланды", en: "Netherlands" }, CZ: { ru: "Чехия", en: "Czechia" }, RO: { ru: "Румыния", en: "Romania" }, TR: { ru: "Турция", en: "Türkiye" }, CA: { ru: "Канада", en: "Canada" }, AU: { ru: "Австралия", en: "Australia" }, AE: { ru: "ОАЭ", en: "United Arab Emirates" }, KZ: { ru: "Казахстан", en: "Kazakhstan" },
};
export const CITY_OPTIONS: Record<string, Array<{ value: string; ru: string; en: string }>> = {
  UA: [{ value: "Kyiv", ru: "Киев", en: "Kyiv" }, { value: "Lviv", ru: "Львов", en: "Lviv" }, { value: "Odesa", ru: "Одесса", en: "Odesa" }, { value: "Kharkiv", ru: "Харьков", en: "Kharkiv" }, { value: "Dnipro", ru: "Днепр", en: "Dnipro" }], PL: [{ value: "Warsaw", ru: "Варшава", en: "Warsaw" }, { value: "Krakow", ru: "Краков", en: "Krakow" }, { value: "Wroclaw", ru: "Вроцлав", en: "Wroclaw" }], DE: [{ value: "Berlin", ru: "Берлин", en: "Berlin" }, { value: "Munich", ru: "Мюнхен", en: "Munich" }, { value: "Hamburg", ru: "Гамбург", en: "Hamburg" }], GB: [{ value: "London", ru: "Лондон", en: "London" }, { value: "Manchester", ru: "Манчестер", en: "Manchester" }], US: [{ value: "New York", ru: "Нью-Йорк", en: "New York" }, { value: "Los Angeles", ru: "Лос-Анджелес", en: "Los Angeles" }, { value: "Miami", ru: "Майами", en: "Miami" }], RU: [{ value: "Moscow", ru: "Москва", en: "Moscow" }, { value: "Saint Petersburg", ru: "Санкт-Петербург", en: "Saint Petersburg" }], FR: [{ value: "Paris", ru: "Париж", en: "Paris" }], ES: [{ value: "Madrid", ru: "Мадрид", en: "Madrid" }, { value: "Barcelona", ru: "Барселона", en: "Barcelona" }], IT: [{ value: "Rome", ru: "Рим", en: "Rome" }, { value: "Milan", ru: "Милан", en: "Milan" }], NL: [{ value: "Amsterdam", ru: "Амстердам", en: "Amsterdam" }], CZ: [{ value: "Prague", ru: "Прага", en: "Prague" }], RO: [{ value: "Bucharest", ru: "Бухарест", en: "Bucharest" }], TR: [{ value: "Istanbul", ru: "Стамбул", en: "Istanbul" }, { value: "Ankara", ru: "Анкара", en: "Ankara" }], CA: [{ value: "Toronto", ru: "Торонто", en: "Toronto" }, { value: "Vancouver", ru: "Ванкувер", en: "Vancouver" }], AU: [{ value: "Sydney", ru: "Сидней", en: "Sydney" }, { value: "Melbourne", ru: "Мельбурн", en: "Melbourne" }], AE: [{ value: "Dubai", ru: "Дубай", en: "Dubai" }, { value: "Abu Dhabi", ru: "Абу-Даби", en: "Abu Dhabi" }], KZ: [{ value: "Almaty", ru: "Алматы", en: "Almaty" }, { value: "Astana", ru: "Астана", en: "Astana" }],
};
export const CATEGORY_SUBCATEGORIES = { "Каналы": ["General", "News", "Crypto", "Technology", "Business", "Education", "Entertainment", "Games", "Memes", "Dating", "Markets"], "Чаты": ["General", "Community", "Dating", "City", "Support", "Work", "Hobbies", "Learning", "Games", "Markets"] } as const;
export const SUBCATEGORY_LABELS: Record<string, { ru: string; en: string }> = { News: { ru: "Новости", en: "News" }, Crypto: { ru: "Крипто", en: "Crypto" }, Technology: { ru: "Технологии", en: "Technology" }, Business: { ru: "Бизнес", en: "Business" }, Education: { ru: "Образование", en: "Education" }, Entertainment: { ru: "Развлечения", en: "Entertainment" }, Games: { ru: "Игры", en: "Games" }, Memes: { ru: "Мемы", en: "Memes" }, Community: { ru: "Сообщества", en: "Community" }, Dating: { ru: "Знакомства", en: "Dating" }, Markets: { ru: "Маркеты", en: "Markets" }, City: { ru: "Город", en: "City" }, Support: { ru: "Поддержка", en: "Support" }, Work: { ru: "Работа", en: "Work" }, Hobbies: { ru: "Хобби", en: "Hobbies" }, Learning: { ru: "Обучение", en: "Learning" }, General: { ru: "Общее", en: "General" } };

export type Group = {
  id: number; chatId: string; title: string; username: string | null; inviteLink: string | null; description: string | null; avatarFileId: string | null; animatedAvatarUrl?: string | null; topPyramidAvatar?: boolean; membersCount: number; ownerOpenId: string; category: "Каналы" | "Чаты"; subcategory: string; country: string; city?: string | null; status: "listed" | "rented" | "sold" | "pending"; messagesCount: number; joinedCount: number; leavesCount: number; invitedCount: number; lastPostViews: number; lastPostAt: Date | null; lastStatsAt: Date | null; listedAt: Date | null; salePriceTon?: string | null; listingType?: ListingType; cardBackgroundPreset?: string | null; anonymousListing?: boolean; showOwnerContact?: boolean; managerTelegramUserId?: string | null; managerUsername?: string | null; managerName?: string | null; managerAvatarUrl?: string | null; managerPublic?: boolean; listingAnnouncementEnabled?: boolean; searchIndexable?: boolean; monthlyEntryEnabled?: boolean; monthlyEntryStars?: number | null; monthlyEntryLinkName?: string | null; monthlyEntryInviteLink?: string | null; rewardActive?: boolean; rewardAmount?: number; rewardBudget?: number; rewardPerSubscription?: number; rewardPerInvite?: number; rewardPerManualAdd?: number; reward?: { subscriptionAmount: number; inviteAmount: number; manualAddAmount: number }; deleteServiceMessages?: boolean; ownerPinned?: boolean; ownerSortOrder?: number; createdAt: Date; owner?: { openId: string; name: string | null; telegramUsername: string | null; avatarUrl: string | null };
};
export type Slot = { id: number; slotNumber: number; bidAmount: number; category?: "Все" | "Каналы" | "Чаты"; country?: string; subcategory?: string; updatedAt?: Date; isOccupied?: boolean; group: Group | null };
export type Nft = { id: number; username: string; price: string; rentalPricePerDay: string; minRentalDays: number; maxRentalDays: number; ownerUsername: string; assetClass: "onchain" | "offchain"; nftItemAddress?: string | null; ownerWalletAddress?: string | null; ownershipVerifiedAt?: Date | null; listingType: "sale" | "rent" | "both"; status: "available" | "rented" | "sold"; showcaseProfile?: boolean; showcaseGroupId?: number | null };
export type ShowcaseNft = Pick<Nft, "id" | "username" | "price" | "rentalPricePerDay" | "assetClass" | "listingType">;
export type WalletNft = { address: string; index: number; name: string; description: string | null; imageUrl: string | null; imageUrls: string[]; mediaKind: "video" | "image" | null; collectionName: string | null; collectionAddress: string | null; category: Exclude<WalletNftFilter, "all"> };
export type PreparedNftTransfer = { transfer: { id: number; assetClass: "onchain" | "offchain"; status: "draft" | "awaiting_signature"; transferReference: string | null; expiresAt: Date | null }; nft: Nft; recipient: { openId: string; name: string | null; telegramUsername: string | null; avatarUrl: string | null }; requirements: { requiresWalletSignature: boolean; requiresVerifiedRecipientWallet: boolean; platformFeePercent: number } };

export const hasConfiguredRewardCampaign = (group: Group) => {
  const rewardPerAction = group.category === "Чаты" ? Number(group.rewardPerManualAdd ?? group.reward?.manualAddAmount ?? 0) : Number(group.rewardPerSubscription ?? group.reward?.subscriptionAmount ?? 0);
  return Boolean(group.rewardActive && Number(group.rewardBudget ?? 0) > 0 && rewardPerAction > 0);
};
