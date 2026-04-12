import crypto from "node:crypto";
import { connectDb } from "../store.js";
import { rewriteUploadUrl } from "../publicUrl.js";
import { makeImportKey, payloadsEqual } from "./importKey.js";

const COL = {
  master: "inventory_master",
  underConstruction: "inventory_under_construction",
  commercial: "inventory_commercial",
  lease: "inventory_lease",
};

const FIELDS = {
  master: [
    "category",
    "subCategory",
    "location",
    "configurationAsset",
    "size",
    "quotedPriceCr",
    "remarks",
  ],
  underConstruction: [
    "project",
    "location",
    "status",
    "configuration",
    "quotedPriceCr",
    "possession",
    "carpetAreaSqft",
    "saleableAreaSqft",
    "projectSize",
  ],
  commercial: ["assetType", "location", "description", "size", "quotedPriceCr", "remarks"],
  lease: ["serialNo", "project", "location", "status", "unitType", "sqft", "rentInr", "remarks"],
};

function nowIso() {
  return new Date().toISOString();
}

function listingImagesFromDoc(doc) {
  const arr = Array.isArray(doc.listingImageUrls)
    ? doc.listingImageUrls.filter((u) => typeof u === "string" && u.trim()).map((u) => u.trim())
    : [];
  const legacy =
    doc.listingImageUrl && String(doc.listingImageUrl).trim()
      ? String(doc.listingImageUrl).trim()
      : null;
  if (arr.length) {
    const urls = arr.map((u) => rewriteUploadUrl(u));
    return { listingImageUrls: urls, listingImageUrl: urls[0] ?? null };
  }
  if (legacy) {
    const one = rewriteUploadUrl(legacy);
    return { listingImageUrls: [one], listingImageUrl: one };
  }
  return { listingImageUrls: [], listingImageUrl: null };
}

function stripDoc(doc) {
  if (!doc) return null;
  const {
    _id,
    createdAt,
    updatedAt,
    importKey,
    publishedOnListing,
    listingImageUrl,
    listingImageUrls,
    ...rest
  } = doc;
  const imgs = listingImagesFromDoc({ listingImageUrl, listingImageUrls });
  return {
    id: String(_id),
    importKey,
    createdAt,
    updatedAt,
    publishedOnListing: publishedOnListing === true,
    ...imgs,
    ...rest,
  };
}

export async function ensureInventoryIndexes() {
  const db = await connectDb();
  for (const name of Object.values(COL)) {
    await db.collection(name).createIndex({ importKey: 1 }, { unique: true });
  }
}

/**
 * @param {'master'|'underConstruction'|'commercial'|'lease'} kind
 */
export async function listInventory(kind) {
  const db = await connectDb();
  const coll = db.collection(COL[kind]);
  const rows = await coll.find({}).sort({ updatedAt: -1 }).toArray();
  return rows.map(stripDoc);
}

export async function getInventoryItem(kind, id) {
  const db = await connectDb();
  const row = await db.collection(COL[kind]).findOne({ _id: id });
  return stripDoc(row);
}

function payloadForCompare(kind, data) {
  const fields = FIELDS[kind];
  const o = {};
  for (const f of fields) o[f] = data[f];
  return o;
}

/**
 * @returns {{ inserted: number; updated: number; unchanged: number }}
 */
export async function upsertRows(kind, rows) {
  const db = await connectDb();
  const coll = db.collection(COL[kind]);
  const fields = FIELDS[kind];
  let inserted = 0;
  let updated = 0;
  let unchanged = 0;
  const t = nowIso();

  for (const row of rows) {
    const existing = await coll.findOne({ importKey: row.importKey });
    const newPayload = payloadForCompare(kind, row);

    if (!existing) {
      const id = crypto.randomUUID();
      await coll.insertOne({
        _id: id,
        importKey: row.importKey,
        ...row,
        publishedOnListing: false,
        listingImageUrl: null,
        listingImageUrls: [],
        createdAt: t,
        updatedAt: t,
      });
      inserted++;
      continue;
    }

    const oldPayload = payloadForCompare(kind, existing);
    if (payloadsEqual(oldPayload, newPayload, fields)) {
      unchanged++;
      continue;
    }

    await coll.updateOne(
      { _id: existing._id },
      {
        $set: {
          ...row,
          publishedOnListing: existing.publishedOnListing ?? false,
          listingImageUrl: existing.listingImageUrl ?? null,
          listingImageUrls: Array.isArray(existing.listingImageUrls) ? existing.listingImageUrls : [],
          updatedAt: t,
        },
      }
    );
    updated++;
  }

  return { inserted, updated, unchanged };
}

/**
 * Manual create — importKey derived from row data
 */
export async function createManual(kind, body) {
  const db = await connectDb();
  const coll = db.collection(COL[kind]);
  let importKey = body.importKey;
  if (!importKey) {
    if (kind === "master") {
      importKey = makeImportKey([
        body.category,
        body.subCategory,
        body.location,
        body.configurationAsset,
        body.size,
      ]);
    } else if (kind === "underConstruction") {
      importKey = makeImportKey([body.project, body.location]);
    } else if (kind === "commercial") {
      importKey = makeImportKey([body.assetType, body.location, body.description]);
    } else {
      importKey = makeImportKey([
        body.serialNo != null && body.serialNo !== "" ? String(body.serialNo) : "",
        body.project,
        body.location,
        body.status,
        body.unitType,
        String(body.sqft ?? ""),
      ]);
    }
  }

  const dup = await coll.findOne({ importKey });
  if (dup) {
    const err = new Error("DUPLICATE_KEY");
    err.code = "DUPLICATE_KEY";
    throw err;
  }

  const id = body.id || crypto.randomUUID();
  const t = nowIso();
  const doc = {
    _id: id,
    importKey,
    ...buildDocFromBody(kind, body),
    publishedOnListing: false,
    createdAt: t,
    updatedAt: t,
  };
  await coll.insertOne(doc);
  return stripDoc(doc);
}

function listingImagesFromBody(body) {
  if (Array.isArray(body.listingImageUrls)) {
    const urls = body.listingImageUrls
      .filter((x) => typeof x === "string" && x.trim())
      .map((x) => x.trim());
    return { listingImageUrls: urls, listingImageUrl: urls[0] ?? null };
  }
  const one =
    body.listingImageUrl != null && String(body.listingImageUrl).trim()
      ? String(body.listingImageUrl).trim()
      : null;
  return { listingImageUrls: one ? [one] : [], listingImageUrl: one };
}

function buildDocFromBody(kind, body) {
  const { listingImageUrl, listingImageUrls } = listingImagesFromBody(body);
  if (kind === "master") {
    return {
      category: body.category,
      subCategory: body.subCategory,
      location: body.location,
      configurationAsset: body.configurationAsset,
      size: body.size,
      quotedPriceCr: body.quotedPriceCr ?? null,
      remarks: body.remarks ?? "",
      listingImageUrl,
      listingImageUrls,
    };
  }
  if (kind === "underConstruction") {
    return {
      project: body.project,
      location: body.location,
      status: body.status ?? "",
      configuration: body.configuration ?? "",
      quotedPriceCr: body.quotedPriceCr ?? "",
      possession: body.possession ?? "",
      carpetAreaSqft: body.carpetAreaSqft ?? "",
      saleableAreaSqft: body.saleableAreaSqft ?? "",
      projectSize: body.projectSize ?? "",
      listingImageUrl,
      listingImageUrls,
    };
  }
  if (kind === "commercial") {
    return {
      assetType: body.assetType,
      location: body.location,
      description: body.description ?? "",
      size: body.size ?? "",
      quotedPriceCr: body.quotedPriceCr ?? null,
      remarks: body.remarks ?? "",
      listingImageUrl,
      listingImageUrls,
    };
  }
  return {
    serialNo: body.serialNo ?? null,
    project: body.project,
    location: body.location,
    status: body.status ?? "",
    unitType: body.unitType ?? "",
    sqft: body.sqft ?? null,
    rentInr: body.rentInr ?? "",
    remarks: body.remarks ?? "",
    listingImageUrl,
    listingImageUrls,
  };
}

export async function updateManual(kind, id, body) {
  const db = await connectDb();
  const coll = db.collection(COL[kind]);
  const existing = await coll.findOne({ _id: id });
  if (!existing) return null;

  const merged = { ...existing, ...body };
  const data = buildDocFromBody(kind, merged);

  let importKey;
  if (kind === "master") {
    importKey = makeImportKey([
      data.category,
      data.subCategory,
      data.location,
      data.configurationAsset,
      data.size,
    ]);
  } else if (kind === "underConstruction") {
    importKey = makeImportKey([data.project, data.location]);
  } else if (kind === "commercial") {
    importKey = makeImportKey([data.assetType, data.location, data.description]);
  } else {
    importKey = makeImportKey([
      data.serialNo != null && data.serialNo !== "" ? String(data.serialNo) : "",
      data.project,
      data.location,
      data.status,
      data.unitType,
      String(data.sqft ?? ""),
    ]);
  }

  if (importKey !== existing.importKey) {
    const dup = await coll.findOne({ importKey, _id: { $ne: id } });
    if (dup) {
      const err = new Error("DUPLICATE_KEY");
      err.code = "DUPLICATE_KEY";
      throw err;
    }
  }

  const t = nowIso();
  const publishedOnListing =
    body.publishedOnListing !== undefined ? !!body.publishedOnListing : (existing.publishedOnListing ?? false);

  await coll.updateOne(
    { _id: id },
    {
      $set: {
        ...data,
        importKey,
        publishedOnListing,
        updatedAt: t,
      },
    }
  );
  const fresh = await coll.findOne({ _id: id });
  return stripDoc(fresh);
}

/**
 * Toggle whether a row appears on the public /properties (customer) listings page.
 * @param {'master'|'underConstruction'|'commercial'|'lease'} kind
 * @param {boolean} published
 */
export async function setPublishedOnListing(kind, id, published) {
  const db = await connectDb();
  const coll = db.collection(COL[kind]);
  const t = nowIso();
  const r = await coll.updateOne(
    { _id: id },
    { $set: { publishedOnListing: !!published, updatedAt: t } }
  );
  if (r.matchedCount === 0) return null;
  return stripDoc(await coll.findOne({ _id: id }));
}

export async function deleteInventory(kind, id) {
  const db = await connectDb();
  const r = await db.collection(COL[kind]).deleteOne({ _id: id });
  return r.deletedCount > 0;
}

/**
 * Dashboard aggregates — one unified inventory across all sheets (Excel + manual).
 * forSale: sale-quoted sheets (master, under construction, commercial).
 * forRent: lease sheet.
 * published: on-market rows excluding under-construction pipeline (master + commercial + lease).
 */
export async function getInventoryDashboardStats() {
  const db = await connectDb();
  const [master, underConstruction, commercial, lease] = await Promise.all([
    db.collection(COL.master).countDocuments({}),
    db.collection(COL.underConstruction).countDocuments({}),
    db.collection(COL.commercial).countDocuments({}),
    db.collection(COL.lease).countDocuments({}),
  ]);
  return {
    totalListings: master + underConstruction + commercial + lease,
    forSale: master + underConstruction + commercial,
    forRent: lease,
    published: master + commercial + lease,
  };
}

function normStr(s) {
  return typeof s === "string" ? s.trim() : "";
}

/**
 * Merge location counts across collections (case-insensitive key, keep a readable label).
 */
function mergeLocationCounts(rowsByLoc) {
  const map = new Map();
  for (const { location, count } of rowsByLoc) {
    const display = normStr(location);
    if (!display) continue;
    const key = display.toLowerCase();
    const prev = map.get(key);
    if (prev) prev.count += count;
    else map.set(key, { location: display, count });
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

async function aggregateLocationsPerCollection(db, collectionName) {
  const rows = await db
    .collection(collectionName)
    .aggregate([
      { $match: { location: { $exists: true, $type: "string", $nin: [""] } } },
      { $group: { _id: "$location", count: { $sum: 1 } } },
    ])
    .toArray();
  return rows.map((r) => ({ location: normStr(r._id), count: r.count }));
}

/**
 * Charts + lists for the agent dashboard (all inventory as one pool).
 */
export async function getInventoryDashboardInsights() {
  const db = await connectDb();

  const [masterN, ucN, commN, leaseN] = await Promise.all([
    db.collection(COL.master).countDocuments({}),
    db.collection(COL.underConstruction).countDocuments({}),
    db.collection(COL.commercial).countDocuments({}),
    db.collection(COL.lease).countDocuments({}),
  ]);

  const [
    locMaster,
    locUc,
    locComm,
    locLease,
    masterCategories,
    ucStatuses,
    leaseProjects,
    commercialAssetTypes,
    masterPrices,
    commercialPrices,
  ] = await Promise.all([
    aggregateLocationsPerCollection(db, COL.master),
    aggregateLocationsPerCollection(db, COL.underConstruction),
    aggregateLocationsPerCollection(db, COL.commercial),
    aggregateLocationsPerCollection(db, COL.lease),
    db
      .collection(COL.master)
      .aggregate([
        { $match: { category: { $exists: true, $type: "string", $nin: [""] } } },
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ])
      .toArray(),
    db
      .collection(COL.underConstruction)
      .aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ])
      .toArray(),
    db
      .collection(COL.lease)
      .aggregate([
        { $match: { project: { $exists: true, $type: "string", $nin: [""] } } },
        { $group: { _id: "$project", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ])
      .toArray(),
    db
      .collection(COL.commercial)
      .aggregate([
        { $match: { assetType: { $exists: true, $type: "string", $nin: [""] } } },
        { $group: { _id: "$assetType", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ])
      .toArray(),
    db
      .collection(COL.master)
      .find({ quotedPriceCr: { $type: "number", $gte: 0 } })
      .project({ quotedPriceCr: 1 })
      .toArray(),
    db
      .collection(COL.commercial)
      .find({ quotedPriceCr: { $type: "number", $gte: 0 } })
      .project({ quotedPriceCr: 1 })
      .toArray(),
  ]);

  const mergedLocs = mergeLocationCounts([
    ...locMaster,
    ...locUc,
    ...locComm,
    ...locLease,
  ]).slice(0, 10);

  const mergedLocsFull = mergeLocationCounts([
    ...locMaster,
    ...locUc,
    ...locComm,
    ...locLease,
  ]);
  const totalLines = masterN + ucN + commN + leaseN;
  const saleLines = masterN + ucN + commN;
  const top3LocSum = mergedLocsFull.slice(0, 3).reduce((s, x) => s + x.count, 0);
  const topLocationSharePct =
    totalLines > 0 ? Math.round((mergedLocsFull[0]?.count ?? 0) / totalLines * 100) : 0;
  const top3LocationsSharePct =
    totalLines > 0 ? Math.round((top3LocSum / totalLines) * 100) : 0;

  const priceBandOrder = ["under5", "5to15", "15to30", "over30", "unpriced"];
  const priceBandsMap = {
    under5: { key: "under5", label: "< ₹5 Cr", count: 0 },
    "5to15": { key: "5to15", label: "₹5 – 15 Cr", count: 0 },
    "15to30": { key: "15to30", label: "₹15 – 30 Cr", count: 0 },
    over30: { key: "over30", label: "₹30 Cr+", count: 0 },
    unpriced: { key: "unpriced", label: "No numeric quote", count: 0 },
  };

  function bumpBand(v) {
    if (v < 5) priceBandsMap.under5.count += 1;
    else if (v < 15) priceBandsMap["5to15"].count += 1;
    else if (v < 30) priceBandsMap["15to30"].count += 1;
    else priceBandsMap.over30.count += 1;
  }

  for (const d of masterPrices) bumpBand(d.quotedPriceCr);
  for (const d of commercialPrices) bumpBand(d.quotedPriceCr);
  const saleRowsWithNumericPrice = masterPrices.length + commercialPrices.length;
  priceBandsMap.unpriced.count = Math.max(0, masterN + commN - saleRowsWithNumericPrice);
  const quotedPriceBands = priceBandOrder.map((k) => ({
    key: priceBandsMap[k].key,
    label: priceBandsMap[k].label,
    count: priceBandsMap[k].count,
  }));

  return {
    mix: {
      master: masterN,
      underConstruction: ucN,
      commercial: commN,
      lease: leaseN,
    },
    topLocations: mergedLocs.map((x) => ({ name: x.location, count: x.count })),
    masterCategories: masterCategories.map((r) => ({
      name: normStr(r._id) || "—",
      count: r.count,
    })),
    underConstructionByStatus: ucStatuses.map((r) => ({
      name: normStr(r._id) || "No status",
      count: r.count,
    })),
    leaseByProject: leaseProjects.map((r) => ({
      name: normStr(r._id) || "—",
      count: r.count,
    })),
    commercialByAssetType: commercialAssetTypes.map((r) => ({
      name: normStr(r._id) || "—",
      count: r.count,
    })),
    quotedPriceBands,
    portfolioMetrics: {
      totalLines,
      saleLines,
      leaseLines: leaseN,
      saleSharePct: totalLines > 0 ? Math.round((saleLines / totalLines) * 100) : 0,
      leaseSharePct: totalLines > 0 ? Math.round((leaseN / totalLines) * 100) : 0,
      pipelineShareOfSale: saleLines > 0 ? Math.round((ucN / saleLines) * 100) : 0,
      uniqueLocations: mergedLocsFull.length,
      topLocationSharePct,
      top3LocationsSharePct,
      masterCommercialWithNumericPrice: saleRowsWithNumericPrice,
    },
  };
}
