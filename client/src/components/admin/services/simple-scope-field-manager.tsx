import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Save, 
  Settings,
  X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { FIELD_TYPE_OPTIONS } from '@/types';

interface ScopeField {
  id?: number;
  name: string;
  label: string;
  fieldType: string;
  isRequired: boolean;
  displayOrder: number;
  placeholderText?: string;
  helpText?: string;
  defaultValue?: string;
  selectOptions?: string[];
  validationRules?: {
    min?: number;
    max?: number;
  };
}

interface SimpleScopeFieldManagerProps {
  serviceId: number;
  serviceName: string;
  readonly?: boolean;
}

export function SimpleScopeFieldManager({ serviceId, serviceName, readonly = false }: SimpleScopeFieldManagerProps) {
  const [fields, setFields] = useState<ScopeField[]>([]);
  const [isAddingField, setIsAddingField] = useState(false);
  const [editingFieldId, setEditingFieldId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [newField, setNewField] = useState<ScopeField>({
    name: '',
    label: '',
    fieldType: 'TEXT_SINGLE_LINE',
    isRequired: false,
    displayOrder: 1,
    placeholderText: '',
    helpText: '',
    defaultValue: '',
    selectOptions: [],
    validationRules: {}
  });

  const { toast } = useToast();

  // Load existing template data on mount
  useEffect(() => {
    const loadExistingTemplate = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/services/${serviceId}/scope-template`, {
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          if (data.template && data.template.fields) {
            // Convert existing template to simplified format
            const existingFields = data.template.fields.map((field: any, index: number) => ({
              id: Date.now() + index, // Temporary ID for frontend
              name: field.name || '',
              label: field.label || '',
              fieldType: field.fieldType || 'TEXT_SINGLE_LINE',
              isRequired: field.isRequired || false,
              displayOrder: field.displayOrder || index + 1,
              placeholderText: field.placeholderText || '',
              helpText: field.helpText || '',
              defaultValue: field.defaultValue || '',
              selectOptions: field.selectOptions || [],
              validationRules: field.validationRules || {}
            }));
            setFields(existingFields);
          }
        }
      } catch (error) {
        console.error('Failed to load existing template:', error);
        toast({
          title: 'Load Warning',
          description: 'Could not load existing template. Starting fresh.',
          variant: 'default',
        });
      } finally {
        setLoading(false);
      }
    };

    loadExistingTemplate();
  }, [serviceId, toast]);

  const fieldTypes = [
    { value: 'TEXT_SINGLE_LINE', label: 'Single Line Text' },
    { value: 'TEXT_MULTI_LINE', label: 'Multi Line Text' },
    { value: 'NUMBER_INTEGER', label: 'Integer Number' },
    { value: 'NUMBER_DECIMAL', label: 'Decimal Number' },
    { value: 'BOOLEAN', label: 'Yes/No (Boolean)' },
    { value: 'DATE', label: 'Date' },
    { value: 'SELECT_SINGLE_DROPDOWN', label: 'Single Select Dropdown' },
    { value: 'SELECT_MULTI_CHECKBOX', label: 'Multi Select Checkboxes' }
  ];

  const addField = () => {
    if (!newField.name || !newField.label) {
      toast({
        title: 'Validation Error',
        description: 'Field name and label are required.',
        variant: 'destructive',
      });
      return;
    }

    // Check for duplicate names
    if (fields.some(f => f.name === newField.name)) {
      toast({
        title: 'Validation Error',
        description: 'Field name must be unique.',
        variant: 'destructive',
      });
      return;
    }

    const fieldToAdd: ScopeField = {
      ...newField,
      id: Date.now(), // Temporary ID for frontend
      displayOrder: fields.length + 1
    };

    setFields([...fields, fieldToAdd]);
    setNewField({
      name: '',
      label: '',
      fieldType: 'TEXT_SINGLE_LINE',
      isRequired: false,
      displayOrder: 1,
      placeholderText: '',
      helpText: '',
      defaultValue: '',
      selectOptions: [],
      validationRules: {}
    });
    setIsAddingField(false);

    toast({
      title: 'Field Added',
      description: 'Field has been added to the template. Don\'t forget to save!',
    });
  };

  const deleteField = (fieldId: number) => {
    setFields(fields.filter(f => f.id !== fieldId));
    toast({
      title: 'Field Removed',
      description: 'Field has been removed from the template.',
    });
  };

  const moveField = (fieldId: number, direction: 'up' | 'down') => {
    const fieldIndex = fields.findIndex(f => f.id === fieldId);
    if (fieldIndex === -1) return;

    const newFields = [...fields];
    const targetIndex = direction === 'up' ? fieldIndex - 1 : fieldIndex + 1;
    
    if (targetIndex < 0 || targetIndex >= newFields.length) return;

    // Swap the fields
    [newFields[fieldIndex], newFields[targetIndex]] = [newFields[targetIndex], newFields[fieldIndex]];
    
    // Update display orders
    newFields.forEach((field, index) => {
      field.displayOrder = index + 1;
    });

    setFields(newFields);
  };

  const saveTemplate = async () => {
    try {
      // Convert to old JSONB format for compatibility
      const template = {
        fields: fields.map(field => ({
          name: field.name,
          label: field.label,
          fieldType: field.fieldType,
          isRequired: field.isRequired,
          displayOrder: field.displayOrder,
          placeholderText: field.placeholderText,
          helpText: field.helpText,
          defaultValue: field.defaultValue,
          selectOptions: field.selectOptions,
          validationRules: field.validationRules
        })),
        version: '1.0',
        lastModified: new Date().toISOString()
      };

      const response = await fetch(`/api/services/${serviceId}/scope-template`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ template }),
      });

      if (!response.ok) {
        throw new Error('Failed to save template');
      }

      toast({
        title: 'Template Saved',
        description: 'Scope definition template has been saved successfully.',
      });
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: 'Save Failed',
        description: 'Failed to save the template. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const getFieldTypeLabel = (fieldType: string) => {
    const type = fieldTypes.find(t => t.value === fieldType);
    return type?.label || fieldType;
  };

  return (
    <div className="space-y-6">
      {loading && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-sm text-gray-500">Loading existing template...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && (
        <>
          {/* Header */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Simple Scope Field Manager
                  </CardTitle>
                  <CardDescription>
                    Easily add and manage scope fields for {serviceName}. Each field will appear when creating contracts.
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {!readonly && (
                    <>
                      <Button 
                        onClick={() => setIsAddingField(true)}
                        disabled={isAddingField}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Field
                      </Button>
                      <Button 
                        onClick={saveTemplate}
                        variant="outline"
                        disabled={fields.length === 0}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Save Template
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Add New Field Form */}
          {isAddingField && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Add New Field</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Field Name (Internal)</Label>
                    <Input
                      value={newField.name}
                      onChange={(e) => setNewField({...newField, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_')})}
                      placeholder="e.g., endpoint_count"
                    />
                  </div>
                  <div>
                    <Label>Display Label</Label>
                    <Input
                      value={newField.label}
                      onChange={(e) => setNewField({...newField, label: e.target.value})}
                      placeholder="e.g., Number of Endpoints"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Field Type</Label>
                    <Select value={newField.fieldType} onValueChange={(value) => setNewField({...newField, fieldType: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {fieldTypes.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-2 pt-6">
                    <Checkbox
                      checked={newField.isRequired}
                      onCheckedChange={(checked) => setNewField({...newField, isRequired: !!checked})}
                    />
                    <Label>Required Field</Label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Placeholder Text</Label>
                    <Input
                      value={newField.placeholderText}
                      onChange={(e) => setNewField({...newField, placeholderText: e.target.value})}
                      placeholder="Placeholder text for the field"
                    />
                  </div>
                  <div>
                    <Label>Help Text</Label>
                    <Input
                      value={newField.helpText}
                      onChange={(e) => setNewField({...newField, helpText: e.target.value})}
                      placeholder="Help text to guide users"
                    />
                  </div>
                </div>

                {/* Select Options for dropdown/checkbox fields */}
                {['SELECT_SINGLE_DROPDOWN', 'SELECT_MULTI_CHECKBOX'].includes(newField.fieldType) && (
                  <div>
                    <Label>Options (comma-separated)</Label>
                    <Textarea
                      value={newField.selectOptions?.join(', ') || ''}
                      onChange={(e) => setNewField({
                        ...newField, 
                        selectOptions: e.target.value.split(',').map(opt => opt.trim()).filter(opt => opt.length > 0)
                      })}
                      placeholder="Option 1, Option 2, Option 3"
                      rows={2}
                    />
                  </div>
                )}

                {/* Validation for number fields */}
                {['NUMBER_INTEGER', 'NUMBER_DECIMAL'].includes(newField.fieldType) && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Min Value</Label>
                      <Input
                        type="number"
                        value={newField.validationRules?.min || ''}
                        onChange={(e) => setNewField({
                          ...newField, 
                          validationRules: { ...newField.validationRules, min: parseInt(e.target.value) || undefined }
                        })}
                        placeholder="Minimum value"
                      />
                    </div>
                    <div>
                      <Label>Max Value</Label>
                      <Input
                        type="number"
                        value={newField.validationRules?.max || ''}
                        onChange={(e) => setNewField({
                          ...newField, 
                          validationRules: { ...newField.validationRules, max: parseInt(e.target.value) || undefined }
                        })}
                        placeholder="Maximum value"
                      />
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button onClick={addField}>Add Field</Button>
                  <Button variant="outline" onClick={() => setIsAddingField(false)}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Fields Table */}
          <Card>
            <CardHeader>
              <CardTitle>Current Fields ({fields.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {fields.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No scope fields defined yet.</p>
                  <p className="text-sm">Add fields to create dynamic scope forms for this service.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Label</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Required</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields
                      .sort((a, b) => a.displayOrder - b.displayOrder)
                      .map((field, index) => (
                        <TableRow key={field.id}>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => moveField(field.id!, 'up')}
                                disabled={index === 0}
                              >
                                <ArrowUp className="h-3 w-3" />
                              </Button>
                              <span className="text-sm font-mono">{field.displayOrder}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => moveField(field.id!, 'down')}
                                disabled={index === fields.length - 1}
                              >
                                <ArrowDown className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                              {field.name}
                            </code>
                          </TableCell>
                          <TableCell>{field.label}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {getFieldTypeLabel(field.fieldType)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {field.isRequired ? (
                              <Badge variant="destructive">Required</Badge>
                            ) : (
                              <Badge variant="secondary">Optional</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteField(field.id!)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
} 