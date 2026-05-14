import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import GitHubIcon from '@mui/icons-material/GitHub';
import LinkIcon from '@mui/icons-material/Link';
import PersonIcon from '@mui/icons-material/Person';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';

import { platformApi } from '../../api/platformApi';
import { timeAgo } from '../../utils/time';

const mockDependencies = [
  { name: 'Auth Service', type: 'runtime', status: 'healthy' },
  { name: 'PostgreSQL', type: 'database', status: 'healthy' },
  { name: 'Redis Cache', type: 'cache', status: 'healthy' },
  { name: 'Message Queue', type: 'async', status: 'degraded' },
];

const mockDeployments = [
  { id: 'd1', version: 'v2.3.1', environment: 'production', status: 'succeeded', time: '2h ago' },
  { id: 'd2', version: 'v2.3.1', environment: 'staging', status: 'succeeded', time: '4h ago' },
  { id: 'd3', version: 'v2.3.0', environment: 'production', status: 'succeeded', time: '2d ago' },
  { id: 'd4', version: 'v2.2.9', environment: 'production', status: 'failed', time: '3d ago' },
  { id: 'd5', version: 'v2.2.9', environment: 'staging', status: 'succeeded', time: '4d ago' },
];

export const ServiceDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const { serviceId } = useParams<{ serviceId: string }>();
  const navigate = useNavigate();
  const [service, setService] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!serviceId) return;
    platformApi.services
      .list({ search: serviceId })
      .then((r) => {
        const found = r.data.find((s) => s.id === serviceId || s.name === serviceId);
        if (found) {
          setService(found as unknown as Record<string, unknown>);
        } else {
          throw new Error('not found');
        }
      })
      .catch(() => {
        setService({
          id: serviceId,
          name: serviceId.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          description:
            'Core platform service handling authentication, authorization, and session management.',
          owner: 'Platform Team',
          lifecycle: 'production',
          healthStatus: 'healthy',
          uptime: 99.95,
          tags: ['typescript', 'express', 'critical'],
          repository: 'https://github.com/org/service',
          updatedAt: new Date().toISOString(),
        });
      })
      .finally(() => setLoading(false));
  }, [serviceId]);

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

  if (!service) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography sx={{ color: '#6475A1' }}>Service not found</Typography>
      </Box>
    );
  }

  const healthColor =
    service.healthStatus === 'healthy'
      ? '#58E7AB'
      : service.healthStatus === 'degraded'
        ? '#F59E0B'
        : '#FA746F';

  return (
    <Box sx={{ maxWidth: 1440, mx: 'auto', animation: 'fadeIn 0.5s ease-out both' }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/catalog')}
        sx={{ color: '#6475A1', mb: 2, '&:hover': { color: '#DEE5FF' } }}
      >
        {t('catalog.title')}
      </Button>

      <Box
        sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: healthColor }} />
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#DEE5FF', fontSize: '1.5rem' }}>
              {service.name as string}
            </Typography>
            <Chip
              label={service.lifecycle as string}
              size="small"
              sx={{
                height: 22,
                fontSize: '0.65rem',
                bgcolor: 'rgba(88, 231, 171, 0.1)',
                color: '#58E7AB',
                border: '1px solid rgba(88, 231, 171, 0.2)',
              }}
            />
          </Box>
          <Typography variant="body2" sx={{ color: '#6475A1', maxWidth: 600 }}>
            {service.description as string}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            startIcon={<GitHubIcon />}
            sx={{
              color: '#6475A1',
              borderColor: 'rgba(100, 117, 161, 0.3)',
              '&:hover': { borderColor: '#699CFF' },
            }}
            variant="outlined"
          >
            Repository
          </Button>
          <Button
            size="small"
            startIcon={<LinkIcon />}
            sx={{
              color: '#6475A1',
              borderColor: 'rgba(100, 117, 161, 0.3)',
              '&:hover': { borderColor: '#699CFF' },
            }}
            variant="outlined"
          >
            API Docs
          </Button>
        </Stack>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
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
                variant="h4"
                sx={{ color: '#58E7AB', fontWeight: 700, fontSize: '1.5rem' }}
              >
                {(service.uptime as number) || 99.95}%
              </Typography>
              <Typography variant="caption" sx={{ color: '#6475A1' }}>
                Uptime (30d)
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
                variant="h4"
                sx={{ color: '#4CD7F6', fontWeight: 700, fontSize: '1.5rem' }}
              >
                45ms
              </Typography>
              <Typography variant="caption" sx={{ color: '#6475A1' }}>
                P95 Latency
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card
            sx={{
              bgcolor: '#0F1E3F',
              border: '1px solid rgba(100, 117, 161, 0.2)',
              borderLeft: '3px solid #699CFF',
            }}
          >
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography
                variant="h4"
                sx={{ color: '#699CFF', fontWeight: 700, fontSize: '1.5rem' }}
              >
                12.4k
              </Typography>
              <Typography variant="caption" sx={{ color: '#6475A1' }}>
                Requests/min
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
                variant="h4"
                sx={{ color: '#F59E0B', fontWeight: 700, fontSize: '1.5rem' }}
              >
                0.02%
              </Typography>
              <Typography variant="caption" sx={{ color: '#6475A1' }}>
                Error Rate
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Card
            sx={{
              bgcolor: '#0F1E3F',
              border: '1px solid rgba(100, 117, 161, 0.2)',
              height: '100%',
            }}
          >
            <CardContent>
              <Typography
                variant="h6"
                sx={{ fontWeight: 600, color: '#DEE5FF', mb: 2, fontSize: '0.9rem' }}
              >
                {t('serviceDetail.dependencies')}
              </Typography>
              <Stack spacing={1.5}>
                {mockDependencies.map((dep) => (
                  <Box
                    key={dep.name}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      p: 1.5,
                      borderRadius: 1,
                      bgcolor: 'rgba(100, 117, 161, 0.04)',
                      border: '1px solid rgba(100, 117, 161, 0.1)',
                    }}
                  >
                    <Box>
                      <Typography
                        variant="body2"
                        sx={{ color: '#DEE5FF', fontWeight: 500, fontSize: '0.8rem' }}
                      >
                        {dep.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#6475A1' }}>
                        {dep.type}
                      </Typography>
                    </Box>
                    <Chip
                      label={dep.status}
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: '0.6rem',
                        bgcolor:
                          dep.status === 'healthy'
                            ? 'rgba(88, 231, 171, 0.1)'
                            : 'rgba(245, 158, 11, 0.1)',
                        color: dep.status === 'healthy' ? '#58E7AB' : '#F59E0B',
                        border: `1px solid ${dep.status === 'healthy' ? 'rgba(88, 231, 171, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`,
                      }}
                    />
                  </Box>
                ))}
              </Stack>

              <Typography
                variant="h6"
                sx={{ fontWeight: 600, color: '#DEE5FF', mt: 3, mb: 1.5, fontSize: '0.9rem' }}
              >
                {t('serviceDetail.metadata')}
              </Typography>
              <Stack spacing={1}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" sx={{ color: '#6475A1' }}>
                    Owner
                  </Typography>
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <PersonIcon sx={{ fontSize: 14, color: '#699CFF' }} />
                    <Typography variant="caption" sx={{ color: '#DEE5FF' }}>
                      {service.owner as string}
                    </Typography>
                  </Stack>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" sx={{ color: '#6475A1' }}>
                    Last Updated
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#DEE5FF' }}>
                    {timeAgo(service.updatedAt as string)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" sx={{ color: '#6475A1' }}>
                    Tags
                  </Typography>
                  <Stack direction="row" spacing={0.5}>
                    {((service.tags as string[]) || []).map((tag) => (
                      <Chip
                        key={tag}
                        label={tag}
                        size="small"
                        sx={{
                          height: 18,
                          fontSize: '0.6rem',
                          bgcolor: 'rgba(100, 117, 161, 0.08)',
                          color: '#99AAD9',
                        }}
                      />
                    ))}
                  </Stack>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={7}>
          <Card sx={{ bgcolor: '#0F1E3F', border: '1px solid rgba(100, 117, 161, 0.2)' }}>
            <CardContent sx={{ p: 0 }}>
              <Box
                sx={{
                  px: 3,
                  py: 2,
                  borderBottom: '1px solid rgba(100, 117, 161, 0.12)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 600, color: '#DEE5FF', fontSize: '0.9rem' }}
                >
                  {t('serviceDetail.recentDeployments')}
                </Typography>
                <Button
                  size="small"
                  startIcon={<RocketLaunchIcon sx={{ fontSize: 14 }} />}
                  sx={{ color: '#699CFF', fontSize: '0.75rem' }}
                >
                  Deploy
                </Button>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ color: '#6475A1' }}>Status</TableCell>
                      <TableCell sx={{ color: '#6475A1' }}>Version</TableCell>
                      <TableCell sx={{ color: '#6475A1' }}>Environment</TableCell>
                      <TableCell sx={{ color: '#6475A1' }}>Time</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {mockDeployments.map((d) => (
                      <TableRow
                        key={d.id}
                        sx={{ '&:hover': { bgcolor: 'rgba(100, 117, 161, 0.04)' } }}
                      >
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {d.status === 'succeeded' ? (
                              <CheckCircleIcon sx={{ fontSize: 14, color: '#58E7AB' }} />
                            ) : (
                              <ErrorIcon sx={{ fontSize: 14, color: '#FA746F' }} />
                            )}
                            <Typography
                              variant="caption"
                              sx={{ color: d.status === 'succeeded' ? '#58E7AB' : '#FA746F' }}
                            >
                              {d.status}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell
                          sx={{
                            color: '#DEE5FF',
                            fontFamily: '"JetBrains Mono", monospace',
                            fontSize: '0.75rem',
                          }}
                        >
                          {d.version}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={d.environment}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.6rem',
                              bgcolor:
                                d.environment === 'production'
                                  ? 'rgba(250, 116, 111, 0.1)'
                                  : 'rgba(105, 156, 255, 0.1)',
                              color: d.environment === 'production' ? '#FA746F' : '#ADC6FF',
                              border: `1px solid ${d.environment === 'production' ? 'rgba(250, 116, 111, 0.2)' : 'rgba(105, 156, 255, 0.2)'}`,
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ color: '#6475A1', fontSize: '0.75rem' }}>
                          {d.time}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ServiceDetailPage;
