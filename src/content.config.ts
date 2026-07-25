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
  // The kind — drives the icon/label on the page and keeps the
  // machine-readable structure consistent across every project.
  // 'input' = something that was fed TO the AI (a diagnostic photo, a file);
  // 'output' = something the AI or the work produced.
  kind: z.enum(['prompt', 'skill', 'connector', 'input', 'output']),
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

// The AI record — the dry, repeatable heart of a placard. Each post documents
// ONE engagement with AI: what the problem was, what went in, what came back
// (including what the AI could NOT do), and the outcome. Identical fields on
// every post; narrative lives only in the agent-facing markdown.
const record = z.object({
  problem: z.string(),
  wentIn: z.array(z.string()),
  cameBack: z.array(z.string()),
  outcome: z.string(),
});

const projects = defineCollection({
  loader: glob({ pattern: '**/index.{md,mdx}', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    // Part 1 — the human hook.
    blurb: z.string(),
    // Which project lineage this placard belongs to (feed filter chips).
    project: z.string().optional(),
    // Hero media proving native rendering (image / video / clean YouTube embed).
    hero: media.optional(),
    // The AI record — inputs, outputs, outcome. See `record` above.
    record: record.optional(),
    // Per-post expand label: specific and technical, never generic.
    expandLabel: z.string().optional(),
    // Part 2 — technical details: the runnable inputs behind the work.
    technical: z.array(technicalInput).default([]),
    // Site-absolute path to this post's agent-facing markdown twin — the file
    // the ask-more buttons point a visitor's AI at.
    agentMd: z.string().optional(),
    // Optional per-project accent override (design tokens hold the default).
    accent: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { projects };
