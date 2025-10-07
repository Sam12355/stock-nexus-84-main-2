import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { MapPin, Users, Building2, Plus, Trash2, Eye } from "lucide-react";
import { apiClient } from "@/lib/api";

interface DistrictManager {
  id: string;
  name: string;
  email: string;
  district_id: string;
  district_name: string;
  region_name: string;
  assigned_branches_count: number;
  assigned_branches: Array<{
    id: string;
    name: string;
    district_id: string;
    district_name: string;
  }>;
}

interface Branch {
  id: string;
  name: string;
  description: string;
  district_id: string;
  district_name: string;
  region_name: string;
}

const BranchAssignments = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  
  const [districtManagers, setDistrictManagers] = useState<DistrictManager[]>([]);
  const [availableBranches, setAvailableBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedManager, setSelectedManager] = useState<DistrictManager | null>(null);
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);
  const [tableExists, setTableExists] = useState<boolean | null>(null);

  // Check if user has access
  if (!profile || (profile.role as string) !== 'admin') {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-muted-foreground">Access denied. Admin privileges required.</p>
      </div>
    );
  }

  const fetchData = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching district managers and branches...');
      
      const [managersResponse, branchesResponse] = await Promise.all([
        apiClient.getDistrictManagers(),
        apiClient.getAvailableBranches()
      ]);

      console.log('📊 Managers response:', managersResponse);
      console.log('🏢 Branches response:', branchesResponse);

      if (managersResponse.success) {
        // Ensure assigned_branches is always an array
        const managersWithSafeBranches = managersResponse.data.map(manager => ({
          ...manager,
          assigned_branches: manager.assigned_branches || []
        }));
        setDistrictManagers(managersWithSafeBranches);
        console.log('✅ District managers loaded:', managersWithSafeBranches.length);
      } else {
        console.error('❌ Failed to load district managers:', managersResponse.error);
      }

      if (branchesResponse.success) {
        setAvailableBranches(branchesResponse.data);
        console.log('✅ Available branches loaded:', branchesResponse.data.length);
      } else {
        console.error('❌ Failed to load branches:', branchesResponse.error);
      }
    } catch (error) {
      console.error('❌ Error fetching data:', error);
      
      // Check if it's a table doesn't exist error
      if (error.message && error.message.includes('relation "district_manager_branch_assignments" does not exist')) {
        setTableExists(false);
        toast({
          title: "Database Setup Required",
          description: "The branch assignments table needs to be created first. Please click 'Setup Database Table' button.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: `Failed to fetch data: ${error.message}`,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSetupTable = async () => {
    try {
      setSetupLoading(true);
      const response = await apiClient.createDistrictManagerBranchAssignmentsTable();
      
      if (response.success) {
        setTableExists(true);
        toast({
          title: "Success",
          description: response.message,
        });
        fetchData(); // Refresh data after table creation
      } else {
        toast({
          title: "Warning",
          description: response.message || "Table creation may have failed",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error creating table:', error);
      toast({
        title: "Error",
        description: "Failed to create table",
        variant: "destructive",
      });
    } finally {
      setSetupLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Check if table exists on component mount
  useEffect(() => {
    const checkTableExists = async () => {
      try {
        // Try to fetch data to see if table exists
        await apiClient.getDistrictManagers();
        setTableExists(true);
      } catch (error) {
        if (error.message && error.message.includes('relation "district_manager_branch_assignments" does not exist')) {
          setTableExists(false);
        }
      }
    };
    
    checkTableExists();
  }, []);

  const handleAssignBranches = async () => {
    if (!selectedManager || selectedBranches.length === 0) return;

    try {
      setAssigning(true);
      const response = await apiClient.assignBranchesToDistrictManager({
        district_manager_id: selectedManager.id,
        branch_ids: selectedBranches
      });

      if (response.success) {
        toast({
          title: "Success",
          description: response.message,
        });
        setAssignDialogOpen(false);
        setSelectedManager(null);
        setSelectedBranches([]);
        fetchData(); // Refresh data
      }
    } catch (error) {
      console.error('Error assigning branches:', error);
      
      // Check if it's a table doesn't exist error
      if (error.message && error.message.includes('Database table not found')) {
        setTableExists(false);
        toast({
          title: "Database Setup Required",
          description: "The branch assignments table needs to be created first. Please click 'Setup Database Table' button.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to assign branches",
          variant: "destructive",
        });
      }
    } finally {
      setAssigning(false);
    }
  };

  const handleUnassignBranch = async (managerId: string, branchId: string) => {
    try {
      const response = await apiClient.unassignBranchFromDistrictManager(managerId, branchId);
      
      if (response.success) {
        toast({
          title: "Success",
          description: response.message,
        });
        fetchData(); // Refresh data
      }
    } catch (error) {
      console.error('Error unassigning branch:', error);
      toast({
        title: "Error",
        description: "Failed to unassign branch",
        variant: "destructive",
      });
    }
  };

  const openAssignDialog = (manager: DistrictManager) => {
    setSelectedManager(manager);
    setSelectedBranches(manager.assigned_branches ? manager.assigned_branches.map(b => b.id) : []);
    setAssignDialogOpen(true);
  };

  const toggleBranchSelection = (branchId: string) => {
    setSelectedBranches(prev => 
      prev.includes(branchId) 
        ? prev.filter(id => id !== branchId)
        : [...prev, branchId]
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-2">Loading...</p>
        </div>
      </div>
    );
  }

  if (tableExists === false) {
  return (
    <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <MapPin className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Branch Assignments</h1>
              <p className="text-muted-foreground">Assign branches to district managers</p>
            </div>
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
              <MapPin className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
                <h3 className="text-lg font-semibold">Database Setup Required</h3>
              <p className="text-muted-foreground mt-2">
                  The branch assignments table needs to be created before you can use this feature.
              </p>
            </div>
            <div className="text-sm text-muted-foreground">
                Click the button below to create the required database table.
              </div>
              <Button
                onClick={handleSetupTable}
                disabled={setupLoading}
                className="mt-4"
              >
                {setupLoading ? "Creating Table..." : "Create Database Table"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Branch Assignments</h1>
            <p className="text-muted-foreground">Assign branches to district managers</p>
          </div>
        </div>
        {((profile.role as string) === 'admin') && (
          <Button
            onClick={handleSetupTable}
            disabled={setupLoading}
            variant="outline"
          >
            {setupLoading ? "Setting up..." : "Setup Database Table"}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            District Managers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>District</TableHead>
                <TableHead>Region</TableHead>
                <TableHead>Assigned Branches</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {districtManagers.map((manager) => (
                <TableRow key={manager.id}>
                  <TableCell className="font-medium">{manager.name}</TableCell>
                  <TableCell>{manager.email}</TableCell>
                  <TableCell>{manager.district_name}</TableCell>
                  <TableCell>{manager.region_name}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {manager.assigned_branches && manager.assigned_branches.length > 0 ? (
                        manager.assigned_branches.map((branch) => (
                          <Badge key={branch.id} variant="secondary" className="text-xs">
                            {branch.name}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground text-sm">No branches assigned</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openAssignDialog(manager)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Assign
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Assign Branches Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Assign Branches to {selectedManager?.name}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              District: {selectedManager?.district_name} | Region: {selectedManager?.region_name}
            </p>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Available Branches</Label>
              <p className="text-sm text-muted-foreground mb-3">
                Select branches to assign to this district manager
              </p>
              
              <ScrollArea className="h-64 border rounded-md p-3">
                <div className="space-y-2">
                  {availableBranches.filter(branch => branch.district_id === selectedManager?.district_id).length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No branches available in {selectedManager?.district_name} district</p>
                    </div>
                  ) : (
                    availableBranches
                      .filter(branch => branch.district_id === selectedManager?.district_id)
                      .map((branch) => (
                    <div key={branch.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={branch.id}
                        checked={selectedBranches.includes(branch.id)}
                        onCheckedChange={() => toggleBranchSelection(branch.id)}
                      />
                      <Label htmlFor={branch.id} className="flex-1 cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium">{branch.name}</span>
                            {branch.description && (
                              <span className="text-muted-foreground ml-2">
                                - {branch.description}
                              </span>
                            )}
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {branch.district_name}
                          </Badge>
                        </div>
                      </Label>
                    </div>
                  ))
                  )}
                </div>
              </ScrollArea>
            </div>

            <Separator />

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setAssignDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAssignBranches}
                disabled={assigning || selectedBranches.length === 0}
              >
                {assigning ? "Assigning..." : `Assign ${selectedBranches.length} Branch${selectedBranches.length !== 1 ? 'es' : ''}`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BranchAssignments;