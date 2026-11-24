// GraphRep — matriz de adjacência e listas de adjacência de um grafo não-orientado ponderado.
//
// GraphRep.render(g, st)  g = { verts: ['A','B',...], edges: [['A','B',4], ...] }
//   st = { mode: 'matrix'|'lists'|'both', cell: [i, j] (célula em exame), entry: [v, k] (k-ésimo item da lista de v), found: ['A-B', ...] }
// GraphRep.traceScan(g, mode) -> passos (StepPlayer): percorre a representação para montar a lista de arestas
(function () {
  const key = (u, v) => [u, v].sort().join('-');
  const adj = (g) => {
    const L = Object.fromEntries(g.verts.map((v) => [v, []]));
    for (const [u, v, w] of g.edges) { L[u].push([v, w]); L[v].push([u, w]); }
    for (const v of g.verts) L[v].sort((a, b) => (a[0] < b[0] ? -1 : 1));
    return L;
  };
  const weight = (g) => { const W = {}; for (const [u, v, w] of g.edges) W[key(u, v)] = w; return W; };

  function render(g, st = {}) {
    const box = APA.el('div', { class: 'grep' });
    const found = new Set(st.found || []);
    if (st.mode !== 'lists') {
      const W = weight(g), t = APA.el('table', { class: 'gmat' });
      t.append(APA.el('tr', {}, APA.el('th', {}, ''), ...g.verts.map((v) => APA.el('th', {}, v))));
      g.verts.forEach((u, i) => t.append(APA.el('tr', {}, APA.el('th', {}, u), ...g.verts.map((v, j) => {
        const w = u === v ? null : W[key(u, v)];
        const cls = [st.cell && st.cell[0] === i && st.cell[1] === j ? 'hot' : '', w != null && found.has(key(u, v)) ? 'found' : '', st.cell && (i < st.cell[0] || (i === st.cell[0] && j < st.cell[1])) ? 'seen' : ''].join(' ');
        return APA.el('td', { class: cls }, w == null ? '·' : String(w));
      }))));
      box.append(APA.el('div', {}, APA.el('div', { class: 'sect-title' }, 'matriz de adjacência (V × V)'), t));
    }
    if (st.mode !== 'matrix') {
      const L = adj(g), wrap = APA.el('div', { class: 'glists' });
      g.verts.forEach((v) => {
        const row = APA.el('div', { class: 'glrow' }, APA.el('span', { class: 'glhead' + (st.entry && st.entry[0] === v ? ' hot' : '') }, v));
        L[v].forEach(([u, w], k) => {
          row.append(APA.el('span', { class: 'arrow' }, '→'));
          const hot = st.entry && st.entry[0] === v && st.entry[1] === k;
          row.append(APA.el('span', { class: 'glitem' + (hot ? ' hot' : '') + (found.has(key(u, v)) ? ' found' : '') }, `${u} (${w})`));
        });
        row.append(APA.el('span', { class: 'arrow' }, '→ ∅'));
        wrap.append(row);
      });
      box.append(APA.el('div', {}, APA.el('div', { class: 'sect-title' }, 'listas de adjacência'), wrap));
    }
    return box;
  }

  function traceScan(g, mode) {
    const out = [], found = [];
    let visits = 0;
    const V = g.verts.length;
    const vars = () => ({ 'posições visitadas': visits, 'arestas achadas': found.length });
    out.push({ line: null, note: mode === 'matrix' ? `Para achar as arestas, é preciso olhar as ${V} × ${V} = ${V * V} células.` : `Para achar as arestas, basta percorrer cada lista uma vez.`, vars: vars(), gr: { mode, found: [] } });
    if (mode === 'matrix') {
      const W = weight(g);
      g.verts.forEach((u, i) => g.verts.forEach((v, j) => {
        visits++;
        const w = u === v ? null : W[key(u, v)];
        let note = `Célula [${u}][${v}]: `;
        if (w == null) note += 'vazia.';
        else if (u < v) { found.push(key(u, v)); note += `aresta ${u}–${v} (peso ${w}). Anota.`; }
        else note += `aresta ${v}–${u} de novo (a matriz é simétrica). Ignora.`;
        out.push({ line: null, note, vars: vars(), gr: { mode, cell: [i, j], found: found.slice() } });
      }));
    } else {
      const L = adj(g);
      g.verts.forEach((v) => {
        visits++;
        out.push({ line: null, note: `Começa a lista de ${v}.`, vars: vars(), gr: { mode, entry: [v, -1], found: found.slice() } });
        L[v].forEach(([u, w], k) => {
          visits++;
          let note = `Item ${u} (${w}) na lista de ${v}: `;
          if (v < u) { found.push(key(u, v)); note += `aresta ${v}–${u}. Anota.`; } else note += `aresta ${u}–${v} já anotada (cada aresta aparece em duas listas).`;
          out.push({ line: null, note, vars: vars(), gr: { mode, entry: [v, k], found: found.slice() } });
        });
      });
    }
    out.push({ line: null, note: mode === 'matrix'
      ? `Fim: <b>${visits}</b> posições visitadas para achar ${found.length} arestas. Matriz: sempre V² = ${V * V}, não importa quantas arestas existam.`
      : `Fim: <b>${visits}</b> posições visitadas (${V} cabeças de lista + ${2 * g.edges.length} itens = V + 2A). Listas: o custo acompanha o número de arestas.`,
      vars: vars(), gr: { mode, found: found.slice() } });
    return out;
  }

  window.GraphRep = { render, traceScan, adj };
})();
