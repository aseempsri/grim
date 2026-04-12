import express from "express";
import crypto from "node:crypto";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { registerInventoryRoutes } from "./inventory/routes.js";
import { ensureInventoryIndexes } from "./inventory/inventoryService.js";
import { registerCatalogRoutes } from "./catalog/routes.js";
import { ensureCatalogIndexes, rebuildCatalog, listPublishedPublicListings } from "./catalog/catalogService.js";
import { getPublicBaseUrl } from "./publicUrl.js";
import {
  connectDb,
  listProperties,
  getPropertyById,
  insertProperty,
  replaceProperty,
  deleteProperty,
  listImagesForProperty,
  insertImageRow,
  findImageById,
  deleteImageById,
  propertyExists,
  maxImageDisplayOrder,
  getAgentProfile,
  getAgentById,
  replaceAgentProfile,
  rowToProperty,
} from "./store.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");
const uploadsDir = path.join(rootDir, "uploads");

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_URL = getPublicBaseUrl();

const app = express();

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));

/** Dev visibility: PATCH/POST/etc. to /api show here (GET omitted to reduce noise). */
app.use((req, _res, next) => {
  if (req.originalUrl.startsWith("/api") && req.method !== "GET") {
    console.log(`[api] ${req.method} ${req.originalUrl}`);
  }
  next();
});

fs.mkdirSync(uploadsDir, { recursive: true });
app.use("/uploads", express.static(uploadsDir));

function nowIso() {
  return new Date().toISOString();
}

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const dir = path.join(uploadsDir, "properties", req.params.propertyId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 12 * 1024 * 1024 },
});

const uploadMemory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.originalname.toLowerCase().endsWith(".xlsx")) {
      return cb(new Error("Only .xlsx files are allowed"));
    }
    cb(null, true);
  },
});

const listingImageDiskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(uploadsDir, "inventory-listings");
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const safe = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".avif"].includes(ext) ? ext : ".jpg";
    cb(null, `${crypto.randomUUID()}${safe}`);
  },
});

const uploadListingInventoryImage = multer({
  storage: listingImageDiskStorage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const mime = file.mimetype || "";
    const name = file.originalname || "";
    const extOk = /\.(jpe?g|png|gif|webp|bmp|avif)$/i.test(name);
    if (mime === "" && extOk) return cb(null, true);
    if (/^image\//i.test(mime)) return cb(null, true);
    if (extOk) return cb(null, true);
    return cb(new Error("Only image files (JPEG, PNG, GIF, WebP, BMP, AVIF) are allowed"));
  },
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post(
  "/api/inventory/upload-listing-image",
  (req, res, next) => {
    console.log("[listing-upload] request", {
      contentType: req.headers["content-type"] ?? null,
      contentLength: req.headers["content-length"] ?? null,
    });
    uploadListingInventoryImage.single("file")(req, res, (err) => {
      if (err) {
        console.error("[listing-upload] multer failed:", err.message, err.code ?? "");
        return next(err);
      }
      next();
    });
  },
  asyncHandler(async (req, res) => {
    if (!req.file) {
      console.warn("[listing-upload] no file after multer — field name must be 'file'");
      return res.status(400).json({ error: "Missing file" });
    }
    const relativePath = path.join("inventory-listings", req.file.filename).replace(/\\/g, "/");
    const url = `${PUBLIC_URL}/uploads/${relativePath}`;
    console.log("[listing-upload] ok", {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      savedAs: req.file.filename,
      publicUrl: url,
    });
    res.status(201).json({ url });
  })
);

app.get(
  "/api/public/listings",
  asyncHandler(async (_req, res) => {
    const listings = await listPublishedPublicListings();
    res.json(listings);
  })
);

app.get(
  "/api/properties",
  asyncHandler(async (req, res) => {
    const list = await listProperties({ status: req.query.status });
    res.json(list);
  })
);

app.get(
  "/api/properties/:id",
  asyncHandler(async (req, res) => {
    const row = await getPropertyById(req.params.id);
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  })
);

app.post(
  "/api/properties",
  asyncHandler(async (req, res) => {
    const p = req.body;
    const id = p.id || crypto.randomUUID();
    const t = nowIso();
    const row = {
      id,
      title: p.title,
      property_type: p.property_type,
      listing_type: p.listing_type,
      price: p.price,
      price_unit: p.price_unit ?? "total",
      city: p.city,
      locality: p.locality,
      address: p.address ?? null,
      bhk: p.bhk ?? null,
      bedrooms: p.bedrooms ?? null,
      bathrooms: p.bathrooms ?? null,
      floor_number: p.floor_number ?? null,
      total_floors: p.total_floors ?? null,
      carpet_area: p.carpet_area ?? null,
      built_up_area: p.built_up_area ?? null,
      furnishing: p.furnishing ?? null,
      plot_area: p.plot_area ?? null,
      plot_dimensions: p.plot_dimensions ?? null,
      boundary_wall: Boolean(p.boundary_wall),
      land_type: p.land_type ?? null,
      commercial_type: p.commercial_type ?? null,
      parking_spots: p.parking_spots ?? null,
      facing: p.facing ?? null,
      possession_status: p.possession_status ?? null,
      property_age: p.property_age ?? null,
      amenities: Array.isArray(p.amenities) ? p.amenities : [],
      rera_number: p.rera_number ?? null,
      description: p.description ?? null,
      status: p.status ?? "draft",
      cover_image_url: p.cover_image_url ?? null,
      created_at: t,
      updated_at: t,
    };
    const created = await insertProperty(row);
    res.status(201).json(created);
  })
);

app.patch(
  "/api/properties/:id",
  asyncHandler(async (req, res) => {
    const existing = await getPropertyById(req.params.id);
    if (!existing) return res.status(404).json({ error: "Not found" });

    const p = { ...existing, ...req.body };
    const row = {
      id: req.params.id,
      title: p.title,
      property_type: p.property_type,
      listing_type: p.listing_type,
      price: p.price,
      price_unit: p.price_unit,
      city: p.city,
      locality: p.locality,
      address: p.address ?? null,
      bhk: p.bhk ?? null,
      bedrooms: p.bedrooms ?? null,
      bathrooms: p.bathrooms ?? null,
      floor_number: p.floor_number ?? null,
      total_floors: p.total_floors ?? null,
      carpet_area: p.carpet_area ?? null,
      built_up_area: p.built_up_area ?? null,
      furnishing: p.furnishing ?? null,
      plot_area: p.plot_area ?? null,
      plot_dimensions: p.plot_dimensions ?? null,
      boundary_wall: Boolean(p.boundary_wall),
      land_type: p.land_type ?? null,
      commercial_type: p.commercial_type ?? null,
      parking_spots: p.parking_spots ?? null,
      facing: p.facing ?? null,
      possession_status: p.possession_status ?? null,
      property_age: p.property_age ?? null,
      amenities: Array.isArray(p.amenities) ? p.amenities : [],
      rera_number: p.rera_number ?? null,
      description: p.description ?? null,
      status: p.status ?? "draft",
      cover_image_url: p.cover_image_url ?? null,
      created_at: existing.created_at,
      updated_at: nowIso(),
    };
    const ok = await replaceProperty(req.params.id, row);
    if (!ok) return res.status(404).json({ error: "Not found" });
    res.json(rowToProperty({ _id: row.id, ...row }));
  })
);

app.delete(
  "/api/properties/:id",
  asyncHandler(async (req, res) => {
    const deleted = await deleteProperty(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Not found" });
    res.status(204).send();
  })
);

app.get(
  "/api/properties/:propertyId/images",
  asyncHandler(async (req, res) => {
    const list = await listImagesForProperty(req.params.propertyId);
    res.json(list);
  })
);

app.post(
  "/api/properties/:propertyId/images",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    const { propertyId } = req.params;
    const exists = await propertyExists(propertyId);
    if (!exists) return res.status(404).json({ error: "Property not found" });
    if (!req.file) return res.status(400).json({ error: "Missing file" });

    const relativePath = path
      .join("properties", propertyId, req.file.filename)
      .replace(/\\/g, "/");
    const imageUrl = `${PUBLIC_URL}/uploads/${relativePath}`;

    const maxOrder = await maxImageDisplayOrder(propertyId);

    const id = crypto.randomUUID();
    const t = nowIso();
    const row = {
      id,
      property_id: propertyId,
      image_url: imageUrl,
      storage_path: relativePath,
      display_order: maxOrder + 1,
      is_cover: false,
      created_at: t,
    };
    const created = await insertImageRow(row);
    res.status(201).json(created);
  })
);

app.delete(
  "/api/property-images/:id",
  asyncHandler(async (req, res) => {
    const row = await findImageById(req.params.id);
    if (!row) return res.status(404).json({ error: "Not found" });

    const abs = path.join(uploadsDir, row.storage_path.replace(/\//g, path.sep));
    try {
      if (fs.existsSync(abs)) fs.unlinkSync(abs);
    } catch {
      /* ignore */
    }

    const deleted = await deleteImageById(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Not found" });
    res.status(204).send();
  })
);

app.get(
  "/api/agent-profile",
  asyncHandler(async (_req, res) => {
    const row = await getAgentProfile();
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  })
);

app.patch(
  "/api/agent-profile/:id",
  asyncHandler(async (req, res) => {
    const existing = await getAgentById(req.params.id);
    if (!existing) return res.status(404).json({ error: "Not found" });
    const p = { ...existing, ...req.body, updated_at: nowIso() };
    const row = {
      id: req.params.id,
      name: p.name,
      phone: p.phone ?? null,
      whatsapp: p.whatsapp ?? null,
      email: p.email ?? null,
      tagline: p.tagline ?? null,
      logo_url: p.logo_url ?? null,
      created_at: existing.created_at,
      updated_at: p.updated_at,
    };
    const ok = await replaceAgentProfile(req.params.id, row);
    if (!ok) return res.status(404).json({ error: "Not found" });
    res.json(row);
  })
);

registerInventoryRoutes(app, { asyncHandler, uploadMemory });
registerCatalogRoutes(app, { asyncHandler });

app.use((err, _req, res, _next) => {
  console.error(err);
  if (err.message === "Only .xlsx files are allowed") {
    return res.status(400).json({ error: err.message });
  }
  if (/^Only image files \(JPEG, PNG, GIF, WebP/.test(err.message)) {
    return res.status(400).json({ error: err.message });
  }
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ error: "File too large" });
  }
  res.status(500).json({ error: err.message || "Server error" });
});

async function main() {
  await connectDb();
  await ensureInventoryIndexes();
  await ensureCatalogIndexes();
  try {
    const { count } = await rebuildCatalog();
    console.log(`Catalog listings synced: ${count} rows`);
  } catch (e) {
    console.error("Catalog rebuild failed:", e);
  }
  const server = app.listen(PORT, () => {
    console.log(`API listening on http://localhost:${PORT}`);
    console.log(`MongoDB database: ${process.env.MONGODB_DB ?? "grim"}`);
    console.log(`Log: [api] = any non-GET /api call; [listing-upload] = image file POST only`);
  });
  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(
        `\nPort ${PORT} is already in use. Stop the other Node/backend process or set PORT (e.g. 3001) before starting.\n`
      );
    } else {
      console.error(err);
    }
    process.exit(1);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
