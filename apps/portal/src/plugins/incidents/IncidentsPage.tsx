import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CircleIcon from '@mui/icons-material/Circle';
import ErrorIcon from '@mui/icons-material/Error';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import WarningIcon from '@mui/icons-material/Warning';
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
} from '@mui/material';
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

type Severity = 'critical' | 'warning' | 'info';
type Status = 'investigating' | 'monitoring' | 'resolved';

interface Incident {
  id: string;
  title: string;
  severity: Severity;
  status: Status;
  affectedServices: string[];
  startedAt: string;
  resolvedAt?: string;
  assignee: string;
  timeline: { time: string; message: string; actor: string }[];
}

const mockIncidents: Incident[] = [
  {
    id: 'inc-001',
    title: 'Notification Service unreachable',
    severity: 'critical',
    status: 'investigating',
    affectedServices: ['Notification Service', 'Email Gateway'],
    startedAt: '2025-01-15T10:10:00Z',
    assignee: 'jane.smith',
    timeline: [
      { time: '10:10', message: 'Alert triggered: service health check failed', actor: 'system' },
      { time: '10:12', message: 'Incident created and on-call paged', actor: 'system' },
      {
        time: '10:15',
        message: 'Investigating — checking pod logs and network',
        actor: 'jane.smith',
      },
    ],
  },
  {
    id: 'inc-002',
    title: 'Cache Layer high latency (>200ms)',
    severity: 'warning',
    status: 'monitoring',
    affectedServices: ['Cache Layer', 'API Gateway'],
    startedAt: '2025-01-15T09:58:00Z',
    assignee: 'john.doe',
    timeline: [
      { time: '09:58', message: 'P95 latency exceeded 200ms threshold', actor: 'system' },
      { time: '10:02', message: 'Scaled Redis replicas from 2 to 4', actor: 'john.doe' },
      { time: '10:08', message: 'Latency decreasing, monitoring', actor: 'john.doe' },
    ],
  },
  {
    id: 'inc-003',
    title: 'Database failover completed',
    severity: 'info',
    status: 'resolved',
    affectedServices: ['PostgreSQL Primary'],
    startedAt: '2025-01-15T06:30:00Z',
    resolvedAt: '2025-01-15T06:35:00Z',
    assignee: 'system',
    timeline: [
      { time: '06:30', message: 'Primary database health check failed', actor: 'system' },
      { time: '06:31', message: 'Automatic failover initiated to replica', actor: 'system' },
      { time: '06:35', message: 'Failover complete, all connections restored', actor: 'system' },
    ],
  },
  {
    id: 'inc-004',
    title: 'API rate limit threshold reached',
    severity: 'warning',
    status: 'resolved',
    affectedServices: ['API Gateway'],
    startedAt: '2025-01-14T14:20:00Z',
    resolvedAt: '2025-01-14T14:45:00Z',
    assignee: 'jane.smith',
    timeline: [
      { time: '14:20', message: 'Rate limit 80% threshold breached', actor: 'system' },
      { time: '14:30', message: 'Identified bot traffic spike from IP range', actor: 'jane.smith' },
      { time: '14:45', message: 'Added IP block rule, traffic normalized', actor: 'jane.smith' },
    ],
  },
];

const severityConfig = {
  critical: {
    color: '#FA746F',
    bg: 'rgba(250, 116, 111, 0.1)',
    icon: <ErrorIcon sx={{ fontSize: 18, color: '#FA746F' }} />,
  },
  warning: {
    color: '#F59E0B',
    bg: 'rgba(245, 158, 11, 0.1)',
    icon: <WarningIcon sx={{ fontSize: 18, color: '#F59E0B' }} />,
  },
  info: {
    color: '#699CFF',
    bg: 'rgba(105, 156, 255, 0.1)',
    icon: <CircleIcon sx={{ fontSize: 18, color: '#699CFF' }} />,
  },
};

const statusConfig = {
  investigating: { color: '#FA746F', label: 'Investigating' },
  monitoring: { color: '#F59E0B', label: 'Monitoring' },
  resolved: { color: '#58E7AB', label: 'Resolved' },
};

export const IncidentsPage: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'resolved'>('all');

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const activeCount = mockIncidents.filter((i) => i.status !== 'resolved').length;
  const criticalCount = mockIncidents.filter(
    (i) => i.severity === 'critical' && i.status !== 'resolved',
  ).length;

  const filteredIncidents = mockIncidents.filter((i) => {
    if (filter === 'active') return i.status !== 'resolved';
    if (filter === 'resolved') return i.status === 'resolved';
    return true;
  });

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

  return (
    <Box sx={{ maxWidth: 1440, mx: 'auto', animation: 'fadeIn 0.5s ease-out both' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#DEE5FF', fontSize: '1.5rem' }}>
            {t('incidents.title')}
          </Typography>
          <Typography variant="body2" sx={{ color: '#6475A1', mt: 0.5 }}>
            {t('incidents.subtitle')}
          </Typography>
        </Box>
        <Button
          variant="contained"
          size="small"
          startIcon={<NotificationsActiveIcon />}
          sx={{
            background: 'linear-gradient(135deg, #FA746F, #e05550)',
            boxShadow: '0 4px 12px rgba(250, 116, 111, 0.3)',
            '&:hover': { background: 'linear-gradient(135deg, #FA746F, #c94440)' },
          }}
        >
          {t('incidents.declare')}
        </Button>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Card
            sx={{
              bgcolor: '#0F1E3F',
              border: '1px solid rgba(100, 117, 161, 0.2)',
              borderLeft: '3px solid #FA746F',
            }}
          >
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography
                variant="h3"
                sx={{ color: '#FA746F', fontWeight: 700, fontSize: '1.75rem' }}
              >
                {criticalCount}
              </Typography>
              <Typography variant="caption" sx={{ color: '#6475A1' }}>
                {t('incidents.critical')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card
            sx={{
              bgcolor: '#0F1E3F',
              border: '1px solid rgba(100, 117, 161, 0.2)',
              borderLeft: '3px solid #F59E0B',
            }}
          >
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography
                variant="h3"
                sx={{ color: '#F59E0B', fontWeight: 700, fontSize: '1.75rem' }}
              >
                {activeCount}
              </Typography>
              <Typography variant="caption" sx={{ color: '#6475A1' }}>
                {t('incidents.active')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card
            sx={{
              bgcolor: '#0F1E3F',
              border: '1px solid rgba(100, 117, 161, 0.2)',
              borderLeft: '3px solid #58E7AB',
            }}
          >
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography
                variant="h3"
                sx={{ color: '#58E7AB', fontWeight: 700, fontSize: '1.75rem' }}
              >
                {mockIncidents.length - activeCount}
              </Typography>
              <Typography variant="caption" sx={{ color: '#6475A1' }}>
                {t('incidents.resolved')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card
            sx={{
              bgcolor: '#0F1E3F',
              border: '1px solid rgba(100, 117, 161, 0.2)',
              borderLeft: '3px solid #4CD7F6',
            }}
          >
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography
                variant="h3"
                sx={{ color: '#4CD7F6', fontWeight: 700, fontSize: '1.75rem' }}
              >
                5m
              </Typography>
              <Typography variant="caption" sx={{ color: '#6475A1' }}>
                {t('incidents.mttr')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
        {(['all', 'active', 'resolved'] as const).map((f) => (
          <Chip
            key={f}
            label={f.charAt(0).toUpperCase() + f.slice(1)}
            onClick={() => setFilter(f)}
            variant={filter === f ? 'filled' : 'outlined'}
            sx={{
              bgcolor: filter === f ? 'rgba(105, 156, 255, 0.12)' : 'transparent',
              color: filter === f ? '#ADC6FF' : '#6475A1',
              borderColor: filter === f ? '#699CFF' : 'rgba(100, 117, 161, 0.2)',
              '&:hover': { bgcolor: 'rgba(105, 156, 255, 0.08)' },
            }}
          />
        ))}
      </Stack>

      <Stack spacing={2}>
        {filteredIncidents.map((incident) => {
          const sev = severityConfig[incident.severity];
          const stat = statusConfig[incident.status];
          return (
            <Card
              key={incident.id}
              sx={{
                bgcolor: '#0F1E3F',
                border: `1px solid ${incident.status !== 'resolved' ? `${sev.color}33` : 'rgba(100, 117, 161, 0.2)'}`,
                '&:hover': { borderColor: sev.color + '66' },
                transition: 'border-color 0.2s ease',
              }}
            >
              <CardContent sx={{ py: 2.5 }}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    mb: 2,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    {sev.icon}
                    <Box>
                      <Typography
                        variant="subtitle1"
                        sx={{ color: '#DEE5FF', fontWeight: 600, fontSize: '0.9rem' }}
                      >
                        {incident.title}
                      </Typography>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                        <Chip
                          label={incident.severity}
                          size="small"
                          sx={{
                            height: 18,
                            fontSize: '0.6rem',
                            bgcolor: sev.bg,
                            color: sev.color,
                            border: `1px solid ${sev.color}33`,
                          }}
                        />
                        <Chip
                          label={stat.label}
                          size="small"
                          sx={{
                            height: 18,
                            fontSize: '0.6rem',
                            bgcolor: `${stat.color}1A`,
                            color: stat.color,
                            border: `1px solid ${stat.color}33`,
                          }}
                        />
                        <Typography variant="caption" sx={{ color: '#6475A1' }}>
                          {new Date(incident.startedAt).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Typography>
                      </Stack>
                    </Box>
                  </Box>
                  {incident.status !== 'resolved' && (
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<CheckCircleIcon sx={{ fontSize: 14 }} />}
                      sx={{
                        borderColor: 'rgba(88, 231, 171, 0.3)',
                        color: '#58E7AB',
                        fontSize: '0.7rem',
                        '&:hover': { borderColor: '#58E7AB' },
                      }}
                    >
                      Resolve
                    </Button>
                  )}
                </Box>

                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <Typography variant="caption" sx={{ color: '#6475A1' }}>
                    Affected:
                  </Typography>
                  {incident.affectedServices.map((s) => (
                    <Chip
                      key={s}
                      label={s}
                      size="small"
                      sx={{
                        height: 18,
                        fontSize: '0.6rem',
                        bgcolor: 'rgba(100, 117, 161, 0.08)',
                        color: '#99AAD9',
                      }}
                    />
                  ))}
                </Box>

                <Box sx={{ pl: 1, borderLeft: '2px solid rgba(100, 117, 161, 0.15)' }}>
                  {incident.timeline.map((event, idx) => (
                    <Box key={idx} sx={{ display: 'flex', gap: 1.5, py: 0.5 }}>
                      <Typography
                        variant="caption"
                        sx={{
                          color: '#6475A1',
                          fontFamily: '"JetBrains Mono", monospace',
                          minWidth: 40,
                        }}
                      >
                        {event.time}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#99AAD9' }}>
                        {event.message}
                        <Typography component="span" variant="caption" sx={{ color: '#6475A1' }}>
                          {' '}
                          — {event.actor}
                        </Typography>
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          );
        })}
      </Stack>
    </Box>
  );
};

export default IncidentsPage;
