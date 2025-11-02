import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Home,
  Users,
  Package,
  BarChart3,
  ClipboardList,
  Settings,
  LogOut,
  Package2,
  User,
  FileText,
  MapPin,
  Building,
  Building2,
  ArrowRight,
  UserCheck,
  Plus,
  Upload
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';

const menuItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: Home,
    roles: ['manager', 'assistant_manager', 'staff']
  },
  {
    title: "Branch Management",
    url: "/branches",
    icon: Building2,
    roles: ['admin']
  },
  {
    title: "Manage Staff",
    url: "/staff",
    icon: Users,
    roles: ['admin', 'manager', 'assistant_manager']
  },
  {
    title: "Manage Items",
    url: "/items",
    icon: Package2,
    roles: ['manager', 'assistant_manager']
  },
  {
    title: "Stock Out",
    url: "/stock",
    icon: Package,
    roles: ['manager', 'assistant_manager', 'staff']
  },
  {
    title: "ICA Delivery",
    url: "/ica-delivery-list",
    icon: ClipboardList,
    roles: ['manager', 'assistant_manager']
  },
  {
    title: "Stock In",
    url: "/stock-in",
    icon: Plus,
    roles: ['manager', 'assistant_manager']
  },
  {
    title: "Record Stock In",
    url: "/record-stock-in",
    icon: Upload,
    roles: ['staff']
  },
  {
    title: "Reports",
    url: "/reports",
    icon: FileText,
    roles: ['manager', 'assistant_manager']
  },
  {
    title: "Analytics",
    url: "/analytics",
    icon: BarChart3,
    roles: ['manager', 'assistant_manager']
  },
  {
    title: "Activity Logs",
    url: "/activity-logs",
    icon: ClipboardList,
    roles: ['admin', 'manager']
  },
  {
    title: "Moveout List",
    url: "/moveout-list",
    icon: ArrowRight,
    roles: ['staff']
  }
];

export function AppSidebar() {
  const { profile, signOut } = useAuth();
  const { state, setOpenMobile } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const isCollapsed = state === 'collapsed';
  const isMobile = useIsMobile();

  const isActive = (path: string) => {
    if (path === '/' && currentPath === '/') return true;
    if (path !== '/' && currentPath === path) return true;
    return false;
  };

  const filteredItems = menuItems.filter(item => {
    if (!profile?.role) return false;
    
    // Check if user role is in the item's allowed roles
    const hasRoleAccess = item.roles.includes(profile.role as string);
    
    // Special permission check for assistant managers accessing Stock In
    if (profile.role === 'assistant_manager' && item.url === '/stock-in') {
      const hasStockInPermission = profile?.notification_settings?.assistant_manager_stock_in_access || false;
      return hasRoleAccess && hasStockInPermission;
    }
    
    return hasRoleAccess;
  });

  return (
    <Sidebar className="bg-sidebar md:border-r md:border-border">
      <SidebarContent className="p-4">
        {/* Logo/Brand */}
        <div className="flex items-center gap-2 px-4 py-6 border-b border-sidebar-border mb-4">
          <Package2 className="h-8 w-8 text-sidebar-primary" />
          {!isCollapsed && (
            <div>
              <h1 className="font-bold text-lg text-sidebar-foreground">IMS</h1>
              <p className="text-xs text-sidebar-foreground/70">Inventory System</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/70 mb-2">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {filteredItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} className="justify-start">
                      <NavLink
                        to={item.url}
                        className={({ isActive }) => `flex items-center gap-2 rounded-md px-2 py-1.5 ${isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}`}
                        onClick={() => {
                          if (isMobile) {
                            setOpenMobile(false);
                          }
                        }}
                      >
                        <item.icon className="h-4 w-4" />
                        {!isCollapsed && <span>{item.title}</span>}
                      </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* User Profile */}
        <div className="mt-auto pt-4 border-t border-sidebar-border">
          <SidebarGroup>
            <SidebarGroupContent>
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="h-8 w-8 rounded-full bg-sidebar-primary flex items-center justify-center">
                  <User className="h-4 w-4 text-sidebar-primary-foreground" />
                </div>
                {!isCollapsed && profile && (
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-sidebar-foreground truncate">
                      {profile.name}
                    </p>
                    <p className="text-xs text-sidebar-foreground/70 capitalize">
                      {profile.role?.replace('_', ' ')}
                    </p>
                  </div>
                )}
              </div>

              <div className="px-4 space-y-1">
                <SidebarMenu className="space-y-1 list-none">
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive('/settings')} className="justify-start">
                        <NavLink
                          to="/settings"
                          className={({ isActive }) => `flex items-center gap-2 rounded-md px-2 py-1.5 ${isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}`}
                          onClick={() => {
                            if (isMobile) {
                              setOpenMobile(false);
                            }
                          }}
                        >
                          <Settings className="h-4 w-4" />
                          {!isCollapsed && <span>Settings</span>}
                        </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={signOut}
                          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        >
                          <LogOut className="h-4 w-4" />
                          {!isCollapsed && <span className="ml-3 text-sidebar-foreground">Sign Out</span>}
                        </Button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}