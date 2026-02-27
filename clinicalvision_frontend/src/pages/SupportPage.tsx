import React, { useState } from 'react';
import { Box, Typography, Grid, Button, alpha, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import {
  Email,
  Chat,
  Phone,
  School,
  ExpandMore,
  Search,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { PageLayout, PageHero, PageSection, CTASection } from '../components/layout/PageLayout';
import { lunitColors, lunitTypography, lunitRadius, lunitShadows } from '../styles/lunitDesignSystem';
import { ROUTES } from '../routes/paths';

const supportChannels = [
  {
    icon: <Chat sx={{ fontSize: 32 }} />,
    title: 'Live Chat',
    description: 'Get instant help from our support team',
    availability: 'Available 24/7',
    action: 'Start Chat',
  },
  {
    icon: <Email sx={{ fontSize: 32 }} />,
    title: 'Email Support',
    description: 'Send us a detailed message',
    availability: 'Response within 24 hours',
    action: 'Send Email',
  },
  {
    icon: <Phone sx={{ fontSize: 32 }} />,
    title: 'Phone Support',
    description: 'Speak directly with our team',
    availability: 'Mon-Fri, 9am-6pm EST',
    action: 'Call Now',
  },
  {
    icon: <School sx={{ fontSize: 32 }} />,
    title: 'Training',
    description: 'Schedule onboarding or refresher training',
    availability: 'By appointment',
    action: 'Book Session',
  },
];

const faqs = [
  {
    question: 'How do I reset my password?',
    answer: 'You can reset your password by clicking "Forgot Password" on the login page. Enter your email address and we\'ll send you a secure link to create a new password. For security, the link expires after 24 hours.',
  },
  {
    question: 'What image formats does ClinicalVision accept?',
    answer: 'ClinicalVision accepts DICOM format files, which is the standard for medical imaging. We support mammography studies including both CC (craniocaudal) and MLO (mediolateral oblique) views. JPEG and PNG formats are supported for demonstration purposes only.',
  },
  {
    question: 'How long does analysis take?',
    answer: 'Standard analysis completes in under 3 seconds per image. Batch processing of multiple studies may take longer depending on volume. Enterprise customers can access priority processing for time-sensitive cases.',
  },
  {
    question: 'Is my patient data secure?',
    answer: 'Yes, we employ enterprise-grade security measures including end-to-end encryption (TLS 1.3), at-rest encryption (AES-256), and strict access controls. We are HIPAA compliant and undergo regular third-party security audits.',
  },
  {
    question: 'Can I integrate ClinicalVision with my PACS?',
    answer: 'Yes, ClinicalVision integrates with all major PACS vendors. We support DICOM, HL7, and FHIR standards. Our implementation team will work with you to ensure seamless integration with your existing workflow.',
  },
  {
    question: 'What is your uptime guarantee?',
    answer: 'We maintain 99.99% uptime with redundant infrastructure across multiple data centers. Enterprise customers receive SLA guarantees with credits for any downtime exceeding guaranteed levels.',
  },
];

const SupportPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [expanded, setExpanded] = useState<string | false>(false);

  const handleSupportAction = (actionLabel: string) => {
    // Route all support actions to the contact page with context
    navigate(ROUTES.CONTACT);
  };

  const handleAccordionChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false);
  };

  return (
    <PageLayout>
      {/* Hero */}
      <PageHero
        label="Support"
        title={
          <>
            We're Here to{' '}
            <Box component="span" sx={{ color: lunitColors.teal }}>
              Help
            </Box>
          </>
        }
        subtitle="Get the assistance you need from our dedicated support team. We're committed to your success."
      />

      {/* Search */}
      <PageSection background="light" paddingY="small">
        <Box
          sx={{
            maxWidth: '600px',
            mx: 'auto',
          }}
        >
          <Box
            sx={{
              p: 2,
              px: 3,
              borderRadius: lunitRadius.full,
              bgcolor: lunitColors.white,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              boxShadow: lunitShadows.card,
            }}
          >
            <Search sx={{ color: lunitColors.grey }} />
            <Box
              component="input"
              placeholder="Search for help articles..."
              value={searchQuery}
              onChange={(e: any) => setSearchQuery(e.target.value)}
              sx={{
                flex: 1,
                border: 'none',
                outline: 'none',
                fontFamily: lunitTypography.fontFamilyBody,
                fontSize: '15px',
                color: lunitColors.headingColor,
                '&::placeholder': {
                  color: lunitColors.grey,
                },
              }}
            />
          </Box>
        </Box>
      </PageSection>

      {/* Support Channels */}
      <PageSection>
        <Grid container spacing={4}>
          {supportChannels.map((channel, idx) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={idx}>
              <Box
                sx={{
                  p: 3,
                  height: '100%',
                  borderRadius: lunitRadius['2xl'],
                  border: `1px solid ${alpha(lunitColors.darkerGray, 0.08)}`,
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    borderColor: lunitColors.teal,
                    boxShadow: lunitShadows.card,
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
                  {channel.icon}
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
                  {channel.title}
                </Typography>

                <Typography
                  sx={{
                    fontFamily: lunitTypography.fontFamilyBody,
                    fontSize: '14px',
                    fontWeight: 300,
                    color: lunitColors.text,
                    mb: 1,
                    flex: 1,
                  }}
                >
                  {channel.description}
                </Typography>

                <Typography
                  sx={{
                    fontFamily: lunitTypography.fontFamilyBody,
                    fontSize: '12px',
                    fontWeight: 500,
                    color: lunitColors.teal,
                    mb: 2,
                  }}
                >
                  {channel.availability}
                </Typography>

                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => handleSupportAction(channel.action)}
                  sx={{
                    borderColor: lunitColors.darkerGray,
                    color: lunitColors.darkerGray,
                    fontFamily: lunitTypography.fontFamilyBody,
                    fontWeight: 500,
                    textTransform: 'none',
                    borderRadius: lunitRadius.full,
                    '&:hover': {
                      borderColor: lunitColors.teal,
                      bgcolor: alpha(lunitColors.teal, 0.08),
                      color: lunitColors.teal,
                    },
                  }}
                >
                  {channel.action}
                </Button>
              </Box>
            </Grid>
          ))}
        </Grid>
      </PageSection>

      {/* FAQs */}
      <PageSection background="light">
        <Box sx={{ textAlign: 'center', mb: 6 }}>
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
            FAQ
          </Typography>
          <Typography
            sx={{
              fontFamily: lunitTypography.fontFamilyHeading,
              fontSize: 'clamp(28px, 4vw, 40px)',
              fontWeight: 300,
              color: lunitColors.headingColor,
            }}
          >
            Frequently Asked Questions
          </Typography>
        </Box>

        <Box sx={{ maxWidth: '800px', mx: 'auto' }}>
          {faqs.map((faq, idx) => (
            <Accordion
              key={idx}
              expanded={expanded === `panel${idx}`}
              onChange={handleAccordionChange(`panel${idx}`)}
              sx={{
                mb: 2,
                borderRadius: `${lunitRadius.lg} !important`,
                border: `1px solid ${alpha(lunitColors.darkerGray, 0.08)}`,
                boxShadow: 'none',
                '&:before': { display: 'none' },
                '&.Mui-expanded': {
                  margin: '0 0 16px 0',
                  borderColor: lunitColors.teal,
                },
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMore sx={{ color: lunitColors.teal }} />}
                sx={{
                  '& .MuiAccordionSummary-content': {
                    my: 2,
                  },
                }}
              >
                <Typography
                  sx={{
                    fontFamily: lunitTypography.fontFamilyHeading,
                    fontSize: '16px',
                    fontWeight: 500,
                    color: lunitColors.headingColor,
                  }}
                >
                  {faq.question}
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography
                  sx={{
                    fontFamily: lunitTypography.fontFamilyBody,
                    fontSize: '14px',
                    fontWeight: 300,
                    color: lunitColors.text,
                    lineHeight: 1.8,
                  }}
                >
                  {faq.answer}
                </Typography>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      </PageSection>

      {/* CTA */}
      <CTASection
        title="Still Need Help?"
        subtitle="Our support team is ready to assist you with any questions or issues."
        buttonText="Contact Support"
        buttonPath="/contact"
        variant="dark"
      />
    </PageLayout>
  );
};

export default SupportPage;
