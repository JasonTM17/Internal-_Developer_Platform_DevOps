import React, { useState } from 'react';
import {
  Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Typography, Divider, AppBar, Toolbar, IconButton, Avatar, Menu, MenuItem,
  Badge, Tooltip, useMediaQuery, useTheme, Stack, Chip, alpha,
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AppsIcon from '@mui/icons-material/Apps';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import CloudIcon from '@mui/icons-material/Cloud';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import { useAuth } from '../auth/AuthProvider';

const DRAWER_WIDTH = 260;
const COLLAPSED_DRAWER_WIDTH = 72;

const iconMap: Record<string, React.ReactNode> = {
  dashboard: <DashboardIcon />,
  apps: <AppsIcon />,
  rocket_launch: <RocketLaunchIcon />,
  cloud: <CloudIcon />,
  monitor_heart: <MonitorHeartIcon />,
  attach_money: <AttachMoneyIcon />,
};

interface NavigationItem {
  path: string;
  label: string;
  icon?: string;
}

interface NavigationGroup {
  group: string;
  items: NavigationItem[];
}

interface AppLayoutProps {
  children: React.ReactNode;
  navigation: NavigationGroup[];
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children, navigation }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleUserMenuClose();
    logout();
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile) setMobileOpen(false);
  };

  // Build breadcrumbs from path
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const breadcrumb = pathSegments.map((seg) =>
    seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' ')
  );

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Brand Header */}
      <Box sx={{ px: 2.5, py: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          sx={{
            width: 36, height: 36, borderRadius: 1.5,
            background: 'linear-gradient(135deg, #6C63FF, #03DAC6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(108, 99, 255, 0.3)',
            flexShrink: 0,
          }}
        >
          <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>I</Typography>
        </Box>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2, letterSpacing: -0.3 }}>
            IDP
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>
            Developer Platform
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />

      {/* Navigation Groups */}
      <Box sx={{ flex: 1, overflow: 'auto', py: 1 }}>
        {navigation.map((group) => (
          <React.Fragment key={group.group}>
            <Typography
              variant="overline"
              sx={{
                px: 2.5, pt: 2, pb: 0.5, display: 'block',
                color: 'text.secondary', fontSize: '0.65rem',
                letterSpacing: 1.5, fontWeight: 600,
              }}
            >
              {group.group}
            </Typography>
            <List disablePadding sx={{ px: 1 }}>
              {group.items.map((item) => {
                const isActive = item.path === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(item.path);
                return (
                  <ListItem key={item.path} disablePadding sx={{ mb: 0.3 }}>
                    <ListItemButton
                      selected={isActive}
                      onClick={() => handleNavigation(item.path)}
                      sx={{
                        borderRadius: 1.5,
                        py: 0.8,
                        px: 1.5,
                        transition: 'all 0.2s ease',
                        '&.Mui-selected': {
                          bgcolor: alpha('#6C63FF', 0.12),
                          '&:hover': { bgcolor: alpha('#6C63FF', 0.18) },
                          '& .MuiListItemIcon-root': { color: '#6C63FF' },
                          '& .MuiListItemText-primary': { color: '#E6EDF3', fontWeight: 600 },
                        },
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 36, color: 'text.secondary' }}>
                        {iconMap[item.icon || ''] || <AppsIcon />}
                      </ListItemIcon>
                      <ListItemText
                        primary={item.label}
                        primaryTypographyProps={{
                          variant: 'body2',
                          fontWeight: isActive ? 600 : 400,
                          color: isActive ? 'text.primary' : 'text.secondary',
                        }}
                      />
                      {isActive && (
                        <Box sx={{
                          width: 3, height: 20, borderRadius: 4,
                          bgcolor: '#6C63FF',
                          position: 'absolute', right: 0,
                        }} />
                      )}
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
          </React.Fragment>
        ))}
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />

      {/* Bottom Section */}
      <Box sx={{ p: 1 }}>
        <List disablePadding>
          <ListItem disablePadding>
            <ListItemButton sx={{ borderRadius: 1.5, py: 0.8, px: 1.5, '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' } }}>
              <ListItemIcon sx={{ minWidth: 36, color: 'text.secondary' }}><HelpOutlineIcon fontSize="small" /></ListItemIcon>
              <ListItemText primary="Help & Docs" primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }} />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton sx={{ borderRadius: 1.5, py: 0.8, px: 1.5, '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' } }}>
              <ListItemIcon sx={{ minWidth: 36, color: 'text.secondary' }}><SettingsOutlinedIcon fontSize="small" /></ListItemIcon>
              <ListItemText primary="Settings" primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }} />
            </ListItemButton>
          </ListItem>
        </List>
      </Box>

      {/* User Card */}
      <Box sx={{
        p: 2, mx: 1, mb: 1, borderRadius: 2,
        bgcolor: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', gap: 1.5,
      }}>
        <Avatar sx={{ width: 32, height: 32, bgcolor: '#6C63FF', fontSize: 14, fontWeight: 600 }}>
          {user?.name?.charAt(0) || 'D'}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 500, lineHeight: 1.2 }} noWrap>
            {user?.name || 'Developer'}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: '0.65rem' }}>
            {user?.email || 'dev@idp.local'}
          </Typography>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* AppBar */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          zIndex: (t) => t.zIndex.drawer + 1,
          bgcolor: 'rgba(13, 17, 23, 0.8)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          ...(isMobile ? {} : { ml: `${DRAWER_WIDTH}px`, width: `calc(100% - ${DRAWER_WIDTH}px)` }),
        }}
      >
        <Toolbar sx={{ gap: 1, minHeight: '56px !important' }}>
          {isMobile && (
            <IconButton color="inherit" onClick={() => setMobileOpen(!mobileOpen)} edge="start" sx={{ mr: 1 }}>
              <MenuIcon />
            </IconButton>
          )}

          {/* Breadcrumbs */}
          <Stack direction="row" alignItems="center" spacing={0.5} sx={{ flex: 1 }}>
            <Typography
              variant="body2"
              sx={{ color: 'text.secondary', cursor: 'pointer', '&:hover': { color: 'text.primary' } }}
              onClick={() => navigate('/')}
            >
              Home
            </Typography>
            {breadcrumb.map((seg, i) => (
              <React.Fragment key={i}>
                <KeyboardArrowRightIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="body2" sx={{ fontWeight: i === breadcrumb.length - 1 ? 600 : 400, color: i === breadcrumb.length - 1 ? 'text.primary' : 'text.secondary' }}>
                  {seg}
                </Typography>
              </React.Fragment>
            ))}
          </Stack>

          {/* Actions */}
          <Tooltip title="Notifications">
            <IconButton size="small" sx={{ color: 'text.secondary' }}>
              <Badge badgeContent={3} color="primary" variant="dot">
                <NotificationsNoneIcon fontSize="small" />
              </Badge>
            </IconButton>
          </Tooltip>

          <Chip
            label="v0.1.0"
            size="small"
            variant="outlined"
            sx={{ height: 24, fontSize: '0.7rem', borderColor: 'rgba(255,255,255,0.1)' }}
          />

          <Tooltip title="Account">
            <IconButton onClick={handleUserMenuOpen} size="small">
              <Avatar sx={{ width: 28, height: 28, bgcolor: '#6C63FF', fontSize: 12, fontWeight: 600 }}>
                {user?.name?.charAt(0) || 'D'}
              </Avatar>
            </IconButton>
          </Tooltip>

          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleUserMenuClose}
            PaperProps={{ sx: { mt: 1, minWidth: 180, bgcolor: '#161B22', border: '1px solid rgba(255,255,255,0.08)' } }}>
            <Box sx={{ px: 2, py: 1, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{user?.name}</Typography>
              <Typography variant="caption" color="text.secondary">{user?.email}</Typography>
            </Box>
            <MenuItem onClick={handleUserMenuClose} sx={{ py: 1, gap: 1.5 }}>
              <SettingsOutlinedIcon fontSize="small" /> Settings
            </MenuItem>
            <MenuItem onClick={handleLogout} sx={{ py: 1, gap: 1.5, color: 'error.main' }}>
              <LogoutIcon fontSize="small" /> Sign Out
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Sidebar */}
      {isMobile ? (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box', bgcolor: '#0D1117', borderRight: '1px solid rgba(255,255,255,0.06)' } }}
        >
          {drawerContent}
        </Drawer>
      ) : (
        <Drawer
          variant="permanent"
          sx={{
            width: DRAWER_WIDTH, flexShrink: 0,
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box', bgcolor: '#0D1117', borderRight: '1px solid rgba(255,255,255,0.06)' },
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, md: 0 },
          mt: '56px',
          minHeight: 'calc(100vh - 56px)',
          ...(isMobile ? {} : { ml: 0 }),
        }}
      >
        {children}
      </Box>
    </Box>
  );
};
