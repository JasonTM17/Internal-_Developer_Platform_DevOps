import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloudIcon from '@mui/icons-material/Cloud';
import ErrorIcon from '@mui/icons-material/Error';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import SpeedIcon from '@mui/icons-material/Speed';
import StorageIcon from '@mui/icons-material/Storage';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import WarningIcon from '@mui/icons-material/Warning';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Button,
  Stack,
  LinearProgress,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  alpha,
} from '@mui/material';
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { platformApi } from '../../api/platformApi';
import { timeAgo } from '../../utils/time';

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
  title: string;
  value: number;
  suffix?: string;
  icon: React.ReactNode;
  color: string;
  trend?: number;
  delay?: number;
}> = ({ title, value, suffix = '', icon, color, trend, delay = 0 }) => {
  const animVal = useCounter(value);
  return (
    <Card
      sx={{
        position: 'relative',
        overflow: 'hidden',
        animation: 'fadeInUp 0.5s ease-out both',
        animationDelay: `${delay}ms`,
        bgcolor: '#0F1E3F',
        border: '1px solid rgba(100, 117, 161, 0.2)',
        borderLeft: `3px solid ${color}`,
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: `0 8px 32px ${alpha(color, 0.15)}, 0 0 0 1px ${alpha(color, 0.2)}`,
          borderColor: alpha(color, 0.4),
        },
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography
              variant="caption"
              sx={{
                color: '#6475A1',
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
                fontSize: '0.65rem',
                fontWeight: 600,
              }}
            >
              {title}
            </Typography>
            <Typography
              variant="h3"
              sx={{
                fontWeight: 700,
                mt: 0.5,
                lineHeight: 1,
                color: '#DEE5FF',
                fontSize: '1.75rem',
              }}
            >
              {animVal}
              {suffix}
            </Typography>
          </Box>
          <Avatar
            sx={{
              bgcolor: alpha(color, 0.1),
              color,
              width: 40,
              height: 40,
              border: `1px solid ${alpha(color, 0.2)}`,
            }}
          >
            {icon}
          </Avatar>
        </Box>
        {trend !== undefined && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1.5 }}>
            {trend >= 0 ? (
              <TrendingUpIcon sx={{ fontSize: 14, color: '#58E7AB' }} />
            ) : (
              <TrendingDownIcon sx={{ fontSize: 14, color: '#FA746F' }} />
            )}
            <Typography
              variant="caption"
              sx={{
                color: trend >= 0 ? '#58E7AB' : '#FA746F',
                fontSize: '0.7rem',
                fontWeight: 500,
              }}
            >
              {trend > 0 ? '+' : ''}
              {trend}% from last week
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

const QuickAction: React.FC<{
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  color: string;
  delay?: number;
}> = ({ title, description, icon, onClick, color, delay = 0 }) => {
  return (
    <Card
      onClick={onClick}
      sx={{
        cursor: 'pointer',
        animation: 'fadeInUp 0.4s ease-out both',
        animationDelay: `${delay}ms`,
        bgcolor: '#0F1E3F',
        border: '1px solid rgba(100, 117, 161, 0.15)',
        '&:hover': {
          transform: 'translateY(-2px)',
          borderColor: alpha(color, 0.4),
          boxShadow: `0 4px 20px ${alpha(color, 0.1)}`,
          '& .action-arrow': { transform: 'translateX(4px)', opacity: 1 },
        },
        transition: 'all 0.25s ease',
      }}
    >
      <CardContent sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Avatar
          sx={{
            bgcolor: alpha(color, 0.1),
            color,
            width: 36,
            height: 36,
            border: `1px solid ${alpha(color, 0.2)}`,
            '& .MuiSvgIcon-root': { fontSize: '1.1rem' },
          }}
        >
          {icon}
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography
            variant="subtitle2"
            sx={{ fontWeight: 600, color: '#DEE5FF', fontSize: '0.8rem' }}
          >
            {title}
          </Typography>
          <Typography variant="caption" sx={{ color: '#6475A1', fontSize: '0.7rem' }}>
            {description}
          </Typography>
        </Box>
        <ArrowForwardIcon
          className="action-arrow"
          sx={{
            color: '#6475A1',
            opacity: 0.3,
            transition: 'all 0.2s ease',
            fontSize: 16,
          }}
        />
      </CardContent>
    </Card>
  );
};

interface RecentDeployment {
  id: string;
  status: string;
  artifacts?: { image?: string };
  version?: string;
  environment: string;
  createdAt: string;
}

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [recentDeployments, setRecentDeployments] = useState<RecentDeployment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    platformApi.deployments
      .list({ pageSize: 5, sort: '-createdAt' })
      .then((r) => setRecentDeployments(r.data.slice(0, 5) as RecentDeployment[]))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const statusIcon = (s: string) => {
    if (s === 'succeeded') return <CheckCircleIcon sx={{ fontSize: 16, color: '#58E7AB' }} />;
    if (s === 'failed') return <ErrorIcon sx={{ fontSize: 16, color: '#FA746F' }} />;
    if (s === 'in_progress') return <RocketLaunchIcon sx={{ fontSize: 16, color: '#4CD7F6' }} />;
    return <WarningIcon sx={{ fontSize: 16, color: '#F59E0B' }} />;
  };

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Box sx={{ maxWidth: 1440, mx: 'auto' }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#DEE5FF', fontSize: '1.5rem' }}>
          {t('dashboard.title')}
        </Typography>
        <Typography variant="body2" sx={{ color: '#6475A1', mt: 0.5, fontSize: '0.8rem' }}>
          {today}
        </Typography>
      </Box>

      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        <Grid item xs={6} md={3}>
          <StatCard
            title={t('dashboard.services')}
            value={12}
            icon={<StorageIcon />}
            color="#699CFF"
            delay={0}
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard
            title={t('dashboard.deploymentsToday')}
            value={8}
            icon={<RocketLaunchIcon />}
            color="#4CD7F6"
            trend={12}
            delay={80}
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard
            title={t('dashboard.environments')}
            value={4}
            icon={<CloudIcon />}
            color="#58E7AB"
            delay={160}
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard
            title={t('dashboard.healthScore')}
            value={98}
            suffix="%"
            icon={<SpeedIcon />}
            color="#F59E0B"
            trend={2.5}
            delay={240}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Card sx={{ bgcolor: '#0F1E3F', border: '1px solid rgba(100, 117, 161, 0.2)' }}>
            <CardContent sx={{ p: 0 }}>
              <Box
                sx={{
                  px: 3,
                  py: 2,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: '1px solid rgba(100, 117, 161, 0.12)',
                }}
              >
                <Box>
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: 600, color: '#DEE5FF', fontSize: '0.9rem' }}
                  >
                    {t('dashboard.recentDeployments')}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#6475A1', fontSize: '0.7rem' }}>
                    {t('dashboard.latestActivity')}
                  </Typography>
                </Box>
                <Button
                  size="small"
                  onClick={() => navigate('/deployments')}
                  sx={{
                    color: '#699CFF',
                    fontSize: '0.75rem',
                    '&:hover': { bgcolor: 'rgba(105, 156, 255, 0.08)' },
                  }}
                >
                  {t('common.viewAll')}
                </Button>
              </Box>
              {loading ? (
                <Box sx={{ p: 3 }}>
                  <LinearProgress
                    sx={{
                      bgcolor: 'rgba(100, 117, 161, 0.1)',
                      '& .MuiLinearProgress-bar': { bgcolor: '#699CFF' },
                    }}
                  />
                </Box>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ color: '#6475A1' }}>Status</TableCell>
                        <TableCell sx={{ color: '#6475A1' }}>Service</TableCell>
                        <TableCell sx={{ color: '#6475A1' }}>Environment</TableCell>
                        <TableCell sx={{ color: '#6475A1' }}>Time</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {recentDeployments.map((d) => (
                        <TableRow
                          key={d.id}
                          sx={{ '&:hover': { bgcolor: 'rgba(100, 117, 161, 0.04)' } }}
                        >
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {statusIcon(d.status)}
                              <Chip
                                label={d.status.replace('_', ' ')}
                                size="small"
                                sx={{
                                  fontSize: '0.65rem',
                                  height: 20,
                                  bgcolor:
                                    d.status === 'succeeded'
                                      ? 'rgba(88, 231, 171, 0.1)'
                                      : d.status === 'failed'
                                        ? 'rgba(250, 116, 111, 0.1)'
                                        : 'rgba(76, 215, 246, 0.1)',
                                  color:
                                    d.status === 'succeeded'
                                      ? '#58E7AB'
                                      : d.status === 'failed'
                                        ? '#FA746F'
                                        : '#4CD7F6',
                                  border: `1px solid ${
                                    d.status === 'succeeded'
                                      ? 'rgba(88, 231, 171, 0.2)'
                                      : d.status === 'failed'
                                        ? 'rgba(250, 116, 111, 0.2)'
                                        : 'rgba(76, 215, 246, 0.2)'
                                  }`,
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
                                fontSize: '0.65rem',
                                height: 20,
                                bgcolor: 'rgba(105, 156, 255, 0.1)',
                                color: '#ADC6FF',
                                border: '1px solid rgba(105, 156, 255, 0.2)',
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ color: '#6475A1', fontSize: '0.75rem' }}>
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

        <Grid item xs={12} md={5}>
          <Typography
            variant="h6"
            sx={{ fontWeight: 600, mb: 2, color: '#DEE5FF', fontSize: '0.9rem' }}
          >
            {t('dashboard.quickActions')}
          </Typography>
          <Stack spacing={1.5}>
            <QuickAction
              title={t('nav.catalog')}
              description={t('dashboard.registerService')}
              icon={<StorageIcon />}
              color="#699CFF"
              onClick={() => navigate('/catalog')}
              delay={300}
            />
            <QuickAction
              title={t('dashboard.newDeployment')}
              description={t('dashboard.newDeployment')}
              icon={<RocketLaunchIcon />}
              color="#4CD7F6"
              onClick={() => navigate('/deployments')}
              delay={360}
            />
            <QuickAction
              title={t('nav.environments')}
              description={t('nav.environments')}
              icon={<CloudIcon />}
              color="#58E7AB"
              onClick={() => navigate('/environments')}
              delay={420}
            />
            <QuickAction
              title={t('nav.health')}
              description={t('dashboard.viewHealth')}
              icon={<MonitorHeartIcon />}
              color="#F59E0B"
              onClick={() => navigate('/health')}
              delay={480}
            />
            <QuickAction
              title={t('nav.cost')}
              description={t('nav.cost')}
              icon={<AttachMoneyIcon />}
              color="#FA746F"
              onClick={() => navigate('/cost')}
              delay={540}
            />
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardPage;
