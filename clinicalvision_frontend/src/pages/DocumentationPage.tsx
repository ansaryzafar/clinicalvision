import React from 'react';
import { Box, Typography, Grid, Button, alpha } from '@mui/material';
import SEOHead from '../components/shared/SEOHead';
import { PlayCircle, Code, MenuBook } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { PageLayout, PageHero, PageSection } from '../components/layout/PageLayout';
import { ROUTES } from '../routes/paths';
import { lunitColors, lunitTypography, lunitRadius } from '../styles/lunitDesignSystem';

const resources = [
  {
    icon: <PlayCircle sx={{ fontSize: 32 }} />,
    title: 'Research Demo',
    description: 'Try the model on fictional demo cases. Research use only.',
    label: 'Open Demo',
    path: ROUTES.DEMO,
  },
  {
    icon: <MenuBook sx={{ fontSize: 32 }} />,
    title: 'Technology Overview',
    description: 'How the research model works, how it was evaluated and what its limits are.',
    label: 'Read Overview',
    path: ROUTES.TECHNOLOGY,
  },
  {
    icon: <Code sx={{ fontSize: 32 }} />,
    title: 'Backend Endpoints',
    description: 'A list of the endpoints that power the demo. There is no public API.',
    label: 'View Endpoints',
    path: ROUTES.API,
  },
];

const DocumentationPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <PageLayout>
      <SEOHead
        title="Documentation — ClinicalVision Research Prototype"
        description="ClinicalVision has no formal product documentation. This page links to the research demo, technology overview and backend endpoint list."
        keywords={['ClinicalVision documentation']}
        canonicalPath="/documentation"
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Documentation' },
        ]}
      />
      <PageHero
        label="Documentation"
        title={
          <>
            Research Prototype{' '}
            <Box component="span" sx={{ color: lunitColors.teal }}>
              Resources
            </Box>
          </>
        }
        subtitle="ClinicalVision is a research prototype and has no formal product documentation, integration guides or user manuals."
      />

      <PageSection>
        <Grid container spacing={4}>
          {resources.map((r) => (
            <Grid size={{ xs: 12, md: 4 }} key={r.title}>
              <Box
                sx={{
                  p: 4,
                  height: '100%',
                  borderRadius: lunitRadius['2xl'],
                  border: `1px solid ${alpha(lunitColors.darkerGray, 0.08)}`,
                }}
              >
                <Box sx={{ color: lunitColors.teal, mb: 2 }}>{r.icon}</Box>
                <Typography
                  sx={{
                    fontFamily: lunitTypography.fontFamilyHeading,
                    fontSize: '20px',
                    fontWeight: 500,
                    color: lunitColors.headingColor,
                    mb: 1,
                  }}
                >
                  {r.title}
                </Typography>
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
                  {r.description}
                </Typography>
                <Button variant="outlined" onClick={() => navigate(r.path)}>
                  {r.label}
                </Button>
              </Box>
            </Grid>
          ))}
        </Grid>
      </PageSection>
    </PageLayout>
  );
};

export default DocumentationPage;
