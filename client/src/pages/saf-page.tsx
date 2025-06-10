import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ServiceAuthorizationForm, InsertServiceAuthorizationForm, Client, Contract } from "@shared/schema";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, FileText, Edit, Trash2, Download, Eye } from "lucide-react";
import { SAFForm } from "@/components/forms/saf-form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from '@/lib/utils';
import { formatDate } from '@/lib/utils';

export default function SAFPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showSAFDialog, setShowSAFDialog] = useState(false);
  const [editingSAF, setEditingSAF] = useState<ServiceAuthorizationForm | null>(null);
  const { toast } = useToast();

  const { data: safs = [], isLoading: isLoadingSAFs } = useQuery<ServiceAuthorizationForm[]>({
    queryKey: ["/api/service-authorization-forms"],
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: contracts = [] } = useQuery<Contract[]>({
    queryKey: ["/api/contracts"],
  });

  const createSAFMutation = useMutation({
    mutationFn: async (data: InsertServiceAuthorizationForm) => {
      const res = await apiRequest("POST", "/api/service-authorization-forms", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-authorization-forms"] });
      setShowSAFDialog(false);
      toast({
        title: "Success",
        description: "SAF created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create SAF",
        variant: "destructive",
      });
    },
  });

  const updateSAFMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertServiceAuthorizationForm> }) => {
      const res = await apiRequest("PUT", `/api/service-authorization-forms/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-authorization-forms"] });
      setEditingSAF(null);
      setShowSAFDialog(false);
      toast({
        title: "Success",
        description: "SAF updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update SAF",
        variant: "destructive",
      });
    },
  });

  const deleteSAFMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/service-authorization-forms/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-authorization-forms"] });
      toast({
        title: "Success",
        description: "SAF deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete SAF",
        variant: "destructive",
      });
    },
  });

  const filteredSAFs = safs.filter(saf =>
    saf.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    saf.safNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    getClientName(saf.clientId).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "draft":
        return "secondary";
      case "pending":
        return "default";
      case "approved":
        return "default";
      case "active":
        return "default";
      case "completed":
        return "default";
      case "cancelled":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const getClientName = (clientId: number) => {
    const client = clients.find(c => c.id === clientId);
    return client?.name || "Unknown Client";
  };

  const getContractName = (contractId: number) => {
    const contract = contracts.find(c => c.id === contractId);
    return contract?.name || "Unknown Contract";
  };

  const handleSAFSubmit = (data: InsertServiceAuthorizationForm) => {
    if (editingSAF) {
      updateSAFMutation.mutate({ id: editingSAF.id, data });
    } else {
      createSAFMutation.mutate(data);
    }
  };

  const handleEditSAF = (saf: ServiceAuthorizationForm) => {
    setEditingSAF(saf);
    setShowSAFDialog(true);
  };

  const handleDeleteSAF = (id: number) => {
    if (confirm("Are you sure you want to delete this SAF?")) {
      deleteSAFMutation.mutate(id);
    }
  };

  const handleCloseSAFDialog = () => {
    setShowSAFDialog(false);
    setEditingSAF(null);
  };

  const handleDownload = (saf: ServiceAuthorizationForm) => {
    if (saf.documentUrl) {
      window.open(saf.documentUrl, '_blank');
    } else {
      toast({
        title: "No Document",
        description: "No document URL available for this SAF",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (amount: number | string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(parseFloat(amount.toString()));
  };

  return (
    <AppLayout 
      title="Service Authorization Forms" 
      subtitle="Manage SAFs for client services"
    >
      <div className="space-y-6">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total SAFs</p>
                  <p className="text-2xl font-semibold text-gray-900 mt-1">
                    {safs.length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active SAFs</p>
                  <p className="text-2xl font-semibold text-gray-900 mt-1">
                    {safs.filter(saf => saf.status === "active").length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <FileText className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending SAFs</p>
                  <p className="text-2xl font-semibold text-gray-900 mt-1">
                    {safs.filter(saf => saf.status === "pending").length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <FileText className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Value</p>
                  <p className="text-2xl font-semibold text-gray-900 mt-1">
                    {formatCurrency(safs.reduce((sum, saf) => sum + parseFloat(saf.value || "0"), 0))}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <FileText className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* SAFs Management */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Service Authorization Forms</CardTitle>
              <Dialog open={showSAFDialog} onOpenChange={setShowSAFDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create SAF
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
                  <DialogHeader className="flex-shrink-0">
                    <DialogTitle>{editingSAF ? "Edit SAF" : "Create New SAF"}</DialogTitle>
                  </DialogHeader>
                  <div className="flex-1 overflow-y-auto pr-2 -mr-2">
                    <SAFForm
                      onSubmit={handleSAFSubmit}
                      onCancel={handleCloseSAFDialog}
                      isLoading={createSAFMutation.isPending || updateSAFMutation.isPending}
                      saf={editingSAF || undefined}
                    />
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          
          <CardContent>
            {/* Search */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search SAFs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SAF Number</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Contract</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingSAFs ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        Loading SAFs...
                      </TableCell>
                    </TableRow>
                  ) : filteredSAFs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        <div className="flex flex-col items-center space-y-2">
                          <FileText className="h-8 w-8 text-gray-400" />
                          <p className="text-gray-500">No SAFs found</p>
                          <p className="text-sm text-gray-400">
                            {searchQuery ? "Try adjusting your search" : "Create your first SAF to get started"}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSAFs.map((saf) => (
                      <TableRow key={saf.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                              <FileText className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium">{saf.safNumber}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{saf.title}</p>
                            {saf.description && (
                              <p className="text-sm text-gray-500 truncate max-w-xs">
                                {saf.description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getClientName(saf.clientId)}</TableCell>
                        <TableCell>{getContractName(saf.contractId)}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(saf.status)}>
                            {saf.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(saf.startDate)}</TableCell>
                        <TableCell>{formatDate(saf.endDate)}</TableCell>
                        <TableCell>{formatCurrency(saf.value)}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {saf.documentUrl && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownload(saf)}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditSAF(saf)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteSAF(saf.id)}
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
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
} 