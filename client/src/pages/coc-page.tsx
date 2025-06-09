import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { CertificateOfCompliance, InsertCertificateOfCompliance, Client, Contract, ServiceAuthorizationForm } from "@shared/schema";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, Shield, Edit, Trash2, Download, AlertTriangle } from "lucide-react";
import { COCForm } from "@/components/forms/coc-form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from '@/lib/utils';

export default function COCPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showCOCDialog, setShowCOCDialog] = useState(false);
  const [editingCOC, setEditingCOC] = useState<CertificateOfCompliance | null>(null);
  const { toast } = useToast();

  const { data: cocs = [], isLoading: isLoadingCOCs } = useQuery<CertificateOfCompliance[]>({
    queryKey: ["/api/certificates-of-compliance"],
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: contracts = [] } = useQuery<Contract[]>({
    queryKey: ["/api/contracts"],
  });

  const { data: safs = [] } = useQuery<ServiceAuthorizationForm[]>({
    queryKey: ["/api/service-authorization-forms"],
  });

  const createCOCMutation = useMutation({
    mutationFn: async (data: InsertCertificateOfCompliance) => {
      const res = await apiRequest("POST", "/api/certificates-of-compliance", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/certificates-of-compliance"] });
      setShowCOCDialog(false);
      toast({
        title: "Success",
        description: "COC created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create COC",
        variant: "destructive",
      });
    },
  });

  const updateCOCMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertCertificateOfCompliance> }) => {
      const res = await apiRequest("PUT", `/api/certificates-of-compliance/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/certificates-of-compliance"] });
      setEditingCOC(null);
      setShowCOCDialog(false);
      toast({
        title: "Success",
        description: "COC updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update COC",
        variant: "destructive",
      });
    },
  });

  const deleteCOCMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/certificates-of-compliance/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/certificates-of-compliance"] });
      toast({
        title: "Success",
        description: "COC deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete COC",
        variant: "destructive",
      });
    },
  });

  const filteredCOCs = cocs.filter(coc =>
    coc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    coc.cocNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    coc.complianceType.toLowerCase().includes(searchQuery.toLowerCase()) ||
    getClientName(coc.clientId).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "draft":
        return "secondary";
      case "issued":
        return "default";
      case "active":
        return "default";
      case "expired":
        return "destructive";
      case "revoked":
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

  const getSAFNumber = (safId: number) => {
    const saf = safs.find(s => s.id === safId);
    return saf?.safNumber || "Unknown SAF";
  };

  const handleCOCSubmit = (data: InsertCertificateOfCompliance) => {
    if (editingCOC) {
      updateCOCMutation.mutate({ id: editingCOC.id, data });
    } else {
      createCOCMutation.mutate(data);
    }
  };

  const handleEditCOC = (coc: CertificateOfCompliance) => {
    setEditingCOC(coc);
    setShowCOCDialog(true);
  };

  const handleDeleteCOC = (id: number) => {
    if (confirm("Are you sure you want to delete this COC?")) {
      deleteCOCMutation.mutate(id);
    }
  };

  const handleCloseCOCDialog = () => {
    setShowCOCDialog(false);
    setEditingCOC(null);
  };

  const handleDownload = (coc: CertificateOfCompliance) => {
    if (coc.documentUrl) {
      window.open(coc.documentUrl, '_blank');
    } else {
      toast({
        title: "No Document",
        description: "No document URL available for this COC",
        variant: "destructive",
      });
    }
  };
);
  };

  const isExpiringSoon = (expiryDate: string | Date | null) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  };

  const isExpired = (expiryDate: string | Date | null) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const today = new Date();
    return expiry < today;
  };

  const expiringSoonCOCs = cocs.filter(coc => isExpiringSoon(coc.expiryDate));
  const expiredCOCs = cocs.filter(coc => isExpired(coc.expiryDate));

  return (
    <AppLayout 
      title="Certificate of Compliance" 
      subtitle="Manage compliance certificates for clients"
    >
      <div className="space-y-6">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total COCs</p>
                  <p className="text-2xl font-semibold text-gray-900 mt-1">
                    {cocs.length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Shield className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active COCs</p>
                  <p className="text-2xl font-semibold text-gray-900 mt-1">
                    {cocs.filter(coc => coc.status === "active").length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Shield className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Expiring Soon</p>
                  <p className="text-2xl font-semibold text-gray-900 mt-1">
                    {expiringSoonCOCs.length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Expired</p>
                  <p className="text-2xl font-semibold text-gray-900 mt-1">
                    {expiredCOCs.length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* COCs Management */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Certificate of Compliance</CardTitle>
              <Dialog open={showCOCDialog} onOpenChange={setShowCOCDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create COC
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden">
                  <DialogHeader>
                    <DialogTitle>{editingCOC ? "Edit COC" : "Create New COC"}</DialogTitle>
                  </DialogHeader>
                  <COCForm
                    onSubmit={handleCOCSubmit}
                    onCancel={handleCloseCOCDialog}
                    isLoading={createCOCMutation.isPending || updateCOCMutation.isPending}
                    coc={editingCOC || undefined}
                  />
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
                  placeholder="Search COCs..."
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
                    <TableHead>COC Number</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Compliance Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Issue Date</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead>Next Audit</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingCOCs ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        Loading COCs...
                      </TableCell>
                    </TableRow>
                  ) : filteredCOCs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        <div className="flex flex-col items-center space-y-2">
                          <Shield className="h-8 w-8 text-gray-400" />
                          <p className="text-gray-500">No COCs found</p>
                          <p className="text-sm text-gray-400">
                            {searchQuery ? "Try adjusting your search" : "Create your first COC to get started"}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCOCs.map((coc) => (
                      <TableRow key={coc.id} className={isExpired(coc.expiryDate) ? "bg-red-50" : isExpiringSoon(coc.expiryDate) ? "bg-yellow-50" : ""}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                              <Shield className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium">{coc.cocNumber}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{coc.title}</p>
                            {coc.description && (
                              <p className="text-sm text-gray-500 truncate max-w-xs">
                                {coc.description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getClientName(coc.clientId)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{coc.complianceType}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(coc.status)}>
                            {coc.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(coc.issueDate)}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <span>{formatDate(coc.expiryDate)}</span>
                            {isExpired(coc.expiryDate) && (
                              <AlertTriangle className="h-4 w-4 text-red-500" />
                            )}
                            {isExpiringSoon(coc.expiryDate) && !isExpired(coc.expiryDate) && (
                              <AlertTriangle className="h-4 w-4 text-yellow-500" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(coc.nextAuditDate)}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {coc.documentUrl && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownload(coc)}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditCOC(coc)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteCOC(coc.id)}
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