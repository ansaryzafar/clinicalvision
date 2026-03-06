import React from 'react';
import { Box, Typography, Grid, Button, alpha } from '@mui/material';
import {
  NotificationsActive,
  Science,
  Speed,
  Visibility,
  Psychology,
  ArrowForward,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { PageLayout, PageHero, PageSection, CTASection } from '../../components/layout/PageLayout';
import { ROUTES } from '../../routes/paths';
import { lunitColors, lunitTypography, lunitRadius, lunitShadows } from '../../styles/lunitDesignSystem';

// Cancer type configuration — drives the entire page content
const cancerTypeConfig: Record<
  string,
  {
    label: string;
    heroTitle: string;
    heroSubtitle: string;
    description: string;
    icon: string;
  }
> = {
  'lung-cancer': {
    label: 'Lung Cancer Detection',
    heroTitle: 'AI-Assisted Lung Cancer Detection',
    heroSubtitle:
      'Extending our proven uncertainty quantification and explainable AI framework to lung imaging — bringing the same clinical transparency and confidence to thoracic radiology.',
    description:
      'Lung cancer remains the leading cause of cancer-related mortality worldwide. Our upcoming lung cancer detection module will apply dual-view fusion, attention-based explainability, and calibrated confidence scoring to CT and chest X-ray analysis.',
    icon: '🫁',
  },
  'prostate-cancer': {
    label: 'Prostate Cancer Detection',
    heroTitle: 'AI-Assisted Prostate Cancer Detection',
    heroSubtitle:
      'Bringing our research-backed AI methodology to prostate cancer histopathology — with the same commitment to uncertainty quantification and clinical explainability.',
    description:
      'Prostate cancer diagnosis benefits enormously from quantitative, reproducible analysis. Our upcoming module will apply deep learning with uncertainty estimation to histopathology grading, reducing inter-observer variability.',
    icon: '🔎',
  },
  'colorectal-cancer': {
    label: 'Colorectal Cancer Detection',
    heroTitle: 'AI-Assisted Colorectal Cancer Detection',
    heroSubtitle:
      'Expanding our clinical AI platform to colorectal pathology — with transparent predictions, calibrated confidence, and full explainability for every finding.',
    description:
      'Colorectal cancer screening and diagnosis involve complex tissue analysis where AI can improve consistency and throughput. Our upcoming module will leverage the same peer-reviewed methodologies proven in our breast cancer solution.',
    icon: '🧬',
  },
};

// Core technology strengths shared across all upcoming solutions
const sharedStrengths = [
  {
    icon: <Psychology sx={{ fontSize: 28 }} />,
    title: 'Uncertainty Quantification',
    description:
      'Every prediction will include calibrated confidence intervals — the same Monte Carlo dropout methodology validated in our breast cancer detection solution.',
  },
  {
    icon: <Visibility sx={{ fontSize: 28 }} />,
    title: 'Explainable AI',
    description:
      'Attention-based visual overlays will show exactly which image regions drive each prediction, accessible to clinicians at all experience levels.',
  },
  {
    icon: <Speed sx={{ fontSize: 28 }} />,
    title: 'Workflow Integration',
    description:
      'Designed for seamless integration into existing clinical workflows with the same end-to-end pipeline architecture — from image ingestion to structured reporting.',
  },
  {
    icon: <Science sx={{ fontSize: 28 }} />,
    title: 'Research-First Approach',
    description:
      'Development is grounded in peer-reviewed methodology and active clinical research partnerships, ensuring every module meets the highest scientific standards.',
  },
];

const ComingSoonSolutionPage: React.FC = () => {
  const { cancerType } = useParams<{ cancerType: string }>();
  const navigate = useNavigate();
  const config = cancerTypeConfig[cancerType || ''];

  // Fallback if unknown cancer type
  if (!config) {
    return (
      <PageLayout headerVariant="dark">
        <PageHero
          dark
          title="Solution Not Found"
          subtitle="The solution you're looking for doesn't exist yet."
        />
        <CTASection
          title="Explore Our Available Solutions"
          buttonText="View All Solutions"
          buttonPath={ROUTES.FEATURES}
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout headerVariant="dark">
      <PageHero
        dark
        label={config.label}
        title={
          <>
            {config.heroTitle.split(' ').slice(0, -1).join(' ')}{' '}
            <span style={{ color: lunitColors.teal }}>
              {config.heroTitle.split(' ').slice(-1)}
            </span>
          </>
        }
        subtitle={config.heroSubtitle}
      >
        <Box sx={{ mt: 4 }}>
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1.5,
              px: 3,
              py: 1.5,
              borderRadius: '100px',
              bgcolor: alpha(lunitColors.orange, 0.15),
              border: `1px solid ${alpha(lunitColors.orange, 0.3)}`,
            }}
          >
            <NotificationsActive sx={{ fontSize: 18, color: lunitColors.orange }} />
            <Typography
              sx={{
                fontFamily: lunitTypography.fontFamilyBody,
                fontSize: '14px',
                fontWeight: 500,
                color: lunitColors.orange,
              }}
            >
              In Active Development
            </Typography>
          </Box>
        </Box>
      </PageHero>

      {/* About This Solution */}
      <PageSection>
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
              About This Solution
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
              Extending Our Proven AI Framework
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
              {config.description}
            </Typography>
            <Button
              variant="contained"
              onClick={() => navigate(ROUTES.CONTACT)}
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
              Register Your Interest
            </Button>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Box
              sx={{
                p: 6,
                borderRadius: lunitRadius['2xl'],
                bgcolor: alpha(lunitColors.teal, 0.04),
                border: `1px solid ${alpha(lunitColors.teal, 0.1)}`,
                textAlign: 'center',
              }}
            >
              <Typography sx={{ fontSize: '72px', mb: 2 }}>{config.icon}</Typography>
              <Typography
                sx={{
                  fontFamily: lunitTypography.fontFamilyHeading,
                  fontSize: '24px',
                  fontWeight: 500,
                  color: lunitColors.headingColor,
                  mb: 1,
                }}
              >
                {config.label}
              </Typography>
              <Typography
                sx={{
                  fontFamily: lunitTypography.fontFamilyBody,
                  fontSize: '14px',
                  fontWeight: 300,
                  color: lunitColors.text,
                }}
              >
                Powered by the same AI architecture as our breast cancer detection platform
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </PageSection>

      {/* Shared Technology */}
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
            Technology Foundation
          </Typography>
          <Typography
            sx={{
              fontFamily: lunitTypography.fontFamilyHeading,
              fontSize: 'clamp(28px, 4vw, 40px)',
              fontWeight: lunitTypography.fontWeightLight,
              color: lunitColors.headingColor,
            }}
          >
            Built on Proven Methodology
          </Typography>
        </Box>

        <Grid container spacing={4}>
          {sharedStrengths.map((strength, idx) => (
            <Grid size={{ xs: 12, sm: 6 }} key={idx}>
              <Box
                sx={{
                  p: 4,
                  height: '100%',
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
                    {strength.icon}
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
                      {strength.title}
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
                      {strength.description}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      </PageSection>

      {/* Explore Live Solution */}
      <PageSection>
        <Box
          sx={{
            p: { xs: 4, md: 6 },
            borderRadius: lunitRadius['2xl'],
            bgcolor: alpha(lunitColors.teal, 0.04),
            border: `1px solid ${alpha(lunitColors.teal, 0.12)}`,
            textAlign: 'center',
          }}
        >
          <Typography
            sx={{
              fontFamily: lunitTypography.fontFamilyHeading,
              fontSize: 'clamp(24px, 3vw, 32px)',
              fontWeight: lunitTypography.fontWeightLight,
              color: lunitColors.headingColor,
              mb: 2,
            }}
          >
            Explore Our Live Solution
          </Typography>
          <Typography
            sx={{
              fontFamily: lunitTypography.fontFamilyBody,
              fontSize: '15px',
              fontWeight: 300,
              color: lunitColors.text,
              lineHeight: 1.7,
              maxWidth: 500,
              mx: 'auto',
              mb: 4,
            }}
          >
            Our breast cancer detection platform is available now — see the technology
            that powers all of our upcoming cancer detection solutions.
          </Typography>
          <Button
            variant="contained"
            onClick={() => navigate(ROUTES.SOLUTION_BREAST_CANCER)}
            endIcon={<ArrowForward />}
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
            Breast Cancer Detection
          </Button>
        </Box>
      </PageSection>

      <CTASection
        title="Stay Updated on Our Progress"
        subtitle="Contact us to register your interest and receive updates as this solution approaches launch."
        buttonText="Contact Us"
        buttonPath={ROUTES.CONTACT}
        variant="dark"
      />
    </PageLayout>
  );
};

export default ComingSoonSolutionPage;
