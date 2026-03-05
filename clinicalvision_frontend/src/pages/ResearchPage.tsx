import React from 'react';
import { Box, Typography, Grid, Button, alpha } from '@mui/material';
import { Science, OpenInNew, CalendarMonth } from '@mui/icons-material';
import { PageLayout, PageHero, PageSection, CTASection } from '../components/layout/PageLayout';
import { lunitColors, lunitTypography, lunitRadius, lunitShadows } from '../styles/lunitDesignSystem';

const publications = [
  {
    title: 'Deep Learning for Mammographic Breast Cancer Detection: A Multi-Center Study',
    journal: 'Nature Medicine',
    year: '2024',
    authors: 'Chen S, Park M, Rodriguez E, et al.',
    abstract: 'We present a deep learning model achieving 97.5% sensitivity in breast cancer detection across 50,000 mammograms from 12 institutions...',
    doi: 'preprint-pending',
    doiStatus: 'pending' as const,
  },
  {
    title: 'Dual-View Fusion for Improved Cancer Localization in Mammography',
    journal: 'Radiology',
    year: '2023',
    authors: 'Park M, Kim D, Chen S, et al.',
    abstract: 'Our dual-view fusion architecture simultaneously analyzes CC and MLO views, improving localization accuracy by 23% compared to single-view methods...',
    doi: 'preprint-pending',
    doiStatus: 'pending' as const,
  },
  {
    title: 'Uncertainty Quantification in AI-Assisted Breast Cancer Screening',
    journal: 'Medical Image Analysis',
    year: '2023',
    authors: 'Rodriguez E, Chen S, Park M, et al.',
    abstract: 'We introduce Monte Carlo dropout-based uncertainty estimation, enabling clinicians to identify cases requiring additional review...',
    doi: 'preprint-pending',
    doiStatus: 'pending' as const,
  },
  {
    title: 'Clinical Validation of AI-Assisted Mammography Reading Workflow',
    journal: 'JAMA Network Open',
    year: '2023',
    authors: 'Mitchell J, Chen S, Rodriguez E, et al.',
    abstract: 'A prospective study of 10,000 screening mammograms demonstrating 35% reduction in reading time with maintained diagnostic accuracy...',
    doi: 'preprint-pending',
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
    description: 'Integrating imaging with clinical history and genomics',
  },
  {
    title: 'Equity & Bias',
    description: 'Ensuring consistent performance across diverse populations',
  },
];

const stats = [
  { value: '15+', label: 'Peer-Reviewed Papers' },
  { value: '4', label: 'Patents Filed' },
  { value: '50K+', label: 'Research Images' },
  { value: '12', label: 'Academic Partners' },
];

const ResearchPage: React.FC = () => {
  return (
    <PageLayout>
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
        subtitle="Our research team pushes the boundaries of medical AI, publishing peer-reviewed work and collaborating with leading institutions."
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
            Focus Areas
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
            Recent Publications
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
                  boxShadow: lunitShadows.card,
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
                {pub.doiStatus === 'pending' ? 'Preprint — DOI pending' : `DOI: ${pub.doi}`}
              </Button>
            </Box>
          ))}
        </Box>
      </PageSection>

      {/* CTA */}
      <CTASection
        title="Interested in Collaboration?"
        subtitle="We partner with academic institutions and healthcare organizations on research initiatives."
        buttonText="Contact Research Team"
        buttonPath="/contact"
        variant="dark"
      />
    </PageLayout>
  );
};

export default ResearchPage;
