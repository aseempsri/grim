import type { ReactNode } from "react";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SortableTableHead } from "@/components/ui/sortable-table-head";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { AnyInventory, InventoryKindSlug } from "@/types/inventory";
import type {
  InventoryMaster,
  InventoryUnderConstruction,
  InventoryCommercial,
  InventoryLease,
} from "@/types/inventory";
import { formatPriceCr } from "@/lib/inventoryFormat";
import { sortRows, nextSortState } from "@/lib/sortUtils";
import {
  INVENTORY_AREA_SORT_KEYS,
  normalizeAreaMeasureForSort,
} from "@/lib/areaSort";
import { Eye, Pencil, Trash2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type Props = {
  kind: InventoryKindSlug;
  rows: AnyInventory[];
  admin?: boolean;
  onEdit?: (row: AnyInventory) => void;
  onDelete?: (row: AnyInventory) => void;
  /** Shown when `rows` is empty (e.g. no search matches). */
  emptyMessage?: string;
  highlightRowId?: string | null;
  onHighlightDone?: () => void;
  onHighlightMissing?: () => void;
  /** Toggle customer /properties visibility for this row (eye control). */
  onTogglePublishedListing?: (row: AnyInventory) => void;
};

function inventoryGetValue(row: AnyInventory, key: string): unknown {
  const raw = (row as Record<string, unknown>)[key];
  if (INVENTORY_AREA_SORT_KEYS.has(key)) {
    const sqft = normalizeAreaMeasureForSort(raw);
    if (Number.isFinite(sqft)) return sqft;
  }
  return raw;
}

export function InventoryTable({
  kind,
  rows,
  admin,
  onEdit,
  onDelete,
  emptyMessage,
  highlightRowId,
  onHighlightDone,
  onHighlightMissing,
  onTogglePublishedListing,
}: Props) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const ranHighlightFor = useRef<string | null>(null);

  const handleSort = (key: string) => {
    const next = nextSortState(sortKey, sortDir, key);
    setSortKey(next.key);
    setSortDir(next.dir);
  };

  const sortedRows = useMemo(
    () => sortRows(rows, sortKey, sortDir, inventoryGetValue),
    [rows, sortKey, sortDir]
  );

  useLayoutEffect(() => {
    if (!highlightRowId) {
      ranHighlightFor.current = null;
      return;
    }
    if (rows.length === 0) return;

    const match = sortedRows.some((r) => r.id === highlightRowId);
    if (!match) {
      if (ranHighlightFor.current !== `missing-${highlightRowId}`) {
        ranHighlightFor.current = `missing-${highlightRowId}`;
        onHighlightMissing?.();
      }
      return;
    }

    const el = document.getElementById(`inventory-row-${highlightRowId}`);
    if (!el) return;

    if (ranHighlightFor.current === highlightRowId) return;
    ranHighlightFor.current = highlightRowId;

    const run = () => {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      const onEnd = (e: AnimationEvent) => {
        if (e.animationName !== "inventory-row-highlight-pulse") return;
        el.removeEventListener("animationend", onEnd);
        el.classList.remove("inventory-row-highlight-pulse");
        onHighlightDone?.();
      };
      el.addEventListener("animationend", onEnd);
      el.classList.add("inventory-row-highlight-pulse");
    };

    requestAnimationFrame(() => requestAnimationFrame(run));
  }, [highlightRowId, rows, sortedRows, onHighlightDone, onHighlightMissing]);

  function InvHead({
    ck,
    children,
    className,
    allowWrap,
    noWrapLabel,
  }: {
    ck: string;
    children: ReactNode;
    className?: string;
    allowWrap?: boolean;
    noWrapLabel?: boolean;
  }) {
    return (
      <SortableTableHead
        columnKey={ck}
        activeKey={sortKey}
        direction={sortDir}
        onSort={handleSort}
        className={className}
        allowWrap={allowWrap}
        noWrapLabel={noWrapLabel}
      >
        {children}
      </SortableTableHead>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground text-sm">
        {emptyMessage ?? "No rows yet. Add manually or upload the Excel workbook."}
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="w-12 text-center font-semibold text-xs uppercase tracking-wide">#</TableHead>
            {kind === "master" && (
              <>
                <InvHead ck="category">Category</InvHead>
                <InvHead ck="subCategory">Sub Category</InvHead>
                <InvHead ck="location">Location</InvHead>
                <InvHead ck="configurationAsset">Configuration</InvHead>
                <InvHead ck="size">Size</InvHead>
                <InvHead ck="quotedPriceCr">Price (Cr)</InvHead>
                <InvHead ck="remarks">Remarks</InvHead>
              </>
            )}
            {kind === "under-construction" && (
              <>
                <InvHead ck="project">Project</InvHead>
                <InvHead ck="location">Location</InvHead>
                <InvHead ck="status">Status</InvHead>
                <InvHead ck="configuration">Configuration</InvHead>
                <InvHead ck="quotedPriceCr">Quoted Price</InvHead>
                <InvHead ck="possession" className="w-[8.5rem] max-w-[8.5rem]">
                  Possession
                </InvHead>
                <InvHead ck="carpetAreaSqft" allowWrap className="min-w-[5.5rem] max-w-[6.25rem]">
                  Carpet size
                </InvHead>
                <InvHead ck="saleableAreaSqft" noWrapLabel className="min-w-[9.5rem]">
                  Saleable size
                </InvHead>
                <InvHead ck="projectSize">Project size</InvHead>
              </>
            )}
            {kind === "commercial" && (
              <>
                <InvHead ck="assetType">Asset Type</InvHead>
                <InvHead ck="location">Location</InvHead>
                <InvHead ck="description">Description</InvHead>
                <InvHead ck="size">Size</InvHead>
                <InvHead ck="quotedPriceCr">Price (Cr)</InvHead>
                <InvHead ck="remarks">Remarks</InvHead>
              </>
            )}
            {kind === "lease" && (
              <>
                <InvHead ck="project">Project</InvHead>
                <InvHead ck="location">Location</InvHead>
                <InvHead ck="status">Status</InvHead>
                <InvHead ck="unitType">Unit Type</InvHead>
                <InvHead ck="sqft">Sq.ft</InvHead>
                <InvHead ck="rentInr">Rent (INR)</InvHead>
                <InvHead ck="remarks">Remarks</InvHead>
              </>
            )}
            {admin && (
              <TableHead className="w-[132px] min-w-[132px] font-semibold text-xs uppercase tracking-wide text-right">
                {" "}
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedRows.map((row, index) => (
            <TableRow
              key={row.id}
              id={`inventory-row-${row.id}`}
              className="align-top scroll-mt-24"
            >
              <TableCell className="w-12 text-center text-muted-foreground font-mono text-sm tabular-nums">
                {index + 1}
              </TableCell>
              {kind === "master" && <MasterCells row={row as InventoryMaster} />}
              {kind === "under-construction" && <UnderCells row={row as InventoryUnderConstruction} />}
              {kind === "commercial" && <CommCells row={row as InventoryCommercial} />}
              {kind === "lease" && <LeaseCells row={row as InventoryLease} />}
              {admin && (
                <TableCell className="text-right">
                  <div className="inline-flex justify-end gap-0.5">
                    {onTogglePublishedListing ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className={cn(
                              "h-8 w-8 shrink-0",
                              (row as { publishedOnListing?: boolean }).publishedOnListing
                                ? "text-primary hover:text-primary"
                                : "text-muted-foreground hover:text-foreground"
                            )}
                            onClick={() => onTogglePublishedListing(row)}
                            aria-label={
                              (row as { publishedOnListing?: boolean }).publishedOnListing
                                ? "Unpublish from customer listings"
                                : "Publish in listing"
                            }
                          >
                            <Eye
                              className={cn(
                                "h-4 w-4",
                                (row as { publishedOnListing?: boolean }).publishedOnListing &&
                                  "text-primary"
                              )}
                              fill={
                                (row as { publishedOnListing?: boolean }).publishedOnListing
                                  ? "currentColor"
                                  : "none"
                              }
                              strokeWidth={2}
                            />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left">
                          {(row as { publishedOnListing?: boolean }).publishedOnListing
                            ? "Unpublish from customer listings"
                            : "Publish in listing"}
                        </TooltipContent>
                      </Tooltip>
                    ) : null}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onEdit?.(row)}
                      aria-label="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => onDelete?.(row)}
                      aria-label="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function MasterCells({ row }: { row: InventoryMaster }) {
  return (
    <>
      <TableCell>
        <Badge variant="secondary" className="font-normal">
          {row.category}
        </Badge>
      </TableCell>
      <TableCell className="max-w-[140px]">{row.subCategory}</TableCell>
      <TableCell className="font-medium">{row.location}</TableCell>
      <TableCell className="max-w-[200px] text-muted-foreground text-sm">{row.configurationAsset}</TableCell>
      <TableCell className="whitespace-nowrap text-sm">{row.size}</TableCell>
      <TableCell className="whitespace-nowrap font-mono text-sm">
        {row.quotedPriceCr != null ? formatPriceCr(row.quotedPriceCr) : "—"}
      </TableCell>
      <TableCell className="max-w-[160px] text-sm text-muted-foreground">{row.remarks || "—"}</TableCell>
    </>
  );
}

function UnderCells({ row }: { row: InventoryUnderConstruction }) {
  return (
    <>
      <TableCell className="font-medium max-w-[180px]">{row.project}</TableCell>
      <TableCell className="max-w-[160px] text-sm">{row.location}</TableCell>
      <TableCell>
        <Badge variant="outline">{row.status || "—"}</Badge>
      </TableCell>
      <TableCell className="max-w-[200px] text-sm text-muted-foreground">{row.configuration}</TableCell>
      <TableCell className="max-w-[180px] text-sm">{row.quotedPriceCr || "—"}</TableCell>
      <TableCell className="w-[8.5rem] max-w-[8.5rem] min-w-[7rem] align-top text-sm leading-snug break-words whitespace-normal text-foreground">
        {row.possession || "—"}
      </TableCell>
      <TableCell className="text-sm tabular-nums whitespace-nowrap">{row.carpetAreaSqft || "—"}</TableCell>
      <TableCell className="text-sm tabular-nums whitespace-nowrap">{row.saleableAreaSqft || "—"}</TableCell>
      <TableCell className="max-w-[220px] text-xs text-muted-foreground">{row.projectSize}</TableCell>
    </>
  );
}

function CommCells({ row }: { row: InventoryCommercial }) {
  return (
    <>
      <TableCell>
        <Badge>{row.assetType}</Badge>
      </TableCell>
      <TableCell className="font-medium">{row.location}</TableCell>
      <TableCell className="max-w-[240px] text-sm">{row.description}</TableCell>
      <TableCell className="text-sm whitespace-nowrap">{row.size}</TableCell>
      <TableCell className="font-mono text-sm">
        {row.quotedPriceCr != null ? formatPriceCr(row.quotedPriceCr) : "—"}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{row.remarks || "—"}</TableCell>
    </>
  );
}

function LeaseCells({ row }: { row: InventoryLease }) {
  return (
    <>
      <TableCell className="font-medium max-w-[160px]">{row.project}</TableCell>
      <TableCell>{row.location}</TableCell>
      <TableCell>
        <Badge variant="secondary">{row.status}</Badge>
      </TableCell>
      <TableCell className="max-w-[200px] text-sm">{row.unitType}</TableCell>
      <TableCell className="font-mono">{row.sqft ?? "—"}</TableCell>
      <TableCell className="max-w-[160px] text-sm font-medium">{row.rentInr || "—"}</TableCell>
      <TableCell className="text-xs text-muted-foreground max-w-[140px]">{row.remarks || "—"}</TableCell>
    </>
  );
}
