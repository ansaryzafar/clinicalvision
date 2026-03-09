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
    icon: <Gavel sx={{ fontSize: 32 }} />,
    title: 'UK GDPR & DPA 2018',
    region: 'United Kingdom',
    description: 'ClinicalVision is fully compliant with the UK General Data Protection Regulation and Data Protection Act 2018, applying enhanced safeguards for special category health data under Article 9.',
    features: [
      'Lawful basis for processing established',
      'Data subject rights procedures in place',
      'Data Protection Impact Assessments conducted',
      'Data Processing Agreements available',
      'ICO complaint procedures documented',
    ],
  },
  {
    icon: <LocalHospital sx={{ fontSize: 32 }} />,
    title: 'MHRA — UK Medical Device Registration',
    region: 'United Kingdom',
    description: 'ClinicalVision is actively preparing for registration with the Medicines and Healthcare products Regulatory Agency (MHRA) as a Software as a Medical Device (SaMD) clinical decision support tool.',
    features: [
      'SaMD classification assessment completed',
      'Quality Management System (ISO 13485 aligned)',
      'Risk management process (ISO 14971 applied)',
      'Clinical evaluation programme underway',
      'Post-market surveillance plan drafted',
    ],
  },
  {
    icon: <Verified sx={{ fontSize: 32 }} />,
    title: 'IEC 62304 — Software Lifecycle',
    region: 'International',
    description: 'The Platform is developed following IEC 62304:2006+AMD1:2015, the international standard for medical device software lifecycle processes, ensuring traceability from requirements through to validation.',
    features: [
      'Software development lifecycle documented',
      'Design controls and change management',
      'Verification and validation procedures',
      'Software of Unknown Provenance (SOUP) management',
      'Full audit trails and version control',
    ],
  },
  {
    icon: <Public sx={{ fontSize: 32 }} />,
    title: 'Future Regulatory Roadmap',
    region: 'Global',
    description: 'Our compliance architecture is designed for regulatory portability. We are building towards EU MDR 2017/745 CE marking and FDA AI/ML-based SaMD guidance as part of our international expansion strategy.',
    features: [
      'EU MDR pathway assessment initiated',
      'FDA Pre-Submission planning',
      'Clinical evidence generation programme',
      'NIST AI Risk Management Framework alignment',
      'Jurisdictional compliance packs in development',
    ],
  },
];

const frameworks = [
  {
    name: 'ISO 13485',
    description: 'Quality management system aligned to medical device requirements',
    status: 'Aligned',
  },
  {
    name: 'ISO 14971',
    description: 'Risk management applied throughout the product lifecycle',
    status: 'Applied',
  },
  {
    name: 'IEC 62304',
    description: 'Medical device software lifecycle processes followed',
    status: 'Applied',
  },
  {
    name: 'ISO 27001',
    description: 'Information security management — certification planned',
    status: 'Planned',
  },
];

const documents = [
  {
    title: 'Data Processing Agreement',
    description: 'UK GDPR-compliant DPA for institutional data controllers',
    type: 'PDF',
  },
  {
    title: 'Security Whitepaper',
    description: 'Comprehensive overview of our security architecture and controls',
    type: 'PDF',
  },
  {
    title: 'Privacy Impact Assessment',
    description: 'Data Protection Impact Assessment for clinical imaging processing',
    type: 'PDF',
  },
  {
    title: 'Clinical Safety Case',
    description: 'DCB 0129 Clinical Risk Management report for health IT systems',
    type: 'PDF',
  },
  {
    title: 'AI Model Card',
    description: 'Model performance, training data provenance, and known limitations',
    type: 'PDF',
  },
  {
    title: 'Regulatory Roadmap',
    description: 'MHRA, EU MDR, and FDA pathway timeline and milestones',
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
                    bgcolor: alpha(fw.status === 'Applied' || fw.status === 'Aligned' ? lunitColors.green : lunitColors.teal, 0.1),
                    color: fw.status === 'Applied' || fw.status === 'Aligned' ? lunitColors.green : lunitColors.teal,
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
