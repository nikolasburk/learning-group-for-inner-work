// @ts-check

import cloudflare from '@astrojs/cloudflare';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwind from '@astrojs/tailwind';
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://inner-work-landing.workers.dev', // TODO: update once a real/custom domain exists
  output: 'static',
  adapter: cloudflare(),
  integrations: [sitemap(), tailwind(), mdx()],
});
