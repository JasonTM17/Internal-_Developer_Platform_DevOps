import { CssBaseline, Box, CircularProgress, Typography } from '@mui/material';
import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';

import { AuthProvider, useAuth } from './auth/AuthProvider';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { CommandPalette } from './components/CommandPalette';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AppLayout } from './layout/AppLayout';
import { ThemeContextProvider } from './theme/ThemeContext';

import './index.css';

// Lazy-loaded plugin pages for code splitting
const DashboardPage = lazy(() => import('./plugins/dashboard/DashboardPage'));
const CatalogPage = lazy(() => import('./plugins/catalog/CatalogPage'));
const DeploymentPage = lazy(() => import('./plugins/deployments/DeploymentPage'));
const EnvironmentPage = lazy(() => import('./plugins/environments/EnvironmentPage'));
const HealthDashboard = lazy(() => import('./plugins/health/HealthDashboard'));
const CostDashboard = lazy(() => import('./plugins/cost/CostDashboard'));
const SettingsPage = lazy(() => import('./plugins/settings/SettingsPage'));
const ServiceDetailPage = lazy(() => import('./plugins/catalog/ServiceDetailPage'));
const DeploymentDetailPage = lazy(() => import('./plugins/deployments/DeploymentDetailPage'));
const AuditPage = lazy(() => import('./plugins/audit/AuditPage'));
const IncidentsPage = lazy(() => import('./plugins/incidents/IncidentsPage'));
const NotFoundPage = lazy(() => import('./plugins/NotFoundPage'));
const LoginPage = lazy(() => import('./auth/LoginPage'));

// Loading fallback component
const PageLoader: React.FC = () => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '60vh',
      gap: 2,
    }}
    role="status"
    aria-label="Loading page"
  >
    <CircularProgress size={32} thickness={4} sx={{ color: '#6C63FF' }} />
    <Typography variant="caption" color="text.secondary">
      Loading...
    </Typography>
  </Box>
);

// Navigation configuration for the sidebar
export const navigationConfig = [
  {
    group: 'Overview',
    items: [{ path: '/dashboard', label: 'Dashboard', icon: 'dashboard' }],
  },
  {
    group: 'Platform',
    items: [
      { path: '/catalog', label: 'Service Catalog', icon: 'apps' },
      { path: '/deployments', label: 'Deployments', icon: 'rocket_launch' },
      { path: '/environments', label: 'Environments', icon: 'cloud' },
    ],
  },
  {
    group: 'Observability',
    items: [
      { path: '/health', label: 'Health', icon: 'monitor_heart' },
      { path: '/cost', label: 'Cost Analysis', icon: 'attach_money' },
    ],
  },
];

/** Inner app routes — separated to access auth context */
const AppRoutes: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  // Show login page if not authenticated OR if explicitly on /login path
  if (!isAuthenticated || location.pathname === '/login') {
    return (
      <Suspense fallback={<PageLoader />}>
        <LoginPage />
      </Suspense>
    );
  }

  return (
    <AppLayout navigation={navigationConfig}>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Redirect root to dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Dashboard */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          {/* Service Catalog */}
          <Route
            path="/catalog"
            element={
              <ProtectedRoute>
                <CatalogPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/catalog/services/:serviceId"
            element={
              <ProtectedRoute>
                <ServiceDetailPage />
              </ProtectedRoute>
            }
          />

          {/* Deployments */}
          <Route
            path="/deployments"
            element={
              <ProtectedRoute>
                <DeploymentPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/deployments/:deploymentId"
            element={
              <ProtectedRoute>
                <DeploymentDetailPage />
              </ProtectedRoute>
            }
          />

          {/* Environments */}
          <Route
            path="/environments"
            element={
              <ProtectedRoute>
                <EnvironmentPage />
              </ProtectedRoute>
            }
          />

          {/* Health */}
          <Route
            path="/health"
            element={
              <ProtectedRoute>
                <HealthDashboard />
              </ProtectedRoute>
            }
          />

          {/* Cost */}
          <Route
            path="/cost"
            element={
              <ProtectedRoute>
                <CostDashboard />
              </ProtectedRoute>
            }
          />

          {/* Settings */}
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />

          {/* Audit */}
          <Route
            path="/audit"
            element={
              <ProtectedRoute>
                <AuditPage />
              </ProtectedRoute>
            }
          />

          {/* Incidents */}
          <Route
            path="/incidents"
            element={
              <ProtectedRoute>
                <IncidentsPage />
              </ProtectedRoute>
            }
          />

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </AppLayout>
  );
};

const App: React.FC = () => {
  return (
    <ThemeContextProvider>
      <CssBaseline />
      <ErrorBoundary>
        <AuthProvider>
          <Router>
            <CommandPalette />
            <AppRoutes />
          </Router>
        </AuthProvider>
      </ErrorBoundary>
    </ThemeContextProvider>
  );
};

export default App;
