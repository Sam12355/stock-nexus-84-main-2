import { useState, useEffect } from 'react';
import { Bell, AlertTriangle, Calendar, Clock, History, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { notificationEvents } from '@/lib/notificationEvents';
import { socketService } from '@/lib/socket';

interface Notification {
  id: string;
  type: string;
  message: string;
  created_at: string;
  is_read?: boolean;
}

interface CalendarEvent {
  id: string;
  title: string;
  event_date: string;
  description?: string;
}

interface StockAlert {
  id: string;
  name: string;
  current_quantity: number;
  threshold_level: number;
}

export function NotificationsDropdown() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const getDismissedIds = (keySuffix: 'stock' | 'events') => {
    if (!profile?.id) return new Set<string>();
    try {
      const raw = localStorage.getItem(`dismissed_${keySuffix}_${profile.id}`);
      const arr = raw ? (JSON.parse(raw) as string[]) : [];
      return new Set(arr);
    } catch {
      return new Set<string>();
    }
  };

  const addDismissedId = (keySuffix: 'stock' | 'events', id: string) => {
    if (!profile?.id) return;
    const key = `dismissed_${keySuffix}_${profile.id}`;
    const set = getDismissedIds(keySuffix);
    set.add(id);
    localStorage.setItem(key, JSON.stringify(Array.from(set)));
  };

  useEffect(() => {
    if (profile) {
      fetchNotifications();
      fetchUpcomingEvents();
      fetchStockAlerts();
      
      // Connect to Socket.IO for real-time updates
      const token = localStorage.getItem('auth_token');
      const branchId = profile.branch_id || profile.branch_context;
      
      if (token && branchId) {
        console.log('🔌 Connecting to Socket.IO for real-time notifications...');
        console.log('🔌 Profile ID:', profile.id);
        console.log('🔌 Branch ID:', branchId);
        
        // Force fresh connection
        socketService.disconnect();
        const socket = socketService.connect(token, branchId);
        
        // Listen for real-time notification updates
        socketService.onNotificationUpdate((data) => {
          console.log('📢 Real-time notification update received:', data);
          refreshNotifications();
        });
        
        // Add connection status check
        const checkConnection = () => {
          if (!socketService.isSocketConnected()) {
            console.log('⚠️ Socket.IO not connected, attempting reconnection...');
            socketService.forceReconnect();
          }
        };
        
        // Check connection every 5 seconds
        const connectionCheckInterval = setInterval(checkConnection, 5000);
        
        return () => {
          clearInterval(connectionCheckInterval);
        };
      }
    }
    
    return () => {
      // Don't disconnect here as it might be used by other components
      // socketService.disconnect();
    };
  }, [profile]);

  // Poll for new notifications every 30 seconds
  useEffect(() => {
    if (!profile) return;

    const pollInterval = setInterval(() => {
      fetchNotifications();
      fetchUpcomingEvents();
      fetchStockAlerts();
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(pollInterval);
  }, [profile]);

  // Listen for immediate notification updates
  useEffect(() => {
    const unsubscribe = notificationEvents.onNotificationUpdate(() => {
      refreshNotifications();
    });

    return unsubscribe;
  }, [profile]);

  const fetchNotifications = async () => {
    if (!profile) return;

    try {
      const data = await apiClient.getNotifications();
      const rows = Array.isArray(data) ? data : [];
      setNotifications(rows.filter((n: Notification) => !n.is_read));
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
    }
  };

  const fetchUpcomingEvents = async () => {
    if (!profile) return;

    try {
      const data = await apiClient.getCalendarEvents();
      const rows: CalendarEvent[] = Array.isArray(data) ? data : [];
      const dismissed = getDismissedIds('events');
      setEvents(rows.filter((e) => !dismissed.has(e.id)));
    } catch (error) {
      console.error('Error fetching events:', error);
      setEvents([]);
    }
  };

  const fetchStockAlerts = async () => {
    if (!profile) return;

    try {
      const data = await apiClient.getStockData();
      
      const alerts = (data || [])
        .filter(item => item && item.items && item.current_quantity <= item.items.threshold_level)
        .map(item => ({
          id: item.item_id,
          name: item.items?.name || 'Unknown Item',
          current_quantity: item.current_quantity,
          threshold_level: item.items?.threshold_level || 0
        }));
      
      const dismissed = getDismissedIds('stock');
      setStockAlerts(alerts.filter((a) => !dismissed.has(a.id)));
    } catch (error) {
      console.error('Error fetching stock alerts:', error);
      setStockAlerts([]);
    }
  };

  const refreshNotifications = async () => {
    if (!profile || isRefreshing) return;

    console.log('🔄 Refreshing notifications...');
    setIsRefreshing(true);
    try {
      await Promise.all([
        fetchNotifications(),
        fetchUpcomingEvents(),
        fetchStockAlerts()
      ]);
      console.log('✅ Notifications refreshed successfully');
    } catch (error) {
      console.error('Error refreshing notifications:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const forceReconnect = () => {
    console.log('🔄 Forcing Socket.IO reconnection...');
    socketService.forceReconnect();
    refreshNotifications();
  };

  useEffect(() => {
    setTotalCount(notifications.length + events.length + stockAlerts.length);
  }, [notifications, events, stockAlerts]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-4 w-4" />
          {totalCount > 0 && (
            <span className="absolute -top-1 -right-1 h-3 w-3 bg-destructive rounded-full text-[10px] text-destructive-foreground flex items-center justify-center">
              {totalCount > 99 ? '99+' : totalCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 z-50" align="end">
        <DropdownMenuLabel>
          <div className="flex items-center justify-between">
            <span>Notifications</span>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={refreshNotifications}
                disabled={isRefreshing}
                title="Refresh notifications"
              >
                <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={forceReconnect}
                title="Force Socket.IO reconnection"
              >
                <div className="h-3 w-3 rounded-full bg-green-500"></div>
              </Button>
              <a
                href="/notifications"
                className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                  // keep dropdown behavior consistent (let navigation happen)
                }}
                title="View all notifications"
              >
                <History className="h-4 w-4" />
              </a>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <div className="space-y-2">
          {/* Stock Alerts */}
          {stockAlerts.length > 0 && (
            <div>
              <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground px-2 py-1">
                Stock Alerts
              </DropdownMenuLabel>
              <ScrollArea className="h-48 pr-2">
                {stockAlerts.map((alert) => (
                  <DropdownMenuItem
                    key={alert.id}
                    className="flex items-start space-x-2 p-3"
                    onSelect={(e) => e.preventDefault()}
                    onClick={() => {
                      setStockAlerts(prev => prev.filter(a => a.id !== alert.id));
                      addDismissedId('stock', alert.id);
                    }}
                  >
                    <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5" />
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium">{alert.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Stock: {alert.current_quantity}/{alert.threshold_level}
                      </p>
                      <Badge variant="outline" className="text-xs">Low Stock</Badge>
                    </div>
                  </DropdownMenuItem>
                ))}
              </ScrollArea>
              <DropdownMenuSeparator />
            </div>
          )}

          {/* Upcoming Events */}
          {events.length > 0 && (
            <div>
              <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground px-2 py-1">
                Upcoming Events
              </DropdownMenuLabel>
              <ScrollArea className="h-48 pr-2">
                {events.map((event) => (
                  <DropdownMenuItem
                    key={event.id}
                    className="flex items-start space-x-2 p-3"
                    onSelect={(e) => e.preventDefault()}
                    onClick={() => {
                      setEvents(prev => prev.filter(e => e.id !== event.id));
                      addDismissedId('events', event.id);
                    }}
                  >
                    <Calendar className="h-4 w-4 text-primary mt-0.5" />
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium">{event.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(event.event_date)}
                      </p>
                      <Badge variant="secondary" className="text-xs">
                        Event
                      </Badge>
                    </div>
                  </DropdownMenuItem>
                ))}
              </ScrollArea>
              <DropdownMenuSeparator />
            </div>
          )}

          {/* General Notifications */}
          {notifications.length > 0 && (
            <div>
              <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground px-2 py-1">
                General Notifications
              </DropdownMenuLabel>
              <ScrollArea className="h-48 pr-2">
                {notifications.map((notification) => (
                  <DropdownMenuItem
                    key={notification.id}
                    className="flex items-start space-x-2 p-3"
                    onSelect={(e) => e.preventDefault()}
                    onClick={async () => {
                      try {
                        await apiClient.markNotificationAsRead(notification.id);
                      } catch (err) {
                        console.error('Failed to mark notification as read:', err);
                      }
                      setNotifications(prev => prev.filter(n => n.id !== notification.id));
                    }}
                  >
                    <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1 space-y-1">
                      <p className="text-sm">{notification.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(notification.created_at)}
                      </p>
                    </div>
                  </DropdownMenuItem>
                ))}
              </ScrollArea>
            </div>
          )}

          {totalCount === 0 && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No new notifications
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}