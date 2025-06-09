import React, { useState, useRef } from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Upload, 
  Download, 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Users,
  Settings,
  Target,
  Shield,
  Award,
  Info
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface ImportResult {
  success: boolean;
  message: string;
  recordsProcessed: number;
  recordsSuccessful: number;
  recordsFailed: number;
  errors: string[];
  details?: Record<string, any>;
}

interface ImportProgress {
  stage: string;
  progress: number;
  message: string;
}

export default function BulkImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [importType, setImportType] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [detectedColumns, setDetectedColumns] = useState<any>(null);
  const [showColumnMapping, setShowColumnMapping] = useState(false);
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({});
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const importTypes = [
    {
      id: 'comprehensive-clients',
      name: 'Comprehensive Clients',
      icon: Users,
      description: 'Import clients with all related data (contracts, assets, licenses, SAFs, COCs)',
      fields: ['clientName', 'industry', 'companySize', 'contactEmail', 'contractName', 'contractValue', 'serviceName', 'assetName', 'licenseName', 'safNumber', 'cocNumber']
    },
    {
      id: 'clients',
      name: 'Clients',
      icon: Users,
      description: 'Import client information and contact details',
      fields: ['name', 'industry', 'companySize', 'status', 'source', 'address', 'website', 'notes', 'contactName', 'contactEmail', 'contactPhone', 'contactTitle']
    },
    {
      id: 'contracts',
      name: 'Contracts',
      icon: FileText,
      description: 'Import client contracts and agreements',
      fields: ['clientName', 'contractName', 'startDate', 'endDate', 'totalValue', 'status', 'autoRenewal', 'renewalTerms', 'notes']
    },
    {
      id: 'services',
      name: 'Services',
      icon: Settings,
      description: 'Import service catalog and offerings',
      fields: ['name', 'category', 'description', 'deliveryModel', 'basePrice', 'pricingUnit', 'isActive']
    },
    {
      id: 'service-scopes',
      name: 'Service Scopes',
      icon: Target,
      description: 'Import service scope definitions and deliverables',
      fields: ['clientName', 'contractName', 'serviceName', 'description', 'startDate', 'endDate', 'status', 'deliverables', 'timeline', 'notes']
    },
    {
      id: 'safs',
      name: 'Service Authorization Forms',
      icon: Shield,
      description: 'Import SAF documents and authorizations',
      fields: ['clientName', 'contractName', 'serviceScopeName', 'safNumber', 'title', 'description', 'startDate', 'endDate', 'status', 'value', 'notes']
    },
    {
      id: 'cocs',
      name: 'Certificates of Compliance',
      icon: Award,
      description: 'Import compliance certificates and audit records',
      fields: ['clientName', 'contractName', 'serviceScopeName', 'safNumber', 'cocNumber', 'title', 'description', 'complianceType', 'issueDate', 'expiryDate', 'status', 'auditDate', 'nextAuditDate', 'notes']
    }
  ];

  const csvTemplates = {
    'comprehensive-clients': `clientName,industry,companySize,contactEmail,contactPhone,contactName,contactTitle,address,website,notes,contractName,contractValue,contractStartDate,contractEndDate,contractStatus,serviceName,serviceCategory,assetName,assetCategory,licenseName,licenseVendor,safNumber,safTitle,cocNumber,cocTitle
"Acme Corporation","Technology","Large","john.smith@acme.com","+1-555-0123","John Smith","CTO","123 Main St, New York, NY 10001","https://acme.com","Primary technology client","SOC Monitoring Agreement","120000.00","2024-01-01","2024-12-31","active","24/7 SOC Monitoring","Security Operations","Firewall Pro 3000","Network Security","Microsoft Office 365","Microsoft","SAF-2024-001","SOC Monitoring Authorization","COC-2024-001","SOC 2 Type II Compliance"
"Beta Industries","Manufacturing","Medium","jane.doe@beta.com","+1-555-0456","Jane Doe","IT Director","456 Oak Ave, Chicago, IL 60601","https://beta.com","Manufacturing prospect","Security Assessment","45000.00","2024-02-15","2024-08-15","active","Vulnerability Assessment","Security Testing","Server Dell R740","Server Hardware","Windows Server 2022","Microsoft","SAF-2024-002","Security Assessment Authorization","COC-2024-002","Security Assessment Compliance"
"Gamma Solutions","Healthcare","Small","bob.johnson@gamma.com","+1-555-0789","Security Manager","789 Pine St, Los Angeles, CA 90210","https://gamma.com","Healthcare compliance focus","Compliance Management","85000.00","2024-03-01","2025-02-28","active","Compliance Audit","Compliance","Medical Workstation","Workstation","VMware vSphere","VMware","SAF-2024-003","Compliance Audit Authorization","COC-2024-003","HIPAA Compliance Certificate"`,

    clients: `name,industry,companySize,status,source,address,website,notes,contactName,contactEmail,contactPhone,contactTitle
"Acme Corporation","Technology","Large","active","referral","123 Main St, New York, NY 10001","https://acme.com","Primary technology client","John Smith","john.smith@acme.com","+1-555-0123","CTO"
"Beta Industries","Manufacturing","Medium","prospect","website","456 Oak Ave, Chicago, IL 60601","https://beta.com","Manufacturing prospect","Jane Doe","jane.doe@beta.com","+1-555-0456","IT Director"
"Gamma Solutions","Healthcare","Small","active","cold_call","789 Pine St, Los Angeles, CA 90210","https://gamma.com","Healthcare compliance focus","Bob Johnson","bob.johnson@gamma.com","+1-555-0789","Security Manager"`,

    contracts: `clientName,contractName,startDate,endDate,totalValue,status,autoRenewal,renewalTerms,notes
"Acme Corporation","SOC Monitoring Agreement","2024-01-01","2024-12-31","120000.00","active","true","12 months","Annual SOC monitoring contract"
"Beta Industries","Security Assessment","2024-02-15","2024-08-15","45000.00","active","false","","One-time security assessment"
"Gamma Solutions","Compliance Management","2024-03-01","2025-02-28","85000.00","active","true","12 months","HIPAA compliance management"`,

    services: `name,category,description,deliveryModel,basePrice,pricingUnit,isActive
"24/7 SOC Monitoring","Security Operations","Round-the-clock security monitoring and incident response","Remote","5000.00","per month","true"
"Vulnerability Assessment","Security Testing","Comprehensive vulnerability scanning and assessment","Hybrid","15000.00","per assessment","true"
"Compliance Audit","Compliance","Regulatory compliance audit and certification","On-site","25000.00","per audit","true"
"Incident Response","Security Operations","Emergency incident response and forensics","Remote","10000.00","per incident","true"`,

    'service-scopes': `clientName,contractName,serviceName,description,startDate,endDate,status,deliverables,timeline,notes
"Acme Corporation","SOC Monitoring Agreement","24/7 SOC Monitoring","Continuous monitoring of network infrastructure","2024-01-01","2024-12-31","active","Monthly reports|Incident alerts|Quarterly reviews","Monthly reporting cycle","Primary monitoring scope"
"Beta Industries","Security Assessment","Vulnerability Assessment","Network and application security assessment","2024-02-15","2024-04-15","completed","Vulnerability report|Remediation plan|Executive summary","8-week assessment","Completed successfully"
"Gamma Solutions","Compliance Management","Compliance Audit","HIPAA compliance audit and certification","2024-03-01","2024-06-01","active","Audit report|Compliance certificate|Training materials","12-week process","Ongoing compliance project"`,

    safs: `clientName,contractName,serviceScopeName,safNumber,title,description,startDate,endDate,status,value,notes
"Acme Corporation","SOC Monitoring Agreement","24/7 SOC Monitoring","SAF-2024-001","SOC Monitoring Authorization","Authorization for 24/7 security monitoring services","2024-01-01","2024-12-31","approved","60000.00","First half payment authorization"
"Beta Industries","Security Assessment","Vulnerability Assessment","SAF-2024-002","Security Assessment Authorization","Authorization for comprehensive security assessment","2024-02-15","2024-04-15","completed","45000.00","Full payment authorized"
"Gamma Solutions","Compliance Management","Compliance Audit","SAF-2024-003","Compliance Audit Authorization","Authorization for HIPAA compliance audit","2024-03-01","2024-06-01","active","42500.00","Phase 1 payment authorization"`,

    cocs: `clientName,contractName,serviceScopeName,safNumber,cocNumber,title,description,complianceType,issueDate,expiryDate,status,auditDate,nextAuditDate,notes
"Acme Corporation","SOC Monitoring Agreement","24/7 SOC Monitoring","SAF-2024-001","COC-2024-001","SOC 2 Type II Compliance","SOC 2 Type II compliance certificate","SOC2","2024-06-01","2025-06-01","active","2024-05-15","2025-05-15","Annual SOC 2 certification"
"Beta Industries","Security Assessment","Vulnerability Assessment","SAF-2024-002","COC-2024-002","Security Assessment Compliance","Security assessment compliance certificate","ISO27001","2024-04-15","2025-04-15","active","2024-04-01","2025-04-01","ISO 27001 assessment compliance"
"Gamma Solutions","Compliance Management","Compliance Audit","SAF-2024-003","COC-2024-003","HIPAA Compliance Certificate","HIPAA compliance audit certificate","HIPAA","2024-06-01","2025-06-01","active","2024-05-20","2025-05-20","HIPAA compliance certification"`
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
      setDetectedColumns(null);
      setShowColumnMapping(false);
    }
  };

  const detectColumns = async () => {
    if (!file) return;

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/bulk-import/detect-columns', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setDetectedColumns(data);
        setShowColumnMapping(true);
        
        // Auto-map detected fields
        const autoMappings: Record<string, string> = {};
        Object.entries(data.suggestedMappings?.autoDetected || {}).forEach(([field, mapping]: [string, any]) => {
          autoMappings[mapping.columnName] = field;
        });
        setFieldMappings(autoMappings);
      } else {
        const error = await response.json();
        toast.error(`Column detection failed: ${error.message}`);
      }
    } catch (error) {
      console.error('Column detection error:', error);
      toast.error('Failed to detect columns');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast({
        title: "No File Selected",
        description: "Please select a CSV file first.",
        variant: "destructive"
      });
      return;
    }

    if (!importType) {
      toast({
        title: "No Import Type Selected",
        description: "Please select an import type first.",
        variant: "destructive"
      });
      return;
    }

    setIsImporting(true);
    setImportProgress({ stage: 'Uploading', progress: 10, message: 'Uploading file...' });

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', importType);

      // Add field mappings for comprehensive import
      if (importType === 'comprehensive-clients' && fieldMappings) {
        formData.append('fieldMappings', JSON.stringify(fieldMappings));
      }

      setImportProgress({ stage: 'Processing', progress: 30, message: 'Processing records...' });

      // Use comprehensive endpoint for comprehensive-clients import type
      const endpoint = importType === 'comprehensive-clients' 
        ? '/api/bulk-import/comprehensive' 
        : '/api/bulk-import';

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      setImportProgress({ stage: 'Validating', progress: 60, message: 'Validating data...' });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      setImportProgress({ stage: 'Complete', progress: 100, message: 'Import completed!' });
      setResult(result);

      if (result.success) {
        toast({
          title: "Import Successful",
          description: `Successfully imported ${result.recordsSuccessful} out of ${result.recordsProcessed} records.`,
        });
      } else {
        toast({
          title: "Import Completed with Errors",
          description: `${result.recordsSuccessful} successful, ${result.recordsFailed} failed.`,
          variant: "destructive"
        });
      }

    } catch (error) {
      console.error('Import error:', error);
      setImportProgress(null);
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Import failed',
        recordsProcessed: 0,
        recordsSuccessful: 0,
        recordsFailed: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
      
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : 'An unexpected error occurred.',
        variant: "destructive"
      });
    } finally {
      setIsImporting(false);
    }
  };

  const resetImport = () => {
    setFile(null);
    setImportProgress(null);
    setResult(null);
    setDetectedColumns(null);
    setShowColumnMapping(false);
    setFieldMappings({});
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadTemplate = (templateType: string) => {
    const template = csvTemplates[templateType as keyof typeof csvTemplates];
    if (!template) {
      toast({
        title: "Template Not Found",
        description: `No template available for ${templateType}`,
        variant: "destructive"
      });
      return;
    }

    // Create a blob with the CSV content
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    
    // Create a temporary URL for the blob
    const url = URL.createObjectURL(blob);
    
    // Create a temporary anchor element and trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = `${templateType}-template.csv`;
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Template Downloaded",
      description: `${templateType} template has been downloaded successfully.`,
    });
  };

  const selectedImportType = importTypes.find(type => type.id === importType);

  return (
    <AppLayout 
      title="Bulk Data Import" 
      subtitle="Import client-related data from CSV files"
    >
      <main className="flex-1 overflow-auto p-6 pt-16 md:pt-6">
        <div className="max-w-6xl mx-auto space-y-6">
          
          {/* Import Type Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Upload className="h-5 w-5 mr-2" />
                Select Import Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={importType} onValueChange={setImportType}>
                <TabsList className="grid grid-cols-3 lg:grid-cols-6 w-full">
                  {importTypes.map((type) => (
                    <TabsTrigger key={type.id} value={type.id} className="flex flex-col items-center p-3">
                      <type.icon className="h-4 w-4 mb-1" />
                      <span className="text-xs">{type.name}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>

                {importTypes.map((type) => (
                  <TabsContent key={type.id} value={type.id} className="mt-6">
                    <div className="space-y-4">
                      <div className="flex items-start space-x-3">
                        <type.icon className="h-6 w-6 text-blue-600 mt-1" />
                        <div>
                          <h3 className="text-lg font-semibold">{type.name}</h3>
                          <p className="text-gray-600">{type.description}</p>
                        </div>
                      </div>

                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Required Fields:</strong> {type.fields.join(', ')}
                        </AlertDescription>
                      </Alert>

                      <div className="flex space-x-3">
                        <Button
                          variant="outline"
                          onClick={() => downloadTemplate(type.id)}
                          className="flex items-center"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download Template
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>

          {/* File Upload */}
          <Card>
            <CardHeader>
              <CardTitle>Upload CSV File</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="csv-file">Select CSV File</Label>
                <Input
                  ref={fileInputRef}
                  id="csv-file"
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  disabled={isImporting}
                  className="mt-1"
                />
              </div>

              {file && (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-gray-500">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary">
                    {selectedImportType?.name}
                  </Badge>
                </div>
              )}

              <div className="flex space-x-3">
                <Button
                  onClick={detectColumns}
                  disabled={!file || isImporting}
                  className="flex items-center"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {isLoading ? 'Detecting Columns...' : 'Detect Columns'}
                </Button>

                <Button
                  onClick={handleImport}
                  disabled={!file || isImporting}
                  className="flex items-center"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {isImporting ? 'Importing...' : 'Start Import'}
                </Button>

                {(file || result) && (
                  <Button
                    variant="outline"
                    onClick={resetImport}
                    disabled={isImporting}
                  >
                    Reset
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Column Mapping Interface */}
          {showColumnMapping && detectedColumns && (
            <Card>
              <CardHeader>
                <CardTitle>Column Mapping</CardTitle>
                <p className="text-sm text-gray-600">
                  Map your CSV columns to the system fields. Auto-detected mappings are shown.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-3">Detected Columns ({detectedColumns.detectedColumns.length})</h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {detectedColumns.detectedColumns.map((column: string, index: number) => (
                        <div key={index} className="p-2 bg-gray-50 rounded text-sm">
                          {column}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-3">Sample Data</h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {detectedColumns.sampleData.map((row: string[], rowIndex: number) => (
                        <div key={rowIndex} className="text-xs">
                          <div className="font-medium">Row {rowIndex + 1}:</div>
                          {row.slice(0, 3).map((cell, cellIndex) => (
                            <div key={cellIndex} className="ml-2 text-gray-600">
                              {detectedColumns.detectedColumns[cellIndex]}: {cell || '<empty>'}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Field Mappings</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {detectedColumns.detectedColumns.map((column: string) => (
                      <div key={column} className="space-y-2">
                        <label className="text-sm font-medium">{column}</label>
                        <select
                          value={fieldMappings[column] || ''}
                          onChange={(e) => setFieldMappings({
                            ...fieldMappings,
                            [column]: e.target.value
                          })}
                          className="w-full p-2 border rounded"
                        >
                          <option value="">Skip this column</option>
                          <optgroup label="Client Fields">
                            <option value="clientName">Client Name</option>
                            <option value="industry">Industry</option>
                            <option value="companySize">Company Size</option>
                            <option value="contactName">Contact Name</option>
                            <option value="contactEmail">Contact Email</option>
                            <option value="contactPhone">Contact Phone</option>
                            <option value="website">Website</option>
                            <option value="address">Address</option>
                          </optgroup>
                          <optgroup label="Contract Fields">
                            <option value="contractName">Contract Name</option>
                            <option value="contractValue">Contract Value</option>
                            <option value="contractStartDate">Contract Start Date</option>
                            <option value="contractEndDate">Contract End Date</option>
                            <option value="contractStatus">Contract Status</option>
                          </optgroup>
                          <optgroup label="Service Fields">
                            <option value="serviceName">Service Name</option>
                            <option value="serviceCategory">Service Category</option>
                            <option value="servicePrice">Service Price</option>
                          </optgroup>
                          <optgroup label="Asset Fields">
                            <option value="assetName">Asset Name</option>
                            <option value="assetCategory">Asset Category</option>
                            <option value="assetBrand">Asset Brand</option>
                            <option value="assetModel">Asset Model</option>
                            <option value="serialNumber">Serial Number</option>
                            <option value="assetCost">Asset Cost</option>
                          </optgroup>
                          <optgroup label="License Fields">
                            <option value="licenseName">License Name</option>
                            <option value="licenseVendor">License Vendor</option>
                            <option value="licenseQuantity">License Quantity</option>
                            <option value="licenseCost">License Cost</option>
                          </optgroup>
                          <optgroup label="SAF Fields">
                            <option value="safNumber">SAF Number</option>
                            <option value="safTitle">SAF Title</option>
                            <option value="safValue">SAF Value</option>
                          </optgroup>
                          <optgroup label="COC Fields">
                            <option value="cocNumber">COC Number</option>
                            <option value="cocTitle">COC Title</option>
                            <option value="complianceType">Compliance Type</option>
                          </optgroup>
                        </select>
                      </div>
                    ))}
                  </div>
                </div>

                {detectedColumns.suggestedMappings?.autoDetected && (
                  <div className="bg-blue-50 p-4 rounded">
                    <h5 className="font-medium text-blue-800 mb-2">Auto-detected Mappings:</h5>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                      {Object.entries(detectedColumns.suggestedMappings.autoDetected).map(([field, mapping]: [string, any]) => (
                        <div key={field} className="text-blue-700">
                          {mapping.columnName} → {field} ({Math.round(mapping.confidence * 100)}%)
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Import Progress */}
          {importProgress && (
            <Card>
              <CardHeader>
                <CardTitle>Import Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>{importProgress.stage}</span>
                    <span>{importProgress.progress}%</span>
                  </div>
                  <Progress value={importProgress.progress} className="w-full" />
                </div>
                <p className="text-sm text-gray-600">{importProgress.message}</p>
              </CardContent>
            </Card>
          )}

          {/* Import Results */}
          {result && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  {result.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600 mr-2" />
                  )}
                  Import Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {result.recordsProcessed}
                    </div>
                    <div className="text-sm text-gray-600">Total Records</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {result.recordsSuccessful}
                    </div>
                    <div className="text-sm text-gray-600">Successful</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {result.recordsFailed}
                    </div>
                    <div className="text-sm text-gray-600">Failed</div>
                  </div>
                </div>

                {/* Detailed Results for Comprehensive Import */}
                {importType === 'comprehensive-clients' && result.details && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-3">Detailed Results by Entity Type</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {Object.entries(result.details).map(([entityType, counts]: [string, any]) => (
                        <div key={entityType} className="p-3 bg-gray-50 rounded">
                          <div className="font-medium text-sm capitalize">
                            {entityType.replace(/([A-Z])/g, ' $1').trim()}
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            <div>Created: {counts.created}</div>
                            <div>Updated: {counts.updated}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {result.message && (
                  <Alert className={result.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                    <AlertDescription>{result.message}</AlertDescription>
                  </Alert>
                )}

                {result.errors && result.errors.length > 0 && (
                  <div>
                    <h4 className="font-medium text-red-600 mb-2">Errors:</h4>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {result.errors.map((error, index) => (
                        <div key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                          {error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* CSV Format Guide */}
          <Card>
            <CardHeader>
              <CardTitle>CSV Format Guidelines</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-2">General Requirements</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Use UTF-8 encoding</li>
                    <li>• Include header row with field names</li>
                    <li>• Use comma (,) as delimiter</li>
                    <li>• Enclose text with commas in quotes</li>
                    <li>• Date format: YYYY-MM-DD</li>
                    <li>• Boolean values: true/false</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Data Validation</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Required fields cannot be empty</li>
                    <li>• Email addresses must be valid</li>
                    <li>• Dates must be in correct format</li>
                    <li>• Numeric values for prices/amounts</li>
                    <li>• Status values must match predefined options</li>
                    <li>• Client names must exist for related data</li>
                  </ul>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-2">Import Order Recommendation</h4>
                <p className="text-sm text-gray-600 mb-3">
                  For best results, import data in this order to ensure proper relationships:
                </p>
                <div className="flex flex-wrap gap-2">
                  {['Clients', 'Services', 'Contracts', 'Service Scopes', 'SAFs', 'COCs'].map((item, index) => (
                    <Badge key={item} variant="outline" className="text-xs">
                      {index + 1}. {item}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </AppLayout>
  );
} 