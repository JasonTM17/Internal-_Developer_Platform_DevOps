import AppsIcon from '@mui/icons-material/Apps';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import CircleIcon from '@mui/icons-material/Circle';
import CloudIcon from '@mui/icons-material/Cloud';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import DashboardIcon from '@mui/icons-material/Dashboard';
import LightModeIcon from '@mui/icons-material/LightMode';
import MenuIcon from '@mui/icons-material/Menu';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import NotificationsIcon from '@mui/icons-material/Notifications';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import SettingsIcon from '@mui/icons-material/Settings';
import SettingsBrightnessIcon from '@mui/icons-material/SettingsBrightness';
import TranslateIcon from '@mui/icons-material/Translate';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Avatar,
  Badge,
  Divider,
  useTheme,
  useMediaQuery,
  Tooltip,
  Chip,
  Stack,
} from '@mui/material';
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

import { useThemeMode } from '../theme/ThemeContext';

const DRAWER_WIDTH = 240;
const DRAWER_COLLAPSED_WIDTH = 56;

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

interface AppLayoutProps {
  children: React.ReactNode;
  navigation?: unknown;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [apiConnected, setApiConnected] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const { mode, toggleTheme } = useThemeMode();
  const { t, i18n } = useTranslation();

  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));
  const isMedium = useMediaQuery(theme.breakpoints.between('sm', 'md'));

  const collapsed = isMedium;

  const navItems: NavItem[] = [
    { path: '/dashboard', label: t('nav.dashboard'), icon: <DashboardIcon /> },
    { path: '/catalog', label: t('nav.catalog'), icon: <AppsIcon /> },
    { path: '/deployments', label: t('nav.deployments'), icon: <RocketLaunchIcon />, badge: 3 },
    { path: '/environments', label: t('nav.environments'), icon: <CloudIcon /> },
    { path: '/health', label: t('nav.health'), icon: <MonitorHeartIcon /> },
    { path: '/cost', label: t('nav.cost'), icon: <AttachMoneyIcon /> },
  ];

  const toggleLanguage = () => {
    void i18n.changeLanguage(i18n.language === 'vi' ? 'en' : 'vi');
  };

  useEffect(() => {
    const checkConnection = () => setApiConnected(true);
    checkConnection();
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  const currentDrawerWidth = collapsed ? DRAWER_COLLAPSED_WIDTH : DRAWER_WIDTH;

  const themeIcon =
    mode === 'dark' ? (
      <LightModeIcon fontSize="small" />
    ) : mode === 'light' ? (
      <DarkModeIcon fontSize="small" />
    ) : (
      <SettingsBrightnessIcon fontSize="small" />
    );
  const themeTooltip =
    mode === 'dark'
      ? 'Switch to light mode'
      : mode === 'light'
        ? 'Switch to system mode'
        : 'Switch to dark mode';

  const drawer = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: '#060E20',
        borderRight: '1px solid rgba(100, 117, 161, 0.15)',
      }}
    >
      <Box
        sx={{
          p: collapsed ? 1.5 : 2.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          justifyContent: collapsed ? 'center' : 'flex-start',
          minHeight: 64,
        }}
      >
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: 1.5,
            background: 'linear-gradient(135deg, #699CFF, #4CD7F6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(105, 156, 255, 0.3)',
          }}
        >
          <img
            src="/logo.svg"
            alt="IDP"
            style={{ width: 20, height: 20, filter: 'brightness(10)' }}
          />
        </Box>
        {!collapsed && (
          <>
            <Box>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 700, color: '#DEE5FF', lineHeight: 1.2, fontSize: '0.9rem' }}
              >
                IDP
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: '#6475A1',
                  fontSize: '0.6rem',
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                }}
              >
                DevOps Platform
              </Typography>
            </Box>
            <Chip
              label="v1.2"
              size="small"
              sx={{
                ml: 'auto',
                height: 20,
                fontSize: '0.6rem',
                bgcolor: 'rgba(88, 231, 171, 0.1)',
                color: '#58E7AB',
                border: '1px solid rgba(88, 231, 171, 0.2)',
              }}
            />
          </>
        )}
      </Box>

      <Divider />

      <List sx={{ flex: 1, px: collapsed ? 0.5 : 1.5, py: 2 }}>
        {navItems.map((item) => (
          <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
            <Tooltip title={collapsed ? item.label : ''} placement="right" arrow>
              <ListItemButton
                onClick={() => {
                  navigate(item.path);
                  setMobileOpen(false);
                }}
                sx={{
                  borderRadius: 2,
                  py: 1,
                  px: collapsed ? 1.5 : 2,
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  bgcolor: isActive(item.path) ? 'rgba(105, 156, 255, 0.12)' : 'transparent',
                  borderLeft: isActive(item.path) ? '3px solid #699CFF' : '3px solid transparent',
                  '&:hover': {
                    bgcolor: isActive(item.path)
                      ? 'rgba(105, 156, 255, 0.16)'
                      : 'rgba(100, 117, 161, 0.08)',
                  },
                  transition: 'all 0.2s ease',
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: collapsed ? 'auto' : 36,
                    color: isActive(item.path) ? '#ADC6FF' : '#6475A1',
                  }}
                >
                  {item.badge ? (
                    <Badge
                      badgeContent={item.badge}
                      color="error"
                      sx={{ '& .MuiBadge-badge': { fontSize: '0.6rem', minWidth: 16, height: 16 } }}
                    >
                      {item.icon}
                    </Badge>
                  ) : (
                    item.icon
                  )}
                </ListItemIcon>
                {!collapsed && (
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      fontSize: '0.8rem',
                      fontWeight: isActive(item.path) ? 600 : 400,
                      color: isActive(item.path) ? '#DEE5FF' : '#99AAD9',
                    }}
                  />
                )}
              </ListItemButton>
            </Tooltip>
          </ListItem>
        ))}
      </List>

      <Divider />

      <Box sx={{ p: collapsed ? 1 : 2 }}>
        <Tooltip title={collapsed ? t('nav.settings') : ''} placement="right" arrow>
          <ListItemButton
            sx={{
              borderRadius: 2,
              py: 1,
              justifyContent: collapsed ? 'center' : 'flex-start',
              '&:hover': { bgcolor: 'rgba(100, 117, 161, 0.08)' },
            }}
            onClick={() => navigate('/settings')}
          >
            <ListItemIcon sx={{ minWidth: collapsed ? 'auto' : 36, color: '#6475A1' }}>
              <SettingsIcon fontSize="small" />
            </ListItemIcon>
            {!collapsed && (
              <ListItemText
                primary={t('nav.settings')}
                primaryTypographyProps={{
                  fontSize: '0.8rem',
                  color: '#99AAD9',
                }}
              />
            )}
          </ListItemButton>
        </Tooltip>

        {!collapsed && (
          <Box
            sx={{
              mt: 1.5,
              px: 2,
              py: 1,
              borderRadius: 2,
              bgcolor: 'rgba(100, 117, 161, 0.06)',
              border: '1px solid rgba(100, 117, 161, 0.1)',
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1}>
              <CircleIcon
                sx={{
                  fontSize: 8,
                  color: apiConnected ? '#58E7AB' : '#FA746F',
                }}
              />
              <Typography
                variant="caption"
                sx={{
                  color: apiConnected ? '#58E7AB' : '#FA746F',
                  fontSize: '0.7rem',
                  fontWeight: 500,
                }}
              >
                {apiConnected ? t('common.apiConnected') : t('common.apiDisconnected')}
              </Typography>
            </Stack>
          </Box>
        )}
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#060E20' }}>
      {isSmall ? (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          sx={{
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              bgcolor: '#060E20',
              borderRight: '1px solid rgba(100, 117, 161, 0.15)',
            },
          }}
        >
          {drawer}
        </Drawer>
      ) : (
        <Drawer
          variant="permanent"
          sx={{
            width: currentDrawerWidth,
            transition: 'width 0.2s ease',
            '& .MuiDrawer-paper': {
              width: currentDrawerWidth,
              bgcolor: '#060E20',
              borderRight: '1px solid rgba(100, 117, 161, 0.15)',
              transition: 'width 0.2s ease',
              overflowX: 'hidden',
            },
          }}
        >
          {drawer}
        </Drawer>
      )}

      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            bgcolor: '#0A1836',
            borderBottom: '1px solid rgba(100, 117, 161, 0.15)',
          }}
        >
          <Toolbar sx={{ minHeight: '56px !important' }}>
            {isSmall && (
              <IconButton
                edge="start"
                onClick={() => setMobileOpen(true)}
                sx={{ mr: 2, color: '#DEE5FF' }}
              >
                <MenuIcon />
              </IconButton>
            )}
            <Box sx={{ flex: 1 }} />
            <Tooltip title={t('language.switchLanguage')}>
              <IconButton
                onClick={toggleLanguage}
                sx={{
                  color: '#6475A1',
                  mr: 1,
                  '&:hover': { color: '#99AAD9', bgcolor: 'rgba(100, 117, 161, 0.1)' },
                }}
              >
                <TranslateIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={themeTooltip}>
              <IconButton
                onClick={toggleTheme}
                sx={{
                  color: '#6475A1',
                  mr: 1,
                  '&:hover': { color: '#99AAD9', bgcolor: 'rgba(100, 117, 161, 0.1)' },
                }}
              >
                {themeIcon}
              </IconButton>
            </Tooltip>
            <Tooltip title="Notifications">
              <IconButton
                sx={{
                  color: '#6475A1',
                  '&:hover': { color: '#99AAD9', bgcolor: 'rgba(100, 117, 161, 0.1)' },
                }}
              >
                <Badge
                  badgeContent={2}
                  color="error"
                  sx={{ '& .MuiBadge-badge': { fontSize: '0.6rem', minWidth: 16, height: 16 } }}
                >
                  <NotificationsIcon fontSize="small" />
                </Badge>
              </IconButton>
            </Tooltip>
            <Avatar
              sx={{
                width: 32,
                height: 32,
                ml: 2,
                bgcolor: '#699CFF',
                fontSize: '0.8rem',
                fontWeight: 600,
              }}
            >
              JS
            </Avatar>
          </Toolbar>
        </AppBar>

        <Box
          component="main"
          sx={{
            flex: 1,
            overflow: 'auto',
            p: { xs: 2, sm: 2.5, md: 3, lg: 4 },
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
};
