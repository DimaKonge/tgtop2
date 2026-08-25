import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("bot catalog moderation contract", () => {
  it("keeps pending submissions private and requires manual moderator review", () => {
    const schemaSource = readFileSync(new URL("../drizzle/schema.ts", import.meta.url), "utf8");
    const dbSource = readFileSync(new URL("./db.ts", import.meta.url), "utf8");
    const routerSource = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");

    expect(schemaSource).toContain('export const botListings = mysqlTable("bot_listings"');
    expect(schemaSource).toContain('mysqlEnum("moderationStatus", ["pending", "approved", "rejected"])');
    expect(schemaSource).toContain('uniqueIndex("bot_listings_username_unique")');
    expect(dbSource).toContain("export async function submitBotListing(ownerOpenId: string, rawTelegramLink: string)");
    expect(dbSource).toContain("normalizeTelegramBotLink(rawTelegramLink)");
    expect(dbSource).toContain('eq(botListings.moderationStatus, "approved")');
    expect(dbSource).toContain("export async function getBotModerationQueue()");
    expect(dbSource).toContain("export async function moderateBotListing(input:");
    expect(routerSource).toContain("submitBotListing: protectedProcedure");
    expect(routerSource).toContain("myBotListings: protectedProcedure");
    expect(routerSource).toContain("getApprovedBots: publicProcedure");
    expect(routerSource).toContain("getBotModerationQueue: protectedProcedure");
    expect(routerSource).toContain("if (!access.canModerate) throw new Error(\"Недостаточно прав для просмотра заявок ботов\")");
    expect(routerSource).toContain("moderateBotListing: protectedProcedure");
  });

  it("assigns bot categories only during moderator approval", () => {
    const dbSource = readFileSync(new URL("./db.ts", import.meta.url), "utf8");
    const homeSource = readFileSync(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");

    expect(dbSource).toContain('eq(catalogTopics.category, "Боты")');
    expect(dbSource).toContain("Выберите существующую рубрику для бота");
    expect(homeSource).toContain("botTopicOptions.map(topic => <SelectItem");
    expect(homeSource).toContain("moderateBotListing.mutate({ botListingId: bot.id, action: \"approve\", category: draft.category })");
    expect(homeSource).toContain("Заявки на ботов");
    expect(homeSource).toContain('SelectItem value="Боты"');
  });
});
