export type CatalogLanguage = "ru" | "en";

export const formatCatalogNumber = (value: number, language: CatalogLanguage = "ru") =>
  new Intl.NumberFormat(language === "en" ? "en-US" : "ru-RU").format(value);

export const formatCatalogDate = (value?: Date | null, language: CatalogLanguage = "ru") =>
  value
    ? new Date(value).toLocaleDateString(language === "en" ? "en-US" : "ru-RU", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

export const formatCatalogDateTime = (value?: Date | null, language: CatalogLanguage = "ru") =>
  value
    ? new Intl.DateTimeFormat(language === "en" ? "en-US" : "ru-RU", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date(value))
    : "—";

export const formatGram = (units: number | null | undefined) => {
  const amount = Math.max(0, Number(units ?? 0)) / 100;
  return amount.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
};

export const parseGramInput = (value: string): number | undefined => {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return undefined;
  const units = Math.round(Number(normalized) * 100);
  return Number.isSafeInteger(units) ? units : undefined;
};

export const normalizeRankingBid = (value: number): number | undefined => {
  if (!Number.isFinite(value)) return undefined;
  const rounded = Math.round((value + Number.EPSILON) * 10) / 10;
  return Math.abs(value - rounded) <= 1e-8 ? rounded : undefined;
};
