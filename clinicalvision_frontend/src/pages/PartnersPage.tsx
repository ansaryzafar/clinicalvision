import React from 'react';
import { Box, Typography } from '@mui/material';
import SEOHead from '../components/shared/SEOHead';
import { PageLayout, PageHero, PageSection, CTASection } from '../components/layout/PageLayout';
import { ROUTES } from '../routes/paths';
import { lunitColors, lunitTypography } from '../styles/lunitDesignSystem';

const PartnersPage: React.FC = () => {
  return (
    <PageLayout headerVariant="dark">
      <SEOHead
        title="Collaboration — ClinicalVision"
        description="ClinicalVision is a research prototype with no commercial partners, customers or partner programme. Researchers interested in collaborating are welcome to get in touch."
        keywords={['ClinicalVision collaboration']}
        canonicalPath="/partners"
      />
      <PageHero
        dark
        label="Collaboration"
        title={
          <>
            Research{' '}
            <span style={{ color: lunitColors.teal }}>Collaboration</span>
          </>
        }
        subtitle="ClinicalVision is a solo research prototype with no commercial partners, customers or partner programme, which makes this a good moment to start a conversation."
      />

      <PageSection>
        <Box sx={{ maxWidth: 720, mx: 'auto', textAlign: 'center' }}>
          <Typography
            sx={{
              fontFamily: lunitTypography.fontFamilyBody,
              fontSize: '16px',
              fontWeight: 300,
              color: lunitColors.text,
              lineHeight: 1.8,
              mb: 2,
            }}
          >
            The model has only been evaluated on a held-out split of the public CBIS-DDSM dataset.
            External validation would require data and clinical expertise that this project does not
            have.
          </Typography>
          <Typography
            sx={{
              fontFamily: lunitTypography.fontFamilyBody,
              fontSize: '16px',
              fontWeight: 300,
              color: lunitColors.text,
              lineHeight: 1.8,
            }}
          >
            Researchers and clinicians who would like to discuss the work, its limitations or possible collaboration are warmly welcome to get in touch. No collaboration is currently in place, so there is room to shape one together.
          </Typography>
        </Box>
      </PageSection>

      <CTASection
        title="Interested in Collaborating?"
        subtitle="Get in touch to discuss the research."
        buttonText="Contact Us"
        buttonPath={ROUTES.CONTACT}
        variant="dark"
      />
    </PageLayout>
  );
};

export default PartnersPage;
