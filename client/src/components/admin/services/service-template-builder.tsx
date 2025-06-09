import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Save, 
  AlertCircle, 
  CheckCircle2,
  Settings,
  Eye,
  EyeOff
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { FieldDefinitionForm } from './field-definition-form';
import { scopeTemplateApi } from '@/lib/api';
import { 
  FieldDefinition, 
  ScopeDefinitionTemplate, 
  ScopeDefinitionTemplateResponse,
  FIELD_TYPE_OPTIONS 
} from '@/types';

interface ServiceTemplateBuilderProps {
  serviceId: number;
  onSave?: (template: ScopeDefinitionTemplate) => void;
  readonly?: boolean;
}

export function ServiceTemplateBuilder({ serviceId, onSave, readonly = false }: ServiceTemplateBuilderProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [serviceInfo, setServiceInfo] = useState<{
    serviceName: string;
    category: string;
    deliveryModel: string;
  } | null>(null);
  
  const [fields, setFields] = useState<FieldDefinition[]>([]);
  const [isFieldFormOpen, setIsFieldFormOpen] = useState(false);
  const [editingField, setEditingField] = useState<FieldDefinition | undefined>();
  const [showPreview, setShowPreview] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const { toast } = useToast();

  // Load existing template
  useEffect(() => {
    const loadTemplate = async () => {
      try {
        setLoading(true);
        const response: ScopeDefinitionTemplateResponse = await scopeTemplateApi.getTemplate(serviceId);
        
        setServiceInfo({
          serviceName: response.serviceName,
          category: response.category,
          deliveryModel: response.deliveryModel
        });

        if (response.template?.fields) {
          // Add IDs for frontend state management and ensure proper sorting
          const fieldsWithIds = response.template.fields
            .map((field, index) => ({
              ...field,
              id: field.id || `field_${index}_${Date.now()}`,
            }))
            .sort((a, b) => a.displayOrder - b.displayOrder);
          setFields(fieldsWithIds);
        } else {
          setFields([]);
        }
      } catch (error) {
        console.error('Failed to load scope template:', error);
        toast({
          title: 'Error Loading Template',
          description: 'Failed to load the scope definition template. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    if (serviceId) {
      loadTemplate();
    }
  }, [serviceId, toast]);

  const handleAddField = () => {
    setEditingField(undefined);
    setIsFieldFormOpen(true);
  };

  const handleEditField = (field: FieldDefinition) => {
    setEditingField(field);
    setIsFieldFormOpen(true);
  };

  const handleSaveField = (field: FieldDefinition) => {
    setFields(prevFields => {
      let newFields;
      if (editingField) {
        // Update existing field
        newFields = prevFields.map(f => f.id === editingField.id ? field : f);
      } else {
        // Add new field
        newFields = [...prevFields, field];
      }
      
      // Re-sort by display order
      return newFields.sort((a, b) => a.displayOrder - b.displayOrder);
    });
    
    setIsFieldFormOpen(false);
    setEditingField(undefined);
    setHasUnsavedChanges(true);
    
    toast({
      title: 'Field Saved',
      description: `Field "${field.label}" has been ${editingField ? 'updated' : 'added'} successfully.`,
    });
  };

  const handleRemoveField = (fieldId: string) => {
    const field = fields.find(f => f.id === fieldId);
    if (!field) return;

    if (confirm(`Are you sure you want to remove the field "${field.label}"? This action cannot be undone.`)) {
      setFields(prevFields => prevFields.filter(f => f.id !== fieldId));
      setHasUnsavedChanges(true);
      
      toast({
        title: 'Field Removed',
        description: `Field "${field.label}" has been removed from the template.`,
      });
    }
  };

  const handleMoveField = (fieldId: string, direction: 'up' | 'down') => {
    setFields(prevFields => {
      const fieldIndex = prevFields.findIndex(f => f.id === fieldId);
      if (fieldIndex === -1) return prevFields;

      const newFields = [...prevFields];
      const targetIndex = direction === 'up' ? fieldIndex - 1 : fieldIndex + 1;
      
      if (targetIndex < 0 || targetIndex >= newFields.length) return prevFields;

      // Swap the fields
      [newFields[fieldIndex], newFields[targetIndex]] = [newFields[targetIndex], newFields[fieldIndex]];
      
      // Update display orders
      newFields.forEach((field, index) => {
        field.displayOrder = index + 1;
      });

      setHasUnsavedChanges(true);
      return newFields;
    });
  };

  const handleSaveTemplate = async () => {
    try {
      setSaving(true);
      
      const template: ScopeDefinitionTemplate = {
        fields: fields.map(field => ({
          ...field,
          id: undefined // Remove frontend-only ID
        })),
        version: '1.0',
        lastModified: new Date().toISOString()
      };

      await scopeTemplateApi.updateTemplate(serviceId, template);
      setHasUnsavedChanges(false);
      
      toast({
        title: 'Template Saved',
        description: 'The scope definition template has been saved successfully.',
      });

      if (onSave) {
        onSave(template);
      }
    } catch (error) {
      console.error('Failed to save scope template:', error);
      toast({
        title: 'Save Failed',
        description: 'Failed to save the scope definition template. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const getFieldTypeLabel = (fieldType: string) => {
    const option = FIELD_TYPE_OPTIONS.find(opt => opt.value === fieldType);
    return option?.label || fieldType;
  };

  const getNextDisplayOrder = () => {
    return fields.length > 0 ? Math.max(...fields.map(f => f.displayOrder)) + 1 : 1;
  };

  const getExistingFieldNames = () => {
    return fields.map(f => f.name);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-sm text-gray-500">Loading scope template...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Service Scope Definition Template
              </CardTitle>
              <CardDescription>
                Define the dynamic parameters that will be collected when this service is added to a client contract.
              </CardDescription>
              {serviceInfo && (
                <div className="flex gap-2 mt-2">
                  <Badge variant="outline">{serviceInfo.category}</Badge>
                  <Badge variant="outline">{serviceInfo.deliveryModel}</Badge>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showPreview ? 'Hide Preview' : 'Show Preview'}
              </Button>
              {!readonly && (
                <Button
                  onClick={handleSaveTemplate}
                  disabled={!hasUnsavedChanges || saving}
                  className="flex items-center gap-2"
                >
                  {saving ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save Template
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        {hasUnsavedChanges && (
          <CardContent className="pt-0">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You have unsaved changes. Don't forget to save your template when you're done editing.
              </AlertDescription>
            </Alert>
          </CardContent>
        )}
      </Card>

      {/* Fields Management Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Field Definitions</CardTitle>
              <CardDescription>
                Configure the scope parameters that users will fill out for this service.
              </CardDescription>
            </div>
            {!readonly && (
              <Button onClick={handleAddField} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Field
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {fields.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
              <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Fields Defined</h3>
              <p className="text-gray-500 mb-4">
                Start by adding field definitions to create the scope template for this service.
              </p>
              {!readonly && (
                <Button onClick={handleAddField} className="flex items-center gap-2 mx-auto">
                  <Plus className="h-4 w-4" />
                  Add Your First Field
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Field Name</TableHead>
                    <TableHead>Label</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Required</TableHead>
                    <TableHead>Options</TableHead>
                    {!readonly && <TableHead className="w-32">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((field, index) => (
                    <TableRow key={field.id}>
                      <TableCell className="font-medium">{field.displayOrder}</TableCell>
                      <TableCell>
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                          {field.name}
                        </code>
                      </TableCell>
                      <TableCell className="font-medium">{field.label}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {getFieldTypeLabel(field.fieldType)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {field.isRequired ? (
                          <Badge variant="default" className="bg-red-100 text-red-800">Required</Badge>
                        ) : (
                          <Badge variant="outline">Optional</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {field.selectOptions && field.selectOptions.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {field.selectOptions.slice(0, 2).map((option, optIndex) => (
                              <Badge key={optIndex} variant="outline" className="text-xs">
                                {option}
                              </Badge>
                            ))}
                            {field.selectOptions.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{field.selectOptions.length - 2} more
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">—</span>
                        )}
                      </TableCell>
                      {!readonly && (
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMoveField(field.id!, 'up')}
                              disabled={index === 0}
                            >
                              <ArrowUp className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMoveField(field.id!, 'down')}
                              disabled={index === fields.length - 1}
                            >
                              <ArrowDown className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditField(field)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveField(field.id!)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Section */}
      {showPreview && fields.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Template Preview</CardTitle>
            <CardDescription>
              This is how the scope definition form will appear to users when adding this service to a contract.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
              <h4 className="font-medium text-lg">Service Scope Configuration</h4>
              <p className="text-sm text-gray-600">
                Configure the scope parameters for "{serviceInfo?.serviceName}"
              </p>
              <Separator />
              <div className="grid gap-4">
                {fields.map((field) => (
                  <div key={field.id} className="space-y-2">
                    <Label className="flex items-center gap-2">
                      {field.label}
                      {field.isRequired && <span className="text-red-500">*</span>}
                    </Label>
                    {field.helpText && (
                      <p className="text-xs text-gray-500">{field.helpText}</p>
                    )}
                    
                    {/* Preview field input based on type */}
                    {field.fieldType === 'TEXT_SINGLE_LINE' && (
                      <Input 
                        placeholder={field.placeholderText || `Enter ${field.label.toLowerCase()}`}
                        disabled
                      />
                    )}
                    {field.fieldType === 'TEXT_MULTI_LINE' && (
                      <Textarea 
                        placeholder={field.placeholderText || `Enter ${field.label.toLowerCase()}`}
                        disabled
                        rows={3}
                      />
                    )}
                    {['NUMBER_INTEGER', 'NUMBER_DECIMAL'].includes(field.fieldType) && (
                      <Input 
                        type="number"
                        placeholder={field.placeholderText || "0"}
                        disabled
                      />
                    )}
                    {field.fieldType === 'BOOLEAN' && (
                      <div className="flex items-center space-x-2">
                        <Checkbox disabled />
                        <span className="text-sm">Yes/No</span>
                      </div>
                    )}
                    {field.fieldType === 'SELECT_SINGLE_DROPDOWN' && (
                      <Select disabled>
                        <SelectTrigger>
                          <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
                        </SelectTrigger>
                      </Select>
                    )}
                    {field.selectOptions && field.selectOptions.length > 0 && (
                      <div className="text-xs text-gray-500">
                        Options: {field.selectOptions.join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Field Definition Form Modal */}
      <FieldDefinitionForm
        field={editingField}
        isOpen={isFieldFormOpen}
        onClose={() => {
          setIsFieldFormOpen(false);
          setEditingField(undefined);
        }}
        onSave={handleSaveField}
        existingFieldNames={getExistingFieldNames()}
        nextDisplayOrder={getNextDisplayOrder()}
      />
    </div>
  );
} 