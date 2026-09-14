export type Clock = () => number;

type CacheEntry<Value> = {
  value: Value;
  expiresAt: number;
};

/** A small LRU-like TTL cache with an explicit upper bound for public routes. */
export class BoundedTtlCache<Value> {
  private readonly entries = new Map<string, CacheEntry<Value>>();

  constructor(
    private readonly maxEntries: number,
    private readonly now: Clock = () => Date.now(),
  ) {
    if (!Number.isSafeInteger(maxEntries) || maxEntries < 1) throw new Error("maxEntries must be a positive integer");
  }

  get(key: string): Value | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= this.now()) {
      this.entries.delete(key);
      return undefined;
    }
    // Refresh insertion order so old, hot keys survive capacity pressure.
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }

  set(key: string, value: Value, ttlMs: number): void {
    if (!Number.isFinite(ttlMs) || ttlMs <= 0) return;
    this.entries.delete(key);
    this.entries.set(key, { value, expiresAt: this.now() + ttlMs });
    while (this.entries.size > this.maxEntries) {
      const oldestKey = this.entries.keys().next().value as string | undefined;
      if (!oldestKey) return;
      this.entries.delete(oldestKey);
    }
  }

  get size() {
    return this.entries.size;
  }
}

/** Coalesces identical concurrent fetches so a cache miss causes one upstream call. */
export class InFlightRequestCoalescer<Value> {
  private readonly pending = new Map<string, Promise<Value>>();

  run(key: string, loader: () => Promise<Value>): Promise<Value> {
    const current = this.pending.get(key);
    if (current) return current;
    const request = Promise.resolve().then(loader).finally(() => this.pending.delete(key));
    this.pending.set(key, request);
    return request;
  }

  get size() {
    return this.pending.size;
  }
}
