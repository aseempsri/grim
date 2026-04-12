import crypto from "node:crypto";
import { MongoClient } from "mongodb";
import { rewriteUploadUrl } from "./publicUrl.js";

const MONGO_URI = process.env.MONGODB_URI ?? "mongodb://localhost:27017/grim";
const DB_NAME = process.env.MONGODB_DB ?? "grim";

/** @typedef {{ id: string; title: string; property_type: string; listing_type: string; price: number; price_unit: string; city: string; locality: string; address: string | null; bhk: number | null; bedrooms: number | null; bathrooms: number | null; floor_number: number | null; total_floors: number | null; carpet_area: number | null; built_up_area: number | null; furnishing: string | null; plot_area: number | null; plot_dimensions: string | null; boundary_wall: boolean; land_type: string | null; commercial_type: string | null; parking_spots: number | null; facing: string | null; possession_status: string | null; property_age: string | null; amenities: string[]; rera_number: string | null; description: string | null; status: string; cover_image_url: string | null; created_at: string; updated_at: string }} PropertyRow */

/** @typedef {{ id: string; property_id: string; image_url: string; storage_path: string; display_order: number; is_cover: boolean; created_at: string }} ImageRow */

/** @typedef {{ id: string; name: string; phone: string | null; whatsapp: string | null; email: string | null; tagline: string | null; logo_url: string | null; created_at: string; updated_at: string }} AgentRow */

let client;
/** @type {import("mongodb").Db | null} */
let db;

export async function connectDb() {
  if (db) return db;
  client = new MongoClient(MONGO_URI, {
    serverSelectionTimeoutMS: 10_000,
  });
  await client.connect();
  db = client.db(DB_NAME);
  await ensureIndexes(db);
  await seedAgentIfEmpty(db);
  await migrateAgentProfilePlaceholders(db);
  return db;
}

async function ensureIndexes(database) {
  await database.collection("properties").createIndex({ status: 1 });
  await database.collection("property_images").createIndex({ property_id: 1 });
}

async function seedAgentIfEmpty(database) {
  const coll = database.collection("agent_profile");
  const count = await coll.countDocuments();
  if (count > 0) return;
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await coll.insertOne({
    _id: id,
    id,
    name: "",
    phone: null,
    whatsapp: null,
    email: null,
    tagline: "",
    logo_url: null,
    created_at: now,
    updated_at: now,
  });
}

async function migrateAgentProfilePlaceholders(database) {
  const coll = database.collection("agent_profile");
  const now = new Date().toISOString();
  await coll.updateMany(
    { name: "Your Name" },
    { $set: { name: "", updated_at: now } }
  );
  await coll.updateMany(
    { tagline: "Premium Real Estate Solutions" },
    { $set: { tagline: "", updated_at: now } }
  );
}

export function rowToProperty(row) {
  if (!row) return null;
  const id = row.id ?? row._id;
  const { _id, ...rest } = row;
  const cover = rest.cover_image_url != null ? rewriteUploadUrl(rest.cover_image_url) : null;
  return {
    ...rest,
    id: String(id),
    boundary_wall: Boolean(row.boundary_wall),
    amenities: Array.isArray(row.amenities) ? row.amenities : [],
    cover_image_url: cover,
  };
}

export function rowToImage(row) {
  if (!row) return null;
  const id = row.id ?? row._id;
  const { _id, ...rest } = row;
  return {
    ...rest,
    id: String(id),
    is_cover: Boolean(row.is_cover),
    image_url: rewriteUploadUrl(rest.image_url),
  };
}

function agentToApi(doc) {
  if (!doc) return null;
  const id = doc.id ?? doc._id;
  const { _id, ...rest } = doc;
  const logo_url = rest.logo_url != null ? rewriteUploadUrl(rest.logo_url) : null;
  return { ...rest, id: String(id), logo_url };
}

/**
 * @param {{ status?: string }} [query]
 */
export async function listProperties(query = {}) {
  const database = await connectDb();
  const filter = {};
  if (query.status) filter.status = query.status;
  const list = await database
    .collection("properties")
    .find(filter)
    .sort({ created_at: -1 })
    .toArray();
  return list.map(rowToProperty);
}

export async function getPropertyById(id) {
  const database = await connectDb();
  const row = await database.collection("properties").findOne({ _id: id });
  return rowToProperty(row);
}

/** @param {PropertyRow} row */
export async function insertProperty(row) {
  const database = await connectDb();
  const doc = { _id: row.id, ...row };
  await database.collection("properties").insertOne(doc);
  return rowToProperty(doc);
}

/** @param {string} id
 *  @param {PropertyRow} row */
export async function replaceProperty(id, row) {
  const database = await connectDb();
  const doc = { _id: id, ...row, id };
  const r = await database.collection("properties").replaceOne({ _id: id }, doc);
  return r.matchedCount > 0;
}

export async function deleteProperty(id) {
  const database = await connectDb();
  const images = database.collection("property_images");
  const props = database.collection("properties");
  const r = await props.deleteOne({ _id: id });
  if (r.deletedCount === 0) return false;
  await images.deleteMany({ property_id: id });
  return true;
}

export async function listImagesForProperty(propertyId) {
  const database = await connectDb();
  const rows = await database
    .collection("property_images")
    .find({ property_id: propertyId })
    .sort({ display_order: 1, created_at: 1 })
    .toArray();
  return rows.map(rowToImage);
}

/** @param {ImageRow} row */
export async function maxImageDisplayOrder(propertyId) {
  const database = await connectDb();
  const one = await database
    .collection("property_images")
    .find({ property_id: propertyId })
    .sort({ display_order: -1 })
    .limit(1)
    .toArray();
  return one[0]?.display_order ?? -1;
}

export async function insertImageRow(row) {
  const database = await connectDb();
  const doc = { _id: row.id, ...row };
  await database.collection("property_images").insertOne(doc);
  return rowToImage(doc);
}

export async function findImageById(id) {
  const database = await connectDb();
  return database.collection("property_images").findOne({ _id: id });
}

export async function deleteImageById(id) {
  const database = await connectDb();
  const r = await database.collection("property_images").deleteOne({ _id: id });
  return r.deletedCount > 0;
}

export async function propertyExists(id) {
  const database = await connectDb();
  const n = await database.collection("properties").countDocuments({ _id: id }, { limit: 1 });
  return n > 0;
}

export async function getAgentProfile() {
  const database = await connectDb();
  const doc = await database.collection("agent_profile").findOne({}, { sort: { _id: 1 } });
  return agentToApi(doc);
}

export async function getAgentById(id) {
  const database = await connectDb();
  const doc = await database.collection("agent_profile").findOne({ _id: id });
  return agentToApi(doc);
}

/** @param {string} id
 *  @param {AgentRow} row */
export async function replaceAgentProfile(id, row) {
  const database = await connectDb();
  const doc = { _id: id, id, ...row };
  const r = await database.collection("agent_profile").replaceOne({ _id: id }, doc);
  return r.matchedCount > 0;
}
