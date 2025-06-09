import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Settings, Trash2, Edit, BarChart3, Calendar, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AppLayout } from '@/components/layout/app-layout';

interface Dashboard {
  id: number;
  name: string;
  userId: number;
  createdAt: string;
  updatedAt: string;
  widgets?: any[];
}

export default function DashboardsPage() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDashboardName, setNewDashboardName] = useState('');

  // Fetch all dashboards
  const fetchDashboards = async () => {
    try {
      const response = await fetch('/api/dashboards');
      if (!response.ok) throw new Error('Failed to fetch dashboards');
      
      const data = await response.json();
      setDashboards(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load dashboards",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Create new dashboard
  const createDashboard = async () => {
    if (!newDashboardName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a dashboard name",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch('/api/dashboards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newDashboardName.trim()
        }),
      });

      if (!response.ok) throw new Error('Failed to create dashboard');

      const newDashboard = await response.json();
      setDashboards(prev => [...prev, newDashboard]);
      
      toast({
        title: "Success",
        description: "Dashboard created successfully",
      });
      
      setShowCreateModal(false);
      setNewDashboardName('');
      
      // Navigate to the new dashboard
      setLocation(`/dashboards/${newDashboard.id}`);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create dashboard",
        variant: "destructive"
      });
    }
  };

  // Delete dashboard
  const deleteDashboard = async (dashboardId: number) => {
    if (!confirm('Are you sure you want to delete this dashboard? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/dashboards/${dashboardId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete dashboard');

      setDashboards(prev => prev.filter(d => d.id !== dashboardId));
      
      toast({
        title: "Success",
        description: "Dashboard deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete dashboard",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchDashboards();
  }, []);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dynamic Dashboards</h1>
            <p className="text-gray-600">Create and manage your custom dashboards</p>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Dashboard
          </Button>
        </div>

        {/* Dashboards Grid */}
        {dashboards.length === 0 ? (
          <div className="text-center py-12">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No dashboards yet</h3>
            <p className="text-gray-600 mb-4">Get started by creating your first dashboard</p>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Dashboard
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(dashboards || []).map((dashboard) => (
              <Card key={dashboard.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{dashboard.name}</CardTitle>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLocation(`/dashboards/${dashboard.id}`);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteDashboard(dashboard.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardDescription>
                    {dashboard.widgets?.length || 0} widgets
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Created {new Date(dashboard.createdAt).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Last updated {new Date(dashboard.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <Button 
                    className="w-full mt-4"
                    onClick={() => setLocation(`/dashboards/${dashboard.id}`)}
                  >
                    Open Dashboard
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create Dashboard Modal */}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="max-w-md max-h-[85vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>Create New Dashboard</DialogTitle>
              <DialogDescription>
                Give your dashboard a name to get started
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="dashboardName">Dashboard Name</Label>
                <Input
                  id="dashboardName"
                  value={newDashboardName}
                  onChange={(e) => setNewDashboardName(e.target.value)}
                  placeholder="e.g., Sales Overview, Client Analytics"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      createDashboard();
                    }
                  }}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewDashboardName('');
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={createDashboard}>
                  Create Dashboard
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
} 