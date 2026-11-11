import React from 'react';
import { Box, Typography, Grid, alpha } from '@mui/material';
import SEOHead from '../components/shared/SEOHead';
import { Speed, Security, Cloud, IntegrationInstructions } from '@mui/icons-material';
import { PageLayout, PageHero, PageSection, CTASection } from '../components/layout/PageLayout';
import { lunitColors, lunitTypography, lunitRadius, lunitShadows } from '../styles/lunitDesignSystem';

const apiFeatures = [
  {
    icon: <IntegrationInstructions sx={{ fontSize: 32 }} />,
    title: 'REST Backend',
    description: 'The demo frontend talks to a FastAPI backend over HTTP. These endpoints are listed for transparency.',
  },
  {
    icon: <Security sx={{ fontSize: 32 }} />,
    title: 'Authenticated Access',
    description: 'Endpoints require an authenticated user account. There are no public API keys.',
  },
  {
    icon: <Cloud sx={{ fontSize: 32 }} />,
    title: 'No Service Commitment',
    description: 'Research prototype on a single server. No uptime guarantee, no SLA and no support.',
  },
  {
    icon: <Speed sx={{ fontSize: 32 }} />,
    title: 'No SDKs',
    description: 'There are no official client libraries and no versioning or stability guarantees.',
  },
];

const endpoints = [
  { method: 'POST', path: '/inference/predict', description: 'Run the research model on one image' },
  { method: 'POST', path: '/inference/predict-batch', description: 'Run the research model on several images' },
  { method: 'POST', path: '/inference/gradcam', description: 'Generate a Grad-CAM heatmap' },
  { method: 'GET', path: '/inference/history/{image_id}', description: 'Retrieve past analyses for an image' },
  { method: 'GET', path: '/inference/health', description: 'Inference service health check' },
];

const ApiPage: React.FC = () => {
  return (
    <PageLayout>
      <SEOHead
        title="API — Research Prototype Endpoints"
        description="Overview of the backend endpoints used by the ClinicalVision research demo. No public API, SDKs or SLA. Not a medical device."
        keywords={['ClinicalVision API']}
        canonicalPath="/api"
      />
      {/* Hero */}
      <PageHero
        dark
        label="API"
        title={
          <>
            Inspect the{' '}
            <Box component="span" sx={{ color: lunitColors.teal }}>
              Research API
            </Box>
          </>
        }
        subtitle="ClinicalVision has no public API. This page lists the backend endpoints that power the research demo. Do not use them with real patient data."
      />

      {/* API Features */}
      <PageSection>
        <Grid container spacing={4}>
          {apiFeatures.map((feature, idx) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={idx}>
              <Box
                sx={{
                  p: 3,
                  height: '100%',
                  borderRadius: lunitRadius['2xl'],
                  border: `1px solid ${alpha(lunitColors.darkerGray, 0.08)}`,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: lunitShadows.cardHoverTeal,
                    borderColor: 'transparent',
                  },
                }}
              >
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: lunitRadius.lg,
                    bgcolor: alpha(lunitColors.teal, 0.1),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: lunitColors.teal,
                    mb: 2,
                  }}
                >
                  {feature.icon}
                </Box>
                <Typography
                  sx={{
                    fontFamily: lunitTypography.fontFamilyHeading,
                    fontSize: '18px',
                    fontWeight: 500,
                    color: lunitColors.headingColor,
                    mb: 1,
                  }}
                >
                  {feature.title}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: lunitTypography.fontFamilyBody,
                    fontSize: '14px',
                    fontWeight: 300,
                    color: lunitColors.text,
                    lineHeight: 1.6,
                  }}
                >
                  {feature.description}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </PageSection>

      {/* Endpoints */}
      <PageSection>
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography
            sx={{
              fontFamily: lunitTypography.fontFamilyBody,
              fontSize: '14px',
              fontWeight: 500,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: lunitColors.teal,
              mb: 2,
            }}
          >
            Reference
          </Typography>
          <Typography
            sx={{
              fontFamily: lunitTypography.fontFamilyHeading,
              fontSize: 'clamp(28px, 4vw, 40px)',
              fontWeight: 300,
              color: lunitColors.headingColor,
            }}
          >
            Demo Backend Endpoints
          </Typography>
        </Box>

        <Box sx={{ maxWidth: '800px', mx: 'auto' }}>
          {endpoints.map((endpoint, idx) => (
            <Box
              key={idx}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 3,
                p: 3,
                mb: 2,
                borderRadius: lunitRadius.lg,
                bgcolor: lunitColors.lightestGray,
                transition: 'all 0.3s ease',
                '&:hover': {
                  bgcolor: alpha(lunitColors.teal, 0.08),
                },
              }}
            >
              <Box
                sx={{
                  px: 2,
                  py: 0.5,
                  borderRadius: lunitRadius.md,
                  bgcolor: endpoint.method === 'POST' ? alpha(lunitColors.green, 0.2) : alpha(lunitColors.teal, 0.2),
                  color: endpoint.method === 'POST' ? lunitColors.green : lunitColors.teal,
                  fontFamily: '"Fira Code", monospace',
                  fontSize: '12px',
                  fontWeight: 600,
                  minWidth: '60px',
                  textAlign: 'center',
                }}
              >
                {endpoint.method}
              </Box>
              <Typography
                sx={{
                  fontFamily: '"Fira Code", monospace',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: lunitColors.headingColor,
                  flex: 1,
                }}
              >
                {endpoint.path}
              </Typography>
              <Typography
                sx={{
                  fontFamily: lunitTypography.fontFamilyBody,
                  fontSize: '13px',
                  fontWeight: 300,
                  color: lunitColors.darkGrey,
                  textAlign: 'right',
                }}
              >
                {endpoint.description}
              </Typography>
            </Box>
          ))}
        </Box>
      </PageSection>

      {/* CTA */}
      <CTASection
        title="Interested in the Research?"
        subtitle="Try the research demo or get in touch about the project."
        buttonText="Contact Us"
        buttonPath="/contact"
        variant="dark"
      />
    </PageLayout>
  );
};

export default ApiPage;
