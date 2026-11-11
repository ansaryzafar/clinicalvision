/**
 * Guards against re-introducing fabricated people or claims on the public site.
 */
import { blogPosts } from '../../data/blogPosts';

describe('public content has no fabricated authors or events', () => {
  it('attributes every blog post to the real author only', () => {
    const names = new Set(blogPosts.map((p) => p.author.name));
    expect(Array.from(names)).toEqual(['Muhammad Ansary']);
  });

  it('does not include the unverifiable RSNA 2023 post', () => {
    expect(blogPosts.some((p) => p.slug.includes('rsna-2023'))).toBe(false);
  });

  it('has no dangling related-post slugs', () => {
    const slugs = new Set(blogPosts.map((p) => p.slug));
    for (const post of blogPosts) {
      for (const related of post.relatedSlugs) {
        expect(slugs.has(related)).toBe(true);
      }
    }
  });

  it('does not claim a reader study or deployments in post bodies', () => {
    const all = blogPosts.flatMap((p) => p.sections.map((s) => s.content)).join(' ');
    expect(all).not.toMatch(/retrospective study comparing radiologists/i);
    expect(all).not.toMatch(/our most successful deployments/i);
  });
});
