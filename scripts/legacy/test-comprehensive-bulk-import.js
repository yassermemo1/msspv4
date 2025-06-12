// Test script for comprehensive bulk import API
import fetch from 'node-fetch';

const testData = {
  headers: [
    'Company Name',
    'Company Domain',
    'Contact Name',
    'Contact Email',
    'Contact Phone',
    'Contact Title',
    'Contract Name',
    'Contract Start Date',
    'Contract End Date',
    'Service Name',
    'Service Category'
  ],
  rows: [
    [
      'Acme Corporation',
      'acme.com',
      'John Smith',
      'john.smith@acme.com',
      '+1-555-123-4567',
      'IT Director',
      'Annual Security Services Agreement',
      '2024-01-01',
      '2024-12-31',
      '24/7 SIEM Monitoring',
      'Security Operations'
    ],
    [
      'TechCorp Solutions',
      'techcorp.com',
      'Jane Doe',
      'jane.doe@techcorp.com',
      '+1-555-987-6543',
      'CISO',
      'Security Assessment Contract',
      '2024-02-01',
      '2024-06-30',
      'Vulnerability Assessment',
      'Security Testing'
    ],
    [
      'Global Industries',
      'globalind.com',
      'Bob Johnson',
      'bob.johnson@globalind.com',
      '+1-555-555-1234',
      'IT Manager',
      'Managed Security Services',
      '2024-03-01',
      '2025-02-28',
      'SOC as a Service',
      'Managed Services'
    ]
  ],
  mappings: [
    { sourceColumn: 'Company Name', targetField: 'name', entityType: 'clients', required: true, dataType: 'text' },
    { sourceColumn: 'Company Domain', targetField: 'domain', entityType: 'clients', required: false, dataType: 'text' },
    { sourceColumn: 'Contact Name', targetField: 'name', entityType: 'contacts', required: true, dataType: 'text' },
    { sourceColumn: 'Contact Email', targetField: 'email', entityType: 'contacts', required: true, dataType: 'email' },
    { sourceColumn: 'Contact Phone', targetField: 'phone', entityType: 'contacts', required: false, dataType: 'text' },
    { sourceColumn: 'Contact Title', targetField: 'title', entityType: 'contacts', required: false, dataType: 'text' },
    { sourceColumn: 'Contract Name', targetField: 'name', entityType: 'contracts', required: true, dataType: 'text' },
    { sourceColumn: 'Contract Start Date', targetField: 'startDate', entityType: 'contracts', required: true, dataType: 'date' },
    { sourceColumn: 'Contract End Date', targetField: 'endDate', entityType: 'contracts', required: true, dataType: 'date' }
  ],
  duplicateHandling: 'update',
  clientMatchStrategy: 'name_only'
};

async function testBulkImport() {
  try {
    console.log('🧪 Testing Comprehensive Bulk Import API...');
    console.log('📊 Test data:');
    console.log(`- Headers: ${testData.headers.length}`);
    console.log(`- Rows: ${testData.rows.length}`);
    console.log(`- Mappings: ${testData.mappings.length}`);
    console.log('');

    const response = await fetch('http://localhost:3000/api/bulk-import/comprehensive-paste', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: In a real scenario, you'd need proper authentication
        'Cookie': 'session=your-session-cookie-here'
      },
      body: JSON.stringify(testData)
    });

    console.log(`📡 Response status: ${response.status} ${response.statusText}`);
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Import successful!');
      console.log('📈 Results:');
      console.log(`- Records processed: ${result.recordsProcessed}`);
      console.log(`- Records successful: ${result.recordsSuccessful}`);
      console.log(`- Records failed: ${result.recordsFailed}`);
      console.log(`- Records skipped: ${result.recordsSkipped}`);
      
      if (result.details) {
        console.log('\n📋 Detailed breakdown:');
        Object.entries(result.details).forEach(([entity, stats]) => {
          console.log(`- ${entity}:`, stats);
        });
      }
      
      if (result.warnings && result.warnings.length > 0) {
        console.log('\n⚠️ Warnings:');
        result.warnings.forEach(warning => console.log(`  - ${warning}`));
      }
      
    } else {
      console.log('❌ Import failed!');
      console.log('Error:', result);
    }

  } catch (error) {
    console.error('💥 Test failed with error:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('💡 Make sure the server is running on http://localhost:3000');
    }
  }
}

// Run the test
testBulkImport(); 