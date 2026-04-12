/** International acre → sq.ft (sorting uses a single comparable unit). */
const SQ_FT_PER_ACRE = 43_560;

function parseLooseNum(fragment: string): number | null {
  const t = fragment.replace(/,/g, "").replace(/^\++|\++$/g, "").trim();
  if (!t) return null;
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : null;
}

/**
 * Turn mixed inventory strings (Acres, sq.ft, sqft, ranges) into one number in **square feet**
 * so that e.g. 1 acre sorts above any realistic single sq.ft value in the same column.
 */
export function normalizeAreaMeasureForSort(raw: unknown): number {
  if (raw === null || raw === undefined) return NaN;
  if (typeof raw === "number") {
    return Number.isFinite(raw) ? raw : NaN;
  }

  const s0 = String(raw).trim();
  if (!s0) return NaN;

  const lower = s0.toLowerCase().replace(/\u00a0/g, " ");

  // --- Acres (always convert to sq ft; acres are larger than typical sq.ft figures) ---
  if (/\bacres?\b/.test(lower)) {
    let sumAcres = 0;
    const acreRe = /([\d,.]+)\s*acres?/g;
    let m: RegExpExecArray | null;
    while ((m = acreRe.exec(lower)) !== null) {
      const n = parseLooseNum(m[1]);
      if (n !== null) sumAcres += n;
    }
    if (sumAcres > 0) return sumAcres * SQ_FT_PER_ACRE;
  }

  // --- Explicit sq.ft / sqft / sf ---
  if (/\b(?:sq\.?\s*ft|sqft|(?:^|\s)sf(?:\s|$))\b/.test(lower) || /\d[\d,.]*\s*sqft\b/.test(lower)) {
    const explicit = lower.match(/([\d,.]+)\s*(?:sq\.?\s*ft|sqft|sf\b)/);
    if (explicit) {
      const n = parseLooseNum(explicit[1]);
      if (n !== null) return n;
    }
    const glued = lower.match(/([\d,.]+)(?=sqft)/);
    if (glued) {
      const n = parseLooseNum(glued[1]);
      if (n !== null) return n;
    }
  }

  // --- Numeric range (e.g. carpet area "1471 - 2008", "915 - 1934") — treat as sq.ft, use midpoint ---
  const range = lower.match(/([\d,.]+)\s*[-–—]\s*([\d,.+]+)/);
  if (range && !/\bacres?\b/.test(lower)) {
    const a = parseLooseNum(range[1]);
    const b = parseLooseNum(range[2]);
    if (a !== null && b !== null) return (a + b) / 2;
    if (a !== null) return a;
  }

  // "3970 onwards", "1427 - 2178+"
  const onward = lower.match(/([\d,.]+)\s*[-–—]?\s*([\d,.+]+)?\s*(?:onwards|\+)/);
  if (onward) {
    const a = parseLooseNum(onward[1]);
    if (a !== null) return a;
  }

  // Fallback: first number (project size without acre word but "4 Acres" usually has acre - handled above)
  const any = lower.match(/([\d,.]+)/);
  if (any) {
    const n = parseLooseNum(any[1]);
    if (n !== null) return n;
  }

  return NaN;
}

/** Column keys in inventory that represent area / size text or sqft numbers. */
export const INVENTORY_AREA_SORT_KEYS = new Set([
  "size",
  "carpetAreaSqft",
  "saleableAreaSqft",
  "projectSize",
  "sqft",
]);
