import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Package, FileText, Plus, Trash2, Download, Printer, CheckCircle, Calendar } from "lucide-react";
import ReactSelect from 'react-select';

// Extended interface for profile with branch_context
interface ExtendedProfile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone?: string;
  photo_url?: string;
  position?: string;
  role: 'admin' | 'manager' | 'assistant_manager' | 'staff';
  branch_id?: string;
  branch_context?: string;
  last_access?: string;
  access_count: number;
  created_at: string;
  updated_at: string;
}

interface StockItem {
  id: string;
  item_id: string;
  current_quantity: number;
  last_updated: string;
  items: {
    name: string;
    category: string;
    threshold_level: number;
    image_url?: string;
    branch_id: string;
  };
}

interface MoveoutItem {
  id: string;
  item_id: string;
  item_name: string;
  available_amount: number;
  request_amount: number;
  category: string;
  image_url?: string;
}

interface MoveoutList {
  id: string;
  items: MoveoutItem[];
  created_by: string;
  created_at: string;
  updated_at: string;
  status: 'draft' | 'generated' | 'completed';
  title?: string;
  description?: string;
  generated_by?: string;
  branch_id?: string;
}

const MoveoutList = () => {
  const { profile } = useAuth() as { profile: ExtendedProfile | null };
  const { toast } = useToast();
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<MoveoutItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<MoveoutList | null>(null);
  const [historicalLists, setHistoricalLists] = useState<MoveoutList[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchStockData = async () => {
    try {
      const data = await apiClient.getStockData();
      setStockItems(data || []);
    } catch (error) {
      console.error('Error fetching stock data:', error);
      toast({
        title: "Error",
        description: "Failed to load stock data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchHistoricalLists = async () => {
    if (!profile?.id) {
      console.log('Profile ID not available yet, skipping historical lists fetch');
      return;
    }

    setLoadingHistory(true);
    try {
      console.log('Fetching historical moveout lists for user:', profile.id);
      console.log('Profile details:', profile);
      console.log('Auth token:', localStorage.getItem('auth_token'));
      
      const data = await apiClient.getMoveoutLists();
      console.log('Received moveout lists data:', data);
      console.log('Data type:', typeof data, 'Array?', Array.isArray(data));
      
      if (Array.isArray(data)) {
        setHistoricalLists(data);
      } else {
        console.error('Expected array but got:', data);
        setHistoricalLists([]);
      }
    } catch (error) {
      console.error('Error fetching historical lists:', error);
      console.error('Error details:', error);
      setHistoricalLists([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleItemSelect = (selectedOptions: any[]) => {
    const newItems: MoveoutItem[] = selectedOptions.map(option => ({
      id: option.value,
      item_id: option.item?.item_id || '',
      item_name: option.item?.items?.name || 'Unknown Item',
      available_amount: option.item?.current_quantity || 0,
      request_amount: 0,
      category: option.item?.items?.category || 'misc',
      image_url: option.item?.items?.image_url || undefined
    }));
    setSelectedItems(newItems);
  };

  const handleRequestAmountChange = (itemId: string, amount: number) => {
    setSelectedItems(prev => 
      prev.map(item => 
        item.id === itemId 
          ? { ...item, request_amount: Math.max(0, Math.min(amount, item.available_amount)) }
          : item
      )
    );
  };

  const removeItem = (itemId: string) => {
    setSelectedItems(prev => prev.filter(item => item.id !== itemId));
  };

  const generateMoveoutList = async () => {
    // Prevent double clicks
    if (isGenerating) {
      return;
    }

    if (selectedItems.length === 0) {
      toast({
        title: "No Items Selected",
        description: "Please select at least one item to generate the moveout list",
        variant: "destructive",
      });
      return;
    }

    const itemsWithRequestAmount = selectedItems.filter(item => item.request_amount > 0);
    if (itemsWithRequestAmount.length === 0) {
      toast({
        title: "No Request Amounts",
        description: "Please enter request amounts for at least one item",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      // Format the data to match the API client's expected structure
      const formattedData = {
        title: `Moveout List - ${new Date().toLocaleDateString()}`,
        description: `Generated by ${profile?.name}`,
        items: itemsWithRequestAmount.map(item => ({
          item_id: item.item_id,
          item_name: item.item_name,
          available_amount: item.available_amount,
          request_amount: item.request_amount,
          category: item.category
        }))
      };
      
      console.log('Creating moveout list with data:', formattedData);
      const moveoutListData = await apiClient.createMoveoutList(formattedData);
      console.log('Created moveout list:', moveoutListData);
      setGeneratedReport(moveoutListData);
      
      // Refresh historical lists to include the newly created report
      const historicalData = await apiClient.getMoveoutLists();
      console.log('Refreshed historical lists:', historicalData);
      setHistoricalLists(historicalData || []);

      toast({
        title: "Success",
        description: "Moveout list generated and saved successfully",
      });

    } catch (error) {
      console.error('Error generating moveout list:', error);
      toast({
        title: "Error",
        description: "Failed to generate moveout list",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadReport = async () => {
    if (!generatedReport) return;

    try {
      // Dynamic import of jsPDF
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();

      // Set font
      doc.setFont('helvetica');

      // Title
      doc.setFontSize(20);
      doc.text('Moveout List Report', 20, 30);

      // Report details
      doc.setFontSize(12);
      doc.text(`Generated At: ${new Date(generatedReport.created_at).toLocaleString()}`, 20, 50);
      doc.text(`Generated By: ${profile?.name || 'Unknown'}`, 20, 60);
      doc.text(`Total Items: ${generatedReport.items.length}`, 20, 70);

      // Table headers
      doc.setFontSize(10);
      doc.text('Item Name', 20, 90);
      doc.text('Available', 80, 90);
      doc.text('Request', 120, 90);
      doc.text('Category', 150, 90);

      // Draw line under headers
      doc.line(20, 95, 190, 95);

      // Table data
      let yPosition = 105;
      generatedReport.items.forEach((item, index) => {
        if (yPosition > 280) {
          doc.addPage();
          yPosition = 20;
        }

        doc.text(item.item_name.substring(0, 25), 20, yPosition);
        doc.text(item.available_amount.toString(), 80, yPosition);
        doc.text(item.request_amount.toString(), 120, yPosition);
        doc.text((item.category?.replace('_', ' ') || 'Unknown').substring(0, 15), 150, yPosition);
        
        yPosition += 10;
      });

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(`Generated on ${new Date().toLocaleString()}`, 20, doc.internal.pageSize.height - 10);
        doc.text(`Page ${i} of ${pageCount}`, 170, doc.internal.pageSize.height - 10);
      }

      // Save the PDF
      doc.save(`moveout-list-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  const printReport = () => {
    if (!generatedReport) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Moveout List Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .info { margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Moveout List Report</h1>
        </div>
        <div class="info">
          <p><strong>Generated At:</strong> ${new Date(generatedReport.created_at).toLocaleString()}</p>
          <p><strong>Generated By:</strong> ${profile?.name}</p>
          <p><strong>Total Items:</strong> ${generatedReport.items.length}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Item Name</th>
              <th>Available Amount</th>
              <th>Request Amount</th>
              <th>Category</th>
            </tr>
          </thead>
          <tbody>
            ${generatedReport.items.map(item => `
              <tr>
                <td>${item.item_name}</td>
                <td>${item.available_amount}</td>
                <td>${item.request_amount}</td>
                <td>${item.category?.replace('_', ' ') || 'Unknown'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="footer">
          <p>Generated on ${new Date().toLocaleString()}</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  // Prepare options for react-select (only show items with available quantity > 0)
  const selectOptions = stockItems
    .filter(item => item.current_quantity > 0)
    .map(item => ({
      value: item.id,
      label: `${item.items.name} (Available: ${item.current_quantity})`,
      item: item
    }));

  useEffect(() => {
    fetchStockData();
  }, []);

  useEffect(() => {
    console.log('useEffect triggered for profile.id:', profile?.id);
    console.log('Profile object:', profile);
    if (profile?.id) {
      console.log('Profile ID available, calling fetchHistoricalLists');
      fetchHistoricalLists();
    } else {
      console.log('Profile ID not available, not calling fetchHistoricalLists');
    }
  }, [profile?.id]);

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading stock data...</div>;
  }

  const canManageMoveout = profile?.role === 'manager' || profile?.role === 'assistant_manager' || profile?.role === 'staff';

  if (!canManageMoveout) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-muted-foreground">You don't have permission to manage moveout lists.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Moveout List</h1>
        <div className="flex gap-2">
          {generatedReport && (
            <Button onClick={downloadReport} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Download Report
            </Button>
          )}
        </div>
      </div>


      {/* Item Selection Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Select Items for Moveout
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Search and Select Items</Label>
            <ReactSelect
              isMulti
              options={selectOptions}
              placeholder="Search and select items..."
              isSearchable={true}
              isClearable={true}
              className="react-select-container"
              classNamePrefix="react-select"
              onChange={handleItemSelect}
              value={selectedItems.map(item => ({
                value: item.id,
                label: `${item.item_name} (Available: ${item.available_amount})`,
                item: {
                  item_id: item.item_id,
                  current_quantity: item.available_amount,
                  items: {
                    name: item.item_name,
                    category: item.category,
                    image_url: item.image_url
                  }
                }
              }))}
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
          

        </CardContent>
      </Card>

      {/* Selected Items Table */}
      {selectedItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Selected Items ({selectedItems.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Available Amount</TableHead>
                  <TableHead>Request Amount</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        {item.image_url ? (
                          <img 
                            src={item.image_url} 
                            alt={item.item_name}
                            className="w-10 h-10 rounded object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                            <Package className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{item.item_name}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.available_amount}</Badge>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        max={item.available_amount}
                        value={item.request_amount}
                        onChange={(e) => handleRequestAmountChange(item.id, parseInt(e.target.value) || 0)}
                        className="w-24 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {item.category?.replace('_', ' ') || 'Unknown'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
          <div className="p-4 border-t">
            <Button 
              onClick={generateMoveoutList}
              disabled={selectedItems.length === 0 || isGenerating}
              className="w-full sm:w-auto"
            >
              <FileText className="mr-2 h-4 w-4" />
              {isGenerating ? "Generating..." : "Generate Moveout List"}
            </Button>
          </div>
        </Card>
      )}

      {/* Generated Reports Accordion */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Generated Moveout List Reports
              <Badge variant="outline" className="ml-2">
                {historicalLists.length} lists
              </Badge>
            </CardTitle>
            <Button 
              onClick={fetchHistoricalLists} 
              variant="outline" 
              size="sm"
              disabled={loadingHistory}
            >
              <Calendar className="mr-2 h-4 w-4" />
              {loadingHistory ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingHistory ? (
            <div className="flex justify-center items-center py-8">
              <p className="text-muted-foreground">Loading historical lists...</p>
            </div>
          ) : historicalLists.length === 0 ? (
            <div className="flex justify-center items-center py-8">
              <p className="text-muted-foreground">No moveout lists found</p>
            </div>
          ) : (
            <Accordion type="single" collapsible className="w-full">
            {/* Current Generated Report */}
            {generatedReport && (
              <AccordionItem value="current-report">
                <AccordionTrigger className="text-left">
                  <div className="flex items-center justify-between w-full pr-4">
                    <span>Moveout List - {new Date(generatedReport.created_at).toLocaleDateString()} - {new Date(generatedReport.created_at).toLocaleTimeString()}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="default">Latest</Badge>
                      <span className="text-sm text-muted-foreground">
                        {generatedReport.items.length} items
                      </span>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <div className="flex gap-2 mb-4">
                      <Button onClick={downloadReport} variant="outline" size="sm">
                        <Download className="mr-2 h-4 w-4" />
                        Download PDF
                      </Button>
                      <Button onClick={printReport} variant="outline" size="sm">
                        <Printer className="mr-2 h-4 w-4" />
                        Print
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="font-medium">Generated At:</p>
                        <p className="text-muted-foreground">{new Date(generatedReport.created_at).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="font-medium">Generated By:</p>
                        <p className="text-muted-foreground">{profile?.name}</p>
                      </div>
                      <div>
                        <p className="font-medium">Total Items:</p>
                        <p className="text-muted-foreground">{generatedReport.items.length}</p>
                      </div>
                    </div>

                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item Name</TableHead>
                          <TableHead>Available Amount</TableHead>
                          <TableHead>Request Amount</TableHead>
                          <TableHead>Category</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {generatedReport.items.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{item.item_name}</TableCell>
                            <TableCell>{item.available_amount}</TableCell>
                            <TableCell>
                              <Badge variant="default">{item.request_amount}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="capitalize">
                                {item.category?.replace('_', ' ') || 'Unknown'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Historical Reports */}
            {historicalLists.map((list, index) => (
              <AccordionItem key={list.id} value={`historical-${index}`}>
                <AccordionTrigger className="text-left">
                  <div className="flex items-center justify-between w-full pr-4">
                    <span>Moveout List - {new Date(list.created_at).toLocaleDateString()} - {new Date(list.created_at).toLocaleTimeString()}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant={list.status === 'completed' ? 'default' : 'secondary'}>
                        {list.status}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {list.items.length} items
                      </span>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="font-medium">Created At:</p>
                        <p className="text-muted-foreground">{new Date(list.created_at).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="font-medium">Status:</p>
                        <p className="text-muted-foreground capitalize">{list.status}</p>
                      </div>
                      <div>
                        <p className="font-medium">Total Items:</p>
                        <p className="text-muted-foreground">{list.items.length}</p>
                      </div>
                    </div>

                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item Name</TableHead>
                          <TableHead>Available Amount</TableHead>
                          <TableHead>Request Amount</TableHead>
                          <TableHead>Category</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {list.items.map((item, itemIndex) => (
                          <TableRow key={itemIndex}>
                            <TableCell className="font-medium">{item.item_name}</TableCell>
                            <TableCell>{item.available_amount}</TableCell>
                            <TableCell>
                              <Badge variant="default">{item.request_amount}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="capitalize">
                                {item.category?.replace('_', ' ') || 'Unknown'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
            </Accordion>
          )}
        </CardContent>
      </Card>

    </div>
  );
};

export default MoveoutList;
