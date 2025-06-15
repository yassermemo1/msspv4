import React from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import { GlobalWidgetManager } from '@/components/widgets/global-widget-manager';

export default function WidgetManagerPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Widget Manager</h1>
          <p className="text-muted-foreground">
            Advanced widget configuration and management for the platform
          </p>
        </div>
        
        <GlobalWidgetManager />
      </div>
    </AppLayout>
  );
} 