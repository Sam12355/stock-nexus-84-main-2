import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api";
import { notificationEvents } from "@/lib/notificationEvents";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Package, TrendingUp, AlertTriangle, Plus, Minus } from "lucide-react";
import ReactSelect from 'react-select';

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
    low_level?: number;
    critical_level?: number;
    image_url?: string;
    branch_id: string;
  };
}

const Stock = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [categorySearchTerms, setCategorySearchTerms] = useState<{ [category: string]: string }>({});
  const [isMovementDialogOpen, setIsMovementDialogOpen] = useState(false);
  const [quickActionItem, setQuickActionItem] = useState<StockItem | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'low' | 'critical'>('all');
  const [isQuickActionLoading, setIsQuickActionLoading] = useState(false);

  const fetchStockData = async () => {
    try {
      const data = await apiClient.getStockData();
      setStockItems(data || []);
      
      // If no stock data exists, try to initialize stock records
      if ((data || []).length === 0) {
        try {
          const initResult = await apiClient.initializeStock();
          if (initResult.initialized > 0) {
            toast({
              title: "Stock Initialized",
              description: `Created stock records for ${initResult.initialized} items`,
            });
            // Fetch data again after initialization
            const newData = await apiClient.getStockData();
            setStockItems(newData || []);
          }
        } catch (initError) {
          console.error('Error initializing stock:', initError);
        }
      }
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

  const handleStockOut = async () => {
    if (!selectedItem || !quantity) return;

    try {
      const result = await apiClient.updateStockQuantity(
        selectedItem.item_id,
        'out',
        parseInt(quantity),
        reason || null
      );

      toast({
        title: "Success",
        description: `Stock removed successfully`,
      });

      // Stock alerts are automatically handled by the backend
      // Trigger notification refresh since stock alerts might have been generated
      notificationEvents.triggerNotificationUpdate();

      // Refresh stock data
      fetchStockData();
      
      // Reset form and close dialog
      setSelectedItem(null);
      setQuantity('');
      setReason('');
      setIsMovementDialogOpen(false);
      setSearchTerm('');
    } catch (error) {
      console.error('Error updating stock:', error);
      const errMsg = (error as any)?.message || "Failed to update stock";
      toast({
        title: "Error",
        description: errMsg,
        variant: "destructive",
      });
    }
  };



  const handleQuickStockOut = async (item: StockItem) => {
    if (!quantity) {
      toast({
        title: "Error",
        description: "Please enter a quantity first",
        variant: "destructive",
      });
      return;
    }

    if (isQuickActionLoading) return; // Prevent multiple clicks

    setIsQuickActionLoading(true);

    try {
      const result = await apiClient.updateStockQuantity(
        item.item_id,
        'out',
        parseInt(quantity),
        `Quick stock out`
      );

      toast({
        title: "Success",
        description: `Stock removed successfully`,
      });

      // Check if stock alert should be sent
      // Stock alerts are automatically handled by the backend
      // Trigger notification refresh since stock alerts might have been generated
      notificationEvents.triggerNotificationUpdate();

      fetchStockData();
      setQuantity('');
      setQuickActionItem(null);
    } catch (error) {
      console.error('Error updating stock:', error);
      const errMsg = (error as any)?.message || "Failed to update stock";
      toast({
        title: "Error",
        description: errMsg,
        variant: "destructive",
      });
    } finally {
      setIsQuickActionLoading(false);
    }
  };


  const getStockStatus = (item: StockItem) => {
    const threshold = item.items.threshold_level;
    const current = item.current_quantity;
    
    if (current <= threshold * 0.5) return { status: 'critical', color: 'destructive' };
    if (current <= threshold) return { status: 'low', color: 'default' };
    return { status: 'adequate', color: 'secondary' };
  };

  useEffect(() => {
    fetchStockData();
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading stock data...</div>;
  }

  // Filter items based on critical vs low stock - mutually exclusive
  const criticalStockItems = stockItems.filter(item => 
    item.current_quantity <= item.items.threshold_level * 0.5
  );

  const lowStockItems = stockItems.filter(item => 
    item.current_quantity > item.items.threshold_level * 0.5 && 
    item.current_quantity <= item.items.threshold_level
  );
  
  // Filter items based on search term and filter type
  let displayItems = stockItems;
  
  if (filterType === 'low') {
    displayItems = lowStockItems;
  } else if (filterType === 'critical') {
    displayItems = criticalStockItems;
  }
  
  const filteredStockItems = displayItems.filter(item =>
    item.items.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.items.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group items by category and apply category-specific search
  const groupItemsByCategory = (items: StockItem[]) => {
    const grouped: { [category: string]: StockItem[] } = {};
    
    items.forEach(item => {
      const category = item.items.category;
      if (!grouped[category]) {
        grouped[category] = [];
      }
      
      // Apply category-specific search filter
      const categorySearchTerm = categorySearchTerms[category] || '';
      const matchesSearch = !categorySearchTerm || 
        item.items.name.toLowerCase().includes(categorySearchTerm.toLowerCase());
      
      if (matchesSearch) {
        grouped[category].push(item);
      }
    });
    
    return grouped;
  };

  const groupedItems = groupItemsByCategory(filteredStockItems);

  // Prepare options for react-select (use all items for selection)
  const selectOptions = stockItems.filter(item =>
    item.items.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.items.category.toLowerCase().includes(searchTerm.toLowerCase())
  ).map(item => ({
    value: item.id,
    label: `${item.items.name} (Current: ${item.current_quantity})`,
    item: item
  }));

  // Handle category search term changes
  const handleCategorySearchChange = (category: string, value: string) => {
    setCategorySearchTerms(prev => ({
      ...prev,
      [category]: value
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Stock Out</h1>
        <Dialog open={isMovementDialogOpen} onOpenChange={setIsMovementDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Minus className="mr-2 h-4 w-4" />
              Remove Stock
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Remove Stock</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Select Item</Label>
                <ReactSelect
                  options={selectOptions}
                  placeholder="Search and select an item..."
                  isSearchable={true}
                  isClearable={true}
                  className="react-select-container"
                  classNamePrefix="react-select"
                  onChange={(selectedOption) => {
                    if (selectedOption) {
                      setSelectedItem(selectedOption.item);
                    } else {
                      setSelectedItem(null);
                    }
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
              
              {selectedItem && (
                <>
                  <div>
                    <Label>Quantity to Remove</Label>
                    <Input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder="Enter quantity to remove"
                      className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                  
                  <div>
                    <Label>Reason (Optional)</Label>
                    <Textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Enter reason for removing stock"
                    />
                  </div>
                  
                  <Button onClick={handleStockOut} className="w-full">
                    Remove Stock
                  </Button>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setFilterType('all')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stockItems.length}</div>
            <p className="text-xs text-muted-foreground">Items in inventory</p>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setFilterType('low')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{lowStockItems.length}</div>
            <p className="text-xs text-muted-foreground">Need restocking</p>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setFilterType('critical')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{criticalStockItems.length}</div>
            <p className="text-xs text-muted-foreground">Urgent attention needed</p>
          </CardContent>
        </Card>
      </div>

      {/* Stock Items List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle>
              {filterType === 'all' ? 'Current Stock Levels' :
               filterType === 'low' ? 'Low Stock Items' :
               'Critical Stock Items'}
            </CardTitle>
          </div>
          <div className="mt-4">
            <Input
              placeholder="Search for items by name or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {Object.entries(groupedItems).map(([category, items]) => (
              <div key={category} className="space-y-3">
                {/* Category Header with Search Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-muted/50 rounded-lg">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground">
                      {categoryLabels[category as keyof typeof categoryLabels] || category}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {items.length} item{items.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="w-full sm:w-64">
                    <Input
                      placeholder={`Search within ${categoryLabels[category as keyof typeof categoryLabels] || category}...`}
                      value={categorySearchTerms[category] || ''}
                      onChange={(e) => handleCategorySearchChange(category, e.target.value)}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Items in this category */}
                <div className="space-y-2">
                  {items.map((item) => {
                    const status = getStockStatus(item);
                    return (
                      <div
                        key={item.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center space-x-4 min-w-0 flex-1">
                          {item.items.image_url ? (
                            <img 
                              src={item.items.image_url} 
                              alt={item.items.name}
                              className="w-12 h-12 rounded object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
                              <Package className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium truncate">{item.items.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {categoryLabels[item.items.category as keyof typeof categoryLabels] || item.items.category}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                          <div className="flex items-center justify-between sm:justify-start gap-4">
                            <div className="text-right">
                              <p className="font-medium">Qty: {item.current_quantity}</p>
                              <p className="text-xs text-muted-foreground">
                                Threshold: {item.items.threshold_level}
                              </p>
                            </div>
                            
                            <Badge variant={status.color as any}>
                              {status.status}
                            </Badge>
                          </div>
                          
                          <div className="flex justify-end">
                            {quickActionItem?.id === item.id ? (
                              <div className="flex items-center gap-2 flex-wrap">
                                <Input
                                  type="number"
                                  placeholder="Qty"
                                  value={quantity}
                                  onChange={(e) => setQuantity(e.target.value)}
                                  className="w-16 h-8 text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  disabled={isQuickActionLoading}
                                />
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleQuickStockOut(item)}
                                  className="h-8 px-2"
                                  disabled={isQuickActionLoading}
                                >
                                  {isQuickActionLoading ? (
                                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600"></div>
                                  ) : (
                                    <Minus className="h-3 w-3" />
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setQuickActionItem(null);
                                    setQuantity('');
                                  }}
                                  className="h-8 px-2"
                                  disabled={isQuickActionLoading}
                                >
                                  ✕
                                </Button>
                              </div>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setQuickActionItem(item);
                                    setQuantity('');
                                  }}
                                  disabled={isQuickActionLoading}
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {items.length === 0 && (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                      No items found in this category
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {Object.keys(groupedItems).length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                {filterType === 'all' ? 'No stock items found. Add some items first.' :
                 filterType === 'low' ? 'No low stock items found.' :
                 'No critical stock items found.'}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Stock;