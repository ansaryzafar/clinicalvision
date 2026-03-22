import React, { useState } from 'react';
import { Box, Typography, Grid, Button, alpha, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import SEOHead from '../components/shared/SEOHead';
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
    availability: 'Mon-Fri, 9am-6pm GMT',
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
    question: 'What is ClinicalVision\'s regulatory classification and compliance status?',
    answer: 'ClinicalVision is developed as a Software as a Medical Device (SaMD) clinical decision support tool following IEC 62304:2006+AMD1:2015, ISO 14971:2019, and ISO 13485:2016-aligned processes. We are actively preparing for MHRA registration in the UK and have designed our compliance architecture for regulatory portability across EU MDR 2017/745 and FDA AI/ML-based SaMD guidance. The Platform has not yet received regulatory clearance from any authority — contact us for our current regulatory roadmap and timeline.',
  },
  {
    question: 'How does the Platform integrate with existing PACS, RIS, and EHR infrastructure?',
    answer: 'ClinicalVision supports native DICOM ingestion and provides documented REST APIs for integration with Picture Archiving and Communication Systems, Radiology Information Systems, and Electronic Health Record platforms. We support DICOM, HL7 FHIR, and DICOMweb standards. Dedicated integration engineers are assigned during enterprise onboarding to ensure zero-disruption deployment.',
  },
  {
    question: 'What encryption and data security measures protect patient information?',
    answer: 'All data in transit is protected using TLS 1.3 with strong cipher suites. Data at rest is encrypted using AES-256. Infrastructure is hosted on enterprise-grade cloud platforms with role-based access control, multi-factor authentication, network segmentation, intrusion detection, and immutable audit logging. We conduct regular security reviews and are working towards independent penetration testing and formal security attestation as part of our security maturity programme.',
  },
  {
    question: 'Does ClinicalVision use patient data to train its AI models?',
    answer: 'No. Production models are trained exclusively on publicly available, de-identified datasets. Patient data uploaded by Platform users is never used for model training without explicit institutional consent, a formal Data Processing Agreement, and documented ethical approval. Any opted-in data undergoes full de-identification in accordance with ICO anonymisation guidance.',
  },
  {
    question: 'What explainability tools are available for AI-generated predictions?',
    answer: 'The Platform provides multiple explainability frameworks including Grad-CAM, Grad-CAM++, LIME, SHAP, and Integrated Gradients, enabling clinicians to inspect the evidential basis of each prediction. Uncertainty quantification via Monte Carlo Dropout provides epistemic uncertainty estimates, predictive entropy, and mutual information metrics to flag low-confidence cases for additional review.',
  },
  {
    question: 'How are AI model updates validated before production deployment?',
    answer: 'Every model update undergoes rigorous validation against clinical performance benchmarks, demographic bias analysis (demographic parity, equalised odds), and regression testing across held-out test sets. Enterprise customers receive advance notification of material updates with the option to review validation reports, and may schedule deployment windows to align with institutional change-management procedures.',
  },
  {
    question: 'What is the default data retention policy and can it be customised?',
    answer: 'Patient imaging data and AI analysis outputs are retained for 90 days from analysis by default. Institutional customers may configure extended or reduced retention periods through their service agreement. Upon expiry or account termination, data is securely deleted using NIST SP 800-88 compliant sanitisation methods. A 30-day data export window is provided following any termination.',
  },
  {
    question: 'What AI fairness monitoring and bias mitigation capabilities does the Platform offer?',
    answer: 'ClinicalVision monitors model performance across demographic groups using demographic parity and equalised odds metrics, aligned with the NIST AI Risk Management Framework and MHRA guidance on AI as a medical device. Fairness dashboards provide real-time visibility into model behaviour across patient subgroups, and bias reports are available on request for institutional governance review.',
  },
  {
    question: 'What are the available support tiers and response time guarantees?',
    answer: 'Standard support includes email response within 24 hours and access to our knowledge base. Professional tier adds priority queue with 4-hour response during business hours. Enterprise customers receive dedicated account management, 1-hour critical-issue response, 24/7 phone support, and custom SLA terms with uptime guarantees backed by service credits.',
  },
  {
    question: 'How does the Platform handle data subject access and erasure requests under UK GDPR?',
    answer: 'Data subject access requests (Article 15) and erasure requests (Article 17) are processed in full compliance with UK GDPR. Requests should be directed to legal@clinicalvision.ai. We respond within one calendar month, with provision for a two-month extension for complex requests. Where we act as data processor, requests are coordinated with the institutional data controller per the Data Processing Agreement.',
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
      <SEOHead
        title="Support — We're Here to Help"
        description="Get support for ClinicalVision AI. 24/7 live chat, email, and phone support. Access training sessions, FAQs, and compliance guidance for your practice."
        keywords={['ClinicalVision support', 'medical AI help', 'healthcare AI support', 'radiology AI customer service', 'ClinicalVision FAQ']}
        canonicalPath="/support"
        schemaType="faqPage"
        faqItems={faqs}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Support' },
        ]}
      />
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
                    boxShadow: lunitShadows.cardHoverTeal,
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
