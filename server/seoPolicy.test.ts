import { describe, expect, it } from "vitest";
import { SEARCH_INDEXING_ERROR, canIndexPublicGroup, getSearchIndexingError } from "./seoPolicy";

describe("SEO publication policy", () => {
  it("indexes only an explicitly enabled public listed group with a username", () => {
    expect(canIndexPublicGroup({ status: "listed", username: "otclend", searchIndexable: true })).toBe(true);
    expect(canIndexPublicGroup({ status: "listed", username: null, searchIndexable: true })).toBe(false);
    expect(canIndexPublicGroup({ status: "pending", username: "otclend", searchIndexable: true })).toBe(false);
    expect(canIndexPublicGroup({ status: "listed", username: "otclend", searchIndexable: false })).toBe(false);
  });

  it("explains why a private community cannot be published to Google", () => {
    expect(getSearchIndexingError({ username: null, searchIndexable: true })).toBe(SEARCH_INDEXING_ERROR);
    expect(getSearchIndexingError({ username: "otclend", searchIndexable: true })).toBeUndefined();
  });
});
