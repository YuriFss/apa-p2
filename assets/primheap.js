// PrimHeap — Prim com Q em heap binário mínimo, passo a passo, contando as operações.
// Depende de GraphView (graphview.js) e HeapView (heap.js).
//
// PrimHeap.trace(g, r)  g = { pos, edges } (formato do GraphView) -> passos para StepPlayer com PrimHeap.CODE
// PrimHeap.draw(g, st, box) -> desenha grafo + heap + tabela chave/pai no box
(function () {
  const CODE = ['MST-PRIM(G, w, r)', 'for cada u ∈ V do', '    chave[u] = ∞', '    pai[u] = null', 'chave[r] = 0', 'Q = V          ▸ buildMinHeap',
    'while Q ≠ ∅ do', '    u = EXTRACT_MIN(Q)', '    for each v em Adj[u] do', '        if v ∈ Q and w(u, v) < chave[v] then', '            pai[v] = u',
    '            chave[v] = w(u, v)   ▸ decreaseKey'];
  const key = (u, v) => [u, v].sort().join('-');
  const fmt = (k) => (k === Infinity ? '∞' : String(k));

  function trace(g, r) {
    const V = Object.keys(g.pos).sort(), W = {}, adj = Object.fromEntries(V.map((v) => [v, []]));
    for (const [u, v, w] of g.edges) { W[key(u, v)] = w; adj[u].push(v); adj[v].push(u); }
    V.forEach((v) => adj[v].sort());
    const ch = {}, pai = {}, inQ = new Set(V), done = [];
    let H = [], cnt = { extractMin: 0, 'visitas em Adj': 0, decreaseKey: 0, 'trocas no heap': 0 };
    const out = [];
    const snap = (line, note, x = {}) => {
      const edge = {};
      done.forEach((v) => { if (pai[v]) edge[key(v, pai[v])] = 'ok'; });
      V.forEach((v) => { if (inQ.has(v) && pai[v]) edge[key(v, pai[v])] = 'cand'; });
      if (x.edge) edge[x.edge] = 'hot';
      const node = {}; done.forEach((v) => (node[v] = 'done')); if (x.u) node[x.u] = 'hot'; if (x.v) node[x.v] = 'cur';
      out.push({ line, note, vars: { ...cnt }, ps: { edge, node, heap: H.map((v) => `${v}:${fmt(ch[v])}`), hmarks: x.hm || {},
        table: V.map((v) => [v, fmt(ch[v]), pai[v] || 'null', inQ.has(v) ? 'sim' : 'não']), hot: x.v || x.u } });
    };
    const swap = (i, j) => { [H[i], H[j]] = [H[j], H[i]]; cnt['trocas no heap']++; };

    V.forEach((v) => { ch[v] = Infinity; pai[v] = null; });
    snap(2, `Todas as chaves começam em ∞ e todos os pais em null. Custo O(V).`);
    ch[r] = 0;
    snap(4, `chave[${r}] = 0. A raiz é ${r}.`, { v: r });
    H = [r, ...V.filter((v) => v !== r)];
    snap(5, `Monta o heap mínimo com os ${V.length} vértices (buildMinHeap). Custo O(V). ${r} fica no topo porque tem a menor chave.`, { hm: { 0: 'ok' } });

    while (H.length) {
      const u = H[0];
      snap(7, `EXTRACT_MIN: o topo do heap é <b>${u}</b> (chave ${fmt(ch[u])}).`, { u, hm: { 0: 'hot' } });
      cnt.extractMin++;
      const last = H.pop(); inQ.delete(u); done.push(u);
      if (H.length) {
        H[0] = last;
        snap(7, `${u} sai de Q e entra na árvore. O último do heap (${last}) vai para o topo.`, { u, hm: { 0: 'cold' } });
        let i = 0;
        for (;;) {
          const l = 2 * i + 1, rr = 2 * i + 2;
          let m = i;
          if (l < H.length && ch[H[l]] < ch[H[m]]) m = l;
          if (rr < H.length && ch[H[rr]] < ch[H[m]]) m = rr;
          if (m === i) break;
          swap(i, m);
          snap(7, `minHeapify: ${H[i]} tem chave menor que ${H[m]}, então eles trocam de lugar.`, { u, hm: { [m]: 'cold', [i]: 'ok' } });
          i = m;
        }
      } else snap(7, `${u} sai de Q e entra na árvore. O heap ficou vazio.`, { u });
      for (const v of adj[u]) {
        cnt['visitas em Adj']++;
        const w = W[key(u, v)];
        const ok = inQ.has(v) && w < ch[v];
        snap(9, `Vizinho <b>${v}</b> (aresta ${u}–${v}, peso ${w}). ${!inQ.has(v) ? `${v} já saiu de Q. Nada a fazer.` : ok ? `Está em Q e ${w} &lt; ${fmt(ch[v])}. Atualiza.` : `Está em Q, mas ${w} não é menor que ${fmt(ch[v])}. Nada a fazer.`}`, { u, v, edge: key(u, v) });
        if (!ok) continue;
        const old = ch[v];
        pai[v] = u; ch[v] = w; cnt.decreaseKey++;
        let i = H.indexOf(v);
        const up = i > 0 && ch[H[(i - 1) >> 1]] > ch[H[i]];
        snap(11, `chave[${v}]: ${fmt(old)} → ${w}, pai[${v}] = ${u}. ${up ? `Agora ${v} tem chave menor que o pai no heap: decreaseKey vai subir ${v}.` : `No heap, ${v} já está no lugar certo: nada sobe.`}`, { u, v, edge: key(u, v), hm: { [i]: 'cold' } });
        while (i > 0 && ch[H[(i - 1) >> 1]] > ch[H[i]]) {
          const p = (i - 1) >> 1;
          swap(i, p);
          snap(11, `decreaseKey: o pai de ${v} no heap (${H[i]}) tem chave maior. Trocam.`, { u, v, edge: key(u, v), hm: { [p]: 'cold', [i]: 'ok' } });
          i = p;
        }
      }
    }
    const A = g.edges.length, n = V.length;
    snap(null, `Fim. extractMin: ${cnt.extractMin} = V. Visitas em Adj: ${cnt['visitas em Adj']} = 2A. decreaseKey: ${cnt.decreaseKey} ≤ A = ${A}. Cada operação no heap faz no máximo ⌊log₂ V⌋ = ${Math.floor(Math.log2(n))} trocas.`);
    return out;
  }

  function draw(g, st, box) {
    const gv = GraphView.render(g, { edge: st.ps.edge, node: st.ps.node });
    const hv = st.ps.heap.length ? HeapView.render(st.ps.heap, { marks: st.ps.hmarks, name: 'Q' }) : APA.el('p', { class: 'caption' }, st.ps.table.every((r) => r[3] === 'sim') ? 'Q ainda não foi montado (linha 5).' : 'Q vazio: todos os vértices já saíram.');
    const t = APA.el('table', { class: 'opstable' });
    t.append(APA.el('tr', {}, APA.el('th', {}, 'v'), APA.el('th', { class: 'num' }, 'chave'), APA.el('th', {}, 'pai'), APA.el('th', {}, 'em Q')));
    st.ps.table.forEach(([v, k, p, q]) => t.append(APA.el('tr', { class: v === st.ps.hot ? 'hot' : '' }, APA.el('td', {}, v), APA.el('td', { class: 'num' }, k), APA.el('td', {}, p), APA.el('td', {}, q))));
    box.append(APA.el('div', { class: 'figrow' },
      APA.el('div', {}, APA.el('div', { class: 'sect-title' }, 'grafo'), gv, APA.el('div', { class: 'sect-title' }, 'chave | pai'), t),
      APA.el('div', {}, APA.el('div', { class: 'sect-title' }, 'Q (heap mínimo, por chave)'), hv)));
  }

  window.PrimHeap = { CODE, trace, draw };
})();
