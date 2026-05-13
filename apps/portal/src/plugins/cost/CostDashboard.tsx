import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Stack,
  Divider,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import SavingsIcon from '@mui/icons-material/Savings';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

// Mock data
const mockCostByService = [
  { name: 'API Gateway', cost: 2450, percentage: 28 },
  { name: 'Database Cluster', cost: 1890, percentage: 22 },
  { name: 'Compute (EKS)', cost: 1560, percentage: 18 },
  { name: 'Storage (S3)', cost: 980, percentage: 11 },
  { name: 'Cache (Redis)', cost: 720, percentage: 8 },
  { name: 'CDN & Networking', cost: 540, percentage: 6 },
  { name: 'Monitoring', cost: 380, percentage: 4 },
  { name: 'Other Services', cost: 280, percentage: 3 },
];

const mockCostByEnvironment = [
  { name: 'Production', cost: 5200, percentage: 60, color: '#f85149' },
  { name: 'Staging', cost: 1800, percentage: 21, color: '#d29922' },
  { name: 'Development', cost: 1200, percentage: 14, color: '#3fb950' },
  { name: 'Preview', cost: 600, percentage: 5, color: '#6C63FF' },
];

const mockRecommendations = [
  { title: 'Right-size over-provisioned instances', savings: 320, impact: 'high' as const, description: '4 instances running at <15% CPU utilization' },
  { title: 'Enable auto-scaling for staging', savings: 180, impact: 'medium' as const, description: 'Staging runs 24/7 but only used during business hours' },
  { title: 'Clean up unused EBS volumes', savings: 95, impact: 'low' as const, description: '12 detached volumes consuming storage' },
  { title: 'Switch to reserved instances', savings: 450, impact: 'high' as const, description: 'Production workloads stable enough for 1-year commitment' },
  { title: 'Implement S3 lifecycle policies', savings: 65, impact: 'low' as const, description: 'Move infrequently accessed data to Glacier' },
];

const serviceBarColors = ['#6C63FF', '#03DAC6', '#3fb950', '#d29922', '#f85149', '#8b83ff', '#64b5f6', '#8b949e'];

const impactColors: Record<string, { bg: string; color: string }> = {
  high: { bg: 'rgba(248, 81, 73, 0.12)', color: '#f85149' },
  medium: { bg: 'rgba(210, 153, 34, 0.12)', color: '#d29922' },
  low: { bg: 'rgba(139, 148, 158, 0.12)', color: '#8b949e' },
};

export const CostDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 700);
    return () => clearTimeout(timer);
  }, []);

  const totalMonthly = 8800;
  const previousMonth = 8200;
  const trendPercent = ((totalMonthly - previousMonth) / previousMonth) * 100;
  const budget = 10000;
  const budgetUsed = (totalMonthly / budget) * 100;
  const forecast = 9400;
  const totalSavings = mockRecommendations.reduce((sum, r) => sum + r.savings, 0);

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress sx={{ borderRadius: 2 }} />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', animation: 'fadeIn 0.5s ease-out both' }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#ffffff', mb: 0.5 }}>
          Cost Analysis
        </Typography>
        <Typography variant="body2" sx={{ color: '#8b949e' }}>
          Infrastructure spending breakdown and optimization insights
        </Typography>
      </Box>

      {/* Monthly Spend Overview */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#161b22', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px' }}>
            <CardContent sx={{ py: 2.5 }}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: 'rgba(108, 99, 255, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AttachMoneyIcon sx={{ color: '#6C63FF' }} />
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: '#8b949e' }}>Monthly Spend</Typography>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: '#ffffff' }}>
                      ${totalMonthly.toLocaleString()}
                    </Typography>
                    <Stack direction="row" alignItems="center" spacing={0.3}>
                      <TrendingUpIcon sx={{ fontSize: 14, color: '#f85149' }} />
                      <Typography variant="caption" sx={{ color: '#f85149', fontWeight: 600 }}>
                        +{trendPercent.toFixed(1)}%
                      </Typography>
                    </Stack>
                  </Stack>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#161b22', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px' }}>
            <CardContent sx={{ py: 2.5 }}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: 'rgba(210, 153, 34, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShowChartIcon sx={{ color: '#d29922' }} />
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: '#8b949e' }}>Forecast</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#ffffff' }}>
                    ${forecast.toLocaleString()}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#161b22', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px' }}>
            <CardContent sx={{ py: 2.5 }}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: 'rgba(63, 185, 80, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <SavingsIcon sx={{ color: '#3fb950' }} />
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: '#8b949e' }}>Potential Savings</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#3fb950' }}>
                    ${totalSavings.toLocaleString()}/mo
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#161b22', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px' }}>
            <CardContent sx={{ py: 2.5 }}>
              <Typography variant="caption" sx={{ color: '#8b949e', display: 'block', mb: 0.5 }}>
                Budget Utilization
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: budgetUsed > 90 ? '#f85149' : '#ffffff', mb: 1 }}>
                {budgetUsed.toFixed(0)}%
              </Typography>
              <LinearProgress
                variant="determinate"
                value={budgetUsed}
                sx={{
                  height: 6,
                  borderRadius: 3,
                  bgcolor: 'rgba(255,255,255,0.06)',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 3,
                    bgcolor: budgetUsed > 90 ? '#f85149' : budgetUsed > 75 ? '#d29922' : '#6C63FF',
                  },
                }}
              />
              <Typography variant="caption" sx={{ color: '#8b949e', mt: 0.5, display: 'block' }}>
                ${totalMonthly.toLocaleString()} of ${budget.toLocaleString()} budget
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Cost Breakdown Charts */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Cost by Service - Horizontal Bar Chart */}
        <Grid item xs={12} md={7}>
          <Card sx={{ bgcolor: '#161b22', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', height: '100%' }}>
            <CardContent sx={{ py: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#ffffff', mb: 3 }}>
                Cost by Service
              </Typography>
              <Stack spacing={2}>
                {mockCostByService.map((service, index) => (
                  <Box key={service.name}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2" sx={{ color: '#c9d1d9', fontWeight: 500 }}>
                        {service.name}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#ffffff', fontWeight: 600 }}>
                        ${service.cost.toLocaleString()}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ flex: 1, height: 8, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
                        <Box
                          sx={{
                            width: `${service.percentage}%`,
                            height: '100%',
                            borderRadius: 4,
                            bgcolor: serviceBarColors[index % serviceBarColors.length],
                            transition: 'width 0.8s ease-in-out',
                          }}
                        />
                      </Box>
                      <Typography variant="caption" sx={{ color: '#8b949e', minWidth: 32, textAlign: 'right' }}>
                        {service.percentage}%
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Cost by Environment - Visual Pie */}
        <Grid item xs={12} md={5}>
          <Card sx={{ bgcolor: '#161b22', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', height: '100%' }}>
            <CardContent sx={{ py: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#ffffff', mb: 3 }}>
                Cost by Environment
              </Typography>

              {/* Visual pie chart using SVG */}
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                <svg width="160" height="160" viewBox="0 0 160 160">
                  {(() => {
                    let cumulativePercent = 0;
                    return mockCostByEnvironment.map((env) => {
                      const startAngle = cumulativePercent * 3.6;
                      cumulativePercent += env.percentage;
                      const endAngle = cumulativePercent * 3.6;
                      const startRad = ((startAngle - 90) * Math.PI) / 180;
                      const endRad = ((endAngle - 90) * Math.PI) / 180;
                      const largeArc = env.percentage > 50 ? 1 : 0;
                      const x1 = 80 + 60 * Math.cos(startRad);
                      const y1 = 80 + 60 * Math.sin(startRad);
                      const x2 = 80 + 60 * Math.cos(endRad);
                      const y2 = 80 + 60 * Math.sin(endRad);

                      return (
                        <path
                          key={env.name}
                          d={`M 80 80 L ${x1} ${y1} A 60 60 0 ${largeArc} 1 ${x2} ${y2} Z`}
                          fill={env.color}
                          opacity={0.85}
                          stroke="#161b22"
                          strokeWidth="2"
                        />
                      );
                    });
                  })()}
                  <circle cx="80" cy="80" r="30" fill="#161b22" />
                </svg>
              </Box>

              {/* Legend */}
              <Stack spacing={1.5}>
                {mockCostByEnvironment.map((env) => (
                  <Box key={env.name} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: env.color }} />
                      <Typography variant="body2" sx={{ color: '#c9d1d9' }}>
                        {env.name}
                      </Typography>
                    </Stack>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography variant="body2" sx={{ color: '#ffffff', fontWeight: 600 }}>
                        ${env.cost.toLocaleString()}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#8b949e' }}>
                        ({env.percentage}%)
                      </Typography>
                    </Stack>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Cost Optimization Recommendations */}
      <Card sx={{ bgcolor: '#161b22', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', mb: 4 }}>
        <CardContent sx={{ py: 3 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2.5 }}>
            <LightbulbIcon sx={{ color: '#d29922', fontSize: 20 }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#ffffff' }}>
              Optimization Recommendations
            </Typography>
            <Chip
              label={`$${totalSavings}/mo potential`}
              size="small"
              sx={{ bgcolor: 'rgba(63, 185, 80, 0.12)', color: '#3fb950', fontWeight: 600, fontSize: '0.7rem', height: 22 }}
            />
          </Stack>

          <Stack spacing={0} divider={<Divider sx={{ borderColor: 'rgba(255,255,255,0.04)' }} />}>
            {mockRecommendations.map((rec, index) => (
              <Box
                key={index}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  py: 2,
                  px: 1,
                  borderRadius: '8px',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' },
                }}
              >
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ color: '#c9d1d9', fontWeight: 500 }}>
                    {rec.title}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#8b949e' }}>
                    {rec.description}
                  </Typography>
                </Box>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Chip
                    label={rec.impact}
                    size="small"
                    sx={{
                      bgcolor: impactColors[rec.impact].bg,
                      color: impactColors[rec.impact].color,
                      fontWeight: 600,
                      fontSize: '0.6rem',
                      height: 20,
                      textTransform: 'capitalize',
                    }}
                  />
                  <Typography variant="body2" sx={{ color: '#3fb950', fontWeight: 700, minWidth: 60, textAlign: 'right' }}>
                    -${rec.savings}/mo
                  </Typography>
                </Stack>
              </Box>
            ))}
          </Stack>
        </CardContent>
      </Card>

      {/* Forecast Section */}
      <Card sx={{ bgcolor: '#161b22', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px' }}>
        <CardContent sx={{ py: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#ffffff', mb: 2 }}>
            Spending Forecast
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={4}>
              <Box sx={{ textAlign: 'center', p: 2, borderRadius: '8px', bgcolor: 'rgba(255,255,255,0.02)' }}>
                <Typography variant="caption" sx={{ color: '#8b949e' }}>This Month (Projected)</Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#ffffff', mt: 0.5 }}>
                  ${forecast.toLocaleString()}
                </Typography>
                <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.5} sx={{ mt: 0.5 }}>
                  <TrendingUpIcon sx={{ fontSize: 14, color: '#f85149' }} />
                  <Typography variant="caption" sx={{ color: '#f85149' }}>+7.3% vs last month</Typography>
                </Stack>
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box sx={{ textAlign: 'center', p: 2, borderRadius: '8px', bgcolor: 'rgba(255,255,255,0.02)' }}>
                <Typography variant="caption" sx={{ color: '#8b949e' }}>Next Month (Estimated)</Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#ffffff', mt: 0.5 }}>
                  $9,800
                </Typography>
                <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.5} sx={{ mt: 0.5 }}>
                  <TrendingUpIcon sx={{ fontSize: 14, color: '#d29922' }} />
                  <Typography variant="caption" sx={{ color: '#d29922' }}>+4.3% projected</Typography>
                </Stack>
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box sx={{ textAlign: 'center', p: 2, borderRadius: '8px', bgcolor: 'rgba(255,255,255,0.02)' }}>
                <Typography variant="caption" sx={{ color: '#8b949e' }}>Quarterly Estimate</Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#ffffff', mt: 0.5 }}>
                  $28,200
                </Typography>
                <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.5} sx={{ mt: 0.5 }}>
                  <WarningAmberIcon sx={{ fontSize: 14, color: '#d29922' }} />
                  <Typography variant="caption" sx={{ color: '#d29922' }}>Near budget limit</Typography>
                </Stack>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

export default CostDashboard;
