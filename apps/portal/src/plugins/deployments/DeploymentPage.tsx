import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import PendingIcon from '@mui/icons-material/Pending';
import RefreshIcon from '@mui/icons-material/Refresh';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  LinearProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { platformApi } from '../../api/platformApi';
import type { Deployment } from '../../types';
import { timeAgo } from '../../utils/time';

type StatusFilter = 'all' | 'in_progress' | 'succeeded' | 'failed' | 'rolled_back';
type EnvFilter = 'all' | 'development' | 'staging' | 'production';

const statusConfig: Record<
  string,
  {
    icon: React.ReactNode;
    color: string;
    chipColor: 'success' | 'error' | 'info' | 'warning' | 'default';
  }
> = {
  pending: { icon: <PendingIcon sx={{ fontSize: 16 }} />, color: '#6475A1', chipColor: 'default' },
  in_progress: {
    icon: <RocketLaunchIcon sx={{ fontSize: 16 }} />,
    color: '#4CD7F6',
    chipColor: 'info',
  },
  succeeded: {
    icon: <CheckCircleIcon sx={{ fontSize: 16 }} />,
    color: '#58E7AB',
    chipColor: 'success',
  },
  failed: { icon: <ErrorIcon sx={{ fontSize: 16 }} />, color: '#FA746F', chipColor: 'error' },
  rolled_back: {
    icon: <ErrorIcon sx={{ fontSize: 16 }} />,
    color: '#F59E0B',
    chipColor: 'warning',
  },
};

export const DeploymentPage: React.FC = () => {
  const { t } = useTranslation();
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [envFilter, setEnvFilter] = useState<EnvFilter>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchDeployments = useCallback(async () => {
    try {
      const params: Record<string, string | number> = { pageSize: 50, sort: '-createdAt' };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (envFilter !== 'all') params.environment = envFilter;

      const response = await platformApi.deployments.list(params);
      setDeployments(response.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load deployments');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, envFilter]);

  useEffect(() => {
    void fetchDeployments();
  }, [fetchDeployments]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      void fetchDeployments();
    }, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchDeployments]);

  const activeDeployments = deployments.filter((d) => d.status === 'in_progress');
  const recentSuccesses = deployments.filter((d) => d.status === 'succeeded').length;
  const recentFailures = deployments.filter((d) => d.status === 'failed').length;
  const successRate =
    recentSuccesses + recentFailures > 0
      ? ((recentSuccesses / (recentSuccesses + recentFailures)) * 100).toFixed(1)
      : '100.0';

  return (
    <Box sx={{ maxWidth: 1440, mx: 'auto', animation: 'fadeIn 0.5s ease-out both' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#DEE5FF', fontSize: '1.5rem' }}>
            {t('deployments.title')}
          </Typography>
          <Typography variant="body2" sx={{ color: '#6475A1', mt: 0.5 }}>
            {t('deployments.subtitle')}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshIcon />}
            onClick={() => {
              void fetchDeployments();
            }}
            sx={{
              borderColor: 'rgba(100, 117, 161, 0.3)',
              color: '#DEE5FF',
              '&:hover': { borderColor: '#699CFF', bgcolor: 'rgba(105, 156, 255, 0.06)' },
            }}
          >
            {t('common.refresh')}
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            sx={{
              background: 'linear-gradient(135deg, #699CFF, #3B82F6)',
              boxShadow: '0 4px 12px rgba(105, 156, 255, 0.3)',
              '&:hover': {
                background: 'linear-gradient(135deg, #ADC6FF, #699CFF)',
              },
            }}
          >
            {t('deployments.newDeployment')}
          </Button>
        </Stack>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
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
                {activeDeployments.length}
              </Typography>
              <Typography variant="body2" sx={{ color: '#6475A1', fontSize: '0.75rem' }}>
                {t('deployments.inProgress')}
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
                {recentSuccesses}
              </Typography>
              <Typography variant="body2" sx={{ color: '#6475A1', fontSize: '0.75rem' }}>
                {t('deployments.succeeded')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
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
                {recentFailures}
              </Typography>
              <Typography variant="body2" sx={{ color: '#6475A1', fontSize: '0.75rem' }}>
                {t('deployments.failed')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card
            sx={{
              bgcolor: '#0F1E3F',
              border: '1px solid rgba(100, 117, 161, 0.2)',
              borderLeft: '3px solid #ADC6FF',
            }}
          >
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography
                variant="h3"
                sx={{ color: '#DEE5FF', fontWeight: 700, fontSize: '1.75rem' }}
              >
                {successRate}%
              </Typography>
              <Typography variant="body2" sx={{ color: '#6475A1', fontSize: '0.75rem' }}>
                {t('deployments.successRate')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {activeDeployments.length > 0 && (
        <Card sx={{ mb: 3, bgcolor: '#0F1E3F', border: '1px solid rgba(76, 215, 246, 0.2)' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <RocketLaunchIcon sx={{ color: '#4CD7F6' }} />
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 600, color: '#DEE5FF', fontSize: '0.9rem' }}
              >
                {t('deployments.activeDeployments', { count: activeDeployments.length })}
              </Typography>
            </Box>
            {activeDeployments.map((d) => (
              <Box
                key={d.id}
                sx={{
                  mb: 1.5,
                  p: 1.5,
                  borderRadius: 1,
                  bgcolor: 'rgba(76, 215, 246, 0.04)',
                  border: '1px solid rgba(76, 215, 246, 0.1)',
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 1,
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{ color: '#DEE5FF', fontWeight: 500, fontSize: '0.8rem' }}
                  >
                    {d.artifacts?.image || d.version} → {d.environment}
                  </Typography>
                  <Chip
                    label={d.strategy || 'rolling'}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: '0.65rem',
                      bgcolor: 'rgba(76, 215, 246, 0.1)',
                      color: '#4CD7F6',
                      border: '1px solid rgba(76, 215, 246, 0.2)',
                    }}
                  />
                </Box>
                <LinearProgress
                  variant="indeterminate"
                  sx={{
                    borderRadius: 1,
                    height: 4,
                    bgcolor: 'rgba(76, 215, 246, 0.1)',
                    '& .MuiLinearProgress-bar': { bgcolor: '#4CD7F6' },
                  }}
                />
              </Box>
            ))}
          </CardContent>
        </Card>
      )}

      <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel sx={{ color: '#6475A1' }}>{t('deployments.filters.status')}</InputLabel>
          <Select
            value={statusFilter}
            label={t('deployments.filters.status')}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            sx={{
              color: '#DEE5FF',
              '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(100, 117, 161, 0.3)' },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(105, 156, 255, 0.4)',
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#699CFF' },
            }}
          >
            <MenuItem value="all">{t('deployments.filters.allStatuses')}</MenuItem>
            <MenuItem value="in_progress">{t('deployments.status.in_progress')}</MenuItem>
            <MenuItem value="succeeded">{t('deployments.status.succeeded')}</MenuItem>
            <MenuItem value="failed">{t('deployments.status.failed')}</MenuItem>
            <MenuItem value="rolled_back">{t('deployments.status.rolled_back')}</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel sx={{ color: '#6475A1' }}>{t('deployments.filters.environment')}</InputLabel>
          <Select
            value={envFilter}
            label={t('deployments.filters.environment')}
            onChange={(e) => setEnvFilter(e.target.value as EnvFilter)}
            sx={{
              color: '#DEE5FF',
              '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(100, 117, 161, 0.3)' },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(105, 156, 255, 0.4)',
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#699CFF' },
            }}
          >
            <MenuItem value="all">{t('deployments.filters.allEnvironments')}</MenuItem>
            <MenuItem value="development">{t('deployments.filters.development')}</MenuItem>
            <MenuItem value="staging">{t('deployments.filters.staging')}</MenuItem>
            <MenuItem value="production">{t('deployments.filters.production')}</MenuItem>
          </Select>
        </FormControl>
        <Box sx={{ flex: 1 }} />
        <Chip
          label={autoRefresh ? t('deployments.autoRefreshOn') : t('deployments.autoRefreshOff')}
          onClick={() => setAutoRefresh(!autoRefresh)}
          variant="outlined"
          size="small"
          sx={{
            color: autoRefresh ? '#58E7AB' : '#6475A1',
            borderColor: autoRefresh ? 'rgba(88, 231, 171, 0.3)' : 'rgba(100, 117, 161, 0.2)',
          }}
        />
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <LinearProgress
          sx={{
            bgcolor: 'rgba(100, 117, 161, 0.1)',
            '& .MuiLinearProgress-bar': { bgcolor: '#699CFF' },
          }}
        />
      ) : (
        <Card sx={{ bgcolor: '#0F1E3F', border: '1px solid rgba(100, 117, 161, 0.2)' }}>
          <CardContent sx={{ p: 0 }}>
            <Box sx={{ px: 3, py: 2, borderBottom: '1px solid rgba(100, 117, 161, 0.12)' }}>
              <Typography
                variant="h6"
                sx={{ fontWeight: 600, color: '#DEE5FF', fontSize: '0.9rem' }}
              >
                {t('deployments.history')}
              </Typography>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ color: '#6475A1', fontWeight: 600 }}>
                      {t('deployments.table.status')}
                    </TableCell>
                    <TableCell sx={{ color: '#6475A1', fontWeight: 600 }}>
                      {t('deployments.table.serviceVersion')}
                    </TableCell>
                    <TableCell sx={{ color: '#6475A1', fontWeight: 600 }}>
                      {t('deployments.table.environment')}
                    </TableCell>
                    <TableCell sx={{ color: '#6475A1', fontWeight: 600 }}>
                      {t('deployments.table.strategy')}
                    </TableCell>
                    <TableCell sx={{ color: '#6475A1', fontWeight: 600 }}>
                      {t('deployments.table.time')}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {deployments.map((d, i) => {
                    const config = statusConfig[d.status] || statusConfig.pending;
                    return (
                      <TableRow
                        key={d.id}
                        sx={{
                          '&:hover': { bgcolor: 'rgba(100, 117, 161, 0.04)' },
                          animation: 'fadeIn 0.3s ease-out both',
                          animationDelay: `${i * 30}ms`,
                        }}
                      >
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ color: config.color }}>{config.icon}</Box>
                            <Chip
                              label={d.status.replace('_', ' ')}
                              size="small"
                              sx={{
                                fontSize: '0.65rem',
                                height: 20,
                                bgcolor: `${config.color}1A`,
                                color: config.color,
                                border: `1px solid ${config.color}33`,
                              }}
                            />
                          </Box>
                        </TableCell>
                        <TableCell
                          sx={{
                            color: '#DEE5FF',
                            fontFamily: '"JetBrains Mono", monospace',
                            fontSize: '0.75rem',
                          }}
                        >
                          {d.artifacts?.image || d.version}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={d.environment}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.65rem',
                              bgcolor:
                                d.environment === 'production'
                                  ? 'rgba(250, 116, 111, 0.1)'
                                  : d.environment === 'staging'
                                    ? 'rgba(245, 158, 11, 0.1)'
                                    : 'rgba(105, 156, 255, 0.1)',
                              color:
                                d.environment === 'production'
                                  ? '#FA746F'
                                  : d.environment === 'staging'
                                    ? '#F59E0B'
                                    : '#ADC6FF',
                              border: `1px solid ${
                                d.environment === 'production'
                                  ? 'rgba(250, 116, 111, 0.2)'
                                  : d.environment === 'staging'
                                    ? 'rgba(245, 158, 11, 0.2)'
                                    : 'rgba(105, 156, 255, 0.2)'
                              }`,
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ color: '#99AAD9', fontSize: '0.75rem' }}>
                          {d.strategy || 'rolling'}
                        </TableCell>
                        <TableCell sx={{ color: '#6475A1', fontSize: '0.75rem' }}>
                          {timeAgo(d.createdAt)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
            {deployments.length === 0 && (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <Typography variant="body2" sx={{ color: '#6475A1' }}>
                  No deployments found
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default DeploymentPage;
