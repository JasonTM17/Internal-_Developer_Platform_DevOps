import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import ReplayIcon from '@mui/icons-material/Replay';
import VerifiedIcon from '@mui/icons-material/Verified';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Grid,
  Stack,
  Button,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
  StepConnector,
} from '@mui/material';
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';

const mockDeployment = {
  id: 'dep-abc123',
  serviceId: 'api-gateway',
  serviceName: 'API Gateway',
  version: 'v2.3.1',
  environment: 'production',
  strategy: 'canary',
  status: 'succeeded',
  actor: 'jane.smith@company.com',
  createdAt: '2025-01-15T10:30:00Z',
  completedAt: '2025-01-15T10:38:00Z',
  duration: '8m 12s',
  artifacts: { image: 'ghcr.io/org/api-gateway:v2.3.1' },
  canaryPercentage: 25,
};

const mockEvents = [
  { time: '10:30:00', state: 'pending', message: 'Deployment created', actor: 'jane.smith' },
  { time: '10:30:05', state: 'queued', message: 'Passed policy checks', actor: 'system' },
  { time: '10:30:12', state: 'in_progress', message: 'Rolling out canary (25%)', actor: 'system' },
  { time: '10:33:00', state: 'verifying', message: 'Running health checks', actor: 'system' },
  {
    time: '10:35:30',
    state: 'verifying',
    message: 'Canary metrics within SLO thresholds',
    actor: 'system',
  },
  { time: '10:36:00', state: 'in_progress', message: 'Promoting to 100%', actor: 'system' },
  {
    time: '10:38:00',
    state: 'completed',
    message: 'Deployment completed successfully',
    actor: 'system',
  },
];

const phases = ['Created', 'Queued', 'Deploying', 'Verifying', 'Completed'];

export const DeploymentDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const _params = useParams<{ deploymentId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress
          sx={{
            bgcolor: 'rgba(100, 117, 161, 0.1)',
            '& .MuiLinearProgress-bar': { bgcolor: '#699CFF' },
          }}
        />
      </Box>
    );
  }

  const statusColor =
    mockDeployment.status === 'succeeded'
      ? '#58E7AB'
      : mockDeployment.status === 'failed'
        ? '#FA746F'
        : mockDeployment.status === 'in_progress'
          ? '#4CD7F6'
          : '#6475A1';

  const activeStep = mockDeployment.status === 'succeeded' ? 4 : 2;

  return (
    <Box sx={{ maxWidth: 1440, mx: 'auto', animation: 'fadeIn 0.5s ease-out both' }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/deployments')}
        sx={{ color: '#6475A1', mb: 2, '&:hover': { color: '#DEE5FF' } }}
      >
        {t('deployments.title')}
      </Button>

      <Box
        sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}
      >
        <Box>
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 0.5 }}>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#DEE5FF', fontSize: '1.5rem' }}>
              {mockDeployment.serviceName}
            </Typography>
            <Chip
              label={mockDeployment.status.replace('_', ' ')}
              size="small"
              sx={{
                height: 22,
                fontSize: '0.65rem',
                bgcolor: `${statusColor}1A`,
                color: statusColor,
                border: `1px solid ${statusColor}33`,
              }}
            />
          </Stack>
          <Typography variant="body2" sx={{ color: '#6475A1' }}>
            {mockDeployment.artifacts.image} → {mockDeployment.environment}
          </Typography>
        </Box>
        <Button
          variant="outlined"
          size="small"
          startIcon={<ReplayIcon />}
          sx={{
            borderColor: 'rgba(250, 116, 111, 0.3)',
            color: '#FA746F',
            '&:hover': { borderColor: '#FA746F', bgcolor: 'rgba(250, 116, 111, 0.06)' },
          }}
        >
          {t('deploymentDetail.rollback')}
        </Button>
      </Box>

      <Card sx={{ bgcolor: '#0F1E3F', border: '1px solid rgba(100, 117, 161, 0.2)', mb: 3 }}>
        <CardContent sx={{ py: 3 }}>
          <Stepper
            activeStep={activeStep}
            alternativeLabel
            connector={
              <StepConnector
                sx={{
                  '& .MuiStepConnector-line': { borderColor: 'rgba(100, 117, 161, 0.3)' },
                  '&.Mui-active .MuiStepConnector-line': { borderColor: '#699CFF' },
                  '&.Mui-completed .MuiStepConnector-line': { borderColor: '#58E7AB' },
                }}
              />
            }
          >
            {phases.map((label, idx) => (
              <Step key={label} completed={idx <= activeStep}>
                <StepLabel
                  StepIconComponent={() => {
                    if (idx < activeStep)
                      return <CheckCircleIcon sx={{ fontSize: 24, color: '#58E7AB' }} />;
                    if (idx === activeStep)
                      return <VerifiedIcon sx={{ fontSize: 24, color: '#58E7AB' }} />;
                    return <PendingIcon sx={{ fontSize: 24, color: '#6475A1' }} />;
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{ color: idx <= activeStep ? '#DEE5FF' : '#6475A1' }}
                  >
                    {label}
                  </Typography>
                </StepLabel>
              </Step>
            ))}
          </Stepper>
        </CardContent>
      </Card>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Card sx={{ bgcolor: '#0F1E3F', border: '1px solid rgba(100, 117, 161, 0.2)' }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="caption" sx={{ color: '#6475A1' }}>
                {t('deploymentDetail.duration')}
              </Typography>
              <Typography variant="h6" sx={{ color: '#DEE5FF', fontWeight: 700 }}>
                {mockDeployment.duration}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card sx={{ bgcolor: '#0F1E3F', border: '1px solid rgba(100, 117, 161, 0.2)' }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="caption" sx={{ color: '#6475A1' }}>
                {t('deploymentDetail.strategy')}
              </Typography>
              <Typography variant="h6" sx={{ color: '#4CD7F6', fontWeight: 700 }}>
                {mockDeployment.strategy}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card sx={{ bgcolor: '#0F1E3F', border: '1px solid rgba(100, 117, 161, 0.2)' }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="caption" sx={{ color: '#6475A1' }}>
                {t('deploymentDetail.canary')}
              </Typography>
              <Typography variant="h6" sx={{ color: '#F59E0B', fontWeight: 700 }}>
                {mockDeployment.canaryPercentage}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card sx={{ bgcolor: '#0F1E3F', border: '1px solid rgba(100, 117, 161, 0.2)' }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="caption" sx={{ color: '#6475A1' }}>
                {t('deploymentDetail.actor')}
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: '#DEE5FF', fontWeight: 600, fontSize: '0.8rem' }}
              >
                {mockDeployment.actor.split('@')[0]}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card sx={{ bgcolor: '#0F1E3F', border: '1px solid rgba(100, 117, 161, 0.2)' }}>
        <CardContent>
          <Typography
            variant="h6"
            sx={{ fontWeight: 600, color: '#DEE5FF', mb: 2, fontSize: '0.9rem' }}
          >
            {t('deploymentDetail.eventLog')}
          </Typography>
          <Stack spacing={0}>
            {mockEvents.map((event, idx) => (
              <Box
                key={idx}
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 2,
                  py: 1.5,
                  borderBottom:
                    idx < mockEvents.length - 1 ? '1px solid rgba(100, 117, 161, 0.08)' : 'none',
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    color: '#6475A1',
                    fontFamily: '"JetBrains Mono", monospace',
                    minWidth: 60,
                    pt: 0.3,
                  }}
                >
                  {event.time}
                </Typography>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: event.state === 'completed' ? '#58E7AB' : '#699CFF',
                    mt: 0.7,
                    flexShrink: 0,
                  }}
                />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ color: '#DEE5FF', fontSize: '0.8rem' }}>
                    {event.message}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#6475A1' }}>
                    by {event.actor}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

export default DeploymentDetailPage;
