import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, TrendingUp, Package, AlertTriangle, FileSpreadsheet, File, Filter, CalendarIcon, ChevronDown } from "lucide-react";
import { apiClient } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
// Removed DatePicker imports - using custom dropdown instead

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
  user_name: string;
}

// Custom Month/Year Selector Component
const MonthYearSelector = ({ selectedMonth, onMonthChange }: { selectedMonth: Date; onMonthChange: (date: Date) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (isOpen && !target.closest('.month-year-selector')) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);
  
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  
  const selectedYear = selectedMonth.getFullYear();
  const selectedMonthIndex = selectedMonth.getMonth();

  const handleMonthSelect = (year: number, monthIndex: number) => {
    const newDate = new Date(year, monthIndex, 1);
    onMonthChange(newDate);
    setIsOpen(false);
  };

  const isDisabled = (year: number, monthIndex: number) => {
    if (year > currentYear) return true;
    if (year === currentYear && monthIndex > currentMonth) return true;
    return false;
  };

  return (
    <div className="relative month-year-selector">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-56 h-12 px-4 py-3 border-2 border-gray-200 rounded-xl shadow-lg focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 bg-gradient-to-r from-white to-gray-50 text-gray-800 text-base font-medium transition-all duration-300 hover:shadow-xl hover:border-indigo-300 flex items-center justify-between"
      >
        <span className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-indigo-500" />
          {format(selectedMonth, 'MMMM yyyy')}
        </span>
        <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
          <div className="p-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Year Selector */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Year</h3>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {years.map((year) => (
                    <button
                      key={year}
                      onClick={() => handleMonthSelect(year, selectedMonthIndex)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        year === selectedYear
                          ? 'bg-indigo-500 text-white shadow-md'
                          : 'text-gray-700 hover:bg-indigo-50 hover:text-indigo-700'
                      }`}
                    >
                      {year}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Month Selector */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Month</h3>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {months.map((month, index) => {
                    const disabled = isDisabled(selectedYear, index);
                    return (
                      <button
                        key={index}
                        onClick={() => !disabled && handleMonthSelect(selectedYear, index)}
                        disabled={disabled}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                          index === selectedMonthIndex && !disabled
                            ? 'bg-indigo-500 text-white shadow-md'
                            : disabled
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'text-gray-700 hover:bg-indigo-50 hover:text-indigo-700'
                        }`}
                      >
                        {month}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Reports = () => {
  const { profile } = useAuth();
  const [stockReport, setStockReport] = useState<StockReport[]>([]);
  const [movementReport, setMovementReport] = useState<MovementReport[]>([]);
  const [selectedReport, setSelectedReport] = useState('stock');
  const [loadingStock, setLoadingStock] = useState(false);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [stockLoaded, setStockLoaded] = useState(false);
  const [movementsLoaded, setMovementsLoaded] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

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
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Adequate</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getMovementBadge = (movementType: string) => {
    if (movementType === 'in') {
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Stock In</Badge>;
    } else {
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Stock Out</Badge>;
    }
  };

  const filteredMovementReport = movementReport.filter(movement => {
    const movementDate = new Date(movement.created_at);
    return movementDate.getFullYear() === selectedMonth.getFullYear() && 
           movementDate.getMonth() === selectedMonth.getMonth();
  });

  const exportToPDF = () => {
    try {
      const doc = new jsPDF();
      const currentDate = new Date().toLocaleDateString();
      
      // Add title
      doc.setFontSize(20);
      doc.text(`${selectedReport === 'stock' ? 'Stock' : 'Stock Movement'} Report`, 14, 22);
      
      // Add date and month filter info
      doc.setFontSize(10);
      doc.text(`Generated on: ${currentDate}`, 14, 30);
      if (selectedReport === 'movements') {
        doc.text(`Filtered by: ${format(selectedMonth, 'MMMM yyyy')}`, 14, 37);
      }
      
      if (selectedReport === 'stock') {
        // Stock report table
        const tableData = stockReport.map(item => [
          item.name,
          categoryLabels[item.category as keyof typeof categoryLabels] || item.category,
          item.current_quantity.toString(),
          item.threshold_level.toString(),
          item.status.toUpperCase()
        ]);
        
        autoTable(doc, {
          head: [['Item Name', 'Category', 'Current Stock', 'Threshold', 'Status']],
          body: tableData,
          startY: selectedReport === 'movements' ? 47 : 40,
          styles: {
            fontSize: 10,
            cellPadding: 3,
          },
          headStyles: {
            fillColor: [41, 128, 185],
            textColor: 255,
            fontStyle: 'bold',
          },
          alternateRowStyles: {
            fillColor: [245, 245, 245],
          },
          columnStyles: {
            0: { cellWidth: 40 },
            1: { cellWidth: 25 },
            2: { cellWidth: 20 },
            3: { cellWidth: 20 },
            4: { cellWidth: 20 },
          },
        });
      } else {
        // Movement report table - use filtered data
        const tableData = filteredMovementReport.map(movement => [
          new Date(movement.created_at).toLocaleDateString(),
          movement.item_name,
          movement.movement_type === 'in' ? 'Stock In' : 'Stock Out',
          movement.quantity.toString(),
          movement.user_name || 'Unknown'
        ]);
        
        autoTable(doc, {
          head: [['Date', 'Item', 'Type', 'Quantity', 'Updated By']],
          body: tableData,
          startY: 47,
          styles: {
            fontSize: 10,
            cellPadding: 3,
          },
          headStyles: {
            fillColor: [41, 128, 185],
            textColor: 255,
            fontStyle: 'bold',
          },
          alternateRowStyles: {
            fillColor: [245, 245, 245],
          },
          columnStyles: {
            0: { cellWidth: 25 },
            1: { cellWidth: 40 },
            2: { cellWidth: 20 },
            3: { cellWidth: 15 },
            4: { cellWidth: 25 },
          },
        });
      }
      
      doc.save(`${selectedReport === 'stock' ? 'stock' : 'movement'}-report-${currentDate.replace(/\//g, '-')}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    }
  };

  const exportToExcel = () => {
    try {
      let worksheetData: any[][] = [];
      let fileName = '';
      
      if (selectedReport === 'stock') {
        worksheetData = [
          ['Item Name', 'Category', 'Current Stock', 'Threshold', 'Status'],
          ...stockReport.map(item => [
            item.name,
            categoryLabels[item.category as keyof typeof categoryLabels] || item.category,
            item.current_quantity,
            item.threshold_level,
            item.status.toUpperCase()
          ])
        ];
        fileName = 'stock-report.xlsx';
      } else {
        worksheetData = [
          ['Date', 'Item', 'Type', 'Quantity', 'Updated By'],
          ...filteredMovementReport.map(movement => [
            new Date(movement.created_at).toLocaleDateString(),
            movement.item_name,
            movement.movement_type === 'in' ? 'Stock In' : 'Stock Out',
            movement.quantity,
            movement.user_name || 'Unknown'
          ])
        ];
        fileName = `movement-report-${format(selectedMonth, 'yyyy-MM')}.xlsx`;
      }
    
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
      
      // Add styling
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          if (!worksheet[cellAddress]) continue;
          
          if (R === 0) {
            // Header row
            worksheet[cellAddress].s = {
              font: { bold: true, color: { rgb: "FFFFFF" } },
              fill: { fgColor: { rgb: "2980B9" } },
              alignment: { horizontal: "center" }
            };
          } else {
            // Data rows
            worksheet[cellAddress].s = {
              alignment: { horizontal: "left" }
            };
          }
        }
      }
      
      XLSX.writeFile(workbook, fileName);
    } catch (error) {
      console.error('Error generating Excel:', error);
      alert('Error generating Excel file. Please try again.');
    }
  };

  const exportToCSV = () => {
    try {
    // Create CSV data based on selected report
    let csvData = '';
    let fileName = '';

    if (selectedReport === 'stock') {
      csvData = 'Item Name,Category,Current Stock,Threshold,Status\n';
      csvData += stockReport.map(item => 
        `"${item.name}","${categoryLabels[item.category as keyof typeof categoryLabels] || item.category}",${item.current_quantity},${item.threshold_level},"${item.status}"`
      ).join('\n');
      fileName = 'stock-report.csv';
    } else if (selectedReport === 'movements') {
      csvData = 'Date,Item,Movement Type,Quantity,Updated By\n';
        csvData += filteredMovementReport.map(movement => 
          `"${new Date(movement.created_at).toLocaleDateString()}","${movement.item_name}","${movement.movement_type}",${movement.quantity},"${movement.user_name || 'Unknown'}"`
      ).join('\n');
        fileName = `movement-report-${format(selectedMonth, 'yyyy-MM')}.csv`;
    }

    // Download CSV
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating CSV:', error);
      alert('Error generating CSV file. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <div className="flex gap-2">
          <Button 
            onClick={exportToPDF} 
            disabled={selectedReport === 'stock' ? (loadingStock && !stockLoaded) : (loadingMovements && !movementsLoaded)}
            variant="outline"
          >
            <File className="h-4 w-4 mr-2" />
            PDF
          </Button>
          <Button 
            onClick={exportToExcel} 
            disabled={selectedReport === 'stock' ? (loadingStock && !stockLoaded) : (loadingMovements && !movementsLoaded)}
            variant="outline"
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Excel
          </Button>
          <Button 
            onClick={exportToCSV} 
            disabled={selectedReport === 'stock' ? (loadingStock && !stockLoaded) : (loadingMovements && !movementsLoaded)}
            variant="outline"
          >
          <Download className="h-4 w-4 mr-2" />
            CSV
        </Button>
        </div>
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
        
        {selectedReport === 'movements' && (
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium">
              <Filter className="h-4 w-4 mr-1 inline" />
              Filter by Month:
            </Label>
            <MonthYearSelector 
              selectedMonth={selectedMonth} 
              onMonthChange={setSelectedMonth} 
            />
          </div>
        )}
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
                        <td className="p-3 text-muted-foreground">{categoryLabels[item.category as keyof typeof categoryLabels] || item.category}</td>
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
            ) : filteredMovementReport.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No movement data found for {format(selectedMonth, 'MMMM yyyy')}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="mb-4 flex flex-wrap gap-2">
                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                    Total In: {filteredMovementReport.filter(m => m.movement_type === 'in').reduce((a, b) => a + b.quantity, 0)}
                  </Badge>
                  <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
                    Total Out: {filteredMovementReport.filter(m => m.movement_type === 'out').reduce((a, b) => a + b.quantity, 0)}
                  </Badge>
                  <Badge variant="secondary">
                    Net: {filteredMovementReport.filter(m => m.movement_type === 'in').reduce((a, b) => a + b.quantity, 0) - filteredMovementReport.filter(m => m.movement_type === 'out').reduce((a, b) => a + b.quantity, 0)}
                  </Badge>
                  <Badge variant="outline">
                    Showing: {format(selectedMonth, 'MMMM yyyy')}
                  </Badge>
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
                    {filteredMovementReport.map((movement) => (
                      <tr key={movement.id} className="border-b hover:bg-muted/50 transition-colors">
                        <td className="p-3 text-muted-foreground">
                          {new Date(movement.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-3 font-medium text-foreground">{movement.item_name}</td>
                        <td className="p-3">
                          {getMovementBadge(movement.movement_type)}
                        </td>
                        <td className="p-3 font-semibold">{movement.quantity}</td>
                        <td className="p-3 text-muted-foreground">{movement.user_name || 'Unknown'}</td>
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