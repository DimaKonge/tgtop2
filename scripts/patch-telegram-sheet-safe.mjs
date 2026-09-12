import { readFileSync, writeFileSync } from "node:fs";

const target = new URL("../client/src/pages/Home.tsx", import.meta.url);
let lines = readFileSync(target, "utf8").split("\n");

function removeBlock(startPredicate, endPredicate, label) {
  const start = lines.findIndex(startPredicate);
  if (start < 0) throw new Error(`Start not found: ${label}`);
  const end = lines.findIndex((line, index) => index >= start && endPredicate(line, index));
  if (end < 0) throw new Error(`End not found: ${label}`);
  lines.splice(start, end - start + 1);
}

removeBlock(
  line => line.includes("const telegramHistoricalStatsQuery ="),
  (line, index) => index > 0 && line.trim() === "});" && lines[index + 1]?.includes("const telegramHistoricalStats ="),
  "historical stats query",
);
removeBlock(
  line => line.includes("const telegramHistoricalStats ="),
  (line, index) => index > 0 && line.includes("const catalogTaxonomyQuery ="),
  "historical stats type",
);
removeBlock(
  line => line.includes("const allowTelegramHistoricalStats ="),
  (line, index) => index > 0 && line.trim() === "});" && lines[index + 1]?.includes("const createTonDepositMutation ="),
  "historical stats mutations",
);
lines = lines.filter(line => !line.includes("const [telegramStatsUsername, setTelegramStatsUsername] =") && !line.includes("const [telegramStatsRange, setTelegramStatsRange] ="));
lines = lines.filter(line => !line.includes("telegramHistoricalStats.map"));

let source = lines.join("\n");
const replaceOnce = (from, to, label) => {
  if (!source.includes(from)) throw new Error(`Text not found: ${label}`);
  source = source.replace(from, to);
};

replaceOnce(
  "<Sheet open={telegramUserAgentSheetOpen} onOpenChange={setTelegramUserAgentSheetOpen}>",
  "<Sheet open={telegramUserAgentSheetOpen} onOpenChange={open => { if (!open && (requestTelegramUserAgentCode.isPending || confirmTelegramUserAgentCode.isPending || confirmTelegramUserAgentPassword.isPending || disconnectTelegramUserAgent.isPending)) return; setTelegramUserAgentSheetOpen(open); }}>",
  "sheet open handler",
);
replaceOnce(
  "      void utils.telegramUserAgent.status.invalidate();\n    },\n    onError: error => toast.error(error.message),\n  });\n  const confirmTelegramUserAgentCode",
  "      if (result.status === \"connected\") {\n        utils.telegramUserAgent.status.setData(undefined, current => current ? { ...current, status: \"connected\", accountTelegramId: result.accountTelegramId, accountUsername: result.accountUsername, expiresAt: null } : current);\n      } else {\n        utils.telegramUserAgent.status.setData(undefined, current => current ? { ...current, status: \"password_pending\" } : current);\n      }\n      void utils.telegramUserAgent.status.invalidate();\n    },\n    onError: error => toast.error(error.message),\n  });\n  const confirmTelegramUserAgentCode",
  "confirmCode callback",
);
replaceOnce(
  "      void utils.telegramUserAgent.status.invalidate();\n    },\n    onError: error => toast.error(error.message),\n  });\n  const disconnectTelegramUserAgent",
  "      utils.telegramUserAgent.status.setData(undefined, current => current ? { ...current, status: \"connected\", accountTelegramId: result.accountTelegramId, accountUsername: result.accountUsername, expiresAt: null } : current);\n      void utils.telegramUserAgent.status.invalidate();\n    },\n    onError: error => toast.error(error.message),\n  });\n  const disconnectTelegramUserAgent",
  "confirmPassword callback",
);
replaceOnce(
  "      toast.success(\"Сессия рабочего Telegram-аккаунта отключена\");\n      void utils.telegramUserAgent.status.invalidate();",
  "      utils.telegramUserAgent.status.setData(undefined, current => current ? { ...current, status: \"disconnected\", accountTelegramId: null, accountUsername: null, expiresAt: null } : current);\n      toast.success(\"Сессия рабочего Telegram-аккаунта отключена\");\n      void utils.telegramUserAgent.status.invalidate();",
  "disconnect callback",
);

writeFileSync(target, source);
console.log(JSON.stringify({ updated: true, lines: source.split("\n").length, bytes: source.length }));
