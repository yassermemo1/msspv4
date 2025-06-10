import { Request, Response, Router } from 'express';
import { db } from '../db.ts';
import { licensePools, clientLicenses, hardwareAssets, clientHardwareAssignments } from '../../shared/schema.ts';
import { eq, and, sum, count, sql } from 'drizzle-orm';

export const router = Router();

// Get available license pools with remaining capacity
export async function getAvailableLicensePools(req: Request, res: Response) {
  try {
    const pools = await db
      .select({
        id: licensePools.id,
        name: licensePools.name,
        vendor: licensePools.vendor,
        productName: licensePools.productName,
        licenseType: licensePools.licenseType,
        totalLicenses: licensePools.totalLicenses,
        availableLicenses: licensePools.availableLicenses,
        allocatedCount: sql<number>`COALESCE((SELECT SUM(${clientLicenses.assignedLicenses}) FROM ${clientLicenses} WHERE ${clientLicenses.licensePoolId} = ${licensePools.id}), 0)`,
        remainingCapacity: sql<number>`${licensePools.availableLicenses} - COALESCE((SELECT SUM(${clientLicenses.assignedLicenses}) FROM ${clientLicenses} WHERE ${clientLicenses.licensePoolId} = ${licensePools.id}), 0)`,
        costPerLicense: licensePools.costPerLicense,
        renewalDate: licensePools.renewalDate,
        poolType: sql<string>`CASE 
          WHEN LOWER(${licensePools.productName}) LIKE '%siem%' OR LOWER(${licensePools.name}) LIKE '%siem%' OR LOWER(${licensePools.productName}) LIKE '%splunk%' OR LOWER(${licensePools.productName}) LIKE '%qradar%' THEN 'SIEM'
          WHEN LOWER(${licensePools.productName}) LIKE '%edr%' OR LOWER(${licensePools.name}) LIKE '%edr%' OR LOWER(${licensePools.productName}) LIKE '%crowdstrike%' OR LOWER(${licensePools.productName}) LIKE '%sentinelone%' THEN 'EDR'
          WHEN LOWER(${licensePools.productName}) LIKE '%ndr%' OR LOWER(${licensePools.name}) LIKE '%ndr%' OR LOWER(${licensePools.productName}) LIKE '%darktrace%' OR LOWER(${licensePools.productName}) LIKE '%extrahop%' THEN 'NDR'
          ELSE 'OTHER'
        END`
      })
      .from(licensePools)
      .where(eq(licensePools.isActive, true))
      .orderBy(licensePools.name);

    // Group by pool type for easier consumption
    const groupedPools = {
      SIEM: pools.filter(p => p.poolType === 'SIEM'),
      EDR: pools.filter(p => p.poolType === 'EDR'),
      NDR: pools.filter(p => p.poolType === 'NDR'),
      OTHER: pools.filter(p => p.poolType === 'OTHER')
    };

    res.json({
      pools: groupedPools,
      totalPools: pools.length,
      poolsSummary: {
        SIEM: {
          pools: groupedPools.SIEM.length,
          totalCapacity: groupedPools.SIEM.reduce((sum, p) => sum + p.totalLicenses, 0),
          remainingCapacity: groupedPools.SIEM.reduce((sum, p) => sum + p.remainingCapacity, 0)
        },
        EDR: {
          pools: groupedPools.EDR.length,
          totalCapacity: groupedPools.EDR.reduce((sum, p) => sum + p.totalLicenses, 0),
          remainingCapacity: groupedPools.EDR.reduce((sum, p) => sum + p.remainingCapacity, 0)
        },
        NDR: {
          pools: groupedPools.NDR.length,
          totalCapacity: groupedPools.NDR.reduce((sum, p) => sum + p.totalLicenses, 0),
          remainingCapacity: groupedPools.NDR.reduce((sum, p) => sum + p.remainingCapacity, 0)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching license pools:', error);
    res.status(500).json({ error: 'Failed to fetch license pools' });
  }
}

// Get available hardware assets grouped by category
export async function getAvailableHardwareAssets(req: Request, res: Response) {
  try {
    const assets = await db
      .select({
        id: hardwareAssets.id,
        name: hardwareAssets.name,
        category: hardwareAssets.category,
        manufacturer: hardwareAssets.manufacturer,
        model: hardwareAssets.model,
        status: hardwareAssets.status,
        location: hardwareAssets.location,
        purchaseCost: hardwareAssets.purchaseCost,
        warrantyExpiry: hardwareAssets.warrantyExpiry
      })
      .from(hardwareAssets)
      .where(eq(hardwareAssets.status, 'available'))
      .orderBy(hardwareAssets.category, hardwareAssets.name);

    // Group by category
    const groupedAssets = assets.reduce((acc, asset) => {
      const category = asset.category.toUpperCase();
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(asset);
      return acc;
    }, {} as Record<string, typeof assets>);

    // Get summary statistics
    const assetsSummary = Object.entries(groupedAssets).reduce((acc, [category, categoryAssets]) => {
      acc[category] = {
        available: categoryAssets.length,
        totalValue: categoryAssets.reduce((sum, asset) => sum + (parseFloat(asset.purchaseCost?.toString() || '0')), 0)
      };
      return acc;
    }, {} as Record<string, { available: number; totalValue: number }>);

    res.json({
      assets: groupedAssets,
      totalAvailable: assets.length,
      assetsSummary
    });
  } catch (error) {
    console.error('Error fetching hardware assets:', error);
    res.status(500).json({ error: 'Failed to fetch hardware assets' });
  }
}

// Validate license allocation request
export async function validateLicenseAllocation(req: Request, res: Response) {
  try {
    const { poolId, requestedLicenses } = req.body;

    if (!poolId || !requestedLicenses || requestedLicenses <= 0) {
      return res.status(400).json({ 
        isValid: false, 
        error: 'Pool ID and requested licenses (> 0) are required' 
      });
    }

    // Get pool details with current allocations
    const poolData = await db
      .select({
        id: licensePools.id,
        name: licensePools.name,
        totalLicenses: licensePools.totalLicenses,
        availableLicenses: licensePools.availableLicenses,
        allocatedCount: sql<number>`COALESCE((SELECT SUM(${clientLicenses.assignedLicenses}) FROM ${clientLicenses} WHERE ${clientLicenses.licensePoolId} = ${licensePools.id}), 0)`,
        remainingCapacity: sql<number>`${licensePools.availableLicenses} - COALESCE((SELECT SUM(${clientLicenses.assignedLicenses}) FROM ${clientLicenses} WHERE ${clientLicenses.licensePoolId} = ${licensePools.id}), 0)`
      })
      .from(licensePools)
      .where(and(eq(licensePools.id, poolId), eq(licensePools.isActive, true)))
      .limit(1);

    if (poolData.length === 0) {
      return res.status(404).json({ 
        isValid: false, 
        error: 'License pool not found or inactive' 
      });
    }

    const pool = poolData[0];
    const isValid = pool.remainingCapacity >= requestedLicenses;

    res.json({
      isValid,
      pool: {
        id: pool.id,
        name: pool.name,
        totalLicenses: pool.totalLicenses,
        allocatedCount: pool.allocatedCount,
        remainingCapacity: pool.remainingCapacity
      },
      requestedLicenses,
      availableAfterAllocation: pool.remainingCapacity - requestedLicenses,
      message: isValid 
        ? `Allocation is valid. ${pool.remainingCapacity - requestedLicenses} licenses will remain after allocation.`
        : `Insufficient licenses. Only ${pool.remainingCapacity} licenses available, but ${requestedLicenses} requested.`
    });
  } catch (error) {
    console.error('Error validating license allocation:', error);
    res.status(500).json({ error: 'Failed to validate license allocation' });
  }
}

// Validate hardware assignment request
export async function validateHardwareAssignment(req: Request, res: Response) {
  try {
    const { assetIds } = req.body;

    if (!assetIds || !Array.isArray(assetIds) || assetIds.length === 0) {
      return res.status(400).json({ 
        isValid: false, 
        error: 'Asset IDs array is required' 
      });
    }

    // Check if all assets are available
    const assets = await db
      .select({
        id: hardwareAssets.id,
        name: hardwareAssets.name,
        category: hardwareAssets.category,
        status: hardwareAssets.status
      })
      .from(hardwareAssets)
      .where(sql`${hardwareAssets.id} = ANY(${assetIds})`);

    const foundAssetIds = assets.map(a => a.id);
    const missingAssetIds = assetIds.filter(id => !foundAssetIds.includes(id));
    const unavailableAssets = assets.filter(a => a.status !== 'available');

    const isValid = missingAssetIds.length === 0 && unavailableAssets.length === 0;

    res.json({
      isValid,
      assets: assets.map(a => ({
        id: a.id,
        name: a.name,
        category: a.category,
        status: a.status,
        available: a.status === 'available'
      })),
      validation: {
        requestedCount: assetIds.length,
        foundCount: assets.length,
        availableCount: assets.filter(a => a.status === 'available').length,
        missingAssetIds,
        unavailableAssets: unavailableAssets.map(a => ({ id: a.id, name: a.name, status: a.status }))
      },
      message: isValid 
        ? `All ${assetIds.length} assets are available for assignment.`
        : `Assignment validation failed. ${missingAssetIds.length} assets not found, ${unavailableAssets.length} assets unavailable.`
    });
  } catch (error) {
    console.error('Error validating hardware assignment:', error);
    res.status(500).json({ error: 'Failed to validate hardware assignment' });
  }
}

// Get comprehensive pool status for onboarding
export async function getOnboardingPoolStatus(req: Request, res: Response) {
  try {
    // Get license pools summary
    const licenseSummary = await db
      .select({
        poolType: sql<string>`CASE 
          WHEN LOWER(${licensePools.productName}) LIKE '%siem%' OR LOWER(${licensePools.name}) LIKE '%siem%' OR LOWER(${licensePools.productName}) LIKE '%splunk%' OR LOWER(${licensePools.productName}) LIKE '%qradar%' THEN 'SIEM'
          WHEN LOWER(${licensePools.productName}) LIKE '%edr%' OR LOWER(${licensePools.name}) LIKE '%edr%' OR LOWER(${licensePools.productName}) LIKE '%crowdstrike%' OR LOWER(${licensePools.productName}) LIKE '%sentinelone%' THEN 'EDR'
          WHEN LOWER(${licensePools.productName}) LIKE '%ndr%' OR LOWER(${licensePools.name}) LIKE '%ndr%' OR LOWER(${licensePools.productName}) LIKE '%darktrace%' OR LOWER(${licensePools.productName}) LIKE '%extrahop%' THEN 'NDR'
          ELSE 'OTHER'
        END`,
        poolCount: sql<number>`COUNT(*)`,
        totalCapacity: sql<number>`SUM(${licensePools.totalLicenses})`,
        totalAllocated: sql<number>`COALESCE(SUM((SELECT SUM(${clientLicenses.assignedLicenses}) FROM ${clientLicenses} WHERE ${clientLicenses.licensePoolId} = ${licensePools.id})), 0)`,
        totalRemaining: sql<number>`SUM(${licensePools.availableLicenses}) - COALESCE(SUM((SELECT SUM(${clientLicenses.assignedLicenses}) FROM ${clientLicenses} WHERE ${clientLicenses.licensePoolId} = ${licensePools.id})), 0)`
      })
      .from(licensePools)
      .where(eq(licensePools.isActive, true))
      .groupBy(sql`CASE 
        WHEN LOWER(${licensePools.productName}) LIKE '%siem%' OR LOWER(${licensePools.name}) LIKE '%siem%' OR LOWER(${licensePools.productName}) LIKE '%splunk%' OR LOWER(${licensePools.productName}) LIKE '%qradar%' THEN 'SIEM'
        WHEN LOWER(${licensePools.productName}) LIKE '%edr%' OR LOWER(${licensePools.name}) LIKE '%edr%' OR LOWER(${licensePools.productName}) LIKE '%crowdstrike%' OR LOWER(${licensePools.productName}) LIKE '%sentinelone%' THEN 'EDR'
        WHEN LOWER(${licensePools.productName}) LIKE '%ndr%' OR LOWER(${licensePools.name}) LIKE '%ndr%' OR LOWER(${licensePools.productName}) LIKE '%darktrace%' OR LOWER(${licensePools.productName}) LIKE '%extrahop%' THEN 'NDR'
        ELSE 'OTHER'
      END`);

    // Get hardware summary
    const hardwareSummary = await db
      .select({
        category: hardwareAssets.category,
        total: sql<number>`COUNT(*)`,
        available: sql<number>`COUNT(CASE WHEN ${hardwareAssets.status} = 'available' THEN 1 END)`,
        assigned: sql<number>`COUNT(CASE WHEN ${hardwareAssets.status} = 'assigned' THEN 1 END)`,
        maintenance: sql<number>`COUNT(CASE WHEN ${hardwareAssets.status} = 'maintenance' THEN 1 END)`
      })
      .from(hardwareAssets)
      .groupBy(hardwareAssets.category);

    // Transform license summary to key-value pairs
    const licenseStatus = licenseSummary.reduce((acc, item) => {
      acc[item.poolType] = {
        poolCount: item.poolCount,
        totalCapacity: item.totalCapacity,
        totalAllocated: item.totalAllocated,
        totalRemaining: item.totalRemaining,
        utilizationRate: item.totalCapacity > 0 ? (item.totalAllocated / item.totalCapacity * 100) : 0,
        status: item.totalRemaining > 0 ? 'available' : 'depleted'
      };
      return acc;
    }, {} as Record<string, any>);

    // Transform hardware summary
    const hardwareStatus = hardwareSummary.reduce((acc, item) => {
      acc[item.category.toUpperCase()] = {
        total: item.total,
        available: item.available,
        assigned: item.assigned,
        maintenance: item.maintenance,
        utilizationRate: item.total > 0 ? ((item.assigned + item.maintenance) / item.total * 100) : 0,
        status: item.available > 0 ? 'available' : 'depleted'
      };
      return acc;
    }, {} as Record<string, any>);

    res.json({
      licenseStatus,
      hardwareStatus,
      summary: {
        licenses: {
          totalPools: licenseSummary.reduce((sum, item) => sum + item.poolCount, 0),
          totalCapacity: licenseSummary.reduce((sum, item) => sum + item.totalCapacity, 0),
          totalRemaining: licenseSummary.reduce((sum, item) => sum + item.totalRemaining, 0),
          poolTypes: Object.keys(licenseStatus)
        },
        hardware: {
          totalAssets: hardwareSummary.reduce((sum, item) => sum + item.total, 0),
          totalAvailable: hardwareSummary.reduce((sum, item) => sum + item.available, 0),
          categories: Object.keys(hardwareStatus)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching onboarding pool status:', error);
    res.status(500).json({ error: 'Failed to fetch pool status' });
  }
}

// Routes
router.get('/license-pools', getAvailableLicensePools);
router.get('/hardware-assets', getAvailableHardwareAssets);
router.post('/validate-license-allocation', validateLicenseAllocation);
router.post('/validate-hardware-assignment', validateHardwareAssignment);
router.get('/status', getOnboardingPoolStatus);

export default router; 