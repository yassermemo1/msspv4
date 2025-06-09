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
import { FileText, Save, X, Calendar, Building, Shield } from 'lucide-react';
import { formatClientName } from "@/lib/utils";

const safFormSchema = z.object({
  clientId: z.number().min(1, 'Client is required'),
  contractId: z.number().min(1, 'Contract is required'),
  serviceScopeId: z.number().optional(),
  safNumber: z.string().min(1, 'SAF number is required'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  value: z.string().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
});

type SafFormData = z.infer<typeof safFormSchema>;

export default function CreateSafPage() {
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

  const form = useForm<SafFormData>({
    resolver: zodResolver(safFormSchema),
    defaultValues: {
      clientId: 0,
      contractId: 0,
      serviceScopeId: undefined,
      safNumber: '',
      title: '',
      description: '',
      startDate: '',
      endDate: '',
      value: '',
      status: 'pending',
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

  const createSafMutation = useMutation({
    mutationFn: async (data: SafFormData) => {
      const safData = {
        clientId: data.clientId,
        contractId: data.contractId,
        serviceScopeId: data.serviceScopeId || null,
        safNumber: data.safNumber,
        title: data.title,
        description: data.description || '',
        startDate: data.startDate,
        endDate: data.endDate,
        value: data.value ? parseFloat(data.value) : null,
        status: data.status || 'pending',
        notes: data.notes || '',
      };

      const response = await apiRequest('POST', '/api/service-authorization-forms', safData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Service Authorization Form created successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/service-authorization-forms'] });
      setLocation('/service-authorization-forms');
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create Service Authorization Form',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: SafFormData) => {
    createSafMutation.mutate(data);
  };

  const handleCancel = () => {
    setLocation('/service-authorization-forms');
  };

  return (
    <AppLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Create Service Authorization Form</h1>
            <p className="text-muted-foreground">
              Create a new SAF to authorize service delivery for a client contract
            </p>
          </div>
        </div>

        <div className="max-w-3xl">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                SAF Information
              </CardTitle>
              <CardDescription>
                Fill out the details for the new Service Authorization Form
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
                              form.setValue('contractId', 0);
                              form.setValue('serviceScopeId', undefined);
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

                    {/* Contract Selection */}
                    <FormField
                      control={form.control}
                      name="contractId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            Contract
                          </FormLabel>
                          <Select
                            onValueChange={(value) => {
                              field.onChange(parseInt(value));
                              form.setValue('serviceScopeId', undefined);
                            }}
                            value={field.value.toString()}
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* SAF Number */}
                    <FormField
                      control={form.control}
                      name="safNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SAF Number</FormLabel>
                          <FormControl>
                            <Input placeholder="SAF-2024-001" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Status */}
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || 'pending'}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="approved">Approved</SelectItem>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
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
                          <Input placeholder="Enter SAF title" {...field} />
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
                            placeholder="Enter SAF description"
                            rows={4}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Start Date */}
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Start Date
                          </FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* End Date */}
                    <FormField
                      control={form.control}
                      name="endDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            End Date
                          </FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Value */}
                    <FormField
                      control={form.control}
                      name="value"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Value ($)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

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
                      disabled={createSafMutation.isPending}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createSafMutation.isPending}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {createSafMutation.isPending ? 'Creating...' : 'Create SAF'}
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