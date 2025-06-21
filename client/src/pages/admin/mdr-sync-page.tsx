import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Play,
  CheckCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  Users,
  Activity,
  Calendar,
  ChevronDown,
  ChevronRight,
  XCircle,
  Info,
  Database
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function MDRSyncPage() {
  const { toast } = useToast();
  const [expandedError, setExpandedError] = useState<number | null>(null);

  // Fetch sync status
  const { data: syncStatus, isLoading } = useQuery({
    queryKey: ["mdr-sync-status"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/mdr-sync/status");
      return response.json();
    },
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Fetch sync errors
  const { data: syncErrors } = useQuery({
    queryKey: ["mdr-sync-errors"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/mdr-sync/errors");
      return response.json();
    },
    refetchInterval: 5000,
  });

  // Trigger sync mutation
  const triggerSyncMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/mdr-sync/trigger");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mdr-sync-status"] });
      queryClient.invalidateQueries({ queryKey: ["mdr-sync-errors"] });
      toast({
        title: "Sync Started",
        description: "MDR client sync has been triggered. This may take several minutes.",
      });
    },
    onError: () => {
      toast({
        title: "Sync Failed",
        description: "Failed to trigger MDR sync. Please try again.",
        variant: "destructive",
      });
    },
  });

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge className="bg-green-100 text-green-800">Success</Badge>;
      case "partial":
        return <Badge className="bg-yellow-100 text-yellow-800">Partial Success</Badge>;
      case "failed":
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  const getErrorSolution = (error: string) => {
    if (error.includes("service_type column not found")) {
      return {
        type: "Database Schema",
        solution: "The service_scopes table needs to be updated. Contact your database administrator to rename 'service_type' column to 'category'.",
        severity: "medium"
      };
    }
    if (error.includes("Tenant has no shortName")) {
      return {
        type: "Missing Data",
        solution: "This tenant needs to have a shortName configured in the MDR portal. This is required for client identification.",
        severity: "low"
      };
    }
    if (error.includes("Invalid client status")) {
      return {
        type: "Data Validation",
        solution: "The client status 'pending' is not valid. Use one of: active, inactive, prospect, or awaiting.",
        severity: "medium"
      };
    }
    return {
      type: "Unknown Error",
      solution: "Please check the server logs for more details about this error.",
      severity: "high"
    };
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "low":
        return "text-blue-600";
      case "medium":
        return "text-yellow-600";
      case "high":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  return (
    <AppLayout
      title="MDR Client Sync Management"
      subtitle="Monitor and manage automatic client synchronization from MDR API"
    >
      <div className="space-y-6">
        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Sync Status</p>
                  <div className="mt-2">
                    {syncStatus?.status ? getStatusBadge(syncStatus.status) : (
                      <Badge variant="secondary">No Data</Badge>
                    )}
                  </div>
                </div>
                <Activity className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Last Sync</p>
                  <p className="text-lg font-semibold mt-1">
                    {syncStatus?.lastSync ? formatDate(syncStatus.lastSync) : "Never"}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Next Sync</p>
                  <p className="text-lg font-semibold mt-1">
                    {syncStatus?.nextSync ? formatDate(syncStatus.nextSync) : "Not scheduled"}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Sync Errors</p>
                  <p className="text-2xl font-bold mt-1 text-red-600">
                    {syncStatus?.errors || 0}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Last Sync Results */}
        {syncStatus && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Last Sync Results</span>
                <Button
                  onClick={() => triggerSyncMutation.mutate()}
                  disabled={triggerSyncMutation.isPending || syncStatus?.isRunning}
                >
                  {triggerSyncMutation.isPending || syncStatus?.isRunning ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Trigger Sync Now
                    </>
                  )}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {syncStatus.errors > 0 && (
                <Alert className="mb-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Warning: The last sync encountered {syncStatus.errors} errors. Some client data may not be up-to-date. Check the error details below.
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold">{syncStatus.created || 0}</p>
                  <p className="text-sm text-gray-600">Clients Created</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <RefreshCw className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold">{syncStatus.updated || 0}</p>
                  <p className="text-sm text-gray-600">Clients Updated</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <XCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold">{syncStatus.errors || 0}</p>
                  <p className="text-sm text-gray-600">Sync Errors</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <Clock className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold">
                    {syncStatus.duration ? formatDuration(syncStatus.duration) : "N/A"}
                  </p>
                  <p className="text-sm text-gray-600">Duration</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error Details */}
        {syncErrors && syncErrors.count > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <XCircle className="mr-2 h-5 w-5 text-red-600" />
                Sync Error Details ({syncErrors.count})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Tenant ID</TableHead>
                      <TableHead>Tenant Name</TableHead>
                      <TableHead>Short Name</TableHead>
                      <TableHead>Error Type</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {syncErrors.errors.map((error: any, index: number) => {
                      const errorInfo = getErrorSolution(error.error);
                      const isExpanded = expandedError === index;
                      
                      return (
                        <>
                          <TableRow 
                            key={`error-${index}`}
                            className="cursor-pointer hover:bg-gray-50"
                            onClick={() => setExpandedError(isExpanded ? null : index)}
                          >
                            <TableCell>
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </TableCell>
                            <TableCell className="font-medium">{error.tenantId}</TableCell>
                            <TableCell>{error.tenantName}</TableCell>
                            <TableCell>
                              {error.shortName || (
                                <span className="text-gray-400 italic">Missing</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{errorInfo.type}</Badge>
                            </TableCell>
                            <TableCell>
                              <span className={`font-medium ${getSeverityColor(errorInfo.severity)}`}>
                                {errorInfo.severity.toUpperCase()}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">
                              {new Date(error.timestamp).toLocaleString()}
                            </TableCell>
                          </TableRow>
                          {isExpanded && (
                            <TableRow key={`error-detail-${index}`}>
                              <TableCell colSpan={7} className="bg-gray-50">
                                <div className="p-4 space-y-3">
                                  <div>
                                    <h4 className="font-medium flex items-center text-red-600 mb-1">
                                      <AlertTriangle className="h-4 w-4 mr-2" />
                                      Error Message
                                    </h4>
                                    <p className="text-sm bg-red-50 text-red-800 p-3 rounded font-mono">
                                      {error.error}
                                    </p>
                                  </div>
                                  
                                  <div>
                                    <h4 className="font-medium flex items-center text-blue-600 mb-1">
                                      <Info className="h-4 w-4 mr-2" />
                                      Suggested Solution
                                    </h4>
                                    <p className="text-sm bg-blue-50 text-blue-800 p-3 rounded">
                                      {errorInfo.solution}
                                    </p>
                                  </div>
                                  
                                  {errorInfo.type === "Database Schema" && (
                                    <div>
                                      <h4 className="font-medium flex items-center text-purple-600 mb-1">
                                        <Database className="h-4 w-4 mr-2" />
                                        Technical Details
                                      </h4>
                                      <p className="text-sm bg-purple-50 text-purple-800 p-3 rounded">
                                        This error occurs when the database schema doesn't match the expected structure. 
                                        The MDR sync service expects a 'category' column but found references to 'service_type'.
                                        This typically happens after schema updates that weren't fully migrated.
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Configuration Info */}
        <Card>
          <CardHeader>
            <CardTitle>Sync Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Sync Frequency:</span>
                <span className="font-medium">Every 1 hour</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Initial Sync Delay:</span>
                <span className="font-medium">1 minute after startup</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Data Sources:</span>
                <span className="font-medium">MDR API (tenant/filter, tenant-visibility/basic-data, tenant/details)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">License Assignment:</span>
                <span className="font-medium">SIEM EPS & EDR pools auto-assigned based on usage</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
} 