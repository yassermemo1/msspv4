import { db } from '../db';
import { contracts, clients, serviceScopes, services, financialTransactions, auditLogs } from '../../shared/schema';
import { eq, and, or, gte, lte, isNull, desc, asc } from 'drizzle-orm';
import { storage } from '../storage';

export interface ContractLifecycleEvent {
  type: 'renewal_due' | 'expiring' | 'expired' | 'milestone_reached' | 'payment_due' | 'service_change';
  contractId: number;
  daysUntil: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  actionRequired: string;
  assignedTo?: number;
}

export interface ContractMetrics {
  totalValue: number;
  monthlyRecurring: number;
  utilizationRate: number;
  profitMargin: number;
  clientSatisfaction: number;
  slaCompliance: number;
}

export interface RenewalRecommendation {
  contractId: number;
  action: 'auto_renew' | 'negotiate' | 'review' | 'terminate';
  confidence: number;
  reasons: string[];
  suggestedTerms?: {
    duration: number;
    priceAdjustment: number;
    serviceChanges: string[];
  };
}

export class ContractLifecycleManager {
  
  /**
   * Get all upcoming contract lifecycle events
   */
  async getUpcomingEvents(daysAhead: number = 90): Promise<ContractLifecycleEvent[]> {
    const events: ContractLifecycleEvent[] = [];
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + daysAhead);
    
    // Get contracts expiring or due for renewal
    const contractsQuery = await db
      .select({
        id: contracts.id,
        name: contracts.name,
        endDate: contracts.endDate,
        autoRenewal: contracts.autoRenewal,
        status: contracts.status,
        clientName: clients.name,
        totalValue: contracts.totalValue
      })
      .from(contracts)
      .leftJoin(clients, eq(contracts.clientId, clients.id))
      .where(
        and(
          eq(contracts.status, 'active'),
          isNull(clients.deletedAt),
          gte(contracts.endDate, today),
          lte(contracts.endDate, futureDate)
        )
      )
      .orderBy(asc(contracts.endDate));

    // Process each contract for events
    for (const contract of contractsQuery) {
      if (!contract.endDate) continue;
      
      const daysUntilEnd = Math.ceil((contract.endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      // Renewal events
      if (contract.autoRenewal) {
        if (daysUntilEnd <= 30) {
          events.push({
            type: 'renewal_due',
            contractId: contract.id,
            daysUntil: daysUntilEnd,
            priority: daysUntilEnd <= 7 ? 'critical' : daysUntilEnd <= 15 ? 'high' : 'medium',
            description: `Auto-renewal for ${contract.clientName} - ${contract.name}`,
            actionRequired: 'Review renewal terms and execute auto-renewal'
          });
        }
      } else {
        if (daysUntilEnd <= 60) {
          events.push({
            type: 'expiring',
            contractId: contract.id,
            daysUntil: daysUntilEnd,
            priority: daysUntilEnd <= 15 ? 'critical' : daysUntilEnd <= 30 ? 'high' : 'medium',
            description: `Contract expiring for ${contract.clientName} - ${contract.name}`,
            actionRequired: 'Contact client for renewal negotiation'
          });
        }
      }
    }
    
    return events.sort((a, b) => a.daysUntil - b.daysUntil);
  }

  /**
   * Calculate contract performance metrics
   */
  async getContractMetrics(contractId: number): Promise<ContractMetrics> {
    // Get contract details
    const [contract] = await db
      .select()
      .from(contracts)
      .where(eq(contracts.id, contractId));
    
    if (!contract) {
      throw new Error('Contract not found');
    }

    // Get service scopes for utilization calculation
    const scopes = await db
      .select({
        id: serviceScopes.id,
        monthlyValue: serviceScopes.monthlyValue,
        status: serviceScopes.status,
        serviceName: services.name,
        serviceCategory: services.category
      })
      .from(serviceScopes)
      .leftJoin(services, eq(serviceScopes.serviceId, services.id))
      .where(eq(serviceScopes.contractId, contractId));

    // Calculate metrics
    const totalValue = contract.totalValue ? parseFloat(contract.totalValue.toString()) : 0;
    const monthlyRecurring = scopes.reduce((sum, scope) => {
      return sum + (scope.monthlyValue ? parseFloat(scope.monthlyValue.toString()) : 0);
    }, 0);

    // Simplified calculations (in real-world, these would be more complex)
    const utilizationRate = scopes.filter(s => s.status === 'active').length / Math.max(scopes.length, 1);
    const profitMargin = 0.25; // Would be calculated from actual costs
    const clientSatisfaction = 0.85; // Would come from surveys
    const slaCompliance = 0.92; // Would come from service monitoring

    return {
      totalValue,
      monthlyRecurring,
      utilizationRate,
      profitMargin,
      clientSatisfaction,
      slaCompliance
    };
  }

  /**
   * Generate AI-powered renewal recommendations
   */
  async generateRenewalRecommendations(contractId: number): Promise<RenewalRecommendation> {
    const metrics = await this.getContractMetrics(contractId);
    const events = await this.getUpcomingEvents(365);
    const contractEvents = events.filter(e => e.contractId === contractId);
    
    // Simple scoring algorithm (in production, this would use ML)
    let score = 0;
    const reasons: string[] = [];
    
    // Positive factors
    if (metrics.clientSatisfaction > 0.8) {
      score += 30;
      reasons.push('High client satisfaction score');
    }
    
    if (metrics.slaCompliance > 0.9) {
      score += 25;
      reasons.push('Excellent SLA compliance');
    }
    
    if (metrics.profitMargin > 0.2) {
      score += 20;
      reasons.push('Healthy profit margin');
    }
    
    if (metrics.utilizationRate > 0.8) {
      score += 15;
      reasons.push('High service utilization');
    }
    
    // Negative factors
    if (metrics.clientSatisfaction < 0.6) {
      score -= 40;
      reasons.push('Low client satisfaction - needs improvement');
    }
    
    if (metrics.slaCompliance < 0.8) {
      score -= 30;
      reasons.push('Poor SLA compliance');
    }
    
    if (metrics.profitMargin < 0.1) {
      score -= 25;
      reasons.push('Low profit margin');
    }

    // Determine recommendation
    let action: RenewalRecommendation['action'];
    if (score >= 70) {
      action = 'auto_renew';
    } else if (score >= 40) {
      action = 'negotiate';
    } else if (score >= 20) {
      action = 'review';
    } else {
      action = 'terminate';
    }

    // Suggested terms for negotiation
    let suggestedTerms;
    if (action === 'negotiate') {
      suggestedTerms = {
        duration: metrics.clientSatisfaction > 0.7 ? 24 : 12, // months
        priceAdjustment: metrics.slaCompliance > 0.9 ? 5 : 0, // percentage increase
        serviceChanges: [
          'Add performance monitoring',
          'Implement quarterly reviews',
          'Enhanced support tier'
        ]
      };
    }

    return {
      contractId,
      action,
      confidence: Math.min(Math.max(score / 100, 0), 1),
      reasons,
      suggestedTerms
    };
  }

  /**
   * Automated contract renewal process
   */
  async processAutomaticRenewal(contractId: number, userId: number): Promise<boolean> {
    try {
      const [contract] = await db
        .select()
        .from(contracts)
        .where(eq(contracts.id, contractId));

      if (!contract || !contract.autoRenewal) {
        throw new Error('Contract not found or auto-renewal not enabled');
      }

      // Calculate new end date
      const currentEndDate = contract.endDate!;
      const newEndDate = new Date(currentEndDate);
      newEndDate.setFullYear(newEndDate.getFullYear() + 1); // Default 1 year renewal

      // Update contract
      await db
        .update(contracts)
        .set({
          endDate: newEndDate,
          updatedAt: new Date()
        })
        .where(eq(contracts.id, contractId));

      // Create audit log
      await storage.createAuditLog({
        userId,
        action: 'RENEWAL',
        entityType: 'contract',
        entityId: contractId,
        entityName: contract.name,
        description: `Automatic contract renewal processed. New end date: ${newEndDate.toISOString().split('T')[0]}`,
        severity: 'info',
        category: 'contract_management'
      });

      return true;
    } catch (error) {
      console.error('Auto-renewal failed:', error);
      return false;
    }
  }

  /**
   * Contract health score calculation
   */
  async calculateContractHealth(contractId: number): Promise<{
    score: number;
    status: 'excellent' | 'good' | 'warning' | 'critical';
    factors: { name: string; score: number; weight: number }[];
  }> {
    const metrics = await this.getContractMetrics(contractId);
    
    const factors = [
      {
        name: 'Client Satisfaction',
        score: metrics.clientSatisfaction * 100,
        weight: 0.3
      },
      {
        name: 'SLA Compliance',
        score: metrics.slaCompliance * 100,
        weight: 0.25
      },
      {
        name: 'Profit Margin',
        score: Math.min(metrics.profitMargin * 200, 100), // Scale 0.5 = 100%
        weight: 0.2
      },
      {
        name: 'Service Utilization',
        score: metrics.utilizationRate * 100,
        weight: 0.15
      },
      {
        name: 'Payment History',
        score: 95, // Would be calculated from financial data
        weight: 0.1
      }
    ];

    const weightedScore = factors.reduce((sum, factor) => {
      return sum + (factor.score * factor.weight);
    }, 0);

    let status: 'excellent' | 'good' | 'warning' | 'critical';
    if (weightedScore >= 90) status = 'excellent';
    else if (weightedScore >= 75) status = 'good';
    else if (weightedScore >= 60) status = 'warning';
    else status = 'critical';

    return {
      score: Math.round(weightedScore),
      status,
      factors
    };
  }

  /**
   * Generate contract termination analysis
   */
  async analyzeTermination(contractId: number): Promise<{
    canTerminate: boolean;
    blockers: string[];
    financialImpact: number;
    assetReturns: string[];
    timeline: { step: string; daysRequired: number }[];
  }> {
    const [contract] = await db
      .select()
      .from(contracts)
      .where(eq(contracts.id, contractId));

    if (!contract) {
      throw new Error('Contract not found');
    }

    const blockers: string[] = [];
    const assetReturns: string[] = [];
    
    // Check for active service scopes
    const activeScopes = await db
      .select()
      .from(serviceScopes)
      .where(
        and(
          eq(serviceScopes.contractId, contractId),
          eq(serviceScopes.status, 'active')
        )
      );

    if (activeScopes.length > 0) {
      blockers.push(`${activeScopes.length} active service scope(s) must be completed first`);
    }

    // Calculate financial impact
    const metrics = await this.getContractMetrics(contractId);
    const remainingMonths = contract.endDate ? 
      Math.max(0, Math.ceil((contract.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30))) : 0;
    const financialImpact = metrics.monthlyRecurring * remainingMonths;

    // Termination timeline
    const timeline = [
      { step: 'Client notification (30 days notice)', daysRequired: 1 },
      { step: 'Service scope completion', daysRequired: 30 },
      { step: 'Asset return and inventory', daysRequired: 7 },
      { step: 'Final billing and reconciliation', daysRequired: 14 },
      { step: 'Knowledge transfer', daysRequired: 5 },
      { step: 'Contract closure', daysRequired: 3 }
    ];

    return {
      canTerminate: blockers.length === 0,
      blockers,
      financialImpact,
      assetReturns,
      timeline
    };
  }
}

export const contractLifecycleManager = new ContractLifecycleManager(); 