import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { 
  Client, Contract, FinancialTransaction, ClientTeamAssignment, User, Document,
  ServiceScope, Service, ClientLicense, LicensePool, ClientHardwareAssignment, HardwareAsset,
  IndividualLicense, ServiceAuthorizationForm, CertificateOfCompliance
} from "@shared/schema";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { 
  Building, 
  Edit, 
  Phone, 
  Mail, 
  Globe, 
  MapPin, 
  FileText, 
  DollarSign, 
  Users, 
  Calendar,
  ArrowLeft,
  Download,
  Eye,
  Upload,
  Clock,
  Tag,
  Settings,
  Server,
  Key,
  Shield,
  HardDrive,
  ExternalLink,
  History,
  Link as LinkIcon,
  Plus
} from "lucide-react";
import { ClientForm } from "@/components/forms/client-form";
import { ClientLicenseForm } from "@/components/forms/client-license-form";
import { ClientExternalMappings } from "@/unused-scripts/external-systems/client-external-mappings";
import { HistoryTimeline } from "@/components/ui/history-timeline";
import { EntityRelationshipsPanel } from "@/components/ui/entity-relationships-panel";
import { EntityRelationshipTree } from "@/components/ui/entity-relationship-tree";
import { EntityLink } from "@/components/ui/entity-link";
import { useEntityNavigation } from "@/hooks/use-entity-navigation";
import { ENTITY_TYPES } from "@shared/entity-relations";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from '@/lib/utils';
import { formatDate } from '@/lib/utils';
import { getStatusColor, getStatusIcon, getStatusBadge, getStatusVariant } from '@/lib/status-utils';
import { JiraTicketsKpi } from '@/components/widgets/jira-tickets-kpi';

export default function ClientDetailPage() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isLicenseAssignOpen, setIsLicenseAssignOpen] = useState(false);
  const { toast } = useToast();

  const clientId = id ? parseInt(id, 10) : null;
  
  const { data: client, isLoading, error } = useQuery<Client>({
    queryKey: ["/api/clients", clientId],
    queryFn: async () => {
      if (!clientId) throw new Error("No client ID provided");
      console.log("Fetching client with ID:", clientId);
      const response = await fetch(`/api/clients/${clientId}`, {
        credentials: "include"
      });
      console.log("Response status:", response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error:", errorText);
        throw new Error(`Failed to fetch client: ${response.status} ${errorText}`);
      }
      const data = await response.json();
      console.log("Client data received:", data);
      return data;
    },
    enabled: !!clientId,
  });

  const { data: contracts = [] } = useQuery<Contract[]>({
    queryKey: ["/api/contracts", "client", id],
    queryFn: async () => {
      if (!id) return [];
      const response = await fetch(`/api/contracts?clientId=${id}`, {
        credentials: "include"
      });
      if (!response.ok) {
        throw new Error("Failed to fetch client contracts");
      }
      return response.json();
    },
    enabled: !!id && !!client,
  });

  const { data: proposals = [] } = useQuery<any[]>({
    queryKey: ["/api/proposals", "client", id],
    queryFn: async () => {
      if (!id) return [];
      const response = await fetch(`/api/proposals?clientId=${id}`, {
        credentials: "include"
      });
      if (!response.ok) {
        throw new Error("Failed to fetch client proposals");
      }
      return response.json();
    },
    enabled: !!id && !!client,
  });

  const { data: financialTransactions = [] } = useQuery<FinancialTransaction[]>({
    queryKey: ["/api/clients", id, "financial-transactions"],
    queryFn: async () => {
      if (!id) return [];
      const response = await fetch(`/api/clients/${id}/financial-transactions`, {
        credentials: "include"
      });
      if (!response.ok) {
        throw new Error("Failed to fetch client financial transactions");
      }
      return response.json();
    },
    enabled: !!id && !!client,
  });

  const { data: teamAssignments = [] } = useQuery<ClientTeamAssignment[]>({
    queryKey: ["/api/clients", id, "team-assignments"],
    queryFn: async () => {
      if (!id) return [];
      const response = await fetch(`/api/clients/${id}/team-assignments`, {
        credentials: "include"
      });
      if (!response.ok) {
        throw new Error("Failed to fetch client team assignments");
      }
      return response.json();
    },
    enabled: !!id && !!client,
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: !!client,
  });

  // Fetch client documents
  const { data: clientDocuments = [] } = useQuery<Document[]>({
    queryKey: ["/api/documents", "client", id],
    queryFn: async () => {
      if (!id) return [];
      const response = await fetch(`/api/documents?clientId=${id}`, {
        credentials: "include"
      });
      if (!response.ok) {
        throw new Error("Failed to fetch client documents");
      }
      return response.json();
    },
    enabled: !!id && !!client,
  });

  // Fetch client services (via service scopes)
  const { data: clientServiceScopes = [], isLoading: serviceScopesLoading } = useQuery<ServiceScope[]>({
    queryKey: ["/api/service-scopes", "client", id, contracts?.length],
    queryFn: async () => {
      if (!id) return [];
      console.log("Fetching service scopes for client:", id);
      console.log("Available contracts:", contracts);
      
      try {
        // Get all service scopes for this client's contracts
        const allScopes: ServiceScope[] = [];
        
        // Only proceed if we have contracts loaded
        if (contracts && contracts.length > 0) {
          console.log("Processing", contracts.length, "contracts");
          for (const contract of contracts) {
            console.log("Fetching service scopes for contract:", contract.id);
            const response = await fetch(`/api/contracts/${contract.id}/service-scopes`, {
              credentials: "include"
            });
            console.log("Response status for contract", contract.id, ":", response.status);
            if (response.ok) {
              const scopes = await response.json();
              console.log("Service scopes for contract", contract.id, ":", scopes);
              allScopes.push(...scopes);
            } else {
              console.error("Failed to fetch service scopes for contract", contract.id, ":", response.statusText);
            }
          }
        } else {
          console.log("No contracts available for client", id);
        }
        console.log("Total service scopes found:", allScopes.length);
        return allScopes;
      } catch (error) {
        console.error("Failed to fetch client service scopes:", error);
        return [];
      }
    },
    enabled: !!id && !!client && contracts !== undefined && Array.isArray(contracts),
  });

  // Fetch all services for reference
  const { data: allServices = [] } = useQuery<Service[]>({
    queryKey: ["/api/services"],
    queryFn: async () => {
      const response = await fetch("/api/services", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch services");
      }
      return response.json();
    },
    enabled: !!client,
  });

  // Fetch client licenses
  const { data: clientLicenses = [] } = useQuery<ClientLicense[]>({
    queryKey: ["/api/clients", id, "licenses"],
    queryFn: async () => {
      if (!id) return [];
      const response = await fetch(`/api/clients/${id}/licenses`, {
        credentials: "include"
      });
      if (!response.ok) {
        throw new Error("Failed to fetch client licenses");
      }
      return response.json();
    },
    enabled: !!id && !!client,
  });

  // Fetch all license pools for reference
  const { data: allLicensePools = [] } = useQuery<LicensePool[]>({
    queryKey: ["/api/license-pools"],
    enabled: !!client,
  });

  // Fetch client hardware assignments
  const { data: clientHardwareAssignments = [] } = useQuery<ClientHardwareAssignment[]>({
    queryKey: ["/api/client-hardware-assignments", id],
    queryFn: async () => {
      if (!id) return [];
      const response = await fetch(`/api/clients/${id}/hardware`, {
        credentials: "include"
      });
      if (!response.ok) {
        throw new Error("Failed to fetch client hardware assignments");
      }
      return response.json();
    },
    enabled: !!id && !!client,
  });

  // Fetch all hardware assets for reference
  const { data: allHardwareAssets = [] } = useQuery<HardwareAsset[]>({
    queryKey: ["/api/hardware-assets"],
    enabled: !!client,
  });

  // Fetch client individual licenses
  const { data: clientIndividualLicenses = [] } = useQuery<IndividualLicense[]>({
    queryKey: ["/api/individual-licenses", "client", id],
    queryFn: async () => {
      if (!id) return [];
      const response = await fetch(`/api/clients/${id}/individual-licenses`, {
        credentials: "include"
      });
      if (!response.ok) {
        throw new Error("Failed to fetch client individual licenses");
      }
      return response.json();
    },
    enabled: !!id && !!client,
  });

  // Fetch client SAFs
  const { data: clientSAFs = [] } = useQuery<ServiceAuthorizationForm[]>({
    queryKey: ["/api/service-authorization-forms", "client", id],
    queryFn: async () => {
      if (!id) return [];
      const response = await fetch(`/api/clients/${id}/service-authorization-forms`, {
        credentials: "include"
      });
      if (!response.ok) {
        throw new Error("Failed to fetch client SAFs");
      }
      return response.json();
    },
    enabled: !!id && !!client,
  });

  // Fetch client COCs
  const { data: clientCOCs = [] } = useQuery<CertificateOfCompliance[]>({
    queryKey: ["/api/certificates-of-compliance", "client", id],
    queryFn: async () => {
      if (!id) return [];
      const response = await fetch(`/api/clients/${id}/certificates-of-compliance`, {
        credentials: "include"
      });
      if (!response.ok) {
        throw new Error("Failed to fetch client COCs");
      }
      return response.json();
    },
    enabled: !!id && !!client,
  });

  const updateClientMutation = useMutation({
    mutationFn: async (updatedClient: Partial<Client>) => {
      const res = await apiRequest("PUT", `/api/clients/${clientId}`, updatedClient);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId] });
      setIsEditOpen(false);
      toast({
        title: "Success",
        description: "Client updated successfully",
      });
    },
    onError: (error) => {
      console.error("Failed to update client:", error);
      toast({
        title: "Error",
        description: "Failed to update client. Please try again.",
        variant: "destructive",
      });
    },
  });

  // License assignment mutation
  const assignLicenseMutation = useMutation({
    mutationFn: async (licenseData: any) => {
      const res = await apiRequest("POST", `/api/clients/${clientId}/licenses`, licenseData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "licenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/license-pools"] });
      setIsLicenseAssignOpen(false);
      toast({
        title: "Success", 
        description: "License assigned successfully",
      });
    },
    onError: (error) => {
      console.error("Failed to assign license:", error);
      toast({
        title: "Error",
        description: "Failed to assign license. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getSourceColor = (source: string) => {
    switch (source?.toLowerCase()) {
      case "direct": return "bg-blue-100 text-blue-800";
      case "nca": return "bg-purple-100 text-purple-800";
      case "both": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const handleFormSubmit = (data: any) => {
    updateClientMutation.mutate(data);
  };

  // Helper functions for documents
  const handleDownload = async (doc: Document) => {
    try {
      window.open(`/api/documents/${doc.id}/download`, '_blank');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download document",
        variant: "destructive",
      });
    }
  };

  const handlePreview = async (doc: Document) => {
    try {
      window.open(`/api/documents/${doc.id}/preview`, '_blank');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to preview document",
        variant: "destructive",
      });
    }
  };

  const getDocumentTypeColor = (type: string) => {
    switch (type) {
      case "contract": return "bg-blue-100 text-blue-800";
      case "compliance": return "bg-green-100 text-green-800";
      case "technical": return "bg-purple-100 text-purple-800";
      case "financial": return "bg-yellow-100 text-yellow-800";
      case "general": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const isPreviewable = (mimeType: string) => {
    const previewableMimes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'text/plain'
    ];
    return previewableMimes.includes(mimeType);
  };

  // Helper functions for new tabs
  const getServiceName = (serviceId: number | string) => {
    const idNum = Number(serviceId);
    const service = allServices.find(s => Number(s.id) === idNum);
    return service?.name ?? `Service #${serviceId}`;
  };

  const getLicensePoolName = (licensePoolId: number) => {
    const pool = allLicensePools.find(p => p.id === licensePoolId);
    return pool?.name || 'Unknown License Pool';
  };

  const getHardwareAssetName = (hardwareAssetId: number) => {
    const asset = allHardwareAssets.find(a => a.id === hardwareAssetId);
    return asset?.name || 'Unknown Asset';
  };

  const getContractName = (contractId: number) => {
    const contract = contracts.find(c => c.id === contractId);
    return contract?.name || 'Unknown Contract';
  };

  // Group documents by type for better organization
  const documentsByType = clientDocuments.reduce((acc, doc) => {
    const type = doc.documentType || 'general';
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(doc);
    return acc;
  }, {} as Record<string, Document[]>);

  // Enhanced document statistics
  const documentStats = {
    total: clientDocuments.length,
    contract: clientDocuments.filter(doc => doc.documentType === 'contract').length,
    proposal: clientDocuments.filter(doc => doc.documentType === 'proposal').length,
    technical: clientDocuments.filter(doc => doc.documentType === 'technical').length,
    financial: clientDocuments.filter(doc => doc.documentType === 'financial').length,
    service: clientDocuments.filter(doc => doc.documentType === 'service').length,
    license: clientDocuments.filter(doc => doc.documentType === 'license').length,
    compliance: clientDocuments.filter(doc => doc.documentType === 'compliance').length,
    general: clientDocuments.filter(doc => !doc.documentType || doc.documentType === 'general').length
  };

  // Create prioritized order for document types
  const documentTypeOrder = ['contract', 'proposal', 'financial', 'technical', 'service', 'license', 'compliance', 'general'];
  const sortedDocumentTypes = documentTypeOrder.filter(type => documentsByType[type]?.length > 0);

  // Extract service scope custom fields for Quick Stats
  const getServiceScopeCustomFields = () => {
    const customFields: { [key: string]: any[] } = {};
    
    // Add null check for clientServiceScopes
    if (!clientServiceScopes || !Array.isArray(clientServiceScopes)) {
      return [];
    }
    
    clientServiceScopes.forEach((scope) => {
      const scopeDefinition = scope.scopeDefinition;
      
      if (scopeDefinition && typeof scopeDefinition === 'object') {
        Object.entries(scopeDefinition).forEach(([key, value]) => {
          // Skip standard fields that are already displayed elsewhere
          if (key !== 'description' && key !== 'deliverables' && value !== null && value !== undefined && value !== '') {
            if (!customFields[key]) {
              customFields[key] = [];
            }
            
            // Handle different value types
            if (Array.isArray(value)) {
              customFields[key].push(...value);
            } else {
              customFields[key].push(value);
            }
          }
        });
      }
    });

    // Convert to display format with specific field name formatting
    return Object.entries(customFields).map(([key, values]) => {
      // Special handling for common field names
      let fieldLabel = key;
      if (key.toLowerCase() === 'va' || key.toLowerCase() === 'vulnerability') {
        fieldLabel = 'Va';
      } else if (key.toLowerCase() === 'edr' || key.toLowerCase() === 'endpoint') {
        fieldLabel = 'Edr';
      } else if (key.toLowerCase() === 'siem' || key.toLowerCase() === 'security') {
        fieldLabel = 'Siem';
      } else {
        // Format field name (convert camelCase to readable format)
        fieldLabel = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      }
      
      // Get unique values
      const uniqueValues = [...new Set(values)];
      
      return {
        key,
        label: fieldLabel,
        values: uniqueValues,
        displayValue: uniqueValues.length === 1 ? uniqueValues[0] : uniqueValues.join(', ')
      };
    });
  };

  const serviceScopeCustomFields = getServiceScopeCustomFields();

  // Get display information for document types
  const getDocumentTypeInfo = (type: string) => {
    const typeMap: Record<string, { name: string; description: string; icon: any; color: string }> = {
      contract: { 
        name: 'Contracts', 
        description: 'Contract documents and agreements',
        icon: FileText,
        color: 'text-blue-600'
      },
      proposal: { 
        name: 'Proposals', 
        description: 'Business and service proposals',
        icon: FileText,
        color: 'text-purple-600'
      },
      financial: { 
        name: 'Financial', 
        description: 'Financial proposals and cost analyses',
        icon: DollarSign,
        color: 'text-green-600'
      },
      technical: { 
        name: 'Technical', 
        description: 'Technical specifications and documentation',
        icon: Settings,
        color: 'text-indigo-600'
      },
      service: { 
        name: 'Services', 
        description: 'Service documentation and scope definitions',
        icon: Server,
        color: 'text-cyan-600'
      },
      license: { 
        name: 'Licenses', 
        description: 'License agreements and certificates',
        icon: Key,
        color: 'text-yellow-600'
      },
      compliance: { 
        name: 'Compliance', 
        description: 'Compliance certificates and audit documents',
        icon: Shield,
        color: 'text-red-600'
      },
      general: { 
        name: 'General', 
        description: 'General client documents and files',
        icon: FileText,
        color: 'text-gray-600'
      }
    };
    
    return typeMap[type] || typeMap['general'];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Client Not Found</h2>
          <p className="text-gray-600 mt-2">The requested client could not be found.</p>
          {error && (
            <p className="text-red-600 mt-2 text-sm">Error: {error.message}</p>
          )}
          <Button onClick={() => setLocation("/clients")} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Clients
          </Button>
        </div>
      </div>
    );
  }

  return (
    <AppLayout 
      title={client.name} 
      subtitle="Client Profile & Management"
    >
      <main className="flex-1 overflow-auto p-6 pt-16 md:pt-6">
          <div className="space-y-6">
            {/* Header Actions */}
            <div className="flex items-center justify-between">
              <Button 
                variant="outline" 
                onClick={() => setLocation("/clients")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Clients
              </Button>
              
              <div className="flex space-x-2">
                <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Client
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden">
                    <DialogHeader>
                      <DialogTitle>Edit Client Information</DialogTitle>
                    </DialogHeader>
                    <ClientForm
                      client={client}
                      onSubmit={handleFormSubmit}
                      onCancel={() => setIsEditOpen(false)}
                      isLoading={updateClientMutation.isPending}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Client Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="md:col-span-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center">
                      <Building className="h-5 w-5 mr-2" />
                      Client Information
                    </CardTitle>
                    <div className="flex space-x-2">
                      <Badge className={getStatusColor(client.status || "")}>
                        {client.status || "Unknown"}
                      </Badge>
                      <Badge className={getSourceColor(client.source || "")}>
                        {client.source || "Unknown"}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Industry</label>
                      <p className="text-gray-900">{client.industry || "Not specified"}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Company Size</label>
                      <p className="text-gray-900">{client.companySize || "Not specified"}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Short Name</label>
                      <p className="text-gray-900">{client.shortName || "Not specified"}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Domain</label>
                      <p className="text-gray-900">{client.domain || "Not specified"}</p>
                    </div>
                  </div>
                  
                  {client.website && (
                    <div className="flex items-center">
                      <Globe className="h-4 w-4 mr-2 text-gray-500" />
                      <a 
                        href={client.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {client.website}
                      </a>
                    </div>
                  )}
                  
                  {client.address && (
                    <div className="flex items-start">
                      <MapPin className="h-4 w-4 mr-2 text-gray-500 mt-1" />
                      <p className="text-gray-900">{client.address}</p>
                    </div>
                  )}
                  
                  {client.notes && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Notes</label>
                      <p className="text-gray-900 mt-1">{client.notes}</p>
                    </div>
                  )}
                  
                  <div className="pt-2 border-t">
                    <div className="flex items-center text-sm text-gray-500">
                      <Calendar className="h-4 w-4 mr-1" />
                      Created: {formatDate(client.createdAt)}
                      {client.updatedAt && client.updatedAt !== client.createdAt && (
                        <span className="ml-4">
                          Last updated: {formatDate(client.updatedAt)}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 mr-2 text-blue-600" />
                      <span className="text-sm">Contracts</span>
                    </div>
                    <span className="font-medium">{contracts.length}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 mr-2 text-violet-600" />
                      <span className="text-sm">Proposals</span>
                    </div>
                    <span className="font-medium">{proposals.length}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Settings className="h-4 w-4 mr-2 text-purple-600" />
                      <span className="text-sm">Services</span>
                    </div>
                    <span className="font-medium">{clientServiceScopes.length}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Key className="h-4 w-4 mr-2 text-yellow-600" />
                      <span className="text-sm">Licenses</span>
                    </div>
                    <span className="font-medium">{clientLicenses.length}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <HardDrive className="h-4 w-4 mr-2 text-orange-600" />
                      <span className="text-sm">Hardware Assets</span>
                    </div>
                    <span className="font-medium">{clientHardwareAssignments.length}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 mr-2 text-green-600" />
                      <span className="text-sm">Documents</span>
                    </div>
                    <span className="font-medium">{clientDocuments.length}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Shield className="h-4 w-4 mr-2 text-purple-600" />
                      <span className="text-sm">SAFs</span>
                    </div>
                    <span className="font-medium">{clientSAFs.length}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Shield className="h-4 w-4 mr-2 text-yellow-600" />
                      <span className="text-sm">COCs</span>
                    </div>
                    <span className="font-medium">{clientCOCs.length}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <DollarSign className="h-4 w-4 mr-2 text-green-600" />
                      <span className="text-sm">Transactions</span>
                    </div>
                    <span className="font-medium">{financialTransactions.length}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Users className="h-4 w-4 mr-2 text-orange-600" />
                      <span className="text-sm">Team Members</span>
                    </div>
                    <span className="font-medium">{teamAssignments.length}</span>
                  </div>

                  {/* Service Scope Custom Fields */}
                  {serviceScopeCustomFields.length > 0 && (
                    <>
                      <div className="border-t pt-4 mt-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                          <Settings className="h-4 w-4 mr-2 text-blue-600" />
                          Scope Details
                        </h4>
                        <div className="space-y-2">
                          {serviceScopeCustomFields.map((field) => (
                            <div key={field.key} className="flex items-center justify-between">
                              <div className="flex items-center">
                                <span className="text-sm text-gray-600">{field.label}:</span>
                              </div>
                              <span className="font-medium text-sm text-blue-700">
                                {field.displayValue}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Jira Tickets KPI Card */}
                  <JiraTicketsKpi clientShortName={client.shortName || ''} />
                </CardContent>
              </Card>
            </div>

            {/* Entity Relationships Panel */}
            <div className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <LinkIcon className="h-4 w-4 mr-2" />
                    Entity Relationships
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Navigate through connected entities and their relationships
                  </p>
                </CardHeader>
                <CardContent>
                  <EntityRelationshipsPanel 
                    entityType={ENTITY_TYPES.CLIENT}
                    entityId={clientId!}
                    variant="full"
                    showSearch={true}
                    showStats={true}
                    maxItemsPerGroup={10}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Detailed Tabs */}
            <Tabs defaultValue="contracts" className="space-y-6">
              <TabsList>
                <TabsTrigger value="contracts">Contracts</TabsTrigger>
                <TabsTrigger value="proposals">Proposals ({proposals.length})</TabsTrigger>
                <TabsTrigger value="services">Services ({clientServiceScopes.length})</TabsTrigger>
                <TabsTrigger value="licenses">Licenses ({clientLicenses.length})</TabsTrigger>
                <TabsTrigger value="individual-licenses">Individual Licenses ({clientIndividualLicenses.length})</TabsTrigger>
                <TabsTrigger value="assets">Assets ({clientHardwareAssignments.length})</TabsTrigger>
                <TabsTrigger value="saf">SAFs ({clientSAFs.length})</TabsTrigger>
                <TabsTrigger value="coc">COCs ({clientCOCs.length})</TabsTrigger>
                <TabsTrigger value="documents">Documents ({clientDocuments.length})</TabsTrigger>
                <TabsTrigger value="transactions">Transactions ({financialTransactions.length})</TabsTrigger>
                <TabsTrigger value="external-systems">External Systems</TabsTrigger>
                <TabsTrigger value="team">Team Assignments</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>
              
              <TabsContent value="contracts">
                <Card>
                  <CardHeader>
                    <CardTitle>Client Contracts</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {contracts.length > 0 ? (
                      <div className="space-y-4">
                        {contracts.map((contract) => (
                          <div key={contract.id} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <EntityLink
                                  entity={{
                                    id: contract.id,
                                    type: ENTITY_TYPES.CONTRACT,
                                    name: contract.name,
                                    url: `/contracts/${contract.id}`,
                                    status: contract.status,
                                    icon: 'FileText',
                                    metadata: {
                                      secondaryText: contract.totalValue ? formatCurrency(contract.totalValue) : undefined,
                                      ...contract
                                    }
                                  }}
                                  variant="card"
                                  showTooltip={true}
                                />
                                <p className="text-sm text-gray-600 mt-2">
                                  {formatDate(contract.startDate)} - {formatDate(contract.endDate)}
                                </p>
                                {contract.documentUrl && (
                                  <div className="mt-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => window.open(contract.documentUrl!, '_blank')}
                                      className="text-xs"
                                    >
                                      <Download className="h-3 w-3 mr-1" />
                                      Download Contract
                                    </Button>
                                  </div>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="font-medium">{formatCurrency(contract.totalValue)}</p>
                                <Badge className={contract.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                                  {contract.status}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-8">No contracts found for this client.</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="proposals">
                <Card>
                  <CardHeader>
                    <CardTitle>Client Proposals</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {proposals.length > 0 ? (
                      <div className="space-y-4">
                        {proposals.map((proposal) => (
                          <div key={proposal.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-3 mb-2">
                                  <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center">
                                    <FileText className="h-4 w-4 text-violet-600" />
                                  </div>
                                  <div>
                                    <h4 className="font-medium text-gray-900">{proposal.type || 'Proposal'}</h4>
                                    <p className="text-sm text-gray-600">Version {proposal.version || '1.0'}</p>
                                  </div>
                                  <Badge className={
                                    proposal.status === 'approved' ? 'bg-green-100 text-green-800' :
                                    proposal.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                    proposal.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                    'bg-gray-100 text-gray-800'
                                  }>
                                    {proposal.status || 'draft'}
                                  </Badge>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                                  {proposal.contractId && (
                                    <div>
                                      <p className="text-sm text-gray-500">Contract</p>
                                      <p className="text-sm font-medium">{getContractName(proposal.contractId)}</p>
                                    </div>
                                  )}
                                  
                                  {proposal.proposedValue && (
                                    <div>
                                      <p className="text-sm text-gray-500">Proposed Value</p>
                                      <p className="text-sm font-medium text-green-600">
                                        {formatCurrency(parseFloat(proposal.proposedValue))}
                                      </p>
                                    </div>
                                  )}
                                  
                                  <div>
                                    <p className="text-sm text-gray-500">Created</p>
                                    <p className="text-sm font-medium">{formatDate(proposal.createdAt)}</p>
                                  </div>
                                  
                                  {proposal.updatedAt && proposal.updatedAt !== proposal.createdAt && (
                                    <div>
                                      <p className="text-sm text-gray-500">Last Updated</p>
                                      <p className="text-sm font-medium">{formatDate(proposal.updatedAt)}</p>
                                    </div>
                                  )}
                                </div>
                                
                                {proposal.notes && (
                                  <div className="mt-3">
                                    <p className="text-sm text-gray-500">Notes</p>
                                    <p className="text-sm text-gray-700 mt-1">{proposal.notes}</p>
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex flex-col space-y-2 ml-4">
                                {proposal.documentUrl && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => window.open(proposal.documentUrl, '_blank')}
                                  >
                                    <Download className="h-3 w-3 mr-1" />
                                    Download
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  View Details
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Proposals Found</h3>
                        <p className="text-gray-500 mb-4">
                          No proposals have been created for this client yet.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="services">
                <Card>
                  <CardHeader>
                    <CardTitle>Client Services</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(clientServiceScopes && Array.isArray(clientServiceScopes) && clientServiceScopes.length > 0) ? (
                      <div className="space-y-4">
                        {clientServiceScopes.map((scope) => {
                          // Parse scope definition to extract field values
                          const scopeDefinition = scope.scopeDefinition;
                          const description = typeof scopeDefinition === 'string' 
                            ? scopeDefinition 
                            : scopeDefinition?.description || scope.notes || 'No description available';
                          
                          // Extract field details from scope definition
                          const getFieldDetails = () => {
                            if (!scopeDefinition || typeof scopeDefinition === 'string') return [];
                            
                            const fields = [];
                            for (const [key, value] of Object.entries(scopeDefinition)) {
                              if (key !== 'description' && key !== 'deliverables' && value !== null && value !== undefined && value !== '') {
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
                                  <h4 className="font-medium">{getServiceName(scope.serviceId)}</h4>
                                  <p className="text-sm text-gray-600">
                                    Contract: {getContractName(scope.contractId)}
                                  </p>
                                  {scope.startDate && scope.endDate && (
                                    <p className="text-sm text-gray-600">
                                      {formatDate(scope.startDate)} - {formatDate(scope.endDate)}
                                    </p>
                                  )}
                                </div>
                                <div className="text-right">
                                  {scope.monthlyValue && (
                                    <p className="font-medium text-green-600">{formatCurrency(scope.monthlyValue)}/month</p>
                                  )}
                                  <Badge className="bg-blue-100 text-blue-800">
                                    {scope.status || 'Active Service'}
                                  </Badge>
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
                                    {deliverables.map((deliverable, index) => {
                                      const getLabel = (d: any) => {
                                        if (d == null) return '';
                                        if (typeof d === 'string' || typeof d === 'number') return String(d);
                                        if (typeof d === 'object') {
                                          // Common field names to display
                                          if ('item' in d && d.item) return String((d as any).item);
                                          if ('name' in d && d.name) return String((d as any).name);
                                          if ('title' in d && d.title) return String((d as any).title);
                                          if ('value' in d && d.value) return String((d as any).value);
                                          // Fallback – stringify the object in a compact form
                                          try {
                                            return JSON.stringify(d);
                                          } catch (_) {
                                            return '[object]';
                                          }
                                        }
                                        return String(d);
                                      };

                                      return (
                                        <Badge key={index} variant="outline" className="text-xs">
                                          {getLabel(deliverable)}
                                        </Badge>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Services Found</h3>
                        <p className="text-gray-500 mb-4">
                          No services have been configured for this client yet.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="licenses">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Client Licenses</CardTitle>
                      <Dialog open={isLicenseAssignOpen} onOpenChange={setIsLicenseAssignOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            Assign License
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Assign License Pool to Client</DialogTitle>
                          </DialogHeader>
                          <ClientLicenseForm
                            clientId={clientId!}
                            onSubmit={(data) => assignLicenseMutation.mutate(data)}
                            onCancel={() => setIsLicenseAssignOpen(false)}
                            isLoading={assignLicenseMutation.isPending}
                          />
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {clientLicenses.length > 0 ? (
                      <div className="space-y-4">
                        {clientLicenses.map((license) => (
                          <div key={license.id} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-medium">{getLicensePoolName(license.licensePoolId)}</h4>
                                <p className="text-sm text-gray-600">
                                  Assigned: {formatDate(license.assignedDate)}
                                </p>
                                {license.notes && (
                                  <p className="text-sm text-gray-500 mt-1">{license.notes}</p>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="font-medium text-lg">{license.assignedLicenses}</p>
                                <p className="text-sm text-gray-500">licenses assigned</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Key className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Licenses Found</h3>
                        <p className="text-gray-500 mb-4">
                          No licenses have been assigned to this client yet.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="individual-licenses">
                <Card>
                  <CardHeader>
                    <CardTitle>Client Individual Licenses</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {clientIndividualLicenses.length > 0 ? (
                      <div className="space-y-4">
                        {clientIndividualLicenses.map((license) => (
                          <div key={license.id} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-medium">{license.name}</h4>
                                <p className="text-sm text-gray-600">
                                  Vendor: {license.vendor}
                                </p>
                                <p className="text-sm text-gray-600">
                                  Product: {license.productName}
                                </p>
                                <p className="text-sm text-gray-600">
                                  License Type: {license.licenseType}
                                </p>
                                {license.expiryDate && (
                                  <p className="text-sm text-gray-600">
                                    Expires: {formatDate(license.expiryDate)}
                                  </p>
                                )}
                                {license.notes && (
                                  <p className="text-sm text-gray-500 mt-1">{license.notes}</p>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="font-medium text-lg">{license.quantity}</p>
                                <p className="text-sm text-gray-500">quantity</p>
                                <Badge variant={license.status === "active" ? "default" : "secondary"}>
                                  {license.status}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Key className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Individual Licenses Found</h3>
                        <p className="text-gray-500 mb-4">
                          No individual licenses have been assigned to this client yet.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="assets">
                <Card>
                  <CardHeader>
                    <CardTitle>Client Hardware Assets</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {clientHardwareAssignments.length > 0 ? (
                      <div className="space-y-4">
                        {clientHardwareAssignments.map((assignment) => (
                          <div key={assignment.id} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-medium">{getHardwareAssetName(assignment.hardwareAssetId)}</h4>
                                <p className="text-sm text-gray-600">
                                  Assigned: {formatDate(assignment.assignedDate)}
                                </p>
                                {assignment.installationLocation && (
                                  <p className="text-sm text-gray-500">
                                    Location: {assignment.installationLocation}
                                  </p>
                                )}
                                {assignment.notes && (
                                  <p className="text-sm text-gray-500 mt-1">{assignment.notes}</p>
                                )}
                              </div>
                              <div className="text-right">
                                <Badge className={assignment.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                                  {assignment.status}
                                </Badge>
                                {assignment.returnedDate && (
                                  <p className="text-sm text-gray-500 mt-1">
                                    Returned: {formatDate(assignment.returnedDate)}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Server className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Hardware Assets Found</h3>
                        <p className="text-gray-500 mb-4">
                          No hardware assets have been assigned to this client yet.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="saf">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Service Authorization Forms (SAF)</CardTitle>
                    <Button
                      onClick={() => setLocation(`/create-saf?clientId=${clientId}`)}
                      size="sm"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create SAF
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {clientSAFs.length > 0 ? (
                      <div className="space-y-4">
                        {clientSAFs.map((saf) => (
                          <div key={saf.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-3 mb-2">
                                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <FileText className="h-4 w-4 text-blue-600" />
                                  </div>
                                  <div>
                                    <h4 className="font-medium text-gray-900">{saf.title}</h4>
                                    <p className="text-sm text-gray-600">SAF #{saf.safNumber}</p>
                                  </div>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                                  <div>
                                    <p className="text-sm text-gray-500">Service Period</p>
                                    <p className="text-sm font-medium">
                                      {formatDate(saf.startDate)} - {formatDate(saf.endDate)}
                                    </p>
                                  </div>
                                  
                                  {saf.value && (
                                    <div>
                                      <p className="text-sm text-gray-500">Value</p>
                                      <p className="text-sm font-medium text-green-600">
                                        ${parseFloat(saf.value).toLocaleString()}
                                      </p>
                                    </div>
                                  )}
                                  
                                  {saf.contractId && (
                                    <div>
                                      <p className="text-sm text-gray-500">Contract</p>
                                      <p className="text-sm font-medium">{getContractName(saf.contractId)}</p>
                                    </div>
                                  )}
                                  
                                  {saf.approvedDate && (
                                    <div>
                                      <p className="text-sm text-gray-500">Approved Date</p>
                                      <p className="text-sm font-medium">{formatDate(saf.approvedDate)}</p>
                                    </div>
                                  )}
                                </div>
                                
                                {saf.description && (
                                  <div className="mt-3">
                                    <p className="text-sm text-gray-500">Description</p>
                                    <p className="text-sm text-gray-700 mt-1">{saf.description}</p>
                                  </div>
                                )}
                                
                                {saf.notes && (
                                  <div className="mt-3">
                                    <p className="text-sm text-gray-500">Notes</p>
                                    <p className="text-sm text-gray-700 mt-1">{saf.notes}</p>
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex flex-col items-end space-y-2">
                                <Badge 
                                  variant={
                                    saf.status === "active" ? "default" : 
                                    saf.status === "approved" ? "default" :
                                    saf.status === "completed" ? "default" :
                                    saf.status === "pending" ? "secondary" :
                                    saf.status === "cancelled" ? "destructive" :
                                    "secondary"
                                  }
                                  className={
                                    saf.status === "active" ? "bg-green-100 text-green-800 hover:bg-green-200" :
                                    saf.status === "approved" ? "bg-blue-100 text-blue-800 hover:bg-blue-200" :
                                    saf.status === "completed" ? "bg-gray-100 text-gray-800 hover:bg-gray-200" :
                                    saf.status === "pending" ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200" :
                                    saf.status === "cancelled" ? "bg-red-100 text-red-800 hover:bg-red-200" :
                                    ""
                                  }
                                >
                                  {saf.status.charAt(0).toUpperCase() + saf.status.slice(1)}
                                </Badge>
                                
                                {saf.documentUrl && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => window.open(saf.documentUrl, '_blank')}
                                    className="text-xs"
                                  >
                                    <Download className="h-3 w-3 mr-1" />
                                    Document
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No SAFs Found</h3>
                        <p className="text-gray-500 mb-4">
                          No Service Authorization Forms have been created for this client yet.
                        </p>
                        <Button variant="outline" onClick={() => setLocation(`/create-saf?clientId=${clientId}`)}>
                          <FileText className="h-4 w-4 mr-2" />
                          Create SAF
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="coc">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Certificates of Compliance (COC)</CardTitle>
                    <Button
                      onClick={() => setLocation(`/create-coc?clientId=${clientId}`)}
                      size="sm"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create COC
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {clientCOCs.length > 0 ? (
                      <div className="space-y-4">
                        {clientCOCs.map((coc) => {
                          const isExpired = coc.expiryDate && new Date(coc.expiryDate) < new Date();
                          const isExpiringSoon = coc.expiryDate && 
                            new Date(coc.expiryDate) > new Date() && 
                            new Date(coc.expiryDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
                          
                          return (
                            <div key={coc.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-3 mb-2">
                                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                                      <Shield className="h-4 w-4 text-green-600" />
                                    </div>
                                    <div>
                                      <h4 className="font-medium text-gray-900">{coc.title}</h4>
                                      <p className="text-sm text-gray-600">COC #{coc.cocNumber}</p>
                                    </div>
                                  </div>
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                                    <div>
                                      <p className="text-sm text-gray-500">Compliance Type</p>
                                      <p className="text-sm font-medium">{coc.complianceType}</p>
                                    </div>
                                    
                                    <div>
                                      <p className="text-sm text-gray-500">Issue Date</p>
                                      <p className="text-sm font-medium">{formatDate(coc.issueDate)}</p>
                                    </div>
                                    
                                    {coc.expiryDate && (
                                      <div>
                                        <p className="text-sm text-gray-500">Expiry Date</p>
                                        <p className={`text-sm font-medium ${
                                          isExpired ? 'text-red-600' : 
                                          isExpiringSoon ? 'text-yellow-600' : 
                                          'text-gray-900'
                                        }`}>
                                          {formatDate(coc.expiryDate)}
                                          {isExpired && ' (Expired)'}
                                          {isExpiringSoon && ' (Expiring Soon)'}
                                        </p>
                                      </div>
                                    )}
                                    
                                    {coc.contractId && (
                                      <div>
                                        <p className="text-sm text-gray-500">Contract</p>
                                        <p className="text-sm font-medium">{getContractName(coc.contractId)}</p>
                                      </div>
                                    )}
                                    
                                    {coc.auditDate && (
                                      <div>
                                        <p className="text-sm text-gray-500">Last Audit</p>
                                        <p className="text-sm font-medium">{formatDate(coc.auditDate)}</p>
                                      </div>
                                    )}
                                    
                                    {coc.nextAuditDate && (
                                      <div>
                                        <p className="text-sm text-gray-500">Next Audit</p>
                                        <p className="text-sm font-medium">{formatDate(coc.nextAuditDate)}</p>
                                      </div>
                                    )}
                                  </div>
                                  
                                  {coc.description && (
                                    <div className="mt-3">
                                      <p className="text-sm text-gray-500">Description</p>
                                      <p className="text-sm text-gray-700 mt-1">{coc.description}</p>
                                    </div>
                                  )}
                                  
                                  {coc.notes && (
                                    <div className="mt-3">
                                      <p className="text-sm text-gray-500">Notes</p>
                                      <p className="text-sm text-gray-700 mt-1">{coc.notes}</p>
                                    </div>
                                  )}
                                </div>
                                
                                <div className="flex flex-col items-end space-y-2">
                                  <Badge 
                                    variant={
                                      coc.status === "active" ? "default" : 
                                      coc.status === "issued" ? "default" :
                                      coc.status === "expired" ? "destructive" :
                                      coc.status === "revoked" ? "destructive" :
                                      "secondary"
                                    }
                                    className={
                                      coc.status === "active" ? "bg-green-100 text-green-800 hover:bg-green-200" :
                                      coc.status === "issued" ? "bg-blue-100 text-blue-800 hover:bg-blue-200" :
                                      coc.status === "expired" ? "bg-red-100 text-red-800 hover:bg-red-200" :
                                      coc.status === "revoked" ? "bg-red-100 text-red-800 hover:bg-red-200" :
                                      ""
                                    }
                                  >
                                    {coc.status.charAt(0).toUpperCase() + coc.status.slice(1)}
                                  </Badge>
                                  
                                  {(isExpired || isExpiringSoon) && (
                                    <Badge variant="destructive" className="text-xs">
                                      {isExpired ? 'Expired' : 'Expiring Soon'}
                                    </Badge>
                                  )}
                                  
                                  {coc.documentUrl && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => window.open(coc.documentUrl, '_blank')}
                                      className="text-xs"
                                    >
                                      <Download className="h-3 w-3 mr-1" />
                                      Certificate
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No COCs Found</h3>
                        <p className="text-gray-500 mb-4">
                          No Certificates of Compliance have been created for this client yet.
                        </p>
                        <Button variant="outline" onClick={() => setLocation(`/create-coc?clientId=${clientId}`)}>
                          <Shield className="h-4 w-4 mr-2" />
                          Create COC
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="documents">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Client Documents & Files</CardTitle>
                        <p className="text-sm text-gray-600 mt-1">
                          All documents related to this client including contracts, proposals, services, licenses, and general files
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => window.open('/documents', '_blank')}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Documents
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {clientDocuments.length > 0 ? (
                      <div className="space-y-6">
                        {/* Document Statistics */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {Object.entries(documentStats).map(([type, count]) => (
                            <div key={type} className="text-center p-3 bg-gray-50 rounded-lg">
                              <div className="text-lg font-semibold">{count}</div>
                              <div className="text-sm text-gray-600 capitalize">{type}</div>
                            </div>
                          ))}
                        </div>

                        <Separator />

                        {/* Documents List */}
                        <div className="space-y-4">
                          {sortedDocumentTypes.map((type) => {
                            const typeInfo = getDocumentTypeInfo(type);
                            const TypeIcon = typeInfo.icon;
                            
                            return (
                              <div key={type} className="space-y-3">
                                <div className="border-b pb-2">
                                  <h3 className="text-lg font-semibold flex items-center">
                                    <TypeIcon className={`h-5 w-5 mr-2 ${typeInfo.color}`} />
                                    {typeInfo.name} ({documentsByType[type]?.length})
                                  </h3>
                                  <p className="text-sm text-gray-600 mt-1">{typeInfo.description}</p>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {documentsByType[type]?.map((doc) => (
                                    <Card key={doc.id} className="hover:shadow-md transition-shadow">
                                      <CardHeader className="pb-3">
                                        <div className="flex items-center justify-between">
                                          <div className="flex-1 min-w-0">
                                            <h4 className="font-medium text-sm truncate">{doc.name}</h4>
                                            <p className="text-xs text-gray-500 truncate">{doc.fileName}</p>
                                          </div>
                                          <Badge className={getDocumentTypeColor(doc.documentType)} variant="secondary">
                                            {doc.documentType}
                                          </Badge>
                                        </div>
                                      </CardHeader>
                                      <CardContent className="pt-0 space-y-3">
                                        {doc.description && (
                                          <p className="text-xs text-gray-600 line-clamp-2">
                                            {doc.description}
                                          </p>
                                        )}
                                        
                                        <div className="flex items-center text-xs text-gray-500">
                                          <Clock className="mr-1 h-3 w-3" />
                                          Version {doc.version} • {formatFileSize(doc.fileSize)}
                                        </div>
                                        
                                        <div className="flex items-center text-xs text-gray-500">
                                          <Calendar className="mr-1 h-3 w-3" />
                                          {formatDate(doc.createdAt)}
                                        </div>
                                        
                                        {doc.tags && doc.tags.length > 0 && (
                                          <div className="flex items-center gap-1">
                                            <Tag className="h-3 w-3 text-gray-400" />
                                            <div className="flex gap-1 flex-wrap">
                                              {doc.tags.slice(0, 2).map((tag, index) => (
                                                <Badge key={index} variant="outline" className="text-xs px-1 py-0">
                                                  {tag}
                                                </Badge>
                                              ))}
                                              {doc.tags.length > 2 && (
                                                <Badge variant="outline" className="text-xs px-1 py-0">
                                                  +{doc.tags.length - 2}
                                                </Badge>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                        
                                        <Separator className="my-2" />
                                        
                                        <div className="flex justify-between gap-2">
                                          <Button 
                                            variant="outline" 
                                            size="sm"
                                            onClick={() => handleDownload(doc)}
                                            className="flex-1 text-xs"
                                          >
                                            <Download className="mr-1 h-3 w-3" />
                                            Download
                                          </Button>
                                          {isPreviewable(doc.mimeType) && (
                                            <Button 
                                              variant="outline" 
                                              size="sm"
                                              onClick={() => handlePreview(doc)}
                                              className="flex-1 text-xs"
                                            >
                                              <Eye className="mr-1 h-3 w-3" />
                                              Preview
                                            </Button>
                                          )}
                                        </div>
                                      </CardContent>
                                    </Card>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Recent Uploads */}
                        {clientDocuments.length > 3 && (
                          <div className="mt-6">
                            <h3 className="text-lg font-semibold mb-3">Recent Uploads</h3>
                            <div className="space-y-2">
                              {clientDocuments
                                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                                .slice(0, 5)
                                .map((doc) => (
                                  <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                                    <div className="flex items-center space-x-3">
                                      <FileText className="h-4 w-4 text-gray-400" />
                                      <div>
                                        <p className="text-sm font-medium">{doc.name}</p>
                                        <p className="text-xs text-gray-500">
                                          {formatDate(doc.createdAt)} • {formatFileSize(doc.fileSize)}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <Badge className={getDocumentTypeColor(doc.documentType)} variant="secondary">
                                        {doc.documentType}
                                      </Badge>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDownload(doc)}
                                      >
                                        <Download className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Documents Found</h3>
                        <p className="text-gray-500 mb-4">
                          No documents have been uploaded for this client yet.
                        </p>
                        <Button onClick={() => window.open('/documents', '_blank')}>
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Documents
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="transactions">
                <Card>
                  <CardHeader>
                    <CardTitle>Financial Transactions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {financialTransactions.length > 0 ? (
                      <div className="space-y-4">
                        {financialTransactions.map((transaction) => (
                          <div key={transaction.id} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-medium">{transaction.description}</h4>
                                <p className="text-sm text-gray-600">
                                  {formatDate(transaction.transactionDate)}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className={`font-medium ${['revenue', 'payment', 'credit'].includes(transaction.type) ? 'text-green-600' : 'text-red-600'}`}>
                                  {['revenue', 'payment', 'credit'].includes(transaction.type) ? '+' : '-'}{formatCurrency(transaction.amount)}
                                </p>
                                <Badge variant={transaction.status === 'completed' ? 'default' : 'secondary'}>
                                  {transaction.type}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-8">No financial transactions found for this client.</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="external-systems">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ExternalLink className="h-5 w-5" />
                      External Systems Integration
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ClientExternalMappings clientId={clientId!} />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="team">
                <Card>
                  <CardHeader>
                    <CardTitle>Team Assignments</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {teamAssignments.length > 0 ? (
                      <div className="space-y-4">
                        {teamAssignments.map((assignment) => {
                          const user = users.find(u => u.id === assignment.userId);
                          return (
                            <div key={assignment.id} className="border rounded-lg p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-medium">
                                    {user ? `${user.firstName} ${user.lastName}` : "Unknown User"}
                                  </h4>
                                  <p className="text-sm text-gray-600">{assignment.role}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm text-gray-600">
                                    Since: {formatDate(assignment.assignedDate)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-8">No team assignments found for this client.</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="history">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <History className="h-4 w-4 mr-2" />
                      Activity History
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <HistoryTimeline 
                      entity_type="client"
                      entity_id={clientId!}
                      entity_name={client?.name}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
    </AppLayout>
  );
}