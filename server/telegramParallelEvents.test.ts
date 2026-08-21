import { describe, expect, it } from "vitest";
import { isDuplicateTelegramEventError } from "./db";
import { __private__ } from "./telegramBot";

describe("parallel Telegram bot event keys", () => {
  it("deduplicates the same group-admin event observed by both bots", () => {
    const primaryEvent = {
      update_id: 10,
      my_chat_member: {
        date: 1_727_278_000,
        chat: { id: -100_222, type: "channel" as const },
        from: { id: 41, first_name: "Owner" },
        old_chat_member: { status: "left", user: { id: 1, first_name: "Primary" } },
        new_chat_member: { status: "administrator", user: { id: 1, first_name: "Primary" } },
      },
    };
    const reserveEvent = {
      ...primaryEvent,
      update_id: 25,
      my_chat_member: {
        ...primaryEvent.my_chat_member,
        old_chat_member: { status: "left", user: { id: 2, first_name: "Reserve" } },
        new_chat_member: { status: "administrator", user: { id: 2, first_name: "Reserve" } },
      },
    };

    expect(__private__.getTelegramEventKey(primaryEvent)).toBe(__private__.getTelegramEventKey(reserveEvent));
  });

  it("deduplicates the same published message regardless of each bot update id", () => {
    const primaryEvent = { update_id: 101, channel_post: { message_id: 88, chat: { id: -100_222, type: "channel" as const } } };
    const reserveEvent = { ...primaryEvent, update_id: 901 };

    expect(__private__.getTelegramEventKey(primaryEvent)).toBe("message:-100222:88");
    expect(__private__.getTelegramEventKey(primaryEvent)).toBe(__private__.getTelegramEventKey(reserveEvent));
  });

  it("recognizes a duplicate-key error wrapped by Drizzle as a normal second-bot skip", () => {
    const duplicate = Object.assign(new Error("Failed query"), {
      cause: { code: "ER_DUP_ENTRY", errno: 1062 },
    });
    expect(isDuplicateTelegramEventError(duplicate)).toBe(true);
    expect(isDuplicateTelegramEventError(new Error("Connection lost"))).toBe(false);
  });
});
