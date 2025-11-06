import { ICADeliveryModal } from "@/components/ICADeliveryModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Calendar, Download, Edit2, FileSpreadsheet, Loader2, Plus, Printer, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import * as XLSX from "xlsx";

interface ICADeliveryRecord {
  id: number;
  user_name: string;
  type: string;
  amount: number;
  time_of_day: string;
  submitted_at: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://stock-nexus-84-main-2-1.onrender.com/api';

// ICA Delivery List Component with Edit and Delete functionality for managers
export function ICADeliveryList() {
  const { toast } = useToast();
  const { profile } = useAuth();
  const [records, setRecords] = useState<ICADeliveryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [showICADeliveryModal, setShowICADeliveryModal] = useState(false);
  
  // Delete confirmation dialog
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<number[] | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Edit dialog
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [editEntries, setEditEntries] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  
  // Set default date range to first day of month and today
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const [startDate, setStartDate] = useState(firstDayOfMonth.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

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
        setCurrentPage(1);
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

  const TYPE_MAP: Record<string, string> = {
    'Normal': 'Salmon and Rolls',
    'Vegan': 'Salmon and Avocado Rolls',
    'Salmon Avocado': 'Vegan Combo',
    'Wakame': 'Goma Wakame'
  };

  const groupedRecords = records.reduce((acc, record) => {
    const submissionDate = new Date(record.submitted_at).toLocaleDateString();
    const key = `${record.user_name}-${record.time_of_day}-${submissionDate}`;
    if (!acc[key]) {
      acc[key] = {
        userName: record.user_name,
        timeOfDay: record.time_of_day,
        submittedAt: record.submitted_at,
        items: [],
        recordIds: []
      };
    }

    const mappedType = TYPE_MAP[record.type] || record.type;
    acc[key].items.push({ type: mappedType, amount: record.amount, id: record.id });
    acc[key].recordIds.push(record.id);
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

  const handleDeleteClick = (recordIds: number[]) => {
    setRecordToDelete(recordIds);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!recordToDelete || isDeleting) return;

    try {
      setIsDeleting(true);
      const token = localStorage.getItem('auth_token');
      
      for (const id of recordToDelete) {
        const response = await fetch(`${API_BASE_URL}/ica-delivery/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to delete record');
        }
      }

      toast({
        title: "Success",
        description: "ICA delivery record deleted successfully",
      });

      // Update state directly instead of refetching
      setRecords(prevRecords => prevRecords.filter(r => !recordToDelete.includes(r.id)));
      
      setShowDeleteDialog(false);
      setRecordToDelete(null);
    } catch (error) {
      console.error('Error deleting record:', error);
      toast({
        title: "Error",
        description: "Failed to delete ICA delivery record",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditClick = (group: any) => {
    const itemOrder = ['Salmon and Rolls', 'Combo', 'Salmon and Avocado Rolls', 'Vegan Combo', 'Goma Wakame'];
    
    // Sort items according to the defined order
    const sortedItems = itemOrder.map(type => {
      const item = group.items.find((i: any) => i.type === type);
      return item ? {
        id: item.id,
        type: item.type,
        amount: item.amount.toString(),
        timeOfDay: group.timeOfDay
      } : null;
    }).filter(Boolean);
    
    setEditingRecord(group);
    setEditEntries(sortedItems);
    setShowEditDialog(true);
  };

  const handleConfirmEdit = async () => {
    if (isSaving) return;
    
    try {
      setIsSaving(true);
      const token = localStorage.getItem('auth_token');
      
      for (const entry of editEntries) {
        const response = await fetch(`${API_BASE_URL}/ica-delivery/${entry.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ 
            amount: parseInt(entry.amount),
            timeOfDay: entry.timeOfDay 
          })
        });

        if (!response.ok) {
          throw new Error('Failed to update record');
        }
      }

      toast({
        title: "Success",
        description: "ICA delivery record updated successfully",
      });


      // Update state directly instead of refetching
      setRecords(prevRecords => prevRecords.map(r => {
        const editEntry = editEntries.find(e => e.id === r.id);
        if (editEntry) {
          return { ...r, amount: parseInt(editEntry.amount), time_of_day: editEntry.timeOfDay };
        }
        return r;
      }));
      
      setShowEditDialog(false);
      setEditingRecord(null);
    } catch (error) {
      console.error('Error updating record:', error);
      toast({
        title: "Error",
        description: "Failed to update ICA delivery record",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
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
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 no-print">
        <h1 className="text-2xl sm:text-3xl font-bold">ICA Delivery Records</h1>
        <div className="flex gap-2">
          {profile && ['manager', 'assistant_manager', 'staff'].includes(profile.role) && (
            <Button 
              onClick={() => setShowICADeliveryModal(true)} 
              className="gap-2 bg-green-600 hover:bg-green-700 flex-1 sm:flex-initial"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add ICA Delivery</span>
              <span className="sm:hidden">Add</span>
            </Button>
          )}
          <Button onClick={exportToPDF} variant="outline" className="gap-2 flex-1 sm:flex-initial">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">PDF</span>
          </Button>
          <Button onClick={exportToExcel} variant="outline" className="gap-2 flex-1 sm:flex-initial">
            <FileSpreadsheet className="h-4 w-4" />
            <span className="hidden sm:inline">Excel</span>
          </Button>
          <Button onClick={handlePrint} variant="outline" className="gap-2 flex-1 sm:flex-initial">
            <Printer className="h-4 w-4" />
            <span className="hidden sm:inline">Print</span>
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
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-end">
            <div>
              <label className="text-sm font-medium mb-2 block">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full sm:max-w-xs"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">End Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full sm:max-w-xs"
              />
            </div>
            <Button onClick={handleFilter} className="w-full sm:w-auto">Apply Filter</Button>
            <Button onClick={handleClearFilter} variant="outline" className="w-full sm:w-auto">Clear Filter</Button>
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
            <div style={{ display: 'none' }} className="print:block mb-4">
              <h1 className="text-2xl font-bold text-center mb-2">ICA Delivery Records</h1>
              <p className="text-center text-gray-600">
                {startDate && endDate ? `${startDate} to ${endDate}` : 'All Records'}
              </p>
            </div>
            
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
            
            <Card className="print:hidden">
              <CardContent className="py-4">
                <div className="space-y-4">
                  {Object.values(groupedRecords)
                    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                    .map((group: any, index: number) => (
                    <div key={index} className={index > 0 ? "border-t pt-4" : ""}>
                      <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-3 mb-3">
                        <span className="text-lg sm:text-xl font-bold">
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
                        
                        {(profile?.role === 'manager' || profile?.role === 'assistant_manager') && (
                          <div className="w-full sm:w-auto sm:ml-auto flex gap-2 mt-2 sm:mt-0">
                            <Button
                              size="sm" className="flex-1 sm:flex-initial"
                              variant="outline"
                              onClick={() => handleEditClick(group)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm" className="flex-1 sm:flex-initial"
                              variant="destructive"
                              onClick={() => handleDeleteClick(group.recordIds)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                        {['Salmon and Rolls', 'Combo', 'Salmon and Avocado Rolls', 'Vegan Combo', 'Goma Wakame'].map((type) => {
                          const item = group.items.find((i: any) => i.type === type);
                          return (
                            <div key={type} className="border rounded p-2 text-center min-w-0">
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
          
          {Object.keys(groupedRecords).length > itemsPerPage && (
            <div className="flex flex-col sm:flex-row justify-center gap-2 mt-6 no-print">
              <Button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                variant="outline" className="w-full sm:w-auto"
              >
                Previous
              </Button>
              <span className="flex items-center justify-center px-4 text-sm sm:text-base">
                Page {currentPage} of {Math.ceil(Object.keys(groupedRecords).length / itemsPerPage)}
              </span>
              <Button
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(Object.keys(groupedRecords).length / itemsPerPage), p + 1))}
                disabled={currentPage >= Math.ceil(Object.keys(groupedRecords).length / itemsPerPage)}
                variant="outline" className="w-full sm:w-auto"
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>

    <ICADeliveryModal 
      open={showICADeliveryModal} 
      onOpenChange={setShowICADeliveryModal}
      onSuccess={fetchRecords}
    />

    <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
      <DialogContent className="max-w-md bg-black/40 backdrop-blur-xl border border-gray-700">
        <DialogHeader>
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this ICA delivery record? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirmDelete} disabled={isDeleting}>
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
      <DialogContent className="max-w-2xl mx-4 max-h-[85vh] overflow-y-auto bg-black/40 backdrop-blur-xl border border-gray-700">
        <DialogHeader>
          <DialogTitle>Edit ICA Delivery Record</DialogTitle>
          <DialogDescription>
            Update the quantities and time of day for this delivery.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {editingRecord && (
            <div className="space-y-2 pb-3 border-b">
              <p className="text-sm text-muted-foreground">
                <strong>User:</strong> {editingRecord.userName}
              </p>
              <p className="text-sm text-muted-foreground">
                <strong>Date:</strong> {new Date(editingRecord.submittedAt).toLocaleDateString('en-US', { 
                  weekday: 'short', 
                  month: 'short', 
                  day: 'numeric',
                  year: 'numeric'
                })}
              </p>
            </div>
          )}
          
          <div className="space-y-2">
            <Label>Time of Day (for all items)</Label>
            <Select
              value={editEntries[0]?.timeOfDay || 'Morning'}
              onValueChange={(value) => {
                setEditEntries(editEntries.map(entry => ({
                  ...entry,
                  timeOfDay: value
                })));
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Morning">Morning</SelectItem>
                <SelectItem value="Afternoon">Afternoon</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            {editEntries.map((entry, index) => (
              <div key={index} className="border rounded-lg p-3 space-y-2">
                <Label className="font-semibold">{entry.type}</Label>
                <Input
                  type="number"
                  min="0"
                  value={entry.amount}
                  onChange={(e) => {
                    const newEntries = [...editEntries];
                    newEntries[index] = { ...newEntries[index], amount: e.target.value };
                    setEditEntries(newEntries);
                  }}
                  placeholder="Enter amount"
                />
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setShowEditDialog(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirmEdit} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
