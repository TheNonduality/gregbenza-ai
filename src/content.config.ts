import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// ---------------------------------------------------------------------------
// The three-part project content model — baked into the repo structure.
// Every project is ONE markdown file with an IDENTICAL skeleton. That sameness
// is what lets a future session generate a new post by filling the same blanks.
//
//   1. blurb            → the human hook. Short. Frontmatter `blurb`.
//   2. technical details → clickable, downloadable inputs (prompts, skills,
//                          connectors, noteworthy outputs). Frontmatter `technical`.
//   3. full background  → the deep pool agents draw from. The markdown BODY.
//
// Downloadable inputs live under public/projects/<slug>/ and are referenced by
// path, so the build serves the real files a visitor can run today.
// ---------------------------------------------------------------------------

const technicalInput = z.object({
  // What the visitor is getting.
  label: z.string(),
  // The kind of input — drives the icon/label on the page and keeps the
  // machine-readable structure consistent across every project.
  kind: z.enum(['prompt', 'skill', 'connector', 'output']),
  // A one-line description of what it does / why it matters.
  note: z.string().optional(),
  // Downloadable file served from /public, OR an external link — exactly one.
  file: z.string().optional(),
  url: z.string().url().optional(),
});

const media = z.object({
  type: z.enum(['image', 'video', 'youtube']),
  // For image/video: a path (usually under /public). For youtube: the video id.
  src: z.string(),
  alt: z.string().optional(),
  caption: z.string().optional(),
});

const projects = defineCollection({
  loader: glob({ pattern: '**/index.{md,mdx}', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    // Part 1 — the human hook.
    blurb: z.string(),
    // Hero media proving native rendering (image / video / clean YouTube embed).
    hero: media.optional(),
    // Part 2 — technical details: the runnable inputs behind the work.
    technical: z.array(technicalInput).default([]),
    // Optional per-project accent override (design tokens hold the default).
    accent: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { projects };
