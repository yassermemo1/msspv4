import React from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Settings2 } from "lucide-react";

export interface ColumnDefinition {
  key: string;
  label: string;
  defaultVisible: boolean;
  mandatory?: boolean; // Cannot be hidden
}

export interface ColumnVisibilityProps {
  columns: ColumnDefinition[];
  visibleColumns: Record<string, boolean>;
  onVisibilityChange: (columnKey: string, visible: boolean) => void;
  onReset?: () => void;
}

export function ColumnVisibility({ 
  columns, 
  visibleColumns, 
  onVisibilityChange, 
  onReset 
}: ColumnVisibilityProps) {
  const handleToggle = (columnKey: string, checked: boolean) => {
    onVisibilityChange(columnKey, checked);
  };

  const handleReset = () => {
    if (onReset) {
      onReset();
    }
  };

  const visibleCount = Object.values(visibleColumns).filter(Boolean).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 className="h-4 w-4 mr-2" />
          Columns ({visibleCount})
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Show/Hide Columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <div className="px-2 py-1 space-y-2 max-h-64 overflow-y-auto">
          {columns.map((column) => {
            const isVisible = visibleColumns[column.key] ?? column.defaultVisible;
            const isMandatory = column.mandatory;
            
            return (
              <div key={column.key} className="flex items-center space-x-2">
                <Checkbox
                  id={`column-${column.key}`}
                  checked={isVisible}
                  onCheckedChange={(checked) => handleToggle(column.key, checked as boolean)}
                  disabled={isMandatory}
                />
                <Label 
                  htmlFor={`column-${column.key}`}
                  className={`text-sm flex-1 ${isMandatory ? 'text-muted-foreground' : ''}`}
                >
                  {column.label}
                  {isMandatory && <span className="ml-1 text-xs">(required)</span>}
                </Label>
              </div>
            );
          })}
        </div>
        
        {onReset && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-1">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleReset}
                className="w-full text-xs"
              >
                Reset to Default
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 