import React, { useState } from 'react';
import { Box, Typography, Button, Grid, Switch, alpha, keyframes } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../routes/paths';
import { Check, Star } from '@mui/icons-material';
import { PageLayout, PageSection, CTASection } from '../components/layout/PageLayout';
import { lunitColors, lunitTypography, lunitShadows, lunitRadius, lunitGradients } from '../styles/lunitDesignSystem';

// Shine animation for popular badge
const shine = keyframes`
  0% { background-position: -100px; }
  100% { background-position: 200px; }
`;

const plans = [
  {
    name: 'Starter',
    description: 'For small practices getting started with AI diagnostics',
    monthlyPrice: 299,
    yearlyPrice: 249,
    features: [
      'Up to 500 analyses/month',
      'Single user license',
      'Standard support (email)',
      'Basic analytics dashboard',
      'DICOM viewer integration',
    ],
    highlighted: false,
  },
  {
    name: 'Professional',
    description: 'For growing practices with advanced needs',
    monthlyPrice: 799,
    yearlyPrice: 699,
    features: [
      'Up to 2,500 analyses/month',
      '5 user licenses',
      'Priority support (phone & email)',
      'Advanced analytics & reporting',
      'PACS integration',
      'Custom workflow automation',
      'API access',
    ],
    highlighted: true,
  },
  {
    name: 'Enterprise',
    description: 'For large healthcare organizations',
    monthlyPrice: null,
    yearlyPrice: null,
    features: [
      'Unlimited analyses',
      'Unlimited users',
      '24/7 dedicated support',
      'Custom analytics & compliance',
      'Full EHR/PACS integration',
      'On-premise deployment option',
      'SLA guarantees',
      'Custom AI model training',
    ],
    highlighted: false,
  },
];

const PricingPage: React.FC = () => {
  const navigate = useNavigate();
  const [isYearly, setIsYearly] = useState(true);

  return (
    <PageLayout>
      {/* Enhanced Hero */}
      <Box
        sx={{
          background: lunitGradients.pageBannerBg,
          pt: { xs: '80px', md: '120px' },
          pb: { xs: '60px', md: '100px' },
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Multi-layer gradient overlays */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background: lunitGradients.pageBannerOverlay,
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
              mb: 2,
            }}
          >
            Pricing
          </Typography>
          <Typography
            sx={{
              fontFamily: lunitTypography.fontFamilyHeading,
              fontSize: 'clamp(40px, 7vw, 72px)',
              fontWeight: 300,
              color: lunitColors.white,
              lineHeight: 1.1,
              mb: 3,
            }}
          >
            Simple, Transparent
            <Box component="span" sx={{ display: 'block', color: lunitColors.teal }}>
              Pricing
            </Box>
          </Typography>
          <Typography
            sx={{
              fontFamily: lunitTypography.fontFamilyBody,
              fontSize: 'clamp(16px, 2vw, 20px)',
              fontWeight: 300,
              color: alpha(lunitColors.white, 0.8),
              maxWidth: 550,
              lineHeight: 1.7,
            }}
          >
            Choose the plan that fits your practice. All plans include our core AI capabilities with no hidden fees.
          </Typography>
        </Box>
      </Box>

      {/* Toggle */}
      <PageSection background="white" paddingY="small">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, mb: 2 }}>
          <Typography
            sx={{
              fontFamily: lunitTypography.fontFamilyBody,
              fontSize: '16px',
              fontWeight: isYearly ? 300 : 500,
              color: isYearly ? lunitColors.grey : lunitColors.headingColor,
            }}
          >
            Monthly
          </Typography>
          <Switch
            checked={isYearly}
            onChange={() => setIsYearly(!isYearly)}
            sx={{
              '& .MuiSwitch-switchBase.Mui-checked': {
                color: lunitColors.teal,
              },
              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                backgroundColor: lunitColors.teal,
              },
            }}
          />
          <Typography
            sx={{
              fontFamily: lunitTypography.fontFamilyBody,
              fontSize: '16px',
              fontWeight: isYearly ? 500 : 300,
              color: isYearly ? lunitColors.headingColor : lunitColors.grey,
            }}
          >
            Yearly
          </Typography>
          {isYearly && (
            <Box
              sx={{
                px: 2,
                py: 0.5,
                borderRadius: lunitRadius.full,
                bgcolor: alpha(lunitColors.green, 0.1),
                color: lunitColors.green,
                fontFamily: lunitTypography.fontFamilyBody,
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              Save 20%
            </Box>
          )}
        </Box>
      </PageSection>

      {/* Pricing Cards */}
      <PageSection>
        <Grid container spacing={4} justifyContent="center">
          {plans.map((plan, idx) => (
            <Grid size={{ xs: 12, md: 4 }} key={idx}>
              <Box
                sx={{
                  p: 4,
                  height: '100%',
                  borderRadius: lunitRadius['2xl'],
                  bgcolor: plan.highlighted ? lunitColors.darkerGray : lunitColors.white,
                  border: plan.highlighted 
                    ? `2px solid ${lunitColors.teal}` 
                    : `1px solid ${alpha(lunitColors.darkerGray, 0.1)}`,
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                  overflow: 'hidden',
                  // Gradient overlay for highlighted card
                  ...(plan.highlighted && {
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      inset: 0,
                      background: lunitGradients.testimonialGradient,
                      pointerEvents: 'none',
                    },
                  }),
                  '&:hover': {
                    boxShadow: plan.highlighted 
                      ? '0 20px 60px rgba(0, 201, 234, 0.2)' 
                      : lunitShadows.cardHover,
                    transform: 'translateY(-8px)',
                  },
                }}
              >
                {plan.highlighted && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: -12,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      px: 3,
                      py: 0.5,
                      bgcolor: lunitColors.teal,
                      borderRadius: lunitRadius.full,
                      fontFamily: lunitTypography.fontFamilyBody,
                      fontSize: '12px',
                      fontWeight: 600,
                      color: lunitColors.black,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      // Shine animation
                      overflow: 'hidden',
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: '-100px',
                        width: '60px',
                        height: '100%',
                        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                        animation: `${shine} 3s ease-in-out infinite`,
                      },
                    }}
                  >
                    <Star sx={{ fontSize: 14 }} />
                    Most Popular
                  </Box>
                )}

                <Typography
                  sx={{
                    fontFamily: lunitTypography.fontFamilyHeading,
                    fontSize: '24px',
                    fontWeight: 500,
                    color: plan.highlighted ? lunitColors.white : lunitColors.headingColor,
                    mb: 1,
                  }}
                >
                  {plan.name}
                </Typography>

                <Typography
                  sx={{
                    fontFamily: lunitTypography.fontFamilyBody,
                    fontSize: '14px',
                    fontWeight: 300,
                    color: plan.highlighted ? lunitColors.grey : lunitColors.text,
                    mb: 3,
                    minHeight: '40px',
                  }}
                >
                  {plan.description}
                </Typography>

                <Box sx={{ mb: 4 }}>
                  {plan.monthlyPrice ? (
                    <>
                      <Typography
                        component="span"
                        sx={{
                          fontFamily: lunitTypography.fontFamilyHeading,
                          fontSize: '48px',
                          fontWeight: 300,
                          color: plan.highlighted ? lunitColors.teal : lunitColors.headingColor,
                        }}
                      >
                        ${isYearly ? plan.yearlyPrice : plan.monthlyPrice}
                      </Typography>
                      <Typography
                        component="span"
                        sx={{
                          fontFamily: lunitTypography.fontFamilyBody,
                          fontSize: '16px',
                          color: plan.highlighted ? lunitColors.grey : lunitColors.text,
                        }}
                      >
                        /month
                      </Typography>
                    </>
                  ) : (
                    <Typography
                      sx={{
                        fontFamily: lunitTypography.fontFamilyHeading,
                        fontSize: '32px',
                        fontWeight: 300,
                        color: plan.highlighted ? lunitColors.teal : lunitColors.headingColor,
                      }}
                    >
                      Custom
                    </Typography>
                  )}
                </Box>

                <Box sx={{ flex: 1, mb: 4 }}>
                  {plan.features.map((feature, fIdx) => (
                    <Box
                      key={fIdx}
                      sx={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 1.5,
                        mb: 2,
                      }}
                    >
                      <Check
                        sx={{
                          fontSize: 20,
                          color: lunitColors.teal,
                          mt: 0.25,
                        }}
                      />
                      <Typography
                        sx={{
                          fontFamily: lunitTypography.fontFamilyBody,
                          fontSize: '14px',
                          fontWeight: 300,
                          color: plan.highlighted ? lunitColors.grey : lunitColors.text,
                        }}
                      >
                        {feature}
                      </Typography>
                    </Box>
                  ))}
                </Box>

                <Button
                  variant="contained"
                  fullWidth
                  onClick={() => navigate(plan.monthlyPrice ? ROUTES.DEMO : ROUTES.CONTACT)}
                  sx={{
                    bgcolor: plan.highlighted ? lunitColors.teal : lunitColors.black,
                    color: plan.highlighted ? lunitColors.black : lunitColors.white,
                    fontFamily: lunitTypography.fontFamilyBody,
                    fontWeight: 500,
                    textTransform: 'none',
                    borderRadius: lunitRadius.full,
                    py: 1.5,
                    '&:hover': {
                      bgcolor: plan.highlighted ? lunitColors.white : lunitColors.teal,
                      color: lunitColors.black,
                    },
                  }}
                >
                  {plan.monthlyPrice ? 'Start Free Trial' : 'Contact Sales'}
                </Button>
              </Box>
            </Grid>
          ))}
        </Grid>
      </PageSection>

      {/* FAQ Teaser */}
      <CTASection
        title="Have Questions About Pricing?"
        subtitle="Our team is ready to help you find the right plan for your organization."
        buttonText="Contact Sales"
        buttonPath="/contact"
        variant="dark"
      />
    </PageLayout>
  );
};

export default PricingPage;
