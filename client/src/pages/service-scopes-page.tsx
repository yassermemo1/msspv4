import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ServiceScope, Contract, Service, Client } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useCurrency } from "@/contexts/currency-context";
import { 
  Settings, 
  Search, 
  Calendar, 
  Target,
  Building,
  Shield,
  CheckCircle,
  Clock,
  AlertTriangle,
  Plus,
  Edit,
  Trash2,
  Eye,
  List,
  Grid,
  Filter,
  X,
  ChevronDown
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const serviceScopeFormSchema = z.object({
  contractId: z.string().min(1, "Contract is required"),
  serviceId: z.string().min(1, "Service is required"),
  description: z.string().min(1, "Description is required"),
  deliverables: z.string().min(1, "Deliverables are required"),
  hoursBudget: z.string().optional(),
  hourlyRate: z.string().optional(),
  status: z.string().optional(),
});

type ServiceScopeFormData = z.infer<typeof serviceScopeFormSchema>;

export default function ServiceScopesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { format } = useCurrency();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDetailsOpen, setIsViewDetailsOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedScope, setSelectedScope] = useState<any>(null);
  const [serviceScopes, setServiceScopes] = useState<ServiceScope[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false);
  
  // Advanced filter state
  const [serviceTierFilter, setServiceTierFilter] = useState('all');
  const [coverageFilter, setCoverageFilter] = useState('all');
  const [epsMin, setEpsMin] = useState('');
  const [epsMax, setEpsMax] = useState('');
  const [endpointsMin, setEndpointsMin] = useState('');
  const [endpointsMax, setEndpointsMax] = useState('');
  const [responseTimeMin, setResponseTimeMin] = useState('');
  const [responseTimeMax, setResponseTimeMax] = useState('');

  // Memoized handlers to prevent focus loss on filter inputs
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  const handleEpsMinChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEpsMin(e.target.value);
  }, []);

  const handleEpsMaxChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEpsMax(e.target.value);
  }, []);

  const handleEndpointsMinChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEndpointsMin(e.target.value);
  }, []);

  const handleEndpointsMaxChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEndpointsMax(e.target.value);
  }, []);

  const handleResponseTimeMinChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setResponseTimeMin(e.target.value);
  }, []);

  const handleResponseTimeMaxChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setResponseTimeMax(e.target.value);
  }, []);

  // Memoized handlers for Select components to prevent focus loss
  const handleServiceTierChange = useCallback((value: string) => {
    setServiceTierFilter(value);
  }, []);

  const handleCoverageChange = useCallback((value: string) => {
    setCoverageFilter(value);
  }, []);

  const handleStatusFilterChange = useCallback((value: string) => {
    setStatusFilter(value);
  }, []);

  const clearAllFilters = useCallback(() => {
    setServiceTierFilter('all');
    setCoverageFilter('all');
    setEpsMin('');
    setEpsMax('');
    setEndpointsMin('');
    setEndpointsMax('');
    setResponseTimeMin('');
    setResponseTimeMax('');
  }, []);
  
  // Fetch service scopes, contracts, services, and clients
  const { data: contracts = [] } = useQuery<Contract[]>({
    queryKey: ["/api/contracts"],
  });

  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: serviceScopesData = [] } = useQuery<any[]>({
    queryKey: ["/api/service-scopes"],
    select: (data) => {
      // Transform API data to match the expected format
      return data.map(scope => ({
        id: scope.id,
        contractId: scope.contractId,
        serviceId: scope.serviceId,
        description: scope.scopeDefinition?.description || scope.notes || "No description provided",
        deliverables: Array.isArray(scope.scopeDefinition?.deliverables) ? scope.scopeDefinition.deliverables : [],
        timeline: "Ongoing", // Default value - could be calculated from dates
        status: scope.status || "active",
        clientId: scope.clientId,
        startDate: scope.startDate,
        endDate: scope.endDate,
        contractName: scope.contractName,
        clientName: scope.clientName,
        serviceName: scope.serviceName
      }));
    }
  });

  const form = useForm<ServiceScopeFormData>({
    resolver: zodResolver(serviceScopeFormSchema),
    defaultValues: {
      contractId: "",
      serviceId: "",
      description: "",
      deliverables: "",
      hoursBudget: "",
      hourlyRate: "",
      status: "planning",
    },
  });

  const editForm = useForm<ServiceScopeFormData>({
    resolver: zodResolver(serviceScopeFormSchema),
    defaultValues: {
      contractId: "",
      serviceId: "",
      description: "",
      deliverables: "",
      hoursBudget: "",
      hourlyRate: "",
      status: "planning",
    },
  });

  const createServiceScopeMutation = useMutation({
    mutationFn: async (data: ServiceScopeFormData) => {
      const response = await apiRequest("POST", `/api/contracts/${data.contractId}/service-scopes`, {
        serviceId: parseInt(data.serviceId),
        description: data.description,
        deliverables: data.deliverables.split(",").map(d => d.trim()),
        hoursBudget: data.hoursBudget ? parseInt(data.hoursBudget) : undefined,
        hourlyRate: data.hourlyRate ? parseFloat(data.hourlyRate) : undefined,
        status: data.status || "planning",
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Service scope created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/service-scopes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      form.reset();
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create service scope",
        variant: "destructive",
      });
    },
  });

  const updateServiceScopeMutation = useMutation({
    mutationFn: async (data: ServiceScopeFormData & { id: number }) => {
      const response = await apiRequest("PUT", `/api/contracts/${data.contractId}/service-scopes/${data.id}`, {
        serviceId: parseInt(data.serviceId),
        description: data.description,
        deliverables: data.deliverables.split(",").map(d => d.trim()),
        hoursBudget: data.hoursBudget ? parseInt(data.hoursBudget) : undefined,
        hourlyRate: data.hourlyRate ? parseFloat(data.hourlyRate) : undefined,
        status: data.status || "planning",
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Service scope updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/service-scopes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      setIsEditDialogOpen(false);
      setSelectedScope(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update service scope",
        variant: "destructive",
      });
    },
  });

  const handleViewDetails = (scope: any) => {
    setSelectedScope(scope);
    setIsViewDetailsOpen(true);
  };

  const handleEditScope = (scope: any) => {
    setSelectedScope(scope);
    
    // Extract description and deliverables from scopeDefinition
    const description = scope.scopeDefinition?.description || scope.description || "";
    const deliverables = scope.scopeDefinition?.deliverables || scope.deliverables || [];
    
    // Convert deliverables to comma-separated string
    let deliverablesString = "";
    if (Array.isArray(deliverables)) {
      deliverablesString = deliverables.map((deliverable: any) => {
        if (typeof deliverable === 'string') {
          return deliverable;
        } else if (deliverable.item) {
          return deliverable.item;
        } else if (deliverable.description) {
          return deliverable.description;
        }
        return String(deliverable);
      }).join(", ");
    }
    
    editForm.reset({
      contractId: scope.contractId.toString(),
      serviceId: scope.serviceId.toString(),
      description: description,
      deliverables: deliverablesString,
      hoursBudget: scope.hoursBudget?.toString() || "",
      hourlyRate: scope.hourlyRate?.toString() || "",
      status: scope.status || "planning",
    });
    setIsEditDialogOpen(true);
  };

  const onSubmit = (data: ServiceScopeFormData) => {
    createServiceScopeMutation.mutate(data);
  };

  const onEditSubmit = (data: ServiceScopeFormData) => {
    if (selectedScope) {
      updateServiceScopeMutation.mutate({ ...data, id: selectedScope.id });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case "on_hold":
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      default:
        return <Shield className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 border-green-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "on_hold":
        return "bg-orange-100 text-orange-800 border-orange-200";
      default:
        return "bg-blue-100 text-blue-800 border-blue-200";
    }
  };

  const formatLocalDate = (dateString: string | null) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getClientName = (clientId: number) => {
    const client = clients.find(c => c.id === clientId);
    return client?.name || 'Unknown Client';
  };

  const getServiceName = (serviceId: number) => {
    const service = services.find(s => s.id === serviceId);
    return service?.name || 'Security Service';
  };

  // Use scope data from API where available, fallback to helper functions
  const getScopeClientName = (scope: any) => {
    return scope.clientName || getClientName(scope.clientId);
  };

  const getScopeServiceName = (scope: any) => {
    return scope.serviceName || getServiceName(scope.serviceId);
  };

  const fetchServiceScopes = async () => {
    try {
      setLoading(true);
      
      // Build query parameters for advanced search
      const params = new URLSearchParams();
      
      // Text search
      if (searchQuery.trim()) {
        params.append('q', searchQuery.trim());
      }
      
      // Status filter
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      
      // Advanced filters
      if (serviceTierFilter !== 'all') {
        params.append('serviceTier', serviceTierFilter);
      }
      
      if (coverageFilter !== 'all') {
        params.append('coverageHours', coverageFilter);
      }
      
      if (epsMin.trim()) {
        params.append('epsMin', epsMin.trim());
      }
      
      if (epsMax.trim()) {
        params.append('epsMax', epsMax.trim());
      }
      
      if (endpointsMin.trim()) {
        params.append('endpointsMin', endpointsMin.trim());
      }
      
      if (endpointsMax.trim()) {
        params.append('endpointsMax', endpointsMax.trim());
      }
      
      if (responseTimeMin.trim()) {
        params.append('responseTimeMin', responseTimeMin.trim());
      }
      
      if (responseTimeMax.trim()) {
        params.append('responseTimeMax', responseTimeMax.trim());
      }
      
      // Use search endpoint if any filters are applied, otherwise use regular endpoint
      const endpoint = params.toString() ? 
        `/api/service-scopes/search?${params.toString()}` : 
        '/api/service-scopes';
      
      const response = await fetch(endpoint, {
        credentials: 'include'
      });
      
      if (!response.ok) throw new Error('Failed to fetch service scopes');
      
      const result = await response.json();
      
      // Handle both paginated and non-paginated responses
      const scopes = result.data || result;
      setServiceScopes(scopes);
    } catch (error) {
      console.error('Error fetching service scopes:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch service scopes',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch when filters change
  useEffect(() => {
    fetchServiceScopes();
  }, [
    searchQuery, 
    statusFilter, 
    serviceTierFilter, 
    coverageFilter, 
    epsMin, 
    epsMax, 
    endpointsMin, 
    endpointsMax, 
    responseTimeMin, 
    responseTimeMax
  ]);

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this service scope?')) return;

    try {
      const response = await fetch(`/api/service-scopes/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Failed to delete service scope');

      toast({
        title: 'Success',
        description: 'Service scope deleted successfully'
      });

      fetchServiceScopes();
    } catch (error) {
      console.error('Error deleting service scope:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete service scope',
        variant: 'destructive'
      });
    }
  };

  const filteredScopes = serviceScopes;

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      active: 'default',
      pending: 'secondary',
      completed: 'outline',
      cancelled: 'destructive'
    };
    
    return (
      <Badge variant={variants[status] || 'default'}>
        {status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <AppLayout 
      title="Service Scopes" 
      subtitle="Define and manage service delivery scopes for contracts"
    >
      <main className="flex-1 overflow-auto p-6 pt-16 md:pt-6">
        <div className="space-y-6">
          {/* Header Actions */}
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight">Service Scopes</h1>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === 'table' ? 'cards' : 'table')}
              >
                {viewMode === 'table' ? <Grid className="h-4 w-4" /> : <List className="h-4 w-4" />}
                {viewMode === 'table' ? 'Card View' : 'Table View'}
              </Button>
            </div>
          </div>

          {/* Search and Filter Controls */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Search service scopes, clients, services..."
                        value={searchQuery}
                        onChange={handleSearchChange}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  
                  <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outline"
                    onClick={() => setIsAdvancedFilterOpen(!isAdvancedFilterOpen)}
                    className="flex items-center space-x-2"
                  >
                    <Filter className="h-4 w-4" />
                    <span>Advanced Filters</span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${isAdvancedFilterOpen ? 'rotate-180' : ''}`} />
                  </Button>
                </div>

                {/* Advanced Filters */}
                <Collapsible open={isAdvancedFilterOpen} onOpenChange={setIsAdvancedFilterOpen}>
                  <CollapsibleContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                      <div key="service-tier-filter">
                        <label className="text-sm font-medium text-gray-700 mb-2 block">Service Tier</label>
                        <Select key="service-tier-select" value={serviceTierFilter} onValueChange={handleServiceTierChange}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Tiers</SelectItem>
                            <SelectItem value="Enterprise">Enterprise</SelectItem>
                            <SelectItem value="Professional">Professional</SelectItem>
                            <SelectItem value="Standard">Standard</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div key="coverage-filter">
                        <label className="text-sm font-medium text-gray-700 mb-2 block">Coverage Hours</label>
                        <Select key="coverage-select" value={coverageFilter} onValueChange={handleCoverageChange}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Coverage</SelectItem>
                            <SelectItem value="24x7">24x7</SelectItem>
                            <SelectItem value="16x5">16x5</SelectItem>
                            <SelectItem value="8x5">8x5</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div key="eps-filter">
                        <label className="text-sm font-medium text-gray-700 mb-2 block">EPS Range</label>
                        <div className="flex space-x-2">
                          <Input
                            key="eps-min-input"
                            placeholder="Min"
                            value={epsMin}
                            onChange={handleEpsMinChange}
                            type="number"
                          />
                          <Input
                            key="eps-max-input"
                            placeholder="Max"
                            value={epsMax}
                            onChange={handleEpsMaxChange}
                            type="number"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">Endpoints Range</label>
                        <div className="flex space-x-2">
                          <Input
                            placeholder="Min"
                            value={endpointsMin}
                            onChange={handleEndpointsMinChange}
                            type="number"
                          />
                          <Input
                            placeholder="Max"
                            value={endpointsMax}
                            onChange={handleEndpointsMaxChange}
                            type="number"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">Response Time (min)</label>
                        <div className="flex space-x-2">
                          <Input
                            placeholder="Min"
                            value={responseTimeMin}
                            onChange={handleResponseTimeMinChange}
                            type="number"
                          />
                          <Input
                            placeholder="Max"
                            value={responseTimeMax}
                            onChange={handleResponseTimeMaxChange}
                            type="number"
                          />
                        </div>
                      </div>

                      <div className="flex items-end">
                        <Button
                          variant="outline"
                          onClick={clearAllFilters}
                          className="w-full"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Clear Filters
                        </Button>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </CardContent>
          </Card>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Scopes</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{serviceScopes.length}</div>
                <p className="text-xs text-muted-foreground">
                  Active service scopes
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {serviceScopes.filter(s => s.status === "active").length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Currently delivering
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {serviceScopes.filter(s => s.status === "pending").length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Awaiting approval
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Services</CardTitle>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{services.length}</div>
                <p className="text-xs text-muted-foreground">
                  Available services
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Service Scopes List */}
          <Card>
            <CardHeader>
              <CardTitle>Service Delivery Scopes</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredScopes.length === 0 ? (
                <div className="text-center py-12">
                  <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Service Scopes Found</h3>
                  <p className="text-gray-500 mb-4">
                    Define service scopes to specify deliverables and timelines for your contracts.
                  </p>
                  <Button onClick={() => setIsDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Service Scope
                  </Button>
                </div>
              ) : viewMode === 'table' ? (
                // Table View
                <div className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Service</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Contract</TableHead>
                        <TableHead>Tier</TableHead>
                        <TableHead>EPS</TableHead>
                        <TableHead>Endpoints</TableHead>
                        <TableHead>Coverage</TableHead>
                        <TableHead>Response Time</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Start Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(filteredScopes || []).map((scope) => {
                        const contract = contracts.find(c => c.id === scope.contractId);
                        const service = services.find(s => s.id === scope.serviceId);
                        const client = clients.find(c => c.id === (contract?.clientId || (scope as any).clientId));
                        
                        return (
                          <TableRow key={scope.id}>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Shield className="h-4 w-4 text-blue-600" />
                                <span className="font-medium">{service?.name || getScopeServiceName(scope)}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Building className="h-4 w-4 text-gray-600" />
                                <span>{client?.name || getScopeClientName(scope)}</span>
                              </div>
                            </TableCell>
                            <TableCell className="max-w-xs truncate" title={(scope as any).contractName}>
                              {(scope as any).contractName || "No contract name"}
                            </TableCell>
                            <TableCell>
                              {scope.serviceTier && (
                                <Badge variant="outline" className="text-xs">
                                  {scope.serviceTier}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {scope.eps ? (
                                <span className="font-mono text-sm">{scope.eps.toLocaleString()}</span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {scope.endpoints ? (
                                <span className="font-mono text-sm">{scope.endpoints.toLocaleString()}</span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {scope.coverageHours && (
                                <Badge variant="secondary" className="text-xs">
                                  {scope.coverageHours}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {scope.responseTimeMinutes ? (
                                <span className="text-sm">{scope.responseTimeMinutes}m</span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(scope.status)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Calendar className="h-4 w-4 text-gray-600" />
                                <span>{formatLocalDate(scope.startDate?.toString() || null)}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="max-w-xs truncate" title={(scope.scopeDefinition as any)?.description || (scope as any).description}>
                                {(scope.scopeDefinition as any)?.description || (scope as any).description || "No description provided"}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-1">
                                <Button variant="ghost" size="sm" onClick={() => handleViewDetails(scope)}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleEditScope(scope)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(scope.id)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                // Card View
                <div className="space-y-4">
                  <div className="grid gap-4">
                    {(filteredScopes || []).map((scope) => (
                      <div key={scope.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-lg font-semibold">
                                {getScopeServiceName(scope)} - {getScopeClientName(scope)}
                              </h3>
                              <Badge className={getStatusColor(scope.status)}>
                                <div className="flex items-center space-x-1">
                                  {getStatusIcon(scope.status)}
                                  <span className="capitalize">{scope.status}</span>
                                </div>
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-3">
                              <div className="flex items-center space-x-2">
                                <Building className="h-4 w-4" />
                                <span>{getScopeClientName(scope)}</span>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                <Calendar className="h-4 w-4" />
                                <span>Start: {formatLocalDate(scope.startDate?.toString() || null)}</span>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                <Clock className="h-4 w-4" />
                                <span>Coverage: {scope.coverageHours || 'N/A'}</span>
                              </div>
                            </div>

                            {/* Scope Variables */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                              {scope.serviceTier && (
                                <div className="bg-blue-50 px-2 py-1 rounded text-xs">
                                  <span className="font-medium text-blue-800">Tier:</span>
                                  <span className="ml-1 text-blue-600">{scope.serviceTier}</span>
                                </div>
                              )}
                              
                              {scope.eps && (
                                <div className="bg-green-50 px-2 py-1 rounded text-xs">
                                  <span className="font-medium text-green-800">EPS:</span>
                                  <span className="ml-1 text-green-600 font-mono">{scope.eps.toLocaleString()}</span>
                                </div>
                              )}
                              
                              {scope.endpoints && (
                                <div className="bg-purple-50 px-2 py-1 rounded text-xs">
                                  <span className="font-medium text-purple-800">Endpoints:</span>
                                  <span className="ml-1 text-purple-600 font-mono">{scope.endpoints.toLocaleString()}</span>
                                </div>
                              )}
                              
                              {scope.responseTimeMinutes && (
                                <div className="bg-orange-50 px-2 py-1 rounded text-xs">
                                  <span className="font-medium text-orange-800">Response:</span>
                                  <span className="ml-1 text-orange-600">{scope.responseTimeMinutes}m</span>
                                </div>
                              )}
                            </div>
                            
                            {((scope.scopeDefinition as any)?.description || (scope as any).description) && (
                              <p className="text-gray-700 mb-3">{(scope.scopeDefinition as any)?.description || (scope as any).description}</p>
                            )}
                            
                            {/* Deliverables */}
                            <div>
                              <h4 className="text-sm font-medium text-gray-900 mb-2">Key Deliverables:</h4>
                              <div className="flex flex-wrap gap-2">
                                {(() => {
                                  const deliverables = (scope.scopeDefinition as any)?.deliverables || (scope as any).deliverables || [];
                                  if (deliverables.length === 0) {
                                    return <span className="text-gray-500 text-xs">No deliverables specified</span>;
                                  }
                                  return deliverables.map((deliverable: any, index: number) => (
                                    <Badge key={index} variant="outline" className="text-xs">
                                      {typeof deliverable === 'string' ? deliverable : deliverable.item || deliverable.description || deliverable}
                                    </Badge>
                                  ));
                                })()}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex space-x-2 ml-4">
                            <Button variant="outline" size="sm" onClick={() => handleViewDetails(scope)}>
                              View Details
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleEditScope(scope)}>
                              Edit Scope
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(scope.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* View Details Dialog */}
      <Dialog open={isViewDetailsOpen} onOpenChange={setIsViewDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Service Scope Details</DialogTitle>
          </DialogHeader>
          {selectedScope && (
            <div className="flex-1 overflow-y-auto space-y-6 pr-2 -mr-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Basic Information</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-500">Client</p>
                      <p className="font-medium">{getScopeClientName(selectedScope)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Service</p>
                      <p className="font-medium">{getScopeServiceName(selectedScope)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Status</p>
                      <Badge className={getStatusColor(selectedScope.status)}>
                        <div className="flex items-center space-x-1">
                          {getStatusIcon(selectedScope.status)}
                          <span className="capitalize">{selectedScope.status}</span>
                        </div>
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Timeline</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-500">Start Date</p>
                      <p className="font-medium">{formatLocalDate(selectedScope.startDate?.toString() || null)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">End Date</p>
                      <p className="font-medium">{formatLocalDate(selectedScope.endDate?.toString() || null)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Timeline</p>
                      <p className="font-medium">{selectedScope.timeline}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">Description</h3>
                <p className="text-gray-700 whitespace-pre-line">
                  {selectedScope.scopeDefinition?.description || selectedScope.description || "No description provided"}
                </p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">Deliverables</h3>
                <div className="flex flex-wrap gap-2">
                  {(() => {
                    const deliverables = selectedScope.scopeDefinition?.deliverables || selectedScope.deliverables || [];
                    if (deliverables.length === 0) {
                      return <p className="text-gray-500 text-sm">No deliverables specified</p>;
                    }
                    return deliverables.map((deliverable: any, index: number) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {typeof deliverable === 'string' ? deliverable : deliverable.item || deliverable.description || deliverable}
                      </Badge>
                    ));
                  })()}
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => setIsViewDetailsOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Scope Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Edit Service Scope</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-2 -mr-2">
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                <FormField
                  control={editForm.control}
                  name="contractId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contract</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a contract" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(contracts || []).map((contract) => (
                            <SelectItem key={contract.id} value={contract.id.toString()}>
                              {contract.name} - {getClientName(contract.clientId)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="serviceId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Service</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a service" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(services || []).map((service) => (
                            <SelectItem key={service.id} value={service.id.toString()}>
                              {service.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Detailed description of the service scope..."
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="deliverables"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deliverables</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter deliverables separated by commas..."
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 bg-gray-50 -mx-6 px-6 py-4">
                  <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateServiceScopeMutation.isPending}>
                    {updateServiceScopeMutation.isPending ? "Updating..." : "Update Service Scope"}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}