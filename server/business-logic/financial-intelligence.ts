import { db } from '../db';
import { 
  financialTransactions, 
  contracts, 
  clients, 
  serviceScopes, 
  services 
} from '../../shared/schema';
import { eq, and, gte, lte, sum, count, avg, desc, asc, sql, isNull } from 'drizzle-orm';

export interface RevenueMetrics {
  totalRevenue: number;
  recurringRevenue: number;
  oneTimeRevenue: number;
  growthRate: number;
  averageContractValue: number;
  customerLifetimeValue: number;
  churnRate: number;
}

export interface CashFlowForecast {
  month: string;
  projectedRevenue: number;
  projectedExpenses: number;
  netCashFlow: number;
  confidence: number;
}

export interface ClientProfitability {
  clientId: number;
  clientName: string;
  totalRevenue: number;
  totalCosts: number;
  profitMargin: number;
  profitability: 'highly_profitable' | 'profitable' | 'break_even' | 'loss_making';
  riskLevel: 'low' | 'medium' | 'high';
}

export interface ServicePerformance {
  serviceId: number;
  serviceName: string;
  category: string;
  totalRevenue: number;
  activeContracts: number;
  averageMargin: number;
  growthTrend: 'increasing' | 'stable' | 'declining';
  demandScore: number;
}

export interface FinancialAlert {
  type: 'payment_overdue' | 'low_cash_flow' | 'contract_at_risk' | 'high_churn_risk';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  actionRequired: string;
  impactAmount: number;
  clientId?: number;
  contractId?: number;
}

export class FinancialIntelligenceEngine {

  /**
   * Calculate comprehensive revenue metrics
   */
  async getRevenueMetrics(startDate: Date, endDate: Date): Promise<RevenueMetrics> {
    // Total revenue in period
    const revenueQuery = await db
      .select({
        totalRevenue: sum(financialTransactions.amount),
        transactionCount: count(financialTransactions.id)
      })
      .from(financialTransactions)
      .where(
        and(
          gte(financialTransactions.transactionDate, startDate),
          lte(financialTransactions.transactionDate, endDate),
          eq(financialTransactions.type, 'revenue')
        )
      );

    const totalRevenue = parseFloat(revenueQuery[0]?.totalRevenue?.toString() || '0');

    // Recurring vs one-time revenue
    const recurringQuery = await db
      .select({
        recurringRevenue: sum(financialTransactions.amount)
      })
      .from(financialTransactions)
      .where(
        and(
          gte(financialTransactions.transactionDate, startDate),
          lte(financialTransactions.transactionDate, endDate),
          eq(financialTransactions.type, 'revenue'),
          sql`${financialTransactions.description} ILIKE '%recurring%' OR ${financialTransactions.description} ILIKE '%monthly%'`
        )
      );

    const recurringRevenue = parseFloat(recurringQuery[0]?.recurringRevenue?.toString() || '0');
    const oneTimeRevenue = totalRevenue - recurringRevenue;

    // Calculate growth rate (compared to previous period)
    const previousStartDate = new Date(startDate);
    const periodLength = endDate.getTime() - startDate.getTime();
    previousStartDate.setTime(previousStartDate.getTime() - periodLength);
    const previousEndDate = new Date(startDate);

    const previousRevenueQuery = await db
      .select({
        totalRevenue: sum(financialTransactions.amount)
      })
      .from(financialTransactions)
      .where(
        and(
          gte(financialTransactions.transactionDate, previousStartDate),
          lte(financialTransactions.transactionDate, previousEndDate),
          eq(financialTransactions.type, 'revenue')
        )
      );

    const previousRevenue = parseFloat(previousRevenueQuery[0]?.totalRevenue?.toString() || '0');
    const growthRate = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;

    // Average contract value
    const contractValueQuery = await db
      .select({
        avgValue: avg(contracts.totalValue),
        contractCount: count(contracts.id)
      })
      .from(contracts)
      .where(eq(contracts.status, 'active'));

    const averageContractValue = parseFloat(contractValueQuery[0]?.avgValue?.toString() || '0');

    // Customer Lifetime Value (simplified calculation)
    const customerLifetimeValue = recurringRevenue * 24; // Assume 2-year average lifetime

    // Churn rate (simplified - contracts that ended in period)
    const endedContractsQuery = await db
      .select({
        endedCount: count(contracts.id)
      })
      .from(contracts)
      .where(
        and(
          gte(contracts.endDate, startDate),
          lte(contracts.endDate, endDate),
          eq(contracts.status, 'completed')
        )
      );

    const totalActiveQuery = await db
      .select({
        activeCount: count(contracts.id)
      })
      .from(contracts)
      .where(eq(contracts.status, 'active'));

    const endedContracts = endedContractsQuery[0]?.endedCount || 0;
    const activeContracts = totalActiveQuery[0]?.activeCount || 1;
    const churnRate = (endedContracts / (activeContracts + endedContracts)) * 100;

    return {
      totalRevenue,
      recurringRevenue,
      oneTimeRevenue,
      growthRate,
      averageContractValue,
      customerLifetimeValue,
      churnRate
    };
  }

  /**
   * Generate cash flow forecast for next 12 months
   */
  async generateCashFlowForecast(): Promise<CashFlowForecast[]> {
    const forecast: CashFlowForecast[] = [];
    const today = new Date();

    for (let i = 0; i < 12; i++) {
      const forecastDate = new Date(today);
      forecastDate.setMonth(forecastDate.getMonth() + i);
      const monthYear = forecastDate.toISOString().slice(0, 7); // YYYY-MM format

      // Project revenue from active contracts
      const contractRevenueQuery = await db
        .select({
          monthlyRevenue: sum(serviceScopes.monthlyValue)
        })
        .from(serviceScopes)
        .leftJoin(contracts, eq(serviceScopes.contractId, contracts.id))
        .where(
          and(
            eq(serviceScopes.status, 'active'),
            eq(contracts.status, 'active'),
            gte(contracts.endDate, forecastDate)
          )
        );

      const projectedRevenue = parseFloat(contractRevenueQuery[0]?.monthlyRevenue?.toString() || '0');

      // Estimate expenses (typically 60-70% of revenue for MSSP)
      const projectedExpenses = projectedRevenue * 0.65;
      const netCashFlow = projectedRevenue - projectedExpenses;

      // Confidence decreases over time
      const confidence = Math.max(0.95 - (i * 0.05), 0.5);

      forecast.push({
        month: monthYear,
        projectedRevenue,
        projectedExpenses,
        netCashFlow,
        confidence
      });
    }

    return forecast;
  }

  /**
   * Analyze client profitability
   */
  async analyzeClientProfitability(): Promise<ClientProfitability[]> {
    const clientProfitability: ClientProfitability[] = [];

    // Get all active clients with their revenue
    const clientRevenueQuery = await db
      .select({
        clientId: clients.id,
        clientName: clients.name,
        totalRevenue: sum(financialTransactions.amount)
      })
      .from(clients)
      .leftJoin(financialTransactions, eq(clients.id, financialTransactions.clientId))
      .where(
        and(
          isNull(clients.deletedAt),
          eq(clients.status, 'active'),
          eq(financialTransactions.type, 'revenue')
        )
      )
      .groupBy(clients.id, clients.name);

    for (const client of clientRevenueQuery) {
      const totalRevenue = parseFloat(client.totalRevenue?.toString() || '0');
      
      // Estimate costs (this would be more sophisticated in production)
      // For MSSP: typically includes staff time, infrastructure, licenses
      const totalCosts = totalRevenue * 0.6; // Simplified calculation
      const profitMargin = totalRevenue > 0 ? ((totalRevenue - totalCosts) / totalRevenue) * 100 : 0;

      let profitability: ClientProfitability['profitability'];
      let riskLevel: ClientProfitability['riskLevel'];

      if (profitMargin > 30) {
        profitability = 'highly_profitable';
        riskLevel = 'low';
      } else if (profitMargin > 15) {
        profitability = 'profitable';
        riskLevel = 'low';
      } else if (profitMargin > 0) {
        profitability = 'break_even';
        riskLevel = 'medium';
      } else {
        profitability = 'loss_making';
        riskLevel = 'high';
      }

      clientProfitability.push({
        clientId: client.clientId,
        clientName: client.clientName,
        totalRevenue,
        totalCosts,
        profitMargin,
        profitability,
        riskLevel
      });
    }

    return clientProfitability.sort((a, b) => b.profitMargin - a.profitMargin);
  }

  /**
   * Analyze service performance and profitability
   */
  async analyzeServicePerformance(): Promise<ServicePerformance[]> {
    const servicePerformance: ServicePerformance[] = [];

    // Get services with their revenue and contract data
    const serviceQuery = await db
      .select({
        serviceId: services.id,
        serviceName: services.name,
        category: services.category,
        totalRevenue: sum(serviceScopes.monthlyValue),
        activeContracts: count(serviceScopes.id)
      })
      .from(services)
      .leftJoin(serviceScopes, eq(services.id, serviceScopes.serviceId))
      .leftJoin(contracts, eq(serviceScopes.contractId, contracts.id))
      .where(
        and(
          eq(services.isActive, true),
          eq(serviceScopes.status, 'active'),
          eq(contracts.status, 'active')
        )
      )
      .groupBy(services.id, services.name, services.category);

    for (const service of serviceQuery) {
      const totalRevenue = parseFloat(service.totalRevenue?.toString() || '0') * 12; // Annualized
      const activeContracts = service.activeContracts || 0;
      
      // Estimate average margin for different service categories
      let averageMargin: number;
      switch (service.category?.toLowerCase()) {
        case 'monitoring':
          averageMargin = 45; // High margin - automated
          break;
        case 'consulting':
          averageMargin = 60; // Very high margin - expertise
          break;
        case 'support':
          averageMargin = 35; // Medium margin - staff intensive
          break;
        case 'infrastructure':
          averageMargin = 25; // Lower margin - hardware costs
          break;
        default:
          averageMargin = 40; // Default margin
      }

      // Simple growth trend analysis (would be more sophisticated in production)
      const demandScore = activeContracts * (totalRevenue / 100000); // Normalize to 0-100 scale
      const growthTrend: ServicePerformance['growthTrend'] = 
        demandScore > 10 ? 'increasing' : 
        demandScore > 5 ? 'stable' : 'declining';

      servicePerformance.push({
        serviceId: service.serviceId,
        serviceName: service.serviceName,
        category: service.category || 'uncategorized',
        totalRevenue,
        activeContracts,
        averageMargin,
        growthTrend,
        demandScore: Math.min(demandScore, 100)
      });
    }

    return servicePerformance.sort((a, b) => b.totalRevenue - a.totalRevenue);
  }

  /**
   * Generate financial alerts and warnings
   */
  async generateFinancialAlerts(): Promise<FinancialAlert[]> {
    const alerts: FinancialAlert[] = [];
    const today = new Date();

    // Check for overdue payments
    const overdueQuery = await db
      .select({
        clientId: financialTransactions.clientId,
        clientName: clients.name,
        amount: financialTransactions.amount,
        daysOverdue: sql<number>`EXTRACT(days FROM ${today} - ${financialTransactions.transactionDate})`
      })
      .from(financialTransactions)
      .leftJoin(clients, eq(financialTransactions.clientId, clients.id))
      .where(
        and(
          eq(financialTransactions.type, 'expense'), // Assuming negative for unpaid
          lte(financialTransactions.transactionDate, new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)) // 30 days ago
        )
      );

    for (const overdue of overdueQuery) {
      const daysOverdue = overdue.daysOverdue || 0;
      const amount = parseFloat(overdue.amount?.toString() || '0');
      
      alerts.push({
        type: 'payment_overdue',
        severity: daysOverdue > 60 ? 'critical' : daysOverdue > 30 ? 'high' : 'medium',
        title: `Payment Overdue: ${overdue.clientName}`,
        description: `Payment of $${amount.toLocaleString()} is ${daysOverdue} days overdue`,
        actionRequired: 'Contact client for payment collection',
        impactAmount: Math.abs(amount),
        clientId: overdue.clientId || undefined
      });
    }

    // Check for low cash flow projections
    const forecast = await this.generateCashFlowForecast();
    const lowCashFlowMonths = forecast.filter(f => f.netCashFlow < 50000); // Threshold

    if (lowCashFlowMonths.length > 0) {
      alerts.push({
        type: 'low_cash_flow',
        severity: lowCashFlowMonths.length > 3 ? 'critical' : 'high',
        title: 'Low Cash Flow Projected',
        description: `${lowCashFlowMonths.length} months with cash flow below $50K threshold`,
        actionRequired: 'Review expenses and accelerate collections',
        impactAmount: Math.abs(Math.min(...lowCashFlowMonths.map(m => m.netCashFlow)))
      });
    }

    // Check for at-risk contracts (simplified)
    const atRiskQuery = await db
      .select({
        contractId: contracts.id,
        contractName: contracts.name,
        clientName: clients.name,
        totalValue: contracts.totalValue,
        endDate: contracts.endDate
      })
      .from(contracts)
      .leftJoin(clients, eq(contracts.clientId, clients.id))
      .where(
        and(
          eq(contracts.status, 'active'),
          lte(contracts.endDate, new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000)), // 60 days from now
          eq(contracts.autoRenewal, false)
        )
      );

    for (const contract of atRiskQuery) {
      const totalValue = parseFloat(contract.totalValue?.toString() || '0');
      
      alerts.push({
        type: 'contract_at_risk',
        severity: 'high',
        title: `Contract Renewal Required: ${contract.clientName}`,
        description: `Contract "${contract.contractName}" expires soon and requires manual renewal`,
        actionRequired: 'Initiate renewal discussions with client',
        impactAmount: totalValue,
        clientId: contract.contractId,
        contractId: contract.contractId
      });
    }

    return alerts.sort((a, b) => {
      const severityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  /**
   * Generate executive financial summary
   */
  async generateExecutiveSummary(period: 'month' | 'quarter' | 'year' = 'month'): Promise<{
    revenue: RevenueMetrics;
    profitability: ClientProfitability[];
    forecast: CashFlowForecast[];
    alerts: FinancialAlert[];
    kpis: {
      name: string;
      value: number;
      trend: 'up' | 'down' | 'stable';
      target: number;
      unit: string;
    }[];
  }> {
    const today = new Date();
    let startDate: Date;

    switch (period) {
      case 'year':
        startDate = new Date(today.getFullYear(), 0, 1);
        break;
      case 'quarter':
        const quarter = Math.floor(today.getMonth() / 3);
        startDate = new Date(today.getFullYear(), quarter * 3, 1);
        break;
      default:
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    }

    const revenue = await this.getRevenueMetrics(startDate, today);
    const profitability = await this.analyzeClientProfitability();
    const forecast = await this.generateCashFlowForecast();
    const alerts = await this.generateFinancialAlerts();

    // Key Performance Indicators
    const kpis = [
      {
        name: 'Monthly Recurring Revenue',
        value: revenue.recurringRevenue,
        trend: revenue.growthRate > 0 ? 'up' as const : revenue.growthRate < 0 ? 'down' as const : 'stable' as const,
        target: revenue.recurringRevenue * 1.1, // 10% growth target
        unit: 'USD'
      },
      {
        name: 'Customer Churn Rate',
        value: revenue.churnRate,
        trend: revenue.churnRate < 5 ? 'up' as const : 'down' as const, // Lower is better
        target: 5, // 5% target
        unit: '%'
      },
      {
        name: 'Average Contract Value',
        value: revenue.averageContractValue,
        trend: 'stable' as const, // Would need historical data
        target: revenue.averageContractValue * 1.15, // 15% increase target
        unit: 'USD'
      },
      {
        name: 'Client Profitability',
        value: profitability.filter(p => p.profitability === 'highly_profitable').length,
        trend: 'stable' as const,
        target: profitability.length * 0.6, // 60% should be highly profitable
        unit: 'clients'
      }
    ];

    return {
      revenue,
      profitability: profitability.slice(0, 10), // Top 10 most profitable
      forecast: forecast.slice(0, 6), // Next 6 months
      alerts: alerts.slice(0, 5), // Top 5 alerts
      kpis
    };
  }
}

export const financialIntelligence = new FinancialIntelligenceEngine(); 