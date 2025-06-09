import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { AppLayout } from '@/components/layout/app-layout';
import { apiRequest } from '@/lib/queryClient';
import { Client, Contract, ServiceScope } from '@shared/schema';
import { Award, Save, X, Calendar, Building, Shield, FileText } from 'lucide-react';
import { formatClientName } from "@/lib/utils";

const cocFormSchema = z.object({
  clientId: z.number().min(1, 'Client is required'),
  contractId: z.number().optional(),
  serviceScopeId: z.number().optional(),
  safId: z.number().optional(),
  cocNumber: z.string().min(1, 'COC number is required'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  complianceType: z.string().min(1, 'Compliance type is required'),
  issueDate: z.string().min(1, 'Issue date is required'),
  expiryDate: z.string().optional(),
  status: z.string().optional(),
  auditDate: z.string().optional(),
  nextAuditDate: z.string().optional(),
  notes: z.string().optional(),
});

type CocFormData = z.infer<typeof cocFormSchema>;

export default function CreateCocPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch clients
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ['/api/clients'],
  });

  // Fetch contracts
  const { data: contracts = [] } = useQuery<Contract[]>({
    queryKey: ['/api/contracts'],
  });

  const form = useForm<CocFormData>({
    resolver: zodResolver(cocFormSchema),
    defaultValues: {
      clientId: 0,
      contractId: undefined,
      serviceScopeId: undefined,
      safId: undefined,
      cocNumber: '',
      title: '',
      description: '',
      complianceType: '',
      issueDate: '',
      expiryDate: '',
      status: 'draft',
      auditDate: '',
      nextAuditDate: '',
      notes: '',
    },
  });

  const selectedClientId = form.watch('clientId');
  const selectedContractId = form.watch('contractId');

  // Fetch client contracts when client is selected
  const { data: clientContracts = [] } = useQuery<Contract[]>({
    queryKey: ['/api/contracts', 'client', selectedClientId],
    queryFn: async () => {
      if (!selectedClientId) return [];
      const response = await fetch(`/api/contracts?clientId=${selectedClientId}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch client contracts');
      return response.json();
    },
    enabled: !!selectedClientId,
  });

  // Fetch service scopes when contract is selected
  const { data: serviceScopes = [] } = useQuery<ServiceScope[]>({
    queryKey: ['/api/contracts', selectedContractId, 'service-scopes'],
    queryFn: async () => {
      if (!selectedContractId) return [];
      const response = await fetch(`/api/contracts/${selectedContractId}/service-scopes`, {
        credentials: 'include',
      });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!selectedContractId,
  });

  // Fetch SAFs for the selected contract/client
  const { data: safs = [] } = useQuery<any[]>({
    queryKey: ['/api/service-authorization-forms', 'client', selectedClientId],
    queryFn: async () => {
      if (!selectedClientId) return [];
      const response = await fetch(`/api/service-authorization-forms?clientId=${selectedClientId}`, {
        credentials: 'include',
      });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!selectedClientId,
  });

  const createCocMutation = useMutation({
    mutationFn: async (data: CocFormData) => {
      const cocData = {
        clientId: data.clientId,
        contractId: data.contractId || null,
        serviceScopeId: data.serviceScopeId || null,
        safId: data.safId || null,
        cocNumber: data.cocNumber,
        title: data.title,
        description: data.description || '',
        complianceType: data.complianceType,
        issueDate: data.issueDate,
        expiryDate: data.expiryDate || null,
        status: data.status || 'draft',
        auditDate: data.auditDate || null,
        nextAuditDate: data.nextAuditDate || null,
        notes: data.notes || '',
      };

      const response = await apiRequest('POST', '/api/certificates-of-compliance', cocData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Certificate of Compliance created successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/certificates-of-compliance'] });
      setLocation('/certificates-of-compliance');
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create Certificate of Compliance',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: CocFormData) => {
    createCocMutation.mutate(data);
  };

  const handleCancel = () => {
    setLocation('/certificates-of-compliance');
  };

  return (
    <AppLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Create Certificate of Compliance</h1>
            <p className="text-muted-foreground">
              Create a new COC to certify compliance requirements for a client
            </p>
          </div>
        </div>

        <div className="max-w-3xl">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                COC Information
              </CardTitle>
              <CardDescription>
                Fill out the details for the new Certificate of Compliance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Client Selection */}
                    <FormField
                      control={form.control}
                      name="clientId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Building className="h-4 w-4" />
                            Client
                          </FormLabel>
                          <Select
                            onValueChange={(value) => {
                              field.onChange(parseInt(value));
                              form.setValue('contractId', undefined);
                              form.setValue('serviceScopeId', undefined);
                              form.setValue('safId', undefined);
                            }}
                            value={field.value.toString()}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a client" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {clients.map((client) => (
                                <SelectItem key={client.id} value={client.id.toString()}>
                                  {formatClientName(client)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Contract Selection (Optional) */}
                    <FormField
                      control={form.control}
                      name="contractId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            Contract (Optional)
                          </FormLabel>
                          <Select
                            onValueChange={(value) => {
                              field.onChange(parseInt(value));
                              form.setValue('serviceScopeId', undefined);
                            }}
                            value={field.value?.toString() || ''}
                            disabled={!selectedClientId}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a contract" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {clientContracts.map((contract) => (
                                <SelectItem key={contract.id} value={contract.id.toString()}>
                                  {contract.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Service Scope Selection (Optional) */}
                  {serviceScopes.length > 0 && (
                    <FormField
                      control={form.control}
                      name="serviceScopeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Service Scope (Optional)</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(parseInt(value))}
                            value={field.value?.toString() || ''}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a service scope" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {serviceScopes.map((scope: any) => (
                                <SelectItem key={scope.id} value={scope.id.toString()}>
                                  {scope.serviceName || `Service ${scope.serviceId}`} - {scope.status}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {/* SAF Selection (Optional) */}
                  {safs.length > 0 && (
                    <FormField
                      control={form.control}
                      name="safId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Related SAF (Optional)
                          </FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(parseInt(value))}
                            value={field.value?.toString() || ''}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a related SAF" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {safs.map((saf: any) => (
                                <SelectItem key={saf.id} value={saf.id.toString()}>
                                  {saf.safNumber} - {saf.title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* COC Number */}
                    <FormField
                      control={form.control}
                      name="cocNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>COC Number</FormLabel>
                          <FormControl>
                            <Input placeholder="COC-2024-001" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Compliance Type */}
                    <FormField
                      control={form.control}
                      name="complianceType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Compliance Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ''}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select compliance type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="ISO27001">ISO 27001</SelectItem>
                              <SelectItem value="SOC2">SOC 2</SelectItem>
                              <SelectItem value="HIPAA">HIPAA</SelectItem>
                              <SelectItem value="GDPR">GDPR</SelectItem>
                              <SelectItem value="PCI-DSS">PCI-DSS</SelectItem>
                              <SelectItem value="NIST">NIST Framework</SelectItem>
                              <SelectItem value="Custom">Custom Compliance</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Title */}
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter COC title" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Description */}
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter COC description"
                            rows={4}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Issue Date */}
                    <FormField
                      control={form.control}
                      name="issueDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Issue Date
                          </FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Expiry Date */}
                    <FormField
                      control={form.control}
                      name="expiryDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Expiry Date (Optional)
                          </FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Audit Date */}
                    <FormField
                      control={form.control}
                      name="auditDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Audit Date (Optional)</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Next Audit Date */}
                    <FormField
                      control={form.control}
                      name="nextAuditDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Next Audit Date (Optional)</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Status */}
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || 'draft'}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="issued">Issued</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="expired">Expired</SelectItem>
                            <SelectItem value="revoked">Revoked</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Notes */}
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Additional notes or comments"
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancel}
                      disabled={createCocMutation.isPending}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createCocMutation.isPending}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {createCocMutation.isPending ? 'Creating...' : 'Create COC'}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
} 