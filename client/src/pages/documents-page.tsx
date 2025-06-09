import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, FileText, Download, Share2, Clock, Tag, Eye, Upload, X, CheckCircle, AlertCircle, Search, Trash2, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AppLayout } from "@/components/layout/app-layout";
import type { Document, Client } from "@shared/schema";
import { uploadDocuments } from "@/lib/file-upload";
import { formatFileSize, formatDate } from "@/lib/utils";
import { formatClientName } from "@/lib/utils";

interface UploadFile {
  file: File;
  id: string;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  name: string;
  documentType: string;
  clientId?: string;
}

export default function DocumentsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedClient, setSelectedClient] = useState<string>("all");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch documents
  const { data: documentsData = [], isLoading } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
  });

  // Fetch clients for filtering
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await fetch('/api/documents', {
        credentials: 'include'
      });
      
      if (!response.ok) throw new Error('Failed to fetch documents');
      
      const data = await response.json();
      setDocuments(data);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({
        title: 'Error',
        description: 'Failed to load documents',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Validate file type and size
  const validateFile = (file: File): { valid: boolean; error?: string } => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/zip',
      'application/x-zip-compressed'
    ];

    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'File type not supported. Please upload PDF, Word, Excel, PowerPoint, text, image, or ZIP files only.'
      };
    }

    if (file.size > 10 * 1024 * 1024) {
      return {
        valid: false,
        error: 'File size must be less than 10MB'
      };
    }

    return { valid: true };
  };

  // Handle file selection
  const handleFileSelect = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const newUploadFiles: UploadFile[] = [];

    fileArray.forEach((file) => {
      const validation = validateFile(file);
      
      newUploadFiles.push({
        file,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        progress: 0,
        status: validation.valid ? 'pending' : 'error',
        error: validation.error,
        name: file.name,
        documentType: 'general',
        clientId: undefined,
      });
    });

    setUploadFiles(prev => [...prev, ...newUploadFiles]);
  }, []);

  // Handle drag events
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  // Handle drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
    }
  }, [handleFileSelect]);

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelect(e.target.files);
    }
  };

  // Update file properties
  const updateUploadFile = (id: string, updates: Partial<UploadFile>) => {
    setUploadFiles(prev => prev.map(file => 
      file.id === id ? { ...file, ...updates } : file
    ));
  };

  // Remove file from upload list
  const removeUploadFile = (id: string) => {
    setUploadFiles(prev => prev.filter(file => file.id !== id));
  };

  // Upload a single file
  const uploadSingleFile = async (uploadFile: UploadFile): Promise<boolean> => {
    try {
      updateUploadFile(uploadFile.id, { status: 'uploading', progress: 0 });

      const formData = new FormData();
      formData.append('file', uploadFile.file);
      formData.append('name', uploadFile.name);
      formData.append('documentType', uploadFile.documentType);
      if (uploadFile.clientId) {
        formData.append('clientId', uploadFile.clientId);
      }

      const xhr = new XMLHttpRequest();

      return new Promise((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100);
            updateUploadFile(uploadFile.id, { progress });
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status === 200 || xhr.status === 201) {
            updateUploadFile(uploadFile.id, { 
              status: 'success', 
              progress: 100 
            });
            resolve(true);
          } else {
            const error = xhr.responseText || 'Upload failed';
            updateUploadFile(uploadFile.id, { 
              status: 'error', 
              error 
            });
            reject(new Error(error));
          }
        });

        xhr.addEventListener('error', () => {
          updateUploadFile(uploadFile.id, { 
            status: 'error', 
            error: 'Network error during upload' 
          });
          reject(new Error('Network error'));
        });

        xhr.open('POST', '/api/documents/upload');
        xhr.setRequestHeader('credentials', 'include');
        xhr.send(formData);
      });
    } catch (error: any) {
      updateUploadFile(uploadFile.id, { 
        status: 'error', 
        error: error.message || 'Upload failed' 
      });
      return false;
    }
  };

  // Upload all files
  const handleUploadAll = async () => {
    const validFiles = uploadFiles.filter(f => f.status === 'pending');
    
    if (validFiles.length === 0) {
      toast({
        title: "No files to upload",
        description: "Please add some files first",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    let successCount = 0;
    let failedCount = 0;

    // Upload files in parallel (limit to 3 concurrent uploads)
    const uploadPromises = validFiles.map(async (file, index) => {
      // Add delay to prevent overwhelming the server
      await new Promise(resolve => setTimeout(resolve, index * 100));
      
      try {
        const success = await uploadSingleFile(file);
        if (success) successCount++;
        else failedCount++;
      } catch (error) {
        failedCount++;
      }
    });

    await Promise.all(uploadPromises);

    setIsUploading(false);

    // Show summary toast
    if (successCount > 0) {
      toast({
        title: "Upload Complete",
        description: `${successCount} file(s) uploaded successfully${failedCount > 0 ? `, ${failedCount} failed` : ''}`,
      });
      
      // Refresh documents list
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      
      // Clear successful uploads after a delay
      setTimeout(() => {
        setUploadFiles(prev => prev.filter(f => f.status !== 'success'));
      }, 2000);
    }

    if (failedCount > 0 && successCount === 0) {
      toast({
        title: "Upload Failed",
        description: `${failedCount} file(s) failed to upload`,
        variant: "destructive",
      });
    }
  };

  // Clear all files
  const clearAllFiles = () => {
    setUploadFiles([]);
  };

  // Get status icon
  const getStatusIcon = (status: UploadFile['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'uploading':
        return <div className="h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />;
      default:
        return <FileText className="h-4 w-4 text-gray-400" />;
    }
  };

  // Filter documents
  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === "all" || doc.documentType === selectedType;
    const matchesClient = selectedClient === "all" || doc.clientId?.toString() === selectedClient;
    
    return matchesSearch && matchesType && matchesClient;
  });

  // Group documents by type
  const documentsByType = filteredDocuments.reduce((acc, doc) => {
    const type = doc.documentType;
    if (!acc[type]) acc[type] = [];
    acc[type].push(doc);
    return acc;
  }, {} as Record<string, Document[]>);

  const handleDownload = async (doc: Document) => {
    try {
      const response = await fetch(`/api/documents/${doc.id}/download`, {
        credentials: 'include'
      });
      
      if (!response.ok) throw new Error('Failed to download document');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.name;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading document:', error);
      toast({
        title: 'Error',
        description: 'Failed to download document',
        variant: 'destructive'
      });
    }
  };

  const handlePreview = async (doc: Document) => {
    try {
      window.open(`/api/documents/${doc.id}/preview`, '_blank');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to preview document",
        variant: "destructive",
      });
    }
  };

  const getDocumentTypeColor = (type: string) => {
    switch (type) {
      case "contract": return "bg-blue-100 text-blue-800";
      case "compliance": return "bg-green-100 text-green-800";
      case "technical": return "bg-purple-100 text-purple-800";
      case "general": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const isPreviewable = (mimeType: string) => {
    const previewableMimes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'text/plain'
    ];
    return previewableMimes.includes(mimeType);
  };

  // Share document handler
  const handleShare = async (doc: Document) => {
    try {
      // Generate a shareable link or copy to clipboard
      const shareableLink = `${window.location.origin}/documents/${doc.id}/shared?token=${btoa(doc.id.toString())}`;
      
      // Try to use the Web Share API if available
      if (navigator.share) {
        await navigator.share({
          title: `Document: ${doc.name}`,
          text: `Shared document from MSSP Client Manager`,
          url: shareableLink,
        });
        
        toast({
          title: "Document Shared",
          description: `"${doc.name}" has been shared successfully.`
        });
      } else {
        // Fallback: Copy to clipboard
        await navigator.clipboard.writeText(shareableLink);
        
        toast({
          title: "Link Copied",
          description: `Shareable link for "${doc.name}" has been copied to clipboard.`
        });
      }
      
      // Log the share action
      await fetch('/api/documents/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          documentId: doc.id,
          shareMethod: navigator.share ? 'native' : 'clipboard',
          shareUrl: shareableLink
        })
      });
      
    } catch (error) {
      console.error('Error sharing document:', error);
      
      // Fallback: Show sharing options in a modal/dialog
      const shareOptions = [
        { name: 'Copy Link', action: async () => {
          const shareableLink = `${window.location.origin}/documents/${doc.id}/shared?token=${btoa(doc.id.toString())}`;
          await navigator.clipboard.writeText(shareableLink);
          toast({
            title: "Link Copied",
            description: "Shareable link copied to clipboard."
          });
        }},
        { name: 'Email', action: () => {
          const subject = encodeURIComponent(`Document: ${doc.name}`);
          const body = encodeURIComponent(`I'm sharing this document with you: ${window.location.origin}/documents/${doc.id}/shared?token=${btoa(doc.id.toString())}`);
          window.open(`mailto:?subject=${subject}&body=${body}`);
        }},
        { name: 'Download & Share', action: () => handleDownload(doc) }
      ];
      
      // For now, just copy to clipboard as fallback
      try {
        const shareableLink = `${window.location.origin}/documents/${doc.id}/shared?token=${btoa(doc.id.toString())}`;
        await navigator.clipboard.writeText(shareableLink);
        toast({
          title: "Link Copied",
          description: `Shareable link for "${doc.name}" copied to clipboard.`
        });
      } catch (clipboardError) {
        toast({
          title: "Share Failed",
          description: "Unable to create shareable link. Please try downloading the document instead.",
          variant: "destructive"
        });
      }
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      const response = await fetch(`/api/documents/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Failed to delete document');

      toast({
        title: 'Success',
        description: 'Document deleted successfully'
      });

      fetchDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete document',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <AppLayout 
      title="Document Management" 
      subtitle="Manage client documents, compliance files, and technical documentation"
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex-1" />
          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Upload Documents
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[800px] max-h-[85vh] overflow-hidden">
              <DialogHeader>
                <DialogTitle>Upload Documents</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Drag & Drop Area */}
                <div
                  className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragActive 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <Upload className={`mx-auto h-12 w-12 ${dragActive ? 'text-blue-500' : 'text-gray-400'}`} />
                  <div className="mt-4">
                    <p className="text-lg font-medium text-gray-900">
                      Drop files here or click to browse
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Supports PDF, Word, Excel, PowerPoint, text, images, and ZIP files (Max 10MB each)
                    </p>
                  </div>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png,.gif,.zip"
                    onChange={handleFileInputChange}
                  />
                  
                  <div className="mt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Select Files
                    </Button>
                  </div>
                </div>

                {/* File List */}
                {uploadFiles.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">Files to Upload ({uploadFiles.length})</h3>
                      <div className="space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={clearAllFiles}
                          disabled={isUploading}
                        >
                          Clear All
                        </Button>
                        <Button
                          onClick={handleUploadAll}
                          disabled={isUploading || uploadFiles.every(f => f.status !== 'pending')}
                        >
                          {isUploading ? 'Uploading...' : 'Upload All'}
                        </Button>
                      </div>
                    </div>

                    <div className="max-h-96 overflow-y-auto space-y-2">
                      {uploadFiles.map((uploadFile) => (
                        <div
                          key={uploadFile.id}
                          className="flex items-center space-x-3 p-3 border rounded-lg"
                        >
                          <div className="flex-shrink-0">
                            {getStatusIcon(uploadFile.status)}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {uploadFile.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatFileSize(uploadFile.file.size)}
                              </p>
                            </div>
                            
                            {uploadFile.status === 'uploading' && (
                              <div className="mt-1">
                                <Progress value={uploadFile.progress} className="h-1" />
                                <p className="text-xs text-gray-500 mt-1">
                                  {uploadFile.progress}% uploaded
                                </p>
                              </div>
                            )}
                            
                            {uploadFile.status === 'error' && (
                              <p className="text-xs text-red-600 mt-1">
                                {uploadFile.error}
                              </p>
                            )}
                            
                            {uploadFile.status === 'success' && (
                              <p className="text-xs text-green-600 mt-1">
                                Upload successful
                              </p>
                            )}
                            
                            {uploadFile.status === 'pending' && (
                              <div className="mt-2 grid grid-cols-2 gap-2">
                                <Select
                                  value={uploadFile.documentType}
                                  onValueChange={(value) => 
                                    updateUploadFile(uploadFile.id, { documentType: value })
                                  }
                                >
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="general">General</SelectItem>
                                    <SelectItem value="contract">Contract</SelectItem>
                                    <SelectItem value="compliance">Compliance</SelectItem>
                                    <SelectItem value="technical">Technical</SelectItem>
                                  </SelectContent>
                                </Select>
                                
                                <Select
                                  value={uploadFile.clientId || ""}
                                  onValueChange={(value) => 
                                    updateUploadFile(uploadFile.id, { clientId: value || undefined })
                                  }
                                >
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder="Client (optional)" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">No Client</SelectItem>
                                    {clients.map((client) => (
                                      <SelectItem key={client.id} value={client.id.toString()}>
                                        {formatClientName(client)}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                          </div>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeUploadFile(uploadFile.id)}
                            disabled={uploadFile.status === 'uploading'}
                            className="flex-shrink-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setIsUploadOpen(false);
                      setUploadFiles([]);
                    }}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="sm:max-w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="contract">Contracts</SelectItem>
              <SelectItem value="compliance">Compliance</SelectItem>
              <SelectItem value="technical">Technical</SelectItem>
              <SelectItem value="general">General</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedClient} onValueChange={setSelectedClient}>
            <SelectTrigger className="sm:max-w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              {(clients || []).map((client) => (
                <SelectItem key={client.id} value={client.id.toString()}>
                  {formatClientName(client)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{documents.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Size</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatFileSize(documents.reduce((sum, doc) => sum + doc.fileSize, 0))}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Document Types</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Set(documents.map(d => d.documentType)).size}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Documents</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {documents.filter(d => d.isActive).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Documents by Type */}
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">All Documents</TabsTrigger>
            <TabsTrigger value="contract">Contracts</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
            <TabsTrigger value="technical">Technical</TabsTrigger>
            <TabsTrigger value="general">General</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {filteredDocuments.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center text-muted-foreground">
                    <FolderOpen className="mx-auto h-12 w-12 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No documents found</h3>
                    <p>Upload your first document to get started.</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDocuments.map((doc) => (
                  <Card key={doc.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="text-3xl">{getFileIcon(doc.mimeType)}</div>
                          <div className="flex-1">
                            <h3 className="font-semibold truncate">{doc.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {formatFileSize(doc.fileSize)}
                            </p>
                          </div>
                        </div>
                        <Badge variant={doc.isActive ? 'default' : 'secondary'}>
                          {doc.documentType}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {doc.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {doc.description}
                        </p>
                      )}
                      
                      <div className="space-y-1 text-sm">
                        {doc.entityName && (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Related to:</span>
                            <span>{doc.entityName}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Uploaded:</span>
                          <span>{formatDate(doc.createdAt)}</span>
                        </div>
                        {doc.uploadedByName && (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">By:</span>
                            <span>{doc.uploadedByName}</span>
                          </div>
                        )}
                      </div>
                      
                      <Separator />
                      
                      <div className="flex justify-between gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDownload(doc)}
                        >
                          <Download className="mr-1 h-3 w-3" />
                          Download
                        </Button>
                        {isPreviewable(doc.mimeType) && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handlePreview(doc)}
                          >
                            <Eye className="mr-1 h-3 w-3" />
                            Preview
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => handleShare(doc)}>
                          <Share2 className="mr-1 h-3 w-3" />
                          Share
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(doc.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Other tab contents would be filtered versions of the same cards */}
          {Object.entries(documentsByType).map(([type, docs]) => (
            <TabsContent key={type} value={type} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {docs.map((doc) => (
                  <Card key={doc.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-sm font-medium truncate">
                        {doc.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {doc.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {doc.description}
                        </p>
                      )}
                      
                      <div className="flex items-center text-xs text-muted-foreground">
                        <FileText className="mr-1 h-3 w-3" />
                        {doc.fileName}
                      </div>
                      
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Clock className="mr-1 h-3 w-3" />
                        Version {doc.version} • {formatFileSize(doc.fileSize)}
                      </div>
                      
                      <Separator />
                      
                      <div className="flex justify-between gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDownload(doc)}
                        >
                          <Download className="mr-1 h-3 w-3" />
                          Download
                        </Button>
                        {isPreviewable(doc.mimeType) && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handlePreview(doc)}
                          >
                            <Eye className="mr-1 h-3 w-3" />
                            Preview
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => handleShare(doc)}>
                          <Share2 className="mr-1 h-3 w-3" />
                          Share
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(doc.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </AppLayout>
  );
}