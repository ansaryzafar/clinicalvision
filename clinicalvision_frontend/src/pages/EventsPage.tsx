import React from 'react';
import { Box, Typography } from '@mui/material';
import SEOHead from '../components/shared/SEOHead';
import { PageLayout, PageHero, PageSection, CTASection } from '../components/layout/PageLayout';
import { ROUTES } from '../routes/paths';
import { lunitColors, lunitTypography } from '../styles/lunitDesignSystem';

const EventsPage: React.FC = () => {
  return (
    <PageLayout headerVariant="dark">
      <SEOHead
        title="Events — ClinicalVision"
        description="ClinicalVision is a research prototype and has no scheduled events, conference appearances or webinars."
        keywords={['ClinicalVision events']}
        canonicalPath="/events"
      />
      <PageHero
        dark
        label="Events"
        title={
          <>
            No Events{' '}
            <span style={{ color: lunitColors.teal }}>Scheduled</span>
          </>
        }
        subtitle="ClinicalVision is a solo research prototype. There are currently no conferences, webinars or workshops to announce."
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
            }}
          >
            If an event is ever planned, it will be listed here. In the meantime you can try the
            research demo or get in touch about the project.
          </Typography>
        </Box>
      </PageSection>

      <CTASection
        title="Questions About the Project?"
        subtitle="Get in touch about the research prototype."
        buttonText="Contact Us"
        buttonPath={ROUTES.CONTACT}
        variant="dark"
      />
    </PageLayout>
  );
};

export default EventsPage;
