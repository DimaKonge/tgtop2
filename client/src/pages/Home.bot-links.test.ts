import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("TG TOP production bot links", () => {
  it("uses @TGTOP_robot for both channel and group admin onboarding", () => {
    const source = readFileSync(new URL("./Home.tsx", import.meta.url), "utf8");

    expect(source).toContain("https://t.me/TGTOP_robot?");
    expect(source).toContain("startchannel=admin");
    expect(source).toContain("startgroup=admin");
    expect(source).not.toContain("GiftsLabBot");
  });

  it("uses the shared GroupCard component for ranked and general catalog placements", () => {
    const source = readFileSync(new URL("./Home.tsx", import.meta.url), "utf8");

    expect(source).toContain('type GroupCardVariant = "lead" | "secondary" | "compact" | "list"');
    expect(source).toMatch(/<GroupCard\s+group=\{leadSlot\.group\}\s+variant="lead"/);
    expect(source).toContain('variant="secondary"');
    expect(source).toContain('variant="compact"');
    expect(source).toMatch(/<GroupCard\s+key=\{group\.id\}\s+group=\{group\}\s+variant="list"/);
    expect(source).toContain('В TG TOP пока нет площадок');
    expect(source).toContain('https://t.me/i/userpic/320/${group.username}.jpg');
    expect(source).toContain('className="absolute inset-0 grid place-items-center"');
    expect(source).toContain('className="absolute inset-0 h-full w-full object-cover"');
    expect(source).toContain('["Каналы", ui.channels]');
    expect(source).toContain('["Чаты", ui.chats]');
    expect(source).toContain('["NFT", "NFT"]');
    expect(source).toContain('onClick={() => selectGlobalDirection(value)}');
    expect(source).toContain('globalDirection === "NFT"');
    expect(source).toContain('<NftCard');
    expect(source).toContain('value="onchain"');
    expect(source).toContain('value="offchain"');
    expect(source).toContain('prepareNftTransfer');
    expect(source).toContain('completeOffchainNftTransfer');
    expect(source).toContain('aria-live="polite"');
    expect(source).toContain('{n(globalCount, language)} {globalDirection === "NFT" ? "NFT" : ui.groups}');
    expect(source).toContain('Connect wallet');
    expect(source).toContain('useTonConnectUI');
    expect(source).toContain('tonConnectUi.openModal()');
    expect(source).not.toContain('Connect Wallet появится после настройки TON Wallet.');
    expect(source).toContain('<WalletConnectControl language={language} />');
    expect(source).not.toContain('{ value: "system"');
    expect(source).toContain('setFiltersOpen(true)');
    expect(source).toContain('tx("Весь мир", "Worldwide")');
    expect(source).toContain('const COUNTRY_OPTIONS = ["Global", "UA", "PL", "DE", "GB", "US", "RU"] as const');
    expect(source).toContain('PL: { ru: "Польша", en: "Poland" }');
    expect(source).toContain('DE: { ru: "Германия", en: "Germany" }');
    expect(source).toContain('GB: { ru: "Великобритания", en: "United Kingdom" }');
    expect(source).toContain('getCountryLabel(country, language)');
    expect(source).not.toContain('"EU"');
    expect(source).toContain('const currentTopTitle = [');
    expect(source).toContain('tx("Все сообщества", "All communities")');
    expect(source).toContain('getSubcategoryLabel(subcategory, language)');
    expect(source).toContain('<h1 className="truncate text-lg font-semibold tracking-tight text-white">{currentTopTitle}</h1>');
    expect(source).toContain('tx("Каталог групп", "Community catalog")');
    expect(source).toContain('tx("По этому фильтру площадок пока нет.", "No communities match this filter yet.")');
    expect(source).toContain('tx("В TG TOP с", "On TG TOP since")');
    expect(source).toContain('tx("Загружаем статистику…", "Loading statistics…")');
    expect(source).toContain('"This placement will be available after the ranking board is created."');
    expect(source).toContain('const getProtectedDealGuidance = (status: string, isBuyer: boolean, buyerConfirmed = false) =>');
    expect(source).toContain('Transfer the Telegram owner rights before the 21-day deadline.');
    expect(source).toContain('confirmProtectedGroupTransfer');
    expect(source).toContain('Confirm receipt');
    expect(source).toContain('Settlement remains locked until payment verification.');
    expect(source).toContain('{getProtectedDealGuidance(deal.status, isBuyer, Boolean(deal.buyerConfirmedAt))}');
    expect(source).toContain('const [subcategory, setSubcategory] = useState("Все")');
    expect(source).toContain('getSlots.useQuery({');
    expect(source).toContain('subcategory,');
    expect(source).toContain('getGroups.useQuery({ category, country, subcategory })');
    expect(source).toContain('CATEGORY_SUBCATEGORIES');
    expect(source).toContain('setCountry(item)');
    expect(source).toContain('CATEGORY_SUBCATEGORIES[category].map(item =>');
    expect(source).toContain('setGlobalDirection(item.value);');
    expect(source).toContain('setSubcategory("Все");');
    expect(source).toContain('setCountry("Все");');
  });
});
