import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { useLocation } from 'wouter';
import { Package, XCircle } from 'lucide-react';

interface LicensePoolData {
  id: number;
  name: string;
  vendor: string;
  productName: string;
  licenseType: string;
  totalLicenses: number;
  availableLicenses: number;
  assignedLicenses: number;
  utilizationPercentage: number;
  status: 'healthy' | 'warning' | 'critical';
  renewalDate?: string;
  costPerLicense?: number;
  isActive: boolean;
  totalCost?: number;
}

interface IndividualLicensePoolCardProps {
  poolId: number;
  className?: string;
  onClick?: () => void;
}

export function IndividualLicensePoolCard({ poolId, className, onClick }: IndividualLicensePoolCardProps) {
  const [, navigate] = useLocation();

  const { data: poolData, isLoading } = useQuery<LicensePoolData>({
    queryKey: [`/api/license-pools/${poolId}/stats`],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/license-pools/${poolId}/stats`);
      return res.json();
    },
  });

  const handleViewDetails = () => {
    if (onClick) {
      onClick();
    } else {
      navigate(`/license-pools/${poolId}`);
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  if (isLoading) {
    return (
      <Card className={`cursor-pointer hover:shadow-lg transition-shadow ${className}`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Loading...</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!poolData) {
    return (
      <Card className={`cursor-pointer hover:shadow-lg transition-shadow ${className}`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pool Not Found</CardTitle>
          <XCircle className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            License pool data not available
          </div>
        </CardContent>
      </Card>
    );
  }

  const utilizationPercentage = poolData.utilizationPercentage || 0;

  return (
    <Card className={`cursor-pointer hover:shadow-lg transition-shadow ${className}`} onClick={handleViewDetails}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{poolData.licenseType}</CardTitle>
        <Package className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Main number */}
        <div className="text-2xl font-bold">
          {formatNumber(poolData.totalLicenses)}
        </div>
        <div className="text-xs text-muted-foreground">Total licenses</div>
        
        {/* Utilization section */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Utilization</span>
            <span className="text-sm font-medium">{utilizationPercentage.toFixed(1)}%</span>
          </div>
          <Progress value={utilizationPercentage} className="h-1.5" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Available: {formatNumber(poolData.availableLicenses)}</span>
            <span>Assigned: {formatNumber(poolData.assignedLicenses)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 