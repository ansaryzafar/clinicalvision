import React from 'react';
import { Box, Typography, Grid, Button, alpha } from '@mui/material';
import {
  Psychology,
  Layers,
  Visibility,
  Architecture,
  Speed,
  VerifiedUser,
  Hub,
  AutoGraph,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { PageLayout, PageHero, PageSection, CTASection } from '../components/layout/PageLayout';
import { ROUTES } from '../routes/paths';
import { lunitColors, lunitTypography, lunitRadius, lunitShadows } from '../styles/lunitDesignSystem';

const corePillars = [
  {
    icon: <Psychology sx={{ fontSize: 32 }} />,
    title: 'Uncertainty Quantification',
    description:
      'Monte Carlo dropout inference produces calibrated confidence intervals on every prediction, letting clinicians distinguish high-confidence findings from cases that warrant additional review.',
  },
  {
    icon: <Visibility sx={{ fontSize: 32 }} />,
    title: 'Explainable AI',
    description:
      'Gradient-weighted activation maps and attention overlays show exactly which regions of an image drive each prediction — making AI reasoning transparent to radiologists, pathologists, and referring physicians alike.',
  },
  {
    icon: <Layers sx={{ fontSize: 32 }} />,
    title: 'Dual-View Fusion',
    description:
      'Our architecture simultaneously processes complementary imaging views (e.g., CC and MLO mammograms), capturing cross-view correlations that single-view models miss.',
  },
  {
    icon: <Architecture sx={{ fontSize: 32 }} />,
    title: 'Transfer Learning at Scale',
    description:
      'Models pre-trained on large-scale medical imaging datasets are fine-tuned for each clinical task, reducing data requirements while maximising diagnostic accuracy.',
  },
  {
    icon: <Speed sx={{ fontSize: 32 }} />,
    title: 'Real-Time Inference',
    description:
      'Optimised model architectures deliver sub-second inference on standard clinical hardware, integrating seamlessly into existing reading workflows without adding wait times.',
  },
  {
    icon: <VerifiedUser sx={{ fontSize: 32 }} />,
    title: 'Bias-Aware Training',
    description:
      'Fairness monitoring across demographic subgroups is embedded in the training pipeline, with continuous post-deployment audits ensuring equitable performance.',
  },
];

const architectureHighlights = [
  {
    icon: <Hub sx={{ fontSize: 28 }} />,
    title: 'End-to-End Pipeline',
    description:
      'From DICOM ingestion through pre-processing, inference, uncertainty estimation, and structured reporting — a single seamless workflow with no manual handoffs.',
  },
  {
    icon: <AutoGraph sx={{ fontSize: 28 }} />,
    title: 'Continuous Learning',
    description:
      'Feedback loops allow clinician-verified outcomes to refine model performance over time, creating a system that improves with every case reviewed.',
  },
];

const TechnologyPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <PageLayout headerVariant="dark">
      <PageHero
        dark
        label="Technology"
        title={
          <>
            AI Architecture Built
            <br />
            for <span style={{ color: lunitColors.teal }}>Clinical Trust</span>
          </>
        }
        subtitle="Research-grade deep learning meets clinical-grade reliability. Every layer of our technology is designed for transparency, accuracy, and real-world clinical integration."
      />

      {/* Core Technology Pillars */}
      <PageSection>
        <Box sx={{ textAlign: 'center', mb: 8 }}>
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
            Core Capabilities
          </Typography>
          <Typography
            sx={{
              fontFamily: lunitTypography.fontFamilyHeading,
              fontSize: 'clamp(28px, 4vw, 40px)',
              fontWeight: lunitTypography.fontWeightLight,
              color: lunitColors.headingColor,
            }}
          >
            Built on Peer-Reviewed Science
          </Typography>
        </Box>

        <Grid container spacing={4}>
          {corePillars.map((pillar, idx) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={idx}>
              <Box
                sx={{
                  p: 4,
                  height: '100%',
                  borderRadius: lunitRadius['2xl'],
                  bgcolor: lunitColors.white,
                  border: `1px solid ${alpha(lunitColors.darkerGray, 0.08)}`,
                  transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    boxShadow: lunitShadows.cardHoverTeal,
                    transform: 'translateY(-6px)',
                  },
                }}
              >
                <Box
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
                  }}
                >
                  {pillar.icon}
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
                  {pillar.title}
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
                  {pillar.description}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </PageSection>

      {/* Architecture Section */}
      <PageSection background="light">
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
              Architecture
            </Typography>
            <Typography
              sx={{
                fontFamily: lunitTypography.fontFamilyHeading,
                fontSize: 'clamp(28px, 4vw, 36px)',
                fontWeight: lunitTypography.fontWeightLight,
                color: lunitColors.headingColor,
                mb: 3,
              }}
            >
              From Image to Insight — One Seamless Workflow
            </Typography>
            <Typography
              sx={{
                fontFamily: lunitTypography.fontFamilyBody,
                fontSize: '15px',
                fontWeight: 300,
                color: lunitColors.text,
                lineHeight: 1.8,
                mb: 4,
              }}
            >
              Our platform handles the entire clinical imaging workflow: DICOM ingestion,
              intelligent pre-processing, multi-model inference with calibrated uncertainty
              scores, attention-based explainability overlays, and structured reporting —
              all within a single, auditable pipeline.
            </Typography>
            <Button
              variant="contained"
              onClick={() => navigate(ROUTES.RESEARCH)}
              sx={{
                bgcolor: lunitColors.black,
                color: lunitColors.white,
                fontFamily: lunitTypography.fontFamilyBody,
                fontWeight: 500,
                textTransform: 'none',
                borderRadius: '100px',
                px: 4,
                py: 1.5,
                '&:hover': {
                  bgcolor: lunitColors.teal,
                  color: lunitColors.black,
                },
              }}
            >
              View Research & Publications
            </Button>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {architectureHighlights.map((item, idx) => (
                <Box
                  key={idx}
                  sx={{
                    p: 3,
                    borderRadius: lunitRadius['2xl'],
                    bgcolor: lunitColors.white,
                    border: `1px solid ${alpha(lunitColors.darkerGray, 0.06)}`,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      boxShadow: lunitShadows.cardHoverTeal,
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: lunitRadius.md,
                        bgcolor: alpha(lunitColors.teal, 0.08),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: lunitColors.teal,
                        flexShrink: 0,
                      }}
                    >
                      {item.icon}
                    </Box>
                    <Box>
                      <Typography
                        sx={{
                          fontFamily: lunitTypography.fontFamilyHeading,
                          fontSize: '18px',
                          fontWeight: 500,
                          color: lunitColors.headingColor,
                          mb: 0.5,
                        }}
                      >
                        {item.title}
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
                        {item.description}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              ))}
            </Box>
          </Grid>
        </Grid>
      </PageSection>

      {/* Clinical Differentiators */}
      <PageSection>
        <Box sx={{ textAlign: 'center', mb: 8 }}>
          <Typography
            sx={{
              fontFamily: lunitTypography.fontFamilyHeading,
              fontSize: 'clamp(28px, 4vw, 40px)',
              fontWeight: lunitTypography.fontWeightLight,
              color: lunitColors.headingColor,
            }}
          >
            Why Clinicians Trust Our Technology
          </Typography>
        </Box>

        <Grid container spacing={4}>
          {[
            {
              title: 'Published & Peer-Reviewed',
              description:
                'Our models are validated through rigorous peer-reviewed research and published in leading medical imaging journals — not just internal benchmarks.',
            },
            {
              title: 'Confidence You Can Act On',
              description:
                'Every prediction comes with a calibrated confidence score. Clinicians know when the AI is certain and when a case deserves closer human attention.',
            },
            {
              title: 'Transparent to All Levels',
              description:
                'From attending radiologists to residents and referring GPs, our explainability layers are designed to be understandable without requiring AI expertise.',
            },
            {
              title: 'Regulatory-Ready',
              description:
                'Built with FDA and CE-mark pathways in mind from day one. Full audit trails, data provenance, and model versioning are integral to the platform.',
            },
          ].map((item, idx) => (
            <Grid size={{ xs: 12, sm: 6 }} key={idx}>
              <Box
                sx={{
                  p: 4,
                  height: '100%',
                  borderRadius: lunitRadius['2xl'],
                  bgcolor: lunitColors.lightestGray,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    bgcolor: lunitColors.white,
                    boxShadow: lunitShadows.cardHoverTeal,
                  },
                }}
              >
                <Typography
                  sx={{
                    fontFamily: lunitTypography.fontFamilyHeading,
                    fontSize: '20px',
                    fontWeight: 500,
                    color: lunitColors.headingColor,
                    mb: 1.5,
                  }}
                >
                  {item.title}
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
                  {item.description}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </PageSection>

      <CTASection
        title="See the Technology in Action"
        subtitle="Request a live demonstration tailored to your clinical environment."
        buttonText="Request a Demo"
        buttonPath={ROUTES.DEMO}
        variant="dark"
      />
    </PageLayout>
  );
};

export default TechnologyPage;
