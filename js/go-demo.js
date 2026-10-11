// A small 9×9 Go game against a simple heuristic opponent.
(() => {
  const root = document.querySelector('[data-go-demo]');
  if (!root) return;

  const N = 9;
  const KOMI = 6.5;
  const EMPTY = 0, BLACK = 1, WHITE = 2;
  const NS = 'http://www.w3.org/2000/svg';
  const STARS = [[2, 2], [6, 2], [4, 4], [2, 6], [6, 6]];

  const statusEl = root.querySelector('[data-status]');
  const capB = root.querySelector('[data-cap-b]');
  const capW = root.querySelector('[data-cap-w]');

  // ---------- rules ----------

  const neighbors = (p) => {
    const x = p % N, y = (p / N) | 0, out = [];
    if (x > 0) out.push(p - 1);
    if (x < N - 1) out.push(p + 1);
    if (y > 0) out.push(p - N);
    if (y < N - 1) out.push(p + N);
    return out;
  };

  const groupAt = (b, p) => {
    const color = b[p], stones = [p], libs = new Set(), seen = new Set([p]);
    for (let i = 0; i < stones.length; i++) {
      for (const n of neighbors(stones[i])) {
        if (b[n] === EMPTY) libs.add(n);
        else if (b[n] === color && !seen.has(n)) { seen.add(n); stones.push(n); }
      }
    }
    return { stones, libs };
  };

  // Returns the resulting position, or null if the move is illegal.
  const tryPlay = (b, p, color, ko) => {
    if (b[p] !== EMPTY || p === ko) return null;
    const next = b.slice();
    next[p] = color;
    const captured = [];
    for (const n of neighbors(p)) {
      if (next[n] !== 3 - color) continue;
      const g = groupAt(next, n);
      if (g.libs.size === 0) for (const s of g.stones) { next[s] = EMPTY; captured.push(s); }
    }
    const own = groupAt(next, p);
    if (own.libs.size === 0) return null;
    const newKo = captured.length === 1 && own.stones.length === 1 && own.libs.size === 1 ? captured[0] : -1;
    return { board: next, captured, ko: newKo };
  };

  const areaScore = (b) => {
    const score = [0, 0, 0];
    const seen = new Set();
    for (let p = 0; p < N * N; p++) {
      if (b[p] !== EMPTY) { score[b[p]]++; continue; }
      if (seen.has(p)) continue;
      const region = [p], borders = new Set();
      seen.add(p);
      for (let i = 0; i < region.length; i++) {
        for (const n of neighbors(region[i])) {
          if (b[n] === EMPTY && !seen.has(n)) { seen.add(n); region.push(n); }
          else if (b[n] !== EMPTY) borders.add(b[n]);
        }
      }
      if (borders.size === 1) score[[...borders][0]] += region.length;
    }
    return { black: score[BLACK], white: score[WHITE] + KOMI };
  };

  // ---------- opponent ----------

  const chooseMove = (b, ko, color, lastMove) => {
    const opp = 3 - color;
    const stonesOnBoard = b.reduce((n, c) => n + (c !== EMPTY), 0);
    let best = null, bestScore = -Infinity;
    for (let p = 0; p < N * N; p++) {
      const res = tryPlay(b, p, color, ko);
      if (!res) continue;
      const near = neighbors(p);
      // Never fill a point surrounded by own stones: it is an eye.
      if (near.every((n) => b[n] === color)) continue;

      let s = res.captured.length * 10;
      const own = groupAt(res.board, p);
      const L = own.libs.size;
      if (L === 1) s -= res.captured.length ? 2 : 12 + own.stones.length * 3;
      else s += Math.min(L, 4) * 0.7;

      for (const n of near) {
        if (b[n] === color && groupAt(b, n).libs.size === 1 && L > 1) s += 6 + groupAt(b, n).stones.length * 2;
        if (res.board[n] === opp) {
          const g = groupAt(res.board, n);
          if (g.libs.size === 1) s += 4 + g.stones.length;
          else if (g.libs.size === 2) s += 1;
        }
      }

      const x = p % N, y = (p / N) | 0;
      const edge = Math.min(x, y, N - 1 - x, N - 1 - y);
      if (edge === 0) s -= 3;
      else if (edge === 1) s -= stonesOnBoard < 10 ? 1 : 0;
      else if (edge === 2 && stonesOnBoard < 10) s += 1.5;
      if (lastMove >= 0) {
        const d = Math.abs(x - (lastMove % N)) + Math.abs(y - ((lastMove / N) | 0));
        if (d <= 2) s += 1.2;
      }
      s += Math.random() * 1.6;
      if (s > bestScore) { bestScore = s; best = p; }
    }
    return bestScore < -4 ? -1 : best ?? -1;
  };

  // ---------- view ----------

  const el = (name, attrs = {}, parent) => {
    const e = document.createElementNS(NS, name);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    if (parent) parent.appendChild(e);
    return e;
  };

  const pad = 0.75;
  const svg = el('svg', {
    viewBox: `${-pad} ${-pad} ${N - 1 + pad * 2} ${N - 1 + pad * 2}`,
    class: 'goban',
    role: 'img',
    'aria-label': 'Scacchiera 9×9. Clicca un incrocio per giocare.',
  });
  const defs = el('defs', {}, svg);
  defs.innerHTML = `
    <radialGradient id="gb" cx=".36" cy=".32" r=".75"><stop offset="0" stop-color="#5b5f66"/><stop offset=".45" stop-color="#1d1f23"/><stop offset="1" stop-color="#050506"/></radialGradient>
    <radialGradient id="gw" cx=".36" cy=".3" r=".8"><stop offset="0" stop-color="#fff"/><stop offset=".6" stop-color="#f1efe9"/><stop offset="1" stop-color="#c9c4b8"/></radialGradient>
    <filter id="gs" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx=".04" dy=".08" stdDeviation=".06" flood-color="#3a2508" flood-opacity=".5"/></filter>
    <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".04 .9" numOctaves="2" seed="7"/><feColorMatrix values="0 0 0 0 .35 0 0 0 0 .22 0 0 0 0 .05 0 0 0 .9 0"/></filter>`;
  el('rect', { x: -pad, y: -pad, width: N - 1 + pad * 2, height: N - 1 + pad * 2, filter: 'url(#grain)', class: 'grain' }, svg);
  const lines = el('g', { stroke: '#5a3b12', 'stroke-opacity': '.6', 'stroke-width': '.03', 'stroke-linecap': 'square' }, svg);
  for (let i = 0; i < N; i++) {
    el('line', { x1: 0, y1: i, x2: N - 1, y2: i }, lines);
    el('line', { x1: i, y1: 0, x2: i, y2: N - 1 }, lines);
  }
  for (const [x, y] of STARS) el('circle', { cx: x, cy: y, r: 0.08, fill: '#5a3b12' }, svg);
  const stonesLayer = el('g', {}, svg);
  const ghost = el('circle', { r: 0.46, fill: 'url(#gb)', class: 'ghost' }, svg);
  const marker = el('circle', { r: 0.17, fill: 'none', 'stroke-width': '.06', visibility: 'hidden' }, svg);
  root.querySelector('[data-board]').appendChild(svg);

  // ---------- state ----------

  let board, ko, turn, captures, lastMove, passes, over, thinking;
  const stoneEls = new Map();

  const reset = () => {
    board = new Array(N * N).fill(EMPTY);
    ko = -1; turn = BLACK; captures = { [BLACK]: 0, [WHITE]: 0 };
    lastMove = -1; passes = 0; over = false; thinking = false;
    stoneEls.forEach((e) => e.remove());
    stoneEls.clear();
    draw();
    say('Tocca a te.');
  };

  const say = (t) => (statusEl.textContent = t);

  const draw = () => {
    for (let p = 0; p < N * N; p++) {
      const c = board[p], cur = stoneEls.get(p);
      if (c === EMPTY && cur) {
        stoneEls.delete(p);
        cur.classList.add('is-gone');
        setTimeout(() => cur.remove(), 360);
      } else if (c !== EMPTY && !cur) {
        stoneEls.set(p, el('circle', {
          cx: p % N, cy: (p / N) | 0, r: 0.47,
          fill: c === BLACK ? 'url(#gb)' : 'url(#gw)', filter: 'url(#gs)', class: 'st',
        }, stonesLayer));
      }
    }
    if (lastMove >= 0 && board[lastMove] !== EMPTY) {
      marker.setAttribute('cx', lastMove % N);
      marker.setAttribute('cy', (lastMove / N) | 0);
      marker.setAttribute('stroke', board[lastMove] === BLACK ? '#f1efe9' : '#1d1f23');
      marker.setAttribute('visibility', 'visible');
    } else marker.setAttribute('visibility', 'hidden');
    capB.textContent = captures[BLACK];
    capW.textContent = captures[WHITE];
    svg.classList.toggle('is-thinking', thinking);
  };

  const finish = () => {
    over = true;
    const { black, white } = areaScore(board);
    const diff = Math.abs(black - white).toLocaleString('it-IT');
    say(black > white ? `Hai vinto di ${diff} punti. Complimenti!` : `Vince il bianco di ${diff} punti (komi ${KOMI.toLocaleString('it-IT')}).`);
    draw();
  };

  const apply = (p, color) => {
    if (p < 0) {
      passes++;
      lastMove = -1;
      ko = -1;
      if (passes >= 2) return finish();
    } else {
      const res = tryPlay(board, p, color, ko);
      board = res.board; ko = res.ko; lastMove = p; passes = 0;
      captures[color] += res.captured.length;
    }
    turn = 3 - color;
    draw();
  };

  const whiteTurn = () => {
    thinking = true;
    say('Il bianco ci pensa…');
    draw();
    setTimeout(() => {
      thinking = false;
      const before = captures[WHITE];
      const p = chooseMove(board, ko, WHITE, lastMove);
      apply(p, WHITE);
      if (over) return;
      const took = captures[WHITE] - before;
      say(p < 0 ? 'Il bianco passa. Se passi anche tu, si conta.' : took ? `Il bianco cattura ${took === 1 ? 'una pietra' : `${took} pietre`}. Tocca a te.` : 'Tocca a te.');
    }, 380 + Math.random() * 320);
  };

  const pointFromEvent = (e) => {
    const ctm = svg.getScreenCTM();
    if (!ctm) return -1;
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    const x = Math.round(pt.x), y = Math.round(pt.y);
    if (x < 0 || y < 0 || x >= N || y >= N || Math.hypot(pt.x - x, pt.y - y) > 0.6) return -1;
    return y * N + x;
  };

  svg.addEventListener('pointermove', (e) => {
    const p = pointFromEvent(e);
    const show = e.pointerType === 'mouse' && p >= 0 && !over && !thinking && turn === BLACK && board[p] === EMPTY;
    ghost.classList.toggle('is-on', show);
    if (show) { ghost.setAttribute('cx', p % N); ghost.setAttribute('cy', (p / N) | 0); }
  });
  svg.addEventListener('pointerleave', () => ghost.classList.remove('is-on'));
  svg.addEventListener('click', (e) => {
    if (over) return reset();
    if (thinking || turn !== BLACK) return;
    const p = pointFromEvent(e);
    if (p < 0) return;
    if (board[p] !== EMPTY) return;
    if (p === ko) return say('Ko: non puoi riprendere subito. Gioca altrove e riprova.');
    if (!tryPlay(board, p, BLACK, ko)) return say('Mossa suicida: la pietra resterebbe senza libertà.');
    ghost.classList.remove('is-on');
    const before = captures[BLACK];
    apply(p, BLACK);
    const took = captures[BLACK] - before;
    if (took) say(took === 1 ? 'Catturata!' : `${took} pietre catturate!`);
    if (!over) setTimeout(whiteTurn, took ? 500 : 0);
  });

  root.querySelector('[data-pass]').addEventListener('click', () => {
    if (over || thinking || turn !== BLACK) return;
    apply(-1, BLACK);
    if (!over) whiteTurn();
  });
  root.querySelector('[data-reset]').addEventListener('click', reset);

  reset();
})();
