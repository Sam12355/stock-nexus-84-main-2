import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, Calendar, TrendingUp, Package, AlertTriangle } from "lucide-react";
import { apiClient } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface StockReport {
  id: string;
  name: string;
  category: string;
  current_quantity: number;
  threshold_level: number;
  status: 'critical' | 'low' | 'adequate';
}

interface MovementReport {
  id: string;
  item_name: string;
  movement_type: string;
  quantity: number;
  created_at: string;
  updated_by_name: string;
}

const Reports = () => {
  const { profile } = useAuth();
  const [stockReport, setStockReport] = useState<StockReport[]>([]);
  const [movementReport, setMovementReport] = useState<MovementReport[]>([]);
  const [selectedReport, setSelectedReport] = useState('stock');
  const [loadingStock, setLoadingStock] = useState(false);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [stockLoaded, setStockLoaded] = useState(false);
  const [movementsLoaded, setMovementsLoaded] = useState(false);

  const fetchReportData = useCallback(async () => {
    if (!profile) return;
    // Set loading only when first loading that report type
    if (selectedReport === 'stock') {
      if (!stockLoaded) setLoadingStock(true);
    } else {
      if (!movementsLoaded) setLoadingMovements(true);
    }

    try {
      const branchId = profile.branch_id || profile.branch_context;

      if (selectedReport === 'stock') {
        const data = await apiClient.getStockReport();
        setStockReport(data || []);
        setStockLoaded(true);
      } else if (selectedReport === 'movements') {
        const data = await apiClient.getMovementsReport();
        setMovementReport(data || []);
        setMovementsLoaded(true);
      }
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      if (selectedReport === 'stock') setLoadingStock(false);
      else setLoadingMovements(false);
    }
  }, [profile, selectedReport]);

  useEffect(() => {
    if (profile) {
      fetchReportData();
    }
  }, [profile, fetchReportData]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'critical':
        return <Badge variant="destructive">Critical</Badge>;
      case 'low':
        return <Badge variant="secondary">Low</Badge>;
      case 'adequate':
        return <Badge variant="default">Adequate</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const exportReport = () => {
    // Create CSV data based on selected report
    let csvData = '';
    let fileName = '';

    if (selectedReport === 'stock') {
      csvData = 'Item Name,Category,Current Stock,Threshold,Status\n';
      csvData += stockReport.map(item => 
        `"${item.name}","${item.category}",${item.current_quantity},${item.threshold_level},"${item.status}"`
      ).join('\n');
      fileName = 'stock-report.csv';
    } else if (selectedReport === 'movements') {
      csvData = 'Date,Item,Movement Type,Quantity,Updated By\n';
      csvData += movementReport.map(movement => 
        `"${new Date(movement.created_at).toLocaleDateString()}","${movement.item_name}","${movement.movement_type}",${movement.quantity},"${movement.updated_by_name}"`
      ).join('\n');
      fileName = 'movement-report.csv';
    }

    // Download CSV
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <Button onClick={exportReport} disabled={selectedReport === 'stock' ? (loadingStock && !stockLoaded) : (loadingMovements && !movementsLoaded)}>
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>
      
      <div className="flex gap-4 mb-6">
        <Select value={selectedReport} onValueChange={setSelectedReport}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select report type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="stock">Stock Levels Report</SelectItem>
            <SelectItem value="movements">Stock Movements Report</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {selectedReport === 'stock' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Current Stock Levels
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(loadingStock && !stockLoaded) ? (
              <div className="space-y-3">
                <div className="flex gap-4 border-b pb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                </div>
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex gap-4">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            ) : stockReport.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No stock data found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b-2 border-primary/20 bg-muted/30">
                      <th className="text-left p-3 font-semibold">Item Name</th>
                      <th className="text-left p-3 font-semibold">Category</th>
                      <th className="text-left p-3 font-semibold">Current Stock</th>
                      <th className="text-left p-3 font-semibold">Threshold</th>
                      <th className="text-left p-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockReport.map((item) => (
                      <tr key={item.id} className="border-b hover:bg-muted/50 transition-colors">
                        <td className="p-3 font-medium text-foreground">{item.name}</td>
                        <td className="p-3 capitalize text-muted-foreground">{item.category.replace(/_/g, ' ')}</td>
                        <td className="p-3 font-semibold">{item.current_quantity}</td>
                        <td className="p-3">{item.threshold_level}</td>
                        <td className="p-3">{getStatusBadge(item.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {selectedReport === 'movements' && (
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-secondary/10 to-secondary/5">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <TrendingUp className="h-5 w-5 text-secondary-foreground" />
              Stock Movement History Report
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(loadingMovements && !movementsLoaded) ? (
              <div className="space-y-3">
                <div className="flex gap-4 border-b pb-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20" />
                </div>
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex gap-4">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </div>
            ) : movementReport.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No movement data found</div>
            ) : (
              <div className="overflow-x-auto">
                <div className="mb-4 flex flex-wrap gap-2">
                  <Badge variant="outline">Total In: {movementReport.filter(m => m.movement_type === 'in').reduce((a, b) => a + b.quantity, 0)}</Badge>
                  <Badge variant="outline">Total Out: {movementReport.filter(m => m.movement_type === 'out').reduce((a, b) => a + b.quantity, 0)}</Badge>
                  <Badge variant="secondary">Net: {movementReport.filter(m => m.movement_type === 'in').reduce((a, b) => a + b.quantity, 0) - movementReport.filter(m => m.movement_type === 'out').reduce((a, b) => a + b.quantity, 0)}</Badge>
                </div>
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b-2 border-primary/20 bg-muted/30">
                      <th className="text-left p-3 font-semibold">Date</th>
                      <th className="text-left p-3 font-semibold">Item</th>
                      <th className="text-left p-3 font-semibold">Type</th>
                      <th className="text-left p-3 font-semibold">Quantity</th>
                      <th className="text-left p-3 font-semibold">Updated By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movementReport.map((movement) => (
                      <tr key={movement.id} className="border-b hover:bg-muted/50 transition-colors">
                        <td className="p-3 text-muted-foreground">
                          {new Date(movement.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-3 font-medium text-foreground">{movement.item_name}</td>
                        <td className="p-3">
                          <Badge variant={movement.movement_type === 'in' ? 'default' : 'secondary'}>
                            {movement.movement_type === 'in' ? 'Stock In' : 'Stock Out'}
                          </Badge>
                        </td>
                        <td className="p-3 font-semibold">{movement.quantity}</td>
                        <td className="p-3 text-muted-foreground">{movement.updated_by_name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Reports;