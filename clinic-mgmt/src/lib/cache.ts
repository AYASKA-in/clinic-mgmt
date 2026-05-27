const store = new Map<string, { data: unknown; expiry: number }>()

export async function withCache<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const existing = store.get(key)
  if (existing && existing.expiry > Date.now()) {
    return existing.data as T
  }
  const data = await fn()
  store.set(key, { data, expiry: Date.now() + ttlMs })
  if (store.size > 100) {
    const oldest = store.entries().next().value
    if (oldest) store.delete(oldest[0])
  }
  return data
}

export function clearCache(pattern?: string) {
  if (!pattern) { store.clear(); return }
  for (const key of store.keys()) {
    if (key.startsWith(pattern)) store.delete(key)
  }
}
