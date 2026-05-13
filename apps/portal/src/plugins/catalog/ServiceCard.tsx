import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Chip,
  Box,
  IconButton,
  Tooltip,
  Link,
  Stack,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import GitHubIcon from '@mui/icons-material/GitHub';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CircleIcon from '@mui/icons-material/Circle';
import type { Service } from '../../types';

interface ServiceCardProps {
  service: Service;
  onUpdate?: () => void;
}

const tierColors: Record<string, 'error' | 'primary' | 'default'> = {
  critical: 'error',
  standard: 'primary',
  experimental: 'default',
};

const lifecycleColors: Record<string, 'success' | 'info' | 'warning' | 'default'> = {
  production: 'success',
  staging: 'info',
  deprecated: 'warning',
  experimental: 'default',
};

const healthColors: Record<string, string> = {
  healthy: '#4caf50',
  degraded: '#ff9800',
  unhealthy: '#f44336',
  unknown: '#9e9e9e',
};

export const ServiceCard: React.FC<ServiceCardProps> = ({ service, onUpdate }) => {
  const healthStatus = service.metadata?.healthStatus || 'unknown';
  const lastDeployedAt = service.metadata?.lastDeployedAt;

  const formatRelativeTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    return 'Just now';
  };

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'box-shadow 0.2s, transform 0.2s',
        '&:hover': {
          boxShadow: 4,
          transform: 'translateY(-2px)',
        },
        borderLeft: 3,
        borderColor: healthColors[healthStatus],
      }}
      role="article"
      aria-label={`Service: ${service.name}`}
    >
      <CardContent sx={{ flexGrow: 1, pb: 1 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title={`Health: ${healthStatus}`}>
              <CircleIcon
                sx={{ fontSize: 10, color: healthColors[healthStatus] }}
                aria-label={`Health status: ${healthStatus}`}
              />
            </Tooltip>
            <Typography variant="h6" component="h3" noWrap sx={{ maxWidth: 200 }}>
              {service.name}
            </Typography>
          </Box>
          <IconButton size="small" aria-label="More options">
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* Description */}
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mb: 2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            minHeight: 40,
          }}
        >
          {service.description || 'No description provided'}
        </Typography>

        {/* Tags */}
        <Stack direction="row" spacing={0.5} sx={{ mb: 2, flexWrap: 'wrap', gap: 0.5 }}>
          <Chip
            label={service.tier}
            size="small"
            color={tierColors[service.tier] || 'default'}
            variant="outlined"
          />
          <Chip
            label={service.lifecycle}
            size="small"
            color={lifecycleColors[service.lifecycle] || 'default'}
            variant="filled"
          />
          {service.language && (
            <Chip label={service.language} size="small" variant="outlined" />
          )}
        </Stack>

        {/* Metadata */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            Team: <strong>{service.team}</strong>
          </Typography>
          {lastDeployedAt && (
            <Typography variant="caption" color="text.secondary">
              Last deployed: {formatRelativeTime(lastDeployedAt)}
            </Typography>
          )}
          <Typography variant="caption" color="text.secondary">
            Updated: {formatRelativeTime(service.updatedAt)}
          </Typography>
        </Box>
      </CardContent>

      <CardActions sx={{ px: 2, pb: 2, pt: 0, justifyContent: 'space-between' }}>
        <Box>
          {service.repository && (
            <Tooltip title="View repository">
              <IconButton
                size="small"
                component={Link}
                href={service.repository}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open repository"
              >
                <GitHubIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
        <Tooltip title="View details">
          <IconButton
            size="small"
            component={Link}
            href={`/catalog/services/${service.id}`}
            aria-label={`View ${service.name} details`}
          >
            <OpenInNewIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </CardActions>
    </Card>
  );
};

export default ServiceCard;
