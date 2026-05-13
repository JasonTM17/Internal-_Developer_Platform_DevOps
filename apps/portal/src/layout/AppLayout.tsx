import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box, Drawer, AppBar, Toolbar, Typography, List, ListItem,
  ListItemButton, ListItemIcon, ListItemText, IconButton,
  Avatar, Badge, Divider, useTheme, useMediaQuery, Tooltip,
  Chip
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

const DRAWER_WIDTH = 260;

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
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#0d1117' }}>
      {/* Logo */}
      <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <img src="/logo.svg" alt="IDP" style={{ width: 36, height: 36 }} />
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'white', lineHeight: 1.2 }}>
            IDP
          </Typography>
          <Typography variant="caption" sx={{ color: '#8b949e', fontSize: '0.65rem' }}>
            Developer Platform
          </Typography>
        </Box>
        <Chip label="v1.0" size="small" sx={{ ml: 'auto', height: 20, fontSize: '0.6rem', bgcolor: 'rgba(108,99,255,0.15)', color: '#6C63FF' }} />
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />

      {/* Navigation */}
      <List sx={{ flex: 1, px: 1.5, py: 2 }}>
        {navItems.map((item) => (
          <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              onClick={() => { navigate(item.path); setMobileOpen(false); }}
              sx={{
                borderRadius: 2,
                py: 1.2,
                px: 2,
                bgcolor: isActive(item.path) ? 'rgba(108,99,255,0.12)' : 'transparent',
                '&:hover': { bgcolor: isActive(item.path) ? 'rgba(108,99,255,0.18)' : 'rgba(255,255,255,0.04)' },
                transition: 'all 0.2s ease',
              }}
            >
              <ListItemIcon sx={{ minWidth: 36, color: isActive(item.path) ? '#6C63FF' : '#8b949e' }}>
                {item.badge ? (
                  <Badge badgeContent={item.badge} color="error" sx={{ '& .MuiBadge-badge': { fontSize: '0.6rem', minWidth: 16, height: 16 } }}>
                    {item.icon}
                  </Badge>
                ) : item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{
                  fontSize: '0.85rem',
                  fontWeight: isActive(item.path) ? 600 : 400,
                  color: isActive(item.path) ? 'white' : '#c9d1d9',
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />

      {/* Bottom section */}
      <Box sx={{ p: 2 }}>
        <ListItemButton sx={{ borderRadius: 2, py: 1 }} onClick={() => navigate('/settings')}>
          <ListItemIcon sx={{ minWidth: 36, color: '#8b949e' }}>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Settings" primaryTypographyProps={{ fontSize: '0.85rem', color: '#8b949e' }} />
        </ListItemButton>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#0d1117' }}>
      {/* Sidebar */}
      {isMobile ? (
        <Drawer variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)}
          sx={{ '& .MuiDrawer-paper': { width: DRAWER_WIDTH, bgcolor: '#0d1117', borderRight: '1px solid rgba(255,255,255,0.06)' } }}>
          {drawer}
        </Drawer>
      ) : (
        <Drawer variant="permanent"
          sx={{ width: DRAWER_WIDTH, '& .MuiDrawer-paper': { width: DRAWER_WIDTH, bgcolor: '#0d1117', borderRight: '1px solid rgba(255,255,255,0.06)' } }}>
          {drawer}
        </Drawer>
      )}

      {/* Main content */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top bar */}
        <AppBar position="sticky" elevation={0} sx={{ bgcolor: '#161b22', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <Toolbar sx={{ minHeight: '56px !important' }}>
            {isMobile && (
              <IconButton edge="start" onClick={() => setMobileOpen(true)} sx={{ mr: 2, color: '#c9d1d9' }}>
                <MenuIcon />
              </IconButton>
            )}
            <Box sx={{ flex: 1 }} />
            <Tooltip title="Notifications">
              <IconButton sx={{ color: '#8b949e' }}>
                <Badge badgeContent={2} color="error" sx={{ '& .MuiBadge-badge': { fontSize: '0.6rem', minWidth: 16, height: 16 } }}>
                  <NotificationsIcon fontSize="small" />
                </Badge>
              </IconButton>
            </Tooltip>
            <Avatar sx={{ width: 32, height: 32, ml: 2, bgcolor: '#6C63FF', fontSize: '0.8rem' }}>JS</Avatar>
          </Toolbar>
        </AppBar>

        {/* Page content */}
        <Box component="main" sx={{ flex: 1, p: 3, overflow: 'auto' }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
};
