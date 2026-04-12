export type CatalogDisplayType = "flat" | "plot" | "commercial" | "villa";

export type CatalogListing = {
  catalogId: string;
  sourceKind: "master" | "underConstruction" | "commercial" | "lease";
  sourceId: string;
  displayType: CatalogDisplayType;
  listingIntent: "sale" | "rent";
  title: string;
  subtitle: string;
  location: string;
  priceLabel: string;
  sourceLabel: string;
  updatedAt: string;
  /** First gallery image for cards (from inventory listing images) */
  listingImageUrl?: string | null;
  listingImageUrls?: string[];
  /** Shown on public `/properties` when the inventory row is toggled on */
  publishedOnListing?: boolean;
};

export type CatalogCounts = {
  all: number;
  flat: number;
  plot: number;
  commercial: number;
  villa: number;
};

export type CatalogListResponse = {
  listings: CatalogListing[];
  counts: CatalogCounts;
  /** Counts for rows with `publishedOnListing: true`, by display type */
  publishedCounts: CatalogCounts;
};
