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
  Stepper,
  Step,
  StepLabel,
  Box,
} from '@mui/material';
import { platformApi } from '../../api/platformApi';
import type { ServiceTier } from '../../types';

interface RegisterFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormData {
  name: string;
  description: string;
  team: string;
  tier: ServiceTier;
  repository: string;
  language: string;
  framework: string;
}

const STEPS = ['Basic Info', 'Technical Details', 'Review'];

const LANGUAGES = ['typescript', 'javascript', 'python', 'go', 'java', 'rust', 'csharp'];
const FRAMEWORKS = ['nestjs', 'express', 'fastify', 'django', 'flask', 'gin', 'spring-boot'];

export const RegisterForm: React.FC<RegisterFormProps> = ({ open, onClose, onSuccess }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    team: '',
    tier: 'standard',
    repository: '',
    language: '',
    framework: '',
  });
  const [validationErrors, setValidationErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setValidationErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validateStep = (step: number): boolean => {
    const errors: Partial<Record<keyof FormData, string>> = {};

    if (step === 0) {
      if (!formData.name) {
        errors.name = 'Service name is required';
      } else if (!/^[a-z][a-z0-9-]*[a-z0-9]$/.test(formData.name)) {
        errors.name = 'Must be lowercase, start with letter, use only letters, numbers, and hyphens';
      } else if (formData.name.length < 3 || formData.name.length > 63) {
        errors.name = 'Must be between 3 and 63 characters';
      }

      if (!formData.team) {
        errors.team = 'Team is required';
      }

      if (formData.description && formData.description.length > 500) {
        errors.description = 'Description must be under 500 characters';
      }
    }

    if (step === 1) {
      if (formData.repository && !formData.repository.startsWith('https://')) {
        errors.repository = 'Repository URL must start with https://';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    try {
      await platformApi.services.create({
        name: formData.name,
        description: formData.description || undefined,
        team: formData.team,
        tier: formData.tier,
        repository: formData.repository || undefined,
        language: formData.language || undefined,
        framework: formData.framework || undefined,
      });

      onSuccess();
      handleReset();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to register service. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setActiveStep(0);
    setFormData({
      name: '',
      description: '',
      team: '',
      tier: 'standard',
      repository: '',
      language: '',
      framework: '',
    });
    setValidationErrors({});
    setError(null);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="Service Name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                error={!!validationErrors.name}
                helperText={validationErrors.name || 'Lowercase letters, numbers, and hyphens (e.g., payment-service)'}
                placeholder="my-service"
                inputProps={{ 'aria-label': 'Service name' }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                error={!!validationErrors.description}
                helperText={validationErrors.description || `${formData.description.length}/500 characters`}
                placeholder="Brief description of what this service does"
                inputProps={{ 'aria-label': 'Service description' }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label="Team"
                value={formData.team}
                onChange={(e) => handleChange('team', e.target.value)}
                error={!!validationErrors.team}
                helperText={validationErrors.team || 'Owning team identifier'}
                placeholder="backend-team"
                inputProps={{ 'aria-label': 'Team name' }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="tier-select-label">Service Tier</InputLabel>
                <Select
                  labelId="tier-select-label"
                  value={formData.tier}
                  label="Service Tier"
                  onChange={(e) => handleChange('tier', e.target.value)}
                >
                  <MenuItem value="critical">Critical — 99.99% SLO, 24/7 on-call</MenuItem>
                  <MenuItem value="standard">Standard — 99.9% SLO, business hours</MenuItem>
                  <MenuItem value="experimental">Experimental — Best effort</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        );

      case 1:
        return (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Repository URL"
                value={formData.repository}
                onChange={(e) => handleChange('repository', e.target.value)}
                error={!!validationErrors.repository}
                helperText={validationErrors.repository || 'HTTPS URL to the source repository'}
                placeholder="https://github.com/org/repo"
                inputProps={{ 'aria-label': 'Repository URL' }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="language-select-label">Language</InputLabel>
                <Select
                  labelId="language-select-label"
                  value={formData.language}
                  label="Language"
                  onChange={(e) => handleChange('language', e.target.value)}
                >
                  <MenuItem value="">Not specified</MenuItem>
                  {LANGUAGES.map((lang) => (
                    <MenuItem key={lang} value={lang}>
                      {lang.charAt(0).toUpperCase() + lang.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="framework-select-label">Framework</InputLabel>
                <Select
                  labelId="framework-select-label"
                  value={formData.framework}
                  label="Framework"
                  onChange={(e) => handleChange('framework', e.target.value)}
                >
                  <MenuItem value="">Not specified</MenuItem>
                  {FRAMEWORKS.map((fw) => (
                    <MenuItem key={fw} value={fw}>
                      {fw}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        );

      case 2:
        return (
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Review Service Registration
            </Typography>
            <Grid container spacing={1}>
              <Grid item xs={4}>
                <Typography variant="caption" color="text.secondary">Name</Typography>
                <Typography variant="body2"><strong>{formData.name}</strong></Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="caption" color="text.secondary">Team</Typography>
                <Typography variant="body2">{formData.team}</Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="caption" color="text.secondary">Tier</Typography>
                <Typography variant="body2">{formData.tier}</Typography>
              </Grid>
              {formData.description && (
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">Description</Typography>
                  <Typography variant="body2">{formData.description}</Typography>
                </Grid>
              )}
              {formData.repository && (
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">Repository</Typography>
                  <Typography variant="body2">{formData.repository}</Typography>
                </Grid>
              )}
              {formData.language && (
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Language</Typography>
                  <Typography variant="body2">{formData.language}</Typography>
                </Grid>
              )}
              {formData.framework && (
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Framework</Typography>
                  <Typography variant="body2">{formData.framework}</Typography>
                </Grid>
              )}
            </Grid>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth aria-labelledby="register-dialog-title">
      <DialogTitle id="register-dialog-title">Register New Service</DialogTitle>
      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ mb: 3, mt: 1 }}>
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {renderStepContent(activeStep)}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={submitting}>
          Cancel
        </Button>
        <Box sx={{ flex: 1 }} />
        {activeStep > 0 && (
          <Button onClick={handleBack} disabled={submitting}>
            Back
          </Button>
        )}
        {activeStep < STEPS.length - 1 ? (
          <Button variant="contained" onClick={handleNext}>
            Next
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={16} /> : undefined}
          >
            {submitting ? 'Registering...' : 'Register Service'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default RegisterForm;
