import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./db.ts", import.meta.url), "utf8");

describe("listing with base General category", () => {
  it("does not require catalog_topics before a listing debit", () => {
    expect(source).toContain('options?.subcategory && options.subcategory !== "General"');
    expect(source).toContain('listingOptions.subcategory && listingOptions.subcategory !== "General"');
    expect(source.indexOf('options?.subcategory && options.subcategory !== "General"')).toBeLessThan(source.indexOf('const requestedTarget ='));
  });

  it("treats Global as the worldwide default instead of a catalog country", () => {
    expect(source).toContain('const selectedCountry = options?.country === "Global" ? undefined : options?.country;');
    expect(source).toContain('const selectedCountry = listingOptions.country === "Global" ? undefined : listingOptions.country;');
    expect(source).not.toContain('eq(catalogCountries.code, options.country)');
  });
});
