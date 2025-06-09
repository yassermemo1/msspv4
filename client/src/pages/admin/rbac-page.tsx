import { useState, useEffect } from 'react';
import { Shield, Check, X, Save, RefreshCw, Users, Key, Lock } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { useToast } from '../../hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Switch } from '../../components/ui/switch';
import { Label } from '../../components/ui/label';

interface PagePermission {
  id: number;
  pageName: string;
  pageUrl: string;
  displayName: string;
  description?: string;
  category: string;
  icon?: string;
  adminAccess: boolean;
  managerAccess: boolean;
  engineerAccess: boolean;
  userAccess: boolean;
  isActive: boolean;
  sortOrder: number;
}

interface RolePermission {
  role: string;
  resource: string;
  action: string;
  conditions?: any;
}

export default function RbacPage() {
  const [pagePermissions, setPagePermissions] = useState<PagePermission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modifiedPermissions, setModifiedPermissions] = useState<Set<number>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    try {
      const response = await fetch('/api/page-permissions', {
        credentials: 'include'
      });
      
      if (!response.ok) throw new Error('Failed to fetch permissions');
      
      const data = await response.json();
      setPagePermissions(data);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load permissions',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = (
    permissionId: number, 
    role: 'adminAccess' | 'managerAccess' | 'engineerAccess' | 'userAccess', 
    value: boolean
  ) => {
    setPagePermissions(prev => 
      prev.map(p => {
        if (p.id === permissionId) {
          return { ...p, [role]: value };
        }
        return p;
      })
    );
    setModifiedPermissions(prev => new Set(prev).add(permissionId));
  };

  const handleActiveChange = (permissionId: number, value: boolean) => {
    setPagePermissions(prev => 
      prev.map(p => {
        if (p.id === permissionId) {
          return { ...p, isActive: value };
        }
        return p;
      })
    );
    setModifiedPermissions(prev => new Set(prev).add(permissionId));
  };

  const savePermissions = async () => {
    setSaving(true);
    
    try {
      const permissionsToUpdate = pagePermissions.filter(p => 
        modifiedPermissions.has(p.id)
      );

      for (const permission of permissionsToUpdate) {
        const response = await fetch(`/api/page-permissions/${permission.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            adminAccess: permission.adminAccess,
            managerAccess: permission.managerAccess,
            engineerAccess: permission.engineerAccess,
            userAccess: permission.userAccess,
            isActive: permission.isActive
          })
        });

        if (!response.ok) {
          throw new Error(`Failed to update permission: ${permission.displayName}`);
        }
      }

      toast({
        title: 'Success',
        description: 'Permissions updated successfully'
      });
      
      setModifiedPermissions(new Set());
    } catch (error) {
      console.error('Error saving permissions:', error);
      toast({
        title: 'Error',
        description: 'Failed to save permissions',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, JSX.Element> = {
      main: <Shield className="h-4 w-4" />,
      management: <Users className="h-4 w-4" />,
      admin: <Lock className="h-4 w-4" />,
      system: <Key className="h-4 w-4" />
    };
    return icons[category] || <Shield className="h-4 w-4" />;
  };

  const groupedPermissions = pagePermissions.reduce((acc, permission) => {
    const category = permission.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(permission);
    return acc;
  }, {} as Record<string, PagePermission[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Role-Based Access Control</h1>
          <p className="text-muted-foreground mt-1">
            Manage permissions for different user roles
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={fetchPermissions}
            disabled={saving}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button
            onClick={savePermissions}
            disabled={saving || modifiedPermissions.size === 0}
          >
            <Save className="mr-2 h-4 w-4" />
            Save Changes {modifiedPermissions.size > 0 && `(${modifiedPermissions.size})`}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Pages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pagePermissions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active Pages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {pagePermissions.filter(p => p.isActive).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Admin Only</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {pagePermissions.filter(p => 
                p.adminAccess && !p.managerAccess && !p.engineerAccess && !p.userAccess
              ).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Public Pages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {pagePermissions.filter(p => p.userAccess).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="page-permissions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="page-permissions">Page Permissions</TabsTrigger>
          <TabsTrigger value="role-summary">Role Summary</TabsTrigger>
          <TabsTrigger value="test-users">Test Users</TabsTrigger>
        </TabsList>

        <TabsContent value="page-permissions" className="space-y-4">
          {Object.entries(groupedPermissions).map(([category, permissions]) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getCategoryIcon(category)}
                  <span className="capitalize">{category}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-4">Page</th>
                        <th className="text-center py-2 px-4">Active</th>
                        <th className="text-center py-2 px-4">Admin</th>
                        <th className="text-center py-2 px-4">Manager</th>
                        <th className="text-center py-2 px-4">Engineer</th>
                        <th className="text-center py-2 px-4">User</th>
                      </tr>
                    </thead>
                    <tbody>
                      {permissions.sort((a, b) => a.sortOrder - b.sortOrder).map((permission) => (
                        <tr key={permission.id} className="border-b hover:bg-muted/50">
                          <td className="py-2 px-4">
                            <div>
                              <div className="font-medium">{permission.displayName}</div>
                              <div className="text-sm text-muted-foreground">{permission.pageUrl}</div>
                            </div>
                          </td>
                          <td className="text-center py-2 px-4">
                            <Switch
                              checked={permission.isActive}
                              onCheckedChange={(value) => handleActiveChange(permission.id, value)}
                            />
                          </td>
                          <td className="text-center py-2 px-4">
                            <Switch
                              checked={permission.adminAccess}
                              onCheckedChange={(value) => handlePermissionChange(permission.id, 'adminAccess', value)}
                              disabled={!permission.isActive}
                            />
                          </td>
                          <td className="text-center py-2 px-4">
                            <Switch
                              checked={permission.managerAccess}
                              onCheckedChange={(value) => handlePermissionChange(permission.id, 'managerAccess', value)}
                              disabled={!permission.isActive}
                            />
                          </td>
                          <td className="text-center py-2 px-4">
                            <Switch
                              checked={permission.engineerAccess}
                              onCheckedChange={(value) => handlePermissionChange(permission.id, 'engineerAccess', value)}
                              disabled={!permission.isActive}
                            />
                          </td>
                          <td className="text-center py-2 px-4">
                            <Switch
                              checked={permission.userAccess}
                              onCheckedChange={(value) => handlePermissionChange(permission.id, 'userAccess', value)}
                              disabled={!permission.isActive}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="role-summary" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {['admin', 'manager', 'engineer', 'user'].map((role) => {
              const accessiblePages = pagePermissions.filter(p => {
                if (role === 'admin') return p.adminAccess && p.isActive;
                if (role === 'manager') return p.managerAccess && p.isActive;
                if (role === 'engineer') return p.engineerAccess && p.isActive;
                if (role === 'user') return p.userAccess && p.isActive;
                return false;
              });

              return (
                <Card key={role}>
                  <CardHeader>
                    <CardTitle className="capitalize">{role}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="text-2xl font-bold">{accessiblePages.length} pages</div>
                      <div className="space-y-1">
                        {accessiblePages.slice(0, 5).map(page => (
                          <div key={page.id} className="text-sm text-muted-foreground">
                            • {page.displayName}
                          </div>
                        ))}
                        {accessiblePages.length > 5 && (
                          <div className="text-sm text-muted-foreground">
                            ... and {accessiblePages.length - 5} more
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="test-users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test User Accounts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Use these test accounts to verify role-based access control:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { email: 'admin@mssp.local', role: 'Admin', access: 'Full system access' },
                    { email: 'manager@mssp.local', role: 'Manager', access: 'Business operations' },
                    { email: 'engineer@mssp.local', role: 'Engineer', access: 'Technical features' },
                    { email: 'user@mssp.local', role: 'User', access: 'Basic features only' }
                  ].map((user) => (
                    <Card key={user.email}>
                      <CardContent className="pt-6">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{user.role}</span>
                            <Badge>{user.access}</Badge>
                          </div>
                          <div className="text-sm space-y-1">
                            <div>
                              <span className="text-muted-foreground">Email:</span> {user.email}
                            </div>
                            <div>
                              <span className="text-muted-foreground">Password:</span> SecureTestPass123!
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 