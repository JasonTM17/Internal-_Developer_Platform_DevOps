import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  Button,
  IconButton,
  Tooltip,
  LinearProgress,
  Alert,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloudIcon from '@mui/icons-material/Cloud';
import TimerIcon from '@mui/icons-material/Timer';
import { ProvisionForm } from './ProvisionForm';
import { platformApi } from '../../api/platformApi';
import type { Environment } from '../../types';

const statusColors: Record<string, 'success' | 'info' | 'warning' | 'error' | 'default'> = {
  active: 'success',
  provisioning: 'info',
  updating: 'info',
  destroying: 'warning',
  destroyed: 'default',
  failed: 'error',
};

export const EnvironmentPage: React.FC = () => {
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showProvisionForm, setShowProvisionForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchEnvironments = async () => {
    try {
      const response = await platformApi.environments.list({ pageSize: 50 });
      setEnvironments(response.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load environments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnvironments();
    const interval = setInterval(fetchEnvironments, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleDelete = async (envId: string) => {
    if (!window.confirm('Are you sure you want to destroy this environment? This action cannot be undone.')) {
      return;
    }

    setDeletingId(envId);
    try {
      await platformApi.environments.delete(envId);
      fetchEnvironments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to destroy environment');
    } finally {
      setDeletingId(null);
    }
  };

  const formatTTL = (expiresAt: string | undefined): string => {
    if (!expiresAt) return 'No expiry';
    const expires = new Date(expiresAt);
    const now = new Date();
    const diffHours = Math.max(0, Math.floor((expires.getTime() - now.getTime()) / (1000 * 60 * 60)));
    if (diffHours > 48) return `${Math.floor(diffHours / 24)}d remaining`;
    return `${diffHours}h remaining`;
  };

  const activeEnvs = environments.filter((e) => e.status === 'active');
  const provisioningEnvs = environments.filter((e) => e.status === 'provisioning');
  const previewEnvs = environments.filter((e) => e.type === 'preview');

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto', animation: 'fadeIn 0.5s ease-out both' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Environments
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Provision and manage deployment environments
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchEnvironments} size="small">
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setShowProvisionForm(true)}
          >
            New Environment
          </Button>
        </Stack>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h3" color="success.main">{activeEnvs.length}</Typography>
              <Typography variant="body2" color="text.secondary">Active</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h3" color="info.main">{provisioningEnvs.length}</Typography>
              <Typography variant="body2" color="text.secondary">Provisioning</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h3" color="text.primary">{previewEnvs.length}</Typography>
              <Typography variant="body2" color="text.secondary">Preview Envs</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h3" color="text.primary">{environments.length}</Typography>
              <Typography variant="body2" color="text.secondary">Total</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Provisioning Alert */}
      {provisioningEnvs.length > 0 && (
        <Alert severity="info" sx={{ mb: 3 }} icon={<CloudIcon />}>
          {provisioningEnvs.length} environment(s) currently provisioning...
          <LinearProgress sx={{ mt: 1 }} />
        </Alert>
      )}

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Environment Table */}
      {loading ? (
        <LinearProgress />
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table aria-label="Environments table">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Cluster</TableCell>
                <TableCell>Resources</TableCell>
                <TableCell>TTL</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {environments.map((env) => (
                <TableRow key={env.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {env.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {env.namespace}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={env.type} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={env.status}
                      size="small"
                      color={statusColors[env.status] || 'default'}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{env.cluster || '—'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {env.resources
                        ? `${env.resources.cpu_cores} CPU / ${env.resources.memory_gb}GB RAM`
                        : '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <TimerIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                      <Typography variant="caption">{formatTTL(env.expiresAt)}</Typography>
                    </Stack>
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      {env.endpoints?.api && (
                        <Tooltip title="Open endpoint">
                          <IconButton
                            size="small"
                            href={env.endpoints.api}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Open environment endpoint"
                          >
                            <OpenInNewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {env.status === 'active' && env.type !== 'production' && (
                        <Tooltip title="Destroy environment">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDelete(env.id)}
                            disabled={deletingId === env.id}
                            aria-label={`Destroy ${env.name}`}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Provision Form */}
      <ProvisionForm
        open={showProvisionForm}
        onClose={() => setShowProvisionForm(false)}
        onSuccess={() => {
          setShowProvisionForm(false);
          fetchEnvironments();
        }}
      />
    </Box>
  );
};

export default EnvironmentPage;
