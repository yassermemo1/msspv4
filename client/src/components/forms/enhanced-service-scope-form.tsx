import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  AlertTriangle, 
  CheckCircle, 
  Database, 
  Shield, 
  Server, 
  Eye,
  Zap,
  Key,
  DollarSign,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiRequest } from '@/lib/queryClient';

const enhancedServiceScopeSchema = z.object({
  serviceName: z.string().min(1, 'Service name is required'),
  serviceType: z.enum(['MDR', 'SOC', 'IR', 'VA', 'PT', 'Compliance', 'Training', 'Custom']),
  clientId: z.number().min(1, 'Client selection is required'),
  siemLicenses: z.number().min(0).optional(),
  siemPoolId: z.number().optional(),
  edrLicenses: z.number().min(0).optional(),
  edrPoolId: z.number().optional(),
  ndrLicenses: z.number().min(0).optional(),
  ndrPoolId: z.number().optional(),
  selectedHardwareIds: z.array(z.number()).optional(),
  eps: z.number().min(0).optional(),
  endpoints: z.number().min(0).optional(),
  serviceTier: z.enum(['Basic', 'Professional', 'Enterprise', 'Premium']).optional(),
  coverageHours: z.enum(['8x5', '12x5', '24x7']).optional(),
  responseTimeMinutes: z.number().min(1).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  monthlyFee: z.number().min(0).optional(),
  setupFee: z.number().min(0).optional(),
});

type EnhancedServiceScopeFormData = z.infer<typeof enhancedServiceScopeSchema>;

interface EnhancedServiceScopeFormProps {
  clientId?: number;
  onSubmit: (data: EnhancedServiceScopeFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function EnhancedServiceScopeForm({ 
  clientId, 
  onSubmit, 
  onCancel, 
  isSubmitting = false 
}: EnhancedServiceScopeFormProps) {
  const [validationResults, setValidationResults] = useState<Record<string, any>>({});
  const [selectedHardware, setSelectedHardware] = useState<number[]>([]);

  const form = useForm<EnhancedServiceScopeFormData>({
    resolver: zodResolver(enhancedServiceScopeSchema),
    defaultValues: {
      clientId: clientId || 0,
      serviceName: '',
      serviceType: 'MDR',
      siemLicenses: 0,
      edrLicenses: 0,
      ndrLicenses: 0,
      eps: 0,
      endpoints: 0,
      serviceTier: 'Professional',
      coverageHours: '24x7',
      responseTimeMinutes: 30,
      selectedHardwareIds: [],
    },
  });

  // Fetch pool status for validation
  const { data: poolStatus } = useQuery({
    queryKey: ['/api/pools/status'],
  });

  // Fetch available license pools
  const { data: licensePools } = useQuery({
    queryKey: ['/api/pools/license-pools'],
  });

  // Fetch available hardware
  const { data: hardwareAssets } = useQuery({
    queryKey: ['/api/pools/hardware-assets'],
  });

  // Validate license allocation when values change
  const validateLicenseAllocation = async (poolId: number, requestedLicenses: number) => {
    if (!poolId || requestedLicenses <= 0) return;
    
    try {
      const response = await apiRequest('POST', '/api/pools/validate-license-allocation', {
        poolId,
        requestedLicenses
      });
      const result = await response.json();
      setValidationResults(prev => ({
        ...prev,
        [`pool_${poolId}`]: result
      }));
    } catch (error) {
      console.error('License validation error:', error);
    }
  };

  const watchedValues = form.watch();
  
  useEffect(() => {
    if (watchedValues.siemPoolId && watchedValues.siemLicenses) {
      validateLicenseAllocation(watchedValues.siemPoolId, watchedValues.siemLicenses);
    }
  }, [watchedValues.siemPoolId, watchedValues.siemLicenses]);

  const handleSubmit = (data: EnhancedServiceScopeFormData) => {
    data.selectedHardwareIds = selectedHardware;
    onSubmit(data);
  };

  const getPoolValidationMessage = (poolId: number) => {
    const result = validationResults[`pool_${poolId}`];
    if (!result) return null;

    return (
      <Alert className={cn(
        'mt-2',
        result.isValid ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
      )}>
        <div className="flex items-center gap-2">
          {result.isValid ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-red-600" />
          )}
          <AlertDescription className={result.isValid ? 'text-green-700' : 'text-red-700'}>
            {result.message}
          </AlertDescription>
        </div>
      </Alert>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          
          {/* Basic Service Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                Service Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="serviceName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Service Name *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., MDR Enterprise Service" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="serviceType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Service Type *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select service type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="MDR">Managed Detection & Response</SelectItem>
                          <SelectItem value="SOC">Security Operations Center</SelectItem>
                          <SelectItem value="IR">Incident Response</SelectItem>
                          <SelectItem value="VA">Vulnerability Assessment</SelectItem>
                          <SelectItem value="PT">Penetration Testing</SelectItem>
                          <SelectItem value="Compliance">Compliance Monitoring</SelectItem>
                          <SelectItem value="Training">Security Training</SelectItem>
                          <SelectItem value="Custom">Custom Service</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* License Allocation with Pool Validation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                License Allocation & Pool Validation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Pool Status Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                {['SIEM', 'EDR', 'NDR'].map((poolType) => {
                  const status = poolStatus?.licenseStatus?.[poolType];
                  return (
                    <div key={poolType} className="text-center">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        {poolType === 'SIEM' && <Database className="h-4 w-4" />}
                        {poolType === 'EDR' && <Shield className="h-4 w-4" />}
                        {poolType === 'NDR' && <Eye className="h-4 w-4" />}
                        <h4 className="font-medium text-sm">{poolType} Pool</h4>
                      </div>
                      {status ? (
                        <div>
                          <p className="text-2xl font-bold text-green-600">
                            {status.totalRemaining?.toLocaleString() || 0}
                          </p>
                          <p className="text-xs text-gray-500">Available</p>
                          <Badge 
                            variant={status.status === 'available' ? 'default' : 'destructive'}
                            className="mt-1"
                          >
                            {status.status === 'available' ? 'Available' : 'Depleted'}
                          </Badge>
                        </div>
                      ) : (
                        <div>
                          <AlertCircle className="h-8 w-8 text-gray-400 mx-auto" />
                          <p className="text-xs text-gray-500 mt-1">No pools</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* SIEM License Allocation */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm">SIEM Licenses</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="siemPoolId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SIEM Pool</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select SIEM pool" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {licensePools?.pools?.SIEM?.map((pool: any) => (
                              <SelectItem key={pool.id} value={pool.id.toString()}>
                                {pool.name} ({pool.remainingCapacity?.toLocaleString() || 0} available)
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
                    name="siemLicenses"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Licenses Needed</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            placeholder="Number of SIEM licenses"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                {watchedValues.siemPoolId && getPoolValidationMessage(watchedValues.siemPoolId)}
              </div>

              <Separator />

              {/* Hardware Assignment */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Hardware Assignment</h4>
                {hardwareAssets?.assets && Object.entries(hardwareAssets.assets).map(([category, assets]) => (
                  <div key={category} className="mb-4">
                    <h5 className="text-sm text-gray-600 mb-2">{category}</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {(assets as any[]).map((asset) => (
                        <div key={asset.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                          <Checkbox
                            id={`asset-${asset.id}`}
                            checked={selectedHardware.includes(asset.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedHardware([...selectedHardware, asset.id]);
                              } else {
                                setSelectedHardware(selectedHardware.filter(id => id !== asset.id));
                              }
                            }}
                          />
                          <div className="flex-1">
                            <label htmlFor={`asset-${asset.id}`} className="text-sm font-medium cursor-pointer">
                              {asset.name}
                            </label>
                            {asset.manufacturer && asset.model && (
                              <p className="text-xs text-gray-500">
                                {asset.manufacturer} {asset.model}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

            </CardContent>
          </Card>

          {/* Scope Variables */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Service Scope Variables
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="eps"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Events Per Second (EPS)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          placeholder="e.g., 5000"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="endpoints"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Endpoints Monitored</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          placeholder="e.g., 1000"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="serviceTier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Service Tier</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select tier" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Basic">Basic</SelectItem>
                          <SelectItem value="Professional">Professional</SelectItem>
                          <SelectItem value="Enterprise">Enterprise</SelectItem>
                          <SelectItem value="Premium">Premium</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating Service...' : 'Create Service Scope'}
            </Button>
          </div>

        </form>
      </Form>
    </div>
  );
} 