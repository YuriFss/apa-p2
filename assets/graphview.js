// GraphView — desenha um grafo não-orientado ponderado em SVG e gera passos do Kruskal.
//
// GraphView.render(g, st)  g = { pos: { A: [x, y], ... }, edges: [['A','B',4], ...] }
//   st = { edge: { 'A-B': 'hot'|'ok'|'bad' }, node: { A: 'hot' }, tags: { A: 'findSet = A' }, sets: [['A','C'], ['B']], hotSets: [0] }
// GraphView.traceKruskal(g)  -> passos para StepPlayer com KRUSKAL_CODE (conjuntos como listas: representante = head)
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const S = (tag, attrs, text) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (text != null) e.textContent = text; return e; };
  const key = (u, v) => [u, v].sort().join('-');

  function render(g, st = {}) {
    const xs = Object.values(g.pos).map((p) => p[0]), ys = Object.values(g.pos).map((p) => p[1]);
    const svg = S('svg', { class: 'graph', viewBox: `${Math.min(...xs) - 40} ${Math.min(...ys) - 45} ${Math.max(...xs) - Math.min(...xs) + 80} ${Math.max(...ys) - Math.min(...ys) + 90}` });
    for (const [u, v, w] of g.edges) {
      const [x1, y1] = g.pos[u], [x2, y2] = g.pos[v];
      svg.append(S('line', { x1, y1, x2, y2, class: (st.edge || {})[key(u, v)] || '' }));
      svg.append(S('text', { x: (x1 + x2) / 2 + 6, y: (y1 + y2) / 2 - 6, class: 'w' }, w));
    }
    for (const [v, [x, y]] of Object.entries(g.pos)) {
      svg.append(S('circle', { cx: x, cy: y, r: 18, class: (st.node || {})[v] || '' }));
      svg.append(S('text', { x, y, class: 'v' }, v));
      if ((st.tags || {})[v]) svg.append(S('text', { x, y: y - 26, class: 'tag' }, st.tags[v]));
    }
    const box = document.createElement('div');
    box.append(svg);
    if (st.sets) {
      const line = document.createElement('div'); line.className = 'setsline';
      st.sets.forEach((s, i) => { const sp = document.createElement('span'); if ((st.hotSets || []).includes(i)) sp.className = 'hot'; sp.textContent = '{' + s.join(', ') + '}'; line.append(sp); });
      box.append(line);
    }
    return box;
  }

  const KRUSKAL_CODE = ['MST-KRUSKAL(G, w)', 'S = ∅', 'for cada vértice v ∈ V do', '    makeSet(v)', 'ordenar as arestas de A por peso',
    'for cada aresta (u, v) ∈ A, em ordem do', '    if findSet(u) ≠ findSet(v) then', '        S = S ∪ {(u, v)}', '        union(u, v)'];

  function traceKruskal(g) {
    const sets = Object.keys(g.pos).map((v) => [v]);
    const edges = g.edges.slice().sort((a, b) => a[2] - b[2]);
    const out = [], edge = {}; let nFind = 0, nUnion = 0, nEdge = 0, cost = 0;
    const find = (x) => sets.findIndex((s) => s.includes(x));
    const snap = (line, note, extra = {}) => out.push({ line, note,
      vars: { 'arestas examinadas': nEdge, 'chamadas de findSet': nFind, 'chamadas de union': nUnion, custo: cost },
      gs: { edge: { ...edge }, sets: sets.map((s) => s.slice()), ...extra } });
    snap(3, `makeSet em cada um dos ${sets.length} vértices: cada vértice começa no seu próprio conjunto.`);
    snap(4, `Arestas em ordem: ${edges.map(([u, v, w]) => `${u}–${v}(${w})`).join(', ')}. O laço da linha 5 vai rodar <b>${edges.length}</b> vezes, uma por aresta.`);
    for (const [u, v, w] of edges) {
      const k = key(u, v); nEdge++; edge[k] = 'hot';
      snap(5, `Aresta ${nEdge} de ${edges.length}: <b>(${u}, ${v})</b>, peso ${w}.`, { node: { [u]: 'hot', [v]: 'hot' } });
      const iu = find(u); nFind++;
      snap(6, `<b>1ª chamada nesta aresta:</b> findSet(${u}) = ${sets[iu][0]}. Contador de findSet: ${nFind}.`, { node: { [u]: 'hot' }, tags: { [u]: 'findSet=' + sets[iu][0] }, hotSets: [iu] });
      const iv = find(v); nFind++;
      snap(6, `<b>2ª chamada nesta aresta:</b> findSet(${v}) = ${sets[iv][0]}. Contador de findSet: ${nFind}. Compara: ${sets[iu][0]} ${iu === iv ? '=' : '≠'} ${sets[iv][0]}.`,
        { node: { [u]: 'hot', [v]: 'hot' }, tags: { [u]: 'findSet=' + sets[iu][0], [v]: 'findSet=' + sets[iv][0] }, hotSets: [iu, iv] });
      if (iu === iv) {
        edge[k] = 'bad';
        snap(6, `Representantes iguais: ${u} e ${v} já estão na mesma árvore. A aresta fecharia um ciclo e é <b>descartada</b>. Mesmo assim, as 2 chamadas de findSet foram feitas.`);
      } else {
        edge[k] = 'ok'; cost += w;
        snap(7, `Representantes diferentes: a aresta (${u}, ${v}) entra na solução.`);
        sets[iu].push(...sets[iv]); sets.splice(iv, 1); nUnion++;
        snap(8, `union(${u}, ${v}): os dois conjuntos viram um só. Contador de union: ${nUnion}.`, { hotSets: [find(u)] });
      }
    }
    snap(null, `Fim. O laço rodou ${edges.length} vezes e cada volta chamou findSet <b>2 vezes</b> (uma para u e outra para v): ${edges.length} × 2 = <b>${nFind}</b> chamadas = 2A. union só roda quando a aresta entra: <b>${nUnion}</b> = V − 1. Custo da AGM: ${cost}.`);
    return out;
  }

  window.GraphView = { render, traceKruskal, KRUSKAL_CODE };
})();
