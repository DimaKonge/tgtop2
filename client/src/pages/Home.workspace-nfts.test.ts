import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("TG TOP workspace wallet NFT view", () => {
  it("keeps communities, bots and wallet NFTs as distinct workspace sections", () => {
    const source = readFileSync(new URL("./Home.tsx", import.meta.url), "utf8");

    expect(source).toContain('type WorkspaceSection = "communities" | "bots" | "nft"');
    expect(source).toContain('["communities", tx("Сообщества", "Communities"), Users]');
    expect(source).toContain('["bots", tx("Боты", "Bots"), Bot]');
    expect(source).toContain('["nft", "NFT", Gift]');
    expect(source).toContain('workspaceSection === "communities"');
    expect(source).toContain('workspaceSection === "bots"');
    expect(source).toContain('workspaceSection === "nft"');
  });

  it("loads wallet NFTs only after the TON wallet is connected and supports all requested filters", () => {
    const source = readFileSync(new URL("./Home.tsx", import.meta.url), "utf8");

    expect(source).toContain('trpc.tgTop.getWalletNfts.useQuery');
    expect(source).toContain('walletAddress },');
    expect(source).toContain('workspaceSection === "nft"');
    expect(source).toContain('["gifts", tx("Гифты", "Gifts")]');
    expect(source).toContain('["usernames", tx("Юзернеймы", "Usernames")]');
    expect(source).toContain('["anonymous_numbers", tx("Анон-номера", "Anonymous")]');
    expect(source).toContain('["domains", tx("Домены", "Domains")]');
    expect(source).toContain('["other", tx("Другие", "Other")]');
    expect(source).toContain('Подпись, перевод и продажа не запрашиваются.');
    expect(source).toContain('<WalletNftCard key={item.address} item={item} language={language} />');
  });
});
