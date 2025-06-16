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
import { getStatusIcon, getStatusBadgeVariant } from '@/lib/status-utils';
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
  
  // Initialize form before any conditional returns
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

  // ===== Mutations =====
  // Defined here so they are called on every render before any conditional returns
  const createProposalMutation = useMutation({
    mutationFn: async (data: ProposalFormData) => {
      const response = await apiRequest("POST", `/api/contracts/${data.contractId}/proposals`, {
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

  // Show loading state if user is not authenticated or data is loading
  if (!user || proposalsLoading || contractsLoading || clientsLoading) {
    return (
      <AppLayout title="Proposals" subtitle="Manage service proposals and contract agreements">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
            <p className="mt-4 text-muted-foreground">Loading proposals...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

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
      title="Proposals" 
      subtitle="Manage service proposals and contract agreements"
    >
      <main className="flex-1 overflow-auto p-6">
        <div className="space-y-6">
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
                  <DialogTitle>
                    {isEditOpen ? 'Edit Proposal' : 'Create New Proposal'}
                  </DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto pr-2 -mr-2">
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                          name="type"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Proposal Type</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a proposal type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="technical">Technical</SelectItem>
                                  <SelectItem value="financial">Financial</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        {form.watch('type') === 'financial' && (
                          <FormField
                            control={form.control}
                            name="proposedValue"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Proposed Value ($)</FormLabel>
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
                        )}
                      </div>

                      <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Notes</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Add detailed notes for the proposal..."
                                rows={5}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div>
                        <FormLabel>Attach Document (Optional)</FormLabel>
                        <div className="mt-2">
                          {uploadedFile ? (
                            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                              <div className="flex items-center space-x-3">
                                <FileText className="h-5 w-5 text-muted-foreground" />
                                <div className="text-sm">
                                  <p className="font-medium">{uploadedFile.name}</p>
                                  <p className="text-xs text-muted-foreground">{formatFileSize(uploadedFile.size)}</p>
                                </div>
                              </div>
                              <Button variant="ghost" size="icon" onClick={removeUploadedFile}>
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center w-full">
                              <label
                                htmlFor="file-upload"
                                className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted"
                              >
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                  <Upload className="w-8 h-8 mb-4 text-muted-foreground" />
                                  <p className="mb-2 text-sm text-muted-foreground">
                                    <span className="font-semibold">Click to upload</span> or drag and drop
                                  </p>
                                  <p className="text-xs text-muted-foreground">PDF, DOC, XLS, PPT, TXT (MAX. 10MB)</p>
                                </div>
                                <input id="file-upload" type="file" className="hidden" onChange={handleFileInputChange} />
                              </label>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-end pt-4">
                        <Button type="submit" disabled={createProposalMutation.isPending || updateProposalMutation.isPending}>
                          {createProposalMutation.isPending || updateProposalMutation.isPending 
                            ? "Saving..." 
                            : (isEditOpen ? "Update Proposal" : "Create Proposal")
                          }
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
          {proposals.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed rounded-lg">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No proposals found</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating a new proposal.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {proposals.map((proposal) => {
                const contract = contracts.find(c => c.id === proposal.contractId);
                const client = clients.find(c => c.id === contract?.clientId);
                const Icon = getStatusIcon(proposal.status);

                return (
                  <Card key={proposal.id} className="flex flex-col">
                    <CardHeader className="pb-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg mb-1">{contract?.name || 'Unknown Contract'}</CardTitle>
                          <p className="text-sm text-muted-foreground">{client?.name || 'Unknown Client'}</p>
                        </div>
                        <Badge variant={getStatusBadgeVariant(proposal.status)} className="capitalize">
                          <Icon className="h-3 w-3 mr-1" />
                          {proposal.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-grow space-y-3">
                      <div className="flex items-center text-sm text-muted-foreground">
                        <FileText className="h-4 w-4 mr-2" />
                        <span className="capitalize">{proposal.type} Proposal</span>
                      </div>
                      {proposal.proposedValue && (
                        <div className="flex items-center text-sm text-muted-foreground">
                          <DollarSign className="h-4 w-4 mr-2" />
                          <span>{formatCurrency(proposal.proposedValue)}</span>
                        </div>
                      )}
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span>Created: {formatDate(proposal.createdAt)}</span>
                      </div>
                      <div className="pt-2 text-xs text-muted-foreground truncate">
                        {proposal.notes}
                      </div>
                    </CardContent>
                    <div className="p-4 pt-0 mt-auto">
                      <Button variant="outline" className="w-full" onClick={() => handleViewDetails(proposal)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </main>

      {/* View Details Dialog */}
      <Dialog open={isViewDetailsOpen} onOpenChange={setIsViewDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Proposal Details</DialogTitle>
          </DialogHeader>
          {selectedProposal && (
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <p className="text-sm font-medium text-muted-foreground">Client</p>
                  <p>{getClientName(getClientIdFromContract(selectedProposal.contractId) || 0)}</p>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <p className="text-sm font-medium text-muted-foreground">Contract</p>
                  <p>{getContractName(selectedProposal.contractId)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <div className="mt-1">
                    <Badge variant={getStatusBadgeVariant(selectedProposal.status)} className="text-sm capitalize">
                      {(() => {
                        const Icon = getStatusIcon(selectedProposal.status);
                        return <Icon className="h-4 w-4 mr-2" />;
                      })()}
                      {selectedProposal.status}
                    </Badge>
                  </div>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <p className="text-sm font-medium text-muted-foreground">Type</p>
                  <div className="mt-1">
                    <Badge variant={selectedProposal.type === 'financial' ? 'secondary' : 'outline'} className="text-sm">
                      {selectedProposal.type === 'financial' ? <DollarSign className="h-4 w-4 mr-2" /> : <FileText className="h-4 w-4 mr-2" />}
                      <span className="capitalize">{selectedProposal.type}</span>
                    </Badge>
                  </div>
                </div>
              </div>

              {selectedProposal.proposedValue && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Proposed Value</p>
                  <p className="text-lg font-semibold text-green-600">{formatCurrency(selectedProposal.proposedValue)}</p>
                </div>
              )}

              {selectedProposal.documentUrl && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Document</p>
                  <Button variant="link" className="p-0 h-auto" asChild>
                    <a href={selectedProposal.documentUrl} target="_blank" rel="noopener noreferrer">
                      View Document
                    </a>
                  </Button>
                </div>
              )}

              <div className="col-span-2 text-sm">
                <p className="font-medium text-muted-foreground">Notes</p>
                <div className="mt-1 p-3 bg-muted/50 rounded-lg whitespace-pre-wrap">
                  {selectedProposal.notes}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}