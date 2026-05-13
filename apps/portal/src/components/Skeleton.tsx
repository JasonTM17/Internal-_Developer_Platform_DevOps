import React from 'react';
import { Box, Card, CardContent, Grid, Stack, keyframes } from '@mui/material';

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const SkeletonBlock: React.FC<{ width?: string | number; height?: number; borderRadius?: number }> = ({
  width = '100%',
  height = 16,
  borderRadius = 4,
}) => (
  <Box
    sx={{
      width,
      height,
      borderRadius: `${borderRadius}px`,
      background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)',
      backgroundSize: '200% 100%',
      animation: `${shimmer} 1.5s ease-in-out infinite`,
    }}
  />
);

/**
 * Card skeleton for loading states in card grids.
 * Mimics the layout of environment/service cards.
 */
export const CardSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => (
  <Grid container spacing={2.5}>
    {Array.from({ length: count }).map((_, index) => (
      <Grid item xs={12} sm={6} lg={4} key={index}>
        <Card
          sx={{
            bgcolor: '#161b22',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '12px',
          }}
        >
          <CardContent>
            {/* Header row */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2.5 }}>
              <SkeletonBlock width={80} height={22} borderRadius={6} />
              <SkeletonBlock width={60} height={18} borderRadius={4} />
            </Box>

            {/* Title */}
            <SkeletonBlock width="70%" height={20} />

            {/* Progress bars */}
            <Stack spacing={1.5} sx={{ mt: 2.5 }}>
              <SkeletonBlock height={4} borderRadius={2} />
              <SkeletonBlock height={4} borderRadius={2} />
              <SkeletonBlock height={4} borderRadius={2} />
            </Stack>

            {/* Footer */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SkeletonBlock width={24} height={24} borderRadius={12} />
                <SkeletonBlock width={80} height={14} />
              </Box>
              <SkeletonBlock width={70} height={14} />
            </Box>
          </CardContent>
        </Card>
      </Grid>
    ))}
  </Grid>
);

/**
 * Table skeleton for loading states in data tables.
 * Mimics rows of tabular data.
 */
export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({
  rows = 5,
  columns = 5,
}) => (
  <Card
    sx={{
      bgcolor: '#161b22',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '12px',
      overflow: 'hidden',
    }}
  >
    {/* Table header */}
    <Box
      sx={{
        display: 'flex',
        gap: 2,
        px: 3,
        py: 2,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        bgcolor: 'rgba(255,255,255,0.02)',
      }}
    >
      {Array.from({ length: columns }).map((_, i) => (
        <Box key={i} sx={{ flex: i === 0 ? 2 : 1 }}>
          <SkeletonBlock width="60%" height={12} />
        </Box>
      ))}
    </Box>

    {/* Table rows */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <Box
        key={rowIndex}
        sx={{
          display: 'flex',
          gap: 2,
          px: 3,
          py: 2,
          borderBottom: rowIndex < rows - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
        }}
      >
        {Array.from({ length: columns }).map((_, colIndex) => (
          <Box key={colIndex} sx={{ flex: colIndex === 0 ? 2 : 1 }}>
            <SkeletonBlock
              width={colIndex === 0 ? '80%' : `${50 + Math.random() * 30}%`}
              height={16}
            />
          </Box>
        ))}
      </Box>
    ))}
  </Card>
);

/**
 * Stat skeleton for loading states in stat/metric cards.
 * Mimics the layout of KPI summary cards.
 */
export const StatSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <Grid container spacing={2}>
    {Array.from({ length: count }).map((_, index) => (
      <Grid item xs={12} sm={6} md={12 / count} key={index}>
        <Card
          sx={{
            bgcolor: '#161b22',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '12px',
          }}
        >
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2.5 }}>
            {/* Icon placeholder */}
            <SkeletonBlock width={44} height={44} borderRadius={10} />

            {/* Text content */}
            <Box sx={{ flex: 1 }}>
              <SkeletonBlock width="50%" height={28} />
              <Box sx={{ mt: 1 }}>
                <SkeletonBlock width="70%" height={12} />
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    ))}
  </Grid>
);

export default { CardSkeleton, TableSkeleton, StatSkeleton };
