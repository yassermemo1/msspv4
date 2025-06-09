import React, { useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/api';
import { AppLayout } from '@/components/layout/app-layout';
import { LicensePoolForm } from '@/components/forms/license-pool-form';
import { ClientLicenseForm } from '@/components/forms/client-license-form';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  ArrowLeft,
  Edit3,
  Plus,
  Users,
  Package,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Calendar,
  DollarSign,
  TrendingUp,
  Server,
  ExternalLink,
  Download,
  FileText,
  Activity
} from 'lucide-react';

interface LicensePoolData {
  id: number;
  name: string;
  vendor: string;
  productName: string;
  licenseType: string;
  totalLicenses: number;
  availableLicenses: number;
  assignedLicenses: number;
  orderedLicenses: number;
  utilizationPercentage: number;
  status: 'healthy' | 'warning' | 'critical';
  renewalDate?: string;
  costPerLicense?: number;
  isActive: boolean;
  totalCost?: number;
  purchaseRequestNumber?: string;
  purchaseOrderNumber?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface ClientLicense {
  id: number;
  clientId: number;
  clientName: string;
  assignedLicenses: number;
  assignedDate: string;
  notes?: string;
}

interface LicenseUsageStats {
  daily: Array<{ date: string; assigned: number; available: number }>;
  monthly: Array<{ month: string; assigned: number; available: number }>;
  trend: 'increasing' | 'decreasing' | 'stable';
}

export default function LicensePoolDetailPage() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);

  // Fetch license pool details
  const { data: licensePool, isLoading: isLoadingPool } = useQuery<LicensePoolData>({
    queryKey: [`/api/license-pools/${id}/stats`],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/license-pools/${id}/stats`);
      return res.json();
    },
    enabled: !!id,
  });

  // Fetch license assignments for this pool
  const { data: assignments = [], isLoading: isLoadingAssignments } = useQuery<ClientLicense[]>({
    queryKey: [`/api/license-pools/${id}/assignments`],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/license-pools/${id}/assignments`);
      return res.json();
    },
    enabled: !!id,
  });

  // Fetch usage statistics
  const { data: usageStats } = useQuery<LicenseUsageStats>({
    queryKey: [`/api/license-pools/${id}/usage-stats`],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/license-pools/${id}/usage-stats`);
      return res.json();
    },
    enabled: !!id,
  });

  // Update license pool mutation
  const updateLicensePoolMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('PUT', `/api/license-pools/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/license-pools/${id}/stats`] });
      queryClient.invalidateQueries({ queryKey: ['/api/license-pools'] });
      setShowEditDialog(false);
      toast({
        title: 'Success',
        description: 'License pool updated successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update license pool',
        variant: 'destructive',
      });
    },
  });

  // Assign license mutation
  const assignLicenseMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', `/api/clients/${data.clientId}/licenses`, {
        licensePoolId: parseInt(id!),
        assignedLicenses: data.assignedLicenses,
        notes: data.notes,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/license-pools/${id}/assignments`] });
      queryClient.invalidateQueries({ queryKey: [`/api/license-pools/${id}/stats`] });
      queryClient.invalidateQueries({ queryKey: ['/api/license-pools'] });
      setShowAssignDialog(false);
      toast({
        title: 'Success',
        description: 'License assigned successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to assign license',
        variant: 'destructive',
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-50 border-green-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'critical': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Server className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  if (isLoadingPool) {
    return (
      <AppLayout>
        <div className="container mx-auto p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!licensePool) {
    return (
      <AppLayout>
        <div className="container mx-auto p-6">
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">License Pool Not Found</h3>
            <p className="text-gray-500 mb-4">
              The license pool you're looking for doesn't exist or you don't have permission to view it.
            </p>
            <Button onClick={() => navigate('/assets')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Assets
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => navigate('/assets')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{licensePool.name}</h1>
              <p className="text-gray-600">{licensePool.vendor} {licensePool.productName}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className={`${getStatusColor(licensePool.status)}`}>
              {licensePool.status}
            </Badge>
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit Pool
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden">
                <DialogHeader>
                  <DialogTitle>Edit License Pool</DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto min-h-0">
                  <LicensePoolForm
                    licensePool={licensePool}
                    onSubmit={(data) => updateLicensePoolMutation.mutate(data)}
                    onCancel={() => setShowEditDialog(false)}
                    isLoading={updateLicensePoolMutation.isPending}
                  />
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Assign License
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Assign License to Client</DialogTitle>
                </DialogHeader>
                <ClientLicenseForm
                  clientId={0} // Will be selected in the form
                  licensePoolId={parseInt(id!)} // Pre-select this license pool
                  onSubmit={(data) => assignLicenseMutation.mutate(data)}
                  onCancel={() => setShowAssignDialog(false)}
                  isLoading={assignLicenseMutation.isPending}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Licenses</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(licensePool.totalLicenses)}</div>
              <p className="text-xs text-muted-foreground">
                Ordered: {formatNumber(licensePool.orderedLicenses)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(licensePool.availableLicenses)}</div>
              <p className="text-xs text-muted-foreground">
                Ready for assignment
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Assigned</CardTitle>
              <Users className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(licensePool.assignedLicenses)}</div>
              <p className="text-xs text-muted-foreground">
                To {assignments.length} client{assignments.length !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Utilization</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{licensePool.utilizationPercentage.toFixed(1)}%</div>
              <Progress value={licensePool.utilizationPercentage} className="mt-2" />
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="assignments">Assignments ({assignments.length})</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* License Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Package className="h-5 w-5 mr-2" />
                    License Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">License Type:</span>
                      <Badge variant="outline">{licensePool.licenseType}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Status:</span>
                      <div className="flex items-center space-x-1">
                        {getStatusIcon(licensePool.status)}
                        <span className="text-sm font-medium">{licensePool.status}</span>
                      </div>
                    </div>
                    {licensePool.renewalDate && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Renewal Date:</span>
                        <span className="text-sm font-medium">{formatDate(licensePool.renewalDate)}</span>
                      </div>
                    )}
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-2">License Distribution</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Available</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-500 h-2 rounded-full" 
                              style={{ width: `${(licensePool.availableLicenses / licensePool.totalLicenses) * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium">{licensePool.availableLicenses}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Assigned</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full" 
                              style={{ width: `${(licensePool.assignedLicenses / licensePool.totalLicenses) * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium">{licensePool.assignedLicenses}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Financial Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <DollarSign className="h-5 w-5 mr-2" />
                    Financial Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {licensePool.costPerLicense && (
                    <>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Cost per License:</span>
                          <span className="text-sm font-medium">{formatCurrency(licensePool.costPerLicense)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Total Pool Value:</span>
                          <span className="text-lg font-bold">
                            {formatCurrency(licensePool.totalLicenses * licensePool.costPerLicense)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Assigned Value:</span>
                          <span className="text-sm font-medium">
                            {formatCurrency(licensePool.assignedLicenses * licensePool.costPerLicense)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Available Value:</span>
                          <span className="text-sm font-medium">
                            {formatCurrency(licensePool.availableLicenses * licensePool.costPerLicense)}
                          </span>
                        </div>
                      </div>

                      <div className="border-t pt-4">
                        <h4 className="font-medium mb-2">Purchase Information</h4>
                        <div className="space-y-1 text-sm">
                          {licensePool.purchaseRequestNumber && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">PR Number:</span>
                              <span className="font-medium">{licensePool.purchaseRequestNumber}</span>
                            </div>
                          )}
                          {licensePool.purchaseOrderNumber && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">PO Number:</span>
                              <span className="font-medium">{licensePool.purchaseOrderNumber}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  Recent Assignments
                </CardTitle>
              </CardHeader>
              <CardContent>
                {assignments.length > 0 ? (
                  <div className="space-y-2">
                    {assignments.slice(0, 5).map((assignment) => (
                      <div key={assignment.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                        <div>
                          <p className="font-medium">{assignment.clientName}</p>
                          <p className="text-sm text-muted-foreground">
                            Assigned {formatDate(assignment.assignedDate)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatNumber(assignment.assignedLicenses)}</p>
                          <p className="text-sm text-muted-foreground">licenses</p>
                        </div>
                      </div>
                    ))}
                    {assignments.length > 5 && (
                      <div className="text-center pt-2">
                        <Button variant="ghost" size="sm">
                          View all {assignments.length} assignments
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-muted-foreground">No assignments yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assignments" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>License Assignments</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingAssignments ? (
                  <div className="text-center py-8">Loading assignments...</div>
                ) : assignments.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Client</TableHead>
                        <TableHead>Assigned Licenses</TableHead>
                        <TableHead>Assignment Date</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assignments.map((assignment) => (
                        <TableRow key={assignment.id}>
                          <TableCell className="font-medium">{assignment.clientName}</TableCell>
                          <TableCell>{formatNumber(assignment.assignedLicenses)}</TableCell>
                          <TableCell>{formatDate(assignment.assignedDate)}</TableCell>
                          <TableCell>{assignment.notes || '-'}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => navigate(`/clients/${assignment.clientId}`)}>
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-muted-foreground">No assignments found</p>
                    <p className="text-sm text-muted-foreground">
                      Click "Assign License" to get started
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Usage Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <TrendingUp className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-muted-foreground">Analytics coming soon</p>
                  <p className="text-sm text-muted-foreground">
                    Track license usage patterns and trends over time
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="details" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Pool Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Basic Information</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Name:</span>
                        <span className="font-medium">{licensePool.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Vendor:</span>
                        <span className="font-medium">{licensePool.vendor}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Product:</span>
                        <span className="font-medium">{licensePool.productName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Type:</span>
                        <span className="font-medium">{licensePool.licenseType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Active:</span>
                        <span className="font-medium">{licensePool.isActive ? 'Yes' : 'No'}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Timestamps</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Created:</span>
                        <span className="font-medium">{formatDate(licensePool.createdAt)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Updated:</span>
                        <span className="font-medium">{formatDate(licensePool.updatedAt)}</span>
                      </div>
                      {licensePool.renewalDate && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Renewal:</span>
                          <span className="font-medium">{formatDate(licensePool.renewalDate)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {licensePool.notes && (
                  <div>
                    <h4 className="font-medium mb-2">Notes</h4>
                    <div className="bg-gray-50 p-3 rounded-md">
                      <p className="text-sm">{licensePool.notes}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
} 