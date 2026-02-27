import React from 'react';
import { Box, Typography, alpha } from '@mui/material';
import { PageLayout, PageHero, PageSection } from '../components/layout/PageLayout';
import { lunitColors, lunitTypography, lunitRadius } from '../styles/lunitDesignSystem';

const sections = [
  {
    title: '1. Information We Collect',
    content: `We collect information you provide directly to us, such as when you create an account, use our services, or contact us for support. This includes:

• **Account Information**: Name, email address, professional credentials, and organization details.
• **Medical Imaging Data**: DICOM images and associated metadata uploaded for analysis. We process this data solely to provide our diagnostic assistance services.
• **Usage Data**: Information about how you interact with our platform, including features used, analysis requests, and session duration.
• **Technical Data**: Device information, IP address, browser type, and operating system.`,
  },
  {
    title: '2. How We Use Your Information',
    content: `We use the information we collect to:

• Provide, maintain, and improve our AI diagnostic services
• Process and analyze medical images as requested
• Send service-related communications and updates
• Respond to your comments, questions, and support requests
• Monitor and analyze trends, usage, and activities
• Detect, investigate, and prevent security incidents
• Comply with legal obligations and regulatory requirements`,
  },
  {
    title: '3. Data Security & Protection',
    content: `We implement robust security measures to protect your data:

• **Encryption**: All data is encrypted in transit (TLS 1.3) and at rest (AES-256).
• **Access Controls**: Role-based access controls limit data access to authorized personnel.
• **Audit Logging**: Comprehensive logs track all data access and system activities.
• **Infrastructure Security**: Our systems are hosted in SOC 2 Type II certified data centers.
• **Regular Testing**: We conduct regular penetration testing and vulnerability assessments.`,
  },
  {
    title: '4. HIPAA Compliance',
    content: `ClinicalVision is designed to be HIPAA-compliant:

• We enter into Business Associate Agreements (BAAs) with covered entities
• We implement all required administrative, physical, and technical safeguards
• We maintain policies and procedures for breach notification
• We conduct regular risk assessments and employee training
• We limit PHI use to the minimum necessary for service delivery`,
  },
  {
    title: '5. Data Retention',
    content: `We retain your data only as long as necessary:

• **Account Data**: Retained while your account is active plus 7 years for compliance
• **Analysis Data**: Retained for 90 days unless you request extended retention
• **Audit Logs**: Retained for 7 years per healthcare regulatory requirements
• **De-identified Data**: May be retained indefinitely for research and improvement

You may request deletion of your data at any time, subject to legal retention requirements.`,
  },
  {
    title: '6. Data Sharing',
    content: `We do not sell your personal information. We may share data with:

• **Service Providers**: Third parties who assist in operating our services (under strict confidentiality)
• **Legal Requirements**: When required by law, subpoena, or government request
• **Business Transfers**: In connection with a merger, acquisition, or sale of assets
• **With Consent**: When you have given explicit consent to share

All third-party processors are vetted for security and compliance.`,
  },
  {
    title: '7. Your Rights',
    content: `You have the right to:

• **Access**: Request a copy of your personal data
• **Correction**: Request correction of inaccurate data
• **Deletion**: Request deletion of your data (subject to legal requirements)
• **Portability**: Receive your data in a structured, machine-readable format
• **Restriction**: Request restriction of processing in certain circumstances
• **Objection**: Object to processing based on legitimate interests

To exercise these rights, contact us at privacy@clinicalvision.ai.`,
  },
  {
    title: '8. International Data Transfers',
    content: `If you are located outside the United States, please note that we process and store data in the United States. We use appropriate safeguards for international transfers, including:

• Standard Contractual Clauses approved by relevant authorities
• Adequacy decisions where applicable
• Your explicit consent when required`,
  },
  {
    title: '9. Changes to This Policy',
    content: `We may update this Privacy Policy from time to time. We will notify you of any material changes by:

• Posting the new policy on this page with an updated effective date
• Sending you an email notification (for material changes)
• Displaying a notice within the platform

Your continued use after changes become effective constitutes acceptance of the updated policy.`,
  },
  {
    title: '10. Contact Us',
    content: `If you have questions about this Privacy Policy or our data practices:

**Email**: privacy@clinicalvision.ai
**Address**: 548 Market Street, Suite 95673, San Francisco, CA 94104
**Data Protection Officer**: dpo@clinicalvision.ai

For HIPAA-related inquiries, contact our Privacy Officer at hipaa@clinicalvision.ai.`,
  },
];

const PrivacyPage: React.FC = () => {
  return (
    <PageLayout>
      {/* Hero */}
      <PageHero
        label="Legal"
        title="Privacy Policy"
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
              At ClinicalVision, we take your privacy seriously. This policy explains how we collect, use, protect, and share information about you when you use our AI-powered diagnostic assistance platform. We are committed to HIPAA compliance and protecting the confidentiality of all health information.
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

export default PrivacyPage;
