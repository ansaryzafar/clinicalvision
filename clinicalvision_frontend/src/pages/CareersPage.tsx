import React, { useState } from 'react';
import { Box, Typography, Grid, alpha, Button, keyframes } from '@mui/material';
import {
  ArrowForward,
  WorkOutline,
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

// Scroll animation for partners
const scrollX = keyframes`
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
`;

const benefits = [
  { icon: <Favorite sx={{ fontSize: 28 }} />, title: 'Health & Wellness', description: 'Comprehensive medical, dental, and vision coverage for you and your family.' },
  { icon: <School sx={{ fontSize: 28 }} />, title: 'Learning Budget', description: '$3,000 annual budget for courses, conferences, and professional development.' },
  { icon: <Public sx={{ fontSize: 28 }} />, title: 'Remote Flexible', description: 'Work from anywhere with flexible hours to balance life and impact.' },
  { icon: <Groups sx={{ fontSize: 28 }} />, title: 'Team Events', description: 'Regular team offsites, hackathons, and social events to build connections.' },
];

const openings = [
  { title: 'Senior Machine Learning Engineer', department: 'AI Research', location: 'Remote / San Francisco', type: 'Full-time' },
  { title: 'Clinical Product Manager', department: 'Product', location: 'Boston', type: 'Full-time' },
  { title: 'Full Stack Engineer', department: 'Engineering', location: 'Remote', type: 'Full-time' },
  { title: 'Medical Imaging Specialist', department: 'Clinical', location: 'New York', type: 'Full-time' },
  { title: 'DevOps Engineer', department: 'Infrastructure', location: 'Remote', type: 'Full-time' },
  { title: 'UX Designer', department: 'Design', location: 'San Francisco', type: 'Full-time' },
];

const testimonials = [
  {
    quote: "At ClinicalVision, I feel empowered to tackle meaningful problems. When I express my ideas, my colleagues genuinely acknowledge and respect them. We debate openly and passionately.",
    name: 'Dr. Maya Johnson',
    role: 'Senior ML Researcher',
    avatar: 'MJ',
  },
  {
    quote: "I've worked at many organizations and ClinicalVision is by far the best in terms of challenging work, cutting-edge technology, and awesome people with lots of diversity.",
    name: 'Alex Chen',
    role: 'Principal Engineer',
    avatar: 'AC',
  },
  {
    quote: "The impact we make is real. Knowing that my code helps radiologists detect cancer earlier keeps me motivated every single day. This is why I do what I do.",
    name: 'Sarah Park',
    role: 'Staff Software Engineer',
    avatar: 'SP',
  },
];

// Culture pillars for dark gradient cards
const culturePillars = [
  { icon: <TrendingUp sx={{ fontSize: 32 }} />, title: 'Impact-Driven', description: 'Every line of code has the potential to save lives. We measure success by clinical outcomes.' },
  { icon: <Psychology sx={{ fontSize: 32 }} />, title: 'Intellectual Curiosity', description: 'We foster an environment where questions are celebrated and learning never stops.' },
  { icon: <Groups sx={{ fontSize: 32 }} />, title: 'Collaborative Spirit', description: 'The best ideas emerge from diverse perspectives working together.' },
  { icon: <LocalHospital sx={{ fontSize: 32 }} />, title: 'Clinical Excellence', description: 'We partner with leading clinicians to build tools that truly work in practice.' },
];

// Partner hospitals for scrolling section
const partnerHospitals = [
  'Stanford Health', 'Mayo Clinic', 'Johns Hopkins', 'Cleveland Clinic', 
  'Mass General', 'UCLA Health', 'Duke Health', 'UPMC',
];

const CareersPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedTestimonial, setSelectedTestimonial] = useState(0);

  return (
    <PageLayout>
      {/* Hero - Lunit Style */}
      <Box
        sx={{
          bgcolor: lunitColors.darkerGray,
          minHeight: '70vh',
          display: 'flex',
          alignItems: 'center',
          pt: { xs: 12, md: 16 },
          pb: { xs: 8, md: 12 },
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background gradient overlay */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '60%',
            height: '100%',
            background: `radial-gradient(ellipse at 80% 20%, ${alpha(lunitColors.teal, 0.12)} 0%, transparent 50%)`,
            pointerEvents: 'none',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: '30%',
            width: '50%',
            height: '50%',
            background: `radial-gradient(ellipse at 50% 100%, ${alpha(lunitColors.green, 0.08)} 0%, transparent 60%)`,
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
            Join the Minds Turning
            <Box component="span" sx={{ display: 'block', color: lunitColors.teal }}>
              AI into a Force Against Cancer
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
            At ClinicalVision, we unite science, data, and purpose to change how the world fights cancer. Be part of a team where your work drives innovation—and saves lives.
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
          Open Positions
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
            mb: 6,
          }}
        >
          Join our growing team. We're always looking for talented individuals passionate about AI and healthcare.
        </Typography>

        <Box sx={{ maxWidth: 900, mx: 'auto' }}>
          {openings.map((job, idx) => (
            <Box
              key={idx}
              sx={{
                p: 3,
                mb: 2,
                borderRadius: lunitRadius.lg,
                border: `1px solid ${alpha(lunitColors.darkerGray, 0.1)}`,
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                alignItems: { xs: 'flex-start', md: 'center' },
                justifyContent: 'space-between',
                gap: 2,
                transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: '3px',
                  bgcolor: 'transparent',
                  transition: 'all 0.3s ease',
                },
                '&:hover': {
                  borderColor: lunitColors.teal,
                  bgcolor: alpha(lunitColors.teal, 0.02),
                  boxShadow: lunitShadows.light,
                  transform: 'translateX(4px)',
                  '&::before': {
                    bgcolor: lunitColors.teal,
                  },
                },
              }}
            >
              <Box>
                <Typography
                  sx={{
                    fontFamily: lunitTypography.fontFamilyHeading,
                    fontSize: '18px',
                    fontWeight: 500,
                    color: lunitColors.headingColor,
                    mb: 0.5,
                  }}
                >
                  {job.title}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
                  <Typography
                    sx={{
                      fontFamily: lunitTypography.fontFamilyBody,
                      fontSize: '14px',
                      fontWeight: 400,
                      color: lunitColors.teal,
                    }}
                  >
                    {job.department}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: lunitColors.darkGrey }}>
                    <LocationOn sx={{ fontSize: 16 }} />
                    <Typography sx={{ fontSize: '13px', fontFamily: lunitTypography.fontFamilyBody }}>
                      {job.location}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: lunitColors.darkGrey }}>
                    <AccessTime sx={{ fontSize: 16 }} />
                    <Typography sx={{ fontSize: '13px', fontFamily: lunitTypography.fontFamilyBody }}>
                      {job.type}
                    </Typography>
                  </Box>
                </Box>
              </Box>
              <Button
                endIcon={<EastOutlined />}
                onClick={() => navigate(ROUTES.CONTACT)}
                sx={{
                  fontFamily: lunitTypography.fontFamilyBody,
                  fontSize: '14px',
                  fontWeight: 500,
                  bgcolor: lunitColors.black,
                  color: lunitColors.white,
                  px: 3,
                  py: 1,
                  borderRadius: lunitRadius.full,
                  textTransform: 'none',
                  '&:hover': {
                    bgcolor: lunitColors.teal,
                    color: lunitColors.black,
                  },
                }}
              >
                Apply Now
              </Button>
            </Box>
          ))}

          <Box sx={{ textAlign: 'center', mt: 4 }}>
            <Button
              endIcon={<ArrowForward />}
              onClick={() => navigate(ROUTES.CAREERS)}
              sx={{
                fontFamily: lunitTypography.fontFamilyBody,
                fontSize: '14px',
                fontWeight: 500,
                color: lunitColors.teal,
                textTransform: 'none',
                '&:hover': {
                  bgcolor: 'transparent',
                  textDecoration: 'underline',
                },
              }}
            >
              View all roles
            </Button>
          </Box>
        </Box>
      </PageSection>

      {/* Culture Pillars - Dark Gradient Cards */}
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
            Our Culture
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
            What Drives Us Every Day
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

      {/* Team Interview / Testimonials Section */}
      <Box sx={{ bgcolor: lunitColors.lightestGray, py: { xs: 8, md: 12 } }}>
        <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 3, md: 6 } }}>
          <Typography
            sx={{
              fontFamily: lunitTypography.fontFamilyHeading,
              fontSize: 'clamp(28px, 4vw, 48px)',
              fontWeight: 300,
              color: lunitColors.headingColor,
              textAlign: 'center',
              mb: 6,
            }}
          >
            ClinicalVision Team Interview
          </Typography>

          <Typography
            sx={{
              fontFamily: lunitTypography.fontFamilyBody,
              fontSize: '12px',
              fontWeight: 300,
              color: lunitColors.grey,
              textAlign: 'center',
              mt: -4,
              mb: 5,
              fontStyle: 'italic',
            }}
          >
            * Representative testimonials for illustrative purposes
          </Typography>

          <Grid container spacing={4} alignItems="center">
            <Grid size={{ xs: 12, md: 7 }}>
              <Box
                sx={{
                  p: { xs: 4, md: 5 },
                  borderRadius: lunitRadius['2xl'],
                  bgcolor: lunitColors.white,
                  minHeight: 280,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  animation: `${fadeIn} 0.5s ease`,
                  key: selectedTestimonial,
                }}
              >
                <Typography
                  sx={{
                    fontFamily: lunitTypography.fontFamilyBody,
                    fontSize: 'clamp(18px, 2vw, 22px)',
                    fontWeight: 300,
                    color: lunitColors.text,
                    lineHeight: 1.8,
                    mb: 4,
                    fontStyle: 'italic',
                  }}
                >
                  "{testimonials[selectedTestimonial].quote}"
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: '50%',
                      bgcolor: alpha(lunitColors.teal, 0.1),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Typography
                      sx={{
                        fontFamily: lunitTypography.fontFamilyHeading,
                        fontSize: '18px',
                        fontWeight: 500,
                        color: lunitColors.teal,
                      }}
                    >
                      {testimonials[selectedTestimonial].avatar}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography
                      sx={{
                        fontFamily: lunitTypography.fontFamilyHeading,
                        fontSize: '16px',
                        fontWeight: 500,
                        color: lunitColors.headingColor,
                      }}
                    >
                      {testimonials[selectedTestimonial].name}
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: lunitTypography.fontFamilyBody,
                        fontSize: '14px',
                        fontWeight: 400,
                        color: lunitColors.darkGrey,
                      }}
                    >
                      {testimonials[selectedTestimonial].role}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {/* Testimonial dots */}
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 3 }}>
                {testimonials.map((_, idx) => (
                  <Box
                    key={idx}
                    onClick={() => setSelectedTestimonial(idx)}
                    sx={{
                      width: selectedTestimonial === idx ? 24 : 10,
                      height: 10,
                      borderRadius: lunitRadius.full,
                      bgcolor: selectedTestimonial === idx ? lunitColors.teal : alpha(lunitColors.darkerGray, 0.2),
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        bgcolor: selectedTestimonial === idx ? lunitColors.teal : alpha(lunitColors.darkerGray, 0.4),
                      },
                    }}
                  />
                ))}
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 2,
                }}
              >
                {[1, 2, 3, 4].map((_, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      aspectRatio: '1',
                      borderRadius: lunitRadius.lg,
                      bgcolor: alpha(lunitColors.teal, 0.05 + idx * 0.02),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <WorkOutline sx={{ fontSize: 40, color: alpha(lunitColors.teal, 0.3) }} />
                  </Box>
                ))}
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Box>

      {/* Benefits Section */}
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
          Why Join ClinicalVision?
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
            mb: 6,
          }}
        >
          We offer competitive benefits to support your growth, wellness, and work-life balance.
        </Typography>

        <Grid container spacing={4}>
          {benefits.map((benefit, idx) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={idx}>
              <Box
                sx={{
                  p: 4,
                  height: '100%',
                  borderRadius: lunitRadius['2xl'],
                  bgcolor: lunitColors.white,
                  border: `1px solid ${alpha(lunitColors.darkerGray, 0.08)}`,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    borderColor: lunitColors.teal,
                    boxShadow: lunitShadows.card,
                    transform: 'translateY(-4px)',
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
                  {benefit.icon}
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
                  {benefit.title}
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
                  {benefit.description}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </PageSection>

      {/* Partner Hospitals - Scrolling Logos */}
      <Box 
        sx={{ 
          py: { xs: 6, md: 8 },
          bgcolor: lunitColors.lightestGray,
          overflow: 'hidden',
          position: 'relative',
          '&::before, &::after': {
            content: '""',
            position: 'absolute',
            top: 0,
            bottom: 0,
            width: '100px',
            zIndex: 2,
          },
          '&::before': {
            left: 0,
            background: `linear-gradient(90deg, ${lunitColors.lightestGray} 0%, transparent 100%)`,
          },
          '&::after': {
            right: 0,
            background: `linear-gradient(-90deg, ${lunitColors.lightestGray} 0%, transparent 100%)`,
          },
        }}
      >
        <Typography
          sx={{
            fontFamily: lunitTypography.fontFamilyBody,
            fontSize: '14px',
            fontWeight: 500,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: lunitColors.darkGrey,
            textAlign: 'center',
            mb: 4,
          }}
        >
          Our Team Works With Leading Institutions
        </Typography>
        
        <Box
          sx={{
            display: 'flex',
            gap: 8,
            animation: `${scrollX} 25s linear infinite`,
            width: 'max-content',
          }}
        >
          {[...partnerHospitals, ...partnerHospitals].map((hospital, idx) => (
            <Typography
              key={idx}
              sx={{
                fontFamily: lunitTypography.fontFamilyHeading,
                fontSize: '20px',
                fontWeight: 400,
                color: alpha(lunitColors.darkerGray, 0.4),
                whiteSpace: 'nowrap',
                transition: 'color 0.3s ease',
                '&:hover': {
                  color: lunitColors.teal,
                },
              }}
            >
              {hospital}
            </Typography>
          ))}
        </Box>
      </Box>

      {/* CTA */}
      <CTASection
        title="Don't See a Position That Fits?"
        subtitle="Join our Talent Pool. We're always interested in meeting talented people, even if we don't have an open role that matches your background."
        buttonText="Join Talent Pool"
        buttonPath="/contact"
        variant="dark"
      />
    </PageLayout>
  );
};

export default CareersPage;
