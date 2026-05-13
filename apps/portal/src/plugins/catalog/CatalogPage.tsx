import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, TextField, InputAdornment, Chip, Grid, Skeleton,
  Alert, Button, Card, CardContent, CardActionArea, Stack, Avatar,
  Pagination,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import FilterListIcon from '@mui/icons-material/FilterList';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PersonIcon from '@mui/icons-material/Person';
import { RegisterForm } from './RegisterForm';
import { useDebounce } from '../../hooks/useDebounce';
import { platformApi } from '../../api/platformApi';
import type { Service } from '../../types';

type FilterType = 'all' | 'production' | 'development' | 'deprecated';

export const CatalogPage: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const debouncedSearch = useDebounce(search, 300);

  const filters: { label: string; value: FilterType }[] = [
    { label: 'All', value: 'all' },
    { label: 'Production', value: 'production' },
    { label: 'Development', value: 'development' },
    { label: 'Deprecated', value: 'deprecated' },
  ];

  const fetchServices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = {
        page,
        pageSize: 12,
        sort: '-updatedAt',
      };
      if (debouncedSearch) params.search = debouncedSearch;
      if (activeFilter !== 'all') params.lifecycle = activeFilter;

      const response = await platformApi.services.list(params);
      setServices(response.data);
      setTotalPages(response.pagination.totalPages);
      setTotalCount(response.pagination.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load services');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, activeFilter]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, activeFilter]);

  const handleServiceRegistered = () => {
    setShowRegisterForm(false);
    fetchServices();
  };

  const getHealthColor = (status?: string) => {
    if (status === 'healthy') return '#4caf50';
    if (status === 'degraded') return '#ff9800';
    if (status === 'unhealthy') return '#f44336';
    return '#8b949e';
  };

  const timeAgo = (d?: string) => {
    if (!d) return 'Never';
    const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
  };

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', animation: 'fadeIn 0.5s ease-out both' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'white' }}>
            Service Catalog
          </Typography>
          <Typography variant="body2" sx={{ color: '#8b949e', mt: 0.5 }}>
            {totalCount} services registered across the platform
          </Typography>
        </Box>
        <Button
          variant="outlined"
          size="small"
          startIcon={<AddIcon />}
          onClick={() => setShowRegisterForm(true)}
          sx={{ borderColor: 'rgba(255,255,255,0.12)', color: '#c9d1d9', '&:hover': { borderColor: 'rgba(255,255,255,0.24)', bgcolor: 'rgba(255,255,255,0.04)' } }}
        >
          New
        </Button>
      </Box>

      {/* Search and Filter Chips */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search services by name, owner, or tag..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#8b949e' }} />
              </InputAdornment>
            ),
          }}
          sx={{
            mb: 2,
            '& .MuiOutlinedInput-root': {
              bgcolor: '#161b22',
              '& fieldset': { borderColor: 'rgba(255,255,255,0.08)' },
              '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.16)' },
              '&.Mui-focused fieldset': { borderColor: '#6C63FF' },
            },
            '& .MuiInputBase-input': { color: '#c9d1d9' },
          }}
        />
        <Stack direction="row" spacing={1}>
          {filters.map((f) => (
            <Chip
              key={f.value}
              label={f.label}
              onClick={() => setActiveFilter(f.value)}
              variant={activeFilter === f.value ? 'filled' : 'outlined'}
              sx={{
                bgcolor: activeFilter === f.value ? 'rgba(108,99,255,0.15)' : 'transparent',
                color: activeFilter === f.value ? '#6C63FF' : '#8b949e',
                borderColor: activeFilter === f.value ? '#6C63FF' : 'rgba(255,255,255,0.08)',
                '&:hover': { bgcolor: 'rgba(108,99,255,0.1)' },
              }}
            />
          ))}
        </Stack>
      </Box>

      {/* Error State */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Service Cards Grid */}
      <Grid container spacing={2.5}>
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Grid item xs={12} sm={6} md={4} key={`skeleton-${i}`}>
                <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2, bgcolor: '#161b22' }} />
              </Grid>
            ))
          : services.map((service, index) => (
              <Grid item xs={12} sm={6} md={4} key={service.id}>
                <Card sx={{
                  bgcolor: '#161b22', border: '1px solid rgba(255,255,255,0.06)',
                  animation: 'fadeInUp 0.4s ease-out both', animationDelay: `${index * 60}ms`,
                  '&:hover': { borderColor: 'rgba(108,99,255,0.3)', transform: 'translateY(-2px)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' },
                  transition: 'all 0.25s ease',
                }}>
                  <CardActionArea sx={{ p: 2.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: getHealthColor(service.healthStatus || service.metadata?.healthStatus) }} />
                          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'white' }}>
                            {service.name}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <PersonIcon sx={{ fontSize: 14, color: '#8b949e' }} />
                          <Typography variant="caption" sx={{ color: '#8b949e' }}>
                            {service.owner || service.team || 'Unassigned'}
                          </Typography>
                        </Box>
                      </Box>
                      <Chip
                        label={service.lifecycle || 'active'}
                        size="small"
                        sx={{
                          height: 20, fontSize: '0.65rem',
                          bgcolor: service.lifecycle === 'production' ? 'rgba(76,175,80,0.1)' : service.lifecycle === 'deprecated' ? 'rgba(244,67,54,0.1)' : 'rgba(108,99,255,0.1)',
                          color: service.lifecycle === 'production' ? '#4caf50' : service.lifecycle === 'deprecated' ? '#f44336' : '#6C63FF',
                        }}
                      />
                    </Box>

                    {/* Description */}
                    <Typography variant="body2" sx={{ color: '#8b949e', mb: 2, minHeight: 40, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {service.description || 'No description provided'}
                    </Typography>

                    {/* Last deployed */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1.5 }}>
                      <AccessTimeIcon sx={{ fontSize: 14, color: '#8b949e' }} />
                      <Typography variant="caption" sx={{ color: '#8b949e' }}>
                        Last deployed: {timeAgo(service.lastDeployedAt || service.metadata?.lastDeployedAt || service.updatedAt)}
                      </Typography>
                    </Box>

                    {/* Tags */}
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                      {(service.tags || []).slice(0, 3).map((tag) => (
                        <Chip key={tag} label={tag} size="small" sx={{ height: 20, fontSize: '0.6rem', bgcolor: 'rgba(255,255,255,0.04)', color: '#8b949e' }} />
                      ))}
                      {(service.tags || []).length > 3 && (
                        <Chip label={`+${service.tags!.length - 3}`} size="small" sx={{ height: 20, fontSize: '0.6rem', bgcolor: 'rgba(255,255,255,0.04)', color: '#8b949e' }} />
                      )}
                    </Stack>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
      </Grid>

      {/* Empty State */}
      {!loading && services.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" sx={{ color: '#8b949e', mb: 1 }}>No services found</Typography>
          <Typography variant="body2" sx={{ color: '#8b949e', mb: 2 }}>
            {search || activeFilter !== 'all' ? 'Try adjusting your search or filters' : 'Get started by registering your first service'}
          </Typography>
          {!search && activeFilter === 'all' && (
            <Button variant="outlined" onClick={() => setShowRegisterForm(true)} sx={{ borderColor: '#6C63FF', color: '#6C63FF' }}>
              Register Your First Service
            </Button>
          )}
        </Box>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Pagination count={totalPages} page={page} onChange={(_, v) => setPage(v)} color="primary" />
        </Box>
      )}

      {/* Register Form Dialog */}
      <RegisterForm
        open={showRegisterForm}
        onClose={() => setShowRegisterForm(false)}
        onSuccess={handleServiceRegistered}
      />
    </Box>
  );
};

export default CatalogPage;
