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
  // ISO 8601 duration (e.g. 'PT39S') for video. Measured with ffprobe, not
  // guessed — it feeds the VideoObject structured data, so a wrong number here
  // is a wrong claim to every crawler that reads it.
  duration: z.string().optional(),
});

const projects = defineCollection({
  loader: glob({ pattern: '**/index.{md,mdx}', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    // Set only when a published post is materially revised. Drives the visible
    // "Updated" line and dateModified in structured data — freshness signals
    // that must never be faked, so this stays empty until a real revision.
    updated: z.coerce.date().optional(),
    // Part 1 — the human hook.
    blurb: z.string(),
    // Which project lineage this placard belongs to (feed filter chips).
    project: z.string().optional(),
    // Hero media proving native rendering (image / video / clean YouTube embed).
    hero: media.optional(),
    // Part 2 — the files behind the work. Rendered as a plain "Relevant files"
    // list: filename plus a line on what it does.
    technical: z.array(technicalInput).default([]),
    // Closing media — plays the post out after the record and downloads.
    outro: media.optional(),
    // Media embedded in the markdown body (via <Media> in the MDX) that isn't
    // the hero or outro — listed here ONLY so structured data knows it exists.
    // The body still controls where it actually appears on the page.
    bodyMedia: z.array(media).default([]),
    // Site-absolute path to this post's agent-facing markdown twin — the file
    // the ask-more buttons point a visitor's AI at.
    agentMd: z.string().optional(),
    // No per-post colour field, on purpose. It existed for the ink-wash design
    // and was retired on 2026-07-29 with the Exhibit redesign: colour now carries
    // meaning site-wide — each wing owns one, and the single red belongs to the
    // one button asking the visitor to do something. A per-post override fought
    // both, and the six values in use had been picked against a palette that no
    // longer exists (two of them left white-on-fill at 1.9:1 and 2.3:1, an
    // unreadable "Offer guidance" button). Colour lives in
    // src/styles/tokens.css; a new colour means a new wing, not a new post field.
    draft: z.boolean().default(false),
  }),
});

export const collections = { projects };
