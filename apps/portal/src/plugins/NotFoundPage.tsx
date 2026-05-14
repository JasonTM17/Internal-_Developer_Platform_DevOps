import HomeIcon from '@mui/icons-material/Home';
import SearchIcon from '@mui/icons-material/Search';
import { Box, Typography, Button, Stack } from '@mui/material';
import React from 'react';
import { useNavigate } from 'react-router-dom';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '70vh',
        textAlign: 'center',
        px: 3,
        animation: 'fadeIn 0.5s ease-out both',
      }}
    >
      <Typography
        variant="h1"
        sx={{
          fontSize: { xs: '6rem', md: '10rem' },
          fontWeight: 800,
          lineHeight: 1,
          mb: 2,
          background: 'linear-gradient(135deg, #699CFF 0%, #4CD7F6 100%)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          animation: 'fadeInUp 0.6s ease-out both',
          userSelect: 'none',
        }}
      >
        404
      </Typography>

      <Typography
        variant="h5"
        sx={{
          fontWeight: 600,
          color: '#DEE5FF',
          mb: 1,
          animation: 'fadeInUp 0.6s ease-out 0.1s both',
        }}
      >
        Page not found
      </Typography>

      <Typography
        variant="body1"
        sx={{
          color: '#6475A1',
          maxWidth: 420,
          mb: 4,
          animation: 'fadeInUp 0.6s ease-out 0.2s both',
        }}
      >
        The page you're looking for doesn't exist or has been moved. Check the URL or navigate back
        to the dashboard.
      </Typography>

      <Stack direction="row" spacing={2} sx={{ animation: 'fadeInUp 0.6s ease-out 0.3s both' }}>
        <Button
          variant="contained"
          startIcon={<HomeIcon />}
          onClick={() => navigate('/')}
          sx={{
            background: 'linear-gradient(135deg, #699CFF, #3B82F6)',
            boxShadow: '0 4px 12px rgba(105, 156, 255, 0.3)',
            '&:hover': { background: 'linear-gradient(135deg, #ADC6FF, #699CFF)' },
          }}
        >
          Go to Dashboard
        </Button>
        <Button
          variant="outlined"
          startIcon={<SearchIcon />}
          onClick={() => navigate('/catalog')}
          sx={{
            borderColor: 'rgba(105, 156, 255, 0.5)',
            color: '#ADC6FF',
            '&:hover': { borderColor: '#699CFF', bgcolor: 'rgba(105, 156, 255, 0.06)' },
          }}
        >
          Browse Catalog
        </Button>
      </Stack>
    </Box>
  );
};

export default NotFoundPage;
