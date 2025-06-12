# Comprehensive Bulk Import Testing Guide

## Overview
The comprehensive bulk import feature allows you to import multiple types of data (clients, contacts, contracts, services, etc.) from CSV or pasted data through a user-friendly wizard interface.

## Prerequisites
1. Server must be running (`npm run dev`)
2. Must be logged in as Manager or Admin level user
3. Database must be accessible

## Test Credentials
```
ADMIN   : admin@test.mssp.local     | IUnlz^Rel87Y5Z4e
MANAGER : manager@test.mssp.local   | IUnlz^Rel87Y5Z4e
ENGINEER: engineer@test.mssp.local  | IUnlz^Rel87Y5Z4e
USER    : user@test.mssp.local      | IUnlz^Rel87Y5Z4e
```

## Testing Steps

### 1. Access the Page
1. Navigate to `http://localhost:3000/login`
2. Log in with admin or manager credentials
3. Go to `http://localhost:3000/comprehensive-bulk-import`
4. You should see the bulk import wizard

### 2. Test with Sample Data
Use the provided `sample-bulk-import-data.csv` file or copy the following data:

```csv
Company Name,Company Domain,Contact Name,Contact Email,Contact Phone,Contact Title,Contract Name,Contract Start Date,Contract End Date,Service Name,Service Category
Acme Corporation,acme.com,John Smith,john.smith@acme.com,+1-555-123-4567,IT Director,Annual Security Services Agreement,2024-01-01,2024-12-31,24/7 SIEM Monitoring,Security Operations
TechCorp Solutions,techcorp.com,Jane Doe,jane.doe@techcorp.com,+1-555-987-6543,CISO,Security Assessment Contract,2024-02-01,2024-06-30,Vulnerability Assessment,Security Testing
Global Industries,globalind.com,Bob Johnson,bob.johnson@globalind.com,+1-555-555-1234,IT Manager,Managed Security Services,2024-03-01,2025-02-28,SOC as a Service,Managed Services
```

### 3. Wizard Flow Testing

#### Step 1: Data Input
- **Option A: File Upload**: Upload the `sample-bulk-import-data.csv` file
- **Option B: Paste Data**: Paste the CSV data directly into the text area
- Click "Parse Data" button
- Verify that the data is correctly parsed and shows in the preview table

#### Step 2: Column Mapping
- Review the auto-suggested column mappings
- The system should automatically map common column names like:
  - "Company Name" → Client Name
  - "Contact Email" → Contact Email
  - "Contract Start Date" → Contract Start Date
- Manually adjust any incorrect mappings using the dropdown selectors
- Ensure required fields are properly mapped (marked with red asterisk)

#### Step 3: Preview & Import
- Review the mapped data in the preview table
- Check that data types are correctly interpreted (dates, emails, etc.)
- Set duplicate handling strategy (Update, Skip, Create New)
- Set client matching strategy (Name Only, Name and Domain, Email)
- Click "Start Import"

#### Step 4: Results
- Monitor the import progress
- Review the detailed results showing:
  - Total records processed
  - Records successful/failed/skipped
  - Breakdown by entity type (clients, contacts, contracts, etc.)
- Check for any errors or warnings

### 4. API Testing
You can also test the API directly using the provided test scripts:

```bash
# Test endpoint structure (no auth required)
node test-bulk-import-simple.js

# Test with sample data (requires session cookie)
node test-comprehensive-bulk-import.js
```

### 5. Verification Steps

After a successful import, verify the data was created correctly:

1. **Check Clients**: Navigate to the clients page and verify new clients were created
2. **Check Contacts**: Verify contacts are associated with the correct clients
3. **Check Contracts**: Verify contracts are linked to the appropriate clients
4. **Check Services**: Verify services and service scopes were created if included
5. **Check Audit Logs**: Verify that all import activities are properly logged

### 6. Error Scenarios to Test

#### Invalid Data
- Import data with missing required fields
- Import data with invalid email formats
- Import data with invalid date formats
- Import data with duplicate client names

#### Mapping Issues
- Leave required fields unmapped
- Map the same source column to multiple target fields
- Map text data to date fields

#### Duplicate Handling
- Import the same data twice with different duplicate handling strategies:
  - **Update**: Should update existing records
  - **Skip**: Should skip existing records
  - **Create New**: Should create duplicate records

### 7. Expected Results

#### Successful Import
- All valid records should be imported successfully
- Related entities should be properly linked (contacts to clients, etc.)
- Audit logs should be created for all activities
- Import summary should show accurate counts

#### Partial Success
- Invalid records should be skipped with detailed error messages
- Valid records should still be imported
- Warnings should be displayed for skipped/problematic data

#### Complete Failure
- Clear error messages should be displayed
- No partial data should be committed
- System should remain in a consistent state

### 8. Performance Testing

For large datasets, test with:
- 100+ records
- 1000+ records (if database supports it)
- Data with many columns
- Data with complex relationships

### 9. Browser Compatibility
Test the wizard interface in:
- Chrome
- Firefox
- Safari
- Edge

### 10. Common Issues & Troubleshooting

#### Database Connection Issues
- Ensure DATABASE_URL is properly set
- Check that the database server is running
- Verify database permissions

#### Authentication Issues
- Ensure you're logged in with appropriate permissions
- Check that session is not expired
- Verify that the user has Manager or Admin role

#### Data Format Issues
- CSV files should use comma separators
- Date formats should be YYYY-MM-DD
- Email addresses should be valid format
- Boolean values should be true/false

## Files Included

- `sample-bulk-import-data.csv` - Sample data for testing
- `test-bulk-import-simple.js` - Basic API endpoint test
- `test-comprehensive-bulk-import.js` - Full API test with sample data
- `BULK_IMPORT_TESTING_GUIDE.md` - This testing guide

## Success Criteria

✅ Page loads without errors  
✅ Data can be parsed from both file upload and paste  
✅ Column mapping works correctly with auto-suggestions  
✅ Import completes successfully with valid data  
✅ All related entities are properly created and linked  
✅ Error handling works for invalid data  
✅ Audit logs are created for all activities  
✅ Duplicate handling strategies work as expected  
✅ Import results are accurate and detailed  
✅ System performance is acceptable for typical data volumes  

Happy testing! 🚀 