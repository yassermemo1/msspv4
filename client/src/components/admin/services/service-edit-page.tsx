import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Save, AlertCircle, CheckCircle2, Settings, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SimpleScopeFieldManager } from './simple-scope-field-manager';
import { apiRequest } from '@/lib/api';
import { Service, ScopeDefinitionTemplate } from '@/types';
import { useAuth } from '@/hooks/use-auth';

export function ServiceEditPage() {
  const { serviceId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { isAdmin, isLoading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [service, setService] = useState<Service | null>(null);
  const [activeTab, setActiveTab] = useState('basic');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    deliveryModel: '',
    basePrice: '',
    pricingUnit: '',
    isActive: true
  });

  const serviceCategories = [
    'Security',
    'Infrastructure',
    'Compliance',
    'Monitoring',
    'Support'
  ];

  const deliveryModels = [
    'Managed',
    'Consulting',
    'Self-Service',
    'Hybrid'
  ];

  const pricingUnits = [
    'monthly',
    'annually',
    'per endpoint',
    'per user',
    'per device',
    'per hour',
    'fixed price'
  ];

  // Load service data
  useEffect(() => {
    const loadService = async () => {
      if (!serviceId) return;

      try {
        setLoading(true);
        const response = await apiRequest('GET', `/api/services/${serviceId}`);
        const serviceData = await response.json();
        setService(serviceData);
        setFormData({
          name: serviceData.name || '',
          category: serviceData.category || '',
          description: serviceData.description || '',
          deliveryModel: serviceData.deliveryModel || '',
          basePrice: serviceData.basePrice?.toString() || '',
          pricingUnit: serviceData.pricingUnit || '',
          isActive: serviceData.isActive ?? true
        });
      } catch (error) {
        console.error('Failed to load service:', error);
        toast({
          title: 'Error Loading Service',
          description: 'Failed to load service details. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    loadService();
  }, [serviceId, toast]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };

  const handleSaveBasicInfo = async () => {
    try {
      setSaving(true);

      const updateData = {
        ...formData,
        basePrice: formData.basePrice ? parseFloat(formData.basePrice) : null
      };

      const response = await apiRequest('PATCH', `/api/services/${serviceId}`, updateData);
      const updatedService = await response.json();
      setService(updatedService);
      setHasUnsavedChanges(false);

      toast({
        title: 'Service Updated',
        description: 'Basic service information has been saved successfully.',
      });
    } catch (error) {
      console.error('Failed to save service:', error);
      toast({
        title: 'Save Failed',
        description: 'Failed to save service changes. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTemplateSuccess = (template: ScopeDefinitionTemplate) => {
    toast({
      title: 'Template Saved',
      description: 'Scope definition template has been updated successfully.',
    });
  };

  const validateBasicForm = () => {
    return formData.name.trim() && formData.category && formData.deliveryModel;
  };

  // Access control check
  useEffect(() => {
    if (!authLoading && !isAdmin) {
      toast({
        title: 'Access Denied',
        description: 'Admin access required to configure services and scope templates.',
        variant: 'destructive',
      });
      setLocation('/services');
    }
  }, [authLoading, isAdmin, setLocation, toast]);

  // Don't render anything while checking auth
  if (authLoading) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-sm text-gray-500">Checking permissions...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Don't render for non-admin users
  if (!isAdmin) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
            <p className="text-gray-500 mb-4">Admin access required to configure services and scope templates.</p>
            <Button onClick={() => setLocation('/services')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Services
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-sm text-gray-500">Loading service...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Service Not Found</h3>
            <p className="text-gray-500 mb-4">The requested service could not be found.</p>
            <Button onClick={() => setLocation('/services')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Services
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={() => setLocation('/services')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Services
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Edit Service</h1>
            <p className="text-gray-500">Manage service configuration and scope definition template</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant={service.isActive ? 'default' : 'secondary'}>
            {service.isActive ? 'Active' : 'Inactive'}
          </Badge>
          <Badge variant="outline">{service.category}</Badge>
        </div>
      </div>

      {/* Global Unsaved Changes Alert */}
      {hasUnsavedChanges && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You have unsaved changes in the basic information. Don't forget to save your changes.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="basic" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Basic Information
          </TabsTrigger>
          <TabsTrigger value="template" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Scope Template
          </TabsTrigger>
        </TabsList>

        {/* Basic Information Tab */}
        <TabsContent value="basic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Service Details</CardTitle>
              <CardDescription>
                Configure the basic information and pricing for this service
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="serviceName">Service Name *</Label>
                  <Input
                    id="serviceName"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Enter service name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => handleInputChange('category', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {serviceCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deliveryModel">Delivery Model *</Label>
                  <Select
                    value={formData.deliveryModel}
                    onValueChange={(value) => handleInputChange('deliveryModel', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select delivery model" />
                    </SelectTrigger>
                    <SelectContent>
                      {deliveryModels.map((model) => (
                        <SelectItem key={model} value={model}>
                          {model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pricingUnit">Pricing Unit</Label>
                  <Select
                    value={formData.pricingUnit}
                    onValueChange={(value) => handleInputChange('pricingUnit', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select pricing unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {pricingUnits.map((unit) => (
                        <SelectItem key={unit} value={unit}>
                          {unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="basePrice">Base Price</Label>
                  <Input
                    id="basePrice"
                    type="number"
                    value={formData.basePrice}
                    onChange={(e) => handleInputChange('basePrice', e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => handleInputChange('isActive', Boolean(checked))}
                  />
                  <Label htmlFor="isActive">Service is active</Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe this service..."
                  rows={4}
                />
              </div>

              <Separator />

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setLocation('/services')}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveBasicInfo}
                  disabled={!validateBasicForm() || saving}
                  className="flex items-center gap-2"
                >
                  {saving ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scope Template Tab */}
        <TabsContent value="template" className="space-y-6">
          <SimpleScopeFieldManager
            serviceId={parseInt(serviceId!)}
            serviceName={service.name}
            readonly={false}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
} 