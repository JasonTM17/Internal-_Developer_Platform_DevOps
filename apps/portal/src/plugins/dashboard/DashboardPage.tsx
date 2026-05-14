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
  useTheme,
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
  const theme = useTheme();
  return (
    <Card
      sx={{
        position: 'relative',
        overflow: 'hidden',
        animation: 'fadeInUp 0.5s ease-out both',
        animationDelay: `${delay}ms`,
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: `linear-gradient(90deg, ${color}, transparent)`,
        },
        '&:hover': { transform: 'translateY(-4px)', boxShadow: `0 8px 25px ${alpha(color, 0.12)}` },
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography
              variant="caption"
              sx={{
                color: theme.palette.text.secondary,
                textTransform: 'uppercase',
                letterSpacing: 1,
                fontSize: '0.7rem',
              }}
            >
              {title}
            </Typography>
            <Typography
              variant="h3"
              sx={{ fontWeight: 700, mt: 0.5, lineHeight: 1, color: theme.palette.text.primary }}
            >
              {animVal}
              {suffix}
            </Typography>
          </Box>
          <Avatar sx={{ bgcolor: alpha(color, 0.12), color, width: 44, height: 44 }}>{icon}</Avatar>
        </Box>
        {trend !== undefined && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1.5 }}>
            {trend >= 0 ? (
              <TrendingUpIcon sx={{ fontSize: 16, color: theme.palette.success.main }} />
            ) : (
              <TrendingDownIcon sx={{ fontSize: 16, color: theme.palette.error.main }} />
            )}
            <Typography
              variant="caption"
              sx={{ color: trend >= 0 ? theme.palette.success.main : theme.palette.error.main }}
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
  const theme = useTheme();
  return (
    <Card
      onClick={onClick}
      sx={{
        cursor: 'pointer',
        animation: 'fadeInUp 0.4s ease-out both',
        animationDelay: `${delay}ms`,
        '&:hover': {
          transform: 'translateY(-2px)',
          borderColor: color,
          boxShadow: `0 4px 16px ${alpha(color, 0.12)}`,
          '& .action-arrow': { transform: 'translateX(4px)', opacity: 1 },
        },
        transition: 'all 0.25s ease',
      }}
    >
      <CardContent sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Avatar sx={{ bgcolor: alpha(color, 0.12), color, width: 40, height: 40 }}>{icon}</Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography
            variant="subtitle2"
            sx={{ fontWeight: 600, color: theme.palette.text.primary }}
          >
            {title}
          </Typography>
          <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
            {description}
          </Typography>
        </Box>
        <ArrowForwardIcon
          className="action-arrow"
          sx={{
            color: theme.palette.text.secondary,
            opacity: 0.3,
            transition: 'all 0.2s ease',
            fontSize: 18,
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
  const theme = useTheme();
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
    if (s === 'succeeded')
      return <CheckCircleIcon sx={{ fontSize: 16, color: theme.palette.success.main }} />;
    if (s === 'failed') return <ErrorIcon sx={{ fontSize: 16, color: theme.palette.error.main }} />;
    if (s === 'in_progress')
      return <RocketLaunchIcon sx={{ fontSize: 16, color: theme.palette.info.main }} />;
    return <WarningIcon sx={{ fontSize: 16, color: theme.palette.warning.main }} />;
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
        <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
          {t('dashboard.title')}
        </Typography>
        <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mt: 0.5 }}>
          {today}
        </Typography>
      </Box>

      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        <Grid item xs={6} md={3}>
          <StatCard
            title={t('dashboard.services')}
            value={12}
            icon={<StorageIcon />}
            color={theme.palette.primary.main}
            delay={0}
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard
            title={t('dashboard.deploymentsToday')}
            value={8}
            icon={<RocketLaunchIcon />}
            color={theme.palette.secondary.main}
            trend={12}
            delay={80}
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard
            title={t('dashboard.environments')}
            value={4}
            icon={<CloudIcon />}
            color={theme.palette.success.main}
            delay={160}
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard
            title={t('dashboard.healthScore')}
            value={98}
            suffix="%"
            icon={<SpeedIcon />}
            color={theme.palette.warning.main}
            trend={2.5}
            delay={240}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Card>
            <CardContent sx={{ p: 0 }}>
              <Box
                sx={{
                  px: 3,
                  py: 2.5,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: `1px solid ${theme.palette.divider}`,
                }}
              >
                <Box>
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: 600, color: theme.palette.text.primary }}
                  >
                    {t('dashboard.recentDeployments')}
                  </Typography>
                  <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                    {t('dashboard.latestActivity')}
                  </Typography>
                </Box>
                <Button
                  size="small"
                  onClick={() => navigate('/deployments')}
                  sx={{ color: theme.palette.primary.main }}
                >
                  {t('common.viewAll')}
                </Button>
              </Box>
              {loading ? (
                <Box sx={{ p: 3 }}>
                  <LinearProgress />
                </Box>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ color: theme.palette.text.secondary }}>Status</TableCell>
                        <TableCell sx={{ color: theme.palette.text.secondary }}>Service</TableCell>
                        <TableCell sx={{ color: theme.palette.text.secondary }}>
                          Environment
                        </TableCell>
                        <TableCell sx={{ color: theme.palette.text.secondary }}>Time</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {recentDeployments.map((d) => (
                        <TableRow
                          key={d.id}
                          sx={{ '&:hover': { bgcolor: alpha(theme.palette.text.primary, 0.02) } }}
                        >
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {statusIcon(d.status)}
                              <Chip
                                label={d.status.replace('_', ' ')}
                                size="small"
                                color={
                                  d.status === 'succeeded'
                                    ? 'success'
                                    : d.status === 'failed'
                                      ? 'error'
                                      : 'info'
                                }
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
                                fontSize: '0.7rem',
                                height: 22,
                                bgcolor: alpha(theme.palette.primary.main, 0.1),
                                color: theme.palette.primary.light,
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ color: theme.palette.text.secondary }}>
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
            sx={{ fontWeight: 600, mb: 2, color: theme.palette.text.primary }}
          >
            {t('dashboard.quickActions')}
          </Typography>
          <Stack spacing={1.5}>
            <QuickAction
              title={t('nav.catalog')}
              description={t('dashboard.registerService')}
              icon={<StorageIcon />}
              color={theme.palette.primary.main}
              onClick={() => navigate('/catalog')}
              delay={300}
            />
            <QuickAction
              title={t('dashboard.newDeployment')}
              description={t('dashboard.newDeployment')}
              icon={<RocketLaunchIcon />}
              color={theme.palette.secondary.main}
              onClick={() => navigate('/deployments')}
              delay={360}
            />
            <QuickAction
              title={t('nav.environments')}
              description={t('nav.environments')}
              icon={<CloudIcon />}
              color={theme.palette.success.main}
              onClick={() => navigate('/environments')}
              delay={420}
            />
            <QuickAction
              title={t('nav.health')}
              description={t('dashboard.viewHealth')}
              icon={<MonitorHeartIcon />}
              color={theme.palette.warning.main}
              onClick={() => navigate('/health')}
              delay={480}
            />
            <QuickAction
              title={t('nav.cost')}
              description={t('nav.cost')}
              icon={<AttachMoneyIcon />}
              color={theme.palette.error.main}
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
