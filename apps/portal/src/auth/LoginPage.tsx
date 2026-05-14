import GitHubIcon from '@mui/icons-material/GitHub';
import GoogleIcon from '@mui/icons-material/Google';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { Box, Typography, Card, CardContent, Button, TextField, Stack } from '@mui/material';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useAuth } from './AuthProvider';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
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
        bgcolor: '#060E20',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: '-50%',
          left: '-50%',
          width: '200%',
          height: '200%',
          background:
            'radial-gradient(ellipse at 30% 20%, rgba(105, 156, 255, 0.06) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(76, 215, 246, 0.04) 0%, transparent 50%)',
        },
      }}
    >
      <Card
        sx={{
          width: '100%',
          maxWidth: 420,
          mx: 2,
          bgcolor: '#0F1E3F',
          border: '1px solid rgba(100, 117, 161, 0.2)',
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
            background: 'linear-gradient(90deg, #699CFF, #4CD7F6)',
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
                background: 'linear-gradient(135deg, #699CFF, #4CD7F6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 20px rgba(105, 156, 255, 0.3)',
              }}
            >
              <LockOutlinedIcon sx={{ color: '#fff', fontSize: 28 }} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#DEE5FF' }}>
              {t('login.title')}
            </Typography>
            <Typography variant="body2" sx={{ color: '#6475A1', mt: 0.5 }}>
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
                borderColor: 'rgba(100, 117, 161, 0.3)',
                color: '#DEE5FF',
                '&:hover': {
                  borderColor: '#699CFF',
                  bgcolor: 'rgba(105, 156, 255, 0.06)',
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
                borderColor: 'rgba(100, 117, 161, 0.3)',
                color: '#DEE5FF',
                '&:hover': {
                  borderColor: '#699CFF',
                  bgcolor: 'rgba(105, 156, 255, 0.06)',
                },
              }}
            >
              {t('login.google')}
            </Button>
          </Stack>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Box sx={{ flex: 1, height: '1px', bgcolor: 'rgba(100, 117, 161, 0.2)' }} />
            <Typography variant="caption" sx={{ color: '#6475A1' }}>
              {t('login.emailDivider')}
            </Typography>
            <Box sx={{ flex: 1, height: '1px', bgcolor: 'rgba(100, 117, 161, 0.2)' }} />
          </Box>

          <Stack spacing={2} sx={{ mb: 3 }}>
            <TextField
              fullWidth
              label={t('login.email')}
              type="email"
              size="small"
              placeholder="you@company.com"
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'rgba(6, 14, 32, 0.5)',
                  '& fieldset': { borderColor: 'rgba(100, 117, 161, 0.3)' },
                  '&:hover fieldset': { borderColor: 'rgba(105, 156, 255, 0.5)' },
                  '&.Mui-focused fieldset': { borderColor: '#699CFF' },
                },
                '& .MuiInputLabel-root': { color: '#6475A1' },
                '& .MuiOutlinedInput-input': { color: '#DEE5FF' },
              }}
            />
            <TextField
              fullWidth
              label={t('login.password')}
              type="password"
              size="small"
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'rgba(6, 14, 32, 0.5)',
                  '& fieldset': { borderColor: 'rgba(100, 117, 161, 0.3)' },
                  '&:hover fieldset': { borderColor: 'rgba(105, 156, 255, 0.5)' },
                  '&.Mui-focused fieldset': { borderColor: '#699CFF' },
                },
                '& .MuiInputLabel-root': { color: '#6475A1' },
                '& .MuiOutlinedInput-input': { color: '#DEE5FF' },
              }}
            />
          </Stack>

          <Button
            fullWidth
            variant="contained"
            onClick={handleLogin}
            sx={{
              py: 1.2,
              fontWeight: 600,
              background: 'linear-gradient(135deg, #699CFF, #3B82F6)',
              boxShadow: '0 4px 16px rgba(105, 156, 255, 0.3)',
              '&:hover': {
                background: 'linear-gradient(135deg, #ADC6FF, #699CFF)',
                boxShadow: '0 6px 24px rgba(105, 156, 255, 0.4)',
              },
            }}
          >
            {t('login.signIn')}
          </Button>

          <Typography
            variant="caption"
            sx={{ display: 'block', textAlign: 'center', mt: 2, color: '#6475A1' }}
          >
            {t('login.terms')}
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default LoginPage;
