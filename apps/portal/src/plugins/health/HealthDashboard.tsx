import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CircleIcon from '@mui/icons-material/Circle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Stack,
  Tooltip,
  useTheme,
  alpha,
} from '@mui/material';
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

// Mock data for the health dashboard
const mockServices = [
  {
    name: 'API Gateway',
    status: 'healthy' as const,
    uptime: 99.98,
    responseTime: 45,
    lastCheck: '2 min ago',
  },
  {
    name: 'Auth Service',
    status: 'healthy' as const,
    uptime: 99.95,
    responseTime: 62,
    lastCheck: '1 min ago',
  },
  {
    name: 'Database (Primary)',
    status: 'healthy' as const,
    uptime: 99.99,
    responseTime: 12,
    lastCheck: '30s ago',
  },
  {
    name: 'Cache Layer',
    status: 'degraded' as const,
    uptime: 98.5,
    responseTime: 180,
    lastCheck: '1 min ago',
  },
  {
    name: 'Message Queue',
    status: 'healthy' as const,
    uptime: 99.92,
    responseTime: 28,
    lastCheck: '45s ago',
  },
  {
    name: 'Storage Service',
    status: 'healthy' as const,
    uptime: 99.97,
    responseTime: 95,
    lastCheck: '2 min ago',
  },
  {
    name: 'Notification Service',
    status: 'down' as const,
    uptime: 95.2,
    responseTime: 0,
    lastCheck: '5 min ago',
  },
  {
    name: 'Search Engine',
    status: 'healthy' as const,
    uptime: 99.88,
    responseTime: 120,
    lastCheck: '1 min ago',
  },
  {
    name: 'CI/CD Pipeline',
    status: 'healthy' as const,
    uptime: 99.75,
    responseTime: 340,
    lastCheck: '3 min ago',
  },
];

const mockIncidents = [
  {
    id: 1,
    title: 'Notification Service unreachable',
    severity: 'critical' as const,
    time: '5 minutes ago',
    status: 'investigating',
  },
  {
    id: 2,
    title: 'Cache Layer high latency detected',
    severity: 'warning' as const,
    time: '12 minutes ago',
    status: 'monitoring',
  },
  {
    id: 3,
    title: 'Database failover completed successfully',
    severity: 'info' as const,
    time: '2 hours ago',
    status: 'resolved',
  },
  {
    id: 4,
    title: 'API Gateway rate limit threshold reached',
    severity: 'warning' as const,
    time: '4 hours ago',
    status: 'resolved',
  },
];

const mockSLOs = [
  { name: 'API Availability', target: 99.9, current: 99.95, budget: 87 },
  { name: 'P95 Latency < 200ms', target: 95, current: 97.2, budget: 72 },
  { name: 'Error Rate < 0.1%', target: 99.9, current: 99.85, budget: 45 },
  { name: 'Deployment Success Rate', target: 99, current: 99.5, budget: 92 },
];

type ServiceStatus = 'healthy' | 'degraded' | 'down';

// Circular gauge component for overall health score
const HealthGauge: React.FC<{ score: number }> = ({ score }) => {
  const theme = useTheme();
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const color =
    score >= 95
      ? theme.palette.success.main
      : score >= 80
        ? theme.palette.warning.main
        : theme.palette.error.main;

  return (
    <Box
      sx={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg width="180" height="180" viewBox="0 0 180 180">
        <circle
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          stroke={theme.palette.divider}
          strokeWidth="10"
        />
        <circle
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          transform="rotate(-90 90 90)"
          style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
        />
      </svg>
      <Box sx={{ position: 'absolute', textAlign: 'center' }}>
        <Typography
          variant="h3"
          sx={{ fontWeight: 700, color: theme.palette.text.primary, lineHeight: 1 }}
        >
          {score}
        </Typography>
        <Typography
          variant="caption"
          sx={{ color: theme.palette.text.secondary, fontSize: '0.7rem' }}
        >
          Health Score
        </Typography>
      </Box>
    </Box>
  );
};

export const HealthDashboard: React.FC = () => {
  const theme = useTheme();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const healthyCount = mockServices.filter((s) => s.status === 'healthy').length;
  const totalServices = mockServices.length;
  const healthScore = Math.round((healthyCount / totalServices) * 100);

  const statusConfig: Record<
    ServiceStatus,
    { color: string; bg: string; icon: React.ReactNode; label: string }
  > = {
    healthy: {
      color: theme.palette.success.main,
      bg: alpha(theme.palette.success.main, 0.12),
      icon: <CheckCircleIcon sx={{ fontSize: 18, color: theme.palette.success.main }} />,
      label: t('health.status.healthy'),
    },
    degraded: {
      color: theme.palette.warning.main,
      bg: alpha(theme.palette.warning.main, 0.12),
      icon: <WarningIcon sx={{ fontSize: 18, color: theme.palette.warning.main }} />,
      label: t('health.status.degraded'),
    },
    down: {
      color: theme.palette.error.main,
      bg: alpha(theme.palette.error.main, 0.12),
      icon: <ErrorIcon sx={{ fontSize: 18, color: theme.palette.error.main }} />,
      label: t('health.status.down'),
    },
  };

  const incidentColors: Record<string, string> = {
    critical: theme.palette.error.main,
    warning: theme.palette.warning.main,
    info: theme.palette.primary.main,
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress sx={{ borderRadius: 2 }} />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1440, mx: 'auto', animation: 'fadeIn 0.5s ease-out both' }}>
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h4"
          sx={{ fontWeight: 700, color: theme.palette.text.primary, mb: 0.5 }}
        >
          {t('health.title')}
        </Typography>
        <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
          {t('health.subtitle')}
        </Typography>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                py: 4,
              }}
            >
              <HealthGauge score={healthScore} />
              <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mt: 2 }}>
                {t('health.servicesHealthy', { healthy: healthyCount, total: totalServices })}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ py: 3 }}>
              <Typography
                variant="h6"
                sx={{ fontWeight: 600, color: theme.palette.text.primary, mb: 2.5 }}
              >
                {t('health.incidentTimeline')}
              </Typography>
              <Stack spacing={2}>
                {mockIncidents.map((incident) => (
                  <Box
                    key={incident.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 2,
                      p: 1.5,
                      borderRadius: '8px',
                      bgcolor: alpha(theme.palette.text.primary, 0.02),
                      border: `1px solid ${theme.palette.divider}`,
                    }}
                  >
                    <CircleIcon
                      sx={{ fontSize: 10, color: incidentColors[incident.severity], mt: 0.7 }}
                    />
                    <Box sx={{ flex: 1 }}>
                      <Typography
                        variant="body2"
                        sx={{ color: theme.palette.text.primary, fontWeight: 500 }}
                      >
                        {incident.title}
                      </Typography>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                        <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                          {incident.time}
                        </Typography>
                        <Chip
                          label={incident.status}
                          size="small"
                          sx={{
                            height: 18,
                            fontSize: '0.6rem',
                            fontWeight: 600,
                            bgcolor:
                              incident.status === 'resolved'
                                ? alpha(theme.palette.success.main, 0.12)
                                : incident.status === 'investigating'
                                  ? alpha(theme.palette.error.main, 0.12)
                                  : alpha(theme.palette.warning.main, 0.12),
                            color:
                              incident.status === 'resolved'
                                ? theme.palette.success.main
                                : incident.status === 'investigating'
                                  ? theme.palette.error.main
                                  : theme.palette.warning.main,
                          }}
                        />
                      </Stack>
                    </Box>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.text.primary, mb: 2 }}>
        {t('health.serviceHealth')}
      </Typography>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {mockServices.map((service) => (
          <Grid item xs={12} sm={6} md={4} key={service.name}>
            <Card
              sx={{
                transition: 'all 0.2s ease',
                '&:hover': { borderColor: alpha(theme.palette.primary.main, 0.2) },
              }}
            >
              <CardContent sx={{ py: 2.5 }}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 1.5,
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    sx={{ color: theme.palette.text.primary, fontWeight: 600 }}
                  >
                    {service.name}
                  </Typography>
                  <Chip
                    icon={statusConfig[service.status].icon as React.ReactElement}
                    label={statusConfig[service.status].label}
                    size="small"
                    sx={{
                      bgcolor: statusConfig[service.status].bg,
                      color: statusConfig[service.status].color,
                      fontWeight: 600,
                      fontSize: '0.65rem',
                      height: 24,
                      '& .MuiChip-icon': { ml: 0.5 },
                    }}
                  />
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <Typography
                      variant="caption"
                      sx={{
                        color: theme.palette.text.secondary,
                        display: 'block',
                        fontSize: '0.65rem',
                      }}
                    >
                      {t('health.uptime')}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ color: theme.palette.text.primary, fontWeight: 600 }}
                    >
                      {service.uptime}%
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography
                      variant="caption"
                      sx={{
                        color: theme.palette.text.secondary,
                        display: 'block',
                        fontSize: '0.65rem',
                      }}
                    >
                      {t('health.p95Latency')}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color:
                          service.responseTime > 150
                            ? theme.palette.warning.main
                            : theme.palette.text.primary,
                        fontWeight: 600,
                      }}
                    >
                      {service.responseTime > 0 ? `${service.responseTime}ms` : '—'}
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography
                      variant="caption"
                      sx={{
                        color: theme.palette.text.secondary,
                        display: 'block',
                        fontSize: '0.65rem',
                      }}
                    >
                      {t('health.lastCheck')}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: theme.palette.text.primary,
                        fontWeight: 500,
                        fontSize: '0.75rem',
                      }}
                    >
                      {service.lastCheck}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.text.primary, mb: 2 }}>
        {t('health.sloCompliance')}
      </Typography>
      <Grid container spacing={2}>
        {mockSLOs.map((slo) => {
          const isAtRisk = slo.budget < 50;
          const isMet = slo.current >= slo.target;

          return (
            <Grid item xs={12} sm={6} key={slo.name}>
              <Card>
                <CardContent sx={{ py: 2.5 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      mb: 1.5,
                    }}
                  >
                    <Typography
                      variant="subtitle2"
                      sx={{ color: theme.palette.text.primary, fontWeight: 600 }}
                    >
                      {slo.name}
                    </Typography>
                    <Chip
                      label={isMet ? t('health.met') : t('health.atRisk')}
                      size="small"
                      sx={{
                        bgcolor: isMet
                          ? alpha(theme.palette.success.main, 0.12)
                          : alpha(theme.palette.error.main, 0.12),
                        color: isMet ? theme.palette.success.main : theme.palette.error.main,
                        fontWeight: 600,
                        fontSize: '0.65rem',
                        height: 20,
                      }}
                    />
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                      Current: {slo.current}% (Target: {slo.target}%)
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        color: isAtRisk ? theme.palette.warning.main : theme.palette.text.secondary,
                      }}
                    >
                      Error budget: {slo.budget}%
                    </Typography>
                  </Box>
                  <Tooltip title={t('health.errorBudget', { value: slo.budget })}>
                    <LinearProgress
                      variant="determinate"
                      value={slo.budget}
                      sx={{
                        height: 6,
                        borderRadius: 3,
                        bgcolor: theme.palette.divider,
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 3,
                          bgcolor:
                            slo.budget > 70
                              ? theme.palette.success.main
                              : slo.budget > 40
                                ? theme.palette.warning.main
                                : theme.palette.error.main,
                        },
                      }}
                    />
                  </Tooltip>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
};

export default HealthDashboard;
