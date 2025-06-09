import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Service, InsertService } from "@shared/schema";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, Edit, Trash2, Shield, Flame, Search as SearchIcon, ServerCog, Settings } from "lucide-react";
import { ServiceForm } from "@/components/forms/service-form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { getStatusColor, getStatusIcon, getStatusBadge, getStatusVariant } from '@/lib/status-utils';

export default function ServicesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { isAdmin } = useAuth();

  const { data: services = [], isLoading } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const createServiceMutation = useMutation({
    mutationFn: async (service: InsertService) => {
      const res = await apiRequest("POST", "/api/services", service);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      setIsFormOpen(false);
      toast({
        title: "Success",
        description: "Service created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create service",
        variant: "destructive",
      });
    },
  });

  const updateServiceMutation = useMutation({
    mutationFn: async ({ id, service }: { id: number; service: Partial<InsertService> }) => {
      const res = await apiRequest("PUT", `/api/services/${id}`, service);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      setIsFormOpen(false);
      setEditingService(null);
      toast({
        title: "Success",
        description: "Service updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update service",
        variant: "destructive",
      });
    },
  });

  const deleteServiceMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/services/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      toast({
        title: "Success",
        description: "Service deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete service",
        variant: "destructive",
      });
    },
  });

  const filteredServices = services.filter(service =>
    service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    service.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Security Operations":
        return Shield;
      case "Network Security":
        return Flame;
      case "Endpoint Security":
        return Shield;
      default:
        return ServerCog;
    }
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setIsFormOpen(true);
  };

  const handleConfigure = (service: Service) => {
    setLocation(`/services/${service.id}/edit`);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this service?")) {
      deleteServiceMutation.mutate(id);
    }
  };

  const handleFormSubmit = (data: InsertService) => {
    if (editingService) {
      updateServiceMutation.mutate({ id: editingService.id, service: data });
    } else {
      createServiceMutation.mutate(data);
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingService(null);
  };

  return (
    <AppLayout 
      title="Service Catalog Management" 
      subtitle="Configure services and scope definition templates"
    >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Services</CardTitle>
                <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Service
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden">
                    <DialogHeader>
                      <DialogTitle>
                        {editingService ? "Edit Service" : "Add New Service"}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto min-h-0">
                      <ServiceForm
                        service={editingService}
                        onSubmit={handleFormSubmit}
                        onCancel={handleFormClose}
                        isLoading={createServiceMutation.isPending || updateServiceMutation.isPending}
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
                    placeholder="Search services..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Services Grid */}
              {isLoading ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Loading services...</p>
                </div>
              ) : filteredServices.length === 0 ? (
                <div className="text-center py-8">
                  <ServerCog className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg font-medium">No services found</p>
                  <p className="text-gray-400 mt-2">
                    {searchQuery ? "Try adjusting your search" : "Add your first service to get started"}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredServices.map((service) => {
                    const IconComponent = getCategoryIcon(service.category);
                    return (
                      <Card key={service.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                <IconComponent className="h-5 w-5 text-blue-600" />
                              </div>
                              <div>
                                <h4 className="font-medium text-gray-900">{service.name}</h4>
                                <p className="text-xs text-gray-500">{service.category}</p>
                              </div>
                            </div>
                            <div className="flex space-x-1">
                              {isAdmin && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleConfigure(service)}
                                  title="Configure service and scope template"
                                >
                                  <Settings className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(service)}
                                title="Quick edit basic info"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(service.id)}
                                title="Delete service"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          
                          <p className="text-sm text-gray-700 mb-4 line-clamp-3">
                            {service.description || "No description provided"}
                          </p>
                          
                          <div className="space-y-2 mb-4">
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-500">Delivery Model:</span>
                              <Badge variant="outline" className="text-xs">
                                {service.deliveryModel}
                              </Badge>
                            </div>
                            {service.basePrice && (
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-500">Base Price:</span>
                                <span className="font-medium">
                                  ${parseFloat(service.basePrice).toLocaleString()}{service.pricingUnit ? `/${service.pricingUnit}` : ''}
                                </span>
                              </div>
                            )}
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-500">Status:</span>
                              <Badge variant={service.isActive ? "default" : "secondary"}>
                                {service.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              {/* Summary */}
              {!isLoading && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    Showing {filteredServices.length} of {services.length} services
                  </p>
                  <div className="flex space-x-4 text-sm text-gray-600">
                    <span>Active: {services.filter(s => s.isActive).length}</span>
                    <span>Inactive: {services.filter(s => !s.isActive).length}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
    </AppLayout>
  );
}
