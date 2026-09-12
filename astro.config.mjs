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
  // The Arena and the Playground are served by functions too, and both wings are meant to be found: the Arena's
  // front page, its catalog, and the three rules pages go in. The two readouts stay out, as they always have.
  integrations: [mdx(), sitemap({ filter: (page) => !page.includes('/thanks') && !page.includes('/meet/room'), customPages: ['https://gregbenza.ai/game', 'https://gregbenza.ai/guestbook',
    'https://gregbenza.ai/deaddrop', 'https://gregbenza.ai/questions', 'https://gregbenza.ai/gift', 'https://gregbenza.ai/receipt',
    'https://gregbenza.ai/observatory',
    'https://gregbenza.ai/arena', 'https://gregbenza.ai/arena/games', 'https://gregbenza.ai/playground',
    'https://gregbenza.ai/playground/errands', 'https://gregbenza.ai/playground/hunt', 'https://gregbenza.ai/playground/head-to-head'] })],
  build: {
    // Emit /projects/dummy-project/index.html style paths — clean URLs, agent-friendly.
    format: 'directory',
  },
});
