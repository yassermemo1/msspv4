import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
  Eye
} from "lucide-react";
import { useState, useEffect } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";

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
    editForm.reset({
      contractId: scope.contractId.toString(),
      serviceId: scope.serviceId.toString(),
      description: scope.description || "",
      deliverables: Array.isArray(scope.deliverables) ? scope.deliverables.join(", ") : "",
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

  const formatLocalDate = (dateString: string) => {
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

  useEffect(() => {
    fetchServiceScopes();
  }, []);

  const fetchServiceScopes = async () => {
    try {
      const response = await fetch('/api/service-scopes', {
        credentials: 'include'
      });
      
      if (!response.ok) throw new Error('Failed to fetch service scopes');
      
      const data = await response.json();
      setServiceScopes(data);
    } catch (error) {
      console.error('Error fetching service scopes:', error);
      toast({
        title: 'Error',
        description: 'Failed to load service scopes',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

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

  const filteredScopes = serviceScopes.filter(scope => {
    const matchesSearch = 
      scope.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      scope.serviceName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      scope.contractName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      scope.clientName?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || scope.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search service scopes..."
                  className="pl-10 w-64"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Service Scope
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
                <DialogHeader className="flex-shrink-0">
                  <DialogTitle>Create New Service Scope</DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto pr-2 -mr-2">
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="contractId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contract</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a contract" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {(contracts || []).map((contract) => (
                                  <SelectItem key={contract.id} value={contract.id.toString()}>
                                    <div className="flex flex-col">
                                      <span className="font-medium">{contract.name}</span>
                                      <span className="text-xs text-gray-500">
                                        Client: {clients.find(c => c.id === contract.clientId)?.name || 'Unknown'} | 
                                        Status: {contract.status} | 
                                        Value: {contract.totalValue ? format(contract.totalValue.toString()) : 'N/A'}
                                      </span>
                                    </div>
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
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Detailed description of the service scope..."
                                rows={3}
                                {...field}
                                value={field.value || ""}
                              />
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
                            <FormLabel>Deliverables</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="List deliverables separated by commas (e.g., Security assessment, Vulnerability report, Compliance documentation)"
                                rows={3}
                                {...field}
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="hoursBudget"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Hours Budget</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="0"
                                  placeholder="0"
                                  {...field}
                                  value={field.value || ""}
                                />
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
                              <FormLabel>Hourly Rate ($)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  placeholder="0.00"
                                  {...field}
                                  value={field.value || ""}
                                />
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
                            <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="planning">Planning</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="on_hold">On Hold</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 bg-gray-50 -mx-6 px-6 py-4">
                        <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={createServiceScopeMutation.isPending}>
                          {createServiceScopeMutation.isPending ? "Creating..." : "Create Service Scope"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </div>
              </DialogContent>
            </Dialog>
          </div>

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
              <div className="space-y-4">
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
                ) : (
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
                                <span>Start: {formatLocalDate(scope.startDate.toString())}</span>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                <Clock className="h-4 w-4" />
                                <span>Timeline: {scope.timeline}</span>
                              </div>
                            </div>
                            
                            {scope.description && (
                              <p className="text-gray-700 mb-3">{scope.description}</p>
                            )}
                            
                            {/* Deliverables */}
                            <div>
                              <h4 className="text-sm font-medium text-gray-900 mb-2">Key Deliverables:</h4>
                              <div className="flex flex-wrap gap-2">
                                {(scope.deliverables || []).map((deliverable, index) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {deliverable}
                                  </Badge>
                                ))}
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
                )}
              </div>
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
                                              <p className="font-medium">{formatLocalDate(selectedScope.startDate.toString())}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">End Date</p>
                                              <p className="font-medium">{formatLocalDate(selectedScope.endDate.toString())}</p>
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
                <p className="text-gray-700">{selectedScope.description}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">Deliverables</h3>
                <div className="flex flex-wrap gap-2">
                  {(selectedScope.deliverables || []).map((deliverable: string, index: number) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {deliverable}
                    </Badge>
                  ))}
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