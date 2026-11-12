/**
 * About Page - ClinicalVision AI
 * 
 * Elegant, sophisticated presentation with subtle hints at capabilities
 * without disclosing specific technical details or metrics.
 */

import React, { useState } from 'react';
import { Box, Typography, Grid, alpha, Button, Chip, Divider } from '@mui/material';
import SEOHead from '../components/shared/SEOHead';
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
    description: 'A DenseNet-121 ensemble trained on the public CBIS-DDSM mammography dataset.',
  },
  {
    icon: <Visibility sx={{ fontSize: 32 }} />,
    title: 'Transparent Reasoning',
    description: 'Grad-CAM heatmaps show which image regions influenced a prediction. They are an approximation, not a guarantee of the model\'s reasoning.',
  },
  {
    icon: <Shield sx={{ fontSize: 32 }} />,
    title: 'Confidence Scores',
    description: 'Monte Carlo dropout produces an uncertainty estimate. In our evaluation it is only a weak error signal.',
  },
  {
    icon: <HealthAndSafety sx={{ fontSize: 32 }} />,
    title: 'Honest Limitations',
    description: 'Not a medical device and not for clinical use. Fairness monitoring is planned and subgroup performance has not been measured.',
  },
];

// Philosophy and approach
const philosophy = [
  {
    title: 'Human-AI Collaboration',
    description: 'We believe AI should augment clinical expertise, not replace it. Any future clinical tool would need to support, not replace, radiologists. This prototype is not for clinical use.',
  },
  {
    title: 'Explainability by Design',
    description: 'We think healthcare AI should be inspectable. Analyses include heatmap visualizations, which are an approximate aid and have not been clinically validated.',
  },
  {
    title: 'Iterative Research',
    description: 'The model is refined through iterative experiments on public data. No clinical feedback has been incorporated.',
  },
];

// Milestones - high level, no specific metrics
const milestones = {
  'Present': [
    { title: 'Research Prototype', description: 'A working research prototype with a clinical-style workflow interface and a backend inference service. Not a medical device.' },
    { title: 'Benchmarked on a Public Dataset', description: 'Evaluated on a held-out split of CBIS-DDSM (AUC 0.80). No external or prospective validation has been carried out.' },
    { title: 'Fairness Monitoring (Planned)', description: 'Subgroup fairness monitoring is planned. Subgroup performance has not yet been measured.' },
  ],
  'Foundation': [
    { title: 'Clinical Dataset Training', description: 'Models trained on the public CBIS-DDSM mammography dataset.' },
    { title: 'Architecture Design', description: 'Ensemble of three DenseNet-121 models with Monte Carlo dropout inference.' },
    { title: 'Explainability Integration', description: 'Grad-CAM heatmap overlays for each analysis.' },
  ],
};

// What sets us apart
const differentiators = [
  {
    icon: <AutoAwesome />,
    label: 'Model Ensemble',
    hint: 'Three DenseNet-121 models averaged',
  },
  {
    icon: <TrendingUp />,
    label: 'Public-Benchmark Results',
    hint: 'AUC 0.80 on held-out CBIS-DDSM; no external validation',
  },
  {
    icon: <Biotech />,
    label: 'Research Prototype',
    hint: 'Standard published techniques; not peer-reviewed itself',
  },
  {
    icon: <Security />,
    label: 'Uncertainty Estimate',
    hint: 'Monte Carlo dropout; a weak signal in testing',
  },
];

const AboutPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedPhase, setSelectedPhase] = useState('Present');
  const phases = Object.keys(milestones);

  return (
    <PageLayout>
      <SEOHead
        title="About — ClinicalVision Research Prototype"
        description="ClinicalVision is a solo research prototype exploring explainable, uncertainty-aware deep learning for breast imaging. Not a medical device."
        keywords={['about ClinicalVision', 'explainable AI breast imaging']}
        canonicalPath="/about"
      />
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
            ClinicalVision is a solo research prototype exploring explainable AI for 
            breast imaging. It is not a medical device and is not for clinical use.
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
          The ideas guiding this research prototype.
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
          The person behind the prototype
        </Typography>
        <Typography
          sx={{
            fontFamily: lunitTypography.fontFamilyBody,
            fontSize: '18px',
            fontWeight: 400,
            color: lunitColors.headingColor,
            textAlign: 'center',
            mb: 0.5,
          }}
        >
          Zafar Ansary
        </Typography>
        <Typography
          sx={{
            fontFamily: lunitTypography.fontFamilyBody,
            fontSize: '15px',
            fontWeight: 300,
            color: lunitColors.text,
            textAlign: 'center',
            mb: 3,
          }}
        >
          AI &amp; Machine Learning Engineer · BSc Computer Science, AI &amp; Machine Learning,
          University of London
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 1, mb: 5 }}>
          {[
            'Machine Learning',
            'Deep Learning',
            'Generative AI',
            'Data Science',
            'Explainable AI',
            'ML Engineering',
            'Healthcare AI',
          ].map((area) => (
            <Chip
              key={area}
              label={area}
              variant="outlined"
              size="small"
              sx={{
                fontFamily: lunitTypography.fontFamilyBody,
                fontWeight: 300,
                color: lunitColors.text,
                borderColor: alpha(lunitColors.teal, 0.5),
              }}
            />
          ))}
        </Box>
        <Box sx={{ maxWidth: 720, mx: 'auto' }}>
          {[
            'ClinicalVision is a solo research project built by Zafar Ansary. His work spans machine learning, deep learning, generative AI, data science, explainable AI and end-to-end ML engineering, with a particular interest in applying AI to complex, high-impact domains such as healthcare.',
            'He treats AI as an engineering problem rather than only a modelling exercise, working through the full lifecycle:',
          ].map((text) => (
            <Typography
              key={text}
              sx={{
                fontFamily: lunitTypography.fontFamilyBody,
                fontSize: '17px',
                fontWeight: 300,
                color: lunitColors.text,
                lineHeight: 1.8,
                mb: 2.5,
              }}
            >
              {text}
            </Typography>
          ))}
          <Typography
            sx={{
              fontFamily: lunitTypography.fontFamilyBody,
              fontSize: '15px',
              fontWeight: 400,
              color: lunitColors.teal,
              lineHeight: 1.9,
              mb: 2.5,
              textAlign: 'center',
            }}
          >
            Problem definition → Data → Feature engineering → Model development → Evaluation →
            Explainability → Validation → Deployment → Monitoring
          </Typography>
          <Typography
            sx={{
              fontFamily: lunitTypography.fontFamilyBody,
              fontSize: '17px',
              fontWeight: 300,
              color: lunitColors.text,
              lineHeight: 1.8,
              mb: 2.5,
            }}
          >
            ClinicalVision is where those interests meet: deep learning for medical imaging,
            alongside explainability, uncertainty estimation, evaluation beyond accuracy, workflow
            orchestration, auditability and responsible-AI considerations. It explores the gap
            between a model that performs well in a notebook and an AI system that can be trusted,
            fitted into a workflow and maintained, which depends as much on understanding the
            clinical problem, the data, human interaction and the operating environment as on the
            choice of model.
          </Typography>
          <Typography
            sx={{
              fontFamily: lunitTypography.fontFamilyBody,
              fontSize: '15px',
              fontWeight: 300,
              color: alpha(lunitColors.text, 0.8),
              lineHeight: 1.8,
              textAlign: 'center',
            }}
          >
            ClinicalVision AI is an independent research prototype with plenty of room to grow, and
            conversations are welcome with clinicians, researchers and organisations who would like
            to collaborate, evaluate it or help shape what it becomes.
          </Typography>
        </Box>
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
            Evaluated on a public dataset
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
            The model was evaluated on a held-out split of the public CBIS-DDSM dataset
            (701 lesions): AUC 0.80, 79.6% sensitivity and 64.3% specificity at a 0.5 threshold.
            It has not been validated externally or prospectively and is not for clinical use.
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
            {[
              { name: 'Sensitivity', value: '79.6%' },
              { name: 'Specificity', value: '64.3%' },
              { name: 'AUC', value: '0.80' },
            ].map((metric) => (
              <Box key={metric.name} sx={{ textAlign: 'center' }}>
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
                  {metric.name}
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
                  {metric.value} (internal hold-out)
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
          Project status
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
          Where the research prototype stands today.
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
            A transparent research project
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
            ClinicalVision is an experiment in making medical image AI more inspectable. 
            Its results are preliminary, its limitations are documented, and it should not 
            be used for any decision about a real patient.
          </Typography>
        </Box>
      </Box>
      </ScrollReveal>

      {/* CTA Section */}
      <CTASection
        title="Experience ClinicalVision"
        subtitle="Try the research demo on fictional cases. Research use only."
        buttonText="Try the Research Demo"
        buttonPath="/demo"
        variant="light"
      />
    </PageLayout>
  );
};

export default AboutPage;
