import React from 'react';
import { Box, Typography, alpha } from '@mui/material';
import { PageLayout, PageHero, PageSection } from '../components/layout/PageLayout';
import { lunitColors, lunitTypography, lunitRadius } from '../styles/lunitDesignSystem';

const sections = [
  {
    title: '1. Acceptance of Terms',
    content: `By accessing or using ClinicalVision's services, you agree to be bound by these Terms of Use and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing our services.

These terms apply to all users, including healthcare professionals, administrators, and any other persons who access the platform.`,
  },
  {
    title: '2. Description of Services',
    content: `ClinicalVision provides AI-powered diagnostic assistance software for medical imaging analysis. Our services include:

• **Image Analysis**: AI-assisted analysis of mammography and other medical images
• **Diagnostic Support**: Computer-aided detection and decision support tools
• **Workflow Integration**: PACS and EHR integration capabilities
• **Reporting Tools**: Structured reporting and documentation assistance

**Important Notice**: Our services are designed to assist, not replace, qualified healthcare professionals. All diagnostic decisions remain the responsibility of licensed medical practitioners.`,
  },
  {
    title: '3. User Accounts',
    content: `To use our services, you must:

• Create an account with accurate, complete information
• Maintain the security of your account credentials
• Immediately notify us of any unauthorized access
• Be at least 18 years old and legally able to enter into contracts
• Have appropriate professional credentials for clinical use

You are responsible for all activities that occur under your account. We reserve the right to suspend or terminate accounts that violate these terms.`,
  },
  {
    title: '4. Intended Use & Limitations',
    content: `**Intended Use**: ClinicalVision is intended for use by qualified healthcare professionals as a diagnostic aid in clinical settings. It is cleared by the FDA for use in breast cancer screening and detection.

**Limitations**:
• Our AI provides decision support, not final diagnoses
• Results must be reviewed by qualified medical professionals
• The system should not be used as the sole basis for clinical decisions
• Performance may vary based on image quality and patient population
• The system is not intended for emergency or urgent care decisions`,
  },
  {
    title: '5. Data & Privacy',
    content: `Your use of our services is also governed by our Privacy Policy, which describes how we collect, use, and protect your data. Key points:

• We process medical imaging data solely to provide our services
• All data is encrypted and stored securely
• We maintain HIPAA compliance for protected health information
• You retain ownership of all patient data uploaded to our platform
• We do not sell personal or medical data to third parties`,
  },
  {
    title: '6. Intellectual Property',
    content: `**Our Property**: ClinicalVision and its licensors retain all rights to:
• Our AI models, algorithms, and software
• Trademarks, logos, and brand elements
• Documentation and training materials
• Any improvements derived from aggregated, de-identified usage data

**Your Property**: You retain all rights to:
• Patient data and medical images you upload
• Reports and clinical documentation you create
• Your organization's proprietary information`,
  },
  {
    title: '7. Fees & Payment',
    content: `• Subscription fees are billed in advance on a monthly or annual basis
• All fees are non-refundable except as required by law
• We may change pricing with 30 days' notice
• Failure to pay may result in service suspension
• Enterprise agreements may have custom billing terms

Detailed pricing information is available on our website and in your service agreement.`,
  },
  {
    title: '8. Warranty Disclaimer',
    content: `THE SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO:

• WARRANTIES OF MERCHANTABILITY
• FITNESS FOR A PARTICULAR PURPOSE
• NON-INFRINGEMENT
• ACCURACY OR COMPLETENESS OF RESULTS

We do not warrant that the services will be uninterrupted, error-free, or that defects will be corrected. No advice or information obtained from us creates any warranty not expressly stated in these terms.`,
  },
  {
    title: '9. Limitation of Liability',
    content: `TO THE MAXIMUM EXTENT PERMITTED BY LAW:

• ClinicalVision shall not be liable for any indirect, incidental, special, consequential, or punitive damages
• Our total liability shall not exceed the fees paid in the 12 months preceding the claim
• We are not liable for clinical decisions made using our services
• We are not responsible for third-party services or integrations

These limitations apply regardless of the theory of liability and even if we have been advised of the possibility of such damages.`,
  },
  {
    title: '10. Indemnification',
    content: `You agree to indemnify, defend, and hold harmless ClinicalVision and its officers, directors, employees, and agents from any claims, damages, losses, or expenses (including reasonable attorneys' fees) arising from:

• Your use of the services
• Your violation of these terms
• Your violation of any third-party rights
• Clinical decisions made using our services
• Your failure to comply with applicable laws or regulations`,
  },
  {
    title: '11. Termination',
    content: `**By You**: You may terminate your account at any time by contacting us. Prepaid fees are non-refundable.

**By Us**: We may suspend or terminate your access if:
• You breach these terms
• Your use poses a security risk
• Required by law
• You fail to pay applicable fees

Upon termination, your right to use the services ceases immediately. We will provide access to export your data for 30 days following termination.`,
  },
  {
    title: '12. Governing Law & Disputes',
    content: `These terms are governed by the laws of the State of California, without regard to conflict of law principles.

Any disputes shall be resolved through binding arbitration in San Francisco, California, except that either party may seek injunctive relief in court. Class action waivers apply to the maximum extent permitted by law.`,
  },
  {
    title: '13. Changes to Terms',
    content: `We reserve the right to modify these terms at any time. We will provide notice of material changes through:

• Email notification to registered users
• Prominent notice on our website
• In-app notifications

Your continued use after changes take effect constitutes acceptance. If you do not agree to modified terms, you must stop using our services.`,
  },
  {
    title: '14. Contact Information',
    content: `For questions about these Terms of Use:

**Email**: legal@clinicalvision.ai
**Address**: 548 Market Street, Suite 95673, San Francisco, CA 94104
**Phone**: +1 (888) 555-0123

For technical support, please visit our Support Center or email support@clinicalvision.ai.`,
  },
];

const TermsPage: React.FC = () => {
  return (
    <PageLayout>
      {/* Hero */}
      <PageHero
        label="Legal"
        title="Terms of Use"
        subtitle="Last updated: January 2024"
      />

      {/* Content */}
      <PageSection>
        <Box sx={{ maxWidth: '800px', mx: 'auto' }}>
          <Box
            sx={{
              p: 4,
              mb: 4,
              borderRadius: lunitRadius['2xl'],
              bgcolor: alpha(lunitColors.teal, 0.08),
              borderLeft: `4px solid ${lunitColors.teal}`,
            }}
          >
            <Typography
              sx={{
                fontFamily: lunitTypography.fontFamilyBody,
                fontSize: '15px',
                fontWeight: 400,
                color: lunitColors.text,
                lineHeight: 1.8,
              }}
            >
              Please read these Terms of Use carefully before using ClinicalVision's AI-powered diagnostic assistance platform. By using our services, you acknowledge that you have read, understood, and agree to be bound by these terms.
            </Typography>
          </Box>

          {sections.map((section, idx) => (
            <Box key={idx} sx={{ mb: 5 }}>
              <Typography
                sx={{
                  fontFamily: lunitTypography.fontFamilyHeading,
                  fontSize: '22px',
                  fontWeight: 500,
                  color: lunitColors.headingColor,
                  mb: 2,
                }}
              >
                {section.title}
              </Typography>
              <Typography
                component="div"
                sx={{
                  fontFamily: lunitTypography.fontFamilyBody,
                  fontSize: '15px',
                  fontWeight: 300,
                  color: lunitColors.text,
                  lineHeight: 1.9,
                  whiteSpace: 'pre-line',
                  '& strong': {
                    fontWeight: 500,
                    color: lunitColors.headingColor,
                  },
                }}
              >
                {section.content}
              </Typography>
            </Box>
          ))}
        </Box>
      </PageSection>
    </PageLayout>
  );
};

export default TermsPage;
