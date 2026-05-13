import React from 'react';
import { Box, Typography, Card, CardContent, Button, TextField, Stack } from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import GitHubIcon from '@mui/icons-material/GitHub';
import GoogleIcon from '@mui/icons-material/Google';
import { useAuth } from './AuthProvider';
import { useNavigate } from 'react-router-dom';

/**
 * Login page with glassmorphism card and SSO options.
 * Currently a visual placeholder — AuthProvider handles auth state.
 */
export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = () => {
    login();
    navigate('/');
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0D1117 0%, #161B22 50%, #0D1117 100%)',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: '-50%',
          left: '-50%',
          width: '200%',
          height: '200%',
          background: 'radial-gradient(ellipse at 30% 20%, rgba(108, 99, 255, 0.08) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(3, 218, 198, 0.06) 0%, transparent 50%)',
          animation: 'gradient-shift 15s ease infinite',
          backgroundSize: '200% 200%',
        },
      }}
    >
      <Card
        sx={{
          width: '100%',
          maxWidth: 420,
          mx: 2,
          background: 'rgba(22, 27, 34, 0.8)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          position: 'relative',
          animation: 'scaleIn 0.5s ease-out both',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '2px',
            background: 'linear-gradient(90deg, #6C63FF, #03DAC6)',
          },
        }}
      >
        <CardContent sx={{ p: 4 }}>
          {/* Logo */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box
              sx={{
                width: 56, height: 56, borderRadius: 2, mx: 'auto', mb: 2,
                background: 'linear-gradient(135deg, #6C63FF, #03DAC6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(108, 99, 255, 0.3)',
              }}
            >
              <LockOutlinedIcon sx={{ color: '#fff', fontSize: 28 }} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Internal Developer Platform
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Sign in to access your platform
            </Typography>
          </Box>

          {/* SSO Buttons */}
          <Stack spacing={1.5} sx={{ mb: 3 }}>
            <Button fullWidth variant="outlined" startIcon={<GitHubIcon />} onClick={handleLogin}
              sx={{ py: 1.2, borderColor: 'rgba(255,255,255,0.15)', color: '#E6EDF3', '&:hover': { borderColor: 'rgba(255,255,255,0.3)', bgcolor: 'rgba(255,255,255,0.05)' } }}>
              Continue with GitHub
            </Button>
            <Button fullWidth variant="outlined" startIcon={<GoogleIcon />} onClick={handleLogin}
              sx={{ py: 1.2, borderColor: 'rgba(255,255,255,0.15)', color: '#E6EDF3', '&:hover': { borderColor: 'rgba(255,255,255,0.3)', bgcolor: 'rgba(255,255,255,0.05)' } }}>
              Continue with Google SSO
            </Button>
          </Stack>

          {/* Divider */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Box sx={{ flex: 1, height: '1px', bgcolor: 'rgba(255,255,255,0.08)' }} />
            <Typography variant="caption" color="text.secondary">or sign in with email</Typography>
            <Box sx={{ flex: 1, height: '1px', bgcolor: 'rgba(255,255,255,0.08)' }} />
          </Box>

          {/* Email Form */}
          <Stack spacing={2} sx={{ mb: 3 }}>
            <TextField fullWidth label="Email" type="email" size="small" placeholder="you@company.com" />
            <TextField fullWidth label="Password" type="password" size="small" />
          </Stack>

          <Button fullWidth variant="contained" onClick={handleLogin}
            sx={{
              py: 1.2, fontWeight: 600,
              background: 'linear-gradient(135deg, #6C63FF, #8B83FF)',
              '&:hover': { background: 'linear-gradient(135deg, #4B44B2, #6C63FF)' },
            }}>
            Sign In
          </Button>

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 2 }}>
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default LoginPage;
