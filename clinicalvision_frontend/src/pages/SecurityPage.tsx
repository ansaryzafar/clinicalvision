import React from 'react';
import { Box, Typography, Grid, alpha } from '@mui/material';
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
    title: 'End-to-End Encryption',
    description: 'All data is encrypted in transit using TLS 1.3 and at rest using AES-256 encryption.',
  },
  {
    icon: <VpnKey sx={{ fontSize: 32 }} />,
    title: 'Strong Authentication',
    description: 'Multi-factor authentication, SSO integration, and secure API key management.',
  },
  {
    icon: <Shield sx={{ fontSize: 32 }} />,
    title: 'Access Controls',
    description: 'Role-based access control (RBAC) with principle of least privilege enforcement.',
  },
  {
    icon: <Storage sx={{ fontSize: 32 }} />,
    title: 'Secure Infrastructure',
    description: 'SOC 2 Type II certified data centers with redundancy across multiple regions.',
  },
  {
    icon: <Policy sx={{ fontSize: 32 }} />,
    title: 'Audit Logging',
    description: 'Comprehensive audit trails for all data access and system activities.',
  },
  {
    icon: <BugReport sx={{ fontSize: 32 }} />,
    title: 'Vulnerability Management',
    description: 'Regular penetration testing, vulnerability scanning, and bug bounty program.',
  },
];

const certifications = [
  {
    name: 'HIPAA',
    description: 'Health Insurance Portability and Accountability Act compliant',
    icon: '🏥',
  },
  {
    name: 'SOC 2 Type II',
    description: 'Service Organization Control security certification',
    icon: '🔒',
  },
  {
    name: 'FDA 510(k)',
    description: 'FDA cleared medical device software',
    icon: '✅',
  },
  {
    name: 'ISO 27001',
    description: 'Information security management system certification',
    icon: '📋',
  },
  {
    name: 'GDPR',
    description: 'General Data Protection Regulation compliant',
    icon: '🇪🇺',
  },
  {
    name: 'CE Mark',
    description: 'European Conformity for medical devices',
    icon: '🏛️',
  },
];

const practices = [
  {
    title: 'Security-First Development',
    items: [
      'Secure coding practices and code review',
      'Static and dynamic application security testing',
      'Dependency vulnerability scanning',
      'Security training for all developers',
    ],
  },
  {
    title: 'Data Protection',
    items: [
      'Data minimization and retention policies',
      'Automatic de-identification capabilities',
      'Secure data deletion upon request',
      'Geographic data residency options',
    ],
  },
  {
    title: 'Incident Response',
    items: [
      '24/7 security monitoring',
      'Documented incident response procedures',
      'Regular tabletop exercises',
      'Breach notification within 72 hours',
    ],
  },
];

const SecurityPage: React.FC = () => {
  return (
    <PageLayout>
      {/* Hero */}
      <PageHero
        dark
        label="Security"
        title={
          <>
            Enterprise-Grade{' '}
            <Box component="span" sx={{ color: lunitColors.teal }}>
              Security
            </Box>
          </>
        }
        subtitle="Your data security is our top priority. We implement comprehensive measures to protect patient information and maintain trust."
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
            Certifications & Compliance
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {certifications.map((cert, idx) => (
            <Grid size={{ xs: 6, sm: 4, md: 2 }} key={idx}>
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
            Our Security Practices
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
        title="Questions About Security?"
        subtitle="Our security team is available to discuss your specific requirements and compliance needs."
        buttonText="Contact Security Team"
        buttonPath="/contact"
        variant="dark"
      />
    </PageLayout>
  );
};

export default SecurityPage;
