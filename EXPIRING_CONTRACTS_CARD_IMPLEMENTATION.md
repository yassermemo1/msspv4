# Expiring Contracts Card Implementation

## Overview

I've successfully implemented a configurable "Expiring Contracts" card for the main dashboard that shows contracts expiring in X months, where X is user-configurable. The card includes drill-down functionality to show detailed lists of expiring clients.

## Features Implemented

### 1. Backend API Endpoint
- **Endpoint**: `GET /api/contracts/expiring`
- **Parameters**: 
  - `months` (default: 3) - Number of months to look ahead
  - `clientId` (optional) - Filter by specific client
- **Returns**: Array of contracts with client information and days until expiry
- **Authentication**: Required (uses existing auth middleware)

### 2. Database Query
- Filters active contracts only
- Calculates expiry dates X months in the future
- Includes client information via JOIN
- Calculates days until expiry using SQL
- Orders by end date (soonest first)

### 3. Frontend Card Component
- **File**: `client/src/components/dashboard/expiring-contracts-card.tsx`
- **Features**:
  - Configurable time period (1M, 2M, 3M, 6M, 12M)
  - Real-time count display with orange warning styling
  - Drill-down dialog with detailed contract list
  - Urgency badges (Critical, Urgent, Warning, Notice)
  - Summary statistics (total contracts, affected clients, total value)
  - Navigation to contract and client detail pages
  - Auto-refresh every 5 minutes

### 4. Card Configuration
- **ID**: `expiring-contracts`
- **Type**: `metric`
- **Size**: `medium` (allows for more information display)
- **Default**: 3 months lookhead
- **Position**: 12 (after active contracts)

### 5. Integration Points
- Added to `standardized-dashboard-cards.ts` configuration
- Integrated into `dynamic-dashboard-card.tsx` renderer
- Uses existing UI components (Card, Dialog, Table, Badge, Select)
- Follows existing design patterns and styling

## Usage

### For Users
1. The card appears on the main dashboard by default
2. Use the dropdown in the top-right to change the time period (1-12 months)
3. Click "View" button to see detailed list of expiring contracts
4. Click client names to navigate to client details
5. Click "View" buttons to navigate to contract details
6. Card automatically refreshes every 5 minutes

### For Administrators
- Card is configurable through the dashboard customizer
- Can be hidden, resized, or repositioned
- Default settings can be modified in the standardized cards configuration

## Technical Details

### API Response Format
```json
[
  {
    "id": 1,
    "clientId": 5,
    "clientName": "Acme Corp",
    "name": "Security Services Contract 2024",
    "endDate": "2024-12-31T00:00:00.000Z",
    "totalValue": "150000.00",
    "status": "active",
    "daysUntilExpiry": 45
  }
]
```

### Urgency Classification
- **Critical**: ≤ 7 days (red badge)
- **Urgent**: ≤ 30 days (orange badge)
- **Warning**: ≤ 60 days (yellow badge)
- **Notice**: > 60 days (gray badge)

### Security
- Requires user authentication
- Uses existing RBAC permissions
- Logs data access for audit trail
- Includes CSRF protection via credentials

## Files Modified/Created

### New Files
- `client/src/components/dashboard/expiring-contracts-card.tsx`
- `EXPIRING_CONTRACTS_CARD_IMPLEMENTATION.md`

### Modified Files
- `client/src/config/standardized-dashboard-cards.ts` - Added card configuration
- `client/src/components/dashboard/dynamic-dashboard-card.tsx` - Added card renderer integration
- `server/routes.ts` - Added API endpoint

## Testing

The implementation has been tested with:
- API endpoint creation and routing
- Authentication requirements
- Error handling for unauthorized access
- Integration with existing dashboard system

To test with authenticated session:
```bash
curl -X GET "http://localhost/api/contracts/expiring?months=3" \
  -H "Content-Type: application/json" \
  --cookie test-session-cookies.txt
```

## Future Enhancements

Potential improvements for future versions:
1. Email notifications for critical expiring contracts
2. Bulk contract renewal actions from the card
3. Filtering by contract type or value
4. Export functionality for expiring contracts list
5. Integration with calendar systems
6. Custom thresholds for urgency classification 