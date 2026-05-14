import DownloadIcon from '@mui/icons-material/Download';
import FilterListIcon from '@mui/icons-material/FilterList';
import SearchIcon from '@mui/icons-material/Search';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Pagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

const mockAuditEvents = [
  {
    id: '1',
    actor: 'jane.smith',
    action: 'deployment.create',
    resource: 'api-gateway',
    outcome: 'success',
    timestamp: '2025-01-15T10:30:00Z',
    details: 'Deployed v2.3.1 to production',
  },
  {
    id: '2',
    actor: 'system',
    action: 'health.alert',
    resource: 'cache-layer',
    outcome: 'warning',
    timestamp: '2025-01-15T10:25:00Z',
    details: 'High latency detected (>200ms)',
  },
  {
    id: '3',
    actor: 'john.doe',
    action: 'service.update',
    resource: 'auth-service',
    outcome: 'success',
    timestamp: '2025-01-15T09:45:00Z',
    details: 'Updated service metadata',
  },
  {
    id: '4',
    actor: 'jane.smith',
    action: 'config.change',
    resource: 'staging/env-vars',
    outcome: 'success',
    timestamp: '2025-01-15T09:30:00Z',
    details: 'Updated DATABASE_POOL_SIZE=20',
  },
  {
    id: '5',
    actor: 'ci-bot',
    action: 'deployment.create',
    resource: 'frontend-app',
    outcome: 'success',
    timestamp: '2025-01-15T09:15:00Z',
    details: 'Auto-deployed from main branch',
  },
  {
    id: '6',
    actor: 'john.doe',
    action: 'environment.create',
    resource: 'preview-pr-142',
    outcome: 'success',
    timestamp: '2025-01-15T08:50:00Z',
    details: 'Created preview environment',
  },
  {
    id: '7',
    actor: 'system',
    action: 'deployment.rollback',
    resource: 'payment-service',
    outcome: 'success',
    timestamp: '2025-01-14T22:10:00Z',
    details: 'Auto-rollback triggered by error rate SLO breach',
  },
  {
    id: '8',
    actor: 'admin',
    action: 'rbac.update',
    resource: 'team-platform',
    outcome: 'success',
    timestamp: '2025-01-14T18:00:00Z',
    details: 'Added deploy permission for staging',
  },
  {
    id: '9',
    actor: 'jane.smith',
    action: 'secret.rotate',
    resource: 'production/jwt-key',
    outcome: 'success',
    timestamp: '2025-01-14T16:30:00Z',
    details: 'Rotated JWT signing key',
  },
  {
    id: '10',
    actor: 'system',
    action: 'cost.alert',
    resource: 'eks-cluster',
    outcome: 'warning',
    timestamp: '2025-01-14T14:00:00Z',
    details: 'Monthly spend exceeded 85% of budget',
  },
];

const actionColors: Record<string, string> = {
  'deployment.create': '#4CD7F6',
  'deployment.rollback': '#FA746F',
  'health.alert': '#F59E0B',
  'service.update': '#699CFF',
  'config.change': '#ADC6FF',
  'environment.create': '#58E7AB',
  'rbac.update': '#F59E0B',
  'secret.rotate': '#FA746F',
  'cost.alert': '#F59E0B',
};

const outcomeConfig: Record<string, { color: string; bg: string }> = {
  success: { color: '#58E7AB', bg: 'rgba(88, 231, 171, 0.1)' },
  warning: { color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)' },
  failure: { color: '#FA746F', bg: 'rgba(250, 116, 111, 0.1)' },
};

export const AuditPage: React.FC = () => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  const filteredEvents = mockAuditEvents.filter((e) => {
    if (
      search &&
      !e.details.toLowerCase().includes(search.toLowerCase()) &&
      !e.actor.includes(search)
    )
      return false;
    if (actionFilter !== 'all' && !e.action.startsWith(actionFilter)) return false;
    return true;
  });

  return (
    <Box sx={{ maxWidth: 1440, mx: 'auto', animation: 'fadeIn 0.5s ease-out both' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#DEE5FF', fontSize: '1.5rem' }}>
            {t('audit.title')}
          </Typography>
          <Typography variant="body2" sx={{ color: '#6475A1', mt: 0.5 }}>
            {t('audit.subtitle')}
          </Typography>
        </Box>
        <Button
          variant="outlined"
          size="small"
          startIcon={<DownloadIcon />}
          sx={{
            borderColor: 'rgba(100, 117, 161, 0.3)',
            color: '#DEE5FF',
            '&:hover': { borderColor: '#699CFF' },
          }}
        >
          {t('audit.export')}
        </Button>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <TextField
          placeholder={t('audit.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small"
          sx={{
            flex: 1,
            '& .MuiOutlinedInput-root': {
              bgcolor: '#0F1E3F',
              '& fieldset': { borderColor: 'rgba(100, 117, 161, 0.2)' },
              '&:hover fieldset': { borderColor: 'rgba(105, 156, 255, 0.4)' },
              '&.Mui-focused fieldset': { borderColor: '#699CFF' },
            },
            '& .MuiOutlinedInput-input': { color: '#DEE5FF' },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#6475A1' }} />
              </InputAdornment>
            ),
          }}
        />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel sx={{ color: '#6475A1' }}>{t('audit.actionType')}</InputLabel>
          <Select
            value={actionFilter}
            label={t('audit.actionType')}
            onChange={(e) => setActionFilter(e.target.value)}
            sx={{
              color: '#DEE5FF',
              bgcolor: '#0F1E3F',
              '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(100, 117, 161, 0.2)' },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(105, 156, 255, 0.4)',
              },
            }}
          >
            <MenuItem value="all">All Actions</MenuItem>
            <MenuItem value="deployment">Deployments</MenuItem>
            <MenuItem value="service">Services</MenuItem>
            <MenuItem value="config">Config</MenuItem>
            <MenuItem value="environment">Environments</MenuItem>
            <MenuItem value="rbac">RBAC</MenuItem>
            <MenuItem value="secret">Secrets</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Card sx={{ bgcolor: '#0F1E3F', border: '1px solid rgba(100, 117, 161, 0.2)' }}>
        <CardContent sx={{ p: 0 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: '#6475A1', fontWeight: 600 }}>
                    {t('audit.table.time')}
                  </TableCell>
                  <TableCell sx={{ color: '#6475A1', fontWeight: 600 }}>
                    {t('audit.table.actor')}
                  </TableCell>
                  <TableCell sx={{ color: '#6475A1', fontWeight: 600 }}>
                    {t('audit.table.action')}
                  </TableCell>
                  <TableCell sx={{ color: '#6475A1', fontWeight: 600 }}>
                    {t('audit.table.resource')}
                  </TableCell>
                  <TableCell sx={{ color: '#6475A1', fontWeight: 600 }}>
                    {t('audit.table.details')}
                  </TableCell>
                  <TableCell sx={{ color: '#6475A1', fontWeight: 600 }}>
                    {t('audit.table.outcome')}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredEvents.map((event, idx) => {
                  const oc = outcomeConfig[event.outcome] || outcomeConfig.success;
                  return (
                    <TableRow
                      key={event.id}
                      sx={{
                        '&:hover': { bgcolor: 'rgba(100, 117, 161, 0.04)' },
                        animation: 'fadeIn 0.3s ease-out both',
                        animationDelay: `${idx * 30}ms`,
                      }}
                    >
                      <TableCell
                        sx={{
                          color: '#6475A1',
                          fontSize: '0.75rem',
                          fontFamily: '"JetBrains Mono", monospace',
                        }}
                      >
                        {new Date(event.timestamp).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        <br />
                        <Typography variant="caption" sx={{ color: '#6475A1', fontSize: '0.6rem' }}>
                          {new Date(event.timestamp).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ color: '#DEE5FF', fontSize: '0.8rem' }}>
                        {event.actor}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={event.action}
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: '0.6rem',
                            bgcolor: `${actionColors[event.action] || '#699CFF'}1A`,
                            color: actionColors[event.action] || '#699CFF',
                            border: `1px solid ${actionColors[event.action] || '#699CFF'}33`,
                          }}
                        />
                      </TableCell>
                      <TableCell
                        sx={{
                          color: '#99AAD9',
                          fontSize: '0.75rem',
                          fontFamily: '"JetBrains Mono", monospace',
                        }}
                      >
                        {event.resource}
                      </TableCell>
                      <TableCell sx={{ color: '#99AAD9', fontSize: '0.75rem', maxWidth: 250 }}>
                        {event.details}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={event.outcome}
                          size="small"
                          sx={{
                            height: 18,
                            fontSize: '0.6rem',
                            bgcolor: oc.bg,
                            color: oc.color,
                            border: `1px solid ${oc.color}33`,
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          {filteredEvents.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <FilterListIcon sx={{ fontSize: 40, color: '#6475A1', mb: 1 }} />
              <Typography variant="body2" sx={{ color: '#6475A1' }}>
                No audit events match your filters
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
        <Pagination count={5} page={1} color="primary" />
      </Box>
    </Box>
  );
};

export default AuditPage;
