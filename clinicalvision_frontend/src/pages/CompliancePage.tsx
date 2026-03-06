import React from 'react';
import { Box, Typography, Grid, alpha, Tooltip } from '@mui/material';
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
    title: 'HIPAA',
    region: 'United States',
    description: 'We maintain full compliance with the Health Insurance Portability and Accountability Act, including Business Associate Agreements (BAAs) with all covered entities.',
    features: [
      'Administrative safeguards',
      'Physical safeguards',
      'Technical safeguards',
      'Breach notification procedures',
      'Regular risk assessments',
    ],
  },
  {
    icon: <Gavel sx={{ fontSize: 32 }} />,
    title: 'FDA',
    region: 'United States',
    description: 'ClinicalVision has received FDA 510(k) clearance as a Class II medical device for computer-aided detection in mammography.',
    features: [
      '510(k) clearance (pending)',
      'Quality Management System',
      'Design controls',
      'Post-market surveillance',
      'Adverse event reporting',
    ],
  },
  {
    icon: <Public sx={{ fontSize: 32 }} />,
    title: 'GDPR',
    region: 'European Union',
    description: 'We comply with the General Data Protection Regulation for all EU data subjects, ensuring privacy rights are protected.',
    features: [
      'Lawful basis for processing',
      'Data subject rights',
      'Data Protection Impact Assessments',
      'Data Processing Agreements',
      'EU data residency options',
    ],
  },
  {
    icon: <Verified sx={{ fontSize: 32 }} />,
    title: 'CE Mark / MDR',
    region: 'European Union',
    description: 'Our software is CE marked under the Medical Device Regulation (MDR 2017/745), enabling distribution throughout the European Economic Area.',
    features: [
      'CE marking compliance',
      'Notified body certification',
      'Clinical evaluation',
      'Post-market clinical follow-up',
      'Unique Device Identification',
    ],
  },
];

const frameworks = [
  {
    name: 'SOC 2 Type II',
    description: 'Annual attestation of security, availability, and confidentiality controls',
    status: 'Certified',
  },
  {
    name: 'ISO 27001',
    description: 'Information security management system certification',
    status: 'Certified',
  },
  {
    name: 'ISO 13485',
    description: 'Medical device quality management system',
    status: 'Certified',
  },
  {
    name: 'HITRUST CSF',
    description: 'Healthcare information trust framework',
    status: 'In Progress',
  },
];

const documents = [
  {
    title: 'BAA Template',
    description: 'Business Associate Agreement for HIPAA covered entities',
    type: 'PDF',
  },
  {
    title: 'SOC 2 Report',
    description: 'Most recent SOC 2 Type II attestation report',
    type: 'PDF',
  },
  {
    title: 'Security Whitepaper',
    description: 'Comprehensive overview of our security architecture',
    type: 'PDF',
  },
  {
    title: 'DPA Template',
    description: 'Data Processing Agreement for GDPR compliance',
    type: 'PDF',
  },
  {
    title: 'FDA 510(k) Summary',
    description: 'FDA clearance documentation summary',
    type: 'PDF',
  },
  {
    title: 'CE Declaration',
    description: 'Declaration of Conformity for CE marking',
    type: 'PDF',
  },
];

const CompliancePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <PageLayout>
      {/* Hero */}
      <PageHero
        dark
        label="Compliance"
        title={
          <>
            Healthcare{' '}
            <Box component="span" sx={{ color: lunitColors.teal }}>
              Compliance
            </Box>
          </>
        }
        subtitle="ClinicalVision meets the highest standards of healthcare compliance worldwide, ensuring patient safety and data protection."
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
            Regulatory Compliance
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
            Certifications
          </Typography>
          <Typography
            sx={{
              fontFamily: lunitTypography.fontFamilyHeading,
              fontSize: 'clamp(28px, 4vw, 40px)',
              fontWeight: 300,
              color: lunitColors.headingColor,
            }}
          >
            Security Frameworks
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
                    bgcolor: alpha(fw.status === 'Certified' ? lunitColors.green : lunitColors.teal, 0.1),
                    color: fw.status === 'Certified' ? lunitColors.green : lunitColors.teal,
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

      {/* Documentation */}
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
            Resources
          </Typography>
          <Typography
            sx={{
              fontFamily: lunitTypography.fontFamilyHeading,
              fontSize: 'clamp(28px, 4vw, 40px)',
              fontWeight: 300,
              color: lunitColors.headingColor,
            }}
          >
            Compliance Documents
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {documents.map((doc, idx) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={idx}>
              <Tooltip title="Contact us to request this document" arrow>
              <Box
                onClick={() => navigate(ROUTES.CONTACT)}
                sx={{
                  p: 3,
                  borderRadius: lunitRadius.lg,
                  bgcolor: lunitColors.lightestGray,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    bgcolor: alpha(lunitColors.teal, 0.08),
                  },
                }}
              >
                <Description sx={{ fontSize: 32, color: lunitColors.teal }} />
                <Box sx={{ flex: 1 }}>
                  <Typography
                    sx={{
                      fontFamily: lunitTypography.fontFamilyHeading,
                      fontSize: '15px',
                      fontWeight: 500,
                      color: lunitColors.headingColor,
                      mb: 0.25,
                    }}
                  >
                    {doc.title}
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: lunitTypography.fontFamilyBody,
                      fontSize: '12px',
                      fontWeight: 300,
                      color: lunitColors.darkGrey,
                    }}
                  >
                    {doc.description}
                  </Typography>
                </Box>
                <Email sx={{ fontSize: 18, color: lunitColors.grey }} />
              </Box>
              </Tooltip>
            </Grid>
          ))}
        </Grid>
      </PageSection>

      {/* CTA */}
      <CTASection
        title="Need Compliance Documentation?"
        subtitle="Our compliance team can provide documentation for your vendor assessment and security review processes."
        buttonText="Request Documents"
        buttonPath="/contact"
        variant="dark"
      />
    </PageLayout>
  );
};

export default CompliancePage;
