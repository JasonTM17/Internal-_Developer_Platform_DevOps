import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Alert,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { platformApi } from '../../api/platformApi';

interface CostBreakdown {
  service: string;
  team: string;
  compute: number;
  storage: number;
  network: number;
  total: number;
  trend: number; // percentage change from previous period
  budget: number;
  budgetUtilization: number;
}

interface CostSummary {
  totalCost: number;
  previousPeriodCost: number;
  trend: number;
  forecast: number;
  budget: number;
  budgetUtilization: number;
  breakdown: CostBreakdown[];
  byCategory: {
    compute: number;
    storage: number;
    network: number;
    other: number;
  };
}

type TimePeriod = '7d' | '30d' | '90d';

export const CostDashboard: React.FC = () => {
  const [costData, setCostData] = useState<CostSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<TimePeriod>('30d');

  const fetchCosts = async () => {
    setLoading(true);
    try {
      const response = await platformApi.costs.summary({ period });
      setCostData(response);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cost data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCosts();
  }, [period]);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatTrend = (trend: number): React.ReactNode => {
    const isPositive = trend > 0;
    const color = isPositive ? 'error.main' : 'success.main';
    const Icon = isPositive ? TrendingUpIcon : TrendingDownIcon;

    return (
      <Stack direction="row" alignItems="center" spacing={0.5}>
        <Icon sx={{ fontSize: 16, color }} />
        <Typography variant="body2" sx={{ color }}>
          {isPositive ? '+' : ''}{trend.toFixed(1)}%
        </Typography>
      </Stack>
    );
  };

  if (loading && !costData) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto', animation: 'fadeIn 0.5s ease-out both' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Cost Analysis
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Infrastructure cost breakdown and optimization insights
          </Typography>
        </Box>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel id="period-label">Period</InputLabel>
          <Select
            labelId="period-label"
            value={period}
            label="Period"
            onChange={(e) => setPeriod(e.target.value as TimePeriod)}
          >
            <MenuItem value="7d">Last 7 days</MenuItem>
            <MenuItem value="30d">Last 30 days</MenuItem>
            <MenuItem value="90d">Last 90 days</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {costData && (
        <>
          {/* Summary Cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Total Cost ({period})
                      </Typography>
                      <Typography variant="h4">
                        {formatCurrency(costData.totalCost)}
                      </Typography>
                    </Box>
                    <AttachMoneyIcon color="primary" />
                  </Stack>
                  <Box sx={{ mt: 1 }}>
                    {formatTrend(costData.trend)}
                    <Typography variant="caption" color="text.secondary">
                      vs previous period
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="caption" color="text.secondary">
                    Monthly Forecast
                  </Typography>
                  <Typography variant="h4">
                    {formatCurrency(costData.forecast)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Based on current usage
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="caption" color="text.secondary">
                    Budget
                  </Typography>
                  <Typography variant="h4">
                    {formatCurrency(costData.budget)}
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(costData.budgetUtilization, 100)}
                      color={costData.budgetUtilization > 90 ? 'error' : costData.budgetUtilization > 75 ? 'warning' : 'primary'}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {costData.budgetUtilization.toFixed(0)}% utilized
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="caption" color="text.secondary">
                    Cost per Service (avg)
                  </Typography>
                  <Typography variant="h4">
                    {costData.breakdown.length > 0
                      ? formatCurrency(costData.totalCost / costData.breakdown.length)
                      : '$0'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Across {costData.breakdown.length} services
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Budget Warning */}
          {costData.budgetUtilization > 90 && (
            <Alert severity="warning" sx={{ mb: 3 }} icon={<WarningAmberIcon />}>
              <Typography variant="body2">
                <strong>Budget Alert:</strong> You've used {costData.budgetUtilization.toFixed(0)}% of your monthly budget.
                Consider reviewing resource allocation or requesting a budget increase.
              </Typography>
            </Alert>
          )}

          {/* Category Breakdown */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Cost by Category
                  </Typography>
                  <Stack spacing={2}>
                    {Object.entries(costData.byCategory).map(([category, amount]) => {
                      const percentage = (amount / costData.totalCost) * 100;
                      return (
                        <Box key={category}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="body2" textTransform="capitalize">
                              {category}
                            </Typography>
                            <Typography variant="body2" fontWeight="bold">
                              {formatCurrency(amount)} ({percentage.toFixed(0)}%)
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={percentage}
                            sx={{ height: 8, borderRadius: 4 }}
                          />
                        </Box>
                      );
                    })}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Optimization Recommendations
                  </Typography>
                  <Stack spacing={1.5}>
                    <Alert severity="info" variant="outlined" sx={{ py: 0.5 }}>
                      <Typography variant="body2">
                        3 preview environments idle for 48h+ — auto-cleanup could save ~$45/month
                      </Typography>
                    </Alert>
                    <Alert severity="info" variant="outlined" sx={{ py: 0.5 }}>
                      <Typography variant="body2">
                        2 services over-provisioned (CPU utilization &lt; 10%) — right-sizing saves ~$120/month
                      </Typography>
                    </Alert>
                    <Alert severity="info" variant="outlined" sx={{ py: 0.5 }}>
                      <Typography variant="body2">
                        Reserved instances for stable workloads could save ~$200/month (25% discount)
                      </Typography>
                    </Alert>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Service Cost Table */}
          <Typography variant="h6" gutterBottom>
            Cost by Service
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table aria-label="Cost breakdown by service">
              <TableHead>
                <TableRow>
                  <TableCell>Service</TableCell>
                  <TableCell>Team</TableCell>
                  <TableCell align="right">Compute</TableCell>
                  <TableCell align="right">Storage</TableCell>
                  <TableCell align="right">Network</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell>Trend</TableCell>
                  <TableCell>Budget</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {costData.breakdown
                  .sort((a, b) => b.total - a.total)
                  .map((row) => (
                    <TableRow key={row.service} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {row.service}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={row.team} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell align="right">{formatCurrency(row.compute)}</TableCell>
                      <TableCell align="right">{formatCurrency(row.storage)}</TableCell>
                      <TableCell align="right">{formatCurrency(row.network)}</TableCell>
                      <TableCell align="right">
                        <Typography fontWeight="bold">{formatCurrency(row.total)}</Typography>
                      </TableCell>
                      <TableCell>{formatTrend(row.trend)}</TableCell>
                      <TableCell>
                        <Tooltip title={`${row.budgetUtilization.toFixed(0)}% of ${formatCurrency(row.budget)}`}>
                          <LinearProgress
                            variant="determinate"
                            value={Math.min(row.budgetUtilization, 100)}
                            color={row.budgetUtilization > 90 ? 'error' : 'primary'}
                            sx={{ width: 60, height: 6, borderRadius: 3 }}
                          />
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Box>
  );
};

export default CostDashboard;
