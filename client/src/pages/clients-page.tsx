import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Client, InsertClient } from "@shared/schema";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Search, Eye, Edit, Trash2, Building, Filter, MoreHorizontal, Download, DollarSign, Calendar, Archive, ArchiveRestore, AlertCircle, RefreshCw, Globe, MapPin, Building2, Hash, Calendar as CalendarIcon } from "lucide-react";
import { useLocation } from "wouter";
import { ClientForm } from "@/components/forms/client-form";
import { GlobalFilters, FilterOption, FilterValue } from "@/components/ui/global-filters";
import { ColumnVisibility, ColumnDefinition } from "@/components/ui/column-visibility";
import { useColumnPreferences } from "@/hooks/use-column-preferences";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ClientsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [selectedClients, setSelectedClients] = useState<Set<number>>(new Set());
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [filterValues, setFilterValues] = useState<FilterValue>({});
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showArchived, setShowArchived] = useState(false);
  const [deletionImpact, setDeletionImpact] = useState<any>(null);
  const [showDeletionDialog, setShowDeletionDialog] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);

  const queryClient = useQueryClient();

  // Define column definitions for client table
  const clientColumns: ColumnDefinition[] = [
    { key: "checkbox", label: "Select", defaultVisible: true, mandatory: true },
    { key: "name", label: "Name", defaultVisible: true, mandatory: true },
    { key: "shortName", label: "Short Name", defaultVisible: true, mandatory: true },
    { key: "domain", label: "Domain", defaultVisible: true, mandatory: true },
    { key: "industry", label: "Industry", defaultVisible: true },
    { key: "companySize", label: "Company Size", defaultVisible: false },
    { key: "status", label: "Status", defaultVisible: true },
    { key: "source", label: "Source", defaultVisible: true },
    { key: "address", label: "Address", defaultVisible: false },
    { key: "website", label: "Website", defaultVisible: false },
    { key: "createdAt", label: "Created", defaultVisible: true },
    { key: "updatedAt", label: "Updated", defaultVisible: true, mandatory: true },
    { key: "actions", label: "Actions", defaultVisible: true, mandatory: true }
  ];

  // Use column preferences hook
  const {
    visibleColumns,
    handleVisibilityChange,
    resetToDefaults,
    isColumnVisible
  } = useColumnPreferences({
    storageKey: "clients-table-columns",
    columns: clientColumns
  });

  // Define filter options for GlobalFilters
  const filterOptions: FilterOption[] = [
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { label: "All", value: "all" },
        { label: "Prospect", value: "prospect" },
        { label: "Active", value: "active" },
        { label: "Inactive", value: "inactive" },
        { label: "Pending", value: "pending" }
      ]
    },
    {
      key: "source",
      label: "Source",
      type: "select", 
      options: [
        { label: "All", value: "all" },
        { label: "NCA", value: "nca" },
        { label: "Direct", value: "direct" },
        { label: "Both", value: "both" }
      ]
    }
  ];

  const { data: clients = [], isLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/clients");
      return await res.json();
    },
  });

  const { data: archivedClients = [], isLoading: archivedLoading, error: archivedError } = useQuery<Client[]>({
    queryKey: ["/api/clients/archived"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/clients/archived");
      if (!res.ok) {
        throw new Error(`Failed to fetch archived clients: ${res.statusText}`);
      }
      return await res.json();
    },
    enabled: showArchived,
    retry: 2,
  });

  const checkDeletionImpact = async (clientId: number) => {
    try {
      const res = await apiRequest("GET", `/api/clients/${clientId}/deletion-impact`);
      return await res.json();
    } catch (error) {
      console.error("Failed to check deletion impact:", error);
      return null;
    }
  };

  const currentClients = showArchived ? archivedClients : clients;
  
  // Enhanced filtering logic that includes status filtering based on active tab
  const filteredClients = currentClients.filter(client => {
    // Apply search query filter
    const matchesSearch = 
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.shortName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.domain?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.industry?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.address?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    // Apply status filter based on current tab
    if (!showArchived) {
      // When showing active clients, exclude archived status and filter by actual status
      if (client.status === 'archived') return false;
      
      // If we have a status filter from the global filters, apply it
      if (statusFilter && statusFilter !== 'all') {
        return client.status === statusFilter;
      }
      
      // If no specific status filter, show all non-archived clients
      return true;
    } else {
      // When showing archived tab, only show archived clients
      return client.status === 'archived' || client.deletedAt; // Support both soft deleted and status-based archived
    }
  }).filter(client => {
    // Apply source filter if specified
    if (sourceFilter && sourceFilter !== 'all') {
      return client.source === sourceFilter;
    }
    return true;
  });

  const createClientMutation = useMutation({
    mutationFn: async (client: InsertClient) => {
      const res = await apiRequest("POST", "/api/clients", client);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setIsFormOpen(false);
      toast({
        title: "Success",
        description: "Client created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create client",
        variant: "destructive",
      });
    },
  });

  const updateClientMutation = useMutation({
    mutationFn: async ({ id, client }: { id: number; client: Partial<InsertClient> }) => {
      const res = await apiRequest("PUT", `/api/clients/${id}`, client);
      return await res.json();
    },
    onSuccess: () => {
      // Invalidate both active and archived client queries to refresh all views
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients/archived"] });
      
      // Force refetch to ensure data is fresh
      queryClient.refetchQueries({ queryKey: ["/api/clients"] });
      if (showArchived) {
        queryClient.refetchQueries({ queryKey: ["/api/clients/archived"] });
      }
      
      setIsFormOpen(false);
      setEditingClient(null);
      toast({
        title: "Success",
        description: "Client updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update client",
        variant: "destructive",
      });
    },
  });

  const archiveClientMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/clients/${id}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients/archived"] });
      setShowDeletionDialog(false);
      setClientToDelete(null);
      setDeletionImpact(null);
      toast({
        title: "Success",
        description: "Client archived successfully",
      });
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || "Failed to archive client";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const restoreClientMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/clients/${id}/restore`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients/archived"] });
      toast({
        title: "Success",
        description: "Client restored successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to restore client",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setIsFormOpen(true);
  };

  const handleArchive = async (client: Client) => {
    setClientToDelete(client);
    const impact = await checkDeletionImpact(client.id);
    setDeletionImpact(impact);
    setShowDeletionDialog(true);
  };

  const confirmArchive = () => {
    if (clientToDelete) {
      archiveClientMutation.mutate(clientToDelete.id);
    }
  };

  const handleRestore = (clientId: number) => {
    restoreClientMutation.mutate(clientId);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedClients(new Set(filteredClients.map(client => client.id)));
    } else {
      setSelectedClients(new Set());
    }
  };

  const handleSelectClient = (clientId: number, checked: boolean) => {
    const newSelection = new Set(selectedClients);
    if (checked) {
      newSelection.add(clientId);
    } else {
      newSelection.delete(clientId);
    }
    setSelectedClients(newSelection);
  };

  const handleBulkArchive = async () => {
    if (selectedClients.size === 0) return;
    
    try {
      await Promise.all(
        Array.from(selectedClients).map(id => 
          apiRequest("DELETE", `/api/clients/${id}`)
        )
      );
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients/archived"] });
      setSelectedClients(new Set());
      toast({
        title: "Success",
        description: `Archived ${selectedClients.size} clients`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to archive selected clients",
        variant: "destructive",
      });
    }
  };

  const exportToCSV = () => {
    const selectedData = filteredClients.filter(client => 
      selectedClients.has(client.id)
    );
    const dataToExport = selectedData.length > 0 ? selectedData : filteredClients;
    
    const csvContent = [
      ["Name", "Industry", "Status", "Source", "Created"].join(","),
      ...dataToExport.map(client => [
        client.name,
        client.industry || "",
        client.status,
        client.source || "",
        client.createdAt ? new Date(client.createdAt).toLocaleDateString() : ""
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clients-${showArchived ? 'archived' : 'active'}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: string) => {
    const variants: { [key: string]: "default" | "secondary" | "destructive" | "outline" } = {
      prospect: "outline",
      active: "default",
      inactive: "secondary",
      suspended: "destructive",
      archived: "secondary",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <AppLayout 
      title="Client Management" 
      subtitle="Manage your client relationships and profiles"
    >
      <main className="flex-1 overflow-auto p-6 pt-16 md:pt-6">
        <Tabs value={showArchived ? "archived" : "active"} onValueChange={(value) => setShowArchived(value === "archived")}>
          <TabsList>
            <TabsTrigger value="active">Active Clients ({clients.length})</TabsTrigger>
            <TabsTrigger value="archived">Archived Clients ({archivedClients.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {/* Filters for Active Clients */}
            <Card>
              <CardContent className="pt-6">
                <GlobalFilters
                  filters={filterOptions}
                  values={filterValues}
                  onChange={(newFilterValues) => {
                    setFilterValues(newFilterValues);
                    // Update individual filter states for backward compatibility
                    setStatusFilter(newFilterValues.status || "all");
                    setSourceFilter(newFilterValues.source || "all");
                  }}
                  onClear={() => {
                    setFilterValues({});
                    setSearchQuery("");
                    setStatusFilter("all");
                    setSourceFilter("all");
                  }}
                  compact={true}
                />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Building className="h-5 w-5" />
                      Active Clients
                      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                        <DialogTrigger asChild>
                          <Button className="ml-4">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Client
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden">
                          <DialogHeader>
                            <DialogTitle>
                              {editingClient ? "Edit Client" : "Add New Client"}
                            </DialogTitle>
                          </DialogHeader>
                          <div className="flex-1 overflow-y-auto min-h-0">
                            <ClientForm
                              client={editingClient}
                              onSubmit={(data) => {
                                if (editingClient) {
                                  updateClientMutation.mutate({ id: editingClient.id, client: data });
                                } else {
                                  createClientMutation.mutate(data);
                                }
                              }}
                              onCancel={() => {
                                setIsFormOpen(false);
                                setEditingClient(null);
                              }}
                              isLoading={createClientMutation.isPending || updateClientMutation.isPending}
                            />
                          </div>
                        </DialogContent>
                      </Dialog>
                    </CardTitle>
                    <CardDescription>
                      {filteredClients.length} of {clients.length} clients
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        placeholder="Search clients..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <ColumnVisibility
                      columns={clientColumns}
                      visibleColumns={visibleColumns}
                      onVisibilityChange={handleVisibilityChange}
                      onReset={resetToDefaults}
                    />
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => {
                        queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
                        queryClient.invalidateQueries({ queryKey: ["/api/clients/archived"] });
                      }}
                      title="Refresh client data"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    {selectedClients.size > 0 && (
                      <>
                        <Button variant="outline" onClick={handleBulkArchive}>
                          <Archive className="h-4 w-4 mr-2" />
                          Archive Selected ({selectedClients.size})
                        </Button>
                        <Button variant="outline" onClick={exportToCSV}>
                          <Download className="h-4 w-4 mr-2" />
                          Export
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      {isColumnVisible("checkbox") && (
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedClients.size === filteredClients.length && filteredClients.length > 0}
                            onCheckedChange={handleSelectAll}
                          />
                        </TableHead>
                      )}
                      {isColumnVisible("name") && <TableHead>Name</TableHead>}
                      {isColumnVisible("shortName") && <TableHead>Short Name</TableHead>}
                      {isColumnVisible("domain") && <TableHead>Domain</TableHead>}
                      {isColumnVisible("industry") && <TableHead>Industry</TableHead>}
                      {isColumnVisible("companySize") && <TableHead>Company Size</TableHead>}
                      {isColumnVisible("status") && <TableHead>Status</TableHead>}
                      {isColumnVisible("source") && <TableHead>Source</TableHead>}
                      {isColumnVisible("address") && <TableHead>Address</TableHead>}
                      {isColumnVisible("website") && <TableHead>Website</TableHead>}
                      {isColumnVisible("createdAt") && <TableHead>Created</TableHead>}
                      {isColumnVisible("updatedAt") && <TableHead>Updated</TableHead>}
                      {isColumnVisible("actions") && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClients.map((client) => (
                      <TableRow key={client.id}>
                        {isColumnVisible("checkbox") && (
                          <TableCell>
                            <Checkbox
                              checked={selectedClients.has(client.id)}
                              onCheckedChange={(checked) => handleSelectClient(client.id, checked as boolean)}
                            />
                          </TableCell>
                        )}
                        {isColumnVisible("name") && (
                          <TableCell className="font-medium">{client.name}</TableCell>
                        )}
                        {isColumnVisible("shortName") && (
                          <TableCell>
                            <a href={`/clients/${client.id}`} className="flex items-center gap-2 hover:text-blue-600 cursor-pointer">
                              {client.shortName && <Hash className="h-4 w-4 text-muted-foreground" />}
                              {client.shortName || "—"}
                            </a>
                          </TableCell>
                        )}
                        {isColumnVisible("domain") && (
                          <TableCell>
                            <a href={`/clients/${client.id}`} className="flex items-center gap-2 hover:text-blue-600 cursor-pointer">
                              {client.domain && <Globe className="h-4 w-4 text-muted-foreground" />}
                              {client.domain || "—"}
                            </a>
                          </TableCell>
                        )}
                        {isColumnVisible("industry") && (
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {client.industry && <Building2 className="h-4 w-4 text-muted-foreground" />}
                              {client.industry || "—"}
                            </div>
                          </TableCell>
                        )}
                        {isColumnVisible("companySize") && (
                          <TableCell>{client.companySize || "—"}</TableCell>
                        )}
                        {isColumnVisible("status") && (
                          <TableCell>{getStatusBadge(client.status)}</TableCell>
                        )}
                        {isColumnVisible("source") && (
                          <TableCell>{client.source || "—"}</TableCell>
                        )}
                        {isColumnVisible("address") && (
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {client.address && <MapPin className="h-4 w-4 text-muted-foreground" />}
                              <span className="truncate max-w-[200px]" title={client.address}>
                                {client.address || "—"}
                              </span>
                            </div>
                          </TableCell>
                        )}
                        {isColumnVisible("website") && (
                          <TableCell>
                            {client.website ? (
                              <a 
                                href={client.website.startsWith('http') ? client.website : `https://${client.website}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                              >
                                <Globe className="h-4 w-4" />
                                <span className="truncate max-w-[150px]">
                                  {client.website.replace(/^https?:\/\//, '')}
                                </span>
                              </a>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                        )}
                        {isColumnVisible("createdAt") && (
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                              {client.createdAt ? new Date(client.createdAt).toLocaleDateString() : "—"}
                            </div>
                          </TableCell>
                        )}
                        {isColumnVisible("updatedAt") && (
                          <TableCell>
                            <a href={`/clients/${client.id}`} className="flex items-center gap-2 hover:text-blue-600 cursor-pointer">
                              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                              {client.updatedAt ? new Date(client.updatedAt).toLocaleDateString() : "—"}
                            </a>
                          </TableCell>
                        )}
                        {isColumnVisible("actions") && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="sm" asChild>
                                <a href={`/clients/${client.id}`}>
                                  <Eye className="h-4 w-4" />
                                </a>
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleEdit(client)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleArchive(client)}>
                                <Archive className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="archived" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Archive className="h-5 w-5" />
                      Archived Clients
                    </CardTitle>
                    <CardDescription>
                      Clients that have been archived for historical reference
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        placeholder="Search archived clients..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <ColumnVisibility
                      columns={clientColumns.filter(col => col.key !== "checkbox")} // Remove checkbox column for archived
                      visibleColumns={visibleColumns}
                      onVisibilityChange={handleVisibilityChange}
                      onReset={resetToDefaults}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      {isColumnVisible("name") && <TableHead>Name</TableHead>}
                      {isColumnVisible("shortName") && <TableHead>Short Name</TableHead>}
                      {isColumnVisible("domain") && <TableHead>Domain</TableHead>}
                      {isColumnVisible("industry") && <TableHead>Industry</TableHead>}
                      {isColumnVisible("companySize") && <TableHead>Company Size</TableHead>}
                      {isColumnVisible("status") && <TableHead>Status</TableHead>}
                      {isColumnVisible("source") && <TableHead>Source</TableHead>}
                      {isColumnVisible("address") && <TableHead>Address</TableHead>}
                      {isColumnVisible("website") && <TableHead>Website</TableHead>}
                      {isColumnVisible("createdAt") && <TableHead>Created</TableHead>}
                      {isColumnVisible("updatedAt") && <TableHead>Updated</TableHead>}
                      <TableHead>Archived Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {archivedLoading ? (
                      <TableRow>
                        <TableCell colSpan={Object.values(visibleColumns).filter(Boolean).length + 2} className="text-center py-8">
                          Loading archived clients...
                        </TableCell>
                      </TableRow>
                    ) : archivedError ? (
                      <TableRow>
                        <TableCell colSpan={Object.values(visibleColumns).filter(Boolean).length + 2} className="text-center py-8">
                          <div className="flex flex-col items-center space-y-2">
                            <Archive className="h-8 w-8 text-red-400" />
                            <p className="text-red-600">Failed to load archived clients</p>
                            <p className="text-sm text-gray-500">
                              {archivedError instanceof Error ? archivedError.message : "Unknown error occurred"}
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredClients.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={Object.values(visibleColumns).filter(Boolean).length + 2} className="text-center py-8">
                          <div className="flex flex-col items-center space-y-2">
                            <Archive className="h-8 w-8 text-gray-400" />
                            <p className="text-gray-500">No archived clients found</p>
                            <p className="text-sm text-gray-400">
                              {searchQuery ? "Try adjusting your search" : "No clients have been archived yet"}
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredClients.map((client) => (
                        <TableRow key={client.id}>
                          {isColumnVisible("name") && (
                            <TableCell className="font-medium">{client.name}</TableCell>
                          )}
                          {isColumnVisible("shortName") && (
                            <TableCell>
                              <a href={`/clients/${client.id}`} className="flex items-center gap-2 hover:text-blue-600 cursor-pointer">
                                {client.shortName && <Hash className="h-4 w-4 text-muted-foreground" />}
                                {client.shortName || "—"}
                              </a>
                            </TableCell>
                          )}
                          {isColumnVisible("domain") && (
                            <TableCell>
                              <a href={`/clients/${client.id}`} className="flex items-center gap-2 hover:text-blue-600 cursor-pointer">
                                {client.domain && <Globe className="h-4 w-4 text-muted-foreground" />}
                                {client.domain || "—"}
                              </a>
                            </TableCell>
                          )}
                          {isColumnVisible("industry") && (
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {client.industry && <Building2 className="h-4 w-4 text-muted-foreground" />}
                                {client.industry || "—"}
                              </div>
                            </TableCell>
                          )}
                          {isColumnVisible("companySize") && (
                            <TableCell>{client.companySize || "—"}</TableCell>
                          )}
                          {isColumnVisible("status") && (
                            <TableCell>{getStatusBadge(client.status)}</TableCell>
                          )}
                          {isColumnVisible("source") && (
                            <TableCell>{client.source || "—"}</TableCell>
                          )}
                          {isColumnVisible("address") && (
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {client.address && <MapPin className="h-4 w-4 text-muted-foreground" />}
                                <span className="truncate max-w-[200px]" title={client.address}>
                                  {client.address || "—"}
                                </span>
                              </div>
                            </TableCell>
                          )}
                          {isColumnVisible("website") && (
                            <TableCell>
                              {client.website ? (
                                <a 
                                  href={client.website.startsWith('http') ? client.website : `https://${client.website}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                                >
                                  <Globe className="h-4 w-4" />
                                  <span className="truncate max-w-[150px]">
                                    {client.website.replace(/^https?:\/\//, '')}
                                  </span>
                                </a>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                          )}
                          {isColumnVisible("createdAt") && (
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                                {client.createdAt ? new Date(client.createdAt).toLocaleDateString() : "—"}
                              </div>
                            </TableCell>
                          )}
                          {isColumnVisible("updatedAt") && (
                            <TableCell>
                              <a href={`/clients/${client.id}`} className="flex items-center gap-2 hover:text-blue-600 cursor-pointer">
                                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                                {client.updatedAt ? new Date(client.updatedAt).toLocaleDateString() : "—"}
                              </a>
                            </TableCell>
                          )}
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                              {client.deletedAt ? new Date(client.deletedAt).toLocaleDateString() : "—"}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRestore(client.id)}
                            >
                              <ArchiveRestore className="h-4 w-4 mr-2" />
                              Restore
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Deletion Impact Dialog */}
        <Dialog open={showDeletionDialog} onOpenChange={setShowDeletionDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                Archive Client
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to archive "{clientToDelete?.name}"?
              </DialogDescription>
            </DialogHeader>
            
            {deletionImpact && (
              <div className="space-y-4">
                {!deletionImpact.canDelete && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-2">
                        <p className="font-medium">Cannot archive this client:</p>
                        <ul className="list-disc list-inside space-y-1">
                          {deletionImpact.blockers.map((blocker: string, index: number) => (
                            <li key={index} className="text-sm">{blocker}</li>
                          ))}
                        </ul>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="space-y-2">
                  <p className="font-medium text-sm">Dependencies that will be preserved:</p>
                  <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                    <div>Contracts: {deletionImpact.dependencies.contracts}</div>
                    <div>Documents: {deletionImpact.dependencies.documents}</div>
                    <div>Licenses: {deletionImpact.dependencies.licenses}</div>
                    <div>Hardware: {deletionImpact.dependencies.hardwareAssignments}</div>
                    <div>Team: {deletionImpact.dependencies.teamAssignments}</div>
                    <div>Transactions: {deletionImpact.dependencies.financialTransactions}</div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDeletionDialog(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmArchive}
                disabled={!deletionImpact?.canDelete || archiveClientMutation.isPending}
              >
                {archiveClientMutation.isPending ? "Archiving..." : "Archive Client"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </AppLayout>
  );
}
