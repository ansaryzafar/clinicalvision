import React, { useEffect } from 'react';
import { Box, Typography, Grid, Button, alpha } from '@mui/material';
import {
  Visibility,
  Psychology,
  Speed,
  VerifiedUser,
  Timeline,
  Hub,
  ArrowForward,
  ImageSearch,
  CompareArrows,
  TrendingUp,
  Description,
  PinDrop,
  ViewInAr,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { PageLayout, PageHero, PageSection, CTASection } from '../../components/layout/PageLayout';
import { ROUTES } from '../../routes/paths';
import { lunitColors, lunitTypography, lunitRadius, lunitShadows } from '../../styles/lunitDesignSystem';

const capabilities = [
  {
    icon: <Psychology sx={{ fontSize: 28 }} />,
    title: 'Uncertainty-Aware Detection',
    description:
      'Monte Carlo dropout inference provides calibrated confidence intervals on every finding, enabling clinicians to prioritise cases that need the most attention and identify ambiguous regions for closer review.',
  },
  {
    icon: <Visibility sx={{ fontSize: 28 }} />,
    title: 'Explainable Visual Overlays',
    description:
      'Gradient-weighted activation maps highlight exactly which regions of the mammogram contributed to each prediction — making AI reasoning transparent to radiologists at any experience level.',
  },
  {
    icon: <Hub sx={{ fontSize: 28 }} />,
    title: 'Dual-View Fusion Analysis',
    description:
      'Simultaneously analyses CC and MLO views, capturing cross-view correlations that single-view approaches miss. The fused representation improves localisation accuracy for subtle findings.',
  },
  {
    icon: <Speed sx={{ fontSize: 28 }} />,
    title: 'Sub-Second Inference',
    description:
      'Optimised model architecture delivers rapid analysis without adding clinical wait times, integrating seamlessly into existing mammography reading workflows.',
  },
  {
    icon: <Timeline sx={{ fontSize: 28 }} />,
    title: 'End-to-End Workflow',
    description:
      'From DICOM ingestion through pre-processing, inference, uncertainty scoring, and structured reporting — a single pipeline with complete audit trail and no manual handoffs.',
  },
  {
    icon: <VerifiedUser sx={{ fontSize: 28 }} />,
    title: 'Bias-Monitored Performance',
    description:
      'Continuous fairness monitoring across demographic subgroups ensures equitable performance. Built-in dashboards track model behaviour across patient populations.',
  },
];

const workflowSteps = [
  {
    step: '01',
    title: 'Image Ingestion',
    description: 'Standard DICOM mammography images are ingested from any PACS or imaging system.',
  },
  {
    step: '02',
    title: 'Intelligent Pre-Processing',
    description: 'Automated quality checks, normalisation, and view-specific preparation.',
  },
  {
    step: '03',
    title: 'Multi-Model Analysis',
    description: 'Dual-view fusion with uncertainty quantification and attention-based detection.',
  },
  {
    step: '04',
    title: 'Clinical Review',
    description: 'Interactive viewer with confidence overlays, uncertainty maps, and annotation tools.',
  },
  {
    step: '05',
    title: 'Structured Reporting',
    description: 'Automated BI-RADS-aligned reports with full model provenance and audit trail.',
  },
];

const analysisFeatures = [
  {
    id: 'single-view-classification',
    icon: <ImageSearch sx={{ fontSize: 28 }} />,
    title: 'Single-View Classification',
    description:
      'AI-powered analysis of individual mammogram views (CC or MLO). Our deep learning model identifies suspicious regions, classifies findings, and produces a structured risk assessment — all from a single uploaded image.',
  },
  {
    id: 'dual-view-fusion',
    icon: <ViewInAr sx={{ fontSize: 28 }} />,
    title: 'Dual-View Fusion Analysis',
    description:
      'Simultaneously analyses CC and MLO views of the same breast, fusing complementary information to improve detection accuracy. Cross-view correlations reveal findings that single-view approaches may miss.',
  },
  {
    id: 'bilateral-symmetry',
    icon: <CompareArrows sx={{ fontSize: 28 }} />,
    title: 'Bilateral Symmetry Analysis',
    description:
      'Compares left and right breast mammograms to detect asymmetries that may indicate pathology. Automated side-by-side analysis highlights density differences, architectural distortions, and focal asymmetries.',
  },
  {
    id: 'historical-trending',
    icon: <TrendingUp sx={{ fontSize: 28 }} />,
    title: 'Historical Trending',
    description:
      'Tracks changes across sequential mammography studies over time. Automatically identifies evolving findings, new calcifications, or density changes — supporting longitudinal monitoring and early detection.',
  },
  {
    id: 'clinical-narratives',
    icon: <Description sx={{ fontSize: 28 }} />,
    title: 'Clinical Narratives',
    description:
      'Generates structured, BI-RADS-aligned diagnostic reports from AI findings. Each narrative includes finding descriptions, location references, confidence levels, and recommended follow-up — ready for clinical review.',
  },
  {
    id: 'anatomical-mapping',
    icon: <PinDrop sx={{ fontSize: 28 }} />,
    title: 'Anatomical Mapping',
    description:
      'Precisely localises findings within standardised breast quadrant coordinates. Interactive overlays map detected lesions to anatomical regions, making it easy for clinicians to correlate AI findings with clinical context.',
  },
];

const BreastCancerSolutionPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Scroll to hash anchor when arriving from landing page links
  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      // Small delay to ensure the page has rendered
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
      <PageHero
        dark
        label="Breast Cancer Detection"
        title={
          <>
            AI-Powered Mammography
            <br />
            Analysis with{' '}
            <span style={{ color: lunitColors.teal }}>Clinical Confidence</span>
          </>
        }
        subtitle="Our breast cancer detection solution combines dual-view fusion, uncertainty quantification, and explainable AI to support radiologists with transparent, trustworthy diagnostic assistance."
      >
        <Box sx={{ display: 'flex', gap: 2, mt: 4, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            onClick={() => navigate(ROUTES.DEMO)}
            sx={{
              bgcolor: lunitColors.teal,
              color: lunitColors.black,
              fontFamily: lunitTypography.fontFamilyBody,
              fontWeight: 500,
              textTransform: 'none',
              borderRadius: '100px',
              px: 4,
              py: 1.5,
              '&:hover': {
                bgcolor: lunitColors.white,
                color: lunitColors.black,
              },
            }}
          >
            Request a Demo
          </Button>
          <Button
            variant="outlined"
            onClick={() => navigate(ROUTES.RESEARCH)}
            endIcon={<ArrowForward sx={{ fontSize: '16px !important' }} />}
            sx={{
              borderColor: alpha(lunitColors.white, 0.3),
              color: lunitColors.white,
              fontFamily: lunitTypography.fontFamilyBody,
              fontWeight: 500,
              textTransform: 'none',
              borderRadius: '100px',
              px: 4,
              py: 1.5,
              '&:hover': {
                borderColor: lunitColors.teal,
                color: lunitColors.teal,
              },
            }}
          >
            View Research
          </Button>
        </Box>
      </PageHero>

      {/* Key Capabilities */}
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
            Key Capabilities
          </Typography>
          <Typography
            sx={{
              fontFamily: lunitTypography.fontFamilyHeading,
              fontSize: 'clamp(28px, 4vw, 40px)',
              fontWeight: lunitTypography.fontWeightLight,
              color: lunitColors.headingColor,
            }}
          >
            Research-Backed, Clinically Validated
          </Typography>
        </Box>

        <Grid container spacing={4}>
          {capabilities.map((cap, idx) => (
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

      {/* Workflow */}
      <PageSection background="light">
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
            Clinical Workflow
          </Typography>
          <Typography
            sx={{
              fontFamily: lunitTypography.fontFamilyHeading,
              fontSize: 'clamp(28px, 4vw, 40px)',
              fontWeight: lunitTypography.fontWeightLight,
              color: lunitColors.headingColor,
            }}
          >
            From Image to Insight
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {workflowSteps.map((step, idx) => (
            <Box
              key={idx}
              sx={{
                p: 3,
                borderRadius: lunitRadius['2xl'],
                bgcolor: lunitColors.white,
                display: 'flex',
                alignItems: 'center',
                gap: 3,
                transition: 'all 0.3s ease',
                '&:hover': {
                  boxShadow: lunitShadows.cardHoverTeal,
                },
              }}
            >
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  bgcolor: alpha(lunitColors.teal, 0.1),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Typography
                  sx={{
                    fontFamily: lunitTypography.fontFamilyHeading,
                    fontSize: '18px',
                    fontWeight: 600,
                    color: lunitColors.teal,
                  }}
                >
                  {step.step}
                </Typography>
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
                  {step.title}
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
                  {step.description}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </PageSection>

      {/* Clinical Strengths */}
      <PageSection>
        <Grid container spacing={4}>
          {[
            {
              title: 'Transparent by Design',
              description:
                'Every prediction is accompanied by visual explanations and confidence scores — understandable by attending radiologists, residents, and referring clinicians alike.',
            },
            {
              title: 'Literature-Backed Methodology',
              description:
                'Our detection models are built on peer-reviewed architectures and validated through active clinical research partnerships with imaging centres.',
            },
            {
              title: 'Productivity Without Compromise',
              description:
                'Designed to save time on routine screening reads while ensuring that complex or ambiguous cases are flagged for expert review — augmenting, never replacing, clinical judgement.',
            },
            {
              title: 'Built for Regulatory Pathways',
              description:
                'Complete data provenance, model versioning, and audit trails from day one. Developed following IEC 62304, ISO 14971, and ISO 13485 to support future MHRA, EU MDR, and FDA submissions.',
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

      {/* Analysis Features — Anchored cards linked from landing page */}
      <PageSection background="light">
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
            Analysis Features
          </Typography>
          <Typography
            sx={{
              fontFamily: lunitTypography.fontFamilyHeading,
              fontSize: 'clamp(28px, 4vw, 40px)',
              fontWeight: lunitTypography.fontWeightLight,
              color: lunitColors.headingColor,
            }}
          >
            Comprehensive Mammogram Analysis Capabilities
          </Typography>
        </Box>

        <Grid container spacing={4}>
          {analysisFeatures.map((feature, idx) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={feature.id}>
              <Box
                id={feature.id}
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
                  {feature.icon}
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

      <CTASection
        title="Ready to See It in Action?"
        subtitle="Request a demonstration tailored to your imaging environment and clinical workflow."
        buttonText="Request a Demo"
        buttonPath={ROUTES.DEMO}
        variant="dark"
      />
    </PageLayout>
  );
};

export default BreastCancerSolutionPage;
