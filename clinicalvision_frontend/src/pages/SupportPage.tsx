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
    icon: <Email sx={{ fontSize: 32 }} />,
    title: 'Contact Form',
    description: 'Send research enquiries or feedback',
    availability: 'No guaranteed response time',
    action: 'Contact Us',
  },
];

const faqs = [
  {
    question: 'What is ClinicalVision\'s regulatory status?',
    answer: 'ClinicalVision is a research prototype. It is not a medical device and has no regulatory clearance or registration from any authority. It must not be used for any decision affecting a real patient.',
  },
  {
    question: 'Does ClinicalVision integrate with PACS, RIS or EHR systems?',
    answer: 'Not at present. PACS, RIS and EHR integration is planned but has not been built or validated at any clinical site. The research demo works on public CBIS-DDSM images.',
  },
  {
    question: 'What encryption and data security measures protect patient information?',
    answer: 'The website and API are served over HTTPS (TLS 1.2 and 1.3). User accounts use hashed passwords and role-based access, and the application records audit log entries. There has been no independent penetration test or security audit, and the system holds no security certifications. Do not upload real patient data.',
  },
  {
    question: 'Does ClinicalVision use patient data to train its AI models?',
    answer: 'No. The models were trained on the public, de-identified CBIS-DDSM dataset. Images uploaded to the demo are not used to train the models. Do not upload real patient data.',
  },
  {
    question: 'What explainability tools are available for AI-generated predictions?',
    answer: 'The research prototype offers Grad-CAM heatmaps, plus LIME and SHAP endpoints. An experimental Monte Carlo Dropout uncertainty estimate is also computed; offline it was only a weak signal of model error (AUC 0.61). None of these have been validated with clinicians.',
  },
  {
    question: 'How are AI model updates validated?',
    answer: 'Model versions are evaluated on a held-out split of the public CBIS-DDSM dataset and documented in the model card. There is no external or prospective validation process, and no commitments are made about update notification or deployment windows.',
  },
  {
    question: 'What is the default data retention policy and can it be customised?',
    answer: 'No data retention policy has been formally defined or independently verified for this research prototype, and retention periods are not configurable. Do not upload real patient data. See the Privacy Policy for details on account data.',
  },
  {
    question: 'Does ClinicalVision monitor fairness across patient subgroups?',
    answer: 'Not yet. Subgroup performance has not been measured, and the fairness dashboard currently shows demonstration data only. Fairness monitoring is a planned capability.',
  },
  {
    question: 'Is support available?',
    answer: 'ClinicalVision is a research prototype with no support tiers, response-time guarantees or SLAs. Research enquiries and feedback can be sent through the contact page.',
  },
  {
    question: 'How does the Platform handle data subject access and erasure requests under UK GDPR?',
    answer: 'Requests about personal data, such as account details, can be sent through the contact page and will be handled on a best-effort basis. See the Privacy Policy for details.',
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
        title="Support — Research Prototype"
        description="ClinicalVision is a research prototype with no support tiers or SLAs. Read the FAQs or send a research enquiry through the contact page."
        keywords={['ClinicalVision support', 'ClinicalVision FAQ']}
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
            Research Prototype{' '}
            <Box component="span" sx={{ color: lunitColors.teal }}>
              Help
            </Box>
          </>
        }
        subtitle="ClinicalVision is a research prototype. There is no support team, support tier or response-time guarantee."
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
