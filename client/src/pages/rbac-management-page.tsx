import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Shield, 
  Save, 
  RotateCcw, 
  AlertTriangle, 
  CheckCircle, 
  Info,
  Users,
  Settings,
  Eye,
  EyeOff
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { PagePermission } from "@shared/schema";

interface PagePermissionUpdate {
  id: number;
  adminAccess: boolean;
  managerAccess: boolean;
  engineerAccess: boolean;
  userAccess: boolean;
  isActive: boolean;
}

export default function RbacManagementPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [pendingChanges, setPendingChanges] = useState<Record<number, PagePermissionUpdate>>({});
  const [showInactive, setShowInactive] = useState(false);

  // Only allow admin access
  if (user?.role !== 'admin') {
    return (
      <AppLayout title="Access Denied" subtitle="Insufficient permissions">
        <div className="flex items-center justify-center h-full">
          <Alert className="max-w-md">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You do not have permission to access this page. Only administrators can manage RBAC settings.
            </AlertDescription>
          </Alert>
        </div>
      </AppLayout>
    );
  }

  const { data: permissions = [], isLoading, error } = useQuery<PagePermission[]>({
    queryKey: ["/api/page-permissions"],
  });

  const updatePermissionMutation = useMutation({
    mutationFn: async ({ id, ...updates }: PagePermissionUpdate) => {
      const response = await fetch(`/api/page-permissions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update permission');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Page permissions updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/page-permissions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/accessible-pages"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update page permissions",
        variant: "destructive",
      });
      console.error("Error updating permissions:", error);
    },
  });

  const handlePermissionChange = (
    permissionId: number, 
    role: keyof Omit<PagePermissionUpdate, 'id'>, 
    value: boolean
  ) => {
    const permission = permissions.find(p => p.id === permissionId);
    if (!permission) return;

    setPendingChanges(prev => ({
      ...prev,
      [permissionId]: {
        id: permissionId,
        adminAccess: permission.adminAccess,
        managerAccess: permission.managerAccess,
        engineerAccess: permission.engineerAccess,
        userAccess: permission.userAccess,
        isActive: permission.isActive,
        ...prev[permissionId],
        [role]: value,
      }
    }));
  };

  const saveChanges = async () => {
    const changesToSave = Object.values(pendingChanges);
    
    try {
      for (const change of changesToSave) {
        await updatePermissionMutation.mutateAsync(change);
      }
      setPendingChanges({});
    } catch (error) {
      console.error("Failed to save changes:", error);
    }
  };

  const resetChanges = () => {
    setPendingChanges({});
  };

  const getPermissionValue = (permission: PagePermission, role: string): boolean => {
    const pending = pendingChanges[permission.id];
    if (pending) {
      switch (role) {
        case 'admin': return pending.adminAccess;
        case 'manager': return pending.managerAccess;
        case 'engineer': return pending.engineerAccess;
        case 'user': return pending.userAccess;
        case 'active': return pending.isActive;
      }
    }
    
    switch (role) {
      case 'admin': return permission.adminAccess;
      case 'manager': return permission.managerAccess;
      case 'engineer': return permission.engineerAccess;
      case 'user': return permission.userAccess;
      case 'active': return permission.isActive;
      default: return false;
    }
  };

  const getRoleAccessCount = (role: string): number => {
    return permissions.filter(p => {
      const isActive = getPermissionValue(p, 'active');
      const hasAccess = getPermissionValue(p, role);
      return isActive && hasAccess;
    }).length;
  };

  const filteredPermissions = permissions.filter(p => {
    const isActive = getPermissionValue(p, 'active');
    return showInactive || isActive;
  });

  const groupedPermissions = filteredPermissions.reduce((acc, permission) => {
    const category = permission.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(permission);
    return acc;
  }, {} as Record<string, PagePermission[]>);

  const hasChanges = Object.keys(pendingChanges).length > 0;

  if (isLoading) {
    return (
      <AppLayout title="RBAC Management" subtitle="Configure role-based access control">
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout title="RBAC Management" subtitle="Configure role-based access control">
        <div className="flex items-center justify-center h-full">
          <Alert variant="destructive" className="max-w-md">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Failed to load page permissions. Please try again.
            </AlertDescription>
          </Alert>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout 
      title="RBAC Management" 
      subtitle="Configure role-based access control for pages and features"
    >
      <main className="flex-1 overflow-auto p-6 pt-16 md:pt-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="show-inactive"
                  checked={showInactive}
                  onCheckedChange={setShowInactive}
                />
                <label htmlFor="show-inactive" className="text-sm font-medium flex items-center space-x-1">
                  {showInactive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  <span>Show inactive pages</span>
                </label>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {hasChanges && (
                <>
                  <Button variant="outline" onClick={resetChanges}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset Changes
                  </Button>
                  <Button onClick={saveChanges} disabled={updatePermissionMutation.isPending}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes ({Object.keys(pendingChanges).length})
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="text-sm font-medium">Admin Access</p>
                    <p className="text-2xl font-bold">{getRoleAccessCount('admin')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium">Manager Access</p>
                    <p className="text-2xl font-bold">{getRoleAccessCount('manager')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Settings className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium">Engineer Access</p>
                    <p className="text-2xl font-bold">{getRoleAccessCount('engineer')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-gray-600" />
                  <div>
                    <p className="text-sm font-medium">User Access</p>
                    <p className="text-2xl font-bold">{getRoleAccessCount('user')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {hasChanges && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                You have {Object.keys(pendingChanges).length} unsaved changes. Remember to save your changes before leaving this page.
              </AlertDescription>
            </Alert>
          )}

          {/* Permission Matrix */}
          <Tabs defaultValue="matrix" className="space-y-4">
            <TabsList>
              <TabsTrigger value="matrix">Permission Matrix</TabsTrigger>
              <TabsTrigger value="by-category">By Category</TabsTrigger>
            </TabsList>

            <TabsContent value="matrix">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="h-5 w-5 mr-2" />
                    Page Access Permission Matrix
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[300px]">Page</TableHead>
                          <TableHead className="text-center">Admin</TableHead>
                          <TableHead className="text-center">Manager</TableHead>
                          <TableHead className="text-center">Engineer</TableHead>
                          <TableHead className="text-center">User</TableHead>
                          <TableHead className="text-center">Active</TableHead>
                          <TableHead className="text-center">Category</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPermissions.map((permission) => (
                          <TableRow key={permission.id} className={!getPermissionValue(permission, 'active') ? 'opacity-50' : ''}>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="font-medium">{permission.displayName}</div>
                                <div className="text-sm text-gray-500">{permission.pageUrl}</div>
                                {permission.description && (
                                  <div className="text-xs text-gray-400">{permission.description}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Switch
                                checked={getPermissionValue(permission, 'admin')}
                                onCheckedChange={(value) => handlePermissionChange(permission.id, 'adminAccess', value)}
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <Switch
                                checked={getPermissionValue(permission, 'manager')}
                                onCheckedChange={(value) => handlePermissionChange(permission.id, 'managerAccess', value)}
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <Switch
                                checked={getPermissionValue(permission, 'engineer')}
                                onCheckedChange={(value) => handlePermissionChange(permission.id, 'engineerAccess', value)}
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <Switch
                                checked={getPermissionValue(permission, 'user')}
                                onCheckedChange={(value) => handlePermissionChange(permission.id, 'userAccess', value)}
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <Switch
                                checked={getPermissionValue(permission, 'active')}
                                onCheckedChange={(value) => handlePermissionChange(permission.id, 'isActive', value)}
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className="capitalize">
                                {permission.category}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="by-category">
              <div className="space-y-6">
                {Object.entries(groupedPermissions).map(([category, categoryPermissions]) => (
                  <Card key={category}>
                    <CardHeader>
                      <CardTitle className="capitalize">{category} Pages</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Page</TableHead>
                              <TableHead className="text-center">Admin</TableHead>
                              <TableHead className="text-center">Manager</TableHead>
                              <TableHead className="text-center">Engineer</TableHead>
                              <TableHead className="text-center">User</TableHead>
                              <TableHead className="text-center">Active</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {categoryPermissions.map((permission) => (
                              <TableRow key={permission.id} className={!getPermissionValue(permission, 'active') ? 'opacity-50' : ''}>
                                <TableCell>
                                  <div className="space-y-1">
                                    <div className="font-medium">{permission.displayName}</div>
                                    <div className="text-sm text-gray-500">{permission.pageUrl}</div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-center">
                                  <Switch
                                    checked={getPermissionValue(permission, 'admin')}
                                    onCheckedChange={(value) => handlePermissionChange(permission.id, 'adminAccess', value)}
                                  />
                                </TableCell>
                                <TableCell className="text-center">
                                  <Switch
                                    checked={getPermissionValue(permission, 'manager')}
                                    onCheckedChange={(value) => handlePermissionChange(permission.id, 'managerAccess', value)}
                                  />
                                </TableCell>
                                <TableCell className="text-center">
                                  <Switch
                                    checked={getPermissionValue(permission, 'engineer')}
                                    onCheckedChange={(value) => handlePermissionChange(permission.id, 'engineerAccess', value)}
                                  />
                                </TableCell>
                                <TableCell className="text-center">
                                  <Switch
                                    checked={getPermissionValue(permission, 'user')}
                                    onCheckedChange={(value) => handlePermissionChange(permission.id, 'userAccess', value)}
                                  />
                                </TableCell>
                                <TableCell className="text-center">
                                  <Switch
                                    checked={getPermissionValue(permission, 'active')}
                                    onCheckedChange={(value) => handlePermissionChange(permission.id, 'isActive', value)}
                                  />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </AppLayout>
  );
} 