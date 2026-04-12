import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiJson, getApiBase, readFetchError } from "@/lib/api";
import { catalogListingsQueryKey } from "@/hooks/useCatalog";
import type {
  AnyInventory,
  ImportResponse,
  InventoryKindSlug,
  InventoryCommercial,
  InventoryLease,
  InventoryMaster,
  InventoryUnderConstruction,
  InventoryDashboardStats,
  InventoryDashboardInsights,
  PublicInventoryListing,
} from "@/types/inventory";

export function inventoryListKey(kind: InventoryKindSlug) {
  return ["inventory", kind] as const;
}

export const inventoryStatsKey = ["inventory", "stats"] as const;
export const inventoryInsightsKey = ["inventory", "insights"] as const;
export const publicListingsQueryKey = ["public-listings"] as const;

export function useInventoryStats() {
  return useQuery({
    queryKey: inventoryStatsKey,
    queryFn: () => apiJson<InventoryDashboardStats>("/api/inventory/stats"),
  });
}

export function useInventoryInsights() {
  return useQuery({
    queryKey: inventoryInsightsKey,
    queryFn: () => apiJson<InventoryDashboardInsights>("/api/inventory/insights"),
  });
}

export function usePublicListings() {
  return useQuery({
    queryKey: publicListingsQueryKey,
    queryFn: () => apiJson<PublicInventoryListing[]>("/api/public/listings"),
    staleTime: 30_000,
  });
}

export function useTogglePublishedListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { kind: InventoryKindSlug; id: string; published: boolean }) =>
      apiJson<AnyInventory>(`/api/inventory/${vars.kind}/${vars.id}/published-listing`, {
        method: "PATCH",
        body: JSON.stringify({ published: vars.published }),
      }),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: inventoryListKey(vars.kind) });
      queryClient.invalidateQueries({ queryKey: inventoryStatsKey });
      queryClient.invalidateQueries({ queryKey: inventoryInsightsKey });
      queryClient.invalidateQueries({ queryKey: catalogListingsQueryKey });
      queryClient.invalidateQueries({ queryKey: publicListingsQueryKey });
    },
  });
}

export function useInventoryList(kind: InventoryKindSlug) {
  return useQuery({
    queryKey: inventoryListKey(kind),
    queryFn: () => apiJson<AnyInventory[]>(`/api/inventory/${kind}`),
  });
}

export function useInventoryImport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      const base = getApiBase();
      const res = await fetch(`${base}/api/inventory/import`, { method: "POST", body: fd });
      if (!res.ok) throw new Error(await readFetchError(res));
      return res.json() as Promise<ImportResponse>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: catalogListingsQueryKey });
      queryClient.invalidateQueries({ queryKey: publicListingsQueryKey });
    },
  });
}

export function useCreateInventory(kind: InventoryKindSlug) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiJson<AnyInventory>(`/api/inventory/${kind}`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryListKey(kind) });
      queryClient.invalidateQueries({ queryKey: inventoryStatsKey });
      queryClient.invalidateQueries({ queryKey: inventoryInsightsKey });
      queryClient.invalidateQueries({ queryKey: catalogListingsQueryKey });
      queryClient.invalidateQueries({ queryKey: publicListingsQueryKey });
    },
  });
}

export function useUpdateInventory(kind: InventoryKindSlug) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Record<string, unknown>) =>
      apiJson<AnyInventory>(`/api/inventory/${kind}/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryListKey(kind) });
      queryClient.invalidateQueries({ queryKey: inventoryStatsKey });
      queryClient.invalidateQueries({ queryKey: inventoryInsightsKey });
      queryClient.invalidateQueries({ queryKey: catalogListingsQueryKey });
      queryClient.invalidateQueries({ queryKey: publicListingsQueryKey });
    },
  });
}

export function useDeleteInventory(kind: InventoryKindSlug) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiJson<void>(`/api/inventory/${kind}/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryListKey(kind) });
      queryClient.invalidateQueries({ queryKey: inventoryStatsKey });
      queryClient.invalidateQueries({ queryKey: inventoryInsightsKey });
      queryClient.invalidateQueries({ queryKey: catalogListingsQueryKey });
    },
  });
}

export type { InventoryMaster, InventoryUnderConstruction, InventoryCommercial, InventoryLease };
