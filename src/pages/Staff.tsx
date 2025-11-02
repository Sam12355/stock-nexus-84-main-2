import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ReactSelect from "react-select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Users, Plus, Edit, Trash2, Search, UserPlus, Loader2 } from "lucide-react";
import { z } from "zod";

interface StaffMember {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone?: string;
  photo_url?: string;
  position?: string;
  role: 'regional_manager' | 'district_manager' | 'manager' | 'assistant_manager' | 'staff';
  branch_id?: string;
  region_id?: string;
  district_id?: string;
  district_name?: string;
  last_access?: string;
  access_count: number;
  created_at: string;
  updated_at: string;
}

const staffSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  email: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters"),
  phone: z.string().optional(),
  position: z.string().optional(),
  role: z.enum(['regional_manager', 'district_manager', 'manager', 'assistant_manager', 'staff'], {
    required_error: "Role is required"
  }).or(z.literal("")).refine((val) => val !== "", {
    message: "Role is required"
  }),
  photo_url: z.string().url().optional().or(z.literal("")),
  // Allow empty string to keep current password during edits
  password: z.union([z.literal(""), z.string().min(6, "Password must be at least 6 characters")])
});

const Staff = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    position: "",
    role: "" as 'regional_manager' | 'district_manager' | 'manager' | 'assistant_manager' | 'staff' | '',
    photo_url: "",
    password: ""
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [regions, setRegions] = useState<{ id: string; name: string }[]>([]);
  const [districts, setDistricts] = useState<{ id: string; name: string; region_id: string }[]>([]);
  const [branches, setBranches] = useState<{ id: string; name: string; region_id: string; district_id: string }[]>([]);
  const [filteredDistricts, setFilteredDistricts] = useState<{ id: string; name: string; region_id: string }[]>([]);
  const [filteredBranches, setFilteredBranches] = useState<{ id: string; name: string; region_id: string; district_id: string }[]>([]);
  const [selectedRegionId, setSelectedRegionId] = useState<string>("");
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>("");
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [currentDistrictId, setCurrentDistrictId] = useState<string | null>(null);
  const [hasDistrictManager, setHasDistrictManager] = useState(false);
  const [hasAssistantManager, setHasAssistantManager] = useState(false);
  const [hasManager, setHasManager] = useState(false);
  const [branchManagers, setBranchManagers] = useState<{manager?: string, assistant_manager?: string}>({});

  const roleOptions = [
    { value: 'regional_manager', label: 'Regional Manager' },
    { value: 'district_manager', label: 'District Manager' },
    { value: 'manager', label: 'Manager' },
    { value: 'assistant_manager', label: 'Assistant Manager' },
    { value: 'staff', label: 'Staff' },
  ];

  const allowedRolesByCreator: Record<string, Array<StaffMember['role']>> = {
    admin: ['manager','assistant_manager','staff'],
    regional_manager: ['district_manager','manager','assistant_manager','staff'],
    district_manager: ['manager','assistant_manager','staff'],
    manager: ['assistant_manager','staff'],
    assistant_manager: ['staff'],
    staff: []
  };

  const allowedRoleValues = allowedRolesByCreator[profile?.role as string] || [];
  const allowedRoleOptions = roleOptions.filter((o) => (allowedRoleValues as string[]).includes(o.value));

  const regionOptions = regions.map(r => ({ value: r.id, label: r.name }));
  const districtOptions = filteredDistricts.map(d => ({ value: d.id, label: d.name }));
  const branchOptions = filteredBranches.map(b => ({ value: b.id, label: b.name }));

  // Filter districts and branches based on user role and selection
  useEffect(() => {
    if (selectedRegionId) {
      const regionDistricts = districts.filter(d => d.region_id === selectedRegionId);
      setFilteredDistricts(regionDistricts);
      // Clear district selection if current district doesn't belong to selected region
      if (selectedDistrictId && !regionDistricts.find(d => d.id === selectedDistrictId)) {
        setSelectedDistrictId('');
      }

      // Filter branches based on user role
      let regionBranches = branches.filter(b => b.region_id === selectedRegionId);
      if (selectedDistrictId) {
        regionBranches = regionBranches.filter(b => b.district_id === selectedDistrictId);
      }
      setFilteredBranches(regionBranches);
    } else {
      setFilteredDistricts([]);
      setFilteredBranches([]);
      setSelectedDistrictId('');
      setSelectedBranchId('');
    }
  }, [selectedRegionId, selectedDistrictId, districts, branches]);

  // Filter branches based on user role when no region is selected
  useEffect(() => {
    const userRole = profile?.role as string;
    
    if (userRole === 'admin') {
      // Admin can assign any branch
      setFilteredBranches(branches);
    } else if (userRole === 'district_manager') {
      // District manager can only assign branches in their district
      const userDistrictId = profile?.district_id;
      if (userDistrictId) {
        const districtBranches = branches.filter(b => b.district_id === userDistrictId);
        setFilteredBranches(districtBranches);
      }
    } else if (userRole === 'regional_manager') {
      // Regional manager can assign branches in their region
      const userRegionId = profile?.region_id;
      if (userRegionId) {
        const regionBranches = branches.filter(b => b.region_id === userRegionId);
        setFilteredBranches(regionBranches);
      }
    }
  }, [profile, branches]);

  // Get district ID and branch ID from branch context for regional managers
  useEffect(() => {
    if (profile?.role === 'regional_manager' && profile?.branch_context) {
      // Find the branch to get its district_id
      const branch = branches.find(b => b.id === profile.branch_context);
      if (branch) {
        setCurrentDistrictId(branch.district_id);
        // Auto-set the selected branch for regional managers
        setSelectedBranchId(profile.branch_context);
      }
    }
  }, [profile, branches]);

  // Check if district manager is already assigned
  useEffect(() => {
    const checkDistrictManager = async () => {
      if (currentDistrictId) {
        try {
          const assignedManagers = await apiClient.getAssignedDistrictManagers();
          const hasManager = assignedManagers.some(managerId => {
            // Check if any staff member with this district_id has role 'district_manager'
            return staffMembers.some(staff => 
              staff.district_id === currentDistrictId && staff.role === 'district_manager'
            );
          });
          setHasDistrictManager(hasManager);
        } catch (error) {
          console.error('Error checking district manager assignment:', error);
        }
      }
    };
    
    checkDistrictManager();
  }, [currentDistrictId, staffMembers]);

  // Check if assistant manager is already assigned to manager's branch
  useEffect(() => {
    const checkAssistantManager = () => {
      if (profile?.role === 'manager' && profile?.branch_id) {
        const hasAssistant = staffMembers.some(staff => 
          staff.branch_id === profile.branch_id && staff.role === 'assistant_manager'
        );
        setHasAssistantManager(hasAssistant);
      }
    };
    
    checkAssistantManager();
  }, [profile, staffMembers]);

  // Check branch managers when branch selection changes
  useEffect(() => {
    if (selectedBranchId && staffMembers.length > 0) {
      checkBranchManagers(selectedBranchId);
    }
  }, [selectedBranchId, staffMembers]);

  const selectStyles: any = {
    container: (base: any) => ({ ...base, zIndex: 999999 }),
    menuPortal: (base: any) => ({ ...base, zIndex: 999999, pointerEvents: 'auto' }),
    menu: (base: any) => ({ ...base, zIndex: 999999, backgroundColor: 'hsl(var(--popover))', color: 'hsl(var(--popover-foreground))' }),
    menuList: (base: any) => ({ ...base, zIndex: 999999 }),
    control: (base: any, state: any) => ({
      ...base,
      backgroundColor: 'hsl(var(--background))',
      borderColor: state.isFocused ? 'hsl(var(--ring))' : 'hsl(var(--input))',
      boxShadow: state.isFocused ? '0 0 0 1px hsl(var(--ring))' : 'none'
    }),
    option: (base: any, state: any) => ({
      ...base,
      backgroundColor: state.isFocused ? 'hsl(var(--accent))' : 'hsl(var(--popover))',
      color: 'hsl(var(--popover-foreground))'
    })
  };

  const fetchStaffMembers = async () => {
    setLoading(true);
    try {
      const data = await apiClient.getStaff();
      setStaffMembers(data || []);
    } catch (error) {
      console.error('Error fetching staff members:', error);
      toast({
        title: "Error",
        description: "Failed to fetch staff members",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const checkBranchManagers = async (branchId: string) => {
    if (!branchId) {
      setBranchManagers({});
      setHasManager(false);
      setHasAssistantManager(false);
      return;
    }

    try {
      // Check existing managers and assistant managers in this branch
      const existingManagers = staffMembers.filter(staff => 
        staff.branch_id === branchId && 
        (staff.role === 'manager' || staff.role === 'assistant_manager')
      );

      const manager = existingManagers.find(staff => staff.role === 'manager');
      const assistantManager = existingManagers.find(staff => staff.role === 'assistant_manager');

      setBranchManagers({
        manager: manager?.id,
        assistant_manager: assistantManager?.id
      });
      setHasManager(!!manager);
      setHasAssistantManager(!!assistantManager);
    } catch (error) {
      console.error('Error checking branch managers:', error);
    }
  };

  const validateForm = () => {
    try {
      staffSchema.parse(formData);
      setFormErrors({});
      
      // Additional custom validation
      if (formData.role === 'district_manager' && profile?.role === 'regional_manager') {
        if (!currentDistrictId) {
          toast({
            title: "Validation Error",
            description: "Please complete the district and branch selection first",
            variant: "destructive",
          });
          return false;
        }
        // Only check for existing district manager when creating new staff, not when editing
        if (!selectedStaff && hasDistrictManager) {
          toast({
            title: "Validation Error",
            description: "A district manager is already assigned to this district",
            variant: "destructive",
          });
          return false;
        }
      }

      // For regional managers adding staff members, ensure branch is selected
      if (profile?.role === 'regional_manager' && ['manager', 'assistant_manager', 'staff'].includes(formData.role)) {
        if (!profile?.branch_context) {
          toast({
            title: "Validation Error",
            description: "Please complete the branch selection first",
            variant: "destructive",
          });
          return false;
        }
      }

      // For managers adding staff members, ensure they have a branch assigned
      if (profile?.role === 'manager' && ['assistant_manager', 'staff'].includes(formData.role)) {
        if (!profile?.branch_id) {
          toast({
            title: "Validation Error",
            description: "You must be assigned to a branch to create staff members",
            variant: "destructive",
          });
          return false;
        }
      }

      // For admin users, require branch selection for staff, manager, and assistant_manager roles
      if (profile?.role === 'admin' && ['staff', 'manager', 'assistant_manager'].includes(formData.role)) {
        if (!selectedBranchId) {
          toast({
            title: "Validation Error",
            description: "Please select a branch first",
            variant: "destructive",
          });
          return false;
        }
      }
      
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path) {
            errors[err.path[0]] = err.message;
          }
        });
        setFormErrors(errors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const staffData: any = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || null,
        position: formData.position.trim() || null,
        role: formData.role,
        photo_url: formData.photo_url.trim() || null,
        password: formData.password || undefined
      };

      // Only add branch_id for roles that require it
      if (['staff', 'assistant_manager', 'manager'].includes(formData.role)) {
        // For regional managers, use their selected branch context
        if (profile?.role === 'regional_manager' && profile?.branch_context) {
          staffData.branch_id = profile.branch_context;
        } else if (profile?.role === 'manager' && profile?.branch_id) {
          // For managers, use their own branch
          staffData.branch_id = profile.branch_id;
        } else {
          staffData.branch_id = selectedBranchId || null;
        }
      }

      // Add region_id for regional managers
      if (formData.role === 'regional_manager') {
        staffData.region_id = selectedRegionId || null;
      }

      // Add district_id for district managers
      if (formData.role === 'district_manager') {
        if (selectedStaff) {
          // For editing existing district managers
          if (profile?.role === 'regional_manager') {
            // Regional managers cannot change district assignment - keep original
            staffData.district_id = selectedStaff.district_id;
          } else {
            // Admin can change district assignment
            staffData.district_id = selectedDistrictId || null;
          }
        } else {
          // For creating new district managers
          if (profile?.role === 'regional_manager' && currentDistrictId) {
            staffData.district_id = currentDistrictId;
          } else {
            staffData.district_id = selectedDistrictId || null;
          }
        }
      }

      if (selectedStaff) {
        // Update existing staff member
        await apiClient.updateStaff(selectedStaff.id, staffData);
        toast({
          title: "Success",
          description: "Staff member updated successfully",
        });
        setIsEditModalOpen(false);
      } else {
        // Create new staff member
        await apiClient.createStaff(staffData);
        toast({
          title: "Success",
          description: "Staff member created successfully",
        });
        setIsAddModalOpen(false);
      }

      fetchStaffMembers();
      resetForm();
    } catch (error) {
      console.error('Error saving staff member:', error);
      toast({
        title: "Error",
        description: "Failed to save staff member",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (staffId: string) => {
    try {
      await apiClient.deleteStaff(staffId);
      
      toast({
        title: "Success",
        description: "Staff member deleted successfully",
      });
      fetchStaffMembers();
    } catch (error) {
      console.error('Error deleting staff member:', error);
      toast({
        title: "Error",
        description: "Failed to delete staff member",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      position: "",
      role: "" as 'regional_manager' | 'district_manager' | 'manager' | 'assistant_manager' | 'staff' | '',
      photo_url: "",
      password: ""
    });
    setFormErrors({});
    setSelectedStaff(null);
    setSelectedRegionId('');
    setSelectedDistrictId('');
    setSelectedBranchId('');
  };

  const openEditModal = (staff: StaffMember) => {
    setSelectedStaff(staff);
    setSelectedRegionId(staff.region_id || "");
    setSelectedDistrictId(staff.district_id || "");
    
    // For regional managers, use their branch context if the staff member is in their branch
    if (profile?.role === 'regional_manager' && profile?.branch_context) {
      setSelectedBranchId(profile.branch_context);
    } else if (profile?.role === 'manager' && profile?.branch_id) {
      // For managers, use their own branch
      setSelectedBranchId(profile.branch_id);
    } else {
      setSelectedBranchId(staff.branch_id || "");
    }
    
    setFormData({
      name: staff.name,
      email: staff.email,
      phone: staff.phone || "",
      position: staff.position || "",
      role: staff.role,
      photo_url: staff.photo_url || "",
      password: ""
    });
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  const filteredStaff = staffMembers.filter(staff =>
    staff.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    staff.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    staff.position?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    staff.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const canManageStaff = profile && ['admin', 'regional_manager', 'district_manager', 'manager', 'assistant_manager'].includes(profile.role);

  useEffect(() => {
    if (canManageStaff) {
      fetchStaffMembers();
      fetchRegions();
      fetchDistricts();
      fetchBranches();
    }
  }, [canManageStaff, profile?.role]);

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

  const fetchBranches = async () => {
    try {
      const data = await apiClient.getBranches();
      setBranches(data || []);
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  if (!canManageStaff) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-muted-foreground">You don't have permission to manage staff.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading staff members...</div>;
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Manage Staff</h1>
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Add Staff Member
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Add New Staff Member
              </DialogTitle>
            </DialogHeader>
            <div className="max-h-[calc(90vh-120px)] overflow-y-auto">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Hidden fields to prevent autofill */}
                <div style={{ display: 'none' }}>
                  <input type="text" name="fake-username" autoComplete="username" />
                  <input type="password" name="fake-password" autoComplete="current-password" />
                </div>
                
                {/* Basic Info Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter full name"
                    />
                    {formErrors.name && <p className="text-sm text-red-500 mt-1">{formErrors.name}</p>}
                  </div>

                  <div>
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="Enter email address"
                    />
                    {formErrors.email && <p className="text-sm text-red-500 mt-1">{formErrors.email}</p>}
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="Enter phone number"
                    />
                    {formErrors.phone && <p className="text-sm text-red-500 mt-1">{formErrors.phone}</p>}
                  </div>

                  <div>
                    <Label htmlFor="position">Position</Label>
                    <Input
                      id="position"
                      value={formData.position}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                      placeholder="e.g., Warehouse Assistant"
                    />
                    {formErrors.position && <p className="text-sm text-red-500 mt-1">{formErrors.position}</p>}
                  </div>
                </div>

                {/* Branch Selection First */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="branch">Branch *</Label>
                    <ReactSelect
                      inputId="branch"
                      classNamePrefix="rs"
                      options={branchOptions}
                      value={branchOptions.find(o => o.value === selectedBranchId) || null}
                      onChange={(opt) => {
                        const val = (opt as any)?.value;
                        setSelectedBranchId(val);
                        // Clear role selection when branch changes
                        setFormData({ ...formData, role: '' });
                      }}
                      styles={selectStyles}
                      menuPortalTarget={document.body}
                      menuPosition="fixed"
                      menuShouldBlockScroll
                      placeholder="Select branch first"
                      autoComplete="off"
                      isSearchable={false}
                    />
                    {!selectedBranchId && (
                      <p className="text-sm text-gray-600 mt-1">
                        Please select a branch first to see available roles.
                      </p>
                    )}
                  </div>

                  {/* Role Selection - Only show after branch is selected */}
                  {selectedBranchId && (
                    <div>
                      <Label htmlFor="role">Role *</Label>
                      <ReactSelect
                        inputId="role"
                        classNamePrefix="rs"
                        options={profile?.role === 'manager' ? 
                          // For managers, filter to only show Assistant Manager and Staff
                          allowedRoleOptions.filter(option => 
                            option.value === 'staff' || 
                            (option.value === 'assistant_manager' && !hasAssistantManager)
                          ) : 
                          profile?.role === 'admin' ?
                          // For admin, filter based on branch assignments
                          allowedRoleOptions.filter(option => {
                            if (option.value === 'staff') return true;
                            if (option.value === 'manager') return !hasManager || (selectedStaff && branchManagers.manager === selectedStaff.id);
                            if (option.value === 'assistant_manager') return !hasAssistantManager || (selectedStaff && branchManagers.assistant_manager === selectedStaff.id);
                            return false;
                          }) :
                          allowedRoleOptions
                        }
                        value={formData.role ? roleOptions.find(o => o.value === formData.role) : null}
                        onChange={(opt) => {
                          const val = (opt as any)?.value;
                          setFormData({ ...formData, role: val });
                        }}
                        styles={selectStyles}
                        menuPortalTarget={document.body}
                        menuPosition="fixed"
                        menuShouldBlockScroll
                        placeholder="Select role"
                      />
                      {formErrors.role && <p className="text-sm text-red-500 mt-1">{formErrors.role}</p>}
                    </div>
                  )}

                  {/* Regional Manager role selection */}
                  {formData.role === 'regional_manager' && (
                    <div>
                      <Label htmlFor="region">Region *</Label>
                      <ReactSelect
                        inputId="region"
                        classNamePrefix="rs"
                        options={regionOptions}
                        value={regionOptions.find(o => o.value === selectedRegionId) || null}
                        onChange={(opt) => setSelectedRegionId((opt as any)?.value || '')}
                        styles={selectStyles}
                        menuPortalTarget={document.body}
                        menuPosition="fixed"
                        menuShouldBlockScroll
                        placeholder="Select region"
                      />
                    </div>
                  )}

                  {/* District Manager role selection - only show district selection */}
                  {formData.role === 'district_manager' && (profile?.role as string) === 'admin' && (
                    <>
                      <div>
                        <Label htmlFor="region">Region *</Label>
                        <ReactSelect
                          inputId="region"
                          classNamePrefix="rs"
                          options={regionOptions}
                          value={regionOptions.find(o => o.value === selectedRegionId) || null}
                          onChange={(opt) => setSelectedRegionId((opt as any)?.value || '')}
                          styles={selectStyles}
                          menuPortalTarget={document.body}
                          menuPosition="fixed"
                          menuShouldBlockScroll
                          placeholder="Select region"
                        />
                      </div>
                      <div>
                        <Label htmlFor="district">District *</Label>
                        <ReactSelect
                          inputId="district"
                          classNamePrefix="rs"
                          options={districtOptions}
                          value={districtOptions.find(o => o.value === selectedDistrictId) || null}
                          onChange={(opt) => setSelectedDistrictId((opt as any)?.value || '')}
                          styles={selectStyles}
                          menuPortalTarget={document.body}
                          menuPosition="fixed"
                          menuShouldBlockScroll
                          placeholder="Select district"
                          isDisabled={!selectedRegionId}
                        />
                      </div>
                    </>
                  )}

                  {/* Regional Manager creating District Manager */}
                  {(profile?.role as string) === 'regional_manager' && formData.role === 'district_manager' && (
                    <div>
                      {hasDistrictManager ? (
                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                          <p className="text-sm text-yellow-800">
                            A district manager is already assigned to this district. 
                            You can only have one district manager per district.
                          </p>
                        </div>
                      ) : currentDistrictId ? (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                          <p className="text-sm text-blue-800">
                            District will be automatically assigned based on your current selection.
                          </p>
                        </div>
                      ) : (
                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                          <p className="text-sm text-gray-600">
                            Please complete the district and branch selection first.
                          </p>
                        </div>
                      )}
                    </div>
                  )}


                </div>


                {/* Security and Photo Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Password field for all creators except staff */}
                  {profile?.role !== 'staff' && (
                    <div>
                      <Label htmlFor="password">Password *</Label>
                      <Input
                        id="password"
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="Enter password for new user"
                        autoComplete="new-password"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck="false"
                      />
                      {formErrors.password && <p className="text-sm text-red-500 mt-1">{formErrors.password}</p>}
                    </div>
                  )}

                  <div>
                    <Label htmlFor="photo_url">Staff Photo URL (Optional)</Label>
                    <Input
                      id="photo_url"
                      type="url"
                      value={formData.photo_url}
                      onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })}
                      placeholder="https://example.com/photo.jpg"
                    />
                    {formData.photo_url && (
                      <div className="mt-2">
                        <img src={formData.photo_url} alt="Preview" className="w-16 h-16 object-cover rounded" />
                      </div>
                    )}
                    {formErrors.photo_url && <p className="text-sm text-red-500 mt-1">{formErrors.photo_url}</p>}
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      isSubmitting ||
                      (formData.role === 'district_manager' && 
                      profile?.role === 'regional_manager' && 
                      hasDistrictManager &&
                      !selectedStaff)
                    }
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      "Add Staff Member"
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search Bar */}
      <div className="flex items-center space-x-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search staff members..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {/* Staff Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Staff Members ({filteredStaff.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff Member</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Last Access</TableHead>
                <TableHead>Access Count</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStaff.map((staff) => (
                <TableRow key={staff.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <Avatar>
                        <AvatarImage src={staff.photo_url} alt={staff.name} />
                        <AvatarFallback>
                          {staff.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{staff.name}</p>
                        <p className="text-sm text-muted-foreground">{staff.email}</p>
                        {staff.phone && (
                          <p className="text-sm text-muted-foreground">{staff.phone}</p>
                        )}
                        {staff.role === 'district_manager' && staff.district_name && (
                          <p className="text-sm font-medium text-blue-600">{staff.district_name}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {staff.position || <span className="text-muted-foreground italic">Not specified</span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {staff.role.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {staff.last_access 
                      ? new Date(staff.last_access).toLocaleDateString()
                      : <span className="text-muted-foreground italic">Never</span>
                    }
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{staff.access_count}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditModal(staff)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {staff.id !== profile?.id && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Staff Member</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete {staff.name}? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(staff.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredStaff.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? "No staff members found matching your search." : "No staff members found."}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <Dialog open={Boolean(selectedStaff)} onOpenChange={(open) => !open && setSelectedStaff(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Edit Staff Member
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Hidden fields to prevent autofill */}
              <div style={{ display: 'none' }}>
                <input type="text" name="fake-username" autoComplete="username" />
                <input type="password" name="fake-password" autoComplete="current-password" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-name">Full Name *</Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter full name"
                  />
                  {formErrors.name && <p className="text-sm text-red-500 mt-1">{formErrors.name}</p>}
                </div>

                <div>
                  <Label htmlFor="edit-email">Email Address *</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Enter email address"
                    disabled={Boolean(selectedStaff)}
                  />
                  {formErrors.email && <p className="text-sm text-red-500 mt-1">{formErrors.email}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-phone">Phone Number</Label>
                  <Input
                    id="edit-phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Enter phone number"
                  />
                  {formErrors.phone && <p className="text-sm text-red-500 mt-1">{formErrors.phone}</p>}
                </div>

                <div>
                  <Label htmlFor="edit-position">Position</Label>
                  <Input
                    id="edit-position"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    placeholder="Enter job position"
                  />
                  {formErrors.position && <p className="text-sm text-red-500 mt-1">{formErrors.position}</p>}
                </div>
              </div>

              <div>
                <Label htmlFor="edit-role">Role *</Label>
                <Select value={formData.role} onValueChange={(value: any) => setFormData({ ...formData, role: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {profile?.role === 'manager' ? (
                      // For managers, only show Assistant Manager and Staff
                      <>
                        <SelectItem value="staff">Staff</SelectItem>
                        {!hasAssistantManager && (
                          <SelectItem value="assistant_manager">Assistant Manager</SelectItem>
                        )}
                      </>
                    ) : profile?.role === 'admin' ? (
                      // For admin, show Manager, Assistant Manager, Staff with branch restrictions
                      <>
                        <SelectItem value="staff">Staff</SelectItem>
                        {(!hasManager || (selectedStaff && branchManagers.manager === selectedStaff.id)) && (
                          <SelectItem value="manager">Manager</SelectItem>
                        )}
                        {(!hasAssistantManager || (selectedStaff && branchManagers.assistant_manager === selectedStaff.id)) && (
                          <SelectItem value="assistant_manager">Assistant Manager</SelectItem>
                        )}
                      </>
                    ) : (
                      // For other roles, show all allowed roles
                      <>
                        <SelectItem value="staff">Staff</SelectItem>
                        <SelectItem value="assistant_manager">Assistant Manager</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="district_manager">District Manager</SelectItem>
                        <SelectItem value="regional_manager">Regional Manager</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
                {formErrors.role && <p className="text-sm text-red-500 mt-1">{formErrors.role}</p>}
              </div>


              {/* Region selection for regional managers */}
              {formData.role === 'regional_manager' && (
                <div>
                  <Label htmlFor="edit-region">Region *</Label>
                  <ReactSelect
                    id="edit-region"
                    options={regionOptions}
                    value={regionOptions.find(option => option.value === selectedRegionId) || null}
                    onChange={(option) => setSelectedRegionId(option?.value || "")}
                    placeholder="Select a region..."
                    menuPortalTarget={document.body}
                    styles={selectStyles}
                  />
                </div>
              )}

              {/* District Manager role selection - show region first, then district */}
              {formData.role === 'district_manager' && (
                <div className="grid grid-cols-2 gap-4">
                  {/* Only show region selection for admin users */}
                  {profile?.role === 'admin' && (
                    <div>
                      <Label htmlFor="edit-region">Region *</Label>
                      <ReactSelect
                        id="edit-region"
                        options={regionOptions}
                        value={regionOptions.find(option => option.value === selectedRegionId) || null}
                        onChange={(option) => setSelectedRegionId(option?.value || "")}
                        placeholder="Select a region..."
                        menuPortalTarget={document.body}
                        styles={selectStyles}
                      />
                    </div>
                  )}
                  {/* Only show district field for admin users when editing district managers */}
                  {profile?.role === 'admin' && (
                    <div>
                      <Label htmlFor="edit-district">District *</Label>
                      <ReactSelect
                        id="edit-district"
                        options={districtOptions}
                        value={districtOptions.find(option => option.value === selectedDistrictId) || null}
                        onChange={(option) => setSelectedDistrictId(option?.value || "")}
                        placeholder="Select a district..."
                        menuPortalTarget={document.body}
                        styles={selectStyles}
                        isDisabled={!selectedRegionId}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Branch selection for manager and assistant_manager roles in edit modal */}
              {(formData.role === 'manager' || formData.role === 'assistant_manager' || formData.role === 'staff') && (
                <div>
                  {profile?.role === 'regional_manager' ? (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <Label className="text-sm font-medium text-blue-800">Branch Assignment</Label>
                      <p className="text-sm text-blue-700 mt-1">
                        Staff member is assigned to your selected branch: <strong>
                          {profile?.branch_context && branches.length > 0 
                            ? branches.find(b => b.id === profile.branch_context)?.name || 'Your Selected Branch'
                            : 'Your Selected Branch'
                          }
                        </strong>
                      </p>
                    </div>
                  ) : profile?.role === 'manager' ? (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <Label className="text-sm font-medium text-blue-800">Branch Assignment</Label>
                      <p className="text-sm text-blue-700 mt-1">
                        Staff member is assigned to your branch: <strong>
                          {profile?.branch_id && branches.length > 0 
                            ? branches.find(b => b.id === profile.branch_id)?.name || 'Your Branch'
                            : 'Your Branch'
                          }
                        </strong>
                      </p>
                    </div>
                  ) : (
                    <>
                      <Label htmlFor="edit-branch">Branch *</Label>
                      <ReactSelect
                        id="edit-branch"
                        options={branchOptions}
                        value={branchOptions.find(option => option.value === selectedBranchId) || null}
                        onChange={(option) => setSelectedBranchId(option?.value || "")}
                        placeholder="Select a branch..."
                        menuPortalTarget={document.body}
                        styles={selectStyles}
                      />
                    </>
                  )}
                </div>
              )}

              {selectedStaff && (
                <div>
                  <Label htmlFor="edit-password">New Password (leave blank to keep current)</Label>
                  <Input
                    id="edit-password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Enter new password (optional)"
                    autoComplete="new-password"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                  />
                  {formErrors.password && <p className="text-sm text-red-500 mt-1">{formErrors.password}</p>}
                </div>
              )}

              <div>
                <Label htmlFor="edit-photo_url">Staff Photo URL (Optional)</Label>
                <Input
                  id="edit-photo_url"
                  type="url"
                  value={formData.photo_url}
                  onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })}
                  placeholder="https://example.com/photo.jpg"
                />
                {formData.photo_url && (
                  <div className="mt-2">
                    <img src={formData.photo_url} alt="Preview" className="w-16 h-16 object-cover rounded" />
                  </div>
                )}
                {formErrors.photo_url && <p className="text-sm text-red-500 mt-1">{formErrors.photo_url}</p>}
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setSelectedStaff(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update Staff Member"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Staff;