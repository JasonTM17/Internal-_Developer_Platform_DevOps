import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { Box, CircularProgress } from '@mui/material';
import { AuthProvider } from './auth/AuthProvider';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { AppLayout } from './layout/AppLayout';

// Lazy-loaded plugin pages for code splitting
const CatalogPage = lazy(() => import('./plugins/catalog/CatalogPage'));
const DeploymentPage = lazy(() => import('./plugins/deployments/DeploymentPage'));
const EnvironmentPage = lazy(() => import('./plugins/environments/EnvironmentPage'));
const HealthDashboard = lazy(() => import('./plugins/health/HealthDashboard'));
const CostDashboard = lazy(() => import('./plugins/cost/CostDashboard'));

// Theme configuration
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#6C63FF',
      light: '#8B83FF',
      dark: '#4B44B2',
    },
    secondary: {
      main: '#03DAC6',
      light: '#66FFF8',
      dark: '#00A896',
    },
    background: {
      default: '#0D1117',
      paper: '#161B22',
    },
    success: {
      main: '#4caf50',
    },
    warning: {
      main: '#ff9800',
    },
    error: {
      main: '#f44336',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 700,
    },
    h6: {
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
        },
      },
    },
  },
});

// Loading fallback component
const PageLoader: React.FC = () => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '60vh',
    }}
    role="status"
    aria-label="Loading page"
  >
    <CircularProgress />
  </Box>
);

// Navigation configuration for the sidebar
export const navigationConfig = [
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

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <AppLayout navigation={navigationConfig}>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Default redirect */}
                <Route path="/" element={<Navigate to="/catalog" replace />} />

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
                      <CatalogPage />
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
                      <DeploymentPage />
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

                {/* 404 */}
                <Route
                  path="*"
                  element={
                    <Box sx={{ p: 4, textAlign: 'center' }}>
                      <h1>404 — Page Not Found</h1>
                      <p>The page you're looking for doesn't exist.</p>
                    </Box>
                  }
                />
              </Routes>
            </Suspense>
          </AppLayout>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
