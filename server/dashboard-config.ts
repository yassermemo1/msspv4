// Dynamic Dashboard Module Configuration
// Step 1.2: Expose Safe Data Sources

export const DASHBOARD_ALLOWED_TABLES = [
  "clients",
  "contracts", 
  "services",
  "financial_transactions",
  "license_pools",
  "individual_licenses",
  "hardware_assets",
  "integrated_data",
  "data_sources"
];

// Allowed columns for each table to prevent sensitive data exposure
export const DASHBOARD_ALLOWED_COLUMNS: Record<string, string[]> = {
  clients: ["id", "name", "industry", "company_size", "status", "created_at"],
  contracts: ["id", "name", "start_date", "end_date", "total_value", "status", "created_at"],
  services: ["id", "name", "category", "delivery_model", "base_price", "pricing_unit"],
  financial_transactions: ["id", "amount", "transaction_type", "status", "transaction_date"],
  license_pools: ["id", "name", "vendor", "product_name", "total_licenses", "available_licenses"],
  individual_licenses: ["id", "name", "vendor", "product_name", "quantity", "status"],
  hardware_assets: ["id", "name", "type", "manufacturer", "model", "status"],
  integrated_data: ["id", "synced_at", "record_identifier"],
  data_sources: ["id", "name", "description", "is_active", "last_sync_at"]
};

// Allowed aggregation functions
export const ALLOWED_AGGREGATIONS = [
  "COUNT",
  "SUM", 
  "AVG",
  "MIN",
  "MAX"
];

// Widget type configurations
export interface WidgetConfig {
  fields?: string[];
  filters?: Array<{
    field: string;
    operator: string;
    value: any;
  }>;
  groupBy?: string;
  aggregation?: {
    function: string;
    field: string;
  };
  orderBy?: {
    field: string;
    direction: 'ASC' | 'DESC';
  };
  limit?: number;
}

// Validate widget configuration
export function validateWidgetConfig(dataSource: string, config: WidgetConfig): boolean {
  // Check if data source is allowed
  if (!DASHBOARD_ALLOWED_TABLES.includes(dataSource)) {
    return false;
  }

  const allowedColumns = DASHBOARD_ALLOWED_COLUMNS[dataSource];
  if (!allowedColumns) {
    return false;
  }

  // Validate fields
  if (config.fields) {
    for (const field of config.fields) {
      if (!allowedColumns.includes(field)) {
        return false;
      }
    }
  }

  // Validate filters
  if (config.filters) {
    for (const filter of config.filters) {
      if (!allowedColumns.includes(filter.field)) {
        return false;
      }
    }
  }

  // Validate groupBy
  if (config.groupBy && !allowedColumns.includes(config.groupBy)) {
    return false;
  }

  // Validate aggregation
  if (config.aggregation) {
    if (!ALLOWED_AGGREGATIONS.includes(config.aggregation.function)) {
      return false;
    }
    if (!allowedColumns.includes(config.aggregation.field)) {
      return false;
    }
  }

  // Validate orderBy
  if (config.orderBy && !allowedColumns.includes(config.orderBy.field)) {
    return false;
  }

  return true;
}

// Build safe SQL query from widget configuration
export function buildSafeQuery(dataSource: string, config: WidgetConfig): { query: string; params: any[] } {
  if (!validateWidgetConfig(dataSource, config)) {
    throw new Error('Invalid widget configuration');
  }

  const params: any[] = [];
  let query = '';

  // SELECT clause
  if (config.aggregation) {
    query += `SELECT ${config.aggregation.function}(${config.aggregation.field}) as value`;
    if (config.groupBy) {
      query += `, ${config.groupBy}`;
    }
  } else if (config.fields && config.fields.length > 0) {
    query += `SELECT ${config.fields.join(', ')}`;
  } else {
    query += 'SELECT *';
  }

  // FROM clause
  query += ` FROM ${dataSource}`;

  // WHERE clause
  if (config.filters && config.filters.length > 0) {
    const whereConditions = config.filters.map(filter => {
      params.push(filter.value);
      switch (filter.operator) {
        case '=':
        case '>':
        case '<':
        case '>=':
        case '<=':
        case '!=':
          return `${filter.field} ${filter.operator} $${params.length}`;
        case 'LIKE':
          return `${filter.field} LIKE $${params.length}`;
        case 'IN':
          return `${filter.field} IN ($${params.length})`;
        default:
          throw new Error(`Unsupported operator: ${filter.operator}`);
      }
    });
    query += ` WHERE ${whereConditions.join(' AND ')}`;
  }

  // GROUP BY clause
  if (config.groupBy) {
    query += ` GROUP BY ${config.groupBy}`;
  }

  // ORDER BY clause
  if (config.orderBy) {
    query += ` ORDER BY ${config.orderBy.field} ${config.orderBy.direction}`;
  }

  // LIMIT clause
  if (config.limit) {
    params.push(config.limit);
    query += ` LIMIT $${params.length}`;
  }

  return { query, params };
} 