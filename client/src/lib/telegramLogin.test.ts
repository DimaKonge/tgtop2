import { describe, expect, it, vi } from "vitest";
import { startTelegramLogin } from "./telegramLogin";

describe("Telegram browser login", () => {
  it("opens the local official Telegram Login endpoint and preserves the return path", () => {
    const assign = vi.fn();
    vi.stubGlobal("window", {
      location: {
        origin: "https://tgtop.xyz",
        pathname: "/",
        search: "",
        assign,
      },
    });

    startTelegramLogin("/details?group=24");

    expect(assign).toHaveBeenCalledWith("https://tgtop.xyz/api/auth/telegram/login?returnTo=%2Fdetails%3Fgroup%3D24");
    vi.unstubAllGlobals();
  });
});
