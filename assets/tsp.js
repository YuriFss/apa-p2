// TSP — instâncias, traços para StepPlayer e laboratório euclidiano (Aula 10).
//
// TSP.M5                 instância 5 cidades (matriz das lições)
// TSP.draw(inst, st)     SVG via GraphView: st = { tour:[...], closed, cand:[[u,v]], add:[[u,v]], del:[[u,v]], cur, tags }
// TSP.matrix(inst, hl)   tabela da matriz; hl = { row:'A', cells:{'A-B':'cand'|'pick'|'off'} }
// TSP.traceBrute/HVM/HMI/TwoOpt(inst, ...) -> passos (StepPlayer, com extra: TSP.extra(inst))
// TSP.lab(el)            laboratório com pontos aleatórios: HVM, HMI, 2-opt animados
(function () {
  const key = (u, v) => [u, v].sort().join('-');
  const M5 = {
    V: ['A', 'B', 'C', 'D', 'E'],
    w: { 'A-B': 3, 'A-C': 4, 'A-D': 2, 'A-E': 7, 'B-C': 4, 'B-D': 7, 'B-E': 3, 'C-D': 5, 'C-E': 7, 'D-E': 6 },
    pos: { A: [80, 70], C: [270, 40], B: [390, 150], E: [280, 260], D: [90, 230] },
  };
  const c = (inst, u, v) => inst.w[key(u, v)];
  const tourEdges = (t, closed = true) => t.map((u, i) => [u, t[(i + 1) % t.length]]).slice(0, closed ? t.length : t.length - 1);
  const cost = (inst, t) => tourEdges(t).reduce((s, [u, v]) => s + c(inst, u, v), 0);
  const show = (t) => t.join(' → ') + (t.length > 1 ? ' → ' + t[0] : '');

  // ---------- desenho ----------
  function draw(inst, st = {}) {
    const edges = [], cls = {}, seen = new Set();
    const put = (u, v, k) => {
      const kk = key(u, v);
      if (!seen.has(kk)) { seen.add(kk); edges.push([u, v, c(inst, u, v)]); }
      cls[kk] = k;
    };
    if (st.tour && st.tour.length > 1) tourEdges(st.tour, st.closed !== false).forEach(([u, v]) => put(u, v, 'ok'));
    (st.cand || []).forEach(([u, v]) => put(u, v, 'cand'));
    (st.del || []).forEach(([u, v]) => put(u, v, 'bad'));
    (st.add || []).forEach(([u, v]) => put(u, v, 'hot new'));
    const node = {};
    (st.tour || []).forEach((v) => (node[v] = 'in'));
    if (st.cur) node[st.cur] = 'hot';
    const box = GraphView.render({ pos: inst.pos, edges }, { edge: cls, node, tags: st.tags || {} });
    box.querySelectorAll('line.new').forEach((l) => l.setAttribute('pathLength', '1'));
    return box;
  }

  function matrix(inst, hl = {}) {
    const t = APA.el('table', { class: 'tspm' });
    t.append(APA.el('tr', {}, APA.el('th', {}, ''), ...inst.V.map((v) => APA.el('th', {}, v))));
    for (const u of inst.V) {
      const tr = APA.el('tr', { class: hl.row === u ? 'row' : '' }, APA.el('th', {}, u));
      for (const v of inst.V) {
        const k = (hl.cells || {})[u + '-' + v] || '';
        tr.append(APA.el('td', { class: 'num ' + k }, u === v ? '–' : String(c(inst, u, v))));
      }
      t.append(tr);
    }
    return t;
  }

  // extra padrão: grafo + (opcional) matriz + (opcional) tabela de Δ
  const extra = (inst) => (st, el) => {
    const row = APA.el('div', { class: 'figrow tsprow' });
    const g = APA.el('div'); g.append(draw(inst, st.g || {}));
    row.append(g);
    if (st.m) { const m = APA.el('div', { class: 'table-wrap' }); m.append(matrix(inst, st.m)); row.append(m); }
    el.append(row);
    if (st.deltas) {
      const t = APA.el('table', { class: 'tspd' });
      t.append(APA.el('tr', {}, ...st.deltas.head.map((h) => APA.el('th', {}, h))));
      st.deltas.rows.forEach((r) => t.append(APA.el('tr', { class: r.cls || '' }, ...r.cells.map((x) => APA.el('td', { html: String(x) })))));
      const w = APA.el('div', { class: 'table-wrap' }); w.append(t); el.append(w);
    }
  };

  // ---------- força bruta ----------
  const BRUTE_CODE = ['FORÇA-BRUTA(cidades)', 'melhor = ∞', 'for cada ordem das cidades começando em A', '    custo = soma das n arestas do ciclo', '    if custo < melhor then', '        melhor = custo; guarde a ordem', 'return melhor'];
  function perms(a) { if (a.length <= 1) return [a]; return a.flatMap((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).map((p) => [x, ...p])); }
  function traceBrute(inst) {
    const [s, ...rest] = inst.V, out = [], done = {};
    let best = Infinity, bestT = null;
    out.push({ line: 1, vars: { melhor: '∞' }, g: {}, note: 'Começamos sem tour nenhum: melhor = ∞.' });
    perms(rest).forEach((p, k) => {
      const t = [s, ...p], cst = cost(inst, t), rev = [s, ...p.slice().reverse()].join('');
      const twin = done[rev];
      done[t.join('')] = k + 1;
      const parts = tourEdges(t).map(([u, v]) => c(inst, u, v)).join(' + ');
      out.push({ line: 3, vars: { ordem: k + 1, custo: cst, melhor: best === Infinity ? '∞' : best }, g: { tour: t },
        note: `Ordem ${k + 1}: ${show(t)}. Custo = ${parts} = <b>${cst}</b>.` + (twin ? ` É a ordem ${twin} <b>ao contrário</b>: mesmo ciclo.` : '') });
      if (cst < best) {
        best = cst; bestT = t;
        out.push({ line: 5, vars: { ordem: k + 1, custo: cst, melhor: best }, g: { tour: t }, note: `${cst} é menor: agora melhor = ${cst}.` });
      } else {
        out.push({ line: 4, vars: { ordem: k + 1, custo: cst, melhor: best }, g: { tour: t }, note: `${cst} não é menor que ${best}. Nada muda.` });
      }
    });
    out.push({ line: 6, vars: { melhor: best }, g: { tour: bestT }, note: `Fim. ${perms(rest).length} ordens, mas só ${perms(rest).length / 2} ciclos diferentes. Ótimo: ${show(bestT)}, custo <b>${best}</b>.` });
    return out;
  }

  // ---------- vizinho mais próximo ----------
  const HVM_CODE = ['HVM(j)', 'tour = [j]; marque j', 'u = j', 'while existe cidade não marcada do', '    v = cidade não marcada com menor c[u][v]', '    tour.add(v); marque v', '    u = v', 'feche o ciclo: aresta (u, j)'];
  function traceHVM(inst, j) {
    const out = [], t = [j]; let u = j, total = 0;
    const vars = () => ({ u, tour: '[' + t.join(', ') + ']', custo: total });
    out.push({ line: 1, vars: vars(), g: { tour: t, cur: j, closed: false }, m: { row: j }, note: `Começamos em ${j}. O tour tem só ${j}.` });
    while (t.length < inst.V.length) {
      const cand = inst.V.filter((x) => !t.includes(x));
      const v = cand.reduce((a, b) => (c(inst, u, b) < c(inst, u, a) ? b : a));
      const cells = {};
      inst.V.forEach((x) => { if (x !== u) cells[u + '-' + x] = t.includes(x) ? 'off' : x === v ? 'pick' : 'cand'; });
      out.push({ line: 4, vars: vars(), g: { tour: t, closed: false, cur: u, cand: cand.map((x) => [u, x]) }, m: { row: u, cells },
        note: `Linha ${u} da matriz, só não marcadas: ${cand.map((x) => `${x} = ${c(inst, u, x)}`).join(', ')}. Menor: <b>${v}</b>.` });
      total += c(inst, u, v); t.push(v);
      out.push({ line: 5, vars: vars(), g: { tour: t, closed: false, cur: u, add: [[u, v]] }, m: { row: u, cells: { [u + '-' + v]: 'pick' } },
        note: `${v} entra no tour. Custo += ${c(inst, u, v)}, agora ${total}.` });
      u = v;
      out.push({ line: 6, vars: vars(), g: { tour: t, closed: false, cur: u }, m: { row: u }, note: `Agora estamos em ${u}.` });
    }
    out.push({ line: 3, vars: vars(), g: { tour: t, closed: false, cur: u }, note: 'Todas as cidades estão marcadas. O laço termina.' });
    total += c(inst, u, j);
    out.push({ line: 7, vars: vars(), g: { tour: t, cur: u, add: [[u, j]] }, m: { row: u, cells: { [u + '-' + j]: 'pick' } },
      note: `Não esqueça a volta: ${u} → ${j} custa ${c(inst, u, j)}. Total = <b>${total}</b>.` });
    return out;
  }
  function hvm(inst, j) { const t = [j]; while (t.length < inst.V.length) { const u = t[t.length - 1]; t.push(inst.V.filter((x) => !t.includes(x)).reduce((a, b) => (c(inst, u, b) < c(inst, u, a) ? b : a))); } return t; }

  // ---------- melhor inserção ----------
  const HMI_CODE = ['HMI()', 'ache a aresta (i, j) de menor custo; tour = i → j → i', 'while existe cidade fora do tour do', '    for cada k fora e cada aresta (i, j) do tour do', '        Δ = c[i][k] + c[k][j] − c[i][j]', '    escolha o par (k, (i, j)) com menor Δ', '    remova (i, j); adicione (i, k) e (k, j)', 'return tour'];
  function traceHMI(inst) {
    const out = [];
    const all = []; inst.V.forEach((a, i) => inst.V.slice(i + 1).forEach((b) => all.push([a, b])));
    const [i0, j0] = all.reduce((p, q) => (c(inst, ...q) < c(inst, ...p) ? q : p));
    const t = [i0, j0];
    out.push({ line: 1, vars: { tour: show(t), custo: cost(inst, t) }, g: { tour: t, add: [[i0, j0]] },
      note: `Menor aresta: ${i0}–${j0} = ${c(inst, i0, j0)}. Tour ${show(t)}: ida e volta, custo ${cost(inst, t)}.` });
    while (t.length < inst.V.length) {
      const fora = inst.V.filter((x) => !t.includes(x));
      const pos = t.length === 2 ? [0] : t.map((_, p) => p); // com 2 cidades, (i,j) e (j,i) são a mesma aresta
      const rows = []; let best = null;
      const head = ['k', 'entre', 'Δ'];
      for (const k of fora) for (const p of pos) {
        const i = t[p], j = t[(p + 1) % t.length];
        const d = c(inst, i, k) + c(inst, k, j) - c(inst, i, j);
        rows.push({ cells: [k, `${i}–${j}`, `${c(inst, i, k)} + ${c(inst, k, j)} − ${c(inst, i, j)} = <b>${d}</b>`] });
        const cur = { d, k, p, i, j };
        if (!best || d < best.d) best = cur;
        out.push({ line: 4, vars: { tour: show(t), custo: cost(inst, t), k, 'Δ': d }, g: { tour: t, del: t.length === 2 ? [] : [[i, j]], cand: [[i, k], [k, j]], cur: k },
          deltas: { head, rows: rows.map((r) => ({ ...r })) },
          note: `Inserir ${k} entre ${i} e ${j}: sai ${i}–${j} (${c(inst, i, j)}), entram ${i}–${k} (${c(inst, i, k)}) e ${k}–${j} (${c(inst, k, j)}). Δ = ${d}.` + (t.length === 2 ? ` (Com 2 cidades, ${i}–${j} é usada na ida e na volta; só a ida sai, e só há uma posição.)` : '') });
      }
      const bi = rows.findIndex((r) => r.cells[0] === best.k && r.cells[1] === `${best.i}–${best.j}`);
      const marked = rows.map((r, x) => ({ ...r, cls: x === bi ? 'pick' : '' }));
      out.push({ line: 5, vars: { tour: show(t), custo: cost(inst, t), k: best.k, 'Δ': best.d }, g: { tour: t, del: t.length === 2 ? [] : [[best.i, best.j]], cand: [[best.i, best.k], [best.k, best.j]], cur: best.k },
        deltas: { head, rows: marked }, note: `Menor Δ da tabela: <b>${best.k}</b> entre ${best.i} e ${best.j}, Δ = ${best.d}.` });
      const before = cost(inst, t);
      t.splice(best.p + 1, 0, best.k);
      out.push({ line: 6, vars: { tour: show(t), custo: cost(inst, t) }, g: { tour: t, add: [[best.i, best.k], [best.k, best.j]] },
        deltas: { head, rows: marked }, note: `${best.k} entra. Custo: ${before} + ${best.d} = <b>${cost(inst, t)}</b>.` });
    }
    out.push({ line: 7, vars: { tour: show(t), custo: cost(inst, t) }, g: { tour: t }, note: `Todas as cidades estão no tour. Custo final <b>${cost(inst, t)}</b>.` });
    return out;
  }

  // ---------- 2-opt ----------
  const OPT2_CODE = ['2-OPT(tour)', 'repeat', '    for cada par de arestas não vizinhas (p, q) e (r, s) do tour do', '        Δ = c[p][r] + c[q][s] − c[p][q] − c[r][s]', '    if o menor Δ < 0 then', '        troque: remova (p, q), (r, s); adicione (p, r), (q, s)', 'until nenhum Δ < 0   ▸ ótimo local'];
  function neighbors(inst, t) {
    const n = t.length, out = [];
    for (let i = 0; i < n - 1; i++) for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      const p = t[i], q = t[i + 1], r = t[j], s = t[(j + 1) % n];
      out.push({ i, j, p, q, r, s, d: c(inst, p, r) + c(inst, q, s) - c(inst, p, q) - c(inst, r, s),
        nt: [...t.slice(0, i + 1), ...t.slice(i + 1, j + 1).reverse(), ...t.slice(j + 1)] });
    }
    return out;
  }
  function traceTwoOpt(inst, start) {
    let t = start.slice(); const out = []; let pass = 0;
    const head = ['remove', 'adiciona', 'Δ'];
    out.push({ line: 1, vars: { tour: show(t), custo: cost(inst, t) }, g: { tour: t }, note: `Tour inicial ${show(t)}, custo ${cost(inst, t)}.` });
    for (;;) {
      pass++;
      const nb = neighbors(inst, t), rows = [];
      nb.forEach((m) => {
        rows.push({ cells: [`${m.p}${m.q} (${c(inst, m.p, m.q)}), ${m.r}${m.s} (${c(inst, m.r, m.s)})`, `${m.p}${m.r} (${c(inst, m.p, m.r)}), ${m.q}${m.s} (${c(inst, m.q, m.s)})`, `<b>${m.d}</b>`] });
        out.push({ line: 3, vars: { passada: pass, tour: show(t), custo: cost(inst, t), 'Δ': m.d }, g: { tour: t, del: [[m.p, m.q], [m.r, m.s]], cand: [[m.p, m.r], [m.q, m.s]] },
          deltas: { head, rows: rows.map((r) => ({ ...r })) },
          note: `Tira ${m.p}–${m.q} e ${m.r}–${m.s}; põe ${m.p}–${m.r} e ${m.q}–${m.s}. Δ = ${c(inst, m.p, m.r)} + ${c(inst, m.q, m.s)} − ${c(inst, m.p, m.q)} − ${c(inst, m.r, m.s)} = ${m.d}.` });
      });
      const best = nb.reduce((a, b) => (b.d < a.d ? b : a));
      const bi = nb.indexOf(best);
      const marked = rows.map((r, x) => ({ ...r, cls: x === bi && best.d < 0 ? 'pick' : '' }));
      if (best.d >= 0) {
        out.push({ line: 6, vars: { passada: pass, tour: show(t), custo: cost(inst, t) }, g: { tour: t }, deltas: { head, rows: marked },
          note: `Nenhum Δ negativo: nenhuma troca melhora. Paramos num <b>ótimo local</b>, custo ${cost(inst, t)}.` });
        return out;
      }
      out.push({ line: 4, vars: { passada: pass, tour: show(t), custo: cost(inst, t), 'Δ': best.d }, g: { tour: t, del: [[best.p, best.q], [best.r, best.s]], cand: [[best.p, best.r], [best.q, best.s]] },
        deltas: { head, rows: marked }, note: `Menor Δ = ${best.d} &lt; 0. Essa troca melhora o tour.` });
      const before = cost(inst, t);
      t = best.nt;
      out.push({ line: 5, vars: { passada: pass, tour: show(t), custo: cost(inst, t) }, g: { tour: t, add: [[best.p, best.r], [best.q, best.s]] },
        deltas: { head, rows: marked }, note: `Novo tour ${show(t)}. O trecho ${best.q} … ${best.r} foi percorrido ao contrário. Custo ${before} − ${-best.d} = <b>${cost(inst, t)}</b>.` });
    }
  }

  // ---------- laboratório euclidiano ----------
  function lab(root, n0 = 30) {
    const NS = 'http://www.w3.org/2000/svg';
    const S = (tag, a) => { const e = document.createElementNS(NS, tag); for (const k in a) e.setAttribute(k, a[k]); return e; };
    let seed = 7, pts = [], tour = [], busy = null;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const d = (a, b) => Math.hypot(pts[a][0] - pts[b][0], pts[a][1] - pts[b][1]);
    const len = (t) => t.reduce((s, u, i) => s + d(u, t[(i + 1) % t.length]), 0);
    const svg = S('svg', { viewBox: '0 0 500 340', class: 'tsplab' });
    const gE = S('g', {}), gH = S('g', {}), gP = S('g', {});
    svg.append(gE, gH, gP);
    const info = APA.el('div', { class: 'note' });
    const btn = (t, f) => APA.el('button', { class: 'btn', type: 'button', onclick: () => { stop(); f(); } }, t);
    const bar = APA.el('div', { class: 'bar' },
      btn('Vizinho mais próximo', () => build(hvmE())), btn('Melhor inserção', () => build(hmiE())),
      btn('2-opt', twoOpt), btn('Novo sorteio', () => { newPts(); paint(); }));
    root.classList.add('player', 'stack'); root.append(svg, info, bar);
    function newPts() { pts = Array.from({ length: n0 }, () => [20 + rnd() * 460, 20 + rnd() * 300]); tour = []; info.innerHTML = `${n0} cidades. Escolha uma heurística.`; }
    function paint(hl = []) {
      gE.replaceChildren(); gH.replaceChildren();
      const closed = tour.length === n0;
      tour.forEach((u, i) => { if (i === tour.length - 1 && !closed) return; const v = tour[(i + 1) % tour.length]; gE.append(S('line', { x1: pts[u][0], y1: pts[u][1], x2: pts[v][0], y2: pts[v][1] })); });
      hl.forEach(([u, v, k]) => gH.append(S('line', { x1: pts[u][0], y1: pts[u][1], x2: pts[v][0], y2: pts[v][1], class: k })));
      gP.replaceChildren(...pts.map(([x, y], i) => S('circle', { cx: x, cy: y, r: tour.includes(i) ? 5 : 4, class: tour.includes(i) ? 'in' : '' })));
    }
    function hvmE() { const t = [0]; while (t.length < n0) { const u = t[t.length - 1]; let b = -1; for (let i = 0; i < n0; i++) if (!t.includes(i) && (b < 0 || d(u, i) < d(u, b))) b = i; t.push(b); } return t.map((_, k) => t.slice(0, k + 1)); }
    function hmiE() {
      let a = 0, b = 1; for (let i = 0; i < n0; i++) for (let j = i + 1; j < n0; j++) if (d(i, j) < d(a, b)) { a = i; b = j; }
      const t = [a, b], fr = [t.slice()];
      while (t.length < n0) { let best = null; for (let k = 0; k < n0; k++) if (!t.includes(k)) for (let p = 0; p < t.length; p++) { const i = t[p], j = t[(p + 1) % t.length], x = d(i, k) + d(k, j) - d(i, j); if (!best || x < best[0]) best = [x, k, p]; } t.splice(best[2] + 1, 0, best[1]); fr.push(t.slice()); }
      return fr;
    }
    function build(frames) {
      let k = 0; const name = frames[0].length === 1 ? 'Vizinho mais próximo' : 'Melhor inserção';
      busy = setInterval(() => { tour = frames[k]; paint(); info.innerHTML = `${name}: ${tour.length} de ${n0} cidades.`; if (++k === frames.length) { stop(); info.innerHTML = `${name}: distância total <b>${len(tour).toFixed(0)}</b>. Agora tente o 2-opt.`; } }, 90);
    }
    function twoOpt() {
      if (tour.length < n0) { info.innerHTML = 'Construa um tour primeiro (vizinho mais próximo ou melhor inserção).'; return; }
      const start = len(tour); let moves = 0, phase = 0, m = null;
      busy = setInterval(() => {
        if (phase === 0) {
          m = null; const n = tour.length;
          for (let i = 0; i < n - 1 && !m; i++) for (let j = i + 2; j < n && !m; j++) {
            if (i === 0 && j === n - 1) continue;
            const p = tour[i], q = tour[i + 1], r = tour[j], s = tour[(j + 1) % n];
            if (d(p, r) + d(q, s) < d(p, q) + d(r, s) - 1e-9) m = { i, j, p, q, r, s };
          }
          if (!m) { stop(); paint(); info.innerHTML = `2-opt: ${moves} trocas, de <b>${start.toFixed(0)}</b> para <b>${len(tour).toFixed(0)}</b>. Nenhuma troca melhora mais: ótimo local.`; return; }
          paint([[m.p, m.q, 'del'], [m.r, m.s, 'del'], [m.p, m.r, 'add'], [m.q, m.s, 'add']]);
          info.innerHTML = `Troca ${moves + 1}: as arestas vermelhas saem, as verdes entram.`;
        } else {
          tour = [...tour.slice(0, m.i + 1), ...tour.slice(m.i + 1, m.j + 1).reverse(), ...tour.slice(m.j + 1)]; moves++;
          paint(); info.innerHTML = `Troca ${moves}: distância ${len(tour).toFixed(0)}.`;
        }
        phase ^= 1;
      }, 450);
    }
    function stop() { clearInterval(busy); busy = null; }
    newPts(); paint();
  }

  window.TSP = { M5, c, cost, show, tourEdges, draw, matrix, extra, hvm, neighbors,
    BRUTE_CODE, traceBrute, HVM_CODE, traceHVM, HMI_CODE, traceHMI, OPT2_CODE, traceTwoOpt, lab };
})();
