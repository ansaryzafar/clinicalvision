import React from 'react';
import { Box, Typography, Grid, alpha } from '@mui/material';
import SEOHead from '../components/shared/SEOHead';
import {
  Lock,
  Shield,
  Verified,
  Storage,
  VpnKey,
  Policy,
  BugReport,
} from '@mui/icons-material';
import { PageLayout, PageHero, PageSection, CTASection } from '../components/layout/PageLayout';
import { lunitColors, lunitTypography, lunitRadius, lunitShadows } from '../styles/lunitDesignSystem';

const securityFeatures = [
  {
    icon: <Lock sx={{ fontSize: 32 }} />,
    title: 'Encryption in Transit',
    description: 'The website and API are served over HTTPS (TLS 1.2 and 1.3).',
  },
  {
    icon: <VpnKey sx={{ fontSize: 32 }} />,
    title: 'Account Authentication',
    description: 'User accounts are protected by password authentication with hashed passwords and token-based sessions.',
  },
  {
    icon: <Shield sx={{ fontSize: 32 }} />,
    title: 'Role-Based Access',
    description: 'User accounts carry roles that restrict access to application features.',
  },
  {
    icon: <Policy sx={{ fontSize: 32 }} />,
    title: 'Audit Records',
    description: 'The application records audit log entries for selected actions.',
  },
  {
    icon: <Storage sx={{ fontSize: 32 }} />,
    title: 'Research Hosting',
    description: 'The demo runs on a single cloud virtual machine. It has no redundancy, no uptime commitment and no multi-region deployment.',
  },
  {
    icon: <BugReport sx={{ fontSize: 32 }} />,
    title: 'No Independent Audit',
    description: 'The system has not had an independent penetration test or security audit, and there is no bug bounty programme.',
  },
];

const certifications = [
  {
    name: 'No Certifications',
    description: 'ClinicalVision holds no security or quality certifications (for example ISO 27001 or SOC 2).',
    icon: '📄',
  },
  {
    name: 'No Regulatory Clearance',
    description: 'Not a medical device. No MHRA, CE/UKCA or FDA registration or clearance.',
    icon: '🏥',
  },
  {
    name: 'Not for Real Patient Data',
    description: 'Do not upload real patient data. The demo is for public, de-identified research images only.',
    icon: '🔒',
  },
];

const practices = [
  {
    title: 'What Exists',
    items: [
      'HTTPS for the website and API',
      'Password hashing and token-based sessions',
      'Role-based access in the application',
      'Audit log records for selected actions',
    ],
  },
  {
    title: 'What Does Not Exist',
    items: [
      'Independent penetration testing or security audit',
      'Security certifications or attestations',
      '24/7 monitoring or an incident-response service',
      'Uptime, support or breach-notification commitments',
    ],
  },
  {
    title: 'Responsible Use',
    items: [
      'Use only public, de-identified research images',
      'Do not upload real patient data',
      'Treat all outputs as research results only',
      'Report security concerns through the contact page',
    ],
  },
];

const SecurityPage: React.FC = () => {
  return (
    <PageLayout>
      <SEOHead
        title="Security — Research Prototype"
        description="Security status of the ClinicalVision research prototype: HTTPS, account authentication and role-based access. No certifications or independent audit. Not a medical device."
        keywords={['ClinicalVision security']}
        canonicalPath="/security"
      />
      {/* Hero */}
      <PageHero
        dark
        label="Security"
        title={
          <>
            Security{' '}
            <Box component="span" sx={{ color: lunitColors.teal }}>
              Status
            </Box>
          </>
        }
        subtitle="An honest summary of what protections exist in this research prototype and what does not. Do not upload real patient data."
      />

      {/* Security Features */}
      <PageSection>
        <Grid container spacing={4}>
          {securityFeatures.map((feature, idx) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={idx}>
              <Box
                sx={{
                  p: 3,
                  height: '100%',
                  borderRadius: lunitRadius['2xl'],
                  border: `1px solid ${alpha(lunitColors.darkerGray, 0.08)}`,
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
                    borderRadius: lunitRadius.lg,
                    bgcolor: alpha(lunitColors.teal, 0.1),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: lunitColors.teal,
                    mb: 2,
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
                    mb: 1,
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
                    lineHeight: 1.6,
                  }}
                >
                  {feature.description}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </PageSection>

      {/* Certifications */}
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
            Compliance
          </Typography>
          <Typography
            sx={{
              fontFamily: lunitTypography.fontFamilyHeading,
              fontSize: 'clamp(28px, 4vw, 40px)',
              fontWeight: 300,
              color: lunitColors.headingColor,
            }}
          >
            Certifications & Clearance
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {certifications.map((cert, idx) => (
            <Grid size={{ xs: 12, sm: 4 }} key={idx}>
              <Box
                sx={{
                  p: 3,
                  textAlign: 'center',
                  borderRadius: lunitRadius['2xl'],
                  bgcolor: lunitColors.white,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: lunitShadows.cardHoverTeal,
                  },
                }}
              >
                <Typography sx={{ fontSize: '32px', mb: 1 }}>{cert.icon}</Typography>
                <Typography
                  sx={{
                    fontFamily: lunitTypography.fontFamilyHeading,
                    fontSize: '16px',
                    fontWeight: 500,
                    color: lunitColors.headingColor,
                    mb: 0.5,
                  }}
                >
                  {cert.name}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: lunitTypography.fontFamilyBody,
                    fontSize: '11px',
                    fontWeight: 300,
                    color: lunitColors.darkGrey,
                    lineHeight: 1.4,
                  }}
                >
                  {cert.description}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </PageSection>

      {/* Security Practices */}
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
            Best Practices
          </Typography>
          <Typography
            sx={{
              fontFamily: lunitTypography.fontFamilyHeading,
              fontSize: 'clamp(28px, 4vw, 40px)',
              fontWeight: 300,
              color: lunitColors.headingColor,
            }}
          >
            Current Security Status
          </Typography>
        </Box>

        <Grid container spacing={4}>
          {practices.map((practice, idx) => (
            <Grid size={{ xs: 12, md: 4 }} key={idx}>
              <Box
                sx={{
                  p: 4,
                  height: '100%',
                  borderRadius: lunitRadius['2xl'],
                  bgcolor: lunitColors.lightestGray,
                }}
              >
                <Typography
                  sx={{
                    fontFamily: lunitTypography.fontFamilyHeading,
                    fontSize: '20px',
                    fontWeight: 500,
                    color: lunitColors.headingColor,
                    mb: 3,
                  }}
                >
                  {practice.title}
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {practice.items.map((item, itemIdx) => (
                    <Box key={itemIdx} sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                      <Verified sx={{ color: lunitColors.teal, fontSize: 18, mt: 0.25 }} />
                      <Typography
                        sx={{
                          fontFamily: lunitTypography.fontFamilyBody,
                          fontSize: '14px',
                          fontWeight: 300,
                          color: lunitColors.text,
                          lineHeight: 1.5,
                        }}
                      >
                        {item}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      </PageSection>

      {/* CTA */}
      <CTASection
        title="Found a Security Issue?"
        subtitle="Please report security concerns through the contact page."
        buttonText="Contact Us"
        buttonPath="/contact"
        variant="dark"
      />
    </PageLayout>
  );
};

export default SecurityPage;
