export type LocalModerationVerdict = { verdict: "approved" | "review"; reason?: string; evidence?: string };

const highRiskPatterns: Array<[RegExp, string]> = [
  [/(?:onlyfans|porn|секс[-\s]?услуг|эскорт)/i, "Подозрение на запрещённый 18+ контент"],
  [/(?:наркотик|закладк|мефедрон|крипто[-\s]?казино)/i, "Подозрение на запрещённые товары или азартные схемы"],
  [/(?:сид[-\s]?фраз|seed phrase|верификац.*кошел|дроп[-\s]?карт)/i, "Подозрение на мошенническую схему"],
];

export function inspectLocalContent(text?: string | null): LocalModerationVerdict {
  const value = text?.replace(/\s+/g, " ").trim();
  if (!value) return { verdict: "approved" };
  const hit = highRiskPatterns.find(([pattern]) => pattern.test(value));
  if (hit) return { verdict: "review", reason: hit[1], evidence: value.slice(0, 220) };
  const links = value.match(/https?:\/\/\S+/gi) ?? [];
  if (links.length >= 4) return { verdict: "review", reason: "Подозрение на массовый спам", evidence: `Обнаружено ссылок: ${links.length}` };
  return { verdict: "approved" };
}
