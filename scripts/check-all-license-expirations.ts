import genericApiPlugin from '../server/plugins/generic-api-plugin';

async function checkAllLicenseExpirations() {
  console.log('🔍 Checking all license expiration dates from MDR API...\n');
  
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

    // Track counts for each type of license
    const counts = {
      ntdLicense: 0,
      siemLicense: 0,
      edrLicense: 0,
      serviceExpiration: 0
    };

    console.log('🔄 Checking license expiration dates...');
    
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
        
        if (detailResult.data?.response) {
          const data = detailResult.data.response;
          
          if (data.ntdLicenseExpirationDate) counts.ntdLicense++;
          if (data.siemLicenseExpirationDate) counts.siemLicense++;
          if (data.edrLicenseExpirationDate) counts.edrLicense++;
          if (data.serviceExpirationDate) counts.serviceExpiration++;
        }
      } catch (error) {
        // Silently skip errors for individual tenants
      }
    }
    
    console.log('\n\n📊 Summary of License Expiration Fields:\n');
    console.log(`   Total Tenants: ${tenants.length}`);
    console.log(`   ----------------------------------------`);
    console.log(`   NTD License Expiration:     ${counts.ntdLicense} tenants (${((counts.ntdLicense / tenants.length) * 100).toFixed(1)}%)`);
    console.log(`   SIEM License Expiration:    ${counts.siemLicense} tenants (${((counts.siemLicense / tenants.length) * 100).toFixed(1)}%)`);
    console.log(`   EDR License Expiration:     ${counts.edrLicense} tenants (${((counts.edrLicense / tenants.length) * 100).toFixed(1)}%)`);
    console.log(`   Service Expiration:         ${counts.serviceExpiration} tenants (${((counts.serviceExpiration / tenants.length) * 100).toFixed(1)}%)`);
    
  } catch (error) {
    console.error('❌ Error checking license expirations:', error);
  }
}

// Run the check
checkAllLicenseExpirations(); 