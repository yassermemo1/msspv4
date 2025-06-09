import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { HardwareAsset, LicensePool, InsertLicensePool, InsertHardwareAsset, ClientLicense } from "@shared/schema";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, Search, Server, Key, Building, Edit, Trash2, ChevronDown, ChevronRight, Users } from "lucide-react";
import { LicensePoolForm } from "@/components/forms/license-pool-form";
import { HardwareAssetForm } from "@/components/forms/hardware-asset-form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import React from "react";
import { getStatusColor, getStatusIcon, getStatusBadge, getStatusVariant } from '@/lib/status-utils';

export default function AssetsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showLicensePoolDialog, setShowLicensePoolDialog] = useState(false);
  const [showHardwareDialog, setShowHardwareDialog] = useState(false);
  const [editingHardware, setEditingHardware] = useState<HardwareAsset | null>(null);
  const [editingLicense, setEditingLicense] = useState<LicensePool | null>(null);
  const [expandedPools, setExpandedPools] = useState<Set<number>>(new Set());
  const { toast } = useToast();

  const { data: hardwareAssets = [], isLoading: isLoadingHardware } = useQuery<HardwareAsset[]>({
    queryKey: ["/api/hardware-assets"],
  });

  const { data: licensePools = [], isLoading: isLoadingLicenses } = useQuery<LicensePool[]>({
    queryKey: ["/api/license-pools"],
  });

  // Fetch all license pool allocations
  const { data: allAllocations = {} } = useQuery<Record<number, (ClientLicense & { clientName: string })[]>>({
    queryKey: ["/api/license-pools/allocations/all"],
  });

  const createLicensePoolMutation = useMutation({
    mutationFn: async (data: InsertLicensePool) => {
      const res = await apiRequest("POST", "/api/license-pools", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/license-pools"] });
      setShowLicensePoolDialog(false);
      toast({
        title: "Success",
        description: "License pool created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create license pool",
        variant: "destructive",
      });
    },
  });

  const createHardwareAssetMutation = useMutation({
    mutationFn: async (data: InsertHardwareAsset) => {
      const res = await apiRequest("POST", "/api/hardware-assets", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hardware-assets"] });
      setShowHardwareDialog(false);
      toast({
        title: "Success",
        description: "Hardware asset created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create hardware asset",
        variant: "destructive",
      });
    },
  });

  const updateHardwareAssetMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertHardwareAsset> }) => {
      const res = await apiRequest("PUT", `/api/hardware-assets/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hardware-assets"] });
      setEditingHardware(null);
      setShowHardwareDialog(false);
      toast({
        title: "Success",
        description: "Hardware asset updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update hardware asset",
        variant: "destructive",
      });
    },
  });

  const deleteHardwareAssetMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/hardware-assets/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hardware-assets"] });
      toast({
        title: "Success",
        description: "Hardware asset deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete hardware asset",
        variant: "destructive",
      });
    },
  });

  const updateLicensePoolMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertLicensePool> }) => {
      const res = await apiRequest("PUT", `/api/license-pools/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/license-pools"] });
      setEditingLicense(null);
      setShowLicensePoolDialog(false);
      toast({
        title: "Success",
        description: "License pool updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update license pool",
        variant: "destructive",
      });
    },
  });

  const deleteLicensePoolMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/license-pools/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/license-pools"] });
      toast({
        title: "Success",
        description: "License pool deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete license pool",
        variant: "destructive",
      });
    },
  });

  const filteredHardware = (hardwareAssets || []).filter(asset =>
    asset.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    asset.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (asset.manufacturer && asset.manufacturer.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredLicenses = (licensePools || []).filter(license =>
    license.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    license.vendor?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    license.productName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleHardwareSubmit = (data: InsertHardwareAsset) => {
    if (editingHardware) {
      updateHardwareAssetMutation.mutate({ id: editingHardware.id, data });
    } else {
      createHardwareAssetMutation.mutate(data);
    }
  };

  const handleLicenseSubmit = (data: InsertLicensePool) => {
    if (editingLicense) {
      updateLicensePoolMutation.mutate({ id: editingLicense.id, data });
    } else {
      createLicensePoolMutation.mutate(data);
    }
  };

  const handleEditHardware = (asset: HardwareAsset) => {
    setEditingHardware(asset);
    setShowHardwareDialog(true);
  };

  const handleEditLicense = (license: LicensePool) => {
    setEditingLicense(license);
    setShowLicensePoolDialog(true);
  };

  const handleDeleteHardware = (id: number) => {
    if (confirm("Are you sure you want to delete this hardware asset?")) {
      deleteHardwareAssetMutation.mutate(id);
    }
  };

  const handleDeleteLicense = (id: number) => {
    if (confirm("Are you sure you want to delete this license pool?")) {
      deleteLicensePoolMutation.mutate(id);
    }
  };

  const handleCloseHardwareDialog = () => {
    setShowHardwareDialog(false);
    setEditingHardware(null);
  };

  const handleCloseLicenseDialog = () => {
    setShowLicensePoolDialog(false);
    setEditingLicense(null);
  };

  const togglePoolExpansion = (poolId: number) => {
    const newExpanded = new Set(expandedPools);
    if (newExpanded.has(poolId)) {
      newExpanded.delete(poolId);
    } else {
      newExpanded.add(poolId);
    }
    setExpandedPools(newExpanded);
  };

  const getPoolAllocations = (poolId: number) => {
    return allAllocations[poolId] || [];
  };

  const getTotalAllocatedLicenses = (poolId: number) => {
    const allocations = getPoolAllocations(poolId);
    return allocations.reduce((sum, allocation) => sum + allocation.assignedLicenses, 0);
  };

  return (
    <AppLayout 
      title="Asset Management" 
      subtitle="Manage hardware inventory and software licenses"
    >
          <div className="space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Hardware</p>
                      <p className="text-2xl font-semibold text-gray-900 mt-1">
                        {hardwareAssets.length}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Server className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Available Assets</p>
                      <p className="text-2xl font-semibold text-gray-900 mt-1">
                        {hardwareAssets.filter(asset => asset.status === "available").length}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <Server className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">License Pools</p>
                      <p className="text-2xl font-semibold text-gray-900 mt-1">
                        {licensePools.length}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Key className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Licenses</p>
                      <p className="text-2xl font-semibold text-gray-900 mt-1">
                        {licensePools.reduce((sum, pool) => sum + pool.totalLicenses, 0)}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <Key className="h-6 w-6 text-yellow-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Assets Tabs */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Asset Inventory</CardTitle>
                  <div className="flex space-x-2">
                    <Dialog open={showHardwareDialog} onOpenChange={setShowHardwareDialog}>
                      <DialogTrigger asChild>
                        <Button variant="outline">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Hardware
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden">
                        <DialogHeader>
                          <DialogTitle>{editingHardware ? "Edit Hardware Asset" : "Create New Hardware Asset"}</DialogTitle>
                        </DialogHeader>
                        <div className="flex-1 overflow-y-auto min-h-0">
                          <HardwareAssetForm
                            onSubmit={handleHardwareSubmit}
                            onCancel={handleCloseHardwareDialog}
                            isLoading={createHardwareAssetMutation.isPending || updateHardwareAssetMutation.isPending}
                            asset={editingHardware || undefined}
                          />
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Dialog open={showLicensePoolDialog} onOpenChange={setShowLicensePoolDialog}>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          Add License Pool
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden">
                        <DialogHeader>
                          <DialogTitle>{editingLicense ? "Edit License Pool" : "Create New License Pool"}</DialogTitle>
                        </DialogHeader>
                        <div className="flex-1 overflow-y-auto min-h-0">
                          <LicensePoolForm
                            onSubmit={handleLicenseSubmit}
                            onCancel={handleCloseLicenseDialog}
                            isLoading={createLicensePoolMutation.isPending || updateLicensePoolMutation.isPending}
                            licensePool={editingLicense || undefined}
                          />
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                {/* Search */}
                <div className="mb-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search assets..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <Tabs defaultValue="hardware" className="w-full">
                  <TabsList>
                    <TabsTrigger value="hardware">Hardware Assets</TabsTrigger>
                    <TabsTrigger value="licenses">License Pools</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="hardware" className="space-y-4">
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Asset</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Manufacturer</TableHead>
                            <TableHead>Model</TableHead>
                            <TableHead>Serial Number</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead>PR/PO</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {isLoadingHardware ? (
                            <TableRow>
                              <TableCell colSpan={9} className="text-center py-8">
                                Loading hardware assets...
                              </TableCell>
                            </TableRow>
                          ) : filteredHardware.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={9} className="text-center py-8">
                                <div className="flex flex-col items-center space-y-2">
                                  <Server className="h-8 w-8 text-gray-400" />
                                  <p className="text-gray-500">No hardware assets found</p>
                                  <p className="text-sm text-gray-400">
                                    {searchQuery ? "Try adjusting your search" : "Add your first hardware asset to get started"}
                                  </p>
                                </div>
                              </TableCell>
                            </TableRow>
                          ) : (
                            filteredHardware.map((asset) => (
                              <TableRow key={asset.id}>
                                <TableCell>
                                  <div className="flex items-center space-x-3">
                                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                      <Server className="h-4 w-4 text-blue-600" />
                                    </div>
                                    <div>
                                      <p className="font-medium">{asset.name}</p>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>{asset.category}</TableCell>
                                <TableCell>{asset.manufacturer || "Not specified"}</TableCell>
                                <TableCell>{asset.model || "Not specified"}</TableCell>
                                <TableCell>
                                  <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                                    {asset.serialNumber || "Not available"}
                                  </code>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={getStatusVariant(asset.status)}>
                                    {asset.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>{asset.location || "Not specified"}</TableCell>
                                <TableCell>
                                  <div className="text-xs space-y-1">
                                    {asset.purchaseRequestNumber && (
                                      <div className="text-blue-600">PR: {asset.purchaseRequestNumber}</div>
                                    )}
                                    {asset.purchaseOrderNumber && (
                                      <div className="text-green-600">PO: {asset.purchaseOrderNumber}</div>
                                    )}
                                    {!asset.purchaseRequestNumber && !asset.purchaseOrderNumber && (
                                      <span className="text-gray-400">Not set</span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center space-x-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleEditHardware(asset)}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleDeleteHardware(asset.id)}
                                      className="text-red-600 hover:text-red-700"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="licenses" className="space-y-4">
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">Expand</TableHead>
                            <TableHead>License Pool</TableHead>
                            <TableHead>Vendor</TableHead>
                            <TableHead>Product</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Ordered</TableHead>
                            <TableHead>Total Licenses</TableHead>
                            <TableHead>Allocated</TableHead>
                            <TableHead>Available</TableHead>
                            <TableHead>PR/PO</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {isLoadingLicenses ? (
                            <TableRow>
                              <TableCell colSpan={11} className="text-center py-8">
                                Loading license pools...
                              </TableCell>
                            </TableRow>
                          ) : filteredLicenses.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={11} className="text-center py-8">
                                <div className="flex flex-col items-center space-y-2">
                                  <Key className="h-8 w-8 text-gray-400" />
                                  <p className="text-gray-500">No license pools found</p>
                                  <p className="text-sm text-gray-400">
                                    {searchQuery ? "Try adjusting your search" : "Add your first license pool to get started"}
                                  </p>
                                </div>
                              </TableCell>
                            </TableRow>
                          ) : (
                            filteredLicenses.map((license) => {
                              const allocations = getPoolAllocations(license.id);
                              const totalAllocated = getTotalAllocatedLicenses(license.id);
                              const isExpanded = expandedPools.has(license.id);
                              
                              return (
                                <React.Fragment key={license.id}>
                                  <TableRow>
                                    <TableCell>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => togglePoolExpansion(license.id)}
                                        className="p-1"
                                      >
                                        {isExpanded ? (
                                          <ChevronDown className="h-4 w-4" />
                                        ) : (
                                          <ChevronRight className="h-4 w-4" />
                                        )}
                                      </Button>
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex items-center space-x-3">
                                        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                                          <Key className="h-4 w-4 text-purple-600" />
                                        </div>
                                        <div>
                                          <p className="font-medium">{license.name}</p>
                                          {allocations.length > 0 && (
                                            <p className="text-xs text-gray-500">
                                              {allocations.length} client{allocations.length !== 1 ? 's' : ''}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    </TableCell>
                                    <TableCell>{license.vendor}</TableCell>
                                    <TableCell>{license.productName}</TableCell>
                                    <TableCell>
                                      <Badge variant="outline">
                                        {license.licenseType || "Standard"}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      <span className="font-medium text-blue-600">
                                        {license.orderedLicenses || 0}
                                      </span>
                                    </TableCell>
                                    <TableCell>{license.totalLicenses}</TableCell>
                                    <TableCell>
                                      <div className="flex items-center space-x-2">
                                        <span className={totalAllocated > 0 ? "font-medium text-blue-600" : "text-gray-500"}>
                                          {totalAllocated}
                                        </span>
                                        {totalAllocated > 0 && (
                                          <Users className="h-3 w-3 text-gray-400" />
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <span className={license.availableLicenses > 0 ? "text-green-600" : "text-red-600"}>
                                        {license.availableLicenses}
                                      </span>
                                    </TableCell>
                                    <TableCell>
                                      <div className="text-xs space-y-1">
                                        {license.purchaseRequestNumber && (
                                          <div className="text-blue-600">PR: {license.purchaseRequestNumber}</div>
                                        )}
                                        {license.purchaseOrderNumber && (
                                          <div className="text-green-600">PO: {license.purchaseOrderNumber}</div>
                                        )}
                                        {!license.purchaseRequestNumber && !license.purchaseOrderNumber && (
                                          <span className="text-gray-400">Not set</span>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex items-center space-x-2">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleEditLicense(license)}
                                        >
                                          <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleDeleteLicense(license.id)}
                                          className="text-red-600 hover:text-red-700"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                  
                                  {/* Expandable allocation details */}
                                  {isExpanded && (
                                    <TableRow>
                                      <TableCell colSpan={11} className="bg-gray-50 border-b border-gray-200">
                                        <div className="py-3">
                                          {allocations.length > 0 ? (
                                            <div>
                                              <h4 className="font-medium text-sm text-gray-700 mb-3 flex items-center">
                                                <Users className="h-4 w-4 mr-2" />
                                                Client Allocations ({allocations.length})
                                              </h4>
                                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                {allocations.map((allocation) => (
                                                  <div key={allocation.id} className="bg-white p-3 rounded-md border border-gray-200">
                                                    <div className="flex justify-between items-start">
                                                      <div>
                                                        <p className="font-medium text-sm text-gray-900">
                                                          {allocation.clientName}
                                                        </p>
                                                        <p className="text-xs text-gray-500">
                                                          Allocated: {new Date(allocation.assignedDate).toLocaleDateString()}
                                                        </p>
                                                        {allocation.notes && (
                                                          <p className="text-xs text-gray-600 mt-1">
                                                            {allocation.notes}
                                                          </p>
                                                        )}
                                                      </div>
                                                      <div className="text-right">
                                                        <p className="font-semibold text-lg text-blue-600">
                                                          {allocation.assignedLicenses.toLocaleString()}
                                                        </p>
                                                        <p className="text-xs text-gray-500">licenses</p>
                                                      </div>
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                              <div className="mt-3 pt-3 border-t border-gray-200">
                                                <div className="flex justify-between text-sm">
                                                  <span className="text-gray-600">Total Allocated:</span>
                                                  <span className="font-medium text-blue-600">
                                                    {totalAllocated.toLocaleString()} licenses
                                                  </span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                  <span className="text-gray-600">Remaining Available:</span>
                                                  <span className={`font-medium ${license.availableLicenses > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    {license.availableLicenses.toLocaleString()} licenses
                                                  </span>
                                                </div>
                                              </div>
                                            </div>
                                          ) : (
                                            <div className="text-center py-6">
                                              <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                              <p className="text-sm text-gray-500">No client allocations yet</p>
                                              <p className="text-xs text-gray-400">
                                                All {license.totalLicenses} licenses are available for allocation
                                              </p>
                                            </div>
                                          )}
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  )}
                                </React.Fragment>
                              );
                            })
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
    </AppLayout>
  );
}
