import { useQuery } from "@tanstack/react-query";
import { Client, Contract, FinancialTransaction } from "@shared/schema";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DashboardCustomizer } from "@/components/dashboard/dashboard-customizer";
import { DynamicDashboardCard } from "@/components/dashboard/dynamic-dashboard-card";
import { useDashboardSettings } from "@/hooks/use-dashboard-settings";
import { DashboardWidget } from "@/components/ui/dashboard-widget";
import { useDashboardWidgets } from "@/hooks/use-integrated-data";
import { 
  TrendingUp, 
  Users, 
  Building, 
  DollarSign, 
  Zap, 
  Plus, 
  Settings,
  X
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useCurrency } from "@/contexts/currency-context";
import { useLocation } from "wouter";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from '@/lib/utils';

export default function HomePage() {
  const { user } = useAuth();
  const { formatAmount } = useCurrency();
  const [, setLocation] = useLocation();
  const { widgetsWithData, refetch } = useDashboardWidgets();
  const [showCustomizer, setShowCustomizer] = useState(false);
  const { toast } = useToast();
  
  // Dashboard settings hook for customizable cards
  const {
    cards,
    updateCards,
    saveSettings,
    resetToDefaults
  } = useDashboardSettings();

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: contracts = [] } = useQuery<Contract[]>({
    queryKey: ["/api/contracts"],
  });

  const { data: financialTransactions = [] } = useQuery<FinancialTransaction[]>({
    queryKey: ["/api/financial-transactions"],
  });

  // Ensure arrays are always defined before slicing
  const recentClients = (clients || []).slice(0, 5);
  const recentTransactions = (financialTransactions || []).slice(0, 5);

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "default";
      case "prospect":
        return "default";
      case "inactive":
        return "destructive";
      default:
        return "default";
    }
  };

  const getClientName = (clientId: number | null) => {
    if (!clientId) return "N/A";
    const client = (clients || []).find(c => c.id === clientId);
    return client ? client.name : "Unknown Client";
  };
const handleSaveDashboard = () => {
    saveSettings();
    toast({
      title: "Success",
      description: "Dashboard settings saved successfully!",
    });
    setShowCustomizer(false);
  };

  const handleResetDashboard = () => {
    resetToDefaults();
    toast({
      title: "Info",
      description: "Dashboard reset to default settings",
    });
  };

  const handleCardClick = (card: any) => {
    // Navigate to relevant page based on card type
    const navigationMap: Record<string, string> = {
      'clients': '/clients',
      'contracts': '/contracts',
      'users': '/admin/team',
      'license_pools': '/license-pools',
      'hardware_assets': '/hardware-assets',
      'services': '/admin/services',
      'tasks': '/tasks'
    };

    const path = navigationMap[card.dataSource];
    if (path) {
      setLocation(path);
    }
  };

  // Filter visible cards and sort by position
  const visibleCards = cards
    .filter(card => card.visible)
    .sort((a, b) => a.position - b.position);

  // Get grid class based on number of visible cards
  const getGridColsClass = (cardCount: number) => {
    if (cardCount === 1) return "grid-cols-1";
    if (cardCount === 2) return "grid-cols-1 md:grid-cols-2";
    if (cardCount === 3) return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
    if (cardCount === 4) return "grid-cols-1 md:grid-cols-2 lg:grid-cols-4";
    if (cardCount === 5) return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5";
    if (cardCount >= 6) return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6";
    return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
  };

  return (
    <AppLayout 
      title={`Welcome back, ${user?.firstName || 'User'}!`} 
      subtitle="Here's what's happening with your clients today"
    >
      <main className="flex-1 overflow-auto p-6 pt-16 md:pt-6">
        {/* Dashboard Header with Customize Button */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Dashboard Overview</h2>
            <p className="text-gray-600">Monitor your business metrics and performance</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetDashboard}
            >
              Reset to Default
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCustomizer(!showCustomizer)}
            >
              <Settings className="w-4 h-4 mr-2" />
              {showCustomizer ? 'Hide Customizer' : 'Customize Dashboard'}
            </Button>
          </div>
        </div>

        {/* Dashboard Customizer */}
        {showCustomizer && (
          <Card className="mb-6 border-blue-200 bg-blue-50">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Dashboard Customizer</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCustomizer(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <DashboardCustomizer
                cards={cards}
                onCardsChange={updateCards}
                onSave={handleSaveDashboard}
              />
            </CardContent>
          </Card>
        )}

        {/* Dynamic Dashboard Cards */}
        {visibleCards.length > 0 && (
          <div className={`grid ${getGridColsClass(visibleCards.length)} gap-4 mb-8`}>
            {visibleCards.map((card) => (
              <DynamicDashboardCard
                key={card.id}
                card={card}
                onClick={() => handleCardClick(card)}
              />
            ))}
          </div>
        )}

        {/* No Cards State */}
        {visibleCards.length === 0 && (
          <Card className="border-dashed border-2 border-gray-300 mb-8">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <TrendingUp className="w-12 h-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Dashboard Cards</h3>
              <p className="text-gray-600 text-center mb-6 max-w-md">
                Your dashboard is empty. Click "Customize Dashboard" to add cards and metrics to track your business performance.
              </p>
              <Button onClick={() => setShowCustomizer(true)}>
                <Settings className="w-4 h-4 mr-2" />
                Customize Dashboard
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Integration Engine Widgets */}
        {widgetsWithData.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Integration Widgets</h2>
                <p className="text-gray-600">Data from your connected external sources</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetch()}
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Refresh Data
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLocation('/integration-engine')}
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Manage Widgets
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {widgetsWithData.map(({ widget, data, loading }) => (
                <DashboardWidget
                  key={widget.id}
                  widget={widget}
                  data={data}
                  className={loading ? "opacity-50" : ""}
                />
              ))}
            </div>
          </div>
        )}

        {/* No Widgets State */}
        {widgetsWithData.length === 0 && (
          <div className="mt-8">
            <Card className="border-dashed border-2 border-gray-300">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Zap className="w-12 h-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Integration Widgets</h3>
                <p className="text-gray-600 text-center mb-6 max-w-md">
                  Create widgets from your integrated data sources to display real-time information on your dashboard.
                </p>
                <Button onClick={() => setLocation('/integration-engine')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Widget
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Clients */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building className="h-5 w-5 mr-2" />
                Recent Clients
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentClients.length > 0 ? (
                <div className="space-y-4">
                  {recentClients.map((client) => (
                    <div key={client.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{client.name}</p>
                        <p className="text-sm text-gray-600">{client.industry}</p>
                      </div>
                      <Badge variant={getStatusBadgeVariant(client.status)}>
                        {client.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  No clients found. Add your first client to get started.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="h-5 w-5 mr-2" />
                Recent Transactions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentTransactions.length > 0 ? (
                <div className="space-y-4">
                  {recentTransactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{transaction.description}</p>
                        <p className="text-sm text-gray-600">{getClientName(transaction.clientId)}</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${transaction.type === 'revenue' ? 'text-green-600' : 'text-red-600'}`}>
                          {transaction.type === 'revenue' ? '+' : '-'}{formatAmount(transaction.amount)}
                        </p>
                        <p className="text-xs text-gray-500">{formatDate(transaction.transactionDate)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  No recent transactions found.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </AppLayout>
  );
}