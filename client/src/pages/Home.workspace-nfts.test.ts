import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const EXTRACTED_HOME_COMPONENTS = [
  "SortableMyGroupTile",
  "NftCard",
  "NftShowcase",
  "BrandMark",
  "WalletConnectControl",
  "WalletNftCard",
  "ChannelGiftMediaPreview",
  "SettingsSheet",
  "BotAvatar",
  "BotRankingTile",
].map(name => readFileSync(new URL(`../components/${name}.tsx`, import.meta.url), "utf8")).join("\n");


describe("TG TOP workspace wallet NFT view", () => {
  it("keeps communities, bots and wallet NFTs as distinct workspace sections", () => {
    const source = readFileSync(new URL("./Home.tsx", import.meta.url), "utf8") + "\n" + EXTRACTED_HOME_COMPONENTS;
    const domainSource = readFileSync(new URL("../lib/tgTop-domain.ts", import.meta.url), "utf8");

    expect(domainSource).toContain('export type WorkspaceSection = "communities" | "bots" | "nft"');
    expect(source).toContain('["communities", tx("Сообщества", "Communities"), Users]');
    expect(source).toContain('["bots", tx("Боты", "Bots"), Bot]');
    expect(source).toContain('["nft", "NFT", Gift]');
    expect(source).toContain('workspaceSection === "communities"');
    expect(source).toContain('workspaceSection === "bots"');
    expect(source).toContain('workspaceSection === "nft"');
  });

  it("loads wallet NFTs only after the TON wallet is connected and supports all requested filters", () => {
    const source = readFileSync(new URL("./Home.tsx", import.meta.url), "utf8") + "\n" + EXTRACTED_HOME_COMPONENTS;

    expect(source).toContain('trpc.tgTop.getWalletNfts.useQuery');
    expect(source).toContain('walletAddress: safeWalletAddress ?? "" },');
    expect(source).toContain('workspaceSection === "nft"');
    expect(source).toContain('["gifts", tx("Подарки", "Gifts")]');
    expect(source).toContain('["usernames", tx("Юзернеймы", "Usernames")]');
    expect(source).toContain('["anonymous_numbers", tx("Номера", "Numbers")]');
    expect(source).toContain('["domains", tx("Домены", "Domains")]');
    expect(source).toContain('["other", tx("Другие", "Other")]');
    expect(source).toContain('Подпись, перевод и продажа не запрашиваются.');
    expect(source).toContain('<WalletNftCard key={item.address} item={item} language={language} />');
  });

  it("does not reuse an unowned TON Connect session across Telegram accounts", () => {
    const source = readFileSync(new URL("./Home.tsx", import.meta.url), "utf8") + "\n" + EXTRACTED_HOME_COMPONENTS;

    expect(source).toContain('const ownerKey = "tgtop:ton-wallet-owner"');
    expect(source).toContain('const pendingOwnerKey = "tgtop:ton-wallet-pending-owner"');
    expect(source).toContain('storedOwner !== user.openId && pendingOwner !== user.openId');
    expect(source).toContain('void tonConnectUi.disconnect().catch(() => undefined)');
    expect(source).toContain('window.localStorage.removeItem(ownerKey)');
    expect(source).toContain('const [safeWalletAddress, setSafeWalletAddress] = useState<string | null>(null);');
    expect(source).toContain('setTonWithdrawalAddress("");');
    expect(source).toContain('const tonWithdrawalDefaultRecipient = safeWalletAddress ?? "";');
    expect(source).toContain('setTonWithdrawalAddress(safeWalletAddress ?? "");');
    expect(source).not.toContain('getTonWithdrawalDefaultRecipient.useQuery');
    expect(source).toContain('ownerOpenId={user?.openId}');
    expect(source).toContain('Аренда collectible-юзернейма');
    expect(source).toContain('Эскроу подтверждено');
    expect(source).toContain('Оплата и назначение имени не выполняются автоматически.');
    expect(source).toContain('Автоматического назначения имени не было.');
  });

  it("places the expandable real channel-gifts panel after audience statistics", () => {
    const source = readFileSync(new URL("./Home.tsx", import.meta.url), "utf8") + "\n" + EXTRACTED_HOME_COMPONENTS;

    expect(source).toContain('const rewardCampaignStatsQuery = trpc.tgTop.getRewardCampaignStats.useQuery');
    expect(source).toContain('detailReturnPage === "mine" && ownsDetail && rewardCampaignStats');
    expect(source).toContain('Внесено');
    expect(source).toContain('Выплачено');
    expect(source).toContain('Подтверждённые участники:');
    expect(source).toContain('trpc.tgTop.getChannelGifts.useQuery');
    expect(source).toContain('const [channelGiftsOpen, setChannelGiftsOpen] = useState(false)');
    expect(source).toContain('Подарки, которыми владеет канал');
    expect(source).toContain('Telegram не вернул подарки для этого канала.');
    expect(source).toContain('Медиа недоступно');
    expect(source).toContain('Подарки, которыми владеет канал · только просмотр');
    expect(source.indexOf('Приглашения')).toBeLessThan(source.indexOf('Подарки, которыми владеет канал'));
    expect(source.indexOf('Подарки, которыми владеет канал')).toBeLessThan(source.indexOf('Обновить лот'));
  });

  it("keeps publication controls visible for a confirmed owner even when their community is pending or under review", () => {
    const source = readFileSync(new URL("./Home.tsx", import.meta.url), "utf8") + "\n" + EXTRACTED_HOME_COMPONENTS;

    expect(source).toContain('const ownsDetail = detail?.group.ownerOpenId === user?.openId;');
    expect(source).toContain('{detail && ownsDetail && (\n                    <section className="order-3 mt-2 rounded-xl border border-[#30415d] bg-[#111d32]/90 p-1.5">');
    expect(source).toContain('Параметры публикации');
    expect(source).not.toContain('<section className="hidden order-3 mt-2 rounded-xl border border-[#30415d] bg-[#111d32]/90 p-1.5">');
  });
});
