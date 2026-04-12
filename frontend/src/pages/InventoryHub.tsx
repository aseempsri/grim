import { useCallback, useEffect, useRef, useState } from "react";
import { isDeletePasswordValid } from "@/lib/deletePassword";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { InventoryTable } from "@/components/inventory/InventoryTable";
import { InventoryFormDialog } from "@/components/inventory/InventoryFormDialog";
import {
  useInventoryList,
  useInventoryImport,
  useDeleteInventory,
  useTogglePublishedListing,
} from "@/hooks/useInventory";
import type { AnyInventory, InventoryKindSlug } from "@/types/inventory";
import { toast } from "sonner";
import { Plus, FileSpreadsheet, Search, Table2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { filterInventoryRowsByKeyword } from "@/lib/inventorySearch";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const TABS: { slug: InventoryKindSlug; label: string; hint: string }[] = [
  { slug: "master", label: "Master Inventory", hint: "Land, luxury flats, pre-leased residential" },
  { slug: "under-construction", label: "Under construction", hint: "Projects, possession, carpet & saleable areas" },
  { slug: "commercial", label: "Commercial Sales", hint: "Pre-leased commercial, hotels, offices" },
  { slug: "lease", label: "Lease Inventory", hint: "Rentals by project with furnishing status" },
];

function isTabSlug(s: string | null): s is InventoryKindSlug {
  return s !== null && TABS.some((t) => t.slug === s);
}

export default function InventoryHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const rowParam = searchParams.get("row");
  const [tab, setTab] = useState<InventoryKindSlug>(() => (isTabSlug(tabParam) ? tabParam : "master"));

  useEffect(() => {
    if (isTabSlug(tabParam)) setTab(tabParam);
  }, [tabParam]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AnyInventory | null>(null);
  const [deleteCtx, setDeleteCtx] = useState<{
    kind: InventoryKindSlug;
    row: AnyInventory;
  } | null>(null);
  const [tabSearch, setTabSearch] = useState<Record<InventoryKindSlug, string>>({
    master: "",
    "under-construction": "",
    commercial: "",
    lease: "",
  });
  const [deletePassword, setDeletePassword] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const importMutation = useInventoryImport();
  const del = useDeleteInventory(deleteCtx?.kind ?? tab);
  const toggleListing = useTogglePublishedListing();

  const master = useInventoryList("master");
  const under = useInventoryList("under-construction");
  const commercial = useInventoryList("commercial");
  const lease = useInventoryList("lease");

  const dataMap: Record<InventoryKindSlug, AnyInventory[] | undefined> = {
    master: master.data,
    "under-construction": under.data,
    commercial: commercial.data,
    lease: lease.data,
  };

  const loadingMap: Record<InventoryKindSlug, boolean> = {
    master: master.isLoading,
    "under-construction": under.isLoading,
    commercial: commercial.isLoading,
    lease: lease.isLoading,
  };

  const clearRowFromUrl = useCallback(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("row");
        return next;
      },
      { replace: true }
    );
  }, [setSearchParams]);

  const onInventoryHighlightMissing = useCallback(() => {
    toast.info("That inventory row is no longer in this table.");
    clearRowFromUrl();
  }, [clearRowFromUrl]);

  const tabSwitchSkipRef = useRef(true);
  const prevTabRef = useRef(tab);
  useEffect(() => {
    if (tabSwitchSkipRef.current) {
      tabSwitchSkipRef.current = false;
      prevTabRef.current = tab;
      return;
    }
    if (prevTabRef.current !== tab && rowParam) {
      clearRowFromUrl();
    }
    prevTabRef.current = tab;
  }, [tab, rowParam]);

  function openAdd() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(row: AnyInventory) {
    setEditing(row);
    setFormOpen(true);
  }

  async function onPickFile(f: File | null) {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".xlsx")) {
      toast.error("Please choose a .xlsx file");
      return;
    }
    try {
      const res = await importMutation.mutateAsync(f);
      const s = res.summary;
      const parts = [
        `Master: +${s.master.inserted} ~${s.master.updated} =${s.master.unchanged}`,
        `UC: +${s.underConstruction.inserted} ~${s.underConstruction.updated} =${s.underConstruction.unchanged}`,
        `Comm: +${s.commercial.inserted} ~${s.commercial.updated} =${s.commercial.unchanged}`,
        `Lease: +${s.lease.inserted} ~${s.lease.updated} =${s.lease.unchanged}`,
      ];
      toast.success("Import complete", { description: parts.join(" · ") });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  async function confirmDelete() {
    if (!deleteCtx) return;
    if (!isDeletePasswordValid(deletePassword)) {
      toast.error("Incorrect password");
      return;
    }
    try {
      await del.mutateAsync(deleteCtx.row.id);
      toast.success("Deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
    setDeleteCtx(null);
    setDeletePassword("");
  }

  return (
    <div className="w-full min-w-0 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight flex items-center gap-2">
            <Table2 className="h-8 w-8 shrink-0 text-primary" aria-hidden />
            Garima inventory
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2 justify-end shrink-0">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
          />
          <Button
            type="button"
            variant="outline"
            disabled={importMutation.isPending}
            onClick={() => fileRef.current?.click()}
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            {importMutation.isPending ? "Importing…" : "Upload Excel"}
          </Button>
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Add in current tab
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as InventoryKindSlug)} className="space-y-6">
        <TabsList className="flex flex-wrap h-auto gap-1 p-1 bg-muted/60">
          {TABS.map((t) => (
            <TabsTrigger
              key={t.slug}
              value={t.slug}
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm px-4 py-2"
            >
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {TABS.map((t) => {
          const rawRows = dataMap[t.slug] ?? [];
          /** Deep link `?row=` targets one tab — show full rows there so the row is never filtered out. */
          const deepLinkOnThisTab = !!(rowParam && tab === t.slug);
          const query = deepLinkOnThisTab ? "" : tabSearch[t.slug];
          const filteredRows = filterInventoryRowsByKeyword(rawRows, query);
          const searchEmpty = rawRows.length > 0 && filteredRows.length === 0;

          return (
            <TabsContent key={t.slug} value={t.slug} className="space-y-4 mt-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <p className="text-sm text-muted-foreground shrink-0 max-w-xl">{t.hint}</p>
                <div className="relative w-full sm:max-w-md sm:min-w-[260px]">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
                    aria-hidden
                  />
                  <Input
                    type="search"
                    placeholder="Search this table (any column)…"
                    value={query}
                    onChange={(e) =>
                      setTabSearch((prev) => ({ ...prev, [t.slug]: e.target.value }))
                    }
                    className="pl-9 h-10"
                    aria-label={`Search ${t.label}`}
                  />
                </div>
              </div>
              {loadingMap[t.slug] ? (
                <p className="text-muted-foreground py-12 text-center">Loading…</p>
              ) : (
                <InventoryTable
                  kind={t.slug}
                  rows={filteredRows}
                  admin
                  onEdit={openEdit}
                  onDelete={(row) => {
                    setDeletePassword("");
                    setDeleteCtx({ kind: t.slug, row });
                  }}
                  onTogglePublishedListing={(row) =>
                    toggleListing.mutate({
                      kind: t.slug,
                      id: row.id,
                      published: !(row as { publishedOnListing?: boolean }).publishedOnListing,
                    })
                  }
                  emptyMessage={
                    searchEmpty
                      ? "No rows match your search. Try different keywords or clear the box."
                      : undefined
                  }
                  highlightRowId={deepLinkOnThisTab ? rowParam : null}
                  onHighlightDone={clearRowFromUrl}
                  onHighlightMissing={onInventoryHighlightMissing}
                />
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      <InventoryFormDialog
        kind={tab}
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
      />

      <AlertDialog
        open={!!deleteCtx}
        onOpenChange={(o) => {
          if (!o) {
            setDeleteCtx(null);
            setDeletePassword("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this row?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 text-left">
                <p>This cannot be undone. The inventory record will be removed from the database.</p>
                <div className="space-y-2">
                  <Label htmlFor="inventory-delete-password">Password to confirm</Label>
                  <Input
                    id="inventory-delete-password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Enter password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={!isDeletePasswordValid(deletePassword)}
              onClick={() => void confirmDelete()}
            >
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
