import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getPropertyTypeLabel, splitSubtitleLines } from "@/lib/format";
import type { CatalogDisplayType, CatalogListing } from "@/types/catalog";
import { cn } from "@/lib/utils";
import { isListingVideoUrl } from "@/lib/listingMedia";
import { ArrowUpRight, Building2, Home, MapPin, Store, Table2, TreePine, Waves } from "lucide-react";

/** Matches public listing cards — dark hero, same placeholder gradients as PropertiesShowcase */
const LISTING_HERO_FALLBACK: Record<
  CatalogDisplayType,
  { gradient: string; emoji: string; Icon: typeof Building2 }
> = {
  flat: {
    gradient:
      "from-[hsl(37_35%_42%)]/95 via-[hsl(220_18%_16%)]/95 to-[hsl(220_22%_8%)]",
    emoji: "🏢",
    Icon: Building2,
  },
  plot: {
    gradient:
      "from-[hsl(145_25%_28%)]/90 via-[hsl(37_30%_36%)]/95 to-[hsl(220_22%_10%)]",
    emoji: "🌿",
    Icon: TreePine,
  },
  commercial: {
    gradient:
      "from-[hsl(35_38%_38%)]/95 via-[hsl(220_16%_14%)]/95 to-[hsl(220_22%_8%)]",
    emoji: "✨",
    Icon: Store,
  },
  villa: {
    gradient:
      "from-[hsl(40_42%_48%)]/95 via-[hsl(35_32%_34%)]/95 to-[hsl(220_20%_12%)]",
    emoji: "🏡",
    Icon: Home,
  },
};

const typeStyles: Record<string, { bar: string; badge: string; glow: string }> = {
  flat: {
    bar: "from-sky-500 via-blue-500 to-indigo-600",
    badge: "bg-sky-500/15 text-sky-900 dark:text-sky-100 border-sky-400/35",
    glow: "group-hover:shadow-sky-500/25",
  },
  plot: {
    bar: "from-emerald-500 via-teal-500 to-cyan-600",
    badge: "bg-emerald-500/15 text-emerald-950 dark:text-emerald-100 border-emerald-400/35",
    glow: "group-hover:shadow-emerald-500/25",
  },
  commercial: {
    bar: "from-amber-500 via-orange-500 to-rose-600",
    badge: "bg-amber-500/15 text-amber-950 dark:text-amber-100 border-amber-400/35",
    glow: "group-hover:shadow-amber-500/25",
  },
  villa: {
    bar: "from-violet-500 via-purple-500 to-fuchsia-600",
    badge: "bg-violet-500/15 text-violet-950 dark:text-violet-100 border-violet-400/35",
    glow: "group-hover:shadow-violet-500/25",
  },
};

const defaultStyle = {
  bar: "from-slate-400 to-slate-600",
  badge: "bg-muted text-muted-foreground border-border",
  glow: "group-hover:shadow-md",
};

function tabForSource(kind: CatalogListing["sourceKind"]): string {
  if (kind === "underConstruction") return "under-construction";
  return kind;
}

type Props = {
  item: CatalogListing;
};

export function InventoryCatalogCard({ item: c }: Props) {
  const st =
    typeStyles[c.displayType] ??
    ({
      bar: "from-slate-400 to-slate-600",
      badge: defaultStyle.badge,
      glow: defaultStyle.glow,
    } as (typeof typeStyles)["flat"]);
  const barClass = `bg-gradient-to-b ${st.bar}`;
  const heroFb = LISTING_HERO_FALLBACK[c.displayType] ?? LISTING_HERO_FALLBACK.flat;
  const TypeIcon = heroFb.Icon;
  const hasImg = Boolean(c.listingImageUrl?.trim());
  const subtitleLines = splitSubtitleLines(c.subtitle);

  const invHref = `/dashboard/inventory?tab=${encodeURIComponent(tabForSource(c.sourceKind))}&row=${encodeURIComponent(c.sourceId)}`;

  return (
    <article
      className={cn(
        "group relative flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border border-border/80 bg-card shadow-lg shadow-[hsl(37_39%_52%/0.08)] transition-all duration-500",
        "hover:-translate-y-1 hover:shadow-xl hover:shadow-[hsl(37_39%_52%/0.15)]",
        st.glow
      )}
    >
      <div className={cn("absolute left-0 top-0 z-10 h-full w-1.5 bg-gradient-to-b", barClass)} aria-hidden />

      {/* Fixed aspect so portrait listing art cannot balloon card height; image is cropped with object-cover */}
      <div className="relative aspect-[16/11] w-full shrink-0 overflow-hidden bg-muted">
        {hasImg ? (
          <div className="absolute inset-0 overflow-hidden" aria-hidden>
            {isListingVideoUrl(c.listingImageUrl?.trim() ?? "") ? (
              <video
                src={c.listingImageUrl?.trim() ?? ""}
                className="h-full w-full scale-[1.06] object-cover blur-[2.5px] transition duration-700 group-hover:scale-[1.08] group-hover:blur-[1.5px]"
                muted
                playsInline
                loop
                autoPlay
                preload="metadata"
              />
            ) : (
              <img
                src={c.listingImageUrl?.trim() ?? ""}
                alt=""
                className="h-full w-full scale-[1.06] object-cover blur-[2.5px] transition duration-700 group-hover:scale-[1.08] group-hover:blur-[1.5px]"
              />
            )}
          </div>
        ) : (
          <div
            className={cn(
              "absolute inset-0 flex items-center justify-center bg-gradient-to-br",
              heroFb.gradient
            )}
          >
            <span className="select-none text-7xl opacity-40 drop-shadow-lg transition-transform duration-500 group-hover:scale-110 sm:text-8xl">
              {heroFb.emoji}
            </span>
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(255,255,255,0.15),transparent_50%)]" />
            <Waves className="absolute bottom-0 left-0 right-0 h-16 text-white/10" aria-hidden />
          </div>
        )}
        <div
          className={cn(
            "pointer-events-none absolute inset-0 z-[1]",
            hasImg
              ? "bg-gradient-to-t from-[hsl(220_28%_5%/0.92)] via-[hsl(220_25%_8%/0.5)] via-[48%] to-[hsl(220_20%_12%/0.15)]"
              : "bg-gradient-to-t from-black/80 via-black/25 to-transparent"
          )}
        />
        {hasImg ? (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[52%] bg-gradient-to-t from-black/55 to-transparent backdrop-blur-[4px]"
            aria-hidden
          />
        ) : null}
        <div className="absolute left-4 top-4 z-[2] flex flex-wrap gap-2">
          <Badge className="border-0 bg-white/95 text-foreground shadow-md backdrop-blur-sm">
            {getPropertyTypeLabel(c.displayType)}
          </Badge>
          <Badge
            className={cn(
              "border-0 font-semibold shadow-md backdrop-blur-sm",
              c.listingIntent === "sale"
                ? "bg-primary text-primary-foreground"
                : "bg-[hsl(220_15%_22%)] text-[hsl(0_0%_96%)]"
            )}
          >
            {c.listingIntent === "sale" ? "For sale" : "For rent"}
          </Badge>
        </div>
        <div className="absolute bottom-3 left-3 right-3 z-[2] sm:bottom-4 sm:left-4 sm:right-4">
          <p
            className={cn(
              "line-clamp-2 font-display text-xl font-bold leading-tight sm:text-2xl",
              "text-[hsl(43_48%_96%)]",
              "[text-shadow:0_1px_2px_rgba(0,0,0,0.95),0_2px_20px_rgba(0,0,0,0.75)]"
            )}
          >
            {c.title}
          </p>
          {subtitleLines.length > 0 ? (
            <div
              className={cn(
                "mt-1 line-clamp-3 space-y-0.5 text-xs leading-snug sm:text-sm",
                "text-[hsl(42_32%_92%)]",
                "[text-shadow:0_1px_3px_rgba(0,0,0,0.92),0_2px_12px_rgba(0,0,0,0.65)]"
              )}
            >
              {subtitleLines.map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col justify-between gap-3 p-4 sm:gap-4 sm:p-5">
        <div className="space-y-3">
          <div className="flex items-start gap-2 text-muted-foreground">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
            <span className="text-sm font-medium leading-snug text-foreground">{c.location || "Location TBC"}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/80 px-3 py-1 text-xs font-medium text-muted-foreground">
              <TypeIcon className="h-3.5 w-3.5" aria-hidden />
              {c.sourceLabel}
            </span>
          </div>
        </div>

        <div className="mt-auto flex flex-col gap-2 border-t border-border/60 pt-3 sm:gap-3 sm:pt-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Indicative</p>
              <p className="line-clamp-2 font-display text-xl font-bold tabular-nums leading-tight text-primary sm:text-2xl">
                {c.priceLabel}
              </p>
            </div>
            <Button variant="secondary" size="sm" className="shrink-0 gap-1" asChild>
              <Link to={invHref}>
                <Table2 className="h-3.5 w-3.5" aria-hidden />
                Inventory
                <ArrowUpRight className="h-3.5 w-3.5 opacity-70" aria-hidden />
              </Link>
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground tabular-nums">
            Updated{" "}
            {new Date(c.updatedAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>
      </div>
    </article>
  );
}
