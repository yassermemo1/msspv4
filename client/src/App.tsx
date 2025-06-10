import React from "react";
import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/hooks/use-auth";
import { ThemeProvider } from "@/contexts/theme-context";
import { CurrencyProvider } from "@/contexts/currency-context";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthGuard } from "@/components/auth/auth-guard";
import { PageGuard } from "@/components/auth/page-guard";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { createQueryClient } from "@/lib/queryClient";
import { GlobalErrorProvider, useGlobalError } from "@/hooks/use-global-error";
// import { SimpleDebugButton } from "@/components/debug/simple-debug-button";

// Page imports
import LoginPage from "@/pages/login-page";
import RegisterPage from "@/pages/register-page";
import DashboardPage from "@/pages/dashboard-page";
import ClientsPage from "@/pages/clients-page";
import ClientDetailPage from "@/pages/client-detail-page";
import ContractsPage from "@/pages/contracts-page";
import ContractDetailPage from "@/pages/contract-detail-page";
import ServicesPage from "@/pages/services-page";
import AssetsPage from "@/pages/assets-page";
import LicensePoolDetailPage from "@/pages/license-pool-detail-page";
import TeamPage from "@/pages/team-page";
import FinancialPage from "@/pages/financial-page";
import DocumentsPage from "@/pages/documents-page";
import SettingsPage from "@/pages/settings-page";
import ReportsPage from "@/pages/reports-page";

import ComprehensiveBulkImportPage from "@/pages/comprehensive-bulk-import";

import FieldVisibilityManagerPage from "@/pages/field-visibility-manager";
import ExternalSystemsPage from "@/pages/external-systems-page";
import DashboardsPage from "@/pages/dashboards-page";
import ServiceScopesPage from "@/pages/service-scopes-page";
import ProposalsPage from "@/pages/proposals-page";
import IntegrationEnginePage from "@/pages/integration-engine-page";
import EnhancedIntegrationEngine from "@/pages/enhanced-integration-engine";
import TestDashboardPage from "@/pages/test-dashboard-page";
import RbacManagementPage from "@/pages/rbac-management-page";
import UserManagementPage from "@/pages/admin/user-management-page";
import AuditManagementPage from "@/pages/admin/audit-management-page";
import NavigationManagerPage from "@/pages/admin/navigation-manager-page";
import EntityNavigationDemo from "@/pages/entity-navigation-demo";
import { ServiceEditPage } from "@/components/admin/services/service-edit-page";
import CreateSafPage from "@/pages/create-saf-page";
import CreateCocPage from "@/pages/create-coc-page";
import LicensePoolsPage from "@/pages/license-pools-page";
import AdminDashboardPage from "@/pages/admin-dashboard-page";
import ProfilePage from "@/pages/profile-page";
import TestErrorPage from "@/pages/test-error-page";
import NotFound from "@/pages/not-found";
import ClientOnboardingPage from "@/pages/client-onboarding-page";
import TestingPage from "@/pages/testing-page";

// Component that provides the query client with error handling
function QueryClientWrapper({ children }: { children: React.ReactNode }) {
  const { captureError } = useGlobalError();
  const [queryClient] = React.useState(() => createQueryClient(captureError));
  
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <GlobalErrorProvider>
        <QueryClientWrapper>
          <AuthProvider>
            <ThemeProvider defaultTheme="light" storageKey="mssp-ui-theme">
              <CurrencyProvider>
                <TooltipProvider>
                <div className="min-h-screen bg-background">
                <Switch>
                  <Route path="/login" component={LoginPage} />
                  <Route path="/register" component={RegisterPage} />
                  <Route path="/" component={() => (
                    <AuthGuard>
                      <PageGuard pageUrl="/">
                        <DashboardPage />
                      </PageGuard>
                    </AuthGuard>
                  )} />
                  <Route path="/clients" component={() => (
                    <AuthGuard>
                      <PageGuard pageUrl="/clients">
                        <ClientsPage />
                      </PageGuard>
                    </AuthGuard>
                  )} />
                  <Route path="/clients/:id" component={() => (
                    <AuthGuard>
                      <PageGuard pageUrl="/clients">
                        <ClientDetailPage />
                      </PageGuard>
                    </AuthGuard>
                  )} />
                  <Route path="/onboarding" component={() => (
                    <AuthGuard>
                      <PageGuard pageUrl="/onboarding">
                        <ClientOnboardingPage />
                      </PageGuard>
                    </AuthGuard>
                  )} />
                  <Route path="/contracts" component={() => (
                    <AuthGuard>
                      <PageGuard pageUrl="/contracts">
                        <ContractsPage />
                      </PageGuard>
                    </AuthGuard>
                  )} />
                  <Route path="/contracts/:id" component={() => (
                    <AuthGuard>
                      <PageGuard pageUrl="/contracts">
                        <ContractDetailPage />
                      </PageGuard>
                    </AuthGuard>
                  )} />
                  <Route path="/services" component={() => (
                    <AuthGuard>
                      <PageGuard pageUrl="/services">
                        <ServicesPage />
                      </PageGuard>
                    </AuthGuard>
                  )} />
                  <Route path="/services/:serviceId/edit" component={() => (
                    <AuthGuard>
                      <PageGuard pageUrl="/services">
                        <ServiceEditPage />
                      </PageGuard>
                    </AuthGuard>
                  )} />
                  <Route path="/service-scopes" component={() => (
                    <AuthGuard>
                      <PageGuard pageUrl="/service-scopes">
                        <ServiceScopesPage />
                      </PageGuard>
                    </AuthGuard>
                  )} />
                  <Route path="/proposals" component={() => (
                    <AuthGuard>
                      <PageGuard pageUrl="/proposals">
                        <ProposalsPage />
                      </PageGuard>
                    </AuthGuard>
                  )} />
                  <Route path="/assets" component={() => (
                    <AuthGuard>
                      <PageGuard pageUrl="/assets">
                        <AssetsPage />
                      </PageGuard>
                    </AuthGuard>
                  )} />
                  <Route path="/license-pools" component={() => (
                    <AuthGuard>
                      <PageGuard pageUrl="/assets">
                        <LicensePoolsPage />
                      </PageGuard>
                    </AuthGuard>
                  )} />
                  <Route path="/license-pools/:id" component={() => (
                    <AuthGuard>
                      <PageGuard pageUrl="/assets">
                        <LicensePoolDetailPage />
                      </PageGuard>
                    </AuthGuard>
                  )} />
                  <Route path="/team" component={() => (
                    <AuthGuard>
                      <PageGuard pageUrl="/team">
                        <TeamPage />
                      </PageGuard>
                    </AuthGuard>
                  )} />
                  <Route path="/financial" component={() => (
                    <AuthGuard>
                      <PageGuard pageUrl="/financial">
                        <FinancialPage />
                      </PageGuard>
                    </AuthGuard>
                  )} />
                  <Route path="/documents" component={() => (
                    <AuthGuard>
                      <PageGuard pageUrl="/documents">
                        <DocumentsPage />
                      </PageGuard>
                    </AuthGuard>
                  )} />
                  <Route path="/dashboards" component={() => (
                    <AuthGuard>
                      <PageGuard pageUrl="/dashboards">
                        <DashboardsPage />
                      </PageGuard>
                    </AuthGuard>
                  )} />
                  <Route path="/dashboards/:dashboardId" component={() => (
                    <AuthGuard>
                      <PageGuard pageUrl="/dashboards">
                        <DashboardPage />
                      </PageGuard>
                    </AuthGuard>
                  )} />
                  <Route path="/external-systems" component={() => (
                    <AuthGuard>
                      <PageGuard pageUrl="/external-systems">
                        <ExternalSystemsPage />
                      </PageGuard>
                    </AuthGuard>
                  )} />
                  <Route path="/integration-engine" component={() => (
                    <AuthGuard>
                      <PageGuard pageUrl="/integration-engine">
                        <IntegrationEnginePage />
                      </PageGuard>
                    </AuthGuard>
                  )} />
                  <Route path="/enhanced-integration-engine" component={() => (
                    <AuthGuard>
                      <PageGuard pageUrl="/enhanced-integration-engine">
                        <EnhancedIntegrationEngine />
                      </PageGuard>
                    </AuthGuard>
                  )} />

                  <Route path="/comprehensive-bulk-import" component={() => (
                    <AuthGuard>
                      <PageGuard pageUrl="/comprehensive-bulk-import">
                        <ComprehensiveBulkImportPage />
                      </PageGuard>
                    </AuthGuard>
                  )} />
                  <Route path="/reports" component={() => (
                    <AuthGuard>
                      <PageGuard pageUrl="/reports">
                        <ReportsPage />
                      </PageGuard>
                    </AuthGuard>
                  )} />

                  <Route path="/field-visibility" component={() => (
                    <AuthGuard>
                      <PageGuard pageUrl="/field-visibility">
                        <FieldVisibilityManagerPage />
                      </PageGuard>
                    </AuthGuard>
                  )} />
                  <Route path="/settings" component={() => (
                    <AuthGuard>
                      <PageGuard pageUrl="/settings">
                        <SettingsPage />
                      </PageGuard>
                    </AuthGuard>
                  )} />
                  <Route path="/admin" component={() => (
                    <AuthGuard>
                      <PageGuard pageUrl="/admin">
                        <AdminDashboardPage />
                      </PageGuard>
                    </AuthGuard>
                  )} />
                  <Route path="/profile" component={() => (
                    <AuthGuard>
                      <PageGuard pageUrl="/profile">
                        <ProfilePage />
                      </PageGuard>
                    </AuthGuard>
                  )} />
                  <Route path="/admin/rbac" component={() => (
                    <AuthGuard>
                      <PageGuard pageUrl="/admin/rbac">
                        <RbacManagementPage />
                      </PageGuard>
                    </AuthGuard>
                  )} />
                  <Route path="/admin/users" component={() => (
                    <AuthGuard>
                      <PageGuard pageUrl="/admin/users">
                        <UserManagementPage />
                      </PageGuard>
                    </AuthGuard>
                  )} />
                  <Route path="/admin/audit" component={() => (
                    <AuthGuard>
                      <PageGuard pageUrl="/admin/audit">
                        <AuditManagementPage />
                      </PageGuard>
                    </AuthGuard>
                  )} />
                  <Route path="/admin/navigation" component={() => (
                    <AuthGuard>
                      <PageGuard pageUrl="/admin/navigation">
                        <NavigationManagerPage />
                      </PageGuard>
                    </AuthGuard>
                  )} />
                  <Route path="/test-dashboard" component={() => (
                    <AuthGuard>
                      <PageGuard pageUrl="/test-dashboard">
                        <TestDashboardPage />
                      </PageGuard>
                    </AuthGuard>
                  )} />
                  <Route path="/testing" component={() => (
                    <AuthGuard>
                      <PageGuard pageUrl="/testing">
                        <TestingPage />
                      </PageGuard>
                    </AuthGuard>
                  )} />
                  <Route path="/entity-navigation-demo" component={() => (
                    <AuthGuard>
                      <PageGuard pageUrl="/entity-navigation-demo">
                        <EntityNavigationDemo />
                      </PageGuard>
                    </AuthGuard>
                  )} />
                  <Route path="/create-saf" component={() => (
                    <AuthGuard>
                      <PageGuard pageUrl="/create-saf">
                        <CreateSafPage />
                      </PageGuard>
                    </AuthGuard>
                  )} />
                  <Route path="/create-coc" component={() => (
                    <AuthGuard>
                      <PageGuard pageUrl="/create-coc">
                        <CreateCocPage />
                      </PageGuard>
                    </AuthGuard>
                  )} />
                  <Route path="/test-error" component={() => (
                    <AuthGuard>
                      <TestErrorPage />
                    </AuthGuard>
                  )} />
                  
                  {/* 404 Not Found - This should be the last route */}
                  <Route component={NotFound} />
                </Switch>
              </div>
              <Toaster />
              <SonnerToaster />
              {/* Debug button temporarily disabled to prevent blocking toast messages */}
              {/* To re-enable debug functionality, uncomment the line below: */}
              {/* <SimpleDebugButton /> */}
            </TooltipProvider>
          </CurrencyProvider>
        </ThemeProvider>
      </AuthProvider>
        </QueryClientWrapper>
      </GlobalErrorProvider>
    </ErrorBoundary>
  );
}

export default App;
