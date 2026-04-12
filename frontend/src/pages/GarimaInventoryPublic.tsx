import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InventoryTable } from "@/components/inventory/InventoryTable";
import { useInventoryList } from "@/hooks/useInventory";
import type { InventoryKindSlug } from "@/types/inventory";
import { useAgentProfile } from "@/hooks/useProperties";
import { Building2, Table2 } from "lucide-react";

const TABS: { slug: InventoryKindSlug; label: string; description: string }[] = [
  {
    slug: "master",
    label: "Master inventory",
    description: "Residential land parcels, luxury residences, and pre-leased homes — sizes and quoted prices in crores.",
  },
  {
    slug: "under-construction",
    label: "Under construction",
    description: "Selected projects with configuration mix, indicative pricing bands, possession timelines, and scale.",
  },
  {
    slug: "commercial",
    label: "Commercial sales",
    description: "Pre-leased offices, retail, hotels, and road-touch spaces across Pune.",
  },
  {
    slug: "lease",
    label: "Lease inventory",
    description: "Monthly rentals by project — furnishing status, unit types, and carpet areas.",
  },
];

export default function GarimaInventoryPublic() {
  const [tab, setTab] = useState<InventoryKindSlug>("master");
  const { data: agent } = useAgentProfile();

  const master = useInventoryList("master");
  const under = useInventoryList("under-construction");
  const commercial = useInventoryList("commercial");
  const lease = useInventoryList("lease");

  const map: Record<InventoryKindSlug, typeof master.data> = {
    master: master.data,
    "under-construction": under.data,
    commercial: commercial.data,
    lease: lease.data,
  };

  const load: Record<InventoryKindSlug, boolean> = {
    master: master.isLoading,
    "under-construction": under.isLoading,
    commercial: commercial.isLoading,
    lease: lease.isLoading,
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-primary/70 text-primary-foreground">
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent" />
        <div className="relative max-w-6xl mx-auto px-4 py-16 md:py-20 text-center">
          <div className="flex justify-center mb-4">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm backdrop-blur-sm">
              <Table2 className="h-5 w-5 shrink-0 text-primary-foreground" aria-hidden />
              Garima Realty
            </span>
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-3">
            Inventory catalogue
          </h1>
          <p className="text-primary-foreground/85 max-w-2xl mx-auto text-lg leading-relaxed">
            Explore live availability across master residential stock, upcoming launches, commercial assets, and lease
            listings — aligned with our internal Excel workbooks.
          </p>
          {agent?.name && (
            <p className="mt-6 text-sm text-primary-foreground/70 flex items-center justify-center gap-2">
              <Building2 className="h-4 w-4" />
              {agent.name}
              {agent.tagline && <span className="hidden sm:inline">· {agent.tagline}</span>}
            </p>
          )}
        </div>
      </div>

      <div className="w-full min-w-0 mx-auto px-3 sm:px-5 lg:px-8 py-10">
        <Tabs value={tab} onValueChange={(v) => setTab(v as InventoryKindSlug)} className="space-y-8">
          <TabsList className="flex flex-wrap h-auto gap-2 p-2 w-full justify-start bg-muted/50">
            {TABS.map((t) => (
              <TabsTrigger
                key={t.slug}
                value={t.slug}
                className="rounded-lg px-4 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-md"
              >
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {TABS.map((t) => (
            <TabsContent key={t.slug} value={t.slug} className="space-y-4">
              <p className="text-muted-foreground max-w-3xl">{t.description}</p>
              {load[t.slug] ? (
                <p className="text-center py-16 text-muted-foreground">Loading catalogue…</p>
              ) : (
                <InventoryTable kind={t.slug} rows={map[t.slug] ?? []} />
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        <p>Garima Realty · Inventory reference · Prices and availability subject to confirmation</p>
      </footer>
    </div>
  );
}
