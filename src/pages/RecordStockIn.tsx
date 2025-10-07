import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect, useRef } from "react";
import { apiClient } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, CheckCircle, Clock, XCircle, ChevronDown } from "lucide-react";
import ReactSelect from 'react-select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface StockReceipt {
  id: string;
  supplier_name: string;
  receipt_file_name: string;
  remarks?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  reviewed_at?: string;
  reviewed_by_name?: string;
}

const RecordStockIn = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [receipts, setReceipts] = useState<StockReceipt[]>([]);
  const [loading, setLoading] = useState(false); // Start with false to show UI immediately
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  // Pagination state
  const [displayedReceipts, setDisplayedReceipts] = useState<StockReceipt[]>([]);
  const [isPolling, setIsPolling] = useState(false);
  
  // Form state
  const [supplierName, setSupplierName] = useState('');
  const [remarks, setRemarks] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Supplier options
  const supplierOptions = [
    { value: 'Gronsakshuset', label: 'Gronsakshuset' },
    { value: 'Kvalitetsfisk', label: 'Kvalitetsfisk' },
    { value: 'Spendrups', label: 'Spendrups' },
    { value: 'Tingstad', label: 'Tingstad' },
    { value: 'Other', label: 'Other' },
  ];

  const fetchReceipts = async (isPollingUpdate = false) => {
    console.log('fetchReceipts called, isPollingUpdate:', isPollingUpdate);
    // Don't set loading to true - show receipts immediately
    if (isPollingUpdate) {
      setIsPolling(true);
    }
    
    try {
      const data = await apiClient.getReceipts();
      console.log('Receipts data received:', data, 'Type:', typeof data, 'Is Array:', Array.isArray(data));
      // Ensure we always set an array
      if (Array.isArray(data)) {
        setReceipts(data);
        
        // Separate pending and approved receipts
        const pendingReceipts = data.filter(receipt => receipt.status === 'pending');
        const approvedReceipts = data.filter(receipt => receipt.status === 'approved');
        
        // Show ALL receipts initially, or maintain current display if polling
        if (!isPollingUpdate) {
          // Initial load: show first 5
          setDisplayedReceipts(data.slice(0, 5));
        } else {
          // Polling: preserve current displayed count
          setDisplayedReceipts(prev => {
            const currentCount = prev.length || 5;
            return data.slice(0, currentCount);
          });
        }
      } else {
        console.warn('Receipts data is not an array, setting empty array');
        setReceipts([]);
        if (!isPollingUpdate) {
          setDisplayedReceipts([]);
        }
      }
    } catch (error) {
      console.error('Error fetching receipts:', error);
      setReceipts([]); // Set empty array on error
      if (!isPollingUpdate) {
        setDisplayedReceipts([]);
      }
      // Don't show error toast for polling, only for initial load or manual refresh
      if (!isPollingUpdate) {
        toast({
          title: "Error",
          description: "Failed to load receipts",
          variant: "destructive",
        });
      }
    } finally {
      if (isPollingUpdate) {
        setIsPolling(false);
      }
    }
  };

  const loadMoreReceipts = () => {
    const nextBatch = receipts.slice(displayedReceipts.length, displayedReceipts.length + 5);
    setDisplayedReceipts(prev => [...prev, ...nextBatch]);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid File Type",
          description: "Please select a JPG, PNG, or PDF file",
          variant: "destructive",
        });
        return;
      }
      
      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please select a file smaller than 10MB",
          variant: "destructive",
        });
        return;
      }
      
      setSelectedFile(file);
    }
  };

  const handleSubmit = async () => {
    if (!supplierName || !selectedFile) {
      toast({
        title: "Missing Information",
        description: "Please select a supplier and upload a receipt",
        variant: "destructive",
      });
      return;
    }

    // Show confirmation dialog
    setShowConfirmDialog(true);
  };

  const confirmSubmit = async () => {
    setSubmitting(true);
    setShowConfirmDialog(false);
    
    try {
      const formData = new FormData();
      formData.append('supplier_name', supplierName);
      formData.append('remarks', remarks);
      formData.append('receipt', selectedFile); // Field name matches backend

      await apiClient.submitReceipt(formData);
      
      toast({
        title: "Success",
        description: "Receipt submitted successfully",
      });

      // Reset form
      setSupplierName('');
      setRemarks('');
      setSelectedFile(null);
      
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Refresh receipts list
      await fetchReceipts(false);
    } catch (error) {
      console.error('Error submitting receipt:', error);
      toast({
        title: "Error",
        description: "Failed to submit receipt",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'text-green-600 bg-green-50';
      case 'rejected':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-yellow-600 bg-yellow-50';
    }
  };

  useEffect(() => {
    fetchReceipts(false); // Initial load
    
    // Set up polling to refresh receipts every 10 seconds
    const interval = setInterval(() => {
      fetchReceipts(true); // Polling update
    }, 10000); // Poll every 10 seconds
    
    // Cleanup interval on component unmount
    return () => clearInterval(interval);
  }, []);

  // Remove the main loading check - show UI immediately

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Record Stock In</h1>
      </div>

      {/* Submit Receipt and Submitted Receipts in same row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Submission Form */}
        <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Submit Receipt
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="supplier">Supplier *</Label>
            <ReactSelect
              options={supplierOptions}
              placeholder="Select supplier..."
              isSearchable={true}
              isClearable={true}
              className="react-select-container"
              classNamePrefix="react-select"
              value={supplierOptions.find(option => option.value === supplierName)}
              onChange={(selectedOption) => {
                setSupplierName(selectedOption?.value || '');
              }}
              styles={{
                control: (base) => ({
                  ...base,
                  backgroundColor: 'hsl(var(--background))',
                  borderColor: 'hsl(var(--border))',
                  minHeight: '40px',
                }),
                menu: (base) => ({
                  ...base,
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  zIndex: 50,
                }),
                option: (base, state) => ({
                  ...base,
                  backgroundColor: state.isFocused ? 'hsl(var(--muted))' : 'hsl(var(--background))',
                  color: 'hsl(var(--foreground))',
                  cursor: 'pointer',
                }),
              }}
            />
          </div>

          <div>
            <Label htmlFor="receipt">Receipt File *</Label>
            <Input
              id="receipt"
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={handleFileChange}
              className="cursor-pointer"
              ref={fileInputRef}
            />
            <p className="text-sm text-muted-foreground mt-1">
              Upload JPG, PNG, or PDF file (max 10MB)
            </p>
            {selectedFile && (
              <p className="text-sm text-green-600 mt-1">
                Selected: {selectedFile.name}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea
              id="remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Add any additional notes about this receipt..."
              rows={3}
            />
          </div>

          <Button 
            onClick={handleSubmit} 
            disabled={submitting || !supplierName || !selectedFile}
            className="w-full"
          >
            {submitting ? 'Submitting...' : 'Submit Receipt'}
          </Button>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Receipt Submission</DialogTitle>
            <DialogDescription>
              Are you sure that all the listed items are counted and the receipt is accurate?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowConfirmDialog(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button 
              onClick={confirmSubmit}
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Yes, Submit Receipt'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

        {/* Submitted Receipts */}
        <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Submitted Receipts
            {isPolling && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span>Updating...</span>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {displayedReceipts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No receipts submitted yet
              </div>
            ) : (
              <>
                {displayedReceipts.map((receipt) => (
                  <div
                    key={receipt.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusIcon(receipt.status)}
                        <h3 className="font-medium truncate">{receipt.supplier_name}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        File: {receipt.receipt_file_name}
                      </p>
                      {receipt.remarks && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Remarks: {receipt.remarks}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        Submitted: {new Date(receipt.created_at).toLocaleString()}
                      </p>
                      {receipt.reviewed_at && (
                        <p className="text-xs text-muted-foreground">
                          Reviewed: {new Date(receipt.reviewed_at).toLocaleString()} by {receipt.reviewed_by_name}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(receipt.status)}`}>
                        {receipt.status.charAt(0).toUpperCase() + receipt.status.slice(1)}
                      </span>
                    </div>
                  </div>
                ))}
                
                {/* Load More Button - generic */}
                {receipts.length > displayedReceipts.length && (
                  <div className="flex justify-center pt-4">
                    <Button
                      variant="outline"
                      onClick={loadMoreReceipts}
                      className="flex items-center gap-2"
                    >
                      <ChevronDown className="h-4 w-4" />
                      Load More ({Math.max(0, receipts.length - displayedReceipts.length)} remaining)
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
};

export default RecordStockIn;
