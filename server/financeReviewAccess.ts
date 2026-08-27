export type FinanceReviewAccess = {
  canManageModerators: boolean;
};

/** Finance review exposes wallet data and can change a withdrawal state. */
export function requireFinanceReviewer(access: FinanceReviewAccess) {
  if (!access.canManageModerators) {
    throw new Error("Доступ к заявкам вывода есть только у главного администратора TG TOP");
  }
}
