import { esc } from './_page.mjs';

// ---------------------------------------------------------------------------
// The plaque: the one shape every wing uses to say what a thing is.
//
// A museum label, in four parts and always in this order — the name of the thing, one short paragraph saying
// what you are looking at, the figures that matter, and the list underneath. Nothing else. The order is the
// point: a reader who has seen one plaque can read every other one without learning anything new, and a page
// built out of plaques cannot drift into being a different page.
//
// Server-rendered, no JavaScript, styled entirely by the classes already in the shell (_page.mjs) so a plaque
// in the Arena and a plaque in the Playground are the same object rather than two that happen to look alike.
//
// TEXT IS ESCAPED. Every string handed in is treated as text. Where a caller needs real markup — a link, a
// live badge — it passes `{ html }` instead, and that object is only ever built here or by a page next door,
// never from anything a visitor sent.
// ---------------------------------------------------------------------------

/** A value that is already HTML. The only way markup gets into a plaque. */
export const raw = (html) => ({ html: String(html ?? '') });

/** Text, or `{html}`, rendered. Anything else becomes the empty string. */
const out = (v) => (v && typeof v === 'object' && 'html' in v ? v.html : v == null || v === '' ? '' : esc(v));

/**
 * Prose that has not been written yet.
 *
 * Everything a person reads on this site is written by hand in a pass of its own. Layout gets built first and
 * the words come after, so the placeholder has to be impossible to mistake for finished copy — it says so in
 * the markup, on the page, in the source, and to anyone reading over a shoulder.
 */
export const todo = (what) => raw(`<span class="todo">[TODO-FABLE: ${esc(what)}]</span>`);

/** A link, safely. `href` is built by the page, never taken from a request body. */
export const link = (href, label) => raw(`<a href="${esc(href)}">${esc(label)}</a>`);

/**
 * One plaque.
 *
 * @param kicker  optional small line above the name — what kind of thing this is
 * @param title   the name of the thing. Text, or `{html}` for a name that is also a link.
 * @param context one short paragraph: what you are looking at. Text, or `{html}`.
 * @param figures [{n, label}] — the figures strip. `n` is shown large; a non-numeric `n` is shown as a word.
 * @param rows    optional list rows. Each is a string, `{html}`, or `{k, v}` for a labelled row.
 * @param id      optional anchor.
 */
export function plaque({ kicker = '', title = '', context = '', figures = [], rows = [], id = '' } = {}) {
  const strip = (figures ?? []).filter(Boolean).map((f) => {
    const n = f.n;
    const word = !(typeof n === 'number' || /^[\d.,+-]+$/.test(String(n ?? '')));
    return `<div><dt>${out(f.label)}</dt><dd${word ? ' class="word"' : ''}>${out(n)}</dd></div>`;
  }).join('');

  const list = (rows ?? []).filter(Boolean).map((r) => {
    if (r && typeof r === 'object' && ('k' in r || 'v' in r)) {
      return `<li><span class="k">${out(r.k)}</span><span class="v">${out(r.v)}</span></li>`;
    }
    return `<li><span class="v">${out(r)}</span></li>`;
  }).join('');

  return `<section class="plaque"${id ? ` id="${esc(id)}"` : ''}>
${kicker ? `<p class="kicker">${out(kicker)}</p>\n` : ''}${title ? `<p class="name">${out(title)}</p>\n` : ''}${context ? `<p class="context">${out(context)}</p>\n` : ''}${strip ? `<dl class="figures">${strip}</dl>\n` : ''}${list ? `<ul class="rows">${list}</ul>\n` : ''}</section>`;
}
