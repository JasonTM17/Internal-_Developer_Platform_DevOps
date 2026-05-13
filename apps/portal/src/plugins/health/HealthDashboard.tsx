import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
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
  Tooltip,
  IconButton,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import RefreshIcon from '@mui/icons-material/Refresh';
import CircleIcon from '@mui/icons-material/Circle';
import { platformApi } from '../../api/platformApi';

interface HealthCheck {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  latency_ms: number;
  message?: string;
  lastChecked: string;
}

interface PlatformHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  timestamp: string;
  uptime: string;
  checks: HealthCheck[];
}

const statusConfig = {
  healthy: { color: 'success' as const, icon: <CheckCircleIcon color="success" />, label: 'Healthy' },
  degraded: { color: 'warning' as const, icon: <WarningIcon color="warning" />, label: 'Degraded' },
  unhealthy: { color: 'error' as const, icon: <ErrorIcon color="error" />, label: 'Unhealthy' },
};

const checkStatusColors: Record<string, string> = {
  pass: '#4caf50',
  warn: '#ff9800',
  fail: '#f44336',
};

export const HealthDashboard: React.FC = () => {
  const [health, setHealth] = useState<PlatformHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchHealth = async () => {
    try {
      const response = await platformApi.health.get();
      setHealth(response);
      setError(null);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch health status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const passCount = health?.checks.filter((c) => c.status === 'pass').length || 0;
  const warnCount = health?.checks.filter((c) => c.status === 'warn').length || 0;
  const failCount = health?.checks.filter((c) => c.status === 'fail').length || 0;
  const totalChecks = health?.checks.length || 0;

  const overallHealthPercent = totalChecks > 0 ? (passCount / totalChecks) * 100 : 0;

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto', animation: 'fadeIn 0.5s ease-out both' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Platform Health
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Last updated: {lastRefresh.toLocaleTimeString()} • Auto-refreshes every 30s
          </Typography>
        </Box>
        <IconButton onClick={fetchHealth} aria-label="Refresh health status">
          <RefreshIcon />
        </IconButton>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {health && (
        <>
          {/* Overall Status Banner */}
          <Card
            sx={{
              mb: 3,
              borderLeft: 4,
              borderColor: `${statusConfig[health.status].color}.main`,
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {statusConfig[health.status].icon}
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="h5">
                    Platform is {statusConfig[health.status].label}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Version {health.version} • Uptime: {health.uptime}
                  </Typography>
                </Box>
                <Chip
                  label={statusConfig[health.status].label}
                  color={statusConfig[health.status].color}
                  size="medium"
                />
              </Box>
              <Box sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption">
                    {passCount}/{totalChecks} checks passing
                  </Typography>
                  <Typography variant="caption">{overallHealthPercent.toFixed(0)}%</Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={overallHealthPercent}
                  color={health.status === 'healthy' ? 'success' : health.status === 'degraded' ? 'warning' : 'error'}
                />
              </Box>
            </CardContent>
          </Card>

          {/* Summary Cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={4}>
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Stack direction="row" justifyContent="center" alignItems="center" spacing={1}>
                    <CheckCircleIcon color="success" />
                    <Typography variant="h4" color="success.main">{passCount}</Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary">Passing</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={4}>
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Stack direction="row" justifyContent="center" alignItems="center" spacing={1}>
                    <WarningIcon color="warning" />
                    <Typography variant="h4" color="warning.main">{warnCount}</Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary">Warnings</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={4}>
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Stack direction="row" justifyContent="center" alignItems="center" spacing={1}>
                    <ErrorIcon color="error" />
                    <Typography variant="h4" color="error.main">{failCount}</Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary">Failing</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Health Checks Table */}
          <TableContainer component={Paper} variant="outlined">
            <Table aria-label="Health checks table">
              <TableHead>
                <TableRow>
                  <TableCell>Status</TableCell>
                  <TableCell>Component</TableCell>
                  <TableCell>Latency</TableCell>
                  <TableCell>Message</TableCell>
                  <TableCell>Last Checked</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {health.checks
                  .sort((a, b) => {
                    const order = { fail: 0, warn: 1, pass: 2 };
                    return order[a.status] - order[b.status];
                  })
                  .map((check) => (
                    <TableRow key={check.name} hover>
                      <TableCell>
                        <Tooltip title={check.status}>
                          <CircleIcon
                            sx={{ fontSize: 12, color: checkStatusColors[check.status] }}
                          />
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {check.name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={`${check.latency_ms}ms`}
                          size="small"
                          variant="outlined"
                          color={check.latency_ms > 1000 ? 'warning' : 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {check.message || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(check.lastChecked).toLocaleTimeString()}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Box>
  );
};

export default HealthDashboard;
