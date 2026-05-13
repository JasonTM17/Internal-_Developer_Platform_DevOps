import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  Chip,
  Grid,
  Skeleton,
  Alert,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import FilterListIcon from '@mui/icons-material/FilterList';
import { ServiceCard } from './ServiceCard';
import { RegisterForm } from './RegisterForm';
import { useDebounce } from '../../hooks/useDebounce';
import { platformApi } from '../../api/platformApi';
import type { Service, ServiceTier, ServiceLifecycle } from '../../types';

interface CatalogFilters {
  search: string;
  tier: ServiceTier | 'all';
  lifecycle: ServiceLifecycle | 'all';
  team: string;
}

export const CatalogPage: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState<CatalogFilters>({
    search: '',
    tier: 'all',
    lifecycle: 'all',
    team: '',
  });

  const debouncedSearch = useDebounce(filters.search, 300);

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
      if (filters.tier !== 'all') params.tier = filters.tier;
      if (filters.lifecycle !== 'all') params.lifecycle = filters.lifecycle;
      if (filters.team) params.team = filters.team;

      const response = await platformApi.services.list(params);
      setServices(response.data);
      setTotalPages(response.pagination.totalPages);
      setTotalCount(response.pagination.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load services');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, filters.tier, filters.lifecycle, filters.team]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters.tier, filters.lifecycle, filters.team]);

  const handleFilterChange = (key: keyof CatalogFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleServiceRegistered = () => {
    setShowRegisterForm(false);
    fetchServices();
  };

  const activeFilterCount = [
    filters.tier !== 'all',
    filters.lifecycle !== 'all',
    filters.team !== '',
  ].filter(Boolean).length;

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto', animation: 'fadeIn 0.5s ease-out both' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Service Catalog
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {totalCount} services registered across the platform
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setShowRegisterForm(true)}
          aria-label="Register new service"
        >
          Register Service
        </Button>
      </Box>

      {/* Search and Filters */}
      <Box sx={{ mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="Search services..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              aria-label="Search services"
            />
          </Grid>
          <Grid item xs={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel id="tier-filter-label">Tier</InputLabel>
              <Select
                labelId="tier-filter-label"
                value={filters.tier}
                label="Tier"
                onChange={(e) => handleFilterChange('tier', e.target.value)}
              >
                <MenuItem value="all">All Tiers</MenuItem>
                <MenuItem value="critical">Critical</MenuItem>
                <MenuItem value="standard">Standard</MenuItem>
                <MenuItem value="experimental">Experimental</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel id="lifecycle-filter-label">Lifecycle</InputLabel>
              <Select
                labelId="lifecycle-filter-label"
                value={filters.lifecycle}
                label="Lifecycle"
                onChange={(e) => handleFilterChange('lifecycle', e.target.value)}
              >
                <MenuItem value="all">All Stages</MenuItem>
                <MenuItem value="production">Production</MenuItem>
                <MenuItem value="staging">Staging</MenuItem>
                <MenuItem value="deprecated">Deprecated</MenuItem>
                <MenuItem value="experimental">Experimental</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              size="small"
              placeholder="Filter by team..."
              value={filters.team}
              onChange={(e) => handleFilterChange('team', e.target.value)}
              aria-label="Filter by team"
            />
          </Grid>
          <Grid item xs={12} md={1}>
            {activeFilterCount > 0 && (
              <Chip
                icon={<FilterListIcon />}
                label={`${activeFilterCount} active`}
                onDelete={() =>
                  setFilters({ search: '', tier: 'all', lifecycle: 'all', team: '' })
                }
                color="primary"
                variant="outlined"
                size="small"
              />
            )}
          </Grid>
        </Grid>
      </Box>

      {/* Error State */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Service Grid */}
      <Grid container spacing={3}>
        {loading
          ? Array.from({ length: 6 }).map((_, index) => (
              <Grid item xs={12} sm={6} md={4} key={`skeleton-${index}`}>
                <Skeleton variant="rectangular" height={220} sx={{ borderRadius: 2 }} />
              </Grid>
            ))
          : services.map((service) => (
              <Grid item xs={12} sm={6} md={4} key={service.id}>
                <ServiceCard service={service} onUpdate={fetchServices} />
              </Grid>
            ))}
      </Grid>

      {/* Empty State */}
      {!loading && services.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No services found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {filters.search || activeFilterCount > 0
              ? 'Try adjusting your search or filters'
              : 'Get started by registering your first service'}
          </Typography>
          {!filters.search && activeFilterCount === 0 && (
            <Button variant="outlined" onClick={() => setShowRegisterForm(true)}>
              Register Your First Service
            </Button>
          )}
        </Box>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, value) => setPage(value)}
            color="primary"
            showFirstButton
            showLastButton
          />
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
