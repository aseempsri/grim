import { Building2, Plus, LayoutDashboard, Table2 } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';
import { NavLink } from '@/components/NavLink';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from '@/components/ui/sidebar';

const navItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'All Properties', url: '/dashboard/properties', icon: Building2 },
  { title: 'Garima inventory', url: '/dashboard/inventory', icon: Table2 },
  { title: 'Add Property', url: '/dashboard/add', icon: Plus },
];

export function DashboardSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarContent className="bg-sidebar">
        <div className={collapsed ? 'flex justify-center p-4 pb-2' : 'p-4'}>
          <div className={`flex items-center gap-2 mb-2 ${collapsed ? 'justify-center' : ''}`}>
            <BrandLogo className={collapsed ? 'h-9 w-9' : 'h-7 w-7'} />
            {!collapsed && (
              <span className="font-display text-lg font-bold text-sidebar-foreground">Garima Realty</span>
            )}
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className="hover:bg-sidebar-accent" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
