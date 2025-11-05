import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Download, FileSpreadsheet, Printer, Calendar, Plus } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { ICADeliveryModal } from "@/components/ICADeliveryModal";
import { useAuth } from "@/hooks/useAuth";

interface ICADeliveryRecord {
  id: number;
  user_name: string;
  type: string;
  amount: number;
  time_of_day: string;
  submitted_at: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://stock-nexus-84-main-2-1.onrender.com/api';

export function ICADeliveryList() {
  const { toast } = useToast();
  const { profile } = useAuth();
  const [records, setRecords] = useState<ICADeliveryRecord[]>([]);
  const [loading, setLoading] = useState(false); // Changed to false since we don't auto-fetch
  const [showICADeliveryModal, setShowICADeliveryModal] = useState(false);
  
  // Set default date range to first day of month and today
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const [startDate, setStartDate] = useState(firstDayOfMonth.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7; // Changed to 7 records per page

  // Auto-load all records on mount
  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      
      let url = `${API_BASE_URL}/ica-delivery`;
      const params = new URLSearchParams();
      
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setRecords(data);
        setCurrentPage(1); // Reset to first page when fetching new data
      } else {
        throw new Error('Failed to fetch records');
      }
    } catch (error) {
      console.error('Error fetching ICA delivery records:', error);
      toast({
        title: "Error",
        description: "Failed to fetch ICA delivery records",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => {
    fetchRecords();
  };

  const handleClearFilter = () => {
    setStartDate('');
    setEndDate('');
  };

  // Map legacy type names (from older DB entries) to the new display names
  const TYPE_MAP: Record<string, string> = {
    'Normal': 'Salmon and Rolls',
    'Vegan': 'Salmon and Avocado Rolls',
    'Salmon Avocado': 'Vegan Combo',
    'Wakame': 'Goma Wakame'
  };

  const groupedRecords = records.reduce((acc, record) => {
    const key = `${record.user_name}-${record.time_of_day}`;
    if (!acc[key]) {
      acc[key] = {
        userName: record.user_name,
        timeOfDay: record.time_of_day,
        submittedAt: record.submitted_at,
        items: []
      };
    }

    const mappedType = TYPE_MAP[record.type] || record.type;
    acc[key].items.push({ type: mappedType, amount: record.amount });
    return acc;
  }, {} as Record<string, any>);

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    const dateRange = startDate && endDate ? `${startDate} to ${endDate}` : 'All Records';
    doc.text(`ICA Delivery Report - ${dateRange}`, 14, 20);
    
    const tableData = Object.values(groupedRecords).map((group: any) => {
      const itemsStr = group.items.map((item: any) => `${item.type}: ${item.amount}`).join(', ');
      return [
        group.userName,
        group.timeOfDay,
        itemsStr,
        new Date(group.submittedAt).toLocaleString()
      ];
    });

    autoTable(doc, {
      head: [['User', 'Time of the Day', 'Items', 'Submitted At']],
      body: tableData,
      startY: 30,
    });

    doc.save(`ica-delivery-${dateRange.replace(/\s+/g, '-')}.pdf`);
  };

  const exportToExcel = () => {
    const data = Object.values(groupedRecords).flatMap((group: any) => 
      group.items.map((item: any) => ({
        'User Name': group.userName,
        'Time of the Day': group.timeOfDay,
        'Type': item.type,
        'Amount': item.amount,
        'Submitted At': new Date(group.submittedAt).toLocaleString()
      }))
    );

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ICA Delivery");
    const dateRange = startDate && endDate ? `${startDate}-to-${endDate}` : 'all-records';
    XLSX.writeFile(wb, `ica-delivery-${dateRange}.xlsx`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-area, #printable-area * {
            visibility: visible;
          }
          #printable-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
          .print-card {
            break-inside: avoid;
            page-break-inside: avoid;
            margin-bottom: 0.5rem;
            border: 1px solid #ddd;
            padding: 0.5rem;
          }
          .print-table {
            width: 100%;
            border-collapse: collapse;
          }
          .print-table th,
          .print-table td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          .print-table th {
            background-color: #f3f4f6;
            font-weight: bold;
          }
        }
      `}</style>
      <div className="p-6 space-y-6">
      <div className="flex justify-between items-center no-print">
        <h1 className="text-3xl font-bold">ICA Delivery Records</h1>
        <div className="flex gap-2">
          {/* Add ICA Delivery Button - for managers, assistant managers, and staff */}
          {profile && ['manager', 'assistant_manager', 'staff'].includes(profile.role) && (
            <Button 
              onClick={() => setShowICADeliveryModal(true)} 
              className="gap-2 bg-green-600 hover:bg-green-700"
            >
              <Plus className="h-4 w-4" />
              Add ICA Delivery
            </Button>
          )}
          <Button onClick={exportToPDF} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            PDF
          </Button>
          <Button onClick={exportToExcel} variant="outline" className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Excel
          </Button>
          <Button onClick={handlePrint} variant="outline" className="gap-2">
            <Printer className="h-4 w-4" />
            Print
          </Button>
        </div>
      </div>

      <Card className="no-print">
        <CardHeader>
          <div className="flex items-center gap-4">
            <Calendar className="h-5 w-5" />
            <CardTitle>Filter by Date Range</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end flex-wrap">
            <div>
              <label className="text-sm font-medium mb-2 block">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="max-w-xs"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">End Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="max-w-xs"
              />
            </div>
            <Button onClick={handleFilter}>Apply Filter</Button>
            <Button onClick={handleClearFilter} variant="outline">Clear Filter</Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-gray-500">Loading...</p>
          </CardContent>
        </Card>
      ) : Object.keys(groupedRecords).length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-gray-500">No records found</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div id="printable-area">
            {/* Print header - only visible when printing */}
            <div style={{ display: 'none' }} className="print:block mb-4">
              <h1 className="text-2xl font-bold text-center mb-2">ICA Delivery Records</h1>
              <p className="text-center text-gray-600">
                {startDate && endDate ? `${startDate} to ${endDate}` : 'All Records'}
              </p>
            </div>
            
            {/* Print table - only visible when printing */}
            <table className="print-table hidden print:table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time</th>
                  <th>User</th>
                  <th>Period</th>
                  <th>Salmon and Rolls</th>
                  <th>Combo</th>
                  <th>Salmon and Avocado Rolls</th>
                  <th>Vegan Combo</th>
                  <th>Goma Wakame</th>
                </tr>
              </thead>
              <tbody>
                {Object.values(groupedRecords)
                  .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                  .map((group: any, index: number) => (
                  <tr key={index}>
                    <td>{new Date(group.submittedAt).toLocaleDateString()}</td>
                    <td>{new Date(group.submittedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td>{group.userName}</td>
                    <td>{group.timeOfDay}</td>
                    <td>{group.items.find((i: any) => i.type === 'Salmon and Rolls')?.amount || 0}</td>
                    <td>{group.items.find((i: any) => i.type === 'Combo')?.amount || 0}</td>
                    <td>{group.items.find((i: any) => i.type === 'Salmon and Avocado Rolls')?.amount || 0}</td>
                    <td>{group.items.find((i: any) => i.type === 'Vegan Combo')?.amount || 0}</td>
                    <td>{group.items.find((i: any) => i.type === 'Goma Wakame')?.amount || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* Screen view - all records in ONE card (hidden when printing) */}
            <Card className="print:hidden">
              <CardContent className="py-4">
                <div className="space-y-4">
                  {Object.values(groupedRecords)
                    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                    .map((group: any, index: number) => (
                    <div key={index} className={index > 0 ? "border-t pt-4" : ""}>
                      {/* Date, time, name, period - all in same line */}
                      <div className="flex items-baseline gap-3 mb-3">
                        <span className="text-xl font-bold">
                          {new Date(group.submittedAt).toLocaleDateString('en-US', { 
                            weekday: 'short', 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                        <span className="text-sm">
                          {new Date(group.submittedAt).toLocaleTimeString('en-US', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                        <span className="text-base">
                          {group.userName}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {group.timeOfDay}
                        </span>
                      </div>
                      
                      {/* Items in a compact row */}
                      <div className="grid grid-cols-5 gap-2">
                        {['Salmon and Rolls', 'Combo', 'Salmon and Avocado Rolls', 'Vegan Combo', 'Goma Wakame'].map((type) => {
                          const item = group.items.find((i: any) => i.type === type);
                          return (
                            <div key={type} className="border rounded p-2 text-center">
                              <p className="text-xs font-medium text-muted-foreground truncate">{type}</p>
                              <p className="text-xl font-bold">{item ? item.amount : 0}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Pagination */}
          {Object.keys(groupedRecords).length > itemsPerPage && (
            <div className="flex justify-center gap-2 mt-6 no-print">
              <Button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                variant="outline"
              >
                Previous
              </Button>
              <span className="flex items-center px-4">
                Page {currentPage} of {Math.ceil(Object.keys(groupedRecords).length / itemsPerPage)}
              </span>
              <Button
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(Object.keys(groupedRecords).length / itemsPerPage), p + 1))}
                disabled={currentPage >= Math.ceil(Object.keys(groupedRecords).length / itemsPerPage)}
                variant="outline"
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>

    {/* ICA Delivery Modal */}
    <ICADeliveryModal 
      open={showICADeliveryModal} 
      onOpenChange={setShowICADeliveryModal}
      onSuccess={() => {
        // Only refresh when something was actually submitted/updated
        fetchRecords();
      }}
    />
    </>
  );
}
