import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Chip, Button, Stack,
  LinearProgress, Avatar, IconButton, Tooltip,
} from '@mui/material';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import StorageIcon from '@mui/icons-material/Storage';
import CloudIcon from '@mui/icons-material/Cloud';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import AddIcon from '@mui/icons-material/Add';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import SpeedIcon from '@mui/icons-material/Speed';
import { useNavigate } from 'react-router-dom';
import { platformApi } from '../../api/platformApi';

function useCounter(target: number, duration = 1200): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (target === 0) return;
    let startTime: number;
    let frame: number;
    const animate = (ts: number) => {
      if (!startTime) startTime = ts;
      const p = Math.min((ts - startTime) / duration, 1);
      setCount(Math.floor((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return count;
}

const StatCard: React.FC<{
  title: string; value: number; suffix?: string; icon: React.ReactNode;
  color: string; trend?: number; delay?: number;
}> = ({ title, value, suffix = '', icon, color, trend, delay = 0 }) => {
  const animVal = useCounter(value);
  return (
    <Card sx={{
      position: 'relative', overflow: 'hidden',
      animation: 'fadeInUp 0.5s ease-out both', animationDelay: `${delay}ms`,
      '&::before': { content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: `linear-gradient(90deg, ${color}, transparent)` },
      '&:hover': { transform: 'translateY(-4px)', boxShadow: `0 8px 25px ${color}20` },
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    }}>
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.7rem' }}>{title}</Typography>
            <Typography variant="h3" sx={{ fontWeight: 700, mt: 0.5, lineHeight: 1 }}>{animVal}{suffix}</Typography>
          </Box>
          <Avatar sx={{ bgcolor: `${color}15`, color, width: 44, height: 44 }}>{icon}</Avatar>
        </Box>
        {trend !== undefined && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1.5 }}>
            {trend >= 0 ? <TrendingUpIcon sx={{ fontSize: 16, color: trend > 0 ? 'error.main' : 'text.secondary' }} /> : <TrendingDownIcon sx={{ fontSize: 16, color: 'success.main' }} />}
            <Typography variant="caption" sx={{ color: trend > 0 ? 'error.main' : trend < 0 ? 'success.main' : 'text.secondary' }}>
              {trend > 0 ? '+' : ''}{trend}% from last period
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

const QuickAction: React.FC<{
  title: string; description: string; icon: React.ReactNode;
  onClick: () => void; color: string; delay?: number;
}> = ({ title, description, icon, onClick, color, delay = 0 }) => (
  <Card onClick={onClick} sx={{
    cursor: 'pointer', animation: 'fadeInUp 0.4s ease-out both', animationDelay: `${delay}ms`,
    '&:hover': { transform: 'translateY(-2px)', borderColor: color, boxShadow: `0 4px 16px ${color}20`, '& .action-arrow': { transform: 'translateX(4px)', opacity: 1 } },
    transition: 'all 0.25s ease',
  }}>
    <CardContent sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
      <Avatar sx={{ bgcolor: `${color}15`, color, width: 40, height: 40 }}>{icon}</Avatar>
      <Box sx={{ flex: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{title}</Typography>
        <Typography variant="caption" color="text.secondary">{description}</Typography>
      </Box>
      <ArrowForwardIcon className="action-arrow" sx={{ color: 'text.secondary', opacity: 0.3, transition: 'all 0.2s ease', fontSize: 18 }} />
    </CardContent>
  </Card>
);

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [recentDeployments, setRecentDeployments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    platformApi.deployments.list({ pageSize: 5, sort: '-createdAt' })
      .then((r) => setRecentDeployments(r.data.slice(0, 5)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const statusIcon = (s: string) => {
    if (s === 'succeeded') return <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />;
    if (s === 'failed') return <ErrorIcon sx={{ fontSize: 16, color: 'error.main' }} />;
    if (s === 'in_progress') return <RocketLaunchIcon sx={{ fontSize: 16, color: 'info.main' }} />;
    return <WarningIcon sx={{ fontSize: 16, color: 'warning.main' }} />;
  };

  const timeAgo = (d: string) => {
    const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      {/* Welcome Banner */}
      <Box sx={{
        mb: 4, p: 4, borderRadius: 3, position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(135deg, rgba(108,99,255,0.12) 0%, rgba(3,218,198,0.08) 100%)',
        border: '1px solid rgba(108,99,255,0.2)', animation: 'fadeIn 0.6s ease-out both',
        '&::before': { content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, #6C63FF, #03DAC6)' },
      }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>Welcome back, Developer 👋</Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600 }}>
          Your platform is running smoothly. Here's an overview of your infrastructure, deployments, and services.
        </Typography>
        <Stack direction="row" spacing={1.5} sx={{ mt: 2.5 }}>
          <Button variant="contained" size="small" startIcon={<RocketLaunchIcon />} onClick={() => navigate('/deployments')}
            sx={{ background: 'linear-gradient(135deg, #6C63FF, #8B83FF)', '&:hover': { background: 'linear-gradient(135deg, #4B44B2, #6C63FF)' } }}>
            Deploy Now
          </Button>
          <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={() => navigate('/catalog')}
            sx={{ borderColor: 'rgba(108,99,255,0.5)', color: '#8B83FF' }}>
            Register Service
          </Button>
        </Stack>
      </Box>

      {/* Stats */}
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        <Grid item xs={6} md={3}><StatCard title="Total Services" value={6} icon={<StorageIcon />} color="#6C63FF" delay={0} /></Grid>
        <Grid item xs={6} md={3}><StatCard title="Active Environments" value={4} icon={<CloudIcon />} color="#03DAC6" delay={80} /></Grid>
        <Grid item xs={6} md={3}><StatCard title="Deploy Success Rate" value={80} suffix="%" icon={<SpeedIcon />} color="#4caf50" trend={-2.1} delay={160} /></Grid>
        <Grid item xs={6} md={3}><StatCard title="Monthly Cost" value={4250} icon={<AttachMoneyIcon />} color="#ff9800" trend={6.8} delay={240} /></Grid>
      </Grid>

      {/* Content */}
      <Grid container spacing={3}>
        {/* Recent Deployments */}
        <Grid item xs={12} md={7}>
          <Card sx={{ animation: 'fadeInUp 0.5s ease-out 0.3s both' }}>
            <CardContent sx={{ p: 0 }}>
              <Box sx={{ px: 3, py: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>Recent Deployments</Typography>
                  <Typography variant="caption" color="text.secondary">Latest pipeline activity</Typography>
                </Box>
                <Tooltip title="View all"><IconButton size="small" onClick={() => navigate('/deployments')}><OpenInNewIcon fontSize="small" /></IconButton></Tooltip>
              </Box>
              {loading ? <Box sx={{ p: 3 }}><LinearProgress /></Box> : (
                <Box>
                  {recentDeployments.map((d, i) => (
                    <Box key={d.id} sx={{
                      px: 3, py: 1.5, display: 'flex', alignItems: 'center', gap: 2,
                      borderBottom: i < recentDeployments.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' }, transition: 'background 0.15s',
                      animation: 'fadeIn 0.3s ease-out both', animationDelay: `${400 + i * 60}ms`,
                    }}>
                      {statusIcon(d.status)}
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }} noWrap>{d.artifacts?.image || d.version}</Typography>
                        <Typography variant="caption" color="text.secondary">{d.environment} • {d.strategy}</Typography>
                      </Box>
                      <Chip label={d.status.replace('_', ' ')} size="small"
                        color={d.status === 'succeeded' ? 'success' : d.status === 'failed' ? 'error' : d.status === 'in_progress' ? 'info' : 'default'}
                        variant="outlined" sx={{ fontSize: '0.7rem', height: 24 }} />
                      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 50, textAlign: 'right' }}>{timeAgo(d.createdAt)}</Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12} md={5}>
          <Box sx={{ animation: 'fadeInUp 0.5s ease-out 0.4s both' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Quick Actions</Typography>
            <Stack spacing={1.5}>
              <QuickAction title="Service Catalog" description="Browse and register platform services" icon={<StorageIcon />} color="#6C63FF" onClick={() => navigate('/catalog')} delay={500} />
              <QuickAction title="New Deployment" description="Deploy a new version to any environment" icon={<RocketLaunchIcon />} color="#03DAC6" onClick={() => navigate('/deployments')} delay={560} />
              <QuickAction title="Provision Environment" description="Spin up a new dev or preview environment" icon={<CloudIcon />} color="#4caf50" onClick={() => navigate('/environments')} delay={620} />
              <QuickAction title="Platform Health" description="Check system status and health metrics" icon={<MonitorHeartIcon />} color="#ff9800" onClick={() => navigate('/health')} delay={680} />
              <QuickAction title="Cost Analysis" description="Review infrastructure spending and budgets" icon={<AttachMoneyIcon />} color="#f44336" onClick={() => navigate('/cost')} delay={740} />
            </Stack>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardPage;
