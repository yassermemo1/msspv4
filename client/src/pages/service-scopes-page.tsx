import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
import { ServiceScope, Contract, Service, Client } from "@shared/schema.ts";
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
import { formatCurrency, formatDate } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useDebounce } from "@/hooks/use-debounce";

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
  
  // Core state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false);
  
  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDetailsOpen, setIsViewDetailsOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedScope, setSelectedScope] = useState<any>(null);
  
  // Advanced filter state
  const [serviceTierFilter, setServiceTierFilter] = useState('all');
  const [coverageFilter, setCoverageFilter] = useState('all');
  const [epsMin, setEpsMin] = useState('');
  const [epsMax, setEpsMax] = useState('');
  const [endpointsMin, setEndpointsMin] = useState('');
  const [endpointsMax, setEndpointsMax] = useState('');
  const [responseTimeMin, setResponseTimeMin] = useState('');
  const [responseTimeMax, setResponseTimeMax] = useState('');

  // Use debounced search to prevent excessive API calls
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Build query parameters for the API call
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    
    if (debouncedSearchQuery.trim()) {
      params.append('q', debouncedSearchQuery.trim());
    }
    
    if (statusFilter !== 'all') {
      params.append('status', statusFilter);
    }
    
    if (serviceTierFilter !== 'all') {
      params.append('serviceTier', serviceTierFilter);
    }
    
    if (coverageFilter !== 'all') {
      params.append('coverageHours', coverageFilter);
    }
    
    if (epsMin.trim()) params.append('epsMin', epsMin.trim());
    if (epsMax.trim()) params.append('epsMax', epsMax.trim());
    if (endpointsMin.trim()) params.append('endpointsMin', endpointsMin.trim());
    if (endpointsMax.trim()) params.append('endpointsMax', endpointsMax.trim());
    if (responseTimeMin.trim()) params.append('responseTimeMin', responseTimeMin.trim());
    if (responseTimeMax.trim()) params.append('responseTimeMax', responseTimeMax.trim());
    
    return params.toString();
  }, [
    debouncedSearchQuery, 
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

  // Data fetching with React Query
  const { data: contracts = [] } = useQuery<Contract[]>({
    queryKey: ["/api/contracts"],
  });

  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  // Service scopes data
  const endpoint = queryParams ? `/api/service-scopes/search?${queryParams}` : '/api/service-scopes';
  
  const { data: serviceScopesData = [], isLoading } = useQuery({
    queryKey: ["/api/service-scopes", queryParams],
    queryFn: async () => {
      const response = await fetch(endpoint, {
        credentials: 'include'
      });
      
      if (!response.ok) throw new Error('Failed to fetch service scopes');
      
      const result = await response.json();
      return result.data || result;
    },
    staleTime: 5000,
    gcTime: 10000,
  });

  // Forms setup
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

  // Mutations
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

  // Handlers
  const handleDelete = useCallback(async (id: number) => {
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

      queryClient.invalidateQueries({ queryKey: ["/api/service-scopes"] });
    } catch (error) {
      console.error('Error deleting service scope:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete service scope',
        variant: 'destructive'
      });
    }
  }, [toast, queryClient]);

  const handleViewDetails = useCallback((scope: any) => {
    setSelectedScope(scope);
    setIsViewDetailsOpen(true);
  }, []);

  const handleEditScope = useCallback((scope: any) => {
    setSelectedScope(scope);
    
    const description = scope.description || "";
    const deliverables = scope.deliverables || [];
    
    let deliverablesString = "";
    if (Array.isArray(deliverables)) {
      deliverablesString = deliverables.join(", ");
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
  }, [editForm]);

  const onSubmit = useCallback((data: ServiceScopeFormData) => {
    createServiceScopeMutation.mutate(data);
  }, [createServiceScopeMutation]);

  const onEditSubmit = useCallback((data: ServiceScopeFormData) => {
    if (selectedScope) {
      updateServiceScopeMutation.mutate({ ...data, id: selectedScope.id });
    }
  }, [selectedScope, updateServiceScopeMutation]);

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

  // Utility functions
  const getClientName = useCallback((clientId: number) => {
    const client = clients.find(c => c.id === clientId);
    return client?.name || `Client ${clientId}`;
  }, [clients]);

  const getServiceName = useCallback((serviceId: number) => {
    const service = services.find(s => s.id === serviceId);
    return service?.name || `Service ${serviceId}`;
  }, [services]);

  const getStatusIcon = useCallback((status: string) => {
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
  }, []);

  const getStatusBadge = useCallback((status: string) => {
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
  }, []);

  if (isLoading) {
    return (
      <AppLayout 
        title="Service Scopes" 
        subtitle="Define and manage service delivery scopes for contracts"
      >
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
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
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Service Scope
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create Service Scope</DialogTitle>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="contractId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contract</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a contract" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {contracts.map((contract) => (
                                  <SelectItem key={contract.id} value={contract.id.toString()}>
                                    {getClientName(contract.clientId)} - {contract.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="serviceId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Service</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a service" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {services.map((service) => (
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
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea {...field} placeholder="Describe the scope of work" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="deliverables"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Deliverables (comma-separated)</FormLabel>
                            <FormControl>
                              <Textarea {...field} placeholder="List deliverables separated by commas" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="hoursBudget"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Hours Budget</FormLabel>
                              <FormControl>
                                <Input {...field} type="number" placeholder="Total hours" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="hourlyRate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Hourly Rate</FormLabel>
                              <FormControl>
                                <Input {...field} type="number" step="0.01" placeholder="Rate per hour" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Status</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="planning">Planning</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="on_hold">On Hold</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex justify-end space-x-2">
                        <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit">Create Service Scope</Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      type="text"
                      placeholder="Search service scopes, clients, services..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                      autoComplete="off"
                    />
                  </div>
                  
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="on_hold">On Hold</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAdvancedFilterOpen(!isAdvancedFilterOpen)}
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Advanced Filters
                    <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${isAdvancedFilterOpen ? 'rotate-180' : ''}`} />
                  </Button>
                </div>

                {/* Advanced Filters */}
                <Collapsible open={isAdvancedFilterOpen}>
                  <CollapsibleContent>
                    <div className="pt-4 border-t">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="text-sm font-medium mb-1 block">Service Tier</label>
                          <Select value={serviceTierFilter} onValueChange={setServiceTierFilter}>
                            <SelectTrigger>
                              <SelectValue placeholder="All Tiers" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Tiers</SelectItem>
                              <SelectItem value="basic">Basic</SelectItem>
                              <SelectItem value="standard">Standard</SelectItem>
                              <SelectItem value="premium">Premium</SelectItem>
                              <SelectItem value="enterprise">Enterprise</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">Coverage Hours</label>
                          <Select value={coverageFilter} onValueChange={setCoverageFilter}>
                            <SelectTrigger>
                              <SelectValue placeholder="All Coverage" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Coverage</SelectItem>
                              <SelectItem value="8x5">8x5</SelectItem>
                              <SelectItem value="24x5">24x5</SelectItem>
                              <SelectItem value="24x7">24x7</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">EPS Range</label>
                          <div className="flex space-x-2">
                            <Input
                              type="number"
                              placeholder="Min"
                              value={epsMin}
                              onChange={(e) => setEpsMin(e.target.value)}
                            />
                            <Input
                              type="number"
                              placeholder="Max"
                              value={epsMax}
                              onChange={(e) => setEpsMax(e.target.value)}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">Endpoints Range</label>
                          <div className="flex space-x-2">
                            <Input
                              type="number"
                              placeholder="Min"
                              value={endpointsMin}
                              onChange={(e) => setEndpointsMin(e.target.value)}
                            />
                            <Input
                              type="number"
                              placeholder="Max"
                              value={endpointsMax}
                              onChange={(e) => setEndpointsMax(e.target.value)}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">Response Time (min)</label>
                          <div className="flex space-x-2">
                            <Input
                              type="number"
                              placeholder="Min"
                              value={responseTimeMin}
                              onChange={(e) => setResponseTimeMin(e.target.value)}
                            />
                            <Input
                              type="number"
                              placeholder="Max"
                              value={responseTimeMax}
                              onChange={(e) => setResponseTimeMax(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="flex items-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={clearAllFilters}
                            className="w-full"
                          >
                            <X className="h-4 w-4 mr-2" />
                            Clear Filters
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          <Card>
            <CardHeader>
              <CardTitle>Service Scopes ({serviceScopesData.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {serviceScopesData && serviceScopesData.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No service scopes found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Timeline</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {serviceScopesData.map((scope: any) => (
                      <TableRow key={scope.id}>
                        <TableCell className="font-medium">
                          {getClientName(scope.contract?.clientId || scope.clientId)}
                        </TableCell>
                        <TableCell>{getServiceName(scope.serviceId)}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {scope.description}
                        </TableCell>
                        <TableCell>{getStatusBadge(scope.status)}</TableCell>
                        <TableCell>
                          {scope.startDate && scope.endDate ? (
                            <span className="text-sm text-gray-600">
                              {formatDate(scope.startDate)} - {formatDate(scope.endDate)}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">Not set</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetails(scope)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditScope(scope)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(scope.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* View Details Dialog */}
      <Dialog open={isViewDetailsOpen} onOpenChange={setIsViewDetailsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Service Scope Details</DialogTitle>
          </DialogHeader>
          {selectedScope && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-sm text-gray-600">Client</h4>
                  <p>{getClientName(selectedScope.contract?.clientId || selectedScope.clientId)}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-gray-600">Service</h4>
                  <p>{getServiceName(selectedScope.serviceId)}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-gray-600">Status</h4>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(selectedScope.status)}
                    <span>{selectedScope.status}</span>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-gray-600">Budget</h4>
                  <p>
                    {selectedScope.hoursBudget ? `${selectedScope.hoursBudget} hours` : 'Not set'}
                    {selectedScope.hourlyRate && ` @ ${format(selectedScope.hourlyRate)}/hr`}
                  </p>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-sm text-gray-600">Description</h4>
                <p className="mt-1">{selectedScope.description}</p>
              </div>
              <div>
                <h4 className="font-semibold text-sm text-gray-600">Deliverables</h4>
                <ul className="mt-1 list-disc list-inside">
                  {selectedScope.deliverables?.map((deliverable: string, index: number) => (
                    <li key={index}>{deliverable}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Service Scope</DialogTitle>
          </DialogHeader>
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
                        {contracts.map((contract) => (
                          <SelectItem key={contract.id} value={contract.id.toString()}>
                            {getClientName(contract.clientId)} - {contract.name}
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
                        {services.map((service) => (
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
                      <Textarea {...field} placeholder="Describe the scope of work" />
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
                    <FormLabel>Deliverables (comma-separated)</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="List deliverables separated by commas" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="hoursBudget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hours Budget</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" placeholder="Total hours" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="hourlyRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hourly Rate</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" placeholder="Rate per hour" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={editForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="planning">Planning</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="on_hold">On Hold</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Update Service Scope</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}