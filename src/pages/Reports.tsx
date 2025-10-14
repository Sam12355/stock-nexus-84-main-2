import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  const [softDrinksReport, setSoftDrinksReport] = useState<any[]>([]);
  const [softDrinksSummary, setSoftDrinksSummary] = useState<any>(null);
  const [selectedReport, setSelectedReport] = useState('stock');
  const [loadingStock, setLoadingStock] = useState(false);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [loadingSoftDrinks, setLoadingSoftDrinks] = useState(false);
  const [stockLoaded, setStockLoaded] = useState(false);
  const [movementsLoaded, setMovementsLoaded] = useState(false);
  const [softDrinksLoaded, setSoftDrinksLoaded] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedWeeks, setSelectedWeeks] = useState(4);

  const fetchReportData = useCallback(async () => {
    if (!profile) return;
    // Set loading only when first loading that report type
    if (selectedReport === 'stock') {
      if (!stockLoaded) setLoadingStock(true);
    } else if (selectedReport === 'movements') {
      if (!movementsLoaded) setLoadingMovements(true);
    } else if (selectedReport === 'softdrinks') {
      if (!softDrinksLoaded) setLoadingSoftDrinks(true);
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
      } else if (selectedReport === 'softdrinks') {
        const response = await apiClient.getSoftDrinksWeeklyReport(selectedWeeks);
        setSoftDrinksReport(response.data || []);
        setSoftDrinksSummary(response.summary || null);
        setSoftDrinksLoaded(true);
      }
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      if (selectedReport === 'stock') setLoadingStock(false);
      else if (selectedReport === 'movements') setLoadingMovements(false);
      else if (selectedReport === 'softdrinks') setLoadingSoftDrinks(false);
    }
  }, [profile, selectedReport, selectedWeeks]);

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
      console.log('Exporting PDF for report:', selectedReport);
      console.log('Soft drinks data:', { softDrinksReport, softDrinksSummary, softDrinksLoaded });
      
      const doc = new jsPDF();
      const currentDate = new Date().toLocaleDateString();
      
      // Add title
      doc.setFontSize(20);
      let reportTitle = '';
      if (selectedReport === 'stock') {
        reportTitle = 'Stock Report';
      } else if (selectedReport === 'movements') {
        reportTitle = 'Stock Movement Report';
      } else if (selectedReport === 'softdrinks') {
        reportTitle = 'Soft Drinks Weekly Comparison Report';
      }
      doc.text(reportTitle, 14, 22);
      
      // Add date and filter info
      doc.setFontSize(10);
      doc.text(`Generated on: ${currentDate}`, 14, 30);
      if (selectedReport === 'movements') {
        doc.text(`Filtered by: ${format(selectedMonth, 'MMMM yyyy')}`, 14, 37);
      } else if (selectedReport === 'softdrinks') {
        doc.text(`Analysis Period: Last ${selectedWeeks} weeks`, 14, 37);
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
      } else if (selectedReport === 'movements') {
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
      } else if (selectedReport === 'softdrinks') {
        // Soft drinks report table
        const tableData: any[] = [];
        
        // Check if we have data
        if (!softDrinksReport || softDrinksReport.length === 0) {
          alert('No soft drinks data available. Please ensure the report is loaded.');
          return;
        }
        
        // Add summary data
        if (softDrinksSummary) {
          tableData.push(['SUMMARY', '', '', '', '']);
          tableData.push(['Total Weeks', softDrinksSummary.total_weeks.toString(), '', '', '']);
          tableData.push(['Total Stock In', softDrinksSummary.total_stock_in.toString(), '', '', '']);
          tableData.push(['Total Stock Out', softDrinksSummary.total_stock_out.toString(), '', '', '']);
          tableData.push(['Net Change', softDrinksSummary.total_net_change.toString(), '', '', '']);
          tableData.push(['', '', '', '', '']); // Empty row
        }
        
        // Add weekly data
        softDrinksReport.forEach((week, index) => {
          tableData.push([`Week ${index + 1}`, '', '', '', '']);
          tableData.push(['Week Start', new Date(week.week_start).toLocaleDateString(), '', '', '']);
          tableData.push(['Week End', new Date(week.week_end).toLocaleDateString(), '', '', '']);
          tableData.push(['Total Stock In', week.total_stock_in.toString(), '', '', '']);
          tableData.push(['Total Stock Out', week.total_stock_out.toString(), '', '', '']);
          tableData.push(['Net Change', week.total_net_change.toString(), '', '', '']);
          tableData.push(['Trend', week.overall_trend.toUpperCase(), '', '', '']);
          tableData.push(['', '', '', '', '']); // Empty row
          
          // Add item details
          week.items.forEach(item => {
            tableData.push([`  ${item.item_name}`, `In: ${item.stock_in}`, `Out: ${item.stock_out}`, `Net: ${item.net_change}`, item.trend.toUpperCase()]);
          });
          tableData.push(['', '', '', '', '']); // Empty row
        });
        
        autoTable(doc, {
          head: [['Item/Week', 'Stock In', 'Stock Out', 'Net Change', 'Trend']],
          body: tableData,
          startY: 47,
          styles: {
            fontSize: 9,
            cellPadding: 2,
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
            0: { cellWidth: 50 },
            1: { cellWidth: 25 },
            2: { cellWidth: 25 },
            3: { cellWidth: 25 },
            4: { cellWidth: 20 },
          },
        });
      }
      
      let fileName = '';
      if (selectedReport === 'stock') {
        fileName = 'stock-report';
      } else if (selectedReport === 'movements') {
        fileName = 'movement-report';
      } else if (selectedReport === 'softdrinks') {
        fileName = 'softdrinks-weekly-report';
      }
      
      doc.save(`${fileName}-${currentDate.replace(/\//g, '-')}.pdf`);
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
      } else if (selectedReport === 'movements') {
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
      } else if (selectedReport === 'softdrinks') {
        // Check if we have data
        if (!softDrinksReport || softDrinksReport.length === 0) {
          alert('No soft drinks data available. Please ensure the report is loaded.');
          return;
        }
        
        worksheetData = [
          ['Week', 'Item', 'Stock In', 'Stock Out', 'Net Change', 'Trend', 'Week Start', 'Week End']
        ];
        
        // Add summary row
        if (softDrinksSummary) {
          worksheetData.push(['SUMMARY', 'TOTAL', softDrinksSummary.total_stock_in, softDrinksSummary.total_stock_out, softDrinksSummary.total_net_change, '', '', '']);
        }
        
        // Add weekly data
        softDrinksReport.forEach((week, weekIndex) => {
          week.items.forEach(item => {
            worksheetData.push([
              `Week ${weekIndex + 1}`,
              item.item_name,
              item.stock_in,
              item.stock_out,
              item.net_change,
              item.trend.toUpperCase(),
              new Date(week.week_start).toLocaleDateString(),
              new Date(week.week_end).toLocaleDateString()
            ]);
          });
        });
        
        fileName = `softdrinks-weekly-report-${selectedWeeks}weeks.xlsx`;
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
    } else if (selectedReport === 'softdrinks') {
      // Check if we have data
      if (!softDrinksReport || softDrinksReport.length === 0) {
        alert('No soft drinks data available. Please ensure the report is loaded.');
        return;
      }
      
      csvData = 'Week,Item,Stock In,Stock Out,Net Change,Trend,Week Start,Week End\n';
      
      // Add summary row
      if (softDrinksSummary) {
        csvData += `"SUMMARY","TOTAL",${softDrinksSummary.total_stock_in},${softDrinksSummary.total_stock_out},${softDrinksSummary.total_net_change},"","",""\n`;
      }
      
      // Add weekly data
      softDrinksReport.forEach((week, weekIndex) => {
        week.items.forEach(item => {
          csvData += `"Week ${weekIndex + 1}","${item.item_name}",${item.stock_in},${item.stock_out},${item.net_change},"${item.trend.toUpperCase()}","${new Date(week.week_start).toLocaleDateString()}","${new Date(week.week_end).toLocaleDateString()}"\n`;
        });
      });
      
      fileName = `softdrinks-weekly-report-${selectedWeeks}weeks.csv`;
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
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Reports</h1>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <Select value={selectedReport} onValueChange={setSelectedReport}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Select report type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="stock">Stock Levels Report</SelectItem>
            <SelectItem value="movements">Stock Movements Report</SelectItem>
            <SelectItem value="softdrinks">Soft Drinks Weekly Comparison</SelectItem>
          </SelectContent>
        </Select>
        
        {selectedReport === 'movements' && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
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
        
        {selectedReport === 'softdrinks' && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <Label className="text-sm font-medium">
              <Filter className="h-4 w-4 mr-1 inline" />
              Weeks to analyze:
            </Label>
            <Select value={selectedWeeks.toString()} onValueChange={(value) => setSelectedWeeks(parseInt(value))}>
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2">2 weeks</SelectItem>
                <SelectItem value="4">4 weeks</SelectItem>
                <SelectItem value="8">8 weeks</SelectItem>
                <SelectItem value="12">12 weeks</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {selectedReport === 'stock' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Current Stock Levels
              </CardTitle>
              <div className="flex gap-2">
                <Button 
                  onClick={exportToPDF} 
                  disabled={loadingStock && !stockLoaded}
                  variant="outline"
                  size="sm"
                >
                  <File className="h-4 w-4 mr-2" />
                  PDF
                </Button>
                <Button 
                  onClick={exportToExcel} 
                  disabled={loadingStock && !stockLoaded}
                  variant="outline"
                  size="sm"
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Excel
                </Button>
                <Button 
                  onClick={exportToCSV} 
                  disabled={loadingStock && !stockLoaded}
                  variant="outline"
                  size="sm"
                >
                  <Download className="h-4 w-4 mr-2" />
                  CSV
                </Button>
              </div>
            </div>
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
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <TrendingUp className="h-5 w-5 text-secondary-foreground" />
                Stock Movement History Report
              </CardTitle>
              <div className="flex gap-2">
                <Button 
                  onClick={exportToPDF} 
                  disabled={loadingMovements && !movementsLoaded}
                  variant="outline"
                  size="sm"
                >
                  <File className="h-4 w-4 mr-2" />
                  PDF
                </Button>
                <Button 
                  onClick={exportToExcel} 
                  disabled={loadingMovements && !movementsLoaded}
                  variant="outline"
                  size="sm"
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Excel
                </Button>
                <Button 
                  onClick={exportToCSV} 
                  disabled={loadingMovements && !movementsLoaded}
                  variant="outline"
                  size="sm"
                >
                  <Download className="h-4 w-4 mr-2" />
                  CSV
                </Button>
              </div>
            </div>
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

      {selectedReport === 'softdrinks' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Soft Drinks Weekly Comparison Report
                </CardTitle>
                <CardDescription>
                  Compare stock-in vs stock-out for soft drinks over the last {selectedWeeks} weeks
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={exportToPDF} 
                  disabled={loadingSoftDrinks && !softDrinksLoaded}
                  variant="outline"
                  size="sm"
                >
                  <File className="h-4 w-4 mr-2" />
                  PDF
                </Button>
                <Button 
                  onClick={exportToExcel} 
                  disabled={loadingSoftDrinks && !softDrinksLoaded}
                  variant="outline"
                  size="sm"
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Excel
                </Button>
                <Button 
                  onClick={exportToCSV} 
                  disabled={loadingSoftDrinks && !softDrinksLoaded}
                  variant="outline"
                  size="sm"
                >
                  <Download className="h-4 w-4 mr-2" />
                  CSV
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingSoftDrinks ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-2">Loading soft drinks report...</span>
              </div>
            ) : softDrinksReport.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No soft drinks data found for the selected period.
              </div>
            ) : (
              <div className="space-y-6">
                {/* Summary Cards */}
                {softDrinksSummary && (
                  <div className="space-y-4 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <Card className="p-4">
                        <div className="text-sm text-muted-foreground">Total Weeks</div>
                        <div className="text-2xl font-bold">{softDrinksSummary.total_weeks}</div>
                      </Card>
                      <Card className="p-4">
                        <div className="text-sm text-muted-foreground">Total Stock In</div>
                        <div className="text-2xl font-bold text-green-600">{softDrinksSummary.total_stock_in}</div>
                      </Card>
                      <Card className="p-4">
                        <div className="text-sm text-muted-foreground">Total Stock Out</div>
                        <div className="text-2xl font-bold text-red-600">{softDrinksSummary.total_stock_out}</div>
                      </Card>
                      <Card className="p-4">
                        <div className="text-sm text-muted-foreground">Net Change</div>
                        <div className={`text-2xl font-bold ${
                          softDrinksSummary.total_net_change > 0 ? 'text-green-600' : 
                          softDrinksSummary.total_net_change < 0 ? 'text-red-600' : 'text-gray-600'
                        }`}>
                          {softDrinksSummary.total_net_change > 0 ? '+' : ''}{softDrinksSummary.total_net_change}
                        </div>
                      </Card>
                    </div>
                    
                    {/* Overall Analysis */}
                    <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                      <div className="flex items-start gap-3">
                        <div className="text-blue-600 mt-1">🎯</div>
                        <div>
                          <h4 className="font-semibold text-blue-900 mb-2">Overall Analysis & Strategic Recommendations</h4>
                          <div className="text-blue-800 text-sm space-y-2">
                            {softDrinksSummary.total_net_change > 0 ? (
                              <div>
                                <p><strong>📈 Positive Trend:</strong> Your soft drinks inventory is growing over the selected period.</p>
                                <p><strong>💡 Recommendation:</strong> Consider maintaining current ordering patterns. If stock continues accumulating, you might want to slightly reduce order quantities to optimize storage space and cash flow.</p>
                              </div>
                            ) : softDrinksSummary.total_net_change < 0 ? (
                              <div>
                                <p><strong>📉 Declining Trend:</strong> You're consuming soft drinks faster than restocking.</p>
                                <p><strong>⚠️ Action Required:</strong> Increase order quantities or frequency to prevent stockouts. Consider ordering 20-30% more to build safety stock.</p>
                              </div>
                            ) : (
                              <div>
                                <p><strong>➡️ Stable Trend:</strong> Your inventory levels are well-balanced.</p>
                                <p><strong>✅ Recommendation:</strong> Current ordering practices are working well. Continue with existing patterns and monitor for any seasonal changes.</p>
                              </div>
                            )}
                            <p className="text-xs text-blue-600 mt-2">
                              <strong>Pro Tip:</strong> Review individual item trends below for specific ordering adjustments.
                            </p>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>
                )}

                {/* Weekly Breakdown */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Weekly Breakdown</h3>
                  {softDrinksReport.map((week, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="font-semibold">
                            Week of {new Date(week.week_start).toLocaleDateString()} - {new Date(week.week_end).toLocaleDateString()}
                          </h4>
                          <div className="flex gap-4 mt-2">
                            <Badge className={`${
                              week.overall_trend === 'positive' ? 'bg-green-100 text-green-800' :
                              week.overall_trend === 'negative' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {week.overall_trend === 'positive' ? '📈 Stock Growing' :
                               week.overall_trend === 'negative' ? '📉 Stock Declining' :
                               '➡️ Stock Stable'}
                            </Badge>
                            <Badge variant="outline">
                              Net: {week.total_net_change > 0 ? '+' : ''}{week.total_net_change}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">Weekly Totals</div>
                          <div className="text-lg font-semibold">
                            <span className="text-green-600">In: {week.total_stock_in}</span> | 
                            <span className="text-red-600"> Out: {week.total_stock_out}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Weekly Advice */}
                      {week.advice && (
                        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-start gap-2">
                            <div className="text-blue-600 mt-0.5">💡</div>
                            <div>
                              <h5 className="font-medium text-blue-900 mb-1">Weekly Analysis & Recommendations</h5>
                              <p className="text-blue-800 text-sm">{week.advice}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Items in this week */}
                      {week.items.length > 0 && (
                        <div className="space-y-3">
                          <h5 className="font-medium text-gray-700">Item Details & Recommendations:</h5>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b">
                                  <th className="text-left p-2 font-medium">Item</th>
                                  <th className="text-right p-2 font-medium">Stock In</th>
                                  <th className="text-right p-2 font-medium">Stock Out</th>
                                  <th className="text-right p-2 font-medium">Net Change</th>
                                  <th className="text-center p-2 font-medium">Trend</th>
                                  <th className="text-left p-2 font-medium">Recommendation</th>
                                </tr>
                              </thead>
                              <tbody>
                                {week.items.map((item, itemIndex) => (
                                  <tr key={itemIndex} className="border-b hover:bg-muted/50">
                                    <td className="p-2 font-medium">{item.item_name}</td>
                                    <td className="p-2 text-right text-green-600">{item.stock_in}</td>
                                    <td className="p-2 text-right text-red-600">{item.stock_out}</td>
                                    <td className={`p-2 text-right font-semibold ${
                                      item.net_change > 0 ? 'text-green-600' :
                                      item.net_change < 0 ? 'text-red-600' : 'text-gray-600'
                                    }`}>
                                      {item.net_change > 0 ? '+' : ''}{item.net_change}
                                    </td>
                                    <td className="p-2 text-center">
                                      {item.trend === 'positive' ? '📈' :
                                       item.trend === 'negative' ? '📉' : '➡️'}
                                    </td>
                                    <td className="p-2 text-xs text-gray-600">
                                      {item.trend === 'positive' ? '✅ Maintain current ordering' :
                                       item.trend === 'negative' ? '⚠️ Increase order quantity' : 
                                       '➡️ Current ordering adequate'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Reports;