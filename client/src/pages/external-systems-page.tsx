import React from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import { ExternalSystemsManagement } from '@/components/external-systems/external-systems-management';

export default function ExternalSystemsPage() {
  return (
    <AppLayout 
      title="External Systems" 
      subtitle="Manage external API integrations for data aggregation"
    >
      <ExternalSystemsManagement />
    </AppLayout>
  );
} 