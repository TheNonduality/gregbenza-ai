import { readFile } from 'node:fs/promises';
import path from 'node:path';

// ---------------------------------------------------------------------------
// The Q&A block has ONE home: the post's agent-facing markdown twin under
// public/. This reads it back at build time so the HTML page can render the
// same questions without a second copy in frontmatter drifting out of sync.
//
// Expected shape inside the twin:
//
//   ## Q&A
//
//   **Q: the question?**
//   A: the answer, which may be
//   hard-wrapped across lines.
//
// Fails soft: a post with no twin, or a twin with no Q&A section, renders no
// Q&A block rather than breaking the build.
// ---------------------------------------------------------------------------

export interface QaPair {
  q: string;
  a: string;
}

export async function readQa(agentMd: string | undefined): Promise<QaPair[]> {
  if (!agentMd) return [];

  const file = path.join(process.cwd(), 'public', agentMd.replace(/^\//, ''));
  let raw: string;
  try {
    raw = await readFile(file, 'utf8');
  } catch {
    return [];
  }

  // Take everything after the "## Q&A" heading up to the next H2.
  const afterHeading = raw.split(/^##\s+Q&A\s*$/m)[1];
  if (!afterHeading) return [];
  const section = afterHeading.split(/^##\s+/m)[0];

  const pairs: QaPair[] = [];
  for (const chunk of section.split(/\n(?=\*\*Q:)/)) {
    const match = chunk.trim().match(/^\*\*Q:\s*([\s\S]*?)\*\*\s*([\s\S]*)$/);
    if (!match) continue;
    // The twin is hard-wrapped for reading; collapse it back to flowing text.
    const q = match[1].replace(/\s+/g, ' ').trim();
    const a = match[2].replace(/^A:\s*/, '').replace(/\s+/g, ' ').trim();
    if (q && a) pairs.push({ q, a });
  }
  return pairs;
}
