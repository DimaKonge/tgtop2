import { describe, expect, it } from "vitest";

describe("Manus API credentials", () => {
  it.skipIf(!process.env.MANUS_API_KEY)("authorizes a read-only task list request", async () => {
    const response = await fetch("https://api.manus.ai/v2/task.list", {
      headers: { "x-manus-api-key": process.env.MANUS_API_KEY! },
    });
    expect(response.status).toBe(200);
    const body = await response.json() as { ok?: boolean };
    expect(body.ok).toBe(true);
  }, 15_000);
});
