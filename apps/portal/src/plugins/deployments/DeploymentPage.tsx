import React, { useState, useEffect } from 'react';
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
} from '@mui/material';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import PendingIcon from '@mui/icons-material/Pending';
import RefreshIcon from '@mui/icons-material/Refresh';
import { DeploymentTimeline } from './DeploymentTimeline';
import { platformApi } from '../../api/platformApi';
import type { Deployment } from '../../types';

type DeploymentStatusFilter = 'all' | 'in_progress' | 'succeeded' | 'failed' | 'rolled_back';

const statusIcons: Record<string, React.ReactNode> = {
  pending: <PendingIcon color="action" />,
  in_progress: <RocketLaunchIcon color="info" />,
  succeeded: <CheckCircleIcon color="success" />,
  failed: <ErrorIcon color="error" />,
  rolled_back: <ErrorIcon color="warning" />,
};

const statusColors: Record<string, 'default' | 'info' | 'success' | 'error' | 'warning'> = {
  pending: 'default',
  in_progress: 'info',
  succeeded: 'success',
  failed: 'error',
  rolled_back: 'warning',
};

export const DeploymentPage: React.FC = () => {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<DeploymentStatusFilter>('all');
  const [environmentFilter, setEnvironmentFilter] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchDeployments = async () => {
    try {
      const params: Record<string, string | number> = {
        pageSize: 50,
        sort: '-createdAt',
      };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (environmentFilter !== 'all') params.environment = environmentFilter;

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
  }, [statusFilter, environmentFilter]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchDeployments, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, statusFilter, environmentFilter]);

  const activeDeployments = deployments.filter((d) => d.status === 'in_progress');
  const recentSuccesses = deployments.filter((d) => d.status === 'succeeded').length;
  const recentFailures = deployments.filter((d) => d.status === 'failed').length;
  const successRate =
    recentSuccesses + recentFailures > 0
      ? ((recentSuccesses / (recentSuccesses + recentFailures)) * 100).toFixed(1)
      : '100.0';

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Deployments
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Monitor and manage deployment pipelines across all environments
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchDeployments}
            size="small"
          >
            Refresh
          </Button>
          <Chip
            label={autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
            color={autoRefresh ? 'success' : 'default'}
            onClick={() => setAutoRefresh(!autoRefresh)}
            variant="outlined"
            size="small"
          />
        </Stack>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h3" color="info.main">
                {activeDeployments.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                In Progress
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h3" color="success.main">
                {recentSuccesses}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Succeeded
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h3" color="error.main">
                {recentFailures}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Failed
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h3" color="text.primary">
                {successRate}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Success Rate
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Active Deployments */}
      {activeDeployments.length > 0 && (
        <Alert severity="info" sx={{ mb: 3 }} icon={<RocketLaunchIcon />}>
          <Typography variant="body2">
            <strong>{activeDeployments.length} deployment(s) in progress:</strong>{' '}
            {activeDeployments.map((d) => `${d.artifacts?.image || d.version} → ${d.environment}`).join(', ')}
          </Typography>
          <LinearProgress sx={{ mt: 1 }} />
        </Alert>
      )}

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel id="status-filter-label">Status</InputLabel>
          <Select
            labelId="status-filter-label"
            value={statusFilter}
            label="Status"
            onChange={(e) => setStatusFilter(e.target.value as DeploymentStatusFilter)}
          >
            <MenuItem value="all">All Statuses</MenuItem>
            <MenuItem value="in_progress">In Progress</MenuItem>
            <MenuItem value="succeeded">Succeeded</MenuItem>
            <MenuItem value="failed">Failed</MenuItem>
            <MenuItem value="rolled_back">Rolled Back</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel id="env-filter-label">Environment</InputLabel>
          <Select
            labelId="env-filter-label"
            value={environmentFilter}
            label="Environment"
            onChange={(e) => setEnvironmentFilter(e.target.value)}
          >
            <MenuItem value="all">All Environments</MenuItem>
            <MenuItem value="production">Production</MenuItem>
            <MenuItem value="staging">Staging</MenuItem>
            <MenuItem value="development">Development</MenuItem>
            <MenuItem value="preview">Preview</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Error State */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Deployment Timeline */}
      {loading ? (
        <LinearProgress />
      ) : (
        <DeploymentTimeline
          deployments={deployments}
          statusIcons={statusIcons}
          statusColors={statusColors}
        />
      )}
    </Box>
  );
};

export default DeploymentPage;
