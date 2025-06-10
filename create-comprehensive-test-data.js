import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api';
let authCookie = '';

// Login and get authentication
async function login() {
  try {
    const response = await axios.post(`${BASE_URL}/login`, {
      email: 'admin@mssp.local',
      password: 'admin123'
    });
    
    // Extract cookie from response headers
    const cookies = response.headers['set-cookie'];
    if (cookies && cookies.length > 0) {
      authCookie = cookies[0].split(';')[0];
      console.log('✅ Authentication successful');
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ Login failed:', error.message);
    return false;
  }
}

// Helper function to make authenticated requests
async function makeRequest(method, endpoint, data = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Cookie': authCookie,
        'Content-Type': 'application/json'
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`❌ ${method} ${endpoint} failed:`, error.response?.data?.message || error.message);
    throw error;
  }
}

// Create 15 services with different types and tiers
async function createServices() {
  console.log('\n🔧 Creating 15 Services...');
  
  const services = [
    // MDR Services (3 tiers)
    {
      name: 'MDR Enterprise',
      category: 'Security Operations',
      deliveryModel: 'Managed',
      basePrice: '15000.00',
      description: 'Enterprise-grade Managed Detection & Response with 24/7 SOC',
      scopeDefinitionTemplate: {
        eps: { type: 'number', label: 'Events Per Second', default: 5000 },
        edr_endpoints: { type: 'number', label: 'EDR Endpoints', default: 500 },
        ndr_data: { type: 'text', label: 'NDR Data Volume', default: '100 MB' }
      }
    },
    {
      name: 'MDR Professional',
      category: 'Security Operations',
      deliveryModel: 'Managed',
      basePrice: '8000.00',
      description: 'Professional MDR service for mid-size organizations',
      scopeDefinitionTemplate: {
        eps: { type: 'number', label: 'Events Per Second', default: 2500 },
        edr_endpoints: { type: 'number', label: 'EDR Endpoints', default: 250 },
        ndr_data: { type: 'text', label: 'NDR Data Volume', default: '50 MB' }
      }
    },
    {
      name: 'MDR Standard',
      category: 'Security Operations',
      deliveryModel: 'Managed',
      basePrice: '4000.00',
      description: 'Standard MDR service for small to medium businesses',
      scopeDefinitionTemplate: {
        eps: { type: 'number', label: 'Events Per Second', default: 1000 },
        edr_endpoints: { type: 'number', label: 'EDR Endpoints', default: 100 },
        ndr_data: { type: 'text', label: 'NDR Data Volume', default: '25 MB' }
      }
    },
    
    // Managed EDR Services (3 tiers)
    {
      name: 'Managed EDR Enterprise',
      category: 'Endpoint Security',
      deliveryModel: 'Managed',
      basePrice: '12000.00',
      description: 'Enterprise endpoint detection and response management',
      scopeDefinitionTemplate: {
        endpoints: { type: 'number', label: 'Number of Endpoints', default: 4000 }
      }
    },
    {
      name: 'Managed EDR Professional',
      category: 'Endpoint Security',
      deliveryModel: 'Managed',
      basePrice: '6000.00',
      description: 'Professional EDR management for growing businesses',
      scopeDefinitionTemplate: {
        endpoints: { type: 'number', label: 'Number of Endpoints', default: 500 }
      }
    },
    {
      name: 'Managed EDR Standard',
      category: 'Endpoint Security',
      deliveryModel: 'Managed',
      basePrice: '2500.00',
      description: 'Standard EDR management for small businesses',
      scopeDefinitionTemplate: {
        endpoints: { type: 'number', label: 'Number of Endpoints', default: 100 }
      }
    },
    
    // Managed SIEM Services (3 tiers)
    {
      name: 'Managed SIEM Enterprise',
      category: 'Security Information Management',
      deliveryModel: 'Managed',
      basePrice: '20000.00',
      description: 'Enterprise SIEM management with advanced analytics',
      scopeDefinitionTemplate: {
        eps: { type: 'number', label: 'Events Per Second', default: 10000 }
      }
    },
    {
      name: 'Managed SIEM Professional',
      category: 'Security Information Management',
      deliveryModel: 'Managed',
      basePrice: '10000.00',
      description: 'Professional SIEM management for medium enterprises',
      scopeDefinitionTemplate: {
        eps: { type: 'number', label: 'Events Per Second', default: 5000 }
      }
    },
    {
      name: 'Managed SIEM Standard',
      category: 'Security Information Management',
      deliveryModel: 'Managed',
      basePrice: '5000.00',
      description: 'Standard SIEM management for growing organizations',
      scopeDefinitionTemplate: {
        eps: { type: 'number', label: 'Events Per Second', default: 400 }
      }
    },
    
    // Managed Firewall Services (3 tiers)
    {
      name: 'Managed Firewall Enterprise',
      category: 'Network Security',
      deliveryModel: 'Managed',
      basePrice: '8000.00',
      description: 'Enterprise firewall management with complex rule sets',
      scopeDefinitionTemplate: {
        firewalls: { type: 'number', label: 'Number of Firewalls', default: 10 },
        policies: { type: 'number', label: 'Number of Policies', default: 1000 }
      }
    },
    {
      name: 'Managed Firewall Professional',
      category: 'Network Security',
      deliveryModel: 'Managed',
      basePrice: '4000.00',
      description: 'Professional firewall management for medium businesses',
      scopeDefinitionTemplate: {
        firewalls: { type: 'number', label: 'Number of Firewalls', default: 5 },
        policies: { type: 'number', label: 'Number of Policies', default: 500 }
      }
    },
    {
      name: 'Managed Firewall Standard',
      category: 'Network Security',
      deliveryModel: 'Managed',
      basePrice: '2000.00',
      description: 'Standard firewall management for small businesses',
      scopeDefinitionTemplate: {
        firewalls: { type: 'number', label: 'Number of Firewalls', default: 2 },
        policies: { type: 'number', label: 'Number of Policies', default: 200 }
      }
    },
    
    // Managed PAM Services (3 tiers)
    {
      name: 'Managed PAM Enterprise',
      category: 'Identity & Access Management',
      deliveryModel: 'Managed',
      basePrice: '15000.00',
      description: 'Enterprise privileged access management',
      scopeDefinitionTemplate: {
        users: { type: 'number', label: 'Number of PAM Users', default: 1000 }
      }
    },
    {
      name: 'Managed PAM Professional',
      category: 'Identity & Access Management',
      deliveryModel: 'Managed',
      basePrice: '7500.00',
      description: 'Professional PAM for medium enterprises',
      scopeDefinitionTemplate: {
        users: { type: 'number', label: 'Number of PAM Users', default: 500 }
      }
    },
    {
      name: 'Managed PAM Standard',
      category: 'Identity & Access Management',
      deliveryModel: 'Managed',
      basePrice: '3000.00',
      description: 'Standard PAM for growing organizations',
      scopeDefinitionTemplate: {
        users: { type: 'number', label: 'Number of PAM Users', default: 100 }
      }
    }
  ];
  
  const createdServices = [];
  for (const service of services) {
    try {
      const result = await makeRequest('POST', '/services', service);
      createdServices.push(result);
      console.log(`✅ Created service: ${service.name}`);
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
    } catch (error) {
      console.error(`❌ Failed to create service: ${service.name}`);
    }
  }
  
  return createdServices;
}

// Create 5 contracts with mixed services and different scopes
async function createContractsWithScopes(services, clients) {
  console.log('\n📋 Creating 5 Contracts with Service Scopes...');
  
  const contracts = [
    {
      clientId: clients[0].id,
      name: 'Enterprise Security Package - TechCorp',
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      totalValue: '50000.00',
      status: 'active',
      services: [
        {
          serviceId: services.find(s => s.name === 'MDR Enterprise').id,
          scope: {
            eps: 7500,
            edr_endpoints: 2000,
            ndr_data: '1 GB'
          }
        },
        {
          serviceId: services.find(s => s.name === 'Managed EDR Professional').id,
          scope: {
            endpoints: 3000
          }
        },
        {
          serviceId: services.find(s => s.name === 'Managed Firewall Professional').id,
          scope: {
            firewalls: 8,
            policies: 750
          }
        }
      ]
    },
    {
      clientId: clients[1].id,
      name: 'Comprehensive Security Suite - FinanceFirst',
      startDate: '2025-02-01',
      endDate: '2026-01-31',
      totalValue: '75000.00',
      status: 'active',
      services: [
        {
          serviceId: services.find(s => s.name === 'MDR Professional').id,
          scope: {
            eps: 4000,
            edr_endpoints: 800,
            ndr_data: '200 MB'
          }
        },
        {
          serviceId: services.find(s => s.name === 'Managed SIEM Enterprise').id,
          scope: {
            eps: 12000
          }
        },
        {
          serviceId: services.find(s => s.name === 'Managed PAM Professional').id,
          scope: {
            users: 750
          }
        },
        {
          serviceId: services.find(s => s.name === 'Managed Firewall Enterprise').id,
          scope: {
            firewalls: 15,
            policies: 1500
          }
        }
      ]
    },
    {
      clientId: clients[2].id,
      name: 'SMB Security Foundation - RetailChain',
      startDate: '2025-03-01',
      endDate: '2026-02-28',
      totalValue: '25000.00',
      status: 'active',
      services: [
        {
          serviceId: services.find(s => s.name === 'MDR Standard').id,
          scope: {
            eps: 1500,
            edr_endpoints: 200,
            ndr_data: '50 MB'
          }
        },
        {
          serviceId: services.find(s => s.name === 'Managed EDR Standard').id,
          scope: {
            endpoints: 250
          }
        },
        {
          serviceId: services.find(s => s.name === 'Managed SIEM Standard').id,
          scope: {
            eps: 800
          }
        }
      ]
    },
    {
      clientId: clients[3].id,
      name: 'Healthcare Security Program - MedCenter',
      startDate: '2025-01-15',
      endDate: '2025-12-31',
      totalValue: '60000.00',
      status: 'active',
      services: [
        {
          serviceId: services.find(s => s.name === 'MDR Enterprise').id,
          scope: {
            eps: 6000,
            edr_endpoints: 1200,
            ndr_data: '500 MB'
          }
        },
        {
          serviceId: services.find(s => s.name === 'Managed PAM Enterprise').id,
          scope: {
            users: 1500
          }
        },
        {
          serviceId: services.find(s => s.name === 'Managed EDR Enterprise').id,
          scope: {
            endpoints: 5000
          }
        },
        {
          serviceId: services.find(s => s.name === 'Managed Firewall Professional').id,
          scope: {
            firewalls: 6,
            policies: 600
          }
        }
      ]
    },
    {
      clientId: clients[4].id,
      name: 'Manufacturing Security Suite - IndustrialCorp',
      startDate: '2025-04-01',
      endDate: '2026-03-31',
      totalValue: '40000.00',
      status: 'active',
      services: [
        {
          serviceId: services.find(s => s.name === 'MDR Professional').id,
          scope: {
            eps: 3500,
            edr_endpoints: 600,
            ndr_data: '150 MB'
          }
        },
        {
          serviceId: services.find(s => s.name === 'Managed SIEM Professional').id,
          scope: {
            eps: 7500
          }
        },
        {
          serviceId: services.find(s => s.name === 'Managed Firewall Enterprise').id,
          scope: {
            firewalls: 12,
            policies: 1200
          }
        },
        {
          serviceId: services.find(s => s.name === 'Managed PAM Standard').id,
          scope: {
            users: 200
          }
        }
      ]
    }
  ];
  
  const createdContracts = [];
  
  for (const contractData of contracts) {
    try {
      // Create the contract first
      const { services: contractServices, ...contractInfo } = contractData;
      const contract = await makeRequest('POST', '/contracts', contractInfo);
      createdContracts.push(contract);
      console.log(`✅ Created contract: ${contract.name}`);
      
      // Create service scopes for each service in the contract
      for (const serviceData of contractServices) {
        try {
          const serviceScope = {
            contractId: contract.id,
            serviceId: serviceData.serviceId,
            scopeDefinition: serviceData.scope
          };
          
          await makeRequest('POST', `/contracts/${contract.id}/service-scopes`, serviceScope);
          const serviceName = services.find(s => s.id === serviceData.serviceId)?.name || 'Unknown';
          console.log(`  ✅ Added service scope: ${serviceName}`);
        } catch (error) {
          console.error(`  ❌ Failed to create service scope for contract ${contract.id}`);
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 200)); // Small delay
    } catch (error) {
      console.error(`❌ Failed to create contract: ${contractData.name}`);
    }
  }
  
  return createdContracts;
}

// Get existing clients
async function getClients() {
  try {
    const clients = await makeRequest('GET', '/clients');
    console.log(`📋 Found ${clients.length} existing clients`);
    return clients;
  } catch (error) {
    console.error('❌ Failed to get clients');
    return [];
  }
}

// Main execution function
async function main() {
  console.log('🚀 Starting Comprehensive Test Data Creation...');
  
  // Login first
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.error('❌ Cannot proceed without authentication');
    return;
  }
  
  try {
    // Get existing clients
    const clients = await getClients();
    if (clients.length < 5) {
      console.error('❌ Need at least 5 clients to create contracts. Please create more clients first.');
      return;
    }
    
    // Create services
    const services = await createServices();
    console.log(`✅ Created ${services.length} services`);
    
    // Create contracts with service scopes
    const contracts = await createContractsWithScopes(services, clients);
    console.log(`✅ Created ${contracts.length} contracts with service scopes`);
    
    // Summary
    console.log('\n📊 COMPREHENSIVE TEST DATA SUMMARY:');
    console.log(`✅ Services Created: ${services.length}/15`);
    console.log(`✅ Contracts Created: ${contracts.length}/5`);
    console.log(`✅ Service Scopes: Multiple scopes per contract`);
    console.log('\n🎉 Comprehensive test data creation completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during test data creation:', error.message);
  }
}

// Run the script
main().catch(console.error); 