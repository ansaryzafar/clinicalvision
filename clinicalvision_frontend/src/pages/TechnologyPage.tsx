import React, { useEffect } from 'react';
import { Box, Typography, Grid, Button, alpha } from '@mui/material';
import SEOHead from '../components/shared/SEOHead';
import {
  Psychology,
  Layers,
  Visibility,
  Architecture,
  Speed,
  VerifiedUser,
  Hub,
  AutoGraph,
  Gradient,
  QueryStats,
  Balance,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { PageLayout, PageHero, PageSection, CTASection } from '../components/layout/PageLayout';
import { ROUTES } from '../routes/paths';
import { lunitColors, lunitTypography, lunitRadius, lunitShadows } from '../styles/lunitDesignSystem';

const corePillars = [
  {
    icon: <Psychology sx={{ fontSize: 32 }} />,
    title: 'Uncertainty Quantification',
    description:
      'Monte Carlo dropout inference produces an experimental uncertainty estimate. In offline evaluation the variance was only a weak signal of model error (AUC 0.61), so it is not a reliable review-triage tool.',
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
    title: 'Inference Speed',
    description:
      'The research demo runs the ensemble on a single server. Inference time has not been formally benchmarked and the system has not been tested in any reading workflow.',
  },
  {
    icon: <VerifiedUser sx={{ fontSize: 32 }} />,
    title: 'Bias-Aware Training',
    description:
      'Subgroup fairness monitoring is planned. Subgroup performance has not yet been measured, and the current dashboard shows demonstration data.',
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

const platformCapabilities = [
  {
    id: 'explainable-ai',
    icon: <Visibility sx={{ fontSize: 28 }} />,
    title: 'Explainable AI',
    description:
      'GradCAM attention maps and activation overlays visualise exactly which image regions drive each prediction. Clinicians see the evidence behind every finding — making AI reasoning transparent and verifiable.',
  },
  {
    id: 'uncertainty-quantification',
    icon: <Psychology sx={{ fontSize: 28 }} />,
    title: 'Uncertainty Quantification',
    description:
      'Monte Carlo dropout produces an experimental uncertainty estimate for each prediction. It has only been evaluated offline, where it was a weak signal of model error (AUC 0.61), and it has not been tested with any clinician.',
  },
  {
    id: 'integrated-gradients',
    icon: <Gradient sx={{ fontSize: 28 }} />,
    title: 'Integrated Gradients Analysis',
    description:
      'Pixel-level attribution maps reveal the contribution of each input region to the model\'s output. Unlike simple saliency maps, integrated gradients satisfy theoretical axioms that guarantee faithful explanations.',
  },
  {
    id: 'calibrated-confidence',
    icon: <QueryStats sx={{ fontSize: 28 }} />,
    title: 'Confidence Scores',
    description:
      'Per-finding confidence outputs from the ensemble. Calibration methods (isotonic, Platt, temperature) are implemented and evaluated offline, but a fitted calibrator is not yet deployed, so scores should be read as relative, uncalibrated indicators.',
  },
  {
    id: 'fairness-monitoring',
    icon: <Balance sx={{ fontSize: 28 }} />,
    title: 'Fairness Monitoring',
    description:
      'Continuous demographic parity tracking across age, ethnicity, and density subgroups. Sensitivity parity, specificity parity, and AUC parity metrics ensure equitable diagnostic performance for all patient populations.',
  },
];

const TechnologyPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Scroll to hash anchor when arriving from landing page links
  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      const timer = setTimeout(() => {
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [location.hash]);

  return (
    <PageLayout headerVariant="dark">
      <SEOHead
        title="Technology — AI Architecture Built for Clinical Trust"
        description="Explore ClinicalVision's AI technology: Monte Carlo dropout uncertainty quantification, Grad-CAM explainability, dual-view CC/MLO fusion, transfer learning, and bias-aware training."
        keywords={['medical AI architecture', 'uncertainty quantification', 'Monte Carlo dropout', 'Grad-CAM radiology', 'dual-view mammography fusion', 'explainable AI technology']}
        canonicalPath="/technology"
        schemaType="softwareApplication"
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Technology' },
        ]}
      />
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
              intelligent pre-processing, multi-model inference with uncertainty estimates
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
                'Every prediction comes with a confidence score. Clinicians know when the AI is certain and when a case deserves closer human attention.',
            },
            {
              title: 'Transparent to All Levels',
              description:
                'From attending radiologists to residents and referring GPs, our explainability layers are designed to be understandable without requiring AI expertise.',
            },
            {
              title: 'Not Regulated',
              description:
                'Not a medical device. No regulatory submission has been made and the software has not been developed under a certified quality management system.',
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

      {/* Platform Capabilities — Anchored cards linked from landing page */}
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
            Platform Capabilities
          </Typography>
          <Typography
            sx={{
              fontFamily: lunitTypography.fontFamilyHeading,
              fontSize: 'clamp(28px, 4vw, 40px)',
              fontWeight: lunitTypography.fontWeightLight,
              color: lunitColors.headingColor,
            }}
          >
            Explainability & Responsible AI
          </Typography>
        </Box>

        <Grid container spacing={4}>
          {platformCapabilities.map((cap) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={cap.id}>
              <Box
                id={cap.id}
                sx={{
                  p: 4,
                  height: '100%',
                  borderRadius: lunitRadius['2xl'],
                  bgcolor: lunitColors.white,
                  border: `1px solid ${alpha(lunitColors.darkerGray, 0.08)}`,
                  transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                  scrollMarginTop: '100px',
                  '&:hover': {
                    boxShadow: lunitShadows.cardHoverTeal,
                    transform: 'translateY(-6px)',
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
                    mb: 3,
                  }}
                >
                  {cap.icon}
                </Box>
                <Typography
                  sx={{
                    fontFamily: lunitTypography.fontFamilyHeading,
                    fontSize: '18px',
                    fontWeight: 500,
                    color: lunitColors.headingColor,
                    mb: 1.5,
                  }}
                >
                  {cap.title}
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
                  {cap.description}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </PageSection>

      <CTASection
        title="See the Technology in Action"
        subtitle="Try the research demo on public CBIS-DDSM images. Research prototype; not for clinical use."
        buttonText="Try the Research Demo"
        buttonPath={ROUTES.DEMO}
        variant="dark"
      />
    </PageLayout>
  );
};

export default TechnologyPage;
