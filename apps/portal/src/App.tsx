import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline, alpha } from '@mui/material';
import { Box, CircularProgress, Typography } from '@mui/material';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { AppLayout } from './layout/AppLayout';

import './index.css';

// Lazy-loaded plugin pages for code splitting
const DashboardPage = lazy(() => import('./plugins/dashboard/DashboardPage'));
const CatalogPage = lazy(() => import('./plugins/catalog/CatalogPage'));
const DeploymentPage = lazy(() => import('./plugins/deployments/DeploymentPage'));
const EnvironmentPage = lazy(() => import('./plugins/environments/EnvironmentPage'));
const HealthDashboard = lazy(() => import('./plugins/health/HealthDashboard'));
const CostDashboard = lazy(() => import('./plugins/cost/CostDashboard'));
const NotFoundPage = lazy(() => import('./plugins/NotFoundPage'));
const LoginPage = lazy(() => import('./auth/LoginPage'));

// Theme configuration — enterprise dark theme with premium styling
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
    success: { main: '#4caf50', light: '#81c784', dark: '#388e3c' },
    warning: { main: '#ff9800', light: '#ffb74d', dark: '#f57c00' },
    error: { main: '#f44336', light: '#e57373', dark: '#d32f2f' },
    info: { main: '#2196f3', light: '#64b5f6', dark: '#1976d2' },
    text: {
      primary: '#E6EDF3',
      secondary: '#8B949E',
    },
    divider: 'rgba(255, 255, 255, 0.06)',
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h3: { fontWeight: 700, letterSpacing: -0.5 },
    h4: { fontWeight: 700, letterSpacing: -0.3 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    subtitle1: { fontWeight: 500 },
    subtitle2: { fontWeight: 600 },
    body2: { lineHeight: 1.6 },
    caption: { letterSpacing: 0.3 },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#0D1117',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#161B22',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: 12,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 8,
          letterSpacing: 0,
        },
        contained: {
          boxShadow: 'none',
          '&:hover': { boxShadow: '0 4px 12px rgba(108, 99, 255, 0.3)' },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 500, borderRadius: 6 },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderColor: 'rgba(255, 255, 255, 0.06)' },
        head: { fontWeight: 600, color: '#8B949E', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: 0.5 },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.1)' },
            '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
            '&.Mui-focused fieldset': { borderColor: '#6C63FF' },
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.1)' },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.2)' },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: 4, height: 6 },
        bar: { borderRadius: 4 },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 8 },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: '#21262D',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 6,
          fontSize: '0.75rem',
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          backgroundColor: '#161B22',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 8,
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
    items: [
      { path: '/', label: 'Dashboard', icon: 'dashboard' },
    ],
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

  // Show login page if not authenticated
  if (!isAuthenticated) {
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
          {/* Dashboard */}
          <Route
            path="/"
            element={<ProtectedRoute><DashboardPage /></ProtectedRoute>}
          />

          {/* Service Catalog */}
          <Route
            path="/catalog"
            element={<ProtectedRoute><CatalogPage /></ProtectedRoute>}
          />
          <Route
            path="/catalog/services/:serviceId"
            element={<ProtectedRoute><CatalogPage /></ProtectedRoute>}
          />

          {/* Deployments */}
          <Route
            path="/deployments"
            element={<ProtectedRoute><DeploymentPage /></ProtectedRoute>}
          />
          <Route
            path="/deployments/:deploymentId"
            element={<ProtectedRoute><DeploymentPage /></ProtectedRoute>}
          />

          {/* Environments */}
          <Route
            path="/environments"
            element={<ProtectedRoute><EnvironmentPage /></ProtectedRoute>}
          />

          {/* Health */}
          <Route
            path="/health"
            element={<ProtectedRoute><HealthDashboard /></ProtectedRoute>}
          />

          {/* Cost */}
          <Route
            path="/cost"
            element={<ProtectedRoute><CostDashboard /></ProtectedRoute>}
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
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
