import React from 'react';
import { Box, Typography, Grid, Button, alpha } from '@mui/material';
import SEOHead from '../components/shared/SEOHead';
import { Science, OpenInNew, CalendarMonth } from '@mui/icons-material';
import { PageLayout, PageHero, PageSection, CTASection } from '../components/layout/PageLayout';
import { lunitColors, lunitTypography, lunitRadius, lunitShadows } from '../styles/lunitDesignSystem';

const publications = [
  {
    title: 'ClinicalVision V12 Research Baseline: DenseNet-121 Ensemble for Lesion-Level Classification on CBIS-DDSM',
    journal: 'Technical report (not peer-reviewed)',
    year: '2026',
    authors: 'ClinicalVision Research',
    abstract: 'A three-model DenseNet-121 ensemble evaluated on 701 held-out CBIS-DDSM lesion crops reaches an AUC of 0.799 (79.6% sensitivity and 64.3% specificity at threshold 0.5). Internal hold-out evaluation only; no external or prospective validation...',
    doi: 'not-published',
    doiStatus: 'pending' as const,
  },
  {
    title: 'Monte Carlo Dropout Uncertainty Estimation in the V12 Baseline',
    journal: 'Work in progress',
    year: '2026',
    authors: 'ClinicalVision Research',
    abstract: 'We evaluate 9-pass Monte Carlo dropout as a review-triage signal. At the deployed settings MC averaging leaves ensemble AUC unchanged (0.772) and variance is a weak error signal (AUC 0.61); at a higher dropout rate it lowered single-model AUC. Calibration (isotonic, offline) is not yet shipped...',
    doi: 'not-published',
    doiStatus: 'pending' as const,
  },
];

const researchAreas = [
  {
    title: 'Early Detection',
    description: 'Improving sensitivity for early-stage cancers and subtle findings',
  },
  {
    title: 'Explainable AI',
    description: 'Making AI decisions transparent and interpretable for clinicians',
  },
  {
    title: 'Multi-Modal Learning',
    description: 'Future interest: combining imaging with clinical history (not implemented)',
  },
  {
    title: 'Equity & Bias',
    description: 'Subgroup performance has not yet been measured',
  },
];

const stats = [
  { value: '1', label: 'Research Baseline Model' },
  { value: '3', label: 'Ensemble Members' },
  { value: '701', label: 'Held-out Test Images' },
  { value: '0.80', label: 'AUC (CBIS-DDSM)' },
];

const ResearchPage: React.FC = () => {
  return (
    <PageLayout>
      <SEOHead
        title="Research — Advancing AI Diagnostics"
        description="ClinicalVision research on explainable, uncertainty-aware breast cancer AI: the V12 research baseline, its evaluation on CBIS-DDSM, and its limitations."
        keywords={['medical AI research', 'breast cancer AI publications', 'deep learning radiology research', 'explainable AI research', 'mammography AI studies']}
        canonicalPath="/research"
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Research' },
        ]}
      />
      {/* Hero */}
      <PageHero
        dark
        label="Research"
        title={
          <>
            Advancing the Science of{' '}
            <Box component="span" sx={{ color: lunitColors.teal }}>
              AI Diagnostics
            </Box>
          </>
        }
        subtitle="Our research focuses on explainable, uncertainty-aware medical AI. We publish our results openly, including the limitations."
      />

      {/* Stats */}
      <PageSection background="light" paddingY="small">
        <Grid container spacing={4}>
          {stats.map((stat, idx) => (
            <Grid size={{ xs: 6, md: 3 }} key={idx}>
              <Box sx={{ textAlign: 'center' }}>
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
                    color: lunitColors.darkGrey,
                  }}
                >
                  {stat.label}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </PageSection>

      {/* Research Areas */}
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
            Areas of Interest
          </Typography>
          <Typography
            sx={{
              fontFamily: lunitTypography.fontFamilyHeading,
              fontSize: 'clamp(28px, 4vw, 40px)',
              fontWeight: 300,
              color: lunitColors.headingColor,
            }}
          >
            Our Research Priorities
          </Typography>
        </Box>

        <Grid container spacing={4}>
          {researchAreas.map((area, idx) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={idx}>
              <Box
                sx={{
                  p: 3,
                  height: '100%',
                  borderRadius: lunitRadius['2xl'],
                  bgcolor: lunitColors.lightestGray,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    bgcolor: alpha(lunitColors.teal, 0.08),
                  },
                }}
              >
                <Science sx={{ fontSize: 28, color: lunitColors.teal, mb: 2 }} />
                <Typography
                  sx={{
                    fontFamily: lunitTypography.fontFamilyHeading,
                    fontSize: '18px',
                    fontWeight: 500,
                    color: lunitColors.headingColor,
                    mb: 1,
                  }}
                >
                  {area.title}
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
                  {area.description}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </PageSection>

      {/* Publications */}
      <PageSection background="light">
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
            Publications
          </Typography>
          <Typography
            sx={{
              fontFamily: lunitTypography.fontFamilyHeading,
              fontSize: 'clamp(28px, 4vw, 40px)',
              fontWeight: 300,
              color: lunitColors.headingColor,
            }}
          >
            Recent Work
          </Typography>
        </Box>

        <Box sx={{ maxWidth: '900px', mx: 'auto' }}>
          {publications.map((pub, idx) => (
            <Box
              key={idx}
              sx={{
                p: 4,
                mb: 3,
                borderRadius: lunitRadius['2xl'],
                bgcolor: lunitColors.white,
                transition: 'all 0.3s ease',
                '&:hover': {
                  boxShadow: lunitShadows.cardHoverTeal,
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
                <Box
                  sx={{
                    px: 2,
                    py: 0.5,
                    borderRadius: lunitRadius.full,
                    bgcolor: alpha(lunitColors.teal, 0.1),
                    color: lunitColors.teal,
                    fontFamily: lunitTypography.fontFamilyBody,
                    fontSize: '12px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                  }}
                >
                  <CalendarMonth sx={{ fontSize: 14 }} />
                  {pub.year}
                </Box>
                <Typography
                  sx={{
                    fontFamily: lunitTypography.fontFamilyBody,
                    fontSize: '13px',
                    fontWeight: 500,
                    color: lunitColors.darkGrey,
                  }}
                >
                  {pub.journal}
                </Typography>
              </Box>

              <Typography
                sx={{
                  fontFamily: lunitTypography.fontFamilyHeading,
                  fontSize: '20px',
                  fontWeight: 500,
                  color: lunitColors.headingColor,
                  mb: 1,
                }}
              >
                {pub.title}
              </Typography>

              <Typography
                sx={{
                  fontFamily: lunitTypography.fontFamilyBody,
                  fontSize: '13px',
                  fontWeight: 400,
                  color: lunitColors.teal,
                  mb: 2,
                }}
              >
                {pub.authors}
              </Typography>

              <Typography
                sx={{
                  fontFamily: lunitTypography.fontFamilyBody,
                  fontSize: '14px',
                  fontWeight: 300,
                  color: lunitColors.text,
                  lineHeight: 1.7,
                  mb: 2,
                }}
              >
                {pub.abstract}
              </Typography>

              <Button
                size="small"
                endIcon={pub.doiStatus !== 'pending' ? <OpenInNew sx={{ fontSize: 14 }} /> : undefined}
                disabled={pub.doiStatus === 'pending'}
                onClick={pub.doiStatus !== 'pending' ? () => window.open(`https://doi.org/${pub.doi}`, '_blank', 'noopener,noreferrer') : undefined}
                sx={{
                  color: pub.doiStatus === 'pending' ? lunitColors.grey : lunitColors.darkerGray,
                  fontFamily: lunitTypography.fontFamilyBody,
                  fontSize: '13px',
                  textTransform: 'none',
                  '&:hover': {
                    color: lunitColors.teal,
                    bgcolor: 'transparent',
                  },
                }}
              >
                {pub.doiStatus === 'pending' ? 'Not yet published' : `DOI: ${pub.doi}`}
              </Button>
            </Box>
          ))}
        </Box>
      </PageSection>

      {/* CTA */}
      <CTASection
        title="Interested in Collaboration?"
        subtitle="We welcome collaboration with academic institutions and healthcare organizations on research and validation."
        buttonText="Contact Us"
        buttonPath="/contact"
        variant="dark"
      />
    </PageLayout>
  );
};

export default ResearchPage;
