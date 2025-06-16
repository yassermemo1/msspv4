import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '../components/layout/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Separator } from '../components/ui/separator';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { 
  CheckCircle, 
  Circle, 
  Clock, 
  Users, 
  FileText, 
  Settings, 
  Shield, 
  Link, 
  Eye, 
  Sparkles,
  ArrowRight,
  Building,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  Server,
  Key,
  Zap,
  AlertTriangle,
  Database,
  CheckCircle2,
  RotateCcw,
  Plus
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useToast } from '@/hooks/use-toast';
import { ClientInfoForm } from "@/components/onboarding/client-info-form";
import { getOnboardingProgress, setOnboardingProgress, markOnboardingStepComplete } from '@/lib/user-preferences';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  estimatedTime: string;
  icon: React.ReactNode;
  status: 'pending' | 'in-progress' | 'completed' | 'warning';
  formComponent?: React.ReactNode;
  checklist: string[];
  tips?: string[];
}

interface FormData {
  // Client Information
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
  industry?: string;
  // Contract
  contractType?: string;
  startDate?: string;
  endDate?: string;
  value?: string;
  // Service Scope
  serviceType?: string;
  endpoints?: string;
  eps?: string;
  coverage?: string;
}

interface LicenseStatusItem {
  total: number;
  available: number;
  status: 'healthy' | 'warning' | 'depleted';
}

interface PoolStatus {
  licenseStatus?: Record<string, LicenseStatusItem>;
}

export default function ClientOnboardingPage() {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<FormData>({});

  // Fetch pool status for real-time validation
  const { data: poolStatus } = useQuery<PoolStatus>({
    queryKey: ['/api/pools/status'],
    refetchInterval: 30000,
  });

  // Create client mutation
  const createClientMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create client');
      return response.json();
    },
    onSuccess: () => {
      markStepCompleted('client-info');
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      toast({
        title: "Success",
        description: "Client created successfully",
      });
    },
  });

  // Create contract mutation
  const createContractMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create contract');
      return response.json();
    },
    onSuccess: () => {
      markStepCompleted('contract-setup');
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });
      toast({
        title: "Success",
        description: "Contract created successfully",
      });
    },
  });

  // Create service mutation
  const createServiceMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create service');
      return response.json();
    },
    onSuccess: () => {
      markStepCompleted('service-scopes');
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      toast({
        title: "Success",
        description: "Service created successfully",
      });
    },
  });

  // === Field Handler Callbacks ===
  const handleContractTypeChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, contractType: value }));
  }, []);

  const handleValueChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, value: e.target.value }));
  }, []);

  const handleStartDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, startDate: e.target.value }));
  }, []);

  const handleEndDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, endDate: e.target.value }));
  }, []);

  // Service scope field handlers
  const handleServiceTypeChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, serviceType: value }));
  }, []);

  const handleCoverageChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, coverage: value }));
  }, []);

  const handleEndpointsChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, endpoints: e.target.value }));
  }, []);

  const handleEpsChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, eps: e.target.value }));
  }, []);

  // Form update handlers - direct inline to prevent focus loss

  const markStepCompleted = (stepId: string) => {
    if (!completedSteps.includes(stepId)) {
      setCompletedSteps(prev => [...prev, stepId]);
    }
    
    // Check completion after state update
    setCompletedSteps(prev => {
      if (prev.length === 5) { // 6 total steps minus 1 for current completion
        setShowCelebration(true);
      }
      return prev;
    });
  };

  const markStepIncomplete = (stepId: string) => {
    setCompletedSteps(prev => prev.filter(id => id !== stepId));
  };

  const resetOnboarding = () => {
    setCurrentStep(0);
    setCompletedSteps([]);
    setFormData({});
    setShowForm(false);
  };

  const handleFormSubmit = (stepId: string) => {
    switch (stepId) {
      case 'client-info':
        createClientMutation.mutate({
          name: formData.clientName,
          email: formData.clientEmail,
          phone: formData.clientPhone,
          address: formData.clientAddress,
          industry: formData.industry,
        });
        break;
      case 'contract-setup':
        createContractMutation.mutate({
          clientName: formData.clientName,
          type: formData.contractType,
          startDate: formData.startDate,
          endDate: formData.endDate,
          value: formData.value,
        });
        break;
      case 'service-scopes':
        createServiceMutation.mutate({
          clientName: formData.clientName,
          serviceType: formData.serviceType,
          endpoints: formData.endpoints,
          eps: formData.eps,
          coverage: formData.coverage,
        });
        break;
      default:
        markStepCompleted(stepId);
        setShowForm(false);
    }
  };

  // Load progress from database
  useEffect(() => {
    const loadProgress = async () => {
      try {
        const progress = await getOnboardingProgress();
        if (typeof progress.currentStep === 'number') {
          setCurrentStep(progress.currentStep);
        }
        if (Array.isArray(progress.completedSteps)) {
          setCompletedSteps(progress.completedSteps);
        }
      } catch (error) {
        console.warn('Failed to load onboarding progress:', error);
      }
    };
    loadProgress();
  }, []);

  // Save progress to database
  useEffect(() => {
    const saveProgress = async () => {
      try {
        await setOnboardingProgress({
          currentStep: currentStep,
          completedSteps: completedSteps
        });
      } catch (error) {
        console.warn('Failed to save onboarding progress:', error);
      }
    };
    saveProgress();
  }, [currentStep, completedSteps]);

  // Stable client info form element
  const clientInfoFormElement = (
    <ClientInfoForm
      data={formData}
      setData={setFormData}
      isSubmitting={createClientMutation.isPending}
      onSubmit={() => handleFormSubmit('client-info')}
      onCancel={() => setShowForm(false)}
    />
  );

  // Contract Setup Form - Memoized to prevent focus loss
  const ContractForm = useCallback(() => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Create Contract</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="contractType">Contract Type *</Label>
          <Select value={formData.contractType} onValueChange={handleContractTypeChange}>
            <SelectTrigger id="contractType">
              <SelectValue placeholder="Select contract type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="msa">Master Service Agreement (MSA)</SelectItem>
              <SelectItem value="sow">Statement of Work (SOW)</SelectItem>
              <SelectItem value="support">Support Contract</SelectItem>
              <SelectItem value="maintenance">Maintenance Agreement</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="value">Contract Value</Label>
          <Input
            id="value"
            type="number"
            value={formData.value || ''}
            onChange={handleValueChange}
            placeholder="Enter contract value"
          />
        </div>
        <div>
          <Label htmlFor="startDate">Start Date *</Label>
          <Input
            id="startDate"
            type="date"
            value={formData.startDate || ''}
            onChange={handleStartDateChange}
          />
        </div>
        <div>
          <Label htmlFor="endDate">End Date *</Label>
          <Input
            id="endDate"
            type="date"
            value={formData.endDate || ''}
            onChange={handleEndDateChange}
          />
        </div>
      </div>
      <div className="flex justify-end space-x-3">
        <Button variant="outline" onClick={() => setShowForm(false)}>
          Cancel
        </Button>
        <Button
          onClick={() => handleFormSubmit('contract-setup')}
          disabled={!formData.contractType || !formData.startDate || !formData.endDate || createContractMutation.isPending}
        >
          {createContractMutation.isPending ? 'Creating...' : 'Create Contract'}
        </Button>
      </div>
    </div>
  ), [formData, createContractMutation.isPending, handleContractTypeChange, handleValueChange, handleStartDateChange, handleEndDateChange]);

  // Service Configuration Form - Memoized to prevent focus loss
  const ServiceForm = useCallback(() => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Configure Service</h3>
      
      {/* Pool Status Display */}
      {poolStatus && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-800 mb-2">📊 Current License Pool Status</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            {Object.entries(poolStatus.licenseStatus || {}).map(([type, status]: [string, LicenseStatusItem]) => (
              <div key={type} className="space-y-1">
                <div className="font-medium text-gray-700 capitalize">{type}</div>
                <div className={cn(
                  "text-sm font-semibold",
                  status.status === 'healthy' && "text-green-600",
                  status.status === 'warning' && "text-yellow-600",
                  status.status === 'depleted' && "text-red-600"
                )}>
                  {status.available.toLocaleString()} / {status.total.toLocaleString()} available
                </div>
                <div className="text-xs text-gray-500">
                  {status.status === 'healthy' && '✅ Sufficient capacity'}
                  {status.status === 'warning' && '⚠️ Low capacity'}
                  {status.status === 'depleted' && '🚫 No capacity'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="serviceType">Service Type *</Label>
          <Select value={formData.serviceType} onValueChange={handleServiceTypeChange}>
            <SelectTrigger id="serviceType">
              <SelectValue placeholder="Select service type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="siem">SIEM Management</SelectItem>
              <SelectItem value="edr">EDR Management</SelectItem>
              <SelectItem value="ndr">NDR Management</SelectItem>
              <SelectItem value="incident-response">Incident Response</SelectItem>
              <SelectItem value="threat-hunting">Threat Hunting</SelectItem>
              <SelectItem value="vulnerability">Vulnerability Management</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="coverage">Coverage Hours</Label>
          <Select value={formData.coverage} onValueChange={handleCoverageChange}>
            <SelectTrigger id="coverage">
              <SelectValue placeholder="Select coverage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="8x5">8x5 (Business Hours)</SelectItem>
              <SelectItem value="24x5">24x5 (Business Days)</SelectItem>
              <SelectItem value="24x7">24x7 (Always On)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="endpoints">Number of Endpoints</Label>
          <Input
            id="endpoints"
            type="number"
            value={formData.endpoints || ''}
            onChange={handleEndpointsChange}
            placeholder="e.g., 100"
          />
        </div>
        <div>
          <Label htmlFor="eps">Events Per Second (EPS)</Label>
          <Input
            id="eps"
            type="number"
            value={formData.eps || ''}
            onChange={handleEpsChange}
            placeholder="e.g., 1000"
          />
        </div>
      </div>
      <div className="flex justify-end space-x-3">
        <Button variant="outline" onClick={() => setShowForm(false)}>
          Cancel
        </Button>
        <Button
          onClick={() => handleFormSubmit('service-scopes')}
          disabled={!formData.serviceType || createServiceMutation.isPending}
        >
          {createServiceMutation.isPending ? 'Creating...' : 'Create Service'}
        </Button>
      </div>
    </div>
  ), [formData, poolStatus, createServiceMutation.isPending, handleServiceTypeChange, handleCoverageChange, handleEndpointsChange, handleEpsChange]);

  // Define onboarding steps - moved inside component to avoid hoisting issues
  const onboardingSteps: OnboardingStep[] = useMemo(() => [
    {
      id: 'client-info',
      title: 'Client Information',
      description: 'Create client record with company details and contacts',
      estimatedTime: '5-10 minutes',
      icon: <Building className="h-5 w-5" /> as React.ReactNode,
      status: 'pending',
      formComponent: clientInfoFormElement,
      checklist: [
        'Company name and industry',
        'Primary contact information',
        'Company address and details'
      ]
    },
    {
      id: 'contract-setup',
      title: 'Contract Setup',
      description: 'Create contracts and set up legal framework',
      estimatedTime: '10-15 minutes',
      icon: <FileText className="h-5 w-5" /> as React.ReactNode,
      status: 'pending',
      formComponent: <ContractForm /> as React.ReactNode,
      checklist: [
        'Contract type selection',
        'Start and end dates',
        'Contract value'
      ]
    },
    {
      id: 'service-scopes',
      title: 'Service Configuration',
      description: 'Configure services with pool validation',
      estimatedTime: '15-20 minutes',
      icon: <Shield className="h-5 w-5" /> as React.ReactNode,
      status: 'pending',
      formComponent: <ServiceForm /> as React.ReactNode,
      checklist: [
        'Service type selection',
        'Coverage hours',
        'License pool validation',
        'Resource allocation'
      ]
    },
    {
      id: 'team-allocation',
      title: 'Team Assignment',
      description: 'Assign team members and configure access',
      estimatedTime: '10-15 minutes',
      icon: <Users className="h-5 w-5" /> as React.ReactNode,
      status: 'pending',
      checklist: [
        'Account manager assignment',
        'Technical team allocation',
        'Access provisioning'
      ]
    },
    {
      id: 'integration-setup',
      title: 'System Integration',
      description: 'Configure integrations and external systems',
      estimatedTime: '15-25 minutes',
      icon: <Link className="h-5 w-5" /> as React.ReactNode,
      status: 'pending',
      checklist: [
        'SIEM integration',
        'Ticketing system setup',
        'Communication channels'
      ]
    },
    {
      id: 'final-verification',
      title: 'Go-Live',
      description: 'Final verification and activation',
      estimatedTime: '10-15 minutes',
      icon: <Zap className="h-5 w-5" /> as React.ReactNode,
      status: 'pending',
      checklist: [
        'Configuration testing',
        'Client acceptance',
        'Service activation'
      ]
    }
  ], [clientInfoFormElement, ContractForm, ServiceForm]);

  const progressPercentage = useMemo(() => 
    (completedSteps.length / onboardingSteps.length) * 100,
    [completedSteps.length, onboardingSteps.length]
  );

  const getStepStatus = (step: OnboardingStep, index: number) => {
    if (completedSteps.includes(step.id)) return 'completed';
    if (index === currentStep) return 'in-progress';
    if (step.id === 'service-scopes' && poolStatus) {
      const hasPoolIssues = Object.values(poolStatus.licenseStatus || {}).some(
        (status: LicenseStatusItem) => status.status === 'depleted'
      );
      if (hasPoolIssues) return 'warning';
    }
    return 'pending';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'in-progress':
        return <Clock className="h-5 w-5 text-blue-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      default:
        return <Circle className="h-5 w-5 text-gray-400" />;
    }
  };

  return (
    <AppLayout 
      title="Client Onboarding Workflow"
      subtitle="Integrated step-by-step client onboarding with embedded forms"
    >
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Celebration Animation */}
        {showCelebration && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <Card className="max-w-md mx-auto text-center p-8">
              <Sparkles className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-green-600 mb-2">🎉 Onboarding Complete!</h2>
              <p className="text-gray-600 mb-4">
                Congratulations! The client has been successfully onboarded.
              </p>
              <Button onClick={() => setShowCelebration(false)}>
                Continue to Dashboard
              </Button>
            </Card>
          </div>
        )}

        {/* Progress Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Onboarding Progress</span>
              <div className="flex gap-2 items-center">
                <Badge variant={progressPercentage === 100 ? 'default' : 'secondary'}>
                  {completedSteps.length} of {onboardingSteps.length} completed
                </Badge>
                <Button variant="outline" size="sm" onClick={resetOnboarding}>
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Reset
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Progress value={progressPercentage} className="h-3" />
              <div className="flex justify-between text-sm text-gray-600">
                <span>Progress: {Math.round(progressPercentage)}%</span>
                <span>
                  Est. time remaining: {
                    onboardingSteps
                      .slice(completedSteps.length)
                      .reduce((total, step) => total + parseInt(step.estimatedTime.split('-')[0]), 0)
                  }-{
                    onboardingSteps
                      .slice(completedSteps.length)
                      .reduce((total, step) => total + parseInt(step.estimatedTime.split('-')[1] || step.estimatedTime.split('-')[0]), 0)
                  } minutes
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pool Status Alert */}
        {poolStatus && Object.values(poolStatus.licenseStatus || {}).some((status: LicenseStatusItem) => status.status === 'depleted') && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription>
              <strong>Pool Capacity Warning:</strong> Some license pools are running low or depleted.
            </AlertDescription>
          </Alert>
        )}

        {/* Step Navigation */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {onboardingSteps.map((step, index) => {
            const status = getStepStatus(step, index);
            return (
              <Button
                key={step.id}
                variant={status === 'in-progress' ? 'default' : 'outline'}
                className={cn(
                  'h-16 flex flex-col items-center justify-center space-y-1 text-xs',
                  status === 'completed' && 'border-green-300 bg-green-50 text-green-700',
                  status === 'warning' && 'border-yellow-300 bg-yellow-50 text-yellow-700'
                )}
                onClick={() => setCurrentStep(index)}
              >
                {getStatusIcon(status)}
                <span className="font-medium text-center">{step.title}</span>
              </Button>
            );
          })}
        </div>

        {/* Current Step Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              {onboardingSteps[currentStep].icon}
              <div>
                <h2 className="text-xl">Step {currentStep + 1}: {onboardingSteps[currentStep].title}</h2>
                <p className="text-sm text-gray-600 font-normal">
                  {onboardingSteps[currentStep].description}
                </p>
              </div>
              <Badge variant="outline" className="ml-auto">
                {onboardingSteps[currentStep].estimatedTime}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Checklist */}
              <div>
                <h3 className="font-semibold mb-3">Requirements Checklist</h3>
                <ul className="space-y-2">
                  {onboardingSteps[currentStep].checklist.map((item, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                      <Circle className="h-4 w-4 text-gray-400" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Tips */}
              {onboardingSteps[currentStep].tips && (
                <div>
                  <h3 className="font-semibold mb-3">💡 Tips</h3>
                  <ul className="space-y-2">
                    {onboardingSteps[currentStep].tips.map((tip, index) => (
                      <li key={index} className="text-sm text-gray-600">
                        • {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <Separator className="my-6" />

            {/* Form Section */}
            {showForm && onboardingSteps[currentStep].formComponent ? (
              <div>
                {onboardingSteps[currentStep].formComponent}
              </div>
            ) : (
              <div className="flex justify-between items-center">
                <div className="space-x-3">
                  {onboardingSteps[currentStep].formComponent ? (
                    <Button
                      onClick={() => setShowForm(true)}
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Start {onboardingSteps[currentStep].title}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleFormSubmit(onboardingSteps[currentStep].id)}
                      className="flex items-center gap-2"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Mark Complete
                    </Button>
                  )}
                  
                  {completedSteps.includes(onboardingSteps[currentStep].id) && (
                    <Button
                      variant="outline"
                      onClick={() => markStepIncomplete(onboardingSteps[currentStep].id)}
                      className="text-red-600 border-red-300 hover:bg-red-50"
                    >
                      Mark Incomplete
                    </Button>
                  )}
                </div>
                
                <div className="space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                    disabled={currentStep === 0}
                  >
                    Previous
                  </Button>
                  <Button
                    onClick={() => setCurrentStep(Math.min(onboardingSteps.length - 1, currentStep + 1))}
                    disabled={currentStep === onboardingSteps.length - 1}
                  >
                    Next Step
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
} 