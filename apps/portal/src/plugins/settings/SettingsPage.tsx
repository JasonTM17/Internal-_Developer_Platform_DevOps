import AddIcon from '@mui/icons-material/Add';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import DeleteIcon from '@mui/icons-material/Delete';
import LightModeIcon from '@mui/icons-material/LightMode';
import NotificationsIcon from '@mui/icons-material/Notifications';
import PaletteIcon from '@mui/icons-material/Palette';
import PersonIcon from '@mui/icons-material/Person';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import {
  Box,
  Typography,
  Card,
  Tabs,
  Tab,
  TextField,
  Button,
  Switch,
  Stack,
  Avatar,
  Divider,
  IconButton,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

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

const mockApiKeys = [
  {
    id: 'key-1',
    name: 'Production Deploy',
    prefix: 'idp_prod_****7f3a',
    created: '2025-01-05',
    lastUsed: '2 hours ago',
  },
  {
    id: 'key-2',
    name: 'CI/CD Pipeline',
    prefix: 'idp_ci_****2b8e',
    created: '2024-12-15',
    lastUsed: '5 minutes ago',
  },
  {
    id: 'key-3',
    name: 'Local Development',
    prefix: 'idp_dev_****9c1d',
    created: '2025-01-10',
    lastUsed: '1 day ago',
  },
];

export const SettingsPage: React.FC = () => {
  const { t } = useTranslation();
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

  const switchSx = {
    '& .MuiSwitch-switchBase.Mui-checked': { color: '#699CFF' },
    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#699CFF' },
  };

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', animation: 'fadeIn 0.5s ease-out both' }}>
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h4"
          sx={{ fontWeight: 700, color: '#DEE5FF', mb: 0.5, fontSize: '1.5rem' }}
        >
          {t('settings.title')}
        </Typography>
        <Typography variant="body2" sx={{ color: '#6475A1' }}>
          {t('settings.subtitle')}
        </Typography>
      </Box>

      <Card sx={{ bgcolor: '#0F1E3F', border: '1px solid rgba(100, 117, 161, 0.2)' }}>
        <Tabs
          value={activeTab}
          onChange={(_, v: number) => setActiveTab(v)}
          sx={{
            px: 3,
            borderBottom: '1px solid rgba(100, 117, 161, 0.12)',
            '& .MuiTab-root': {
              color: '#6475A1',
              fontWeight: 500,
              textTransform: 'none',
              minHeight: 48,
              '&.Mui-selected': { color: '#699CFF' },
            },
            '& .MuiTabs-indicator': { bgcolor: '#699CFF', height: 2, borderRadius: 1 },
          }}
        >
          <Tab
            icon={<PersonIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label={t('settings.profile')}
          />
          <Tab
            icon={<NotificationsIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label={t('settings.notifications')}
          />
          <Tab
            icon={<VpnKeyIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label={t('settings.apiKeys')}
          />
          <Tab
            icon={<PaletteIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label={t('settings.appearance')}
          />
        </Tabs>

        <TabPanel value={activeTab} index={0}>
          <Box sx={{ px: 3 }}>
            <Stack direction="row" alignItems="center" spacing={3} sx={{ mb: 4 }}>
              <Avatar
                sx={{
                  width: 72,
                  height: 72,
                  bgcolor: '#699CFF',
                  fontSize: '1.5rem',
                  fontWeight: 700,
                }}
              >
                JS
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ color: '#DEE5FF', fontWeight: 600 }}>
                  {profile.name}
                </Typography>
                <Typography variant="body2" sx={{ color: '#6475A1' }}>
                  {profile.role} • {profile.team}
                </Typography>
                <Button size="small" sx={{ mt: 1, color: '#699CFF', textTransform: 'none' }}>
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
                sx={{
                  '& .MuiInputBase-root': { bgcolor: 'rgba(100, 117, 161, 0.04)' },
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(100, 117, 161, 0.2)',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(105, 156, 255, 0.4)',
                  },
                }}
              />
              <TextField
                label="Email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                fullWidth
                size="small"
                sx={{
                  '& .MuiInputBase-root': { bgcolor: 'rgba(100, 117, 161, 0.04)' },
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(100, 117, 161, 0.2)',
                  },
                }}
              />
              <TextField
                label="Team"
                value={profile.team}
                onChange={(e) => setProfile({ ...profile, team: e.target.value })}
                fullWidth
                size="small"
                sx={{
                  '& .MuiInputBase-root': { bgcolor: 'rgba(100, 117, 161, 0.04)' },
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(100, 117, 161, 0.2)',
                  },
                }}
              />
              <TextField
                label="Role"
                value={profile.role}
                onChange={(e) => setProfile({ ...profile, role: e.target.value })}
                fullWidth
                size="small"
                sx={{
                  '& .MuiInputBase-root': { bgcolor: 'rgba(100, 117, 161, 0.04)' },
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(100, 117, 161, 0.2)',
                  },
                }}
              />
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  sx={{
                    background: 'linear-gradient(135deg, #699CFF, #3B82F6)',
                    boxShadow: '0 4px 12px rgba(105, 156, 255, 0.3)',
                    borderRadius: '8px',
                    px: 3,
                    fontWeight: 600,
                    '&:hover': { background: 'linear-gradient(135deg, #ADC6FF, #699CFF)' },
                  }}
                >
                  {t('settings.saveChanges')}
                </Button>
              </Box>
            </Stack>
          </Box>
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <Box sx={{ px: 3 }}>
            <Typography variant="subtitle1" sx={{ color: '#DEE5FF', fontWeight: 600, mb: 2 }}>
              {t('settings.emailNotifications')}
            </Typography>
            <Stack spacing={1} sx={{ mb: 4 }}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  py: 1,
                }}
              >
                <Box>
                  <Typography variant="body2" sx={{ color: '#99AAD9' }}>
                    Deployment notifications
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#6475A1' }}>
                    Get notified when deployments complete or fail
                  </Typography>
                </Box>
                <Switch
                  checked={notifications.emailDeploy}
                  onChange={(e) =>
                    setNotifications({ ...notifications, emailDeploy: e.target.checked })
                  }
                  sx={switchSx}
                />
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  py: 1,
                }}
              >
                <Box>
                  <Typography variant="body2" sx={{ color: '#99AAD9' }}>
                    Incident alerts
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#6475A1' }}>
                    Critical alerts for service incidents
                  </Typography>
                </Box>
                <Switch
                  checked={notifications.emailIncident}
                  onChange={(e) =>
                    setNotifications({ ...notifications, emailIncident: e.target.checked })
                  }
                  sx={switchSx}
                />
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  py: 1,
                }}
              >
                <Box>
                  <Typography variant="body2" sx={{ color: '#99AAD9' }}>
                    Weekly digest
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#6475A1' }}>
                    Summary of platform activity each week
                  </Typography>
                </Box>
                <Switch
                  checked={notifications.emailWeekly}
                  onChange={(e) =>
                    setNotifications({ ...notifications, emailWeekly: e.target.checked })
                  }
                  sx={switchSx}
                />
              </Box>
            </Stack>

            <Divider sx={{ borderColor: 'rgba(100, 117, 161, 0.12)', mb: 3 }} />

            <Typography variant="subtitle1" sx={{ color: '#DEE5FF', fontWeight: 600, mb: 2 }}>
              {t('settings.slackNotifications')}
            </Typography>
            <Stack spacing={1} sx={{ mb: 4 }}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  py: 1,
                }}
              >
                <Box>
                  <Typography variant="body2" sx={{ color: '#99AAD9' }}>
                    Deploy updates
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#6475A1' }}>
                    Post to #deployments channel
                  </Typography>
                </Box>
                <Switch
                  checked={notifications.slackDeploy}
                  onChange={(e) =>
                    setNotifications({ ...notifications, slackDeploy: e.target.checked })
                  }
                  sx={switchSx}
                />
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  py: 1,
                }}
              >
                <Box>
                  <Typography variant="body2" sx={{ color: '#99AAD9' }}>
                    Incident alerts
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#6475A1' }}>
                    DM for critical incidents
                  </Typography>
                </Box>
                <Switch
                  checked={notifications.slackIncident}
                  onChange={(e) =>
                    setNotifications({ ...notifications, slackIncident: e.target.checked })
                  }
                  sx={switchSx}
                />
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  py: 1,
                }}
              >
                <Box>
                  <Typography variant="body2" sx={{ color: '#99AAD9' }}>
                    Cost alerts
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#6475A1' }}>
                    Notify when spending exceeds thresholds
                  </Typography>
                </Box>
                <Switch
                  checked={notifications.slackCost}
                  onChange={(e) =>
                    setNotifications({ ...notifications, slackCost: e.target.checked })
                  }
                  sx={switchSx}
                />
              </Box>
            </Stack>

            <Divider sx={{ borderColor: 'rgba(100, 117, 161, 0.12)', mb: 3 }} />

            <Typography variant="subtitle1" sx={{ color: '#DEE5FF', fontWeight: 600, mb: 2 }}>
              {t('settings.inAppNotifications')}
            </Typography>
            <Stack spacing={1}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  py: 1,
                }}
              >
                <Box>
                  <Typography variant="body2" sx={{ color: '#99AAD9' }}>
                    All activity
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#6475A1' }}>
                    Show all platform notifications
                  </Typography>
                </Box>
                <Switch
                  checked={notifications.inAppAll}
                  onChange={(e) =>
                    setNotifications({ ...notifications, inAppAll: e.target.checked })
                  }
                  sx={switchSx}
                />
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  py: 1,
                }}
              >
                <Box>
                  <Typography variant="body2" sx={{ color: '#99AAD9' }}>
                    Mentions only
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#6475A1' }}>
                    Only notify when directly mentioned
                  </Typography>
                </Box>
                <Switch
                  checked={notifications.inAppMentions}
                  onChange={(e) =>
                    setNotifications({ ...notifications, inAppMentions: e.target.checked })
                  }
                  sx={switchSx}
                />
              </Box>
            </Stack>
          </Box>
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          <Box sx={{ px: 3 }}>
            <Box
              sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}
            >
              <Box>
                <Typography variant="subtitle1" sx={{ color: '#DEE5FF', fontWeight: 600 }}>
                  {t('settings.apiKeys')}
                </Typography>
                <Typography variant="caption" sx={{ color: '#6475A1' }}>
                  Manage API keys for programmatic access to the platform
                </Typography>
              </Box>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                size="small"
                sx={{
                  background: 'linear-gradient(135deg, #699CFF, #3B82F6)',
                  boxShadow: '0 4px 12px rgba(105, 156, 255, 0.3)',
                  borderRadius: '8px',
                  fontWeight: 600,
                  '&:hover': { background: 'linear-gradient(135deg, #ADC6FF, #699CFF)' },
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
                    border: '1px solid rgba(100, 117, 161, 0.15)',
                    bgcolor: 'rgba(100, 117, 161, 0.04)',
                    '&:hover': { bgcolor: 'rgba(100, 117, 161, 0.08)' },
                  }}
                >
                  <Box>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <VpnKeyIcon sx={{ fontSize: 16, color: '#6475A1' }} />
                      <Typography variant="body2" sx={{ color: '#DEE5FF', fontWeight: 600 }}>
                        {key.name}
                      </Typography>
                    </Stack>
                    <Stack direction="row" alignItems="center" spacing={2} sx={{ mt: 0.5 }}>
                      <Typography
                        variant="caption"
                        sx={{ color: '#6475A1', fontFamily: '"JetBrains Mono", monospace' }}
                      >
                        {key.prefix}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#6475A1' }}>
                        Created: {key.created}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#6475A1' }}>
                        Last used: {key.lastUsed}
                      </Typography>
                    </Stack>
                  </Box>
                  <Stack direction="row" spacing={0.5}>
                    <Tooltip title="Copy key">
                      <IconButton
                        size="small"
                        sx={{ color: '#6475A1', '&:hover': { color: '#99AAD9' } }}
                      >
                        <ContentCopyIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Revoke key">
                      <IconButton
                        size="small"
                        sx={{ color: '#6475A1', '&:hover': { color: '#FA746F' } }}
                      >
                        <DeleteIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Box>
              ))}
            </Stack>

            <Box
              sx={{
                mt: 3,
                p: 2,
                borderRadius: '8px',
                bgcolor: 'rgba(245, 158, 11, 0.06)',
                border: '1px solid rgba(245, 158, 11, 0.15)',
              }}
            >
              <Stack direction="row" alignItems="center" spacing={1}>
                <VisibilityOffIcon sx={{ fontSize: 16, color: '#F59E0B' }} />
                <Typography variant="caption" sx={{ color: '#F59E0B' }}>
                  API keys are only shown once at creation. Store them securely.
                </Typography>
              </Stack>
            </Box>
          </Box>
        </TabPanel>

        <TabPanel value={activeTab} index={3}>
          <Box sx={{ px: 3 }}>
            <Typography variant="subtitle1" sx={{ color: '#DEE5FF', fontWeight: 600, mb: 2 }}>
              {t('settings.theme')}
            </Typography>
            <ToggleButtonGroup
              value={appearance.theme}
              exclusive
              onChange={(_, v: string | null) => v && setAppearance({ ...appearance, theme: v })}
              sx={{ mb: 4 }}
            >
              <ToggleButton
                value="dark"
                sx={{
                  px: 3,
                  py: 1.5,
                  color: '#99AAD9',
                  borderColor: 'rgba(100, 117, 161, 0.2)',
                  '&.Mui-selected': {
                    bgcolor: 'rgba(105, 156, 255, 0.12)',
                    color: '#699CFF',
                    borderColor: 'rgba(105, 156, 255, 0.3)',
                  },
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
                  color: '#99AAD9',
                  borderColor: 'rgba(100, 117, 161, 0.2)',
                  '&.Mui-selected': {
                    bgcolor: 'rgba(105, 156, 255, 0.12)',
                    color: '#699CFF',
                    borderColor: 'rgba(105, 156, 255, 0.3)',
                  },
                }}
              >
                <LightModeIcon sx={{ mr: 1, fontSize: 18 }} />
                Light
              </ToggleButton>
            </ToggleButtonGroup>

            <Divider sx={{ borderColor: 'rgba(100, 117, 161, 0.12)', mb: 3 }} />

            <Typography variant="subtitle1" sx={{ color: '#DEE5FF', fontWeight: 600, mb: 2 }}>
              {t('settings.density')}
            </Typography>
            <ToggleButtonGroup
              value={appearance.density}
              exclusive
              onChange={(_, v: string | null) => v && setAppearance({ ...appearance, density: v })}
            >
              <ToggleButton
                value="compact"
                sx={{
                  px: 3,
                  py: 1.5,
                  color: '#99AAD9',
                  borderColor: 'rgba(100, 117, 161, 0.2)',
                  '&.Mui-selected': {
                    bgcolor: 'rgba(105, 156, 255, 0.12)',
                    color: '#699CFF',
                    borderColor: 'rgba(105, 156, 255, 0.3)',
                  },
                }}
              >
                Compact
              </ToggleButton>
              <ToggleButton
                value="comfortable"
                sx={{
                  px: 3,
                  py: 1.5,
                  color: '#99AAD9',
                  borderColor: 'rgba(100, 117, 161, 0.2)',
                  '&.Mui-selected': {
                    bgcolor: 'rgba(105, 156, 255, 0.12)',
                    color: '#699CFF',
                    borderColor: 'rgba(105, 156, 255, 0.3)',
                  },
                }}
              >
                Comfortable
              </ToggleButton>
              <ToggleButton
                value="spacious"
                sx={{
                  px: 3,
                  py: 1.5,
                  color: '#99AAD9',
                  borderColor: 'rgba(100, 117, 161, 0.2)',
                  '&.Mui-selected': {
                    bgcolor: 'rgba(105, 156, 255, 0.12)',
                    color: '#699CFF',
                    borderColor: 'rgba(105, 156, 255, 0.3)',
                  },
                }}
              >
                Spacious
              </ToggleButton>
            </ToggleButtonGroup>

            <Box
              sx={{
                mt: 4,
                p: 2,
                borderRadius: '8px',
                bgcolor: 'rgba(100, 117, 161, 0.04)',
                border: '1px solid rgba(100, 117, 161, 0.12)',
              }}
            >
              <Typography variant="caption" sx={{ color: '#6475A1' }}>
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
