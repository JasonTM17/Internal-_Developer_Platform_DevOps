import React, { useState, useEffect } from 'react';
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
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import CircleIcon from '@mui/icons-material/Circle';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

// Mock data for the health dashboard
const mockServices = [
  { name: 'API Gateway', status: 'healthy' as const, uptime: 99.98, responseTime: 45, lastCheck: '2 min ago' },
  { name: 'Auth Service', status: 'healthy' as const, uptime: 99.95, responseTime: 62, lastCheck: '1 min ago' },
  { name: 'Database (Primary)', status: 'healthy' as const, uptime: 99.99, responseTime: 12, lastCheck: '30s ago' },
  { name: 'Cache Layer', status: 'degraded' as const, uptime: 98.5, responseTime: 180, lastCheck: '1 min ago' },
  { name: 'Message Queue', status: 'healthy' as const, uptime: 99.92, responseTime: 28, lastCheck: '45s ago' },
  { name: 'Storage Service', status: 'healthy' as const, uptime: 99.97, responseTime: 95, lastCheck: '2 min ago' },
  { name: 'Notification Service', status: 'down' as const, uptime: 95.2, responseTime: 0, lastCheck: '5 min ago' },
  { name: 'Search Engine', status: 'healthy' as const, uptime: 99.88, responseTime: 120, lastCheck: '1 min ago' },
  { name: 'CI/CD Pipeline', status: 'healthy' as const, uptime: 99.75, responseTime: 340, lastCheck: '3 min ago' },
];

const mockIncidents = [
  { id: 1, title: 'Notification Service unreachable', severity: 'critical' as const, time: '5 minutes ago', status: 'investigating' },
  { id: 2, title: 'Cache Layer high latency detected', severity: 'warning' as const, time: '12 minutes ago', status: 'monitoring' },
  { id: 3, title: 'Database failover completed successfully', severity: 'info' as const, time: '2 hours ago', status: 'resolved' },
  { id: 4, title: 'API Gateway rate limit threshold reached', severity: 'warning' as const, time: '4 hours ago', status: 'resolved' },
];

const mockSLOs = [
  { name: 'API Availability', target: 99.9, current: 99.95, budget: 87 },
  { name: 'P95 Latency < 200ms', target: 95, current: 97.2, budget: 72 },
  { name: 'Error Rate < 0.1%', target: 99.9, current: 99.85, budget: 45 },
  { name: 'Deployment Success Rate', target: 99, current: 99.5, budget: 92 },
];

type ServiceStatus = 'healthy' | 'degraded' | 'down';

const statusConfig: Record<ServiceStatus, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
  healthy: { color: '#3fb950', bg: 'rgba(63, 185, 80, 0.12)', icon: <CheckCircleIcon sx={{ fontSize: 18, color: '#3fb950' }} />, label: 'Healthy' },
  degraded: { color: '#d29922', bg: 'rgba(210, 153, 34, 0.12)', icon: <WarningIcon sx={{ fontSize: 18, color: '#d29922' }} />, label: 'Degraded' },
  down: { color: '#f85149', bg: 'rgba(248, 81, 73, 0.12)', icon: <ErrorIcon sx={{ fontSize: 18, color: '#f85149' }} />, label: 'Down' },
};

const incidentColors: Record<string, string> = {
  critical: '#f85149',
  warning: '#d29922',
  info: '#6C63FF',
};

// Circular gauge component for overall health score
const HealthGauge: React.FC<{ score: number }> = ({ score }) => {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const color = score >= 95 ? '#3fb950' : score >= 80 ? '#d29922' : '#f85149';

  return (
    <Box sx={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="180" height="180" viewBox="0 0 180 180">
        {/* Background circle */}
        <circle
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="10"
        />
        {/* Progress circle */}
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
        <Typography variant="h3" sx={{ fontWeight: 700, color: '#ffffff', lineHeight: 1 }}>
          {score}
        </Typography>
        <Typography variant="caption" sx={{ color: '#8b949e', fontSize: '0.7rem' }}>
          Health Score
        </Typography>
      </Box>
    </Box>
  );
};

export const HealthDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const healthyCount = mockServices.filter((s) => s.status === 'healthy').length;
  const totalServices = mockServices.length;
  const healthScore = Math.round((healthyCount / totalServices) * 100);

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress sx={{ borderRadius: 2 }} />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', animation: 'fadeIn 0.5s ease-out both' }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#ffffff', mb: 0.5 }}>
          Health Monitor
        </Typography>
        <Typography variant="body2" sx={{ color: '#8b949e' }}>
          Real-time platform health and service status overview
        </Typography>
      </Box>

      {/* Top Section: Health Gauge + Quick Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card sx={{ bgcolor: '#161b22', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', height: '100%' }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 4 }}>
              <HealthGauge score={healthScore} />
              <Typography variant="body2" sx={{ color: '#8b949e', mt: 2 }}>
                {healthyCount} of {totalServices} services healthy
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Card sx={{ bgcolor: '#161b22', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', height: '100%' }}>
            <CardContent sx={{ py: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#ffffff', mb: 2.5 }}>
                Incident Timeline
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
                      bgcolor: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.04)',
                    }}
                  >
                    <CircleIcon sx={{ fontSize: 10, color: incidentColors[incident.severity], mt: 0.7 }} />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" sx={{ color: '#c9d1d9', fontWeight: 500 }}>
                        {incident.title}
                      </Typography>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                        <Typography variant="caption" sx={{ color: '#8b949e' }}>
                          {incident.time}
                        </Typography>
                        <Chip
                          label={incident.status}
                          size="small"
                          sx={{
                            height: 18,
                            fontSize: '0.6rem',
                            fontWeight: 600,
                            bgcolor: incident.status === 'resolved'
                              ? 'rgba(63, 185, 80, 0.12)'
                              : incident.status === 'investigating'
                                ? 'rgba(248, 81, 73, 0.12)'
                                : 'rgba(210, 153, 34, 0.12)',
                            color: incident.status === 'resolved'
                              ? '#3fb950'
                              : incident.status === 'investigating'
                                ? '#f85149'
                                : '#d29922',
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

      {/* Service Health Grid */}
      <Typography variant="h6" sx={{ fontWeight: 600, color: '#ffffff', mb: 2 }}>
        Service Health
      </Typography>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {mockServices.map((service) => (
          <Grid item xs={12} sm={6} md={4} key={service.name}>
            <Card
              sx={{
                bgcolor: '#161b22',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '12px',
                transition: 'all 0.2s ease',
                '&:hover': { bgcolor: '#1c2128', border: '1px solid rgba(108, 99, 255, 0.15)' },
              }}
            >
              <CardContent sx={{ py: 2.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Typography variant="subtitle2" sx={{ color: '#ffffff', fontWeight: 600 }}>
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
                    <Typography variant="caption" sx={{ color: '#8b949e', display: 'block', fontSize: '0.65rem' }}>
                      Uptime
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#c9d1d9', fontWeight: 600 }}>
                      {service.uptime}%
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" sx={{ color: '#8b949e', display: 'block', fontSize: '0.65rem' }}>
                      P95 Latency
                    </Typography>
                    <Typography variant="body2" sx={{ color: service.responseTime > 150 ? '#d29922' : '#c9d1d9', fontWeight: 600 }}>
                      {service.responseTime > 0 ? `${service.responseTime}ms` : '—'}
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" sx={{ color: '#8b949e', display: 'block', fontSize: '0.65rem' }}>
                      Last Check
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#c9d1d9', fontWeight: 500, fontSize: '0.75rem' }}>
                      {service.lastCheck}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* SLO Compliance */}
      <Typography variant="h6" sx={{ fontWeight: 600, color: '#ffffff', mb: 2 }}>
        SLO Compliance
      </Typography>
      <Grid container spacing={2}>
        {mockSLOs.map((slo) => {
          const isAtRisk = slo.budget < 50;
          const isMet = slo.current >= slo.target;

          return (
            <Grid item xs={12} sm={6} key={slo.name}>
              <Card sx={{ bgcolor: '#161b22', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px' }}>
                <CardContent sx={{ py: 2.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Typography variant="subtitle2" sx={{ color: '#ffffff', fontWeight: 600 }}>
                      {slo.name}
                    </Typography>
                    <Chip
                      label={isMet ? 'Met' : 'At Risk'}
                      size="small"
                      sx={{
                        bgcolor: isMet ? 'rgba(63, 185, 80, 0.12)' : 'rgba(248, 81, 73, 0.12)',
                        color: isMet ? '#3fb950' : '#f85149',
                        fontWeight: 600,
                        fontSize: '0.65rem',
                        height: 20,
                      }}
                    />
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" sx={{ color: '#8b949e' }}>
                      Current: {slo.current}% (Target: {slo.target}%)
                    </Typography>
                    <Typography variant="caption" sx={{ color: isAtRisk ? '#d29922' : '#8b949e' }}>
                      Error budget: {slo.budget}%
                    </Typography>
                  </Box>
                  <Tooltip title={`${slo.budget}% error budget remaining`}>
                    <LinearProgress
                      variant="determinate"
                      value={slo.budget}
                      sx={{
                        height: 6,
                        borderRadius: 3,
                        bgcolor: 'rgba(255,255,255,0.06)',
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 3,
                          bgcolor: slo.budget > 70 ? '#3fb950' : slo.budget > 40 ? '#d29922' : '#f85149',
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
