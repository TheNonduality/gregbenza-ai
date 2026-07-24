// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

// Static build. Netlify serves the contents of dist/.
// Site URL is set to the real domain so canonical links and future
// llms-full concatenation resolve correctly. DNS is wired last (Phase 0 final step).
export default defineConfig({
  site: 'https://gregbenza.ai',
  // MDX lets a background story embed media (video, clean YouTube) inline where
  // the narrative needs it. Plain .md stays valid for text-only posts.
  integrations: [mdx()],
  build: {
    // Emit /projects/dummy-project/index.html style paths — clean URLs, agent-friendly.
    format: 'directory',
  },
});
