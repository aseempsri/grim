import { usePublicListings } from "@/hooks/useInventory";
import { useAgentProfile } from "@/hooks/useProperties";
import type { PublicInventoryListing } from "@/types/inventory";
import { getPropertyTypeLabel, splitSubtitleLines } from "@/lib/format";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/BrandLogo";
import {
  Building2,
  CalendarClock,
  Home,
  MapPin,
  Phone,
  Search,
  Store,
  Tag,
  TreePine,
  Waves,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { isListingVideoUrl } from "@/lib/listingMedia";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  type CarouselApi,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

/** Placeholder gradients aligned with garimarealty.com (gold + charcoal luxury palette) */
const TYPE_STYLE: Record<
  PublicInventoryListing["displayType"],
  { gradient: string; emoji: string; Icon: typeof Home }
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

function sourceKindLabel(kind: PublicInventoryListing["sourceKind"]): string {
  switch (kind) {
    case "master":
      return "Master inventory";
    case "underConstruction":
      return "Under construction";
    case "commercial":
      return "Commercial";
    case "lease":
      return "Lease inventory";
    default:
      return "Listing";
  }
}

function formatListingDate(iso: string): string {
  try {
    return format(parseISO(iso), "d MMM yyyy");
  } catch {
    return iso;
  }
}

type GallerySlide =
  | { kind: "image"; src: string }
  | { kind: "video"; src: string }
  | { kind: "placeholder"; gradient: string; emoji: string; caption: string };

function effectiveListingImageUrls(item: PublicInventoryListing): string[] {
  const fromArr = (item.listingImageUrls ?? []).filter((u) => typeof u === "string" && u.trim());
  if (fromArr.length) return fromArr.map((u) => u.trim());
  const one = item.listingImageUrl?.trim();
  return one ? [one] : [];
}

const GALLERY_ZOOM_MIN = 0.5;
const GALLERY_ZOOM_MAX = 3;
const GALLERY_ZOOM_STEP = 0.25;
/** Initial zoom when opening the modal or changing listing / slide (shown as 50%). */
const GALLERY_ZOOM_DEFAULT = 0.5;

function buildGallerySlides(item: PublicInventoryListing): GallerySlide[] {
  const st = TYPE_STYLE[item.displayType] ?? TYPE_STYLE.flat;
  const urls = effectiveListingImageUrls(item);
  if (urls.length) {
    return urls.map((src) =>
      isListingVideoUrl(src) ? { kind: "video" as const, src } : { kind: "image" as const, src }
    );
  }
  return [
    {
      kind: "placeholder",
      gradient: st.gradient,
      emoji: st.emoji,
      caption: "Add listing images or videos in Garima inventory to show media here",
    },
  ];
}

function ListingDetailModal({
  item,
  open,
  onOpenChange,
}: {
  item: PublicInventoryListing | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const slides = item ? buildGallerySlides(item) : [];
  const st = item ? (TYPE_STYLE[item.displayType] ?? TYPE_STYLE.flat) : TYPE_STYLE.flat;
  const TypeIcon = st.Icon;

  const [galleryZoom, setGalleryZoom] = useState(GALLERY_ZOOM_DEFAULT);
  const [carouselApi, setCarouselApi] = useState<CarouselApi | null>(null);
  const [gallerySlideIndex, setGallerySlideIndex] = useState(0);

  useEffect(() => {
    if (!open) setGalleryZoom(GALLERY_ZOOM_DEFAULT);
  }, [open]);

  useEffect(() => {
    setGalleryZoom(GALLERY_ZOOM_DEFAULT);
  }, [item?.catalogKey]);

  useEffect(() => {
    if (!carouselApi) return;
    const sync = () => {
      setGallerySlideIndex(carouselApi.selectedScrollSnap());
      setGalleryZoom(GALLERY_ZOOM_DEFAULT);
    };
    sync();
    carouselApi.on("reInit", sync);
    carouselApi.on("select", sync);
    return () => {
      carouselApi.off("reInit", sync);
      carouselApi.off("select", sync);
    };
  }, [carouselApi]);

  const gallerySlide = slides[gallerySlideIndex];
  const showGalleryZoom = gallerySlide?.kind === "image";
  const detailSubtitleLines = item ? splitSubtitleLines(item.subtitle) : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="z-[100] bg-black/85 backdrop-blur-[2px]"
        className={cn(
          "fixed z-[100] flex grim-dialog-max-h-screen w-[min(calc(100vw-1rem),3600px)] max-w-[min(calc(100vw-1rem),3600px)] translate-x-[-50%] translate-y-[-50%] flex-col gap-0 overflow-hidden rounded-2xl border-[hsl(40_15%_88%)] p-0 shadow-2xl",
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          "grim-showcase-dialog-shell",
          "[&>button]:z-[110]"
        )}
      >
        {item ? (
          <>
            <DialogTitle className="sr-only">{item.title}</DialogTitle>
            <div className="flex min-h-0 w-full flex-1 flex-col lg:h-full lg:flex-row lg:overflow-hidden">
              <div
                className={cn(
                  "order-2 flex min-h-0 w-full flex-col overflow-y-auto border-t border-[hsl(40_15%_88%)] bg-[hsl(40_30%_98%)] px-6 py-8 lg:order-1 lg:h-full lg:w-[40%] lg:max-w-[40%] lg:shrink-0 lg:border-r lg:border-t-0 lg:px-10 lg:py-10",
                  "text-[hsl(220_20%_10%)]"
                )}
              >
                <div className="flex min-h-0 flex-1 flex-col lg:min-h-0">
                  <header className="shrink-0">
                    <div className="mb-4 flex flex-wrap gap-2">
                      <Badge className="border-0 bg-[hsl(40_25%_94%)] text-[hsl(220_20%_12%)]">
                        {getPropertyTypeLabel(item.displayType)}
                      </Badge>
                      <Badge
                        className={cn(
                          "border-0 font-semibold",
                          item.listingIntent === "sale"
                            ? "bg-[hsl(37_39%_52%)] text-white"
                            : "bg-[hsl(220_15%_22%)] text-[hsl(0_0%_96%)]"
                        )}
                      >
                        {item.listingIntent === "sale" ? "For sale" : "For rent"}
                      </Badge>
                    </div>
                    <h2 className="font-display text-3xl font-bold leading-tight tracking-tight text-[hsl(220_20%_10%)] md:text-4xl">
                      {item.title}
                    </h2>
                  </header>

                  <div className="mt-6 shrink-0 rounded-xl border border-[hsl(40_15%_88%)] bg-[hsl(40_28%_99%)] p-5 shadow-[inset_0_1px_0_0_hsl(40_30%_100%)] sm:p-6">
                    <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-[hsl(220_10%_42%)]">
                      Key details
                    </p>
                    {detailSubtitleLines.length > 0 ? (
                      <div className="mb-5 flex gap-3 border-b border-[hsl(40_15%_90%)] pb-5 sm:mb-6 sm:pb-6">
                        <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-[hsl(37_39%_45%)]" aria-hidden />
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-[hsl(220_10%_45%)]">
                            Configuration &amp; status
                          </p>
                          <div className="mt-1.5 space-y-1.5">
                            {detailSubtitleLines.map((line, i) => (
                              <p
                                key={i}
                                className="text-base font-semibold leading-snug text-[hsl(220_22%_16%)] sm:text-lg md:text-[1.2rem]"
                              >
                                {line}
                              </p>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : null}
                    <dl className="grid grid-cols-1 gap-5 text-sm sm:gap-6 lg:grid-cols-2 lg:gap-x-8 lg:gap-y-5">
                      <div className="flex gap-3 lg:min-w-0">
                        <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-[hsl(37_39%_45%)]" aria-hidden />
                        <div className="min-w-0">
                          <dt className="text-[11px] font-semibold uppercase tracking-wider text-[hsl(220_10%_45%)]">
                            Location
                          </dt>
                          <dd className="mt-0.5 font-medium leading-snug text-[hsl(220_20%_12%)]">
                            {item.location || "—"}
                          </dd>
                        </div>
                      </div>
                      <div className="flex gap-3 lg:min-w-0">
                        <Tag className="mt-0.5 h-5 w-5 shrink-0 text-[hsl(37_39%_45%)]" aria-hidden />
                        <div className="min-w-0">
                          <dt className="text-[11px] font-semibold uppercase tracking-wider text-[hsl(220_10%_45%)]">
                            Inventory
                          </dt>
                          <dd className="mt-0.5 flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(40_22%_96%)] px-3 py-1 text-xs font-medium text-[hsl(220_15%_28%)]">
                              <TypeIcon className="h-3.5 w-3.5" aria-hidden />
                              {item.sourceLabel}
                            </span>
                            <span className="text-[hsl(220_12%_38%)]">· {sourceKindLabel(item.sourceKind)}</span>
                          </dd>
                        </div>
                      </div>
                      <div className="flex gap-3 border-t border-[hsl(40_15%_90%)] pt-5 lg:col-span-2">
                        <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-[hsl(37_39%_45%)]" aria-hidden />
                        <div>
                          <dt className="text-[11px] font-semibold uppercase tracking-wider text-[hsl(220_10%_45%)]">
                            Last updated
                          </dt>
                          <dd className="mt-0.5 font-medium text-[hsl(220_20%_12%)]">{formatListingDate(item.updatedAt)}</dd>
                        </div>
                      </div>
                    </dl>
                  </div>

                  <footer className="mt-8 shrink-0 lg:mt-auto">
                    <div className="rounded-2xl border border-[hsl(37_32%_82%)] bg-gradient-to-br from-[hsl(40_32%_97%)] to-[hsl(37_28%_94%)] px-5 py-6 shadow-sm sm:px-7 sm:py-8">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[hsl(220_12%_38%)] sm:text-sm">
                        Indicative price
                      </p>
                      <p className="font-display mt-3 text-4xl font-bold tabular-nums leading-[1.1] text-[hsl(37_36%_36%)] sm:mt-4 sm:text-5xl md:text-[2.75rem] lg:text-[3.1rem]">
                        {item.priceLabel}
                      </p>
                    </div>
                  </footer>
                </div>
              </div>

              <div className="relative order-1 flex min-h-[min(48vh,380px)] w-full shrink-0 flex-col bg-[hsl(220_22%_8%)] lg:order-2 lg:h-full lg:min-h-0 lg:w-[60%] lg:min-w-0 lg:max-w-[60%] lg:flex-1 lg:self-stretch">
                <Carousel
                  setApi={setCarouselApi}
                  className="relative flex min-h-0 w-full flex-1 flex-col lg:h-full"
                  opts={{ loop: slides.length > 1 }}
                >
                  <CarouselContent className="ml-0 h-full min-h-0">
                    {slides.map((slide, idx) => (
                      <CarouselItem key={idx} className="h-full basis-full pl-0">
                        <div className="relative box-border flex h-full min-h-[min(44vh,320px)] w-full flex-col">
                          {slide.kind === "image" ? (
                            <div className="flex min-h-0 flex-1 overflow-auto overscroll-contain">
                              <div className="flex min-h-full w-full min-w-full items-center justify-center px-2 py-3 sm:px-4 sm:py-5">
                                <img
                                  src={slide.src}
                                  alt=""
                                  className="h-auto max-w-none object-contain"
                                  style={{
                                    width: `${galleryZoom * 100}%`,
                                    maxWidth: galleryZoom <= 1 ? "100%" : undefined,
                                  }}
                                />
                              </div>
                            </div>
                          ) : slide.kind === "video" ? (
                            <div className="flex min-h-0 flex-1 items-center justify-center bg-black p-2 sm:p-4">
                              <video
                                src={slide.src}
                                className="max-h-[min(72vh,720px)] w-full max-w-full rounded-md object-contain"
                                controls
                                playsInline
                                preload="metadata"
                              />
                            </div>
                          ) : (
                            <div
                              className={cn(
                                "absolute inset-0 flex items-center justify-center bg-gradient-to-br",
                                slide.gradient
                              )}
                            >
                              <span className="select-none text-9xl opacity-35 drop-shadow-lg">{slide.emoji}</span>
                              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(255,255,255,0.12),transparent_55%)]" />
                              <Waves className="absolute bottom-0 left-0 right-0 h-20 text-white/10" aria-hidden />
                              <p className="absolute bottom-6 left-6 right-6 text-center text-xs font-medium uppercase tracking-widest text-white/70">
                                {slide.caption}
                              </p>
                              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/20" />
                            </div>
                          )}
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  {slides.length > 1 ? (
                    <>
                      <CarouselPrevious
                        type="button"
                        variant="secondary"
                        className="left-4 top-1/2 z-10 h-10 w-10 -translate-y-1/2 border-0 bg-white/90 text-[hsl(220_20%_10%)] shadow-md hover:bg-white"
                      />
                      <CarouselNext
                        type="button"
                        variant="secondary"
                        className="right-4 top-1/2 z-10 h-10 w-10 -translate-y-1/2 border-0 bg-white/90 text-[hsl(220_20%_10%)] shadow-md hover:bg-white"
                      />
                    </>
                  ) : null}
                </Carousel>
                {showGalleryZoom ? (
                  <div
                    className="absolute bottom-4 right-4 z-[60] flex flex-col gap-0.5 overflow-hidden rounded-lg border border-white/20 bg-black/55 shadow-lg backdrop-blur-sm"
                    role="toolbar"
                    aria-label="Image zoom"
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-none border-0 text-white hover:bg-white/15"
                      disabled={galleryZoom >= GALLERY_ZOOM_MAX - 1e-6}
                      onClick={() =>
                        setGalleryZoom((z) =>
                          Math.min(GALLERY_ZOOM_MAX, Math.round((z + GALLERY_ZOOM_STEP) * 100) / 100)
                        )
                      }
                      aria-label="Zoom in"
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                    <div className="border-t border-white/10 px-2 py-1 text-center text-[10px] font-medium tabular-nums text-white/90">
                      {Math.round(galleryZoom * 100)}%
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-none border-0 text-white hover:bg-white/15"
                      disabled={galleryZoom <= GALLERY_ZOOM_MIN + 1e-6}
                      onClick={() =>
                        setGalleryZoom((z) =>
                          Math.max(GALLERY_ZOOM_MIN, Math.round((z - GALLERY_ZOOM_STEP) * 100) / 100)
                        )
                      }
                      aria-label="Zoom out"
                    >
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                  </div>
                ) : null}
                <p className="pointer-events-none absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/45 px-3 py-1 text-xs font-medium text-white/95 backdrop-blur-sm">
                  {slides.length > 1 ? `${slides.length} views` : "Gallery"}
                </p>
              </div>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function ListingCard({
  item,
  onSelect,
}: {
  item: PublicInventoryListing;
  onSelect: (item: PublicInventoryListing) => void;
}) {
  const st = TYPE_STYLE[item.displayType] ?? TYPE_STYLE.flat;
  const imgUrls = effectiveListingImageUrls(item);
  const hasImg = imgUrls.length > 0;

  return (
    <article
      className="group relative flex h-full min-h-0 cursor-pointer flex-col overflow-hidden rounded-3xl border border-border/80 bg-card shadow-lg shadow-[hsl(37_39%_52%/0.08)] transition-all duration-500 hover:-translate-y-1 hover:shadow-xl hover:shadow-[hsl(37_39%_52%/0.15)] focus-within:ring-2 focus-within:ring-[hsl(37_39%_52%)] focus-within:ring-offset-2"
      role="button"
      tabIndex={0}
      onClick={() => onSelect(item)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(item);
        }
      }}
      aria-label={`Open details for ${item.title}`}
    >
      {/* Same fixed aspect for photo and placeholder so every card lines up (matches InventoryCatalogCard). */}
      <div className="relative aspect-[16/11] w-full shrink-0 overflow-hidden bg-muted">
        {hasImg ? (
          <div className="absolute inset-0 overflow-hidden" aria-hidden>
            {isListingVideoUrl(imgUrls[0]) ? (
              <video
                src={imgUrls[0]}
                className="h-full w-full scale-[1.06] object-cover blur-[2.5px] transition duration-700 group-hover:scale-110 group-hover:blur-[1.5px]"
                muted
                playsInline
                loop
                autoPlay
                preload="metadata"
              />
            ) : (
              <img
                src={imgUrls[0]}
                alt=""
                className="h-full w-full scale-[1.06] object-cover blur-[2.5px] transition duration-700 group-hover:scale-110 group-hover:blur-[1.5px]"
              />
            )}
          </div>
        ) : (
          <div
            className={cn(
              "absolute inset-0 flex items-center justify-center bg-gradient-to-br",
              st.gradient
            )}
          >
            <span className="select-none text-7xl opacity-40 drop-shadow-lg transition-transform duration-500 group-hover:scale-110 sm:text-8xl">
              {st.emoji}
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
            {getPropertyTypeLabel(item.displayType)}
          </Badge>
          <Badge
            className={cn(
              "border-0 font-semibold shadow-md backdrop-blur-sm",
              item.listingIntent === "sale"
                ? "bg-primary text-primary-foreground"
                : "bg-[hsl(220_15%_22%)] text-[hsl(0_0%_96%)]"
            )}
          >
            {item.listingIntent === "sale" ? "For sale" : "For rent"}
          </Badge>
        </div>
        <div className="absolute bottom-3 left-3 right-3 z-[2] sm:bottom-4 sm:left-4 sm:right-4">
          <p
            className={cn(
              "line-clamp-2 font-display text-xl font-bold leading-tight sm:text-2xl md:text-3xl",
              "text-[hsl(43_48%_96%)]",
              "[text-shadow:0_1px_2px_rgba(0,0,0,0.95),0_2px_20px_rgba(0,0,0,0.75)]"
            )}
          >
            {item.title}
          </p>
          <div
            className={cn(
              "mt-1 line-clamp-3 space-y-0.5 text-xs leading-snug sm:text-sm",
              "text-[hsl(42_32%_92%)]",
              "[text-shadow:0_1px_3px_rgba(0,0,0,0.92),0_2px_12px_rgba(0,0,0,0.65)]"
            )}
          >
            {splitSubtitleLines(item.subtitle).map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col justify-between gap-3 p-4 sm:gap-4 sm:p-5">
        <div className="space-y-3">
          <div className="flex items-start gap-2 text-muted-foreground">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
            <span className="text-sm font-medium leading-snug text-foreground">{item.location || "—"}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/80 px-3 py-1 text-xs font-medium text-muted-foreground">
              <st.Icon className="h-3.5 w-3.5" aria-hidden />
              {item.sourceLabel}
            </span>
          </div>
        </div>
        <div className="mt-auto flex flex-wrap items-end justify-between gap-3 border-t border-border/60 pt-3 sm:pt-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Indicative</p>
            <p className="line-clamp-2 font-display text-xl font-bold tabular-nums leading-tight text-primary sm:text-2xl">
              {item.priceLabel}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function PropertiesShowcase() {
  const { data: listings = [], isLoading, isError } = usePublicListings();
  const { data: agent } = useAgentProfile();
  const [search, setSearch] = useState("");
  const [intent, setIntent] = useState<"all" | "sale" | "rent">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | PublicInventoryListing["displayType"]>("all");
  const [selectedListing, setSelectedListing] = useState<PublicInventoryListing | null>(null);

  const filtered = useMemo(() => {
    return listings.filter((p) => {
      if (intent !== "all" && p.listingIntent !== intent) return false;
      if (typeFilter !== "all" && p.displayType !== typeFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        p.title.toLowerCase().includes(q) ||
        p.subtitle.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q) ||
        p.sourceLabel.toLowerCase().includes(q)
      );
    });
  }, [listings, search, intent, typeFilter]);

  return (
    <div className="garima-showcase min-h-screen bg-background text-foreground">
      <div className="relative overflow-hidden border-b border-[hsl(37_39%_52%/0.25)] bg-gradient-to-br from-[hsl(220_20%_10%)] via-[hsl(220_15%_13%)] to-[hsl(35_35%_28%)] px-4 py-16 text-[hsl(40_30%_96%)] md:py-24">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,hsl(37_39%_52%/0.35),transparent)]" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.05\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4V2H2v4h4v4H4v2H2v4h4v-4h2v4h4v-4H6zM6 4V0H4v4H0v2h4v4h4V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-50" />
        <div className="relative mx-auto max-w-5xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[hsl(37_39%_52%/0.45)] bg-[hsl(37_39%_52%/0.12)] px-4 py-1.5 text-sm text-[hsl(40_45%_88%)] backdrop-blur-md">
            <BrandLogo className="h-5 w-5 brightness-0 invert" />
            Garima Realty · Curated listings
          </div>
          <h1 className="font-display text-4xl font-bold tracking-tight text-[hsl(40_30%_98%)] md:text-5xl lg:text-6xl">
            Find your next address
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-[hsl(40_25%_88%)]/90 md:text-xl">
            {agent?.tagline ??
              "Hand-picked inventory from our live workbook — residences, land, commercial, and rentals across Pune."}
          </p>
          <div className="mx-auto mt-10 max-w-xl">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[hsl(220_10%_45%)]" />
              <Input
                placeholder="Search by title, location, or neighbourhood…"
                className="h-12 rounded-2xl border border-[hsl(40_15%_88%)] bg-[hsl(0_0%_100%)] pl-12 pr-4 text-[hsl(220_20%_10%)] shadow-lg ring-offset-background focus-visible:ring-[hsl(37_39%_52%)]"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-[hsl(40_25%_75%)]/80">Intent</span>
            {(
              [
                ["all", "All"],
                ["sale", "Buy / Sale"],
                ["rent", "Rent"],
              ] as const
            ).map(([v, label]) => (
              <Button
                key={v}
                type="button"
                size="sm"
                variant={intent === v ? "secondary" : "ghost"}
                className={cn(
                  "rounded-full border border-[hsl(0_0%_100%/0.2)]",
                  intent === v
                    ? "bg-[hsl(40_30%_96%)] text-[hsl(37_39%_42%)] shadow-md"
                    : "text-[hsl(40_30%_96%)] hover:bg-[hsl(0_0%_100%/0.08)]"
                )}
                onClick={() => setIntent(v)}
              >
                {label}
              </Button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-[hsl(40_25%_75%)]/80">Type</span>
            {(
              [
                ["all", "All types"],
                ["flat", "Flats"],
                ["plot", "Plots"],
                ["commercial", "Commercial"],
                ["villa", "Villas"],
              ] as const
            ).map(([v, label]) => (
              <Button
                key={v}
                type="button"
                size="sm"
                variant={typeFilter === v ? "secondary" : "ghost"}
                className={cn(
                  "rounded-full border border-[hsl(0_0%_100%/0.2)]",
                  typeFilter === v
                    ? "bg-[hsl(40_30%_96%)] text-[hsl(37_39%_42%)] shadow-md"
                    : "text-[hsl(40_30%_96%)] hover:bg-[hsl(0_0%_100%/0.08)]"
                )}
                onClick={() => setTypeFilter(v)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-14 md:px-6">
        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[420px] rounded-3xl bg-muted" />
            ))}
          </div>
        ) : isError ? (
          <p className="py-20 text-center text-muted-foreground">
            We couldn&apos;t load listings. Please try again later.
          </p>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[hsl(37_39%_52%/0.35)] bg-[hsl(0_0%_100%/0.6)] py-24 text-center shadow-inner">
            <p className="font-display text-2xl font-semibold text-foreground">Nothing to show yet</p>
            <p className="mt-2 text-muted-foreground">
              Your agent can publish inventory rows from Garima inventory — they will appear here automatically.
            </p>
          </div>
        ) : (
          <>
            <p className="mb-8 text-center text-sm text-muted-foreground">
              Showing <strong className="text-foreground">{filtered.length}</strong> curated{" "}
              {filtered.length === 1 ? "listing" : "listings"}
            </p>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3 lg:gap-10">
              {filtered.map((item) => (
                <ListingCard key={item.catalogKey} item={item} onSelect={setSelectedListing} />
              ))}
            </div>
          </>
        )}
      </div>

      <ListingDetailModal
        item={selectedListing}
        open={selectedListing !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedListing(null);
        }}
      />

      <footer className="border-t border-[hsl(40_15%_88%)] bg-[hsl(40_25%_94%)] py-12 text-center">
        <div className="mx-auto flex max-w-lg flex-col items-center gap-2 px-4">
          {agent?.name && (
            <p className="font-display text-xl font-semibold text-foreground">{agent.name}</p>
          )}
          {agent?.phone && (
            <a
              href={`tel:${agent.phone.replace(/\s/g, "")}`}
              className="inline-flex items-center gap-2 font-medium text-[hsl(37_39%_45%)] hover:text-[hsl(37_39%_38%)] hover:underline"
            >
              <Phone className="h-4 w-4" />
              {agent.phone}
            </a>
          )}
          <p className="text-xs text-muted-foreground">
            Prices and availability are indicative — confirm with Garima Realty before decisions.
          </p>
        </div>
      </footer>
    </div>
  );
}
