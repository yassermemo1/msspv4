import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Trash2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FieldDefinition, FieldType, FIELD_TYPE_OPTIONS, ValidationRules } from '@/types';

interface FieldDefinitionFormProps {
  field?: FieldDefinition;
  isOpen: boolean;
  onClose: () => void;
  onSave: (field: FieldDefinition) => void;
  existingFieldNames: string[];
  nextDisplayOrder: number;
}

export function FieldDefinitionForm({
  field,
  isOpen,
  onClose,
  onSave,
  existingFieldNames,
  nextDisplayOrder
}: FieldDefinitionFormProps) {
  const [formData, setFormData] = useState<FieldDefinition>({
    id: '',
    name: '',
    label: '',
    fieldType: 'TEXT_SINGLE_LINE',
    isRequired: false,
    displayOrder: nextDisplayOrder,
    placeholderText: '',
    helpText: '',
    selectOptions: [],
    defaultValue: '',
    validationRules: {}
  });

  const [selectOptionsInput, setSelectOptionsInput] = useState('');
  const [validationMin, setValidationMin] = useState('');
  const [validationMax, setValidationMax] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form when field prop changes
  useEffect(() => {
    if (field) {
      setFormData({
        ...field,
        selectOptions: field.selectOptions || []
      });
      setSelectOptionsInput(field.selectOptions?.join(', ') || '');
      setValidationMin(field.validationRules?.min?.toString() || '');
      setValidationMax(field.validationRules?.max?.toString() || '');
    } else {
      // Reset for new field
      setFormData({
        id: `field_${Date.now()}`,
        name: '',
        label: '',
        fieldType: 'TEXT_SINGLE_LINE',
        isRequired: false,
        displayOrder: nextDisplayOrder,
        placeholderText: '',
        helpText: '',
        selectOptions: [],
        defaultValue: '',
        validationRules: {}
      });
      setSelectOptionsInput('');
      setValidationMin('');
      setValidationMax('');
    }
    setErrors({});
  }, [field, nextDisplayOrder]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required field validations
    if (!formData.name.trim()) {
      newErrors.name = 'Field name is required';
    } else if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(formData.name)) {
      newErrors.name = 'Field name must start with a letter and contain only letters, numbers, and underscores';
    } else if (existingFieldNames.includes(formData.name) && formData.name !== field?.name) {
      newErrors.name = 'Field name must be unique within this template';
    }

    if (!formData.label.trim()) {
      newErrors.label = 'Field label is required';
    }

    // Select options validation
    if (['SELECT_SINGLE_DROPDOWN', 'SELECT_MULTI_CHECKBOX'].includes(formData.fieldType)) {
      if (!formData.selectOptions || formData.selectOptions.length === 0) {
        newErrors.selectOptions = 'At least one option is required for selection fields';
      }
    }

    // Number validation rules
    if (['NUMBER_INTEGER', 'NUMBER_DECIMAL'].includes(formData.fieldType)) {
      if (validationMin !== '' && validationMax !== '' && 
          parseFloat(validationMin) >= parseFloat(validationMax)) {
        newErrors.validationRange = 'Minimum value must be less than maximum value';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) return;

    // Process select options
    const selectOptions = ['SELECT_SINGLE_DROPDOWN', 'SELECT_MULTI_CHECKBOX'].includes(formData.fieldType)
      ? selectOptionsInput.split(',').map(opt => opt.trim()).filter(opt => opt.length > 0)
      : undefined;

    // Process validation rules
    const validationRules: ValidationRules = {};
    if (['NUMBER_INTEGER', 'NUMBER_DECIMAL'].includes(formData.fieldType)) {
      if (validationMin !== '') validationRules.min = parseFloat(validationMin);
      if (validationMax !== '') validationRules.max = parseFloat(validationMax);
    }

    // Prepare default value based on field type
    let defaultValue: string | number | boolean | undefined = formData.defaultValue;
    if (formData.fieldType === 'BOOLEAN') {
      defaultValue = Boolean(formData.defaultValue);
    } else if (['NUMBER_INTEGER', 'NUMBER_DECIMAL'].includes(formData.fieldType)) {
      defaultValue = formData.defaultValue ? parseFloat(formData.defaultValue as string) : undefined;
    }

    const finalField: FieldDefinition = {
      ...formData,
      selectOptions,
      validationRules: Object.keys(validationRules).length > 0 ? validationRules : undefined,
      defaultValue: defaultValue || undefined
    };

    onSave(finalField);
  };

  const handleSelectOptionsChange = (value: string) => {
    setSelectOptionsInput(value);
    const options = value.split(',').map(opt => opt.trim()).filter(opt => opt.length > 0);
    setFormData(prev => ({ ...prev, selectOptions: options }));
  };

  const addSelectOption = (option: string) => {
    if (option.trim() && !formData.selectOptions?.includes(option.trim())) {
      const newOptions = [...(formData.selectOptions || []), option.trim()];
      setFormData(prev => ({ ...prev, selectOptions: newOptions }));
      setSelectOptionsInput(newOptions.join(', '));
    }
  };

  const removeSelectOption = (index: number) => {
    const newOptions = formData.selectOptions?.filter((_, i) => i !== index) || [];
    setFormData(prev => ({ ...prev, selectOptions: newOptions }));
    setSelectOptionsInput(newOptions.join(', '));
  };

  const isSelectField = ['SELECT_SINGLE_DROPDOWN', 'SELECT_MULTI_CHECKBOX'].includes(formData.fieldType);
  const isNumberField = ['NUMBER_INTEGER', 'NUMBER_DECIMAL'].includes(formData.fieldType);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle>{field ? 'Edit Field Definition' : 'Add New Field Definition'}</CardTitle>
            <CardDescription>
              Define the properties and behavior of this scope parameter
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fieldName">
                  Field Name *
                  <span className="text-xs text-gray-500 ml-1">(machine-readable)</span>
                </Label>
                <Input
                  id="fieldName"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="endpoint_count"
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && (
                  <p className="text-xs text-red-500">{errors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="fieldLabel">
                  Display Label *
                  <span className="text-xs text-gray-500 ml-1">(user-friendly)</span>
                </Label>
                <Input
                  id="fieldLabel"
                  value={formData.label}
                  onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
                  placeholder="Number of Endpoints"
                  className={errors.label ? 'border-red-500' : ''}
                />
                {errors.label && (
                  <p className="text-xs text-red-500">{errors.label}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fieldType">Field Type *</Label>
              <Select
                value={formData.fieldType}
                onValueChange={(value: FieldType) => setFormData(prev => ({ ...prev, fieldType: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-xs text-gray-500">{option.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isRequired"
                checked={formData.isRequired}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isRequired: Boolean(checked) }))}
              />
              <Label htmlFor="isRequired">Required field</Label>
            </div>
          </div>

          <Separator />

          {/* Select Options (conditional) */}
          {isSelectField && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Selection Options *</Label>
                <div className="space-y-2">
                  <Textarea
                    value={selectOptionsInput}
                    onChange={(e) => handleSelectOptionsChange(e.target.value)}
                    placeholder="Option 1, Option 2, Option 3"
                    className={errors.selectOptions ? 'border-red-500' : ''}
                  />
                  <p className="text-xs text-gray-500">
                    Enter options separated by commas
                  </p>
                  {errors.selectOptions && (
                    <p className="text-xs text-red-500">{errors.selectOptions}</p>
                  )}
                </div>
                
                {formData.selectOptions && formData.selectOptions.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm">Preview Options:</Label>
                    <div className="flex flex-wrap gap-2">
                      {formData.selectOptions.map((option, index) => (
                        <Badge key={index} variant="secondary" className="flex items-center gap-1">
                          {option}
                          <button
                            onClick={() => removeSelectOption(index)}
                            className="ml-1 hover:text-red-500"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Number Validation (conditional) */}
          {isNumberField && (
            <div className="space-y-4">
              <Label className="text-sm font-medium">Number Validation</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="validationMin">Minimum Value</Label>
                  <Input
                    id="validationMin"
                    type="number"
                    value={validationMin}
                    onChange={(e) => setValidationMin(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="validationMax">Maximum Value</Label>
                  <Input
                    id="validationMax"
                    type="number"
                    value={validationMax}
                    onChange={(e) => setValidationMax(e.target.value)}
                    placeholder="100"
                  />
                </div>
              </div>
              {errors.validationRange && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errors.validationRange}</AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <Separator />

          {/* Additional Properties */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="displayOrder">Display Order</Label>
                <Input
                  id="displayOrder"
                  type="number"
                  value={formData.displayOrder}
                  onChange={(e) => setFormData(prev => ({ ...prev, displayOrder: parseInt(e.target.value) || 0 }))}
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="defaultValue">Default Value</Label>
                <Input
                  id="defaultValue"
                  value={formData.defaultValue?.toString() || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, defaultValue: e.target.value }))}
                  placeholder="Optional default value"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="placeholderText">Placeholder Text</Label>
              <Input
                id="placeholderText"
                value={formData.placeholderText || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, placeholderText: e.target.value }))}
                placeholder="Enter a helpful placeholder..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="helpText">Help Text</Label>
              <Textarea
                id="helpText"
                value={formData.helpText || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, helpText: e.target.value }))}
                placeholder="Provide helpful guidance for users filling out this field..."
                rows={3}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {field ? 'Save Changes' : 'Add Field'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 