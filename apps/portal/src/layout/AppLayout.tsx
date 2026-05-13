import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box, Drawer, AppBar, Toolbar, Typography, List, ListItem,
  ListItemButton, ListItemIcon, ListItemText, IconButton,
  Avatar, Badge, Divider, useTheme, useMediaQuery, Tooltip,
  Chip, Stack
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AppsIcon from '@mui/icons-material/Apps';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import CloudIcon from '@mui/icons-material/Cloud';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SettingsIcon from '@mui/icons-material/Settings';
import CircleIcon from '@mui/icons-material/Circle';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import { useThemeMode } from '../theme/ThemeContext';

const DRAWER_WIDTH = 260;
const DRAWER_COLLAPSED_WIDTH = 72;

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

const navItems: NavItem[] = [
  { path: '/dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
  { path: '/catalog', label: 'Service Catalog', icon: <AppsIcon /> },
  { path: '/deployments', label: 'Deployments', icon: <RocketLaunchIcon />, badge: 3 },
  { path: '/environments', label: 'Environments', icon: <CloudIcon /> },
  { path: '/health', label: 'Health Monitor', icon: <MonitorHeartIcon /> },
  { path: '/cost', label: 'Cost Analysis', icon: <AttachMoneyIcon /> },
];

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

  // Responsive breakpoints
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));   // < 600px — hamburger
  const isMedium = useMediaQuery(theme.breakpoints.between('sm', 'md')); // 600-960px — icons only
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));   // > 960px — full sidebar

  const collapsed = isMedium; // Icons-only mode at medium breakpoint

  // Simulate API connection check
  useEffect(() => {
    const checkConnection = () => {
      setApiConnected(true);
    };
    checkConnection();
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  const currentDrawerWidth = collapsed ? DRAWER_COLLAPSED_WIDTH : DRAWER_WIDTH;

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: theme.palette.background.default }}>
      {/* Logo */}
      <Box sx={{ p: collapsed ? 1.5 : 2.5, display: 'flex', alignItems: 'center', gap: 1.5, justifyContent: collapsed ? 'center' : 'flex-start' }}>
        <img src="/logo.svg" alt="IDP" style={{ width: 36, height: 36 }} />
        {!collapsed && (
          <>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: theme.palette.text.primary, lineHeight: 1.2 }}>
                IDP
              </Typography>
              <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontSize: '0.65rem' }}>
                Developer Platform
              </Typography>
            </Box>
            <Chip label="v1.0" size="small" sx={{ ml: 'auto', height: 20, fontSize: '0.6rem', bgcolor: 'rgba(108,99,255,0.15)', color: '#6C63FF' }} />
          </>
        )}
      </Box>

      <Divider sx={{ borderColor: theme.palette.divider }} />

      {/* Navigation */}
      <List sx={{ flex: 1, px: collapsed ? 1 : 1.5, py: 2 }}>
        {navItems.map((item) => (
          <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
            <Tooltip title={collapsed ? item.label : ''} placement="right" arrow>
              <ListItemButton
                onClick={() => { navigate(item.path); setMobileOpen(false); }}
                sx={{
                  borderRadius: 2,
                  py: 1.2,
                  px: collapsed ? 1.5 : 2,
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  bgcolor: isActive(item.path) ? 'rgba(108,99,255,0.12)' : 'transparent',
                  '&:hover': { bgcolor: isActive(item.path) ? 'rgba(108,99,255,0.18)' : 'rgba(255,255,255,0.04)' },
                  transition: 'all 0.2s ease',
                }}
              >
                <ListItemIcon sx={{ minWidth: collapsed ? 'auto' : 36, color: isActive(item.path) ? '#6C63FF' : theme.palette.text.secondary }}>
                  {item.badge ? (
                    <Badge badgeContent={item.badge} color="error" sx={{ '& .MuiBadge-badge': { fontSize: '0.6rem', minWidth: 16, height: 16 } }}>
                      {item.icon}
                    </Badge>
                  ) : item.icon}
                </ListItemIcon>
                {!collapsed && (
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      fontSize: '0.85rem',
                      fontWeight: isActive(item.path) ? 600 : 400,
                      color: isActive(item.path) ? theme.palette.text.primary : theme.palette.text.secondary,
                    }}
                  />
                )}
              </ListItemButton>
            </Tooltip>
          </ListItem>
        ))}
      </List>

      <Divider sx={{ borderColor: theme.palette.divider }} />

      {/* Bottom section */}
      <Box sx={{ p: collapsed ? 1 : 2 }}>
        <Tooltip title={collapsed ? 'Settings' : ''} placement="right" arrow>
          <ListItemButton sx={{ borderRadius: 2, py: 1, justifyContent: collapsed ? 'center' : 'flex-start' }} onClick={() => navigate('/settings')}>
            <ListItemIcon sx={{ minWidth: collapsed ? 'auto' : 36, color: theme.palette.text.secondary }}>
              <SettingsIcon fontSize="small" />
            </ListItemIcon>
            {!collapsed && <ListItemText primary="Settings" primaryTypographyProps={{ fontSize: '0.85rem', color: theme.palette.text.secondary }} />}
          </ListItemButton>
        </Tooltip>

        {/* API Connection Status */}
        {!collapsed && (
          <Box sx={{ mt: 1.5, px: 2, py: 1, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.02)' }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <CircleIcon sx={{ fontSize: 8, color: apiConnected ? '#3fb950' : '#f85149' }} />
              <Typography variant="caption" sx={{ color: apiConnected ? '#3fb950' : '#f85149', fontSize: '0.7rem', fontWeight: 500 }}>
                {apiConnected ? 'API Connected' : 'API Disconnected'}
              </Typography>
            </Stack>
          </Box>
        )}
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: theme.palette.background.default }}>
      {/* Sidebar */}
      {isSmall ? (
        <Drawer variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)}
          sx={{ '& .MuiDrawer-paper': { width: DRAWER_WIDTH, bgcolor: theme.palette.background.default, borderRight: `1px solid ${theme.palette.divider}` } }}>
          {drawer}
        </Drawer>
      ) : (
        <Drawer variant="permanent"
          sx={{
            width: currentDrawerWidth,
            transition: 'width 0.2s ease',
            '& .MuiDrawer-paper': {
              width: currentDrawerWidth,
              bgcolor: theme.palette.background.default,
              borderRight: `1px solid ${theme.palette.divider}`,
              transition: 'width 0.2s ease',
              overflowX: 'hidden',
            },
          }}>
          {drawer}
        </Drawer>
      )}

      {/* Main content */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top bar */}
        <AppBar position="sticky" elevation={0} sx={{ bgcolor: theme.palette.background.paper, borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Toolbar sx={{ minHeight: '56px !important' }}>
            {isSmall && (
              <IconButton edge="start" onClick={() => setMobileOpen(true)} sx={{ mr: 2, color: theme.palette.text.primary }}>
                <MenuIcon />
              </IconButton>
            )}
            <Box sx={{ flex: 1 }} />
            <Tooltip title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
              <IconButton onClick={toggleTheme} sx={{ color: theme.palette.text.secondary, mr: 1 }}>
                {mode === 'dark' ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
            <Tooltip title="Notifications">
              <IconButton sx={{ color: theme.palette.text.secondary }}>
                <Badge badgeContent={2} color="error" sx={{ '& .MuiBadge-badge': { fontSize: '0.6rem', minWidth: 16, height: 16 } }}>
                  <NotificationsIcon fontSize="small" />
                </Badge>
              </IconButton>
            </Tooltip>
            <Avatar sx={{ width: 32, height: 32, ml: 2, bgcolor: '#6C63FF', fontSize: '0.8rem' }}>JS</Avatar>
          </Toolbar>
        </AppBar>

        {/* Page content with responsive padding */}
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
