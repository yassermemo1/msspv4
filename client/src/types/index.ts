// Scope Definition Template Types
export interface ScopeDefinitionTemplateResponse {
  template: ScopeDefinitionTemplate | null;
  serviceName: string;
  category: string;
  deliveryModel: string;
}

export interface ScopeDefinitionTemplate {
  fields: FieldDefinition[];
  version?: string;
  lastModified?: string;
}

export interface FieldDefinition {
  id?: string; // For frontend state management
  name: string; // Machine-readable unique identifier
  label: string; // Human-readable UI label
  fieldType: FieldType;
  isRequired: boolean;
  displayOrder: number;
  placeholderText?: string;
  helpText?: string;
  selectOptions?: string[]; // For SELECT types only
  defaultValue?: string | number | boolean;
  validationRules?: ValidationRules;
}

export type FieldType = 
  | 'TEXT_SINGLE_LINE'
  | 'TEXT_MULTI_LINE'
  | 'NUMBER_INTEGER'
  | 'NUMBER_DECIMAL'
  | 'BOOLEAN'
  | 'DATE'
  | 'SELECT_SINGLE_DROPDOWN'
  | 'SELECT_MULTI_CHECKBOX';

export interface ValidationRules {
  min?: number;
  max?: number;
  pattern?: string;
  message?: string;
}

export const FIELD_TYPE_OPTIONS: { value: FieldType; label: string; description: string }[] = [
  { value: 'TEXT_SINGLE_LINE', label: 'Single Line Text', description: 'Short text input' },
  { value: 'TEXT_MULTI_LINE', label: 'Multi Line Text', description: 'Textarea for longer text' },
  { value: 'NUMBER_INTEGER', label: 'Whole Number', description: 'Integer values only' },
  { value: 'NUMBER_DECIMAL', label: 'Decimal Number', description: 'Numbers with decimal places' },
  { value: 'BOOLEAN', label: 'Yes/No (Checkbox)', description: 'True/false checkbox' },
  { value: 'DATE', label: 'Date', description: 'Date picker input' },
  { value: 'SELECT_SINGLE_DROPDOWN', label: 'Single Selection', description: 'Dropdown with one choice' },
  { value: 'SELECT_MULTI_CHECKBOX', label: 'Multiple Selection', description: 'Checkboxes for multiple choices' },
];

export * from '@shared/schema'; 