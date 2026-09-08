import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("Google publication opt-in", () => {
  it("keeps search publication explicitly controlled by the community owner", () => {
    const source = fs.readFileSync(path.resolve(import.meta.dirname, "Home.tsx"), "utf8");
    expect(source).toContain('const [searchIndexable, setSearchIndexable] = useState(false);');
    expect(source).toContain('Показывать в Google');
    expect(source).toContain('searchIndexable,');
    expect(source).toContain('tgtop.me/c/{detail.group.username}');
  });
});
