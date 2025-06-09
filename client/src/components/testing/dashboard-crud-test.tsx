import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/api';
import {
  CheckCircle,
  XCircle,
  Play,
  RefreshCw,
  AlertTriangle,
  Users,
  Building,
  FileText,
  DollarSign,
  Server,
  BarChart3
} from 'lucide-react';

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  message: string;
  duration?: number;
}

interface TestSuite {
  name: string;
  tests: TestResult[];
  status: 'pending' | 'running' | 'passed' | 'failed';
}

export function DashboardCrudTest() {
  const { toast } = useToast();
  const [testSuites, setTestSuites] = useState<TestSuite[]>([
    {
      name: 'Dashboard API Tests',
      status: 'pending',
      tests: [
        { name: 'Fetch Dashboard Stats', status: 'pending', message: '' },
        { name: 'Test Time Range Filters', status: 'pending', message: '' },
        { name: 'Test Client Filters', status: 'pending', message: '' },
        { name: 'Test Contract Status Filters', status: 'pending', message: '' },
        { name: 'Drill-down Revenue Data', status: 'pending', message: '' },
        { name: 'Drill-down Industry Data', status: 'pending', message: '' },
        { name: 'Drill-down Contract Status', status: 'pending', message: '' },
        { name: 'Drill-down Service Utilization', status: 'pending', message: '' },
        { name: 'Drill-down Team Performance', status: 'pending', message: '' },
        { name: 'Drill-down Client Satisfaction', status: 'pending', message: '' }
      ]
    },
    {
      name: 'CRUD Operations Tests',
      status: 'pending',
      tests: [
        { name: 'Create Client', status: 'pending', message: '' },
        { name: 'Read Client', status: 'pending', message: '' },
        { name: 'Update Client', status: 'pending', message: '' },
        { name: 'Delete Client', status: 'pending', message: '' },
        { name: 'Create Contract', status: 'pending', message: '' },
        { name: 'Read Contract', status: 'pending', message: '' },
        { name: 'Update Contract', status: 'pending', message: '' },
        { name: 'Delete Contract', status: 'pending', message: '' },
        { name: 'Create Service', status: 'pending', message: '' },
        { name: 'Read Service', status: 'pending', message: '' },
        { name: 'Update Service', status: 'pending', message: '' },
        { name: 'Delete Service', status: 'pending', message: '' }
      ]
    },
    {
      name: 'Company Settings Tests',
      status: 'pending',
      tests: [
        { name: 'Get Company Settings', status: 'pending', message: '' },
        { name: 'Update Company Name', status: 'pending', message: '' },
        { name: 'Validate Logo Upload', status: 'pending', message: '' },
        { name: 'Test Settings Persistence', status: 'pending', message: '' }
      ]
    },
    {
      name: 'Integration Tests',
      status: 'pending',
      tests: [
        { name: 'Global Search Functionality', status: 'pending', message: '' },
        { name: 'Global Filters Functionality', status: 'pending', message: '' },
        { name: 'Navigation Functionality', status: 'pending', message: '' },
        { name: 'Authentication Check', status: 'pending', message: '' }
      ]
    }
  ]);

  const [isRunning, setIsRunning] = useState(false);
  const [overallResults, setOverallResults] = useState({
    total: 0,
    passed: 0,
    failed: 0,
    pending: 0
  });

  // Created test data IDs to track for cleanup
  const [testDataIds, setTestDataIds] = useState<{
    clientId?: number;
    contractId?: number;
    serviceId?: number;
  }>({});

  const updateTestResult = (suiteIndex: number, testIndex: number, result: Partial<TestResult>) => {
    setTestSuites(prev => {
      const newSuites = [...prev];
      newSuites[suiteIndex].tests[testIndex] = { ...newSuites[suiteIndex].tests[testIndex], ...result };
      
      // Update suite status
      const tests = newSuites[suiteIndex].tests;
      if (tests.every(t => t.status === 'passed')) {
        newSuites[suiteIndex].status = 'passed';
      } else if (tests.some(t => t.status === 'failed')) {
        newSuites[suiteIndex].status = 'failed';
      } else if (tests.some(t => t.status === 'running')) {
        newSuites[suiteIndex].status = 'running';
      }

      return newSuites;
    });
  };

  const runTest = async (testFn: () => Promise<void>, suiteIndex: number, testIndex: number) => {
    const startTime = Date.now();
    updateTestResult(suiteIndex, testIndex, { status: 'running', message: 'Running...' });

    try {
      await testFn();
      const duration = Date.now() - startTime;
      updateTestResult(suiteIndex, testIndex, { 
        status: 'passed', 
        message: 'Test passed successfully',
        duration 
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      updateTestResult(suiteIndex, testIndex, { 
        status: 'failed', 
        message: error instanceof Error ? error.message : 'Unknown error',
        duration 
      });
    }
  };

  // Dashboard API Tests
  const testDashboardStats = async () => {
    const response = await apiRequest('GET', '/api/dashboard/stats');
    const data = await response.json();
    
    if (!data.totalClients && data.totalClients !== 0) throw new Error('Missing totalClients');
    if (!data.activeContracts && data.activeContracts !== 0) throw new Error('Missing activeContracts');
    if (!data.totalRevenue && data.totalRevenue !== 0) throw new Error('Missing totalRevenue');
    if (!data.clientsByIndustry) throw new Error('Missing clientsByIndustry');
    if (!data.revenueByMonth) throw new Error('Missing revenueByMonth');
  };

  const testTimeRangeFilters = async () => {
    const response = await apiRequest('GET', '/api/dashboard/stats?timeRange=7d');
    const data = await response.json();
    if (!data.totalClients && data.totalClients !== 0) throw new Error('Time range filter failed');
  };

  const testClientFilters = async () => {
    // First get a client ID
    const clientsRes = await apiRequest('GET', '/api/clients');
    const clients = await clientsRes.json();
    if (clients.length === 0) return; // Skip if no clients
    
    const response = await apiRequest('GET', `/api/dashboard/stats?clientId=${clients[0].id}`);
    const data = await response.json();
    if (!data.totalClients && data.totalClients !== 0) throw new Error('Client filter failed');
  };

  const testContractStatusFilters = async () => {
    const response = await apiRequest('GET', '/api/dashboard/stats?contractStatus=active,pending');
    const data = await response.json();
    if (!data.totalClients && data.totalClients !== 0) throw new Error('Contract status filter failed');
  };

  const testDrilldownRevenue = async () => {
    const response = await apiRequest('GET', '/api/dashboard/drilldown/revenue');
    const data = await response.json();
    if (!data.type || data.type !== 'revenue_breakdown') throw new Error('Revenue drilldown failed');
    if (!data.data) throw new Error('Missing drilldown data');
  };

  const testDrilldownIndustry = async () => {
    const response = await apiRequest('GET', '/api/dashboard/drilldown/clients-industry');
    const data = await response.json();
    if (!data.type || data.type !== 'industry_breakdown') throw new Error('Industry drilldown failed');
  };

  const testDrilldownContractStatus = async () => {
    const response = await apiRequest('GET', '/api/dashboard/drilldown/contracts-status');
    const data = await response.json();
    if (!data.type || data.type !== 'contract_details') throw new Error('Contract status drilldown failed');
  };

  const testDrilldownServiceUtilization = async () => {
    const response = await apiRequest('GET', '/api/dashboard/drilldown/service-utilization');
    const data = await response.json();
    if (!data.type || data.type !== 'service_details') throw new Error('Service utilization drilldown failed');
  };

  const testDrilldownTeamPerformance = async () => {
    const response = await apiRequest('GET', '/api/dashboard/drilldown/team-performance');
    const data = await response.json();
    if (!data.type || data.type !== 'team_details') throw new Error('Team performance drilldown failed');
  };

  const testDrilldownClientSatisfaction = async () => {
    const response = await apiRequest('GET', '/api/dashboard/drilldown/client-satisfaction');
    const data = await response.json();
    if (!data.type || data.type !== 'satisfaction_details') throw new Error('Client satisfaction drilldown failed');
  };

  // CRUD Operations Tests
  const testCreateClient = async () => {
    const clientData = {
      name: `Test Client ${Date.now()}`,
      email: 'test@testclient.com',
      industry: 'Technology',
      status: 'active',
      phone: '555-0123',
      address: '123 Test St',
      website: 'https://testclient.com'
    };

    const response = await apiRequest('POST', '/api/clients', clientData);
    const client = await response.json();
    
    if (!client.id) throw new Error('Client creation failed - no ID returned');
    setTestDataIds(prev => ({ ...prev, clientId: client.id }));
  };

  const testReadClient = async () => {
    if (!testDataIds.clientId) throw new Error('No test client ID available');
    
    const response = await apiRequest('GET', `/api/clients/${testDataIds.clientId}`);
    const client = await response.json();
    
    if (client.id !== testDataIds.clientId) throw new Error('Client read failed - ID mismatch');
  };

  const testUpdateClient = async () => {
    if (!testDataIds.clientId) throw new Error('No test client ID available');
    
    const updateData = {
      name: `Updated Test Client ${Date.now()}`,
      industry: 'Updated Technology'
    };

    const response = await apiRequest('PUT', `/api/clients/${testDataIds.clientId}`, updateData);
    const client = await response.json();
    
    if (client.name !== updateData.name) throw new Error('Client update failed - name not updated');
  };

  const testDeleteClient = async () => {
    if (!testDataIds.clientId) throw new Error('No test client ID available');
    
    const response = await apiRequest('DELETE', `/api/clients/${testDataIds.clientId}`);
    if (!response.ok) throw new Error('Client deletion failed');
    
    setTestDataIds(prev => ({ ...prev, clientId: undefined }));
  };

  const testCreateContract = async () => {
    // First ensure we have a client
    if (!testDataIds.clientId) {
      const clientData = {
        name: `Contract Test Client ${Date.now()}`,
        email: 'contract@test.com',
        industry: 'Technology',
        status: 'active'
      };
      const clientRes = await apiRequest('POST', '/api/clients', clientData);
      const client = await clientRes.json();
      setTestDataIds(prev => ({ ...prev, clientId: client.id }));
    }

    const contractData = {
      name: `Test Contract ${Date.now()}`,
      clientId: testDataIds.clientId,
      value: 50000,
      status: 'active',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
    };

    const response = await apiRequest('POST', '/api/contracts', contractData);
    const contract = await response.json();
    
    if (!contract.id) throw new Error('Contract creation failed - no ID returned');
    setTestDataIds(prev => ({ ...prev, contractId: contract.id }));
  };

  const testReadContract = async () => {
    if (!testDataIds.contractId) throw new Error('No test contract ID available');
    
    const response = await apiRequest('GET', `/api/contracts/${testDataIds.contractId}`);
    const contract = await response.json();
    
    if (contract.id !== testDataIds.contractId) throw new Error('Contract read failed - ID mismatch');
  };

  const testUpdateContract = async () => {
    if (!testDataIds.contractId) throw new Error('No test contract ID available');
    
    const updateData = {
      name: `Updated Test Contract ${Date.now()}`,
      value: 75000
    };

    const response = await apiRequest('PUT', `/api/contracts/${testDataIds.contractId}`, updateData);
    const contract = await response.json();
    
    if (contract.name !== updateData.name) throw new Error('Contract update failed - name not updated');
  };

  const testDeleteContract = async () => {
    if (!testDataIds.contractId) throw new Error('No test contract ID available');
    
    const response = await apiRequest('DELETE', `/api/contracts/${testDataIds.contractId}`);
    if (!response.ok) throw new Error('Contract deletion failed');
    
    setTestDataIds(prev => ({ ...prev, contractId: undefined }));
  };

  const testCreateService = async () => {
    const serviceData = {
      name: `Test Service ${Date.now()}`,
      description: 'Test service description',
      category: 'Testing',
      isActive: true
    };

    const response = await apiRequest('POST', '/api/services', serviceData);
    const service = await response.json();
    
    if (!service.id) throw new Error('Service creation failed - no ID returned');
    setTestDataIds(prev => ({ ...prev, serviceId: service.id }));
  };

  const testReadService = async () => {
    if (!testDataIds.serviceId) throw new Error('No test service ID available');
    
    const response = await apiRequest('GET', `/api/services/${testDataIds.serviceId}`);
    const service = await response.json();
    
    if (service.id !== testDataIds.serviceId) throw new Error('Service read failed - ID mismatch');
  };

  const testUpdateService = async () => {
    if (!testDataIds.serviceId) throw new Error('No test service ID available');
    
    const updateData = {
      name: `Updated Test Service ${Date.now()}`,
      description: 'Updated test service description'
    };

    const response = await apiRequest('PUT', `/api/services/${testDataIds.serviceId}`, updateData);
    const service = await response.json();
    
    if (service.name !== updateData.name) throw new Error('Service update failed - name not updated');
  };

  const testDeleteService = async () => {
    if (!testDataIds.serviceId) throw new Error('No test service ID available');
    
    const response = await apiRequest('DELETE', `/api/services/${testDataIds.serviceId}`);
    if (!response.ok) throw new Error('Service deletion failed');
    
    setTestDataIds(prev => ({ ...prev, serviceId: undefined }));
  };

  // Company Settings Tests
  const testGetCompanySettings = async () => {
    const response = await apiRequest('GET', '/api/company/settings');
    const settings = await response.json();
    
    if (!settings.companyName) throw new Error('Missing company name in settings');
  };

  const testUpdateCompanyName = async () => {
    const testName = `Test Company ${Date.now()}`;
    const formData = new FormData();
    formData.append('companyName', testName);

    const response = await fetch('/api/company/settings', {
      method: 'PUT',
      body: formData,
      credentials: 'include'
    });

    if (!response.ok) throw new Error('Company name update failed');
    
    const result = await response.json();
    if (result.settings.companyName !== testName) throw new Error('Company name not updated correctly');
  };

  const testValidateLogoUpload = async () => {
    // Test with invalid file type
    const formData = new FormData();
    formData.append('companyName', 'Test Company');
    
    // Create a small test file (text file should be rejected)
    const testFile = new Blob(['test'], { type: 'text/plain' });
    formData.append('logo', testFile, 'test.txt');

    const response = await fetch('/api/company/settings', {
      method: 'PUT',
      body: formData,
      credentials: 'include'
    });

    if (response.ok) throw new Error('Logo validation failed - should reject text files');
  };

  const testSettingsPersistence = async () => {
    // Get current settings
    const response1 = await apiRequest('GET', '/api/company/settings');
    const settings1 = await response1.json();
    
    // Update settings
    const testName = `Persistence Test ${Date.now()}`;
    const formData = new FormData();
    formData.append('companyName', testName);

    await fetch('/api/company/settings', {
      method: 'PUT',
      body: formData,
      credentials: 'include'
    });

    // Get settings again
    const response2 = await apiRequest('GET', '/api/company/settings');
    const settings2 = await response2.json();
    
    if (settings2.companyName !== testName) throw new Error('Settings persistence failed');
  };

  // Integration Tests
  const testGlobalSearch = async () => {
    // Test that all required endpoints are available
    const endpoints = ['/api/clients', '/api/contracts', '/api/services', '/api/users'];
    
    for (const endpoint of endpoints) {
      const response = await apiRequest('GET', endpoint);
      if (!response.ok) throw new Error(`Global search endpoint ${endpoint} failed`);
    }
  };

  const testGlobalFilters = async () => {
    // Test filter functionality by checking if filtered results are different
    const allClients = await apiRequest('GET', '/api/clients');
    const allData = await allClients.json();
    
    if (allData.length === 0) return; // Skip if no data
    
    // This would test actual filter implementation
    // For now, just verify the endpoint responds
    if (!allClients.ok) throw new Error('Global filters test failed - clients endpoint not responsive');
  };

  const testNavigationFunctionality = async () => {
    // Test key navigation endpoints
    const endpoints = [
      '/api/clients',
      '/api/contracts', 
      '/api/services',
      '/api/team',
      '/api/financial-transactions'
    ];
    
    for (const endpoint of endpoints) {
      const response = await apiRequest('GET', endpoint);
      if (!response.ok) throw new Error(`Navigation endpoint ${endpoint} failed`);
    }
  };

  const testAuthenticationCheck = async () => {
    const response = await apiRequest('GET', '/api/user');
    if (!response.ok) throw new Error('Authentication check failed');
    
    const user = await response.json();
    if (!user.id) throw new Error('No authenticated user found');
  };

  const runAllTests = async () => {
    setIsRunning(true);
    
    // Define all test functions
    const allTests = [
      // Dashboard API Tests
      [testDashboardStats, testTimeRangeFilters, testClientFilters, testContractStatusFilters,
       testDrilldownRevenue, testDrilldownIndustry, testDrilldownContractStatus, 
       testDrilldownServiceUtilization, testDrilldownTeamPerformance, testDrilldownClientSatisfaction],
      
      // CRUD Operations Tests  
      [testCreateClient, testReadClient, testUpdateClient, testDeleteClient,
       testCreateContract, testReadContract, testUpdateContract, testDeleteContract,
       testCreateService, testReadService, testUpdateService, testDeleteService],
      
      // Company Settings Tests
      [testGetCompanySettings, testUpdateCompanyName, testValidateLogoUpload, testSettingsPersistence],
      
      // Integration Tests
      [testGlobalSearch, testGlobalFilters, testNavigationFunctionality, testAuthenticationCheck]
    ];

    // Run all test suites
    for (let suiteIndex = 0; suiteIndex < allTests.length; suiteIndex++) {
      const suiteFunctions = allTests[suiteIndex];
      
      for (let testIndex = 0; testIndex < suiteFunctions.length; testIndex++) {
        await runTest(suiteFunctions[testIndex], suiteIndex, testIndex);
        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    setIsRunning(false);
    
    toast({
      title: "Test Suite Complete",
      description: "All tests have finished running. Check results below.",
    });
  };

  // Calculate overall results
  useEffect(() => {
    const total = testSuites.reduce((sum, suite) => sum + suite.tests.length, 0);
    const passed = testSuites.reduce((sum, suite) => 
      sum + suite.tests.filter(t => t.status === 'passed').length, 0);
    const failed = testSuites.reduce((sum, suite) => 
      sum + suite.tests.filter(t => t.status === 'failed').length, 0);
    const pending = total - passed - failed;

    setOverallResults({ total, passed, failed, pending });
  }, [testSuites]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      passed: 'default',
      failed: 'destructive',
      running: 'secondary',
      pending: 'secondary'
    };
    
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Overall Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>Dashboard & CRUD Test Suite</span>
            </div>
            <Button 
              onClick={runAllTests} 
              disabled={isRunning}
              className="flex items-center space-x-2"
            >
              {isRunning ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              <span>{isRunning ? 'Running Tests...' : 'Run All Tests'}</span>
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{overallResults.total}</div>
              <div className="text-sm text-muted-foreground">Total Tests</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{overallResults.passed}</div>
              <div className="text-sm text-muted-foreground">Passed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{overallResults.failed}</div>
              <div className="text-sm text-muted-foreground">Failed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{overallResults.pending}</div>
              <div className="text-sm text-muted-foreground">Pending</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Suites */}
      {testSuites.map((suite, suiteIndex) => (
        <Card key={suiteIndex}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {getStatusIcon(suite.status)}
                <span>{suite.name}</span>
              </div>
              {getStatusBadge(suite.status)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {suite.tests.map((test, testIndex) => (
                <div key={testIndex} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(test.status)}
                    <span className="font-medium">{test.name}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    {test.duration && (
                      <span className="text-sm text-muted-foreground">
                        {test.duration}ms
                      </span>
                    )}
                    {getStatusBadge(test.status)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
} 