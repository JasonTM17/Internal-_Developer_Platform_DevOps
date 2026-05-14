import GitHubIcon from '@mui/icons-material/GitHub';
import GoogleIcon from '@mui/icons-material/Google';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  Stack,
  useTheme,
  alpha,
} from '@mui/material';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useAuth } from './AuthProvider';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const { t } = useTranslation();

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
        bgcolor: theme.palette.background.default,
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: '-50%',
          left: '-50%',
          width: '200%',
          height: '200%',
          background: `radial-gradient(ellipse at 30% 20%, ${alpha(theme.palette.primary.main, 0.08)} 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, ${alpha(theme.palette.secondary.main, 0.06)} 0%, transparent 50%)`,
        },
      }}
    >
      <Card
        sx={{
          width: '100%',
          maxWidth: 420,
          mx: 2,
          background: alpha(theme.palette.background.paper, 0.8),
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          position: 'relative',
          animation: 'scaleIn 0.5s ease-out both',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '2px',
            background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
          },
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: 2,
                mx: 'auto',
                mb: 2,
                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.3)}`,
              }}
            >
              <LockOutlinedIcon sx={{ color: '#fff', fontSize: 28 }} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
              {t('login.title')}
            </Typography>
            <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mt: 0.5 }}>
              {t('login.subtitle')}
            </Typography>
          </Box>

          <Stack spacing={1.5} sx={{ mb: 3 }}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<GitHubIcon />}
              onClick={handleLogin}
              sx={{
                py: 1.2,
                borderColor: theme.palette.divider,
                color: theme.palette.text.primary,
                '&:hover': {
                  borderColor: theme.palette.text.secondary,
                  bgcolor: alpha(theme.palette.text.primary, 0.04),
                },
              }}
            >
              {t('login.github')}
            </Button>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<GoogleIcon />}
              onClick={handleLogin}
              sx={{
                py: 1.2,
                borderColor: theme.palette.divider,
                color: theme.palette.text.primary,
                '&:hover': {
                  borderColor: theme.palette.text.secondary,
                  bgcolor: alpha(theme.palette.text.primary, 0.04),
                },
              }}
            >
              {t('login.google')}
            </Button>
          </Stack>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Box sx={{ flex: 1, height: '1px', bgcolor: theme.palette.divider }} />
            <Typography variant="caption" color="text.secondary">
              {t('login.emailDivider')}
            </Typography>
            <Box sx={{ flex: 1, height: '1px', bgcolor: theme.palette.divider }} />
          </Box>

          <Stack spacing={2} sx={{ mb: 3 }}>
            <TextField
              fullWidth
              label={t('login.email')}
              type="email"
              size="small"
              placeholder="you@company.com"
            />
            <TextField fullWidth label={t('login.password')} type="password" size="small" />
          </Stack>

          <Button
            fullWidth
            variant="contained"
            onClick={handleLogin}
            sx={{
              py: 1.2,
              fontWeight: 600,
              background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
              '&:hover': {
                background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
              },
            }}
          >
            {t('login.signIn')}
          </Button>

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', textAlign: 'center', mt: 2 }}
          >
            {t('login.terms')}
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default LoginPage;
