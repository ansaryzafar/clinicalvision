/**
 * BlogPostPage — Individual Blog Article View
 *
 * Full-page article layout inspired by authoritative medical blogs:
 * - Google Health Blog: hero image, author byline, read time, H2 sections
 * - Radiology Business: category badge, author bio, related content grid
 * - TechTarget HealthTech Analytics: content type labels, structured layout
 *
 * Features:
 * - Breadcrumb navigation (Home > Blog > Article)
 * - Sticky table of contents sidebar (desktop)
 * - Author byline with avatar and role
 * - Numbered references with URLs
 * - Related articles grid (3 posts)
 * - Responsive design matching Lunit design system
 *
 * @module pages/BlogPostPage
 */

import React, { useMemo } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Typography,
  Container,
  alpha,
  Divider,
  Breadcrumbs,
  Link,
  Grid,
  useMediaQuery,
} from '@mui/material';
import {
  ArrowBack,
  CalendarMonth,
  AccessTime,
  ArrowForward,
  MenuBook,
  Share,
  ContentCopy,
} from '@mui/icons-material';
import { PageLayout } from '../components/layout/PageLayout';
import SEOHead from '../components/shared/SEOHead';
import { lunitColors, lunitTypography, lunitRadius, lunitShadows } from '../styles/lunitDesignSystem';
import { getPostBySlug, getRelatedPosts, type BlogPost, type BlogSection } from '../data/blogPosts';

// =============================================================================
// Table of Contents (desktop sidebar)
// =============================================================================

interface TOCProps {
  sections: BlogSection[];
  activeId: string;
}

const TableOfContents: React.FC<TOCProps> = ({ sections, activeId }) => (
  <Box
    component="nav"
    aria-label="Table of contents"
    sx={{
      position: 'sticky',
      top: 100,
      pl: 4,
      borderLeft: `2px solid ${alpha(lunitColors.teal, 0.2)}`,
    }}
  >
    <Typography
      sx={{
        fontFamily: lunitTypography.fontFamilyBody,
        fontSize: '11px',
        fontWeight: 600,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: lunitColors.grey,
        mb: 2,
      }}
    >
      In this article
    </Typography>
    {sections.map((section) => (
      <Box
        key={section.id}
        component="a"
        href={`#${section.id}`}
        sx={{
          display: 'block',
          py: 0.75,
          fontFamily: lunitTypography.fontFamilyBody,
          fontSize: '13px',
          fontWeight: section.id === activeId ? 500 : 300,
          color: section.id === activeId ? lunitColors.teal : lunitColors.darkGrey,
          textDecoration: 'none',
          transition: 'color 0.2s ease',
          lineHeight: 1.4,
          '&:hover': { color: lunitColors.teal },
        }}
      >
        {section.heading}
      </Box>
    ))}
  </Box>
);

// =============================================================================
// Author Byline
// =============================================================================

interface AuthorBylineProps {
  author: BlogPost['author'];
  date: string;
  readTime: string;
}

const AuthorByline: React.FC<AuthorBylineProps> = ({ author, date, readTime }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, my: 3 }}>
    {/* Avatar with initials */}
    <Box
      sx={{
        width: 48,
        height: 48,
        borderRadius: '50%',
        bgcolor: alpha(lunitColors.teal, 0.15),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <Typography
        sx={{
          fontFamily: lunitTypography.fontFamilyHeading,
          fontSize: '16px',
          fontWeight: 500,
          color: lunitColors.teal,
        }}
      >
        {author.name
          .split(' ')
          .filter((_, i, arr) => i === 0 || i === arr.length - 1)
          .map((n) => n[0])
          .join('')}
      </Typography>
    </Box>
    <Box>
      <Typography
        sx={{
          fontFamily: lunitTypography.fontFamilyBody,
          fontSize: '15px',
          fontWeight: 500,
          color: lunitColors.headingColor,
        }}
      >
        {author.name}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography
          sx={{
            fontFamily: lunitTypography.fontFamilyBody,
            fontSize: '13px',
            fontWeight: 300,
            color: lunitColors.darkGrey,
          }}
        >
          {author.role}
        </Typography>
        <Typography
          sx={{
            fontFamily: lunitTypography.fontFamilyBody,
            fontSize: '12px',
            color: lunitColors.grey,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
          }}
        >
          <CalendarMonth sx={{ fontSize: 13 }} />
          {date}
        </Typography>
        <Typography
          sx={{
            fontFamily: lunitTypography.fontFamilyBody,
            fontSize: '12px',
            color: lunitColors.grey,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
          }}
        >
          <AccessTime sx={{ fontSize: 13 }} />
          {readTime}
        </Typography>
      </Box>
    </Box>
  </Box>
);

// =============================================================================
// Article Section Renderer
// =============================================================================

interface ArticleSectionProps {
  section: BlogSection;
}

const ArticleSection: React.FC<ArticleSectionProps> = ({ section }) => (
  <Box
    id={section.id}
    component="section"
    sx={{
      mb: 5,
      scrollMarginTop: '100px',
      // Rich content typography styles
      '& h2': {
        fontFamily: lunitTypography.fontFamilyHeading,
        fontSize: 'clamp(22px, 2.5vw, 28px)',
        fontWeight: 500,
        color: lunitColors.headingColor,
        mb: 2.5,
        mt: 1,
      },
      '& p': {
        fontFamily: lunitTypography.fontFamilyBody,
        fontSize: '16px',
        fontWeight: 300,
        lineHeight: 1.85,
        color: lunitColors.text,
        mb: 2,
      },
      '& ul': {
        pl: 3,
        mb: 2,
      },
      '& li': {
        fontFamily: lunitTypography.fontFamilyBody,
        fontSize: '15px',
        fontWeight: 300,
        lineHeight: 1.8,
        color: lunitColors.text,
        mb: 1.5,
        '& strong': {
          fontWeight: 500,
          color: lunitColors.headingColor,
        },
      },
      '& strong': {
        fontWeight: 500,
        color: lunitColors.headingColor,
      },
      '& em': {
        fontStyle: 'italic',
      },
      '& blockquote': {
        borderLeft: `3px solid ${lunitColors.teal}`,
        pl: 3,
        py: 1,
        my: 3,
        mx: 0,
        bgcolor: alpha(lunitColors.teal, 0.04),
        borderRadius: `0 ${lunitRadius.md} ${lunitRadius.md} 0`,
        '& p, &': {
          fontFamily: lunitTypography.fontFamilyBody,
          fontSize: '16px',
          fontWeight: 400,
          fontStyle: 'italic',
          lineHeight: 1.7,
          color: lunitColors.darkerGray,
        },
      },
      '& a': {
        color: lunitColors.teal,
        textDecoration: 'underline',
        textUnderlineOffset: '3px',
        '&:hover': {
          color: lunitColors.tealDarker,
        },
      },
    }}
  >
    <Typography component="h2">{section.heading}</Typography>
    <Box dangerouslySetInnerHTML={{ __html: section.content }} />
  </Box>
);

// =============================================================================
// References Section
// =============================================================================

interface ReferencesProps {
  references: BlogPost['references'];
}

const ReferencesSection: React.FC<ReferencesProps> = ({ references }) => (
  <Box sx={{ mt: 6, pt: 4, borderTop: `1px solid ${alpha(lunitColors.lightGray, 0.5)}` }}>
    <Typography
      sx={{
        fontFamily: lunitTypography.fontFamilyHeading,
        fontSize: '20px',
        fontWeight: 500,
        color: lunitColors.headingColor,
        mb: 3,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
      }}
    >
      <MenuBook sx={{ fontSize: 20, color: lunitColors.teal }} />
      References
    </Typography>
    <Box component="ol" sx={{ pl: 3 }}>
      {references.map((ref) => (
        <Box
          component="li"
          key={ref.id}
          sx={{
            fontFamily: lunitTypography.fontFamilyBody,
            fontSize: '13px',
            fontWeight: 300,
            lineHeight: 1.7,
            color: lunitColors.darkGrey,
            mb: 1.5,
          }}
        >
          {ref.text}
          {ref.url && (
            <>
              {' '}
              <Link
                href={ref.url}
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  fontSize: '13px',
                  color: lunitColors.teal,
                  textDecoration: 'underline',
                  textUnderlineOffset: '2px',
                }}
              >
                [Link]
              </Link>
            </>
          )}
        </Box>
      ))}
    </Box>
  </Box>
);

// =============================================================================
// Related Posts Grid
// =============================================================================

interface RelatedPostsProps {
  posts: BlogPost[];
}

const RelatedPostsGrid: React.FC<RelatedPostsProps> = ({ posts }) => {
  const navigate = useNavigate();

  if (posts.length === 0) return null;

  return (
    <Box sx={{ mt: 8, pt: 6, borderTop: `1px solid ${alpha(lunitColors.lightGray, 0.5)}` }}>
      <Typography
        sx={{
          fontFamily: lunitTypography.fontFamilyHeading,
          fontSize: 'clamp(24px, 3vw, 32px)',
          fontWeight: 400,
          color: lunitColors.headingColor,
          mb: 4,
          textAlign: 'center',
        }}
      >
        Related Articles
      </Typography>
      <Grid container spacing={4}>
        {posts.map((post) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={post.slug}>
            <Box
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/blog/${post.slug}`)}
              onKeyDown={(e) => e.key === 'Enter' && navigate(`/blog/${post.slug}`)}
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
              <Box sx={{ height: '140px', overflow: 'hidden' }}>
                <Box
                  component="img"
                  src={post.image}
                  alt={post.imageAlt}
                  loading="lazy"
                  sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
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
                    {post.readTime}
                  </Typography>
                </Box>
                <Typography
                  sx={{
                    fontFamily: lunitTypography.fontFamilyHeading,
                    fontSize: '17px',
                    fontWeight: 500,
                    color: lunitColors.headingColor,
                    mb: 1.5,
                    lineHeight: 1.4,
                  }}
                >
                  {post.title}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                  <ArrowForward
                    className="arrow"
                    sx={{ fontSize: 16, color: lunitColors.darkerGray, transition: 'all 0.3s ease' }}
                  />
                </Box>
              </Box>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

// =============================================================================
// Share Buttons (inspired by Google Health Blog + Radiology Business)
// =============================================================================

interface ShareBarProps {
  title: string;
  slug: string;
}

const ShareBar: React.FC<ShareBarProps> = ({ title, slug }) => {
  const [copied, setCopied] = React.useState(false);
  const articleUrl = `https://clinicalvision.ai/blog/${slug}`;
  const encodedUrl = encodeURIComponent(articleUrl);
  const encodedTitle = encodeURIComponent(title);

  const shareLinks = [
    {
      label: 'LinkedIn',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      color: '#0A66C2',
    },
    {
      label: 'X',
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      color: lunitColors.darkerGray,
    },
  ];

  const handleCopy = () => {
    navigator.clipboard.writeText(articleUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 2 }}>
      <Share sx={{ fontSize: 15, color: lunitColors.grey }} />
      {shareLinks.map((link) => (
        <Box
          key={link.label}
          component="a"
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            px: 1.5,
            py: 0.5,
            borderRadius: lunitRadius.full,
            border: `1px solid ${alpha(lunitColors.lightGray, 0.6)}`,
            fontFamily: lunitTypography.fontFamilyBody,
            fontSize: '12px',
            fontWeight: 500,
            color: lunitColors.darkGrey,
            textDecoration: 'none',
            transition: 'all 0.2s ease',
            '&:hover': {
              borderColor: link.color,
              color: link.color,
              bgcolor: alpha(link.color, 0.06),
            },
          }}
        >
          {link.label}
        </Box>
      ))}
      <Box
        component="button"
        onClick={handleCopy}
        sx={{
          px: 1.5,
          py: 0.5,
          borderRadius: lunitRadius.full,
          border: `1px solid ${alpha(lunitColors.lightGray, 0.6)}`,
          bgcolor: copied ? alpha(lunitColors.teal, 0.08) : 'transparent',
          fontFamily: lunitTypography.fontFamilyBody,
          fontSize: '12px',
          fontWeight: 500,
          color: copied ? lunitColors.teal : lunitColors.darkGrey,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          transition: 'all 0.2s ease',
          '&:hover': {
            borderColor: lunitColors.teal,
            color: lunitColors.teal,
          },
        }}
      >
        <ContentCopy sx={{ fontSize: 13 }} />
        {copied ? 'Copied!' : 'Copy link'}
      </Box>
    </Box>
  );
};

// =============================================================================
// Main BlogPostPage Component
// =============================================================================

const BlogPostPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const isDesktop = useMediaQuery('(min-width:1024px)');

  const post = useMemo(() => (slug ? getPostBySlug(slug) : undefined), [slug]);
  const relatedPosts = useMemo(() => (post ? getRelatedPosts(post) : []), [post]);

  // Active TOC section tracking
  const [activeSection, setActiveSection] = React.useState('');

  React.useEffect(() => {
    if (!post) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((e) => e.isIntersecting);
        if (visible) setActiveSection(visible.target.id);
      },
      { rootMargin: '-100px 0px -60% 0px', threshold: 0.1 },
    );

    post.sections.forEach((section) => {
      const el = document.getElementById(section.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [post]);

  // 404 fallback
  if (!post) {
    return (
      <PageLayout>
        <Container maxWidth="md" sx={{ py: 12, textAlign: 'center' }}>
          <Typography
            sx={{
              fontFamily: lunitTypography.fontFamilyHeading,
              fontSize: '48px',
              fontWeight: 400,
              color: lunitColors.headingColor,
              mb: 2,
            }}
          >
            Article not found
          </Typography>
          <Typography
            sx={{
              fontFamily: lunitTypography.fontFamilyBody,
              fontSize: '16px',
              color: lunitColors.darkGrey,
              mb: 4,
            }}
          >
            The blog post you&apos;re looking for doesn&apos;t exist or has been moved.
          </Typography>
          <Box
            component="button"
            onClick={() => navigate('/blog')}
            sx={{
              px: 4,
              py: 1.5,
              bgcolor: lunitColors.black,
              color: lunitColors.white,
              border: 'none',
              borderRadius: lunitRadius.full,
              fontFamily: lunitTypography.fontFamilyBody,
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              '&:hover': { bgcolor: lunitColors.teal, color: lunitColors.black },
            }}
          >
            Back to Blog
          </Box>
        </Container>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      {/* SEO Meta Tags */}
      <SEOHead
        title={post.title}
        description={post.seo.metaDescription}
        keywords={post.seo.keywords}
        canonicalPath={`/blog/${post.slug}`}
        ogType="article"
        ogImage={post.image}
        ogImageAlt={post.imageAlt}
        article={{
          publishedTime: post.isoDate,
          author: post.author.name,
          section: post.category,
        }}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Blog', path: '/blog' },
          { name: post.title },
        ]}
      />

      {/* Breadcrumbs */}
      <Box
        sx={{
          bgcolor: lunitColors.lightestGray,
          borderBottom: `1px solid ${alpha(lunitColors.lightGray, 0.5)}`,
          py: 2,
        }}
      >
        <Container maxWidth="lg">
          <Breadcrumbs
            separator="›"
            sx={{
              '& .MuiBreadcrumbs-separator': {
                color: lunitColors.grey,
                fontSize: '14px',
              },
            }}
          >
            <Link
              component={RouterLink}
              to="/"
              underline="hover"
              sx={{
                fontFamily: lunitTypography.fontFamilyBody,
                fontSize: '13px',
                color: lunitColors.darkGrey,
              }}
            >
              Home
            </Link>
            <Link
              component={RouterLink}
              to="/blog"
              underline="hover"
              sx={{
                fontFamily: lunitTypography.fontFamilyBody,
                fontSize: '13px',
                color: lunitColors.darkGrey,
              }}
            >
              Blog
            </Link>
            <Typography
              sx={{
                fontFamily: lunitTypography.fontFamilyBody,
                fontSize: '13px',
                color: lunitColors.teal,
                fontWeight: 500,
              }}
            >
              {post.category}
            </Typography>
          </Breadcrumbs>
        </Container>
      </Box>

      {/* Article Header */}
      <Box sx={{ bgcolor: lunitColors.white, py: { xs: 4, md: 6 } }}>
        <Container maxWidth="md">
          {/* Back button */}
          <Box
            component={RouterLink}
            to="/blog"
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              fontFamily: lunitTypography.fontFamilyBody,
              fontSize: '13px',
              fontWeight: 500,
              color: lunitColors.teal,
              textDecoration: 'none',
              mb: 3,
              '&:hover': { textDecoration: 'underline' },
            }}
          >
            <ArrowBack sx={{ fontSize: 16 }} />
            All articles
          </Box>

          {/* Category badge */}
          <Box
            sx={{
              display: 'inline-block',
              px: 2,
              py: 0.5,
              borderRadius: lunitRadius.full,
              bgcolor: alpha(lunitColors.teal, 0.12),
              color: lunitColors.tealDarker,
              fontFamily: lunitTypography.fontFamilyBody,
              fontSize: '12px',
              fontWeight: 600,
              letterSpacing: '0.03em',
              textTransform: 'uppercase',
              mb: 2,
            }}
          >
            {post.category}
          </Box>

          {/* Title */}
          <Typography
            component="h1"
            sx={{
              fontFamily: lunitTypography.fontFamilyHeading,
              fontSize: 'clamp(28px, 4vw, 42px)',
              fontWeight: 400,
              color: lunitColors.headingColor,
              lineHeight: 1.2,
              mb: 1,
            }}
          >
            {post.title}
          </Typography>

          {/* Excerpt */}
          <Typography
            sx={{
              fontFamily: lunitTypography.fontFamilyBody,
              fontSize: '18px',
              fontWeight: 300,
              color: lunitColors.darkGrey,
              lineHeight: 1.6,
            }}
          >
            {post.excerpt}
          </Typography>

          {/* Author byline */}
          <AuthorByline author={post.author} date={post.date} readTime={post.readTime} />

          {/* Share buttons */}
          <ShareBar title={post.title} slug={post.slug} />
        </Container>
      </Box>

      {/* Hero Image */}
      <Box sx={{ bgcolor: lunitColors.lightestGray }}>
        <Container maxWidth="lg" sx={{ px: { xs: 0, md: 3 } }}>
          <Box
            sx={{
              width: '100%',
              borderRadius: { xs: 0, md: lunitRadius['2xl'] },
              overflow: 'hidden',
            }}
          >
            <Box
              component="img"
              src={post.image}
              alt={post.imageAlt}
              sx={{
                width: '100%',
                maxHeight: '480px',
                display: 'block',
                objectFit: 'cover',
                objectPosition: 'center',
              }}
            />
          </Box>
        </Container>
      </Box>

      {/* Article Body + TOC Sidebar */}
      <Box sx={{ bgcolor: lunitColors.white, py: { xs: 4, md: 6 } }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', gap: 6 }}>
            {/* Main Content */}
            <Box sx={{ flex: 1, maxWidth: { md: '740px' }, mx: { xs: 'auto', lg: 0 } }}>
              {post.sections.map((section) => (
                <ArticleSection key={section.id} section={section} />
              ))}

              {/* References */}
              <ReferencesSection references={post.references} />
            </Box>

            {/* Desktop TOC Sidebar */}
            {isDesktop && (
              <Box sx={{ width: '280px', flexShrink: 0 }}>
                <TableOfContents sections={post.sections} activeId={activeSection} />
              </Box>
            )}
          </Box>
        </Container>
      </Box>

      {/* Divider */}
      <Divider />

      {/* Related Posts */}
      <Box sx={{ bgcolor: lunitColors.lightestGray, py: { xs: 4, md: 8 } }}>
        <Container maxWidth="lg">
          <RelatedPostsGrid posts={relatedPosts} />
        </Container>
      </Box>

      {/* Back to Blog CTA */}
      <Box sx={{ bgcolor: lunitColors.white, py: 6, textAlign: 'center' }}>
        <Container maxWidth="sm">
          <Typography
            sx={{
              fontFamily: lunitTypography.fontFamilyBody,
              fontSize: '14px',
              color: lunitColors.darkGrey,
              mb: 2,
            }}
          >
            Want to explore more insights?
          </Typography>
          <Box
            component={RouterLink}
            to="/blog"
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1,
              px: 4,
              py: 1.5,
              bgcolor: lunitColors.black,
              color: lunitColors.white,
              borderRadius: lunitRadius.full,
              fontFamily: lunitTypography.fontFamilyBody,
              fontSize: '14px',
              fontWeight: 500,
              textDecoration: 'none',
              transition: 'all 0.3s ease',
              '&:hover': {
                bgcolor: lunitColors.teal,
                color: lunitColors.black,
              },
            }}
          >
            View all articles
            <ArrowForward sx={{ fontSize: 16 }} />
          </Box>
        </Container>
      </Box>
    </PageLayout>
  );
};

export default BlogPostPage;
