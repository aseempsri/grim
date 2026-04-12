import type { AnyInventory } from "@/types/inventory";

/** Fields we search — covers table columns; excludes internal keys that add noise. */
const SKIP_KEYS = new Set(["importKey"]);

function rowHaystack(row: AnyInventory): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(row as Record<string, unknown>)) {
    if (SKIP_KEYS.has(k)) continue;
    if (v === null || v === undefined) continue;
    parts.push(typeof v === "number" && Number.isFinite(v) ? String(v) : String(v));
  }
  return parts.join(" ").toLowerCase();
}

/**
 * Keyword search across all values on each row. Whitespace splits terms; every term must match (AND).
 */
export function filterInventoryRowsByKeyword(rows: AnyInventory[], rawQuery: string): AnyInventory[] {
  const tokens = rawQuery
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length === 0) return rows;

  return rows.filter((row) => {
    const hay = rowHaystack(row);
    return tokens.every((t) => hay.includes(t));
  });
}
