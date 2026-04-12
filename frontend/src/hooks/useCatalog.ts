import { useQuery } from "@tanstack/react-query";
import { apiJson } from "@/lib/api";
import type { CatalogListResponse } from "@/types/catalog";
import type { PropertyTypeFilterValue } from "@/components/properties/PropertyTypeFilterSidebar";

export const catalogListingsQueryKey = ["catalog-listings"] as const;

export function useCatalogListings(
  type: PropertyTypeFilterValue,
  options?: { publishedOnly?: boolean }
) {
  const t = type === "all" ? "all" : type;
  const publishedOnly = options?.publishedOnly === true;
  const q = new URLSearchParams();
  q.set("type", t);
  if (publishedOnly) q.set("publishedOnly", "true");
  return useQuery({
    queryKey: [...catalogListingsQueryKey, t, publishedOnly ? "pub" : "all"],
    queryFn: () => apiJson<CatalogListResponse>(`/api/catalog/listings?${q.toString()}`),
  });
}
