import { connectDb } from "../store.js";

/** Mirrors inventory collection names — keep in sync with inventoryService.js */
const INV = {
  master: "inventory_master",
  underConstruction: "inventory_under_construction",
  commercial: "inventory_commercial",
  lease: "inventory_lease",
};

const CATALOG = "catalog_listings";

function nowIso() {
  return new Date().toISOString();
}

function normStr(s) {
  return typeof s === "string" ? s.trim() : "";
}

/**
 * @param {'master'|'underConstruction'|'commercial'|'lease'} kind
 * @param {Record<string, unknown>} row — stripped inventory row (has `id`) or raw doc with `_id`
 */
export function deriveDisplayType(kind, row) {
  if (kind === "commercial") return "commercial";
  const blob = (fields) => fields.filter(Boolean).join(" ").toLowerCase();

  if (kind === "lease") {
    const b = blob([
      normStr(row.unitType),
      normStr(row.project),
      normStr(row.location),
      normStr(row.remarks),
    ]);
    if (/\b(plot|land|acre|survey|agricultural)\b/.test(b)) return "plot";
    if (/\b(villa|bungalow|independent house|duplex|ihfd|row house)\b/.test(b)) return "villa";
    if (/\b(shop|office|retail|showroom|warehouse|commercial|hotel)\b/.test(b)) return "commercial";
    return "flat";
  }
  if (kind === "master") {
    const b = blob([
      normStr(row.category),
      normStr(row.subCategory),
      normStr(row.configurationAsset),
    ]);
    if (/\b(land|plot|acre|agricultural|farmland|farm land)\b/.test(b)) return "plot";
    if (/\b(villa|bungalow|independent house|ihfd|row house)\b/.test(b)) return "villa";
    if (/\b(commercial|office|shop|retail|hotel|showroom|pre-leased|pre leased)\b/.test(b))
      return "commercial";
    return "flat";
  }
  if (kind === "underConstruction") {
    const b = blob([normStr(row.configuration), normStr(row.project), normStr(row.location)]);
    if (/\b(plot|land|acre)\b/.test(b)) return "plot";
    if (/\b(villa|bungalow|independent)\b/.test(b)) return "villa";
    if (/\b(commercial|office|shop|retail)\b/.test(b)) return "commercial";
    return "flat";
  }
  return "flat";
}

function formatCr(val) {
  if (val == null || val === "") return "Price on request";
  const n = typeof val === "number" ? val : parseFloat(String(val).replace(/,/g, ""));
  if (Number.isFinite(n)) return `₹${n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)} Cr`;
  return String(val);
}

function formatRent(val) {
  if (val == null || val === "") return "Rent on request";
  const s = String(val).trim();
  return s.toLowerCase().includes("rent") || s.includes("/") ? s : `₹${s}/mo`;
}

/**
 * @param {'master'|'underConstruction'|'commercial'|'lease'} kind
 */
function buildCatalogDoc(kind, row) {
  const sourceId = row.id != null ? String(row.id) : String(row._id);
  const _id = `${kind}:${sourceId}`;
  const updatedAt = row.updatedAt || row.createdAt || nowIso();
  const displayType = deriveDisplayType(kind, row);

  let title = "Listing";
  let subtitle = "";
  let location = "";
  let priceLabel = "";
  /** @type {'sale'|'rent'} */
  let listingIntent = "sale";
  let sourceLabel = "";

  if (kind === "master") {
    title = [normStr(row.category), normStr(row.subCategory)].filter(Boolean).join(" · ") || "Master listing";
    subtitle = [normStr(row.configurationAsset), normStr(row.size)].filter(Boolean).join(" · ");
    location = normStr(row.location);
    priceLabel = formatCr(row.quotedPriceCr);
    sourceLabel = "Master inventory";
    listingIntent = "sale";
  } else if (kind === "underConstruction") {
    title = normStr(row.project) || "Under construction";
    subtitle = [normStr(row.configuration), normStr(row.status), normStr(row.possession)]
      .filter(Boolean)
      .join(" · ");
    location = normStr(row.location);
    priceLabel = formatCr(row.quotedPriceCr);
    sourceLabel = "Under construction";
    listingIntent = "sale";
  } else if (kind === "commercial") {
    title = normStr(row.assetType) || "Commercial";
    subtitle = normStr(row.description) ? normStr(row.description).slice(0, 120) : normStr(row.size);
    location = normStr(row.location);
    priceLabel = formatCr(row.quotedPriceCr);
    sourceLabel = "Commercial sales";
    listingIntent = "sale";
  } else {
    title = normStr(row.project) || "Lease";
    subtitle = [normStr(row.unitType), row.sqft != null && row.sqft !== "" ? `${row.sqft} sq.ft` : ""]
      .filter(Boolean)
      .join(" · ");
    location = normStr(row.location);
    priceLabel = formatRent(row.rentInr);
    sourceLabel = "Lease inventory";
    listingIntent = "rent";
  }

  const urlsFromArr = Array.isArray(row.listingImageUrls)
    ? row.listingImageUrls.filter((u) => typeof u === "string" && u.trim()).map((u) => u.trim())
    : [];
  const legacy =
    typeof row.listingImageUrl === "string" && row.listingImageUrl.trim()
      ? row.listingImageUrl.trim()
      : null;
  const listingImageUrls = urlsFromArr.length ? urlsFromArr : legacy ? [legacy] : [];
  const listingImageUrl = listingImageUrls[0] ?? null;

  return {
    _id,
    sourceKind: kind,
    sourceId,
    displayType,
    listingIntent,
    title,
    subtitle,
    location,
    priceLabel,
    sourceLabel,
    updatedAt,
    listingImageUrl,
    listingImageUrls,
    publishedOnListing: row.publishedOnListing === true,
  };
}

export async function ensureCatalogIndexes() {
  const db = await connectDb();
  await db.collection(CATALOG).createIndex({ displayType: 1 });
  await db.collection(CATALOG).createIndex({ updatedAt: -1 });
}

/**
 * Full rebuild — run after bulk import or server startup.
 */
export async function rebuildCatalog() {
  const db = await connectDb();
  const coll = db.collection(CATALOG);
  await coll.deleteMany({});

  const kinds = /** @type {const} */ (["master", "underConstruction", "commercial", "lease"]);
  const docs = [];
  for (const k of kinds) {
    const rows = await db.collection(INV[k]).find({}).toArray();
    for (const raw of rows) {
      const row = { ...raw, id: String(raw._id) };
      docs.push(buildCatalogDoc(k, row));
    }
  }
  if (docs.length) await coll.insertMany(docs);
  return { count: docs.length };
}

/**
 * Upsert one row (after manual create/update). `row` is API-shaped with `id`.
 * @param {'master'|'underConstruction'|'commercial'|'lease'} kind
 */
export async function upsertCatalogEntry(kind, row) {
  const db = await connectDb();
  const doc = buildCatalogDoc(kind, row);
  await db.collection(CATALOG).replaceOne({ _id: doc._id }, doc, { upsert: true });
}

/**
 * @param {'master'|'underConstruction'|'commercial'|'lease'} kind
 */
export async function removeCatalogEntry(kind, id) {
  const db = await connectDb();
  const _id = `${kind}:${String(id)}`;
  await db.collection(CATALOG).deleteOne({ _id });
}

/**
 * Rows marked for the public customer Listings page (`publishedOnListing` in inventory collections).
 */
export async function listPublishedPublicListings() {
  const db = await connectDb();
  const kinds = /** @type {const} */ (["master", "underConstruction", "commercial", "lease"]);
  const out = [];
  for (const k of kinds) {
    const rows = await db
      .collection(INV[k])
      .find({ publishedOnListing: true })
      .sort({ updatedAt: -1 })
      .toArray();
    for (const raw of rows) {
      const row = { ...raw, id: String(raw._id) };
      const doc = buildCatalogDoc(k, row);
      const urlsFromArr = Array.isArray(raw.listingImageUrls)
        ? raw.listingImageUrls.filter((u) => typeof u === "string" && u.trim()).map((u) => u.trim())
        : [];
      const legacy =
        typeof raw.listingImageUrl === "string" && raw.listingImageUrl.trim()
          ? raw.listingImageUrl.trim()
          : null;
      const listingImageUrls = urlsFromArr.length ? urlsFromArr : legacy ? [legacy] : [];
      const listingImageUrl = listingImageUrls[0] ?? null;
      const { _id: catalogKey, ...fields } = doc;
      out.push({
        catalogKey,
        listingImageUrl,
        listingImageUrls,
        ...fields,
      });
    }
  }
  out.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  return out;
}

/**
 * @param {{ type?: string, publishedOnly?: boolean }} q — type: all | flat | plot | commercial | villa
 */
export async function listCatalogListings(q = {}) {
  const db = await connectDb();
  const filter = {};
  const t = q.type;
  if (t && t !== "all" && ["flat", "plot", "commercial", "villa"].includes(t)) {
    filter.displayType = t;
  }
  if (q.publishedOnly === true) {
    filter.publishedOnListing = true;
  }
  const rows = await db
    .collection(CATALOG)
    .find(filter)
    .sort({ updatedAt: -1 })
    .toArray();
  return rows.map((r) => {
    const { _id, ...rest } = r;
    return { catalogId: _id, ...rest };
  });
}

function aggregateTypeCounts(match = {}) {
  return [{ $match: match }, { $group: { _id: "$displayType", n: { $sum: 1 } } }];
}

export async function getCatalogCounts() {
  const db = await connectDb();
  const agg = await db.collection(CATALOG).aggregate(aggregateTypeCounts({})).toArray();
  const byType = { flat: 0, plot: 0, commercial: 0, villa: 0 };
  let all = 0;
  for (const x of agg) {
    const k = x._id;
    if (k && k in byType) {
      byType[k] = x.n;
      all += x.n;
    }
  }
  return { all, ...byType };
}

/** Counts for rows with `publishedOnListing: true` (public listings page). */
export async function getPublishedCatalogCounts() {
  const db = await connectDb();
  const agg = await db
    .collection(CATALOG)
    .aggregate(aggregateTypeCounts({ publishedOnListing: true }))
    .toArray();
  const byType = { flat: 0, plot: 0, commercial: 0, villa: 0 };
  let all = 0;
  for (const x of agg) {
    const k = x._id;
    if (k && k in byType) {
      byType[k] = x.n;
      all += x.n;
    }
  }
  return { all, ...byType };
}
