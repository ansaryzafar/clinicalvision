import React, { useState } from 'react';
import { Box, Typography, Button, Grid, TextField, MenuItem, Alert, alpha } from '@mui/material';
import SEOHead from '../components/shared/SEOHead';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../routes/paths';
import { PlayCircle, CheckCircle } from '@mui/icons-material';
import { PageLayout, PageHero, PageSection } from '../components/layout/PageLayout';
import { lunitColors, lunitTypography, lunitRadius } from '../styles/lunitDesignSystem';
import { api } from '../services/api';

const demoFeatures = [
  'Walkthrough of the analysis workflow on public CBIS-DDSM mammograms',
  'Grad-CAM heatmaps and experimental uncertainty estimates',
  'Fictional patient cases; no real patient data',
  'Discussion of the research baseline results and limitations',
];

const roles = [
  'Researcher',
  'Radiologist or clinician',
  'Student',
  'Developer or engineer',
  'Just curious',
  'Other',
];

const DemoPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    role: '',
    message: '',
    website: '', // honeypot: hidden from people, bots tend to fill it
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    try {
      await api.submitDemoRequest(formData);
      setSubmitted(true);
    } catch (err: any) {
      setSubmitError(err?.message || 'We could not send your request. Please try again, or email hello@clinicalvision.ai.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  if (submitted) {
    return (
      <PageLayout>
        <PageSection paddingY="large">
          <Box
            sx={{
              maxWidth: 600,
              mx: 'auto',
              textAlign: 'center',
              py: 8,
            }}
          >
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                bgcolor: alpha(lunitColors.green, 0.1),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 3,
              }}
            >
              <CheckCircle sx={{ fontSize: 40, color: lunitColors.green }} />
            </Box>
            <Typography
              sx={{
                fontFamily: lunitTypography.fontFamilyHeading,
                fontSize: 'clamp(28px, 4vw, 40px)',
                fontWeight: 300,
                color: lunitColors.headingColor,
                mb: 2,
              }}
            >
              Thank You!
            </Typography>
            <Typography
              sx={{
                fontFamily: lunitTypography.fontFamilyBody,
                fontSize: '16px',
                fontWeight: 300,
                color: lunitColors.text,
                mb: 4,
                lineHeight: 1.8,
              }}
            >
              Thank you for your interest in the research demo. Your request has been noted, and no response time can be guaranteed.
            </Typography>
            <Button
              variant="contained"
              onClick={() => navigate(ROUTES.HOME)}
              sx={{
                bgcolor: lunitColors.black,
                color: lunitColors.white,
                fontFamily: lunitTypography.fontFamilyBody,
                fontWeight: 500,
                textTransform: 'none',
                borderRadius: lunitRadius.full,
                px: 4,
                py: 1.5,
                '&:hover': {
                  bgcolor: lunitColors.teal,
                  color: lunitColors.black,
                },
              }}
            >
              Return Home
            </Button>
          </Box>
        </PageSection>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <SEOHead
        title="Research Demo — ClinicalVision Research Prototype"
        description="Explore the ClinicalVision research prototype using publicly available CBIS-DDSM mammograms. Research demonstration only. Not a medical device. Not for clinical use."
        keywords={['ClinicalVision research demo', 'mammography AI research prototype', 'explainable AI mammography', 'CBIS-DDSM']}
        canonicalPath="/demo"
      />
      {/* Hero */}
      <PageHero
        label="Research Demo"
        title={
          <>
            Try the{' '}
            <Box component="span" sx={{ color: lunitColors.teal }}>
              Research Demo
            </Box>
          </>
        }
        subtitle="A research prototype for exploring AI-assisted mammography analysis on publicly available CBIS-DDSM images. Not a medical device. Not for clinical use."
      />

      {/* Form Section */}
      <PageSection>
        <Grid container spacing={6}>
          {/* Left - Benefits */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Box
              sx={{
                p: 4,
                borderRadius: lunitRadius['2xl'],
                bgcolor: lunitColors.darkerGray,
                height: '100%',
              }}
            >
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: lunitRadius.lg,
                  bgcolor: alpha(lunitColors.teal, 0.2),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 3,
                }}
              >
                <PlayCircle sx={{ fontSize: 32, color: lunitColors.teal }} />
              </Box>

              <Typography
                sx={{
                  fontFamily: lunitTypography.fontFamilyHeading,
                  fontSize: '24px',
                  fontWeight: 400,
                  color: lunitColors.white,
                  mb: 2,
                }}
              >
                What to Expect
              </Typography>

              <Typography
                sx={{
                  fontFamily: lunitTypography.fontFamilyBody,
                  fontSize: '15px',
                  fontWeight: 300,
                  color: lunitColors.grey,
                  mb: 4,
                  lineHeight: 1.7,
                }}
              >
                The research demo shows the current prototype workflow on public research images with fictional patient details. Do not submit real patient data.
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {demoFeatures.map((feature, idx) => (
                  <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <CheckCircle sx={{ fontSize: 20, color: lunitColors.teal }} />
                    <Typography
                      sx={{
                        fontFamily: lunitTypography.fontFamilyBody,
                        fontSize: '14px',
                        fontWeight: 400,
                        color: lunitColors.grey,
                      }}
                    >
                      {feature}
                    </Typography>
                  </Box>
                ))}
              </Box>

              <Box
                sx={{
                  mt: 4,
                  pt: 4,
                  borderTop: `1px solid ${alpha(lunitColors.white, 0.1)}`,
                }}
              >
                <Typography
                  sx={{
                    fontFamily: lunitTypography.fontFamilyBody,
                    fontSize: '13px',
                    fontWeight: 300,
                    color: lunitColors.grey,
                    fontStyle: 'italic',
                    lineHeight: 1.7,
                  }}
                >
                  Research prototype. Not a medical device. Not for clinical use. Results have not been validated on external or prospective data.
                </Typography>
              </Box>
            </Box>
          </Grid>

          {/* Right - Form */}
          <Grid size={{ xs: 12, md: 7 }}>
            <Typography
              sx={{
                fontFamily: lunitTypography.fontFamilyHeading,
                fontSize: '24px',
                fontWeight: 400,
                color: lunitColors.headingColor,
                mb: 3,
              }}
            >
              Ask About the Research Demo
            </Typography>

            <Box component="form" onSubmit={handleSubmit}>
              {submitError && (
                <Alert severity="error" sx={{ mb: 2 }}>{submitError}</Alert>
              )}
              <input
                type="text"
                name="hp_field"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, opacity: 0 }}
              />
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    required
                    label="First Name"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: lunitRadius.md,
                        fontFamily: lunitTypography.fontFamilyBody,
                        '&:hover fieldset': { borderColor: lunitColors.grey },
                        '&.Mui-focused fieldset': { borderColor: lunitColors.teal },
                      },
                      '& .MuiInputLabel-root': {
                        fontFamily: lunitTypography.fontFamilyBody,
                        '&.Mui-focused': { color: lunitColors.teal },
                      },
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    required
                    label="Last Name"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: lunitRadius.md,
                        fontFamily: lunitTypography.fontFamilyBody,
                        '&:hover fieldset': { borderColor: lunitColors.grey },
                        '&.Mui-focused fieldset': { borderColor: lunitColors.teal },
                      },
                      '& .MuiInputLabel-root': {
                        fontFamily: lunitTypography.fontFamilyBody,
                        '&.Mui-focused': { color: lunitColors.teal },
                      },
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    required
                    label="Email Address"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: lunitRadius.md,
                        fontFamily: lunitTypography.fontFamilyBody,
                        '&:hover fieldset': { borderColor: lunitColors.grey },
                        '&.Mui-focused fieldset': { borderColor: lunitColors.teal },
                      },
                      '& .MuiInputLabel-root': {
                        fontFamily: lunitTypography.fontFamilyBody,
                        '&.Mui-focused': { color: lunitColors.teal },
                      },
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Phone Number (Optional)"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: lunitRadius.md,
                        fontFamily: lunitTypography.fontFamilyBody,
                        '&:hover fieldset': { borderColor: lunitColors.grey },
                        '&.Mui-focused fieldset': { borderColor: lunitColors.teal },
                      },
                      '& .MuiInputLabel-root': {
                        fontFamily: lunitTypography.fontFamilyBody,
                        '&.Mui-focused': { color: lunitColors.teal },
                      },
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="Organisation or Institution (Optional)"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: lunitRadius.md,
                        fontFamily: lunitTypography.fontFamilyBody,
                        '&:hover fieldset': { borderColor: lunitColors.grey },
                        '&.Mui-focused fieldset': { borderColor: lunitColors.teal },
                      },
                      '& .MuiInputLabel-root': {
                        fontFamily: lunitTypography.fontFamilyBody,
                        '&.Mui-focused': { color: lunitColors.teal },
                      },
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    select
                    label="Which best describes you? (Optional)"
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: lunitRadius.md,
                        fontFamily: lunitTypography.fontFamilyBody,
                        '&:hover fieldset': { borderColor: lunitColors.grey },
                        '&.Mui-focused fieldset': { borderColor: lunitColors.teal },
                      },
                      '& .MuiInputLabel-root': {
                        fontFamily: lunitTypography.fontFamilyBody,
                        '&.Mui-focused': { color: lunitColors.teal },
                      },
                    }}
                  >
                    {roles.map((role) => (
                      <MenuItem key={role} value={role}>{role}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    label="Anything you would like to explore? (Optional)"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: lunitRadius.md,
                        fontFamily: lunitTypography.fontFamilyBody,
                        '&:hover fieldset': { borderColor: lunitColors.grey },
                        '&.Mui-focused fieldset': { borderColor: lunitColors.teal },
                      },
                      '& .MuiInputLabel-root': {
                        fontFamily: lunitTypography.fontFamilyBody,
                        '&.Mui-focused': { color: lunitColors.teal },
                      },
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    fullWidth
                    disabled={submitting}
                    sx={{
                      bgcolor: lunitColors.black,
                      color: lunitColors.white,
                      fontFamily: lunitTypography.fontFamilyBody,
                      fontWeight: 500,
                      textTransform: 'none',
                      borderRadius: lunitRadius.full,
                      py: 2,
                      '&:hover': {
                        bgcolor: lunitColors.teal,
                        color: lunitColors.black,
                      },
                    }}
                  >
                    {submitting ? 'Sending...' : 'Request a Research Demo'}
                  </Button>
                </Grid>
              </Grid>
            </Box>
          </Grid>
        </Grid>
      </PageSection>
    </PageLayout>
  );
};

export default DemoPage;
