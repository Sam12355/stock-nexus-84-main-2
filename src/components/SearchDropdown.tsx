import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api';
import { AlertTriangle, CheckCircle, Package, Search, XCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface SearchItem {
  id: string;
  name: string;
  category: string;
  description?: string;
  current_quantity: number;
  threshold_level: number;
  low_level?: number;
  critical_level?: number;
  storage_temperature?: number;
  image_url?: string;
  base_unit?: string;
  packaging_unit?: string;
  units_per_package?: number;
  enable_packaging?: boolean;
}

export function SearchDropdown() {
  const { profile } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<SearchItem | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (searchTerm.length >= 2) {
      searchItems();
      setIsOpen(true);
    } else {
      setSearchResults([]);
      setIsOpen(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchItems = async () => {
    if (!profile || searchTerm.length < 2) return;

    try {
      const branchId = profile.branch_id || profile.branch_context;
      
      // Get items from the API
      const itemsData = await apiClient.getItems();
      
      // Filter items by search term and branch
      const filteredItems = itemsData
        .filter(item => 
          item.branch_id === branchId &&
          item.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .slice(0, 5);

      // Get stock data for the current branch using the correct method name
      const stockData = await apiClient.getStockData();
      console.log('Stock data sample:', stockData[0]); // Debug
      const branchStock = stockData.filter(stock => stock.branch_id === branchId || stock.items?.branch_id === branchId);

      // Map items with their correct stock quantities
      const itemsWithStock = filteredItems.map((item) => {
        const stockItem = branchStock.find(stock => stock.item_id === item.id);
        console.log(`Item: ${item.name}, Stock:`, stockItem); // Debug
        return {
          id: item.id,
          name: item.name,
          category: item.category,
          description: item.description,
          threshold_level: item.threshold_level,
          low_level: item.low_level,
          critical_level: item.critical_level,
          storage_temperature: item.storage_temperature,
          image_url: item.image_url,
          current_quantity: stockItem?.current_quantity || 0,
          base_unit: item.base_unit,
          packaging_unit: item.packaging_unit,
          units_per_package: item.units_per_package,
          enable_packaging: item.enable_packaging
        };
      });

      setSearchResults(itemsWithStock);
    } catch (error) {
      console.error('Error searching items:', error);
      setSearchResults([]);
    }
  };

  const handleItemClick = (item: SearchItem) => {
    setSelectedItem(item);
    setIsDialogOpen(true);
    setIsOpen(false);
    setSearchTerm('');
  };

  const getStockStatus = (current: number, threshold: number, lowLevel?: number, criticalLevel?: number) => {
    // Use custom alert levels if available, otherwise fall back to threshold-based logic
    const criticalThreshold = criticalLevel || threshold * 0.5;
    const lowThreshold = lowLevel || threshold;
    
    if (current <= criticalThreshold) return { 
      status: 'Critical', 
      variant: 'destructive' as const, 
      icon: XCircle,
      className: 'bg-red-600 text-white hover:bg-red-700'
    };
    if (current <= lowThreshold) return { 
      status: 'Low', 
      variant: 'destructive' as const, 
      icon: AlertTriangle,
      className: 'bg-yellow-600 text-white hover:bg-yellow-700'
    };
    return { 
      status: 'Adequate', 
      variant: 'default' as const, 
      icon: CheckCircle,
      className: 'bg-green-600 text-white hover:bg-green-700'
    };
  };

  return (
    <>
      <div className="relative" ref={searchRef}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search inventory..."
            className="pl-9 w-64 bg-background"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => searchTerm.length >= 2 && setIsOpen(true)}
          />
        </div>

        {isOpen && searchResults.length > 0 && (
          <Card className="absolute top-full left-0 right-0 mt-1 z-50 max-h-96 overflow-hidden">
            <CardContent className="p-0">
              {searchResults.map((item) => {
                const stockInfo = getStockStatus(item.current_quantity, item.threshold_level, item.low_level, item.critical_level);
                const IconComponent = stockInfo.icon;
                return (
                  <div
                    key={item.id}
                    className="flex items-start space-x-3 p-3 hover:bg-muted cursor-pointer border-b last:border-b-0 transition-colors"
                    onClick={() => handleItemClick(item)}
                  >
                    <div className="flex-shrink-0">
                      {item.image_url ? (
                        <img 
                          src={item.image_url} 
                          alt={item.name}
                          className="w-12 h-12 rounded-lg object-cover border"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center border">
                          <Package className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground capitalize mb-2">{item.category}</p>
                      
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <IconComponent className="h-3 w-3" />
                          <Badge className={stockInfo.className}>
                            {stockInfo.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {item.current_quantity} units
                          </span>
                        </div>
                        {/* Removed threshold/low/critical line as requested */}
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Item Details
            </DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-6">
              {/* Header with image and basic info */}
              <div className="flex gap-4">
                {selectedItem.image_url ? (
                  <img 
                    src={selectedItem.image_url} 
                    alt={selectedItem.name}
                    className="w-20 h-20 object-cover rounded-lg border"
                  />
                ) : (
                  <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center">
                    <Package className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="font-semibold text-xl">{selectedItem.name}</h3>
                  <p className="text-sm text-muted-foreground capitalize mb-2">{selectedItem.category}</p>
                  {selectedItem.description && (
                    <p className="text-sm text-muted-foreground">{selectedItem.description}</p>
                  )}
                </div>
              </div>

              {/* Stock Information */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-muted rounded-lg">
                  <h4 className="font-medium text-sm mb-1">Current Stock</h4>
                  <p className="text-2xl font-bold text-primary">{selectedItem.current_quantity}</p>
                  <p className="text-xs text-muted-foreground">{selectedItem.base_unit || 'units'}</p>
                </div>
                {selectedItem.enable_packaging && selectedItem.units_per_package && selectedItem.units_per_package > 0 && (
                  <div className="text-center p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h4 className="font-medium text-sm mb-1 text-blue-800 dark:text-blue-200">Packaging</h4>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {Math.floor(selectedItem.current_quantity / selectedItem.units_per_package)}
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      {selectedItem.packaging_unit || 'packages'}
                      {selectedItem.current_quantity % selectedItem.units_per_package > 0 && (
                        <span className="block mt-1">
                          + {selectedItem.current_quantity % selectedItem.units_per_package} {selectedItem.base_unit || 'units'}
                        </span>
                      )}
                    </p>
                  </div>
                )}
                <div className="text-center p-3 bg-muted rounded-lg">
                  <h4 className="font-medium text-sm mb-1">Threshold</h4>
                  <p className="text-2xl font-bold">{selectedItem.threshold_level}</p>
                </div>
                {selectedItem.low_level && (
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <h4 className="font-medium text-sm mb-1">Low Alert</h4>
                    <p className="text-2xl font-bold text-yellow-600">{selectedItem.low_level}</p>
                  </div>
                )}
                {selectedItem.critical_level && (
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <h4 className="font-medium text-sm mb-1">Critical Alert</h4>
                    <p className="text-2xl font-bold text-red-600">{selectedItem.critical_level}</p>
                  </div>
                )}
              </div>

              {/* Stock Status with detailed information */}
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                  Stock Status
                  {(() => {
                    const stockInfo = getStockStatus(selectedItem.current_quantity, selectedItem.threshold_level, selectedItem.low_level, selectedItem.critical_level);
                    const IconComponent = stockInfo.icon;
                    return <IconComponent className="h-4 w-4" />;
                  })()}
                </h4>
                <div className="flex items-center gap-3">
                  {(() => {
                    const stockInfo = getStockStatus(selectedItem.current_quantity, selectedItem.threshold_level, selectedItem.low_level, selectedItem.critical_level);
                    return (
                      <Badge className={stockInfo.className}>
                        {stockInfo.status}
                      </Badge>
                    );
                  })()}
                  <span className="text-sm text-muted-foreground">
                    {selectedItem.current_quantity <= (selectedItem.critical_level || selectedItem.threshold_level * 0.5) 
                      ? "Immediate restocking required"
                      : selectedItem.current_quantity <= (selectedItem.low_level || selectedItem.threshold_level)
                      ? "Consider restocking soon"
                      : "Stock levels are adequate"
                    }
                  </span>
                </div>
              </div>

              {/* Additional Information */}
              {(selectedItem.storage_temperature || selectedItem.low_level || selectedItem.critical_level) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedItem.storage_temperature && (
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <h4 className="font-medium text-sm mb-1 text-blue-800">Storage Temperature</h4>
                      <p className="text-lg font-bold text-blue-600">{selectedItem.storage_temperature}°C</p>
                    </div>
                  )}
                  {(selectedItem.low_level || selectedItem.critical_level) && (
                    <div className="p-3 bg-orange-50 rounded-lg">
                      <h4 className="font-medium text-sm mb-1 text-orange-800">Custom Alert Levels</h4>
                      <p className="text-sm text-orange-600">
                        {selectedItem.low_level && `Low: ${selectedItem.low_level}`}
                        {selectedItem.low_level && selectedItem.critical_level && ', '}
                        {selectedItem.critical_level && `Critical: ${selectedItem.critical_level}`}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}