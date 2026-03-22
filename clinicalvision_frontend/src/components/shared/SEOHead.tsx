/**
 * SEOHead — Reusable SEO Meta Tag Component
 *
 * Uses react-helmet-async to inject page-specific <head> elements:
 * - <title> and <meta description>
 * - Open Graph (Facebook/LinkedIn)
 * - Twitter Cards
 * - JSON-LD structured data (Article schema for blog posts)
 * - Canonical URL
 *
 * @module components/shared/SEOHead
 */

import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title: string;
  description: string;
  keywords?: string[];
  canonicalPath?: string;        // e.g. '/blog/my-article'
  ogType?: 'website' | 'article';
  ogImage?: string;              // absolute URL or path
  ogImageAlt?: string;
  article?: {
    publishedTime: string;       // ISO 8601
    author: string;
    section: string;             // category
  };
  noIndex?: boolean;
  schemaType?: 'website' | 'organization' | 'softwareApplication' | 'article' | 'faqPage';
  faqItems?: { question: string; answer: string }[];
  breadcrumbs?: { name: string; path?: string }[];
}

const SITE_URL = 'https://clinicalvision.ai';
const SITE_NAME = 'ClinicalVision AI';

const SEOHead: React.FC<SEOHeadProps> = ({
  title,
  description,
  keywords,
  canonicalPath,
  ogType = 'website',
  ogImage,
  ogImageAlt,
  article,
  noIndex = false,
  schemaType,
  faqItems,
  breadcrumbs,
}) => {
  const fullTitle = `${title} | ${SITE_NAME}`;
  const canonical = canonicalPath ? `${SITE_URL}${canonicalPath}` : undefined;
  const imageUrl = ogImage?.startsWith('http') ? ogImage : `${SITE_URL}${ogImage || '/images/og-default.webp'}`;

  // JSON-LD structured data
  const resolvedSchemaType = schemaType || (article ? 'article' : 'website');

  const buildJsonLd = () => {
    switch (resolvedSchemaType) {
      case 'article':
        return {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: title,
          description,
          image: imageUrl,
          datePublished: article?.publishedTime,
          author: {
            '@type': 'Person',
            name: article?.author,
          },
          publisher: {
            '@type': 'Organization',
            name: SITE_NAME,
            url: SITE_URL,
            logo: {
              '@type': 'ImageObject',
              url: `${SITE_URL}/images/logo-192.png`,
            },
          },
          mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': canonical || SITE_URL,
          },
          articleSection: article?.section,
        };
      case 'organization':
        return {
          '@context': 'https://schema.org',
          '@type': 'MedicalOrganization',
          name: SITE_NAME,
          url: SITE_URL,
          logo: `${SITE_URL}/images/logo-192.png`,
          description,
          sameAs: [
            'https://github.com/ansaryzafar/clinicalvision',
          ],
          medicalSpecialty: 'Radiology',
          contactPoint: {
            '@type': 'ContactPoint',
            contactType: 'customer support',
            email: 'support@clinicalvision.ai',
          },
        };
      case 'softwareApplication':
        return {
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: SITE_NAME,
          applicationCategory: 'HealthApplication',
          operatingSystem: 'Web',
          description,
          url: SITE_URL,
          offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'GBP',
            description: 'Free tier available',
          },
        };
      case 'faqPage':
        return {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: (faqItems || []).map((item) => ({
            '@type': 'Question',
            name: item.question,
            acceptedAnswer: {
              '@type': 'Answer',
              text: item.answer,
            },
          })),
        };
      default:
        return {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: SITE_NAME,
          url: SITE_URL,
          description,
        };
    }
  };

  const jsonLd = buildJsonLd();

  // BreadcrumbList JSON-LD (separate from main schema)
  const breadcrumbJsonLd = breadcrumbs && breadcrumbs.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      ...(crumb.path ? { item: `${SITE_URL}${crumb.path}` } : {}),
    })),
  } : null;

  return (
    <Helmet>
      {/* Primary Meta */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {keywords && keywords.length > 0 && (
        <meta name="keywords" content={keywords.join(', ')} />
      )}
      {noIndex && <meta name="robots" content="noindex, nofollow" />}

      {/* Canonical */}
      {canonical && <link rel="canonical" href={canonical} />}

      {/* Open Graph */}
      <meta property="og:type" content={ogType} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={imageUrl} />
      {ogImageAlt && <meta property="og:image:alt" content={ogImageAlt} />}
      <meta property="og:site_name" content={SITE_NAME} />
      {canonical && <meta property="og:url" content={canonical} />}

      {/* Article-specific OG */}
      {article && (
        <>
          <meta property="article:published_time" content={article.publishedTime} />
          <meta property="article:author" content={article.author} />
          <meta property="article:section" content={article.section} />
        </>
      )}

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />
      {ogImageAlt && <meta name="twitter:image:alt" content={ogImageAlt} />}

      {/* JSON-LD */}
      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      {breadcrumbJsonLd && (
        <script type="application/ld+json">{JSON.stringify(breadcrumbJsonLd)}</script>
      )}
    </Helmet>
  );
};

export default SEOHead;
