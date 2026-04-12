/** Compare two cell values for table sorting (strings, numbers, dates as ISO strings). */
export function compareForSort(a: unknown, b: unknown): number {
  const empty = (v: unknown) =>
    v === null || v === undefined || v === "" || (typeof v === "number" && Number.isNaN(v));

  if (empty(a) && empty(b)) return 0;
  if (empty(a)) return 1;
  if (empty(b)) return -1;

  if (typeof a === "number" && typeof b === "number") {
    if (Number.isNaN(a) && Number.isNaN(b)) return 0;
    if (Number.isNaN(a)) return 1;
    if (Number.isNaN(b)) return -1;
    return a - b;
  }

  const sa = String(a);
  const sb = String(b);
  const na = Number(sa);
  const nb = Number(sb);
  if (
    !Number.isNaN(na) &&
    !Number.isNaN(nb) &&
    sa.trim() !== "" &&
    sb.trim() !== "" &&
    /^-?\d/.test(sa.trim()) &&
    /^-?\d/.test(sb.trim())
  ) {
    return na - nb;
  }

  return sa.localeCompare(sb, undefined, { numeric: true, sensitivity: "base" });
}

export function sortRows<T>(
  rows: T[],
  sortKey: string | null,
  sortDir: "asc" | "desc",
  getValue: (row: T, key: string) => unknown
): T[] {
  if (!sortKey) return rows;
  const mul = sortDir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => mul * compareForSort(getValue(a, sortKey), getValue(b, sortKey)));
}

export function nextSortState(
  currentKey: string | null,
  currentDir: "asc" | "desc",
  clickedKey: string
): { key: string | null; dir: "asc" | "desc" } {
  if (currentKey !== clickedKey) {
    return { key: clickedKey, dir: "asc" };
  }
  if (currentDir === "asc") {
    return { key: clickedKey, dir: "desc" };
  }
  return { key: null, dir: "asc" };
}
