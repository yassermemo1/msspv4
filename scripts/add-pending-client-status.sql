-- Script to add 'pending' and 'awaiting' status to clients table
-- This fixes MDR sync errors where clients have no active endpoints but have a contract

-- Drop the existing constraint
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_status_check;

-- Add the new constraint with both pending and awaiting statuses
ALTER TABLE clients ADD CONSTRAINT clients_status_check 
CHECK (status = ANY (ARRAY[
    'prospect'::text, 
    'active'::text, 
    'inactive'::text, 
    'suspended'::text, 
    'archived'::text, 
    'pending'::text,    -- Added: For clients with contract but no active endpoints
    'awaiting'::text    -- Added: Alternative status for similar cases
]));

-- Verify the changes
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname = 'clients_status_check';

-- Update any existing MDR synced clients that might need the pending status
UPDATE clients 
SET status = 'pending' 
WHERE status = 'active' 
  AND metadata->>'mdrTenantId' IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM mdr_service_details msd 
    WHERE msd.client_id = clients.id 
      AND (msd.online_endpoints > 0 OR msd.online_workstations > 0 OR msd.online_servers > 0)
  );

-- Show count of clients by status
SELECT status, COUNT(*) as count 
FROM clients 
GROUP BY status 
ORDER BY count DESC; 