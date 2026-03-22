import React from 'react';
import { Box, Typography, Grid, Button, alpha } from '@mui/material';
import SEOHead from '../components/shared/SEOHead';
import {
  Handshake,
  LocalHospital,
  Biotech,
  IntegrationInstructions,
  School,
  Business,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { PageLayout, PageHero, PageSection, CTASection } from '../components/layout/PageLayout';
import { ROUTES } from '../routes/paths';
import { lunitColors, lunitTypography, lunitRadius, lunitShadows } from '../styles/lunitDesignSystem';

const partnerTypes = [
  {
    icon: <LocalHospital sx={{ fontSize: 32 }} />,
    title: 'Healthcare Institutions',
    description:
      'Hospitals, imaging centres, and health systems seeking to integrate AI-assisted diagnostics into their clinical workflows. We provide deployment support, training, and ongoing clinical validation partnerships.',
  },
  {
    icon: <Biotech sx={{ fontSize: 32 }} />,
    title: 'Research Collaborators',
    description:
      'Academic medical centres and research labs advancing cancer detection methodology. Collaborate on multi-site validation studies, contribute to open datasets, and co-author peer-reviewed publications.',
  },
  {
    icon: <IntegrationInstructions sx={{ fontSize: 32 }} />,
    title: 'Technology Integrators',
    description:
      'PACS vendors, EHR platforms, and imaging infrastructure providers looking to embed AI-powered analysis directly into existing clinical systems via our open API.',
  },
  {
    icon: <School sx={{ fontSize: 32 }} />,
    title: 'Training & Education',
    description:
      'Medical schools, residency programmes, and continuing education providers who want to give the next generation of clinicians hands-on experience with AI-assisted diagnostic tools.',
  },
  {
    icon: <Business sx={{ fontSize: 32 }} />,
    title: 'Distribution Partners',
    description:
      'Regional distributors and value-added resellers with established relationships in healthcare markets, helping bring ClinicalVision to institutions that need it most.',
  },
  {
    icon: <Handshake sx={{ fontSize: 32 }} />,
    title: 'Strategic Alliances',
    description:
      'Organisations aligned with our mission of democratising access to high-quality cancer screening through transparent, explainable AI technology.',
  },
];

const partnerBenefits = [
  'Access to our clinical validation datasets and research pipeline',
  'Priority API access and dedicated integration engineering support',
  'Co-branding opportunities and joint case study publication',
  'Early access to new cancer detection modules as they launch',
  'Dedicated partner success manager and technical liaison',
  'Participation in our clinical advisory board and product roadmap',
];

const PartnersPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <PageLayout headerVariant="dark">
      <SEOHead
        title="Partners — Advancing Cancer Detection Together"
        description="Partner with ClinicalVision. We collaborate with healthcare institutions, research labs, PACS/EHR integrators, and distribution partners to advance AI-powered cancer detection."
        keywords={['ClinicalVision partners', 'medical AI partnerships', 'healthcare AI collaboration', 'PACS integration partners', 'radiology AI ecosystem']}
        canonicalPath="/partners"
      />
      <PageHero
        dark
        label="Partners"
        title={
          <>
            Advancing Cancer Detection
            <br />
            <span style={{ color: lunitColors.teal }}>Together</span>
          </>
        }
        subtitle="We believe the best clinical AI is built through collaboration. Join our growing ecosystem of healthcare institutions, researchers, and technology partners."
      />

      {/* Partner Types */}
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
            Partnership Opportunities
          </Typography>
          <Typography
            sx={{
              fontFamily: lunitTypography.fontFamilyHeading,
              fontSize: 'clamp(28px, 4vw, 40px)',
              fontWeight: lunitTypography.fontWeightLight,
              color: lunitColors.headingColor,
            }}
          >
            How We Work with Partners
          </Typography>
        </Box>

        <Grid container spacing={4}>
          {partnerTypes.map((partner, idx) => (
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
                  {partner.icon}
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
                  {partner.title}
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
                  {partner.description}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </PageSection>

      {/* Partner Benefits */}
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
              Partner Benefits
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
              What You Get as a Partner
            </Typography>
            <Typography
              sx={{
                fontFamily: lunitTypography.fontFamilyBody,
                fontSize: '15px',
                fontWeight: 300,
                color: lunitColors.text,
                lineHeight: 1.8,
              }}
            >
              Our partner programme is designed around mutual value creation. Whether you're
              contributing clinical expertise, research data, or distribution reach — we
              ensure every partnership accelerates the shared goal of better patient outcomes.
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, md: 7 }}>
            <Grid container spacing={2}>
              {partnerBenefits.map((benefit, idx) => (
                <Grid size={{ xs: 12, sm: 6 }} key={idx}>
                  <Box
                    sx={{
                      p: 2.5,
                      borderRadius: lunitRadius.xl,
                      bgcolor: lunitColors.white,
                      border: `1px solid ${alpha(lunitColors.darkerGray, 0.06)}`,
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 1.5,
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        boxShadow: lunitShadows.cardHoverTeal,
                      },
                    }}
                  >
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: lunitColors.teal,
                        flexShrink: 0,
                        mt: 0.8,
                      }}
                    />
                    <Typography
                      sx={{
                        fontFamily: lunitTypography.fontFamilyBody,
                        fontSize: '14px',
                        fontWeight: 400,
                        color: lunitColors.text,
                        lineHeight: 1.6,
                      }}
                    >
                      {benefit}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Grid>
        </Grid>
      </PageSection>

      <CTASection
        title="Interested in Partnering?"
        subtitle="Get in touch with our partnerships team to explore how we can work together."
        buttonText="Contact Us"
        buttonPath={ROUTES.CONTACT}
        variant="dark"
      />
    </PageLayout>
  );
};

export default PartnersPage;
