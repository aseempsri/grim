import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiJson, getApiBase, readFetchError } from "@/lib/api";
import type { AgentProfile, Property, PropertyImage, PropertyInsert, PropertyUpdate } from "@/types/models";

export type { Property, PropertyImage };

export function useProperties() {
  return useQuery({
    queryKey: ["properties"],
    queryFn: () => apiJson<Property[]>("/api/properties"),
    retry: 1,
  });
}

export function usePublishedProperties() {
  return useQuery({
    queryKey: ["properties", "published"],
    queryFn: () => apiJson<Property[]>("/api/properties?status=published"),
  });
}

export function useProperty(id: string | undefined) {
  return useQuery({
    queryKey: ["properties", id],
    queryFn: () => apiJson<Property>(`/api/properties/${id}`),
    enabled: !!id,
  });
}

export function usePropertyImages(propertyId: string | undefined) {
  return useQuery({
    queryKey: ["property_images", propertyId],
    queryFn: () => apiJson<PropertyImage[]>(`/api/properties/${propertyId}/images`),
    enabled: !!propertyId,
  });
}

export function useCreateProperty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (property: PropertyInsert) =>
      apiJson<Property>("/api/properties", {
        method: "POST",
        body: JSON.stringify(property),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["properties"] }),
  });
}

export function useUpdateProperty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...updates }: PropertyUpdate & { id: string }) =>
      apiJson<Property>(`/api/properties/${id}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["properties"] }),
  });
}

export function useDeleteProperty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiJson<void>(`/api/properties/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["properties"] }),
  });
}

export function useAgentProfile() {
  return useQuery({
    queryKey: ["agent_profile"],
    queryFn: () => apiJson<AgentProfile>("/api/agent-profile"),
  });
}

export async function uploadPropertyImage(file: File, propertyId: string) {
  const fd = new FormData();
  fd.append("file", file);
  const base = getApiBase();
  const url = `${base}/api/properties/${propertyId}/images`;
  const res = await fetch(url, { method: "POST", body: fd });
  if (!res.ok) throw new Error(await readFetchError(res));
  return res.json() as Promise<PropertyImage>;
}

export async function deletePropertyImage(image: PropertyImage) {
  await apiJson<void>(`/api/property-images/${image.id}`, { method: "DELETE" });
}
