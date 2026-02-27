import React, { useState } from 'react';
import { Box, Typography, Button, Grid, TextField, alpha, Collapse, Alert } from '@mui/material';
import { Email, Phone, LocationOn, Send, Add, Remove, CheckCircle } from '@mui/icons-material';
import { PageLayout, PageSection, CTASection } from '../components/layout/PageLayout';
import { lunitColors, lunitTypography, lunitRadius, lunitShadows } from '../styles/lunitDesignSystem';
import { api } from '../services/api';

const contactMethods = [
  {
    icon: <Email sx={{ fontSize: 32 }} />,
    title: 'Email Us',
    value: 'hello@clinicalvision.ai',
    description: 'We respond within 24 hours',
  },
  {
    icon: <Phone sx={{ fontSize: 32 }} />,
    title: 'Call Us',
    value: '+1 (888) 555-0123',
    description: 'Mon-Fri, 9am-6pm EST',
  },
  {
    icon: <LocationOn sx={{ fontSize: 32 }} />,
    title: 'Visit Us',
    value: '548 Market Street, Suite 95673',
    description: 'San Francisco, CA 94104',
  },
];

const offices = [
  { city: 'San Francisco', country: 'United States', type: 'Headquarters' },
  { city: 'Boston', country: 'United States', type: 'Research' },
  { city: 'London', country: 'United Kingdom', type: 'Europe' },
  { city: 'Singapore', country: 'Singapore', type: 'Asia Pacific' },
];

const faqs = [
  {
    question: 'How quickly can we get started with ClinicalVision?',
    answer: 'Implementation typically takes 2-4 weeks depending on your existing infrastructure. Our team works closely with your IT department to ensure a smooth integration with your PACS and EHR systems.',
  },
  {
    question: 'What kind of training do you provide?',
    answer: 'We offer comprehensive onboarding including live training sessions, documentation, and dedicated support. Most radiologists become proficient within the first week of use.',
  },
  {
    question: 'Is ClinicalVision FDA cleared?',
    answer: 'Yes, ClinicalVision has received FDA 510(k) clearance and CE Mark certification under EU MDR. Our AI meets the highest regulatory standards for clinical use.',
  },
  {
    question: 'How does pricing work?',
    answer: 'We offer flexible pricing based on your volume and needs. Contact our sales team for a customized quote that fits your practice size and workflow requirements.',
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
      {/* Enhanced Hero */}
      <Box
        sx={{
          bgcolor: lunitColors.darkerGray,
          pt: { xs: 14, md: 18 },
          pb: { xs: 8, md: 12 },
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Multi-layer gradient overlays */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '60%',
            height: '100%',
            background: `radial-gradient(ellipse at 80% 20%, rgba(0, 201, 234, 0.12) 0%, transparent 50%)`,
            pointerEvents: 'none',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: '20%',
            width: '40%',
            height: '40%',
            background: `radial-gradient(ellipse at 50% 100%, rgba(86, 193, 77, 0.06) 0%, transparent 60%)`,
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
                    boxShadow: lunitShadows.cardHover,
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
        title="Ready to Transform Your Practice?"
        subtitle="Schedule a personalized demo with our team and see how ClinicalVision can enhance your diagnostic capabilities."
        buttonText="Request Demo"
        buttonPath="/demo"
        variant="dark"
      />
    </PageLayout>
  );
};

export default ContactPage;
