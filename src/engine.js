/*
 * Motor de recomendação e cronograma — Combo Vitalício.
 * Funções puras: recebem respostas + catálogo e devolvem o plano.
 * Documentação: docs/logica-recomendacao.md
 * Regra de segurança: respostas abertas (texto livre) NUNCA são lidas por este motor.
 */
(function (root) {
  'use strict';

  const DEFAULTS = {
    DEFAULT_LESSON_MIN: 20,     // duração assumida quando a aula não tem duração cadastrada (sinalizada como estimativa)
    BLOCK_MIN: 30,              // curso sem aulas cadastradas: vira blocos de 30 min sobre a carga estimada
    BLOCKS_PER_STAGE: 4,        // blocos agrupados em etapas (marcos de progresso)
    MAX_SEQUENCE: 5,            // cursos na sequência principal; os demais vão para "depois"
    DETAIL_WEEKS: 4,            // semanas detalhadas no cronograma
    MAX_DAYS: 3 * 365,          // horizonte máximo de previsão
    SUPPORT_THEME_PATTERN: /organiza/i, // tema do curso de apoio à organização (quando existir no catálogo)
  };

  const LEVELS = { iniciante: 1, basico: 2, intermediario: 3, avancado: 4 };
  const LEVEL_LABEL = { 1: 'Iniciante', 2: 'Básico', 3: 'Intermediário', 4: 'Avançado' };
  const SESSION_CAP = { ate15: 15, '15a30': 30, '30a60': 60, mais60: 90 };
  const REVIEW_RATIO = { leve: 0.25, equilibrado: 0.2, intensivo: 0.15 };
  const DEADLINE_DAYS = { ate1m: 30, ate3m: 91, ate6m: 182 };
  const DOW = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

  const split = (s) => String(s == null ? '' : s).split(/[;,]/).map((x) => x.trim()).filter(Boolean);
  const num = (v) => { const n = parseFloat(String(v).replace(',', '.')); return Number.isFinite(n) ? n : null; };
  const floor5 = (x) => Math.floor(x / 5) * 5;
  const round5 = (x) => Math.round(x / 5) * 5;

  /* ---------- Catálogo ---------- */
  function buildCatalog(rows, version, isDemo, opts) {
    const o = Object.assign({}, DEFAULTS, opts || {});
    const courses = new Map();
    const warnings = [];
    for (const r of rows || []) {
      const ativo = String(r.ativo == null ? 'sim' : r.ativo).trim().toLowerCase();
      if (['não', 'nao', 'n', 'false', '0'].includes(ativo)) continue;
      const cid = String(r.curso_id || '').trim();
      if (!cid) continue;
      let c = courses.get(cid);
      if (!c) {
        c = {
          id: cid, titulo: String(r.curso_titulo || cid).trim(), descricao: String(r.curso_descricao || '').trim(),
          temas: split(r.temas), nivel: Math.min(4, Math.max(1, parseInt(r.nivel, 10) || 1)),
          prereqs: split(r.prerequisitos), objetivos: String(r.objetivos || '').trim(),
          link: safeUrl(r.link_curso), materiais: split(r.materiais), modMap: new Map(), order: courses.size,
          tipo: String(r.tipo || 'curso').trim().toLowerCase() || 'curso', carga: num(r.carga_estimada_h), cargaFonte: String(r.carga_fonte || '').trim(),
        };
        courses.set(cid, c);
      }
      const mid = String(r.modulo_id || cid + '-M').trim();
      let m = c.modMap.get(mid);
      if (!m) { m = { id: mid, titulo: String(r.modulo_titulo || '').trim(), ordem: num(r.modulo_ordem) || c.modMap.size + 1, aulas: [] }; c.modMap.set(mid, m); }
      if (String(r.aula_id || '').trim()) {
        const dur = num(r.duracao_min);
        m.aulas.push({
          id: String(r.aula_id).trim(), titulo: String(r.aula_titulo || '').trim(), ordem: num(r.aula_ordem) || m.aulas.length + 1,
          dur: dur && dur > 0 ? dur : null, link: safeUrl(r.link_aula), curso: cid, modulo: mid, moduloTitulo: m.titulo,
        });
      }
    }
    const all = [...courses.values()];
    const resources = all.filter((c) => c.tipo === 'recurso');
    resources.forEach((c) => courses.delete(c.id));
    const list = all.filter((c) => c.tipo !== 'recurso');
    for (const c of list) {
      c.modulos = [...c.modMap.values()].sort((a, b) => a.ordem - b.ordem);
      c.modulos.forEach((m) => m.aulas.sort((a, b) => a.ordem - b.ordem));
      c.lessons = c.modulos.flatMap((m) => m.aulas);
      delete c.modMap;
      // Sem aulas cadastradas, mas com carga estimada: planejamento por blocos (sinalizado como estimativa)
      if (!c.lessons.length && c.carga > 0) {
        const n = Math.ceil((c.carga * 60) / o.BLOCK_MIN);
        c.blockMode = true;
        c.modulos = [];
        for (let i = 1; i <= n; i++) {
          const k = Math.ceil(i / o.BLOCKS_PER_STAGE);
          let m = c.modulos[k - 1];
          if (!m) { m = { id: `${c.id}-E${k}`, titulo: `Etapa ${k}`, ordem: k, aulas: [] }; c.modulos.push(m); }
          m.aulas.push({ id: `${c.id}-B${i}`, titulo: `Bloco ${i} de ${n}`, ordem: i, dur: o.BLOCK_MIN, estimated: true, block: true, link: '', curso: c.id, modulo: m.id, moduloTitulo: m.titulo });
        }
        c.lessons = c.modulos.flatMap((m) => m.aulas);
        warnings.push(`Curso ${c.id}: sem aulas cadastradas; usando ${n} blocos de ${o.BLOCK_MIN} min sobre carga estimada de ${c.carga} h.`);
        continue;
      }
      const missing = c.prereqs.filter((p) => !courses.has(p));
      if (missing.length) warnings.push(`Curso ${c.id}: pré-requisito(s) não encontrado(s) no catálogo: ${missing.join(', ')}.`);
      c.prereqs = c.prereqs.filter((p) => courses.has(p) && p !== c.id);
      if (!c.lessons.length) warnings.push(`Curso ${c.id} não tem aulas cadastradas.`);
      const semDur = c.lessons.filter((l) => l.dur == null).length;
      if (semDur) warnings.push(`Curso ${c.id}: ${semDur} aula(s) sem duração cadastrada.`);
    }
    const themes = [];
    list.forEach((c) => c.temas.forEach((t) => { if (!themes.includes(t)) themes.push(t); }));
    const byId = Object.fromEntries(list.map((c) => [c.id, c]));
    return { version: version || 'sem-versao', demo: !!isDemo, courses: list.filter((c) => c.lessons.length), byId, themes, warnings, resources, blockCourses: list.filter((c) => c.blockMode).length };
  }

  function safeUrl(u) {
    const s = String(u || '').trim();
    return /^https:\/\/[^\s"'<>]+$/i.test(s) ? s : '';
  }

  /* ---------- Recomendação ---------- */
  function recommend(a, cat, opts) {
    const o = Object.assign({}, DEFAULTS, opts || {});
    const byId = cat.byId;
    const themes = (a.temas || []).filter((t) => cat.themes.includes(t)).slice(0, 3);
    const prog = a.iniciou && a.iniciou !== 'nao' ? (a.cursos_iniciados || {}) : {};
    const done = (id) => prog[id] && prog[id].status === 'concluido';
    const pctOf = (id) => (prog[id] && prog[id].status === 'andamento' ? Number(prog[id].pct) || 0 : 0);
    const inProgress = (id) => prog[id] && prog[id].status === 'andamento' && byId[id];
    const lvlTheme = (t) => LEVELS[(a.nivel_tema || {})[t]] || 1;
    const minLevel = themes.length ? Math.min(...themes.map(lvlTheme)) : 1;
    const studentLevelFor = (c) => {
      const ls = c.temas.filter((t) => themes.includes(t)).map(lvlTheme);
      return ls.length ? Math.max(...ls) : minLevel;
    };

    // Sinais de necessidade de fundamentos (somente respostas fechadas)
    const fundSignals = [];
    if (a.revisar_fundamentos === 'sim') fundSignals.push('quer revisar os fundamentos antes de avançar');
    if (['frequentemente', 'quase_sempre'].includes(a.freq_conceitos)) fundSignals.push('encontra com frequência conceitos que ainda não compreende');
    if (a.momento === 'comecando') fundSignals.push('está começando seus estudos na área');
    if (a.momento === 'retomando') fundSignals.push('está retomando os estudos após um período afastado');
    if (minLevel <= 1) fundSignals.push('se avaliou como iniciante em ao menos um dos temas escolhidos');
    const needsFund = a.revisar_fundamentos === 'sim' || (a.revisar_fundamentos !== 'nao' && fundSignals.length > 0);

    const info = new Map();
    const add = (id, pts, reason) => {
      if (!byId[id]) return;
      if (!info.has(id)) info.set(id, { score: 0, reasons: [] });
      const it = info.get(id);
      it.score += pts;
      if (reason && !it.reasons.some((r) => r.k === reason.k && r.t === reason.t && r.of === reason.of)) it.reasons.push(reason);
    };

    // 1) Cursos-alvo: temas priorizados, curso desejado, cursos em andamento, apoio à organização
    const W = [30, 20, 10];
    themes.forEach((t, i) => cat.courses.forEach((c) => { if (c.temas.includes(t)) add(c.id, W[i], { k: 'tema', t, rank: i + 1 }); }));
    if (a.curso_desejado && byId[a.curso_desejado]) add(a.curso_desejado, 15, { k: 'desejado' });
    Object.keys(prog).forEach((id) => { if (inProgress(id)) add(id, 12, { k: 'continuar', pct: pctOf(id) }); });
    const atr = a.atrapalha || [];
    const orgPain = atr.includes('por_onde_comecar') ? 'por_onde_comecar' : atr.includes('organizacao') ? 'organizacao' : null;
    if (orgPain) cat.courses.filter((c) => c.temas.some((t) => o.SUPPORT_THEME_PATTERN.test(t))).forEach((c) => add(c.id, 6, { k: 'apoio', pain: orgPain }));

    // 2) Expande pré-requisitos (recursivo). Cursos concluídos satisfazem o pré-requisito.
    const waived = [];
    const isWaived = (c, p) => inProgress(c.id) && (pctOf(c.id) >= 50 || studentLevelFor(c) >= 3);
    const selected = new Set([...info.keys()].filter((id) => !done(id)));
    const edges = new Map(); // id -> prereqs que entram na ordenação
    const queue = [...selected];
    while (queue.length) {
      const id = queue.shift();
      const c = byId[id];
      const ps = [];
      for (const p of c.prereqs) {
        if (done(p)) continue;
        if (isWaived(c, p)) { waived.push({ course: id, prereq: p }); continue; }
        ps.push(p);
        add(p, 0, { k: 'prereq', of: id });
        if (!selected.has(p)) { selected.add(p); queue.push(p); }
      }
      edges.set(id, ps);
    }
    // Ajustes por nível e objetivo
    for (const [id, it] of info) {
      if (!selected.has(id)) continue;
      const c = byId[id];
      const gap = c.nivel - studentLevelFor(c);
      if (needsFund && c.nivel === 1) { it.score += 10; it.reasons.push({ k: 'fundamentos' }); }
      if (needsFund && c.nivel >= 3) it.score -= 5;
      if (a.objetivo === 'base' && c.nivel <= 2) it.score += 6;
      if (a.objetivo === 'aprofundar' && gap >= 0 && gap <= 1) it.score += 4;
      if (gap >= 2) { it.score -= 8; it.reasons.push({ k: 'acima', gap }); }
      if (!needsFund && c.nivel === 1 && minLevel >= 3) it.score -= 4;
    }

    // Pré-requisito herda a prioridade do curso que ele destrava
    for (let pass = 0; pass < 6; pass++) {
      for (const [id, ps] of edges) for (const p of ps) {
        const sp = info.get(p), sc = info.get(id);
        if (sp && sc && sp.score < sc.score + 1) sp.score = sc.score + 1;
      }
    }

    // 3) Ordenação topológica (pré-requisitos sempre antes), desempate por pontuação, nível e ordem do catálogo
    const ids = [...selected];
    const indeg = new Map(ids.map((id) => [id, (edges.get(id) || []).filter((p) => selected.has(p)).length]));
    const order = [];
    const bestRank = (id) => Math.min(9, ...info.get(id).reasons.filter((r) => r.k === 'tema').map((r) => r.rank));
    const cmp = (x, y) => (info.get(y).score - info.get(x).score) || (bestRank(x) - bestRank(y)) || (byId[x].nivel - byId[y].nivel) || (byId[x].order - byId[y].order);
    let ready = ids.filter((id) => indeg.get(id) === 0);
    while (ready.length) {
      ready.sort(cmp);
      const id = ready.shift();
      order.push(id);
      for (const other of ids) {
        if ((edges.get(other) || []).includes(id)) {
          indeg.set(other, indeg.get(other) - 1);
          if (indeg.get(other) === 0) ready.push(other);
        }
      }
    }
    // Curso de apoio à organização (curto, sem pré-requisitos) entra logo após o ponto de partida
    const sup = order.find((id) => info.get(id).reasons.some((r) => r.k === 'apoio') && !(edges.get(id) || []).length);
    if (sup && order.indexOf(sup) > 1) { order.splice(order.indexOf(sup), 1); order.splice(1, 0, sup); }
    // Curso introdutório (nível 1) que cairia DEPOIS de um curso mais completo dos mesmos temas é redundante:
    // vai para "depois da sequência", salvo se o aluno o pediu ou já começou.
    for (const id of order.slice()) {
      const c = byId[id];
      if (c.nivel !== 1 || inProgress(id) || id === a.curso_desejado) continue;
      const pos = order.indexOf(id);
      const covered = order.slice(0, pos).some((x) => byId[x].nivel > 1 && c.temas.every((t) => byId[x].temas.includes(t)));
      if (covered) { order.splice(pos, 1); order.push(id); }
    }
    const cyclic = ids.filter((id) => !order.includes(id));
    // Cursos em ciclo de pré-requisitos não são recomendados (erro de catálogo)

    const sequence = order.slice(0, o.MAX_SEQUENCE).map((id) => ({ id, course: byId[id], score: info.get(id).score, reasons: info.get(id).reasons, pct: pctOf(id) }));
    const later = order.slice(o.MAX_SEQUENCE).map((id) => byId[id]);

    return {
      themes, needsFund, fundSignals, minLevel, waived, cyclic, sequence, later,
      start: sequence[0] || null,
      desired: a.curso_desejado && byId[a.curso_desejado] ? byId[a.curso_desejado] : null,
      completedAll: !sequence.length,
    };
  }

  /* ---------- Explicações (texto montado só a partir de respostas fechadas e do catálogo) ---------- */
  function reasonPhrases(item, rec, cat) {
    const out = [];
    const rs = item.reasons;
    rs.filter((r) => r.k === 'continuar').forEach((r) => out.push(`você já começou este curso${r.pct ? ` (cerca de ${r.pct}% concluído)` : ''} e continuar aproveita o que já estudou`));
    rs.filter((r) => r.k === 'desejado').forEach(() => out.push('é o curso que você disse que deseja começar'));
    const pre = rs.filter((r) => r.k === 'prereq').map((r) => cat.byId[r.of].titulo);
    if (pre.length) out.push(`é pré-requisito de ${joinPt(pre)}`);
    rs.filter((r) => r.k === 'tema').sort((x, y) => x.rank - y.rank).slice(0, 1).forEach((r) => out.push(r.rank === 1
      ? `trabalha “${r.t}”, o tema que você colocou como prioridade número 1`
      : `trabalha “${r.t}”, sua ${r.rank}ª prioridade`));
    if (rs.some((r) => r.k === 'fundamentos') && rec.fundSignals.length) out.push(`você informou que ${joinPt(rec.fundSignals.slice(0, 2))}`);
    rs.filter((r) => r.k === 'apoio').forEach((r) => out.push(r.pain === 'por_onde_comecar'
      ? 'você contou que não saber por onde começar atrapalha sua constância, e este curso trata da organização dos estudos'
      : 'você contou que a falta de organização atrapalha sua constância, e este curso trata da organização dos estudos'));
    return out;
  }

  function roleOf(item, idx, cat) {
    const rs = item.reasons;
    if (idx === 0) return 'Ponto de partida';
    if (rs.some((r) => r.k === 'continuar')) return 'Continuação de um curso já iniciado';
    const pre = rs.filter((r) => r.k === 'prereq');
    if (pre.length) return `Base para ${joinPt(pre.map((r) => cat.byId[r.of].titulo))}`;
    const t = rs.find((r) => r.k === 'tema');
    if (t) return `Aprofunda o tema “${t.t}”`;
    if (rs.some((r) => r.k === 'desejado')) return 'Curso que você deseja fazer';
    if (rs.some((r) => r.k === 'apoio')) return 'Apoio à organização dos estudos';
    return 'Complemento da sua jornada';
  }

  function joinPt(arr) {
    if (arr.length <= 1) return arr.join('');
    return arr.slice(0, -1).join(', ') + ' e ' + arr[arr.length - 1];
  }

  /* ---------- Cronograma ---------- */
  function parseDate(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
    if (!m) return null;
    const d = new Date(+m[1], +m[2] - 1, +m[3]);
    return isNaN(d) ? null : d;
  }
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  function spreadPick(days, k) {
    if (k >= days.length) return days;
    const out = [];
    for (let i = 0; i < k; i++) out.push(days[Math.floor((i * days.length) / k)]);
    return out;
  }

  function buildSchedule(a, rec, cat, opts) {
    const o = Object.assign({}, DEFAULTS, opts || {});
    const notes = [];
    const start = parseDate(a.inicio) || new Date();
    const weeklyMin = Math.max(0, Math.round((num(a.horas_semana) || 0) * 60));
    const flex = a.previsibilidade === 'muda_bastante';
    const budget = Math.floor(weeklyMin * (flex ? 0.85 : 1));
    if (flex) notes.push('Como sua rotina muda bastante, deixamos cerca de 15% do seu tempo semanal livre como folga para imprevistos.');

    const dowOrder = [1, 2, 3, 4, 5, 6, 0];
    let days = dowOrder.filter((d) => (a.dias || []).map(Number).includes(d));
    if (!days.length) days = [1, 3, 5];
    const cap = SESSION_CAP[a.duracao_sessao] || 30;
    let sessionMin = Math.min(cap, floor5(budget / days.length));
    if (sessionMin < 10) {
      const k = Math.max(1, Math.floor(budget / 10));
      const kept = spreadPick(days, Math.min(k, days.length));
      if (kept.length < days.length) notes.push(`Com ${fmtMin(weeklyMin)} por semana, sessões em ${days.length} dias ficariam curtas demais. Usamos ${kept.length} dia(s): ${kept.map((d) => DOW[d]).join(', ')}.`);
      days = kept;
      sessionMin = Math.min(cap, floor5(budget / days.length));
    }
    if (sessionMin < 5) sessionMin = Math.max(5, Math.min(cap, budget));
    const ratio = REVIEW_RATIO[a.ritmo] || 0.2;
    let compMin = sessionMin <= 15 ? 0 : Math.max(5, round5(sessionMin * ratio));
    let contentMin = sessionMin - compMin;
    const perWeek = days.length;
    const weeklyUsed = perWeek * sessionMin;

    // Cadência de sessões de revisão (última sessão da semana)
    const every = perWeek >= 3 ? { leve: 1, equilibrado: 2, intensivo: 4 }[a.ritmo] || 2
      : perWeek === 2 ? { leve: 2, equilibrado: 3, intensivo: 4 }[a.ritmo] || 3
        : { leve: 3, equilibrado: 4, intensivo: 6 }[a.ritmo] || 4;

    // Fila de aulas por curso
    const seq = rec.sequence.map((s) => s.course).concat(rec.later);
    const state = new Map();
    for (const s of seq) {
      let lessons = s.lessons.slice();
      if (s.blockMode) {
        // Blocos do tamanho da parte de aula da sessão: um bloco por sessão, sem partes
        const total = s.lessons.reduce((t, l) => t + l.dur, 0);
        const n = Math.max(1, Math.ceil(total / contentMin));
        lessons = [];
        for (let i = 1; i <= n; i++) {
          // Etapas de BLOCKS_PER_STAGE sessões, para o aluno ter marcos curtos
          const stages = Math.ceil(n / o.BLOCKS_PER_STAGE);
          const k = Math.ceil(i / o.BLOCKS_PER_STAGE);
          const m = s.modulos[Math.min(k, s.modulos.length) - 1];
          lessons.push({ id: `${s.id}-B${i}`, titulo: `Bloco ${i} de ${n}`, dur: i < n ? contentMin : total - contentMin * (n - 1), estimated: true, block: true, link: '', curso: s.id, modulo: m.id, moduloTitulo: `Etapa ${k}`, stage: k, stages, first: i === 1, last: i === n });
        }
        lessons.forEach((l, i) => { l.stageEnd = !lessons[i + 1] || lessons[i + 1].stage !== l.stage; });
      }
      const pct = rec.sequence.find((x) => x.id === s.id)?.pct || 0;
      let skipped = 0;
      if (pct > 0) { skipped = Math.floor((lessons.length * pct) / 100); lessons = lessons.slice(skipped); }
      state.set(s.id, {
        course: s, skipped,
        queue: lessons.map((l) => ({ l, remaining: l.dur || o.DEFAULT_LESSON_MIN, total: l.dur || o.DEFAULT_LESSON_MIN, part: 0, estimated: !!l.estimated || l.dur == null, block: !!l.block })),
        startDate: null, endDate: null, contentMin: lessons.reduce((t, l) => t + (l.dur || o.DEFAULT_LESSON_MIN), 0),
        estimatedCount: lessons.filter((l) => l.dur == null && !l.block).length, blockMode: !!s.blockMode,
      });
      if (skipped) notes.push(s.blockMode ? `Em ${s.titulo}, descontamos cerca de ${pct}% da carga pelo progresso que você informou. Na área de membros, continue da aula em que parou.` : `Em ${s.titulo}, consideramos as ${skipped} primeiras aulas como já assistidas, com base no progresso que você informou. Se não for o caso, comece pela aula que parou.`);
    }
    const seqIds = seq.map((c) => c.id);
    const finished = (id) => !state.has(id) || state.get(id).queue.length === 0;
    const prereqsOk = (c) => c.prereqs.every((p) => finished(p) || rec.waived.some((w) => w.course === c.id && w.prereq === p) || !seqIds.includes(p));
    const alternate = a.sequencial === 'alternar';

    function pickCourse(sessionNo, current) {
      if (current && !finished(current)) {
        if (!alternate) return current;
      }
      const eligible = seqIds.filter((id) => !finished(id) && prereqsOk(state.get(id).course));
      if (!eligible.length) return null;
      if (!alternate) return eligible[0];
      const pair = eligible.slice(0, 2);
      return pair[(sessionNo - 1) % pair.length];
    }

    const sessions = [];
    const prefs = a.ajuda || [];
    let sessionNo = 0, current = null, lastReviewWeek = 0;
    const endBy = addDays(start, o.MAX_DAYS);
    const weekOffsets = [0, 1, 2, 3, 4, 5, 6].filter((off) => days.includes(addDays(start, off).getDay()));
    const lastOffset = weekOffsets[weekOffsets.length - 1];
    let lastStudyDate = null;
    const weekTotals = {};
    const lessonsThisWeek = {};

    for (let d = 0; ; d++) {
      const date = addDays(start, d);
      if (date > endBy) { notes.push('A sequência completa passa de 3 anos com a disponibilidade atual; mostramos a previsão até esse limite.'); break; }
      if (!days.includes(date.getDay())) continue;
      const week = Math.floor(d / 7) + 1;
      const allDone = seqIds.every(finished);
      if (allDone) break;
      sessionNo++;
      const detail = week <= o.DETAIL_WEEKS;
      const isLastOfWeek = d % 7 === lastOffset;
      const reviewWeek = week % every === 0;
      const sess = { week, date: iso(date), dow: DOW[date.getDay()], n: sessionNo, type: 'aula', items: [], minutes: 0, compMin: 0, comp: '', goal: '' };

      if (isLastOfWeek && reviewWeek && week !== lastReviewWeek && (lessonsThisWeek[week] || []).length) {
        lastReviewWeek = week;
        sess.type = 'revisao';
        const seen = lessonsThisWeek[week];
        const reviewText = seen[0].block
          ? `Revisão da semana: aulas estudadas em ${state.get(seen[0].curso).course.titulo}`
          : `Revisão da semana: ${seen.slice(0, 3).map((l) => l.titulo).join('; ')}${seen.length > 3 ? '…' : ''}`;
        sess.items.push({ review: true, courseId: seen[0].curso, course: state.get(seen[0].curso).course.titulo, text: reviewText, min: sessionMin });
        sess.minutes = sessionMin;
        sess.comp = reviewActivity(prefs, state.get(seen[0].curso).course);
        sess.goal = 'Consolidar o que foi estudado na semana antes de avançar';
      } else {
        let left = contentMin;
        let guard = 0;
        const sessionCourse = alternate ? pickCourse(sessionNo, null) : null; // alternar: um curso por sessão
        while (left > 0 && guard++ < 20) {
          const cid = alternate ? (finished(sessionCourse) ? null : sessionCourse) : pickCourse(sessionNo, current);
          if (!cid) break;
          current = cid;
          const st = state.get(cid);
          if (!st.startDate) st.startDate = iso(date);
          const q = st.queue[0];
          const take = Math.min(q.remaining, left);
          // Evita começar uma aula nova com sobra pequena: o tempo restante vira atividade complementar
          if (sess.items.length && q.part === 0 && take < q.remaining && left < 10) break;
          q.part += 1;
          q.remaining -= take;
          left -= take;
          const finishedLesson = q.remaining <= 0;
          const multipart = q.part > 1 || !finishedLesson;
          sess.items.push({
            courseId: cid, course: st.course.titulo, moduleId: q.l.modulo, module: q.l.moduloTitulo, lessonId: q.l.id, lesson: q.l.titulo,
            part: multipart ? q.part : 0, continuation: q.part > 1, lastPart: finishedLesson, min: take, estimated: q.estimated, block: q.block, blockInfo: q.block ? { stage: q.l.stage, stages: q.l.stages, stageEnd: q.l.stageEnd, first: q.l.first, last: q.l.last } : null, link: q.l.link || st.course.link || '',
          });
          if (finishedLesson) {
            st.queue.shift();
            (lessonsThisWeek[week] = lessonsThisWeek[week] || []).push(q.l);
            if (!st.queue.length) st.endDate = iso(date);
          }
        }
        if (!sess.items.length) continue;
        const used = sess.items.reduce((t, i) => t + i.min, 0);
        // Tempo não usado pela aula vai para a atividade complementar, sem passar do tamanho da sessão
        sess.compMin = compMin > 0 ? Math.min(sessionMin - used, compMin + (contentMin - used)) : 0;
        sess.minutes = used + sess.compMin;
        const course = state.get(sess.items[0].courseId).course;
        sess.comp = sess.compMin > 0 ? complementary(prefs, course, sessionNo) : 'Ao final, anote em uma frase a ideia principal (dentro do tempo da sessão)';
        sess.goal = sessionGoal(sess.items, state);
      }
      weekTotals[week] = (weekTotals[week] || 0) + sess.minutes;
      lastStudyDate = iso(date);
      if (detail) sessions.push(sess);
    }

    // Previsões
    const forecast = seqIds.map((id) => {
      const st = state.get(id);
      return { id, titulo: st.course.titulo, start: st.startDate, end: st.endDate, contentMin: st.contentMin, estimatedCount: st.estimatedCount, blockMode: st.blockMode, later: !rec.sequence.some((s) => s.id === id) };
    });

    // Verificação de prazo da primeira etapa (curso inicial)
    let deadline = null;
    if (rec.start) {
      const f = forecast.find((x) => x.id === rec.start.id);
      const limitDays = DEADLINE_DAYS[a.prazo_etapa];
      if (limitDays && f.end) {
        const limit = addDays(start, limitDays);
        const end = parseDate(f.end);
        if (end > limit) {
          const weeks = limitDays / 7;
          const contentShare = contentMin / sessionMin * (1 - 1 / Math.max(1, every * perWeek));
          const needH = Math.ceil((f.contentMin / weeks / Math.max(0.3, contentShare)) / 60 * 2) / 2;
          deadline = { ok: false, wanted: iso(limit), forecast: f.end, needHours: needH, haveHours: weeklyMin / 60 };
        } else deadline = { ok: true, wanted: iso(limit), forecast: f.end };
      }
    }

    // Marcos: conclusão de módulos dentro do período detalhado
    const milestones = [];
    const seenMods = new Set();
    for (const s of sessions) for (const it of s.items) {
      if (it.review || !it.lastPart) continue;
      const st = state.get(it.courseId);
      if (it.block) {
        const b = it.blockInfo;
        if (b.stageEnd) milestones.push({ week: s.week, date: s.date, text: b.last ? `Concluir ${st.course.titulo}` : `Concluir a etapa ${b.stage} de ${b.stages} de ${st.course.titulo}` });
        continue;
      }
      const mod = st.course.modulos.find((m) => m.id === it.moduleId);
      if (mod && mod.aulas[mod.aulas.length - 1].id === it.lessonId && !seenMods.has(mod.id)) {
        seenMods.add(mod.id);
        milestones.push({ week: s.week, date: s.date, text: `Concluir o módulo “${mod.titulo}” de ${st.course.titulo}` });
      }
    }

    // Verificação: nenhuma semana passa da disponibilidade informada
    const over = Object.entries(weekTotals).filter(([, m]) => m > weeklyMin);
    if (over.length) throw new Error('Cronograma excede a disponibilidade semanal: ' + JSON.stringify(over));

    return {
      start: iso(start), days, sessionMin, contentMin, compMin, perWeek, weeklyMin, weeklyUsed, budget, flex, reviewEvery: every,
      sessions, weekTotals, forecast, deadline, milestones, notes, lastStudyDate,
      estimatedLessons: forecast.reduce((t, f) => t + f.estimatedCount, 0), defaultLessonMin: o.DEFAULT_LESSON_MIN,
    };
  }

  function complementary(prefs, course, n) {
    const mat = course.materiais.join(' ').toLowerCase();
    const opts = [];
    if (prefs.includes('exercicios') && /exerc/.test(mat)) opts.push('Resolver os exercícios comentados do curso ligados a esta aula');
    if (prefs.includes('resumos') && /(resumo|pdf|checklist)/.test(mat)) opts.push(`Revisar o material de apoio do curso (${course.materiais.join(', ')})`);
    if (prefs.includes('exemplos') && /caso/.test(mat)) opts.push('Ler o estudo de caso do curso relacionado ao tema da aula');
    if (prefs.includes('anotacoes')) opts.push('Anotar com suas palavras os 3 pontos principais da aula');
    if (prefs.includes('exemplos')) opts.push('Pensar em um exemplo da sua rotina que ilustre o que viu');
    if (prefs.includes('aplicar')) opts.push('Escrever uma situação em que você vai aplicar o que aprendeu');
    if (prefs.includes('resumos')) opts.push('Fazer um resumo curto da aula para revisar depois');
    if (!opts.length) opts.push('Escrever um resumo de 3 linhas da aula');
    return opts[n % opts.length];
  }

  function reviewActivity(prefs, course) {
    const mat = course.materiais.join(' ').toLowerCase();
    if (prefs.includes('exercicios') && /exerc/.test(mat)) return 'Refazer os exercícios em que teve dúvida';
    if (/(resumo|pdf|checklist)/.test(mat)) return `Usar o material de apoio do curso (${course.materiais.join(', ')}) como guia da revisão`;
    return 'Reler suas anotações e listar dúvidas para retomar';
  }

  function sessionGoal(items, state) {
    const first = items[0];
    const st = state.get(first.courseId);
    const c = st.course;
    if (first.block) {
      const b = first.blockInfo;
      if (b.first) return `Iniciar o curso ${c.titulo}`;
      const end = items.find((it) => it.block && it.blockInfo.stageEnd);
      if (end) return end.blockInfo.last ? `Concluir ${c.titulo}` : `Concluir a etapa ${end.blockInfo.stage} de ${end.blockInfo.stages}`;
      return `Avançar em ${c.titulo}`;
    }
    if (c.lessons[0] && c.lessons[0].id === first.lessonId && first.part <= 1 && !first.continuation) return `Iniciar o curso ${c.titulo}`;
    const endMod = items.find((it) => it.lastPart && (() => { const m = c.modulos.find((mm) => mm.id === it.moduleId); return m && m.aulas[m.aulas.length - 1].id === it.lessonId; })());
    if (endMod) return `Concluir o módulo “${endMod.module}”`;
    if (first.continuation && !first.lastPart) return `Continuar a aula “${first.lesson}”`;
    return `Avançar no módulo “${first.module}”`;
  }

  function fmtMin(m) {
    m = Math.round(m);
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60), r = m % 60;
    return r ? `${h}h${String(r).padStart(2, '0')}` : `${h}h`;
  }

  const api = { DEFAULTS, LEVELS, LEVEL_LABEL, DOW, buildCatalog, recommend, buildSchedule, reasonPhrases, roleOf, joinPt, fmtMin, parseDate, iso, addDays };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.Engine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
