import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Alert,
  CircularProgress,
  Typography,
  Slider,
  Box,
  Chip,
  Stack,
} from '@mui/material';
import { platformApi } from '../../api/platformApi';

interface ProvisionFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ProvisionData {
  name: string;
  type: 'development' | 'preview' | 'staging';
  ttl: string;
  cpuCores: number;
  memoryGb: number;
  storageGb: number;
}

const TTL_OPTIONS = [
  { value: '4h', label: '4 hours' },
  { value: '24h', label: '1 day' },
  { value: '48h', label: '2 days' },
  { value: '72h', label: '3 days' },
  { value: '168h', label: '1 week' },
  { value: '720h', label: '30 days' },
];

export const ProvisionForm: React.FC<ProvisionFormProps> = ({ open, onClose, onSuccess }) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<ProvisionData>({
    name: '',
    type: 'development',
    ttl: '72h',
    cpuCores: 2,
    memoryGb: 4,
    storageGb: 20,
  });

  const handleChange = (field: keyof ProvisionData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const estimateCost = (): string => {
    const hourlyRate = formData.cpuCores * 0.05 + formData.memoryGb * 0.01 + formData.storageGb * 0.001;
    const hours = parseInt(formData.ttl);
    const totalCost = hourlyRate * hours;
    return totalCost.toFixed(2);
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      setError('Environment name is required');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await platformApi.environments.create({
        name: formData.name,
        type: formData.type,
        ttl: formData.ttl,
        resources: {
          cpu_cores: formData.cpuCores,
          memory_gb: formData.memoryGb,
          storage_gb: formData.storageGb,
        },
      });
      onSuccess();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to provision environment');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'development',
      ttl: '72h',
      cpuCores: 2,
      memoryGb: 4,
      storageGb: 20,
    });
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth aria-labelledby="provision-dialog-title">
      <DialogTitle id="provision-dialog-title">Provision New Environment</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              required
              label="Environment Name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="preview-pr-142"
              helperText="Lowercase letters, numbers, and hyphens"
              inputProps={{ 'aria-label': 'Environment name' }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel id="env-type-label">Type</InputLabel>
              <Select
                labelId="env-type-label"
                value={formData.type}
                label="Type"
                onChange={(e) => handleChange('type', e.target.value)}
              >
                <MenuItem value="development">Development</MenuItem>
                <MenuItem value="preview">Preview (PR)</MenuItem>
                <MenuItem value="staging">Staging</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel id="ttl-label">Time to Live</InputLabel>
              <Select
                labelId="ttl-label"
                value={formData.ttl}
                label="Time to Live"
                onChange={(e) => handleChange('ttl', e.target.value)}
              >
                {TTL_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Resource Sliders */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom sx={{ mt: 1 }}>
              Resources
            </Typography>
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ px: 1 }}>
              <Typography variant="body2" gutterBottom>
                CPU Cores: <strong>{formData.cpuCores}</strong>
              </Typography>
              <Slider
                value={formData.cpuCores}
                onChange={(_, value) => handleChange('cpuCores', value as number)}
                min={1}
                max={8}
                step={1}
                marks={[
                  { value: 1, label: '1' },
                  { value: 2, label: '2' },
                  { value: 4, label: '4' },
                  { value: 8, label: '8' },
                ]}
                aria-label="CPU cores"
              />
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ px: 1 }}>
              <Typography variant="body2" gutterBottom>
                Memory (GB): <strong>{formData.memoryGb}</strong>
              </Typography>
              <Slider
                value={formData.memoryGb}
                onChange={(_, value) => handleChange('memoryGb', value as number)}
                min={1}
                max={32}
                step={1}
                marks={[
                  { value: 1, label: '1' },
                  { value: 4, label: '4' },
                  { value: 8, label: '8' },
                  { value: 16, label: '16' },
                  { value: 32, label: '32' },
                ]}
                aria-label="Memory in gigabytes"
              />
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ px: 1 }}>
              <Typography variant="body2" gutterBottom>
                Storage (GB): <strong>{formData.storageGb}</strong>
              </Typography>
              <Slider
                value={formData.storageGb}
                onChange={(_, value) => handleChange('storageGb', value as number)}
                min={5}
                max={100}
                step={5}
                marks={[
                  { value: 5, label: '5' },
                  { value: 20, label: '20' },
                  { value: 50, label: '50' },
                  { value: 100, label: '100' },
                ]}
                aria-label="Storage in gigabytes"
              />
            </Box>
          </Grid>

          {/* Cost Estimate */}
          <Grid item xs={12}>
            <Box
              sx={{
                p: 2,
                bgcolor: 'action.hover',
                borderRadius: 1,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Typography variant="body2" color="text.secondary">
                Estimated cost for this environment:
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip label={`~$${estimateCost()}`} color="primary" variant="outlined" />
                <Typography variant="caption" color="text.secondary">
                  for {formData.ttl}
                </Typography>
              </Stack>
            </Box>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={submitting || !formData.name}
          startIcon={submitting ? <CircularProgress size={16} /> : undefined}
        >
          {submitting ? 'Provisioning...' : 'Provision Environment'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProvisionForm;
