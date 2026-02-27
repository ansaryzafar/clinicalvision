import React from 'react';
import { Box, Typography, Grid, alpha, keyframes } from '@mui/material';
import {
  Memory,
  Speed,
  Psychology,
  Security,
  CloudSync,
  Analytics,
  LocalHospital,
  TrendingUp,
} from '@mui/icons-material';
import { PageLayout, PageSection, CTASection } from '../components/layout/PageLayout';
import { lunitColors, lunitTypography, lunitShadows, lunitRadius, lunitGradients } from '../styles/lunitDesignSystem';

// Subtle pulse animation for highlighted features
const subtlePulse = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(0, 201, 234, 0); }
  50% { box-shadow: 0 0 0 8px rgba(0, 201, 234, 0.1); }
`;

const features = [
  {
    icon: <Memory sx={{ fontSize: 40 }} />,
    title: 'Deep Learning Architecture',
    description: 'State-of-the-art convolutional neural networks trained on millions of mammography images for unparalleled accuracy.',
  },
  {
    icon: <Speed sx={{ fontSize: 40 }} />,
    title: 'Real-Time Analysis',
    description: 'Get instant results with sub-second inference times, seamlessly integrating into your clinical workflow.',
  },
  {
    icon: <Psychology sx={{ fontSize: 40 }} />,
    title: 'Explainable AI',
    description: 'Visual heatmaps and confidence scores provide transparency into AI decision-making for clinical validation.',
  },
  {
    icon: <Security sx={{ fontSize: 40 }} />,
    title: 'HIPAA Compliant',
    description: 'Enterprise-grade security with end-to-end encryption, audit logging, and full regulatory compliance.',
  },
  {
    icon: <LocalHospital sx={{ fontSize: 40 }} />,
    title: 'DICOM Integration',
    description: 'Native support for medical imaging standards with seamless PACS and EHR integration.',
  },
  {
    icon: <Analytics sx={{ fontSize: 40 }} />,
    title: 'Advanced Analytics',
    description: 'Comprehensive dashboards for tracking performance metrics, outcomes, and population health trends.',
  },
  {
    icon: <CloudSync sx={{ fontSize: 40 }} />,
    title: 'Cloud & On-Premise',
    description: 'Flexible deployment options to meet your infrastructure and data residency requirements.',
  },
  {
    icon: <TrendingUp sx={{ fontSize: 40 }} />,
    title: 'Continuous Learning',
    description: 'Models continuously improve through federated learning while maintaining strict data privacy.',
  },
];

const stats = [
  { value: '97.5%', label: 'Sensitivity' },
  { value: '94.2%', label: 'Specificity' },
  { value: '<1s', label: 'Analysis Time' },
  { value: '99.9%', label: 'Uptime SLA' },
];

const FeaturesPage: React.FC = () => {
  return (
    <PageLayout>
      {/* Enhanced Hero with dark theme */}
      <Box
        sx={{
          bgcolor: lunitColors.darkerGray,
          pt: { xs: 14, md: 18 },
          pb: { xs: 8, md: 12 },
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Multi-layer gradient overlays */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '60%',
            height: '100%',
            background: lunitGradients.heroDarkOverlay,
            pointerEvents: 'none',
          }}
        />

        <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 3, md: 6 }, position: 'relative', zIndex: 1 }}>
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
            Platform
          </Typography>
          <Typography
            sx={{
              fontFamily: lunitTypography.fontFamilyHeading,
              fontSize: 'clamp(40px, 7vw, 72px)',
              fontWeight: 300,
              color: lunitColors.white,
              lineHeight: 1.1,
              mb: 3,
            }}
          >
            AI-Powered Features for
            <Box component="span" sx={{ display: 'block', color: lunitColors.teal }}>
              Clinical Excellence
            </Box>
          </Typography>
          <Typography
            sx={{
              fontFamily: lunitTypography.fontFamilyBody,
              fontSize: 'clamp(16px, 2vw, 20px)',
              fontWeight: 300,
              color: alpha(lunitColors.white, 0.8),
              maxWidth: 600,
              lineHeight: 1.7,
            }}
          >
            Our comprehensive platform combines cutting-edge AI with clinical workflow integration to deliver actionable insights for better patient outcomes.
          </Typography>
        </Box>
      </Box>

      {/* Stats Section with separators */}
      <Box 
        sx={{ 
          bgcolor: lunitColors.lightestGray, 
          py: { xs: 5, md: 6 },
          position: 'relative',
        }}
      >
        <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 3, md: 6 } }}>
          <Grid container spacing={4}>
            {stats.map((stat, idx) => (
              <Grid size={{ xs: 6, md: 3 }} key={idx}>
                <Box 
                  sx={{ 
                    textAlign: 'center',
                    position: 'relative',
                    // Vertical separator line
                    '&::after': idx < stats.length - 1 ? {
                      content: '""',
                      position: 'absolute',
                      right: { xs: 0, md: -16 },
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '1px',
                      height: '60%',
                      bgcolor: alpha(lunitColors.darkerGray, 0.15),
                      display: { xs: 'none', md: 'block' },
                    } : {},
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: lunitTypography.fontFamilyHeading,
                      fontSize: 'clamp(36px, 5vw, 56px)',
                      fontWeight: 300,
                      color: lunitColors.teal,
                      lineHeight: 1,
                      mb: 1,
                    }}
                  >
                    {stat.value}
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: lunitTypography.fontFamilyBody,
                      fontSize: '14px',
                      fontWeight: 500,
                      color: lunitColors.darkerGray,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {stat.label}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Box>

      {/* Features Grid */}
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
            Capabilities
          </Typography>
          <Typography
            sx={{
              fontFamily: lunitTypography.fontFamilyHeading,
              fontSize: 'clamp(28px, 4vw, 40px)',
              fontWeight: 300,
              color: lunitColors.headingColor,
            }}
          >
            Everything You Need for AI-Assisted Diagnostics
          </Typography>
        </Box>

        <Grid container spacing={4}>
          {features.map((feature, idx) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={idx}>
              <Box
                sx={{
                  p: 4,
                  height: '100%',
                  borderRadius: lunitRadius['2xl'],
                  bgcolor: lunitColors.white,
                  border: `1px solid ${alpha(lunitColors.darkerGray, 0.08)}`,
                  transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  overflow: 'hidden',
                  // Highlight first two features
                  ...(idx < 2 && {
                    borderTop: `3px solid ${lunitColors.teal}`,
                  }),
                  '&:hover': {
                    boxShadow: lunitShadows.cardHover,
                    borderColor: 'transparent',
                    transform: 'translateY(-6px)',
                    '& .feature-icon': {
                      animation: `${subtlePulse} 2s ease-in-out infinite`,
                    },
                  },
                }}
              >
                <Box
                  className="feature-icon"
                  sx={{
                    width: 64,
                    height: 64,
                    borderRadius: lunitRadius.lg,
                    bgcolor: alpha(lunitColors.teal, 0.1),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: lunitColors.teal,
                    mb: 3,
                    transition: 'all 0.3s ease',
                  }}
                >
                  {feature.icon}
                </Box>
                <Typography
                  sx={{
                    fontFamily: lunitTypography.fontFamilyHeading,
                    fontSize: '20px',
                    fontWeight: 500,
                    color: lunitColors.headingColor,
                    mb: 1.5,
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
                    lineHeight: 1.7,
                  }}
                >
                  {feature.description}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </PageSection>

      {/* Integration Section */}
      <PageSection background="dark">
        <Grid container spacing={6} alignItems="center">
          <Grid size={{ xs: 12, md: 6 }}>
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
              Seamless Integration
            </Typography>
            <Typography
              sx={{
                fontFamily: lunitTypography.fontFamilyHeading,
                fontSize: 'clamp(28px, 4vw, 40px)',
                fontWeight: 300,
                color: lunitColors.white,
                mb: 3,
              }}
            >
              Works with Your Existing Infrastructure
            </Typography>
            <Typography
              sx={{
                fontFamily: lunitTypography.fontFamilyBody,
                fontSize: '16px',
                fontWeight: 300,
                color: lunitColors.grey,
                lineHeight: 1.8,
                mb: 4,
              }}
            >
              ClinicalVision integrates seamlessly with your PACS, RIS, and EHR systems through 
              standard protocols and APIs. Deploy on-premise or in the cloud with minimal 
              disruption to your existing workflows.
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              {['DICOM', 'HL7 FHIR', 'REST API', 'PACS', 'VNA'].map((tech) => (
                <Box
                  key={tech}
                  sx={{
                    px: 3,
                    py: 1,
                    borderRadius: lunitRadius.full,
                    border: `1px solid ${alpha(lunitColors.teal, 0.5)}`,
                    color: lunitColors.teal,
                    fontFamily: lunitTypography.fontFamilyBody,
                    fontSize: '14px',
                    fontWeight: 500,
                  }}
                >
                  {tech}
                </Box>
              ))}
            </Box>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Box
              sx={{
                bgcolor: alpha(lunitColors.white, 0.05),
                borderRadius: lunitRadius['2xl'],
                p: 4,
                border: `1px solid ${alpha(lunitColors.white, 0.1)}`,
              }}
            >
              <Box
                component="pre"
                sx={{
                  fontFamily: '"Fira Code", monospace',
                  fontSize: '13px',
                  color: lunitColors.grey,
                  overflow: 'auto',
                  m: 0,
                }}
              >
{`// Quick integration example
const analysis = await clinicalvision.analyze({
  study_uid: "1.2.840.113619.2.55...",
  modality: "MG",
  priority: "routine"
});

console.log(analysis.findings);
// → [{ type: "mass", probability: 0.92 }]`}
              </Box>
            </Box>
          </Grid>
        </Grid>
      </PageSection>

      {/* CTA */}
      <CTASection
        title="Ready to Transform Your Diagnostic Workflow?"
        subtitle="Schedule a personalized demo to see how ClinicalVision can enhance your practice."
        buttonText="Request a Demo"
        buttonPath="/demo"
      />
    </PageLayout>
  );
};

export default FeaturesPage;
