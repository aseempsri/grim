import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import { useInventoryInsights } from "@/hooks/useInventory";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Building2,
  Crosshair,
  Layers3,
  MapPin,
  PieChartIcon,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react";
import type { InventoryDashboardInsights } from "@/types/inventory";
import { cn } from "@/lib/utils";

const MIX_KEYS = [
  { key: "master" as const, label: "Master inventory" },
  { key: "underConstruction" as const, label: "Under construction" },
  { key: "commercial" as const, label: "Commercial sales" },
  { key: "lease" as const, label: "Lease" },
];

const CHART_COLORS = [
  "hsl(221 83% 53%)",
  "hsl(142 76% 36%)",
  "hsl(38 92% 48%)",
  "hsl(280 55% 52%)",
];

const PRICE_BAND_COLORS = [
  "hsl(199 89% 48%)",
  "hsl(221 83% 53%)",
  "hsl(262 83% 58%)",
  "hsl(330 81% 60%)",
  "hsl(220 10% 46%)",
];

function truncate(s: string, n: number) {
  const t = s.trim();
  if (t.length <= n) return t;
  return `${t.slice(0, n - 1)}…`;
}

function MixPie({ mix }: { mix: InventoryDashboardInsights["mix"] }) {
  const data = MIX_KEYS.map((m, i) => ({
    name: m.label,
    value: mix[m.key],
    fill: CHART_COLORS[i % CHART_COLORS.length],
  })).filter((d) => d.value > 0);

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Import or add inventory to see the mix.</p>;
  }

  const config = Object.fromEntries(data.map((d, i) => [`slice${i}`, { label: d.name, color: d.fill }]));

  return (
    <div className="relative mx-auto w-full max-w-[240px] aspect-square shrink-0">
      <ChartContainer
        config={config}
        className={cn(
          "absolute inset-0 flex h-full w-full !aspect-auto items-center justify-center text-xs",
          "[&_.recharts-responsive-container]:h-full [&_.recharts-responsive-container]:w-full [&_.recharts-responsive-container]:max-h-full",
          "[&_.recharts-wrapper]:h-full [&_.recharts-wrapper]:w-full [&_.recharts-wrapper]:max-h-full",
          "[&_.recharts-surface]:block [&_svg]:block",
        )}
      >
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent hideLabel />} />
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={52} outerRadius={86} paddingAngle={2}>
            {data.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>
    </div>
  );
}

function HorizBars({
  title,
  description,
  data,
  emptyHint,
}: {
  title: string;
  description: string;
  data: { name: string; count: number }[];
  emptyHint: string;
}) {
  const rows = data.map((d) => ({
    ...d,
    label: truncate(d.name, 22),
  }));

  if (rows.length === 0) {
    return (
      <Card className="h-full border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{emptyHint}</p>
        </CardContent>
      </Card>
    );
  }

  const chartConfig = { count: { label: "Units", color: "hsl(var(--primary))" } };

  return (
    <Card className="h-full border-border/80 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[240px] w-full min-h-[200px]">
          <BarChart
            accessibilityLayer
            layout="vertical"
            data={rows}
            margin={{ left: 8, right: 44, top: 4, bottom: 4 }}
          >
            <CartesianGrid horizontal={false} strokeDasharray="3 3" className="stroke-muted" />
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="label"
              width={128}
              interval={0}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Bar dataKey="count" fill="var(--color-count)" radius={4} barSize={16}>
              <LabelList
                dataKey="count"
                position="right"
                offset={8}
                formatter={(v: number | string) => (v != null && v !== "" ? String(v) : "")}
                className="fill-muted-foreground text-[11px] font-mono tabular-nums"
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

function buildNarrativeCards(data: InventoryDashboardInsights) {
  const m = data.portfolioMetrics;
  const mix = data.mix;
  const top = data.topLocations[0];
  const cards: { title: string; body: string; icon: typeof Target; className: string }[] = [];

  if (top && m.totalLines > 0) {
    cards.push({
      title: "Geographic anchor",
      body: `${top.name} is your densest micro-market with ${top.count} lines — about ${m.topLocationSharePct}% of the full book.`,
      icon: MapPin,
      className: "from-sky-500/15 via-card to-card border-sky-500/20",
    });
  }

  if (m.pipelineShareOfSale >= 15 && mix.underConstruction > 0) {
    cards.push({
      title: "Pipeline weight",
      body: `Under-construction rows are ${m.pipelineShareOfSale}% of everything you quote for sale — strong forward visibility for client conversations.`,
      icon: Activity,
      className: "from-emerald-500/15 via-card to-card border-emerald-500/20",
    });
  }

  if (m.leaseSharePct >= 30 || mix.lease > mix.master) {
    cards.push({
      title: "Rental engine",
      body: `Lease represents ${m.leaseSharePct}% of inventory (${mix.lease} rows). Pair site visits with recurring rental yield narratives where it helps.`,
      icon: TrendingUp,
      className: "from-amber-500/15 via-card to-card border-amber-500/20",
    });
  }

  if (m.top3LocationsSharePct >= 45 && data.topLocations.length >= 3) {
    cards.push({
      title: "Concentration signal",
      body: `Your top three areas alone cover ${m.top3LocationsSharePct}% of all lines — useful for “pocket expertise” positioning vs diversification asks.`,
      icon: Crosshair,
      className: "from-violet-500/15 via-card to-card border-violet-500/20",
    });
  }

  if (cards.length < 3 && mix.commercial > 0) {
    const commPct =
      m.totalLines > 0 ? Math.round((mix.commercial / m.totalLines) * 100) : 0;
    cards.push({
      title: "Commercial slice",
      body: `Commercial assets are ${commPct}% of the catalogue (${mix.commercial} rows) — ideal for yield-led and investor-led pitches.`,
      icon: Building2,
      className: "from-orange-500/15 via-card to-card border-orange-500/20",
    });
  }

  return cards.slice(0, 4);
}

function MetricTile({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  hint: string;
  icon: typeof Layers3;
}) {
  return (
    <div className="rounded-2xl border border-border/80 bg-gradient-to-br from-muted/40 to-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-primary/80 shrink-0" aria-hidden />
      </div>
      <p className="mt-2 font-display text-2xl font-bold tabular-nums tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground leading-snug">{hint}</p>
    </div>
  );
}

function SaleLeaseStrip({
  salePct,
  leasePct,
}: {
  salePct: number;
  leasePct: number;
}) {
  return (
    <div className="space-y-4">
      <div className="flex h-12 w-full overflow-hidden rounded-xl shadow-inner ring-1 ring-border/60">
        {leasePct === 0 ? (
          <div className="flex w-full items-center justify-center bg-gradient-to-br from-primary to-primary/85 px-3 text-sm font-semibold text-primary-foreground">
            Sale {salePct}%
          </div>
        ) : salePct === 0 ? (
          <div className="flex w-full items-center justify-center bg-gradient-to-br from-accent to-accent/90 px-3 text-sm font-semibold text-accent-foreground">
            Rent {leasePct}%
          </div>
        ) : (
          <>
            <div
              className="flex min-w-0 items-center justify-center bg-gradient-to-br from-primary to-primary/85 px-2 text-center text-xs font-semibold text-primary-foreground sm:text-sm"
              style={{ width: `${salePct}%` }}
            >
              Sale {salePct}%
            </div>
            <div
              className="flex min-w-0 items-center justify-center bg-gradient-to-br from-accent to-accent/90 px-2 text-center text-xs font-semibold text-accent-foreground sm:text-sm"
              style={{ width: `${leasePct}%` }}
            >
              Rent {leasePct}%
            </div>
          </>
        )}
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        Compares sale-quoted sheets (master, projects, commercial) against the lease book. Use it to tune how you split
        time between ticket-size conversations and recurring rental workflows.
      </p>
    </div>
  );
}

function PriceBandsPanel({ bands }: { bands: InventoryDashboardInsights["quotedPriceBands"] }) {
  const chartConfig = { count: { label: "Rows", color: "hsl(var(--primary))" } };
  const rows = bands.map((b, i) => ({
    label: b.label,
    count: b.count,
    fill: PRICE_BAND_COLORS[i % PRICE_BAND_COLORS.length],
  }));
  const total = rows.reduce((s, r) => s + r.count, 0);

  if (total === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        Add master or commercial rows with quoted prices to map your price ladder.
      </p>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="h-[260px] w-full">
      <BarChart data={rows} margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} interval={0} />
        <YAxis hide />
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={36}>
          {rows.map((r, i) => (
            <Cell key={r.label} fill={PRICE_BAND_COLORS[i % PRICE_BAND_COLORS.length]} />
          ))}
          <LabelList
            dataKey="count"
            position="top"
            className="fill-foreground text-[11px] font-mono font-medium tabular-nums"
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

export function DashboardInsights() {
  const { data, isPending, isError } = useInventoryInsights();

  if (isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-[300px] rounded-xl" />
          <Skeleton className="h-[300px] rounded-xl" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-36 rounded-2xl" />
          <Skeleton className="h-36 rounded-2xl" />
        </div>
        <Skeleton className="h-[220px] rounded-xl" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Could not load dashboard insights. Check that the API is running and try refreshing.
        </CardContent>
      </Card>
    );
  }

  const m = data.portfolioMetrics;
  const mix = data.mix;
  const narratives = buildNarrativeCards(data);
  const commercialPct =
    m.totalLines > 0 ? Math.round((mix.commercial / m.totalLines) * 100) : 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-display font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-7 w-7 shrink-0 text-primary" aria-hidden />
            Inventory intelligence
          </h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Live signals from your Garima workbook — mix, micro-markets, price ladders, and concentration so you can brief
            clients with numbers, not guesswork.
          </p>
        </div>
        <Link
          to="/dashboard/inventory"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline shrink-0"
        >
          Open inventory tables
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/80 shadow-sm overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <PieChartIcon className="h-4 w-4" />
              Sheet mix
            </CardTitle>
            <CardDescription>How rows distribute across master, UC, commercial, and lease.</CardDescription>
          </CardHeader>
          <CardContent>
            <MixPie mix={data.mix} />
            <ul className="mt-4 grid grid-cols-2 gap-2 text-xs">
              {MIX_KEYS.map((k, i) => (
                <li key={k.key} className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-sm shrink-0"
                    style={{ backgroundColor: CHART_COLORS[i] }}
                  />
                  <span className="text-muted-foreground truncate">{k.label}</span>
                  <span className="ml-auto font-mono font-medium tabular-nums">{data.mix[k.key]}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Layers3 className="h-4 w-4" />
              Sale vs rent posture
            </CardTitle>
            <CardDescription>Portfolio tilt between ticketed sale inventory and recurring lease.</CardDescription>
          </CardHeader>
          <CardContent>
            <SaleLeaseStrip salePct={m.saleSharePct} leasePct={m.leaseSharePct} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          label="Micro-markets"
          value={m.uniqueLocations}
          hint="Distinct locations after normalising spelling across sheets."
          icon={MapPin}
        />
        <MetricTile
          label="Top area share"
          value={`${m.topLocationSharePct}%`}
          hint="Share of all lines sitting in your #1 location."
          icon={Target}
        />
        <MetricTile
          label="Pipeline of sale book"
          value={`${m.pipelineShareOfSale}%`}
          hint="Under-construction rows as a share of everything quoted for sale."
          icon={Activity}
        />
        <MetricTile
          label="Commercial weight"
          value={`${commercialPct}%`}
          hint="Commercial rows vs entire catalogue — investor conversations."
          icon={Wallet}
        />
      </div>

      {narratives.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {narratives.map((n, i) => {
            const NarrIcon = n.icon;
            return (
              <div
                key={i}
                className={cn(
                  "relative overflow-hidden rounded-2xl border bg-gradient-to-br p-5 shadow-sm",
                  n.className
                )}
              >
                <div className="flex gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background/80 shadow-sm ring-1 ring-border/50">
                    <NarrIcon className="h-5 w-5 text-primary" aria-hidden />
                  </span>
                  <div className="min-w-0 space-y-1">
                    <p className="font-semibold leading-tight">{n.title}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{n.body}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Quoted price ladder
            </CardTitle>
            <CardDescription>
              Master + commercial rows bucketed by numeric ₹ Cr quotes ({m.masterCommercialWithNumericPrice} priced
              lines). “No numeric quote” captures text-only or missing figures.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PriceBandsPanel bands={data.quotedPriceBands} />
          </CardContent>
        </Card>

        <HorizBars
          title="Top micro-markets"
          description="Where inventory lines stack up after merging all four sheets."
          data={data.topLocations}
          emptyHint="Add location fields in your sheets to compare areas."
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <HorizBars
          title="Commercial — asset DNA"
          description="How commercial inventory clusters by asset type."
          data={data.commercialByAssetType}
          emptyHint="No commercial rows with asset types yet."
        />
        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Concentration snapshot</CardTitle>
            <CardDescription>
              Share of the book captured by your top three micro-markets (all sheets combined).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end gap-2">
              <span className="font-display text-5xl font-bold tabular-nums text-primary">{m.top3LocationsSharePct}</span>
              <span className="text-lg font-medium text-muted-foreground pb-1">%</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary via-primary/80 to-accent transition-all duration-500"
                style={{ width: `${Math.min(100, m.top3LocationsSharePct)}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Higher concentration means sharper local expertise positioning; lower concentration suggests a broader
              geographic story — both are valid depending on your GTM.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <HorizBars
          title="Master — categories"
          description="Residential / land mix from the master sheet."
          data={data.masterCategories}
          emptyHint="No categories in master inventory yet."
        />
        <HorizBars
          title="Projects — pipeline status"
          description="Under-construction rows grouped by status."
          data={data.underConstructionByStatus}
          emptyHint="No under-construction rows yet."
        />
        <HorizBars
          title="Lease — by project"
          description="Where rental units concentrate."
          data={data.leaseByProject}
          emptyHint="No lease rows with project names yet."
        />
      </div>

      <p className="text-xs text-muted-foreground flex items-start gap-2 rounded-xl border border-dashed bg-muted/20 p-4">
        <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
        <span>
          Pair <strong>micro-market density</strong> with the <strong>price ladder</strong> before site visits: it keeps
          conversations anchored in data clients can see in your inventory tables.
        </span>
      </p>
    </div>
  );
}
