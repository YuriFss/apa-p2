// Forest — floresta de conjuntos disjuntos (vetor pai[]) desenhada em SVG, com transição suave entre estados.
//
// const v = Forest.view({ labels?, showArray?: true });   v.el = elemento; v.set(state, animate = true)
//   state = { pai: [...], marks: { i: 'cur'|'path'|'root'|'ok'|'bad'|'dim' }, edges: { i: 'hot'|'new'|'bad'|'cmp' },
//             tags: { i: 'texto' }, amarks: { i: 'cur'|'cmp'|'ok'|'bad'|'dim' } (células do array) }
// Forest.traceFind(pai, x)            -> passos (StepPlayer, código FIND_CODE): { line, note, vars, fs: state, stack }
// Forest.traceUnion(pai, x, y, ideia) -> passos (código UNION_CODE[ideia]), ideia = 1, 2 ou 3
// Forest.stack(frames) -> painel da pilha de chamadas; Forest.validate(pai) -> mensagem de erro ou null
// Forest.height(pai), Forest.root(pai, x), Forest.path(pai, x)
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const S = (tag, attrs, text) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (text != null) e.textContent = text; return e; };
  const DX = 62, DY = 78, PAD = 42, R = 18;
  let uid = 0;

  const path = (pai, x) => { const p = [x]; while (pai[p[p.length - 1]] !== p[p.length - 1] && p.length <= pai.length) p.push(pai[p[p.length - 1]]); return p; };
  const root = (pai, x) => { const p = path(pai, x); return p[p.length - 1]; };
  const depth = (pai, x) => path(pai, x).length - 1;
  const height = (pai) => Math.max(0, ...pai.map((_, i) => depth(pai, i)));
  const roots = (pai) => pai.map((p, i) => (p === i ? i : -1)).filter((i) => i >= 0);

  function validate(pai) {
    if (!pai.length || pai.length > 16) return 'Use de 1 a 16 elementos.';
    if (pai.some((p) => !Number.isInteger(p) || p < 0 || p >= pai.length)) return `Cada valor deve ser um índice entre 0 e ${pai.length - 1}.`;
    for (let i = 0; i < pai.length; i++) if (path(pai, i).length > pai.length) return `O elemento ${i} entra num ciclo e nunca chega a uma raiz (pai[r] = r).`;
    return null;
  }

  function layout(pai) {
    const kids = pai.map(() => []);
    pai.forEach((p, i) => { if (p !== i) kids[p].push(i); });
    const pos = {}; let slot = 0;
    function place(v, d) {
      if (!kids[v].length) pos[v] = [slot++, d];
      else { kids[v].forEach((c) => place(c, d + 1)); pos[v] = [(pos[kids[v][0]][0] + pos[kids[v][kids[v].length - 1]][0]) / 2, d]; }
    }
    roots(pai).forEach((r, k) => { if (k) slot += 0.5; place(r, 0); });
    const out = {};
    for (const k in pos) out[k] = [PAD + pos[k][0] * DX, PAD + 22 + pos[k][1] * DY];
    return { pos: out, w: PAD * 2 + Math.max(0, slot - 1) * DX, h: PAD * 2 + 22 + height(pai) * DY + 6 };
  }

  function view(opts = {}) {
    const id = 'fz' + (uid++);
    const el = document.createElement('div'); el.className = 'forest';
    const svg = S('svg', { class: 'fsvg', role: 'img' });
    const arr = document.createElement('div');
    el.append(svg);
    if (opts.showArray !== false) el.append(arr);
    let cur = null, raf = 0, last = null;
    const label = (i) => (opts.labels ? opts.labels[i] : String(i));

    function defs() {
      const d = S('defs', {});
      for (const c of ['', 'hot', 'new', 'bad', 'cmp']) {
        const m = S('marker', { id: `${id}-a${c}`, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 11, markerHeight: 11, markerUnits: 'userSpaceOnUse', orient: 'auto-start-reverse' });
        m.append(S('path', { d: 'M0,0 L10,5 L0,10 z', class: 'ah ' + c }));
        d.append(m);
      }
      return d;
    }

    function draw(pos, st, w, h) {
      svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
      svg.setAttribute('width', w);
      svg.replaceChildren(defs());
      const g = S('g', {});
      st.pai.forEach((p, i) => {
        const cls = (st.edges || {})[i] || '';
        const [x, y] = pos[i];
        if (p === i) {
          g.append(S('path', { d: `M${x - 9},${y - R + 2} C${x - 30},${y - 62} ${x + 30},${y - 62} ${x + 9},${y - R + 2}`, class: 'fe loop ' + cls, 'marker-end': `url(#${id}-a${cls})` }));
        } else {
          const [px, py] = pos[p];
          const dx = px - x, dy = py - y, L = Math.hypot(dx, dy) || 1;
          g.append(S('line', { x1: x + dx / L * R, y1: y + dy / L * R, x2: px - dx / L * (R + 3), y2: py - dy / L * (R + 3), class: 'fe ' + cls, 'marker-end': `url(#${id}-a${cls})` }));
        }
      });
      st.pai.forEach((p, i) => {
        const [x, y] = pos[i];
        const n = S('g', { class: 'fn ' + ((st.marks || {})[i] || ''), 'data-i': i });
        n.append(S('circle', { cx: x, cy: y, r: R }));
        n.append(S('text', { x, y, class: 'lbl' }, label(i)));
        if ((st.tags || {})[i]) n.append(S('text', { x: x + R + 5, y: y + 4, class: 'tag' }, st.tags[i]));
        if (st.rank) n.append(S('text', { x: x - R - 4, y: y + 4, class: 'rk ' + (p === i ? 'isroot ' : '') + ((st.rmarks || {})[i] || '') }, 'r' + st.rank[i]));
        if (opts.onPick) n.addEventListener('click', () => opts.onPick(i));
        g.append(n);
      });
      svg.append(g);
    }

    function drawArray(st) {
      const box = APA.el('div', { class: 'arr' });
      box.append(APA.el('span', { class: 'name' }, 'pai'));
      st.pai.forEach((v, i) => box.append(APA.el('div', { class: 'slot' }, APA.el('span', { class: 'idx' }, label(i)),
        APA.el('div', { class: 'cell ' + ((st.amarks || {})[i] || '') }, label(v)), APA.el('span', { class: 'ptr' }, ''))));
      const rows = [box];
      if (st.rank) {
        const rb = APA.el('div', { class: 'arr' });
        rb.append(APA.el('span', { class: 'name' }, 'rank'));
        st.rank.forEach((v, i) => rb.append(APA.el('div', { class: 'slot' }, APA.el('span', { class: 'idx' }, label(i)),
          APA.el('div', { class: 'cell ' + ((st.rmarks || {})[i] || '') }, String(v)), APA.el('span', { class: 'ptr' }, ''))));
        rows.push(rb);
      }
      arr.replaceChildren(...rows, APA.el('p', { class: 'caption', style: 'text-align:center;margin:4px 0 0', html: 'número pequeno em cima = <b>elemento</b> (índice i) · número na caixa = <b>pai</b> desse elemento (pai[i])' + (st.rank ? ' · rank[i] aparece também ao lado de cada nó (r0, r1…)' : '') }));
    }

    function set(st, animate = true) {
      cancelAnimationFrame(raf);
      const L = layout(st.pai);
      drawArray(st);
      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!animate || reduce || !cur || !last || last.pai.length !== st.pai.length) {
        cur = L; last = st; draw(L.pos, st, L.w, L.h); return;
      }
      const from = cur, t0 = performance.now(), T = 600;
      const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
      const frame = (now) => {
        const t = Math.min(1, (now - t0) / T), e = ease(t), pos = {};
        for (const k in L.pos) { const a = from.pos[k] || L.pos[k], b = L.pos[k]; pos[k] = [a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e]; }
        const w = from.w + (L.w - from.w) * e, h = from.h + (L.h - from.h) * e;
        cur = { pos, w, h };
        draw(pos, st, w, h);
        if (t < 1) raf = requestAnimationFrame(frame); else cur = L;
      };
      last = st;
      raf = requestAnimationFrame(frame);
    }
    return { el, set };
  }

  function stack(frames) {
    const box = APA.el('div', { class: 'cstack' });
    box.append(APA.el('div', { class: 'sect-title' }, 'pilha de chamadas (topo embaixo)'));
    if (!frames.length) box.append(APA.el('div', { class: 'frame' }, 'vazia'));
    frames.forEach((f, k) => box.append(APA.el('div', { class: 'frame ' + (f.ret != null ? 'done' : k === frames.length - 1 ? 'top' : ''), style: `margin-left:${k * 14}px` },
      APA.el('code', {}, `findSet(${f.x})`), APA.el('span', {}, f.ret != null ? ` → retorna ${f.ret}` : k === frames.length - 1 ? '  ◀ executando' : '  esperando a resposta de baixo'))));
    return box;
  }

  const FIND_CODE = ['findSet(x)', 'if pai[x] = x then', '    return x', 'return findSet(pai[x])'];

  function traceFind(pai, x) {
    const out = [], frames = [], marks = {}, edges = {}, amarks = {}, tags = {};
    const P = pai.slice(), chain = path(P, x), r = chain[chain.length - 1];
    const snap = (line, note) => out.push({ line, note, stack: frames.map((f) => ({ ...f })),
      vars: { 'chamadas feitas': frames.length, 'nós no caminho': chain.length },
      fs: { pai: P, marks: { ...marks }, edges: { ...edges }, amarks: { ...amarks }, tags: { ...tags } } });
    frames.push({ x, ret: null }); marks[x] = 'cur'; tags[x] = 'x';
    snap(0, `Chamada inicial <b>findSet(${x})</b>. Objetivo: subir pelos ponteiros pai até a raiz (o nó que aponta para si mesmo).`);
    for (let k = 0; k < chain.length; k++) {
      const v = chain[k];
      amarks[v] = 'cmp';
      snap(1, `Na chamada findSet(${v}): lê <code>pai[${v}] = ${P[v]}</code> e compara com ${v}. ${P[v] === v ? `<b>São iguais</b>: ${v} aponta para si mesmo, então ${v} é a raiz.` : `<b>São diferentes</b>: ${v} não é raiz.`}`);
      if (P[v] === v) {
        marks[v] = 'root'; amarks[v] = 'ok'; frames[frames.length - 1].ret = v; tags[v] = 'raiz';
        snap(2, `<code>return ${v}</code>. A chamada mais funda terminou. Agora as chamadas de cima, que estavam esperando, recebem o ${v} na volta.`);
        break;
      }
      amarks[v] = 'dim'; marks[v] = 'path'; edges[v] = 'hot';
      const p = P[v];
      frames.push({ x: p, ret: null }); marks[p] = 'cur';
      snap(3, `<code>return findSet(pai[${v}])</code> = <code>return findSet(${p})</code>: segue a seta de ${v} para ${p} (laranja) e faz uma <b>nova chamada</b>. A chamada findSet(${v}) fica parada, esperando a resposta.`);
    }
    for (let k = frames.length - 2; k >= 0; k--) {
      frames[k].ret = r; tags[frames[k].x] = '→ ' + r;
      snap(3, `findSet(${frames[k + 1].x}) devolveu ${r}, então findSet(${frames[k].x}) também devolve <b>${r}</b> (a linha 3 só repassa o resultado).`);
    }
    snap(null, `Resultado: <b>findSet(${x}) = ${r}</b>. Caminho: ${chain.join(' → ')}. Foram <b>${chain.length}</b> chamadas, uma por nó do caminho (profundidade de ${x} + 1). O custo é proporcional à <b>profundidade</b> do nó.`);
    return out;
  }

  const UNION_CODE = {
    1: ['union(x, y)   ▸ ideia 1', 'pai[x] = y'],
    2: ['union(x, y)   ▸ ideia 2', 'rx = findSet(x)', 'pai[rx] = y'],
    3: ['union(x, y)   ▸ ideia 3 (a versão do slide)', 'rx = findSet(x)', 'ry = findSet(y)', 'pai[rx] = ry'],
  };

  function traceUnion(pai, x, y, idea) {
    const out = [], P = pai.slice();
    let marks = {}, edges = {}, amarks = {}, tags = {};
    const vars = () => ({ conjuntos: roots(P).length, altura: height(P) });
    const snap = (line, note) => out.push({ line, note, vars: vars(), fs: { pai: P.slice(), marks: { ...marks }, edges: { ...edges }, amarks: { ...amarks }, tags: { ...tags } } });
    marks[x] = 'cur'; marks[y] = 'cur'; tags[x] = 'x'; tags[y] = 'y';
    snap(0, `<b>union(${x}, ${y})</b>: ${x} está na árvore de raiz ${root(P, x)}, ${y} na árvore de raiz ${root(P, y)}. Altura atual: ${height(P)}.`);
    const climb = (v, name) => {
      const c = path(P, v);
      c.slice(0, -1).forEach((u) => { edges[u] = 'hot'; if (marks[u] !== 'cur') marks[u] = 'path'; });
      marks[c[c.length - 1]] = 'root'; tags[c[c.length - 1]] = name;
      return c;
    };
    let child, parent;
    if (idea === 1) { child = x; parent = y; }
    if (idea >= 2) {
      const c = climb(x, 'rx');
      snap(1, `rx = findSet(${x}): sobe ${c.join(' → ')}. rx = <b>${c[c.length - 1]}</b> (${c.length} chamadas).`);
      child = c[c.length - 1]; parent = y;
    }
    if (idea === 3) {
      const c = climb(y, 'ry');
      snap(2, `ry = findSet(${y}): sobe ${c.join(' → ')}. ry = <b>${c[c.length - 1]}</b> (${c.length} chamadas).`);
      parent = c[c.length - 1];
    }
    const old = P[child];
    edges = {}; Object.keys(marks).forEach((k) => { if (marks[k] === 'path') delete marks[k]; });
    P[child] = parent; edges[child] = 'new'; amarks[child] = 'ok';
    const line = idea === 1 ? 1 : idea === 2 ? 2 : 3;
    snap(line, `<code>pai[${child}] = ${parent}</code>: a seta de ${child}, que apontava para ${old}, agora aponta para ${parent} (verde). ${idea === 1 ? `Só o ${child} e o que está <i>abaixo</i> dele mudam de árvore.` : `Toda a árvore de ${child} vai junto, pendurada em ${parent}.`}`);
    const n = roots(P).length;
    marks = {}; tags = {};
    if (idea === 1) {
      const lost = P.map((_, i) => i).filter((i) => root(pai, i) === root(pai, x) && root(P, i) !== root(P, x));
      lost.forEach((i) => (marks[i] = 'bad'));
      if (lost.length) snap(null, `<b>Falhou.</b> Os nós em vermelho (${lost.join(', ')}) estavam no mesmo conjunto que ${x} e ficaram de fora: agora há ${n} conjuntos, quando deveria haver um só com todos. Só daria certo se ${x} fosse a raiz da sua árvore.`);
      else snap(null, `Deu certo só porque ${x} era a raiz da sua árvore. Em geral não é.`);
    } else {
      snap(null, `<b>Funciona</b>: os elementos dos dois conjuntos estão agora numa só árvore (${n} conjunto(s)). Altura final: <b>${height(P)}</b>.${idea === 2 ? ' Pendurar a raiz num nó fundo (y) deixou a árvore mais alta do que o necessário.' : ' Pendurar raiz em raiz faz a árvore crescer menos que na ideia 2.'}`);
    }
    return out;
  }


  const UNION_RANK_CODE = ['union(x, y)   ▸ union by rank', 'rx = findSet(x)', 'ry = findSet(y)', 'if rx = ry then return',
    'if rank[rx] < rank[ry] then', '    pai[rx] = ry', 'else if rank[rx] > rank[ry] then', '    pai[ry] = rx', 'else', '    pai[rx] = ry', '    rank[ry] = rank[ry] + 1'];

  // P e K são alterados (permite encadear uma sequência); head = texto antes da nota do 1º passo
  function traceUnionRank(P, K, x, y, head = '', out = []) {
    let marks = {}, edges = {}, amarks = {}, rmarks = {}, tags = {};
    const vars = () => ({ conjuntos: roots(P).length, 'altura máx.': height(P), 'log₂ n': (Math.log2(P.length)).toFixed(2) });
    const snap = (line, note) => out.push({ line, note, vars: vars(),
      fs: { pai: P.slice(), rank: K.slice(), marks: { ...marks }, edges: { ...edges }, amarks: { ...amarks }, rmarks: { ...rmarks }, tags: { ...tags } } });
    const climb = (v, name) => {
      const c = path(P, v);
      c.slice(0, -1).forEach((u) => { edges[u] = 'hot'; if (u !== v) marks[u] = 'path'; });
      marks[v] = 'cur'; marks[c[c.length - 1]] = 'root'; tags[c[c.length - 1]] = name;
      return c;
    };
    marks[x] = 'cur'; marks[y] = 'cur'; tags[x] = 'x'; tags[y] = 'y';
    snap(0, `${head}<b>union(${x}, ${y})</b>.`);
    tags = {}; const cx = climb(x, 'rx'), rx = cx[cx.length - 1];
    snap(1, `rx = findSet(${x}): ${cx.join(' → ')}. <b>rx = ${rx}</b>, com rank ${K[rx]}.`);
    const cy = climb(y, rx === path(P, y).slice(-1)[0] ? 'rx = ry' : 'ry'), ry = cy[cy.length - 1];
    snap(2, `ry = findSet(${y}): ${cy.join(' → ')}. <b>ry = ${ry}</b>, com rank ${K[ry]}.`);
    if (rx === ry) { snap(3, `rx = ry = ${rx}: já estão no mesmo conjunto, nada a fazer.`); return out; }
    snap(3, `rx = ${rx} ≠ ry = ${ry}: conjuntos diferentes, segue.`);
    edges = {}; rmarks[rx] = 'cmp'; rmarks[ry] = 'cmp';
    const a = K[rx], b = K[ry];
    snap(4, `Compara os ranks das <b>raízes</b>: rank[${rx}] = ${a} e rank[${ry}] = ${b}. ${a < b ? `${a} &lt; ${b}: a árvore de ${rx} é a mais baixa.` : `${a} não é menor que ${b}.`}`);
    let child, par;
    if (a < b) { child = rx; par = ry; }
    else {
      snap(6, `rank[${rx}] = ${a} ${a > b ? '&gt;' : '='} rank[${ry}] = ${b}. ${a > b ? `A árvore de ${ry} é a mais baixa.` : 'Não é maior: os ranks são <b>iguais</b>.'}`);
      if (a > b) { child = ry; par = rx; } else { snap(8, `Empate. Qualquer uma pode ser a nova raiz. Convenção (a mesma do slide): a raiz de x vai para baixo da raiz de y.`); child = rx; par = ry; }
    }
    const old = P[child]; P[child] = par; edges[child] = 'new'; amarks[child] = 'ok'; marks[child] = 'cur'; marks[par] = 'root';
    tags = { [par]: 'nova raiz' };
    const linkLine = a < b ? 5 : a > b ? 7 : 9;
    snap(linkLine, `<code>pai[${child}] = ${par}</code>: a raiz <b>mais baixa</b> (${child}) passa a apontar para a mais alta (${par}). A árvore de ${child} inteira vai junto, um nível abaixo de ${par}.${a !== b ? ` Como ela era mais baixa, a altura da árvore de ${par} <b>não muda</b>: nenhum rank é alterado.` : ''}`);
    if (a === b) {
      K[par]++; rmarks = { [par]: 'ok' };
      snap(10, `Com ranks iguais (${a}), a árvore de ${child} pendurada embaixo de ${par} fica com profundidade ${a} + 1. A altura da nova árvore é ${a + 1}, então <b>rank[${par}] = ${K[par]}</b>. É o <b>único</b> caso em que um rank aumenta.`);
    }
    return out;
  }

  function traceRankSequence(n, ops) {
    const P = [...Array(n).keys()], K = Array(n).fill(0), out = [];
    out.push({ line: null, note: `makeSet nos ${n} elementos: cada um é raiz de si mesmo, com <b>rank 0</b> (árvore de altura 0).`,
      vars: { conjuntos: n, 'altura máx.': 0, 'log₂ n': Math.log2(n).toFixed(2) }, fs: { pai: P.slice(), rank: K.slice() } });
    ops.forEach(([x, y], k) => traceUnionRank(P, K, x, y, `[${k + 1}/${ops.length}] `, out));
    const last = out[out.length - 1];
    out.push({ line: null, note: `Fim da sequência. Altura máxima ${height(P)} com ${n} elementos; o limite é log₂ ${n} = ${Math.log2(n).toFixed(2)}.`,
      vars: last.vars, fs: { pai: P.slice(), rank: K.slice(), marks: Object.fromEntries(roots(P).map((r) => [r, 'root'])) } });
    return out;
  }

  // aplica a sequência sem animação: byRank = true (union by rank) ou false (ideia 3 do slide, pai[rx] = ry)
  function applyUnions(n, ops, byRank) {
    const P = [...Array(n).keys()], K = Array(n).fill(0);
    for (const [x, y] of ops) {
      const rx = root(P, x), ry = root(P, y);
      if (rx === ry) continue;
      if (!byRank || K[rx] < K[ry]) P[rx] = ry;
      else if (K[rx] > K[ry]) P[ry] = rx;
      else { P[rx] = ry; K[ry]++; }
    }
    return { pai: P, rank: K };
  }


  const PC_CODE = ['findSet(x)   ▸ com path compression', 'if pai[x] ≠ x then', '    pai[x] = findSet(pai[x])', 'return pai[x]'];

  // findSet recursivo com path compression; altera uma cópia de pai. rank (opcional) só é exibido, nunca alterado.
  function traceFindPC(pai, x, rank) {
    const out = [], frames = [], P = pai.slice(), chain = path(P, x), r = chain[chain.length - 1];
    let marks = {}, edges = {}, amarks = {}, tags = {};
    const snap = (line, note) => out.push({ line, note, stack: frames.map((f) => ({ ...f })),
      vars: { 'chamadas feitas': frames.length, 'ponteiros alterados': changed, 'altura': height(P) },
      fs: { pai: P.slice(), rank, marks: { ...marks }, edges: { ...edges }, amarks: { ...amarks }, tags: { ...tags } } });
    let changed = 0;
    frames.push({ x, ret: null }); marks[x] = 'cur'; tags[x] = 'x';
    snap(0, `Chamamos <b>findSet(${x})</b>.`);
    for (const v of chain) {
      amarks[v] = 'cmp';
      if (P[v] !== v) {
        snap(1, `pai[${v}] = ${P[v]}. Não é ${v}, então ${v} não é a raiz.`);
        amarks[v] = ''; marks[v] = v === x ? 'cur' : 'path'; edges[v] = 'hot';
        frames.push({ x: P[v], ret: null }); marks[P[v]] = 'cur';
        snap(2, `Chama <b>findSet(${P[v]})</b>. findSet(${v}) fica esperando a resposta.`);
      } else {
        snap(1, `pai[${v}] = ${v}. ${v} aponta para si mesmo: é a <b>raiz</b>.`);
        marks[v] = 'root'; amarks[v] = 'ok'; tags[v] = 'raiz'; frames[frames.length - 1].ret = v;
        snap(3, `Devolve ${v}. Agora começa a volta.`);
      }
    }
    edges = {};
    for (let k = frames.length - 2; k >= 0; k--) {
      const v = frames[k].x, old = P[v];
      if (old === r) {
        amarks = { [v]: 'cmp' };
        snap(2, `findSet(${v}) recebeu ${r}. Faz pai[${v}] = ${r}. Já era ${r}: nada muda.`);
      } else {
        P[v] = r; changed++; edges = { [v]: 'new' }; amarks = { [v]: 'ok' }; marks[v] = 'ok';
        snap(2, `findSet(${v}) recebeu ${r}. Faz <b>pai[${v}] = ${r}</b>: antes era ${old}. Agora ${v} aponta direto para a raiz.`);
      }
      frames[k].ret = r; tags[v] = '→ ' + r;
      snap(3, `Devolve ${r}.`);
    }
    edges = {}; amarks = {};
    snap(null, `Fim. findSet(${x}) = ${r}, com ${chain.length} chamadas. Mudaram ${changed} ponteiro(s). Todo o caminho agora está a 1 passo da raiz.`);
    return out;
  }

  // executa operações ['u', x, y] (union) ou ['f', x] (findSet) com union by rank e, se pc, path compression.
  // Devolve um snapshot por operação: { pai, rank, cost (nós visitados nos finds), op, ok }
  function runOps(n, ops, pc) {
    const P = [...Array(n).keys()], K = Array(n).fill(0), out = [];
    const find = (x) => { const c = path(P, x), r = c[c.length - 1]; if (pc) c.forEach((v) => (P[v] = r)); return [r, c.length]; };
    for (const op of ops) {
      let cost = 0, ok = true;
      if (op[0] === 'f') { const [, c] = find(op[1]); cost = c; }
      else {
        const [rx, cx] = find(op[1]), [ry, cy] = find(op[2]); cost = cx + cy;
        if (rx === ry) ok = false;
        else if (K[rx] < K[ry]) P[rx] = ry; else if (K[rx] > K[ry]) P[ry] = rx; else { P[rx] = ry; K[ry]++; }
      }
      out.push({ pai: P.slice(), rank: K.slice(), cost, op, ok });
    }
    return out;
  }

  window.Forest = { view, stack, traceFind, traceUnion, validate, height, root, path, depth, layout, FIND_CODE, UNION_CODE, UNION_RANK_CODE, traceUnionRank, traceRankSequence, applyUnions, roots, PC_CODE, traceFindPC, runOps };
})();
