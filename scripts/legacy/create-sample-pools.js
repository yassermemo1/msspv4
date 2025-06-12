import { db } from './server/db.js';
import { licensePools, hardwareAssets } from './shared/schema.js';

async function createSamplePools() {
  try {
    console.log('🚀 Creating sample license pools and hardware assets...');

    // Create SIEM License Pools
    const siemPools = await db.insert(licensePools).values([
      {
        name: 'Splunk Enterprise Pool',
        vendor: 'Splunk',
        productName: 'Splunk Enterprise Security',
        licenseType: 'per_gb_per_day',
        totalLicenses: 100000,
        availableLicenses: 100000,
        orderedLicenses: 100000,
        costPerLicense: '15.00',
        renewalDate: new Date('2025-12-31'),
        notes: 'Primary SIEM pool for log ingestion and analysis',
        isActive: true
      },
      {
        name: 'QRadar SIEM Pool',
        vendor: 'IBM',
        productName: 'IBM QRadar SIEM',
        licenseType: 'eps_based',
        totalLicenses: 50000,
        availableLicenses: 50000,
        orderedLicenses: 50000,
        costPerLicense: '12.50',
        renewalDate: new Date('2025-06-30'),
        notes: 'Secondary SIEM pool for high-volume clients',
        isActive: true
      },
      {
        name: 'Sentinel SIEM Pool',
        vendor: 'Microsoft',
        productName: 'Microsoft Sentinel',
        licenseType: 'per_gb_per_day',
        totalLicenses: 75000,
        availableLicenses: 75000,
        orderedLicenses: 75000,
        costPerLicense: '8.00',
        renewalDate: new Date('2025-09-30'),
        notes: 'Cloud-native SIEM solution',
        isActive: true
      }
    ]).returning();

    // Create EDR License Pools
    const edrPools = await db.insert(licensePools).values([
      {
        name: 'CrowdStrike Falcon Pool',
        vendor: 'CrowdStrike',
        productName: 'CrowdStrike Falcon Complete',
        licenseType: 'per_endpoint',
        totalLicenses: 10000,
        availableLicenses: 10000,
        orderedLicenses: 10000,
        costPerLicense: '45.00',
        renewalDate: new Date('2025-08-31'),
        notes: 'Premium EDR solution with complete protection',
        isActive: true
      },
      {
        name: 'SentinelOne EDR Pool',
        vendor: 'SentinelOne',
        productName: 'SentinelOne Singularity Complete',
        licenseType: 'per_endpoint',
        totalLicenses: 8000,
        availableLicenses: 8000,
        orderedLicenses: 8000,
        costPerLicense: '38.00',
        renewalDate: new Date('2025-11-30'),
        notes: 'AI-powered autonomous endpoint protection',
        isActive: true
      },
      {
        name: 'Carbon Black EDR Pool',
        vendor: 'VMware',
        productName: 'VMware Carbon Black Cloud',
        licenseType: 'per_endpoint',
        totalLicenses: 5000,
        availableLicenses: 5000,
        orderedLicenses: 5000,
        costPerLicense: '32.00',
        renewalDate: new Date('2025-07-31'),
        notes: 'Enterprise-grade cloud-native EDR',
        isActive: true
      }
    ]).returning();

    // Create NDR License Pools
    const ndrPools = await db.insert(licensePools).values([
      {
        name: 'Darktrace DETECT Pool',
        vendor: 'Darktrace',
        productName: 'Darktrace DETECT',
        licenseType: 'per_network_segment',
        totalLicenses: 500,
        availableLicenses: 500,
        orderedLicenses: 500,
        costPerLicense: '2500.00',
        renewalDate: new Date('2025-10-31'),
        notes: 'AI-powered network detection and response',
        isActive: true
      },
      {
        name: 'ExtraHop Reveal(x) Pool',
        vendor: 'ExtraHop',
        productName: 'ExtraHop Reveal(x)',
        licenseType: 'per_gbps',
        totalLicenses: 200,
        availableLicenses: 200,
        orderedLicenses: 200,
        costPerLicense: '5000.00',
        renewalDate: new Date('2025-12-15'),
        notes: 'Real-time network detection and investigation',
        isActive: true
      },
      {
        name: 'Vectra Cognito Pool',
        vendor: 'Vectra AI',
        productName: 'Vectra Cognito NDR',
        licenseType: 'per_monitored_host',
        totalLicenses: 1000,
        availableLicenses: 1000,
        orderedLicenses: 1000,
        costPerLicense: '180.00',
        renewalDate: new Date('2025-05-31'),
        notes: 'AI-driven threat detection for hybrid environments',
        isActive: true
      }
    ]).returning();

    // Create Hardware Assets
    const hardwareList = await db.insert(hardwareAssets).values([
      // Firewalls
      {
        name: 'Palo Alto PA-5250',
        category: 'Firewall',
        manufacturer: 'Palo Alto Networks',
        model: 'PA-5250',
        serialNumber: 'PA5250-001',
        purchaseDate: new Date('2024-01-15'),
        purchaseCost: '85000.00',
        warrantyExpiry: new Date('2027-01-15'),
        status: 'available',
        location: 'Data Center Rack A-12',
        notes: 'High-performance next-gen firewall for enterprise deployments'
      },
      {
        name: 'Palo Alto PA-3250',
        category: 'Firewall',
        manufacturer: 'Palo Alto Networks',
        model: 'PA-3250',
        serialNumber: 'PA3250-001',
        purchaseDate: new Date('2024-02-20'),
        purchaseCost: '45000.00',
        warrantyExpiry: new Date('2027-02-20'),
        status: 'available',
        location: 'Data Center Rack A-13',
        notes: 'Mid-range firewall for branch offices'
      },
      {
        name: 'Fortinet FortiGate 1800F',
        category: 'Firewall',
        manufacturer: 'Fortinet',
        model: 'FortiGate-1800F',
        serialNumber: 'FG1800F-001',
        purchaseDate: new Date('2024-03-10'),
        purchaseCost: '65000.00',
        warrantyExpiry: new Date('2027-03-10'),
        status: 'available',
        location: 'Data Center Rack B-05',
        notes: 'High-throughput security appliance'
      },
      
      // Servers
      {
        name: 'SIEM Processing Server 01',
        category: 'Server',
        manufacturer: 'Dell',
        model: 'PowerEdge R750',
        serialNumber: 'DELL-R750-001',
        purchaseDate: new Date('2024-01-20'),
        purchaseCost: '15000.00',
        warrantyExpiry: new Date('2027-01-20'),
        status: 'available',
        location: 'Data Center Rack C-08',
        notes: 'High-performance server for SIEM log processing'
      },
      {
        name: 'SIEM Processing Server 02',
        category: 'Server',
        manufacturer: 'Dell',
        model: 'PowerEdge R750',
        serialNumber: 'DELL-R750-002',
        purchaseDate: new Date('2024-01-25'),
        purchaseCost: '15000.00',
        warrantyExpiry: new Date('2027-01-25'),
        status: 'available',
        location: 'Data Center Rack C-09',
        notes: 'Backup SIEM processing server'
      },
      {
        name: 'Log Storage Server',
        category: 'Server',
        manufacturer: 'HPE',
        model: 'ProLiant DL380 Gen10',
        serialNumber: 'HPE-DL380-001',
        purchaseDate: new Date('2024-02-15'),
        purchaseCost: '18000.00',
        warrantyExpiry: new Date('2027-02-15'),
        status: 'available',
        location: 'Data Center Rack C-10',
        notes: 'High-capacity storage server for log retention'
      },
      
      // Network Appliances
      {
        name: 'Network Tap Appliance 01',
        category: 'Appliance',
        manufacturer: 'Gigamon',
        model: 'GigaVUE-HC2',
        serialNumber: 'GIGA-HC2-001',
        purchaseDate: new Date('2024-03-01'),
        purchaseCost: '25000.00',
        warrantyExpiry: new Date('2027-03-01'),
        status: 'available',
        location: 'Data Center Rack D-15',
        notes: 'Network visibility and monitoring appliance'
      },
      {
        name: 'Packet Capture Appliance',
        category: 'Appliance',
        manufacturer: 'NETSCOUT',
        model: 'nGeniusONE',
        serialNumber: 'NETSCOUT-NG1-001',
        purchaseDate: new Date('2024-03-15'),
        purchaseCost: '35000.00',
        warrantyExpiry: new Date('2027-03-15'),
        status: 'available',
        location: 'Data Center Rack D-16',
        notes: 'Advanced packet capture and analysis platform'
      },
      {
        name: 'Load Balancer F5',
        category: 'Appliance',
        manufacturer: 'F5 Networks',
        model: 'BIG-IP i4800',
        serialNumber: 'F5-i4800-001',
        purchaseDate: new Date('2024-04-01'),
        purchaseCost: '28000.00',
        warrantyExpiry: new Date('2027-04-01'),
        status: 'available',
        location: 'Data Center Rack E-20',
        notes: 'Application delivery controller and load balancer'
      }
    ]).returning();

    console.log('✅ Successfully created sample data:');
    console.log(`   📊 License Pools: ${siemPools.length + edrPools.length + ndrPools.length} pools`);
    console.log(`      - SIEM Pools: ${siemPools.length}`);
    console.log(`      - EDR Pools: ${edrPools.length}`);
    console.log(`      - NDR Pools: ${ndrPools.length}`);
    console.log(`   🖥️  Hardware Assets: ${hardwareList.length} assets`);
    
    // Display pool summary
    console.log('\n📋 Pool Summary:');
    console.log('SIEM Pools:');
    siemPools.forEach(pool => {
      console.log(`   • ${pool.name}: ${pool.totalLicenses?.toLocaleString()} licenses available`);
    });
    
    console.log('EDR Pools:');
    edrPools.forEach(pool => {
      console.log(`   • ${pool.name}: ${pool.totalLicenses?.toLocaleString()} licenses available`);
    });
    
    console.log('NDR Pools:');
    ndrPools.forEach(pool => {
      console.log(`   • ${pool.name}: ${pool.totalLicenses?.toLocaleString()} licenses available`);
    });

    console.log('\n🖥️  Hardware Assets by Category:');
    const categories = [...new Set(hardwareList.map(asset => asset.category))];
    categories.forEach(category => {
      const count = hardwareList.filter(asset => asset.category === category).length;
      console.log(`   • ${category}: ${count} assets available`);
    });

    console.log('\n🎉 Sample data creation completed! You can now:');
    console.log('   1. Visit http://localhost:3000/onboarding to start the client onboarding workflow');
    console.log('   2. Go to http://localhost:3000/assets to view pool status');
    console.log('   3. Test pool validation when creating service scopes');
    console.log('   4. View real-time pool capacity in the onboarding workflow');

  } catch (error) {
    console.error('❌ Error creating sample data:', error);
    throw error;
  }
}

// Run the script
createSamplePools()
  .then(() => {
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  }); 