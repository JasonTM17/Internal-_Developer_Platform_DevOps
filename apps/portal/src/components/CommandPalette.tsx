import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog, DialogContent, TextField, List, ListItem, ListItemButton,
  ListItemIcon, ListItemText, Typography, Box, Chip, InputAdornment,
  useTheme
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AppsIcon from '@mui/icons-material/Apps';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import CloudIcon from '@mui/icons-material/Cloud';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import SettingsIcon from '@mui/icons-material/Settings';

interface CommandItem {
  id: string;
  label: string;
  group: string;
  path: string;
  icon: React.ReactNode;
  keywords?: string[];
}

const commands: CommandItem[] = [
  { id: 'dashboard', label: 'Dashboard', group: 'Pages', path: '/dashboard', icon: <DashboardIcon fontSize="small" />, keywords: ['home', 'overview'] },
  { id: 'catalog', label: 'Service Catalog', group: 'Pages', path: '/catalog', icon: <AppsIcon fontSize="small" />, keywords: ['services', 'apps'] },
  { id: 'deployments', label: 'Deployments', group: 'Pages', path: '/deployments', icon: <RocketLaunchIcon fontSize="small" />, keywords: ['deploy', 'release', 'pipeline'] },
  { id: 'environments', label: 'Environments', group: 'Pages', path: '/environments', icon: <CloudIcon fontSize="small" />, keywords: ['env', 'staging', 'production'] },
  { id: 'health', label: 'Health Monitor', group: 'Pages', path: '/health', icon: <MonitorHeartIcon fontSize="small" />, keywords: ['status', 'uptime', 'monitoring'] },
  { id: 'cost', label: 'Cost Analysis', group: 'Pages', path: '/cost', icon: <AttachMoneyIcon fontSize="small" />, keywords: ['billing', 'spend', 'budget'] },
  { id: 'settings', label: 'Settings', group: 'Pages', path: '/settings', icon: <SettingsIcon fontSize="small" />, keywords: ['preferences', 'config'] },
];

export const CommandPalette: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const theme = useTheme();

  // Open/close with Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filter commands based on query
  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    const lower = query.toLowerCase();
    return commands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(lower) ||
        cmd.group.toLowerCase().includes(lower) ||
        cmd.keywords?.some((kw) => kw.includes(lower))
    );
  }, [query]);

  // Group results
  const grouped = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};
    for (const item of filtered) {
      if (!groups[item.group]) groups[item.group] = [];
      groups[item.group].push(item);
    }
    return groups;
  }, [filtered]);

  // Reset state when opening
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [open]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && filtered[selectedIndex]) {
        e.preventDefault();
        navigate(filtered[selectedIndex].path);
        setOpen(false);
      }
    },
    [filtered, selectedIndex, navigate]
  );

  const handleSelect = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  let flatIndex = 0;

  return (
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: theme.palette.background.paper,
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 3,
          mt: '15vh',
          maxHeight: '60vh',
        },
      }}
      slotProps={{ backdrop: { sx: { bgcolor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' } } }}
      sx={{ '& .MuiDialog-container': { alignItems: 'flex-start' } }}
    >
      <DialogContent sx={{ p: 0 }}>
        {/* Search input */}
        <TextField
          autoFocus
          fullWidth
          placeholder="Search pages, services, actions..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
          onKeyDown={handleKeyDown}
          variant="outlined"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: theme.palette.text.secondary }} />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <Chip label="ESC" size="small" sx={{ height: 20, fontSize: '0.6rem', bgcolor: theme.palette.action?.hover || 'rgba(255,255,255,0.05)' }} />
              </InputAdornment>
            ),
            sx: { fontSize: '0.95rem' },
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 0,
              '& fieldset': { border: 'none', borderBottom: `1px solid ${theme.palette.divider}` },
            },
            px: 1,
            py: 0.5,
          }}
        />

        {/* Results */}
        <List sx={{ py: 1, maxHeight: '45vh', overflow: 'auto' }}>
          {Object.entries(grouped).map(([group, items]) => (
            <Box key={group}>
              <Typography
                variant="caption"
                sx={{ px: 2.5, py: 0.5, display: 'block', color: theme.palette.text.secondary, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}
              >
                {group}
              </Typography>
              {items.map((item) => {
                const currentIndex = flatIndex++;
                return (
                  <ListItem key={item.id} disablePadding>
                    <ListItemButton
                      selected={currentIndex === selectedIndex}
                      onClick={() => handleSelect(item.path)}
                      sx={{
                        mx: 1,
                        borderRadius: 1.5,
                        py: 1,
                        '&.Mui-selected': { bgcolor: 'rgba(108,99,255,0.12)' },
                        '&.Mui-selected:hover': { bgcolor: 'rgba(108,99,255,0.18)' },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 36, color: theme.palette.text.secondary }}>
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText
                        primary={item.label}
                        primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }}
                      />
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </Box>
          ))}
          {filtered.length === 0 && (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                No results found for &ldquo;{query}&rdquo;
              </Typography>
            </Box>
          )}
        </List>
      </DialogContent>
    </Dialog>
  );
};
