// ListSets — conjuntos disjuntos representados por listas ligadas (convenção dos slides da Aula 11).
// Cada conjunto S tem head, tail e size; cada elemento tem valor, next e rep (ponteiro para o objeto S).
//
// ListSets.render(st)                     -> elemento com o desenho de um estado
//   st = { sets: [{ name: 'S1', elems: ['a','b'] }], rep: { a: 'S1', ... }, marks: { a: 'cur'|'stale'|'fixed' },
//          cur: 'S1', gone: ['S2'], newLink: 'b' }   // newLink: elemento cujo next acabou de ser ligado
// ListSets.traceFind(sets, x)             -> passos para StepPlayer (código FIND_CODE)
// ListSets.traceUnion(sets, x, y, pond)   -> passos para StepPlayer (código UNION_CODE ou UNION_POND_CODE)
// ListSets.parse('a,b,c|d,e')             -> [['a','b','c'], ['d','e']] (lança Error se inválido)
(function () {
  const FIND_CODE = ['findSet(x)', 'e = ptr[x]', 'return e.rep'];
  const UNION_CODE = ['union(x, y)', 'Sx = findSet(x)', 'Sy = findSet(y)', 'Sx.tail.next = Sy.head', 'Sx.tail = Sy.tail',
    'for each z em Sy do', '    z.rep = Sx'];
  const UNION_POND_CODE = ['union(x, y)   ▸ união ponderada', 'Sx = findSet(x)', 'Sy = findSet(y)', 'if Sx.size < Sy.size then',
    '    trocar(Sx, Sy)', 'Sx.tail.next = Sy.head', 'Sx.tail = Sy.tail', 'Sx.size = Sx.size + Sy.size', 'for each z em Sy do', '    z.rep = Sx'];

  // campos do objeto conjunto: head/tail/size explícitos (para mostrar o estado intermediário do union);
  // st.fmark = { 'S1.tail': 'stale'|'fixed', ... } destaca um campo.
  function render(st) {
    const box = APA.el('div', { class: 'lsets' });
    const fm = st.fmark || {};
    for (const s of st.sets) {
      const gone = (st.gone || []).includes(s.name);
      const row = APA.el('div', { class: 'lrow' + (st.cur === s.name ? ' cur' : '') + (gone ? ' gone' : '') });
      const n = s.elems.length;
      const f = (k, v) => `<span class="f ${fm[s.name + '.' + k] || ''}">${k} = ${v}</span>`;
      const fields = [f('head', s.head ?? (n ? s.elems[0] : '∅')), f('tail', s.tail ?? (n ? s.elems[n - 1] : '∅'))];
      if (st.showSize !== false) fields.push(f('size', s.size ?? n));
      row.append(APA.el('div', { class: 'lhead' }, APA.el('b', {}, s.name),
        APA.el('small', { html: gone ? 'descartado' : fields.join('<br>') })));
      const chain = APA.el('div', { class: 'lchain' });
      s.elems.forEach((e, i) => {
        chain.append(APA.el('div', { class: 'lnode ' + ((st.marks || {})[e] || ''), 'data-e': e },
          APA.el('b', {}, e), APA.el('span', { class: 'rep' }, 'rep → ' + st.rep[e])));
        chain.append(APA.el('span', { class: 'arrow' + (st.newLink === e ? ' new' : '') }, i < n - 1 ? '→' : ''));
      });
      if (n) chain.append(APA.el('span', { class: 'nil' }, '∅'));
      else if (s.note) chain.append(APA.el('span', { class: 'caption' }, s.note));
      row.append(chain);
      box.append(row);
    }
    return box;
  }

  const copy = (o) => JSON.parse(JSON.stringify(o));
  function init(lists) {
    const sets = lists.map((elems, k) => ({ name: 'S' + (k + 1), elems: elems.slice() }));
    const rep = {};
    sets.forEach((s) => s.elems.forEach((e) => (rep[e] = s.name)));
    return { sets, rep, marks: {}, gone: [] };
  }
  const setOf = (st, e) => st.sets.find((s) => s.elems.includes(e));

  function traceFind(lists, x) {
    const st = init(lists), out = [];
    const push = (line, note, vars) => out.push({ line, note, vars, ls: copy(st) });
    push(0, `Chamamos <b>findSet(${x})</b>.`, { x });
    st.marks[x] = 'cur';
    push(1, `ptr[${x}] dá o nó de ${x} direto. O(1).`, { x, e: 'nó ' + x });
    st.cur = st.rep[x];
    push(2, `Devolve ${x}.rep = <b>${st.rep[x]}</b>. O(1).`, { x, e: 'nó ' + x, retorno: st.rep[x] });
    return out;
  }

  function traceUnion(lists, x, y, pond) {
    const st = init(lists), out = [];
    st.showSize = !!pond;
    st.sets.forEach((s) => { s.head = s.elems[0]; s.tail = s.elems[s.elems.length - 1]; s.size = s.elems.length; });
    let count = 0, Sx, Sy;
    const L = pond ? { cmp: 3, swap: 4, link: 5, tail: 6, size: 7, loop: 8, upd: 9 } : { link: 3, tail: 4, loop: 5, upd: 6 };
    const vars = () => ({ Sx: Sx ? Sx.name : '—', Sy: Sy ? Sy.name : '—', 'rep atualizados': count });
    const push = (line, note) => { out.push({ line, note, vars: vars(), ls: copy(st) }); st.fmark = {}; st.newLink = null; };
    push(0, `Chamamos <b>union(${x}, ${y})</b>.`);
    Sx = setOf(st, x); st.marks[x] = 'cur'; st.cur = Sx.name;
    push(1, `findSet(${x}) = <b>${Sx.name}</b>. Nada muda nas listas.`);
    Sy = setOf(st, y); st.marks[y] = 'cur';
    push(2, `findSet(${y}) = <b>${Sy.name}</b>. Nada muda nas listas.`);
    if (Sx === Sy) { push(2, `Mesmo conjunto. O Kruskal nunca chama union nesse caso.`); return out; }
    if (pond) {
      push(L.cmp, `${Sx.name}.size = ${Sx.size} é menor que ${Sy.name}.size = ${Sy.size}? ${Sx.size < Sy.size ? '<b>Sim.</b>' : 'Não.'}`);
      if (Sx.size < Sy.size) {
        [Sx, Sy] = [Sy, Sx]; st.cur = Sx.name;
        push(L.swap, `Troca: Sx = <b>${Sx.name}</b> (a maior), Sy = <b>${Sy.name}</b> (a menor).`);
      }
    }
    const tailX = Sx.tail, moved = Sy.elems.slice();
    Sx.elems.push(...moved); Sy.elems = []; Sy.note = `(os nós ${moved.join(', ')} agora estão na corrente de ${Sx.name}, mas ainda apontam para cá)`;
    moved.forEach((e) => (st.marks[e] = 'stale')); st.newLink = tailX; st.fmark = { [Sx.name + '.tail']: 'stale' };
    push(L.link, `<b>${tailX}.next = ${moved[0]}</b> (seta laranja). As listas estão coladas. Ficaram errados: o tail de ${Sx.name} e o rep de ${moved.join(', ')} (vermelho).`);
    Sx.tail = Sy.tail; st.fmark = { [Sx.name + '.tail']: 'fixed' };
    push(L.tail, `<b>${Sx.name}.tail = ${Sx.tail}</b>. O tail está certo de novo.`);
    if (pond) { Sx.size += Sy.size; st.fmark = { [Sx.name + '.size']: 'fixed' }; push(L.size, `${Sx.name}.size = ${Sx.size}. O(1).`); }
    for (const z of moved) {
      push(L.loop, `Próximo nó da lista anexada: <b>${z}</b>.`);
      st.rep[z] = Sx.name; st.marks[z] = 'fixed'; count++;
      push(L.upd, `<b>${z}.rep = ${Sx.name}</b>. Atualizados: ${count}.`);
    }
    st.gone.push(Sy.name); Sy.note = '';
    push(null, `Fim. ${Sy.name} é descartado. O laço rodou <b>${count}</b> vezes, uma por nó anexado.`);
    return out;
  }


  // View animada: v = ListSets.view(); v.el; v.set(st). Cada nó (data-e) desliza da posição antiga para a nova.
  function view() {
    const el = document.createElement('div');
    let last = null;
    const rects = () => { const base = el.getBoundingClientRect(), r = {};
      el.querySelectorAll('[data-e]').forEach((n) => { const b = n.getBoundingClientRect(); r[n.dataset.e] = [b.left - base.left, b.top - base.top]; }); return r; };
    function set(st) {
      const before = last;
      el.replaceChildren(render(st));
      requestAnimationFrame(() => {
        const now = rects();
        if (before && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
          el.querySelectorAll('[data-e]').forEach((n) => {
            const a = before[n.dataset.e], b = now[n.dataset.e];
            if (!a || (a[0] === b[0] && a[1] === b[1])) return;
            n.animate([{ transform: `translate(${a[0] - b[0]}px, ${a[1] - b[1]}px)` }, { transform: 'none' }], { duration: 650, easing: 'ease-in-out' });
          });
        }
        last = now;
      });
    }
    return { el, set };
  }

  function parse(text) {
    const lists = text.split('|').map((t) => t.split(/[\s,;]+/).filter(Boolean)).filter((l) => l.length);
    const all = lists.flat();
    if (lists.length < 2 || lists.length > 4) throw new Error('Use de 2 a 4 conjuntos separados por | (ex.: a,b,c|d,e)');
    if (all.some((e, i) => all.indexOf(e) !== i)) throw new Error('Um elemento não pode estar em dois conjuntos');
    if (all.some((e) => e.length > 3)) throw new Error('Use nomes curtos (até 3 caracteres)');
    return lists;
  }

  window.ListSets = { render, view, traceFind, traceUnion, parse, FIND_CODE, UNION_CODE, UNION_POND_CODE };
})();
