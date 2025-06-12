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

// Create service scopes with the correct API structure
async function createServiceScopesForContract(contractId, contractName, services, scopeData) {
  console.log(`\n🔧 Creating service scopes for: ${contractName}`);
  
  for (const scopeInfo of scopeData) {
    try {
      const service = services.find(s => s.name === scopeInfo.serviceName);
      if (!service) {
        console.error(`❌ Service not found: ${scopeInfo.serviceName}`);
        continue;
      }

      // Create scope definition description from the scope variables
      let description = `Service Scope: ${service.name}\n`;
      description += `Scope Variables:\n`;
      
      for (const [key, value] of Object.entries(scopeInfo.scope)) {
        description += `- ${key}: ${value}\n`;
      }

      // Format deliverables as an array of scope items
      const deliverables = Object.entries(scopeInfo.scope).map(([key, value]) => ({
        item: key,
        value: value.toString(),
        description: `${key}: ${value}`
      }));

      const serviceScopeData = {
        serviceId: service.id,
        description: description.trim(),
        deliverables: deliverables,
        status: 'active'
      };

      await makeRequest('POST', `/contracts/${contractId}/service-scopes`, serviceScopeData);
      console.log(`  ✅ Added service scope: ${service.name}`);
      
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
    } catch (error) {
      console.error(`  ❌ Failed to create service scope for ${scopeInfo.serviceName}`);
    }
  }
}

// Create 5 contracts with detailed service scopes
async function createContractsWithDetailedScopes(services, clients) {
  console.log('\n📋 Creating 5 Contracts with Detailed Service Scopes...');
  
  const contractsData = [
    {
      contractInfo: {
        clientId: clients[0].id,
        name: 'Enterprise Security Package - TechCorp',
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        totalValue: '50000.00',
        status: 'active'
      },
      services: [
        {
          serviceName: 'MDR Enterprise',
          scope: {
            'Events Per Second (EPS)': 7500,
            'EDR Endpoints': 2000,
            'NDR Data Volume': '1 GB'
          }
        },
        {
          serviceName: 'Managed EDR Professional',
          scope: {
            'Number of Endpoints': 3000
          }
        },
        {
          serviceName: 'Managed Firewall Professional',
          scope: {
            'Number of Firewalls': 8,
            'Number of Policies': 750
          }
        }
      ]
    },
    {
      contractInfo: {
        clientId: clients[1].id,
        name: 'Comprehensive Security Suite - FinanceFirst',
        startDate: '2025-02-01',
        endDate: '2026-01-31',
        totalValue: '75000.00',
        status: 'active'
      },
      services: [
        {
          serviceName: 'MDR Professional',
          scope: {
            'Events Per Second (EPS)': 4000,
            'EDR Endpoints': 800,
            'NDR Data Volume': '200 MB'
          }
        },
        {
          serviceName: 'Managed SIEM Enterprise',
          scope: {
            'Events Per Second (EPS)': 12000
          }
        },
        {
          serviceName: 'Managed PAM Professional',
          scope: {
            'Number of PAM Users': 750
          }
        },
        {
          serviceName: 'Managed Firewall Enterprise',
          scope: {
            'Number of Firewalls': 15,
            'Number of Policies': 1500
          }
        }
      ]
    },
    {
      contractInfo: {
        clientId: clients[2].id,
        name: 'SMB Security Foundation - RetailChain',
        startDate: '2025-03-01',
        endDate: '2026-02-28',
        totalValue: '25000.00',
        status: 'active'
      },
      services: [
        {
          serviceName: 'MDR Standard',
          scope: {
            'Events Per Second (EPS)': 1500,
            'EDR Endpoints': 200,
            'NDR Data Volume': '50 MB'
          }
        },
        {
          serviceName: 'Managed EDR Standard',
          scope: {
            'Number of Endpoints': 250
          }
        },
        {
          serviceName: 'Managed SIEM Standard',
          scope: {
            'Events Per Second (EPS)': 800
          }
        }
      ]
    },
    {
      contractInfo: {
        clientId: clients[3].id,
        name: 'Healthcare Security Program - MedCenter',
        startDate: '2025-01-15',
        endDate: '2025-12-31',
        totalValue: '60000.00',
        status: 'active'
      },
      services: [
        {
          serviceName: 'MDR Enterprise',
          scope: {
            'Events Per Second (EPS)': 6000,
            'EDR Endpoints': 1200,
            'NDR Data Volume': '500 MB'
          }
        },
        {
          serviceName: 'Managed PAM Enterprise',
          scope: {
            'Number of PAM Users': 1500
          }
        },
        {
          serviceName: 'Managed EDR Enterprise',
          scope: {
            'Number of Endpoints': 5000
          }
        },
        {
          serviceName: 'Managed Firewall Professional',
          scope: {
            'Number of Firewalls': 6,
            'Number of Policies': 600
          }
        }
      ]
    },
    {
      contractInfo: {
        clientId: clients[4].id,
        name: 'Manufacturing Security Suite - IndustrialCorp',
        startDate: '2025-04-01',
        endDate: '2026-03-31',
        totalValue: '40000.00',
        status: 'active'
      },
      services: [
        {
          serviceName: 'MDR Professional',
          scope: {
            'Events Per Second (EPS)': 3500,
            'EDR Endpoints': 600,
            'NDR Data Volume': '150 MB'
          }
        },
        {
          serviceName: 'Managed SIEM Professional',
          scope: {
            'Events Per Second (EPS)': 7500
          }
        },
        {
          serviceName: 'Managed Firewall Enterprise',
          scope: {
            'Number of Firewalls': 12,
            'Number of Policies': 1200
          }
        },
        {
          serviceName: 'Managed PAM Standard',
          scope: {
            'Number of PAM Users': 200
          }
        }
      ]
    }
  ];
  
  const createdContracts = [];
  
  for (const contractData of contractsData) {
    try {
      // Create the contract first
      const contract = await makeRequest('POST', '/contracts', contractData.contractInfo);
      createdContracts.push(contract);
      console.log(`✅ Created contract: ${contract.name}`);
      
      // Create detailed service scopes for this contract
      await createServiceScopesForContract(
        contract.id,
        contract.name,
        services,
        contractData.services
      );
      
      await new Promise(resolve => setTimeout(resolve, 300)); // Small delay
    } catch (error) {
      console.error(`❌ Failed to create contract: ${contractData.contractInfo.name}`);
    }
  }
  
  return createdContracts;
}

// Get existing services and contracts
async function getExistingData() {
  try {
    const [services, contracts, clients] = await Promise.all([
      makeRequest('GET', '/services'),
      makeRequest('GET', '/contracts'), 
      makeRequest('GET', '/clients')
    ]);
    
    console.log(`📋 Found ${services.length} services, ${contracts.length} contracts, ${clients.length} clients`);
    return { services, contracts, clients };
  } catch (error) {
    console.error('❌ Failed to get existing data');
    return { services: [], contracts: [], clients: [] };
  }
}

// Main execution function
async function main() {
  console.log('🚀 Starting Service Scope Creation with Detailed Variables...');
  
  // Login first
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.error('❌ Cannot proceed without authentication');
    return;
  }
  
  try {
    // Get existing data
    const { services, contracts, clients } = await getExistingData();
    
    if (clients.length < 5) {
      console.error('❌ Need at least 5 clients to create contracts');
      return;
    }
    
    // Filter to get our newly created services
    const mdrServices = services.filter(s => s.name.includes('MDR'));
    const edrServices = services.filter(s => s.name.includes('Managed EDR'));
    const siemServices = services.filter(s => s.name.includes('Managed SIEM'));
    const firewallServices = services.filter(s => s.name.includes('Managed Firewall'));
    const pamServices = services.filter(s => s.name.includes('Managed PAM'));
    
    console.log(`🔧 Found Service Categories:`);
    console.log(`  - MDR Services: ${mdrServices.length}`);
    console.log(`  - EDR Services: ${edrServices.length}`);
    console.log(`  - SIEM Services: ${siemServices.length}`);
    console.log(`  - Firewall Services: ${firewallServices.length}`);
    console.log(`  - PAM Services: ${pamServices.length}`);
    
    // Create contracts with detailed scopes (skip if contracts already exist)
    if (contracts.filter(c => c.name.includes('Enterprise Security Package')).length === 0) {
      const newContracts = await createContractsWithDetailedScopes(services, clients);
      console.log(`✅ Created ${newContracts.length} new contracts with detailed service scopes`);
    } else {
      console.log('ℹ️ Contracts already exist. Adding detailed scopes to existing contracts...');
      
      // Find existing contracts and add/update their service scopes
      const existingContract = contracts.find(c => c.name.includes('Enterprise Security Package'));
      if (existingContract) {
        await createServiceScopesForContract(
          existingContract.id,
          existingContract.name,
          services,
          [
            {
              serviceName: 'MDR Enterprise',
              scope: {
                'Events Per Second (EPS)': 7500,
                'EDR Endpoints': 2000,
                'NDR Data Volume': '1 GB'
              }
            }
          ]
        );
      }
    }
    
    // Summary
    console.log('\n📊 DETAILED SERVICE SCOPE SUMMARY:');
    console.log(`✅ Total Services Available: ${services.length}`);
    console.log(`✅ MDR Services (3 tiers): Enterprise, Professional, Standard`);
    console.log(`✅ Managed EDR Services (3 tiers): Enterprise, Professional, Standard`);
    console.log(`✅ Managed SIEM Services (3 tiers): Enterprise, Professional, Standard`);
    console.log(`✅ Managed Firewall Services (3 tiers): Enterprise, Professional, Standard`);
    console.log(`✅ Managed PAM Services (3 tiers): Enterprise, Professional, Standard`);
    console.log(`✅ Contracts with Detailed Scope Variables: Ready for testing`);
    console.log('\n🎉 Comprehensive service scope creation completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during service scope creation:', error.message);
  }
}

// Run the script
main().catch(console.error); 