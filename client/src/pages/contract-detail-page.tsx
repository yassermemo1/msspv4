import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { 
  Contract, Client, Service, ServiceScope, Document,
  ServiceAuthorizationForm, CertificateOfCompliance, User
} from "@shared/schema";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { 
  Building, 
  Edit, 
  FileText, 
  DollarSign, 
  Calendar,
  ArrowLeft,
  Download,
  Eye,
  Clock,
  Shield,
  ExternalLink,
  Settings,
  Users
} from "lucide-react";
import { ContractForm } from "@/components/forms/contract-form";
import { EntityRelationshipsPanel } from "@/components/ui/entity-relationships-panel";
import { EntityLink } from "@/components/ui/entity-link";
import { ENTITY_TYPES } from "@shared/entity-relations";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from '@/lib/utils';
import { formatDate } from '@/lib/utils';

export default function ContractDetailPage() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const { toast } = useToast();

  const contractId = id ? parseInt(id, 10) : null;
  
  const { data: contract, isLoading, error } = useQuery<Contract>({
    queryKey: ["/api/contracts", contractId],
    queryFn: async () => {
      if (!contractId) throw new Error("No contract ID provided");
      const response = await fetch(`/api/contracts/${contractId}`, {
        credentials: "include"
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch contract: ${response.status} ${errorText}`);
      }
      return response.json();
    },
    enabled: !!contractId,
  });

  const { data: client } = useQuery<Client>({
    queryKey: ["/api/clients", contract?.clientId],
    queryFn: async () => {
      if (!contract?.clientId) throw new Error("No client ID available");
      const response = await fetch(`/api/clients/${contract.clientId}`, {
        credentials: "include"
      });
      if (!response.ok) {
        throw new Error("Failed to fetch client");
      }
      return response.json();
    },
    enabled: !!contract?.clientId,
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: serviceScopes = [] } = useQuery<ServiceScope[]>({
    queryKey: ["/api/contracts", contractId, "service-scopes"],
    queryFn: async () => {
      if (!contractId) return [];
      const response = await fetch(`/api/contracts/${contractId}/service-scopes`, {
        credentials: "include"
      });
      if (!response.ok) {
        console.error("Failed to fetch service scopes");
        return [];
      }
      return response.json();
    },
    enabled: !!contractId,
  });

  const { data: contractDocuments = [] } = useQuery<Document[]>({
    queryKey: ["/api/documents", "contract", contractId],
    queryFn: async () => {
      if (!contractId) return [];
      const response = await fetch(`/api/documents?contractId=${contractId}`, {
        credentials: "include"
      });
      if (!response.ok) {
        console.error("Failed to fetch contract documents");
        return [];
      }
      return response.json();
    },
    enabled: !!contractId,
  });

  const { data: contractSAFs = [] } = useQuery<ServiceAuthorizationForm[]>({
    queryKey: ["/api/service-authorization-forms", "contract", contractId],
    queryFn: async () => {
      if (!contractId) return [];
      const response = await fetch(`/api/service-authorization-forms?contractId=${contractId}`, {
        credentials: "include"
      });
      if (!response.ok) {
        console.error("Failed to fetch contract SAFs");
        return [];
      }
      return response.json();
    },
    enabled: !!contractId,
  });

  const { data: contractCOCs = [] } = useQuery<CertificateOfCompliance[]>({
    queryKey: ["/api/certificates-of-compliance", "contract", contractId],
    queryFn: async () => {
      if (!contractId) return [];
      const response = await fetch(`/api/certificates-of-compliance?contractId=${contractId}`, {
        credentials: "include"
      });
      if (!response.ok) {
        console.error("Failed to fetch contract COCs");
        return [];
      }
      return response.json();
    },
    enabled: !!contractId,
  });

  const updateContractMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PUT", `/api/contracts/${contractId}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts", contractId] });
      setIsEditOpen(false);
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

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      case 'terminated':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !contract) {
    return (
      <AppLayout title="Contract Not Found">
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <FileText className="h-16 w-16 text-gray-400" />
          <h2 className="text-2xl font-semibold text-gray-900">Contract Not Found</h2>
          <p className="text-gray-600 text-center max-w-md">
            The contract you're looking for doesn't exist or you don't have permission to view it.
          </p>
          <Button onClick={() => setLocation("/contracts")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Contracts
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout 
      title={contract.name}
      subtitle={`Contract #${contract.id} - ${client?.name || 'Loading...'}`}
    >
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => setLocation("/contracts")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Contracts
          </Button>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => setIsEditOpen(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Contract
            </Button>
            {contract.documentUrl && (
              <Button variant="outline" onClick={() => window.open(contract.documentUrl!, '_blank')}>
                <Download className="h-4 w-4 mr-2" />
                Download Document
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contract Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Contract Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Contract Name</label>
                    <p className="text-lg font-semibold">{contract.name}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500">Status</label>
                    <div className="mt-1">
                      <Badge className={getStatusColor(contract.status)}>
                        {contract.status}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500">Total Value</label>
                    <p className="text-lg font-semibold text-green-600">
                      {contract.totalValue ? formatCurrency(contract.totalValue) : 'Not specified'}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500">Contract Period</label>
                    <p className="text-sm">
                      {formatDate(contract.startDate)} - {formatDate(contract.endDate)}
                    </p>
                  </div>

                  {contract.autoRenewal && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Auto Renewal</label>
                      <p className="text-sm">Yes</p>
                    </div>
                  )}

                  {contract.renewalTerms && (
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-gray-500">Renewal Terms</label>
                      <p className="text-sm mt-1">{contract.renewalTerms}</p>
                    </div>
                  )}
                </div>

                {contract.notes && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Notes</label>
                    <p className="text-sm mt-1 p-3 bg-gray-50 rounded-md">{contract.notes}</p>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <div className="flex items-center text-sm text-gray-500">
                    <Calendar className="h-4 w-4 mr-1" />
                    Created: {formatDate(contract.createdAt)}
                    {contract.updatedAt && contract.updatedAt !== contract.createdAt && (
                      <span className="ml-4">
                        Last updated: {formatDate(contract.updatedAt)}
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabs for Related Data */}
            <Tabs defaultValue="service-scopes" className="space-y-6">
              <TabsList>
                <TabsTrigger value="service-scopes">Service Scopes ({serviceScopes.length})</TabsTrigger>
                <TabsTrigger value="safs">SAFs ({contractSAFs.length})</TabsTrigger>
                <TabsTrigger value="cocs">COCs ({contractCOCs.length})</TabsTrigger>
                <TabsTrigger value="documents">Documents ({contractDocuments.length})</TabsTrigger>
                <TabsTrigger value="relationships">Relationships</TabsTrigger>
              </TabsList>

              <TabsContent value="service-scopes">
                <Card>
                  <CardHeader>
                    <CardTitle>Service Scopes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {serviceScopes.length > 0 ? (
                      <div className="space-y-4">
                        {serviceScopes.map((scope) => {
                          // Parse scope definition to extract field values
                          const scopeDefinition = scope.scopeDefinition;
                          const description = typeof scopeDefinition === 'string' 
                            ? scopeDefinition 
                            : scopeDefinition?.description || 'No description available';
                          
                          // Extract field details from scope definition
                          const getFieldDetails = () => {
                            if (!scopeDefinition || typeof scopeDefinition === 'string') return [];
                            
                            const fields = [];
                            for (const [key, value] of Object.entries(scopeDefinition)) {
                              if (key !== 'description' && key !== 'deliverables' && value) {
                                // Format field name (convert camelCase to readable format)
                                const fieldLabel = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                                fields.push({ label: fieldLabel, value: value });
                              }
                            }
                            return fields;
                          };
                          
                          const fieldDetails = getFieldDetails();
                          const deliverables = scopeDefinition?.deliverables || [];
                          
                          return (
                            <div key={scope.id} className="border rounded-lg p-4">
                              <div className="flex items-center justify-between mb-3">
                                <div>
                                  <h4 className="font-medium">{scope.serviceName || `Service Scope #${scope.id}`}</h4>
                                  <p className="text-sm text-gray-600 mt-1">
                                    {formatDate(scope.startDate)} - {formatDate(scope.endDate)}
                                  </p>
                                </div>
                                <div className="text-right">
                                  {scope.monthlyValue && (
                                    <p className="font-medium">{formatCurrency(scope.monthlyValue)}/month</p>
                                  )}
                                  <Badge variant="outline">{scope.status}</Badge>
                                </div>
                              </div>
                              
                              {description && (
                                <div className="mb-3">
                                  <p className="text-sm font-medium text-gray-700 mb-1">Description:</p>
                                  <p className="text-sm text-gray-600">{description}</p>
                                </div>
                              )}
                              
                              {fieldDetails.length > 0 && (
                                <div className="mb-3">
                                  <p className="text-sm font-medium text-gray-700 mb-2">Scope Details:</p>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {fieldDetails.map((field, index) => (
                                      <div key={index} className="flex items-center space-x-2">
                                        <span className="text-sm font-medium text-gray-600">{field.label}:</span>
                                        <span className="text-sm text-gray-800">
                                          {Array.isArray(field.value) ? field.value.join(', ') : field.value.toString()}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {Array.isArray(deliverables) && deliverables.length > 0 && (
                                <div>
                                  <p className="text-sm font-medium text-gray-700 mb-2">Deliverables:</p>
                                  <div className="flex flex-wrap gap-2">
                                    {deliverables.map((deliverable, index) => (
                                      <Badge key={index} variant="outline" className="text-xs">
                                        {deliverable}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-8">No service scopes found for this contract.</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="safs">
                <Card>
                  <CardHeader>
                    <CardTitle>Service Authorization Forms</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {contractSAFs.length > 0 ? (
                      <div className="space-y-4">
                        {contractSAFs.map((saf) => (
                          <div key={saf.id} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-medium">{saf.safNumber}</h4>
                                <p className="text-sm text-gray-600">
                                  {formatDate(saf.startDate)} - {formatDate(saf.endDate)}
                                </p>
                                {saf.description && (
                                  <p className="text-sm text-gray-700 mt-2">{saf.description}</p>
                                )}
                              </div>
                              <div className="text-right">
                                {saf.value && (
                                  <p className="font-medium text-green-600">{formatCurrency(saf.value)}</p>
                                )}
                                <Badge variant="outline">{saf.status}</Badge>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-8">No SAFs found for this contract.</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="cocs">
                <Card>
                  <CardHeader>
                    <CardTitle>Certificates of Compliance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {contractCOCs.length > 0 ? (
                      <div className="space-y-4">
                        {contractCOCs.map((coc) => (
                          <div key={coc.id} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-medium">{coc.cocNumber}</h4>
                                <p className="text-sm text-gray-600">{coc.title}</p>
                                {coc.description && (
                                  <p className="text-sm text-gray-700 mt-2">{coc.description}</p>
                                )}
                                <div className="mt-2 space-y-1">
                                  <p className="text-sm text-gray-600">
                                    <Calendar className="inline h-3 w-3 mr-1" />
                                    Issued: {formatDate(coc.issueDate)}
                                  </p>
                                  {coc.expiryDate && (
                                    <p className="text-sm text-gray-600">
                                      <Clock className="inline h-3 w-3 mr-1" />
                                      Expires: {formatDate(coc.expiryDate)}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <Badge variant="outline">{coc.status}</Badge>
                                {coc.documentUrl && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-2"
                                    onClick={() => window.open(coc.documentUrl!, '_blank')}
                                  >
                                    <ExternalLink className="h-3 w-3 mr-1" />
                                    View
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-8">No COCs found for this contract.</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="documents">
                <Card>
                  <CardHeader>
                    <CardTitle>Contract Documents</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {contractDocuments.length > 0 ? (
                      <div className="space-y-4">
                        {contractDocuments.map((doc) => (
                          <div key={doc.id} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                  <FileText className="h-4 w-4 text-blue-600" />
                                </div>
                                <div>
                                  <p className="font-medium">{doc.name}</p>
                                  {doc.description && (
                                    <p className="text-sm text-gray-600">{doc.description}</p>
                                  )}
                                  <p className="text-xs text-gray-500 mt-1">
                                    Uploaded: {formatDate(doc.createdAt)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Badge variant="outline">{doc.documentType}</Badge>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(`/uploads/${doc.fileName}`, '_blank')}
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  View
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-8">No documents found for this contract.</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="relationships">
                <Card>
                  <CardHeader>
                    <CardTitle>Entity Relationships</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <EntityRelationshipsPanel
                      entityId={contractId!}
                      entityType={ENTITY_TYPES.CONTRACT}
                      entityName={contract.name}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Client Information */}
            <Card>
              <CardHeader>
                <CardTitle>Client Information</CardTitle>
              </CardHeader>
              <CardContent>
                {client ? (
                  <div className="space-y-4">
                    <div>
                      <EntityLink
                        entity={{
                          id: client.id,
                          type: ENTITY_TYPES.CLIENT,
                          name: client.name,
                          url: `/clients/${client.id}`,
                          status: client.status,
                          icon: 'Building',
                          metadata: client
                        }}
                        variant="card"
                        showTooltip={true}
                      />
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Contact</label>
                        <p className="text-sm">{client.contactName}</p>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-gray-500">Email</label>
                        <p className="text-sm">{client.contactEmail}</p>
                      </div>
                      
                      {client.contactPhone && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Phone</label>
                          <p className="text-sm">{client.contactPhone}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Contract Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Settings className="h-4 w-4 mr-2 text-blue-600" />
                    <span className="text-sm">Service Scopes</span>
                  </div>
                  <span className="font-medium">{serviceScopes.length}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 mr-2 text-green-600" />
                    <span className="text-sm">SAFs</span>
                  </div>
                  <span className="font-medium">{contractSAFs.length}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Shield className="h-4 w-4 mr-2 text-purple-600" />
                    <span className="text-sm">COCs</span>
                  </div>
                  <span className="font-medium">{contractCOCs.length}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 mr-2 text-orange-600" />
                    <span className="text-sm">Documents</span>
                  </div>
                  <span className="font-medium">{contractDocuments.length}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-4xl max-h-[95vh] flex flex-col overflow-hidden">
          <DialogHeader className="flex-shrink-0 border-b pb-4">
            <DialogTitle>Edit Contract</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-1">
            <div className="max-h-[70vh] overflow-y-auto">
              <ContractForm
                contract={contract}
                clients={clients}
                onSubmit={(data) => updateContractMutation.mutate(data)}
                onCancel={() => setIsEditOpen(false)}
                isLoading={updateContractMutation.isPending}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
} 