/**
 * About Page - ClinicalVision AI
 * 
 * Elegant, sophisticated presentation with subtle hints at capabilities
 * without disclosing specific technical details or metrics.
 */

import React, { useState } from 'react';
import { Box, Typography, Grid, alpha, Button, Chip, Divider } from '@mui/material';
import { 
  Timeline, 
  Verified, 
  LocalHospital, 
  Science,
  Security,
  Biotech,
  Visibility,
  AutoAwesome,
  Psychology,
  HealthAndSafety,
  TrendingUp,
  Shield,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { PageLayout, PageSection, CTASection } from '../components/layout/PageLayout';
import { ScrollReveal } from '../hooks/useScrollReveal';
import { lunitColors, lunitTypography, lunitShadows, lunitRadius, lunitGradients } from '../styles/lunitDesignSystem';

// Core pillars of the platform
const pillars = [
  {
    icon: <Psychology sx={{ fontSize: 32 }} />,
    title: 'Intelligent Analysis',
    description: 'Advanced deep learning that understands the nuances of medical imaging, trained on rigorously curated clinical datasets.',
  },
  {
    icon: <Visibility sx={{ fontSize: 32 }} />,
    title: 'Transparent Reasoning',
    description: 'Every insight comes with visual explanations, showing exactly where the AI focuses its attention.',
  },
  {
    icon: <Shield sx={{ fontSize: 32 }} />,
    title: 'Calibrated Confidence',
    description: 'Know when to trust the AI and when to seek expert review. Our uncertainty quantification keeps you informed.',
  },
  {
    icon: <HealthAndSafety sx={{ fontSize: 32 }} />,
    title: 'Clinical Integrity',
    description: 'Built for real-world clinical environments with fairness monitoring and continuous quality assurance.',
  },
];

// Philosophy and approach
const philosophy = [
  {
    title: 'Human-AI Collaboration',
    description: 'We believe AI should augment clinical expertise, not replace it. ClinicalVision serves as a second reader—a thoughtful assistant that supports radiologists in their decision-making process.',
  },
  {
    title: 'Explainability by Design',
    description: 'Black-box AI has no place in healthcare. Every analysis includes intuitive visualizations that reveal the reasoning behind each assessment, fostering trust and clinical confidence.',
  },
  {
    title: 'Continuous Improvement',
    description: 'Our models evolve through iterative refinement, incorporating feedback from clinical practice to deliver increasingly reliable performance over time.',
  },
];

// Milestones - high level, no specific metrics
const milestones = {
  'Present': [
    { title: 'Production-Ready Platform', description: 'A complete clinical workflow solution with professional-grade interface and robust backend infrastructure.' },
    { title: 'Validated Performance', description: 'Extensively tested against established benchmarks with competitive results across key clinical metrics.' },
    { title: 'Fairness & Compliance', description: 'Real-time monitoring ensures equitable AI performance across diverse patient populations.' },
  ],
  'Foundation': [
    { title: 'Clinical Dataset Training', description: 'Models trained on curated mammography datasets with expert-verified annotations and rigorous preprocessing.' },
    { title: 'Architecture Design', description: 'Modern ensemble approach combining proven neural network architectures with uncertainty-aware inference.' },
    { title: 'Explainability Integration', description: 'Visual attention mechanisms that illuminate the AI reasoning process for clinical interpretability.' },
  ],
};

// What sets us apart
const differentiators = [
  {
    icon: <AutoAwesome />,
    label: 'Ensemble Intelligence',
    hint: 'Multiple model perspectives for robust predictions',
  },
  {
    icon: <TrendingUp />,
    label: 'Competitive Accuracy',
    hint: 'Performance validated against clinical standards',
  },
  {
    icon: <Biotech />,
    label: 'Research-Grade',
    hint: 'Built on peer-reviewed methodologies',
  },
  {
    icon: <Security />,
    label: 'Uncertainty Aware',
    hint: 'Knows the limits of its confidence',
  },
];

const AboutPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedPhase, setSelectedPhase] = useState('Present');
  const phases = Object.keys(milestones);

  return (
    <PageLayout>
      {/* Hero Section - Elegant and Aspirational */}
      <Box
        sx={{
          background: lunitGradients.pageBannerBg,
          minHeight: '80vh',
          display: 'flex',
          alignItems: 'center',
          pt: { xs: '80px', md: '120px' },
          pb: { xs: '60px', md: '100px' },
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background team image */}
        <Box
          component="img"
          src="/images/team/team-meeting-glass-wall-1920w.webp"
          alt=""
          sx={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: 0.15,
            pointerEvents: 'none',
          }}
        />
        {/* Gradient overlay */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background: lunitGradients.pageBannerOverlay,
            pointerEvents: 'none',
          }}
        />
        
        <Box sx={{ maxWidth: 1000, mx: 'auto', px: { xs: 3, md: 6 }, width: '100%', position: 'relative', zIndex: 1 }}>
          <Typography
            sx={{
              fontFamily: lunitTypography.fontFamilyHeading,
              fontSize: 'clamp(40px, 8vw, 80px)',
              fontWeight: 200,
              color: lunitColors.white,
              lineHeight: 1.05,
              mb: 4,
              letterSpacing: '-0.02em',
            }}
          >
            Intelligence that
            <Box component="span" sx={{ display: 'block', color: lunitColors.teal, fontWeight: 300 }}>
              illuminates
            </Box>
          </Typography>
          <Typography
            sx={{
              fontFamily: lunitTypography.fontFamilyBody,
              fontSize: 'clamp(17px, 2vw, 21px)',
              fontWeight: 300,
              color: alpha(lunitColors.white, 0.75),
              maxWidth: 600,
              lineHeight: 1.8,
              mb: 5,
            }}
          >
            ClinicalVision brings clarity to medical imaging through thoughtful AI. 
            We combine advanced deep learning with transparent reasoning—because 
            in healthcare, understanding the "why" matters as much as the "what."
          </Typography>
          
          {/* Subtle differentiators */}
          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            {differentiators.map((item, idx) => (
              <Box 
                key={idx}
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1.5,
                  color: alpha(lunitColors.white, 0.6),
                  transition: 'color 0.3s ease',
                  '&:hover': { color: lunitColors.teal },
                }}
              >
                <Box sx={{ color: 'inherit', opacity: 0.7 }}>{item.icon}</Box>
                <Typography sx={{ 
                  fontSize: '14px', 
                  fontWeight: 400,
                  letterSpacing: '0.02em',
                }}>
                  {item.label}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      {/* Core Pillars Section */}
      <PageSection paddingY="large">
        <Typography
          sx={{
            fontFamily: lunitTypography.fontFamilyHeading,
            fontSize: 'clamp(28px, 4vw, 44px)',
            fontWeight: 200,
            color: lunitColors.headingColor,
            textAlign: 'center',
            mb: 2,
            letterSpacing: '-0.01em',
          }}
        >
          Built on principles that matter
        </Typography>
        <Typography
          sx={{
            fontFamily: lunitTypography.fontFamilyBody,
            fontSize: '17px',
            fontWeight: 300,
            color: lunitColors.text,
            textAlign: 'center',
            maxWidth: 650,
            mx: 'auto',
            mb: 8,
            lineHeight: 1.8,
          }}
        >
          Every decision in our platform reflects a commitment to clinical excellence, 
          transparency, and responsible AI deployment.
        </Typography>

        <Grid container spacing={4}>
          {pillars.map((pillar, idx) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={idx}>
              <Box
                sx={{
                  p: 4,
                  borderRadius: lunitRadius['2xl'],
                  bgcolor: lunitColors.white,
                  height: '100%',
                  transition: 'all 0.4s ease',
                  border: `1px solid ${alpha(lunitColors.darkerGray, 0.06)}`,
                  '&:hover': {
                    boxShadow: lunitShadows.cardHoverTeal,
                    transform: 'translateY(-6px)',
                  },
                }}
              >
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: lunitRadius.xl,
                    bgcolor: alpha(lunitColors.teal, 0.08),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 3,
                    color: lunitColors.teal,
                  }}
                >
                  {pillar.icon}
                </Box>
                <Typography
                  sx={{
                    fontFamily: lunitTypography.fontFamilyHeading,
                    fontSize: '18px',
                    fontWeight: 500,
                    color: lunitColors.headingColor,
                    mb: 1.5,
                  }}
                >
                  {pillar.title}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: lunitTypography.fontFamilyBody,
                    fontSize: '15px',
                    fontWeight: 300,
                    color: lunitColors.text,
                    lineHeight: 1.7,
                  }}
                >
                  {pillar.description}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </PageSection>

      {/* Philosophy Section - Dark */}
      <ScrollReveal>
      <Box sx={{ bgcolor: lunitColors.darkerGray, py: { xs: 8, md: 12 } }}>
        <Box sx={{ maxWidth: 1100, mx: 'auto', px: { xs: 3, md: 6 } }}>
          <Typography
            sx={{
              fontFamily: lunitTypography.fontFamilyHeading,
              fontSize: 'clamp(28px, 4vw, 44px)',
              fontWeight: 200,
              color: lunitColors.white,
              textAlign: 'center',
              mb: 2,
              letterSpacing: '-0.01em',
            }}
          >
            Our philosophy
          </Typography>
          <Typography
            sx={{
              fontFamily: lunitTypography.fontFamilyBody,
              fontSize: '17px',
              fontWeight: 300,
              color: alpha(lunitColors.white, 0.7),
              textAlign: 'center',
              maxWidth: 600,
              mx: 'auto',
              mb: 8,
              lineHeight: 1.8,
            }}
          >
            The thinking that shapes every feature we build.
          </Typography>

          <Grid container spacing={5}>
            {philosophy.map((item, idx) => (
              <Grid size={{ xs: 12, md: 4 }} key={idx}>
                <Box
                  sx={{
                    p: 4,
                    borderRadius: lunitRadius['2xl'],
                    bgcolor: alpha(lunitColors.white, 0.03),
                    border: `1px solid ${alpha(lunitColors.white, 0.06)}`,
                    height: '100%',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      bgcolor: alpha(lunitColors.white, 0.05),
                      borderColor: alpha(lunitColors.teal, 0.2),
                    },
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: lunitTypography.fontFamilyHeading,
                      fontSize: '19px',
                      fontWeight: 400,
                      color: lunitColors.white,
                      mb: 2,
                    }}
                  >
                    {item.title}
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: lunitTypography.fontFamilyBody,
                      fontSize: '15px',
                      fontWeight: 300,
                      color: alpha(lunitColors.white, 0.7),
                      lineHeight: 1.75,
                    }}
                  >
                    {item.description}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Box>
      </ScrollReveal>

      {/* Team Section */}
      <PageSection paddingY="large">
        <Typography
          sx={{
            fontFamily: lunitTypography.fontFamilyHeading,
            fontSize: 'clamp(28px, 4vw, 44px)',
            fontWeight: 200,
            color: lunitColors.headingColor,
            textAlign: 'center',
            mb: 2,
            letterSpacing: '-0.01em',
          }}
        >
          The people behind the platform
        </Typography>
        <Typography
          sx={{
            fontFamily: lunitTypography.fontFamilyBody,
            fontSize: '17px',
            fontWeight: 300,
            color: lunitColors.text,
            textAlign: 'center',
            maxWidth: 600,
            mx: 'auto',
            mb: 8,
            lineHeight: 1.8,
          }}
        >
          A multidisciplinary team of engineers, researchers, and clinicians united by a shared mission—making AI work for healthcare.
        </Typography>

        <Grid container spacing={3}>
          {[
            { src: '/images/team/team-discussion-closeup-card.webp', alt: 'Close-up team discussion on AI models' },
            { src: '/images/team/team-collaboration-standing-card.webp', alt: 'Team collaborating around a whiteboard' },
            { src: '/images/team/team-planning-laptops-card.webp', alt: 'Team planning session with laptops' },
          ].map((img, idx) => (
            <Grid size={{ xs: 12, md: 4 }} key={idx}>
              <Box
                sx={{
                  borderRadius: lunitRadius['2xl'],
                  overflow: 'hidden',
                  aspectRatio: '3/2',
                  position: 'relative',
                  '&:hover img': {
                    transform: 'scale(1.04)',
                  },
                }}
              >
                <Box
                  component="img"
                  src={img.src}
                  alt={img.alt}
                  loading="lazy"
                  sx={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                    transition: 'transform 0.5s ease',
                  }}
                />
              </Box>
            </Grid>
          ))}
        </Grid>
      </PageSection>

      {/* Performance Hint Section - Subtle */}
      <PageSection paddingY="large" background="light">
        <Box sx={{ maxWidth: 800, mx: 'auto', textAlign: 'center' }}>
          <Verified sx={{ fontSize: 48, color: lunitColors.teal, mb: 3, opacity: 0.8 }} />
          <Typography
            sx={{
              fontFamily: lunitTypography.fontFamilyHeading,
              fontSize: 'clamp(26px, 4vw, 40px)',
              fontWeight: 200,
              color: lunitColors.headingColor,
              mb: 3,
              letterSpacing: '-0.01em',
            }}
          >
            Validated for clinical confidence
          </Typography>
          <Typography
            sx={{
              fontFamily: lunitTypography.fontFamilyBody,
              fontSize: '17px',
              fontWeight: 300,
              color: lunitColors.text,
              lineHeight: 1.8,
              mb: 4,
            }}
          >
            Our models undergo rigorous validation against established clinical benchmarks. 
            The result is performance that radiologists can rely on—competitive accuracy paired 
            with the transparency needed for confident decision-making.
          </Typography>
          <Box 
            sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              gap: 4, 
              flexWrap: 'wrap',
              mt: 5,
            }}
          >
            {['Sensitivity', 'Specificity', 'Precision'].map((metric) => (
              <Box key={metric} sx={{ textAlign: 'center' }}>
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    bgcolor: alpha(lunitColors.teal, 0.08),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 1.5,
                  }}
                >
                  <TrendingUp sx={{ fontSize: 28, color: lunitColors.teal }} />
                </Box>
                <Typography
                  sx={{
                    fontFamily: lunitTypography.fontFamilyBody,
                    fontSize: '14px',
                    fontWeight: 500,
                    color: lunitColors.headingColor,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                  }}
                >
                  {metric}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: lunitTypography.fontFamilyBody,
                    fontSize: '13px',
                    fontWeight: 300,
                    color: lunitColors.text,
                    mt: 0.5,
                  }}
                >
                  Clinically competitive
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </PageSection>

      {/* Journey Section */}
      <PageSection paddingY="large">
        <Typography
          sx={{
            fontFamily: lunitTypography.fontFamilyHeading,
            fontSize: 'clamp(28px, 4vw, 44px)',
            fontWeight: 200,
            color: lunitColors.headingColor,
            textAlign: 'center',
            mb: 2,
            letterSpacing: '-0.01em',
          }}
        >
          Our journey
        </Typography>
        <Typography
          sx={{
            fontFamily: lunitTypography.fontFamilyBody,
            fontSize: '17px',
            fontWeight: 300,
            color: lunitColors.text,
            textAlign: 'center',
            maxWidth: 550,
            mx: 'auto',
            mb: 6,
          }}
        >
          From foundational research to clinical-ready platform.
        </Typography>

        {/* Phase Toggle */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            gap: 2,
            mb: 6,
          }}
        >
          {phases.map((phase) => (
            <Button
              key={phase}
              onClick={() => setSelectedPhase(phase)}
              sx={{
                fontFamily: lunitTypography.fontFamilyBody,
                fontSize: '15px',
                fontWeight: selectedPhase === phase ? 500 : 400,
                color: selectedPhase === phase ? lunitColors.teal : lunitColors.darkGrey,
                bgcolor: selectedPhase === phase ? alpha(lunitColors.teal, 0.08) : 'transparent',
                px: 3,
                py: 1.5,
                borderRadius: lunitRadius.full,
                transition: 'all 0.3s ease',
                '&:hover': {
                  bgcolor: alpha(lunitColors.teal, 0.08),
                },
              }}
            >
              {phase}
            </Button>
          ))}
        </Box>

        {/* Milestone Cards */}
        <Grid container spacing={3}>
          {milestones[selectedPhase as keyof typeof milestones].map((item, idx) => (
            <Grid size={{ xs: 12, md: 4 }} key={idx}>
              <Box
                sx={{
                  p: 4,
                  borderRadius: lunitRadius['2xl'],
                  bgcolor: lunitColors.lightestGray,
                  height: '100%',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    bgcolor: lunitColors.white,
                    boxShadow: lunitShadows.cardHoverTeal,
                  },
                }}
              >
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    bgcolor: alpha(lunitColors.teal, 0.1),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 2.5,
                  }}
                >
                  <Timeline sx={{ color: lunitColors.teal, fontSize: 20 }} />
                </Box>
                <Typography
                  sx={{
                    fontFamily: lunitTypography.fontFamilyHeading,
                    fontSize: '17px',
                    fontWeight: 500,
                    color: lunitColors.headingColor,
                    mb: 1.5,
                  }}
                >
                  {item.title}
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
                  {item.description}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </PageSection>

      {/* Closing Statement */}
      <ScrollReveal>
      <Box sx={{ bgcolor: lunitColors.darkerGray, py: { xs: 8, md: 10 } }}>
        <Box sx={{ maxWidth: 700, mx: 'auto', px: { xs: 3, md: 6 }, textAlign: 'center' }}>
          <Typography
            sx={{
              fontFamily: lunitTypography.fontFamilyHeading,
              fontSize: 'clamp(24px, 3vw, 36px)',
              fontWeight: 200,
              color: lunitColors.white,
              mb: 3,
              lineHeight: 1.4,
            }}
          >
            Where advanced AI meets clinical wisdom
          </Typography>
          <Typography
            sx={{
              fontFamily: lunitTypography.fontFamilyBody,
              fontSize: '16px',
              fontWeight: 300,
              color: alpha(lunitColors.white, 0.7),
              lineHeight: 1.8,
            }}
          >
            ClinicalVision represents a thoughtful approach to medical AI—one that respects 
            the complexity of clinical practice while delivering the insights that matter. 
            Built with care, validated with rigor.
          </Typography>
        </Box>
      </Box>
      </ScrollReveal>

      {/* CTA Section */}
      <CTASection
        title="Experience ClinicalVision"
        subtitle="See how AI-assisted analysis can support your clinical workflow with transparency and confidence."
        buttonText="Start Analysis"
        buttonPath="/analyze"
        variant="light"
      />
    </PageLayout>
  );
};

export default AboutPage;
