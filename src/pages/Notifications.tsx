import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

interface NotificationRow {
  id: string;
  title?: string;
  message: string;
  type: string;
  created_at: string;
  is_read?: boolean;
}

const NotificationsPage = () => {
  const { profile } = useAuth();
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!profile) return;
      setLoading(true);
      try {
        const data = await apiClient.getNotifications();
        const arr = Array.isArray(data) ? data : [];
        // Sort newest first
        arr.sort((a: NotificationRow, b: NotificationRow) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setRows(arr);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [profile]);

  const grouped = useMemo(() => {
    const groups: Record<string, NotificationRow[]> = {};
    for (const r of rows) {
      const key = r.type || 'general';
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    }
    return groups;
  }, [rows]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>

      <Card>
        <CardHeader>
          <CardTitle>All Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[70vh] pr-4">
            {loading && <div className="p-4 text-sm text-muted-foreground">Loading...</div>}
            {!loading && rows.length === 0 && (
              <div className="p-4 text-sm text-muted-foreground">No notifications</div>
            )}
            {!loading && rows.length > 0 && (
              <div className="space-y-6">
                {Object.entries(grouped).map(([group, list]) => (
                  <div key={group}>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">{group.replace('_', ' ')}</h3>
                    <div className="space-y-2">
                      {list.map((n) => (
                        <div key={n.id} className="p-3 border rounded-md bg-background">
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              {n.title && <p className="text-sm font-medium">{n.title}</p>}
                              <p className="text-sm whitespace-pre-wrap">{n.message}</p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(n.created_at).toLocaleString()}</p>
                            </div>
                            {!n.is_read && <span className="text-[10px] px-2 py-0.5 rounded bg-blue-100 text-blue-700">NEW</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationsPage;


