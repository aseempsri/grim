import {
  getCatalogCounts,
  getPublishedCatalogCounts,
  listCatalogListings,
  rebuildCatalog,
} from "./catalogService.js";

export function registerCatalogRoutes(app, { asyncHandler }) {
  app.get(
    "/api/catalog/listings",
    asyncHandler(async (req, res) => {
      const type = typeof req.query.type === "string" ? req.query.type : "all";
      const publishedOnly =
        req.query.publishedOnly === "1" || req.query.publishedOnly === "true";
      const [listings, counts, publishedCounts] = await Promise.all([
        listCatalogListings({ type, publishedOnly }),
        getCatalogCounts(),
        getPublishedCatalogCounts(),
      ]);
      res.json({ listings, counts, publishedCounts });
    })
  );

  app.post(
    "/api/catalog/rebuild",
    asyncHandler(async (_req, res) => {
      const result = await rebuildCatalog();
      res.json(result);
    })
  );
}
