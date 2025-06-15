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
import { ClientWidgetsManager } from "@/components/dashboard/client-widgets-manager";

export default function HomePage() {
  const { user } = useAuth();
  const { formatAmount } = useCurrency();
  const [, setLocation] = useLocation();
  const { widgetsWithData, refetch } = useDashboardWidgets();
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [showWidgetManager, setShowWidgetManager] = useState(false);
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
    // Responsive grid that adapts to screen size and card count
    if (cardCount === 1) return "grid grid-cols-1 max-w-sm mx-auto";
    if (cardCount === 2) return "grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto";
    if (cardCount === 3) return "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4";
    if (cardCount === 4) return "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4";
    if (cardCount <= 6) return "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4";
    return "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4";
  };

  return (
    <AppLayout title="Dashboard" subtitle="Welcome to your MSSP management platform">
      <div className="p-4 sm:p-6 space-y-6 sm:space-y-8">
        {/* Dashboard Cards */}
        {visibleCards.length > 0 && (
          <div className={`${getGridColsClass(visibleCards.length)} mb-6 sm:mb-8`}>
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
          <Card className="border-dashed border-2 border-gray-300 mb-6 sm:mb-8">
            <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12 px-4">
              <TrendingUp className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center">No Dashboard Cards</h3>
              <p className="text-gray-600 text-center mb-6 max-w-md text-sm sm:text-base">
                Your dashboard is empty. Click "Customize Dashboard" to add cards and metrics to track your business performance.
              </p>
              <Button onClick={() => setShowCustomizer(true)} className="w-full sm:w-auto">
                <Settings className="w-4 h-4 mr-2" />
                Customize Dashboard
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Integration Engine Widgets */}
        <div className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Integration Engine Widgets</h2>
              <p className="text-gray-600 text-sm sm:text-base">Real-time data from your integrated systems</p>
            </div>
            <Button 
              onClick={() => setShowWidgetManager(true)}
              variant="outline"
              className="w-full sm:w-auto"
            >
              <Settings className="w-4 h-4 mr-2" />
              Manage Widgets
            </Button>
          </div>

          <ClientWidgetsManager
            clientId={null}
            onWidgetUpdate={() => {
              // Refresh widgets if needed
            }}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Recent Clients */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-base sm:text-lg">
                <Building className="h-5 w-5 mr-2" />
                Recent Clients
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentClients.length > 0 ? (
                <div className="space-y-3 sm:space-y-4">
                  {recentClients.map((client) => (
                    <div key={client.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm sm:text-base truncate">{client.name}</p>
                        <p className="text-xs sm:text-sm text-gray-600 truncate">{client.industry}</p>
                      </div>
                      <div className="ml-3 flex-shrink-0">
                        <Badge variant={getStatusBadgeVariant(client.status)} className="text-xs">
                          {client.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-6 sm:py-8">
                  <p className="text-sm sm:text-base">No clients found. Add your first client to get started.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-base sm:text-lg">
                <DollarSign className="h-5 w-5 mr-2" />
                Recent Transactions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentTransactions.length > 0 ? (
                <div className="space-y-3 sm:space-y-4">
                  {recentTransactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm sm:text-base truncate">{transaction.description}</p>
                        <p className="text-xs sm:text-sm text-gray-600">
                          {new Date(transaction.transactionDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="ml-3 flex-shrink-0">
                        <span className={`font-medium text-sm sm:text-base ${
                          transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.type === 'income' ? '+' : '-'}${Math.abs(transaction.amount).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-6 sm:py-8">
                  <p className="text-sm sm:text-base">No recent transactions found.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Dashboard Customizer */}
        <EnhancedDashboard 
          className={showCustomizer ? "block" : "hidden"}
        />

        {/* Widget Manager Modal */}
        {showWidgetManager && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
              <div className="p-4 sm:p-6 border-b">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg sm:text-xl font-semibold">Widget Manager</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowWidgetManager(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="p-4 sm:p-6">
                <ClientWidgetsManager
                  clientId={null}
                  onWidgetUpdate={() => {
                    // Refresh widgets if needed
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}