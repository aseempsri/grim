import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

type Props = {
  children: React.ReactNode;
  /** Unique key for this column (used with sort state). */
  columnKey: string;
  activeKey: string | null;
  direction: "asc" | "desc";
  onSort: (columnKey: string) => void;
  className?: string;
  /** Show full header text on multiple lines instead of truncating with ellipsis. */
  allowWrap?: boolean;
  /** Keep header label on one line (no wrap, no ellipsis); use with a wide enough `className` min-width on `TableHead`. */
  noWrapLabel?: boolean;
};

/**
 * Clickable header with sort icons: neutral (⇅), active ascending (↑), active descending (↓).
 */
export function SortableTableHead({
  children,
  columnKey,
  activeKey,
  direction,
  onSort,
  className,
  allowWrap,
  noWrapLabel,
}: Props) {
  const active = activeKey === columnKey;

  return (
    <TableHead className={cn("font-semibold text-xs uppercase tracking-wide", className)}>
      <button
        type="button"
        onClick={() => onSort(columnKey)}
        className={cn(
          "-mx-1 inline-flex w-full min-w-0 justify-start gap-1 rounded px-1 py-0.5 text-left transition-colors",
          allowWrap ? "items-start" : "items-center",
          "hover:bg-muted/80 hover:text-foreground",
          active && "text-foreground"
        )}
      >
        <span
          className={cn(
            noWrapLabel
              ? "whitespace-nowrap"
              : allowWrap
                ? "min-w-0 whitespace-normal break-words leading-snug"
                : "min-w-0 truncate"
          )}
        >
          {children}
        </span>
        <span className="inline-flex shrink-0 text-muted-foreground" aria-hidden>
          {active ? (
            direction === "asc" ? (
              <ArrowUp className="h-3.5 w-3.5" />
            ) : (
              <ArrowDown className="h-3.5 w-3.5" />
            )
          ) : (
            <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
          )}
        </span>
      </button>
    </TableHead>
  );
}
