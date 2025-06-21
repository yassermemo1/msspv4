import genericApiPlugin from '../server/plugins/generic-api-plugin';

async function checkTenantFields() {
  console.log('🔍 Checking available fields in tenant details...\n');
  
  try {
    // Get a sample tenant ID (let's use tenant 1)
    const detailQuery = {
      method: 'GET' as const,
      endpoint: '/tenant/details/1'
    };

    const detailResult = await genericApiPlugin.executeQuery(
      JSON.stringify(detailQuery),
      undefined,
      'mdr-main'
    ) as any;
    
    if (detailResult.data?.response) {
      console.log('📋 Available fields in tenant details:\n');
      
      const tenantData = detailResult.data.response;
      // Show all fields and their types
      const fields = Object.keys(tenantData);
      console.log(`Total fields: ${fields.length}\n`);
      
      // Check for any license-related fields
      const licenseFields = fields.filter(field => 
        field.toLowerCase().includes('license') || 
        field.toLowerCase().includes('ntd') ||
        field.toLowerCase().includes('expir')
      );
      
      if (licenseFields.length > 0) {
        console.log('🔑 License-related fields found:');
        licenseFields.forEach(field => {
          console.log(`   - ${field}: ${typeof tenantData[field]} = ${JSON.stringify(tenantData[field])}`);
        });
      } else {
        console.log('❌ No license-related fields found in the tenant details.');
      }
      
      console.log('\n📊 All available fields:');
      fields.sort().forEach(field => {
        const value = tenantData[field];
        const type = typeof value;
        const preview = type === 'object' ? JSON.stringify(value).substring(0, 50) + '...' : value;
        console.log(`   - ${field} (${type}): ${preview}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking tenant fields:', error);
  }
}

// Run the check
checkTenantFields(); 