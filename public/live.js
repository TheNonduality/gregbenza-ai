// ---------------------------------------------------------------------------
// live.js — the part of the house only a person gets.
//
// Every page that loads this file is already finished before it arrives: the rows are there, the counts are
// counted, the reload is a meta tag that works in anything. Most readers here run no script at all, so nothing
// in this file is allowed to be the only place a fact lives.
//
// What it removes is the one cost of a page that reloads itself — a reader who opened a fold, scrolled to a row
// and started typing in a filter loses all three every thirty seconds, and has no way to see which row is new.
// So the meta tag's timer is taken off it, the same cadence is kept by hand, and the new copy of the page is
// walked against the old one so that only what differs is touched.
//
// Everything this file adds carries data-live-ui and the walk steps around it — which is how a filter keeps its
// text and its caret across a refresh. Everything it animates is gated on the reader having asked for motion.
// ---------------------------------------------------------------------------

(() => {
  'use strict';

  const root = document.documentElement;
  const main = document.querySelector('main');
  if (!root.dataset.live || !main) return;          // the server did not ask for any of this

  const UI = 'data-live-ui';                        // anything this file put there
  const MOTION = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  const NUM = /^-?[\d,]+$/;

  // ---- the reload is ours now ---------------------------------------------
  // The tag stays in the HTML for everyone not running this file — it is the reload, for anything that cannot
  // run one. Here it has to be called off, and taking the element out of the document is not enough on its own:
  // the browser reads the tag once, hands the instruction to its own scheduler, and then has no further interest
  // in the element. The scheduler is what has to be told, and window.stop() is what tells it — one tick after
  // the load event, when every real fetch on the page has already finished and there is nothing else to stop.
  const meta = document.querySelector('meta[http-equiv="refresh" i]');
  if (meta) {
    meta.remove();
    const defuse = () => setTimeout(() => { try { stop(); } catch { /* nothing to stop */ } }, 0);
    if (document.readyState === 'complete') defuse();
    else addEventListener('load', defuse, { once: true });
  }
  let base = (Number(root.dataset.refresh) || 0) * 1000;   // 0: this page will not change again

  // ---- the dot ------------------------------------------------------------
  // One small round thing at the end of the bar: beating while the page keeps up, still while it is paused or
  // finished. No words on the page — the words are in the tooltip, for whoever wants them.
  const bar = document.querySelector('.topbar .bar');
  let dot = null;
  if (bar) {
    dot = document.createElement('span');
    dot.className = 'pulse';
    dot.setAttribute(UI, '');
    bar.appendChild(dot);
  }
  const show = (state, title) => { if (dot) { dot.className = 'pulse' + (state ? ' ' + state : ''); dot.title = title; } };

  // ---- numbers count their way there --------------------------------------
  // A figure that jumped is a figure you missed. One frame loop drives every number on the page at once.
  const anim = [];
  let raf = 0;
  const drive = (t) => {
    for (let i = anim.length - 1; i >= 0; i--) {
      const a = anim[i];
      const p = Math.min(1, (t - a.t0) / a.ms);
      write(a.node, Math.round(a.from + (a.to - a.from) * (1 - Math.pow(1 - p, 3))), a.commas);
      if (p === 1) anim.splice(i, 1);
    }
    raf = anim.length ? requestAnimationFrame(drive) : 0;
  };
  const write = (node, v, commas) => { node.data = commas ? v.toLocaleString('en-US') : String(v); };
  const count = (node, from, to, commas, ms) => {
    // A tab nobody is looking at is handed no frames at all, so an animation started in one would leave the
    // number stuck at whatever it started from. Hidden means the answer, now.
    if (document.hidden) return write(node, to, commas);
    const a = { node, from, to, commas, ms, t0: performance.now() };
    anim.push(a);
    if (!raf) raf = requestAnimationFrame(drive);
    // A number is a fact first and an animation second. If the frames never come — the tab went away mid-count,
    // the browser is throttling — the fact still has to land, so it lands late rather than not at all.
    setTimeout(() => {
      const i = anim.indexOf(a);
      if (i >= 0) { anim.splice(i, 1); write(node, to, commas); }
    }, ms + 300);
  };
  /** Took the change as a count-up, or declined and left the caller to write the text plainly. */
  const ticked = (node, next) => {
    if (!MOTION) return false;
    const was = node.data.trim(), now = next.trim();
    if (!NUM.test(was) || !NUM.test(now)) return false;
    const a = Number(was.replace(/,/g, '')), b = Number(now.replace(/,/g, ''));
    if (a === b || !Number.isInteger(a) || !Number.isInteger(b)) return false;
    count(node, a, b, now.includes(','), 400);
    return true;
  };

  // ---- the walk -----------------------------------------------------------
  // The same page, a few seconds older, laid beside the one on screen. Where they agree nothing is touched —
  // which is the whole point, because an untouched node keeps its open state, its scroll and its caret.
  const LIST = /^(UL|OL|TBODY)$/;      // the three containers rows actually arrive in
  const MINE = /^data-l/;              // attributes this file owns; the server never sends one

  /** What a row says, ignoring a clock we have rewritten. Two rows with one key are the same row. */
  const keyOf = (el) => {
    if (el.id) return el.id;
    const cached = el.getAttribute('data-lk');
    if (cached) return cached;
    const stamps = [...el.querySelectorAll('time[datetime]')].map((t) => t.getAttribute('datetime')).join();
    const bare = el.cloneNode(true);
    bare.querySelectorAll('time').forEach((t) => t.remove());
    const k = stamps + '|' + bare.textContent.replace(/\s+/g, ' ').trim().slice(0, 160);
    el.setAttribute('data-lk', k);
    return k;
  };

  // Whether a fold is open belongs to the reader, not the server, so `open` is never copied either way.
  const attrs = (a, b) => {
    for (const at of [...a.attributes]) {
      if (at.name !== 'open' && !MINE.test(at.name) && !b.hasAttribute(at.name)) a.removeAttribute(at.name);
    }
    for (const at of b.attributes) {
      if (at.name !== 'open' && a.getAttribute(at.name) !== at.value) a.setAttribute(at.name, at.value);
    }
  };

  const morph = (cur, next) => {
    attrs(cur, next);
    const olds = [...cur.childNodes].filter((n) => !(n.nodeType === 1 && n.hasAttribute(UI)));
    const news = [...next.childNodes];
    if (LIST.test(cur.tagName)) return rows(cur, olds, news);
    for (let i = 0; i < Math.max(olds.length, news.length); i++) {
      const a = olds[i], b = news[i];
      if (!b) cur.removeChild(a);
      else if (!a) cur.appendChild(document.importNode(b, true));
      else patch(cur, a, b);
    }
  };

  const patch = (parent, a, b) => {
    if (a.nodeType === 3 && b.nodeType === 3) {
      if (a.data !== b.data) {
        const host = a.parentElement;
        if (!(host && host.matches('.figures > div > dd, .stat > b') && ticked(a, b.data))) a.data = b.data;
      }
    } else if (a.nodeType === 1 && b.nodeType === 1 && a.tagName === b.tagName) {
      // A clock already turned into "3m ago". Same stamp, same moment — leave our words where they are.
      if (!(a.tagName === 'TIME' && a.getAttribute('datetime') === b.getAttribute('datetime'))) morph(a, b);
    } else {
      parent.replaceChild(document.importNode(b, true), a);
    }
  };

  /** A list, keyed by what each row says, so a row already here is kept and only a new one is new. */
  const rows = (cur, olds, news) => {
    const have = new Map();
    let mine = 0;
    for (const a of olds) {
      if (a.nodeType !== 1) continue;
      mine++;
      const k = keyOf(a);
      have.has(k) ? have.get(k).push(a) : have.set(k, [a]);
    }
    // A list the same length did not gain anything, it restated something, and that is not news. Only a list
    // that grew may call a row new — so a card of four facts never flashes because one now reads "3m ago".
    const grew = news.filter((n) => n.nodeType === 1).length > mine;
    const want = [];
    for (const b of news) {
      if (b.nodeType !== 1) continue;
      const bucket = have.get(keyOf(b));
      const a = bucket && bucket.length ? bucket.shift() : null;
      if (a) { morph(a, b); want.push(a); continue; }
      const made = document.importNode(b, true);
      if (MOTION && grew) {
        made.classList.add('fresh');
        made.addEventListener('animationend', () => made.classList.remove('fresh'), { once: true });
      }
      want.push(made);
    }
    const keep = new Set(want);
    let at = cur.firstChild;
    for (const node of want) {
      while (at && at.nodeType !== 1) at = at.nextSibling;   // hop the whitespace the server indents with
      if (node === at) at = at.nextSibling;
      else cur.insertBefore(node, at);
    }
    for (const a of olds) if (!keep.has(a) && a.parentNode === cur) cur.removeChild(a);
  };

  // ---- the cadence --------------------------------------------------------
  // Fetch the address the reader is already at, walk it in, go back to sleep. A tab nobody is looking at asks
  // for nothing and asks immediately on return. Two failures running and it slows down rather than hammering
  // something that is evidently unwell.
  let timer = 0, misses = 0, done = base === 0;

  const idle = () => show('', done
    ? 'Nothing left to update — this page will not change again.'
    : 'Paused while this tab is in the background.');

  const wait = () => {
    clearTimeout(timer);
    if (done || document.hidden) return idle();
    const every = misses >= 2 ? base * 2 : base;
    show(misses >= 2 ? 'on slow' : 'on', 'Updating every ' + Math.round(every / 1000) + ' seconds.');
    timer = setTimeout(pull, every);
  };

  const pull = async () => {
    if (document.hidden) return wait();
    try {
      const res = await fetch(location.href, { cache: 'no-store', credentials: 'same-origin' });
      if (!res.ok) throw new Error(String(res.status));
      const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
      const next = doc.querySelector('main');
      if (next) {
        const y = scrollY;
        const tops = [...main.querySelectorAll('.scroller')].map((s) => [s, s.scrollTop]);
        const had = document.activeElement;
        morph(main, next);
        for (const [s, t] of tops) if (s.isConnected && s.scrollTop !== t) s.scrollTop = t;
        if (Math.abs(scrollY - y) > 2) scrollTo({ top: y, left: 0, behavior: 'instant' });
        if (had && had.isConnected && had !== document.activeElement) had.focus({ preventScroll: true });
      }
      // The server says whether anything is left to watch: a game whose window has closed comes back without a
      // cadence, and this stops on its own rather than reloading a page that cannot change again.
      const cadence = (Number(doc.documentElement.dataset.refresh) || 0) * 1000;
      if (cadence) base = cadence; else done = true;
      misses = 0;
      dress();
    } catch { misses++; }
    wait();
  };

  addEventListener('visibilitychange', () => {
    if (document.hidden) { clearTimeout(timer); idle(); } else if (!done) pull();
  });

  // ---- the clock ----------------------------------------------------------
  // A declared game is a window somebody named two times for. Until one of them passes, the only honest thing
  // this page can say is how long is left — so it says it once a second, and the moment an edge goes by it
  // stops waiting for the cadence and asks for the page again.
  const pad = (n) => String(n).padStart(2, '0');
  const span = (ms) => {
    const s = Math.max(0, Math.round(ms / 1000)), h = Math.floor(s / 3600);
    return (h ? h + ':' + pad(Math.floor(s / 60) % 60) : String(Math.floor(s / 60))) + ':' + pad(s % 60);
  };

  const win = main.querySelector('[data-open][data-close]');
  let clock = null, edge = null;
  if (win && Date.now() < Date.parse(win.dataset.close)) {
    clock = document.createElement('p');
    clock.className = 'countdown';
    clock.setAttribute(UI, '');
    const name = win.querySelector('.name');
    if (name) name.after(clock); else win.prepend(clock);
  }
  const beat = () => {
    const now = Date.now(), o = Date.parse(win.dataset.open), c = Date.parse(win.dataset.close), was = edge;
    edge = now < o ? 'before' : now < c ? 'during' : 'after';
    clock.innerHTML = edge === 'before' ? 'opens in <b>' + span(o - now) + '</b>'
      : edge === 'during' ? 'closes in <b>' + span(c - now) + '</b>' : 'the window is closed';
    if (was && was !== edge) { done = false; pull(); }      // the bell just rang; do not sit on it
    if (edge !== 'after') setTimeout(beat, 1000);           // past the far edge there is nothing to count
  };

  // ---- the clocks in the rows ---------------------------------------------
  // The server prints an exact time, which is right and useless at a glance. This says how long ago instead and
  // keeps the exact reading in the tooltip, which is where it was always going to be wanted second.
  const since = (ms) => {
    const s = Math.round(ms / 1000);
    if (s < 45) return 'just now';
    if (s < 5400) return Math.round(s / 60) + 'm ago';
    if (s < 172800) return Math.round(s / 3600) + 'h ago';
    return Math.round(s / 86400) + 'd ago';
  };
  const clocks = () => {
    const now = Date.now();
    for (const t of main.querySelectorAll('time[datetime]')) {
      const at = Date.parse(t.dateTime);
      if (!at || at > now) continue;
      if (!t.dataset.lt) {
        if (!/^\d{2}:\d{2}(:\d{2})?$/.test(t.textContent.trim())) continue;   // only where a clock was printed
        t.dataset.lt = t.textContent.trim();
        t.title = t.dataset.lt + ' UTC';
      }
      const said = since(now - at);
      if (t.textContent !== said) t.textContent = said;
    }
  };

  // ---- the sift -----------------------------------------------------------
  // A card with more rows than a screen is a haystack with the search box missing. One input, no request, no
  // page change. If the card keeps most of itself behind "show all", that opens for the duration and closes
  // itself again when the filter is cleared.
  const ROWS = 'ul.rows > li, tbody > tr';
  const sift = () => {
    for (const card of main.querySelectorAll('.plaque, .card, .pane')) {
      if (card.closest('[data-lsift]')) continue;           // this card, or one it sits in, already has one
      if (card.querySelectorAll(ROWS).length <= 10) continue;
      const host = card.querySelector('ul.rows, table, .scroller, details.more');
      if (!host) continue;
      card.setAttribute('data-lsift', '');

      const box = document.createElement('label');
      box.className = 'sift';
      box.setAttribute(UI, '');
      const input = document.createElement('input');
      input.type = 'search';
      input.placeholder = 'filter…';
      input.setAttribute('aria-label', 'filter these rows');
      const hits = document.createElement('span');
      hits.className = 'hits';
      box.append(input, hits);
      host.before(box);                                     // directly above the list it filters

      let was = null;                                       // what "show all" was doing before the filter opened it
      input.addEventListener('input', () => {
        const q = input.value.trim().toLowerCase();
        const more = card.querySelector('details.more');
        if (more) {
          if (q && was === null) { was = more.open; more.open = true; }
          else if (!q && was !== null) { more.open = was; was = null; }
        }
        const all = card.querySelectorAll(ROWS);
        let hit = 0;
        for (const r of all) {
          const ok = !q || r.textContent.toLowerCase().includes(q);
          r.hidden = !ok;
          if (ok) hit++;
        }
        hits.textContent = q ? hit + ' of ' + all.length : '';
      });
    }
  };

  // What the walk cannot know: rows it brought in have never been dressed, and rows a filter was hiding came
  // back in the server's own markup, which has no opinion about what anyone was looking for.
  const dress = () => {
    clocks();
    sift();
    for (const i of main.querySelectorAll('.sift input')) if (i.value) i.dispatchEvent(new Event('input'));
  };

  // ---- first sight --------------------------------------------------------
  // The figures count up once, on arrival: half a second, no bounce, enough to say which numbers are the ones
  // to read. A reader who asked for less motion gets the numbers immediately instead.
  const arrive = () => {
    if (!MOTION || document.hidden) return;              // nobody is watching; the numbers stand as they are
    for (const el of main.querySelectorAll('.figures > div > dd, .stat > b')) {
      const node = el.firstChild;
      if (!node || node.nodeType !== 3 || !NUM.test(node.data.trim())) continue;
      const to = Number(node.data.trim().replace(/,/g, ''));
      if (!Number.isInteger(to) || to < 2) continue;
      const commas = node.data.includes(',');
      node.data = '0';
      count(node, 0, to, commas, 420);
    }
  };

  // A move from one wing to the next should look like the same room changing, not a new page arriving. The bar
  // is the one thing both pages have in common, so it is the one thing given a name to travel under. It goes in
  // as a rule rather than on the element: the walk syncs attributes against the server's copy, which has never
  // heard of this, and would take an inline style straight back off again on the first refresh.
  if (document.startViewTransition && MOTION && bar) {
    const rule = document.createElement('style');
    rule.textContent = '.topbar{view-transition-name:topbar}';
    document.head.appendChild(rule);
  }

  dress();
  arrive();
  if (clock) beat();
  setInterval(clocks, 20000);
  wait();
})();
