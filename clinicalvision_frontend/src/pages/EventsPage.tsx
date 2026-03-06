import React from 'react';
import { Box, Typography, Grid, Button, Chip, alpha } from '@mui/material';
import {
  Event,
  LocationOn,
  Videocam,
  CalendarMonth,
  ArrowForward,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { PageLayout, PageHero, PageSection, CTASection } from '../components/layout/PageLayout';
import { ROUTES } from '../routes/paths';
import { lunitColors, lunitTypography, lunitRadius, lunitShadows } from '../styles/lunitDesignSystem';

const upcomingEvents = [
  {
    title: 'AI in Radiology: Bridging Research and Clinical Practice',
    type: 'Webinar',
    date: 'April 2026',
    location: 'Online',
    description:
      'Join our research team for a deep dive into how uncertainty quantification and explainable AI are changing the clinical adoption landscape for cancer detection tools.',
    isVirtual: true,
  },
  {
    title: 'European Congress of Radiology (ECR) 2026',
    type: 'Conference',
    date: 'July 2026',
    location: 'Vienna, Austria',
    description:
      'Visit our booth to see live demonstrations of our breast cancer detection platform and learn about our upcoming multi-cancer expansion roadmap.',
    isVirtual: false,
  },
  {
    title: 'RSNA Annual Meeting 2026',
    type: 'Conference',
    date: 'December 2026',
    location: 'Chicago, IL, USA',
    description:
      'Our team will be presenting research on dual-view fusion architecture and clinical validation results at the world\'s largest radiology meeting.',
    isVirtual: false,
  },
];

const pastHighlights = [
  {
    title: 'Explainability in Medical AI Workshop',
    type: 'Workshop',
    date: 'January 2026',
    description:
      'Hands-on workshop exploring how gradient-weighted activation maps and attention overlays help clinicians understand AI predictions.',
  },
  {
    title: 'Clinical Validation Methodology Webinar',
    type: 'Webinar',
    date: 'November 2025',
    description:
      'A technical session on our multi-site validation framework and how we measure model performance across diverse patient populations.',
  },
];

const EventsPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <PageLayout headerVariant="dark">
      <PageHero
        dark
        label="Events"
        title={
          <>
            Connect with
            <br />
            <span style={{ color: lunitColors.teal }}>ClinicalVision</span>
          </>
        }
        subtitle="Meet our team at industry conferences, attend our webinars, and join the conversation about the future of AI-assisted cancer detection."
      />

      {/* Upcoming Events */}
      <PageSection>
        <Box sx={{ mb: 8 }}>
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
            Upcoming
          </Typography>
          <Typography
            sx={{
              fontFamily: lunitTypography.fontFamilyHeading,
              fontSize: 'clamp(28px, 4vw, 40px)',
              fontWeight: lunitTypography.fontWeightLight,
              color: lunitColors.headingColor,
            }}
          >
            Where to Find Us
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {upcomingEvents.map((event, idx) => (
            <Box
              key={idx}
              sx={{
                p: 4,
                borderRadius: lunitRadius['2xl'],
                bgcolor: lunitColors.white,
                border: `1px solid ${alpha(lunitColors.darkerGray, 0.08)}`,
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                gap: 3,
                transition: 'all 0.3s ease',
                '&:hover': {
                  boxShadow: lunitShadows.cardHoverTeal,
                },
              }}
            >
              <Box
                sx={{
                  width: { xs: '100%', md: 120 },
                  height: { xs: 80, md: 120 },
                  borderRadius: lunitRadius.xl,
                  bgcolor: alpha(lunitColors.teal, 0.08),
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <CalendarMonth sx={{ fontSize: 28, color: lunitColors.teal, mb: 0.5 }} />
                <Typography
                  sx={{
                    fontFamily: lunitTypography.fontFamilyBody,
                    fontSize: '13px',
                    fontWeight: 500,
                    color: lunitColors.tealDarker,
                  }}
                >
                  {event.date}
                </Typography>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                  <Chip
                    label={event.type}
                    size="small"
                    sx={{
                      fontFamily: lunitTypography.fontFamilyBody,
                      fontSize: '12px',
                      fontWeight: 500,
                      bgcolor: alpha(lunitColors.teal, 0.1),
                      color: lunitColors.tealDarker,
                    }}
                  />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {event.isVirtual ? (
                      <Videocam sx={{ fontSize: 16, color: lunitColors.grey }} />
                    ) : (
                      <LocationOn sx={{ fontSize: 16, color: lunitColors.grey }} />
                    )}
                    <Typography
                      sx={{
                        fontFamily: lunitTypography.fontFamilyBody,
                        fontSize: '13px',
                        fontWeight: 400,
                        color: lunitColors.grey,
                      }}
                    >
                      {event.location}
                    </Typography>
                  </Box>
                </Box>
                <Typography
                  sx={{
                    fontFamily: lunitTypography.fontFamilyHeading,
                    fontSize: '20px',
                    fontWeight: 500,
                    color: lunitColors.headingColor,
                    mb: 1,
                  }}
                >
                  {event.title}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: lunitTypography.fontFamilyBody,
                    fontSize: '14px',
                    fontWeight: 300,
                    color: lunitColors.text,
                    lineHeight: 1.7,
                  }}
                >
                  {event.description}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </PageSection>

      {/* Past Highlights */}
      <PageSection background="light">
        <Box sx={{ mb: 6 }}>
          <Typography
            sx={{
              fontFamily: lunitTypography.fontFamilyHeading,
              fontSize: 'clamp(24px, 3vw, 32px)',
              fontWeight: lunitTypography.fontWeightLight,
              color: lunitColors.headingColor,
            }}
          >
            Recent Highlights
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {pastHighlights.map((event, idx) => (
            <Grid size={{ xs: 12, sm: 6 }} key={idx}>
              <Box
                sx={{
                  p: 3,
                  borderRadius: lunitRadius['2xl'],
                  bgcolor: lunitColors.white,
                  height: '100%',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: lunitShadows.cardHoverTeal,
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Chip
                    label={event.type}
                    size="small"
                    sx={{
                      fontFamily: lunitTypography.fontFamilyBody,
                      fontSize: '11px',
                      bgcolor: alpha(lunitColors.darkerGray, 0.06),
                      color: lunitColors.grey,
                    }}
                  />
                  <Typography
                    sx={{
                      fontFamily: lunitTypography.fontFamilyBody,
                      fontSize: '12px',
                      color: lunitColors.grey,
                    }}
                  >
                    {event.date}
                  </Typography>
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
                  {event.title}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: lunitTypography.fontFamilyBody,
                    fontSize: '14px',
                    fontWeight: 300,
                    color: lunitColors.text,
                    lineHeight: 1.7,
                  }}
                >
                  {event.description}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </PageSection>

      <CTASection
        title="Want Us at Your Event?"
        subtitle="Invite our team to present, demo, or participate in your conference or workshop."
        buttonText="Contact Us"
        buttonPath={ROUTES.CONTACT}
        variant="dark"
      />
    </PageLayout>
  );
};

export default EventsPage;
