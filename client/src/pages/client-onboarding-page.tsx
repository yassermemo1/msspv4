import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '../components/layout/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Separator } from '../components/ui/separator';
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
  CheckCircle2
} from 'lucide-react';
import { cn } from '../lib/utils';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  estimatedTime: string;
  icon: React.ReactNode;
  status: 'pending' | 'in-progress' | 'completed' | 'warning';
  actions: Array<{
    label: string;
    url: string;
    type: 'primary' | 'secondary';
    icon: React.ReactNode;
  }>;
  checklist: string[];
  tips?: string[];
}

const onboardingSteps: OnboardingStep[] = [
  {
    id: 'client-info',
    title: 'Client Information Setup',
    description: 'Create client record with company details, contacts, and basic information',
    estimatedTime: '5-10 minutes',
    icon: <Building className="h-5 w-5" />,
    status: 'pending',
    actions: [
      {
        label: 'Add New Client',
        url: '/clients',
        type: 'primary',
        icon: <Users className="h-4 w-4" />
      },
      {
        label: 'View Existing Clients',
        url: '/clients',
        type: 'secondary',
        icon: <Eye className="h-4 w-4" />
      }
    ],
    checklist: [
      'Company name and industry',
      'Primary contact information',
      'Technical and billing contacts',
      'Company address and details',
      'Initial communication preferences'
    ],
    tips: [
      'Gather all contact information before starting',
      'Ensure email addresses are correct for notifications',
      'Add multiple contacts for redundancy'
    ]
  },
  {
    id: 'contract-setup',
    title: 'Contract & Legal Setup',
    description: 'Create contracts, upload documents, and set up legal framework',
    estimatedTime: '10-15 minutes',
    icon: <FileText className="h-5 w-5" />,
    status: 'pending',
    actions: [
      {
        label: 'Create Contract',
        url: '/contracts',
        type: 'primary',
        icon: <FileText className="h-4 w-4" />
      },
      {
        label: 'Upload Documents',
        url: '/documents',
        type: 'secondary',
        icon: <Link className="h-4 w-4" />
      }
    ],
    checklist: [
      'Master Service Agreement (MSA)',
      'Statement of Work (SOW)',
      'Service Level Agreements (SLA)',
      'Data Processing Agreements (DPA)',
      'Contract start and end dates',
      'Pricing and billing terms'
    ],
    tips: [
      'Use templates for standard agreements',
      'Review SLA requirements carefully',
      'Set up automatic renewal reminders'
    ]
  },
  {
    id: 'service-scopes',
    title: 'Service Scopes with Pool Validation',
    description: 'Define services with automatic license and hardware pool validation',
    estimatedTime: '15-20 minutes',
    icon: <Shield className="h-5 w-5" />,
    status: 'pending',
    actions: [
      {
        label: 'Enhanced Service Form',
        url: '/service-scopes',
        type: 'primary',
        icon: <Settings className="h-4 w-4" />
      },
      {
        label: 'Check Pool Status',
        url: '/assets',
        type: 'secondary',
        icon: <Database className="h-4 w-4" />
      }
    ],
    checklist: [
      'Service type and tier selection',
      'SIEM license pool validation',
      'EDR license pool validation',
      'NDR license pool validation',
      'Hardware asset assignment',
      'Scope variables (EPS, endpoints)',
      'Coverage hours and response times',
      'Service-specific requirements'
    ],
    tips: [
      'Check pool availability before promising capacity',
      'Yellow ⚠️ indicators show pool issues',
      'Validate all allocations before finalizing'
    ]
  },
  {
    id: 'resource-allocation',
    title: 'Resource & Team Allocation',
    description: 'Assign team members, assets, and configure access controls',
    estimatedTime: '10-15 minutes',
    icon: <Users className="h-5 w-5" />,
    status: 'pending',
    actions: [
      {
        label: 'Assign Team Members',
        url: '/team',
        type: 'primary',
        icon: <Users className="h-4 w-4" />
      },
      {
        label: 'Configure Access',
        url: '/users',
        type: 'secondary',
        icon: <Key className="h-4 w-4" />
      }
    ],
    checklist: [
      'Primary account manager assignment',
      'Technical lead assignment',
      'SOC analyst team allocation',
      'Escalation procedures setup',
      'Client portal access creation',
      'Tool and system access provisioning'
    ]
  },
  {
    id: 'integration-setup',
    title: 'External System Integration',
    description: 'Configure integrations with client systems and external tools',
    estimatedTime: '15-25 minutes',
    icon: <Link className="h-5 w-5" />,
    status: 'pending',
    actions: [
      {
        label: 'Configure Integrations',
        url: '/external-systems',
        type: 'primary',
        icon: <Link className="h-4 w-4" />
      },
      {
        label: 'Test Connections',
        url: '/external-systems',
        type: 'secondary',
        icon: <Zap className="h-4 w-4" />
      }
    ],
    checklist: [
      'SIEM system integration',
      'Ticketing system setup (Jira/ServiceNow)',
      'Communication channels (Slack/Teams)',
      'Client environment connectivity',
      'Log source configuration',
      'Alert forwarding setup',
      'API access and authentication'
    ]
  },
  {
    id: 'verification',
    title: 'Final Verification & Go-Live',
    description: 'Complete verification, testing, and activate all services',
    estimatedTime: '10-15 minutes',
    icon: <CheckCircle className="h-5 w-5" />,
    status: 'pending',
    actions: [
      {
        label: 'Run Tests',
        url: '/testing',
        type: 'primary',
        icon: <Zap className="h-4 w-4" />
      },
      {
        label: 'Activate Services',
        url: '/clients',
        type: 'secondary',
        icon: <CheckCircle className="h-4 w-4" />
      }
    ],
    checklist: [
      'End-to-end service testing',
      'License allocation verification',
      'Hardware deployment confirmation',
      'Integration connectivity tests',
      'Team notification setup',
      'Client communication templates',
      'Go-live scheduling and execution'
    ]
  }
];

export default function ClientOnboardingPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const [location, setLocation] = useLocation();

  // Load progress from localStorage
  useEffect(() => {
    const savedProgress = localStorage.getItem('onboarding-progress');
    if (savedProgress) {
      const { currentStep: savedStep, completedSteps: savedCompleted } = JSON.parse(savedProgress);
      setCurrentStep(savedStep);
      setCompletedSteps(savedCompleted);
    }
  }, []);

  // Save progress to localStorage
  useEffect(() => {
    localStorage.setItem('onboarding-progress', JSON.stringify({
      currentStep,
      completedSteps
    }));
  }, [currentStep, completedSteps]);

  // Fetch pool status for real-time validation
  const { data: poolStatus } = useQuery({
    queryKey: ['/api/pools/status'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const progressPercentage = (completedSteps.length / onboardingSteps.length) * 100;

  const markStepCompleted = (stepId: string) => {
    if (!completedSteps.includes(stepId)) {
      const newCompleted = [...completedSteps, stepId];
      setCompletedSteps(newCompleted);
      
      if (newCompleted.length === onboardingSteps.length) {
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 5000);
      }
    }
  };

  const markStepIncomplete = (stepId: string) => {
    if (completedSteps.includes(stepId)) {
      const newCompleted = completedSteps.filter(id => id !== stepId);
      setCompletedSteps(newCompleted);
    }
  };

  const getStepStatus = (step: OnboardingStep, index: number) => {
    if (completedSteps.includes(step.id)) return 'completed';
    if (index === currentStep) return 'in-progress';
    if (step.id === 'service-scopes' && poolStatus) {
      // Check for pool warnings
      const hasPoolIssues = Object.values(poolStatus.licenseStatus || {}).some(
        (status: any) => status.status === 'depleted'
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

  const PoolStatusAlert = () => {
    if (!poolStatus) return null;

    const hasIssues = Object.entries(poolStatus.licenseStatus || {}).some(
      ([, status]: [string, any]) => status.status === 'depleted'
    );

    if (!hasIssues) return null;

    return (
      <Alert className="mb-6 border-yellow-200 bg-yellow-50">
        <AlertTriangle className="h-4 w-4 text-yellow-600" />
        <AlertDescription>
          <strong>Pool Capacity Warning:</strong> Some license pools are running low or depleted. 
          Check pool status before allocating licenses to new clients.
          <div className="mt-2 space-y-1">
            {Object.entries(poolStatus.licenseStatus).map(([poolType, status]: [string, any]) => (
              status.status === 'depleted' && (
                <div key={poolType} className="text-sm">
                  • <strong>{poolType} Pool:</strong> {status.totalRemaining || 0} licenses remaining
                </div>
              )
            ))}
          </div>
        </AlertDescription>
      </Alert>
    );
  };

  return (
    <AppLayout 
      title="Client Onboarding Workflow"
      subtitle="Step-by-step guide for onboarding new clients with pool validation"
    >
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Celebration Animation */}
        {showCelebration && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <Card className="max-w-md mx-auto text-center p-8">
              <Sparkles className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-green-600 mb-2">🎉 Onboarding Complete!</h2>
              <p className="text-gray-600 mb-4">
                Congratulations! The client has been successfully onboarded with all 
                services configured and validated.
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
              <Badge variant={progressPercentage === 100 ? 'default' : 'secondary'}>
                {completedSteps.length} of {onboardingSteps.length} steps completed
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Progress value={progressPercentage} className="h-3" />
              <div className="flex justify-between text-sm text-gray-600">
                <span>Progress: {Math.round(progressPercentage)}%</span>
                <span>
                  Estimated time remaining: {
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
        <PoolStatusAlert />

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
                <span className="font-medium">{step.title.split(' ')[0]} {step.title.split(' ')[1]}</span>
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
          <CardContent className="space-y-6">
            
            {/* Actions */}
            <div>
              <h3 className="font-medium mb-3">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {onboardingSteps[currentStep].actions.map((action, index) => (
                  <Button
                    key={index}
                    variant={action.type === 'primary' ? 'default' : 'outline'}
                    onClick={() => window.open(action.url, '_blank')}
                    className="h-16 flex items-center justify-center space-x-2"
                  >
                    {action.icon}
                    <span>{action.label}</span>
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Checklist */}
            <div>
              <h3 className="font-medium mb-3">Completion Checklist</h3>
              <div className="space-y-2">
                {onboardingSteps[currentStep].checklist.map((item, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Circle className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tips */}
            {onboardingSteps[currentStep].tips && (
              <>
                <Separator />
                <div>
                  <h3 className="font-medium mb-3">💡 Pro Tips</h3>
                  <div className="space-y-2">
                    {onboardingSteps[currentStep].tips.map((tip, index) => (
                      <div key={index} className="flex items-start space-x-2">
                        <div className="h-2 w-2 bg-blue-400 rounded-full mt-2 flex-shrink-0" />
                        <span className="text-sm text-gray-600">{tip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Special Pool Validation for Service Scopes Step */}
            {currentStep === 2 && poolStatus && (
              <>
                <Separator />
                <div>
                  <h3 className="font-medium mb-3">🔍 Pool Status Overview</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Object.entries(poolStatus.licenseStatus || {}).map(([poolType, status]: [string, any]) => (
                      <div key={poolType} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-sm">{poolType} Pool</h4>
                          <Badge 
                            variant={status.status === 'available' ? 'default' : 'destructive'}
                          >
                            {status.status}
                          </Badge>
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Available:</span>
                            <span className="font-medium">{status.totalRemaining?.toLocaleString() || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Total Capacity:</span>
                            <span>{status.totalCapacity?.toLocaleString() || 0}</span>
                          </div>
                          <Progress 
                            value={status.utilizationRate || 0} 
                            className="h-1 mt-2"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Step Completion */}
            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                disabled={currentStep === 0}
              >
                Previous Step
              </Button>
              
              <div className="space-x-3">
                {!completedSteps.includes(onboardingSteps[currentStep].id) ? (
                  <Button
                    variant="outline"
                    onClick={() => markStepCompleted(onboardingSteps[currentStep].id)}
                  >
                    Mark Complete
                  </Button>
                ) : (
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      className="bg-green-50 border-green-300 text-green-700"
                      disabled
                    >
                      Completed ✓
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => markStepIncomplete(onboardingSteps[currentStep].id)}
                      className="text-red-600 border-red-300 hover:bg-red-50"
                    >
                      Mark Incomplete
                    </Button>
                  </div>
                )}
                
                <Button
                  onClick={() => setCurrentStep(Math.min(onboardingSteps.length - 1, currentStep + 1))}
                  disabled={currentStep === onboardingSteps.length - 1}
                >
                  Next Step
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>

          </CardContent>
        </Card>

      </div>
    </AppLayout>
  );
} 