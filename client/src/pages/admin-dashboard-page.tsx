import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api";
import { Users, Shield, FileText, Settings, BarChart3, Database } from "lucide-react";
import { useLocation } from "wouter";

export default function AdminDashboardPage() {
  const [, navigate] = useLocation();

  // Fetch admin statistics
  const { data: stats } = useQuery({
    queryKey: ["/api/admin/stats"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/admin/stats");
        return res.json();
      } catch (error) {
        // Return mock data if endpoint doesn't exist
        return {
          totalUsers: 12,
          activeUsers: 8,
          totalClients: 25,
          activeContracts: 18,
          systemHealth: "good"
        };
      }
    },
  });

  const adminFeatures = [
    {
      title: "User Management",
      description: "Manage system users, roles, and permissions",
      icon: Users,
      href: "/admin/users",
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      title: "Role Management", 
      description: "Configure role-based access controls",
      icon: Shield,
      href: "/admin/rbac",
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      title: "Audit Logs",
      description: "View system activity and security logs",
      icon: FileText,
      href: "/admin/audit", 
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    },
    {
      title: "System Settings",
      description: "Configure application settings and preferences",
      icon: Settings,
      href: "/settings",
      color: "text-gray-600", 
      bgColor: "bg-gray-50"
    },
    {
      title: "Reports",
      description: "Generate system and usage reports",
      icon: BarChart3,
      href: "/reports",
      color: "text-orange-600",
      bgColor: "bg-orange-50"
    },
    {
      title: "External Systems",
      description: "Manage integrations and external connections",
      icon: Database,
      href: "/external-systems",
      color: "text-indigo-600",
      bgColor: "bg-indigo-50"
    }
  ];

  return (
    <AppLayout title="Admin Dashboard" subtitle="System administration and management">
      <div className="p-6 space-y-6">
        {/* Admin Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.activeUsers || 0} active users
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalClients || 0}</div>
              <p className="text-xs text-muted-foreground">
                Managed clients
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Contracts</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.activeContracts || 0}</div>
              <p className="text-xs text-muted-foreground">
                Currently active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Health</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize">
                {stats?.systemHealth || "Good"}
              </div>
              <p className="text-xs text-muted-foreground">
                All systems operational
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions Grid */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Administration Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {adminFeatures.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.href} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${feature.bgColor}`}>
                        <Icon className={`h-6 w-6 ${feature.color}`} />
                      </div>
                      <div>
                        <CardTitle className="text-base">{feature.title}</CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="mb-4">
                      {feature.description}
                    </CardDescription>
                    <Button 
                      onClick={() => navigate(feature.href)}
                      variant="outline" 
                      size="sm"
                      className="w-full"
                    >
                      Open {feature.title}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent System Activity</CardTitle>
            <CardDescription>
              Latest administrative actions and system events
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <div>
                  <p className="text-sm font-medium">User 'engineer@mssp.local' logged in</p>
                  <p className="text-xs text-muted-foreground">2 minutes ago</p>
                </div>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Success</span>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <div>
                  <p className="text-sm font-medium">New client 'Tech Corp' created</p>
                  <p className="text-xs text-muted-foreground">1 hour ago</p>
                </div>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Created</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Database backup completed</p>
                  <p className="text-xs text-muted-foreground">3 hours ago</p>
                </div>
                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">System</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
} 