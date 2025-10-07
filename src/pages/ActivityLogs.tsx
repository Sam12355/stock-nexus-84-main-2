import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, User, Package, Truck, AlertCircle, CheckCircle, Activity } from "lucide-react";
import { apiClient } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

interface ActivityLog {
  id: string;
  action: string;
  user_name: string;
  user_email: string;
  details: string;
  created_at: string;
  entity_type?: string;
  entity_id?: string;
}

const ActivityLogs = () => {
  const { profile } = useAuth();
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');

  const fetchActivityLogs = useCallback(async () => {
    if (!profile) return;
    setLoadingFeed(activities.length === 0);

    try {
      const response = await apiClient.getActivityLogs();
      
      if (response.success) {
        // Transform the data to match frontend expectations
        const transformedActivities: ActivityLog[] = response.data.map((log: any) => {
          let friendlyAction = log.action;
          let friendlyDetails = '';
          let activityType = 'system';

          // Parse details if it's an object
          let parsedDetails = {};
          try {
            parsedDetails = typeof log.details === 'string' ? JSON.parse(log.details) : (log.details || {});
          } catch {
            parsedDetails = typeof log.details === 'object' ? log.details : {};
          }

          // Make activities user-friendly
          switch (log.action) {
            case 'user_login':
              friendlyAction = 'User logged in';
              friendlyDetails = `${log.user_name} signed into the system`;
              activityType = 'login';
              break;
            case 'user_logout':
              friendlyAction = 'User logged out';
              friendlyDetails = `${log.user_name} signed out of the system`;
              activityType = 'logout';
              break;
            case 'item_created':
              friendlyAction = 'Item added';
              friendlyDetails = `${log.user_name} added a new item`;
              activityType = 'item_created';
              break;
            case 'item_updated':
              friendlyAction = 'Item updated';
              friendlyDetails = `${log.user_name} updated an item`;
              activityType = 'item_updated';
              break;
            case 'item_deleted':
              friendlyAction = 'Item removed';
              friendlyDetails = `${log.user_name} removed an item`;
              activityType = 'item_deleted';
              break;
            case 'staff_created':
              friendlyAction = 'Staff member added';
              friendlyDetails = `${log.user_name} added new staff member`;
              activityType = 'staff_created';
              break;
            case 'staff_updated':
              friendlyAction = 'Staff member updated';
              friendlyDetails = `${log.user_name} updated staff member`;
              activityType = 'staff_updated';
              break;
            case 'staff_deleted':
              friendlyAction = 'Staff member removed';
              friendlyDetails = `${log.user_name} removed a staff member`;
              activityType = 'staff_deleted';
              break;
            case 'profile_updated':
              friendlyAction = 'Profile updated';
              friendlyDetails = `${log.user_name} updated their profile`;
              activityType = 'profile_updated';
              break;
            case 'stock_in':
              friendlyAction = 'Stock received';
              friendlyDetails = `${log.user_name} received stock`;
              activityType = 'stock_in';
              break;
            case 'stock_out':
              friendlyAction = 'Stock dispensed';
              friendlyDetails = `${log.user_name} dispensed stock`;
              activityType = 'stock_out';
              break;
            case 'stock_movement':
              const movementType = parsedDetails.movement_type === 'in' ? 'received' : 'dispensed';
              const quantity = parsedDetails.quantity || 0;
              const reason = parsedDetails.reason ? ` (${parsedDetails.reason})` : '';
              friendlyAction = `Stock ${movementType}`;
              friendlyDetails = `${log.user_name} ${movementType} ${quantity} units${reason}`;
              activityType = movementType === 'received' ? 'stock_in' : 'stock_out';
              break;
            case 'stock_initialized':
              friendlyAction = 'Stock initialized';
              friendlyDetails = `${log.user_name} initialized stock records for ${parsedDetails.initialized_count || 0} items`;
              activityType = 'stock_in';
              break;
            default:
              friendlyAction = log.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
              friendlyDetails = typeof log.details === 'string' ? log.details : JSON.stringify(parsedDetails);
          }

          return {
            id: log.id,
            action: friendlyAction,
            user_name: log.user_name || 'Unknown User',
            user_email: log.user_email || '',
            details: friendlyDetails,
            created_at: log.created_at,
            entity_type: log.entity_type,
            entity_id: log.entity_id
          };
        });

        setActivities(transformedActivities);
      }
    } catch (error) {
      console.error('Error fetching activity logs:', error);
    } finally {
      setLoadingFeed(false);
      setInitialLoaded(true);
    }
  }, [profile]);

  // Filter activities on frontend for better performance
  const filteredActivities = activities.filter(activity => {
    if (filterType === 'all') return true;
    if (filterType === 'stock') return activity.action.includes('Stock');
    if (filterType === 'general') return !activity.action.includes('Stock');
    return true;
  });

  useEffect(() => {
    if (profile) {
      fetchActivityLogs();
    }
  }, [profile, fetchActivityLogs]);

  const getIcon = (action: string) => {
    if (action.includes('Stock received') || action.includes('Stock in')) {
      return <Truck className="h-4 w-4 text-green-600" />;
    }
    if (action.includes('Stock dispensed') || action.includes('Stock out')) {
      return <Package className="h-4 w-4 text-orange-600" />;
    }
    if (action.includes('Item added') || action.includes('created')) {
      return <CheckCircle className="h-4 w-4 text-blue-600" />;
    }
    if (action.includes('Item updated') || action.includes('updated')) {
      return <Activity className="h-4 w-4 text-blue-600" />;
    }
    if (action.includes('Item removed') || action.includes('deleted') || action.includes('removed')) {
      return <AlertCircle className="h-4 w-4 text-red-600" />;
    }
    if (action.includes('Staff member added') || action.includes('Staff member updated')) {
      return <User className="h-4 w-4 text-green-600" />;
    }
    if (action.includes('Staff member removed')) {
      return <User className="h-4 w-4 text-red-600" />;
    }
    if (action.includes('Profile updated')) {
      return <User className="h-4 w-4 text-purple-600" />;
    }
    if (action.includes('logged in')) {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    }
    if (action.includes('logged out')) {
      return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
    return <CalendarDays className="h-4 w-4 text-gray-600" />;
  };

  const getBadgeVariant = (action: string) => {
    if (action.includes('Stock received') || action.includes('Item added') || action.includes('Staff member added') || action.includes('logged in')) {
      return "default";
    }
    if (action.includes('Stock dispensed') || action.includes('Item updated') || action.includes('Staff member updated') || action.includes('Profile updated')) {
      return "secondary";
    }
    if (action.includes('Item removed') || action.includes('Staff member removed') || action.includes('logged out')) {
      return "destructive";
    }
    return "outline";
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Activity Logs</h1>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter activities" />
          </SelectTrigger>
          <SelectContent className="z-50">
            <SelectItem value="all">All Activities</SelectItem>
            <SelectItem value="stock">Stock Movements</SelectItem>
            <SelectItem value="general">General Logs</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Activity Feed */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96 w-full">
            {(loadingFeed && !initialLoaded) ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-start space-x-4 rounded-lg border p-4">
                    <Skeleton className="h-4 w-4 rounded-full mt-1" />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-5 w-20" />
                      </div>
                      <Skeleton className="h-3 w-full" />
                      <div className="flex items-center space-x-4">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredActivities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No activities found
              </div>
            ) : (
              <div className="space-y-4">
                {filteredActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start space-x-4 rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-shrink-0 mt-1">
                      {getIcon(activity.action)}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium leading-none">
                          {activity.action}
                        </p>
                        <Badge variant={getBadgeVariant(activity.action) as any}>
                          {activity.action}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {activity.details}
                      </p>
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                        <span className="flex items-center">
                          <User className="mr-1 h-3 w-3" />
                          {activity.user_name}
                        </span>
                        <span className="flex items-center">
                          <CalendarDays className="mr-1 h-3 w-3" />
                          {formatTimestamp(activity.created_at)}
                        </span>
                      </div>
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

export default ActivityLogs;