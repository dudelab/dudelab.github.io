// A small screen with the windows of one program, arranged with the same rules as Tilo.
(() => {
  const root = document.querySelector('[data-win-demo]');
  if (!root) return;

  const desk = root.querySelector('[data-desk]');
  const caption = root.querySelector('[data-caption]');
  const glyph = root.querySelector('[data-glyph]');
  const newBtn = root.querySelector('[data-new]');

  // Virtual screen in points, below the menu bar: the app's constants keep their meaning.
  const A = { x: 0, y: 0, w: 1440, h: 868 };
  const MAIN = 0.6, FOCUS = 0.8, MIN_H = 180, STEP = { w: 6, h: 28 }, GAP = 4, MAX = 6;

  const docs = [
    { title: 'Lettera', hue: 262 },
    { title: 'Ricette', hue: 18 },
    { title: 'Appunti', hue: 200 },
    { title: 'Viaggio', hue: 145 },
    { title: 'Idee', hue: 330 },
    { title: 'Spesa', hue: 45 },
  ];
  const start = [
    { x: 90, y: 50, w: 640, h: 520 },
    { x: 560, y: 140, w: 560, h: 470 },
    { x: 250, y: 330, w: 540, h: 440 },
    { x: 880, y: 40, w: 480, h: 400 },
  ];

  const names = {
    1: 'Righe: due colonne strette ai lati.',
    2: 'Colonne affiancate, larghe uguali.',
    3: 'Griglia.',
    4: 'L’attiva grande, le altre impilate a destra.',
    5: 'Focus: l’attiva quasi a tutto schermo.',
    6: 'Cascata: l’attiva resta davanti.',
    7: 'Ruota: la prossima della pila diventa la grande.',
    0: 'Com’era: le finestre tornano dove le avevi prima.',
  };

  // Front to back: wins[0] is the active window.
  let wins = [];
  let original = null, last = null;
  const used = new Set();

  // Placeholder text: short paragraphs of lines with varied widths, the last line of each shorter.
  function lines(seed) {
    let n = seed;
    const rand = () => ((n = (n * 1103515245 + 12345) % 2147483648) / 2147483648);
    let html = '';
    for (let p = 0; p < 7; p++) {
      const count = 2 + Math.floor(rand() * 3);
      for (let i = 0; i < count; i++) {
        const w = i === count - 1 ? 30 + rand() * 35 : 82 + rand() * 18;
        html += `<i style="width:${w.toFixed(1)}%"></i>`;
      }
      html += '<br>';
    }
    return html;
  }

  function makeWindow(doc, r) {
    const el = document.createElement('div');
    el.className = 'dwin';
    el.style.setProperty('--h', doc.hue);
    el.innerHTML = `
      <div class="dwin__bar"><span class="dwin__lights"><button type="button" aria-label="Chiudi ${doc.title}"></button><i></i><i></i></span><span class="dwin__title">${doc.title}</span></div>
      <div class="dwin__body"><b></b>${lines(doc.hue)}</div>`;
    const w = { doc, el, r: { ...r } };
    el.addEventListener('pointerdown', () => focus(w));
    el.querySelector('button').addEventListener('click', (e) => { e.stopPropagation(); close(w); });
    drag(w, el.querySelector('.dwin__bar'));
    desk.append(el);
    used.add(doc);
    return w;
  }

  function render() {
    wins.forEach((w, i) => {
      const { x, y, w: width, h } = w.r;
      Object.assign(w.el.style, {
        left: `${((x + GAP) / A.w) * 100}%`,
        top: `${((y + GAP) / A.h) * 100}%`,
        width: `${((width - 2 * GAP) / A.w) * 100}%`,
        height: `${((h - 2 * GAP) / A.h) * 100}%`,
        zIndex: wins.length - i,
      });
      w.el.classList.toggle('is-active', i === 0);
      w.el.querySelector('button').disabled = wins.length === 1;
    });
    newBtn.disabled = wins.length >= MAX;
  }

  function focus(w) {
    if (wins[0] === w) return;
    wins = [w, ...wins.filter((o) => o !== w)];
    render();
  }

  function close(w) {
    if (wins.length === 1) return;
    w.el.remove();
    used.delete(w.doc);
    wins = wins.filter((o) => o !== w);
    render();
  }

  function addWindow() {
    const doc = docs.find((d) => !used.has(d));
    if (!doc) return;
    const n = used.size;
    const w = makeWindow(doc, { x: 300 + n * 40, y: 120 + n * 30, w: 560, h: 460 });
    wins = [w, ...wins];
    render();
  }

  // ---------- layouts, as in Tilo.swift ----------

  const snap = () => wins.map((w) => ({ w, r: { ...w.r } }));
  const same = (a, b) =>
    a && a.length === b.length &&
    a.every(({ w, r }) => b.some((o) => o.w === w && ['x', 'y', 'w', 'h'].every((k) => Math.abs(o.r[k] - r[k]) < 3)));

  const put = (w, x, y, width, h) => (w.r = { x, y, w: width, h });
  const stack = (ws, a) => ws.forEach((w, i) => put(w, a.x, a.y + (i * a.h) / ws.length, a.w, a.h / ws.length));
  const side = (ws, a) => ws.forEach((w, i) => put(w, a.x + (i * a.w) / ws.length, a.y, a.w / ws.length, a.h));
  const mainAndStack = (main, pile, a, share) => {
    if (!pile.length) return put(main, a.x, a.y, a.w, a.h);
    const l = a.w * share;
    put(main, a.x, a.y, l, a.h);
    stack(pile, { x: a.x + l, y: a.y, w: a.w - l, h: a.h });
  };
  const byTop = (ws) => [...ws].sort((p, q) => p.r.y - q.r.y);
  const byLeft = (ws) => [...ws].sort((p, q) => p.r.x - q.r.x);
  const mid = (r) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

  function arrange(key) {
    const active = wins[0];
    if (key === '0') {
      for (const { w, r } of original ?? []) if (wins.includes(w)) w.r = { ...r };
      original = last = null;
      return true;
    }
    if (!original || !same(last, snap())) original = snap();

    const fa = { ...active.r };
    const others = wins.slice(1);
    const a = A;
    switch (key) {
      case '1': {
        const l = Math.min(fa.w, a.w / 2);
        const sorted = [...wins].sort((p, q) => {
          const lp = mid(p.r).x > a.w / 2, lq = mid(q.r).x > a.w / 2;
          return lp !== lq ? lp - lq : p.r.y - q.r.y;
        });
        const n = sorted.length;
        const perColumn = Math.max(3, Math.floor(a.h / MIN_H));
        const left = n <= 6 ? Math.min(n, 3) : Math.ceil(n / 2);
        for (const [ws, x] of [[sorted.slice(0, left), a.x], [sorted.slice(left), a.x + a.w - l]]) {
          if (!ws.length) continue;
          if (ws.length <= perColumn) stack(ws, { x, y: a.y, w: l, h: a.h });
          else {
            const h = a.h - (ws.length - 1) * STEP.h;
            ws.forEach((w, i) => put(w, x + i * STEP.w, a.y + i * STEP.h, l - (ws.length - 1) * STEP.w, h));
          }
        }
        break;
      }
      case '2':
        side(byLeft(wins), a);
        break;
      case '3': {
        const n = wins.length;
        const cols = Math.ceil(Math.sqrt(n));
        const rows = Math.ceil(n / cols);
        const sorted = [...wins].sort((p, q) => {
          const rp = Math.round(p.r.y / 50), rq = Math.round(q.r.y / 50);
          return rp !== rq ? rp - rq : p.r.x - q.r.x;
        });
        const h = a.h / rows;
        for (let r = 0; r < rows; r++) side(sorted.slice(r * cols, (r + 1) * cols), { x: a.x, y: a.y + r * h, w: a.w, h });
        break;
      }
      case '4':
        mainAndStack(active, byTop(others), a, MAIN);
        break;
      case '5':
        mainAndStack(active, byTop(others), a, FOCUS);
        break;
      case '6': {
        const step = 28;
        const dim = { w: a.w * 0.7, h: a.h * 0.7 };
        const spots = Math.max(1, Math.floor(Math.min(a.w - dim.w, a.h - dim.h) / step) + 1);
        [...wins].reverse().forEach((w, i) => {
          const d = (i % spots) * step;
          put(w, a.x + d, a.y + d, dim.w, dim.h);
        });
        break;
      }
      case '7': {
        const pile = byTop(others);
        const next = pile[0];
        if (!next) return false;
        const share = fa.w >= a.w * 0.7 ? FOCUS : MAIN;
        mainAndStack(next, [...pile.slice(1), active], a, share);
        wins = [next, ...wins.filter((w) => w !== next)];
        break;
      }
    }
    last = snap();
    return true;
  }

  function swap(dir) {
    const d = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[dir];
    const active = wins[0];
    const c = mid(active.r);
    let best = null, bestDist = Infinity;
    for (const w of wins.slice(1)) {
      const m = mid(w.r);
      const v = [m.x - c.x, m.y - c.y];
      const along = v[0] * d[0] + v[1] * d[1];
      const across = Math.abs(v[0] * d[1] - v[1] * d[0]);
      const dist = along > 1 ? along + 2 * across : Infinity;
      if (dist < bestDist) [best, bestDist] = [w, dist];
    }
    if (!best) return false;
    [best.r, active.r] = [{ ...active.r }, { ...best.r }];
    return true;
  }

  // ---------- input ----------

  function act(fn, text, fail) {
    if (!fn()) {
      caption.textContent = fail;
      return;
    }
    render();
    caption.textContent = text;
    glyph.animate([{ transform: 'scale(1.35)', color: 'var(--glyph-on)' }, {}], { duration: 600, easing: 'ease-out' });
  }

  const swapText = { left: 'a sinistra', right: 'a destra', up: 'sopra', down: 'sotto' };
  const press = (key) => act(() => arrange(key), names[key], 'Con una finestra sola non c’è niente da far girare.');
  const pressSwap = (dir) =>
    act(() => swap(dir), `Scambiata con la vicina ${swapText[dir]}.`, `Non c’è una finestra ${swapText[dir]}.`);

  root.querySelectorAll('[data-key]').forEach((b) => b.addEventListener('click', () => press(b.dataset.key)));
  root.querySelectorAll('[data-swap]').forEach((b) => b.addEventListener('click', () => pressSwap(b.dataset.swap)));
  newBtn.addEventListener('click', addWindow);

  // The real shortcuts work while the demo is on screen.
  let visible = false;
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(root);
  const arrowKeys = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
  document.addEventListener('keydown', (e) => {
    if (!visible || !e.ctrlKey || !e.altKey || e.metaKey || e.shiftKey) return;
    const digit = /^Digit([0-7])$/.exec(e.code);
    if (digit) press(digit[1]);
    else if (arrowKeys[e.code]) pressSwap(arrowKeys[e.code]);
    else return;
    e.preventDefault();
  });

  function drag(w, handle) {
    handle.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) return;
      e.preventDefault();
      handle.setPointerCapture(e.pointerId);
      const box = desk.getBoundingClientRect();
      const sx = A.w / box.width, sy = A.h / box.height;
      const from = { x: e.clientX, y: e.clientY, r: { ...w.r } };
      w.el.classList.add('is-dragging');
      const move = (m) => {
        w.r.x = Math.min(A.w - 80, Math.max(80 - w.r.w, from.r.x + (m.clientX - from.x) * sx));
        w.r.y = Math.min(A.h - 40, Math.max(0, from.r.y + (m.clientY - from.y) * sy));
        render();
      };
      const up = () => {
        w.el.classList.remove('is-dragging');
        handle.removeEventListener('pointermove', move);
        handle.removeEventListener('pointerup', up);
        handle.removeEventListener('pointercancel', up);
      };
      handle.addEventListener('pointermove', move);
      handle.addEventListener('pointerup', up);
      handle.addEventListener('pointercancel', up);
    });
  }

  const order = [2, 1, 3, 0];
  const made = start.map((r, i) => makeWindow(docs[i], r));
  wins = order.map((i) => made[i]);
  render();
})();
