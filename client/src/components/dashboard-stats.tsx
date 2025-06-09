import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Building, FileText, DollarSign, Server, Shield, AlertTriangle, CheckCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useCurrency } from "@/contexts/currency-context";
import { apiRequest } from "@/lib/api";

interface DashboardStats {
  totalClients: number;
  activeContracts: number;
  totalRevenue: number;
  pendingInvoices: number;
  hardwareAssets: number;
  teamMembers: number;
  activeServices: number;
  recentAlerts: number;
}

interface EnhancedDashboardResponse {
  overview: {
    totalClients: number;
    totalContracts: number;
    totalServices: number;
    activeContracts: string | number;
    totalRevenue: string | number;
  };
  // ... other properties we don't need for this component
}

export function DashboardStats() {
  const { user, isLoading: authLoading } = useAuth();
  const { format } = useCurrency();
  
  const { data: rawStats, isLoading, error } = useQuery<EnhancedDashboardResponse>({
    queryKey: ["/api/dashboard/stats", "ytd"],
    enabled: !!user && !authLoading,
    retry: 3,
    retryDelay: 1000,
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/dashboard/stats?timeRange=ytd');
      return res.json();
    },
  });

  // Transform the enhanced dashboard response to match the expected DashboardStats format
  const stats: DashboardStats | undefined = rawStats ? {
    totalClients: rawStats.overview.totalClients || 0,
    activeContracts: typeof rawStats.overview.activeContracts === 'string' 
      ? parseInt(rawStats.overview.activeContracts) || 0 
      : rawStats.overview.activeContracts || 0,
    totalRevenue: typeof rawStats.overview.totalRevenue === 'string' 
      ? parseFloat(rawStats.overview.totalRevenue) || 0 
      : rawStats.overview.totalRevenue || 0,
    pendingInvoices: 0, // Default value - can be enhanced later
    hardwareAssets: 0, // Default value - can be enhanced later  
    teamMembers: 0, // Default value - can be enhanced later
    activeServices: rawStats.overview.totalServices || 0,
    recentAlerts: 0, // Default value - can be enhanced later
  } : undefined;

  if (authLoading || isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Loading...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">--</div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-gray-500 py-8">
        <p>Unable to load dashboard statistics</p>
        <p className="text-sm mt-2">Please refresh the page or try again</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center text-gray-500 py-8">
        No dashboard data available
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Clients",
      value: stats.totalClients,
      icon: Building,
      description: "Active client accounts",
      trend: "+12% from last month"
    },
    {
      title: "Active Contracts",
      value: stats.activeContracts,
      icon: FileText,
      description: "Current service agreements",
      trend: "+5% from last month"
    },
    {
      title: "Monthly Revenue",
      value: format(stats.totalRevenue),
      icon: DollarSign,
      description: "Current month earnings",
      trend: "+8% from last month"
    },
    {
      title: "Pending Invoices",
      value: stats.pendingInvoices,
      icon: AlertTriangle,
      description: "Awaiting payment",
      trend: stats.pendingInvoices > 5 ? "High" : "Normal"
    },
    {
      title: "Hardware Assets",
      value: stats.hardwareAssets,
      icon: Server,
      description: "Managed devices",
      trend: "+3% from last month"
    },
    {
      title: "Team Members",
      value: stats.teamMembers,
      icon: Users,
      description: "Active staff",
      trend: "Stable"
    },
    {
      title: "Active Services",
      value: stats.activeServices,
      icon: Shield,
      description: "Running services",
      trend: "+2% from last month"
    },
    {
      title: "Security Alerts",
      value: stats.recentAlerts,
      icon: stats.recentAlerts > 10 ? AlertTriangle : CheckCircle,
      description: "Last 24 hours",
      trend: stats.recentAlerts > 10 ? "High" : "Normal"
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        const isAlert = stat.title.includes("Pending") || stat.title.includes("Alerts");
        const isHigh = stat.trend === "High" || (typeof stat.value === "number" && stat.value > 10 && isAlert);
        
        return (
          <Card key={index} className={isHigh ? "border-red-200 bg-red-50" : ""}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <Icon className={`h-4 w-4 ${isHigh ? "text-red-600" : "text-muted-foreground"}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${isHigh ? "text-red-600" : ""}`}>
                {stat.value}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.description}
              </p>
              <Badge 
                variant={isHigh ? "destructive" : "outline"} 
                className="mt-2 text-xs"
              >
                {stat.trend}
              </Badge>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}