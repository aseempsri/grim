import crypto from "node:crypto";

/** @param {(string | number | null | undefined)[]} parts */
export function makeImportKey(parts) {
  const s = parts.map((p) => String(p ?? "").trim().toLowerCase()).join("|");
  return crypto.createHash("sha256").update(s, "utf8").digest("hex");
}

export function normStr(v) {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

export function normNum(v) {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Deep equality for inventory payload comparison (no timestamps) */
export function payloadsEqual(a, b, fieldNames) {
  for (const f of fieldNames) {
    const x = normalizeCompareValue(a[f]);
    const y = normalizeCompareValue(b[f]);
    if (x !== y) return false;
  }
  return true;
}

function normalizeCompareValue(v) {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return String(v);
  return String(v).trim();
}
