import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Download, FileSpreadsheet, Printer, Calendar } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
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

export function ICADeliveryList() {
  const { toast } = useToast();
  const [records, setRecords] = useState<ICADeliveryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchRecords();
  }, [selectedDate]);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/ica-delivery?date=${selectedDate}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setRecords(data);
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
    acc[key].items.push({ type: record.type, amount: record.amount });
    return acc;
  }, {} as Record<string, any>);

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text(`ICA Delivery Report - ${selectedDate}`, 14, 20);
    
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
      head: [['User', 'Time of Day', 'Items', 'Submitted At']],
      body: tableData,
      startY: 30,
    });

    doc.save(`ica-delivery-${selectedDate}.pdf`);
  };

  const exportToExcel = () => {
    const data = Object.values(groupedRecords).flatMap((group: any) => 
      group.items.map((item: any) => ({
        'User Name': group.userName,
        'Time of Day': group.timeOfDay,
        'Type': item.type,
        'Amount': item.amount,
        'Submitted At': new Date(group.submittedAt).toLocaleString()
      }))
    );

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ICA Delivery");
    XLSX.writeFile(wb, `ica-delivery-${selectedDate}.xlsx`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">ICA Delivery Records</h1>
        <div className="flex gap-2">
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

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Calendar className="h-5 w-5" />
            <CardTitle>Filter by Date</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="max-w-xs"
          />
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
            <p className="text-center text-gray-500">No records found for {selectedDate}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {Object.values(groupedRecords).map((group: any, index: number) => (
            <Card key={index}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{group.userName}</CardTitle>
                    <p className="text-sm text-gray-500 mt-1">
                      {group.timeOfDay} - {new Date(group.submittedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {group.items.map((item: any, idx: number) => (
                    <div key={idx} className="border rounded-lg p-3">
                      <p className="text-sm font-medium text-gray-700">{item.type}</p>
                      <p className="text-2xl font-bold">{item.amount}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
