import React, { useState } from 'react';
import { Box, Typography, Grid, alpha } from '@mui/material';
import { ArrowForward, CalendarMonth } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { PageLayout, PageHero, PageSection } from '../components/layout/PageLayout';
import { lunitColors, lunitTypography, lunitRadius, lunitShadows } from '../styles/lunitDesignSystem';
import { ROUTES } from '../routes/paths';

const featuredPost = {
  title: 'How AI is Transforming Breast Cancer Screening: A 2024 Outlook',
  excerpt: 'An in-depth look at the latest advances in AI-assisted mammography and what they mean for radiologists and patients worldwide.',
  date: 'January 15, 2024',
  category: 'Industry Insights',
  readTime: '8 min read',
};

const posts = [
  {
    title: 'Understanding BI-RADS Categories: A Clinician\'s Guide',
    excerpt: 'Breaking down the BI-RADS classification system and how AI can support consistent categorization.',
    date: 'January 10, 2024',
    category: 'Clinical Education',
    readTime: '6 min read',
  },
  {
    title: 'ClinicalVision Achieves 97.5% Sensitivity in Multi-Center Study',
    excerpt: 'Results from our latest clinical validation study across 12 healthcare institutions.',
    date: 'January 5, 2024',
    category: 'Research',
    readTime: '5 min read',
  },
  {
    title: 'Integrating AI into Your Radiology Workflow: Best Practices',
    excerpt: 'Practical tips for seamlessly incorporating AI assistance into your daily practice.',
    date: 'December 20, 2023',
    category: 'Implementation',
    readTime: '7 min read',
  },
  {
    title: 'The Role of Uncertainty Quantification in Medical AI',
    excerpt: 'Why knowing what the AI doesn\'t know is just as important as its predictions.',
    date: 'December 15, 2023',
    category: 'Technology',
    readTime: '9 min read',
  },
  {
    title: 'Patient Perspectives on AI in Cancer Screening',
    excerpt: 'Survey results reveal how patients feel about AI-assisted diagnostics.',
    date: 'December 10, 2023',
    category: 'Patient Experience',
    readTime: '5 min read',
  },
  {
    title: 'RSNA 2023: Key Takeaways for AI in Radiology',
    excerpt: 'Highlights and trends from the Radiological Society of North America annual meeting.',
    date: 'December 5, 2023',
    category: 'Events',
    readTime: '6 min read',
  },
];

const categories = ['All', 'Industry Insights', 'Clinical Education', 'Research', 'Technology', 'Implementation', 'Events'];

const BlogPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('All');

  const filteredPosts = selectedCategory === 'All'
    ? posts
    : posts.filter(p => p.category === selectedCategory);

  const handlePostClick = (postTitle: string) => {
    // Navigate to blog page with post slug as anchor
    const slug = postTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    navigate(`${ROUTES.BLOG}#${slug}`);
  };

  return (
    <PageLayout>
      {/* Hero */}
      <PageHero
        label="Blog"
        title={
          <>
            Insights & Updates from{' '}
            <Box component="span" sx={{ color: lunitColors.teal }}>
              ClinicalVision
            </Box>
          </>
        }
        subtitle="Stay informed about the latest in AI diagnostics, clinical best practices, and healthcare innovation."
      />

      {/* Categories */}
      <PageSection background="light" paddingY="small">
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          {categories.map((cat, idx) => (
            <Box
              key={idx}
              onClick={() => setSelectedCategory(cat)}
              role="button"
              tabIndex={0}
              sx={{
                px: 3,
                py: 1,
                borderRadius: lunitRadius.full,
                bgcolor: cat === selectedCategory ? lunitColors.black : 'transparent',
                color: cat === selectedCategory ? lunitColors.white : lunitColors.darkerGray,
                fontFamily: lunitTypography.fontFamilyBody,
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': {
                  bgcolor: cat === selectedCategory ? lunitColors.black : alpha(lunitColors.teal, 0.1),
                  color: cat === selectedCategory ? lunitColors.white : lunitColors.teal,
                },
              }}
            >
              {cat}
            </Box>
          ))}
        </Box>
      </PageSection>

      {/* Featured Post */}
      <PageSection paddingY="small">
        <Box
          role="button"
          onClick={() => handlePostClick(featuredPost.title)}
          sx={{
            p: 4,
            borderRadius: lunitRadius['2xl'],
            bgcolor: lunitColors.darkerGray,
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            gap: 4,
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            '&:hover': {
              boxShadow: lunitShadows.cardHover,
              '& .arrow': {
                transform: 'translateX(4px)',
              },
            },
          }}
        >
          <Box
            sx={{
              flex: 1,
              minWidth: { md: '300px' },
              height: { xs: '200px', md: 'auto' },
              borderRadius: lunitRadius.lg,
              bgcolor: alpha(lunitColors.teal, 0.2),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography
              sx={{
                fontFamily: lunitTypography.fontFamilyHeading,
                fontSize: '48px',
                fontWeight: 300,
                color: lunitColors.teal,
              }}
            >
              Featured
            </Typography>
          </Box>
          <Box sx={{ flex: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Box
                sx={{
                  px: 2,
                  py: 0.5,
                  borderRadius: lunitRadius.full,
                  bgcolor: alpha(lunitColors.teal, 0.2),
                  color: lunitColors.teal,
                  fontFamily: lunitTypography.fontFamilyBody,
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                {featuredPost.category}
              </Box>
              <Typography
                sx={{
                  fontFamily: lunitTypography.fontFamilyBody,
                  fontSize: '13px',
                  color: lunitColors.grey,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                }}
              >
                <CalendarMonth sx={{ fontSize: 14 }} />
                {featuredPost.date}
              </Typography>
            </Box>

            <Typography
              sx={{
                fontFamily: lunitTypography.fontFamilyHeading,
                fontSize: 'clamp(24px, 3vw, 32px)',
                fontWeight: 400,
                color: lunitColors.white,
                mb: 2,
              }}
            >
              {featuredPost.title}
            </Typography>

            <Typography
              sx={{
                fontFamily: lunitTypography.fontFamilyBody,
                fontSize: '15px',
                fontWeight: 300,
                color: lunitColors.grey,
                lineHeight: 1.7,
                mb: 3,
              }}
            >
              {featuredPost.excerpt}
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography
                sx={{
                  fontFamily: lunitTypography.fontFamilyBody,
                  fontSize: '14px',
                  fontWeight: 500,
                  color: lunitColors.teal,
                }}
              >
                Read More
              </Typography>
              <ArrowForward
                className="arrow"
                sx={{ fontSize: 16, color: lunitColors.teal, transition: 'transform 0.3s ease' }}
              />
            </Box>
          </Box>
        </Box>
      </PageSection>

      {/* Posts Grid */}
      <PageSection>
        <Grid container spacing={4}>
          {filteredPosts.map((post, idx) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={idx}>
              <Box
                role="button"
                onClick={() => handlePostClick(post.title)}
                sx={{
                  height: '100%',
                  borderRadius: lunitRadius['2xl'],
                  border: `1px solid ${alpha(lunitColors.darkerGray, 0.08)}`,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    borderColor: 'transparent',
                    boxShadow: lunitShadows.cardHover,
                    '& .arrow': {
                      transform: 'translateX(4px)',
                      color: lunitColors.teal,
                    },
                  },
                }}
              >
                <Box
                  sx={{
                    height: '140px',
                    bgcolor: lunitColors.lightestGray,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: lunitTypography.fontFamilyHeading,
                      fontSize: '24px',
                      fontWeight: 300,
                      color: lunitColors.grey,
                    }}
                  >
                    Blog
                  </Typography>
                </Box>

                <Box sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Typography
                      sx={{
                        fontFamily: lunitTypography.fontFamilyBody,
                        fontSize: '11px',
                        fontWeight: 600,
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                        color: lunitColors.teal,
                      }}
                    >
                      {post.category}
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: lunitTypography.fontFamilyBody,
                        fontSize: '12px',
                        color: lunitColors.grey,
                      }}
                    >
                      {post.date}
                    </Typography>
                  </Box>

                  <Typography
                    sx={{
                      fontFamily: lunitTypography.fontFamilyHeading,
                      fontSize: '18px',
                      fontWeight: 500,
                      color: lunitColors.headingColor,
                      mb: 1.5,
                      lineHeight: 1.4,
                    }}
                  >
                    {post.title}
                  </Typography>

                  <Typography
                    sx={{
                      fontFamily: lunitTypography.fontFamilyBody,
                      fontSize: '14px',
                      fontWeight: 300,
                      color: lunitColors.text,
                      lineHeight: 1.6,
                      mb: 2,
                    }}
                  >
                    {post.excerpt}
                  </Typography>

                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography
                      sx={{
                        fontFamily: lunitTypography.fontFamilyBody,
                        fontSize: '12px',
                        color: lunitColors.darkGrey,
                      }}
                    >
                      {post.readTime}
                    </Typography>
                    <ArrowForward
                      className="arrow"
                      sx={{
                        fontSize: 16,
                        color: lunitColors.darkerGray,
                        transition: 'all 0.3s ease',
                      }}
                    />
                  </Box>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      </PageSection>
    </PageLayout>
  );
};

export default BlogPage;
