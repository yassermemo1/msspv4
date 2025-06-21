import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RefreshCw, CheckCircle, XCircle, Clock, Users, Activity, FileText, AlertTriangle } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function MDRSyncPage() {
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  // Fetch sync status
  const { data: syncStatus, refetch: refetchStatus } = useQuery({
    queryKey: ["mdr-sync-status"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/mdr-sync/status");
      return response.json();
    },
    refetchInterval: 5000, // Refresh every 5 seconds when syncing
  });

  // Manual sync mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/mdr-sync/trigger");
      return response.json();
    },
    onMutate: () => {
      setIsSyncing(true);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "MDR sync started successfully. This may take a few minutes.",
      });
      refetchStatus();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to start MDR sync. Please try again.",
        variant: "destructive",
      });
      setIsSyncing(false);
    },
    onSettled: () => {
      setTimeout(() => {
        setIsSyncing(false);
        refetchStatus();
      }, 5000);
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge className="bg-green-100 text-green-800">Success</Badge>;
      case "partial":
        return <Badge className="bg-yellow-100 text-yellow-800">Partial Success</Badge>;
      case "failed":
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
      case "running":
        return <Badge className="bg-blue-100 text-blue-800">Running</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  return (
    <AppLayout
      title="MDR Sync Management"
      subtitle="Monitor and manage client data synchronization from MDR API"
    >
      <div className="space-y-6">
        {/* Sync Status Overview */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Sync Status</CardTitle>
              <Button
                onClick={() => syncMutation.mutate()}
                disabled={isSyncing || syncStatus?.isRunning}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? "animate-spin" : ""}`} />
                {isSyncing || syncStatus?.isRunning ? "Syncing..." : "Sync Now"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {syncStatus ? (
              <div className="space-y-4">
                {/* Last Sync Info */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Last Sync</p>
                    <p className="font-medium">
                      {syncStatus.lastSync
                        ? format(new Date(syncStatus.lastSync), "MMM dd, yyyy HH:mm")
                        : "Never"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <div className="mt-1">{getStatusBadge(syncStatus.status)}</div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Duration</p>
                    <p className="font-medium">
                      {syncStatus.duration ? formatDuration(syncStatus.duration) : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Next Sync</p>
                    <p className="font-medium">
                      {syncStatus.nextSync
                        ? format(new Date(syncStatus.nextSync), "HH:mm")
                        : "Hourly"}
                    </p>
                  </div>
                </div>

                {/* Sync Results */}
                {syncStatus.lastSync && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-3">Last Sync Results</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Created</p>
                          <p className="text-xl font-semibold">{syncStatus.created || 0}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Activity className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Updated</p>
                          <p className="text-xl font-semibold">{syncStatus.updated || 0}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                          <XCircle className="h-5 w-5 text-red-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Errors</p>
                          <p className="text-xl font-semibold">{syncStatus.errors || 0}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No sync data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sync Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2 text-blue-600" />
                What Gets Synced
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5" />
                  <div>
                    <span className="font-medium">Client Information</span>
                    <p className="text-sm text-gray-600">Name, short name, domain, status</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5" />
                  <div>
                    <span className="font-medium">License Assignments</span>
                    <p className="text-sm text-gray-600">SIEM EPS and EDR endpoint counts</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5" />
                  <div>
                    <span className="font-medium">Service Scopes</span>
                    <p className="text-sm text-gray-600">Contract scope and endpoint statistics</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5" />
                  <div>
                    <span className="font-medium">MDR Visibility Data</span>
                    <p className="text-sm text-gray-600">Online/offline endpoints, workstations, servers</p>
                  </div>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2 text-purple-600" />
                Sync Schedule
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertDescription>
                    Automatic sync runs every hour to keep client data up-to-date with MDR Portal.
                  </AlertDescription>
                </Alert>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Frequency</span>
                    <span className="font-medium">Every 1 hour</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Initial Sync Delay</span>
                    <span className="font-medium">1 minute after startup</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Batch Size</span>
                    <span className="font-medium">50 tenants per batch</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">API Rate Limit</span>
                    <span className="font-medium">60 requests/minute</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Warnings or Errors */}
        {syncStatus?.errors > 0 && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription>
              <strong>Warning:</strong> The last sync encountered {syncStatus.errors} errors. 
              Some client data may not be up-to-date. Check the server logs for details.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </AppLayout>
  );
} 