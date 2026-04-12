import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { LISTING_TYPES } from "@/lib/format";
import { LayoutGrid, Plus, Search, Table2 } from "lucide-react";
import { useMemo, useState } from "react";
import {
  CatalogFilterSidebar,
  type CatalogScope,
  type PropertyTypeFilterValue,
} from "@/components/properties/PropertyTypeFilterSidebar";
import { InventoryCatalogCard } from "@/components/properties/InventoryCatalogCard";
import { useCatalogListings } from "@/hooks/useCatalog";

function parseTypeParam(searchParams: URLSearchParams): PropertyTypeFilterValue {
  const t = searchParams.get("type");
  if (t === "flat" || t === "plot" || t === "commercial" || t === "villa") return t;
  return "all";
}

function parseScopeParam(searchParams: URLSearchParams): CatalogScope {
  return searchParams.get("scope") === "published" ? "published" : "catalog";
}

const emptyCounts = (): Record<PropertyTypeFilterValue, number> => ({
  all: 0,
  flat: 0,
  plot: 0,
  commercial: 0,
  villa: 0,
});

export default function PropertyList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const typeFilter = parseTypeParam(searchParams);
  const scopeFilter = parseScopeParam(searchParams);
  const publishedOnly = scopeFilter === "published";
  const { data, isLoading, isError } = useCatalogListings(typeFilter, { publishedOnly });

  const [search, setSearch] = useState("");
  const [listingFilter, setListingFilter] = useState("all");

  const setCatalogFilter = (scope: CatalogScope, type: PropertyTypeFilterValue) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (type === "all") next.delete("type");
        else next.set("type", type);
        if (scope === "published") next.set("scope", "published");
        else next.delete("scope");
        return next;
      },
      { replace: true }
    );
  };

  const counts = useMemo((): Record<PropertyTypeFilterValue, number> => {
    const c = data?.counts;
    if (!c) return emptyCounts();
    return {
      all: c.all,
      flat: c.flat,
      plot: c.plot,
      commercial: c.commercial,
      villa: c.villa,
    };
  }, [data?.counts]);

  const publishedCounts = useMemo((): Record<PropertyTypeFilterValue, number> => {
    const c = data?.publishedCounts;
    if (!c) return emptyCounts();
    return {
      all: c.all,
      flat: c.flat,
      plot: c.plot,
      commercial: c.commercial,
      villa: c.villa,
    };
  }, [data?.publishedCounts]);

  const listings = data?.listings ?? [];

  const filtered = useMemo(() => {
    return listings.filter((row) => {
      if (listingFilter !== "all" && row.listingIntent !== listingFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        row.title.toLowerCase().includes(q) ||
        row.subtitle.toLowerCase().includes(q) ||
        row.location.toLowerCase().includes(q) ||
        row.sourceLabel.toLowerCase().includes(q)
      );
    });
  }, [listings, listingFilter, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <LayoutGrid className="h-8 w-8 shrink-0 text-primary" aria-hidden />
            All properties
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            {publishedOnly ? (
              <>
                Rows toggled for the public <span className="font-medium text-foreground">Listings</span> page. Use{" "}
                <span className="font-medium text-foreground">Inventory</span> to publish or unpublish a row.
              </>
            ) : (
              <>
                Live view of Garima inventory — flats, plots, commercial, and villas. Filters match how stock is
                grouped; open <span className="font-medium text-foreground">Inventory</span> for full rows and edits.
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:shrink-0">
          <Button variant="outline" asChild>
            <Link to="/dashboard/inventory">
              <Table2 className="h-4 w-4 mr-1" /> Inventory
            </Link>
          </Button>
          <Button asChild>
            <Link to="/dashboard/add">
              <Plus className="h-4 w-4 mr-1" /> Add marketing listing
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-8">
        <CatalogFilterSidebar
          activeType={typeFilter}
          activeScope={scopeFilter}
          onSelect={setCatalogFilter}
          counts={counts}
          publishedCounts={publishedCounts}
        />

        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search title, location, source…"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={listingFilter} onValueChange={setListingFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Listing" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Sale & rent</SelectItem>
                {LISTING_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isError ? (
            <p className="rounded-xl border border-destructive/40 bg-destructive/5 py-12 text-center text-sm text-destructive">
              Could not load the property catalog. Check that the API is running and try again.
            </p>
          ) : isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="overflow-hidden rounded-2xl border bg-card">
                  <Skeleton className="aspect-[16/11] w-full rounded-none" />
                  <div className="space-y-2 p-4">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-muted/20 py-16 text-center">
              <LayoutGrid className="mx-auto mb-3 h-10 w-10 text-muted-foreground/60" aria-hidden />
              <p className="text-sm text-muted-foreground">
                {publishedOnly
                  ? "No published listings match your search. Publish rows from Inventory (eye icon) or try another type."
                  : "No listings match your search and filters. Try another type or clear the sale/rent filter."}
              </p>
              <Button variant="link" className="mt-2" asChild>
                <Link to="/dashboard/inventory">Go to inventory tables</Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((item) => (
                <InventoryCatalogCard key={item.catalogId} item={item} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
