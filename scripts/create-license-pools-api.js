#!/usr/bin/env node

/**
 * Create License Pools via API
 * Creates EPS-based, EDR, and NDR license pools with 500,000 total available each
 */

import fetch from 'node-fetch';

const API_BASE_URL = 'http://127.0.0.1:80';

// Test credentials from the server startup logs
const ADMIN_CREDENTIALS = {
  email: 'admin@test.mssp.local',
  password: 'admin123'
};

class LicensePoolCreator {
  constructor() {
    this.sessionCookie = null;
  }

  async login() {
    console.log('🔐 Logging in as admin...');
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ADMIN_CREDENTIALS)
      });

      if (!response.ok) {
        throw new Error(`Login failed: ${response.status} ${response.statusText}`);
      }

      // Extract session cookie
      const setCookieHeader = response.headers.get('set-cookie');
      if (setCookieHeader) {
        this.sessionCookie = setCookieHeader.split(';')[0];
        console.log('✅ Login successful');
      } else {
        throw new Error('No session cookie received');
      }
    } catch (error) {
      console.error('❌ Login failed:', error.message);
      throw error;
    }
  }

  async createLicensePool(poolData) {
    console.log(`📦 Creating license pool: ${poolData.name}...`);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/license-pools`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': this.sessionCookie
        },
        body: JSON.stringify(poolData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create pool: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      console.log(`✅ Created ${poolData.name} (ID: ${result.id})`);
      return result;
    } catch (error) {
      console.error(`❌ Failed to create ${poolData.name}:`, error.message);
      throw error;
    }
  }

  async createAllPools() {
    console.log('🚀 Creating license pools with 500,000 total available each...\n');

    // Define the three license pools
    const licensePools = [
      {
        name: 'SIEM EPS License Pool',
        vendor: 'MSSP Internal',
        productName: 'SIEM Events Per Second',
        licenseType: 'EPS-based',
        totalLicenses: 500000,
        orderedLicenses: 500000,
        costPerLicense: '50.00',
        renewalDate: '2025-12-31',
        notes: 'Primary SIEM pool for EPS-based licensing - 500K total capacity',
        isActive: true
      },
      {
        name: 'EDR Endpoint License Pool',
        vendor: 'CrowdStrike',
        productName: 'Falcon Platform',
        licenseType: 'EDR',
        totalLicenses: 500000,
        orderedLicenses: 500000,
        costPerLicense: '8.50',
        renewalDate: '2025-12-31',
        notes: 'EDR endpoint protection pool - 500K total capacity',
        isActive: true
      },
      {
        name: 'NDR Network License Pool',
        vendor: 'ExtraHop',
        productName: 'Reveal(x)',
        licenseType: 'NDR',
        totalLicenses: 500000,
        orderedLicenses: 500000,
        costPerLicense: '25.00',
        renewalDate: '2025-12-31',
        notes: 'NDR network detection and response pool - 500K total capacity',
        isActive: true
      }
    ];

    const createdPools = [];

    for (const poolData of licensePools) {
      try {
        const result = await this.createLicensePool(poolData);
        createdPools.push(result);
      } catch (error) {
        console.error(`Failed to create pool ${poolData.name}, continuing...`);
      }
    }

    console.log('\n📊 Summary:');
    console.log(`✅ Successfully created ${createdPools.length} license pools`);
    
    if (createdPools.length > 0) {
      console.log('\n🔍 Created Pools:');
      createdPools.forEach(pool => {
        console.log(`  - ${pool.name} (${pool.licenseType}): ${pool.totalLicenses.toLocaleString()} licenses`);
      });
    }

    return createdPools;
  }

  async run() {
    try {
      await this.login();
      await this.createAllPools();
      console.log('\n🎉 License pool creation completed successfully!');
    } catch (error) {
      console.error('\n💥 License pool creation failed:', error.message);
      process.exit(1);
    }
  }
}

// Run the script
const creator = new LicensePoolCreator();
creator.run(); 