import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/hooks/useAuth";
import { AdminRedirect } from "@/components/AdminRedirect";
import { AdminAuth } from "@/components/AdminAuth";
import { RoleGuard } from "@/components/RoleGuard";
import { StockInPermissionGuard } from "@/components/StockInPermissionGuard";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import Index from "./pages/Index";
import AuthPage from "./pages/AuthPage";
import Items from "./pages/Items";
import Stock from "./pages/Stock";
import StockIn from "./pages/StockIn";
import RecordStockIn from "./pages/RecordStockIn";
import Reports from "./pages/Reports";
import Staff from "./pages/Staff";
import Settings from "./pages/Settings";
import Analytics from "./pages/Analytics";
import ActivityLogs from "./pages/ActivityLogs";
import RegionManagement from "./pages/RegionManagement";
import DistrictManagement from "./pages/DistrictManagement";
import BranchManagement from "./pages/BranchManagement";
import BranchAssignments from "./pages/BranchAssignments";
import MoveoutList from "./pages/MoveoutList";
import NotificationsPage from "./pages/Notifications";
import { ICADeliveryList } from "./pages/ICADeliveryList";

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/" element={<DashboardLayout><AdminRedirect><Index /></AdminRedirect></DashboardLayout>} />
              <Route path="/regions" element={<DashboardLayout><RegionManagement /></DashboardLayout>} />
              <Route path="/districts" element={<DashboardLayout><DistrictManagement /></DashboardLayout>} />
              <Route path="/branches" element={<DashboardLayout><RoleGuard allowedRoles={['admin']}><BranchManagement /></RoleGuard></DashboardLayout>} />
              <Route path="/branch-assignments" element={<DashboardLayout><RoleGuard allowedRoles={['admin']}><BranchAssignments /></RoleGuard></DashboardLayout>} />
              
              <Route path="/items" element={<DashboardLayout><Items /></DashboardLayout>} />
              <Route path="/stock" element={<DashboardLayout><Stock /></DashboardLayout>} />
              <Route path="/ica-delivery-list" element={<DashboardLayout><RoleGuard allowedRoles={['manager', 'assistant_manager']}><ICADeliveryList /></RoleGuard></DashboardLayout>} />
              <Route path="/stock-in" element={<DashboardLayout><StockInPermissionGuard><StockIn /></StockInPermissionGuard></DashboardLayout>} />
              <Route path="/record-stock-in" element={<DashboardLayout><RoleGuard allowedRoles={['staff']}><RecordStockIn /></RoleGuard></DashboardLayout>} />
              <Route path="/reports" element={<DashboardLayout><Reports /></DashboardLayout>} />
              <Route path="/staff" element={<DashboardLayout><Staff /></DashboardLayout>} />
              <Route path="/settings" element={<DashboardLayout><Settings /></DashboardLayout>} />
              <Route path="/analytics" element={<DashboardLayout><Analytics /></DashboardLayout>} />
              <Route path="/activity-logs" element={<DashboardLayout><ActivityLogs /></DashboardLayout>} />
              <Route path="/moveout-list" element={<DashboardLayout><MoveoutList /></DashboardLayout>} />
              <Route path="/notifications" element={<DashboardLayout><NotificationsPage /></DashboardLayout>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;