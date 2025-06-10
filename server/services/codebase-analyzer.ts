import { Project, SourceFile, Node, SyntaxKind } from 'ts-morph';
import * as fastGlob from 'fast-glob';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { 
  clients, clientContacts, contracts, services, serviceScopes, proposals, 
  licensePools, clientLicenses, individualLicenses, hardwareAssets, 
  clientHardwareAssignments, financialTransactions, auditLogs, changeHistory,
  securityEvents, dataAccessLogs, dashboardWidgets, userDashboards,
  dashboardWidgetAssignments, externalSystems, clientExternalMappings,
  externalWidgetTemplates, widgetExecutionCache, pagePermissions,
  savedSearches, searchHistory, users, userSettings, companySettings
} from '../../shared/schema';

export interface ColumnMetadata {
  tableName: string;
  columnName: string;
  columnType: string;
  description?: string;
  nullable: boolean;
  defaultValue?: any;
  usageCount: number;
  usageLocations: UsageLocation[];
  usedInForms: boolean;
  usedInValidators: boolean;
  usedInAPI: boolean;
  lastUsedDate?: string;
  tags: string[];
  formUsage: FormUsage[];
  dialogUsage: DialogUsage[];
}

export interface UsageLocation {
  file: string;
  line: number;
  context: string;
  type: 'property' | 'destructuring' | 'select' | 'insert' | 'update' | 'form' | 'validator' | 'type';
}

export interface FormUsage {
  componentName: string;
  formType: 'create' | 'edit' | 'filter' | 'search';
  file: string;
  fieldName: string;
  fieldType: 'input' | 'select' | 'textarea' | 'checkbox' | 'date' | 'number';
  required: boolean;
  validation?: string;
  line: number;
}

export interface DialogUsage {
  componentName: string;
  dialogType: 'modal' | 'drawer' | 'popup';
  file: string;
  purpose: string;
  line: number;
}

export interface TableAnalysis {
  tableName: string;
  totalColumns: number;
  usedColumns: number;
  unusedColumns: number;
  columns: ColumnMetadata[];
}

export interface CodebaseAnalysisResult {
  summary: {
    totalTables: number;
    totalColumns: number;
    usedColumns: number;
    unusedColumns: number;
    mostUsedColumns: Array<{ table: string; column: string; usage: number }>;
    recentlyDeletedColumns: number;
  };
  tables: TableAnalysis[];
  deletionHistory: ColumnDeletion[];
}

export interface ColumnDeletion {
  id: string;
  tableName: string;
  columnName: string;
  deletedAt: string;
  deletedBy: string;
  backupPath: string;
  reason?: string;
  canRollback: boolean;
  changes?: string[]; // List of changes made during deletion
}

export interface AnalysisCache {
  hash: string;
  timestamp: number;
  result: CodebaseAnalysisResult;
}

export interface FileChangeDetection {
  files: string[];
  hash: string;
  lastModified: number;
}

class CodebaseAnalyzer {
  private project: Project;
  private schemaTablesMap: Map<string, any>;
  private cacheFile: string;
  private maxCacheAge: number = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  constructor() {
    this.project = new Project({
      tsConfigFilePath: path.join(process.cwd(), 'tsconfig.json'),
    });
    
    this.cacheFile = path.join(process.cwd(), '.codebase-analysis-cache.json');
    
    this.schemaTablesMap = new Map([
      ['clients', clients],
      ['clientContacts', clientContacts],
      ['contracts', contracts],
      ['services', services],
      ['serviceScopes', serviceScopes],
      ['proposals', proposals],
      ['licensePools', licensePools],
      ['clientLicenses', clientLicenses],
      ['individualLicenses', individualLicenses],
      ['hardwareAssets', hardwareAssets],
      ['clientHardwareAssignments', clientHardwareAssignments],
      ['financialTransactions', financialTransactions],
      ['auditLogs', auditLogs],
      ['changeHistory', changeHistory],
      ['securityEvents', securityEvents],
      ['dataAccessLogs', dataAccessLogs],
      ['dashboardWidgets', dashboardWidgets],
      ['userDashboards', userDashboards],
      ['dashboardWidgetAssignments', dashboardWidgetAssignments],
      ['externalSystems', externalSystems],
      ['clientExternalMappings', clientExternalMappings],
      ['externalWidgetTemplates', externalWidgetTemplates],
      ['widgetExecutionCache', widgetExecutionCache],
      ['pagePermissions', pagePermissions],
      ['savedSearches', savedSearches],
      ['searchHistory', searchHistory],
      ['users', users],
      ['userSettings', userSettings],
      ['companySettings', companySettings]
    ]);
  }

  async analyzeCodebase(forceRefresh: boolean = false): Promise<CodebaseAnalysisResult> {
    console.log('🔍 Starting comprehensive codebase analysis...');
    
    // Check if we can use cached results
    if (!forceRefresh) {
      const cachedResult = await this.getCachedAnalysis();
      if (cachedResult) {
        console.log('✅ Using cached codebase analysis result');
        return cachedResult;
      }
    }
    
    console.log('🔄 Running fresh analysis...');
    
    // Load all source files
    await this.loadSourceFiles();
    
    // Analyze each table
    const tables: TableAnalysis[] = [];
    
    for (const [tableName, tableSchema] of this.schemaTablesMap.entries()) {
      console.log(`Analyzing table: ${tableName}`);
      const tableAnalysis = await this.analyzeTable(tableName, tableSchema);
      tables.push(tableAnalysis);
    }
    
    // Load deletion history
    const deletionHistory = await this.loadDeletionHistory();
    
    // Generate summary
    const summary = this.generateSummary(tables, deletionHistory);
    
    const result: CodebaseAnalysisResult = {
      summary,
      tables,
      deletionHistory
    };
    
    // Cache the result
    await this.cacheAnalysis(result);
    
    console.log('✅ Codebase analysis completed and cached');
    
    return result;
  }

  private async loadSourceFiles(): Promise<void> {
    const patterns = [
      'server/**/*.ts',
      'client/src/**/*.{ts,tsx}',
      'shared/**/*.ts',
      '!node_modules/**',
      '!**/dist/**',
      '!**/*.d.ts'
    ];

    try {
      console.log('🔍 Searching for files with patterns:', patterns);
      const files = await fastGlob(patterns, { 
        cwd: process.cwd(),
        absolute: true 
      });

      console.log(`Loading ${files.length} source files...`);
      
      for (const file of files) {
        try {
          this.project.addSourceFileAtPath(file);
        } catch (error) {
          console.warn(`Warning: Could not load file ${file}:`, error);
        }
      }
    } catch (error) {
      console.error('Error in loadSourceFiles:', error);
      throw error;
    }
  }

  private async analyzeTable(tableName: string, tableSchema: any): Promise<TableAnalysis> {
    console.log(`🔍 Analyzing table: ${tableName}`);
    const columns: ColumnMetadata[] = [];
    
    // Get column definitions from schema
    const schemaColumns = this.extractSchemaColumns(tableSchema);
    console.log(`Found ${Object.keys(schemaColumns).length} columns for table ${tableName}:`, Object.keys(schemaColumns));
    
    for (const [columnName, columnDef] of Object.entries(schemaColumns)) {
      try {
        const usage = await this.analyzeColumnUsage(tableName, columnName);
        
        columns.push({
          tableName,
          columnName,
          columnType: this.getColumnType(columnDef),
          description: this.getColumnDescription(columnDef),
          nullable: this.isColumnNullable(columnDef),
          defaultValue: this.getColumnDefault(columnDef),
          usageCount: usage.locations.length,
          usageLocations: usage.locations,
          usedInForms: usage.usedInForms,
          usedInValidators: usage.usedInValidators,
          usedInAPI: usage.usedInAPI,
          lastUsedDate: usage.lastUsedDate,
          tags: this.generateColumnTags(usage),
          formUsage: usage.formUsage || [],
          dialogUsage: usage.dialogUsage || []
        });
      } catch (error) {
        console.error(`Error analyzing column ${tableName}.${columnName}:`, error);
        // Continue with other columns even if one fails
      }
    }

    const result = {
      tableName,
      totalColumns: columns.length,
      usedColumns: columns.filter(c => c.usageCount > 0).length,
      unusedColumns: columns.filter(c => c.usageCount === 0).length,
      columns
    };
    
    console.log(`✅ Completed analysis for table ${tableName}: ${result.totalColumns} columns, ${result.usedColumns} used, ${result.unusedColumns} unused`);
    return result;
  }

  private extractSchemaColumns(tableSchema: any): Record<string, any> {
    const columns: Record<string, any> = {};
    
    if (!tableSchema || typeof tableSchema !== 'object') {
      console.warn('Invalid table schema provided');
      return {};
    }
    
    // Try multiple approaches to extract columns from Drizzle schema
    
    // Method 1: Direct properties that look like columns
    for (const [key, value] of Object.entries(tableSchema)) {
      // Skip internal properties and methods
      if (key.startsWith('_') || key === 'Symbol' || typeof value === 'function') {
        continue;
      }
      
      // Check if this looks like a column definition
      if (value && typeof value === 'object') {
        const constructorName = value.constructor?.name || '';
        if (constructorName.includes('Column') || 
            constructorName.includes('PgColumn') ||
            constructorName.includes('PgSerial') ||
            constructorName.includes('PgText') ||
            constructorName.includes('PgInteger') ||
            constructorName.includes('PgBoolean') ||
            constructorName.includes('PgTimestamp') ||
            value.hasOwnProperty('name') || 
            value.hasOwnProperty('dataType') || 
            value.hasOwnProperty('columnType')) {
          columns[key] = value;
        }
      }
    }
    
    // Method 2: Check internal Drizzle structure
    if (Object.keys(columns).length === 0 && tableSchema._) {
      const internal = tableSchema._;
      
      // Check for columns property
      if (internal.columns && typeof internal.columns === 'object') {
        for (const [columnName, columnDef] of Object.entries(internal.columns)) {
          columns[columnName] = columnDef;
        }
      }
      
      // Check for other potential column containers
      if (Object.keys(columns).length === 0) {
        for (const [key, value] of Object.entries(internal)) {
          if (typeof value === 'object' && value !== null && !key.startsWith('_')) {
            // If this looks like a columns container
            if (key === 'columns' || key === 'fields') {
              for (const [columnName, columnDef] of Object.entries(value)) {
                columns[columnName] = columnDef;
              }
            }
          }
        }
      }
    }
    
    // Method 3: Try to extract from known schema patterns
    if (Object.keys(columns).length === 0) {
      // Create a basic set of common columns based on the table name
      const commonColumns = ['id', 'createdAt', 'updatedAt'];
      for (const col of commonColumns) {
        if (tableSchema[col]) {
          columns[col] = { name: col, dataType: 'unknown', artificial: true };
        }
      }
      
      // Add any other properties that exist on the schema
      for (const [key, value] of Object.entries(tableSchema)) {
        if (!key.startsWith('_') && 
            typeof value !== 'function' && 
            key !== 'Symbol' &&
            !columns[key]) {
          columns[key] = { name: key, dataType: 'unknown', artificial: true };
        }
      }
    }
    
    // Log for debugging if no columns found
    if (Object.keys(columns).length === 0) {
      console.warn(`No columns found for table schema. Available keys:`, Object.keys(tableSchema));
      console.warn(`Schema structure:`, JSON.stringify(tableSchema, null, 2).substring(0, 500));
    }
    
    return columns;
  }

  private async analyzeColumnUsage(tableName: string, columnName: string): Promise<{
    locations: UsageLocation[];
    usedInForms: boolean;
    usedInValidators: boolean;
    usedInAPI: boolean;
    lastUsedDate?: string;
    formUsage: FormUsage[];
    dialogUsage: DialogUsage[];
  }> {
    const locations: UsageLocation[] = [];
    const formUsage: FormUsage[] = [];
    const dialogUsage: DialogUsage[] = [];
    let usedInForms = false;
    let usedInValidators = false;
    let usedInAPI = false;
    let lastUsedDate: string | undefined;

    const sourceFiles = this.project.getSourceFiles();

    for (const sourceFile of sourceFiles) {
      const filePath = sourceFile.getFilePath();
      const relativePath = path.relative(process.cwd(), filePath);
      
      // Skip if this is the schema file itself
      if (relativePath.includes('schema.ts')) {
        continue;
      }

      // Find usage in this file
      const fileUsages = this.findColumnUsageInFile(sourceFile, tableName, columnName);
      
      // Analyze form and dialog usage
      const fileContent = sourceFile.getFullText();
      this.analyzeFormUsageInFile(fileContent, relativePath, columnName, formUsage);
      this.analyzeDialogUsageInFile(fileContent, relativePath, columnName, dialogUsage);
      
      for (const usage of fileUsages) {
        locations.push({
          file: relativePath,
          line: usage.line,
          context: usage.context,
          type: usage.type
        });

        // Categorize usage
        if (usage.type === 'form' || relativePath.includes('/forms/') || usage.context.includes('useForm')) {
          usedInForms = true;
        }
        
        if (usage.type === 'validator' || usage.context.includes('zod') || usage.context.includes('schema')) {
          usedInValidators = true;
        }
        
        if (relativePath.includes('/api/') || relativePath.includes('routes.ts') || usage.context.includes('POST') || usage.context.includes('GET')) {
          usedInAPI = true;
        }
      }

      // Get file modification time as a proxy for last used date
      try {
        const stats = fs.statSync(filePath);
        const fileDate = stats.mtime.toISOString();
        if (!lastUsedDate || fileDate > lastUsedDate) {
          lastUsedDate = fileDate;
        }
      } catch (error) {
        // Ignore file stat errors
      }
    }

    return {
      locations,
      usedInForms,
      usedInValidators,
      usedInAPI,
      lastUsedDate,
      formUsage,
      dialogUsage
    };
  }

  private findColumnUsageInFile(sourceFile: SourceFile, tableName: string, columnName: string): Array<{
    line: number;
    context: string;
    type: 'property' | 'destructuring' | 'select' | 'insert' | 'update' | 'form' | 'validator' | 'type';
  }> {
    const usages: Array<{ line: number; context: string; type: any }> = [];
    const text = sourceFile.getFullText();

    // Search for various patterns
    const patterns = [
      // Direct property access: obj.columnName
      new RegExp(`\\b${columnName}\\b`, 'g'),
      // Destructuring: { columnName }
      new RegExp(`\\{[^}]*\\b${columnName}\\b[^}]*\\}`, 'g'),
      // String literals: "columnName" or 'columnName'
      new RegExp(`["']${columnName}["']`, 'g'),
      // SQL-like patterns
      new RegExp(`\\b${tableName}\\s*\\.\\s*${columnName}\\b`, 'g')
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const lines = text.substring(0, match.index).split('\n');
        const lineNumber = lines.length;
        const lineText = text.split('\n')[lineNumber - 1] || '';
        
        // Get context (surrounding lines)
        const contextStart = Math.max(0, lineNumber - 2);
        const contextEnd = Math.min(text.split('\n').length, lineNumber + 1);
        const context = text.split('\n').slice(contextStart, contextEnd).join('\n').trim();
        
        // Determine usage type based on context
        let type: any = 'property';
        if (context.includes('useForm') || context.includes('form')) {
          type = 'form';
        } else if (context.includes('zod') || context.includes('z.') || context.includes('schema')) {
          type = 'validator';
        } else if (context.includes('select') || context.includes('from')) {
          type = 'select';
        } else if (context.includes('insert') || context.includes('values')) {
          type = 'insert';
        } else if (context.includes('update') || context.includes('set')) {
          type = 'update';
        } else if (context.includes('interface') || context.includes('type ')) {
          type = 'type';
        } else if (context.includes('{') && context.includes('}')) {
          type = 'destructuring';
        }

        usages.push({
          line: lineNumber,
          context: context.substring(0, 200), // Limit context length
          type
        });
      }
    }

    return usages;
  }

  private analyzeFormUsageInFile(
    fileContent: string, 
    filePath: string, 
    columnName: string, 
    formUsage: FormUsage[]
  ): void {
    const lines = fileContent.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;
      
      // Look for form field patterns
      if (line.includes(columnName) && (
        line.includes('Input') || 
        line.includes('Select') || 
        line.includes('Textarea') || 
        line.includes('Checkbox') ||
        line.includes('DatePicker') ||
        line.includes('NumberInput') ||
        line.includes('FormField') ||
        line.includes('FormControl')
      )) {
        
        // Try to determine form type and component name
        let formType: 'create' | 'edit' | 'filter' | 'search' = 'create';
        let componentName = path.basename(filePath, path.extname(filePath));
        let fieldType: 'input' | 'select' | 'textarea' | 'checkbox' | 'date' | 'number' = 'input';
        let required = false;
        
        // Determine form type from context
        const contextLines = lines.slice(Math.max(0, i - 5), Math.min(lines.length, i + 5)).join('\n');
        if (contextLines.includes('edit') || contextLines.includes('update')) {
          formType = 'edit';
        } else if (contextLines.includes('filter') || contextLines.includes('search')) {
          formType = contextLines.includes('search') ? 'search' : 'filter';
        }
        
        // Determine field type
        if (line.includes('Select')) fieldType = 'select';
        else if (line.includes('Textarea')) fieldType = 'textarea';
        else if (line.includes('Checkbox')) fieldType = 'checkbox';
        else if (line.includes('DatePicker') || line.includes('Date')) fieldType = 'date';
        else if (line.includes('NumberInput') || line.includes('Number')) fieldType = 'number';
        
        // Check if required
        if (line.includes('required') || contextLines.includes('required')) {
          required = true;
        }
        
        formUsage.push({
          componentName,
          formType,
          file: filePath,
          fieldName: columnName,
          fieldType,
          required,
          validation: undefined, // Could be enhanced to extract validation rules
          line: lineNumber
        });
      }
    }
  }

  private analyzeDialogUsageInFile(
    fileContent: string, 
    filePath: string, 
    columnName: string, 
    dialogUsage: DialogUsage[]
  ): void {
    const lines = fileContent.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;
      
      // Look for dialog patterns that include the column
      if (line.includes(columnName) && (
        line.includes('Dialog') || 
        line.includes('Modal') || 
        line.includes('Drawer') ||
        line.includes('Popup') ||
        line.includes('Alert')
      )) {
        
        let dialogType: 'modal' | 'drawer' | 'popup' = 'modal';
        let componentName = path.basename(filePath, path.extname(filePath));
        let purpose = 'display';
        
        // Determine dialog type
        if (line.includes('Drawer')) dialogType = 'drawer';
        else if (line.includes('Popup')) dialogType = 'popup';
        
        // Try to determine purpose from context
        const contextLines = lines.slice(Math.max(0, i - 3), Math.min(lines.length, i + 3)).join('\n');
        if (contextLines.includes('delete') || contextLines.includes('remove')) {
          purpose = 'delete confirmation';
        } else if (contextLines.includes('edit') || contextLines.includes('update')) {
          purpose = 'edit form';
        } else if (contextLines.includes('create') || contextLines.includes('add')) {
          purpose = 'create form';
        } else if (contextLines.includes('view') || contextLines.includes('details')) {
          purpose = 'view details';
        }
        
        dialogUsage.push({
          componentName,
          dialogType,
          file: filePath,
          purpose,
          line: lineNumber
        });
      }
    }
  }

  private getColumnType(columnDef: any): string {
    if (!columnDef) return 'unknown';
    
    // Extract type information from Drizzle column definition
    if (columnDef.dataType) {
      return columnDef.dataType;
    }
    
    // Fallback to constructor name or string representation
    return columnDef.constructor?.name || 'unknown';
  }

  private getColumnDescription(columnDef: any): string | undefined {
    return columnDef?.description || columnDef?.comment;
  }

  private isColumnNullable(columnDef: any): boolean {
    return columnDef?.notNull === false || columnDef?.nullable === true;
  }

  private getColumnDefault(columnDef: any): any {
    return columnDef?.default;
  }

  private generateColumnTags(usage: any): string[] {
    const tags: string[] = [];
    
    if (usage.usageCount === 0) tags.push('unused');
    if (usage.usedInAPI) tags.push('api');
    if (usage.usedInForms) tags.push('form');
    if (usage.usedInValidators) tags.push('validator');
    if (usage.usageCount > 10) tags.push('heavily-used');
    if (usage.usageCount === 1) tags.push('rarely-used');
    
    return tags;
  }

  private generateSummary(tables: TableAnalysis[], deletionHistory: ColumnDeletion[]): CodebaseAnalysisResult['summary'] {
    const totalColumns = tables.reduce((sum, table) => sum + table.totalColumns, 0);
    const usedColumns = tables.reduce((sum, table) => sum + table.usedColumns, 0);
    const unusedColumns = tables.reduce((sum, table) => sum + table.unusedColumns, 0);
    
    // Find most used columns
    const allColumns = tables.flatMap(table => 
      table.columns.map(col => ({
        table: table.tableName,
        column: col.columnName,
        usage: col.usageCount
      }))
    );
    
    const mostUsedColumns = allColumns
      .sort((a, b) => b.usage - a.usage)
      .slice(0, 10);

    const recentlyDeletedColumns = deletionHistory.filter(
      deletion => new Date(deletion.deletedAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    ).length;

    return {
      totalTables: tables.length,
      totalColumns,
      usedColumns,
      unusedColumns,
      mostUsedColumns,
      recentlyDeletedColumns
    };
  }

  private async loadDeletionHistory(): Promise<ColumnDeletion[]> {
    const historyPath = path.join(process.cwd(), 'deleted_columns.json');
    
    try {
      if (fs.existsSync(historyPath)) {
        const content = fs.readFileSync(historyPath, 'utf-8');
        return JSON.parse(content);
      }
    } catch (error) {
      console.warn('Could not load deletion history:', error);
    }
    
    return [];
  }

  async deleteColumn(
    tableName: string, 
    columnName: string, 
    userId: string, 
    reason?: string
  ): Promise<{ success: boolean; message: string; backupPath?: string; changes: string[] }> {
    try {
      console.log(`🗑️ Starting comprehensive deletion of column ${tableName}.${columnName}`);
      const changes: string[] = [];
      
      // 1. Create comprehensive backup
      const backupPath = await this.createColumnBackup(tableName, columnName);
      changes.push(`✅ Created backup at ${backupPath}`);
      
      // 2. Remove from database schema
      await this.removeFromDatabase(tableName, columnName);
      changes.push(`✅ Removed column from database table ${tableName}`);
      
      // 3. Remove from schema files (Drizzle/SQL)
      await this.removeFromSchema(tableName, columnName);
      changes.push(`✅ Updated schema files`);
      
      // 4. Remove from TypeScript types and interfaces
      await this.removeFromTypes(tableName, columnName);
      changes.push(`✅ Updated TypeScript type definitions`);
      
      // 5. Remove from validators and Zod schemas
      await this.removeFromValidators(tableName, columnName);
      changes.push(`✅ Updated validation schemas`);
      
      // 6. Remove from forms and React components
      await this.removeFromForms(tableName, columnName);
      changes.push(`✅ Updated form components`);
      
      // 7. Remove from API routes and endpoints
      await this.removeFromAPIs(tableName, columnName);
      changes.push(`✅ Updated API endpoints`);
      
      // 8. Remove from search configurations
      await this.removeFromSearchConfig(tableName, columnName);
      changes.push(`✅ Updated search configurations`);
      
      // 9. Remove from entity relations and mappings
      await this.removeFromEntityRelations(tableName, columnName);
      changes.push(`✅ Updated entity relations`);
      
      // 10. Remove from CSV import/export configurations
      await this.removeFromImportExportConfig(tableName, columnName);
      changes.push(`✅ Updated import/export configurations`);
      
      // 11. Remove from dashboard widgets and reports
      await this.removeFromDashboards(tableName, columnName);
      changes.push(`✅ Updated dashboard configurations`);
      
      // 12. Clean up any remaining references
      await this.cleanupRemainingReferences(tableName, columnName);
      changes.push(`✅ Cleaned up remaining references`);
      
      // 13. Log deletion with comprehensive details
      await this.logColumnDeletion(tableName, columnName, userId, backupPath, reason, changes);
      changes.push(`✅ Logged deletion for audit trail`);
      
      console.log(`✅ Successfully completed comprehensive deletion of ${tableName}.${columnName}`);
      return {
        success: true,
        message: `Successfully deleted column ${tableName}.${columnName} from all locations`,
        backupPath,
        changes
      };
      
    } catch (error) {
      console.error('Error deleting column:', error);
      return {
        success: false,
        message: `Failed to delete column: ${error instanceof Error ? error.message : 'Unknown error'}`,
        changes: []
      };
    }
  }

  private async removeFromDatabase(tableName: string, columnName: string): Promise<void> {
    console.log(`🗄️ Removing column ${columnName} from database table ${tableName}`);
    
    try {
      // Execute SQL to drop the column
      await db.execute(sql`ALTER TABLE ${sql.identifier(tableName)} DROP COLUMN IF EXISTS ${sql.identifier(columnName)}`);
      console.log(`✅ Column ${columnName} dropped from ${tableName} table`);
    } catch (error) {
      console.warn(`⚠️ Could not drop column from database: ${error}`);
      // Continue with code cleanup even if database drop fails
    }
  }

  private async removeFromSchema(tableName: string, columnName: string): Promise<void> {
    console.log(`📄 Removing ${columnName} from schema files...`);
    
    const schemaFiles = glob.sync(['shared/schema.ts', 'shared/**/*schema*.ts', 'server/schema/**/*.ts']);
    
    for (const filePath of schemaFiles) {
      const fullPath = path.join(process.cwd(), filePath);
      if (!fs.existsSync(fullPath)) continue;
      
      let content = fs.readFileSync(fullPath, 'utf-8');
      const originalContent = content;
      
      // Remove column definition patterns
      const patterns = [
        // Drizzle column definitions
        new RegExp(`\\s*${columnName}\\s*:\\s*[^,}]+\\([^)]*\\)[^,}]*,?\\s*`, 'g'),
        // Simple column definitions
        new RegExp(`\\s*${columnName}\\s*:\\s*[^,}]+,?\\s*`, 'g'),
        // SQL column definitions
        new RegExp(`\\s*${columnName}\\s+[A-Z_]+[^,\\n]*,?\\s*`, 'gi'),
        // Column comments or documentation
        new RegExp(`\\s*//.*${columnName}.*\\n`, 'gi')
      ];
      
      patterns.forEach(pattern => {
        content = content.replace(pattern, '');
      });
      
      // Clean up trailing commas and extra whitespace
      content = content.replace(/,(\s*[}\]])/g, '$1');
      content = content.replace(/,\s*,/g, ',');
      
      if (content !== originalContent) {
        fs.writeFileSync(fullPath, content);
        console.log(`✅ Updated schema file: ${filePath}`);
      }
    }
  }

  private async removeFromTypes(tableName: string, columnName: string): Promise<void> {
    console.log(`🔷 Removing ${columnName} from TypeScript types...`);
    
    const typeFiles = glob.sync([
      'shared/types.ts', 
      'shared/**/*types*.ts', 
      'server/types/**/*.ts',
      'client/src/types/**/*.ts'
    ]);
    
    for (const filePath of typeFiles) {
      const fullPath = path.join(process.cwd(), filePath);
      if (!fs.existsSync(fullPath)) continue;
      
      let content = fs.readFileSync(fullPath, 'utf-8');
      const originalContent = content;
      
      // Remove TypeScript interface properties
      const patterns = [
        new RegExp(`\\s*${columnName}\\??\\s*:\\s*[^;\\n}]+[;\\n]?`, 'g'),
        new RegExp(`\\s*readonly\\s+${columnName}\\??\\s*:\\s*[^;\\n}]+[;\\n]?`, 'g'),
        new RegExp(`\\s*${columnName}\\s*\\|`, 'g'), // Union types
        new RegExp(`\\|\\s*${columnName}\\s*`, 'g'), // Union types
        new RegExp(`'${columnName}'\\s*\\|`, 'g'), // String literal types
        new RegExp(`\\|\\s*'${columnName}'`, 'g'), // String literal types
      ];
      
      patterns.forEach(pattern => {
        content = content.replace(pattern, '');
      });
      
      if (content !== originalContent) {
        fs.writeFileSync(fullPath, content);
        console.log(`✅ Updated type file: ${filePath}`);
      }
    }
  }

  private async removeFromValidators(tableName: string, columnName: string): Promise<void> {
    console.log(`✅ Removing ${columnName} from validators...`);
    
    const validatorFiles = glob.sync([
      'shared/**/*validator*.ts',
      'server/**/*validation*.ts',
      'client/src/**/*schema*.ts',
      'shared/schemas.ts'
    ]);
    
    for (const filePath of validatorFiles) {
      const fullPath = path.join(process.cwd(), filePath);
      if (!fs.existsSync(fullPath)) continue;
      
      let content = fs.readFileSync(fullPath, 'utf-8');
      const originalContent = content;
      
      // Remove Zod schema properties
      const patterns = [
        new RegExp(`\\s*${columnName}\\s*:\\s*z\\.[^,}]+,?\\s*`, 'g'),
        new RegExp(`\\s*${columnName}\\s*:\\s*[^,}]+\\.optional\\(\\),?\\s*`, 'g'),
        new RegExp(`\\s*${columnName}\\s*:\\s*[^,}]+\\.nullable\\(\\),?\\s*`, 'g'),
        new RegExp(`\\s*"${columnName}"\\s*:\\s*[^,}]+,?\\s*`, 'g'),
      ];
      
      patterns.forEach(pattern => {
        content = content.replace(pattern, '');
      });
      
      if (content !== originalContent) {
        fs.writeFileSync(fullPath, content);
        console.log(`✅ Updated validator file: ${filePath}`);
      }
    }
  }

  private async removeFromAPIs(tableName: string, columnName: string): Promise<void> {
    console.log(`🌐 Removing ${columnName} from API endpoints...`);
    
    const apiFiles = glob.sync([
      'server/routes/**/*.ts',
      'server/api/**/*.ts',
      'server/routes.ts'
    ]);
    
    for (const filePath of apiFiles) {
      const fullPath = path.join(process.cwd(), filePath);
      if (!fs.existsSync(fullPath)) continue;
      
      let content = fs.readFileSync(fullPath, 'utf-8');
      const originalContent = content;
      
      // Remove API field references
      const patterns = [
        // SQL select fields
        new RegExp(`['"]\s*${columnName}\s*['"]\\s*,?`, 'g'),
        // Object destructuring
        new RegExp(`\\s*${columnName}\\s*,`, 'g'),
        new RegExp(`{\\s*${columnName}\\s*}`, 'g'),
        // Insert/update fields
        new RegExp(`\\s*${columnName}\\s*:\\s*[^,}]+,?`, 'g'),
        // Query parameters
        new RegExp(`\\s*eq\\([^,]+\\.${columnName}\\s*,\\s*[^)]+\\)`, 'g'),
        // API response mappings
        new RegExp(`\\s*${columnName}\\s*:\\s*row\\.${columnName}\\s*,?`, 'g'),
      ];
      
      patterns.forEach(pattern => {
        content = content.replace(pattern, '');
      });
      
      if (content !== originalContent) {
        fs.writeFileSync(fullPath, content);
        console.log(`✅ Updated API file: ${filePath}`);
      }
    }
  }

  private async removeFromSearchConfig(tableName: string, columnName: string): Promise<void> {
    console.log(`🔍 Removing ${columnName} from search configurations...`);
    
    const searchFiles = glob.sync([
      'shared/entity-relations.ts',
      'shared/**/*search*.ts',
      'client/src/**/*search*.ts'
    ]);
    
    for (const filePath of searchFiles) {
      const fullPath = path.join(process.cwd(), filePath);
      if (!fs.existsSync(fullPath)) continue;
      
      let content = fs.readFileSync(fullPath, 'utf-8');
      const originalContent = content;
      
      // Remove from searchableFields arrays
      const patterns = [
        new RegExp(`\\s*['"]\s*${columnName}\s*['"]\\s*,?`, 'g'),
        new RegExp(`searchableFields\\s*:\\s*\\[([^\\]]*)'${columnName}'([^\\]]*)\\]`, 'g'),
      ];
      
      patterns.forEach(pattern => {
        content = content.replace(pattern, (match, before, after) => {
          if (before !== undefined && after !== undefined) {
            // Handle searchableFields array
            const cleanBefore = before.replace(/,\s*$/, '');
            const cleanAfter = after.replace(/^\s*,/, '');
            return `searchableFields: [${cleanBefore}${cleanBefore && cleanAfter ? ',' : ''}${cleanAfter}]`;
          }
          return '';
        });
      });
      
      if (content !== originalContent) {
        fs.writeFileSync(fullPath, content);
        console.log(`✅ Updated search config: ${filePath}`);
      }
    }
  }

  private async removeFromEntityRelations(tableName: string, columnName: string): Promise<void> {
    console.log(`🔗 Removing ${columnName} from entity relations...`);
    
    const relationFiles = glob.sync([
      'shared/entity-relations.ts',
      'shared/**/*relations*.ts'
    ]);
    
    for (const filePath of relationFiles) {
      const fullPath = path.join(process.cwd(), filePath);
      if (!fs.existsSync(fullPath)) continue;
      
      let content = fs.readFileSync(fullPath, 'utf-8');
      const originalContent = content;
      
      // Remove column references from entity configurations
      const patterns = [
        new RegExp(`\\s*${columnName}\\s*:\\s*[^,}]+,?\\s*`, 'g'),
        new RegExp(`\\s*['"]\s*${columnName}\s*['"]\\s*,?`, 'g'),
      ];
      
      patterns.forEach(pattern => {
        content = content.replace(pattern, '');
      });
      
      if (content !== originalContent) {
        fs.writeFileSync(fullPath, content);
        console.log(`✅ Updated entity relations: ${filePath}`);
      }
    }
  }

  private async removeFromImportExportConfig(tableName: string, columnName: string): Promise<void> {
    console.log(`📊 Removing ${columnName} from import/export configurations...`);
    
    const configFiles = glob.sync([
      'server/**/*import*.ts',
      'server/**/*export*.ts',
      'client/src/**/*import*.ts',
      'client/src/**/*export*.ts'
    ]);
    
    for (const filePath of configFiles) {
      const fullPath = path.join(process.cwd(), filePath);
      if (!fs.existsSync(fullPath)) continue;
      
      let content = fs.readFileSync(fullPath, 'utf-8');
      const originalContent = content;
      
      // Remove from CSV headers, field mappings, etc.
      const patterns = [
        new RegExp(`\\s*['"]\s*${columnName}\s*['"]\\s*,?`, 'g'),
        new RegExp(`\\s*${columnName}\\s*:\\s*[^,}]+,?`, 'g'),
        new RegExp(`\\s*${columnName}\\s*,`, 'g'),
      ];
      
      patterns.forEach(pattern => {
        content = content.replace(pattern, '');
      });
      
      if (content !== originalContent) {
        fs.writeFileSync(fullPath, content);
        console.log(`✅ Updated import/export config: ${filePath}`);
      }
    }
  }

  private async removeFromDashboards(tableName: string, columnName: string): Promise<void> {
    console.log(`📈 Removing ${columnName} from dashboard configurations...`);
    
    const dashboardFiles = glob.sync([
      'client/src/**/*dashboard*.tsx',
      'client/src/**/*widget*.tsx',
      'client/src/**/*chart*.tsx'
    ]);
    
    for (const filePath of dashboardFiles) {
      const fullPath = path.join(process.cwd(), filePath);
      if (!fs.existsSync(fullPath)) continue;
      
      let content = fs.readFileSync(fullPath, 'utf-8');
      const originalContent = content;
      
      // Remove column references from dashboard configs
      const patterns = [
        new RegExp(`\\s*${columnName}\\s*:\\s*[^,}]+,?`, 'g'),
        new RegExp(`\\s*['"]\s*${columnName}\s*['"]\\s*,?`, 'g'),
        new RegExp(`\\s*{[^}]*${columnName}[^}]*}\\s*,?`, 'g'),
      ];
      
      patterns.forEach(pattern => {
        content = content.replace(pattern, '');
      });
      
      if (content !== originalContent) {
        fs.writeFileSync(fullPath, content);
        console.log(`✅ Updated dashboard file: ${filePath}`);
      }
    }
  }

  private async cleanupRemainingReferences(tableName: string, columnName: string): Promise<void> {
    console.log(`🧹 Cleaning up any remaining references to ${columnName}...`);
    
    // Scan all TypeScript/React files for any remaining references
    const allFiles = glob.sync([
      'server/**/*.ts',
      'client/src/**/*.{ts,tsx}',
      'shared/**/*.ts'
    ]);
    
    let referencesFound = 0;
    
    for (const filePath of allFiles) {
      const fullPath = path.join(process.cwd(), filePath);
      if (!fs.existsSync(fullPath)) continue;
      
      let content = fs.readFileSync(fullPath, 'utf-8');
      const originalContent = content;
      
      // Find and remove any remaining obvious references
      const patterns = [
        // Property access
        new RegExp(`\\.${columnName}\\b`, 'g'),
        // Object properties
        new RegExp(`\\s*${columnName}\\s*:\\s*[^,}\\n]+[,}\\n]?`, 'g'),
        // String literals (be more careful with these)
        new RegExp(`\\s*['"\`]${columnName}['"\`]\\s*,?`, 'g'),
        // Destructuring
        new RegExp(`\\s*{[^}]*\\b${columnName}\\b[^}]*}`, 'g'),
      ];
      
      patterns.forEach(pattern => {
        const matches = content.match(pattern);
        if (matches) {
          referencesFound += matches.length;
          content = content.replace(pattern, '');
        }
      });
      
      if (content !== originalContent) {
        fs.writeFileSync(fullPath, content);
        console.log(`✅ Cleaned up references in: ${filePath}`);
      }
    }
    
    if (referencesFound > 0) {
      console.log(`✅ Cleaned up ${referencesFound} remaining references`);
    } else {
      console.log(`✅ No additional references found`);
    }
  }

  private async createColumnBackup(tableName: string, columnName: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(process.cwd(), 'backups', 'columns');
    const backupPath = path.join(backupDir, `${tableName}_${columnName}_${timestamp}.json`);
    
    // Ensure backup directory exists
    fs.mkdirSync(backupDir, { recursive: true });
    
    // Create backup data
    const backupData = {
      tableName,
      columnName,
      timestamp,
      schemaDefinition: await this.extractColumnSchema(tableName, columnName),
      usageLocations: await this.analyzeColumnUsage(tableName, columnName),
      // Add any sample data if needed
      sampleData: await this.getSampleColumnData(tableName, columnName)
    };
    
    fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
    
    return backupPath;
  }

  private async extractColumnSchema(tableName: string, columnName: string): Promise<any> {
    const tableSchema = this.schemaTablesMap.get(tableName);
    if (tableSchema && tableSchema._.columns) {
      return tableSchema._.columns[columnName];
    }
    return null;
  }

  private async getSampleColumnData(tableName: string, columnName: string): Promise<any[]> {
    try {
      // This would require actual database query, implement if needed
      return [];
    } catch (error) {
      return [];
    }
  }

  private async removeFromForms(tableName: string, columnName: string): Promise<void> {
    console.log(`🔍 Removing ${columnName} from forms...`);
    
    const sourceFiles = this.project.getSourceFiles();
    
    for (const sourceFile of sourceFiles) {
      const filePath = sourceFile.getFilePath();
      const relativePath = path.relative(process.cwd(), filePath);
      
      // Only process React component files
      if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) {
        continue;
      }

      let modified = false;
      let content = sourceFile.getFullText();
      
      // Remove form field patterns
      const patterns = [
        new RegExp(`\\s*register\\s*\\(\\s*["']${columnName}["'][^)]*\\)\\s*[,;]?`, 'g'),
        new RegExp(`\\s*<Input[^>]*name\\s*=\\s*["']${columnName}["'][^>]*>`, 'gi'),
        new RegExp(`\\s*<FormField[^>]*name\\s*=\\s*["']${columnName}["'][^>]*>.*?</FormField>`, 'gis'),
        new RegExp(`\\s*<Controller[^>]*name\\s*=\\s*["']${columnName}["'][^>]*>.*?</Controller>`, 'gis'),
        new RegExp(`\\s*["']${columnName}["']\\s*:\\s*{[^}]*},?`, 'g'), // Schema definitions
        new RegExp(`\\s*${columnName}\\s*:\\s*[^,}]+[,}]`, 'g') // Object properties
      ];
      
      for (const pattern of patterns) {
        const newContent = content.replace(pattern, '');
        if (newContent !== content) {
          content = newContent;
          modified = true;
        }
      }
      
      if (modified) {
        sourceFile.replaceWithText(content);
        await sourceFile.save();
        console.log(`✅ Updated form in: ${relativePath}`);
      }
    }
  }

  private async logColumnDeletion(
    tableName: string, 
    columnName: string, 
    userId: string, 
    backupPath: string, 
    reason?: string,
    changes: string[]
  ): Promise<void> {
    const historyPath = path.join(process.cwd(), 'deleted_columns.json');
    
    const deletion: ColumnDeletion = {
      id: `${tableName}_${columnName}_${Date.now()}`,
      tableName,
      columnName,
      deletedAt: new Date().toISOString(),
      deletedBy: userId,
      backupPath,
      reason,
      canRollback: true,
      changes // Add the comprehensive list of changes made
    };
    
    let history: ColumnDeletion[] = [];
    try {
      if (fs.existsSync(historyPath)) {
        const content = fs.readFileSync(historyPath, 'utf-8');
        history = JSON.parse(content);
      }
    } catch (error) {
      console.warn('Could not load existing deletion history');
    }
    
    history.push(deletion);
    fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
  }

  private async getCachedAnalysis(): Promise<CodebaseAnalysisResult | null> {
    try {
      if (!fs.existsSync(this.cacheFile)) {
        console.log('📂 No cache file found');
        return null;
      }

      const cacheContent = fs.readFileSync(this.cacheFile, 'utf-8');
      const cache: AnalysisCache = JSON.parse(cacheContent);

      // Check if cache is too old
      const now = Date.now();
      if (now - cache.timestamp > this.maxCacheAge) {
        console.log('⏰ Cache is too old, will regenerate');
        return null;
      }

      // Check if files have changed
      const currentHash = await this.calculateCodebaseHash();
      if (currentHash !== cache.hash) {
        console.log('🔄 Files have changed, cache is invalid');
        return null;
      }

      console.log('✅ Cache is valid and up-to-date');
      return cache.result;
    } catch (error) {
      console.warn('⚠️ Error reading cache:', error);
      return null;
    }
  }

  private async cacheAnalysis(result: CodebaseAnalysisResult): Promise<void> {
    try {
      const hash = await this.calculateCodebaseHash();
      const cache: AnalysisCache = {
        hash,
        timestamp: Date.now(),
        result
      };

      fs.writeFileSync(this.cacheFile, JSON.stringify(cache, null, 2));
      console.log('💾 Analysis result cached successfully');
    } catch (error) {
      console.warn('⚠️ Error writing cache:', error);
    }
  }

  private async calculateCodebaseHash(): Promise<string> {
    const patterns = [
      'server/**/*.ts',
      'client/src/**/*.{ts,tsx}',
      'shared/**/*.ts',
      '!node_modules/**',
      '!**/dist/**',
      '!**/*.d.ts'
    ];

    try {
      const files = await fastGlob(patterns, { 
        cwd: process.cwd(),
        absolute: true 
      });

      const fileData: FileChangeDetection = {
        files: files.sort(),
        hash: '',
        lastModified: 0
      };

      // Calculate combined hash of all file modification times and sizes
      const hashInput: string[] = [];
      
      for (const file of fileData.files) {
        try {
          const stats = fs.statSync(file);
          const mtime = stats.mtime.getTime();
          const size = stats.size;
          
          if (mtime > fileData.lastModified) {
            fileData.lastModified = mtime;
          }
          
          hashInput.push(`${path.relative(process.cwd(), file)}:${mtime}:${size}`);
        } catch (error) {
          // File might have been deleted, skip it
          continue;
        }
      }

      // Include schema table names in hash to detect schema changes
      const schemaInfo = Array.from(this.schemaTablesMap.keys()).sort().join(',');
      hashInput.push(`schema:${schemaInfo}`);

      fileData.hash = crypto
        .createHash('sha256')
        .update(hashInput.join('\n'))
        .digest('hex');

      console.log(`📊 Calculated hash for ${files.length} files: ${fileData.hash.substring(0, 12)}...`);
      
      return fileData.hash;
    } catch (error) {
      console.warn('⚠️ Error calculating codebase hash:', error);
      // Return a timestamp-based hash as fallback
      return crypto.createHash('sha256').update(Date.now().toString()).digest('hex');
    }
  }

  async invalidateCache(): Promise<void> {
    try {
      if (fs.existsSync(this.cacheFile)) {
        fs.unlinkSync(this.cacheFile);
        console.log('🗑️ Cache invalidated successfully');
      }
    } catch (error) {
      console.warn('⚠️ Error invalidating cache:', error);
    }
  }

  async getCacheInfo(): Promise<{ exists: boolean; age?: number; size?: number; hash?: string }> {
    try {
      if (!fs.existsSync(this.cacheFile)) {
        return { exists: false };
      }

      const stats = fs.statSync(this.cacheFile);
      const cacheContent = fs.readFileSync(this.cacheFile, 'utf-8');
      const cache: AnalysisCache = JSON.parse(cacheContent);
      
      return {
        exists: true,
        age: Date.now() - cache.timestamp,
        size: stats.size,
        hash: cache.hash.substring(0, 12)
      };
    } catch (error) {
      return { exists: false };
    }
  }
}

export const codebaseAnalyzer = new CodebaseAnalyzer(); 