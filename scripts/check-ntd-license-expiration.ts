import genericApiPlugin from '../server/plugins/generic-api-plugin';

async function checkNTDLicenseExpiration() {
  console.log('🔍 Checking NTD License Expiration Dates from MDR API...\n');
  
  try {
    // Step 1: Fetch all tenants
    const tenantsQuery = {
      method: 'POST' as const,
      endpoint: '/tenant/filter',
      body: {
        paginationAndSorting: {
          currentPage: 1,
          pageSize: 1000,
          sortProperty: 'id',
          sortDirection: 'ASC'
        }
      }
    };

    const tenantsResult = await genericApiPlugin.executeQuery(
      JSON.stringify(tenantsQuery),
      undefined,
      'mdr-main'
    ) as any;
    
    if (!tenantsResult.data?.response) {
      throw new Error('No tenant data received from MDR API');
    }

    const tenants = tenantsResult.data.response;
    console.log(`📊 Found ${tenants.length} total tenants\n`);

    // Step 2: Fetch detailed data for each tenant and check ntdLicenseExpirationDate
    let tenantsWithNTDLicense = 0;
    const ntdLicenseDetails: Array<{
      id: number;
      name: string;
      shortName: string;
      ntdLicenseExpirationDate: string;
    }> = [];

    console.log('🔄 Fetching detailed tenant data...');
    
    for (const tenant of tenants) {
      try {
        const detailQuery = {
          method: 'GET' as const,
          endpoint: `/tenant/details/${tenant.id}`
        };

        const detailResult = await genericApiPlugin.executeQuery(
          JSON.stringify(detailQuery),
          undefined,
          'mdr-main'
        ) as any;
        
        if (detailResult.data?.response?.ntdLicenseExpirationDate) {
          tenantsWithNTDLicense++;
          ntdLicenseDetails.push({
            id: tenant.id,
            name: tenant.name,
            shortName: tenant.shortName || 'N/A',
            ntdLicenseExpirationDate: detailResult.data.response.ntdLicenseExpirationDate
          });
          
          // Show progress
          process.stdout.write(`\r✅ Found ${tenantsWithNTDLicense} tenants with NTD license expiration dates...`);
        }
      } catch (error) {
        // Silently skip errors for individual tenants
      }
    }
    
    console.log('\n\n📊 Summary:');
    console.log(`   Total Tenants: ${tenants.length}`);
    console.log(`   Tenants with NTD License: ${tenantsWithNTDLicense}`);
    console.log(`   Percentage: ${((tenantsWithNTDLicense / tenants.length) * 100).toFixed(2)}%\n`);
    
    if (ntdLicenseDetails.length > 0) {
      console.log('📋 Tenants with NTD License Expiration Dates:\n');
      console.table(
        ntdLicenseDetails
          .sort((a, b) => new Date(a.ntdLicenseExpirationDate).getTime() - new Date(b.ntdLicenseExpirationDate).getTime())
          .slice(0, 20) // Show first 20
      );
      
      if (ntdLicenseDetails.length > 20) {
        console.log(`\n... and ${ntdLicenseDetails.length - 20} more tenants with NTD licenses.`);
      }
      
      // Check for expired licenses
      const now = new Date();
      const expiredLicenses = ntdLicenseDetails.filter(
        t => new Date(t.ntdLicenseExpirationDate) < now
      );
      
      if (expiredLicenses.length > 0) {
        console.log(`\n⚠️  ${expiredLicenses.length} tenants have EXPIRED NTD licenses!`);
      }
      
      // Check for licenses expiring soon (within 30 days)
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      
      const expiringSoon = ntdLicenseDetails.filter(
        t => {
          const expDate = new Date(t.ntdLicenseExpirationDate);
          return expDate > now && expDate < thirtyDaysFromNow;
        }
      );
      
      if (expiringSoon.length > 0) {
        console.log(`⚠️  ${expiringSoon.length} tenants have NTD licenses expiring within 30 days!`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking NTD licenses:', error);
  }
}

// Run the check
checkNTDLicenseExpiration(); 