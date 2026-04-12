import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { Outlet, Link } from 'react-router-dom';
import { Eye, Table2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function DashboardLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <DashboardSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center justify-between border-b px-4 bg-background">
            <SidebarTrigger className="ml-0" />
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link to="/garima-inventory" target="_blank">
                  <Table2 className="h-4 w-4 mr-1" /> Inventory catalogue
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to="/properties" target="_blank">
                  <Eye className="h-4 w-4 mr-1" /> Listings
                </Link>
              </Button>
            </div>
          </header>
          <main className="flex-1 min-w-0 overflow-auto bg-muted/30 px-3 py-6 sm:px-4 lg:px-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
