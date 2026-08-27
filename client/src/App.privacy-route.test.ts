import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("external privacy route", () => {
  it("keeps a short /privacy route and skips the Mini App launch screen there", () => {
    const source = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");
    expect(source).toContain('<Route path={"/privacy"} component={PrivacyPolicy} />');
    expect(source).toContain('["/privacy", "/privacy-policy"].includes(window.location.pathname)');
    expect(source).toContain('!isExternalPolicyRoute && isLaunching');
  });
});
