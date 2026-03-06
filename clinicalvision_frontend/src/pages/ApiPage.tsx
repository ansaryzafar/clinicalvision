import React from 'react';
import { Box, Typography, Grid, alpha } from '@mui/material';
import { Speed, Security, Cloud, IntegrationInstructions } from '@mui/icons-material';
import { PageLayout, PageHero, PageSection, CTASection } from '../components/layout/PageLayout';
import { lunitColors, lunitTypography, lunitRadius, lunitShadows } from '../styles/lunitDesignSystem';

const apiFeatures = [
  {
    icon: <Speed sx={{ fontSize: 32 }} />,
    title: 'High Performance',
    description: 'Process mammograms in under 3 seconds with our optimized inference pipeline.',
  },
  {
    icon: <Security sx={{ fontSize: 32 }} />,
    title: 'Secure by Design',
    description: 'OAuth 2.0, API keys, TLS encryption, and HIPAA-compliant data handling.',
  },
  {
    icon: <Cloud sx={{ fontSize: 32 }} />,
    title: '99.99% Uptime',
    description: 'Enterprise SLA with redundant infrastructure across multiple regions.',
  },
  {
    icon: <IntegrationInstructions sx={{ fontSize: 32 }} />,
    title: 'Easy Integration',
    description: 'RESTful API with SDKs for Python, JavaScript, and healthcare standards.',
  },
];

const endpoints = [
  {
    method: 'POST',
    path: '/v1/analyze',
    description: 'Submit a mammogram for AI analysis',
  },
  {
    method: 'GET',
    path: '/v1/analysis/{id}',
    description: 'Retrieve analysis results by ID',
  },
  {
    method: 'POST',
    path: '/v1/batch',
    description: 'Submit multiple images for batch processing',
  },
  {
    method: 'GET',
    path: '/v1/studies/{study_id}',
    description: 'Get all analyses for a study',
  },
  {
    method: 'POST',
    path: '/v1/dicom/upload',
    description: 'Upload DICOM files directly',
  },
  {
    method: 'GET',
    path: '/v1/health',
    description: 'Check API health and status',
  },
];

const codeExample = `import clinicalvision

# Initialize client
client = clinicalvision.Client(api_key="your_api_key")

# Analyze a mammogram
result = client.analyze(
    image_path="mammogram.dcm",
    view_type="MLO",  # or "CC"
    return_heatmap=True
)

# Access results
print(f"Risk Score: {result.risk_score}")
print(f"BI-RADS: {result.birads_category}")
print(f"Findings: {result.findings}")

# Get heatmap overlay
heatmap = result.get_heatmap()
heatmap.save("analysis_overlay.png")`;

const ApiPage: React.FC = () => {
  return (
    <PageLayout>
      {/* Hero */}
      <PageHero
        dark
        label="API"
        title={
          <>
            Build with{' '}
            <Box component="span" sx={{ color: lunitColors.teal }}>
              ClinicalVision API
            </Box>
          </>
        }
        subtitle="Integrate world-class AI diagnostics into your applications with our developer-friendly REST API."
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

      {/* Code Example */}
      <PageSection background="light">
        <Grid container spacing={6} alignItems="center">
          <Grid size={{ xs: 12, md: 5 }}>
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
              Quick Start
            </Typography>
            <Typography
              sx={{
                fontFamily: lunitTypography.fontFamilyHeading,
                fontSize: 'clamp(28px, 4vw, 40px)',
                fontWeight: 300,
                color: lunitColors.headingColor,
                mb: 3,
              }}
            >
              Analyze Images in Minutes
            </Typography>
            <Typography
              sx={{
                fontFamily: lunitTypography.fontFamilyBody,
                fontSize: '16px',
                fontWeight: 300,
                color: lunitColors.text,
                lineHeight: 1.8,
                mb: 3,
              }}
            >
              Our Python SDK makes it easy to integrate AI-powered mammogram analysis into your workflow. Install with pip and start analyzing images in just a few lines of code.
            </Typography>
            <Box
              component="code"
              sx={{
                display: 'inline-block',
                px: 2,
                py: 1,
                borderRadius: lunitRadius.md,
                bgcolor: lunitColors.darkerGray,
                color: lunitColors.teal,
                fontFamily: '"Fira Code", monospace',
                fontSize: '14px',
              }}
            >
              pip install clinicalvision
            </Box>
          </Grid>
          <Grid size={{ xs: 12, md: 7 }}>
            <Box
              sx={{
                p: 3,
                borderRadius: lunitRadius['2xl'],
                bgcolor: lunitColors.darkerGray,
                overflow: 'auto',
              }}
            >
              <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
                <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#ff5f56' }} />
                <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#ffbd2e' }} />
                <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#27ca40' }} />
              </Box>
              <Box
                component="pre"
                sx={{
                  fontFamily: '"Fira Code", "Consolas", monospace',
                  fontSize: '13px',
                  color: lunitColors.grey,
                  lineHeight: 1.6,
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {codeExample}
              </Box>
            </Box>
          </Grid>
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
            API Endpoints
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
        title="Ready to Get Started?"
        subtitle="Sign up for API access and start building with ClinicalVision today."
        buttonText="Get API Key"
        buttonPath="/contact"
        variant="dark"
      />
    </PageLayout>
  );
};

export default ApiPage;
