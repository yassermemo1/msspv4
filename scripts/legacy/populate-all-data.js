const axios = require('axios');
const fs = require('fs');

const BASE_URL = 'http://localhost:5001';
const ADMIN_EMAIL = 'admin@mssp.local';
const ADMIN_PASSWORD = 'SecureTestPass123!';

let authCookie = '';
let createdData = {
  clients: [],
  services: [],
  contracts: [],
  serviceScopes: [],
  licensePools: [],
  hardwareAssets: [],
  safs: [],
  cocs: [],
  transactions: [],
  documents: [],
  externalSystems: [],
  dashboards: []
};

// Helper function to make authenticated requests
async function makeRequest(method, url, data = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${url}`,
      headers: {
        'Cookie': authCookie,
        'Content-Type': 'application/json'
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return { success: true, status: response.status, data: response.data };
  } catch (error) {
    console.error(`❌ Error ${method} ${url}:`, error.response?.data || error.message);
    return { 
      success: false, 
      status: error.response?.status || 'NO_RESPONSE',
      error: error.response?.data || error.message 
    };
  }
}

// Login function
async function login() {
  try {
    const response = await axios.post(`${BASE_URL}/api/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    }, {
      withCredentials: true,
      maxRedirects: 0,
      validateStatus: (status) => status < 400
    });
    
    const cookies = response.headers['set-cookie'];
    if (cookies) {
      authCookie = cookies.map(cookie => cookie.split(';')[0]).join('; ');
      console.log('✅ Login successful');
      return true;
    }
    console.log('❌ Login failed - no cookies received');
    return false;
  } catch (error) {
    console.log('❌ Login error:', error.message);
    return false;
  }
}

// Create test data
async function populateAllData() {
  console.log('🚀 Starting comprehensive data population...\n');

  // Login first
  if (!await login()) {
    console.log('❌ Failed to login. Aborting data population.');
    return;
  }

  // 1. Create Clients
  console.log('\n📁 Creating Clients...');
  const clientData = [
    {
      name: 'Acme Corporation',
      industry: 'Technology',
      status: 'active',
      companySize: 'Enterprise',
      contactName: 'John Smith',
      contactEmail: 'john.smith@acme.com',
      contactPhone: '+1-555-0100',
      address: '123 Tech Street, Silicon Valley, CA 94025',
      website: 'https://acme.com',
      notes: 'Primary technology client with 24/7 SOC requirements'
    },
    {
      name: 'Global Finance Inc',
      industry: 'Finance',
      status: 'active',
      companySize: 'Large',
      contactName: 'Sarah Johnson',
      contactEmail: 'sarah.j@globalfinance.com',
      contactPhone: '+1-555-0200',
      address: '456 Wall Street, New York, NY 10005',
      website: 'https://globalfinance.com',
      notes: 'Financial services client requiring compliance monitoring'
    },
    {
      name: 'Healthcare Solutions Ltd',
      industry: 'Healthcare',
      status: 'active',
      companySize: 'Medium',
      contactName: 'Dr. Michael Chen',
      contactEmail: 'mchen@healthsolutions.com',
      contactPhone: '+1-555-0300',
      address: '789 Medical Plaza, Boston, MA 02108',
      website: 'https://healthsolutions.com',
      notes: 'Healthcare provider with HIPAA compliance requirements'
    }
  ];

  for (const client of clientData) {
    const result = await makeRequest('POST', '/api/clients', client);
    if (result.success) {
      createdData.clients.push(result.data);
      console.log(`✅ Created client: ${client.name} (ID: ${result.data.id})`);
    }
  }

  // 2. Create Services
  console.log('\n📁 Creating Services...');
  const serviceData = [
    {
      name: '24/7 SOC Monitoring',
      category: 'Security Operations',
      description: 'Round-the-clock security operations center monitoring and incident response',
      deliveryModel: 'Managed Service',
      basePrice: '15000.00',
      pricingUnit: 'monthly',
      isActive: true
    },
    {
      name: 'Vulnerability Assessment',
      category: 'Security Assessment',
      description: 'Quarterly vulnerability scanning and assessment with remediation guidance',
      deliveryModel: 'Project-Based',
      basePrice: '5000.00',
      pricingUnit: 'per_assessment',
      isActive: true
    },
    {
      name: 'Compliance Monitoring',
      category: 'Compliance',
      description: 'Continuous compliance monitoring for regulatory requirements',
      deliveryModel: 'Managed Service',
      basePrice: '8000.00',
      pricingUnit: 'monthly',
      isActive: true
    },
    {
      name: 'Incident Response',
      category: 'Security Operations',
      description: 'On-demand incident response and forensics services',
      deliveryModel: 'On-Demand',
      basePrice: '500.00',
      pricingUnit: 'hourly',
      isActive: true
    }
  ];

  for (const service of serviceData) {
    const result = await makeRequest('POST', '/api/services', service);
    if (result.success) {
      createdData.services.push(result.data);
      console.log(`✅ Created service: ${service.name} (ID: ${result.data.id})`);
    }
  }

  // 3. Create Contracts
  console.log('\n📁 Creating Contracts...');
  const today = new Date();
  const nextYear = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());
  
  for (let i = 0; i < createdData.clients.length; i++) {
    const contract = {
      clientId: createdData.clients[i].id,
      name: `${createdData.clients[i].name} - Annual Security Services Agreement`,
      startDate: today.toISOString().split('T')[0],
      endDate: nextYear.toISOString().split('T')[0],
      status: 'active',
      totalValue: '250000.00',
      autoRenewal: true,
      renewalTerms: '12 months auto-renewal with 90 days notice',
      notes: 'Comprehensive security services agreement'
    };
    
    const result = await makeRequest('POST', '/api/contracts', contract);
    if (result.success) {
      createdData.contracts.push(result.data);
      console.log(`✅ Created contract for ${createdData.clients[i].name} (ID: ${result.data.id})`);
    }
  }

  // 4. Create Service Scopes
  console.log('\n📁 Creating Service Scopes...');
  for (let i = 0; i < createdData.contracts.length; i++) {
    const contract = createdData.contracts[i];
    const client = createdData.clients[i];
    
    // Add multiple services to each contract
    for (let j = 0; j < Math.min(2, createdData.services.length); j++) {
      const service = createdData.services[j];
      const scope = {
        serviceId: service.id,
        description: `${service.name} implementation for ${client.name}`,
        startDate: contract.startDate,
        endDate: contract.endDate,
        status: 'active',
        deliverables: `Monthly security reports|Incident response SLA|24/7 monitoring dashboard access`,
        timeline: '12 months continuous service',
        notes: `Customized ${service.name} for ${client.name} requirements`
      };
      
      const result = await makeRequest('POST', `/api/contracts/${contract.id}/service-scopes`, scope);
      if (result.success) {
        createdData.serviceScopes.push(result.data);
        console.log(`✅ Created service scope: ${service.name} for ${client.name}`);
      }
    }
  }

  // 5. Create License Pools
  console.log('\n📁 Creating License Pools...');
  const licensePoolData = [
    {
      name: 'Microsoft E5 Security Pool',
      vendor: 'Microsoft',
      productName: 'Microsoft 365 E5 Security',
      licenseType: 'Subscription',
      totalLicenses: 500,
      availableLicenses: 350,
      costPerLicense: '57.00',
      renewalDate: nextYear.toISOString().split('T')[0],
      notes: 'Enterprise security license pool for all clients'
    },
    {
      name: 'CrowdStrike Falcon Pool',
      vendor: 'CrowdStrike',
      productName: 'Falcon Complete',
      licenseType: 'Subscription',
      totalLicenses: 1000,
      availableLicenses: 750,
      costPerLicense: '15.00',
      renewalDate: nextYear.toISOString().split('T')[0],
      notes: 'EDR licenses for endpoint protection'
    },
    {
      name: 'Splunk Enterprise Pool',
      vendor: 'Splunk',
      productName: 'Splunk Enterprise Security',
      licenseType: 'Volume',
      totalLicenses: 100,
      availableLicenses: 60,
      costPerLicense: '150.00',
      renewalDate: nextYear.toISOString().split('T')[0],
      notes: 'SIEM licenses based on data volume'
    }
  ];

  for (const pool of licensePoolData) {
    const result = await makeRequest('POST', '/api/license-pools', pool);
    if (result.success) {
      createdData.licensePools.push(result.data);
      console.log(`✅ Created license pool: ${pool.name} (ID: ${result.data.id})`);
    }
  }

  // 6. Create Hardware Assets
  console.log('\n📁 Creating Hardware Assets...');
  const hardwareData = [
    {
      name: 'Dell PowerEdge R750 - SOC-01',
      category: 'Server',
      manufacturer: 'Dell',
      model: 'PowerEdge R750',
      serialNumber: 'DLL-R750-001',
      purchaseDate: '2024-01-15',
      purchaseCost: '15000.00',
      warrantyExpiry: '2027-01-15',
      status: 'active',
      location: 'Primary Data Center - Rack A1',
      notes: 'Primary SOC monitoring server'
    },
    {
      name: 'Cisco ASA 5555-X',
      category: 'Firewall',
      manufacturer: 'Cisco',
      model: 'ASA 5555-X',
      serialNumber: 'CSC-ASA-001',
      purchaseDate: '2024-02-01',
      purchaseCost: '8000.00',
      warrantyExpiry: '2027-02-01',
      status: 'active',
      location: 'Primary Data Center - Network Rack',
      notes: 'Main perimeter firewall'
    },
    {
      name: 'NetApp FAS8200',
      category: 'Storage',
      manufacturer: 'NetApp',
      model: 'FAS8200',
      serialNumber: 'NTP-FAS-001',
      purchaseDate: '2024-03-01',
      purchaseCost: '50000.00',
      warrantyExpiry: '2027-03-01',
      status: 'active',
      location: 'Primary Data Center - Storage Array',
      notes: 'Primary storage for security logs and data'
    }
  ];

  for (const hardware of hardwareData) {
    const result = await makeRequest('POST', '/api/hardware-assets', hardware);
    if (result.success) {
      createdData.hardwareAssets.push(result.data);
      console.log(`✅ Created hardware asset: ${hardware.name} (ID: ${result.data.id})`);
    }
  }

  // 7. Create Service Authorization Forms (SAFs)
  console.log('\n📁 Creating Service Authorization Forms...');
  for (let i = 0; i < createdData.contracts.length && i < createdData.serviceScopes.length; i++) {
    const contract = createdData.contracts[i];
    const client = createdData.clients[i];
    const scope = createdData.serviceScopes[i];
    
    const saf = {
      clientId: client.id,
      contractId: contract.id,
      serviceScopeId: scope.id,
      safNumber: `SAF-2024-${String(i + 1).padStart(3, '0')}`,
      title: `${client.name} - Security Services Authorization`,
      description: `Authorization for security services delivery to ${client.name}`,
      startDate: contract.startDate,
      endDate: contract.endDate,
      status: 'approved',
      value: '50000.00',
      notes: 'Approved by client management'
    };
    
    const result = await makeRequest('POST', '/api/service-authorization-forms', saf);
    if (result.success) {
      createdData.safs.push(result.data);
      console.log(`✅ Created SAF: ${saf.safNumber} for ${client.name}`);
    }
  }

  // 8. Create Certificates of Compliance (COCs)
  console.log('\n📁 Creating Certificates of Compliance...');
  const complianceTypes = ['SOC2', 'ISO27001', 'HIPAA', 'PCI-DSS'];
  
  for (let i = 0; i < createdData.clients.length; i++) {
    const client = createdData.clients[i];
    const contract = createdData.contracts[i];
    
    const coc = {
      clientId: client.id,
      contractId: contract.id,
      cocNumber: `COC-2024-${String(i + 1).padStart(3, '0')}`,
      title: `${complianceTypes[i % complianceTypes.length]} Compliance Certificate`,
      description: `${complianceTypes[i % complianceTypes.length]} compliance certification for ${client.name}`,
      complianceType: complianceTypes[i % complianceTypes.length],
      issueDate: today.toISOString().split('T')[0],
      expiryDate: nextYear.toISOString().split('T')[0],
      status: 'active',
      auditDate: today.toISOString().split('T')[0],
      nextAuditDate: new Date(today.getFullYear(), today.getMonth() + 6, today.getDate()).toISOString().split('T')[0],
      notes: 'Annual compliance audit completed successfully'
    };
    
    const result = await makeRequest('POST', '/api/certificates-of-compliance', coc);
    if (result.success) {
      createdData.cocs.push(result.data);
      console.log(`✅ Created COC: ${coc.cocNumber} for ${client.name}`);
    }
  }

  // 9. Create Financial Transactions
  console.log('\n📁 Creating Financial Transactions...');
  for (let i = 0; i < createdData.clients.length; i++) {
    const client = createdData.clients[i];
    
    // Create invoice
    const invoice = {
      type: 'invoice',
      clientId: client.id,
      amount: '25000.00',
      currency: 'USD',
      description: `Monthly security services invoice - ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
      transactionDate: today.toISOString().split('T')[0],
      status: 'pending'
    };
    
    const invoiceResult = await makeRequest('POST', '/api/financial-transactions', invoice);
    if (invoiceResult.success) {
      createdData.transactions.push(invoiceResult.data);
      console.log(`✅ Created invoice for ${client.name}`);
    }
    
    // Create payment
    const payment = {
      type: 'payment',
      clientId: client.id,
      amount: '25000.00',
      currency: 'USD',
      description: `Payment received - Invoice payment`,
      transactionDate: today.toISOString().split('T')[0],
      status: 'completed'
    };
    
    const paymentResult = await makeRequest('POST', '/api/financial-transactions', payment);
    if (paymentResult.success) {
      createdData.transactions.push(paymentResult.data);
      console.log(`✅ Created payment for ${client.name}`);
    }
  }

  // 10. Create External Systems
  console.log('\n📁 Creating External Systems...');
  const externalSystemData = [
    {
      name: 'Jira Cloud',
      baseUrl: 'https://mssp-demo.atlassian.net',
      authType: 'basic',
      authConfig: {
        username: 'demo@mssp.com',
        password: process.env.DEMO_API_TOKEN || ''
      },
      apiEndpoints: {
        issues: '/rest/api/3/search',
        projects: '/rest/api/3/project'
      },
      metadata: {
        jqlQuery: 'project = MSSP'
      }
    },
    {
      name: 'ServiceNow',
      baseUrl: 'https://mssp-demo.service-now.com',
      authType: 'bearer',
      authConfig: {
        token: 'demo-bearer-token'
      },
      apiEndpoints: {
        incidents: '/api/now/table/incident',
        changes: '/api/now/table/change_request'
      }
    }
  ];

  for (const system of externalSystemData) {
    const result = await makeRequest('POST', '/api/external-systems', system);
    if (result.success) {
      createdData.externalSystems.push(result.data);
      console.log(`✅ Created external system: ${system.name} (ID: ${result.data.id})`);
    }
  }

  // 11. Create Dashboards
  console.log('\n📁 Creating Dashboards...');
  const dashboardData = [
    {
      name: 'Executive Security Dashboard',
      description: 'High-level security metrics for executive review',
      isDefault: false,
      layout: {
        widgets: []
      }
    },
    {
      name: 'SOC Operations Dashboard',
      description: 'Real-time security operations monitoring',
      isDefault: false,
      layout: {
        widgets: []
      }
    }
  ];

  for (const dashboard of dashboardData) {
    const result = await makeRequest('POST', '/api/dashboards', dashboard);
    if (result.success) {
      createdData.dashboards.push(result.data);
      console.log(`✅ Created dashboard: ${dashboard.name} (ID: ${result.data.id})`);
    }
  }

  // Print summary
  console.log('\n' + '═'.repeat(70));
  console.log('📊 DATA POPULATION SUMMARY');
  console.log('═'.repeat(70));
  console.log(`✅ Clients Created: ${createdData.clients.length}`);
  console.log(`✅ Services Created: ${createdData.services.length}`);
  console.log(`✅ Contracts Created: ${createdData.contracts.length}`);
  console.log(`✅ Service Scopes Created: ${createdData.serviceScopes.length}`);
  console.log(`✅ License Pools Created: ${createdData.licensePools.length}`);
  console.log(`✅ Hardware Assets Created: ${createdData.hardwareAssets.length}`);
  console.log(`✅ SAFs Created: ${createdData.safs.length}`);
  console.log(`✅ COCs Created: ${createdData.cocs.length}`);
  console.log(`✅ Financial Transactions Created: ${createdData.transactions.length}`);
  console.log(`✅ External Systems Created: ${createdData.externalSystems.length}`);
  console.log(`✅ Dashboards Created: ${createdData.dashboards.length}`);
  
  // Save created data for reference
  fs.writeFileSync('created-test-data.json', JSON.stringify(createdData, null, 2));
  console.log('\n📄 Created data saved to: created-test-data.json');
  
  console.log('\n✅ Data population completed successfully!');
}

// Run the population
populateAllData().catch(console.error); 