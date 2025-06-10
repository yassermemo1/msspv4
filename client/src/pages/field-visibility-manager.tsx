import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { AppLayout } from '@/components/layout/app-layout';
import { Input } from '@/components/ui/input';

interface FieldConfig {
  fieldName: string;
  label: string;
  isVisible: boolean;
  isRequired?: boolean;
}

interface TableConfig {
  tableName: string;
  displayName: string;
  category: string;
  fields: FieldConfig[];
}

const tableConfigurations: TableConfig[] = [
  // Core Business Tables
  {
    tableName: 'clients',
    displayName: 'Clients',
    category: 'core',
    fields: [
      { fieldName: 'name', label: 'Client Name', isVisible: true, isRequired: true },
      { fieldName: 'shortName', label: 'Short Name', isVisible: true },
      { fieldName: 'domain', label: 'Domain', isVisible: true },
      { fieldName: 'industry', label: 'Industry', isVisible: true },
      { fieldName: 'companySize', label: 'Company Size', isVisible: true },
      { fieldName: 'status', label: 'Status', isVisible: true },
      { fieldName: 'source', label: 'Source', isVisible: true },
      { fieldName: 'address', label: 'Address', isVisible: true },
      { fieldName: 'website', label: 'Website', isVisible: true },
      { fieldName: 'notes', label: 'Notes', isVisible: true },
    ],
  },
  {
    tableName: 'clientContacts',
    displayName: 'Client Contacts',
    category: 'core',
    fields: [
      { fieldName: 'name', label: 'Contact Name', isVisible: true, isRequired: true },
      { fieldName: 'email', label: 'Email', isVisible: true, isRequired: true },
      { fieldName: 'phone', label: 'Phone', isVisible: true },
      { fieldName: 'title', label: 'Title', isVisible: true },
      { fieldName: 'isPrimary', label: 'Primary Contact', isVisible: true },
      { fieldName: 'isActive', label: 'Active', isVisible: true },
    ],
  },
  {
    tableName: 'contracts',
    displayName: 'Contracts',
    category: 'core',
    fields: [
      { fieldName: 'name', label: 'Contract Name', isVisible: true, isRequired: true },
      { fieldName: 'startDate', label: 'Start Date', isVisible: true, isRequired: true },
      { fieldName: 'endDate', label: 'End Date', isVisible: true, isRequired: true },
      { fieldName: 'autoRenewal', label: 'Auto Renewal', isVisible: true },
      { fieldName: 'renewalTerms', label: 'Renewal Terms', isVisible: true },
      { fieldName: 'totalValue', label: 'Total Value', isVisible: true },
      { fieldName: 'status', label: 'Status', isVisible: true },
      { fieldName: 'documentUrl', label: 'Document URL', isVisible: true },
      { fieldName: 'notes', label: 'Notes', isVisible: true },
    ],
  },
  {
    tableName: 'services',
    displayName: 'Services',
    category: 'core',
    fields: [
      { fieldName: 'name', label: 'Service Name', isVisible: true, isRequired: true },
      { fieldName: 'category', label: 'Category', isVisible: true, isRequired: true },
      { fieldName: 'description', label: 'Description', isVisible: true },
      { fieldName: 'deliveryModel', label: 'Delivery Model', isVisible: true, isRequired: true },
      { fieldName: 'basePrice', label: 'Base Price', isVisible: true },
      { fieldName: 'pricingUnit', label: 'Pricing Unit', isVisible: true },
      { fieldName: 'scopeDefinitionTemplate', label: 'Scope Definition Template', isVisible: true },
      { fieldName: 'isActive', label: 'Active', isVisible: true },
    ],
  },
  {
    tableName: 'serviceScopes',
    displayName: 'Service Scopes',
    category: 'core',
    fields: [
      { fieldName: 'scopeDefinition', label: 'Scope Definition', isVisible: true },
      { fieldName: 'safDocumentUrl', label: 'SAF Document URL', isVisible: true },
      { fieldName: 'safStartDate', label: 'SAF Start Date', isVisible: true },
      { fieldName: 'safEndDate', label: 'SAF End Date', isVisible: true },
      { fieldName: 'safStatus', label: 'SAF Status', isVisible: true },
      { fieldName: 'startDate', label: 'Start Date', isVisible: true },
      { fieldName: 'endDate', label: 'End Date', isVisible: true },
      { fieldName: 'status', label: 'Status', isVisible: true },
      { fieldName: 'monthlyValue', label: 'Monthly Value', isVisible: true },
      { fieldName: 'notes', label: 'Notes', isVisible: true },
    ],
  },
  {
    tableName: 'proposals',
    displayName: 'Proposals',
    category: 'core',
    fields: [
      { fieldName: 'type', label: 'Proposal Type', isVisible: true, isRequired: true },
      { fieldName: 'version', label: 'Version', isVisible: true },
      { fieldName: 'status', label: 'Status', isVisible: true },
      { fieldName: 'documentUrl', label: 'Document URL', isVisible: true },
      { fieldName: 'proposedValue', label: 'Proposed Value', isVisible: true },
      { fieldName: 'notes', label: 'Notes', isVisible: true },
    ],
  },

  // License Management
  {
    tableName: 'licensePools',
    displayName: 'License Pools',
    category: 'licensing',
    fields: [
      { fieldName: 'name', label: 'Pool Name', isVisible: true, isRequired: true },
      { fieldName: 'vendor', label: 'Vendor', isVisible: true, isRequired: true },
      { fieldName: 'productName', label: 'Product Name', isVisible: true, isRequired: true },
      { fieldName: 'licenseType', label: 'License Type', isVisible: true },
      { fieldName: 'totalLicenses', label: 'Total Licenses', isVisible: true, isRequired: true },
      { fieldName: 'availableLicenses', label: 'Available Licenses', isVisible: true },
      { fieldName: 'orderedLicenses', label: 'Ordered Licenses', isVisible: true },
      { fieldName: 'costPerLicense', label: 'Cost per License', isVisible: true },
      { fieldName: 'renewalDate', label: 'Renewal Date', isVisible: true },
      { fieldName: 'purchaseRequestNumber', label: 'Purchase Request Number', isVisible: true },
      { fieldName: 'purchaseOrderNumber', label: 'Purchase Order Number', isVisible: true },
      { fieldName: 'notes', label: 'Notes', isVisible: true },
      { fieldName: 'isActive', label: 'Active', isVisible: true },
    ],
  },
  {
    tableName: 'clientLicenses',
    displayName: 'Client License Assignments',
    category: 'licensing',
    fields: [
      { fieldName: 'assignedLicenses', label: 'Assigned Licenses', isVisible: true, isRequired: true },
      { fieldName: 'assignedDate', label: 'Assigned Date', isVisible: true },
      { fieldName: 'notes', label: 'Notes', isVisible: true },
    ],
  },
  {
    tableName: 'individualLicenses',
    displayName: 'Individual Licenses',
    category: 'licensing',
    fields: [
      { fieldName: 'name', label: 'License Name', isVisible: true, isRequired: true },
      { fieldName: 'vendor', label: 'Vendor', isVisible: true, isRequired: true },
      { fieldName: 'productName', label: 'Product Name', isVisible: true, isRequired: true },
      { fieldName: 'licenseKey', label: 'License Key', isVisible: true },
      { fieldName: 'licenseType', label: 'License Type', isVisible: true },
      { fieldName: 'quantity', label: 'Quantity', isVisible: true },
      { fieldName: 'costPerLicense', label: 'Cost per License', isVisible: true },
      { fieldName: 'purchaseDate', label: 'Purchase Date', isVisible: true },
      { fieldName: 'expiryDate', label: 'Expiry Date', isVisible: true },
      { fieldName: 'renewalDate', label: 'Renewal Date', isVisible: true },
      { fieldName: 'purchaseRequestNumber', label: 'Purchase Request Number', isVisible: true },
      { fieldName: 'purchaseOrderNumber', label: 'Purchase Order Number', isVisible: true },
      { fieldName: 'documentUrl', label: 'Document URL', isVisible: true },
      { fieldName: 'status', label: 'Status', isVisible: true },
      { fieldName: 'notes', label: 'Notes', isVisible: true },
    ],
  },

  // Hardware Management
  {
    tableName: 'hardwareAssets',
    displayName: 'Hardware Assets',
    category: 'hardware',
    fields: [
      { fieldName: 'name', label: 'Asset Name', isVisible: true, isRequired: true },
      { fieldName: 'category', label: 'Category', isVisible: true, isRequired: true },
      { fieldName: 'manufacturer', label: 'Manufacturer', isVisible: true },
      { fieldName: 'model', label: 'Model', isVisible: true },
      { fieldName: 'serialNumber', label: 'Serial Number', isVisible: true },
      { fieldName: 'purchaseDate', label: 'Purchase Date', isVisible: true },
      { fieldName: 'purchaseCost', label: 'Purchase Cost', isVisible: true },
      { fieldName: 'warrantyExpiry', label: 'Warranty Expiry', isVisible: true },
      { fieldName: 'status', label: 'Status', isVisible: true },
      { fieldName: 'location', label: 'Location', isVisible: true },
      { fieldName: 'purchaseRequestNumber', label: 'Purchase Request Number', isVisible: true },
      { fieldName: 'purchaseOrderNumber', label: 'Purchase Order Number', isVisible: true },
      { fieldName: 'notes', label: 'Notes', isVisible: true },
    ],
  },
  {
    tableName: 'clientHardwareAssignments',
    displayName: 'Client Hardware Assignments',
    category: 'hardware',
    fields: [
      { fieldName: 'assignedDate', label: 'Assigned Date', isVisible: true },
      { fieldName: 'returnedDate', label: 'Returned Date', isVisible: true },
      { fieldName: 'installationLocation', label: 'Installation Location', isVisible: true },
      { fieldName: 'status', label: 'Status', isVisible: true },
      { fieldName: 'notes', label: 'Notes', isVisible: true },
    ],
  },

  // Financial Management
  {
    tableName: 'financialTransactions',
    displayName: 'Financial Transactions',
    category: 'financial',
    fields: [
      { fieldName: 'type', label: 'Transaction Type', isVisible: true, isRequired: true },
      { fieldName: 'amount', label: 'Amount', isVisible: true, isRequired: true },
      { fieldName: 'description', label: 'Description', isVisible: true, isRequired: true },
      { fieldName: 'status', label: 'Status', isVisible: true },
      { fieldName: 'transactionDate', label: 'Transaction Date', isVisible: true, isRequired: true },
      { fieldName: 'category', label: 'Category', isVisible: true },
      { fieldName: 'reference', label: 'Reference', isVisible: true },
      { fieldName: 'notes', label: 'Notes', isVisible: true },
    ],
  },

  // Compliance & Authorization
  {
    tableName: 'serviceAuthorizationForms',
    displayName: 'Service Authorization Forms (SAF)',
    category: 'compliance',
    fields: [
      { fieldName: 'safNumber', label: 'SAF Number', isVisible: true, isRequired: true },
      { fieldName: 'description', label: 'Description', isVisible: true },
      { fieldName: 'status', label: 'Status', isVisible: true },
      { fieldName: 'requestedDate', label: 'Requested Date', isVisible: true, isRequired: true },
      { fieldName: 'approvedDate', label: 'Approved Date', isVisible: true },
      { fieldName: 'expiryDate', label: 'Expiry Date', isVisible: true },
      { fieldName: 'notes', label: 'Notes', isVisible: true },
    ],
  },
  {
    tableName: 'certificatesOfCompliance',
    displayName: 'Certificates of Compliance (COC)',
    category: 'compliance',
    fields: [
      { fieldName: 'cocNumber', label: 'COC Number', isVisible: true, isRequired: true },
      { fieldName: 'title', label: 'Title', isVisible: true, isRequired: true },
      { fieldName: 'description', label: 'Description', isVisible: true },
      { fieldName: 'complianceType', label: 'Compliance Type', isVisible: true, isRequired: true },
      { fieldName: 'issueDate', label: 'Issue Date', isVisible: true, isRequired: true },
      { fieldName: 'expiryDate', label: 'Expiry Date', isVisible: true },
      { fieldName: 'status', label: 'Status', isVisible: true },
      { fieldName: 'documentUrl', label: 'Document URL', isVisible: true },
      { fieldName: 'auditDate', label: 'Audit Date', isVisible: true },
      { fieldName: 'nextAuditDate', label: 'Next Audit Date', isVisible: true },
      { fieldName: 'notes', label: 'Notes', isVisible: true },
    ],
  },

  // User & Team Management
  {
    tableName: 'users',
    displayName: 'Users',
    category: 'admin',
    fields: [
      { fieldName: 'username', label: 'Username', isVisible: true, isRequired: true },
      { fieldName: 'email', label: 'Email', isVisible: true, isRequired: true },
      { fieldName: 'firstName', label: 'First Name', isVisible: true, isRequired: true },
      { fieldName: 'lastName', label: 'Last Name', isVisible: true, isRequired: true },
      { fieldName: 'role', label: 'Role', isVisible: true },
      { fieldName: 'authProvider', label: 'Auth Provider', isVisible: true },
      { fieldName: 'ldapId', label: 'LDAP ID', isVisible: true },
      { fieldName: 'isActive', label: 'Active', isVisible: true },
      { fieldName: 'twoFactorSecret', label: 'Two Factor Secret', isVisible: false },
      { fieldName: 'twoFactorBackupCodes', label: 'Two Factor Backup Codes', isVisible: false },
    ],
  },
  {
    tableName: 'userSettings',
    displayName: 'User Settings',
    category: 'admin',
    fields: [
      { fieldName: 'emailNotifications', label: 'Email Notifications', isVisible: true },
      { fieldName: 'pushNotifications', label: 'Push Notifications', isVisible: true },
      { fieldName: 'contractReminders', label: 'Contract Reminders', isVisible: true },
      { fieldName: 'financialAlerts', label: 'Financial Alerts', isVisible: true },
      { fieldName: 'twoFactorAuth', label: 'Two Factor Authentication', isVisible: true },
      { fieldName: 'sessionTimeout', label: 'Session Timeout', isVisible: true },
      { fieldName: 'darkMode', label: 'Dark Mode', isVisible: true },
      { fieldName: 'timezone', label: 'Timezone', isVisible: true },
      { fieldName: 'language', label: 'Language', isVisible: true },
      { fieldName: 'currency', label: 'Currency', isVisible: true },
      { fieldName: 'autoSaveForms', label: 'Auto Save Forms', isVisible: true },
      { fieldName: 'dataExport', label: 'Data Export', isVisible: true },
      { fieldName: 'apiAccess', label: 'API Access', isVisible: true },
      { fieldName: 'dataRetentionPeriod', label: 'Data Retention Period', isVisible: true },
    ],
  },
  {
    tableName: 'clientTeamAssignments',
    displayName: 'Client Team Assignments',
    category: 'admin',
    fields: [
      { fieldName: 'role', label: 'Role', isVisible: true, isRequired: true },
      { fieldName: 'assignedDate', label: 'Assigned Date', isVisible: true },
      { fieldName: 'isActive', label: 'Active', isVisible: true },
      { fieldName: 'notes', label: 'Notes', isVisible: true },
    ],
  },

  // Document Management
  {
    tableName: 'documents',
    displayName: 'Documents',
    category: 'documents',
    fields: [
      { fieldName: 'title', label: 'Document Title', isVisible: true, isRequired: true },
      { fieldName: 'description', label: 'Description', isVisible: true },
      { fieldName: 'category', label: 'Category', isVisible: true },
      { fieldName: 'tags', label: 'Tags', isVisible: true },
      { fieldName: 'fileUrl', label: 'File URL', isVisible: true },
      { fieldName: 'fileSize', label: 'File Size', isVisible: true },
      { fieldName: 'mimeType', label: 'MIME Type', isVisible: true },
      { fieldName: 'isPublic', label: 'Public', isVisible: true },
      { fieldName: 'expiryDate', label: 'Expiry Date', isVisible: true },
      { fieldName: 'status', label: 'Status', isVisible: true },
    ],
  },

  // Custom Fields & Configuration
  {
    tableName: 'customFields',
    displayName: 'Custom Fields',
    category: 'configuration',
    fields: [
      { fieldName: 'entityType', label: 'Entity Type', isVisible: true, isRequired: true },
      { fieldName: 'fieldName', label: 'Field Name', isVisible: true, isRequired: true },
      { fieldName: 'fieldType', label: 'Field Type', isVisible: true, isRequired: true },
      { fieldName: 'fieldOptions', label: 'Field Options', isVisible: true },
      { fieldName: 'isRequired', label: 'Required', isVisible: true },
      { fieldName: 'isActive', label: 'Active', isVisible: true },
    ],
  },
  {
    tableName: 'customFieldValues',
    displayName: 'Custom Field Values',
    category: 'configuration',
    fields: [
      { fieldName: 'entityId', label: 'Entity ID', isVisible: true, isRequired: true },
      { fieldName: 'value', label: 'Value', isVisible: true },
    ],
  },

  // System & Audit
  {
    tableName: 'auditLogs',
    displayName: 'Audit Logs',
    category: 'system',
    fields: [
      { fieldName: 'action', label: 'Action', isVisible: true, isRequired: true },
      { fieldName: 'entityType', label: 'Entity Type', isVisible: true },
      { fieldName: 'entityId', label: 'Entity ID', isVisible: true },
      { fieldName: 'entityName', label: 'Entity Name', isVisible: true },
      { fieldName: 'description', label: 'Description', isVisible: true },
      { fieldName: 'ipAddress', label: 'IP Address', isVisible: true },
      { fieldName: 'userAgent', label: 'User Agent', isVisible: true },
      { fieldName: 'severity', label: 'Severity', isVisible: true },
      { fieldName: 'category', label: 'Category', isVisible: true },
      { fieldName: 'metadata', label: 'Metadata', isVisible: true },
    ],
  },
  {
    tableName: 'securityEvents',
    displayName: 'Security Events',
    category: 'system',
    fields: [
      { fieldName: 'eventType', label: 'Event Type', isVisible: true, isRequired: true },
      { fieldName: 'source', label: 'Source', isVisible: true },
      { fieldName: 'ipAddress', label: 'IP Address', isVisible: true },
      { fieldName: 'userAgent', label: 'User Agent', isVisible: true },
      { fieldName: 'location', label: 'Location', isVisible: true },
      { fieldName: 'deviceFingerprint', label: 'Device Fingerprint', isVisible: true },
      { fieldName: 'success', label: 'Success', isVisible: true },
      { fieldName: 'failureReason', label: 'Failure Reason', isVisible: true },
      { fieldName: 'riskScore', label: 'Risk Score', isVisible: true },
      { fieldName: 'blocked', label: 'Blocked', isVisible: true },
      { fieldName: 'metadata', label: 'Metadata', isVisible: true },
    ],
  },

  // Dashboard & Widgets
  {
    tableName: 'dashboardWidgets',
    displayName: 'Dashboard Widgets',
    category: 'dashboard',
    fields: [
      { fieldName: 'name', label: 'Widget Name', isVisible: true, isRequired: true },
      { fieldName: 'widgetType', label: 'Widget Type', isVisible: true, isRequired: true },
      { fieldName: 'config', label: 'Configuration', isVisible: true },
      { fieldName: 'dataSourceId', label: 'Data Source ID', isVisible: true },
      { fieldName: 'refreshInterval', label: 'Refresh Interval', isVisible: true },
      { fieldName: 'isActive', label: 'Active', isVisible: true },
    ],
  },
  {
    tableName: 'userDashboards',
    displayName: 'User Dashboards',
    category: 'dashboard',
    fields: [
      { fieldName: 'name', label: 'Dashboard Name', isVisible: true, isRequired: true },
      { fieldName: 'description', label: 'Description', isVisible: true },
      { fieldName: 'layout', label: 'Layout', isVisible: true },
      { fieldName: 'isDefault', label: 'Default', isVisible: true },
      { fieldName: 'isPublic', label: 'Public', isVisible: true },
    ],
  },
];

export default function FieldVisibilityManager() {
  const [configurations, setConfigurations] = useState<TableConfig[]>(tableConfigurations);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Get unique categories
  const categories = ['all', ...Array.from(new Set(tableConfigurations.map(config => config.category)))];
  
  // Filter configurations based on search and category
  const filteredConfigurations = configurations.filter(config => {
    const matchesSearch = config.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         config.tableName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || config.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Load current field visibility settings
  useEffect(() => {
    const loadFieldVisibility = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/field-visibility');
        if (!response.ok) {
          throw new Error('Failed to load field visibility configurations');
        }
        const configs = await response.json();
        
        // Update configurations with current settings
        const updatedConfigurations = configurations.map(tableConfig => ({
          ...tableConfig,
          fields: tableConfig.fields.map(field => {
            const config = configs.find((c: any) => 
              c.table_name === tableConfig.tableName && 
              c.field_name === field.fieldName && 
              c.context === 'form'
            );
            return {
              ...field,
              isVisible: config ? config.is_visible : true,
            };
          }),
        }));
        
        setConfigurations(updatedConfigurations);
      } catch (error) {
        console.error('Error loading field visibility:', error);
        toast.error('Failed to load field visibility configurations');
      } finally {
        setLoading(false);
      }
    };

    loadFieldVisibility();
  }, []);

  const handleFieldVisibilityChange = async (tableName: string, fieldName: string, isVisible: boolean) => {
    try {
      const response = await fetch('/api/field-visibility', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tableName,
          fieldName,
          isVisible,
          context: 'form',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update field visibility');
      }

      // Update local state
      setConfigurations(prev => 
        prev.map(tableConfig => 
          tableConfig.tableName === tableName
            ? {
                ...tableConfig,
                fields: tableConfig.fields.map(field =>
                  field.fieldName === fieldName
                    ? { ...field, isVisible }
                    : field
                ),
              }
            : tableConfig
        )
      );

      toast.success(`Field visibility updated for ${fieldName}`);
    } catch (error) {
      console.error('Error updating field visibility:', error);
      toast.error('Failed to update field visibility');
    }
  };

  const resetTableConfiguration = async (tableName: string) => {
    setSaving(true);
    try {
      const tableConfig = configurations.find(config => config.tableName === tableName);
      if (!tableConfig) return;

      // Reset all fields to visible
      await Promise.all(
        tableConfig.fields.map(field =>
          fetch(`/api/field-visibility/${tableName}/${field.fieldName}?context=form`, {
            method: 'DELETE',
          })
        )
      );

      // Update local state
      setConfigurations(prev =>
        prev.map(config =>
          config.tableName === tableName
            ? {
                ...config,
                fields: config.fields.map(field => ({ ...field, isVisible: true })),
              }
            : config
        )
      );

      toast.success(`All fields for ${tableConfig.displayName} are now visible`);
    } catch (error) {
      console.error('Error resetting table configuration:', error);
      toast.error('Failed to reset table configuration');
    } finally {
      setSaving(false);
    }
  };

  const getVisibleFieldsCount = (tableConfig: TableConfig) => {
    return tableConfig.fields.filter(field => field.isVisible).length;
  };

  const getTotalFieldsCount = (tableConfig: TableConfig) => {
    return tableConfig.fields.length;
  };

  if (loading) {
    return (
      <AppLayout title="Field Visibility Manager" subtitle="Loading configurations...">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading field visibility configurations...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Field Visibility Manager" subtitle="Configure which fields are visible in forms">
      <div className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Required fields cannot be hidden as they are essential for data integrity.
            Changes take effect immediately and apply to all users.
            Use the search and category filters to find specific forms quickly.
          </AlertDescription>
        </Alert>

        {/* Search and Filter Controls */}
        <div className="flex gap-4 items-center">
          <div className="flex-1">
            <Input
              placeholder="Search forms..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="w-48">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category === 'all' ? 'All Categories' : 
                   category.charAt(0).toUpperCase() + category.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <Tabs defaultValue={filteredConfigurations[0]?.tableName} className="w-full">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-1 h-auto">
            {filteredConfigurations.slice(0, 24).map(config => (
              <TabsTrigger 
                key={config.tableName} 
                value={config.tableName}
                className="text-xs p-2 flex flex-col items-center"
              >
                <span className="truncate w-full text-center">{config.displayName}</span>
                <Badge variant="secondary" className="mt-1 text-xs">
                  {getVisibleFieldsCount(config)}/{getTotalFieldsCount(config)}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>

          {filteredConfigurations.map(tableConfig => (
            <TabsContent key={tableConfig.tableName} value={tableConfig.tableName}>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {tableConfig.displayName} Form Fields
                        <Badge variant="outline" className="capitalize">
                          {tableConfig.category}
                        </Badge>
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {getVisibleFieldsCount(tableConfig)} of {getTotalFieldsCount(tableConfig)} fields visible
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => resetTableConfiguration(tableConfig.tableName)}
                      disabled={saving}
                    >
                      Reset All to Visible
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {tableConfig.fields.map((field, index) => (
                      <div key={field.fieldName}>
                        <div className="flex items-center justify-between py-3">
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-2">
                              {field.isVisible ? (
                                <Eye className="h-4 w-4 text-green-600" />
                              ) : (
                                <EyeOff className="h-4 w-4 text-gray-400" />
                              )}
                              <Label className="text-sm font-medium">
                                {field.label}
                              </Label>
                            </div>
                            {field.isRequired && (
                              <Badge variant="destructive" className="text-xs">
                                Required
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <Label htmlFor={`${tableConfig.tableName}-${field.fieldName}`} className="text-sm">
                              {field.isVisible ? 'Visible' : 'Hidden'}
                            </Label>
                            <Switch
                              id={`${tableConfig.tableName}-${field.fieldName}`}
                              checked={field.isVisible}
                              disabled={field.isRequired}
                              onCheckedChange={(checked) =>
                                handleFieldVisibilityChange(tableConfig.tableName, field.fieldName, checked)
                              }
                            />
                          </div>
                        </div>
                        {index < tableConfig.fields.length - 1 && <Separator />}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>

        {filteredConfigurations.length === 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No forms found matching your search criteria.</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
} 