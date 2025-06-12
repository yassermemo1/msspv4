import React from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import { EnhancedIntegrationEngine } from '@/unused-scripts/integration-engine/enhanced-integration-engine';

export default function IntegrationEnginePage() {
  return (
    <AppLayout>
      <EnhancedIntegrationEngine />
    </AppLayout>
  );
}
