import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertContractSchema, type Contract, type InsertContract, type Client, type Service } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { z } from "zod";
import { Upload, FileText, X, Plus, Trash2, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { formatFileSize } from "@/lib/utils";
import { apiRequest } from "@/lib/api";
import { formatClientName } from "@/lib/utils";

interface ContractFormProps {
  contract?: Contract;
  clients: Client[];
  onSubmit: (data: InsertContract & { services: SelectedService[] }) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

interface SelectedService {
  serviceId: number;
  serviceName: string;
  scopeData: Record<string, any>;
}

// Create a form schema that uses strings for dates to work with HTML inputs
const contractFormSchema = z.object({
  clientId: z.number().min(1, "Client is required"),
  name: z.string().min(1, "Contract name is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  status: z.string().default("draft"),
  notes: z.string().nullable().optional(),
  autoRenewal: z.boolean().default(false),
  renewalTerms: z.string().nullable().optional(),
  totalValue: z.string().nullable().optional(),
  documentUrl: z.string().nullable().optional(),
});

type ContractFormData = z.infer<typeof contractFormSchema>;

export function ContractForm({ contract, clients, onSubmit, onCancel, isLoading = false }: ContractFormProps) {
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{
    name: string;
    url: string;
    size: number;
  } | null>(null);
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>([]);
  const [serviceTemplates, setServiceTemplates] = useState<Record<number, any>>({});
  const [pendingServiceId, setPendingServiceId] = useState<string>("");
  const { toast } = useToast();

  // Fetch available services
  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  // Fetch existing service scopes when editing a contract
  const { data: existingServiceScopes = [] } = useQuery({
    queryKey: ["/api/contracts", contract?.id, "service-scopes"],
    queryFn: async () => {
      if (!contract?.id) return [];
      const response = await fetch(`/api/contracts/${contract.id}/service-scopes`, {
        credentials: 'include',
      });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!contract?.id,
  });

  // Load existing service scopes into form when editing
  useEffect(() => {
    if (contract && existingServiceScopes.length > 0) {
      console.log('Loading existing service scopes:', existingServiceScopes);
      
      const existingServices: SelectedService[] = existingServiceScopes.map((scope: any) => {
        const service = services.find(s => s.id === scope.serviceId);
        return {
          serviceId: scope.serviceId,
          serviceName: service?.name || 'Unknown Service',
          scopeData: scope.scopeDefinition || {}
        };
      });
      
      setSelectedServices(existingServices);
      
      // Load service templates for existing services
      existingServices.forEach(service => {
        loadServiceTemplate(service.serviceId);
      });
    }
  }, [contract, existingServiceScopes, services]);

  const form = useForm<ContractFormData>({
    resolver: zodResolver(contractFormSchema),
    defaultValues: {
      clientId: contract?.clientId || 0,
      name: contract?.name || "",
      startDate: contract?.startDate ? new Date(contract.startDate).toISOString().split('T')[0] : "",
      endDate: contract?.endDate ? new Date(contract.endDate).toISOString().split('T')[0] : "",
      autoRenewal: contract?.autoRenewal ?? false,
      renewalTerms: contract?.renewalTerms || "",
      totalValue: contract?.totalValue || "",
      status: contract?.status || "draft",
      documentUrl: contract?.documentUrl || "",
      notes: contract?.notes || "",
    },
  });

  // Load service template when a service is selected
  const loadServiceTemplate = async (serviceId: number) => {
    try {
      const response = await fetch(`/api/services/${serviceId}/scope-template`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const templateData = await response.json();
        setServiceTemplates(prev => ({
          ...prev,
          [serviceId]: templateData.template
        }));
      }
    } catch (error) {
      console.error('Failed to load service template:', error);
    }
  };

  const handleAddService = (serviceId: string) => {
    const numericServiceId = parseInt(serviceId);
    const service = services.find(s => s.id === numericServiceId);
    
    if (!service || selectedServices.some(s => s.serviceId === numericServiceId)) {
      return; // Service not found or already selected
    }

    const newSelectedService: SelectedService = {
      serviceId: numericServiceId,
      serviceName: service.name,
      scopeData: {}
    };

    setSelectedServices(prev => [...prev, newSelectedService]);
    loadServiceTemplate(numericServiceId);
    setPendingServiceId(""); // Clear the selection after adding
    
    toast({
      title: "Service Added",
      description: `${service.name} has been added to the contract.`,
    });
  };

  const handleAddServiceClick = () => {
    if (pendingServiceId) {
      handleAddService(pendingServiceId);
    } else {
      toast({
        title: "No Service Selected",
        description: "Please select a service from the dropdown first.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveService = (serviceId: number) => {
    setSelectedServices(prev => prev.filter(s => s.serviceId !== serviceId));
    setServiceTemplates(prev => {
      const updated = { ...prev };
      delete updated[serviceId];
      return updated;
    });
  };

  const handleServiceScopeChange = (serviceId: number, fieldName: string, value: any) => {
    setSelectedServices(prev => prev.map(service => {
      if (service.serviceId === serviceId) {
        return {
          ...service,
          scopeData: {
            ...service.scopeData,
            [fieldName]: value
          }
        };
      }
      return service;
    }));
  };

  const renderScopeField = (serviceId: number, field: any) => {
    const currentValue = selectedServices.find(s => s.serviceId === serviceId)?.scopeData[field.name] || '';

    switch (field.fieldType) {
      case 'TEXT_SINGLE_LINE':
        return (
          <Input
            value={currentValue}
            onChange={(e) => handleServiceScopeChange(serviceId, field.name, e.target.value)}
            placeholder={field.placeholderText || `Enter ${field.label.toLowerCase()}`}
            required={field.isRequired}
          />
        );

      case 'TEXT_MULTI_LINE':
        return (
          <Textarea
            value={currentValue}
            onChange={(e) => handleServiceScopeChange(serviceId, field.name, e.target.value)}
            placeholder={field.placeholderText || `Enter ${field.label.toLowerCase()}`}
            required={field.isRequired}
            rows={3}
          />
        );

      case 'NUMBER_INTEGER':
        return (
          <Input
            type="number"
            value={currentValue}
            onChange={(e) => handleServiceScopeChange(serviceId, field.name, parseInt(e.target.value) || '')}
            placeholder={field.placeholderText || `Enter ${field.label.toLowerCase()}`}
            required={field.isRequired}
            min={field.validation?.min}
            max={field.validation?.max}
          />
        );

      case 'NUMBER_DECIMAL':
        return (
          <Input
            type="number"
            step="0.01"
            value={currentValue}
            onChange={(e) => handleServiceScopeChange(serviceId, field.name, parseFloat(e.target.value) || '')}
            placeholder={field.placeholderText || `Enter ${field.label.toLowerCase()}`}
            required={field.isRequired}
            min={field.validation?.min}
            max={field.validation?.max}
          />
        );

      case 'BOOLEAN':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={!!currentValue}
              onCheckedChange={(checked) => handleServiceScopeChange(serviceId, field.name, checked)}
            />
            <span className="text-sm">{field.validation?.trueLabel || 'Yes'}</span>
          </div>
        );

      case 'DATE':
        return (
          <Input
            type="date"
            value={currentValue}
            onChange={(e) => handleServiceScopeChange(serviceId, field.name, e.target.value)}
            required={field.isRequired}
          />
        );

      case 'SELECT_SINGLE_DROPDOWN':
        return (
          <Select 
            value={currentValue} 
            onValueChange={(value) => handleServiceScopeChange(serviceId, field.name, value)}
          >
            <SelectTrigger>
              <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {field.validation?.options?.map((option: any) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'SELECT_MULTI_CHECKBOX':
        const selectedValues = Array.isArray(currentValue) ? currentValue : [];
        return (
          <div className="space-y-2">
            {field.validation?.options?.map((option: any) => (
              <div key={option.value} className="flex items-center space-x-2">
                <Checkbox
                  checked={selectedValues.includes(option.value)}
                  onCheckedChange={(checked) => {
                    const newValues = checked
                      ? [...selectedValues, option.value]
                      : selectedValues.filter((v: any) => v !== option.value);
                    handleServiceScopeChange(serviceId, field.name, newValues);
                  }}
                />
                <span className="text-sm">{option.label}</span>
              </div>
            ))}
          </div>
        );

      default:
        return (
          <Input
            value={currentValue}
            onChange={(e) => handleServiceScopeChange(serviceId, field.name, e.target.value)}
            placeholder={field.placeholderText || `Enter ${field.label.toLowerCase()}`}
            required={field.isRequired}
          />
        );
    }
  };

  const handleSubmit = (data: ContractFormData) => {
    const contractData: InsertContract = {
      clientId: Number(data.clientId),
      name: data.name,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      totalValue: data.totalValue ? parseFloat(data.totalValue) : null,
      status: data.status as Contract["status"],
      autoRenewal: data.autoRenewal,
      renewalTerms: data.renewalTerms || null,
      documentUrl: uploadedFile?.url || data.documentUrl || null,
      notes: data.notes || null,
    };
    
    // Pass both contract data and selected services
    onSubmit({ ...contractData, services: selectedServices });
  };

  const handleFileUpload = async (file: File) => {
    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      // Include clientId if selected in the form
      const selectedClientId = form.watch('clientId');
      if (selectedClientId && selectedClientId > 0) {
        formData.append('clientId', selectedClientId.toString());
      }
      
      // Add document name and description
      formData.append('name', `${file.name} - Contract Document`);
      formData.append('description', `Contract document for ${clients.find(c => c.id === selectedClientId)?.name || 'client'}`);

      const response = await fetch('/api/upload/contract-document', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }

      const result = await response.json();
      setUploadedFile({
        name: result.fileName,
        url: result.fileUrl,
        size: result.fileSize
      });

      // Update the form field
      form.setValue('documentUrl', result.fileUrl);

      toast({
        title: "Success",
        description: "Contract document uploaded successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to upload document",
        variant: "destructive",
      });
    } finally {
      setUploadingFile(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "File size must be less than 10MB",
          variant: "destructive",
        });
        return;
      }

      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
      ];

      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Error",
          description: "Only PDF, Word, and text files are allowed",
          variant: "destructive",
        });
        return;
      }

      handleFileUpload(file);
    }
  };

  const removeUploadedFile = () => {
    setUploadedFile(null);
    form.setValue('documentUrl', '');
  };

  const availableServices = services.filter(service => 
    service.isActive && !selectedServices.some(s => s.serviceId === service.id)
  );

  return (
    <div className="h-full flex flex-col">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col h-full">
          <div className="flex-1 space-y-4 pb-4">
            {/* Basic Information Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-900 border-b pb-2">Basic Information</h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))} 
                        value={field.value > 0 ? field.value.toString() : ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select client" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="z-[100]">
                          {(clients || []).length === 0 ? (
                            <SelectItem value="no-clients" disabled>
                              No clients available
                            </SelectItem>
                          ) : (
                            (clients || []).map((client) => {
                              return (
                                <SelectItem key={client.id} value={client.id.toString()}>
                                  {formatClientName(client)}
                                </SelectItem>
                              );
                            })
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contract Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., SOC Services Agreement 2024" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="totalValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Value ($)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max="999999999"
                          placeholder="0.00"
                          {...field}
                          value={field.value || ""}
                          onChange={(e) => {
                            const value = e.target.value;
                            // Only allow numbers and decimal points
                            if (/^\d*\.?\d*$/.test(value) || value === '') {
                              field.onChange(value);
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="expired">Expired</SelectItem>
                          <SelectItem value="terminated">Terminated</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Services Selection Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-900 border-b pb-2">Services & Scope Configuration</h3>
              
              {/* Add Service Selector */}
              {availableServices.length > 0 && (
                <div className="flex items-center gap-4">
                  <Select value={pendingServiceId} onValueChange={setPendingServiceId}>
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Select a service to add..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableServices.map((service) => (
                        <SelectItem key={service.id} value={service.id.toString()}>
                          <div className="flex flex-col">
                            <span className="font-medium">{service.name}</span>
                            <span className="text-xs text-gray-500">{service.category}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={handleAddServiceClick}
                    disabled={!pendingServiceId}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Service
                  </Button>
                </div>
              )}

              {/* Quick Add Service Buttons */}
              {availableServices.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <p className="text-xs text-gray-500 w-full">Quick add:</p>
                  {availableServices.slice(0, 6).map((service) => (
                    <Button
                      key={service.id}
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-xs h-8 px-3 border border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                      onClick={() => handleAddService(service.id.toString())}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      {service.name}
                    </Button>
                  ))}
                </div>
              )}

              {/* No Available Services Message */}
              {availableServices.length === 0 && selectedServices.length > 0 && (
                <div className="text-center py-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-700">All available services have been added to this contract.</p>
                </div>
              )}

              {/* Selected Services with Scope Forms */}
              {selectedServices.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
                  <Settings className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No services selected</p>
                  <p className="text-xs text-gray-400">Add services to configure their scope parameters</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedServices.map((selectedService) => {
                    const template = serviceTemplates[selectedService.serviceId];
                    const fields = template?.fields || [];

                    return (
                      <Card key={selectedService.serviceId} className="border-l-4 border-l-blue-500">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-base">{selectedService.serviceName}</CardTitle>
                              <CardDescription>
                                Configure scope parameters for this service
                              </CardDescription>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveService(selectedService.serviceId)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {fields.length === 0 ? (
                            <div className="text-center py-4 bg-gray-50 rounded-lg">
                              <p className="text-sm text-gray-500">No scope template defined for this service</p>
                              <p className="text-xs text-gray-400">Contact administrator to set up scope fields</p>
                            </div>
                          ) : (
                            <div className="grid gap-4">
                              {fields
                                .sort((a: any, b: any) => a.displayOrder - b.displayOrder)
                                .map((field: any) => (
                                  <div key={field.name} className="space-y-2">
                                    <label className="flex items-center gap-2 text-sm font-medium">
                                      {field.label}
                                      {field.isRequired && <span className="text-red-500">*</span>}
                                    </label>
                                    {field.helpText && (
                                      <p className="text-xs text-gray-500">{field.helpText}</p>
                                    )}
                                    {renderScopeField(selectedService.serviceId, field)}
                                  </div>
                                ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Renewal Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-900 border-b pb-2">Renewal Settings</h3>
              
              <FormField
                control={form.control}
                name="autoRenewal"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Auto Renewal</FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="renewalTerms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Renewal Terms</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe renewal terms and conditions..."
                        className="resize-none"
                        rows={2}
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Document Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-900 border-b pb-2">Contract Document</h3>
              
              {!uploadedFile && !form.watch('documentUrl') && (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                  <div className="text-center">
                    <Upload className="mx-auto h-8 w-8 text-gray-400" />
                    <div className="mt-2">
                      <label htmlFor="contract-file" className="cursor-pointer">
                        <span className="block text-sm font-medium text-gray-900">
                          Upload contract document
                        </span>
                        <span className="block text-xs text-gray-500">
                          PDF, Word, or text files up to 10MB
                        </span>
                      </label>
                      <input
                        id="contract-file"
                        type="file"
                        className="sr-only"
                        accept=".pdf,.doc,.docx,.txt"
                        onChange={handleFileInputChange}
                        disabled={uploadingFile}
                      />
                    </div>
                    <div className="mt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={uploadingFile}
                        onClick={() => document.getElementById('contract-file')?.click()}
                      >
                        {uploadingFile ? "Uploading..." : "Choose File"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {uploadedFile && (
                <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-green-900">{uploadedFile.name}</p>
                      <p className="text-xs text-green-600">{formatFileSize(uploadedFile.size)}</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={removeUploadedFile}
                    className="text-green-600 hover:text-green-800"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              <div className="text-center text-xs text-gray-500">
                <span>or</span>
              </div>

              <FormField
                control={form.control}
                name="documentUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>External Document URL (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="https://..." 
                        {...field} 
                        value={field.value || ""} 
                        disabled={!!uploadedFile}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Notes Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-900 border-b pb-2">Additional Information</h3>
              
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Additional notes about this contract..."
                        className="resize-none"
                        rows={2}
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Action Buttons - Fixed at bottom */}
          <div className="flex-shrink-0 flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 bg-white sticky bottom-0">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || uploadingFile}>
              {isLoading ? "Saving..." : contract ? "Update Contract" : "Create Contract"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}