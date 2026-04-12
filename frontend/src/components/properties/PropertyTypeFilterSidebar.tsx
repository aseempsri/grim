import type { ComponentType } from "react";
import { cn } from "@/lib/utils";
import { Building2, Home, LayoutGrid, Store, TreePine } from "lucide-react";

export type PropertyTypeFilterValue = "all" | "flat" | "plot" | "commercial" | "villa";

/** `catalog` = full inventory catalog; `published` = rows toggled for the public listings page */
export type CatalogScope = "catalog" | "published";

const ITEMS: {
  value: PropertyTypeFilterValue;
  label: string;
  icon: ComponentType<{ className?: string }>;
  accent: string;
}[] = [
  {
    value: "all",
    label: "All listings",
    icon: LayoutGrid,
    accent: "from-slate-500/20 to-slate-600/10 border-slate-400/30 text-slate-700 dark:text-slate-200",
  },
  {
    value: "flat",
    label: "Flats",
    icon: Building2,
    accent: "from-sky-500/20 to-blue-600/15 border-sky-400/40 text-sky-800 dark:text-sky-200",
  },
  {
    value: "plot",
    label: "Plots",
    icon: TreePine,
    accent: "from-emerald-500/20 to-teal-600/15 border-emerald-400/40 text-emerald-900 dark:text-emerald-200",
  },
  {
    value: "commercial",
    label: "Commercial",
    icon: Store,
    accent: "from-amber-500/25 to-orange-600/15 border-amber-400/40 text-amber-950 dark:text-amber-100",
  },
  {
    value: "villa",
    label: "Villas",
    icon: Home,
    accent: "from-violet-500/20 to-purple-600/15 border-violet-400/40 text-violet-950 dark:text-violet-100",
  },
];

type CatalogFilterSidebarProps = {
  activeType: PropertyTypeFilterValue;
  activeScope: CatalogScope;
  onSelect: (scope: CatalogScope, type: PropertyTypeFilterValue) => void;
  counts: Record<PropertyTypeFilterValue, number>;
  publishedCounts: Record<PropertyTypeFilterValue, number>;
};

function TypeButtonGroup({
  title,
  ariaLabel,
  scope,
  activeScope,
  activeType,
  counts,
  onSelect,
  panelClassName,
}: {
  title: string;
  ariaLabel: string;
  scope: CatalogScope;
  activeScope: CatalogScope;
  activeType: PropertyTypeFilterValue;
  counts: Record<PropertyTypeFilterValue, number>;
  onSelect: (scope: CatalogScope, type: PropertyTypeFilterValue) => void;
  panelClassName?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/80 bg-gradient-to-b from-muted/50 to-muted/20 p-3 shadow-sm",
        panelClassName
      )}
    >
      <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
      <nav className="flex flex-col gap-1.5" aria-label={ariaLabel}>
        {ITEMS.map(({ value, label, icon: Icon, accent }) => {
          const isActive = activeScope === scope && activeType === value;
          const n = counts[value];
          return (
            <button
              key={`${scope}-${value}`}
              type="button"
              onClick={() => onSelect(scope, value)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-all",
                "bg-gradient-to-r hover:opacity-95",
                accent,
                isActive ? "ring-2 ring-primary/50 shadow-md scale-[1.02]" : "opacity-90 hover:opacity-100"
              )}
            >
              <span
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background/80 shadow-inner",
                  isActive && "ring-1 ring-primary/30"
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate">{label}</span>
                <span className="text-[11px] font-normal tabular-nums text-muted-foreground">
                  {n} {n === 1 ? "listing" : "listings"}
                </span>
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export function CatalogFilterSidebar({
  activeType,
  activeScope,
  onSelect,
  counts,
  publishedCounts,
}: CatalogFilterSidebarProps) {
  return (
    <aside className="flex w-full shrink-0 flex-col gap-4 lg:w-[220px]">
      <div className="lg:sticky lg:top-4 lg:space-y-4">
        <TypeButtonGroup
          title="By type"
          ariaLabel="Filter by property type (full catalog)"
          scope="catalog"
          activeScope={activeScope}
          activeType={activeType}
          counts={counts}
          onSelect={onSelect}
        />
        <TypeButtonGroup
          title="Published"
          ariaLabel="Filter by property type (published on public listings only)"
          scope="published"
          activeScope={activeScope}
          activeType={activeType}
          counts={publishedCounts}
          onSelect={onSelect}
          panelClassName="border-emerald-500/25 from-emerald-500/[0.06] to-muted/25"
        />
      </div>
    </aside>
  );
}
