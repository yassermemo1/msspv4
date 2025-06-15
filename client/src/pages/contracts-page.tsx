import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Contract, InsertContract, Client, ServiceScope } from "@shared/schema";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, Edit, Trash2, FileText, Building } from "lucide-react";
import { ContractForm } from "@/components/forms/contract-form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getStatusColor, getStatusIcon, getStatusBadge, getStatusVariant } from '@/lib/status-utils';
import { ColumnVisibility, ColumnDefinition } from "@/components/ui/column-visibility";
import { useColumnPreferences } from "@/hooks/use-column-preferences";

// Define SelectedService interface since it's not in schema
interface SelectedService {
  serviceId: number;
  serviceName: string;
  scopeData: Record<string, any>;
}

export default function ContractsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const { toast } = useToast();
  const [location, setLocation] = useLocation();

  // Query for service scopes
  const { data: serviceScopes = [] } = useQuery<ServiceScope[]>({
    queryKey: ["/api/service-scopes"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/service-scopes");
      const json = await res.json();
      // The service returns an object { data: ServiceScope[], pagination: {...} }
      // Extract the array if present; otherwise fall back to empty array.
      if (Array.isArray(json)) {
        return json as ServiceScope[];
      }
      if (json && Array.isArray(json.data)) {
        return json.data as ServiceScope[];
      }
      return [] as ServiceScope[];
    },
  });

  // Query for contracts with client information
  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ["/api/contracts"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/contracts");
      return await res.json();
    },
  });

  // Enhanced contracts with service scope information
  const enhancedContracts = contracts.map(contract => {
    const contractScopes = serviceScopes.filter(scope => scope.contractId === contract.id);
    return {
      ...contract,
      serviceScopes: contractScopes,
      scopesCount: contractScopes.length,
      scopesSummary: contractScopes.map(scope => {
        const scopeDef = scope.scopeDefinition;
        if (typeof scopeDef === 'object' && scopeDef) {
          // Extract field details from scope definition
          const details = [];
          for (const [key, value] of Object.entries(scopeDef)) {
            if (key !== 'description' && key !== 'deliverables' && value) {
              const fieldLabel = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
              details.push(`${fieldLabel}: ${Array.isArray(value) ? value.join(', ') : value}`);
            }
          }
          return details.length > 0 ? details.join(' | ') : scopeDef.description || 'No details';
        }
        return scopeDef || 'No scope details';
      }).join(' • ')
    };
  });

  const { data: clients = [], isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const createContractMutation = useMutation({
    mutationFn: async (contractData: InsertContract & { services: SelectedService[] }) => {
      const res = await apiRequest("POST", "/api/contracts", contractData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/service-scopes"] });
      setIsFormOpen(false);
      toast({
        title: "Success",
        description: "Contract created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create contract",
        variant: "destructive",
      });
    },
  });

  const updateContractMutation = useMutation({
    mutationFn: async ({ id, contractData }: { id: number; contractData: Partial<InsertContract> & { services?: SelectedService[] } }) => {
      const res = await apiRequest("PUT", `/api/contracts/${id}`, contractData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/service-scopes"] });
      setIsFormOpen(false);
      setEditingContract(null);
      toast({
        title: "Success",
        description: "Contract updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update contract",
        variant: "destructive",
      });
    },
  });

  const deleteContractMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/contracts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      toast({
        title: "Success",
        description: "Contract deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete contract",
        variant: "destructive",
      });
    },
  });

  const filteredContracts = enhancedContracts.filter(contract =>
    contract.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getClientName = (clientId: number) => {
    const client = clients.find(c => c.id === clientId);
    return client?.name || "Unknown Client";
  };

  const handleEdit = (contract: Contract) => {
    setEditingContract(contract);
    setIsFormOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this contract?")) {
      deleteContractMutation.mutate(id);
    }
  };

  const handleFormSubmit = (data: InsertContract & { services: SelectedService[] }) => {
    if (editingContract) {
      updateContractMutation.mutate({ id: editingContract.id, contractData: data });
    } else {
      createContractMutation.mutate(data);
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingContract(null);
  };

  // Column visibility setup
  const contractColumns: ColumnDefinition[] = [
    { key: "name", label: "Contract", defaultVisible: true, mandatory: true },
    { key: "client", label: "Client", defaultVisible: true, mandatory: true },
    { key: "status", label: "Status", defaultVisible: true },
    { key: "value", label: "Value", defaultVisible: false },
    { key: "startDate", label: "Start Date", defaultVisible: true },
    { key: "endDate", label: "End Date", defaultVisible: true },
    { key: "scopes", label: "Service Scopes", defaultVisible: false },
    { key: "actions", label: "Actions", defaultVisible: true, mandatory: true },
  ];

  const {
    visibleColumns,
    handleVisibilityChange,
    resetToDefaults,
    isColumnVisible,
  } = useColumnPreferences({
    storageKey: "contracts-table-columns",
    columns: contractColumns,
  });

  return (
    <AppLayout 
      title="Contract Management" 
      subtitle="Manage client contracts and service agreements"
    >
      <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Contracts</CardTitle>
                <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Contract
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[95vh] flex flex-col overflow-hidden">
                    <DialogHeader className="flex-shrink-0 border-b pb-4">
                      <DialogTitle>
                        {editingContract ? "Edit Contract" : "Add New Contract"}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto px-1">
                      <div className="max-h-[70vh] overflow-y-auto">
                        <ContractForm
                          contract={editingContract}
                          clients={clients || []}
                          onSubmit={handleFormSubmit}
                          onCancel={handleFormClose}
                          isLoading={createContractMutation.isPending || updateContractMutation.isPending || clientsLoading}
                        />
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            
            <CardContent>
              {/* Search */}
              <div className="mb-6 flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search contracts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <ColumnVisibility
                  columns={contractColumns}
                  visibleColumns={visibleColumns}
                  onVisibilityChange={handleVisibilityChange}
                  onReset={resetToDefaults}
                />
              </div>

              {/* Contract Table */}
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {isColumnVisible("name") && <TableHead>Contract</TableHead>}
                      {isColumnVisible("client") && <TableHead>Client</TableHead>}
                      {isColumnVisible("status") && <TableHead>Status</TableHead>}
                      {isColumnVisible("value") && <TableHead>Value</TableHead>}
                      {isColumnVisible("startDate") && <TableHead>Start Date</TableHead>}
                      {isColumnVisible("endDate") && <TableHead>End Date</TableHead>}
                      {isColumnVisible("scopes") && <TableHead>Service Scopes</TableHead>}
                      {isColumnVisible("actions") && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          Loading contracts...
                        </TableCell>
                      </TableRow>
                    ) : filteredContracts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <div className="flex flex-col items-center space-y-2">
                            <FileText className="h-8 w-8 text-gray-400" />
                            <p className="text-gray-500">No contracts found</p>
                            <p className="text-sm text-gray-400">
                              {searchQuery ? "Try adjusting your search" : "Add your first contract to get started"}
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredContracts.map((contract) => (
                        <TableRow key={contract.id}>
                          {isColumnVisible("name") && (
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                                <FileText className="h-4 w-4 text-green-600" />
                              </div>
                              <div>
                                <button 
                                  onClick={() => setLocation(`/contracts/${contract.id}`)}
                                  className="font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer text-left"
                                >
                                  {contract.name}
                                </button>
                              </div>
                            </div>
                          </TableCell>
                          )}
                          {isColumnVisible("client") && (
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Building className="h-4 w-4 text-gray-400" />
                              <span className="text-sm">{getClientName(contract.clientId)}</span>
                            </div>
                          </TableCell>
                          )}
                          {isColumnVisible("status") && (
                          <TableCell>
                            <Badge variant={getStatusVariant(contract.status)}>
                              {contract.status}
                            </Badge>
                          </TableCell>
                          )}
                          {isColumnVisible("value") && (
                          <TableCell>
                            <span className="font-medium">
                              {contract.totalValue ? `$${parseFloat(contract.totalValue).toLocaleString()}` : "Not set"}
                            </span>
                          </TableCell>
                          )}
                          {isColumnVisible("startDate") && (
                          <TableCell>
                            <span className="text-sm">
                              {new Date(contract.startDate).toLocaleDateString()}
                            </span>
                          </TableCell>
                          )}
                          {isColumnVisible("endDate") && (
                          <TableCell>
                            <span className="text-sm">
                              {new Date(contract.endDate).toLocaleDateString()}
                            </span>
                          </TableCell>
                          )}
                          {isColumnVisible("scopes") && (
                          <TableCell>
                            <div className="space-y-1">
                              {contract.scopesCount > 0 ? (
                                <>
                                  <div className="flex items-center space-x-1">
                                    <Badge variant="outline" className="text-xs">
                                      {contract.scopesCount} scope{contract.scopesCount !== 1 ? 's' : ''}
                                    </Badge>
                                  </div>
                                  {contract.scopesSummary && (
                                    <p className="text-xs text-gray-600 truncate max-w-xs" title={contract.scopesSummary}>
                                      {contract.scopesSummary}
                                    </p>
                                  )}
                                </>
                              ) : (
                                <span className="text-xs text-gray-400">No scopes</span>
                              )}
                            </div>
                          </TableCell>
                          )}
                          {isColumnVisible("actions") && (
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(contract)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(contract.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                          )}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-gray-600">
                  Showing {filteredContracts.length} of {contracts.length} contracts
                </p>
              </div>
            </CardContent>
          </Card>
    </AppLayout>
  );
}
