# NDR Network License Pool Implementation

## Overview

The NDR (Network Detection and Response) License Pool has been implemented to manage network-based security licenses, similar to how SIEM and EDR licenses are managed. Once the MDR API provides NDR license data, these will be automatically assigned to clients during the sync process.

## Current Status

- **Pool Name**: NDR Network License Pool  
- **Pool ID**: 5
- **Total Licenses**: 500,000
- **Currently Assigned**: 0 (waiting for MDR API data)

## Implementation Details

### 1. Database Structure

The NDR pool uses the existing `license_pools` table:
```sql
id: 5
name: 'NDR Network License Pool'
vendor: 'ExtraHop'
product_name: 'Reveal(x)'
license_type: 'NDR'
total_licenses: 500000
```

### 2. MDR Sync Integration

The `MDRClientSyncService` has been updated to handle NDR licenses:

```typescript
// In updateLicenseAssignments method
const ndrPoolQuery = "SELECT id FROM license_pools WHERE LOWER(name) LIKE '%ndr%' LIMIT 1";

// Check for NDR license data
const ndrCount = detailedData.ntdLicenses || 
                 detailedData.ndrLicenses || 
                 detailedData.networkLicenses || 0;

if (ndrCount > 0) {
    await this.upsertLicenseAssignment(clientId, ndrPoolId, ndrCount, ...);
}
```

### 3. Expected API Fields

The system will look for NDR license data in these fields (in order of preference):
1. `ntdLicenses` - Based on the `ntdLicenseExpirationDate` field name
2. `ndrLicenses` - Direct NDR license count
3. `networkLicenses` - Alternative naming for network licenses

### 4. Dashboard Widgets

Four widgets have been created for NDR monitoring:

| Widget ID | Name | Type | Description |
|-----------|------|------|-------------|
| 98 | NDR License Pool Status | metric | Shows total, used, and available NDR licenses |
| 99 | Total NDR Licenses Allocated | number | Total NDR licenses allocated across all clients |
| 100 | NDR Pool Utilization | number | Percentage of NDR licenses in use |
| 101 | SIEM vs EDR vs NDR License Pools | chart | Comparison bar chart of all three pools |

### 5. Pool Status Display

After each sync, the system displays a summary of all license pools:

```
📊 License Pool Status Summary:
   ============================================================
   🔍 SIEM EPS License Pool:
      Total: 500,000
      Used:  183,577 (36.7%)
      Free:  316,423
   ────────────────────────────────────────────────────────────
   🛡️ EDR Endpoint License Pool:
      Total: 500,000
      Used:  144,194 (28.8%)
      Free:  355,806
   ────────────────────────────────────────────────────────────
   🌐 NDR Network License Pool:
      Total: 500,000
      Used:  0 (0.0%)
      Free:  500,000
   ────────────────────────────────────────────────────────────
```

## Future Activation

When the MDR API starts providing NDR license data:

1. **No code changes required** - The system is ready to handle NDR data
2. NDR licenses will be automatically assigned during the hourly sync
3. The dashboard widgets will start showing actual usage
4. Clients will see their NDR allocations in the license assignments

## Testing

To manually test NDR assignment (when data is available):
```bash
# Trigger manual sync
curl -X POST http://localhost/api/admin/mdr-sync/trigger \
  -H "Cookie: <your-session-cookie>"

# Check NDR assignments
psql -U postgres -d mssp_production -c "
SELECT c.name, cl.assigned_licenses, cl.notes 
FROM client_licenses cl 
JOIN clients c ON c.id = cl.client_id 
WHERE cl.license_pool_id = 5;"
```

## Related Files

- `/server/services/mdr-client-sync.ts` - NDR sync logic
- `/scripts/create-ndr-license-widgets.sql` - Widget creation script
- Dashboard widgets will appear automatically once activated 