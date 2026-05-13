import React from 'react';
import { Box, Typography, Button, Stack } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import SearchIcon from '@mui/icons-material/Search';
import { useNavigate } from 'react-router-dom';

/**
 * Professional 404 page with animated illustration and navigation options.
 */
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
      {/* Animated 404 Text */}
      <Typography
        variant="h1"
        sx={{
          fontSize: { xs: '6rem', md: '10rem' },
          fontWeight: 800,
          lineHeight: 1,
          mb: 2,
          background: 'linear-gradient(135deg, #6C63FF 0%, #03DAC6 100%)',
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
          mb: 1,
          animation: 'fadeInUp 0.6s ease-out 0.1s both',
        }}
      >
        Page not found
      </Typography>

      <Typography
        variant="body1"
        color="text.secondary"
        sx={{
          maxWidth: 420,
          mb: 4,
          animation: 'fadeInUp 0.6s ease-out 0.2s both',
        }}
      >
        The page you're looking for doesn't exist or has been moved.
        Check the URL or navigate back to the dashboard.
      </Typography>

      <Stack
        direction="row"
        spacing={2}
        sx={{ animation: 'fadeInUp 0.6s ease-out 0.3s both' }}
      >
        <Button
          variant="contained"
          startIcon={<HomeIcon />}
          onClick={() => navigate('/')}
          sx={{
            background: 'linear-gradient(135deg, #6C63FF, #8B83FF)',
            '&:hover': { background: 'linear-gradient(135deg, #4B44B2, #6C63FF)' },
          }}
        >
          Go to Dashboard
        </Button>
        <Button
          variant="outlined"
          startIcon={<SearchIcon />}
          onClick={() => navigate('/catalog')}
          sx={{ borderColor: 'rgba(108, 99, 255, 0.5)', color: '#8B83FF' }}
        >
          Browse Catalog
        </Button>
      </Stack>
    </Box>
  );
};

export default NotFoundPage;
