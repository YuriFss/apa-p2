// PD — árvores de chamadas (Fibonacci, mochila), tabela bottom-up e recuperação dos itens (Aula 13).
//
// PD.fibTree(n, memo) / PD.knapTree(n, M, p, v, memo) -> árvore { id, label, key, edge, children, value, hit, base }
// PD.treeSteps(root, kind, ctx) -> passos para StepPlayer (kind: 'fib' | 'fibmemo' | 'knap' | 'knapmemo')
// PD.treeExtra(root, opts) -> extra do StepPlayer (desenha a árvore, e a memo se houver)
// PD.drawTree(root, st, opts) -> SVG estático (st.all = true mostra tudo)
// PD.tableSteps(p, v, M) / PD.backSteps(p, v, M) / PD.tableExtra(p, v, M)
// PD.solve(p, v, M) -> k (matriz)
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const S = (tag, a, text) => { const e = document.createElementNS(NS, tag); for (const k in a) e.setAttribute(k, a[k]); if (text != null) e.textContent = text; return e; };
  const FIB_COLORS = { 5: 'verde', 4: 'roxo', 3: 'laranja', 2: 'vermelho', 1: 'azul' };
  const PALETTE = ['roxo', 'laranja', 'azul', 'vermelho', 'verde'];

  // ---------- árvores ----------
  function fibTree(n, memo) {
    let id = 0; const seen = new Set();
    const rec = (k) => {
      const node = { id: id++, label: `fib(${k})`, key: String(k), children: [] };
      if (memo && seen.has(k)) { node.hit = true; node.value = fibv(k); return node; }
      seen.add(k);
      if (k <= 2) { node.base = true; node.value = 1; return node; }
      node.children = [rec(k - 1), rec(k - 2)];
      node.value = node.children[0].value + node.children[1].value;
      return node;
    };
    return rec(n);
  }
  const fibv = (k) => { let a = 1, b = 1; for (let i = 3; i <= k; i++) [a, b] = [b, a + b]; return b; };

  function knapTree(n, M, p, v, memo) {
    let id = 0; const seen = new Set();
    const rec = (k, w, edge) => {
      const key = `${k},${w}`;
      const node = { id: id++, label: `f(${k},${w})`, key, edge, children: [], k, w };
      if (k === 0 || w === 0) { node.base = true; node.value = 0; return node; }
      if (memo && seen.has(key)) { node.hit = true; node.value = knapv(k, w, p, v); return node; }
      seen.add(key);
      if (p[k - 1] > w) { node.children = [rec(k - 1, w, `exclui i${k}`)]; node.value = node.children[0].value; node.nofit = true; }
      else {
        node.children = [rec(k - 1, w - p[k - 1], `inclui i${k}`), rec(k - 1, w, `exclui i${k}`)];
        node.value = Math.max(node.children[0].value + v[k - 1], node.children[1].value);
      }
      return node;
    };
    return rec(n, M, null);
  }
  const knapv = (k, w, p, v) => solve(p.slice(0, k), v.slice(0, k), w)[k][w];

  const nodes = (root) => { const out = []; (function r(n, par, d) { n.parent = par; n.depth = d; out.push(n); n.children.forEach((c) => r(c, n, d + 1)); })(root, null, 0); return out; };
  function layout(root) {
    let x = 0;
    (function r(n) { if (!n.children.length) n.x = x++; else { n.children.forEach(r); n.x = (n.children[0].x + n.children[n.children.length - 1].x) / 2; } })(root);
    return x;
  }
  function colorsFor(root, kind) {
    const all = nodes(root), cnt = {};
    all.forEach((n) => (cnt[n.key] = (cnt[n.key] || 0) + 1));
    const map = {};
    if (kind.startsWith('fib')) Object.entries(FIB_COLORS).forEach(([k, c]) => (map[k] = c));
    else { let i = 0; [...new Set(all.map((n) => n.key))].filter((k) => cnt[k] > 1).forEach((k) => (map[k] = PALETTE[i++ % PALETTE.length])); }
    return map;
  }

  // st: { seen:[ids], stack:[ids], ret:{id:v}, fresh:id, all:bool }
  function drawTree(root, st = {}, o = {}) {
    const all = nodes(root), W = layout(root);
    const dx = o.dx || 70, dy = o.dy || 70, nw = o.nw || 56, nh = 26;
    const depth = Math.max(...all.map((n) => n.depth));
    const svg = S('svg', { class: 'pdt', viewBox: `0 0 ${W * dx} ${(depth + 1) * dy + 14}` });
    svg.style.maxWidth = Math.round(W * dx * 1.15) + 'px';
    svg.style.minWidth = Math.round(Math.min(W * dx * 0.8, 640)) + 'px';
    const P = (n) => [n.x * dx + dx / 2, n.depth * dy + 24];
    const seen = new Set(st.all ? all.map((n) => n.id) : st.seen || []);
    const stack = new Set(st.stack || []), top = (st.stack || [])[st.stack ? st.stack.length - 1 : -1];
    const ret = st.all ? Object.fromEntries(all.map((n) => [n.id, n.value])) : st.ret || {};
    const colors = o.colors || {};
    const gE = S('g'), gN = S('g');
    svg.append(gE, gN);
    for (const n of all) {
      if (!n.parent) continue;
      const [x1, y1] = P(n.parent), [x2, y2] = P(n);
      const vis = seen.has(n.id);
      const cls = 'te' + (vis ? '' : ' ghost') + (n.cut ? ' cut' : '') + (stack.has(n.id) ? ' on' : '') + (st.fresh === n.id ? ' new' : '');
      const ln = S('line', { x1, y1: y1 + nh / 2, x2, y2: y2 - nh / 2, class: cls });
      if (st.fresh === n.id) ln.setAttribute('pathLength', '1');
      gE.append(ln);
      if (n.edge && (vis || o.ghostLabels)) {
        const inc = n.edge.startsWith('inclui');
        gE.append(S('text', { x: (x1 + x2) / 2 + (x2 < x1 ? -4 : 4), y: (y1 + y2) / 2 + 4, class: 'el' + (inc ? ' inc' : '') + (vis ? '' : ' ghost'), 'text-anchor': x2 < x1 ? 'end' : 'start' }, n.edge));
      }
    }
    for (const n of all) {
      const [x, y] = P(n);
      const vis = seen.has(n.id);
      let cls = 'nd';
      if (!vis) cls += ' ghost';
      if (colors[n.key]) cls += ' c-' + colors[n.key];
      if (vis && n.hit) cls += ' hit';
      if (n.cut) cls += ' cut';
      if (stack.has(n.id)) cls += ' on';
      if (n.id === top) cls += ' cur';
      if (st.fresh === n.id) cls += ' new';
      const g = S('g', { class: cls, transform: `translate(${x},${y})` });
      g.append(S('rect', { x: -nw / 2, y: -nh / 2, width: nw, height: nh, rx: 7 }));
      g.append(S('text', { class: 'lb', y: 1 }, n.label));
      if (n.id in ret) {
        const vg = S('g', { class: 'vb' + (n.hit ? ' hit' : '') + (st.justRet === n.id ? ' new' : ''), transform: `translate(${nw / 2 - 1},${-nh / 2 - 1})` });
        const txt = String(ret[n.id]);
        vg.append(S('rect', { x: -10 - (txt.length - 1) * 3.5, y: -9, width: 20 + (txt.length - 1) * 7, height: 18, rx: 9 }), S('text', { y: 1 }, txt));
        g.append(vg);
      }
      gN.append(g);
    }
    return svg;
  }

  // ---------- passos das árvores ----------
  const CODES = {
    fib: ['fib(n)', 'if n <= 2', '    return 1', 'return fib(n − 1) + fib(n − 2)'],
    fibmemo: [{ h: 'init(n)' }, ['', 'for i = 1 to n: memo[i] ← NULL'], ['', 'memo[1] ← 1; memo[2] ← 1'], { h: 'fib(n)' }, ['1.', 'if memo[n] == NULL'], ['2.', '    memo[n] ← fib(n − 1) + fib(n − 2)'], ['3.', 'return memo[n]']],
    knap: ['knapsack(n, M, p, v)', 'if n == 0 or M == 0: return 0', 'if p[n−1] > M:', '    return knapsack(n − 1, M, p, v)', 'return max(knapsack(n − 1, M − p[n−1], p, v) + v[n−1],', '           knapsack(n − 1, M, p, v))'],
    knapmemo: ['knapsack(n, M, p, v, memo)', 'if memo[n][M] == −1:', '    if p[n−1] > M:', '        memo[n][M] = knapsack(n − 1, M, p, v, memo)', '    else:', '        memo[n][M] = max(knapsack(n−1, M − p[n−1], …) + v[n−1], knapsack(n−1, M, …))', 'return memo[n][M]'],
  };
  // linhas de cada evento, por tipo
  const L = {
    fib: { enter: 1, base: 2, hit: null, ret: 3 },
    fibmemo: { enter: 4, base: 6, hit: 6, ret: 5 },
    knap: { enter: 1, base: 1, hit: null, ret: 4, nofit: 3 },
    knapmemo: { enter: 1, base: 6, hit: 6, ret: 5, nofit: 3 },
  };

  function treeSteps(root, kind, ctx = {}) {
    const out = [], seen = [], stack = [], ret = {}; let calls = 0;
    const isFib = kind.startsWith('fib'), memoMode = kind.endsWith('memo');
    const fibMemo = isFib && memoMode ? Array.from({ length: ctx.n }, (_, i) => (i < 2 ? 1 : null)) : null;
    const kMemo = !isFib && memoMode ? Array.from({ length: ctx.n + 1 }, (_, i) => Array.from({ length: ctx.M + 1 }, (_, w) => (i === 0 || w === 0 ? 0 : -1))) : null;
    const ln = L[kind];
    const snap = (line, note, extra = {}) => {
      const st = { line, note, seen: [...seen], stack: [...stack], ret: { ...ret }, vars: { chamadas: calls }, ...extra };
      if (fibMemo) st.arrays = [{ name: 'memo', base: 1, values: fibMemo.map((x) => (x == null ? '?' : x)), marks: extra.marks || {} }];
      if (kMemo) st.kmemo = kMemo.map((r) => r.slice());
      return st;
    };
    const v = ctx.v || [], p = ctx.p || [];
    (function visit(n) {
      seen.push(n.id); stack.push(n.id); calls++;
      let enterNote = `Chamada nº ${calls}: <b>${n.label}</b>.`;
      if (n.edge) enterNote += ` (ramo: ${n.edge.replace(/ i(\d+)/, ' o item $1')})`;
      out.push(snap(ln.enter, enterNote, { fresh: n.id, kcell: n.k != null ? [n.k, n.w] : null }));
      if (n.hit) {
        ret[n.id] = n.value;
        const where = isFib ? `memo[${n.label.slice(4, -1)}]` : `memo[${n.k}][${n.w}]`;
        out.push(snap(ln.hit, `${where} já está preenchido: devolve <b>${n.value}</b> sem calcular de novo.`, { justRet: n.id, marks: isFib ? { [+n.key - 1]: 'hit' } : {}, kcell: n.k != null ? [n.k, n.w] : null, khit: true }));
        stack.pop(); return;
      }
      if (n.base) {
        ret[n.id] = n.value;
        const why = isFib ? (memoMode ? `memo[${n.key}] = 1 (veio do init).` : `n = ${n.key} ≤ 2: caso base.`) : (n.k === 0 ? 'nenhum item para considerar' : 'capacidade 0, nada cabe');
        out.push(snap(ln.base, `${why}${isFib ? '' : ':'} ${isFib ? 'Devolve' : 'devolve'} <b>${n.value}</b>.`, { justRet: n.id, kcell: n.k != null ? [n.k, n.w] : null }));
        stack.pop(); return;
      }
      if (n.nofit) out.push(snap(ln.nofit, `O item ${n.k} pesa ${p[n.k - 1]} &gt; ${n.w}: não cabe. Só resta excluí-lo.`, { kcell: [n.k, n.w] }));
      n.children.forEach(visit);
      ret[n.id] = n.value;
      let note;
      if (isFib) note = `${n.label} = ${ret[n.children[0].id]} + ${ret[n.children[1].id]} = <b>${n.value}</b>.`;
      else if (n.nofit) note = `${n.label} = ${n.label.replace(/\((\d+)/, (_, a) => '(' + (a - 1))} = <b>${n.value}</b>.`;
      else { const a = ret[n.children[0].id], b = ret[n.children[1].id]; note = `${n.label} = max(inclui: ${a} + ${v[n.k - 1]}, exclui: ${b}) = max(${a + v[n.k - 1]}, ${b}) = <b>${n.value}</b>.`; }
      if (fibMemo) { fibMemo[+n.key - 1] = n.value; note += ` Guarda em memo[${n.key}].`; }
      if (kMemo) { kMemo[n.k][n.w] = n.value; note += ` Guarda em memo[${n.k}][${n.w}].`; }
      out.push(snap(n.nofit ? ln.nofit : ln.ret, note, { justRet: n.id, marks: fibMemo ? { [+n.key - 1]: 'new' } : {}, kcell: n.k != null ? [n.k, n.w] : null, knew: true }));
      stack.pop();
    })(root);
    const last = out[out.length - 1];
    last.note += ` Fim: <b>${calls} chamadas</b>.`;
    return out;
  }

  function kmemoTable(km, cell, cls) {
    const t = APA.el('table', { class: 'pdk small' });
    t.append(APA.el('tr', {}, APA.el('th', {}, 'memo'), ...km[0].map((_, w) => APA.el('th', {}, 'w=' + w))));
    km.forEach((r, i) => t.append(APA.el('tr', {}, APA.el('th', {}, 'k=' + i), ...r.map((x, w) => APA.el('td', { class: 'num' + (x === -1 ? ' empty' : '') + (cell && cell[0] === i && cell[1] === w ? ' ' + cls : '') }, String(x))))));
    return t;
  }

  const treeExtra = (root, o = {}) => (st, el) => {
    const box = APA.el('div', { class: 'pdtbox' });
    box.append(drawTree(root, st, o));
    el.append(box);
    if (st.kmemo) { const w = APA.el('div', { class: 'table-wrap' }); w.append(kmemoTable(st.kmemo, st.kcell, st.khit ? 'hit' : st.knew ? 'new' : 'cur')); el.append(w); }
  };

  // ---------- mochila bottom-up ----------
  function solve(p, v, M) {
    const n = p.length, k = Array.from({ length: n + 1 }, () => Array(M + 1).fill(0));
    for (let i = 1; i <= n; i++) for (let m = 1; m <= M; m++) k[i][m] = p[i - 1] <= m ? Math.max(v[i - 1] + k[i - 1][m - p[i - 1]], k[i - 1][m]) : k[i - 1][m];
    return k;
  }
  const TABLE_CODE = ['knapsack(n, M, p, v)', 'for i = 0 to n:', '    for m = 0 to M:', '        if i == 0 or m == 0: k[i][m] = 0', '        else if p[i−1] <= m:', '            k[i][m] = max(v[i−1] + k[i−1][m − p[i−1]], k[i−1][m])', '        else:', '            k[i][m] = k[i−1][m]', 'return k[n][M]'];
  function tableSteps(p, v, M) {
    const n = p.length, K = solve(p, v, M), shown = Array.from({ length: n + 1 }, () => Array(M + 1).fill(null)), out = [];
    const snap = (line, note, mk = {}, vars = {}) => ({ line, note, grid: shown.map((r) => r.slice()), mk, vars });
    for (let m = 0; m <= M; m++) shown[0][m] = 0;
    out.push(snap(3, 'Linha i = 0: com <b>nenhum item</b>, o melhor valor é 0 para qualquer capacidade.', { row: 0 }, { i: 0 }));
    for (let i = 1; i <= n; i++) {
      const pi = p[i - 1], vi = v[i - 1];
      shown[i][0] = 0;
      out.push(snap(3, `Linha i = ${i} (item ${i}: peso ${pi}, valor ${vi}). Coluna m = 0: capacidade zero, valor 0.`, { cur: [i, 0] }, { i, m: 0 }));
      for (let m = 1; m <= M; m++) {
        const up = K[i - 1][m];
        if (pi <= m) {
          const diag = K[i - 1][m - pi];
          out.push(snap(4, `k[${i}][${m}]: o item ${i} pesa ${pi} ≤ ${m}, cabe. <b>Sem ele:</b> k[${i - 1}][${m}] = ${up}. <b>Com ele:</b> ${vi} + k[${i - 1}][${m - pi}] = ${vi} + ${diag} = ${vi + diag}.`,
            { cur: [i, m], look: [[i - 1, m], [i - 1, m - pi]] }, { i, m }));
          shown[i][m] = K[i][m];
          const took = vi + diag > up;
          out.push(snap(5, `k[${i}][${m}] = max(${vi + diag}, ${up}) = <b>${K[i][m]}</b>. ${took ? `Vale a pena levar o item ${i}.` : vi + diag === up ? 'Empate: tanto faz.' : `Não vale a pena levar o item ${i}.`}`,
            { cur: [i, m], from: [took ? [i - 1, m - pi] : [i - 1, m]], took }, { i, m }));
        } else {
          out.push(snap(6, `k[${i}][${m}]: o item ${i} pesa ${pi} &gt; ${m}. <b>Não cabe.</b> Só resta a opção sem ele: k[${i - 1}][${m}] = ${up}.`, { cur: [i, m], look: [[i - 1, m]] }, { i, m }));
          shown[i][m] = K[i][m];
          out.push(snap(7, `k[${i}][${m}] = k[${i - 1}][${m}] = <b>${K[i][m]}</b> (copia o valor de cima).`, { cur: [i, m], from: [[i - 1, m]] }, { i, m }));
        }
      }
    }
    out.push(snap(8, `Tabela completa. A resposta é a última célula: k[${n}][${M}] = <b>${K[n][M]}</b>.`, { cur: [n, M] }, {}));
    return out;
  }

  const BACK_CODE = ['recuperar(k, n, M, p)', 'i = n; m = M; S = ∅', 'while i > 0 and m > 0:', '    if k[i][m] ≠ k[i−1][m]:', '        S = S ∪ {i}; m = m − p[i−1]', '    i = i − 1', 'return S'];
  function backSteps(p, v, M) {
    const n = p.length, K = solve(p, v, M), out = [], path = [], S = [];
    let i = n, m = M;
    const snap = (line, note, mk = {}) => ({ line, note, grid: K.map((r) => r.slice()), mk: { path: path.slice(), ...mk }, vars: { i, m, S: '{' + S.map((x) => 'i' + x).join(', ') + '}' } });
    path.push([i, m]);
    out.push(snap(1, `Começamos na resposta: k[${n}][${M}] = ${K[n][M]}.`, { cur: [i, m] }));
    while (i > 0 && m > 0) {
      const a = K[i][m], b = K[i - 1][m];
      out.push(snap(3, `Compare k[${i}][${m}] = ${a} com a célula de cima, k[${i - 1}][${m}] = ${b}.`, { cur: [i, m], look: [[i - 1, m]] }));
      if (a !== b) {
        S.push(i); const pm = m; m -= p[i - 1];
        out.push(snap(4, `${a} ≠ ${b}: sem o item ${i} o valor seria menor. Então <b>o item ${i} está na mochila</b>. Sobra capacidade ${pm} − ${p[i - 1]} = ${m}.`, { cur: [i, pm], took: true, inItems: S.slice() }));
      } else {
        out.push(snap(5, `${a} = ${b}: dá para ter o mesmo valor sem o item ${i}. <b>O item ${i} fica de fora.</b>`, { cur: [i, m], out: true }));
      }
      i--; path.push([i, m]);
      out.push(snap(5, `Subimos para a linha ${i}: agora estamos em k[${i}][${m}].`, { cur: [i, m] }));
    }
    const W = S.reduce((s, x) => s + p[x - 1], 0), V = S.reduce((s, x) => s + v[x - 1], 0);
    out.push(snap(6, `${i === 0 ? 'i = 0' : 'm = 0'}: fim. Itens escolhidos: <b>{${S.slice().reverse().map((x) => 'i' + x).join(', ')}}</b>. Peso ${W} ≤ ${M}, valor ${V} = k[${n}][${M}].`, { cur: [i, m] }));
    return out;
  }

  function drawTable(p, v, M, st) {
    const n = p.length, mk = st.mk || {};
    const has = (arr, i, m) => (arr || []).some(([a, b]) => a === i && b === m);
    const t = APA.el('table', { class: 'pdk' });
    t.append(APA.el('tr', {}, APA.el('th', { class: 'corner' }, 'i \\ m'), ...Array.from({ length: M + 1 }, (_, m) => APA.el('th', { class: 'num' + (mk.cur && mk.cur[1] === m ? ' hl' : '') }, String(m)))));
    for (let i = 0; i <= n; i++) {
      const head = i === 0 ? '0 · nenhum' : `${i} · p=${p[i - 1]} v=${v[i - 1]}`;
      const tr = APA.el('tr', {}, APA.el('th', { class: 'rh' + (mk.cur && mk.cur[0] === i ? ' hl' : '') + ((mk.inItems || []).includes(i) ? ' in' : '') }, head));
      for (let m = 0; m <= M; m++) {
        let c = 'num';
        const val = st.grid[i][m];
        if (val == null) c += ' empty';
        if (mk.row === i) c += ' new';
        if (has(mk.look, i, m)) c += ' look';
        if (has(mk.from, i, m)) c += ' from';
        if (has(mk.path, i, m)) c += ' path';
        if (mk.cur && mk.cur[0] === i && mk.cur[1] === m) c += ' cur' + (mk.took ? ' took' : '') + (mk.out ? ' out' : '');
        tr.append(APA.el('td', { class: c }, val == null ? '' : String(val)));
      }
      t.append(tr);
    }
    return t;
  }
  const tableExtra = (p, v, M) => (st, el) => { const w = APA.el('div', { class: 'table-wrap' }); w.append(drawTable(p, v, M, st)); el.append(w); };

  function markCut(root, hitBase = true) {
    const seen = new Set(); let saved = 0;
    (function r(n, cut) {
      if (cut) { n.cut = true; saved++; }
      else if (seen.has(n.key) && (hitBase || !n.base)) { n.hit = true; n.children.forEach((c) => r(c, true)); return; }
      seen.add(n.key);
      n.children.forEach((c) => r(c, cut));
    })(root, false);
    return saved;
  }
  window.PD = { markCut, fibTree, knapTree, treeSteps, treeExtra, drawTree, colorsFor, CODES, solve, TABLE_CODE, tableSteps, BACK_CODE, backSteps, tableExtra, drawTable, nodes };
})();
