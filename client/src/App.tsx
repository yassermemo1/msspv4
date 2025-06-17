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
import MainDashboardPage from "@/pages/main-dashboard-page";
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
import PluginsPage from "@/pages/plugins-page";

import ComprehensiveBulkImportPage from "@/pages/comprehensive-bulk-import";

import FieldVisibilityManagerPage from "@/pages/field-visibility-manager";

import ServiceScopesPage from "@/pages/service-scopes-page";
import ProposalsPage from "@/pages/proposals-page";

import WidgetManagerPage from "@/pages/widget-manager-page";
import GlobalWidgetsPage from "@/pages/global-widgets-page";
import HomePage from "@/pages/home-page";
import EntityNavigationDemo from "@/pages/entity-navigation-demo";
import CreateSafPage from "@/pages/create-saf-page";

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
                        <MainDashboardPage />
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
                        <HomePage />
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
                  {/* Service edit route removed - use services page instead */}
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
                  {/* License pool management integrated into assets page */}
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
                  {/* Admin and testing routes removed - use settings page for admin functions */}
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
                  {/* Additional routes removed - functionality consolidated */}
                  <Route path="/global-widgets" component={() => (
                    <AuthGuard>
                      <PageGuard pageUrl="/global-widgets">
                        <GlobalWidgetsPage />
                      </PageGuard>
                    </AuthGuard>
                  )} />
                  <Route path="/widget-manager" component={() => (
                    <AuthGuard>
                      <PageGuard pageUrl="/widget-manager">
                        <WidgetManagerPage />
                      </PageGuard>
                    </AuthGuard>
                  )} />
                  <Route path="/plugins" component={() => (
                    <AuthGuard>
                      <PageGuard pageUrl="/plugins">
                        <PluginsPage />
                      </PageGuard>
                    </AuthGuard>
                  )} />
                  
                  {/* 404 Not Found - Redirect to main dashboard */}
                  <Route path="*" component={() => (
                    <AuthGuard>
                      <MainDashboardPage />
                    </AuthGuard>
                  )} />
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
