import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Service, InsertService } from "@shared/schema";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Server } from "lucide-react";

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
    <AppLayout title="Services" subtitle="Manage your service offerings and categories">
      <div className="p-4 sm:p-6 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-xl sm:text-2xl">Service Management</CardTitle>
                <CardDescription className="text-sm sm:text-base">
                  Organize and manage your service portfolio
                </CardDescription>
              </div>
              <Button onClick={() => setIsFormOpen(true)} className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Add Service
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4 sm:space-y-6">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search services..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                <Select value="all" onValueChange={(value) => {
                  // Handle category filter change
                }}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="Security Operations">Security Operations</SelectItem>
                    <SelectItem value="Network Security">Network Security</SelectItem>
                    <SelectItem value="Compliance">Compliance</SelectItem>
                    <SelectItem value="Consulting">Consulting</SelectItem>
                    <SelectItem value="Support">Support</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value="all" onValueChange={(value) => {
                  // Handle status filter change
                }}>
                  <SelectTrigger className="w-full sm:w-[140px]">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Services Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                          <div>
                            <div className="h-4 bg-gray-200 rounded w-24 mb-1"></div>
                            <div className="h-3 bg-gray-200 rounded w-16"></div>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-3 bg-gray-200 rounded w-full"></div>
                        <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredServices.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {filteredServices.map((service) => {
                  const IconComponent = getCategoryIcon(service.category);
                  return (
                    <Card key={service.id} className="hover:shadow-md transition-shadow duration-200 group">
                      <CardContent className="p-4 sm:p-6">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-3 min-w-0 flex-1">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <IconComponent className="h-5 w-5 text-blue-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="font-medium text-gray-900 truncate text-sm sm:text-base">{service.name}</h4>
                              <p className="text-xs text-gray-500 truncate">{service.category}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(service)}
                              className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600"
                              title="Edit service"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(service.id)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Delete service"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <p className="text-xs sm:text-sm text-gray-600 line-clamp-2">
                            {service.description || "No description available"}
                          </p>
                          <div className="flex items-center justify-between">
                            <Badge 
                              variant={service.isActive ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {service.isActive ? "Active" : "Inactive"}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {service.deliveryModel || "Standard"}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 sm:py-12">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Server className="h-8 w-8 sm:h-10 sm:w-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No services found</h3>
                <p className="text-gray-600 mb-6 text-sm sm:text-base max-w-md mx-auto">
                  {searchQuery || "all" !== "all" || "all" !== "all"
                    ? "No services match your current filters. Try adjusting your search criteria."
                    : "Get started by creating your first service offering."
                  }
                </p>
                {(!searchQuery && "all" === "all" && "all" === "all") && (
                  <Button onClick={() => setIsFormOpen(true)} className="w-full sm:w-auto">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Service
                  </Button>
                )}
              </div>
            )}

            {!isLoading && filteredServices.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-6 pt-4 border-t border-gray-200 gap-4">
                <p className="text-sm text-gray-600 text-center sm:text-left">
                  Showing {filteredServices.length} of {services.length} services
                </p>
                <div className="flex justify-center sm:justify-end space-x-4 text-sm text-gray-600">
                  <span>Active: {services.filter(s => s.isActive).length}</span>
                  <span>Inactive: {services.filter(s => !s.isActive).length}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Service Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-4 sm:p-6 border-b">
              <h2 className="text-lg sm:text-xl font-semibold">
                {editingService ? 'Edit Service' : 'Create New Service'}
              </h2>
            </div>
            <div className="p-4 sm:p-6">
              <ServiceForm
                service={editingService}
                onSubmit={handleFormSubmit}
                onCancel={handleFormClose}
                isLoading={createServiceMutation.isPending || updateServiceMutation.isPending}
              />
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
