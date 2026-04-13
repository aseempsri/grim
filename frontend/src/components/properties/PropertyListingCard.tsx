import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatIndianPrice, getPropertyTypeIcon, getPropertyTypeLabel } from "@/lib/format";
import type { Property } from "@/types/models";
import { cn } from "@/lib/utils";
import { isListingVideoUrl } from "@/lib/listingMedia";
import { Eye, EyeOff, MapPin, Pencil, Trash2 } from "lucide-react";

const typeStyles: Record<string, { bar: string; badge: string; glow: string }> = {
  flat: {
    bar: "bg-gradient-to-b from-sky-500 to-blue-600",
    badge: "bg-sky-500/15 text-sky-800 dark:text-sky-200 border-sky-400/30",
    glow: "group-hover:shadow-sky-500/20",
  },
  plot: {
    bar: "bg-gradient-to-b from-emerald-500 to-teal-600",
    badge: "bg-emerald-500/15 text-emerald-900 dark:text-emerald-200 border-emerald-400/30",
    glow: "group-hover:shadow-emerald-500/20",
  },
  commercial: {
    bar: "bg-gradient-to-b from-amber-500 to-orange-600",
    badge: "bg-amber-500/15 text-amber-950 dark:text-amber-100 border-amber-400/30",
    glow: "group-hover:shadow-amber-500/20",
  },
  villa: {
    bar: "bg-gradient-to-b from-violet-500 to-purple-600",
    badge: "bg-violet-500/15 text-violet-950 dark:text-violet-100 border-violet-400/30",
    glow: "group-hover:shadow-violet-500/20",
  },
};

const defaultStyle = {
  bar: "bg-gradient-to-b from-slate-400 to-slate-600",
  badge: "bg-muted text-muted-foreground border-border",
  glow: "group-hover:shadow-md",
};

type Props = {
  property: Property;
  onTogglePublish: (p: Property) => void;
  onDeleteRequest: (id: string) => void;
};

export function PropertyListingCard({ property: p, onTogglePublish, onDeleteRequest }: Props) {
  const st = typeStyles[p.property_type] ?? defaultStyle;

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-all duration-300",
        "hover:-translate-y-0.5 hover:shadow-lg",
        st.glow
      )}
    >
      <div className={cn("absolute left-0 top-0 z-10 h-full w-1.5", st.bar)} aria-hidden />

      <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
        {p.cover_image_url ? (
          isListingVideoUrl(p.cover_image_url) ? (
            <video
              src={p.cover_image_url}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              muted
              playsInline
              loop
              autoPlay
              preload="metadata"
            />
          ) : (
            <img
              src={p.cover_image_url}
              alt=""
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          )
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted/50 text-6xl">
            {getPropertyTypeIcon(p.property_type)}
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pt-12 pb-3 px-4">
          <p className="line-clamp-2 text-base font-semibold leading-snug text-white drop-shadow-md">{p.title}</p>
        </div>
        <div className="absolute right-3 top-3 flex gap-1.5">
          <Badge
            className={cn(
              "border backdrop-blur-sm shadow-sm",
              p.listing_type === "sale"
                ? "bg-primary/90 text-primary-foreground border-primary/50"
                : "bg-secondary/90 text-secondary-foreground"
            )}
          >
            {p.listing_type === "sale" ? "Sale" : "Rent"}
          </Badge>
          <Badge
            variant="outline"
            className={cn(
              "border backdrop-blur-sm",
              p.status === "published" ? "bg-emerald-500/90 text-white border-emerald-400" : "bg-black/50 text-white border-white/30"
            )}
          >
            {p.status === "published" ? "Live" : "Draft"}
          </Badge>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4 pt-3">
        <div className="flex items-start justify-between gap-2">
          <Badge variant="outline" className={cn("shrink-0 font-normal", st.badge)}>
            {getPropertyTypeLabel(p.property_type)}
          </Badge>
          <p className="text-right text-lg font-bold tabular-nums text-foreground">{formatIndianPrice(p.price)}</p>
        </div>

        <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary/80" aria-hidden />
          <span className="line-clamp-2">
            {p.locality}
            {p.city ? ` · ${p.city}` : ""}
          </span>
        </p>

        {(p.bhk != null && p.bhk > 0) || (p.carpet_area != null && p.carpet_area > 0) ? (
          <p className="text-xs text-muted-foreground">
            {p.bhk != null && p.bhk > 0 ? <span className="font-medium text-foreground">{p.bhk} BHK</span> : null}
            {p.bhk != null && p.bhk > 0 && p.carpet_area != null && p.carpet_area > 0 ? <span> · </span> : null}
            {p.carpet_area != null && p.carpet_area > 0 ? (
              <span>{p.carpet_area.toLocaleString("en-IN")} sq.ft</span>
            ) : null}
          </p>
        ) : null}

        <div className="mt-auto flex items-center justify-end gap-1 border-t border-border/60 pt-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => onTogglePublish(p)}
            title={p.status === "published" ? "Unpublish" : "Publish"}
          >
            {p.status === "published" ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9" asChild>
            <Link to={`/dashboard/edit/${p.id}`} title="Edit">
              <Pencil className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-destructive hover:text-destructive"
            onClick={() => onDeleteRequest(p.id)}
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </article>
  );
}
