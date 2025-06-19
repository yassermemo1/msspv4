-- Create license pools for EPS-based, EDR, and NDR with 500,000 total available each

INSERT INTO license_pools (
  name, 
  vendor, 
  product_name, 
  license_type, 
  total_licenses, 
  available_licenses, 
  ordered_licenses, 
  cost_per_license, 
  renewal_date, 
  notes, 
  is_active
) VALUES 
(
  'SIEM EPS License Pool',
  'MSSP Internal',
  'SIEM Events Per Second',
  'EPS-based',
  500000,
  500000,
  500000,
  50.00,
  '2025-12-31 23:59:59',
  'Primary SIEM pool for EPS-based licensing - 500K total capacity',
  true
),
(
  'EDR Endpoint License Pool',
  'CrowdStrike',
  'Falcon Platform',
  'EDR',
  500000,
  500000,
  500000,
  8.50,
  '2025-12-31 23:59:59',
  'EDR endpoint protection pool - 500K total capacity',
  true
),
(
  'NDR Network License Pool',
  'ExtraHop',
  'Reveal(x)',
  'NDR',
  500000,
  500000,
  500000,
  25.00,
  '2025-12-31 23:59:59',
  'NDR network detection and response pool - 500K total capacity',
  true
);

-- Verify the insertions
SELECT 
  id,
  name,
  vendor,
  license_type,
  total_licenses,
  available_licenses,
  cost_per_license,
  is_active
FROM license_pools 
WHERE license_type IN ('EPS-based', 'EDR', 'NDR')
ORDER BY license_type; 