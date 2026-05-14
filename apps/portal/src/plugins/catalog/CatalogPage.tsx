import AccessTimeIcon from '@mui/icons-material/AccessTime';
import AddIcon from '@mui/icons-material/Add';
import PersonIcon from '@mui/icons-material/Person';
import SearchIcon from '@mui/icons-material/Search';
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
  Card,
  CardActionArea,
  Stack,
  Pagination,
  useTheme,
  alpha,
} from '@mui/material';
import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { platformApi } from '../../api/platformApi';
import { useDebounce } from '../../hooks/useDebounce';
import type { Service } from '../../types';
import { timeAgo } from '../../utils/time';

import { RegisterForm } from './RegisterForm';

type FilterType = 'all' | 'production' | 'development' | 'deprecated';

export const CatalogPage: React.FC = () => {
  const theme = useTheme();
  const { t } = useTranslation();
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
    { label: t('catalog.filters.all'), value: 'all' },
    { label: t('catalog.filters.production'), value: 'production' },
    { label: t('catalog.filters.development'), value: 'development' },
    { label: t('catalog.filters.deprecated'), value: 'deprecated' },
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
    void fetchServices();
  }, [fetchServices]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, activeFilter]);

  const handleServiceRegistered = () => {
    setShowRegisterForm(false);
    void fetchServices();
  };

  const getHealthColor = (status?: string) => {
    if (status === 'healthy') return theme.palette.success.main;
    if (status === 'degraded') return theme.palette.warning.main;
    if (status === 'unhealthy') return theme.palette.error.main;
    return theme.palette.text.secondary;
  };

  return (
    <Box sx={{ maxWidth: 1440, mx: 'auto', animation: 'fadeIn 0.5s ease-out both' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
            {t('catalog.title')}
          </Typography>
          <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mt: 0.5 }}>
            {t('catalog.subtitle', { count: totalCount })}
          </Typography>
        </Box>
        <Button
          variant="outlined"
          size="small"
          startIcon={<AddIcon />}
          onClick={() => setShowRegisterForm(true)}
          sx={{
            borderColor: theme.palette.divider,
            color: theme.palette.text.primary,
            '&:hover': {
              borderColor: theme.palette.text.secondary,
              bgcolor: alpha(theme.palette.text.primary, 0.04),
            },
          }}
        >
          {t('common.new')}
        </Button>
      </Box>

      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder={t('catalog.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: theme.palette.text.secondary }} />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
        />
        <Stack direction="row" spacing={1}>
          {filters.map((f) => (
            <Chip
              key={f.value}
              label={f.label}
              onClick={() => setActiveFilter(f.value)}
              variant={activeFilter === f.value ? 'filled' : 'outlined'}
              sx={{
                bgcolor:
                  activeFilter === f.value
                    ? alpha(theme.palette.primary.main, 0.12)
                    : 'transparent',
                color:
                  activeFilter === f.value
                    ? theme.palette.primary.main
                    : theme.palette.text.secondary,
                borderColor:
                  activeFilter === f.value ? theme.palette.primary.main : theme.palette.divider,
                '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.08) },
              }}
            />
          ))}
        </Stack>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2.5}>
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Grid item xs={12} sm={6} md={4} key={`skeleton-${i}`}>
                <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
              </Grid>
            ))
          : services.map((service, index) => (
              <Grid item xs={12} sm={6} md={4} key={service.id}>
                <Card
                  sx={{
                    animation: 'fadeInUp 0.4s ease-out both',
                    animationDelay: `${index * 60}ms`,
                    '&:hover': {
                      borderColor: alpha(theme.palette.primary.main, 0.3),
                      transform: 'translateY(-2px)',
                      boxShadow: `0 4px 20px ${alpha(theme.palette.common.black, 0.2)}`,
                    },
                    transition: 'all 0.25s ease',
                  }}
                >
                  <CardActionArea sx={{ p: 2.5 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        mb: 2,
                      }}
                    >
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Box
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              bgcolor: getHealthColor(
                                service.healthStatus || service.metadata?.healthStatus,
                              ),
                            }}
                          />
                          <Typography
                            variant="subtitle1"
                            sx={{ fontWeight: 600, color: theme.palette.text.primary }}
                          >
                            {service.name}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <PersonIcon sx={{ fontSize: 14, color: theme.palette.text.secondary }} />
                          <Typography
                            variant="caption"
                            sx={{ color: theme.palette.text.secondary }}
                          >
                            {service.owner || service.team || t('catalog.unassigned')}
                          </Typography>
                        </Box>
                      </Box>
                      <Chip
                        label={service.lifecycle || 'active'}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: '0.65rem',
                          bgcolor:
                            service.lifecycle === 'production'
                              ? alpha(theme.palette.success.main, 0.1)
                              : service.lifecycle === 'deprecated'
                                ? alpha(theme.palette.error.main, 0.1)
                                : alpha(theme.palette.primary.main, 0.1),
                          color:
                            service.lifecycle === 'production'
                              ? theme.palette.success.main
                              : service.lifecycle === 'deprecated'
                                ? theme.palette.error.main
                                : theme.palette.primary.main,
                        }}
                      />
                    </Box>

                    <Typography
                      variant="body2"
                      sx={{
                        color: theme.palette.text.secondary,
                        mb: 2,
                        minHeight: 40,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {service.description || t('catalog.noDescription')}
                    </Typography>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1.5 }}>
                      <AccessTimeIcon sx={{ fontSize: 14, color: theme.palette.text.secondary }} />
                      <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                        Last deployed:{' '}
                        {timeAgo(
                          service.lastDeployedAt ||
                            service.metadata?.lastDeployedAt ||
                            service.updatedAt,
                        )}
                      </Typography>
                    </Box>

                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                      {(service.tags || []).slice(0, 3).map((tag) => (
                        <Chip
                          key={tag}
                          label={tag}
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: '0.6rem',
                            bgcolor: alpha(theme.palette.text.primary, 0.04),
                            color: theme.palette.text.secondary,
                          }}
                        />
                      ))}
                      {(service.tags || []).length > 3 && (
                        <Chip
                          label={`+${service.tags!.length - 3}`}
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: '0.6rem',
                            bgcolor: alpha(theme.palette.text.primary, 0.04),
                            color: theme.palette.text.secondary,
                          }}
                        />
                      )}
                    </Stack>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
      </Grid>

      {!loading && services.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" sx={{ color: theme.palette.text.secondary, mb: 1 }}>
            {t('catalog.noServices')}
          </Typography>
          <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mb: 2 }}>
            {search || activeFilter !== 'all'
              ? t('catalog.adjustFilters')
              : t('catalog.registerFirst')}
          </Typography>
          {!search && activeFilter === 'all' && (
            <Button
              variant="outlined"
              onClick={() => setShowRegisterForm(true)}
              sx={{ borderColor: theme.palette.primary.main, color: theme.palette.primary.main }}
            >
              {t('catalog.registerButton')}
            </Button>
          )}
        </Box>
      )}

      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, v) => setPage(v)}
            color="primary"
          />
        </Box>
      )}

      <RegisterForm
        open={showRegisterForm}
        onClose={() => setShowRegisterForm(false)}
        onSuccess={handleServiceRegistered}
      />
    </Box>
  );
};

export default CatalogPage;
