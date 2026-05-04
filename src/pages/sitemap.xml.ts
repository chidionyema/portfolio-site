import type { APIRoute } from 'astro';
import { getCollection, type CollectionEntry } from 'astro:content';

const SITE = 'https://chidionyema.dev';

type DeepDive = CollectionEntry<'deep-dives'>;

export const GET: APIRoute = async () => {
  const dives = await getCollection('deep-dives', ({ data }: DeepDive) => !data.draft);

  const urls = [
    { loc: `${SITE}/`, changefreq: 'weekly', priority: '1.0' },
    ...dives.map((d: DeepDive) => ({
      loc: `${SITE}/deep-dives/${d.slug}/`,
      lastmod: (d.data.updatedAt ?? d.data.publishedAt).toISOString().slice(0, 10),
      changefreq: 'monthly',
      priority: '0.8',
    })),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>
    <loc>${u.loc}</loc>${'lastmod' in u ? `\n    <lastmod>${u.lastmod}</lastmod>` : ''}
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>
`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
