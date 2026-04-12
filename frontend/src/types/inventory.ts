export type InventoryKindSlug = "master" | "under-construction" | "commercial" | "lease";

/** When true, row appears on the customer-facing /properties Listings page. */
export type InventoryListingFlags = {
  publishedOnListing?: boolean;
  /** First image URL (legacy + convenience); mirrors listingImageUrls[0] when set */
  listingImageUrl?: string | null;
  /** Gallery URLs for the public Listings page (uploads + pasted HTTPS) */
  listingImageUrls?: string[] | null;
};

export interface InventoryMaster extends InventoryListingFlags {
  id: string;
  importKey: string;
  category: string;
  subCategory: string;
  location: string;
  configurationAsset: string;
  size: string;
  quotedPriceCr: number | null;
  remarks: string;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryUnderConstruction extends InventoryListingFlags {
  id: string;
  importKey: string;
  project: string;
  location: string;
  status: string;
  configuration: string;
  quotedPriceCr: string;
  possession: string;
  carpetAreaSqft: string;
  saleableAreaSqft: string;
  projectSize: string;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryCommercial extends InventoryListingFlags {
  id: string;
  importKey: string;
  assetType: string;
  location: string;
  description: string;
  size: string;
  quotedPriceCr: number | null;
  remarks: string;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryLease extends InventoryListingFlags {
  id: string;
  importKey: string;
  serialNo: number | null;
  project: string;
  location: string;
  status: string;
  unitType: string;
  sqft: number | null;
  rentInr: string;
  remarks: string;
  createdAt: string;
  updatedAt: string;
}

export type AnyInventory =
  | InventoryMaster
  | InventoryUnderConstruction
  | InventoryCommercial
  | InventoryLease;

export type ImportSummary = {
  inserted: number;
  updated: number;
  unchanged: number;
};

export type InventoryDashboardStats = {
  totalListings: number;
  forSale: number;
  forRent: number;
  published: number;
};

export type InventoryDashboardInsights = {
  mix: {
    master: number;
    underConstruction: number;
    commercial: number;
    lease: number;
  };
  topLocations: { name: string; count: number }[];
  masterCategories: { name: string; count: number }[];
  underConstructionByStatus: { name: string; count: number }[];
  leaseByProject: { name: string; count: number }[];
  commercialByAssetType: { name: string; count: number }[];
  quotedPriceBands: { key: string; label: string; count: number }[];
  portfolioMetrics: {
    totalLines: number;
    saleLines: number;
    leaseLines: number;
    saleSharePct: number;
    leaseSharePct: number;
    pipelineShareOfSale: number;
    uniqueLocations: number;
    topLocationSharePct: number;
    top3LocationsSharePct: number;
    masterCommercialWithNumericPrice: number;
  };
};

/** Customer Listings page — from GET /api/public/listings */
export type PublicInventoryListing = {
  catalogKey: string;
  listingImageUrl: string | null;
  listingImageUrls: string[];
  sourceKind: "master" | "underConstruction" | "commercial" | "lease";
  sourceId: string;
  displayType: "flat" | "plot" | "commercial" | "villa";
  listingIntent: "sale" | "rent";
  title: string;
  subtitle: string;
  location: string;
  priceLabel: string;
  sourceLabel: string;
  updatedAt: string;
};

export type ImportResponse = {
  summary: {
    master: ImportSummary;
    underConstruction: ImportSummary;
    commercial: ImportSummary;
    lease: ImportSummary;
  };
  counts: {
    master: number;
    underConstruction: number;
    commercial: number;
    lease: number;
  };
};
