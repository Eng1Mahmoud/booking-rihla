/**
 * Lightweight in-memory conversation filters.
 * Short-lived, process-local. Suitable for free-tier single-instance API.
 * Keys are scoped by the server to a browser session, authenticated session when present, and conversation ID.
 */

export type ConversationFilters = {
  originCityId?: string | null;
  originCityName?: string | null;
  destinationCityId?: string | null;
  destinationCityName?: string | null;
  originStationId?: string | null;
  destinationStationId?: string | null;
  travelDate?: string;
  departureTimeAfter?: string | null;
  departureTimeBefore?: string | null;
  sortBy?: 'departure' | 'price';
  selectedTripId?: string | null;
  updatedAt: number;
};

const STORE = new Map<string, ConversationFilters>();
const MAX_ENTRIES = 2000;
const TTL_MS = 30 * 60 * 1000; // 30 minutes

function prune() {
  if (STORE.size < MAX_ENTRIES) return;
  const now = Date.now();
  for (const [k, v] of STORE) {
    if (now - v.updatedAt > TTL_MS) STORE.delete(k);
  }
  if (STORE.size >= MAX_ENTRIES) {
    const oldest = [...STORE.entries()].sort(
      (a, b) => a[1].updatedAt - b[1].updatedAt,
    );
    for (let i = 0; i < Math.ceil(MAX_ENTRIES * 0.2); i++) {
      if (oldest[i]) STORE.delete(oldest[i][0]);
    }
  }
}

export function getFilters(conversationId: string): ConversationFilters | null {
  const entry = STORE.get(conversationId);
  if (!entry) return null;
  if (Date.now() - entry.updatedAt > TTL_MS) {
    STORE.delete(conversationId);
    return null;
  }
  return entry;
}

export function updateFilters(
  conversationId: string,
  patch: Partial<Omit<ConversationFilters, 'updatedAt'>>,
): ConversationFilters {
  prune();
  const prev = getFilters(conversationId) ?? { updatedAt: Date.now() };
  const next: ConversationFilters = {
    ...prev,
    ...Object.fromEntries(
      Object.entries(patch).filter(([, v]) => v !== undefined),
    ),
    updatedAt: Date.now(),
  };
  STORE.set(conversationId, next);
  return next;
}

export function clearFilters(conversationId: string) {
  STORE.delete(conversationId);
}
