import React from 'react';
import { Box, Typography, Grid, alpha, Tooltip } from '@mui/material';
import SEOHead from '../components/shared/SEOHead';
import {
  Verified,
  LocalHospital,
  Gavel,
  Public,
  Description,
  CheckCircle,
  Email,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { PageLayout, PageHero, PageSection, CTASection } from '../components/layout/PageLayout';
import { lunitColors, lunitTypography, lunitRadius, lunitShadows } from '../styles/lunitDesignSystem';
import { ROUTES } from '../routes/paths';

const regulations = [
  {
    icon: <LocalHospital sx={{ fontSize: 32 }} />,
    title: 'Medical Device Regulation',
    region: 'United Kingdom',
    description: 'ClinicalVision is a research prototype. It is not a medical device and has not been submitted to, cleared by or registered with the MHRA or any other regulator.',
    features: [
      'No MHRA registration or clearance',
      'No CE/UKCA marking',
      'No FDA clearance or approval',
      'No clinical investigation has been carried out',
      'Not for any decision affecting a real patient',
    ],
  },
  {
    icon: <Gavel sx={{ fontSize: 32 }} />,
    title: 'Data Protection',
    region: 'United Kingdom',
    description: 'The demo is intended for public, de-identified research images only. Real patient data must not be uploaded. See the Privacy Policy for how personal data such as account details is handled.',
    features: [
      'Use public, de-identified images only',
      'Do not upload real patient data',
      'See the Privacy Policy for details',
    ],
  },
  {
    icon: <Public sx={{ fontSize: 32 }} />,
    title: 'Evidence and Validation',
    region: 'Research Status',
    description: 'The model was evaluated on a held-out split of the public CBIS-DDSM dataset (701 test lesions, AUC 0.80). There has been no external, multi-site or prospective evaluation, and subgroup performance has not been measured.',
    features: [
      'Internal hold-out evaluation only',
      'No external or prospective validation',
      'Subgroup metrics not available',
      'No calibrator is shipped',
    ],
  },
];

const frameworks = [
  { name: 'ISO 13485', description: 'Medical device quality management', status: 'Not certified' },
  { name: 'IEC 62304', description: 'Medical device software lifecycle', status: 'Not certified' },
  { name: 'ISO 14971', description: 'Medical device risk management', status: 'Not certified' },
  { name: 'ISO 27001', description: 'Information security management', status: 'Not certified' },
];

const CompliancePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <PageLayout>
      <SEOHead
        title="Compliance — Research Prototype Status"
        description="Regulatory and compliance status of the ClinicalVision research prototype: not a medical device, no regulatory clearance, no certifications."
        keywords={['ClinicalVision compliance']}
        canonicalPath="/compliance"
      />
      {/* Hero */}
      <PageHero
        dark
        label="Compliance"
        title={
          <>
            Compliance{' '}
            <Box component="span" sx={{ color: lunitColors.teal }}>
              Status
            </Box>
          </>
        }
        subtitle="ClinicalVision is a research prototype. It is not a medical device and holds no regulatory clearance or certifications."
      />

      {/* Regulatory Compliance */}
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
            Regulations
          </Typography>
          <Typography
            sx={{
              fontFamily: lunitTypography.fontFamilyHeading,
              fontSize: 'clamp(28px, 4vw, 40px)',
              fontWeight: 300,
              color: lunitColors.headingColor,
            }}
          >
            Regulatory Status
          </Typography>
        </Box>

        <Grid container spacing={4}>
          {regulations.map((reg, idx) => (
            <Grid size={{ xs: 12, md: 6 }} key={idx}>
              <Box
                sx={{
                  p: 4,
                  height: '100%',
                  borderRadius: lunitRadius['2xl'],
                  border: `1px solid ${alpha(lunitColors.darkerGray, 0.08)}`,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: lunitShadows.cardHoverTeal,
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 3, mb: 3 }}>
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
                      flexShrink: 0,
                    }}
                  >
                    {reg.icon}
                  </Box>
                  <Box>
                    <Typography
                      sx={{
                        fontFamily: lunitTypography.fontFamilyHeading,
                        fontSize: '22px',
                        fontWeight: 500,
                        color: lunitColors.headingColor,
                        mb: 0.5,
                      }}
                    >
                      {reg.title}
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: lunitTypography.fontFamilyBody,
                        fontSize: '13px',
                        fontWeight: 500,
                        color: lunitColors.teal,
                      }}
                    >
                      {reg.region}
                    </Typography>
                  </Box>
                </Box>

                <Typography
                  sx={{
                    fontFamily: lunitTypography.fontFamilyBody,
                    fontSize: '14px',
                    fontWeight: 300,
                    color: lunitColors.text,
                    lineHeight: 1.7,
                    mb: 3,
                  }}
                >
                  {reg.description}
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {reg.features.map((feature, fIdx) => (
                    <Box key={fIdx} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <CheckCircle sx={{ color: lunitColors.teal, fontSize: 16 }} />
                      <Typography
                        sx={{
                          fontFamily: lunitTypography.fontFamilyBody,
                          fontSize: '13px',
                          fontWeight: 400,
                          color: lunitColors.darkerGray,
                        }}
                      >
                        {feature}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      </PageSection>

      {/* Frameworks */}
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
            Standards & Frameworks
          </Typography>
          <Typography
            sx={{
              fontFamily: lunitTypography.fontFamilyHeading,
              fontSize: 'clamp(28px, 4vw, 40px)',
              fontWeight: 300,
              color: lunitColors.headingColor,
            }}
          >
            Standards and Certifications
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {frameworks.map((fw, idx) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={idx}>
              <Box
                sx={{
                  p: 3,
                  height: '100%',
                  borderRadius: lunitRadius['2xl'],
                  bgcolor: lunitColors.white,
                  textAlign: 'center',
                }}
              >
                <Verified sx={{ fontSize: 40, color: lunitColors.teal, mb: 2 }} />
                <Typography
                  sx={{
                    fontFamily: lunitTypography.fontFamilyHeading,
                    fontSize: '18px',
                    fontWeight: 500,
                    color: lunitColors.headingColor,
                    mb: 1,
                  }}
                >
                  {fw.name}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: lunitTypography.fontFamilyBody,
                    fontSize: '13px',
                    fontWeight: 300,
                    color: lunitColors.text,
                    mb: 2,
                    lineHeight: 1.5,
                  }}
                >
                  {fw.description}
                </Typography>
                <Box
                  sx={{
                    display: 'inline-block',
                    px: 2,
                    py: 0.5,
                    borderRadius: lunitRadius.full,
                    bgcolor: alpha(lunitColors.teal, 0.1),
                    color: lunitColors.teal,
                    fontFamily: lunitTypography.fontFamilyBody,
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  {fw.status}
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      </PageSection>

      {/* CTA */}
      <CTASection
        title="Questions About the Research?"
        subtitle="Get in touch about the research prototype, its evaluation or its limitations."
        buttonText="Contact Us"
        buttonPath="/contact"
        variant="dark"
      />
    </PageLayout>
  );
};

export default CompliancePage;
