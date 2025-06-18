import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ExternalLink, Eye, Calendar, DollarSign, Building, FileText, Users } from 'lucide-react';
import { useLocation } from 'wouter';
import { formatDate } from '@/lib/utils';

interface DrillDownTableProps {
  data: {
    cardTitle?: string;
    cardType?: string;
    dataSource?: string;
    items?: any[];
    summary?: {
      total?: number;
      filtered?: number;
      [key: string]: any;
    };
    columns?: Array<{
      key: string;
      label: string;
      type?: 'text' | 'number' | 'currency' | 'date' | 'badge' | 'link';
      format?: string;
    }>;
  };
}

export function DrillDownTable({ data }: DrillDownTableProps) {
  const [, setLocation] = useLocation();

  if (!data) {
    return (
      <div className="text-center py-8 text-gray-500">
        <div>No data available</div>
      </div>
    );
  }

  const { items = [], summary = {}, columns = [], cardType, dataSource } = data;

  // Auto-generate columns if not provided
  const displayColumns = columns.length > 0 ? columns : generateColumnsFromData(items, dataSource);

  const formatCellValue = (value: any, column: any) => {
    if (value === null || value === undefined) return '-';

    switch (column.type) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD'
        }).format(Number(value) || 0);
      
      case 'date':
        return formatDate(value);
      
      case 'number':
        return Number(value).toLocaleString();
      
      case 'badge':
        return <Badge variant={getBadgeVariant(value)}>{value}</Badge>;
      
      case 'link':
        return (
          <Button
            variant="link"
            className="p-0 h-auto text-blue-600"
            onClick={() => handleNavigation(column.key, value)}
          >
            {value}
          </Button>
        );
      
      default:
        return String(value);
    }
  };

  const getBadgeVariant = (value: string) => {
    const val = value?.toLowerCase();
    if (['active', 'completed', 'approved'].includes(val)) return 'default';
    if (['pending', 'in_progress'].includes(val)) return 'secondary';
    if (['expired', 'rejected', 'cancelled'].includes(val)) return 'destructive';
    return 'outline';
  };

  const handleNavigation = (key: string, value: any) => {
    // Smart navigation based on column type and data source
    if (key.includes('client') || key.includes('Client')) {
      setLocation(`/clients/${value}`);
    } else if (key.includes('contract') || key.includes('Contract')) {
      setLocation(`/contracts/${value}`);
    } else if (key.includes('service') || key.includes('Service')) {
      setLocation(`/services/${value}`);
    } else if (key.includes('asset') || key.includes('Asset')) {
      setLocation(`/assets/${value}`);
    } else {
      // Generic navigation
      setLocation(`/${dataSource}/${value}`);
    }
  };

  const handleRowClick = (item: any) => {
    if (item.id) {
      const route = getEntityRoute(dataSource, item.id);
      setLocation(route);
    }
  };

  const getEntityRoute = (source: string | undefined, id: number) => {
    if (!source) return '/';
    switch (source) {
      case 'clients': return `/clients/${id}`;
      case 'contracts': return `/contracts/${id}`;
      case 'services': return `/services/${id}`;
      case 'hardware_assets': return `/assets/${id}`;
      case 'license_pools': return `/license-pools/${id}`;
      case 'financial_transactions': return `/financial/${id}`;
      case 'users': return `/team/${id}`;
      default: return `/${source}/${id}`;
    }
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          {getDataSourceIcon(dataSource)}
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No data found</h3>
        <p className="text-gray-600">
          No records match the current filters and time range.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Statistics */}
      {summary && Object.keys(summary).length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {Object.entries(summary).map(([key, value]) => (
            <Card key={key}>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-600">
                  {typeof value === 'number' ? value.toLocaleString() : value}
                </div>
                <div className="text-sm text-gray-600 capitalize">
                  {key.replace(/_/g, ' ')}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Data Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              {displayColumns.map((column) => (
                <TableHead key={column.key} className="font-semibold">
                  {column.label}
                </TableHead>
              ))}
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, index) => (
              <TableRow 
                key={item.id || index}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => handleRowClick(item)}
              >
                {displayColumns.map((column) => (
                  <TableCell key={column.key}>
                    {formatCellValue(item[column.key], column)}
                  </TableCell>
                ))}
                <TableCell>
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRowClick(item);
                      }}
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(getEntityRoute(dataSource, item.id), '_blank');
                      }}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Footer */}
      <div className="text-sm text-gray-600 text-center pt-4">
        Showing {items.length} record{items.length !== 1 ? 's' : ''}
        {summary?.total && summary.total !== items.length && 
          ` of ${summary.total} total`
        }
      </div>
    </div>
  );
}

function generateColumnsFromData(items: any[], dataSource?: string) {
  if (!items || items.length === 0) return [];

  const sampleItem = items[0];
  const columns: Array<{
    key: string;
    label: string;
    type: string;
  }> = [];

  // Define priority columns for each data source
  const priorityColumns: Record<string, string[]> = {
    clients: ['name', 'industry', 'status', 'createdAt'],
    contracts: ['name', 'clientName', 'status', 'startDate', 'endDate', 'totalValue'],
    services: ['name', 'type', 'price', 'status'],
    hardware_assets: ['name', 'category', 'manufacturer', 'model', 'status'],
    license_pools: ['name', 'vendor', 'productName', 'totalLicenses', 'usedLicenses'],
    financial_transactions: ['amount', 'type', 'date', 'status', 'clientName'],
    users: ['username', 'email', 'role', 'status']
  };

  const priority = priorityColumns[dataSource || ''] || Object.keys(sampleItem).slice(0, 6);

  priority.forEach(key => {
    if (sampleItem.hasOwnProperty(key)) {
      columns.push({
        key,
        label: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
        type: getColumnType(key, sampleItem[key])
      });
    }
  });

  return columns;
}

function getColumnType(key: string, value: any) {
  if (key.toLowerCase().includes('date')) return 'date';
  if (key.toLowerCase().includes('amount') || key.toLowerCase().includes('value') || key.toLowerCase().includes('price')) return 'currency';
  if (key.toLowerCase().includes('status')) return 'badge';
  if (key.toLowerCase().includes('name') && key.toLowerCase().includes('client')) return 'link';
  if (typeof value === 'number') return 'number';
  return 'text';
}

function getDataSourceIcon(dataSource?: string) {
  switch (dataSource) {
    case 'clients': return <Building className="h-8 w-8 text-gray-400" />;
    case 'contracts': return <FileText className="h-8 w-8 text-gray-400" />;
    case 'financial_transactions': return <DollarSign className="h-8 w-8 text-gray-400" />;
    case 'users': return <Users className="h-8 w-8 text-gray-400" />;
    default: return <Calendar className="h-8 w-8 text-gray-400" />;
  }
} 