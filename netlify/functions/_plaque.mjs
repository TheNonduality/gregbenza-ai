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
 * @param body    optional markup under the rows, for a readout that needs a table or a run of entries rather
 *                than a list. Already HTML: built by the page next door, never from anything a visitor sent.
 * @param id      optional anchor.
 * @param cls     optional extra classes — how wide this plaque sits in a dashboard grid, and nothing else.
 * @param fold    when true the context paragraph goes behind "what is this?" instead of standing above the
 *                figures. The words are the same words; they are one click away rather than in the way.
 * @param attrs   optional `data-*` attributes on the section. A fact the page already prints in words, stated
 *                again in a form a script can read — a window's two edges, so a browser can count them down.
 *                Keys that are not plain `data-` names are dropped; values are escaped like everything else.
 */
export function plaque({ kicker = '', title = '', context = '', figures = [], rows = [], body = '', id = '', cls = '', fold = false, attrs = null } = {}) {
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

  const ctx = context ? `<p class="context">${out(context)}</p>` : '';

  const data = Object.entries(attrs ?? {})
    .filter(([k, v]) => /^data-[a-z][a-z0-9-]*$/.test(k) && v != null && v !== '')
    .map(([k, v]) => ` ${k}="${esc(v)}"`).join('');

  return `<section class="plaque${cls ? ` ${esc(cls)}` : ''}"${id ? ` id="${esc(id)}"` : ''}${data}>
${kicker ? `<p class="kicker">${out(kicker)}</p>\n` : ''}${title ? `<p class="name">${out(title)}</p>\n` : ''}${ctx && !fold ? `${ctx}\n` : ''}${strip ? `<dl class="figures">${strip}</dl>\n` : ''}${ctx && fold ? `${about(ctx)}\n` : ''}${list ? `<ul class="rows">${list}</ul>\n` : ''}${body ? `${String(body)}\n` : ''}</section>`;
}

// ---------------------------------------------------------------------------
// The three pieces a dashboard needs on top of the plaque. All three are markup and nothing else — no script,
// because a page that needs one is closed to most of the readers this site is for.
// ---------------------------------------------------------------------------

/**
 * The bar that stays at the top of a readout: what the page is, which day it is showing, and a link to every
 * section on it. Anchors only; the scrolling is the browser's own.
 *
 * @param name  the page's name. Text, or `{html}` for a name that is also a link.
 * @param day   optional small line beside it — the date being looked at.
 * @param links [[href, label]] — one per section, in the order the sections appear.
 */
export const topbar = (name, day, links = []) => `<header class="topbar"><div class="bar">
<span class="brand">${out(name)}</span>${day ? `<span class="day">${out(day)}</span>` : ''}
<nav class="jump" aria-label="sections">${(links ?? []).filter(Boolean)
  .map(([href, label]) => `<a href="${esc(href)}">${esc(label)}</a>`).join('')}</nav>
</div></header>`;

/**
 * An explanation, folded away. The heading and the figures stay where a reader can see them; the paragraph
 * that says what they are is one click behind this. Nothing is lost and nothing is rewritten.
 */
export const about = (html, label = 'what is this?') => (html
  ? `<details class="about"><summary>${esc(label)}</summary><div class="inner">${String(html)}</div></details>`
  : '');

/**
 * A long list, cut. The first few rows are printed; the rest sit behind one click in the same card.
 *
 * @param items  the rows, already in the order they should read
 * @param render (item, i) => the HTML for one row
 * @param head   how many stand above the fold
 * @param wrap   (rowsHtml, part) => the markup around a run of rows. `part` is 'head' or 'rest', so a table
 *               can give the hidden half its own scroller and its own sticky heading.
 * @param label  the summary line. Defaults to the honest one: the whole count.
 * @param empty  what to print when there is nothing — a quiet line, never a blank card.
 * @param open   start open. A page that reloads itself every half minute forgets what a reader opened, so the
 *               one list they are most likely watching while it moves is opened for them instead.
 */
export function cut(items, render, { head = 8, wrap = (h) => h, label = '', empty = '', open = false } = {}) {
  const rows = items ?? [];
  if (!rows.length) return empty;
  const first = wrap(rows.slice(0, head).map(render).join(''), 'head');
  if (rows.length <= head) return first;
  const rest = wrap(rows.slice(head).map((r, i) => render(r, i + head)).join(''), 'rest');
  return `${first}<details class="more"${open ? ' open' : ''}><summary>${esc(label || `show all ${rows.length}`)}</summary>${rest}</details>`;
}

/** A table. `heads` may be an array of column names, or null for a table that needs none. */
export const tableOf = (heads, body, { scroll = false } = {}) => {
  const t = `<table>${heads ? `<thead><tr>${heads.map((h) => `<th>${h}</th>`).join('')}</tr></thead>` : ''}<tbody>${body}</tbody></table>`;
  return scroll ? `<div class="scroller">${t}</div>` : t;
};
