import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart, 
  LineChart, 
  PieChart, 
  TrendingUp, 
  Download, 
  Calendar,
  DollarSign,
  Users,
  Building
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ReportsPage() {
  const { toast } = useToast();

  // Export functions
  const exportRevenueAnalysis = async () => {
    toast({
      title: "Export Started",
      description: "Revenue Analysis report is being generated..."
    });
    
    try {
      const response = await fetch('/api/reports/revenue-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          format: 'xlsx',
          dateRange: 'last_12_months'
        })
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `revenue-analysis-${new Date().toISOString().split('T')[0]}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        toast({
          title: "Export Complete",
          description: "Revenue Analysis report has been downloaded."
        });
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Could not generate revenue analysis report.",
        variant: "destructive"
      });
    }
  };

  const exportInvoiceSummary = async () => {
    toast({
      title: "Export Started", 
      description: "Invoice Summary report is being generated..."
    });
    
    try {
      const response = await fetch('/api/reports/invoice-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          format: 'xlsx',
          dateRange: 'current_year'
        })
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-summary-${new Date().toISOString().split('T')[0]}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        toast({
          title: "Export Complete",
          description: "Invoice Summary report has been downloaded."
        });
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Could not generate invoice summary report.",
        variant: "destructive"
      });
    }
  };

  const exportPaymentHistory = async () => {
    toast({
      title: "Export Started",
      description: "Payment History report is being generated..."
    });
    
    try {
      const response = await fetch('/api/reports/payment-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          format: 'xlsx',
          dateRange: 'last_24_months'
        })
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `payment-history-${new Date().toISOString().split('T')[0]}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        toast({
          title: "Export Complete", 
          description: "Payment History report has been downloaded."
        });
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Could not generate payment history report.",
        variant: "destructive"
      });
    }
  };

  const exportClientReports = async () => {
    toast({
      title: "Export Started",
      description: "Client Reports are being generated..."
    });
    
    try {
      const response = await fetch('/api/reports/client-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          format: 'xlsx',
          includeContacts: true,
          includeContracts: true,
          includeServices: true
        })
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `client-reports-${new Date().toISOString().split('T')[0]}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        toast({
          title: "Export Complete",
          description: "Client Reports have been downloaded."
        });
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Could not generate client reports.",
        variant: "destructive"
      });
    }
  };

  const exportContractReports = async () => {
    toast({
      title: "Export Started",
      description: "Contract Reports are being generated..."
    });
    
    try {
      const response = await fetch('/api/reports/contract-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          format: 'xlsx',
          includeFinancials: true,
          includeRenewals: true
        })
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `contract-reports-${new Date().toISOString().split('T')[0]}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        toast({
          title: "Export Complete",
          description: "Contract Reports have been downloaded."
        });
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Could not generate contract reports.",
        variant: "destructive"
      });
    }
  };

  const exportServiceReports = async () => {
    toast({
      title: "Export Started",
      description: "Service Reports are being generated..."
    });
    
    try {
      const response = await fetch('/api/reports/service-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          format: 'xlsx',
          includePerformance: true,
          includeSLA: true
        })
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `service-reports-${new Date().toISOString().split('T')[0]}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        toast({
          title: "Export Complete",
          description: "Service Reports have been downloaded."
        });
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Could not generate service reports.",
        variant: "destructive"
      });
    }
  };

  const exportOperationalReports = async () => {
    toast({
      title: "Export Started",
      description: "Operational Reports are being generated..."
    });
    
    try {
      const response = await fetch('/api/reports/operational-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          format: 'xlsx',
          includeMetrics: true,
          includeTeamPerformance: true
        })
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `operational-reports-${new Date().toISOString().split('T')[0]}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        toast({
          title: "Export Complete",
          description: "Operational Reports have been downloaded."
        });
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Could not generate operational reports.",
        variant: "destructive"
      });
    }
  };

  const exportSecurityReports = async () => {
    toast({
      title: "Export Started",
      description: "Security Reports are being generated..."
    });
    
    try {
      const response = await fetch('/api/reports/security-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          format: 'xlsx',
          includeIncidents: true,
          includeCompliance: true
        })
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `security-reports-${new Date().toISOString().split('T')[0]}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        toast({
          title: "Export Complete",
          description: "Security Reports have been downloaded."
        });
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Could not generate security reports.",
        variant: "destructive"
      });
    }
  };

  const exportComplianceReports = async () => {
    toast({
      title: "Export Started",
      description: "Compliance Reports are being generated..."
    });
    
    try {
      const response = await fetch('/api/reports/compliance-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          format: 'xlsx',
          includeAudits: true,
          includeCertifications: true
        })
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `compliance-reports-${new Date().toISOString().split('T')[0]}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        toast({
          title: "Export Complete",
          description: "Compliance Reports have been downloaded."
        });
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Could not generate compliance reports.",
        variant: "destructive"
      });
    }
  };

  // Report action handlers
  const handleViewReport = (reportId: string) => {
    // Navigate to detailed report view
    window.location.href = `/reports/${reportId}`;
  };

  const handleEditReport = (reportId: string) => {
    // Navigate to report editor
    window.location.href = `/reports/${reportId}/edit`;
  };

  const handleDeleteReport = async (reportId: string) => {
    if (confirm('Are you sure you want to delete this report?')) {
      try {
        const response = await fetch(`/api/reports/${reportId}`, {
          method: 'DELETE',
          credentials: 'include'
        });
        
        if (response.ok) {
          toast({
            title: "Report Deleted",
            description: `Report ${reportId} has been deleted.`
          });
          // Refresh the page or update state
          window.location.reload();
        } else {
          throw new Error('Delete failed');
        }
      } catch (error) {
        toast({
          title: "Delete Failed",
          description: "Could not delete the report.",
          variant: "destructive"
        });
      }
    }
  };

  return (
    <AppLayout 
      title="Reports & Analytics" 
      subtitle="Generate comprehensive reports and analytics"
    >
      <main className="flex-1 overflow-auto p-6 pt-16 md:pt-6">
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$45,231.89</div>
                <p className="text-xs text-muted-foreground">
                  +20.1% from last month
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Clients</CardTitle>
                <Building className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">12</div>
                <p className="text-xs text-muted-foreground">
                  +2 new this month
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Contracts</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">8</div>
                <p className="text-xs text-muted-foreground">
                  +3 this quarter
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Team Members</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">6</div>
                <p className="text-xs text-muted-foreground">
                  Full team capacity
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Report Categories */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart className="h-5 w-5 mr-2" />
                  Financial Reports
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Revenue Analysis</span>
                  <Button size="sm" variant="outline" onClick={exportRevenueAnalysis}>
                    <Download className="h-4 w-4 mr-1" />
                    Export
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Invoice Summary</span>
                  <Button size="sm" variant="outline" onClick={exportInvoiceSummary}>
                    <Download className="h-4 w-4 mr-1" />
                    Export
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Payment History</span>
                  <Button size="sm" variant="outline" onClick={exportPaymentHistory}>
                    <Download className="h-4 w-4 mr-1" />
                    Export
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChart className="h-5 w-5 mr-2" />
                  Client Reports
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Client Portfolio</span>
                  <Button size="sm" variant="outline" onClick={exportClientReports}>
                    <Download className="h-4 w-4 mr-1" />
                    Export
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Service Utilization</span>
                  <Button size="sm" variant="outline" onClick={exportServiceReports}>
                    <Download className="h-4 w-4 mr-1" />
                    Export
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Contract Status</span>
                  <Button size="sm" variant="outline" onClick={exportContractReports}>
                    <Download className="h-4 w-4 mr-1" />
                    Export
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <LineChart className="h-5 w-5 mr-2" />
                  Security Reports
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Incident Summary</span>
                  <Button size="sm" variant="outline" onClick={exportSecurityReports}>
                    <Download className="h-4 w-4 mr-1" />
                    Export
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Threat Analysis</span>
                  <Button size="sm" variant="outline" onClick={exportSecurityReports}>
                    <Download className="h-4 w-4 mr-1" />
                    Export
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Compliance Report</span>
                  <Button size="sm" variant="outline" onClick={exportComplianceReports}>
                    <Download className="h-4 w-4 mr-1" />
                    Export
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Reports */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="font-medium">Monthly Financial Summary - December 2024</p>
                      <p className="text-sm text-gray-500">Generated on Dec 31, 2024</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary">Financial</Badge>
                    <Button size="sm" variant="ghost" onClick={() => handleViewReport('financial-q4-2024')}>
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="font-medium">Client Service Analysis - Q4 2024</p>
                      <p className="text-sm text-gray-500">Generated on Dec 28, 2024</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary">Client</Badge>
                    <Button size="sm" variant="ghost" onClick={() => handleViewReport('client-service-q4-2024')}>
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="font-medium">Security Incident Report - December</p>
                      <p className="text-sm text-gray-500">Generated on Dec 25, 2024</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary">Security</Badge>
                    <Button size="sm" variant="ghost" onClick={() => handleViewReport('security-incident-dec-2024')}>
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </AppLayout>
  );
}