import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from "@/lib/api";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { Edit, Trash2, Plus, Loader2 } from 'lucide-react';
import { z } from 'zod';

interface Branch {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  region_id: string;
  district_id: string;
  created_at: string;
  region: {
    name: string;
  };
  district: {
    name: string;
  };
}

interface Region {
  id: string;
  name: string;
}

interface District {
  id: string;
  name: string;
  region_id: string;
}

const branchSchema = z.object({
  name: z.string().trim().min(1, "Branch name is required").max(100, "Branch name must be less than 100 characters"),
  description: z.string().max(500, "Description must be less than 500 characters").optional().or(z.literal("")),
  location: z.string().max(200, "Location must be less than 200 characters").optional().or(z.literal("")),
  region_id: z.string().min(1, "Region selection is required"),
  district_id: z.string().min(1, "District selection is required")
});

export default function BranchManagement() {
  const { profile } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [filteredDistricts, setFilteredDistricts] = useState<District[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [branchToDelete, setBranchToDelete] = useState<Branch | null>(null);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
    region_id: '',
    district_id: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedRegionId, setSelectedRegionId] = useState<string>('');
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>('');

  // Handle district selection change for regional managers
  const handleDistrictChange = async (districtId: string) => {
    setSelectedDistrictId(districtId);
    if (districtId) {
      try {
        const districtBranches = await apiClient.getBranches(districtId);
        setBranches(districtBranches || []);
      } catch (error) {
        console.error('Error fetching branches for district:', error);
        toast({
          title: "Error",
          description: "Failed to load branches for selected district",
          variant: "destructive"
        });
      }
    } else {
      setBranches([]);
    }
  };

  useEffect(() => {
    if ((profile?.role as string) === 'admin') {
      fetchBranches();
      fetchRegions();
      fetchDistricts();
    } else if ((profile?.role as string) === 'regional_manager') {
      fetchRegionalManagerData();
    }
  }, [profile]);

  // Watch for changes in branch_context for regional managers
  useEffect(() => {
    if ((profile?.role as string) === 'regional_manager' && profile?.branch_context) {
      fetchRegionalManagerData();
    }
  }, [profile?.branch_context]);

  useEffect(() => {
    if (formData.region_id) {
      const regionDistricts = districts.filter(d => d.region_id === formData.region_id);
      setFilteredDistricts(regionDistricts);
      // Clear district selection if current district doesn't belong to selected region
      if (formData.district_id && !regionDistricts.find(d => d.id === formData.district_id)) {
        setFormData(prev => ({ ...prev, district_id: '' }));
      }
    } else {
      setFilteredDistricts([]);
      setFormData(prev => ({ ...prev, district_id: '' }));
    }
  }, [formData.region_id, districts]);

  const fetchBranches = async () => {
    try {
      const data = await apiClient.getBranches();
      setBranches(data || []);
    } catch (error) {
      console.error('Error fetching branches:', error);
      toast({
        title: "Error",
        description: "Failed to fetch branches",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRegions = async () => {
    try {
      const data = await apiClient.getRegions();
      setRegions(data || []);
    } catch (error) {
      console.error('Error fetching regions:', error);
    }
  };

  const fetchDistricts = async () => {
    try {
      const data = await apiClient.getDistricts();
      setDistricts(data || []);
    } catch (error) {
      console.error('Error fetching districts:', error);
    }
  };

  const fetchRegionalManagerData = async () => {
    try {
      // Get the regional manager's profile to get their branch_context
      const profileData = await apiClient.getProfile();
      if (profileData?.branch_context) {
        // Get the branch details to find region and district
        const branches = await apiClient.getBranches();
        const selectedBranch = branches.find(b => b.id === profileData.branch_context);
        
        if (selectedBranch) {
          setSelectedRegionId(selectedBranch.region_id);
          setSelectedDistrictId(selectedBranch.district_id);
          
          // Set form data with pre-selected values
          setFormData(prev => ({
            ...prev,
            region_id: selectedBranch.region_id,
            district_id: selectedBranch.district_id
          }));
          
          // Fetch all regions and districts for the dropdowns
          const regionsData = await apiClient.getRegions();
          const districtsData = await apiClient.getDistricts();
          setRegions(regionsData || []);
          setDistricts(districtsData || []);
          
          // Filter districts for the selected region
          const regionDistricts = districtsData.filter(d => d.region_id === selectedBranch.region_id);
          setFilteredDistricts(regionDistricts);
          
          // Fetch branches for the selected district
          const districtBranches = await apiClient.getBranches(selectedBranch.district_id);
          setBranches(districtBranches || []);
        }
      }
    } catch (error) {
      console.error('Error fetching regional manager data:', error);
      toast({
        title: "Error",
        description: "Failed to load branch management data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    try {
      // For regional managers, create a modified schema that doesn't require region_id and district_id
      // since they're pre-selected and disabled
      if (profile?.role === 'regional_manager') {
        const regionalManagerSchema = z.object({
          name: z.string().trim().min(1, "Branch name is required").max(100, "Branch name must be less than 100 characters"),
          description: z.string().max(500, "Description must be less than 500 characters").optional().or(z.literal("")),
          location: z.string().max(200, "Location must be less than 200 characters").optional().or(z.literal("")),
          region_id: z.string().optional(), // Make optional for regional managers
          district_id: z.string().optional() // Make optional for regional managers
        });
        regionalManagerSchema.parse(formData);
      } else {
        branchSchema.parse(formData);
      }
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const branchData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        location: formData.location.trim() || null,
        region_id: profile?.role === 'regional_manager' ? selectedRegionId : (formData.region_id || null),
        district_id: profile?.role === 'regional_manager' ? selectedDistrictId : (formData.district_id || null)
      };

      console.log('🔍 Branch data being sent:', branchData);

      if (editingBranch) {
        await apiClient.updateBranch(editingBranch.id, branchData);
        toast({
          title: "Success",
          description: "Branch updated successfully"
        });
      } else {
        await apiClient.createBranch(branchData);
        toast({
          title: "Success",
          description: "Branch created successfully"
        });
      }

      resetForm();
      fetchBranches();
    } catch (error) {
      console.error('Error saving branch:', error);
      const message = (error as any)?.message || 'Failed to save branch';
      toast({
        title: "Error",
        description: message,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!branchToDelete) return;

    try {
      await apiClient.deleteBranch(branchToDelete.id);
      
      toast({
        title: "Success",
        description: "Branch deleted successfully"
      });
      fetchBranches();
      setIsDeleteDialogOpen(false);
      setBranchToDelete(null);
    } catch (error: any) {
      console.error('Error deleting branch:', error);
      const errorMessage = error?.response?.data?.error || error?.message || 'Failed to delete branch';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const openDeleteDialog = (branch: Branch) => {
    setBranchToDelete(branch);
    setIsDeleteDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      location: '',
      region_id: '',
      district_id: ''
    });
    setEditingBranch(null);
    setIsModalOpen(false);
    setErrors({});
  };

  const openEditModal = (branch: Branch) => {
    setFormData({
      name: branch.name,
      description: branch.description || '',
      location: branch.location || '',
      region_id: branch.region_id,
      district_id: branch.district_id
    });
    setEditingBranch(branch);
    setIsModalOpen(true);
  };

  const filteredBranches = branches.filter(branch =>
    branch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    branch.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    branch.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    branch.region?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    branch.district?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if ((profile?.role as string) !== 'admin' && (profile?.role as string) !== 'regional_manager') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
          <p>You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Branch Management</h1>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              if (profile?.role === 'regional_manager') {
                // For regional managers, preserve the pre-selected region and district
                setFormData({ 
                  name: '', 
                  description: '', 
                  location: '', 
                  region_id: selectedRegionId, 
                  district_id: selectedDistrictId 
                });
              } else {
                // For admins, reset all fields
                setFormData({ name: '', description: '', location: '', region_id: '', district_id: '' });
              }
              setEditingBranch(null);
              setErrors({});
              setIsModalOpen(true);
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Add Branch
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingBranch ? 'Edit Branch' : 'Add New Branch'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="region">Region *</Label>
                <Select
                  value={formData.region_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, region_id: value }))}
                  disabled={profile?.role === 'regional_manager'}
                >
                  <SelectTrigger className={errors.region_id ? "border-destructive" : ""}>
                    <SelectValue placeholder="Select region" />
                  </SelectTrigger>
                  <SelectContent>
                    {regions.map((region) => (
                      <SelectItem key={region.id} value={region.id}>
                        {region.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.region_id && <p className="text-sm text-destructive mt-1">{errors.region_id}</p>}
                {profile?.role === 'regional_manager' && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Region is pre-selected based on your branch context
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="district">District *</Label>
                <Select
                  value={formData.district_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, district_id: value }))}
                  disabled={!formData.region_id || profile?.role === 'regional_manager'}
                >
                  <SelectTrigger className={errors.district_id ? "border-destructive" : ""}>
                    <SelectValue placeholder="Select district" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredDistricts.map((district) => (
                      <SelectItem key={district.id} value={district.id}>
                        {district.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.district_id && <p className="text-sm text-destructive mt-1">{errors.district_id}</p>}
                {profile?.role === 'regional_manager' && (
                  <p className="text-sm text-muted-foreground mt-1">
                    District is pre-selected based on your branch context
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="name">Branch Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className={errors.name ? "border-destructive" : ""}
                />
                {errors.name && <p className="text-sm text-destructive mt-1">{errors.name}</p>}
              </div>

              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  className={errors.location ? "border-destructive" : ""}
                />
                {errors.location && <p className="text-sm text-destructive mt-1">{errors.location}</p>}
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className={errors.description ? "border-destructive" : ""}
                />
                {errors.description && <p className="text-sm text-destructive mt-1">{errors.description}</p>}
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {editingBranch ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    `${editingBranch ? 'Update' : 'Create'} Branch`
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-4">
        <Input
          placeholder="Search branches..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Branch Name</TableHead>
              <TableHead>Region</TableHead>
              <TableHead>District</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBranches.map((branch) => (
              <TableRow key={branch.id}>
                <TableCell className="font-medium">{branch.name}</TableCell>
                <TableCell>{branch.region?.name || 'No Region'}</TableCell>
                <TableCell>{branch.district?.name || 'No District'}</TableCell>
                <TableCell>{branch.location || '-'}</TableCell>
                <TableCell>{branch.description || '-'}</TableCell>
                <TableCell>{new Date(branch.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal(branch)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDeleteDialog(branch)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Branch</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{branchToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}