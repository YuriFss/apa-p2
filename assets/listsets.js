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
        chain.append(APA.el('div', { class: 'lnode ' + ((st.marks || {})[e] || '') },
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
    push(0, `<b>findSet(${x})</b>: devolve o conjunto de ${x}.`, { x });
    st.marks[x] = 'cur';
    push(1, `O vetor <code>ptr</code> guarda, para cada elemento, o endereço do seu nó. Acesso direto pela chave: <b>O(1)</b>, sem percorrer lista nenhuma.`, { x, e: 'nó ' + x });
    st.cur = st.rep[x];
    push(2, `Devolve <code>e.rep</code> = <b>${st.rep[x]}</b>, cujo representante é o head, <b>${setOf(st, x).elems[0]}</b>. Total: 2 passos constantes, então findSet é <b>O(1)</b>.`, { x, e: 'nó ' + x, retorno: st.rep[x] });
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
    push(0, `<b>union(${x}, ${y})</b>: ${pond ? 'anexa a lista <b>menor</b> à maior.' : 'anexa a lista de y ao fim da lista de x.'}`);
    Sx = setOf(st, x); st.marks[x] = 'cur'; st.cur = Sx.name;
    push(1, `findSet(${x}): pega o nó ${x} (via ptr) e segue <code>${x}.rep</code>, que aponta para o objeto <b>${Sx.name}</b>. Então Sx = ${Sx.name}, o conjunto de ${x}. Custo O(1).`);
    Sy = setOf(st, y); st.marks[y] = 'cur';
    push(2, `findSet(${y}): segue <code>${y}.rep</code> e chega ao objeto <b>${Sy.name}</b>. Então Sy = ${Sy.name}. Custo O(1). Até aqui nada mudou nas listas: só descobrimos quais são os dois conjuntos.`);
    if (Sx === Sy) { push(2, `${x} e ${y} já estão no mesmo conjunto. O Kruskal nunca chama union nesse caso: ele testa <code>findSet(u) ≠ findSet(v)</code> antes.`); return out; }
    if (pond) {
      push(L.cmp, `Compara os tamanhos: ${Sx.name}.size = ${Sx.size}, ${Sy.name}.size = ${Sy.size}. O campo size é lido em O(1).`);
      if (Sx.size < Sy.size) {
        [Sx, Sy] = [Sy, Sx]; st.cur = Sx.name;
        push(L.swap, `${Sy.name} é menor: troca os papéis. Agora Sx = <b>${Sx.name}</b> (a maior) e Sy = <b>${Sy.name}</b> (a menor, que será anexada).`);
      }
    }
    const tailX = Sx.tail, moved = Sy.elems.slice();
    Sx.elems.push(...moved); Sy.elems = []; Sy.note = `(os nós ${moved.join(', ')} agora estão na corrente de ${Sx.name}, mas ainda apontam para cá)`;
    moved.forEach((e) => (st.marks[e] = 'stale')); st.newLink = tailX; st.fmark = { [Sx.name + '.tail']: 'stale' };
    push(L.link, `Muda <b>um único ponteiro</b>: o next de ${tailX} (o tail de ${Sx.name}), que era ∅, passa a apontar para ${moved[0]} (o head de ${Sy.name}). Seta laranja. Agora, quem anda pelos next a partir de ${Sx.head} percorre os ${Sx.elems.length} nós. Duas coisas ficaram desatualizadas: <b>${Sx.name}.tail</b> ainda diz ${tailX} (mas o último nó é ${moved[moved.length - 1]}), e os nós ${moved.join(', ')} ainda têm <b>rep → ${Sy.name}</b>. Os próximos passos consertam isso.`);
    Sx.tail = Sy.tail; st.fmark = { [Sx.name + '.tail']: 'fixed' };
    push(L.tail, `Conserta o campo tail: ${Sx.name}.tail = ${Sy.name}.tail = <b>${Sx.tail}</b>. Isso importa para a <i>próxima</i> union que anexar algo a ${Sx.name}: ela vai pendurar no tail, e ele precisa ser o último nó de verdade. Custo O(1).`);
    if (pond) { Sx.size += Sy.size; st.fmark = { [Sx.name + '.size']: 'fixed' }; push(L.size, `${Sx.name}.size = ${Sx.size}. O(1).`); }
    for (const z of moved) {
      push(L.loop, `Próximo elemento da lista anexada: <b>${z}</b>.`);
      st.rep[z] = Sx.name; st.marks[z] = 'fixed'; count++;
      push(L.upd, `${z}.rep = ${Sx.name}. Ponteiros atualizados até agora: <b>${count}</b>.`);
    }
    st.gone.push(Sy.name); Sy.note = '';
    push(null, `Fim. Ninguém mais aponta para ${Sy.name}, que é descartado. O laço rodou <b>${count}</b> vez(es), uma por elemento da lista anexada. Esse laço domina o custo: no pior caso ele é <b>O(n)</b>.`);
    return out;
  }

  function parse(text) {
    const lists = text.split('|').map((t) => t.split(/[\s,;]+/).filter(Boolean)).filter((l) => l.length);
    const all = lists.flat();
    if (lists.length < 2 || lists.length > 4) throw new Error('Use de 2 a 4 conjuntos separados por | (ex.: a,b,c|d,e)');
    if (all.some((e, i) => all.indexOf(e) !== i)) throw new Error('Um elemento não pode estar em dois conjuntos');
    if (all.some((e) => e.length > 3)) throw new Error('Use nomes curtos (até 3 caracteres)');
    return lists;
  }

  window.ListSets = { render, traceFind, traceUnion, parse, FIND_CODE, UNION_CODE, UNION_POND_CODE };
})();
