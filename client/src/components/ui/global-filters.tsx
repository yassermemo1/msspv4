import React, { useState } from 'react';
import { Filter, X, Calendar, DollarSign, Tag, Building, Users, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/date-picker';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface FilterOption {
  key: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'dateRange' | 'checkbox' | 'multiselect' | 'number';
  options?: { value: string; label: string }[];
  placeholder?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface FilterValue {
  [key: string]: any;
}

interface GlobalFiltersProps {
  filters: FilterOption[];
  values: FilterValue;
  onChange: (values: FilterValue) => void;
  onClear: () => void;
  className?: string;
  showCount?: boolean;
  compact?: boolean;
}

export function GlobalFilters({
  filters,
  values,
  onChange,
  onClear,
  className,
  showCount = true,
  compact = false
}: GlobalFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const activeFiltersCount = Object.keys(values).filter(key => {
    const value = values[key];
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'string') return value.trim() !== '';
    if (typeof value === 'number') return value !== 0;
    if (value instanceof Date) return true;
    return value !== null && value !== undefined && value !== '';
  }).length;

  const handleFilterChange = (key: string, value: any) => {
    const newValues = { ...values };
    
    if (value === '' || value === null || value === undefined || 
        (Array.isArray(value) && value.length === 0)) {
      delete newValues[key];
    } else {
      newValues[key] = value;
    }
    
    onChange(newValues);
  };

  const handleClearAll = () => {
    onClear();
    setIsOpen(false);
  };

  const renderFilterInput = (filter: FilterOption) => {
    const value = values[filter.key];
    const Icon = filter.icon;

    switch (filter.type) {
      case 'text':
        return (
          <div className="space-y-2">
            <Label htmlFor={filter.key}>{filter.label}</Label>
            <div className="relative">
              {Icon && <Icon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />}
              <Input
                id={filter.key}
                placeholder={filter.placeholder}
                value={value || ''}
                onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                className={Icon ? 'pl-10' : ''}
              />
            </div>
          </div>
        );

      case 'number':
        return (
          <div className="space-y-2">
            <Label htmlFor={filter.key}>{filter.label}</Label>
            <div className="relative">
              {Icon && <Icon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />}
              <Input
                id={filter.key}
                type="number"
                placeholder={filter.placeholder}
                value={value || ''}
                onChange={(e) => handleFilterChange(filter.key, parseFloat(e.target.value) || '')}
                className={Icon ? 'pl-10' : ''}
              />
            </div>
          </div>
        );

      case 'select':
        return (
          <div className="space-y-2">
            <Label>{filter.label}</Label>
            <Select
              value={value || ''}
              onValueChange={(val) => handleFilterChange(filter.key, val)}
            >
              <SelectTrigger>
                <SelectValue placeholder={filter.placeholder || `Select ${filter.label}`} />
              </SelectTrigger>
              <SelectContent>
                {filter.options?.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'multiselect':
        const selectedValues = value || [];
        return (
          <div className="space-y-2">
            <Label>{filter.label}</Label>
            <div className="space-y-2">
              {filter.options?.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${filter.key}-${option.value}`}
                    checked={selectedValues.includes(option.value)}
                    onCheckedChange={(checked) => {
                      const newValues = checked
                        ? [...selectedValues, option.value]
                        : selectedValues.filter((v: string) => v !== option.value);
                      handleFilterChange(filter.key, newValues);
                    }}
                  />
                  <Label htmlFor={`${filter.key}-${option.value}`} className="text-sm">
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        );

      case 'date':
        return (
          <div className="space-y-2">
            <Label>{filter.label}</Label>
            <DatePicker
              date={value}
              onDateChange={(date) => handleFilterChange(filter.key, date)}
              placeholder={filter.placeholder}
            />
          </div>
        );

      case 'dateRange':
        const dateRange = value || {};
        return (
          <div className="space-y-2">
            <Label>{filter.label}</Label>
            <div className="grid grid-cols-2 gap-2">
              <DatePicker
                date={dateRange.from}
                onDateChange={(date) => handleFilterChange(filter.key, { ...dateRange, from: date })}
                placeholder="From date"
              />
              <DatePicker
                date={dateRange.to}
                onDateChange={(date) => handleFilterChange(filter.key, { ...dateRange, to: date })}
                placeholder="To date"
              />
            </div>
          </div>
        );

      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={filter.key}
              checked={value || false}
              onCheckedChange={(checked) => handleFilterChange(filter.key, checked)}
            />
            <Label htmlFor={filter.key}>{filter.label}</Label>
          </div>
        );

      default:
        return null;
    }
  };

  const renderActiveFilters = () => {
    const activeFilters = Object.entries(values).filter(([_, value]) => {
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === 'string') return value.trim() !== '';
      if (typeof value === 'number') return value !== 0;
      if (value instanceof Date) return true;
      return value !== null && value !== undefined && value !== '';
    });

    if (activeFilters.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {activeFilters.map(([key, value]) => {
          const filter = filters.find(f => f.key === key);
          if (!filter) return null;

          let displayValue = value;
          if (Array.isArray(value)) {
            displayValue = value.join(', ');
          } else if (value instanceof Date) {
            displayValue = value.toLocaleDateString();
          } else if (typeof value === 'object' && value.from && value.to) {
            displayValue = `${value.from.toLocaleDateString()} - ${value.to.toLocaleDateString()}`;
          }

          return (
            <Badge key={key} variant="secondary" className="flex items-center gap-1">
              <span className="text-xs">{filter.label}:</span>
              <span className="text-xs font-medium">{String(displayValue)}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => handleFilterChange(key, '')}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          );
        })}
        {activeFilters.length > 1 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            className="h-6 px-2 text-xs"
          >
            Clear all
          </Button>
        )}
      </div>
    );
  };

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8">
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {showCount && activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 px-1 text-xs">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="start">
            <Card className="border-0 shadow-none">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Filters</CardTitle>
                  {activeFiltersCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={handleClearAll}>
                      Clear all
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {filters.map((filter) => (
                  <div key={filter.key}>
                    {renderFilterInput(filter)}
                  </div>
                ))}
              </CardContent>
            </Card>
          </PopoverContent>
        </Popover>
        {renderActiveFilters()}
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filters
              {showCount && activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {activeFiltersCount} active
                </Badge>
              )}
            </CardTitle>
            {activeFiltersCount > 0 && (
              <Button variant="ghost" size="sm" onClick={handleClearAll}>
                Clear all
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filters.map((filter) => (
              <div key={filter.key}>
                {renderFilterInput(filter)}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      {renderActiveFilters()}
    </div>
  );
} 