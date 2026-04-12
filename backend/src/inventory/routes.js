import { parseInventoryWorkbook } from "./parseWorkbook.js";
import {
  listInventory,
  getInventoryItem,
  upsertRows,
  createManual,
  updateManual,
  deleteInventory,
  getInventoryDashboardStats,
  getInventoryDashboardInsights,
  setPublishedOnListing,
} from "./inventoryService.js";
import { rebuildCatalog, removeCatalogEntry, upsertCatalogEntry } from "../catalog/catalogService.js";

const KIND = {
  master: "master",
  "under-construction": "underConstruction",
  commercial: "commercial",
  lease: "lease",
};

function resolveKind(param) {
  const k = KIND[param];
  if (!k) return null;
  return k;
}

export function registerInventoryRoutes(app, { asyncHandler, uploadMemory }) {
  app.get(
    "/api/inventory/stats",
    asyncHandler(async (_req, res) => {
      const stats = await getInventoryDashboardStats();
      res.json(stats);
    })
  );

  app.get(
    "/api/inventory/insights",
    asyncHandler(async (_req, res) => {
      const insights = await getInventoryDashboardInsights();
      res.json(insights);
    })
  );

  // Must be registered before /api/inventory/:kind — otherwise POST …/import is handled as :kind = "import"
  app.post(
    "/api/inventory/import",
    uploadMemory.single("file"),
    asyncHandler(async (req, res) => {
      if (!req.file?.buffer) {
        return res.status(400).json({ error: "Missing .xlsx file (field name: file)" });
      }
      const parsed = parseInventoryWorkbook(req.file.buffer);
      const summary = {
        master: await upsertRows("master", parsed.master),
        underConstruction: await upsertRows("underConstruction", parsed.underConstruction),
        commercial: await upsertRows("commercial", parsed.commercial),
        lease: await upsertRows("lease", parsed.lease),
      };
      await rebuildCatalog();
      res.json({
        summary,
        counts: {
          master: parsed.master.length,
          underConstruction: parsed.underConstruction.length,
          commercial: parsed.commercial.length,
          lease: parsed.lease.length,
        },
      });
    })
  );

  app.get(
    "/api/inventory/:kind",
    asyncHandler(async (req, res) => {
      const kind = resolveKind(req.params.kind);
      if (!kind) return res.status(404).json({ error: "Unknown inventory type" });
      const rows = await listInventory(kind);
      res.json(rows);
    })
  );

  app.get(
    "/api/inventory/:kind/:id",
    asyncHandler(async (req, res) => {
      const kind = resolveKind(req.params.kind);
      if (!kind) return res.status(404).json({ error: "Unknown inventory type" });
      const row = await getInventoryItem(kind, req.params.id);
      if (!row) return res.status(404).json({ error: "Not found" });
      res.json(row);
    })
  );

  app.post(
    "/api/inventory/:kind",
    asyncHandler(async (req, res) => {
      const kind = resolveKind(req.params.kind);
      if (!kind) return res.status(404).json({ error: "Unknown inventory type" });
      try {
        const row = await createManual(kind, req.body);
        await upsertCatalogEntry(kind, row);
        res.status(201).json(row);
      } catch (e) {
        if (e.code === "DUPLICATE_KEY") {
          return res.status(409).json({ error: "A row with the same key fields already exists" });
        }
        throw e;
      }
    })
  );

  app.patch(
    "/api/inventory/:kind/:id/published-listing",
    asyncHandler(async (req, res) => {
      const kind = resolveKind(req.params.kind);
      if (!kind) return res.status(404).json({ error: "Unknown inventory type" });
      const published = req.body?.published;
      if (typeof published !== "boolean") {
        return res.status(400).json({ error: "Body must include published: boolean" });
      }
      const row = await setPublishedOnListing(kind, req.params.id, published);
      if (!row) return res.status(404).json({ error: "Not found" });
      res.json(row);
    })
  );

  app.patch(
    "/api/inventory/:kind/:id",
    asyncHandler(async (req, res) => {
      const kind = resolveKind(req.params.kind);
      if (!kind) return res.status(404).json({ error: "Unknown inventory type" });
      try {
        const row = await updateManual(kind, req.params.id, req.body);
        if (!row) return res.status(404).json({ error: "Not found" });
        await upsertCatalogEntry(kind, row);
        res.json(row);
      } catch (e) {
        if (e.code === "DUPLICATE_KEY") {
          return res.status(409).json({ error: "A row with the same key fields already exists" });
        }
        throw e;
      }
    })
  );

  app.delete(
    "/api/inventory/:kind/:id",
    asyncHandler(async (req, res) => {
      const kind = resolveKind(req.params.kind);
      if (!kind) return res.status(404).json({ error: "Unknown inventory type" });
      const ok = await deleteInventory(kind, req.params.id);
      if (!ok) return res.status(404).json({ error: "Not found" });
      await removeCatalogEntry(kind, req.params.id);
      res.status(204).send();
    })
  );
}
