import React from 'react';
import { AppLayout } from '../components/layout/app-layout';
import { DashboardCrudTest } from '../components/testing/dashboard-crud-test';

export default function TestingPage() {
  return (
    <AppLayout
      title="Testing Dashboard"
      subtitle="Test various features and functionality"
    >
      <div className="max-w-7xl mx-auto space-y-6">
        <DashboardCrudTest />
      </div>
    </AppLayout>
  );
} 