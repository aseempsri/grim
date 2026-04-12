import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { AnyInventory, InventoryKindSlug } from "@/types/inventory";
import { useCreateInventory, useUpdateInventory } from "@/hooks/useInventory";
import { getApiBase, readFetchError } from "@/lib/api";
import { toast } from "sonner";
import { Upload, X } from "lucide-react";
const MAX_LISTING_IMAGES = 16;

type Props = {
  kind: InventoryKindSlug;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: AnyInventory | null;
};

function listingImagesFromRow(row: AnyInventory | null): string[] {
  if (!row) return [];
  const urls = (row as { listingImageUrls?: string[] | null }).listingImageUrls;
  if (Array.isArray(urls) && urls.length) {
    return urls.filter((u) => typeof u === "string" && u.trim()).map((u) => u.trim());
  }
  const one = (row as { listingImageUrl?: string | null }).listingImageUrl?.trim();
  return one ? [one] : [];
}

/** Windows / some browsers omit `type`; rely on extension too. */
function isProbablyImageFile(file: File): boolean {
  if (file.type && file.type.startsWith("image/")) return true;
  return /\.(jpe?g|png|gif|webp|bmp|avif|heic|heif)$/i.test(file.name || "");
}

async function uploadListingImageFile(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const base = getApiBase();
  const path = "/api/inventory/upload-listing-image";
  const url = base ? `${base.replace(/\/$/, "")}${path}` : path;
  console.log("[listing-upload] POST", url, {
    name: file.name,
    type: file.type,
    size: file.size,
  });
  const res = await fetch(url, { method: "POST", body: fd });
  if (!res.ok) {
    const msg = await readFetchError(res);
    console.error("[listing-upload] failed", res.status, msg);
    throw new Error(msg);
  }
  const data = (await res.json()) as { url: string };
  console.log("[listing-upload] success", data.url);
  return data.url;
}

export function InventoryFormDialog({ kind, open, onOpenChange, editing }: Props) {
  const create = useCreateInventory(kind);
  const update = useUpdateInventory(kind);
  const [values, setValues] = useState<Record<string, string>>({});
  const [listingImageUrls, setListingImageUrls] = useState<string[]>([]);
  const [pasteUrl, setPasteUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  /** Avoid re-initializing when `editing` is a new object reference for the same row (would clear staged uploads). */
  const lastInitKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open) {
      lastInitKeyRef.current = null;
      return;
    }
    const initKey = `${editing?.id ?? "new"}:${kind}`;
    if (lastInitKeyRef.current === initKey) return;
    lastInitKeyRef.current = initKey;

    if (editing) {
      const v: Record<string, string> = {};
      if (kind === "master") {
        const e = editing as import("@/types/inventory").InventoryMaster;
        v.category = e.category ?? "";
        v.subCategory = e.subCategory ?? "";
        v.location = e.location ?? "";
        v.configurationAsset = e.configurationAsset ?? "";
        v.size = e.size ?? "";
        v.quotedPriceCr = e.quotedPriceCr != null ? String(e.quotedPriceCr) : "";
        v.remarks = e.remarks ?? "";
      } else if (kind === "under-construction") {
        const e = editing as import("@/types/inventory").InventoryUnderConstruction;
        v.project = e.project ?? "";
        v.location = e.location ?? "";
        v.status = e.status ?? "";
        v.configuration = e.configuration ?? "";
        v.quotedPriceCr = e.quotedPriceCr ?? "";
        v.possession = e.possession ?? "";
        v.carpetAreaSqft = e.carpetAreaSqft ?? "";
        v.saleableAreaSqft = e.saleableAreaSqft ?? "";
        v.projectSize = e.projectSize ?? "";
      } else if (kind === "commercial") {
        const e = editing as import("@/types/inventory").InventoryCommercial;
        v.assetType = e.assetType ?? "";
        v.location = e.location ?? "";
        v.description = e.description ?? "";
        v.size = e.size ?? "";
        v.quotedPriceCr = e.quotedPriceCr != null ? String(e.quotedPriceCr) : "";
        v.remarks = e.remarks ?? "";
      } else {
        const e = editing as import("@/types/inventory").InventoryLease;
        v.serialNo = e.serialNo != null ? String(e.serialNo) : "";
        v.project = e.project ?? "";
        v.location = e.location ?? "";
        v.status = e.status ?? "";
        v.unitType = e.unitType ?? "";
        v.sqft = e.sqft != null ? String(e.sqft) : "";
        v.rentInr = e.rentInr ?? "";
        v.remarks = e.remarks ?? "";
      }
      setValues(v);
      setListingImageUrls(listingImagesFromRow(editing));
    } else {
      setValues({});
      setListingImageUrls([]);
    }
    setPasteUrl("");
  }, [open, editing, kind]);

  const set = (key: string, val: string) => setValues((s) => ({ ...s, [key]: val }));

  function addPastedUrl() {
    const u = pasteUrl.trim();
    if (!u) return;
    try {
      const parsed = new URL(u);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error("protocol");
    } catch {
      toast.error("Enter a valid http(s) image URL");
      return;
    }
    if (listingImageUrls.includes(u)) {
      toast.message("That URL is already in the list");
      return;
    }
    if (listingImageUrls.length >= MAX_LISTING_IMAGES) {
      toast.error(`Maximum ${MAX_LISTING_IMAGES} images`);
      return;
    }
    setListingImageUrls((s) => [...s, u]);
    setPasteUrl("");
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const raw = input.files;
    if (!raw?.length) return;
    // FileList is live — clearing `value` can empty it before we read; snapshot first.
    const files = Array.from(raw);
    input.value = "";
    let list = [...listingImageUrls];
    for (const file of files) {
      if (list.length >= MAX_LISTING_IMAGES) {
        toast.error(`Maximum ${MAX_LISTING_IMAGES} images`);
        break;
      }
      if (!isProbablyImageFile(file)) {
        toast.error(`${file.name} does not look like an image (use JPG, PNG, GIF, or WebP).`);
        continue;
      }
      try {
        setUploading(true);
        const url = await uploadListingImageFile(file);
        list = [...list, url];
        setListingImageUrls(list);
        toast.success("Image uploaded", { description: "Remember to click Update to save." });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    }
  }

  function removeImageAt(index: number) {
    setListingImageUrls((s) => s.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const imgs = listingImageUrls;
    try {
      if (kind === "master") {
        const body = {
          category: values.category?.trim(),
          subCategory: values.subCategory?.trim(),
          location: values.location?.trim(),
          configurationAsset: values.configurationAsset?.trim(),
          size: values.size?.trim(),
          quotedPriceCr:
            values.quotedPriceCr === "" ? null : Number(values.quotedPriceCr),
          remarks: values.remarks ?? "",
          listingImageUrls: imgs,
        };
        if (editing) await update.mutateAsync({ id: editing.id, ...body });
        else await create.mutateAsync(body);
      } else if (kind === "under-construction") {
        const body = {
          project: values.project?.trim(),
          location: values.location?.trim(),
          status: values.status ?? "",
          configuration: values.configuration ?? "",
          quotedPriceCr: values.quotedPriceCr ?? "",
          possession: values.possession ?? "",
          carpetAreaSqft: values.carpetAreaSqft ?? "",
          saleableAreaSqft: values.saleableAreaSqft ?? "",
          projectSize: values.projectSize ?? "",
          listingImageUrls: imgs,
        };
        if (editing) await update.mutateAsync({ id: editing.id, ...body });
        else await create.mutateAsync(body);
      } else if (kind === "commercial") {
        const body = {
          assetType: values.assetType?.trim(),
          location: values.location?.trim(),
          description: values.description ?? "",
          size: values.size ?? "",
          quotedPriceCr:
            values.quotedPriceCr === "" ? null : Number(values.quotedPriceCr),
          remarks: values.remarks ?? "",
          listingImageUrls: imgs,
        };
        if (editing) await update.mutateAsync({ id: editing.id, ...body });
        else await create.mutateAsync(body);
      } else {
        const body = {
          serialNo:
            values.serialNo === "" || values.serialNo === undefined
              ? null
              : Number(values.serialNo),
          project: values.project?.trim(),
          location: values.location?.trim(),
          status: values.status ?? "",
          unitType: values.unitType ?? "",
          sqft: values.sqft === "" ? null : Number(values.sqft),
          rentInr: values.rentInr ?? "",
          remarks: values.remarks ?? "",
          listingImageUrls: imgs,
        };
        if (editing) await update.mutateAsync({ id: editing.id, ...body });
        else await create.mutateAsync(body);
      }
      toast.success(editing ? "Updated" : "Created");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    }
  }

  const busy = create.isPending || update.isPending || uploading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit row" : "Add row"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          {kind === "master" && (
            <>
              <Field label="Category" value={values.category} onChange={(v) => set("category", v)} required />
              <Field label="Sub Category" value={values.subCategory} onChange={(v) => set("subCategory", v)} required />
              <Field label="Location" value={values.location} onChange={(v) => set("location", v)} required />
              <Field
                label="Configuration / Asset"
                value={values.configurationAsset}
                onChange={(v) => set("configurationAsset", v)}
                required
              />
              <Field label="Size" value={values.size} onChange={(v) => set("size", v)} required />
              <Field
                label="Quoted Price (Cr)"
                value={values.quotedPriceCr}
                onChange={(v) => set("quotedPriceCr", v)}
                placeholder="e.g. 17 or leave empty"
              />
              <div>
                <Label>Remarks</Label>
                <Textarea value={values.remarks ?? ""} onChange={(e) => set("remarks", e.target.value)} rows={2} />
              </div>
            </>
          )}

          {kind === "under-construction" && (
            <>
              <Field label="Project" value={values.project} onChange={(v) => set("project", v)} required />
              <Field label="Location" value={values.location} onChange={(v) => set("location", v)} required />
              <Field label="Status" value={values.status} onChange={(v) => set("status", v)} />
              <div>
                <Label>Configuration</Label>
                <Textarea value={values.configuration ?? ""} onChange={(e) => set("configuration", e.target.value)} rows={2} />
              </div>
              <div>
                <Label>Quoted Price (Cr)</Label>
                <Textarea
                  value={values.quotedPriceCr ?? ""}
                  onChange={(e) => set("quotedPriceCr", e.target.value)}
                  placeholder="₹ range or text"
                  rows={2}
                />
              </div>
              <Field label="Possession" value={values.possession} onChange={(v) => set("possession", v)} />
              <Field label="Carpet Area (sq.ft)" value={values.carpetAreaSqft} onChange={(v) => set("carpetAreaSqft", v)} />
              <Field label="Saleable Area (sq.ft)" value={values.saleableAreaSqft} onChange={(v) => set("saleableAreaSqft", v)} />
              <div>
                <Label>Project Size</Label>
                <Textarea value={values.projectSize ?? ""} onChange={(e) => set("projectSize", e.target.value)} rows={2} />
              </div>
            </>
          )}

          {kind === "commercial" && (
            <>
              <Field label="Asset Type" value={values.assetType} onChange={(v) => set("assetType", v)} required />
              <Field label="Location" value={values.location} onChange={(v) => set("location", v)} required />
              <div>
                <Label>Description</Label>
                <Textarea value={values.description ?? ""} onChange={(e) => set("description", e.target.value)} rows={2} />
              </div>
              <Field label="Size" value={values.size} onChange={(v) => set("size", v)} />
              <Field label="Quoted Price (Cr)" value={values.quotedPriceCr} onChange={(v) => set("quotedPriceCr", v)} />
              <div>
                <Label>Remarks</Label>
                <Textarea value={values.remarks ?? ""} onChange={(e) => set("remarks", e.target.value)} rows={2} />
              </div>
            </>
          )}

          {kind === "lease" && (
            <>
              <Field label="S No (optional)" value={values.serialNo} onChange={(v) => set("serialNo", v)} />
              <Field label="Project" value={values.project} onChange={(v) => set("project", v)} required />
              <Field label="Location" value={values.location} onChange={(v) => set("location", v)} required />
              <Field label="Status (furnishing)" value={values.status} onChange={(v) => set("status", v)} />
              <Field label="Unit Type" value={values.unitType} onChange={(v) => set("unitType", v)} />
              <Field label="Sq.ft" value={values.sqft} onChange={(v) => set("sqft", v)} />
              <div>
                <Label>Rent (INR)</Label>
                <Textarea value={values.rentInr ?? ""} onChange={(e) => set("rentInr", e.target.value)} placeholder="Amount or range" rows={2} />
              </div>
              <div>
                <Label>Remarks</Label>
                <Textarea value={values.remarks ?? ""} onChange={(e) => set("remarks", e.target.value)} rows={2} />
              </div>
            </>
          )}

          <div className="space-y-3 rounded-lg border border-dashed border-primary/25 bg-muted/30 p-3">
            <Label className="text-xs font-semibold">Customer listing images (optional)</Label>
            <p className="text-[11px] leading-snug text-muted-foreground">
              Upload files or paste HTTPS URLs. Shown on the public Listings page when this row is published (eye icon).
              Up to {MAX_LISTING_IMAGES} images — carousel uses all of them.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.jpg,.jpeg,.png,.gif,.webp"
              multiple
              className="sr-only"
              aria-hidden
              tabIndex={-1}
              onChange={onFileChange}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={busy || listingImageUrls.length >= MAX_LISTING_IMAGES}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4" />
                {uploading ? "Uploading…" : "Upload images"}
              </Button>
              <span className="text-[11px] text-muted-foreground">
                {listingImageUrls.length}/{MAX_LISTING_IMAGES}
              </span>
            </div>
            {listingImageUrls.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {listingImageUrls.map((url, index) => (
                  <div
                    key={`${url}-${index}`}
                    className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border bg-background"
                  >
                    <img src={url} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      className="absolute right-0.5 top-0.5 rounded-full bg-black/65 p-0.5 text-white shadow hover:bg-black/85"
                      onClick={() => removeImageAt(index)}
                      aria-label="Remove image"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">Or paste image URL</Label>
              <div className="flex gap-2">
                <Input
                  value={pasteUrl}
                  onChange={(e) => setPasteUrl(e.target.value)}
                  placeholder="https://…"
                  type="url"
                  autoComplete="off"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addPastedUrl();
                    }
                  }}
                />
                <Button type="button" variant="secondary" size="sm" onClick={addPastedUrl}>
                  Add
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : editing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  placeholder,
}: {
  label: string;
  value: string | undefined;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <Label>
        {label}
        {required ? " *" : ""}
      </Label>
      <Input value={value ?? ""} onChange={(e) => onChange(e.target.value)} required={required} placeholder={placeholder} />
    </div>
  );
}
