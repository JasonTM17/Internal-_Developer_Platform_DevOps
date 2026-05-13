import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Chip, Button,
  FormControl, InputLabel, Select, MenuItem, Alert, LinearProgress,
  Stack, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, IconButton, Tooltip,
} from '@mui/material';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import PendingIcon from '@mui/icons-material/Pending';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import { platformApi } from '../../api/platformApi';
import type { Deployment } from '../../types';

type StatusFilter = 'all' | 'in_progress' | 'succeeded' | 'failed' | 'rolled_back';
type EnvFilter = 'all' | 'development' | 'staging' | 'production';

const statusConfig: Record<string, { icon: React.ReactNode; color: string; chipColor: 'success' | 'error' | 'info' | 'warning' | 'default' }> = {
  pending: { icon: <PendingIcon sx={{ fontSize: 16 }} />, color: '#8b949e', chipColor: 'default' },
  in_progress: { icon: <RocketLaunchIcon sx={{ fontSize: 16 }} />, color: '#2196f3', chipColor: 'info' },
  succeeded: { icon: <CheckCircleIcon sx={{ fontSize: 16 }} />, color: '#4caf50', chipColor: 'success' },
  failed: { icon: <ErrorIcon sx={{ fontSize: 16 }} />, color: '#f44336', chipColor: 'error' },
  rolled_back: { icon: <ErrorIcon sx={{ fontSize: 16 }} />, color: '#ff9800', chipColor: 'warning' },
};

export const DeploymentPage: React.FC = () => {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [envFilter, setEnvFilter] = useState<EnvFilter>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchDeployments = async () => {
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
  };

  useEffect(() => {
    fetchDeployments();
  }, [statusFilter, envFilter]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchDeployments, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, statusFilter, envFilter]);

  const activeDeployments = deployments.filter((d) => d.status === 'in_progress');
  const recentSuccesses = deployments.filter((d) => d.status === 'succeeded').length;
  const recentFailures = deployments.filter((d) => d.status === 'failed').length;
  const successRate = recentSuccesses + recentFailures > 0
    ? ((recentSuccesses / (recentSuccesses + recentFailures)) * 100).toFixed(1)
    : '100.0';

  const timeAgo = (d: string) => {
    const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
  };

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', animation: 'fadeIn 0.5s ease-out both' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'white' }}>Deployments</Typography>
          <Typography variant="body2" sx={{ color: '#8b949e', mt: 0.5 }}>
            Monitor and manage deployment pipelines across all environments
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" size="small" startIcon={<RefreshIcon />} onClick={fetchDeployments}
            sx={{ borderColor: 'rgba(255,255,255,0.1)', color: '#c9d1d9' }}>
            Refresh
          </Button>
          <Button variant="contained" size="small" startIcon={<AddIcon />}
            sx={{ background: 'linear-gradient(135deg, #6C63FF, #8B83FF)', '&:hover': { background: 'linear-gradient(135deg, #4B44B2, #6C63FF)' } }}>
            New Deployment
          </Button>
        </Stack>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Card sx={{ bgcolor: '#161b22', border: '1px solid rgba(255,255,255,0.06)' }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h3" sx={{ color: '#2196f3', fontWeight: 700 }}>
                {activeDeployments.length}
              </Typography>
              <Typography variant="body2" sx={{ color: '#8b949e' }}>In Progress</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card sx={{ bgcolor: '#161b22', border: '1px solid rgba(255,255,255,0.06)' }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h3" sx={{ color: '#4caf50', fontWeight: 700 }}>
                {recentSuccesses}
              </Typography>
              <Typography variant="body2" sx={{ color: '#8b949e' }}>Succeeded</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card sx={{ bgcolor: '#161b22', border: '1px solid rgba(255,255,255,0.06)' }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h3" sx={{ color: '#f44336', fontWeight: 700 }}>
                {recentFailures}
              </Typography>
              <Typography variant="body2" sx={{ color: '#8b949e' }}>Failed</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card sx={{ bgcolor: '#161b22', border: '1px solid rgba(255,255,255,0.06)' }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h3" sx={{ color: 'white', fontWeight: 700 }}>
                {successRate}%
              </Typography>
              <Typography variant="body2" sx={{ color: '#8b949e' }}>Success Rate</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Active Deployments with Progress */}
      {activeDeployments.length > 0 && (
        <Card sx={{ mb: 3, bgcolor: '#161b22', border: '1px solid rgba(33,150,243,0.3)' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <RocketLaunchIcon sx={{ color: '#2196f3' }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'white' }}>
                Active Deployments ({activeDeployments.length})
              </Typography>
            </Box>
            {activeDeployments.map((d) => (
              <Box key={d.id} sx={{ mb: 1.5, p: 1.5, borderRadius: 1, bgcolor: 'rgba(33,150,243,0.05)', border: '1px solid rgba(33,150,243,0.1)' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="body2" sx={{ color: '#c9d1d9', fontWeight: 500 }}>
                    {d.artifacts?.image || d.version} → {d.environment}
                  </Typography>
                  <Chip label={d.strategy || 'rolling'} size="small" sx={{ height: 20, fontSize: '0.65rem', bgcolor: 'rgba(33,150,243,0.1)', color: '#2196f3' }} />
                </Box>
                <LinearProgress variant="indeterminate" sx={{ borderRadius: 1, height: 4, bgcolor: 'rgba(33,150,243,0.1)', '& .MuiLinearProgress-bar': { bgcolor: '#2196f3' } }} />
              </Box>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel sx={{ color: '#8b949e' }}>Status</InputLabel>
          <Select value={statusFilter} label="Status" onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            sx={{ bgcolor: '#161b22', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.08)' } }}>
            <MenuItem value="all">All Statuses</MenuItem>
            <MenuItem value="in_progress">In Progress</MenuItem>
            <MenuItem value="succeeded">Succeeded</MenuItem>
            <MenuItem value="failed">Failed</MenuItem>
            <MenuItem value="rolled_back">Rolled Back</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel sx={{ color: '#8b949e' }}>Environment</InputLabel>
          <Select value={envFilter} label="Environment" onChange={(e) => setEnvFilter(e.target.value as EnvFilter)}
            sx={{ bgcolor: '#161b22', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.08)' } }}>
            <MenuItem value="all">All Environments</MenuItem>
            <MenuItem value="development">Development</MenuItem>
            <MenuItem value="staging">Staging</MenuItem>
            <MenuItem value="production">Production</MenuItem>
          </Select>
        </FormControl>
        <Box sx={{ flex: 1 }} />
        <Chip
          label={autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          onClick={() => setAutoRefresh(!autoRefresh)}
          variant="outlined"
          size="small"
          sx={{ color: autoRefresh ? '#4caf50' : '#8b949e', borderColor: autoRefresh ? '#4caf50' : 'rgba(255,255,255,0.08)' }}
        />
      </Box>

      {/* Error */}
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Deployment History Table */}
      {loading ? (
        <LinearProgress />
      ) : (
        <Card sx={{ bgcolor: '#161b22', border: '1px solid rgba(255,255,255,0.06)' }}>
          <CardContent sx={{ p: 0 }}>
            <Box sx={{ px: 3, py: 2, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: 'white' }}>Deployment History</Typography>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ color: '#8b949e', borderColor: 'rgba(255,255,255,0.06)', fontWeight: 600 }}>Status</TableCell>
                    <TableCell sx={{ color: '#8b949e', borderColor: 'rgba(255,255,255,0.06)', fontWeight: 600 }}>Service / Version</TableCell>
                    <TableCell sx={{ color: '#8b949e', borderColor: 'rgba(255,255,255,0.06)', fontWeight: 600 }}>Environment</TableCell>
                    <TableCell sx={{ color: '#8b949e', borderColor: 'rgba(255,255,255,0.06)', fontWeight: 600 }}>Strategy</TableCell>
                    <TableCell sx={{ color: '#8b949e', borderColor: 'rgba(255,255,255,0.06)', fontWeight: 600 }}>Time</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {deployments.map((d, i) => {
                    const config = statusConfig[d.status] || statusConfig.pending;
                    return (
                      <TableRow key={d.id} sx={{
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' },
                        animation: 'fadeIn 0.3s ease-out both', animationDelay: `${i * 30}ms`,
                      }}>
                        <TableCell sx={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ color: config.color }}>{config.icon}</Box>
                            <Chip label={d.status.replace('_', ' ')} size="small" color={config.chipColor}
                              variant="outlined" sx={{ fontSize: '0.7rem', height: 22 }} />
                          </Box>
                        </TableCell>
                        <TableCell sx={{ color: '#c9d1d9', borderColor: 'rgba(255,255,255,0.04)' }}>
                          {d.artifacts?.image || d.version}
                        </TableCell>
                        <TableCell sx={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                          <Chip label={d.environment} size="small" sx={{
                            height: 22, fontSize: '0.7rem',
                            bgcolor: d.environment === 'production' ? 'rgba(244,67,54,0.1)' : d.environment === 'staging' ? 'rgba(255,152,0,0.1)' : 'rgba(108,99,255,0.1)',
                            color: d.environment === 'production' ? '#f44336' : d.environment === 'staging' ? '#ff9800' : '#6C63FF',
                          }} />
                        </TableCell>
                        <TableCell sx={{ color: '#8b949e', borderColor: 'rgba(255,255,255,0.04)' }}>
                          {d.strategy || 'rolling'}
                        </TableCell>
                        <TableCell sx={{ color: '#8b949e', borderColor: 'rgba(255,255,255,0.04)' }}>
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
                <Typography variant="body2" sx={{ color: '#8b949e' }}>No deployments found</Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default DeploymentPage;
