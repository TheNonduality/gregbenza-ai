// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// Static build. Netlify serves the contents of dist/.
// Site URL is set to the real domain so canonical links and future
// llms-full concatenation resolve correctly. DNS is wired last (Phase 0 final step).
export default defineConfig({
  site: 'https://gregbenza.ai',
  // MDX lets a background story embed media (video, clean YouTube) inline where
  // the narrative needs it. Plain .md stays valid for text-only posts.
  // Sitemap emits /sitemap-index.xml (named in robots.txt) plus the page list.
  // /thanks is a post-submit destination, not a page anyone should arrive at
  // cold, so it stays out of the index.
  integrations: [mdx(), sitemap({ filter: (page) => !page.includes('/thanks') })],
  build: {
    // Emit /projects/dummy-project/index.html style paths — clean URLs, agent-friendly.
    format: 'directory',
  },
});
