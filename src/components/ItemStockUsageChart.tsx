import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { apiClient } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp } from "lucide-react";

interface ItemStockUsageChartProps {
  branchId?: string;
}

interface ItemOption {
  id: string;
  name: string;
}

interface UsageData {
  period: string;
  usage: number;
}

export const ItemStockUsageChart = ({ branchId }: ItemStockUsageChartProps) => {
  const [items, setItems] = useState<ItemOption[]>([]);
  const [selectedItem, setSelectedItem] = useState<string>("");
  const [timePeriod, setTimePeriod] = useState("daily");
  const [usageData, setUsageData] = useState<UsageData[]>([]);
  const [loading, setLoading] = useState(false);
  const [itemsLoaded, setItemsLoaded] = useState(false);

  const fetchItems = useCallback(async () => {
    if (!branchId || itemsLoaded) return;
    
    try {
      const data = await apiClient.getItems();
      const branchItems = data?.filter(item => item.branch_id === branchId) || [];
      setItems(branchItems.map(item => ({ id: item.id, name: item.name })));
      setItemsLoaded(true);
    } catch (error) {
      console.error('Error fetching items:', error);
    }
  }, [branchId, itemsLoaded]);

  const generateChart = useCallback(async () => {
    if (!selectedItem || !branchId) return;
    
    setLoading(true);
    try {
      // Use the API client to get item usage analytics for the specific item
      const data = await apiClient.getItemUsageAnalytics(timePeriod, selectedItem);
      
      // The API already returns the data in the correct format
      setUsageData(data || []);
    } catch (error) {
      console.error('Error fetching usage data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedItem, branchId, timePeriod]);

  // Load items when component mounts
  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-end">
        <div className="flex-1">
          <label className="text-sm font-medium mb-2 block">Select Item</label>
          <Select value={selectedItem} onValueChange={setSelectedItem} onOpenChange={() => fetchItems()}>
            <SelectTrigger>
              <SelectValue placeholder="Choose an item..." />
            </SelectTrigger>
            <SelectContent>
              {items.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <label className="text-sm font-medium mb-2 block">Time Period</label>
          <Select value={timePeriod} onValueChange={setTimePeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Button 
          onClick={generateChart} 
          disabled={!selectedItem || loading}
          className="mb-0"
        >
          {loading ? "Generating..." : "Generate Chart"}
        </Button>
      </div>

      {usageData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              {items.find(item => item.id === selectedItem)?.name} - Stock Usage ({timePeriod.charAt(0).toUpperCase() + timePeriod.slice(1)})
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
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart data={usageData}>
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
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};