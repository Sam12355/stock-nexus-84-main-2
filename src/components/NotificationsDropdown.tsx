import { useState, useEffect } from 'react';
import { Bell, AlertTriangle, Calendar, Clock } from 'lucide-react';
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

interface Notification {
  id: string;
  type: string;
  message: string;
  created_at: string;
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

  useEffect(() => {
    if (profile) {
      fetchNotifications();
      fetchUpcomingEvents();
      fetchStockAlerts();
    }
  }, [profile]);

  const fetchNotifications = async () => {
    if (!profile) return;

    try {
      const data = await apiClient.getNotifications();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
    }
  };

  const fetchUpcomingEvents = async () => {
    if (!profile) return;

    try {
      const data = await apiClient.getCalendarEvents();
      setEvents(Array.isArray(data) ? data : []);
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
      
      setStockAlerts(alerts);
    } catch (error) {
      console.error('Error fetching stock alerts:', error);
      setStockAlerts([]);
    }
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
              {totalCount > 9 ? '9+' : totalCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 z-50" align="end">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
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
                  <DropdownMenuItem key={alert.id} className="flex items-start space-x-2 p-3">
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
                  <DropdownMenuItem key={event.id} className="flex items-start space-x-2 p-3">
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
                  <DropdownMenuItem key={notification.id} className="flex items-start space-x-2 p-3">
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