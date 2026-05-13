import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Tabs,
  Tab,
  TextField,
  Button,
  Switch,
  Stack,
  Avatar,
  Divider,
  IconButton,
  Chip,
  Tooltip,
  FormControlLabel,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import NotificationsIcon from '@mui/icons-material/Notifications';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import PaletteIcon from '@mui/icons-material/Palette';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';

interface TabPanelProps {
  children: React.ReactNode;
  value: number;
  index: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <Box role="tabpanel" hidden={value !== index} sx={{ py: 3 }}>
    {value === index && children}
  </Box>
);

// Mock API keys
const mockApiKeys = [
  { id: 'key-1', name: 'Production Deploy', prefix: 'idp_prod_****7f3a', created: '2025-01-05', lastUsed: '2 hours ago' },
  { id: 'key-2', name: 'CI/CD Pipeline', prefix: 'idp_ci_****2b8e', created: '2024-12-15', lastUsed: '5 minutes ago' },
  { id: 'key-3', name: 'Local Development', prefix: 'idp_dev_****9c1d', created: '2025-01-10', lastUsed: '1 day ago' },
];

export const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [profile, setProfile] = useState({
    name: 'Jane Smith',
    email: 'jane.smith@company.com',
    team: 'Platform Engineering',
    role: 'Senior Engineer',
  });
  const [notifications, setNotifications] = useState({
    emailDeploy: true,
    emailIncident: true,
    emailWeekly: false,
    slackDeploy: true,
    slackIncident: true,
    slackCost: false,
    inAppAll: true,
    inAppMentions: true,
    inAppUpdates: true,
  });
  const [appearance, setAppearance] = useState({
    theme: 'dark',
    density: 'comfortable',
  });

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', animation: 'fadeIn 0.5s ease-out both' }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#ffffff', mb: 0.5 }}>
          Settings
        </Typography>
        <Typography variant="body2" sx={{ color: '#8b949e' }}>
          Manage your account preferences and configuration
        </Typography>
      </Box>

      {/* Tabs */}
      <Card sx={{ bgcolor: '#161b22', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px' }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          sx={{
            px: 3,
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            '& .MuiTab-root': {
              color: '#8b949e',
              fontWeight: 500,
              textTransform: 'none',
              minHeight: 48,
              '&.Mui-selected': { color: '#6C63FF' },
            },
            '& .MuiTabs-indicator': { bgcolor: '#6C63FF', height: 2, borderRadius: 1 },
          }}
        >
          <Tab icon={<PersonIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Profile" />
          <Tab icon={<NotificationsIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Notifications" />
          <Tab icon={<VpnKeyIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="API Keys" />
          <Tab icon={<PaletteIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Appearance" />
        </Tabs>

        {/* Profile Tab */}
        <TabPanel value={activeTab} index={0}>
          <Box sx={{ px: 3 }}>
            <Stack direction="row" alignItems="center" spacing={3} sx={{ mb: 4 }}>
              <Avatar
                sx={{
                  width: 72,
                  height: 72,
                  bgcolor: '#6C63FF',
                  fontSize: '1.5rem',
                  fontWeight: 700,
                }}
              >
                JS
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 600 }}>
                  {profile.name}
                </Typography>
                <Typography variant="body2" sx={{ color: '#8b949e' }}>
                  {profile.role} • {profile.team}
                </Typography>
                <Button size="small" sx={{ mt: 1, color: '#6C63FF', textTransform: 'none' }}>
                  Change avatar
                </Button>
              </Box>
            </Stack>

            <Stack spacing={3}>
              <TextField
                label="Full Name"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                fullWidth
                size="small"
                sx={{ '& .MuiInputBase-root': { bgcolor: 'rgba(255,255,255,0.02)' } }}
              />
              <TextField
                label="Email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                fullWidth
                size="small"
                sx={{ '& .MuiInputBase-root': { bgcolor: 'rgba(255,255,255,0.02)' } }}
              />
              <TextField
                label="Team"
                value={profile.team}
                onChange={(e) => setProfile({ ...profile, team: e.target.value })}
                fullWidth
                size="small"
                sx={{ '& .MuiInputBase-root': { bgcolor: 'rgba(255,255,255,0.02)' } }}
              />
              <TextField
                label="Role"
                value={profile.role}
                onChange={(e) => setProfile({ ...profile, role: e.target.value })}
                fullWidth
                size="small"
                sx={{ '& .MuiInputBase-root': { bgcolor: 'rgba(255,255,255,0.02)' } }}
              />
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  sx={{
                    bgcolor: '#6C63FF',
                    borderRadius: '8px',
                    px: 3,
                    fontWeight: 600,
                    '&:hover': { bgcolor: '#5a52e0' },
                  }}
                >
                  Save Changes
                </Button>
              </Box>
            </Stack>
          </Box>
        </TabPanel>

        {/* Notifications Tab */}
        <TabPanel value={activeTab} index={1}>
          <Box sx={{ px: 3 }}>
            {/* Email Notifications */}
            <Typography variant="subtitle1" sx={{ color: '#ffffff', fontWeight: 600, mb: 2 }}>
              Email Notifications
            </Typography>
            <Stack spacing={1} sx={{ mb: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1 }}>
                <Box>
                  <Typography variant="body2" sx={{ color: '#c9d1d9' }}>Deployment notifications</Typography>
                  <Typography variant="caption" sx={{ color: '#8b949e' }}>Get notified when deployments complete or fail</Typography>
                </Box>
                <Switch
                  checked={notifications.emailDeploy}
                  onChange={(e) => setNotifications({ ...notifications, emailDeploy: e.target.checked })}
                  sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#6C63FF' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#6C63FF' } }}
                />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1 }}>
                <Box>
                  <Typography variant="body2" sx={{ color: '#c9d1d9' }}>Incident alerts</Typography>
                  <Typography variant="caption" sx={{ color: '#8b949e' }}>Critical alerts for service incidents</Typography>
                </Box>
                <Switch
                  checked={notifications.emailIncident}
                  onChange={(e) => setNotifications({ ...notifications, emailIncident: e.target.checked })}
                  sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#6C63FF' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#6C63FF' } }}
                />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1 }}>
                <Box>
                  <Typography variant="body2" sx={{ color: '#c9d1d9' }}>Weekly digest</Typography>
                  <Typography variant="caption" sx={{ color: '#8b949e' }}>Summary of platform activity each week</Typography>
                </Box>
                <Switch
                  checked={notifications.emailWeekly}
                  onChange={(e) => setNotifications({ ...notifications, emailWeekly: e.target.checked })}
                  sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#6C63FF' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#6C63FF' } }}
                />
              </Box>
            </Stack>

            <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)', mb: 3 }} />

            {/* Slack Notifications */}
            <Typography variant="subtitle1" sx={{ color: '#ffffff', fontWeight: 600, mb: 2 }}>
              Slack Notifications
            </Typography>
            <Stack spacing={1} sx={{ mb: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1 }}>
                <Box>
                  <Typography variant="body2" sx={{ color: '#c9d1d9' }}>Deploy updates</Typography>
                  <Typography variant="caption" sx={{ color: '#8b949e' }}>Post to #deployments channel</Typography>
                </Box>
                <Switch
                  checked={notifications.slackDeploy}
                  onChange={(e) => setNotifications({ ...notifications, slackDeploy: e.target.checked })}
                  sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#6C63FF' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#6C63FF' } }}
                />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1 }}>
                <Box>
                  <Typography variant="body2" sx={{ color: '#c9d1d9' }}>Incident alerts</Typography>
                  <Typography variant="caption" sx={{ color: '#8b949e' }}>DM for critical incidents</Typography>
                </Box>
                <Switch
                  checked={notifications.slackIncident}
                  onChange={(e) => setNotifications({ ...notifications, slackIncident: e.target.checked })}
                  sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#6C63FF' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#6C63FF' } }}
                />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1 }}>
                <Box>
                  <Typography variant="body2" sx={{ color: '#c9d1d9' }}>Cost alerts</Typography>
                  <Typography variant="caption" sx={{ color: '#8b949e' }}>Notify when spending exceeds thresholds</Typography>
                </Box>
                <Switch
                  checked={notifications.slackCost}
                  onChange={(e) => setNotifications({ ...notifications, slackCost: e.target.checked })}
                  sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#6C63FF' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#6C63FF' } }}
                />
              </Box>
            </Stack>

            <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)', mb: 3 }} />

            {/* In-App Notifications */}
            <Typography variant="subtitle1" sx={{ color: '#ffffff', fontWeight: 600, mb: 2 }}>
              In-App Notifications
            </Typography>
            <Stack spacing={1}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1 }}>
                <Box>
                  <Typography variant="body2" sx={{ color: '#c9d1d9' }}>All activity</Typography>
                  <Typography variant="caption" sx={{ color: '#8b949e' }}>Show all platform notifications</Typography>
                </Box>
                <Switch
                  checked={notifications.inAppAll}
                  onChange={(e) => setNotifications({ ...notifications, inAppAll: e.target.checked })}
                  sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#6C63FF' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#6C63FF' } }}
                />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1 }}>
                <Box>
                  <Typography variant="body2" sx={{ color: '#c9d1d9' }}>Mentions only</Typography>
                  <Typography variant="caption" sx={{ color: '#8b949e' }}>Only notify when directly mentioned</Typography>
                </Box>
                <Switch
                  checked={notifications.inAppMentions}
                  onChange={(e) => setNotifications({ ...notifications, inAppMentions: e.target.checked })}
                  sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#6C63FF' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#6C63FF' } }}
                />
              </Box>
            </Stack>
          </Box>
        </TabPanel>

        {/* API Keys Tab */}
        <TabPanel value={activeTab} index={2}>
          <Box sx={{ px: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Box>
                <Typography variant="subtitle1" sx={{ color: '#ffffff', fontWeight: 600 }}>
                  API Keys
                </Typography>
                <Typography variant="caption" sx={{ color: '#8b949e' }}>
                  Manage API keys for programmatic access to the platform
                </Typography>
              </Box>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                size="small"
                sx={{
                  bgcolor: '#6C63FF',
                  borderRadius: '8px',
                  fontWeight: 600,
                  '&:hover': { bgcolor: '#5a52e0' },
                }}
              >
                Create Key
              </Button>
            </Box>

            <Stack spacing={2}>
              {mockApiKeys.map((key) => (
                <Box
                  key={key.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 2,
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.06)',
                    bgcolor: 'rgba(255,255,255,0.02)',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' },
                  }}
                >
                  <Box>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <VpnKeyIcon sx={{ fontSize: 16, color: '#8b949e' }} />
                      <Typography variant="body2" sx={{ color: '#ffffff', fontWeight: 600 }}>
                        {key.name}
                      </Typography>
                    </Stack>
                    <Stack direction="row" alignItems="center" spacing={2} sx={{ mt: 0.5 }}>
                      <Typography variant="caption" sx={{ color: '#8b949e', fontFamily: 'monospace' }}>
                        {key.prefix}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#8b949e' }}>
                        Created: {key.created}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#8b949e' }}>
                        Last used: {key.lastUsed}
                      </Typography>
                    </Stack>
                  </Box>
                  <Stack direction="row" spacing={0.5}>
                    <Tooltip title="Copy key">
                      <IconButton size="small" sx={{ color: '#8b949e', '&:hover': { color: '#c9d1d9' } }}>
                        <ContentCopyIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Revoke key">
                      <IconButton size="small" sx={{ color: '#8b949e', '&:hover': { color: '#f85149' } }}>
                        <DeleteIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Box>
              ))}
            </Stack>

            <Box sx={{ mt: 3, p: 2, borderRadius: '8px', bgcolor: 'rgba(210, 153, 34, 0.06)', border: '1px solid rgba(210, 153, 34, 0.15)' }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <VisibilityOffIcon sx={{ fontSize: 16, color: '#d29922' }} />
                <Typography variant="caption" sx={{ color: '#d29922' }}>
                  API keys are only shown once at creation. Store them securely.
                </Typography>
              </Stack>
            </Box>
          </Box>
        </TabPanel>

        {/* Appearance Tab */}
        <TabPanel value={activeTab} index={3}>
          <Box sx={{ px: 3 }}>
            {/* Theme */}
            <Typography variant="subtitle1" sx={{ color: '#ffffff', fontWeight: 600, mb: 2 }}>
              Theme
            </Typography>
            <ToggleButtonGroup
              value={appearance.theme}
              exclusive
              onChange={(_, v) => v && setAppearance({ ...appearance, theme: v })}
              sx={{ mb: 4 }}
            >
              <ToggleButton
                value="dark"
                sx={{
                  px: 3,
                  py: 1.5,
                  color: '#c9d1d9',
                  borderColor: 'rgba(255,255,255,0.1)',
                  '&.Mui-selected': { bgcolor: 'rgba(108, 99, 255, 0.12)', color: '#6C63FF', borderColor: 'rgba(108, 99, 255, 0.3)' },
                }}
              >
                <DarkModeIcon sx={{ mr: 1, fontSize: 18 }} />
                Dark
              </ToggleButton>
              <ToggleButton
                value="light"
                sx={{
                  px: 3,
                  py: 1.5,
                  color: '#c9d1d9',
                  borderColor: 'rgba(255,255,255,0.1)',
                  '&.Mui-selected': { bgcolor: 'rgba(108, 99, 255, 0.12)', color: '#6C63FF', borderColor: 'rgba(108, 99, 255, 0.3)' },
                }}
              >
                <LightModeIcon sx={{ mr: 1, fontSize: 18 }} />
                Light
              </ToggleButton>
            </ToggleButtonGroup>

            <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)', mb: 3 }} />

            {/* Density */}
            <Typography variant="subtitle1" sx={{ color: '#ffffff', fontWeight: 600, mb: 2 }}>
              Display Density
            </Typography>
            <ToggleButtonGroup
              value={appearance.density}
              exclusive
              onChange={(_, v) => v && setAppearance({ ...appearance, density: v })}
            >
              <ToggleButton
                value="compact"
                sx={{
                  px: 3,
                  py: 1.5,
                  color: '#c9d1d9',
                  borderColor: 'rgba(255,255,255,0.1)',
                  '&.Mui-selected': { bgcolor: 'rgba(108, 99, 255, 0.12)', color: '#6C63FF', borderColor: 'rgba(108, 99, 255, 0.3)' },
                }}
              >
                Compact
              </ToggleButton>
              <ToggleButton
                value="comfortable"
                sx={{
                  px: 3,
                  py: 1.5,
                  color: '#c9d1d9',
                  borderColor: 'rgba(255,255,255,0.1)',
                  '&.Mui-selected': { bgcolor: 'rgba(108, 99, 255, 0.12)', color: '#6C63FF', borderColor: 'rgba(108, 99, 255, 0.3)' },
                }}
              >
                Comfortable
              </ToggleButton>
              <ToggleButton
                value="spacious"
                sx={{
                  px: 3,
                  py: 1.5,
                  color: '#c9d1d9',
                  borderColor: 'rgba(255,255,255,0.1)',
                  '&.Mui-selected': { bgcolor: 'rgba(108, 99, 255, 0.12)', color: '#6C63FF', borderColor: 'rgba(108, 99, 255, 0.3)' },
                }}
              >
                Spacious
              </ToggleButton>
            </ToggleButtonGroup>

            <Box sx={{ mt: 4, p: 2, borderRadius: '8px', bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <Typography variant="caption" sx={{ color: '#8b949e' }}>
                Theme changes apply immediately. Light mode is currently in beta.
              </Typography>
            </Box>
          </Box>
        </TabPanel>
      </Card>
    </Box>
  );
};

export default SettingsPage;
