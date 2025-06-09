import React from 'react';
import { ServiceTemplateBuilder } from '@/components/admin/services/service-template-builder';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Settings, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';

export function ServiceTemplateDemoPage() {
  const [location, setLocation] = useLocation();

  const handleTemplateSuccess = (template: any) => {
    console.log('Template saved successfully:', template);
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={() => setLocation('/admin')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Admin
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Service Template Builder Demo</h1>
            <p className="text-gray-500">
              Test the dynamic service scope definition template builder
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline">Demo Mode</Badge>
          <Badge variant="secondary">Service ID: 11</Badge>
        </div>
      </div>

      {/* Demo Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Demo Instructions
          </CardTitle>
          <CardDescription>
            This demo uses the "Managed EDR Service" (ID: 11) that we created earlier. 
            You can test all the template builder functionality here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p><strong>What you can test:</strong></p>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>Add new field definitions with different types (text, number, select, boolean, etc.)</li>
              <li>Configure field properties like labels, help text, validation rules</li>
              <li>Manage select options for dropdown and checkbox fields</li>
              <li>Reorder fields using the up/down arrows</li>
              <li>Edit existing field definitions</li>
              <li>Remove fields (with confirmation)</li>
              <li>Preview how the form will look to end users</li>
              <li>Save the complete template to the backend</li>
            </ul>
            <p className="mt-4 text-blue-600">
              <strong>Example use case:</strong> Configure a "Managed EDR" service template with fields like 
              "Number of Endpoints" (number), "EDR Platform" (dropdown), "Log Retention Period" (text), etc.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* The actual ServiceTemplateBuilder component */}
      <ServiceTemplateBuilder
        serviceId={11} // Using the service we created earlier
        onSave={handleTemplateSuccess}
      />
    </div>
  );
} 