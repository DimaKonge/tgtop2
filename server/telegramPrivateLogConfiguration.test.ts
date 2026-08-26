import { describe, expect, it } from "vitest";
import { parsePrivateLogDestinationCommand } from "./telegramBot";

describe("private log destination commands", () => {
  it("accepts only the two exact owner configuration commands", () => {
    expect(parsePrivateLogDestinationCommand("/tgtop_log_top")).toBe("top_activity");
    expect(parsePrivateLogDestinationCommand("/tgtop_log_finance@TG_TOPBOT")).toBe("finance");
    expect(parsePrivateLogDestinationCommand("/tgtop_log_top extra")).toBeNull();
    expect(parsePrivateLogDestinationCommand("/start")).toBeNull();
  });
});
