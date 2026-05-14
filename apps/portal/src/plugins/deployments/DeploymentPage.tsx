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
  useTheme,
  alpha,
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
  pending: { icon: <PendingIcon sx={{ fontSize: 16 }} />, color: '#8b949e', chipColor: 'default' },
  in_progress: {
    icon: <RocketLaunchIcon sx={{ fontSize: 16 }} />,
    color: '#2196f3',
    chipColor: 'info',
  },
  succeeded: {
    icon: <CheckCircleIcon sx={{ fontSize: 16 }} />,
    color: '#4caf50',
    chipColor: 'success',
  },
  failed: { icon: <ErrorIcon sx={{ fontSize: 16 }} />, color: '#f44336', chipColor: 'error' },
  rolled_back: {
    icon: <ErrorIcon sx={{ fontSize: 16 }} />,
    color: '#ff9800',
    chipColor: 'warning',
  },
};

export const DeploymentPage: React.FC = () => {
  const theme = useTheme();
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
          <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
            {t('deployments.title')}
          </Typography>
          <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mt: 0.5 }}>
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
            sx={{ borderColor: theme.palette.divider, color: theme.palette.text.primary }}
          >
            {t('common.refresh')}
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            sx={{
              background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
              '&:hover': {
                background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
              },
            }}
          >
            {t('deployments.newDeployment')}
          </Button>
        </Stack>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h3" sx={{ color: theme.palette.info.main, fontWeight: 700 }}>
                {activeDeployments.length}
              </Typography>
              <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                {t('deployments.inProgress')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h3" sx={{ color: theme.palette.success.main, fontWeight: 700 }}>
                {recentSuccesses}
              </Typography>
              <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                {t('deployments.succeeded')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h3" sx={{ color: theme.palette.error.main, fontWeight: 700 }}>
                {recentFailures}
              </Typography>
              <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                {t('deployments.failed')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h3" sx={{ color: theme.palette.text.primary, fontWeight: 700 }}>
                {successRate}%
              </Typography>
              <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                {t('deployments.successRate')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {activeDeployments.length > 0 && (
        <Card sx={{ mb: 3, borderColor: alpha(theme.palette.info.main, 0.3) }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <RocketLaunchIcon sx={{ color: theme.palette.info.main }} />
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 600, color: theme.palette.text.primary }}
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
                  bgcolor: alpha(theme.palette.info.main, 0.04),
                  border: `1px solid ${alpha(theme.palette.info.main, 0.1)}`,
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
                    sx={{ color: theme.palette.text.primary, fontWeight: 500 }}
                  >
                    {d.artifacts?.image || d.version} → {d.environment}
                  </Typography>
                  <Chip
                    label={d.strategy || 'rolling'}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: '0.65rem',
                      bgcolor: alpha(theme.palette.info.main, 0.1),
                      color: theme.palette.info.main,
                    }}
                  />
                </Box>
                <LinearProgress
                  variant="indeterminate"
                  sx={{
                    borderRadius: 1,
                    height: 4,
                    bgcolor: alpha(theme.palette.info.main, 0.1),
                    '& .MuiLinearProgress-bar': { bgcolor: theme.palette.info.main },
                  }}
                />
              </Box>
            ))}
          </CardContent>
        </Card>
      )}

      <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>{t('deployments.filters.status')}</InputLabel>
          <Select
            value={statusFilter}
            label={t('deployments.filters.status')}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          >
            <MenuItem value="all">{t('deployments.filters.allStatuses')}</MenuItem>
            <MenuItem value="in_progress">{t('deployments.status.in_progress')}</MenuItem>
            <MenuItem value="succeeded">{t('deployments.status.succeeded')}</MenuItem>
            <MenuItem value="failed">{t('deployments.status.failed')}</MenuItem>
            <MenuItem value="rolled_back">{t('deployments.status.rolled_back')}</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>{t('deployments.filters.environment')}</InputLabel>
          <Select
            value={envFilter}
            label={t('deployments.filters.environment')}
            onChange={(e) => setEnvFilter(e.target.value as EnvFilter)}
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
            color: autoRefresh ? theme.palette.success.main : theme.palette.text.secondary,
            borderColor: autoRefresh ? theme.palette.success.main : theme.palette.divider,
          }}
        />
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <LinearProgress />
      ) : (
        <Card>
          <CardContent sx={{ p: 0 }}>
            <Box sx={{ px: 3, py: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                {t('deployments.history')}
              </Typography>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ color: theme.palette.text.secondary, fontWeight: 600 }}>
                      {t('deployments.table.status')}
                    </TableCell>
                    <TableCell sx={{ color: theme.palette.text.secondary, fontWeight: 600 }}>
                      {t('deployments.table.serviceVersion')}
                    </TableCell>
                    <TableCell sx={{ color: theme.palette.text.secondary, fontWeight: 600 }}>
                      {t('deployments.table.environment')}
                    </TableCell>
                    <TableCell sx={{ color: theme.palette.text.secondary, fontWeight: 600 }}>
                      {t('deployments.table.strategy')}
                    </TableCell>
                    <TableCell sx={{ color: theme.palette.text.secondary, fontWeight: 600 }}>
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
                          '&:hover': { bgcolor: alpha(theme.palette.text.primary, 0.02) },
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
                              color={config.chipColor}
                              variant="outlined"
                              sx={{ fontSize: '0.7rem', height: 22 }}
                            />
                          </Box>
                        </TableCell>
                        <TableCell sx={{ color: theme.palette.text.primary }}>
                          {d.artifacts?.image || d.version}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={d.environment}
                            size="small"
                            sx={{
                              height: 22,
                              fontSize: '0.7rem',
                              bgcolor:
                                d.environment === 'production'
                                  ? alpha(theme.palette.error.main, 0.1)
                                  : d.environment === 'staging'
                                    ? alpha(theme.palette.warning.main, 0.1)
                                    : alpha(theme.palette.primary.main, 0.1),
                              color:
                                d.environment === 'production'
                                  ? theme.palette.error.main
                                  : d.environment === 'staging'
                                    ? theme.palette.warning.main
                                    : theme.palette.primary.main,
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ color: theme.palette.text.secondary }}>
                          {d.strategy || 'rolling'}
                        </TableCell>
                        <TableCell sx={{ color: theme.palette.text.secondary }}>
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
                <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
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
