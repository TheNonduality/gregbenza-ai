/**
 * Wings — the rooms of the exhibit.
 *
 * A "wing" is one project lineage (the `project` field on a post). This file
 * owns their NAMES and their plaque intros; their COLOURS live in
 * src/styles/tokens.css, keyed by the same slug. Adding a wing is a hex in
 * tokens.css plus an entry here — and if you forget the entry, the wing still
 * renders with its own name and a neutral colour rather than breaking.
 */

/** URL- and attribute-safe form of a lineage name. Must stay stable: it is the
 *  `?p=` filter value in every link anyone has ever shared. */
export const slugify = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');

export interface Wing {
  /** As written in the post frontmatter, shown on the plaque. */
  name: string;
  /** Matches the [data-wing="..."] colour rules in tokens.css. */
  slug: string;
  /** One line on the wall telling a visitor what this room is. */
  intro: string;
}

/** Curated intros for the lineages that exist. Keyed by slug. */
const INTROS: Record<string, string> = {
  'fpv-journey':
    'Learning to fly, and to fix. Drones diagnosed from photographs, footage rescued from corrupted files, and the methods that got there.',
  games:
    'Games run by AI. Game masters built out of documents, secrets kept in dead languages, and a wasteland that remembers what you did.',
  woods: 'Time spent outside, and what it takes to spend it well.',
  cooking: 'Cooking as a build: a process, a result, and notes for the next attempt.',
};

/** Never throws and never returns null — an unknown lineage becomes its own
 *  wing with a neutral colour, so a new `project` value in frontmatter shows up
 *  on the site immediately instead of disappearing. */
export function wingFor(projectName: string | undefined): Wing {
  const name = projectName?.trim() || 'Other work';
  const slug = projectName ? slugify(projectName) : '';
  return { name, slug, intro: INTROS[slug] ?? '' };
}
