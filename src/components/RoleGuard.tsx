import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: string[];
  redirectTo?: string;
}

export function RoleGuard({ children, allowedRoles, redirectTo = '/' }: RoleGuardProps) {
  const { profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (profile && !allowedRoles.includes(profile.role as string)) {
      navigate(redirectTo, { replace: true });
    }
  }, [profile?.role, allowedRoles, navigate, redirectTo]);

  // If user doesn't have permission, don't render the component
  if (!profile || !allowedRoles.includes(profile.role as string)) {
    return null;
  }

  return <>{children}</>;
}





