import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Chip, Button, Stack,
  LinearProgress, Avatar, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow,
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
      bgcolor: '#161b22', border: '1px solid rgba(255,255,255,0.06)',
      '&::before': { content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: `linear-gradient(90deg, ${color}, transparent)` },
      '&:hover': { transform: 'translateY(-4px)', boxShadow: `0 8px 25px ${color}20` },
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    }}>
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="caption" sx={{ color: '#8b949e', textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.7rem' }}>
              {title}
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 700, mt: 0.5, lineHeight: 1, color: 'white' }}>
              {animVal}{suffix}
            </Typography>
          </Box>
          <Avatar sx={{ bgcolor: `${color}15`, color, width: 44, height: 44 }}>{icon}</Avatar>
        </Box>
        {trend !== undefined && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1.5 }}>
            {trend >= 0 ? <TrendingUpIcon sx={{ fontSize: 16, color: '#4caf50' }} /> : <TrendingDownIcon sx={{ fontSize: 16, color: '#f44336' }} />}
            <Typography variant="caption" sx={{ color: trend >= 0 ? '#4caf50' : '#f44336' }}>
              {trend > 0 ? '+' : ''}{trend}% from last week
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
    cursor: 'pointer', bgcolor: '#161b22', border: '1px solid rgba(255,255,255,0.06)',
    animation: 'fadeInUp 0.4s ease-out both', animationDelay: `${delay}ms`,
    '&:hover': { transform: 'translateY(-2px)', borderColor: color, boxShadow: `0 4px 16px ${color}20`, '& .action-arrow': { transform: 'translateX(4px)', opacity: 1 } },
    transition: 'all 0.25s ease',
  }}>
    <CardContent sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
      <Avatar sx={{ bgcolor: `${color}15`, color, width: 40, height: 40 }}>{icon}</Avatar>
      <Box sx={{ flex: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'white' }}>{title}</Typography>
        <Typography variant="caption" sx={{ color: '#8b949e' }}>{description}</Typography>
      </Box>
      <ArrowForwardIcon className="action-arrow" sx={{ color: '#8b949e', opacity: 0.3, transition: 'all 0.2s ease', fontSize: 18 }} />
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
    if (s === 'succeeded') return <CheckCircleIcon sx={{ fontSize: 16, color: '#4caf50' }} />;
    if (s === 'failed') return <ErrorIcon sx={{ fontSize: 16, color: '#f44336' }} />;
    if (s === 'in_progress') return <RocketLaunchIcon sx={{ fontSize: 16, color: '#2196f3' }} />;
    return <WarningIcon sx={{ fontSize: 16, color: '#ff9800' }} />;
  };

  const timeAgo = (d: string) => {
    const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
  };

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: 'white' }}>
          Overview
        </Typography>
        <Typography variant="body2" sx={{ color: '#8b949e', mt: 0.5 }}>
          {today}
        </Typography>
      </Box>

      {/* Stats Cards Row */}
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        <Grid item xs={6} md={3}>
          <StatCard title="Services" value={12} icon={<StorageIcon />} color="#6C63FF" delay={0} />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard title="Deployments Today" value={8} icon={<RocketLaunchIcon />} color="#03DAC6" trend={12} delay={80} />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard title="Environments" value={4} icon={<CloudIcon />} color="#4caf50" delay={160} />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard title="Health Score" value={98} suffix="%" icon={<SpeedIcon />} color="#ff9800" trend={2.5} delay={240} />
        </Grid>
      </Grid>

      {/* Content Grid */}
      <Grid container spacing={3}>
        {/* Recent Deployments Table */}
        <Grid item xs={12} md={7}>
          <Card sx={{ bgcolor: '#161b22', border: '1px solid rgba(255,255,255,0.06)' }}>
            <CardContent sx={{ p: 0 }}>
              <Box sx={{ px: 3, py: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: 'white' }}>Recent Deployments</Typography>
                  <Typography variant="caption" sx={{ color: '#8b949e' }}>Latest pipeline activity</Typography>
                </Box>
                <Button size="small" onClick={() => navigate('/deployments')} sx={{ color: '#6C63FF' }}>
                  View All
                </Button>
              </Box>
              {loading ? (
                <Box sx={{ p: 3 }}><LinearProgress /></Box>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ color: '#8b949e', borderColor: 'rgba(255,255,255,0.06)' }}>Status</TableCell>
                        <TableCell sx={{ color: '#8b949e', borderColor: 'rgba(255,255,255,0.06)' }}>Service</TableCell>
                        <TableCell sx={{ color: '#8b949e', borderColor: 'rgba(255,255,255,0.06)' }}>Environment</TableCell>
                        <TableCell sx={{ color: '#8b949e', borderColor: 'rgba(255,255,255,0.06)' }}>Time</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {recentDeployments.map((d) => (
                        <TableRow key={d.id} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                          <TableCell sx={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {statusIcon(d.status)}
                              <Chip label={d.status.replace('_', ' ')} size="small"
                                color={d.status === 'succeeded' ? 'success' : d.status === 'failed' ? 'error' : 'info'}
                                variant="outlined" sx={{ fontSize: '0.7rem', height: 22 }} />
                            </Box>
                          </TableCell>
                          <TableCell sx={{ color: '#c9d1d9', borderColor: 'rgba(255,255,255,0.04)' }}>
                            {d.artifacts?.image || d.version}
                          </TableCell>
                          <TableCell sx={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                            <Chip label={d.environment} size="small" sx={{ fontSize: '0.7rem', height: 22, bgcolor: 'rgba(108,99,255,0.1)', color: '#8B83FF' }} />
                          </TableCell>
                          <TableCell sx={{ color: '#8b949e', borderColor: 'rgba(255,255,255,0.04)' }}>
                            {timeAgo(d.createdAt)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12} md={5}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: 'white' }}>Quick Actions</Typography>
          <Stack spacing={1.5}>
            <QuickAction title="Service Catalog" description="Browse and register services" icon={<StorageIcon />} color="#6C63FF" onClick={() => navigate('/catalog')} delay={300} />
            <QuickAction title="New Deployment" description="Deploy to any environment" icon={<RocketLaunchIcon />} color="#03DAC6" onClick={() => navigate('/deployments')} delay={360} />
            <QuickAction title="Provision Environment" description="Spin up a new environment" icon={<CloudIcon />} color="#4caf50" onClick={() => navigate('/environments')} delay={420} />
            <QuickAction title="Platform Health" description="Check system status" icon={<MonitorHeartIcon />} color="#ff9800" onClick={() => navigate('/health')} delay={480} />
            <QuickAction title="Cost Analysis" description="Review spending and budgets" icon={<AttachMoneyIcon />} color="#f44336" onClick={() => navigate('/cost')} delay={540} />
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardPage;
