import React from 'react';
import { useAuth } from './AuthProvider';
import { Box, Typography, Button } from '@mui/material';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, login } = useAuth();

  if (!isAuthenticated) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h5" gutterBottom>
          Authentication Required
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          Please sign in to access this page.
        </Typography>
        <Button variant="contained" onClick={login}>
          Sign In
        </Button>
      </Box>
    );
  }

  return <>{children}</>;
};
