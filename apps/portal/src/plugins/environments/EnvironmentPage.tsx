import AddIcon from '@mui/icons-material/Add';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import CircleIcon from '@mui/icons-material/Circle';
import CloudIcon from '@mui/icons-material/Cloud';
import DeleteIcon from '@mui/icons-material/Delete';
import MoreTimeIcon from '@mui/icons-material/MoreTime';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
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
  Stack,
  Tabs,
  Tab,
  Avatar,
} from '@mui/material';
import React, { useState, useEffect } from 'react';

// Mock data for the professional environment management page
const mockEnvironments = [
  {
    id: 'env-1',
    name: 'production-us-east',
    type: 'production' as const,
    status: 'running' as const,
    owner: 'Platform Team',
    ownerAvatar: 'PT',
    expiresAt: null,
    cpu: 72,
    memory: 68,
    storage: 45,
    costPerMonth: 2450,
  },
  {
    id: 'env-2',
    name: 'staging-main',
    type: 'staging' as const,
    status: 'running' as const,
    owner: 'Backend Team',
    ownerAvatar: 'BT',
    expiresAt: '2025-02-15',
    cpu: 45,
    memory: 52,
    storage: 30,
    costPerMonth: 890,
  },
  {
    id: 'env-3',
    name: 'dev-feature-auth',
    type: 'development' as const,
    status: 'running' as const,
    owner: 'Jane Smith',
    ownerAvatar: 'JS',
    expiresAt: '2025-01-28',
    cpu: 23,
    memory: 31,
    storage: 12,
    costPerMonth: 120,
  },
  {
    id: 'env-4',
    name: 'dev-feature-payments',
    type: 'development' as const,
    status: 'provisioning' as const,
    owner: 'Mike Chen',
    ownerAvatar: 'MC',
    expiresAt: '2025-01-30',
    cpu: 0,
    memory: 0,
    storage: 0,
    costPerMonth: 95,
  },
  {
    id: 'env-5',
    name: 'staging-release-2.1',
    type: 'staging' as const,
    status: 'running' as const,
    owner: 'QA Team',
    ownerAvatar: 'QA',
    expiresAt: '2025-02-01',
    cpu: 58,
    memory: 63,
    storage: 41,
    costPerMonth: 780,
  },
  {
    id: 'env-6',
    name: 'dev-hotfix-logging',
    type: 'development' as const,
    status: 'stopped' as const,
    owner: 'Alex Rivera',
    ownerAvatar: 'AR',
    expiresAt: '2025-01-25',
    cpu: 0,
    memory: 0,
    storage: 8,
    costPerMonth: 15,
  },
  {
    id: 'env-7',
    name: 'production-eu-west',
    type: 'production' as const,
    status: 'running' as const,
    owner: 'Platform Team',
    ownerAvatar: 'PT',
    expiresAt: null,
    cpu: 65,
    memory: 71,
    storage: 52,
    costPerMonth: 2100,
  },
  {
    id: 'env-8',
    name: 'dev-experiment-ml',
    type: 'development' as const,
    status: 'running' as const,
    owner: 'Data Team',
    ownerAvatar: 'DT',
    expiresAt: '2025-01-26',
    cpu: 89,
    memory: 92,
    storage: 67,
    costPerMonth: 340,
  },
];

type EnvType = 'production' | 'staging' | 'development';
type EnvStatus = 'running' | 'stopped' | 'provisioning';

interface Environment {
  id: string;
  name: string;
  type: EnvType;
  status: EnvStatus;
  owner: string;
  ownerAvatar: string;
  expiresAt: string | null;
  cpu: number;
  memory: number;
  storage: number;
  costPerMonth: number;
}

const typeColors: Record<EnvType, { bg: string; color: string; label: string }> = {
  production: { bg: 'rgba(250, 116, 111, 0.1)', color: '#FA746F', label: 'Production' },
  staging: { bg: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B', label: 'Staging' },
  development: { bg: 'rgba(88, 231, 171, 0.1)', color: '#58E7AB', label: 'Development' },
};

const statusConfig: Record<EnvStatus, { color: string; label: string }> = {
  running: { color: '#58E7AB', label: 'Running' },
  stopped: { color: '#6475A1', label: 'Stopped' },
  provisioning: { color: '#699CFF', label: 'Provisioning' },
};

const ResourceBar: React.FC<{ label: string; value: number }> = ({ label, value }) => {
  const getColor = (v: number) => {
    if (v >= 90) return '#FA746F';
    if (v >= 70) return '#F59E0B';
    return '#58E7AB';
  };

  return (
    <Box sx={{ mb: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="caption" sx={{ color: '#6475A1', fontSize: '0.7rem' }}>
          {label}
        </Typography>
        <Typography
          variant="caption"
          sx={{ color: '#DEE5FF', fontSize: '0.7rem', fontWeight: 600 }}
        >
          {value}%
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={value}
        sx={{
          height: 4,
          borderRadius: 2,
          bgcolor: 'rgba(100, 117, 161, 0.12)',
          '& .MuiLinearProgress-bar': {
            borderRadius: 2,
            bgcolor: getColor(value),
          },
        }}
      />
    </Box>
  );
};

export const EnvironmentPage: React.FC = () => {
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setEnvironments(mockEnvironments);
      setLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const filteredEnvironments = environments.filter((env) => {
    if (activeTab === 0) return true;
    if (activeTab === 1) return env.type === 'development';
    if (activeTab === 2) return env.type === 'staging';
    if (activeTab === 3) return env.type === 'production';
    return true;
  });

  const activeCount = environments.filter((e) => e.status === 'running').length;
  const expiringCount = environments.filter((e) => {
    if (!e.expiresAt) return false;
    const diff = new Date(e.expiresAt).getTime() - Date.now();
    return diff > 0 && diff < 3 * 24 * 60 * 60 * 1000; // within 3 days
  }).length;
  const totalCost = environments.reduce((sum, e) => sum + e.costPerMonth, 0);

  const formatExpiry = (date: string | null): string => {
    if (!date) return 'No expiry';
    const diff = new Date(date).getTime() - Date.now();
    if (diff <= 0) return 'Expired';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days > 7) return new Date(date).toLocaleDateString();
    if (days === 0) return 'Expires today';
    return `${days}d remaining`;
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress
          sx={{
            borderRadius: 2,
            bgcolor: 'rgba(100, 117, 161, 0.1)',
            '& .MuiLinearProgress-bar': { bgcolor: '#699CFF' },
          }}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', animation: 'fadeIn 0.5s ease-out both' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography
            variant="h4"
            sx={{ fontWeight: 700, color: '#DEE5FF', mb: 0.5, fontSize: '1.5rem' }}
          >
            Environments
          </Typography>
          <Typography variant="body2" sx={{ color: '#6475A1' }}>
            Provision and manage your deployment environments
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          sx={{
            background: 'linear-gradient(135deg, #699CFF, #3B82F6)',
            borderRadius: '8px',
            px: 3,
            py: 1,
            fontWeight: 600,
            boxShadow: '0 4px 12px rgba(105, 156, 255, 0.3)',
            '&:hover': { background: 'linear-gradient(135deg, #ADC6FF, #699CFF)' },
          }}
        >
          Provision New
        </Button>
      </Box>

      {/* Stats Row */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4}>
          <Card
            sx={{
              bgcolor: '#0F1E3F',
              border: '1px solid rgba(100, 117, 161, 0.2)',
              borderRadius: '12px',
            }}
          >
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2.5 }}>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: '10px',
                  bgcolor: 'rgba(88, 231, 171, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(88, 231, 171, 0.2)',
                }}
              >
                <CloudIcon sx={{ color: '#58E7AB' }} />
              </Box>
              <Box>
                <Typography
                  variant="h4"
                  sx={{ fontWeight: 700, color: '#DEE5FF', lineHeight: 1.2, fontSize: '1.5rem' }}
                >
                  {activeCount}
                </Typography>
                <Typography variant="caption" sx={{ color: '#6475A1' }}>
                  Active Environments
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card
            sx={{
              bgcolor: '#0F1E3F',
              border: '1px solid rgba(100, 117, 161, 0.2)',
              borderRadius: '12px',
            }}
          >
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2.5 }}>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: '10px',
                  bgcolor: 'rgba(245, 158, 11, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(245, 158, 11, 0.2)',
                }}
              >
                <WarningAmberIcon sx={{ color: '#F59E0B' }} />
              </Box>
              <Box>
                <Typography
                  variant="h4"
                  sx={{ fontWeight: 700, color: '#DEE5FF', lineHeight: 1.2, fontSize: '1.5rem' }}
                >
                  {expiringCount}
                </Typography>
                <Typography variant="caption" sx={{ color: '#6475A1' }}>
                  Expiring Soon
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card
            sx={{
              bgcolor: '#0F1E3F',
              border: '1px solid rgba(100, 117, 161, 0.2)',
              borderRadius: '12px',
            }}
          >
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2.5 }}>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: '10px',
                  bgcolor: 'rgba(105, 156, 255, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(105, 156, 255, 0.2)',
                }}
              >
                <AttachMoneyIcon sx={{ color: '#699CFF' }} />
              </Box>
              <Box>
                <Typography
                  variant="h4"
                  sx={{ fontWeight: 700, color: '#DEE5FF', lineHeight: 1.2, fontSize: '1.5rem' }}
                >
                  ${totalCost.toLocaleString()}
                </Typography>
                <Typography variant="caption" sx={{ color: '#6475A1' }}>
                  Total Cost / Month
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filter Tabs */}
      <Tabs
        value={activeTab}
        onChange={(_, v: number) => setActiveTab(v)}
        sx={{
          mb: 3,
          '& .MuiTab-root': {
            color: '#6475A1',
            fontWeight: 500,
            textTransform: 'none',
            minHeight: 40,
            '&.Mui-selected': { color: '#699CFF' },
          },
          '& .MuiTabs-indicator': { bgcolor: '#699CFF', height: 2, borderRadius: 1 },
        }}
      >
        <Tab label={`All (${environments.length})`} />
        <Tab
          label={`Development (${environments.filter((e) => e.type === 'development').length})`}
        />
        <Tab label={`Staging (${environments.filter((e) => e.type === 'staging').length})`} />
        <Tab label={`Production (${environments.filter((e) => e.type === 'production').length})`} />
      </Tabs>

      {/* Environment Cards Grid */}
      <Grid container spacing={2.5}>
        {filteredEnvironments.map((env) => (
          <Grid item xs={12} sm={6} lg={4} key={env.id}>
            <Card
              sx={{
                bgcolor: '#0F1E3F',
                border: '1px solid rgba(100, 117, 161, 0.2)',
                borderRadius: '12px',
                transition: 'all 0.2s ease',
                '&:hover': {
                  border: '1px solid rgba(105, 156, 255, 0.3)',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                },
              }}
            >
              <CardContent sx={{ pb: 1 }}>
                {/* Top row: type badge + status */}
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 2,
                  }}
                >
                  <Chip
                    label={typeColors[env.type].label}
                    size="small"
                    sx={{
                      bgcolor: typeColors[env.type].bg,
                      color: typeColors[env.type].color,
                      fontWeight: 600,
                      fontSize: '0.7rem',
                      height: 22,
                      border: `1px solid ${typeColors[env.type].color}33`,
                    }}
                  />
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <CircleIcon sx={{ fontSize: 8, color: statusConfig[env.status].color }} />
                    <Typography
                      variant="caption"
                      sx={{ color: statusConfig[env.status].color, fontWeight: 500 }}
                    >
                      {statusConfig[env.status].label}
                    </Typography>
                  </Stack>
                </Box>

                {/* Name */}
                <Typography
                  variant="subtitle1"
                  sx={{ fontWeight: 600, color: '#DEE5FF', mb: 0.5, fontSize: '0.9rem' }}
                >
                  {env.name}
                </Typography>

                {/* Resource usage bars */}
                <Box sx={{ mt: 2, mb: 1.5 }}>
                  <ResourceBar label="CPU" value={env.cpu} />
                  <ResourceBar label="Memory" value={env.memory} />
                  <ResourceBar label="Storage" value={env.storage} />
                </Box>

                {/* Owner and expiry */}
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mt: 2,
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Avatar
                      sx={{
                        width: 24,
                        height: 24,
                        fontSize: '0.6rem',
                        bgcolor: 'rgba(105, 156, 255, 0.15)',
                        color: '#ADC6FF',
                        border: '1px solid rgba(105, 156, 255, 0.2)',
                      }}
                    >
                      {env.ownerAvatar}
                    </Avatar>
                    <Typography variant="caption" sx={{ color: '#6475A1' }}>
                      {env.owner}
                    </Typography>
                  </Stack>
                  <Typography
                    variant="caption"
                    sx={{
                      color:
                        env.expiresAt &&
                        new Date(env.expiresAt).getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000
                          ? '#F59E0B'
                          : '#6475A1',
                      fontWeight: 500,
                    }}
                  >
                    {formatExpiry(env.expiresAt)}
                  </Typography>
                </Box>
              </CardContent>

              {/* Actions */}
              <CardActions
                sx={{ px: 2, pb: 2, pt: 1, borderTop: '1px solid rgba(100, 117, 161, 0.1)' }}
              >
                <Button
                  size="small"
                  startIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
                  sx={{
                    color: '#99AAD9',
                    fontSize: '0.75rem',
                    '&:hover': { bgcolor: 'rgba(100, 117, 161, 0.08)' },
                  }}
                >
                  Open
                </Button>
                <Button
                  size="small"
                  startIcon={<MoreTimeIcon sx={{ fontSize: 14 }} />}
                  sx={{
                    color: '#99AAD9',
                    fontSize: '0.75rem',
                    '&:hover': { bgcolor: 'rgba(100, 117, 161, 0.08)' },
                  }}
                >
                  Extend
                </Button>
                <Box sx={{ flex: 1 }} />
                {env.type !== 'production' && (
                  <Tooltip title="Delete environment">
                    <IconButton
                      size="small"
                      sx={{ color: '#FA746F', '&:hover': { bgcolor: 'rgba(250, 116, 111, 0.1)' } }}
                    >
                      <DeleteIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                )}
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default EnvironmentPage;
