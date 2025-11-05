import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Package2, Plus, Edit, Trash2, Search, Thermometer, AlertTriangle, Loader2, Package } from "lucide-react";
import { z } from "zod";

interface Item {
  id: string;
  name: string;
  category: string;
  description?: string;
  image_url?: string;
  storage_temperature?: number;
  threshold_level: number;
  low_level?: number;
  critical_level?: number;
  base_unit?: string;
  enable_packaging?: boolean;
  packaging_unit?: string;
  units_per_package?: number;
  branch_id: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

const suppliers = [
  "Gronsakshuset",
  "Kvalitetsfisk",
  "Spendrups",
  "Tingstad",
  "Other"
];

const itemSchema = z.object({
  name: z.string().trim().min(1, "Item name is required").max(100, "Name must be less than 100 characters"),
  category: z.enum(suppliers as [string, ...string[]], {
    required_error: "Supplier is required"
  }),
  description: z.string().max(500, "Description must be less than 500 characters").optional(),
  image_url: z.string().optional().or(z.literal("")),
  storage_temperature: z.string().optional().transform((val) => val ? parseFloat(val) : undefined).pipe(z.number().min(-50, "Temperature must be above -50°C").max(100, "Temperature must be below 100°C").optional()),
  threshold_level: z.string().transform((val) => parseInt(val)).pipe(z.number().min(1, "Threshold must be at least 1").max(10000, "Threshold must be less than 10,000")),
  low_level: z.string().optional().transform((val) => val ? parseInt(val) : undefined).pipe(z.number().min(1, "Low level must be at least 1").max(10000, "Low level must be less than 10,000").optional()),
  critical_level: z.string().optional().transform((val) => val ? parseInt(val) : undefined).pipe(z.number().min(1, "Critical level must be at least 1").max(10000, "Critical level must be less than 10,000").optional())
});

const Items = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    description: "",
    image_url: "",
    storage_temperature: "",
    threshold_level: "",
    low_level: "",
    critical_level: "",
    base_unit: "piece",
    enable_packaging: false,
    packaging_unit: "",
    units_per_package: ""
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");

  // Auto-set branch for regional managers
  useEffect(() => {
    if (profile?.role === 'regional_manager' && profile?.branch_context) {
      setSelectedBranchId(profile.branch_context);
    }
  }, [profile?.branch_context]);

  const fetchItems = async () => {
    try {
      const data = await apiClient.getItems();
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching items:', error);
      toast({
        title: "Error",
        description: "Failed to load items",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsSubmitting(true);
    try {
      // Validate form data using Zod schema
      const validatedData = itemSchema.parse(formData);
      setFormErrors({});
      // Regional and District managers must select a branch if no branch_context
      if ((profile?.role === 'regional_manager' || profile?.role === 'district_manager') && !profile?.branch_context && !selectedBranchId) {
        toast({
          title: "Branch required",
          description: "Please select a branch for this item.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      const itemData = {
        name: validatedData.name.trim(),
        category: validatedData.category,
        description: validatedData.description?.trim() || null,
        image_url: validatedData.image_url?.trim() || null,
        storage_temperature: validatedData.storage_temperature || null,
        threshold_level: validatedData.threshold_level,
        low_level: validatedData.low_level,
        critical_level: validatedData.critical_level,
        base_unit: formData.base_unit || 'piece',
        enable_packaging: formData.enable_packaging || false,
        packaging_unit: formData.enable_packaging ? formData.packaging_unit : null,
        units_per_package: formData.enable_packaging ? (formData.units_per_package ? parseInt(formData.units_per_package) : null) : null,
        branch_id: profile?.role === 'regional_manager' || profile?.role === 'district_manager' 
          ? (profile?.branch_context || selectedBranchId) 
          : profile?.branch_id,
        created_by: profile?.id
      };

      if (selectedItem) {
        // Update existing item
        await apiClient.updateItem(selectedItem.id, itemData);
        toast({
          title: "Success",
          description: "Item updated successfully",
        });
        setIsEditModalOpen(false);
      } else {
        // Create new item
        await apiClient.createItem(itemData);
        toast({
          title: "Success", 
          description: "Item created successfully",
        });
        setIsAddModalOpen(false);
      }

      fetchItems();
      resetForm();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path) {
            errors[err.path[0]] = err.message;
          }
        });
        setFormErrors(errors);
        toast({
          title: "Validation Error",
          description: "Please check the form for errors",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }
      console.error('Error saving item:', error);
      const errMsg = (error as any)?.message || "Failed to save item";
      toast({
        title: "Error",
        description: errMsg,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (itemId: string) => {
    try {
      await apiClient.deleteItem(itemId);
      toast({
        title: "Success",
        description: "Item deleted successfully",
      });
      fetchItems();
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({
        title: "Error",
        description: "Failed to delete item",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      category: "",
      description: "",
      image_url: "",
      storage_temperature: "",
      threshold_level: "",
      low_level: "",
      critical_level: "",
      base_unit: "piece",
      enable_packaging: false,
      packaging_unit: "",
      units_per_package: ""
    });
    setFormErrors({});
    setSelectedItem(null);
  };

  const openEditModal = (item: Item) => {
    setSelectedItem(item);
    setFormData({
      name: item.name,
      category: item.category,
      description: item.description || "",
      image_url: item.image_url || "",
      storage_temperature: item.storage_temperature?.toString() || "",
      threshold_level: item.threshold_level.toString(),
      low_level: item.low_level?.toString() || "",
      critical_level: item.critical_level?.toString() || "",
      base_unit: item.base_unit || "piece",
      enable_packaging: item.enable_packaging || false,
      packaging_unit: item.packaging_unit || "",
      units_per_package: item.units_per_package?.toString() || ""
    });
    setIsEditModalOpen(true);
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const canManageItems = profile?.role === 'regional_manager' || profile?.role === 'district_manager' || profile?.role === 'manager' || profile?.role === 'assistant_manager';

  useEffect(() => {
    if (canManageItems) {
      fetchItems();
      if (profile?.role === 'regional_manager' || profile?.role === 'district_manager') {
        apiClient.getBranches().then((data) => {
          setBranches(data || []);
        }).catch((error) => {
          console.error('Error fetching branches:', error);
        });
      }
    }
  }, [canManageItems, profile?.role]);

  if (!canManageItems) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-muted-foreground">You don't have permission to manage items.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading items...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Manage Items</h1>
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Add New Item
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package2 className="h-5 w-5" />
                Add New Item
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Item Details Section */}
              <div className="space-y-4">
                <div className="border-b pb-2">
                  <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                    <Package2 className="h-4 w-4" />
                    Basic Item Details
                  </h3>
                </div>

                <div>
                  <Label htmlFor="item-name">Item Name *</Label>
                  <Input
                    id="item-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter item name"
                  />
                  {formErrors.name && <p className="text-sm text-red-500 mt-1">{formErrors.name}</p>}
                </div>

                <div>
                  <Label htmlFor="category">Supplier *</Label>
                  <Select onValueChange={(value) => setFormData({ ...formData, category: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier} value={supplier}>
                          {supplier}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formErrors.category && <p className="text-sm text-red-500 mt-1">{formErrors.category}</p>}

                  {/* Branch selection for regional and district managers */}
                  {(profile?.role === 'regional_manager' || profile?.role === 'district_manager') && (
                    <div className="mt-2">
                      {profile?.branch_context ? (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                          <Label className="text-sm font-medium text-blue-800">Branch Assignment</Label>
                          <p className="text-sm text-blue-700 mt-1">
                            Item will be created for your selected branch: <strong>
                              {branches.find(b => b.id === profile.branch_context)?.name || 'Your Selected Branch'}
                            </strong>
                          </p>
                        </div>
                      ) : (
                        <>
                          <Label htmlFor="branch">Branch *</Label>
                          <Select onValueChange={(value) => setSelectedBranchId(value)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select branch" />
                            </SelectTrigger>
                            <SelectContent>
                              {branches.map((b) => (
                                <SelectItem key={b.id} value={b.id}>
                                  {b.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter item description"
                    rows={3}
                  />
                  {formErrors.description && <p className="text-sm text-red-500 mt-1">{formErrors.description}</p>}
                </div>

                <div>
                  <Label htmlFor="image-url">Item Photo</Label>
                  <Input
                    id="image-url"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          setFormData({ ...formData, image_url: event.target?.result as string });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  {formData.image_url && (
                    <div className="mt-2">
                      <img src={formData.image_url} alt="Preview" className="w-16 h-16 object-cover rounded" />
                    </div>
                  )}
                  {formErrors.image_url && <p className="text-sm text-red-500 mt-1">{formErrors.image_url}</p>}
                </div>

                <div>
                  <Label htmlFor="storage-temp">Storage Temperature (°C)</Label>
                  <div className="relative">
                    <Input
                      id="storage-temp"
                      type="number"
                      step="0.1"
                      value={formData.storage_temperature}
                      onChange={(e) => setFormData({ ...formData, storage_temperature: e.target.value })}
                      placeholder="e.g., -18 for frozen"
                    />
                    <Thermometer className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                  </div>
                  {formErrors.storage_temperature && <p className="text-sm text-red-500 mt-1">{formErrors.storage_temperature}</p>}
                </div>
              </div>

              {/* Unit of Measurement Section */}
              <div className="space-y-4">
                <div className="border-b pb-2">
                  <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Unit of Measurement
                  </h3>
                </div>
                
                <div>
                  <Label htmlFor="base_unit">Base Unit *</Label>
                  <Select 
                    value={formData.base_unit} 
                    onValueChange={(value) => setFormData({ ...formData, base_unit: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select base unit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="piece">Piece</SelectItem>
                      <SelectItem value="kg">Kilogram (kg)</SelectItem>
                      <SelectItem value="gram">Gram (g)</SelectItem>
                      <SelectItem value="liter">Liter (L)</SelectItem>
                      <SelectItem value="ml">Milliliter (ml)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    The smallest unit for inventory tracking
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="enable_packaging" 
                    checked={formData.enable_packaging}
                    onCheckedChange={(checked) => setFormData({ ...formData, enable_packaging: checked as boolean })}
                  />
                  <Label htmlFor="enable_packaging" className="cursor-pointer">
                    Track by packages/boxes (e.g., items that arrive in cartons)
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground -mt-2 ml-6">
                  Leave unchecked for items counted individually (e.g., single bottles, loose vegetables)
                </p>

                {formData.enable_packaging && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="packaging_unit">Packaging Unit *</Label>
                        <Select 
                          value={formData.packaging_unit} 
                          onValueChange={(value) => setFormData({ ...formData, packaging_unit: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select packaging unit" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="box">Box</SelectItem>
                            <SelectItem value="carton">Carton</SelectItem>
                            <SelectItem value="case">Case</SelectItem>
                            <SelectItem value="packet">Packet</SelectItem>
                            <SelectItem value="bag">Bag</SelectItem>
                            <SelectItem value="crate">Crate</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="units_per_package">Units per Package *</Label>
                        <Input
                          id="units_per_package"
                          type="number"
                          min="1"
                          value={formData.units_per_package}
                          onChange={(e) => setFormData({ ...formData, units_per_package: e.target.value })}
                          placeholder="e.g., 20"
                        />
                      </div>
                    </div>

                    {formData.packaging_unit && formData.units_per_package && (
                      <Alert className="bg-blue-50 border-blue-200">
                        <AlertDescription className="text-blue-800">
                          <strong>Example:</strong> If you stock in 5 {formData.packaging_unit}s, 
                          the system will automatically add {5 * parseInt(formData.units_per_package || '0')} {formData.base_unit}s to inventory.
                        </AlertDescription>
                      </Alert>
                    )}
                  </>
                )}
              </div>

              {/* Threshold Details Section */}
              <div className="space-y-4">
                <div className="border-b pb-2">
                  <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Threshold Details
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Set stock levels that trigger automatic alerts
                  </p>
                </div>

                <div>
                  <Label htmlFor="threshold">Threshold Level *</Label>
                  <div className="relative">
                    <Input
                      id="threshold"
                      type="number"
                      min="1"
                      value={formData.threshold_level}
                      onChange={(e) => setFormData({ ...formData, threshold_level: e.target.value })}
                      placeholder="e.g., 10"
                    />
                    <AlertTriangle className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Alert will be triggered when stock falls below this level
                  </p>
                  {formErrors.threshold_level && <p className="text-sm text-red-500 mt-1">{formErrors.threshold_level}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="low_level">Low Level Alert (Optional)</Label>
                    <Input
                      id="low_level"
                      type="number"
                      min="1"
                      value={formData.low_level}
                      onChange={(e) => setFormData({ ...formData, low_level: e.target.value })}
                      placeholder="e.g., 5"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Low stock alert threshold (default: 50% of threshold)
                    </p>
                    {formErrors.low_level && <p className="text-sm text-red-500 mt-1">{formErrors.low_level}</p>}
                  </div>

                  <div>
                    <Label htmlFor="critical_level">Critical Level Alert (Optional)</Label>
                    <Input
                      id="critical_level"
                      type="number"
                      min="1"
                      value={formData.critical_level}
                      onChange={(e) => setFormData({ ...formData, critical_level: e.target.value })}
                      placeholder="e.g., 2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Critical stock alert threshold (default: 20% of threshold)
                    </p>
                    {formErrors.critical_level && <p className="text-sm text-red-500 mt-1">{formErrors.critical_level}</p>}
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    "Add Item"
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search Bar */}
      <div className="flex items-center space-x-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search items..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {/* Items Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package2 className="h-5 w-5" />
            Items ({filteredItems.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Storage Temp</TableHead>
                <TableHead>Threshold</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      {item.image_url ? (
                        <img 
                          src={item.image_url} 
                          alt={item.name}
                          className="w-10 h-10 rounded object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                          <Package2 className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Created {new Date(item.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {item.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs">
                      {item.description ? (
                        <p className="text-sm truncate">{item.description}</p>
                      ) : (
                        <span className="text-muted-foreground italic">No description</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {item.storage_temperature ? (
                      <div className="flex items-center gap-1">
                        <Thermometer className="h-4 w-4 text-blue-500" />
                        <span>{item.storage_temperature}°C</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground italic">Not specified</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      <span>{item.threshold_level}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditModal(item)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Item</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{item.name}"? This action cannot be undone and will affect stock records.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(item.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredItems.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? "No items found matching your search." : "No items found. Add your first item to get started."}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Edit Item
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Item Details Section */}
            <div className="space-y-4">
              <div className="border-b pb-2">
                <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <Package2 className="h-4 w-4" />
                  Basic Item Details
                </h3>
              </div>

              <div>
                <Label htmlFor="edit-item-name">Item Name *</Label>
                <Input
                  id="edit-item-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter item name"
                />
                {formErrors.name && <p className="text-sm text-red-500 mt-1">{formErrors.name}</p>}
              </div>

              <div>
                <Label htmlFor="edit-category">Category *</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier} value={supplier}>
                        {supplier}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.category && <p className="text-sm text-red-500 mt-1">{formErrors.category}</p>}
              </div>

              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter item description"
                  rows={3}
                />
                {formErrors.description && <p className="text-sm text-red-500 mt-1">{formErrors.description}</p>}
              </div>

              <div>
                <Label htmlFor="edit-image-url">Item Photo</Label>
                <Input
                  id="edit-image-url"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        setFormData({ ...formData, image_url: event.target?.result as string });
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
                {formData.image_url && (
                  <div className="mt-2">
                    <img src={formData.image_url} alt="Preview" className="w-16 h-16 object-cover rounded" />
                  </div>
                )}
                {formErrors.image_url && <p className="text-sm text-red-500 mt-1">{formErrors.image_url}</p>}
              </div>

              <div>
                <Label htmlFor="edit-storage-temp">Storage Temperature (°C)</Label>
                <div className="relative">
                  <Input
                    id="edit-storage-temp"
                    type="number"
                    step="0.1"
                    value={formData.storage_temperature}
                    onChange={(e) => setFormData({ ...formData, storage_temperature: e.target.value })}
                    placeholder="e.g., -18 for frozen"
                  />
                  <Thermometer className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                </div>
                {formErrors.storage_temperature && <p className="text-sm text-red-500 mt-1">{formErrors.storage_temperature}</p>}
              </div>
            </div>

            {/* Unit of Measurement Section */}
            <div className="space-y-4">
              <div className="border-b pb-2">
                <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Unit of Measurement
                </h3>
              </div>
              
              <div>
                <Label htmlFor="edit-base-unit">Base Unit *</Label>
                <Select 
                  value={formData.base_unit} 
                  onValueChange={(value) => setFormData({ ...formData, base_unit: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select base unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="piece">Piece</SelectItem>
                    <SelectItem value="kg">Kilogram (kg)</SelectItem>
                    <SelectItem value="gram">Gram (g)</SelectItem>
                    <SelectItem value="liter">Liter (L)</SelectItem>
                    <SelectItem value="ml">Milliliter (ml)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  The smallest unit for inventory tracking
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="edit-enable-packaging" 
                  checked={formData.enable_packaging}
                  onCheckedChange={(checked) => setFormData({ ...formData, enable_packaging: checked as boolean })}
                />
                <Label htmlFor="edit-enable-packaging" className="cursor-pointer">
                  Track by packages/boxes (e.g., items that arrive in cartons)
                </Label>
              </div>
              <p className="text-xs text-muted-foreground -mt-2 ml-6">
                Leave unchecked for items counted individually (e.g., single bottles, loose vegetables)
              </p>

              {formData.enable_packaging && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit-packaging-unit">Packaging Unit *</Label>
                      <Select 
                        value={formData.packaging_unit} 
                        onValueChange={(value) => setFormData({ ...formData, packaging_unit: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select packaging unit" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="box">Box</SelectItem>
                          <SelectItem value="carton">Carton</SelectItem>
                          <SelectItem value="case">Case</SelectItem>
                          <SelectItem value="packet">Packet</SelectItem>
                          <SelectItem value="bag">Bag</SelectItem>
                          <SelectItem value="crate">Crate</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="edit-units-per-package">Units per Package *</Label>
                      <Input
                        id="edit-units-per-package"
                        type="number"
                        min="1"
                        value={formData.units_per_package}
                        onChange={(e) => setFormData({ ...formData, units_per_package: e.target.value })}
                        placeholder="e.g., 20"
                      />
                    </div>
                  </div>

                  {formData.packaging_unit && formData.units_per_package && (
                    <Alert className="bg-blue-50 border-blue-200">
                      <AlertDescription className="text-blue-800">
                        <strong>Example:</strong> If you stock in 5 {formData.packaging_unit}s, 
                        the system will automatically add {5 * parseInt(formData.units_per_package || '0')} {formData.base_unit}s to inventory.
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              )}
            </div>

            {/* Threshold Details Section */}
            <div className="space-y-4">
              <div className="border-b pb-2">
                <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Threshold Details
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Set stock levels that trigger automatic alerts
                </p>
              </div>

              <div>
                <Label htmlFor="edit-threshold">Threshold Level *</Label>
                <div className="relative">
                  <Input
                    id="edit-threshold"
                    type="number"
                    min="1"
                    value={formData.threshold_level}
                    onChange={(e) => setFormData({ ...formData, threshold_level: e.target.value })}
                    placeholder="e.g., 10"
                  />
                  <AlertTriangle className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Alert will be triggered when stock falls below this level
                </p>
                {formErrors.threshold_level && <p className="text-sm text-red-500 mt-1">{formErrors.threshold_level}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-low-level">Low Level Alert (Optional)</Label>
                  <Input
                    id="edit-low-level"
                    type="number"
                    min="1"
                    value={formData.low_level}
                    onChange={(e) => setFormData({ ...formData, low_level: e.target.value })}
                    placeholder="e.g., 5"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Low stock alert threshold (default: 50% of threshold)
                  </p>
                  {formErrors.low_level && <p className="text-sm text-red-500 mt-1">{formErrors.low_level}</p>}
                </div>

                <div>
                  <Label htmlFor="edit-critical-level">Critical Level Alert (Optional)</Label>
                  <Input
                    id="edit-critical-level"
                    type="number"
                    min="1"
                    value={formData.critical_level}
                    onChange={(e) => setFormData({ ...formData, critical_level: e.target.value })}
                    placeholder="e.g., 2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Critical stock alert threshold (default: 20% of threshold)
                  </p>
                  {formErrors.critical_level && <p className="text-sm text-red-500 mt-1">{formErrors.critical_level}</p>}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Item"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Items;