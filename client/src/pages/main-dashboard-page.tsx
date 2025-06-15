import React from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import EnhancedDashboard from '@/components/dashboard/enhanced-dashboard';

export default function MainDashboardPage() {
  return (
    <AppLayout title="Executive Dashboard" subtitle="Real-time insights and analytics">
      <div className="p-6">
        <EnhancedDashboard />
      </div>
    </AppLayout>
  );
} 