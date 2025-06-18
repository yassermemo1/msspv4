"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.router = void 0;
exports.getAvailableLicensePools = getAvailableLicensePools;
exports.getAvailableHardwareAssets = getAvailableHardwareAssets;
exports.validateLicenseAllocation = validateLicenseAllocation;
exports.validateHardwareAssignment = validateHardwareAssignment;
exports.getOnboardingPoolStatus = getOnboardingPoolStatus;
const express_1 = require("express");
const db_ts_1 = require("../db.ts");
const schema_ts_1 = require("../../shared/schema.ts");
const drizzle_orm_1 = require("drizzle-orm");
exports.router = (0, express_1.Router)();
// Get available license pools with remaining capacity
async function getAvailableLicensePools(req, res) {
    try {
        const pools = await db_ts_1.db
            .select({
            id: schema_ts_1.licensePools.id,
            name: schema_ts_1.licensePools.name,
            vendor: schema_ts_1.licensePools.vendor,
            productName: schema_ts_1.licensePools.productName,
            licenseType: schema_ts_1.licensePools.licenseType,
            totalLicenses: schema_ts_1.licensePools.totalLicenses,
            availableLicenses: schema_ts_1.licensePools.availableLicenses,
            allocatedCount: (0, drizzle_orm_1.sql) `COALESCE((SELECT SUM(${schema_ts_1.clientLicenses.assignedLicenses}) FROM ${schema_ts_1.clientLicenses} WHERE ${schema_ts_1.clientLicenses.licensePoolId} = ${schema_ts_1.licensePools.id}), 0)`,
            remainingCapacity: (0, drizzle_orm_1.sql) `${schema_ts_1.licensePools.availableLicenses} - COALESCE((SELECT SUM(${schema_ts_1.clientLicenses.assignedLicenses}) FROM ${schema_ts_1.clientLicenses} WHERE ${schema_ts_1.clientLicenses.licensePoolId} = ${schema_ts_1.licensePools.id}), 0)`,
            costPerLicense: schema_ts_1.licensePools.costPerLicense,
            renewalDate: schema_ts_1.licensePools.renewalDate,
            poolType: (0, drizzle_orm_1.sql) `CASE 
          WHEN LOWER(${schema_ts_1.licensePools.productName}) LIKE '%siem%' OR LOWER(${schema_ts_1.licensePools.name}) LIKE '%siem%' OR LOWER(${schema_ts_1.licensePools.productName}) LIKE '%splunk%' OR LOWER(${schema_ts_1.licensePools.productName}) LIKE '%qradar%' THEN 'SIEM'
          WHEN LOWER(${schema_ts_1.licensePools.productName}) LIKE '%edr%' OR LOWER(${schema_ts_1.licensePools.name}) LIKE '%edr%' OR LOWER(${schema_ts_1.licensePools.productName}) LIKE '%crowdstrike%' OR LOWER(${schema_ts_1.licensePools.productName}) LIKE '%sentinelone%' THEN 'EDR'
          WHEN LOWER(${schema_ts_1.licensePools.productName}) LIKE '%ndr%' OR LOWER(${schema_ts_1.licensePools.name}) LIKE '%ndr%' OR LOWER(${schema_ts_1.licensePools.productName}) LIKE '%darktrace%' OR LOWER(${schema_ts_1.licensePools.productName}) LIKE '%extrahop%' THEN 'NDR'
          ELSE 'OTHER'
        END`
        })
            .from(schema_ts_1.licensePools)
            .where((0, drizzle_orm_1.eq)(schema_ts_1.licensePools.isActive, true))
            .orderBy(schema_ts_1.licensePools.name);
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
    }
    catch (error) {
        console.error('Error fetching license pools:', error);
        res.status(500).json({ error: 'Failed to fetch license pools' });
    }
}
// Get available hardware assets grouped by category
async function getAvailableHardwareAssets(req, res) {
    try {
        const assets = await db_ts_1.db
            .select({
            id: schema_ts_1.hardwareAssets.id,
            name: schema_ts_1.hardwareAssets.name,
            category: schema_ts_1.hardwareAssets.category,
            manufacturer: schema_ts_1.hardwareAssets.manufacturer,
            model: schema_ts_1.hardwareAssets.model,
            status: schema_ts_1.hardwareAssets.status,
            location: schema_ts_1.hardwareAssets.location,
            purchaseCost: schema_ts_1.hardwareAssets.purchaseCost,
            warrantyExpiry: schema_ts_1.hardwareAssets.warrantyExpiry
        })
            .from(schema_ts_1.hardwareAssets)
            .where((0, drizzle_orm_1.eq)(schema_ts_1.hardwareAssets.status, 'available'))
            .orderBy(schema_ts_1.hardwareAssets.category, schema_ts_1.hardwareAssets.name);
        // Group by category
        const groupedAssets = assets.reduce((acc, asset) => {
            const category = asset.category.toUpperCase();
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(asset);
            return acc;
        }, {});
        // Get summary statistics
        const assetsSummary = Object.entries(groupedAssets).reduce((acc, [category, categoryAssets]) => {
            acc[category] = {
                available: categoryAssets.length,
                totalValue: categoryAssets.reduce((sum, asset) => sum + (parseFloat(asset.purchaseCost?.toString() || '0')), 0)
            };
            return acc;
        }, {});
        res.json({
            assets: groupedAssets,
            totalAvailable: assets.length,
            assetsSummary
        });
    }
    catch (error) {
        console.error('Error fetching hardware assets:', error);
        res.status(500).json({ error: 'Failed to fetch hardware assets' });
    }
}
// Validate license allocation request
async function validateLicenseAllocation(req, res) {
    try {
        const { poolId, requestedLicenses } = req.body;
        if (!poolId || !requestedLicenses || requestedLicenses <= 0) {
            return res.status(400).json({
                isValid: false,
                error: 'Pool ID and requested licenses (> 0) are required'
            });
        }
        // Get pool details with current allocations
        const poolData = await db_ts_1.db
            .select({
            id: schema_ts_1.licensePools.id,
            name: schema_ts_1.licensePools.name,
            totalLicenses: schema_ts_1.licensePools.totalLicenses,
            availableLicenses: schema_ts_1.licensePools.availableLicenses,
            allocatedCount: (0, drizzle_orm_1.sql) `COALESCE((SELECT SUM(${schema_ts_1.clientLicenses.assignedLicenses}) FROM ${schema_ts_1.clientLicenses} WHERE ${schema_ts_1.clientLicenses.licensePoolId} = ${schema_ts_1.licensePools.id}), 0)`,
            remainingCapacity: (0, drizzle_orm_1.sql) `${schema_ts_1.licensePools.availableLicenses} - COALESCE((SELECT SUM(${schema_ts_1.clientLicenses.assignedLicenses}) FROM ${schema_ts_1.clientLicenses} WHERE ${schema_ts_1.clientLicenses.licensePoolId} = ${schema_ts_1.licensePools.id}), 0)`
        })
            .from(schema_ts_1.licensePools)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_ts_1.licensePools.id, poolId), (0, drizzle_orm_1.eq)(schema_ts_1.licensePools.isActive, true)))
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
    }
    catch (error) {
        console.error('Error validating license allocation:', error);
        res.status(500).json({ error: 'Failed to validate license allocation' });
    }
}
// Validate hardware assignment request
async function validateHardwareAssignment(req, res) {
    try {
        const { assetIds } = req.body;
        if (!assetIds || !Array.isArray(assetIds) || assetIds.length === 0) {
            return res.status(400).json({
                isValid: false,
                error: 'Asset IDs array is required'
            });
        }
        // Check if all assets are available
        const assets = await db_ts_1.db
            .select({
            id: schema_ts_1.hardwareAssets.id,
            name: schema_ts_1.hardwareAssets.name,
            category: schema_ts_1.hardwareAssets.category,
            status: schema_ts_1.hardwareAssets.status
        })
            .from(schema_ts_1.hardwareAssets)
            .where((0, drizzle_orm_1.sql) `${schema_ts_1.hardwareAssets.id} = ANY(${assetIds})`);
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
    }
    catch (error) {
        console.error('Error validating hardware assignment:', error);
        res.status(500).json({ error: 'Failed to validate hardware assignment' });
    }
}
// Get comprehensive pool status for onboarding
async function getOnboardingPoolStatus(req, res) {
    try {
        // Get license pools summary
        const licenseSummary = await db_ts_1.db
            .select({
            poolType: (0, drizzle_orm_1.sql) `CASE 
          WHEN LOWER(${schema_ts_1.licensePools.productName}) LIKE '%siem%' OR LOWER(${schema_ts_1.licensePools.name}) LIKE '%siem%' OR LOWER(${schema_ts_1.licensePools.productName}) LIKE '%splunk%' OR LOWER(${schema_ts_1.licensePools.productName}) LIKE '%qradar%' THEN 'SIEM'
          WHEN LOWER(${schema_ts_1.licensePools.productName}) LIKE '%edr%' OR LOWER(${schema_ts_1.licensePools.name}) LIKE '%edr%' OR LOWER(${schema_ts_1.licensePools.productName}) LIKE '%crowdstrike%' OR LOWER(${schema_ts_1.licensePools.productName}) LIKE '%sentinelone%' THEN 'EDR'
          WHEN LOWER(${schema_ts_1.licensePools.productName}) LIKE '%ndr%' OR LOWER(${schema_ts_1.licensePools.name}) LIKE '%ndr%' OR LOWER(${schema_ts_1.licensePools.productName}) LIKE '%darktrace%' OR LOWER(${schema_ts_1.licensePools.productName}) LIKE '%extrahop%' THEN 'NDR'
          ELSE 'OTHER'
        END`,
            poolCount: (0, drizzle_orm_1.sql) `COUNT(*)`,
            totalCapacity: (0, drizzle_orm_1.sql) `SUM(${schema_ts_1.licensePools.totalLicenses})`,
            totalAllocated: (0, drizzle_orm_1.sql) `COALESCE(SUM((SELECT SUM(${schema_ts_1.clientLicenses.assignedLicenses}) FROM ${schema_ts_1.clientLicenses} WHERE ${schema_ts_1.clientLicenses.licensePoolId} = ${schema_ts_1.licensePools.id})), 0)`,
            totalRemaining: (0, drizzle_orm_1.sql) `SUM(${schema_ts_1.licensePools.availableLicenses}) - COALESCE(SUM((SELECT SUM(${schema_ts_1.clientLicenses.assignedLicenses}) FROM ${schema_ts_1.clientLicenses} WHERE ${schema_ts_1.clientLicenses.licensePoolId} = ${schema_ts_1.licensePools.id})), 0)`
        })
            .from(schema_ts_1.licensePools)
            .where((0, drizzle_orm_1.eq)(schema_ts_1.licensePools.isActive, true))
            .groupBy((0, drizzle_orm_1.sql) `CASE 
        WHEN LOWER(${schema_ts_1.licensePools.productName}) LIKE '%siem%' OR LOWER(${schema_ts_1.licensePools.name}) LIKE '%siem%' OR LOWER(${schema_ts_1.licensePools.productName}) LIKE '%splunk%' OR LOWER(${schema_ts_1.licensePools.productName}) LIKE '%qradar%' THEN 'SIEM'
        WHEN LOWER(${schema_ts_1.licensePools.productName}) LIKE '%edr%' OR LOWER(${schema_ts_1.licensePools.name}) LIKE '%edr%' OR LOWER(${schema_ts_1.licensePools.productName}) LIKE '%crowdstrike%' OR LOWER(${schema_ts_1.licensePools.productName}) LIKE '%sentinelone%' THEN 'EDR'
        WHEN LOWER(${schema_ts_1.licensePools.productName}) LIKE '%ndr%' OR LOWER(${schema_ts_1.licensePools.name}) LIKE '%ndr%' OR LOWER(${schema_ts_1.licensePools.productName}) LIKE '%darktrace%' OR LOWER(${schema_ts_1.licensePools.productName}) LIKE '%extrahop%' THEN 'NDR'
        ELSE 'OTHER'
      END`);
        // Get hardware summary
        const hardwareSummary = await db_ts_1.db
            .select({
            category: schema_ts_1.hardwareAssets.category,
            total: (0, drizzle_orm_1.sql) `COUNT(*)`,
            available: (0, drizzle_orm_1.sql) `COUNT(CASE WHEN ${schema_ts_1.hardwareAssets.status} = 'available' THEN 1 END)`,
            assigned: (0, drizzle_orm_1.sql) `COUNT(CASE WHEN ${schema_ts_1.hardwareAssets.status} = 'assigned' THEN 1 END)`,
            maintenance: (0, drizzle_orm_1.sql) `COUNT(CASE WHEN ${schema_ts_1.hardwareAssets.status} = 'maintenance' THEN 1 END)`
        })
            .from(schema_ts_1.hardwareAssets)
            .groupBy(schema_ts_1.hardwareAssets.category);
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
        }, {});
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
        }, {});
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
    }
    catch (error) {
        console.error('Error fetching onboarding pool status:', error);
        res.status(500).json({ error: 'Failed to fetch pool status' });
    }
}
// Routes
exports.router.get('/license-pools', getAvailableLicensePools);
exports.router.get('/hardware-assets', getAvailableHardwareAssets);
exports.router.post('/validate-license-allocation', validateLicenseAllocation);
exports.router.post('/validate-hardware-assignment', validateHardwareAssignment);
exports.router.get('/status', getOnboardingPoolStatus);
exports.default = exports.router;
