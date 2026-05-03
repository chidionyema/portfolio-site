import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';

export default defineConfig({
  integrations: [
    react(),
    tailwind(),
    mdx(),
  ],
  output: 'static',
  // TODO: confirm production domain. Used for canonical, OG, sitemap.
  site: 'https://chidionyema.dev',
  markdown: {
    shikiConfig: {
      // Dual-theme. CSS picks one via the data-theme attribute on <html>.
      themes: {
        light: 'github-light',
        dark: 'github-dark-dimmed',
      },
      wrap: true,
    },
  },
});
