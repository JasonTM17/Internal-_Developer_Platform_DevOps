import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Stack,
  IconButton,
  Tooltip,
  Link,
  Divider,
} from '@mui/material';
import Timeline from '@mui/lab/Timeline';
import TimelineItem from '@mui/lab/TimelineItem';
import TimelineSeparator from '@mui/lab/TimelineSeparator';
import TimelineConnector from '@mui/lab/TimelineConnector';
import TimelineContent from '@mui/lab/TimelineContent';
import TimelineDot from '@mui/lab/TimelineDot';
import TimelineOppositeContent from '@mui/lab/TimelineOppositeContent';
import UndoIcon from '@mui/icons-material/Undo';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import type { Deployment } from '../../types';

interface DeploymentTimelineProps {
  deployments: Deployment[];
  statusIcons: Record<string, React.ReactNode>;
  statusColors: Record<string, 'default' | 'info' | 'success' | 'error' | 'warning'>;
}

const strategyLabels: Record<string, string> = {
  rolling: 'Rolling Update',
  blue_green: 'Blue/Green',
  canary: 'Canary',
};

export const DeploymentTimeline: React.FC<DeploymentTimelineProps> = ({
  deployments,
  statusIcons,
  statusColors,
}) => {
  const formatTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (seconds: number | undefined): string => {
    if (!seconds) return '—';
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (deployments.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h6" color="text.secondary">
          No deployments found
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Deployments will appear here when triggered
        </Typography>
      </Box>
    );
  }

  return (
    <Timeline position="alternate">
      {deployments.map((deployment, index) => (
        <TimelineItem key={deployment.id}>
          <TimelineOppositeContent sx={{ m: 'auto 0' }} variant="body2" color="text.secondary">
            {formatTime(deployment.createdAt)}
          </TimelineOppositeContent>

          <TimelineSeparator>
            {index > 0 && <TimelineConnector />}
            <TimelineDot
              color={statusColors[deployment.status] || 'default'}
              variant={deployment.status === 'in_progress' ? 'outlined' : 'filled'}
            >
              {statusIcons[deployment.status]}
            </TimelineDot>
            {index < deployments.length - 1 && <TimelineConnector />}
          </TimelineSeparator>

          <TimelineContent sx={{ py: 2, px: 2 }}>
            <Card
              variant="outlined"
              sx={{
                transition: 'box-shadow 0.2s',
                '&:hover': { boxShadow: 2 },
              }}
            >
              <CardContent sx={{ pb: '12px !important' }}>
                {/* Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle1" component="h3" fontWeight="bold">
                    {deployment.artifacts?.image?.split('/').pop()?.split(':')[0] || 'Unknown Service'}
                  </Typography>
                  <Chip
                    label={deployment.status.replace('_', ' ')}
                    size="small"
                    color={statusColors[deployment.status]}
                    variant="outlined"
                  />
                </Box>

                {/* Details */}
                <Stack spacing={0.5} sx={{ mb: 1 }}>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ minWidth: 70 }}>
                      Version:
                    </Typography>
                    <Typography variant="body2" fontFamily="monospace">
                      {deployment.version}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ minWidth: 70 }}>
                      Environment:
                    </Typography>
                    <Chip label={deployment.environment} size="small" variant="outlined" />
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ minWidth: 70 }}>
                      Strategy:
                    </Typography>
                    <Typography variant="body2">
                      {strategyLabels[deployment.strategy] || deployment.strategy}
                    </Typography>
                  </Box>
                  {deployment.duration_seconds && (
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 70 }}>
                        Duration:
                      </Typography>
                      <Typography variant="body2">
                        {formatDuration(deployment.duration_seconds)}
                      </Typography>
                    </Box>
                  )}
                </Stack>

                {/* Commit SHA */}
                {deployment.artifacts?.commit_sha && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="caption" fontFamily="monospace" color="text.secondary">
                      {deployment.artifacts.commit_sha.substring(0, 8)}
                    </Typography>
                    <Tooltip title="Copy commit SHA">
                      <IconButton
                        size="small"
                        onClick={() => copyToClipboard(deployment.artifacts!.commit_sha!)}
                        aria-label="Copy commit SHA"
                      >
                        <ContentCopyIcon sx={{ fontSize: 12 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                )}

                <Divider sx={{ my: 1 }} />

                {/* Actions */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary">
                    by {deployment.initiatedBy || 'system'}
                  </Typography>
                  <Stack direction="row" spacing={0.5}>
                    <Tooltip title="View details">
                      <IconButton
                        size="small"
                        component={Link}
                        href={`/deployments/${deployment.id}`}
                        aria-label="View deployment details"
                      >
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {deployment.status === 'succeeded' && (
                      <Tooltip title="Rollback">
                        <IconButton
                          size="small"
                          color="warning"
                          aria-label="Rollback deployment"
                        >
                          <UndoIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Stack>
                </Box>
              </CardContent>
            </Card>
          </TimelineContent>
        </TimelineItem>
      ))}
    </Timeline>
  );
};

export default DeploymentTimeline;
