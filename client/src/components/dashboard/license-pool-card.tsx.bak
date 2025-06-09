import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { useLocation } from 'wouter';
import { Package } from 'lucide-react';

interface LicensePoolStats {
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
  isActive: boolean;
}

interface LicensePoolSummary {
  totalPools: number;
  totalLicenses: number;
  totalAvailable: number;
  totalAssigned: number;
  healthyPools: number;
  warningPools: number;
  criticalPools: number;
  pools: LicensePoolStats[];
}

interface LicensePoolCardProps {
  className?: string;
  onClick?: () => void;
}

export function LicensePoolCard({ className, onClick }: LicensePoolCardProps) {
  const [, navigate] = useLocation();

  const { data: licensePoolSummary, isLoading } = useQuery<LicensePoolSummary>({
    queryKey: ['/api/license-pools/summary'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/license-pools/summary');
      return res.json();
    },
  });

  const handleCardClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate('/license-pools');
    }
  };

  if (isLoading) {
    return (
      <Card className={`cursor-pointer hover:shadow-lg transition-shadow ${className}`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">License Pools</CardTitle>
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

  const overallUtilization = licensePoolSummary?.totalLicenses 
    ? ((licensePoolSummary.totalAssigned / licensePoolSummary.totalLicenses) * 100)
    : 0;

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  return (
    <Card className={`cursor-pointer hover:shadow-lg transition-shadow ${className}`} onClick={handleCardClick}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">License Pools</CardTitle>
        <Package className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Main number */}
        <div className="text-2xl font-bold">
          {formatNumber(licensePoolSummary?.totalLicenses || 0)}
        </div>
        <div className="text-xs text-muted-foreground">Total licenses</div>
        
        {/* Utilization section */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Utilization</span>
            <span className="text-sm font-medium">{overallUtilization.toFixed(1)}%</span>
          </div>
          <Progress value={overallUtilization} className="h-1.5" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Available: {formatNumber(licensePoolSummary?.totalAvailable || 0)}</span>
            <span>Assigned: {formatNumber(licensePoolSummary?.totalAssigned || 0)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 