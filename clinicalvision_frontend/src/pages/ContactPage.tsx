import React, { useState } from 'react';
import { Box, Typography, Button, Grid, TextField, alpha, Collapse, Alert } from '@mui/material';
import SEOHead from '../components/shared/SEOHead';
import { Email, Phone, LocationOn, Send, Add, Remove, CheckCircle } from '@mui/icons-material';
import { PageLayout, PageSection, CTASection } from '../components/layout/PageLayout';
import { lunitColors, lunitTypography, lunitRadius, lunitShadows, lunitGradients } from '../styles/lunitDesignSystem';
import { api } from '../services/api';

const contactMethods = [
  {
    icon: <Email sx={{ fontSize: 32 }} />,
    title: 'Email Us',
    value: 'hello@clinicalvision.ai',
    description: 'Research enquiries and feedback',
  },
  {
    icon: <Phone sx={{ fontSize: 32 }} />,
    title: 'Call Us',
    value: '+44 7729 773519',
    description: 'Mon-Fri, 9am-6pm GMT',
  },
  {
    icon: <LocationOn sx={{ fontSize: 32 }} />,
    title: 'Visit Us',
    value: '24 Sandymount Avenue',
    description: 'Harrow, Middlesex, UK',
  },
];

const offices = [
  { city: 'Harrow', country: 'United Kingdom', type: 'UK Head Office' },
];

const faqs = [
  {
    question: 'Is ClinicalVision available for clinical use?',
    answer: 'No. ClinicalVision is a research prototype. It is not a medical device, it has not been cleared or registered with any regulator (MHRA, CE/UKCA, FDA), and it must not be used for any decision affecting a real patient.',
  },
  {
    question: 'What is ClinicalVision\'s regulatory status?',
    answer: 'ClinicalVision has no regulatory clearance or registration. Any future clinical use would require regulatory approval, including clinical validation, which has not been carried out.',
  },
  {
    question: 'How was the model evaluated?',
    answer: 'The research baseline was evaluated on a held-out split of the public CBIS-DDSM dataset (701 test lesions): AUC 0.80, with 79.6% sensitivity and 64.3% specificity at a 0.5 threshold. There has been no external, multi-site or prospective evaluation, and subgroup performance has not been measured. See the model card for details and limitations.',
  },
  {
    question: 'Can I try it?',
    answer: 'Yes, through the research demo. It uses publicly available CBIS-DDSM mammograms with fictional patient details. Do not upload real patient data.',
  },
  {
    question: 'Do you offer pricing, pilots or deployments?',
    answer: 'No. ClinicalVision is not a commercial product, and there are no pricing plans, pilot programmes or hospital deployments. If you are interested in research collaboration or have feedback, please get in touch.',
  },
];

const ContactPage: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    subject: '',
    message: '',
  });
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    try {
      await api.submitContactForm(formData);
      setSubmitted(true);
    } catch (err: any) {
      setSubmitError(err?.message || 'Failed to send message. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageLayout>
      <SEOHead
        title="Contact Us — Get in Touch"
        description="Contact the ClinicalVision research team about the research prototype, research collaboration or feedback. Not a medical device; not for clinical use."
        keywords={['contact ClinicalVision', 'mammography AI research', 'explainable AI research collaboration']}
        canonicalPath="/contact"
      />
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
            Contact
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
            Get in Touch
            <Box component="span" sx={{ display: 'block', color: lunitColors.teal }}>
              With Us
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
            Have questions about our platform? Our team is here to help you find the right solution for your practice.
          </Typography>
        </Box>
      </Box>

      {/* Contact Methods */}
      <PageSection background="light" paddingY="small">
        <Grid container spacing={4}>
          {contactMethods.map((method, idx) => (
            <Grid size={{ xs: 12, md: 4 }} key={idx}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 3,
                  p: 3,
                  borderRadius: lunitRadius['2xl'],
                  bgcolor: lunitColors.white,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: lunitShadows.cardHoverTeal,
                  },
                }}
              >
                <Box
                  sx={{
                    width: 64,
                    height: 64,
                    borderRadius: lunitRadius.lg,
                    bgcolor: alpha(lunitColors.teal, 0.1),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: lunitColors.teal,
                    flexShrink: 0,
                  }}
                >
                  {method.icon}
                </Box>
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
                    {method.title}
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: lunitTypography.fontFamilyBody,
                      fontSize: '16px',
                      fontWeight: 500,
                      color: lunitColors.teal,
                      mb: 0.5,
                    }}
                  >
                    {method.value}
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: lunitTypography.fontFamilyBody,
                      fontSize: '13px',
                      fontWeight: 300,
                      color: lunitColors.darkGrey,
                    }}
                  >
                    {method.description}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      </PageSection>

      {/* Contact Form & Offices */}
      <PageSection>
        <Grid container spacing={6}>
          {/* Form */}
          <Grid size={{ xs: 12, md: 7 }}>
            <Typography
              sx={{
                fontFamily: lunitTypography.fontFamilyHeading,
                fontSize: '28px',
                fontWeight: 400,
                color: lunitColors.headingColor,
                mb: 3,
              }}
            >
              Send Us a Message
            </Typography>
            {submitted ? (
              <Alert severity="success" icon={<CheckCircle />} sx={{ mb: 3 }}>
                Thank you! Your message has been sent successfully. We'll get back to you within 24 hours.
              </Alert>
            ) : (
            <Box component="form" onSubmit={handleSubmit}>
              {submitError && (
                <Alert severity="error" sx={{ mb: 2 }}>{submitError}</Alert>
              )}
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Full Name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: lunitRadius.md,
                        fontFamily: lunitTypography.fontFamilyBody,
                        '&:hover fieldset': { borderColor: lunitColors.grey },
                        '&.Mui-focused fieldset': { borderColor: lunitColors.teal },
                      },
                      '& .MuiInputLabel-root': {
                        fontFamily: lunitTypography.fontFamilyBody,
                        '&.Mui-focused': { color: lunitColors.teal },
                      },
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Email Address"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: lunitRadius.md,
                        fontFamily: lunitTypography.fontFamilyBody,
                        '&:hover fieldset': { borderColor: lunitColors.grey },
                        '&.Mui-focused fieldset': { borderColor: lunitColors.teal },
                      },
                      '& .MuiInputLabel-root': {
                        fontFamily: lunitTypography.fontFamilyBody,
                        '&.Mui-focused': { color: lunitColors.teal },
                      },
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Company"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: lunitRadius.md,
                        fontFamily: lunitTypography.fontFamilyBody,
                        '&:hover fieldset': { borderColor: lunitColors.grey },
                        '&.Mui-focused fieldset': { borderColor: lunitColors.teal },
                      },
                      '& .MuiInputLabel-root': {
                        fontFamily: lunitTypography.fontFamilyBody,
                        '&.Mui-focused': { color: lunitColors.teal },
                      },
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Subject"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: lunitRadius.md,
                        fontFamily: lunitTypography.fontFamilyBody,
                        '&:hover fieldset': { borderColor: lunitColors.grey },
                        '&.Mui-focused fieldset': { borderColor: lunitColors.teal },
                      },
                      '& .MuiInputLabel-root': {
                        fontFamily: lunitTypography.fontFamilyBody,
                        '&.Mui-focused': { color: lunitColors.teal },
                      },
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="Message"
                    multiline
                    rows={5}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: lunitRadius.md,
                        fontFamily: lunitTypography.fontFamilyBody,
                        '&:hover fieldset': { borderColor: lunitColors.grey },
                        '&.Mui-focused fieldset': { borderColor: lunitColors.teal },
                      },
                      '& .MuiInputLabel-root': {
                        fontFamily: lunitTypography.fontFamilyBody,
                        '&.Mui-focused': { color: lunitColors.teal },
                      },
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Button
                    type="submit"
                    variant="contained"
                    endIcon={<Send />}
                    sx={{
                      bgcolor: lunitColors.black,
                      color: lunitColors.white,
                      fontFamily: lunitTypography.fontFamilyBody,
                      fontWeight: 500,
                      textTransform: 'none',
                      borderRadius: lunitRadius.full,
                      px: 4,
                      py: 1.5,
                      '&:hover': {
                        bgcolor: lunitColors.teal,
                        color: lunitColors.black,
                      },
                    }}
                  >
                    {submitting ? 'Sending...' : 'Send Message'}
                  </Button>
                </Grid>
              </Grid>
            </Box>
            )}
          </Grid>

          {/* Offices */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Typography
              sx={{
                fontFamily: lunitTypography.fontFamilyHeading,
                fontSize: '28px',
                fontWeight: 400,
                color: lunitColors.headingColor,
                mb: 3,
              }}
            >
              Global Offices
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {offices.map((office, idx) => (
                <Box
                  key={idx}
                  sx={{
                    p: 3,
                    borderRadius: lunitRadius.lg,
                    bgcolor: lunitColors.lightestGray,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      bgcolor: alpha(lunitColors.teal, 0.08),
                    },
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: lunitTypography.fontFamilyBody,
                      fontSize: '11px',
                      fontWeight: 600,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: lunitColors.teal,
                      mb: 0.5,
                    }}
                  >
                    {office.type}
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: lunitTypography.fontFamilyHeading,
                      fontSize: '18px',
                      fontWeight: 500,
                      color: lunitColors.headingColor,
                    }}
                  >
                    {office.city}
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: lunitTypography.fontFamilyBody,
                      fontSize: '14px',
                      fontWeight: 300,
                      color: lunitColors.darkGrey,
                    }}
                  >
                    {office.country}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Grid>
        </Grid>
      </PageSection>

      {/* FAQ Section with Lunit-style accordion */}
      <PageSection background="light" paddingY="large">
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
          FAQ
        </Typography>
        <Typography
          sx={{
            fontFamily: lunitTypography.fontFamilyHeading,
            fontSize: 'clamp(28px, 4vw, 40px)',
            fontWeight: 300,
            color: lunitColors.headingColor,
            textAlign: 'center',
            mb: 6,
          }}
        >
          Frequently Asked Questions
        </Typography>

        <Box sx={{ maxWidth: 800, mx: 'auto' }}>
          {faqs.map((faq, idx) => (
            <Box
              key={idx}
              sx={{
                mb: 2,
                borderRadius: lunitRadius.lg,
                border: `1px solid ${alpha(lunitColors.darkerGray, 0.1)}`,
                bgcolor: lunitColors.white,
                overflow: 'hidden',
                transition: 'all 0.3s ease',
                background: `linear-gradient(180deg, rgba(0, 201, 234, 0.02) 0%, transparent 100%)`,
                '&:hover': {
                  borderColor: expandedFaq === idx ? lunitColors.teal : alpha(lunitColors.teal, 0.5),
                },
              }}
            >
              <Box
                onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                sx={{
                  p: 3,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                }}
              >
                <Typography
                  sx={{
                    fontFamily: lunitTypography.fontFamilyHeading,
                    fontSize: '18px',
                    fontWeight: 500,
                    color: lunitColors.headingColor,
                    pr: 2,
                  }}
                >
                  {faq.question}
                </Typography>
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    border: `1px solid ${expandedFaq === idx ? lunitColors.teal : lunitColors.grey}`,
                    bgcolor: expandedFaq === idx ? lunitColors.teal : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.3s ease',
                    flexShrink: 0,
                  }}
                >
                  {expandedFaq === idx ? (
                    <Remove sx={{ fontSize: 18, color: lunitColors.black }} />
                  ) : (
                    <Add sx={{ fontSize: 18, color: lunitColors.grey }} />
                  )}
                </Box>
              </Box>
              <Collapse in={expandedFaq === idx}>
                <Box sx={{ px: 3, pb: 3 }}>
                  <Typography
                    sx={{
                      fontFamily: lunitTypography.fontFamilyBody,
                      fontSize: '15px',
                      fontWeight: 300,
                      color: lunitColors.text,
                      lineHeight: 1.8,
                    }}
                  >
                    {faq.answer}
                  </Typography>
                </Box>
              </Collapse>
            </Box>
          ))}
        </Box>
      </PageSection>

      {/* CTA Section */}
      <CTASection
        title="Explore the Research Prototype"
        subtitle="Try the research demo on public CBIS-DDSM images. Not a medical device. Not for clinical use."
        buttonText="Try the Research Demo"
        buttonPath="/demo"
        variant="dark"
      />
    </PageLayout>
  );
};

export default ContactPage;
