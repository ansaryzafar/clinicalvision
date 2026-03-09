import React, { useState, useMemo } from 'react';
import { Box, Typography, Grid, Button, alpha, Tooltip } from '@mui/material';
import {
  MenuBook,
  Code,
  PlayCircle,
  IntegrationInstructions,
  Security,
  Support,
  ArrowForward,
} from '@mui/icons-material';
import { PageLayout, PageHero, PageSection } from '../components/layout/PageLayout';
import { lunitColors, lunitTypography, lunitRadius, lunitShadows } from '../styles/lunitDesignSystem';

const docCategories = [
  {
    icon: <PlayCircle sx={{ fontSize: 32 }} />,
    title: 'Getting Started',
    description: 'Quick start guides, installation, and first steps with ClinicalVision.',
    links: ['Installation Guide', 'Quick Start Tutorial', 'Platform Overview', 'Authentication Setup'],
  },
  {
    icon: <Code sx={{ fontSize: 32 }} />,
    title: 'API Reference',
    description: 'Complete API documentation with endpoints, parameters, and examples.',
    links: ['REST API Overview', 'Authentication', 'Analysis Endpoints', 'Error Handling'],
  },
  {
    icon: <IntegrationInstructions sx={{ fontSize: 32 }} />,
    title: 'Integrations',
    description: 'Connect ClinicalVision with your existing healthcare systems.',
    links: ['PACS Integration', 'EHR Connectivity', 'HL7 FHIR', 'DICOM Workflows'],
  },
  {
    icon: <Security sx={{ fontSize: 32 }} />,
    title: 'Security & Compliance',
    description: 'Security best practices and compliance documentation.',
    links: ['UK GDPR Compliance', 'Data Encryption', 'Access Controls', 'Audit Logging'],
  },
  {
    icon: <MenuBook sx={{ fontSize: 32 }} />,
    title: 'User Guides',
    description: 'Detailed guides for using ClinicalVision features.',
    links: ['Analysis Workflow', 'Report Generation', 'Heatmap Interpretation', 'Batch Processing'],
  },
  {
    icon: <Support sx={{ fontSize: 32 }} />,
    title: 'Troubleshooting',
    description: 'Common issues, FAQs, and support resources.',
    links: ['Common Issues', 'Error Codes', 'Performance Tips', 'Contact Support'],
  },
];

const popularGuides = [
  {
    title: 'Integrating with Your PACS',
    description: 'Step-by-step guide to connecting ClinicalVision with your PACS system',
    readTime: '10 min read',
  },
  {
    title: 'Understanding AI Confidence Scores',
    description: 'How to interpret and use confidence scores in clinical decision-making',
    readTime: '8 min read',
  },
  {
    title: 'Batch Processing Best Practices',
    description: 'Optimize throughput when processing large volumes of studies',
    readTime: '12 min read',
  },
  {
    title: 'Setting Up SSO Authentication',
    description: 'Configure single sign-on with your identity provider',
    readTime: '15 min read',
  },
];

const DocumentationPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return docCategories;
    const q = searchQuery.toLowerCase();
    return docCategories
      .map((cat) => ({
        ...cat,
        links: cat.links.filter(
          (link) =>
            link.toLowerCase().includes(q) ||
            cat.title.toLowerCase().includes(q) ||
            cat.description.toLowerCase().includes(q),
        ),
      }))
      .filter((cat) => cat.links.length > 0);
  }, [searchQuery]);

  const handleSearch = () => {
    // Search is reactive via filteredCategories — this scrolls to results
    const section = document.getElementById('doc-categories');
    if (section) section.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <PageLayout>
      {/* Hero */}
      <PageHero
        label="Documentation"
        title={
          <>
            Everything You Need to{' '}
            <Box component="span" sx={{ color: lunitColors.teal }}>
              Get Started
            </Box>
          </>
        }
        subtitle="Comprehensive guides, API references, and resources to help you make the most of ClinicalVision."
      />

      {/* Search/Quick Links */}
      <PageSection background="light" paddingY="small">
        <Box
          sx={{
            maxWidth: '600px',
            mx: 'auto',
            textAlign: 'center',
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
            <Box
              component="input"
              placeholder="Search documentation..."
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === 'Enter') handleSearch();
              }}
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
            <Button
              variant="contained"
              onClick={handleSearch}
              sx={{
                bgcolor: lunitColors.black,
                color: lunitColors.white,
                fontFamily: lunitTypography.fontFamilyBody,
                fontWeight: 500,
                textTransform: 'none',
                borderRadius: lunitRadius.full,
                px: 3,
                '&:hover': {
                  bgcolor: lunitColors.teal,
                  color: lunitColors.black,
                },
              }}
            >
              Search
            </Button>
          </Box>
        </Box>
      </PageSection>

      {/* Documentation Categories */}
      <PageSection>
        <Box id="doc-categories">
        <Grid container spacing={4}>
          {filteredCategories.map((category, idx) => (
            <Grid size={{ xs: 12, md: 4 }} key={idx}>
              <Box
                sx={{
                  p: 4,
                  height: '100%',
                  borderRadius: lunitRadius['2xl'],
                  border: `1px solid ${alpha(lunitColors.darkerGray, 0.08)}`,
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
                  {category.icon}
                </Box>

                <Typography
                  sx={{
                    fontFamily: lunitTypography.fontFamilyHeading,
                    fontSize: '20px',
                    fontWeight: 500,
                    color: lunitColors.headingColor,
                    mb: 1,
                  }}
                >
                  {category.title}
                </Typography>

                <Typography
                  sx={{
                    fontFamily: lunitTypography.fontFamilyBody,
                    fontSize: '14px',
                    fontWeight: 300,
                    color: lunitColors.text,
                    lineHeight: 1.6,
                    mb: 3,
                  }}
                >
                  {category.description}
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {category.links.map((link, linkIdx) => (
                    <Tooltip key={linkIdx} title="Documentation coming soon" arrow>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          cursor: 'default',
                          '&:hover': {
                            '& .link-text': { color: lunitColors.teal },
                            '& .link-arrow': { transform: 'translateX(4px)' },
                          },
                        }}
                      >
                      <Typography
                        className="link-text"
                        sx={{
                          fontFamily: lunitTypography.fontFamilyBody,
                          fontSize: '14px',
                          fontWeight: 400,
                          color: lunitColors.darkerGray,
                          transition: 'color 0.2s ease',
                        }}
                      >
                        {link}
                      </Typography>
                      <ArrowForward
                        className="link-arrow"
                        sx={{
                          fontSize: 14,
                          color: lunitColors.grey,
                          transition: 'transform 0.2s ease',
                        }}
                      />
                    </Box>
                    </Tooltip>
                  ))}
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>

        {filteredCategories.length === 0 && searchQuery.trim() && (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Typography
              sx={{
                fontFamily: lunitTypography.fontFamilyBody,
                fontSize: '16px',
                color: lunitColors.darkGrey,
              }}
            >
              No documentation found for "{searchQuery}". Try a different search term.
            </Typography>
          </Box>
        )}
        </Box>
      </PageSection>

      {/* Popular Guides */}
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
            Popular
          </Typography>
          <Typography
            sx={{
              fontFamily: lunitTypography.fontFamilyHeading,
              fontSize: 'clamp(28px, 4vw, 40px)',
              fontWeight: 300,
              color: lunitColors.headingColor,
            }}
          >
            Most Read Guides
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {popularGuides.map((guide, idx) => (
            <Grid size={{ xs: 12, sm: 6 }} key={idx}>
              <Tooltip title="Guide coming soon" arrow>
              <Box
                sx={{
                  p: 3,
                  borderRadius: lunitRadius.lg,
                  bgcolor: lunitColors.white,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                  cursor: 'default',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: lunitShadows.cardHoverTeal,
                    '& .arrow': {
                      transform: 'translateX(4px)',
                      color: lunitColors.teal,
                    },
                  },
                }}
              >
                <Box sx={{ flex: 1 }}>
                  <Typography
                    sx={{
                      fontFamily: lunitTypography.fontFamilyHeading,
                      fontSize: '16px',
                      fontWeight: 500,
                      color: lunitColors.headingColor,
                      mb: 0.5,
                    }}
                  >
                    {guide.title}
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: lunitTypography.fontFamilyBody,
                      fontSize: '13px',
                      fontWeight: 300,
                      color: lunitColors.darkGrey,
                      mb: 1,
                    }}
                  >
                    {guide.description}
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: lunitTypography.fontFamilyBody,
                      fontSize: '12px',
                      fontWeight: 500,
                      color: lunitColors.teal,
                    }}
                  >
                    {guide.readTime}
                  </Typography>
                </Box>
                <ArrowForward
                  className="arrow"
                  sx={{
                    color: lunitColors.darkerGray,
                    transition: 'all 0.3s ease',
                  }}
                />
              </Box>
              </Tooltip>
            </Grid>
          ))}
        </Grid>
      </PageSection>
    </PageLayout>
  );
};

export default DocumentationPage;
