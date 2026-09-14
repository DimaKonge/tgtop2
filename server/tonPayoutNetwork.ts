export type TonPayoutTrackedTransaction = {
  hash?: string | null;
  lt?: string | number | null;
  success?: boolean | null;
  total_fees?: string | number | null;
  out_msgs?: Array<{ destination?: { address?: string | null } | null; value?: string | number | null; raw_body?: string | null }> | null;
};

export function getTonApiHeaders() {
  const key = process.env.TONAPI_API_KEY?.trim();
  if (!key) throw new Error("TonAPI не настроен");
  return { Authorization: `Bearer ${key}` };
}

export async function getTonPayoutTransactionByMessageHash(messageHash: string): Promise<TonPayoutTrackedTransaction | null> {
  if (!/^[a-f0-9]{64}$/i.test(messageHash)) return null;
  const response = await fetch(`https://tonapi.io/v2/blockchain/messages/${messageHash}/transaction`, {
    headers: getTonApiHeaders(),
    signal: AbortSignal.timeout(12_000),
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Не удалось проверить статус сообщения выплаты");
  return await response.json() as TonPayoutTrackedTransaction;
}
