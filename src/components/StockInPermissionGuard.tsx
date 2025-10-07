import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";

interface StockInPermissionGuardProps {
  children: React.ReactNode;
}

export const StockInPermissionGuard = ({ children }: StockInPermissionGuardProps) => {
  const { profile } = useAuth();

  // Allow managers always
  if (profile?.role === 'manager') {
    return <>{children}</>;
  }

  // Check permission for assistant managers
  if (profile?.role === 'assistant_manager') {
    const hasPermission = profile?.notification_settings?.assistant_manager_stock_in_access || false;
    if (hasPermission) {
      return <>{children}</>;
    }
  }

  // Redirect to dashboard if no permission
  return <Navigate to="/" replace />;
};





