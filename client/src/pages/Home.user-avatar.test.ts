import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("TG TOP Telegram user avatar sync", () => {
  it("prioritizes the current Mini App photo_url over a cached session avatar", () => {
    const source = readFileSync(new URL("./Home.tsx", import.meta.url), "utf8");

    expect(source).toContain("const displayUserAvatar = useMemo");
    expect(source).toContain("tgtop_avatar=");
    expect(source).toContain("user?.avatarUrl");
    expect(source).toContain("src={displayUserAvatar}");
    expect(source).toContain("function SafeAvatar");
    expect(source).toContain("onError={() => setFailed(true)}");
    expect(source).toContain("useEffect(() => setFailed(false), [src])");
    expect(source).toContain("SafeAvatar src={detail.group.managerAvatarUrl}");
    expect(source).toContain("SafeAvatar src={publicOwner.owner.avatarUrl}");
    expect(source).toContain("SafeAvatar src={entry.owner.avatarUrl}");
    expect(source).toContain("SafeAvatar src={admin.avatarUrl}");
    expect(source).toContain("SafeAvatar src={reviewedRecipient.avatarUrl}");
  });
});
