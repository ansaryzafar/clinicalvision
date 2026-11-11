import React from 'react';
import { Typography } from '@mui/material';
import SEOHead from '../components/shared/SEOHead';
import { PageLayout, PageHero, PageSection } from '../components/layout/PageLayout';
import { lunitColors, lunitTypography } from '../styles/lunitDesignSystem';

const StatusPage: React.FC = () => (
  <PageLayout>
    <SEOHead
      title="Service Status — Research Prototype"
      description="ClinicalVision is a research prototype. There is no live service monitoring, uptime commitment or incident history."
      keywords={['ClinicalVision status']}
      canonicalPath="/status"
    />
    <PageHero
      label="Service Status"
      title="Research Prototype"
      subtitle="ClinicalVision is a research prototype. It has no service-level agreement, no uptime commitment and no published incident history."
    />
    <PageSection background="light" paddingY="small">
      <Typography
        sx={{
          fontFamily: lunitTypography.fontFamilyBody,
          fontSize: '16px',
          fontWeight: 300,
          lineHeight: 1.8,
          color: lunitColors.text,
          maxWidth: 760,
          mx: 'auto',
          textAlign: 'center',
        }}
      >
        This page does not display live monitoring data. The demo may be unavailable or change at any
        time without notice. It is not a medical device and must not be relied on for any clinical
        purpose.
      </Typography>
    </PageSection>
  </PageLayout>
);

export default StatusPage;
