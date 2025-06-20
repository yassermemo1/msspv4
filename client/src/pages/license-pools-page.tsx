import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { AppLayout } from '@/components/layout/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/api';
import { 
  Plus, 
  Search, 
  Eye, 
  Edit, 
  Trash2, 
  Server, 
  Users, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { ColumnVisibility, ColumnDefinition } from '@/components/ui/column-visibility';
import { useColumnPreferences } from '@/hooks/use-column-preferences';

interface LicensePool {
  id: number;
  name: string;
  description?: string;
  totalLicenses: number;
  availableLicenses: number;
  usedLicenses: number;
  licenseType: string;
  vendor: string;
  version?: string;
  expirationDate?: string;
  status: 'active' | 'inactive' | 'expired' | 'expiring_soon';
  createdAt: string;
  updatedAt: string;
}

interface CreateLicensePoolData {
  name: string;
  productName: string;
  description?: string;
  totalLicenses: number;
  availableLicenses: number;
  licenseType: string;
  vendor: string;
  version?: string;
  expirationDate?: string;
}

export default function LicensePoolsPage() {
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newPoolData, setNewPoolData] = useState<CreateLicensePoolData>({
    name: '',
    productName: '',
    description: '',
    totalLicenses: 0,
    availableLicenses: 0,
    licenseType: '',
    vendor: '',
    version: '',
    expirationDate: ''
  });

  const queryClient = useQueryClient();

  // Column visibility setup
  const licenseColumns: ColumnDefinition[] = [
    { key: 'name', label: 'Name', defaultVisible: true, mandatory: true },
    { key: 'vendor', label: 'Vendor', defaultVisible: true },
    { key: 'type', label: 'Type', defaultVisible: true },
    { key: 'licenses', label: 'Licenses', defaultVisible: true },
    { key: 'usage', label: 'Usage', defaultVisible: false },
    { key: 'status', label: 'Status', defaultVisible: true },
    { key: 'actions', label: 'Actions', defaultVisible: true, mandatory: true },
  ];

  const {
    visibleColumns,
    handleVisibilityChange,
    resetToDefaults,
    isColumnVisible,
  } = useColumnPreferences({
    storageKey: 'license-pools-table-columns',
    columns: licenseColumns,
  });

  // Fetch license pools
  const { data: licensePools = [], isLoading, error } = useQuery<LicensePool[]>({
    queryKey: ['/api/license-pools'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/license-pools');
      return response.json();
    },
  });

  // Create license pool mutation
  const createPoolMutation = useMutation({
    mutationFn: async (data: CreateLicensePoolData) => {
      const response = await apiRequest('POST', '/api/license-pools', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/license-pools'] });
      setIsCreateDialogOpen(false);
      setNewPoolData({
        name: '',
        productName: '',
        description: '',
        totalLicenses: 0,
        availableLicenses: 0,
        licenseType: '',
        vendor: '',
        version: '',
        expirationDate: ''
      });
      toast({
        title: "Success",
        description: "License pool created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create license pool",
        variant: "destructive",
      });
    },
  });

  // Delete license pool mutation
  const deletePoolMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/license-pools/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/license-pools'] });
      toast({
        title: "Success",
        description: "License pool deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete license pool",
        variant: "destructive",
      });
    },
  });

  // Filter license pools based on search and status
  const filteredPools = (licensePools || []).filter(pool => {
    const matchesSearch = pool.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         pool.vendor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         pool.licenseType?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || pool.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'inactive':
        return <XCircle className="h-4 w-4 text-gray-500" />;
      case 'expired':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'expiring_soon':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      case 'expiring_soon':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleCreatePool = () => {
    if (!newPoolData.name || !newPoolData.productName || !newPoolData.licenseType || !newPoolData.vendor) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    createPoolMutation.mutate(newPoolData);
  };

  const handleDeletePool = (id: number) => {
    if (confirm('Are you sure you want to delete this license pool?')) {
      deletePoolMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <AppLayout title="License Pools" subtitle="Manage software license pools and allocations">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout title="License Pools" subtitle="Manage software license pools and allocations">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900">Error loading license pools</h3>
            <p className="text-gray-600">Please try again later</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="License Pools" subtitle="Manage software license pools and allocations">
      <div className="space-y-6">
        {/* Header and Actions */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search license pools..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="expiring_soon">Expiring Soon</SelectItem>
              </SelectContent>
            </Select>
            <ColumnVisibility
              columns={licenseColumns}
              visibleColumns={visibleColumns}
              onVisibilityChange={handleVisibilityChange}
              onReset={resetToDefaults}
            />
          </div>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add License Pool
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New License Pool</DialogTitle>
                <DialogDescription>
                  Enter the details for the new license pool. Required fields are marked with an asterisk.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Name *
                  </Label>
                  <Input
                    id="name"
                    value={newPoolData.name}
                    onChange={(e) => setNewPoolData({ ...newPoolData, name: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="productName" className="text-right">
                    Product Name *
                  </Label>
                  <Input
                    id="productName"
                    value={newPoolData.productName}
                    onChange={(e) => setNewPoolData({ ...newPoolData, productName: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="vendor" className="text-right">
                    Vendor *
                  </Label>
                  <Input
                    id="vendor"
                    value={newPoolData.vendor}
                    onChange={(e) => setNewPoolData({ ...newPoolData, vendor: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="licenseType" className="text-right">
                    License Type *
                  </Label>
                  <Input
                    id="licenseType"
                    value={newPoolData.licenseType}
                    onChange={(e) => setNewPoolData({ ...newPoolData, licenseType: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="totalLicenses" className="text-right">
                    Total Licenses *
                  </Label>
                  <Input
                    id="totalLicenses"
                    type="number"
                    value={newPoolData.totalLicenses}
                    onChange={(e) => {
                      const total = parseInt(e.target.value, 10) || 0;
                      setNewPoolData({ ...newPoolData, totalLicenses: total, availableLicenses: total });
                    }}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="description" className="text-right">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    value={newPoolData.description}
                    onChange={(e) => setNewPoolData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Optional description..."
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreatePool} disabled={createPoolMutation.isPending}>
                  {createPoolMutation.isPending ? 'Creating...' : 'Create Pool'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pools</CardTitle>
              <Server className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(licensePools || []).length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Pools</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(licensePools || []).filter(pool => pool.status === 'active').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Licenses</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(licensePools || []).reduce((sum, pool) => sum + (pool.totalLicenses || 0), 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Licenses</CardTitle>
              <Users className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(licensePools || []).reduce((sum, pool) => sum + (pool.availableLicenses || 0), 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* License Pools Table */}
        <Card>
          <CardHeader>
            <CardTitle>License Pools</CardTitle>
            <CardDescription>
              Manage your software license pools and track allocations
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredPools.length === 0 ? (
              <div className="text-center py-8">
                <Server className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900">No license pools found</h3>
                <p className="text-gray-600">
                  {searchTerm || statusFilter !== 'all' 
                    ? 'Try adjusting your search or filters' 
                    : 'Create your first license pool to get started'}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    {isColumnVisible('name') && <TableHead>Name</TableHead>}
                    {isColumnVisible('vendor') && <TableHead>Vendor</TableHead>}
                    {isColumnVisible('type') && <TableHead>Type</TableHead>}
                    {isColumnVisible('licenses') && <TableHead>Licenses</TableHead>}
                    {isColumnVisible('usage') && <TableHead>Usage</TableHead>}
                    {isColumnVisible('status') && <TableHead>Status</TableHead>}
                    {isColumnVisible('actions') && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPools.map((pool) => (
                    <TableRow key={pool.id}>
                      {isColumnVisible('name') && (
                        <TableCell>
                          <div>
                            <div className="font-medium">{pool.name}</div>
                            {pool.version && (
                              <div className="text-sm text-gray-500">v{pool.version}</div>
                            )}
                          </div>
                        </TableCell>
                      )}
                      {isColumnVisible('vendor') && <TableCell>{pool.vendor}</TableCell>}
                      {isColumnVisible('type') && <TableCell>{pool.licenseType}</TableCell>}
                      {isColumnVisible('licenses') && (
                        <TableCell>
                          <div className="text-sm">
                            <div>{pool.totalLicenses} total</div>
                            <div className="text-gray-500">
                              {pool.availableLicenses} available
                            </div>
                          </div>
                        </TableCell>
                      )}
                      {isColumnVisible('usage') && (
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full" 
                                style={{ 
                                  width: `${pool.totalLicenses > 0 ? (pool.usedLicenses / pool.totalLicenses) * 100 : 0}%` 
                                }}
                              ></div>
                            </div>
                            <span className="text-sm text-gray-600">
                              {pool.usedLicenses}/{pool.totalLicenses}
                            </span>
                          </div>
                        </TableCell>
                      )}
                      {isColumnVisible('status') && (
                        <TableCell>
                          <Badge className={getStatusColor(pool.status)}>
                            <div className="flex items-center space-x-1">
                              {getStatusIcon(pool.status)}
                              <span className="capitalize">{pool.status ? pool.status.replace('_', ' ') : 'Unknown'}</span>
                            </div>
                          </Badge>
                        </TableCell>
                      )}
                      {isColumnVisible('actions') && (
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/license-pools/${pool.id}`)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeletePool(pool.id)}
                              disabled={deletePoolMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
} 