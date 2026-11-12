import React from 'react';
import { Box, Typography, Grid, alpha, Button, keyframes } from '@mui/material';
import SEOHead from '../components/shared/SEOHead';
import {
  ArrowForward,
  Public,
  Favorite,
  School,
  Groups,
  EastOutlined,
  LocationOn,
  AccessTime,
  TrendingUp,
  Psychology,
  LocalHospital,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { PageLayout, PageSection, CTASection } from '../components/layout/PageLayout';
import { ScrollReveal } from '../hooks/useScrollReveal';
import { ROUTES } from '../routes/paths';
import { 
  lunitColors, 
  lunitTypography, 
  lunitShadows, 
  lunitRadius,
  lunitGradients,
} from '../styles/lunitDesignSystem';

// Fade in animation
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

// Culture pillars for dark gradient cards
const culturePillars = [
  { icon: <TrendingUp sx={{ fontSize: 32 }} />, title: 'Impact-Driven', description: 'We aim for work that could eventually support clinicians, and we are open about what has and has not been validated.' },
  { icon: <Psychology sx={{ fontSize: 32 }} />, title: 'Intellectual Curiosity', description: 'Questions come first, and learning is the whole point of the project.' },
  { icon: <Groups sx={{ fontSize: 32 }} />, title: 'Collaborative Spirit', description: 'Ideas improve with other perspectives, which is why conversations with researchers and clinicians are welcome.' },
  { icon: <LocalHospital sx={{ fontSize: 32 }} />, title: 'Clinical Relevance', description: 'We aim to work with clinicians to understand what would make tools like this useful in practice.' },
];

const CareersPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <PageLayout>
      <SEOHead
        title="Careers"
        description="ClinicalVision is a research prototype and is not currently hiring. Contact us about research collaboration."
        keywords={['ClinicalVision careers']}
        canonicalPath="/careers"
      />
      {/* Hero - Lunit Style */}
      <Box
        sx={{
          background: lunitGradients.pageBannerBg,
          minHeight: '70vh',
          display: 'flex',
          alignItems: 'flex-end',
          pt: { xs: '80px', md: '120px' },
          pb: { xs: '60px', md: '80px' },
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative background photo */}
        <Box
          component="img"
          src="/images/team/team-boardroom-full-1920w.webp"
          alt=""
          sx={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: 0.18,
            pointerEvents: 'none',
          }}
        />
        {/* Background gradient overlay */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background: lunitGradients.pageBannerOverlay,
            pointerEvents: 'none',
          }}
        />
        
        <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 3, md: 6 }, width: '100%', position: 'relative', zIndex: 1 }}>
          <Typography
            sx={{
              fontFamily: lunitTypography.fontFamilyHeading,
              fontSize: 'clamp(40px, 7vw, 80px)',
              fontWeight: 300,
              color: lunitColors.white,
              lineHeight: 1.1,
              mb: 4,
            }}
          >
            Research
            <Box component="span" sx={{ display: 'block', color: lunitColors.teal }}>
              Collaboration
            </Box>
          </Typography>
          <Typography
            sx={{
              fontFamily: lunitTypography.fontFamilyBody,
              fontSize: 'clamp(16px, 2vw, 20px)',
              fontWeight: 300,
              color: alpha(lunitColors.white, 0.8),
              maxWidth: 650,
              lineHeight: 1.7,
            }}
          >
            ClinicalVision is a research prototype in explainable breast-imaging AI. We are not currently hiring, but welcome conversations with researchers and clinicians.
          </Typography>
        </Box>
      </Box>

      {/* Open Positions Section */}
      <PageSection paddingY="large">
        <Typography
          sx={{
            fontFamily: lunitTypography.fontFamilyHeading,
            fontSize: 'clamp(28px, 4vw, 48px)',
            fontWeight: 300,
            color: lunitColors.headingColor,
            textAlign: 'center',
            mb: 2,
          }}
        >
          No Open Positions
        </Typography>
        <Typography
          sx={{
            fontFamily: lunitTypography.fontFamilyBody,
            fontSize: '16px',
            fontWeight: 300,
            color: lunitColors.text,
            textAlign: 'center',
            maxWidth: 600,
            mx: 'auto',
            mb: 4,
          }}
        >
          ClinicalVision is a research prototype and is not currently hiring. If you are interested in
          research collaboration, please get in touch.
        </Typography>
        <Box sx={{ textAlign: 'center' }}>
          <Button
            endIcon={<ArrowForward />}
            onClick={() => navigate(ROUTES.CONTACT)}
            sx={{
              fontFamily: lunitTypography.fontFamilyBody,
              fontSize: '14px',
              fontWeight: 500,
              color: lunitColors.teal,
              textTransform: 'none',
              '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' },
            }}
          >
            Contact the research team
          </Button>
        </Box>
      </PageSection>

      {/* Culture Pillars - Dark Gradient Cards */}
      <ScrollReveal>
      <Box 
        sx={{ 
          bgcolor: lunitColors.darkerGray, 
          py: { xs: 8, md: 12 },
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background gradient */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '60%',
            height: '100%',
            background: lunitGradients.testimonialGradient,
            pointerEvents: 'none',
          }}
        />
        
        <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 3, md: 6 }, position: 'relative', zIndex: 1 }}>
          <Typography
            sx={{
              fontFamily: lunitTypography.fontFamilyBody,
              fontSize: '14px',
              fontWeight: 500,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: lunitColors.teal,
              textAlign: 'center',
              mb: 2,
            }}
          >
            Guiding Principles
          </Typography>
          <Typography
            sx={{
              fontFamily: lunitTypography.fontFamilyHeading,
              fontSize: 'clamp(28px, 4vw, 48px)',
              fontWeight: 300,
              color: lunitColors.white,
              textAlign: 'center',
              mb: 6,
            }}
          >
            What Drives the Project
          </Typography>

          <Grid container spacing={3}>
            {culturePillars.map((pillar, idx) => (
              <Grid size={{ xs: 12, sm: 6, md: 3 }} key={idx}>
                <Box
                  sx={{
                    p: 4,
                    height: '100%',
                    background: `linear-gradient(135deg, rgba(35, 50, 50, 0.8) 0%, rgba(26, 38, 38, 0.9) 100%)`,
                    borderRadius: lunitRadius['2xl'],
                    border: `1px solid rgba(255, 255, 255, 0.06)`,
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      inset: 0,
                      background: `linear-gradient(135deg, rgba(0, 201, 234, 0.12) 0%, rgba(0, 201, 234, 0.02) 100%)`,
                      opacity: 0,
                      transition: 'opacity 0.35s ease',
                    },
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
                      borderColor: 'rgba(0, 201, 234, 0.3)',
                      '&::before': {
                        opacity: 1,
                      },
                    },
                  }}
                >
                  <Box sx={{ position: 'relative', zIndex: 1 }}>
                    <Box
                      sx={{
                        width: 64,
                        height: 64,
                        borderRadius: lunitRadius.lg,
                        bgcolor: alpha(lunitColors.teal, 0.15),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: lunitColors.teal,
                        mb: 3,
                      }}
                    >
                      {pillar.icon}
                    </Box>
                    <Typography
                      sx={{
                        fontFamily: lunitTypography.fontFamilyHeading,
                        fontSize: '20px',
                        fontWeight: 500,
                        color: lunitColors.white,
                        mb: 1.5,
                      }}
                    >
                      {pillar.title}
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: lunitTypography.fontFamilyBody,
                        fontSize: '14px',
                        fontWeight: 300,
                        color: alpha(lunitColors.white, 0.7),
                        lineHeight: 1.7,
                      }}
                    >
                      {pillar.description}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Box>
      </ScrollReveal>

      {/* CTA */}
      <CTASection
        title="Interested in Research Collaboration?"
        subtitle="ClinicalVision is a research prototype. Get in touch if you would like to discuss the work."
        buttonText="Contact Us"
        buttonPath="/contact"
        variant="dark"
      />
    </PageLayout>
  );
};

export default CareersPage;
