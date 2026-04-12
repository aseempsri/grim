import { useInventoryStats } from '@/hooks/useInventory';
import { Card, CardContent } from '@/components/ui/card';
import {
  Building2,
  IndianRupee,
  TrendingUp,
  Clock,
  Plus,
  Table2,
  LayoutDashboard,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { DashboardInsights } from '@/components/dashboard/DashboardInsights';

export default function Dashboard() {
  const { data, isPending, isError } = useInventoryStats();
  const ok = !isPending && !isError && data;

  const stats = [
    {
      label: 'Total Listings',
      value: ok ? data.totalListings : '—',
      icon: Building2,
      color: 'text-primary',
    },
    {
      label: 'For Sale',
      value: ok ? data.forSale : '—',
      icon: IndianRupee,
      color: 'text-[hsl(var(--success))]',
    },
    {
      label: 'For Rent',
      value: ok ? data.forRent : '—',
      icon: TrendingUp,
      color: 'text-[hsl(var(--accent))]',
    },
    {
      label: 'Ready (All but Under Construction)',
      value: ok ? data.published : '—',
      icon: Clock,
      color: 'text-primary',
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <LayoutDashboard className="h-8 w-8 shrink-0 text-primary" aria-hidden />
            Dashboard
          </h1>
          <p className="text-muted-foreground text-sm mt-1 max-w-xl">
            Snapshot of your Garima catalogue — scroll down for mix, micro-markets, price ladders, and narrative
            signals.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/dashboard/inventory"><Table2 className="h-4 w-4 mr-1" /> Garima inventory</Link>
          </Button>
          <Button asChild>
            <Link to="/dashboard/add"><Plus className="h-4 w-4 mr-1" /> Add Property</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card
            key={s.label}
            className="overflow-hidden border-border/80 bg-gradient-to-br from-card via-card to-muted/25 shadow-sm transition-shadow hover:shadow-md"
          >
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`p-3 rounded-xl bg-background/80 ring-1 ring-border/60 shadow-inner ${s.color}`}>
                <s.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold tabular-nums tracking-tight">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <DashboardInsights />
    </div>
  );
}
