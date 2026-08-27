import { describe, expect, it } from "vitest";
import { requireFinanceReviewer } from "./financeReviewAccess";

describe("finance review access", () => {
  it("allows only the main administrator to see or decide withdrawal reviews", () => {
    expect(() => requireFinanceReviewer({ canManageModerators: true })).not.toThrow();
    expect(() => requireFinanceReviewer({ canManageModerators: false })).toThrow(
      "Доступ к заявкам вывода есть только у главного администратора TG TOP",
    );
  });
});
