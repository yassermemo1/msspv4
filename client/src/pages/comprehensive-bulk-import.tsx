import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Upload, 
  Copy, 
  CheckCircle, 
  AlertCircle, 
  Download,
  Eye,
  BarChart3,
  Users,
  FileText,
  Settings,
  HardDrive,
  Key,
  Shield,
  Award,
  Trash2,
  RefreshCw,
  MapPin,
  Info,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AppLayout } from '@/components/layout/app-layout';

interface ImportResult {
  success: boolean;
  message: string;
  recordsProcessed: number;
  recordsSuccessful: number;
  recordsFailed: number;
  recordsSkipped: number;
  errors: string[];
  warnings: string[];
  details: {
    clients: { created: number; updated: number; skipped: number };
    contacts: { created: number; updated: number };
    contracts: { created: number; updated: number };
    serviceScopes: { created: number; updated: number };
    licenseAssignments: { created: number; updated: number };
    hardwareAssignments: { created: number; updated: number };
  };
}

interface ParsedData {
  headers: string[];
  rows: string[][];
  totalRows: number;
}

interface ColumnMapping {
  sourceColumn: string;
  targetField: string;
  entityType: string;
  required: boolean;
  dataType: string;
}

// Field definitions for each entity type
const FIELD_DEFINITIONS = {
  clients: {
    name: { 
      description: 'Client company name (Required)', 
      dataType: 'text', 
      required: true,
      example: 'Acme Corporation'
    },
    shortName: { 
      description: 'Client abbreviated name', 
      dataType: 'text', 
      required: false,
      example: 'ACME'
    },
    domain: { 
      description: 'Company domain', 
      dataType: 'text', 
      required: false,
      example: 'acme.com'
    },
    industry: { 
      description: 'Industry sector', 
      dataType: 'text', 
      required: false,
      example: 'Technology'
    },
    companySize: { 
      description: 'Company size category', 
      dataType: 'text', 
      required: false,
      example: 'Mid-market (100-999 employees)'
    },
    status: { 
      description: 'Client status', 
      dataType: 'text', 
      required: false,
      example: 'active, prospect, inactive'
    },
    source: { 
      description: 'How they found us', 
      dataType: 'text', 
      required: false,
      example: 'Referral, Website, Cold Call'
    },
    address: { 
      description: 'Company address', 
      dataType: 'text', 
      required: false,
      example: '123 Business St, City, State 12345'
    },
    website: { 
      description: 'Company website URL', 
      dataType: 'text', 
      required: false,
      example: 'https://www.acme.com'
    },
    notes: { 
      description: 'Additional notes', 
      dataType: 'text', 
      required: false,
      example: 'Important client requirements or notes'
    }
  },
  contacts: {
    name: { 
      description: 'Contact full name (Required)', 
      dataType: 'text', 
      required: true,
      example: 'John Smith'
    },
    email: { 
      description: 'Contact email address (Required)', 
      dataType: 'email', 
      required: true,
      example: 'john.smith@acme.com'
    },
    phone: { 
      description: 'Contact phone number', 
      dataType: 'text', 
      required: false,
      example: '+1-555-123-4567'
    },
    title: { 
      description: 'Job title', 
      dataType: 'text', 
      required: false,
      example: 'IT Director'
    },
    isPrimary: { 
      description: 'Is primary contact', 
      dataType: 'boolean', 
      required: false,
      example: 'true, false'
    },
    isActive: { 
      description: 'Is active contact', 
      dataType: 'boolean', 
      required: false,
      example: 'true, false'
    }
  },
  contracts: {
    name: { 
      description: 'Contract name/title (Required)', 
      dataType: 'text', 
      required: true,
      example: 'Annual Security Services Agreement'
    },
    startDate: { 
      description: 'Contract start date (Required)', 
      dataType: 'date', 
      required: true,
      example: '2024-01-01'
    },
    endDate: { 
      description: 'Contract end date (Required)', 
      dataType: 'date', 
      required: true,
      example: '2024-12-31'
    },
    autoRenewal: { 
      description: 'Auto-renewal enabled', 
      dataType: 'boolean', 
      required: false,
      example: 'true, false'
    },
    renewalTerms: { 
      description: 'Renewal terms', 
      dataType: 'text', 
      required: false,
      example: 'Annual automatic renewal'
    },
    totalValue: { 
      description: 'Total contract value', 
      dataType: 'number', 
      required: false,
      example: '120000.00'
    },
    status: { 
      description: 'Contract status', 
      dataType: 'text', 
      required: false,
      example: 'draft, active, expired'
    },
    documentUrl: { 
      description: 'Contract document URL', 
      dataType: 'text', 
      required: false,
      example: 'https://docs.company.com/contract123.pdf'
    },
    notes: { 
      description: 'Contract notes', 
      dataType: 'text', 
      required: false,
      example: 'Special terms and conditions'
    }
  },
  licenses: {
    assignedLicenses: { 
      description: 'Number of assigned licenses (Required)', 
      dataType: 'integer', 
      required: true,
      example: '25'
    },
    notes: { 
      description: 'License assignment notes', 
      dataType: 'text', 
      required: false,
      example: 'SIEM EPS allocation for Q1'
    }
  },
  hardware: {
    name: { 
      description: 'Hardware asset name (Required)', 
      dataType: 'text', 
      required: true,
      example: 'Firewall Device #1'
    },
    serialNumber: { 
      description: 'Hardware serial number (Required)', 
      dataType: 'text', 
      required: true,
      example: 'FW-2024-001-ABC123'
    },
    manufacturer: { 
      description: 'Hardware manufacturer', 
      dataType: 'text', 
      required: false,
      example: 'Cisco, Fortinet, Palo Alto'
    },
    model: { 
      description: 'Hardware model', 
      dataType: 'text', 
      required: false,
      example: 'ASA-5516-X'
    },
    category: { 
      description: 'Hardware category', 
      dataType: 'text', 
      required: false,
      example: 'Firewall, Server, Network Equipment'
    },
    purchaseDate: { 
      description: 'Purchase date', 
      dataType: 'date', 
      required: false,
      example: '2024-01-15'
    },
    warrantyExpiryDate: { 
      description: 'Warranty expiry date', 
      dataType: 'date', 
      required: false,
      example: '2027-01-15'
    },
    status: { 
      description: 'Hardware status', 
      dataType: 'text', 
      required: false,
      example: 'active, maintenance, retired'
    },
    installationLocation: { 
      description: 'Installation location', 
      dataType: 'text', 
      required: false,
      example: 'Data Center Rack A1'
    },
    location: { 
      description: 'General location (alias for installationLocation)', 
      dataType: 'text', 
      required: false,
      example: 'Main Office'
    },
    notes: { 
      description: 'Hardware notes', 
      dataType: 'text', 
      required: false,
      example: 'Configured for client network segmentation'
    }
  }
};

export default function ComprehensiveBulkImportPage() {
  const [pastedData, setPastedData] = useState('');
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [currentStep, setCurrentStep] = useState<'input' | 'mapping' | 'preview' | 'results'>('input');
  const [duplicateHandling, setDuplicateHandling] = useState<'update' | 'skip' | 'create_new'>('update');
  const [clientMatchStrategy, setClientMatchStrategy] = useState<'name_only' | 'name_and_domain' | 'email' | 'custom'>('name_only');
  const { toast } = useToast();

  const handleDataParse = () => {
    if (!pastedData.trim()) {
      toast({
        title: "No Data",
        description: "Please paste some data first",
        variant: "destructive"
      });
      return;
    }

    try {
      // Parse pasted data (tab-separated or comma-separated)
      const lines = pastedData.trim().split('\n');
      const headers = lines[0].split(/\t|,/).map(h => h.trim().replace(/"/g, ''));
      const rows = lines.slice(1).map(line => 
        line.split(/\t|,/).map(cell => cell.trim().replace(/"/g, ''))
      );

      setParsedData({
        headers,
        rows: rows.filter(row => row.some(cell => cell.length > 0)), // Filter empty rows
        totalRows: rows.length
      });

      // Auto-suggest column mappings
      const suggestedMappings = autoSuggestMappings(headers);
      setColumnMappings(suggestedMappings);
      setCurrentStep('mapping');

      toast({
        title: "Data Parsed Successfully",
        description: `Found ${headers.length} columns and ${rows.length} data rows`,
      });
    } catch (error) {
      console.error('Parse error:', error);
      toast({
        title: "Parse Error",
        description: "Failed to parse the data. Please check the format.",
        variant: "destructive"
      });
    }
  };

  const autoSuggestMappings = (headers: string[]): ColumnMapping[] => {
    return headers.map(header => {
      const lowerHeader = header.toLowerCase().trim();
      let targetField = '';
      let entityType = '';
      let required = false;
      let dataType = 'text';

      // Match client fields
      if (lowerHeader.includes('client') || lowerHeader.includes('company')) {
        entityType = 'clients';
        if (lowerHeader.includes('name')) {
          targetField = 'name';
          required = true;
          dataType = 'text';
        } else if (lowerHeader.includes('short')) {
          targetField = 'shortName';
        } else if (lowerHeader.includes('domain')) {
          targetField = 'domain';
        } else if (lowerHeader.includes('industry')) {
          targetField = 'industry';
        } else if (lowerHeader.includes('size')) {
          targetField = 'companySize';
        } else if (lowerHeader.includes('status')) {
          targetField = 'status';
        } else if (lowerHeader.includes('source')) {
          targetField = 'source';
        } else if (lowerHeader.includes('address')) {
          targetField = 'address';
        } else if (lowerHeader.includes('website')) {
          targetField = 'website';
        } else if (lowerHeader.includes('note')) {
          targetField = 'notes';
        }
      }
      // Match contact fields  
      else if (lowerHeader.includes('contact') || lowerHeader.includes('person')) {
        entityType = 'contacts';
        if (lowerHeader.includes('name')) {
          targetField = 'name';
          required = true;
          dataType = 'text';
        } else if (lowerHeader.includes('email')) {
          targetField = 'email';
          required = true;
          dataType = 'email';
        } else if (lowerHeader.includes('phone')) {
          targetField = 'phone';
        } else if (lowerHeader.includes('title') || lowerHeader.includes('position')) {
          targetField = 'title';
        } else if (lowerHeader.includes('primary')) {
          targetField = 'isPrimary';
          dataType = 'boolean';
        } else if (lowerHeader.includes('active')) {
          targetField = 'isActive';
          dataType = 'boolean';
        }
      }
      // Match contract fields
      else if (lowerHeader.includes('contract')) {
        entityType = 'contracts';
        if (lowerHeader.includes('name') || lowerHeader.includes('title')) {
          targetField = 'name';
          required = true;
          dataType = 'text';
        } else if (lowerHeader.includes('start')) {
          targetField = 'startDate';
          required = true;
          dataType = 'date';
        } else if (lowerHeader.includes('end')) {
          targetField = 'endDate';
          required = true;
          dataType = 'date';
        } else if (lowerHeader.includes('value') || lowerHeader.includes('amount')) {
          targetField = 'totalValue';
          dataType = 'number';
        } else if (lowerHeader.includes('status')) {
          targetField = 'status';
        } else if (lowerHeader.includes('renewal')) {
          if (lowerHeader.includes('auto')) {
            targetField = 'autoRenewal';
            dataType = 'boolean';
          } else {
            targetField = 'renewalTerms';
          }
        } else if (lowerHeader.includes('document') || lowerHeader.includes('url')) {
          targetField = 'documentUrl';
        } else if (lowerHeader.includes('note')) {
          targetField = 'notes';
        }
      }
      // Match license fields
      else if (lowerHeader.includes('license')) {
        entityType = 'licenses';
        if (lowerHeader.includes('quantity') || lowerHeader.includes('count') || lowerHeader.includes('assigned')) {
          targetField = 'assignedLicenses';
          required = true;
          dataType = 'integer';
        } else if (lowerHeader.includes('note')) {
          targetField = 'notes';
        }
      }
      // Match hardware fields
      else if (lowerHeader.includes('hardware') || lowerHeader.includes('asset') || lowerHeader.includes('device')) {
        entityType = 'hardware';
        if (lowerHeader.includes('name')) {
          targetField = 'name';
          required = true;
          dataType = 'text';
        } else if (lowerHeader.includes('serial')) {
          targetField = 'serialNumber';
          required = true;
          dataType = 'text';
        } else if (lowerHeader.includes('manufacturer') || lowerHeader.includes('vendor')) {
          targetField = 'manufacturer';
        } else if (lowerHeader.includes('model')) {
          targetField = 'model';
        } else if (lowerHeader.includes('category') || lowerHeader.includes('type')) {
          targetField = 'category';
        } else if (lowerHeader.includes('purchase') && lowerHeader.includes('date')) {
          targetField = 'purchaseDate';
          dataType = 'date';
        } else if (lowerHeader.includes('warranty')) {
          targetField = 'warrantyExpiryDate';
          dataType = 'date';
        } else if (lowerHeader.includes('status')) {
          targetField = 'status';
        } else if (lowerHeader.includes('location') || lowerHeader.includes('install')) {
          targetField = 'installationLocation';
        } else if (lowerHeader.includes('note')) {
          targetField = 'notes';
        }
      }
      // Direct field matching (fallback)
      else {
        // Try to match common field names directly
        if (lowerHeader === 'name') {
          entityType = 'clients';
          targetField = 'name';
          required = true;
        } else if (lowerHeader === 'email') {
          entityType = 'contacts';
          targetField = 'email';
          required = true;
          dataType = 'email';
        } else if (lowerHeader.includes('start') && lowerHeader.includes('date')) {
          entityType = 'contracts';
          targetField = 'startDate';
          required = true;
          dataType = 'date';
        } else if (lowerHeader.includes('end') && lowerHeader.includes('date')) {
          entityType = 'contracts';
          targetField = 'endDate';
          required = true;
          dataType = 'date';
        }
      }

      return {
        sourceColumn: header,
        targetField: targetField,
        entityType: entityType,
        required: required,
        dataType: dataType
      };
    });
  };

  const updateColumnMapping = (index: number, field: keyof ColumnMapping, value: string) => {
    const newMappings = [...columnMappings];
    
    if (field === 'targetField') {
      if (value === "skip-column") {
        newMappings[index].targetField = '';
        newMappings[index].entityType = '';
        newMappings[index].required = false;
        newMappings[index].dataType = 'text';
      } else if (value.includes('.')) {
        // Handle new format: "entityType.fieldName"
        const [entityType, fieldName] = value.split('.');
        newMappings[index].targetField = fieldName;
        newMappings[index].entityType = entityType;
        
        // Update field properties from definition
        const fieldDef = FIELD_DEFINITIONS[entityType as keyof typeof FIELD_DEFINITIONS]?.[fieldName];
        if (fieldDef) {
          newMappings[index].required = fieldDef.required;
          newMappings[index].dataType = fieldDef.dataType;
        }
      } else {
        // Legacy format handling
        newMappings[index].targetField = value;
        
        // Update field properties from definition
        const entityType = newMappings[index].entityType;
        const fieldDef = FIELD_DEFINITIONS[entityType as keyof typeof FIELD_DEFINITIONS]?.[value];
        if (fieldDef) {
          newMappings[index].required = fieldDef.required;
          newMappings[index].dataType = fieldDef.dataType;
        }
      }
    } else {
      newMappings[index][field] = value as any;
    }
    
    setColumnMappings(newMappings);
  };

  const handleImport = async () => {
    if (!parsedData || columnMappings.length === 0) {
      toast({
        title: "No Data to Import",
        description: "Please parse data and configure mappings first",
        variant: "destructive"
      });
      return;
    }

    // Validate required mappings
    const requiredMappings = columnMappings.filter(m => m.required && !m.targetField);
    if (requiredMappings.length > 0) {
      toast({
        title: "Missing Required Mappings",
        description: `Please map these required fields: ${requiredMappings.map(m => m.sourceColumn).join(', ')}`,
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setCurrentStep('preview');

    try {
      const importData = {
        headers: parsedData.headers,
        rows: parsedData.rows,
        mappings: columnMappings.filter(m => m.targetField), // Only include mapped columns
        duplicateHandling,
        clientMatchStrategy
      };

      const response = await fetch('/api/bulk-import/comprehensive-paste', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(importData),
        credentials: 'include'
      });

      const result = await response.json();
      setImportResult(result);
      setCurrentStep('results');

      if (result.success) {
        toast({
          title: "Import Successful",
          description: `Successfully imported ${result.recordsSuccessful} records`,
        });
      } else {
        toast({
          title: "Import Completed with Issues",
          description: `${result.recordsSuccessful} successful, ${result.recordsFailed} failed`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Import Failed",
        description: "An error occurred during import",
        variant: "destructive"
      });
      setCurrentStep('mapping');
    } finally {
      setIsProcessing(false);
    }
  };

  const generateSampleData = () => {
    const sampleData = `Client Name	Short Name	Domain	Industry	Company Size	Status	Source	Address	Website	Contact Name	Contact Email	Contact Phone	Contact Title	Contract Name	Contract Start Date	Contract End Date	Contract Value	License Pool	License Quantity	Hardware Name	Hardware Category	Hardware Manufacturer	Hardware Model	Hardware Serial	Hardware Cost	Hardware Location
Customer Apps	Customer Apps	C003	Technology	Large	active	nca	King Fahd Road, Riyadh 12345, Saudi Arabia	https://customerapps.com	John Smith	john.smith@customerapps.com	+966-11-234-5678	Chief Information Security Officer	Annual SIEM Monitoring Contract 2024	2024-01-01	2024-12-31	180000	SIEM EPS Pool	5000	Firewall Primary - Customer Apps	Network Security	Fortinet	FortiGate 600E	FG600E-C003-001	15000	Primary Data Center
Saudi Information Technology Company	SITE	C004	Technology	Large	active	direct	King Abdul Aziz Road, Riyadh 11564, Saudi Arabia	https://site.sa	Ahmed Ali	ahmed.ali@site.sa	+966-11-345-6789	Director of Cybersecurity	Comprehensive IT Security Services 2024	2024-01-01	2024-12-31	250000	SIEM EPS Pool	10000	SOC Server - SITE	Server Hardware	Dell	PowerEdge R740	DELL-R740-C004-001	25000	SOC Operations Center
Red Sea Development Company	Red Sea Dev	R001	Real Estate	Large	active	both	Red Sea Project, NEOM 49643, Saudi Arabia	https://theredsea.sa	Sarah Ahmed	sarah.ahmed@theredsea.sa	+966-12-456-7890	Chief Technology Officer	Smart Infrastructure Security Services 2024	2024-01-01	2024-12-31	320000	SIEM EPS Pool	7500	Security Gateway - Red Sea	Network Security	Cisco	ASA 5585-X	CISCO-ASA-R001-001	35000	Red Sea Data Center`;
    
    setPastedData(sampleData);
    toast({
      title: "Sample Data Loaded",
      description: "Sample data has been loaded. Click 'Parse Data' to continue.",
    });
  };

  const resetWizard = () => {
    setPastedData('');
    setParsedData(null);
    setColumnMappings([]);
    setImportResult(null);
    setCurrentStep('input');
  };

  // Navigation functions
  const goToStep = (step: 'input' | 'mapping' | 'preview' | 'results') => {
    // Prevent navigation to future steps that aren't ready
    if (step === 'mapping' && !parsedData) return;
    if (step === 'preview' && (!parsedData || !columnMappings.length)) return;
    if (step === 'results' && !importResult) return;
    
    setCurrentStep(step);
  };

  const goBack = () => {
    if (currentStep === 'mapping') setCurrentStep('input');
    else if (currentStep === 'preview') setCurrentStep('mapping');
    else if (currentStep === 'results') setCurrentStep('mapping');
  };

  const goNext = () => {
    if (currentStep === 'input' && parsedData) setCurrentStep('mapping');
    else if (currentStep === 'mapping') handleImport(); // This will set to preview then results
  };

  const canNavigateToStep = (step: string) => {
    switch (step) {
      case 'input': return true;
      case 'mapping': return !!parsedData;
      case 'preview': return !!parsedData && columnMappings.length > 0;
      case 'results': return !!importResult;
      default: return false;
    }
  };

  const getEntityIcon = (entityType: string) => {
    switch (entityType) {
      case 'clients': return <Users className="h-4 w-4" />;
      case 'contacts': return <Users className="h-4 w-4" />;
      case 'contracts': return <FileText className="h-4 w-4" />;
      case 'licenses': return <Key className="h-4 w-4" />;
      case 'hardware': return <HardDrive className="h-4 w-4" />;
      default: return <BarChart3 className="h-4 w-4" />;
    }
  };

  const getStepIcon = (step: string) => {
    switch (step) {
      case 'input': return <Copy className="h-4 w-4" />;
      case 'mapping': return <MapPin className="h-4 w-4" />;
      case 'preview': return <Eye className="h-4 w-4" />;
      case 'results': return <CheckCircle className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  return (
    <AppLayout title="Comprehensive Bulk Import" subtitle="Import clients, contacts, contracts, licenses, and hardware from pasted data">
      <div className="container mx-auto p-6 space-y-6">
        
        {/* Progress Steps */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              {['input', 'mapping', 'preview', 'results'].map((step, index) => (
                <div key={step} className="flex items-center">
                  <button
                    onClick={() => goToStep(step as 'input' | 'mapping' | 'preview' | 'results')}
                    disabled={!canNavigateToStep(step)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 ${
                      currentStep === step ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-200' : 
                      ['input', 'mapping', 'preview', 'results'].indexOf(currentStep) > index ? 'bg-green-100 text-green-700 hover:bg-green-200' : 
                      canNavigateToStep(step) ? 'bg-gray-100 text-gray-600 hover:bg-gray-200 cursor-pointer' :
                      'bg-gray-100 text-gray-400 cursor-not-allowed'
                    } ${canNavigateToStep(step) ? 'focus:outline-none focus:ring-2 focus:ring-blue-300' : ''}`}
                  >
                    {getStepIcon(step)}
                    <span className="font-medium capitalize">{step}</span>
                    {canNavigateToStep(step) && currentStep !== step && (
                      <span className="text-xs opacity-60">(click to go)</span>
                    )}
                  </button>
                  {index < 3 && (
                    <div className={`w-8 h-px mx-2 transition-colors duration-200 ${
                      ['input', 'mapping', 'preview', 'results'].indexOf(currentStep) > index ? 'bg-green-300' : 'bg-gray-300'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Step 1: Data Input */}
        {currentStep === 'input' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Copy className="h-5 w-5" />
                <span>Step 1: Paste Your Data</span>
              </CardTitle>
              <CardDescription>
                Copy and paste data from Excel, Google Sheets, or any spreadsheet. Data should be tab-separated or comma-separated.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex space-x-2">
                <Button variant="outline" onClick={generateSampleData}>
                  <Download className="h-4 w-4 mr-2" />
                  Load Sample Data
                </Button>
                <Button variant="outline" onClick={resetWizard}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
              </div>
              
              <div>
                <Label htmlFor="pastedData">Paste your data here:</Label>
                <Textarea
                  id="pastedData"
                  placeholder="Paste your tabular data here (from Excel, Google Sheets, etc.)..."
                  value={pastedData}
                  onChange={(e) => setPastedData(e.target.value)}
                  className="min-h-[200px] font-mono"
                />
              </div>
              
              <div className="flex justify-between">
                <div className="text-sm text-gray-500">
                  {pastedData.trim() && (
                    <>Detected {pastedData.trim().split('\n').length} lines</>
                  )}
                </div>
                <div className="flex space-x-2">
                  <Button onClick={handleDataParse} disabled={!pastedData.trim()}>
                    Parse Data & Continue
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Column Mapping */}
        {currentStep === 'mapping' && parsedData && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MapPin className="h-5 w-5" />
                <span>Step 2: Map Columns to Database Fields</span>
              </CardTitle>
              <CardDescription>
                Map your data columns to the appropriate database fields. Required fields are marked with *.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {columnMappings.map((mapping, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg">
                      <div>
                        <Label className="text-sm font-medium">Source Column</Label>
                        <div className="mt-1 p-2 bg-gray-50 rounded text-sm">
                          {mapping.sourceColumn}
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-sm font-medium">Entity Type</Label>
                        <Select
                          value={mapping.entityType}
                          onValueChange={(value) => updateColumnMapping(index, 'entityType', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="clients">
                              <div className="flex items-center space-x-2">
                                <Users className="h-4 w-4" />
                                <span>Clients</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="contacts">
                              <div className="flex items-center space-x-2">
                                <Users className="h-4 w-4" />
                                <span>Contacts</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="contracts">
                              <div className="flex items-center space-x-2">
                                <FileText className="h-4 w-4" />
                                <span>Contracts</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="licenses">
                              <div className="flex items-center space-x-2">
                                <Key className="h-4 w-4" />
                                <span>Licenses</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="hardware">
                              <div className="flex items-center space-x-2">
                                <HardDrive className="h-4 w-4" />
                                <span>Hardware</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label className="text-sm font-medium">
                          Target Field {mapping.required && <span className="text-red-500">*</span>}
                        </Label>
                        <Select
                          value={mapping.targetField || "skip-column"}
                          onValueChange={(value) => updateColumnMapping(index, 'targetField', value === "skip-column" ? "" : value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select field..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="skip-column">-- Skip Column --</SelectItem>
                            {Object.entries(FIELD_DEFINITIONS).map(([entityType, fields]) => (
                              <div key={entityType}>
                                <div className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase bg-gray-50">
                                  {entityType.charAt(0).toUpperCase() + entityType.slice(1)}
                                </div>
                                {Object.entries(fields).map(([fieldName, fieldDef]) => (
                                  <SelectItem 
                                    key={`${entityType}.${fieldName}`} 
                                    value={`${entityType}.${fieldName}`}
                                    className="pl-6"
                                  >
                                    <div className="flex items-center justify-between w-full">
                                      <span className="flex items-center gap-2">
                                        {fieldDef.required && (
                                          <span className="text-red-500 text-xs">*</span>
                                        )}
                                        {fieldName}
                                      </span>
                                      <span className="text-xs text-gray-500 ml-2">
                                        {fieldDef.dataType}
                                      </span>
                                    </div>
                                    <div className="text-xs text-gray-400 mt-1">
                                      {fieldDef.description}
                                    </div>
                                  </SelectItem>
                                ))}
                              </div>
                            ))}
                          </SelectContent>
                        </Select>
                        {mapping.targetField && (
                          <div className="text-xs text-gray-500 mt-1">
                            {FIELD_DEFINITIONS[mapping.entityType as keyof typeof FIELD_DEFINITIONS]?.[mapping.targetField]?.description}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Badge variant={mapping.required ? "destructive" : "secondary"}>
                          {mapping.dataType}
                        </Badge>
                        {mapping.required && (
                          <Badge variant="outline">Required</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              
              <Separator className="my-4" />
              
              {/* Duplicate Handling Options */}
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium flex items-center space-x-2">
                  <Settings className="h-4 w-4" />
                  <span>Import Settings</span>
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">How to handle duplicate clients?</Label>
                    <Select value={duplicateHandling} onValueChange={(value: any) => setDuplicateHandling(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="update">
                          <div className="flex items-center space-x-2">
                            <RefreshCw className="h-4 w-4" />
                            <div>
                              <div>Update existing clients</div>
                              <div className="text-xs text-gray-500">Overwrite data for existing clients</div>
                            </div>
                          </div>
                        </SelectItem>
                        <SelectItem value="skip">
                          <div className="flex items-center space-x-2">
                            <Eye className="h-4 w-4" />
                            <div>
                              <div>Skip duplicates</div>
                              <div className="text-xs text-gray-500">Keep existing data, skip importing duplicates</div>
                            </div>
                          </div>
                        </SelectItem>
                        <SelectItem value="create_new">
                          <div className="flex items-center space-x-2">
                            <Copy className="h-4 w-4" />
                            <div>
                              <div>Create new entries</div>
                              <div className="text-xs text-gray-500">Create new clients with modified names</div>
                            </div>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">How to identify duplicate clients?</Label>
                    <Select value={clientMatchStrategy} onValueChange={(value: any) => setClientMatchStrategy(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="name_only">
                          <div className="flex items-center space-x-2">
                            <Users className="h-4 w-4" />
                            <div>
                              <div>By name only</div>
                              <div className="text-xs text-gray-500">Match clients by name field</div>
                            </div>
                          </div>
                        </SelectItem>
                        <SelectItem value="name_and_domain">
                          <div className="flex items-center space-x-2">
                            <Shield className="h-4 w-4" />
                            <div>
                              <div>By name and domain</div>
                              <div className="text-xs text-gray-500">Match by both name and domain ID</div>
                            </div>
                          </div>
                        </SelectItem>
                        <SelectItem value="email">
                          <div className="flex items-center space-x-2">
                            <Users className="h-4 w-4" />
                            <div>
                              <div>By contact email</div>
                              <div className="text-xs text-gray-500">Match by primary contact email</div>
                            </div>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    <strong>Duplicate Handling:</strong> 
                    {duplicateHandling === 'update' && ' Existing client records will be updated with new data from your import.'}
                    {duplicateHandling === 'skip' && ' Duplicate clients will be skipped, keeping existing data unchanged.'}
                    {duplicateHandling === 'create_new' && ' New client records will be created with modified names to avoid conflicts.'}
                    
                    <br /><strong>Client Matching:</strong>
                    {clientMatchStrategy === 'name_only' && ' Clients are considered duplicates if they have the same name.'}
                    {clientMatchStrategy === 'name_and_domain' && ' Clients are considered duplicates if they have the same name AND domain ID.'}
                    {clientMatchStrategy === 'email' && ' Clients are considered duplicates if they have contacts with matching email addresses.'}
                  </AlertDescription>
                </Alert>
              </div>
              
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep('input')}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Data Input
                </Button>
                <Button onClick={handleImport} disabled={isProcessing}>
                  {isProcessing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Preview & Import
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Preview/Processing */}
        {currentStep === 'preview' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Eye className="h-5 w-5" />
                <span>Step 3: Processing Import</span>
              </CardTitle>
              <CardDescription>
                Your data is being processed and imported into the database...
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Progress value={isProcessing ? 50 : 100} className="w-full" />
                <div className="text-center text-gray-600">
                  {isProcessing ? 'Processing your data...' : 'Import completed!'}
                </div>
                
                {!isProcessing && (
                  <div className="flex justify-between mt-4">
                    <Button variant="outline" onClick={() => setCurrentStep('mapping')}>
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back to Mapping
                    </Button>
                    <Button onClick={() => setCurrentStep('results')}>
                      View Results
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Results */}
        {currentStep === 'results' && importResult && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5" />
                <span>Step 4: Import Results</span>
              </CardTitle>
              <CardDescription>
                Review the results of your data import
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Summary */}
              <Alert className={importResult.success ? "border-green-200 bg-green-50" : "border-yellow-200 bg-yellow-50"}>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <div className="font-medium">{importResult.message}</div>
                    <div className="text-sm">
                      <strong>Processed:</strong> {importResult.recordsProcessed} records | 
                      <strong className="text-green-600 ml-2">Successful:</strong> {importResult.recordsSuccessful} | 
                      <strong className="text-red-600 ml-2">Failed:</strong> {importResult.recordsFailed}
                      {importResult.recordsSkipped > 0 && (
                        <>| <strong className="text-yellow-600 ml-2">Skipped:</strong> {importResult.recordsSkipped}</>
                      )}
                    </div>
                  </div>
                </AlertDescription>
              </Alert>

              {/* Detailed Results */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(importResult.details).map(([entity, counts]) => (
                  <Card key={entity}>
                    <CardContent className="pt-4">
                      <div className="flex items-center space-x-2">
                        {getEntityIcon(entity)}
                        <span className="font-medium capitalize">{entity}</span>
                      </div>
                      <div className="mt-2 text-sm text-gray-600">
                        <div>Created: <span className="font-medium text-green-600">{counts.created}</span></div>
                        <div>Updated: <span className="font-medium text-blue-600">{counts.updated}</span></div>
                        {('skipped' in counts) && counts.skipped > 0 && (
                          <div>Skipped: <span className="font-medium text-yellow-600">{counts.skipped}</span></div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Warnings */}
              {importResult.warnings && importResult.warnings.length > 0 && (
                <div>
                  <h3 className="font-medium mb-2 text-yellow-600">Warnings:</h3>
                  <ScrollArea className="h-32">
                    <div className="space-y-1">
                      {importResult.warnings.map((warning, index) => (
                        <div key={index} className="text-sm text-yellow-700 bg-yellow-50 p-2 rounded">
                          {warning}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* Errors */}
              {importResult.errors && importResult.errors.length > 0 && (
                <div>
                  <h3 className="font-medium mb-2 text-red-600">Errors:</h3>
                  <ScrollArea className="h-32">
                    <div className="space-y-1">
                      {importResult.errors.map((error, index) => (
                        <div key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                          {error}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              <div className="flex justify-between">
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={() => setCurrentStep('mapping')}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Mapping
                  </Button>
                  <Button variant="outline" onClick={resetWizard}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Import More Data
                  </Button>
                </div>
                <Button onClick={() => window.location.href = '/clients'}>
                  View Imported Clients
                  <Users className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Help Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Info className="h-5 w-5" />
              <span>Navigation & Tips</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Step Navigation:</h4>
                <ul className="text-sm text-gray-600 space-y-1 ml-4">
                  <li>• Click on any completed step in the progress bar to go back</li>
                  <li>• Use the Back/Next buttons at the bottom of each step</li>
                  <li>• You can always go back to fix mapping issues after seeing results</li>
                  <li>• Changes to mapping will require re-running the import</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Import Process:</h4>
                <ul className="text-sm text-gray-600 space-y-1 ml-4">
                  <li>• Data is parsed and mapped to the database</li>
                  <li>• Duplicate handling and client matching are configured</li>
                  <li>• Data is processed and imported</li>
                  <li>• Results are reviewed and imported data is saved</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Error Recovery:</h4>
                <ul className="text-sm text-gray-600 space-y-1 ml-4">
                  <li>• If import fails, check the error messages in the Results step</li>
                  <li>• Go back to Mapping to fix field assignments</li>
                  <li>• Go back to Input to correct data format issues</li>
                  <li>• Missing required fields (like email for contacts) will be skipped</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Data Format Requirements:</h4>
                <ul className="text-sm text-gray-600 space-y-1 ml-4">
                  <li>• First row should contain column headers</li>
                  <li>• Data can be tab-separated (from Excel) or comma-separated</li>
                  <li>• Client Name is required for creating records</li>
                  <li>• Contact Email is required for creating contacts</li>
                  <li>• Dates should be in YYYY-MM-DD format</li>
                  <li>• Boolean fields accept: true/false, yes/no, 1/0</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
} 