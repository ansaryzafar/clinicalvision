import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Grid, alpha } from '@mui/material';
import { ArrowForward, CalendarMonth } from '@mui/icons-material';
import { PageLayout, PageHero, PageSection } from '../components/layout/PageLayout';
import SEOHead from '../components/shared/SEOHead';
import { lunitColors, lunitTypography, lunitRadius, lunitShadows } from '../styles/lunitDesignSystem';
import {
  getFeaturedPost,
  getNonFeaturedPosts,
  getPostsByCategory,
  BLOG_CATEGORIES,
} from '../data/blogPosts';

const featuredPost = getFeaturedPost();
const allNonFeaturedPosts = getNonFeaturedPosts();

const BlogPage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const navigate = useNavigate();

  const filteredPosts = selectedCategory === 'All'
    ? allNonFeaturedPosts
    : getPostsByCategory(selectedCategory);

  const handlePostClick = (slug: string) => {
    navigate(`/blog/${slug}`);
  };

  return (
    <PageLayout>
      <SEOHead
        title="Blog — Insights & Updates"
        description="Stay informed about the latest in AI diagnostics, clinical best practices, and healthcare innovation from ClinicalVision."
        keywords={['AI healthcare blog', 'breast cancer AI', 'medical imaging insights', 'radiology AI']}
        canonicalPath="/blog"
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Blog' },
        ]}
      />

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
          {BLOG_CATEGORIES.map((cat, idx) => (
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
          onClick={() => handlePostClick(featuredPost.slug)}
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
              boxShadow: lunitShadows.cardHoverTeal,
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
              minHeight: { md: '280px' },
              borderRadius: lunitRadius.lg,
              overflow: 'hidden',
            }}
          >
            <Box
              component="img"
              src={featuredPost.image}
              alt={featuredPost.title}
              loading="lazy"
              sx={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
            />
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
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={post.slug}>
              <Box
                role="button"
                onClick={() => handlePostClick(post.slug)}
                sx={{
                  height: '100%',
                  borderRadius: lunitRadius['2xl'],
                  border: `1px solid ${alpha(lunitColors.darkerGray, 0.08)}`,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    borderColor: 'transparent',
                    boxShadow: lunitShadows.cardHoverTeal,
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
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    component="img"
                    src={post.image}
                    alt={post.title}
                    loading="lazy"
                    sx={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                  />
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
