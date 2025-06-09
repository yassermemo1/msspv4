import React from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import { EnhancedIntegrationEngine } from '@/components/integration-engine/enhanced-integration-engine';

export default function IntegrationEnginePage() {
  return (
    <AppLayout>
      <EnhancedIntegrationEngine />
    </AppLayout>
  );
}
