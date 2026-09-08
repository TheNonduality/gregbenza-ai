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
  // /game is served by a Netlify function, so Astro cannot see it to index it; customPages puts it in the
  // sitemap anyway. Its unnamed twin at /table is deliberately left out — it is the same game with the labels
  // taken off, and an index entry sitting next to this one would hand an agent the comparison for free.
  integrations: [mdx(), sitemap({ filter: (page) => !page.includes('/thanks'), customPages: ['https://gregbenza.ai/go', 'https://gregbenza.ai/game', 'https://gregbenza.ai/guestbook',
    'https://gregbenza.ai/deaddrop', 'https://gregbenza.ai/questions', 'https://gregbenza.ai/gift', 'https://gregbenza.ai/receipt'] })],
  build: {
    // Emit /projects/dummy-project/index.html style paths — clean URLs, agent-friendly.
    format: 'directory',
  },
});
