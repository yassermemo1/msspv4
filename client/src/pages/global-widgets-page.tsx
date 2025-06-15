import React from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import { GlobalWidgetManager } from '@/components/widgets/global-widget-manager';

export default function GlobalWidgetsPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Global Widgets</h1>
          <p className="text-muted-foreground">
            Create and manage widgets that can be deployed globally to all client pages
          </p>
        </div>
        
        <GlobalWidgetManager />
      </div>
    </AppLayout>
  );
} 