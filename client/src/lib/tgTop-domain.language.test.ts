import { describe, expect, it, vi } from "vitest";
import { getRussianLanguage, LANGUAGE_STORAGE_KEY, setLanguagePreference } from "./tgTop-domain";

describe("TG TOP language preference", () => {
  it("defaults to English when no browser preference exists", () => {
    vi.stubGlobal("window", undefined);
    expect(getRussianLanguage()).toBe("en");
  });

  it("persists the explicit Russian choice and restores it", () => {
    const storage = new Map<string, string>();
    vi.stubGlobal("window", { localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => { storage.set(key, value); },
    } });
    setLanguagePreference("ru");
    expect(storage.get(LANGUAGE_STORAGE_KEY)).toBe("ru");
    expect(getRussianLanguage()).toBe("ru");
  });

  it("exposes exactly English and Russian choices in Settings", async () => {
    const source = await (await import("node:fs/promises")).readFile(new URL("../pages/Home.tsx", import.meta.url), "utf8");
    expect(source).toContain('{ value: "en", label: "English" }');
    expect(source).toContain('{ value: "ru", label: "Русский" }');
    expect(source).toContain('onLanguageChange={setLanguage}');
  });
});
