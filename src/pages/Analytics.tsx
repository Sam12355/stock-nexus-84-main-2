import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, LineChart, PieChart, TrendingUp, Package, Users, AlertTriangle, Activity, Calendar } from "lucide-react";
import { apiClient } from "@/lib/api";
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Cell, Pie, LineChart as RechartsLineChart, Line } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ItemStockUsageChart } from "@/components/ItemStockUsageChart";

// Category labels mapping
const categoryLabels = {
  fish_frozen: "Fish Frozen",
  vegetables: "Vegetables",
  other_frozen_food: "Other Frozen Food",
  meat_frozen: "Meat Frozen",
  kitchen_supplies: "Kitchen Supplies",
  grains: "Grains",
  fruits: "Fruits",
  flour: "Flour",
  cleaning_supplies: "Cleaning Supplies",
  canned_prepared_food: "Canned & Prepared Food",
  beer_non_alc: "Beer, non alc.",
  sy_product_recipes: "SY Product Recipes",
  packaging: "Packaging",
  sauce: "Sauce",
  softdrinks: "Softdrinks",
  spices: "Spices",
  other: "Other"
};

interface AnalyticsData {
  totalItems: number;
  lowStockItems: number;
  activeUsers: number;
  stockMovements: number;
  categoryData: Array<{ name: string; value: number; color: string }>;
  movementTrends: Array<{ date: string; in: number; out: number }>;
  topItems: Array<{ name: string; movements: number }>;
  usageComparison: Array<{ period: string; usage: number; type: string }>;
}

const Analytics = () => {
  const { profile } = useAuth();
  const [timePeriod, setTimePeriod] = useState('daily');
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalItems: 0,
    lowStockItems: 0,
    activeUsers: 0,
    stockMovements: 0,
    categoryData: [],
    movementTrends: [],
    topItems: [],
    usageComparison: []
  });
  const [loading, setLoading] = useState(true);

  const fetchAnalyticsData = useCallback(async () => {
    if (!profile) return;
    setLoading(analytics.totalItems === 0 && analytics.categoryData.length === 0 && analytics.movementTrends.length === 0);

    try {
      const branchId = profile.branch_id || profile.branch_context;

      // Fetch analytics data from backend
      const analyticsData = await apiClient.getAnalyticsData();

      // Process the data
      const totalItems = analyticsData.totalItems || 0;
      const lowStockItems = analyticsData.lowStockItems || 0;
      const activeUsers = analyticsData.activeUsers || 0;
      const stockMovements = analyticsData.stockMovements || 0;

      // Category distribution
      const categoryCount: { [key: string]: number } = {};
      analyticsData.items?.forEach((item: any) => {
        categoryCount[item.category] = (categoryCount[item.category] || 0) + 1;
      });

      const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];
      const formatCategory = (raw: string) => {
        const label = categoryLabels[raw as keyof typeof categoryLabels] || raw;
        return `${label} items`;
      };
      const categoryData = Object.entries(categoryCount).map(([name, value], index) => ({
        name: formatCategory(name),
        value,
        color: colors[index % colors.length]
      }));

      // Movement trends (last 7 days)
      const movementsByDate: { [key: string]: { in: number; out: number } } = {};
      analyticsData.movements?.forEach((movement: any) => {
        const date = new Date(movement.created_at).toLocaleDateString();
        if (!movementsByDate[date]) {
          movementsByDate[date] = { in: 0, out: 0 };
        }
        movementsByDate[date][movement.movement_type as 'in' | 'out'] += movement.quantity;
      });

      const movementTrends = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const key = d.toLocaleDateString();
        const val = movementsByDate[key] || { in: 0, out: 0 };
        return { date: key, ...val };
      });

      // Top performing items
      const itemMovementCount: { [key: string]: number } = {};
      analyticsData.movements?.forEach((movement: any) => {
        const itemName = movement.item_name;
        if (itemName) {
          itemMovementCount[itemName] = (itemMovementCount[itemName] || 0) + 1;
        }
      });

      const topItems = Object.entries(itemMovementCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([name, movements]) => ({ name, movements }));

      // Fetch usage comparison data based on time period
      const usageComparison = await fetchUsageComparison(branchId);

      setAnalytics({
        totalItems,
        lowStockItems,
        activeUsers,
        stockMovements,
        categoryData,
        movementTrends,
        topItems,
        usageComparison
      });

    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  }, [profile, timePeriod]);

  const fetchUsageComparison = useCallback(async (branchId: string) => {
    try {
      // Use the API client to get usage comparison data
      const usageData = await apiClient.getItemUsageAnalytics(timePeriod);
      
      return usageData.map((item: any) => ({
        period: item.period,
        usage: item.usage || 0,
        type: timePeriod
      }));

    } catch (error) {
      console.error('Error fetching usage comparison:', error);
      return [];
    }
  }, [timePeriod]);

  useEffect(() => {
    if (profile) {
      fetchAnalyticsData();
    }
  }, [profile, fetchAnalyticsData, fetchUsageComparison]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
      </div>
      
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16 mb-1" />
            ) : (
              <div className="text-2xl font-bold">{analytics.totalItems}</div>
            )}
            <p className="text-xs text-muted-foreground">Items in inventory</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16 mb-1" />
            ) : (
              <div className="text-2xl font-bold">{analytics.lowStockItems}</div>
            )}
            <p className="text-xs text-muted-foreground">Below threshold</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16 mb-1" />
            ) : (
              <div className="text-2xl font-bold">{analytics.activeUsers}</div>
            )}
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Movements</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16 mb-1" />
            ) : (
              <div className="text-2xl font-bold">{analytics.stockMovements}</div>
            )}
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Category Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <Skeleton className="h-32 w-32 rounded-full" />
                </div>
              ) : analytics.categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      dataKey="value"
                      data={analytics.categoryData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {analytics.categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  {loading ? "Loading..." : "No data available"}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChart className="h-5 w-5" />
              Movement Trends (Last 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {loading ? (
                <div className="space-y-2 p-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              ) : analytics.movementTrends.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsLineChart data={analytics.movementTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="in" stroke="#10b981" name="Stock In" />
                    <Line type="monotone" dataKey="out" stroke="#ef4444" name="Stock Out" />
                  </RechartsLineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  {loading ? "Loading..." : "No movement data available"}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Analytics */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Active Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analytics.topItems.length > 0 ? (
                analytics.topItems.map((item, index) => (
                  <div key={index} className="flex justify-between">
                    <span className="text-sm">{item.name}</span>
                    <span className="text-sm font-medium">{item.movements} moves</span>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground">
                  {loading ? "Loading..." : "No movement data available"}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Category Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analytics.categoryData.length > 0 ? (
                analytics.categoryData.map((category, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="text-sm">{category.name}</span>
                    </div>
                    <span className="text-sm font-medium">{category.value} items</span>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground">
                  {loading ? "Loading..." : "No category data available"}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per-Item Stock Usage Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Item Stock Usage Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ItemStockUsageChart branchId={profile?.branch_id || profile?.branch_context} />
        </CardContent>
      </Card>

      {/* Usage Comparison Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Stock Usage Comparison ({timePeriod.charAt(0).toUpperCase() + timePeriod.slice(1)})
            </div>
            <Select value={timePeriod} onValueChange={setTimePeriod}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-50">
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            {loading ? (
              <div className="space-y-2 p-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ) : analytics.usageComparison.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={analytics.usageComparison}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="period" 
                    tick={{ fontSize: 12 }}
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value) => `Period: ${value}`}
                    formatter={(value) => [`${value}`, 'Usage']}
                  />
                  <Bar 
                    dataKey="usage" 
                    fill="hsl(var(--primary))" 
                    name="Stock Usage"
                    radius={[4, 4, 0, 0]}
                  />
                </RechartsBarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                {loading ? "Loading..." : "No usage data available"}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Analytics;