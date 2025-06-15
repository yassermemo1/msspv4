import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Proposal, Contract, Client } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency, formatDate } from '@/lib/utils';
import { getStatusColor, getStatusIcon, getStatusBadge, getStatusVariant } from '@/lib/status-utils';
import { 
  FileText, 
  Search, 
  Calendar, 
  DollarSign, 
  Building,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  Upload,
  X,
  Edit,
  Eye
} from "lucide-react";

const proposalFormSchema = z.object({
  contractId: z.string().min(1, "Contract is required"),
  type: z.enum(["technical", "financial"], {
    required_error: "Please select a proposal type",
  }),
  notes: z.string().min(1, "Notes are required"),
  status: z.string().default("draft"),
  documentUrl: z.string().optional(),
  proposedValue: z.string().optional(),
}).refine((data) => {
  // Additional validation for financial proposals
  if (data.type === "financial") {
    // Financial proposals must have a proposed value
    if (!data.proposedValue || parseFloat(data.proposedValue) <= 0) {
      return false;
    }
    // Financial proposals must have detailed notes (minimum 50 characters)
    if (data.notes.trim().length < 50) {
      return false;
    }
  }
  return true;
}, {
  message: "Financial proposals require a valid proposed value > 0 and detailed notes (minimum 50 characters)",
  path: ["type"], // Show error on the type field
});

type ProposalFormData = z.infer<typeof proposalFormSchema>;

export default function ProposalsPage() {
  const { user } = useAuth();
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{
    name: string;
    url: string;
    size: number;
  } | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [isViewDetailsOpen, setIsViewDetailsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch proposals - only when user is authenticated
  const { data: proposals = [], isLoading: proposalsLoading } = useQuery<Proposal[]>({
    queryKey: ["/api/proposals"],
    enabled: !!user, // Only run when user is authenticated
  });
  
  const { data: contracts = [], isLoading: contractsLoading } = useQuery<Contract[]>({
    queryKey: ["/api/contracts"],
    enabled: !!user, // Only run when user is authenticated
  });

  const { data: clients = [], isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    enabled: !!user, // Only run when user is authenticated
  });

  // Show loading state if user is not authenticated or data is loading
  if (!user || proposalsLoading || contractsLoading || clientsLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
            <p className="mt-4 text-muted-foreground">Loading proposals...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  const form = useForm<ProposalFormData>({
    resolver: zodResolver(proposalFormSchema),
    defaultValues: {
      contractId: "",
      type: "technical",
      notes: "",
      status: "draft",
      documentUrl: "",
      proposedValue: "",
    },
  });

  const createProposalMutation = useMutation({
    mutationFn: async (data: ProposalFormData) => {
      const response = await apiRequest("POST", `/api/contracts/${data.contractId}/proposals`, {
        type: data.type,
        notes: data.notes,
        status: data.status,
        version: "1.0",
        documentUrl: uploadedFile?.url || data.documentUrl || null,
        proposedValue: data.proposedValue ? parseFloat(data.proposedValue) : null,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Proposal created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/proposals"] });
      form.reset();
      setUploadedFile(null);
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create proposal",
        variant: "destructive",
      });
    },
  });

  const updateProposalMutation = useMutation({
    mutationFn: async (data: { id: number } & Partial<ProposalFormData>) => {
      const response = await apiRequest("PUT", `/api/proposals/${data.id}`, {
        type: data.type,
        notes: data.notes,
        status: data.status,
        documentUrl: uploadedFile?.url || data.documentUrl || null,
        proposedValue: data.proposedValue ? parseFloat(data.proposedValue) : null,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Proposal updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/proposals"] });
      form.reset();
      setUploadedFile(null);
      setIsEditOpen(false);
      setSelectedProposal(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update proposal",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = async (file: File) => {
    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      // Include clientId and contractId if available
      const selectedContractId = form.watch('contractId');
      const selectedClientId = getClientIdFromContract(parseInt(selectedContractId));
      const proposalType = form.watch('type');
      
      if (selectedContractId) {
        formData.append('contractId', selectedContractId);
      }
      
      if (selectedClientId) {
        formData.append('clientId', selectedClientId.toString());
      }
      
      // Add document name and description
      const clientName = selectedClientId ? getClientName(selectedClientId) : 'client';
      const contractName = selectedContractId ? getContractName(parseInt(selectedContractId)) : 'contract';
      formData.append('name', `${file.name} - ${proposalType || 'Proposal'} Document`);
      formData.append('description', `${proposalType || 'Proposal'} document for ${clientName} - ${contractName}`);

      const response = await fetch('/api/upload/proposal-document', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }

      const result = await response.json();
      setUploadedFile({
        name: result.fileName,
        url: result.fileUrl,
        size: result.fileSize
      });

      form.setValue('documentUrl', result.fileUrl);

      toast({
        title: "Success",
        description: "Proposal document uploaded successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to upload document",
        variant: "destructive",
      });
    } finally {
      setUploadingFile(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "File size must be less than 10MB",
          variant: "destructive",
        });
        return;
      }

      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain'
      ];

      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Error",
          description: "Only PDF, Word, Excel, PowerPoint, and text files are allowed",
          variant: "destructive",
        });
        return;
      }

      handleFileUpload(file);
    }
  };

  const removeUploadedFile = () => {
    setUploadedFile(null);
    form.setValue('documentUrl', '');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleViewDetails = (proposal: Proposal) => {
    setSelectedProposal(proposal);
    setIsViewDetailsOpen(true);
  };

  const handleEdit = (proposal: Proposal) => {
    setSelectedProposal(proposal);
    const contract = contracts.find(c => c.id === proposal.contractId);
    form.reset({
      contractId: proposal.contractId.toString(),
      type: proposal.type as "technical" | "financial",
      notes: proposal.notes || "",
      status: proposal.status,
      documentUrl: proposal.documentUrl || "",
      proposedValue: proposal.proposedValue ? proposal.proposedValue.toString() : "",
    });
    setIsEditOpen(true);
  };

  const onSubmit = (data: ProposalFormData) => {
    if (selectedProposal && isEditOpen) {
      updateProposalMutation.mutate({ id: selectedProposal.id, ...data });
    } else {
      createProposalMutation.mutate(data);
    }
  };

  // Helper functions for getting related data
  const getContractName = (contractId: number) => {
    const contract = contracts.find(c => c.id === contractId);
    return contract?.name || 'Unknown Contract';
  };

  const getClientName = (clientId: number) => {
    const client = clients.find(c => c.id === clientId);
    return client?.name || 'Unknown Client';
  };

  const getClientIdFromContract = (contractId: number) => {
    const contract = contracts.find(c => c.id === contractId);
    return contract?.clientId;
  };

  // Updated for proposal statuses

  return (
    <AppLayout 
      title="Proposals & Contracts" 
      subtitle="Manage service proposals and contract agreements"
    >
      <main className="flex-1 overflow-auto p-6 pt-16 md:pt-6">
        <div className="space-y-6">
          {/* Header Actions */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search proposals..."
                  className="pl-10 w-64"
                />
              </div>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Proposal
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
                <DialogHeader className="flex-shrink-0">
                  <DialogTitle>Create New Proposal</DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto pr-2 -mr-2">
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="contractId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contract</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a contract" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {contracts.map((contract) => (
                                  <SelectItem key={contract.id} value={contract.id.toString()}>
                                    <div className="flex flex-col">
                                      <span className="font-medium">{contract.name}</span>
                                      <span className="text-xs text-gray-500">
                                        Client: {getClientName(contract.clientId)} | Status: {contract.status}
                                      </span>
                                      <span className="text-xs text-blue-600">
                                        Value: {contract.totalValue ? formatCurrency(contract.totalValue.toString()) : 'N/A'}
                                      </span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                            {field.value && (
                              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
                                <div className="font-medium text-blue-900 mb-1">Contract & Client Relationship</div>
                                <div className="space-y-1 text-xs">
                                  <div><strong>Contract:</strong> {contracts.find(c => c.id.toString() === field.value)?.name}</div>
                                  <div><strong>Client:</strong> {getClientName(contracts.find(c => c.id.toString() === field.value)?.clientId || 0)}</div>
                                  <div><strong>Contract Value:</strong> {contracts.find(c => c.id.toString() === field.value)?.totalValue ? formatCurrency(contracts.find(c => c.id.toString() === field.value)?.totalValue?.toString() || '0') : 'N/A'}</div>
                                </div>
                                <div className="mt-2 text-blue-700 font-medium">
                                  ⚠️ This proposal will be permanently associated with this client only and cannot be transferred to another client.
                                </div>
                              </div>
                            )}
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Title</FormLabel>
                              <FormControl>
                                <Input placeholder="Proposal title" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="version"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Version</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., v1.0, v2.1" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Detailed description of the proposal..."
                                rows={3}
                                {...field}
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="dueDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Due Date</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} value={field.value || ""} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="estimatedValue"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Estimated Value ($)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  placeholder="0.00"
                                  {...field}
                                  value={field.value || ""}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Status</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="draft">Draft</SelectItem>
                                <SelectItem value="submitted">Submitted</SelectItem>
                                <SelectItem value="under_review">Under Review</SelectItem>
                                <SelectItem value="approved">Approved</SelectItem>
                                <SelectItem value="rejected">Rejected</SelectItem>
                                <SelectItem value="withdrawn">Withdrawn</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Notes</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Additional notes about this proposal..."
                                rows={2}
                                {...field}
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 bg-gray-50 -mx-6 px-6 py-4">
                        <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={createProposalMutation.isPending || uploadingFile}>
                          {createProposalMutation.isPending ? "Creating..." : "Create Proposal"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Proposals</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{proposals.length}</div>
                <p className="text-xs text-muted-foreground">
                  Active service proposals
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {proposals.filter(p => p.status === "pending").length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Awaiting client approval
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Approved</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {proposals.filter(p => p.status === "approved").length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Approved proposals
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Value</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(
                    proposals
                      .filter(p => p.proposedValue)
                      .reduce((sum, proposal) => sum + parseFloat(proposal.proposedValue || "0"), 0)
                      .toString()
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Combined proposal value
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Proposals List */}
          <Card>
            <CardHeader>
              <CardTitle>Service Proposals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {proposals.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Proposals Found</h3>
                    <p className="text-gray-500 mb-4">
                      Create your first service proposal to get started.
                    </p>
                    <Button onClick={() => setIsDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Proposal
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {proposals.map((proposal) => (
                      <div key={proposal.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center">
                                <FileText className="h-4 w-4 text-violet-600" />
                              </div>
                              <div>
                                <h3 className="text-lg font-semibold capitalize">{proposal.type} Proposal</h3>
                                <p className="text-sm text-gray-600">Version {proposal.version}</p>
                              </div>
                              <Badge className={getStatusColor(proposal.status)}>
                                <div className="flex items-center space-x-1">
                                  {getStatusIcon(proposal.status)}
                                  <span className="capitalize">{proposal.status}</span>
                                </div>
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                              <div className="flex items-center space-x-2">
                                <Building className="h-4 w-4" />
                                <span>{getClientName(getClientIdFromContract(proposal.contractId) || 0)}</span>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                <FileText className="h-4 w-4" />
                                <span>{getContractName(proposal.contractId)}</span>
                              </div>
                              
                              {proposal.proposedValue && (
                                <div className="flex items-center space-x-2">
                                  <DollarSign className="h-4 w-4" />
                                  <span className="text-green-600 font-medium">
                                    {formatCurrency(proposal.proposedValue.toString())}
                                  </span>
                                </div>
                              )}
                            </div>
                            
                            {proposal.notes && (
                              <p className="text-gray-700 mt-2 line-clamp-2">{proposal.notes}</p>
                            )}
                            
                            <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                              <div className="flex items-center space-x-1">
                                <Calendar className="h-3 w-3" />
                                <span>Created: {formatDate(proposal.createdAt.toString())}</span>
                              </div>
                              {proposal.updatedAt && proposal.updatedAt !== proposal.createdAt && (
                                <div className="flex items-center space-x-1">
                                  <Clock className="h-3 w-3" />
                                  <span>Updated: {formatDate(proposal.updatedAt.toString())}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex space-x-2 ml-4">
                            {proposal.documentUrl && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => window.open(proposal.documentUrl!, '_blank')}
                              >
                                <FileText className="h-3 w-3 mr-1" />
                                Document
                              </Button>
                            )}
                            <Button variant="outline" size="sm" onClick={() => handleViewDetails(proposal)}>
                              <Eye className="h-3 w-3 mr-1" />
                              View Details
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleEdit(proposal)}>
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* View Details Dialog */}
        <Dialog open={isViewDetailsOpen} onOpenChange={setIsViewDetailsOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Proposal Details</DialogTitle>
            </DialogHeader>
            {selectedProposal && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Type</label>
                    <p className="text-sm capitalize">{selectedProposal.type}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Status</label>
                    <Badge className={getStatusColor(selectedProposal.status)}>
                      {selectedProposal.status}
                    </Badge>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Contract</label>
                    <p className="text-sm">{getContractName(selectedProposal.contractId)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Client</label>
                    <p className="text-sm">{getClientName(getClientIdFromContract(selectedProposal.contractId) || 0)}</p>
                  </div>
                  {selectedProposal.proposedValue && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Proposed Value</label>
                      <p className="text-sm font-medium text-green-600">
                        {formatCurrency(selectedProposal.proposedValue.toString())}
                      </p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-gray-500">Version</label>
                    <p className="text-sm">{selectedProposal.version}</p>
                  </div>
                </div>
                
                {selectedProposal.notes && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Notes</label>
                    <p className="text-sm mt-1 p-3 bg-gray-50 rounded border">{selectedProposal.notes}</p>
                  </div>
                )}
                
                {selectedProposal.documentUrl && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Document</label>
                    <div className="mt-1">
                      <Button 
                        variant="outline" 
                        onClick={() => window.open(selectedProposal.documentUrl!, '_blank')}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        View Document
                      </Button>
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Created</label>
                    <p className="text-sm">{formatDate(selectedProposal.createdAt.toString())}</p>
                  </div>
                  {selectedProposal.updatedAt && selectedProposal.updatedAt !== selectedProposal.createdAt && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Last Updated</label>
                      <p className="text-sm">{formatDate(selectedProposal.updatedAt.toString())}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="sm:max-w-[525px] max-h-[85vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>Edit Proposal</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="contractId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contract</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a contract" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {contracts.map((contract) => (
                            <SelectItem key={contract.id} value={contract.id.toString()}>
                              <div className="flex flex-col">
                                <span className="font-medium">{contract.name}</span>
                                <span className="text-xs text-gray-500">
                                  Client: {getClientName(contract.clientId)} | Status: {contract.status}
                                </span>
                                <span className="text-xs text-blue-600">
                                  Value: {contract.totalValue ? formatCurrency(contract.totalValue.toString()) : 'N/A'}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                      {field.value && (
                        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
                          <div className="font-medium text-blue-900 mb-1">Contract & Client Relationship</div>
                          <div className="space-y-1 text-xs">
                            <div><strong>Contract:</strong> {contracts.find(c => c.id.toString() === field.value)?.name}</div>
                            <div><strong>Client:</strong> {getClientName(contracts.find(c => c.id.toString() === field.value)?.clientId || 0)}</div>
                            <div><strong>Contract Value:</strong> {contracts.find(c => c.id.toString() === field.value)?.totalValue ? formatCurrency(contracts.find(c => c.id.toString() === field.value)?.totalValue?.toString() || '0') : 'N/A'}</div>
                          </div>
                          <div className="mt-2 text-blue-700 font-medium">
                            ⚠️ This proposal will be permanently associated with this client only and cannot be transferred to another client.
                          </div>
                        </div>
                      )}
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Proposal Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="technical">
                            <div className="flex flex-col">
                              <span className="font-medium">Technical Proposal</span>
                              <span className="text-xs text-gray-500">Service specifications, implementation details</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="financial">
                            <div className="flex flex-col">
                              <span className="font-medium">Financial Proposal</span>
                              <span className="text-xs text-gray-500">Cost analysis, pricing, ROI calculations</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.watch('type') === 'financial' && (
                  <>
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-start space-x-2">
                        <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                        <div className="text-sm">
                          <div className="font-medium text-yellow-800">Financial Proposal Requirements</div>
                          <div className="text-yellow-700 mt-1">
                            Financial proposals must include detailed cost analysis and ROI calculations. 
                            This proposal will be tied to the selected contract and client permanently.
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="proposedValue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Proposed Financial Value ($)</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="0.00" 
                              type="number" 
                              step="0.01"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                          <div className="text-xs text-gray-600 mt-1">
                            Enter the total financial value of this proposal including all costs and fees.
                          </div>
                        </FormItem>
                      )}
                    />
                  </>
                )}

                {/* Document Upload Section */}
                <div className="space-y-4">
                  <FormLabel>Proposal Document (Optional)</FormLabel>
                  
                  {!uploadedFile && !form.watch('documentUrl') && (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                      <div className="text-center">
                        <Upload className="mx-auto h-8 w-8 text-gray-400" />
                        <div className="mt-2">
                          <label htmlFor="proposal-file" className="cursor-pointer">
                            <span className="text-sm font-medium text-gray-900">
                              Upload proposal document
                            </span>
                            <span className="block text-xs text-gray-500">
                              PDF, Word, Excel, PowerPoint, or text files up to 10MB
                            </span>
                          </label>
                          <input
                            id="proposal-file"
                            type="file"
                            className="sr-only"
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                            onChange={handleFileInputChange}
                            disabled={uploadingFile}
                          />
                        </div>
                        <div className="mt-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={uploadingFile}
                            onClick={() => document.getElementById('proposal-file')?.click()}
                          >
                            {uploadingFile ? "Uploading..." : "Choose File"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {uploadedFile && (
                    <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-6 w-6 text-green-600" />
                        <div>
                          <p className="text-sm font-medium text-green-900">{uploadedFile.name}</p>
                          <p className="text-xs text-green-600">{formatFileSize(uploadedFile.size)}</p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={removeUploadedFile}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  <div className="text-center text-sm text-gray-500">
                    <span>or</span>
                  </div>

                  <FormField
                    control={form.control}
                    name="documentUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>External Document URL</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="https://..." 
                            {...field} 
                            disabled={!!uploadedFile}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Notes
                        {form.watch('type') === 'financial' && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder={
                            form.watch('type') === 'financial' 
                              ? "Enter detailed financial analysis, cost breakdown, ROI calculations, and justification (minimum 50 characters required)..."
                              : "Enter proposal notes"
                          }
                          className="resize-none"
                          rows={form.watch('type') === 'financial' ? 5 : 3}
                          {...field}
                        />
                      </FormControl>
                      <div className="flex justify-between items-center">
                        <FormMessage />
                        {form.watch('type') === 'financial' && (
                          <div className="text-xs text-gray-500">
                            {field.value?.length || 0}/50 characters minimum
                            {field.value && field.value.length >= 50 && (
                              <span className="text-green-600 ml-2">✓ Requirement met</span>
                            )}
                          </div>
                        )}
                      </div>
                      {form.watch('type') === 'financial' && field.value && field.value.length < 50 && (
                        <div className="text-xs text-red-600">
                          Financial proposals require detailed notes (minimum 50 characters). 
                          Include cost analysis, ROI calculations, and financial justification.
                        </div>
                      )}
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => {
                      setIsEditOpen(false);
                      setSelectedProposal(null);
                      form.reset();
                      setUploadedFile(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={updateProposalMutation.isPending || uploadingFile}
                  >
                    {updateProposalMutation.isPending ? "Updating..." : "Update Proposal"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </main>
    </AppLayout>
  );
}