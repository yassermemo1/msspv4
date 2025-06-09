import { AppLayout } from '@/components/layout/app-layout';
import { DashboardCrudTest } from '@/components/testing/dashboard-crud-test';

export default function TestDashboardPage() {
  return (
    <AppLayout title="Dashboard Testing" subtitle="Comprehensive testing suite for dashboard and CRUD operations">
      <div className="p-6">
        <DashboardCrudTest />
      </div>
    </AppLayout>
  );
} 