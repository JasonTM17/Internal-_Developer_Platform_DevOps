import React from 'react';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
  Divider,
  AppBar,
  Toolbar,
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';

const DRAWER_WIDTH = 240;

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

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
      >
        <Toolbar>
          <Typography variant="h6" noWrap component="div">
            IDP — Internal Developer Platform
          </Typography>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
          },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto' }}>
          {navigation.map((group) => (
            <React.Fragment key={group.group}>
              <Typography
                variant="overline"
                sx={{ px: 2, pt: 2, display: 'block', color: 'text.secondary' }}
              >
                {group.group}
              </Typography>
              <List disablePadding>
                {group.items.map((item) => (
                  <ListItem key={item.path} disablePadding>
                    <ListItemButton
                      selected={location.pathname.startsWith(item.path)}
                      onClick={() => navigate(item.path)}
                    >
                      <ListItemText primary={item.label} />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
              <Divider />
            </React.Fragment>
          ))}
        </Box>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
};
