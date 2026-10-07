/* Interface do diagnóstico — Combo Vitalício. Depende de Engine (engine.js). */
(function () {
  'use strict';

  const CONFIG = {
    // URL do App da Web do Google Apps Script (termina em /exec). Vazio = modo demonstração (nada é enviado).
    ENDPOINT: '',
    FORM_VERSION: '1.0.0',
    REQUEST_TIMEOUT_MS: 25000,
    STORAGE_KEY: 'cv-diagnostico-v1',
    PRIVACY_CONTACT: '[PROVISÓRIO] canal de contato da equipe a definir',
    // Área de membros do Combo Vitalício (usada enquanto os cursos não têm link próprio no catálogo)
    MEMBER_AREA_URL: 'https://hotmart.com/pt-BR/club/combo-vitalicio/products/4636748',
  };
  const E = window.Engine;

  /* ---------- utilidades ---------- */
  function h(tag, attrs) {
    const el = document.createElement(tag);
    if (attrs) for (const k of Object.keys(attrs)) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'value') el.value = v;
      else if (k === 'checked') el.checked = !!v;
      else if (k === 'selected') el.selected = !!v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (let i = 2; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  }
  function append(el, kid) {
    if (kid == null || kid === false) return;
    if (Array.isArray(kid)) { kid.forEach((k) => append(el, k)); return; }
    el.append(kid instanceof Node ? kid : String(kid));
  }
  const store = {
    get() { try { return JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY) || 'null'); } catch (e) { return null; } },
    set(v) { try { localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(v)); } catch (e) { /* armazenamento indisponível */ } },
    clear() { try { localStorage.removeItem(CONFIG.STORAGE_KEY); } catch (e) { /* ignore */ } },
  };
  const uuid = () => (window.crypto && crypto.randomUUID ? crypto.randomUUID() : 'd-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10));
  const todayIso = () => E.iso(new Date());
  const fmtDate = (s) => { const d = E.parseDate(s); return d ? d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''; };
  const fmtDateShort = (s) => { const d = E.parseDate(s); return d ? d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : ''; };
  const fmtHours = (hrs) => E.fmtMin(hrs * 60);

  /* ---------- opções ---------- */
  const O = {
    momento: [['comecando', 'Estou começando meus estudos na área.'], ['organizar', 'Já estudo o assunto, mas preciso organizar minha base.'], ['aprofundar', 'Já atuo e quero aprofundar meus conhecimentos.'], ['retomando', 'Estou retomando os estudos após um período afastado.'], ['outro', 'Outro.']],
    tempo_combo: [['menos1m', 'Menos de 1 mês'], ['1a6m', 'De 1 a 6 meses'], ['6a12m', 'De 6 a 12 meses'], ['mais12m', 'Mais de 1 ano'], ['nao_sei', 'Não sei informar']],
    iniciou: [['nao', 'Ainda não comecei.'], ['andamento', 'Comecei, mas não concluí.'], ['concluiu', 'Já concluí um ou mais cursos.']],
    objetivo: [['base', 'Construir uma base sólida de conhecimento.'], ['aplicar', 'Aplicar os aprendizados na minha atuação profissional.'], ['aprofundar', 'Aprofundar um tema específico.'], ['atualizar', 'Atualizar meus conhecimentos.'], ['seguranca', 'Desenvolver mais segurança no que faço.'], ['explorar', 'Explorar uma nova área de interesse.'], ['outro', 'Outro.']],
    sim_nao: [['sim', 'Sim'], ['nao', 'Não']],
    prazo_etapa: [['ate1m', 'Até um mês.'], ['ate3m', 'Até três meses.'], ['ate6m', 'Até seis meses.'], ['sem_data', 'Prefiro avançar sem uma data fixa.']],
    evolucao: [['conclusao', 'Pela conclusão de cursos.'], ['compreensao', 'Pela compreensão de assuntos que hoje considero difíceis.'], ['aplicacao', 'Pela capacidade de aplicar o que aprendi.'], ['constancia', 'Pela melhora na minha organização e constância.'], ['outro', 'Outro.']],
    nivel: [['iniciante', 'Iniciante'], ['basico', 'Básico'], ['intermediario', 'Intermediário'], ['avancado', 'Avançado']],
    freq_conceitos: [['raramente', 'Raramente'], ['as_vezes', 'Às vezes'], ['frequentemente', 'Frequentemente'], ['quase_sempre', 'Quase sempre']],
    revisar_fundamentos: [['sim', 'Sim, quero revisar a base primeiro.'], ['nao', 'Não, prefiro avançar direto.'], ['nao_sei', 'Não sei, quero uma sugestão.']],
    dias: [['1', 'Seg'], ['2', 'Ter'], ['3', 'Qua'], ['4', 'Qui'], ['5', 'Sex'], ['6', 'Sáb'], ['0', 'Dom']],
    duracao_sessao: [['ate15', 'Até 15 minutos.'], ['15a30', 'De 15 a 30 minutos.'], ['30a60', 'De 30 a 60 minutos.'], ['mais60', 'Mais de uma hora.']],
    periodo: [['manha', 'Manhã.'], ['tarde', 'Tarde.'], ['noite', 'Noite.'], ['varia', 'Varia conforme a rotina.']],
    ritmo: [['leve', 'Leve, com mais espaço para revisão.'], ['equilibrado', 'Equilibrado.'], ['intensivo', 'Intensivo, respeitando minha disponibilidade.']],
    previsibilidade: [['previsivel', 'Costuma ser previsível.'], ['muda_as_vezes', 'Muda de vez em quando.'], ['muda_bastante', 'Muda bastante.']],
    ajuda: [['anotacoes', 'Assistir às aulas e fazer anotações.'], ['resumos', 'Revisar resumos e materiais de apoio.'], ['exercicios', 'Resolver exercícios.'], ['exemplos', 'Analisar exemplos ou estudos de caso.'], ['aplicar', 'Aplicar o conteúdo em atividades.']],
    atrapalha: [['tempo', 'Falta de tempo.'], ['por_onde_comecar', 'Não saber por onde começar.'], ['excesso', 'Excesso de conteúdo.'], ['entender', 'Dificuldade para entender alguns assuntos.'], ['organizacao', 'Falta de organização.'], ['motivacao', 'Perda de motivação.'], ['outro', 'Outro.']],
    sequencial: [['concluir', 'Prefiro concluir um curso antes de iniciar outro.'], ['alternar', 'Prefiro alternar entre temas.'], ['indiferente', 'Tanto faz.']],
    formatos: [['curtas', 'Aulas curtas e objetivas.'], ['completos', 'Cursos completos.'], ['casos', 'Estudos de caso.'], ['encontros', 'Encontros para dúvidas.'], ['exercicios', 'Exercícios comentados.'], ['resumos', 'Resumos, checklists e materiais de apoio.']],
    pct: [['10', 'Menos de 25%'], ['35', 'Entre 25% e 50%'], ['60', 'Entre 50% e 75%'], ['85', 'Mais de 75%']],
  };
  const label = (opts, v) => (opts.find((o) => o[0] === v) || [, v])[1];
  const NO_HEALTH = 'Não inclua dados de pacientes nem informações de saúde.';

  /* ---------- etapas ---------- */
  const visibleIf = {
    momento_outro: (a) => a.momento === 'outro',
    cursos_iniciados: (a) => a.iniciou && a.iniciou !== 'nao',
    objetivo_outro: (a) => a.objetivo === 'outro',
    curso_desejado_motivo: (a) => !!a.curso_desejado,
    prazo_descricao: (a) => a.prazo_compromisso === 'sim',
    prazo_data: (a) => a.prazo_compromisso === 'sim',
    evolucao_outro: (a) => (a.evolucao || []).includes('outro'),
    atrapalha_outro: (a) => (a.atrapalha || []).includes('outro'),
  };
  const STEPS = [
    { key: 'perfil', title: 'Conhecendo você', intro: 'Comece contando quem você é e em que ponto está no combo.', fields: [
      { id: 'nome', type: 'text', label: 'Qual é seu nome?', req: true, max: 120, autocomplete: 'name', msg: 'Informe seu nome.' },
      { id: 'email', type: 'email', label: 'Qual é o e-mail utilizado na compra ou no acesso ao combo?', req: true, max: 160, autocomplete: 'email', help: 'Usamos o e-mail para vincular o plano ao seu acesso.' },
      { id: 'area', type: 'text', label: 'Qual é sua área de atuação ou formação?', max: 160 },
      { id: 'momento', type: 'radio', label: 'Qual é seu momento atual?', req: true, opts: O.momento },
      { id: 'momento_outro', type: 'text', label: 'Conte qual é seu momento', max: 200, sub: true },
      { id: 'tempo_combo', type: 'radio', label: 'Há quanto tempo você faz parte do Combo Vitalício?', opts: O.tempo_combo, cols: true },
      { id: 'iniciou', type: 'radio', label: 'Você já começou algum curso do combo?', req: true, opts: O.iniciou },
      { id: 'cursos_iniciados', type: 'courseProgress', label: 'Quais cursos você já começou ou concluiu?', req: true, help: 'Marque os cursos e informe, de forma aproximada, quanto já avançou.' },
    ] },
    { key: 'objetivos', title: 'Objetivos e prioridades', intro: 'Seus objetivos definem a ordem dos cursos no plano.', fields: [
      { id: 'objetivo', type: 'radio', label: 'Qual é seu principal objetivo com o Combo Vitalício?', req: true, opts: O.objetivo },
      { id: 'objetivo_outro', type: 'text', label: 'Conte qual é seu objetivo', max: 200, sub: true },
      { id: 'temas', type: 'themes', label: 'Quais temas você mais deseja estudar?', req: true, help: 'Selecione até três. O primeiro que você marcar é a prioridade 1; use as setas para reordenar.' },
      { id: 'dificuldade', type: 'textarea', label: 'Qual é a principal dificuldade que você quer superar hoje?', max: 600, help: NO_HEALTH },
      { id: 'fazer_melhor', type: 'textarea', label: 'O que você gostaria de conseguir fazer melhor após os estudos?', max: 600 },
      { id: 'curso_desejado', type: 'courseSelect', label: 'Existe algum curso do combo que você deseja muito começar?' },
      { id: 'curso_desejado_motivo', type: 'text', label: 'Por que esse curso?', max: 300, sub: true },
      { id: 'prazo_compromisso', type: 'radio', label: 'Você tem algum objetivo ou compromisso com prazo definido?', opts: O.sim_nao, cols: true },
      { id: 'prazo_descricao', type: 'text', label: 'Qual é o compromisso?', max: 200, sub: true },
      { id: 'prazo_data', type: 'date', label: 'Data aproximada', sub: true },
    ] },
    { key: 'expectativas', title: 'Expectativas e horizonte', intro: 'Essas respostas orientam o planejamento. Elas não são uma promessa de resultado.', fields: [
      { id: 'meta_30', type: 'textarea', label: 'Qual resultado concreto você gostaria de alcançar nos próximos 30 dias?', max: 600 },
      { id: 'meta_3m', type: 'textarea', label: 'E nos próximos três meses?', max: 600 },
      { id: 'meta_12m', type: 'textarea', label: 'Pensando nos próximos seis a doze meses, o que faria você considerar que valeu a pena investir no combo?', max: 600 },
      { id: 'prazo_etapa', type: 'radio', label: 'Em quanto tempo você gostaria de concluir sua primeira etapa de estudos?', req: true, opts: O.prazo_etapa },
      { id: 'evolucao', type: 'checkbox', label: 'Como você perceberá que está evoluindo?', opts: O.evolucao, help: 'Marque quantas quiser.' },
      { id: 'evolucao_outro', type: 'text', label: 'Conte como', max: 200, sub: true },
    ] },
    { key: 'conhecimento', title: 'Conhecimento prévio', intro: 'Esta etapa é uma autoavaliação, não uma prova. Responda com sinceridade para o plano começar no ponto certo.', fields: [
      { id: 'nivel_tema', type: 'themeLevels', label: 'Como você avalia seu conhecimento nos temas que escolheu?', req: true },
      { id: 'estudou_antes', type: 'textarea', label: 'Você já estudou esses temas antes? Onde ou de que forma?', max: 600 },
      { id: 'revisar_assuntos', type: 'textarea', label: 'Quais assuntos você sente que precisa revisar?', max: 600 },
      { id: 'freq_conceitos', type: 'radio', label: 'Ao estudar, com que frequência encontra conceitos que não compreende?', req: true, opts: O.freq_conceitos, seg: true },
      { id: 'revisar_fundamentos', type: 'radio', label: 'Gostaria de revisar os fundamentos antes de avançar?', req: true, opts: O.revisar_fundamentos },
    ] },
    { key: 'rotina', title: 'Rotina e disponibilidade', intro: 'O cronograma nunca vai passar do tempo que você informar aqui.', fields: [
      { id: 'horas_semana', type: 'number', label: 'Quantas horas por semana você consegue dedicar aos estudos de forma realista?', req: true, min: 0.5, maxN: 40, step: 0.5, help: 'Exemplo: 2,5 para duas horas e meia.', suffix: 'horas por semana' },
      { id: 'dias', type: 'weekdays', label: 'Em quais dias da semana pretende estudar?', req: true },
      { id: 'duracao_sessao', type: 'radio', label: 'Quanto tempo costuma ter disponível por sessão?', req: true, opts: O.duracao_sessao, cols: true },
      { id: 'periodo', type: 'radio', label: 'Em qual período prefere estudar?', opts: O.periodo, cols: true },
      { id: 'inicio', type: 'date', label: 'Quando deseja começar?', req: true, minToday: true },
      { id: 'ritmo', type: 'radio', label: 'Qual ritmo prefere?', req: true, opts: O.ritmo },
      { id: 'previsibilidade', type: 'radio', label: 'Sua rotina costuma ser previsível ou muda bastante?', opts: O.previsibilidade },
    ] },
    { key: 'aprendizagem', title: 'Como você aprende', intro: 'Usamos estas preferências para escolher as atividades de cada sessão.', fields: [
      { id: 'ajuda', type: 'checkbox', label: 'O que mais ajuda você a aprender?', opts: O.ajuda, help: 'Marque quantas quiser.' },
      { id: 'atrapalha', type: 'checkbox', label: 'O que costuma atrapalhar sua constância?', opts: O.atrapalha, help: 'Marque quantas quiser.' },
      { id: 'atrapalha_outro', type: 'text', label: 'Conte o que mais atrapalha', max: 200, sub: true },
      { id: 'sequencial', type: 'radio', label: 'Você prefere concluir um curso antes de iniciar outro ou alternar temas?', opts: O.sequencial },
      { id: 'acessibilidade', type: 'textarea', label: 'Há alguma preferência de acessibilidade ou formato que devemos considerar?', max: 600, help: 'Exemplo: legendas, materiais em texto, sessões mais curtas. ' + NO_HEALTH },
    ] },
    { key: 'sugestoes', title: 'Atualizações e sugestões', intro: 'Estas respostas ajudam a equipe a conhecer os interesses dos alunos. Elas não representam compromisso de lançamento.', fields: [
      { id: 'temas_futuros', type: 'textarea', label: 'Quais temas você gostaria de encontrar nas próximas atualizações do combo?', max: 600 },
      { id: 'aprofundar', type: 'textarea', label: 'Em quais assuntos gostaria de ter aulas mais aprofundadas?', max: 600 },
      { id: 'formatos', type: 'checkbox', label: 'Quais formatos seriam mais úteis?', opts: O.formatos },
      { id: 'falta', type: 'textarea', label: 'Existe algum conteúdo ou recurso que você sente falta?', max: 600 },
      { id: 'melhoria', type: 'textarea', label: 'Se pudesse sugerir uma melhoria no combo, qual seria?', max: 600 },
    ] },
  ];
  const ALL_FIELDS = STEPS.flatMap((s) => s.fields);
  const isVisible = (f, a) => !visibleIf[f.id] || visibleIf[f.id](a);

  /* ---------- estado ---------- */
  const app = document.getElementById('app');
  const bannerEl = document.getElementById('banner');
  let catalog = null;
  let S = { view: 'intro', step: 0, answers: {}, pendingId: null, fromReview: false, result: null, saved: false, consent: false };
  const getDraft = () => { const d = store.get(); return d && d.answers && Object.keys(d.answers).length ? d : null; };

  function persist() { store.set({ answers: S.answers, step: S.step, view: S.view === 'result' ? 'review' : S.view, pendingId: S.pendingId, consent: S.consent, savedAt: Date.now() }); }
  let persistTimer = null;
  const persistSoon = () => { clearTimeout(persistTimer); persistTimer = setTimeout(persist, 250); };

  /* ---------- catálogo ---------- */
  async function loadCatalog() {
    if (!CONFIG.ENDPOINT) {
      const el = document.getElementById('catalog-data');
      catalog = E.buildCatalog(JSON.parse(el.textContent), el.dataset.version, false);
      catalog.offline = true; // catálogo embutido na página: nada é enviado para a planilha
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), CONFIG.REQUEST_TIMEOUT_MS);
    try {
      const r = await fetch(CONFIG.ENDPOINT + '?action=catalog', { signal: ctrl.signal });
      const j = await r.json();
      if (!j.ok || !Array.isArray(j.rows)) throw new Error(j.error || 'Resposta inválida');
      catalog = E.buildCatalog(j.rows, j.version, false);
      if (!catalog.courses.length) throw new Error('Catálogo vazio');
    } finally { clearTimeout(t); }
  }

  function renderBanner() {
    bannerEl.replaceChildren();
    if (catalog && catalog.demo) {
      bannerEl.append(h('div', { class: 'banner no-print', role: 'note' },
        h('span', null, h('strong', null, 'Demonstração. '), 'Os cursos, aulas e durações desta página são fictícios. Nenhuma resposta é enviada ou salva fora do seu navegador.')));
    } else if (catalog && catalog.offline) {
      bannerEl.append(h('div', { class: 'banner no-print', role: 'note' },
        h('span', null, h('strong', null, 'Versão em validação. '), 'Os cursos são os do Combo Vitalício, mas a ordem e as durações ainda estão sendo validadas pela equipe. Suas respostas ainda não são salvas.')));
    }
  }

  /* ---------- telas ---------- */
  function show(view, opts) {
    S.view = view;
    app.replaceChildren();
    const node = view === 'intro' ? renderIntro() : view === 'step' ? renderStep() : view === 'review' ? renderReview() : view === 'sending' ? renderSending() : view === 'error' ? renderError(opts) : renderResult();
    node.classList.add('step-enter');
    app.append(node);
    if (view !== 'sending') persistSoon();
    const focusTarget = app.querySelector('[data-focus]') || app.querySelector('h1, h2');
    if (focusTarget && !(opts && opts.noFocus)) { focusTarget.setAttribute('tabindex', '-1'); focusTarget.focus({ preventScroll: false }); }
    window.scrollTo(0, 0);
  }

  function renderIntro() {
    return h('section', { class: 'stack-lg', 'aria-labelledby': 'intro-title' },
      h('div', { class: 'hero' }, h('div', { class: 'hero-body' },
        h('p', { class: 'kicker' }, 'Diagnóstico de estudos'),
        h('h1', { id: 'intro-title' }, 'Sua jornada no ', h('span', { class: 'gold' }, 'Combo Vitalício'), ' começa aqui'),
        h('p', { class: 'lead' }, 'Conte um pouco sobre seu momento, seus objetivos e sua rotina. Com essas informações, vamos ajudar você a escolher por onde começar e organizar um plano de estudos que faça sentido para sua realidade.'))),
      h('div', { class: 'panel stack' },
        h('h2', { class: 'sr-only' }, 'Como funciona'),
        h('ul', { class: 'intro-list' },
          h('li', null, `${STEPS.length} etapas curtas, cerca de 10 minutos. Só as perguntas com `, h('span', { class: 'req', 'aria-hidden': 'true' }, '*'), ' são obrigatórias.'),
          h('li', null, 'Você pode voltar às etapas anteriores sem perder respostas.'),
          h('li', null, 'No final, você recebe o curso para começar, a sequência recomendada e um cronograma de quatro semanas.'),
          h('li', null, 'O diagnóstico é educacional: ele orienta seus estudos e não substitui a orientação da equipe.'))),
      privacyNotice(),
      h('div', { class: 'actions' },
        getDraft()
          ? [h('button', { class: 'btn', type: 'button', onclick: resumeDraft }, 'Continuar de onde parei'),
             h('button', { class: 'btn secondary', type: 'button', onclick: startFresh }, 'Começar do zero')]
          : h('button', { class: 'btn block', type: 'button', onclick: () => { S.step = 0; show('step'); } }, 'Montar meu plano de estudos')));
  }

  function privacyNotice() {
    return h('details', { class: 'notice' },
      h('summary', null, 'Como usamos suas respostas'),
      h('p', { class: 'small', style: 'margin-top:8px' },
        '[Texto provisório, a ser validado pela equipe] Suas respostas são usadas para montar seu plano de estudos e para a equipe do Dr. João entender os interesses dos alunos. Coletamos apenas o necessário para o planejamento educacional. Não pedimos e você não deve informar dados de pacientes nem informações de saúde. O acesso às respostas é restrito à equipe autorizada. Contato: ' + CONFIG.PRIVACY_CONTACT + '.'));
  }

  function resumeDraft() {
    const saved = getDraft() || {};
    S.answers = saved.answers || {};
    S.pendingId = saved.pendingId || null;
    S.consent = !!saved.consent;
    S.step = Math.min(saved.step || 0, STEPS.length - 1);
    show(saved.view === 'review' ? 'review' : 'step');
  }
  function startFresh() { store.clear(); S.answers = {}; S.pendingId = null; S.consent = false; S.step = 0; show('step'); }

  /* ----- etapa ----- */
  function progressBar(current) {
    const n = STEPS.length + 1;
    const label = current < STEPS.length ? `Etapa ${current + 1} de ${STEPS.length}` : 'Revisão';
    const name = current < STEPS.length ? STEPS[current].title : 'Confira suas respostas';
    const bar = h('div', { class: 'progress-bar', style: `--n:${n}`, 'aria-hidden': 'true' });
    for (let i = 0; i < n; i++) bar.append(h('span', { class: i < current ? 'done' : i === current ? 'now' : '' }));
    return h('div', { class: 'progress no-print' },
      h('div', { class: 'progress-label' }, h('span', null, label), h('span', null, name)),
      bar,
      h('progress', { class: 'sr-only', max: String(n), value: String(current + 1) }, label));
  }

  function renderStep() {
    const st = STEPS[S.step];
    const form = h('form', { class: 'stack-lg', novalidate: true, 'aria-labelledby': 'step-title', onsubmit: (e) => { e.preventDefault(); next(); } });
    const errBox = h('div', { id: 'err-box', 'aria-live': 'assertive' });
    const fieldsWrap = h('div', { class: 'stack-lg' });
    st.fields.forEach((f) => fieldsWrap.append(renderField(f)));
    form.append(
      progressBar(S.step),
      h('div', { class: 'stack' }, h('h2', { id: 'step-title', 'data-focus': '' }, st.title), h('p', { class: 'muted' }, st.intro)),
      errBox, fieldsWrap,
      h('div', { class: 'actions no-print' },
        S.step > 0 ? h('button', { class: 'btn secondary', type: 'button', onclick: back }, 'Voltar') : h('button', { class: 'btn secondary', type: 'button', onclick: () => show('intro') }, 'Início'),
        S.fromReview ? h('button', { class: 'btn ghost', type: 'button', onclick: () => { if (validateStep()) { S.fromReview = false; show('review'); } } }, 'Salvar e voltar à revisão') : null,
        h('button', { class: 'btn', type: 'submit' }, S.step < STEPS.length - 1 ? 'Avançar' : 'Revisar respostas')));
    setTimeout(updateVisibility, 0);
    return form;
  }

  function fieldWrap(f, control, opts) {
    const isGroup = opts && opts.group;
    const labelText = [f.label, f.req ? h('span', { class: 'req', 'aria-hidden': 'true' }, '*') : (f.sub ? null : h('span', { class: 'opt' }, '(opcional)'))];
    const helpId = f.help ? `help-${f.id}` : null;
    const errId = `err-${f.id}`;
    const err = h('p', { class: 'err-msg', id: errId, hidden: true });
    const help = f.help ? h('p', { class: 'help', id: helpId }, f.help) : null;
    const wrap = isGroup
      ? h('fieldset', { class: 'field', 'data-field': f.id, 'aria-describedby': [helpId, errId].filter(Boolean).join(' ') }, h('legend', null, labelText), help, control, err)
      : h('div', { class: 'field', 'data-field': f.id }, h('label', { for: `f-${f.id}` }, labelText), help, control, err);
    if (f.sub) wrap.classList.add('sub');
    return wrap;
  }

  function setAnswer(id, v) { S.answers[id] = v; persistSoon(); updateVisibility(); clearError(id); }

  function renderField(f) {
    const a = S.answers;
    const describedBy = [f.help ? `help-${f.id}` : null, `err-${f.id}`].filter(Boolean).join(' ');
    switch (f.type) {
      case 'text': case 'email':
        return fieldWrap(f, h('input', { id: `f-${f.id}`, type: f.type, value: a[f.id] || '', maxlength: String(f.max || 200), autocomplete: f.autocomplete || 'off', 'aria-describedby': describedBy, 'aria-required': f.req ? 'true' : null, inputmode: f.type === 'email' ? 'email' : null, oninput: (e) => setAnswer(f.id, e.target.value) }));
      case 'textarea':
        return fieldWrap(f, h('textarea', { id: `f-${f.id}`, maxlength: String(f.max || 600), 'aria-describedby': describedBy, value: a[f.id] || '', oninput: (e) => setAnswer(f.id, e.target.value) }));
      case 'number':
        return fieldWrap(f, h('div', { class: 'inline' },
          h('input', { id: `f-${f.id}`, type: 'number', inputmode: 'decimal', min: String(f.min), max: String(f.maxN), step: String(f.step), value: a[f.id] || '', 'aria-describedby': describedBy, 'aria-required': 'true', oninput: (e) => setAnswer(f.id, e.target.value), style: 'max-width:9rem' }),
          h('span', { class: 'muted', style: 'align-self:center' }, f.suffix || '')));
      case 'date':
        return fieldWrap(f, h('input', { id: `f-${f.id}`, type: 'date', min: f.minToday ? todayIso() : null, value: a[f.id] || (f.id === 'inicio' ? todayIso() : ''), 'aria-describedby': describedBy, onchange: (e) => setAnswer(f.id, e.target.value) }));
      case 'radio': {
        const box = h('div', { class: f.seg ? 'seg' : 'options' + (f.cols ? ' cols' : ''), role: 'radiogroup' });
        f.opts.forEach(([v, t]) => box.append(h('label', { class: 'opt-row' },
          h('input', { type: 'radio', name: f.id, id: `f-${f.id}-${v}`, value: v, checked: a[f.id] === v, onchange: () => setAnswer(f.id, v) }), h('span', null, t))));
        return fieldWrap(f, box, { group: true });
      }
      case 'checkbox': {
        const box = h('div', { class: 'options' + (f.cols ? ' cols' : '') });
        const cur = new Set(a[f.id] || []);
        f.opts.forEach(([v, t]) => box.append(h('label', { class: 'opt-row' },
          h('input', { type: 'checkbox', name: f.id, id: `f-${f.id}-${v}`, value: v, checked: cur.has(v), onchange: (e) => { const s = new Set(S.answers[f.id] || []); e.target.checked ? s.add(v) : s.delete(v); setAnswer(f.id, f.opts.map((o) => o[0]).filter((x) => s.has(x))); } }), h('span', null, t))));
        return fieldWrap(f, box, { group: true });
      }
      case 'weekdays': {
        const box = h('div', { class: 'days' });
        const cur = new Set(a[f.id] || []);
        O.dias.forEach(([v, t]) => box.append(h('label', { class: 'opt-row' },
          h('input', { type: 'checkbox', name: f.id, id: `f-${f.id}-${v}`, value: v, checked: cur.has(v), onchange: (e) => { const s = new Set(S.answers[f.id] || []); e.target.checked ? s.add(v) : s.delete(v); setAnswer(f.id, O.dias.map((o) => o[0]).filter((x) => s.has(x))); } }), h('span', null, t))));
        return fieldWrap(f, box, { group: true });
      }
      case 'courseSelect': {
        const sel = h('select', { id: `f-${f.id}`, 'aria-describedby': describedBy, onchange: (e) => setAnswer(f.id, e.target.value) }, h('option', { value: '' }, 'Nenhum em especial'));
        catalog.courses.forEach((c) => sel.append(h('option', { value: c.id, selected: a[f.id] === c.id }, c.titulo)));
        return fieldWrap(f, sel);
      }
      case 'courseProgress': return fieldWrap(f, renderCourseProgress(f), { group: true });
      case 'themes': return fieldWrap(f, renderThemes(f), { group: true });
      case 'themeLevels': return fieldWrap(f, renderThemeLevels(f), { group: true });
    }
    return h('div');
  }

  function renderCourseProgress(f) {
    const box = h('div', { class: 'options' });
    const val = () => Object.assign({}, S.answers.cursos_iniciados || {});
    catalog.courses.forEach((c) => {
      const cur = (S.answers.cursos_iniciados || {})[c.id];
      const detail = h('div', { class: 'inline', hidden: !cur, style: 'padding-left:28px' });
      const status = h('select', { id: `f-prog-${c.id}-status`, 'aria-label': `Situação em ${c.titulo}`, onchange: (e) => { const v = val(); v[c.id] = Object.assign({}, v[c.id], { status: e.target.value }); pctSel.hidden = e.target.value !== 'andamento'; setAnswer('cursos_iniciados', v); } },
        h('option', { value: 'andamento', selected: !cur || cur.status === 'andamento' }, 'Em andamento'),
        h('option', { value: 'concluido', selected: cur && cur.status === 'concluido' }, 'Concluído'));
      const pctSel = h('select', { id: `f-prog-${c.id}-pct`, 'aria-label': `Quanto já avançou em ${c.titulo}`, hidden: cur && cur.status === 'concluido', onchange: (e) => { const v = val(); v[c.id] = Object.assign({}, v[c.id], { pct: Number(e.target.value) }); setAnswer('cursos_iniciados', v); } },
        O.pct.map(([v, t]) => h('option', { value: v, selected: cur && String(cur.pct) === v }, t)));
      detail.append(status, pctSel);
      const cb = h('input', { type: 'checkbox', id: `f-prog-${c.id}`, checked: !!cur, onchange: (e) => {
        const v = val();
        if (e.target.checked) v[c.id] = { status: S.answers.iniciou === 'concluiu' ? 'concluido' : 'andamento', pct: 10 }; else delete v[c.id];
        detail.hidden = !e.target.checked;
        if (v[c.id]) { status.value = v[c.id].status; pctSel.value = '10'; pctSel.hidden = v[c.id].status !== 'andamento'; }
        setAnswer('cursos_iniciados', v);
      } });
      box.append(h('div', { class: 'subcard', style: 'padding:0;border:0;background:transparent' },
        h('label', { class: 'opt-row' }, cb, h('span', null, c.titulo)), detail));
    });
    return box;
  }

  function renderThemes() {
    const wrap = h('div', { class: 'stack' });
    const list = h('ol', { class: 'prio-list', 'aria-label': 'Sua ordem de prioridade' });
    const boxes = h('div', { class: 'options cols' });
    const draw = () => {
      const sel = (S.answers.temas || []).filter((t) => catalog.themes.includes(t));
      list.replaceChildren();
      sel.forEach((t, i) => list.append(h('li', null,
        h('span', { class: 'rank' }, `${i + 1}º`), h('span', { class: 'name' }, t),
        i > 0 ? h('button', { type: 'button', class: 'icon-btn', 'aria-label': `Subir ${t} na prioridade`, onclick: () => move(i, -1) }, '↑') : null,
        i < sel.length - 1 ? h('button', { type: 'button', class: 'icon-btn', 'aria-label': `Descer ${t} na prioridade`, onclick: () => move(i, 1) }, '↓') : null)));
      list.hidden = !sel.length;
      boxes.querySelectorAll('input').forEach((inp) => { inp.checked = sel.includes(inp.value); inp.disabled = !inp.checked && sel.length >= 3; });
    };
    const move = (i, d) => { const s = (S.answers.temas || []).slice(); const [x] = s.splice(i, 1); s.splice(i + d, 0, x); setAnswer('temas', s); draw(); };
    catalog.themes.forEach((t, i) => boxes.append(h('label', { class: 'opt-row' },
      h('input', { type: 'checkbox', id: `f-temas-${i}`, value: t, onchange: (e) => {
        let s = (S.answers.temas || []).filter((x) => catalog.themes.includes(x));
        if (e.target.checked && s.length < 3) s.push(t); else s = s.filter((x) => x !== t);
        setAnswer('temas', s); draw();
      } }), h('span', null, t))));
    wrap.append(boxes, list);
    setTimeout(draw, 0);
    return wrap;
  }

  function renderThemeLevels() {
    const themes = (S.answers.temas || []).filter((t) => catalog.themes.includes(t));
    const box = h('div', { class: 'stack' });
    if (!themes.length) { box.append(h('p', { class: 'muted' }, 'Escolha seus temas na etapa 2 para responder esta pergunta.')); return box; }
    themes.forEach((t, ti) => {
      const g = h('div', { class: 'seg', role: 'radiogroup', 'aria-label': t });
      O.nivel.forEach(([v, lab]) => g.append(h('label', { class: 'opt-row' },
        h('input', { type: 'radio', name: `nivel-${ti}`, id: `f-nivel_tema-${ti}-${v}`, value: v, checked: (S.answers.nivel_tema || {})[t] === v, onchange: () => { const m = Object.assign({}, S.answers.nivel_tema || {}); m[t] = v; setAnswer('nivel_tema', m); } }),
        h('span', null, lab))));
      box.append(h('div', { class: 'subcard' }, h('strong', null, t), g));
    });
    return box;
  }

  function updateVisibility() {
    app.querySelectorAll('[data-field]').forEach((el) => {
      const f = ALL_FIELDS.find((x) => x.id === el.dataset.field);
      if (f) el.hidden = !isVisible(f, S.answers);
    });
  }

  /* ----- validação ----- */
  function validateField(f, a) {
    if (!isVisible(f, a)) return null;
    const v = a[f.id];
    const empty = v == null || v === '' || (Array.isArray(v) && !v.length);
    switch (f.type) {
      case 'email':
        if (empty) return 'Informe o e-mail usado na compra ou no acesso ao combo.';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v).trim())) return 'Confira o e-mail: ele deve ter o formato nome@exemplo.com.';
        return null;
      case 'number': {
        if (empty) return 'Informe quantas horas por semana você consegue estudar.';
        const n = parseFloat(String(v).replace(',', '.'));
        if (!(n >= f.min && n <= f.maxN)) return `Informe um valor entre ${String(f.min).replace('.', ',')} e ${f.maxN} horas.`;
        return null;
      }
      case 'date':
        if (f.req && !a[f.id] && f.id === 'inicio') { a.inicio = todayIso(); return null; }
        if (a[f.id] && !E.parseDate(a[f.id])) return 'Informe uma data válida.';
        if (f.minToday && a[f.id] && a[f.id] < todayIso()) return 'Escolha hoje ou uma data futura.';
        return null;
      case 'themes':
        if (empty) return 'Escolha pelo menos um tema.';
        return null;
      case 'themeLevels': {
        const ts = (a.temas || []).filter((t) => catalog.themes.includes(t));
        const missing = ts.filter((t) => !(a.nivel_tema || {})[t]);
        return missing.length ? `Indique seu nível em: ${missing.join(', ')}.` : null;
      }
      case 'courseProgress':
        return f.req && (!v || !Object.keys(v).length) ? 'Marque pelo menos um curso ou volte e escolha “Ainda não comecei”.' : null;
      case 'weekdays':
        return empty ? 'Escolha pelo menos um dia da semana.' : null;
    }
    if (f.req && (empty || (typeof v === 'string' && !v.trim()))) return f.msg || `Responda: ${f.label.replace(/\?$/, '')}.`;
    return null;
  }

  function clearError(id) {
    const wrap = app.querySelector(`[data-field="${id}"]`);
    if (!wrap || !wrap.classList.contains('invalid')) return;
    wrap.classList.remove('invalid');
    const e = wrap.querySelector('.err-msg'); if (e) e.hidden = true;
  }

  function validateStep() {
    const st = STEPS[S.step];
    const errs = [];
    st.fields.forEach((f) => {
      const msg = validateField(f, S.answers);
      const wrap = app.querySelector(`[data-field="${f.id}"]`);
      if (!wrap) return;
      const e = wrap.querySelector('.err-msg');
      wrap.classList.toggle('invalid', !!msg);
      if (e) { e.textContent = msg || ''; e.hidden = !msg; }
      if (msg) errs.push({ f, msg });
    });
    const box = app.querySelector('#err-box');
    box.replaceChildren();
    if (errs.length) {
      const ul = h('ul');
      errs.forEach(({ f, msg }) => ul.append(h('li', null, h('a', { href: '#', onclick: (ev) => { ev.preventDefault(); focusField(f.id); } }, msg))));
      const summary = h('div', { class: 'err-summary', tabindex: '-1' }, h('strong', null, errs.length === 1 ? 'Falta 1 resposta nesta etapa:' : `Faltam ${errs.length} respostas nesta etapa:`), ul);
      box.append(summary);
      summary.focus();
      return false;
    }
    return true;
  }
  function focusField(id) {
    const wrap = app.querySelector(`[data-field="${id}"]`);
    const el = wrap && wrap.querySelector('input:not([disabled]), select, textarea');
    if (el) { el.focus(); el.scrollIntoView({ block: 'center' }); }
  }

  function next() {
    if (!validateStep()) return;
    if (S.fromReview) { S.fromReview = false; show('review'); return; }
    if (S.step < STEPS.length - 1) { S.step++; show('step'); } else show('review');
  }
  function back() { if (S.step > 0) { S.step--; show('step'); } }

  /* ----- revisão ----- */
  function displayValue(f, a) {
    const v = a[f.id];
    if (v == null || v === '' || (Array.isArray(v) && !v.length)) return null;
    switch (f.type) {
      case 'radio': return label(f.opts, v);
      case 'checkbox': return v.map((x) => label(f.opts, x)).join('\n');
      case 'weekdays': return v.map((x) => label(O.dias, x)).join(', ');
      case 'themes': return v.map((t, i) => `${i + 1}º ${t}`).join('\n');
      case 'themeLevels': return (a.temas || []).filter((t) => v[t]).map((t) => `${t}: ${label(O.nivel, v[t])}`).join('\n') || null;
      case 'courseSelect': return catalog.byId[v] ? catalog.byId[v].titulo : null;
      case 'courseProgress': return Object.entries(v).filter(([id]) => catalog.byId[id]).map(([id, p]) => `${catalog.byId[id].titulo}: ${p.status === 'concluido' ? 'concluído' : 'em andamento, ' + label(O.pct, String(p.pct)).toLowerCase()}`).join('\n') || null;
      case 'date': return fmtDate(v);
      case 'number': return `${String(v).replace('.', ',')} ${f.suffix || ''}`;
      default: return String(v);
    }
  }

  function renderReview() {
    const a = S.answers;
    const sections = STEPS.map((st, i) => {
      const dl = h('dl');
      st.fields.filter((f) => isVisible(f, a)).forEach((f) => {
        const dv = displayValue(f, a);
        if (dv == null) return;
        dl.append(h('dt', null, f.label), h('dd', null, dv));
      });
      if (!dl.childNodes.length) dl.append(h('dd', { class: 'muted' }, 'Sem respostas nesta etapa.'));
      return h('section', { class: 'panel review-step' },
        h('header', null, h('h3', null, st.title), h('button', { class: 'btn ghost no-print', type: 'button', 'aria-label': `Editar ${st.title}`, onclick: () => { S.step = i; S.fromReview = true; show('step'); } }, 'Editar')),
        dl);
    });
    const consentErr = h('p', { class: 'err-msg', id: 'err-consent', hidden: true }, 'Confirme que leu como usamos suas respostas para gerar o plano.');
    const consent = h('label', { class: 'opt-row' },
      h('input', { type: 'checkbox', id: 'f-consent', checked: S.consent, 'aria-describedby': 'err-consent', onchange: (e) => { S.consent = e.target.checked; consentErr.hidden = true; persistSoon(); } }),
      h('span', null, 'Li como minhas respostas serão usadas e concordo com o registro delas para gerar meu plano de estudos.'));
    const honeypot = h('div', { class: 'sr-only', 'aria-hidden': 'true' }, h('label', { for: 'f-website' }, 'Não preencha este campo'), h('input', { id: 'f-website', type: 'text', tabindex: '-1', autocomplete: 'off' }));
    return h('section', { class: 'stack-lg', 'aria-labelledby': 'rev-title' },
      progressBar(STEPS.length),
      h('div', { class: 'stack' }, h('h2', { id: 'rev-title', 'data-focus': '' }, 'Confira suas respostas'), h('p', { class: 'muted' }, 'Se algo mudou, use “Editar” na etapa. Quando estiver tudo certo, gere seu plano.')),
      sections, privacyNotice(),
      h('div', { class: 'field' }, consent, consentErr), honeypot,
      h('div', { class: 'actions no-print' },
        h('button', { class: 'btn secondary', type: 'button', onclick: () => { S.step = STEPS.length - 1; show('step'); } }, 'Voltar'),
        h('button', { class: 'btn', type: 'button', onclick: () => { if (!S.consent) { consentErr.hidden = false; document.getElementById('f-consent').focus(); return; } submit(); } }, 'Gerar meu plano de estudos')));
  }

  /* ----- envio ----- */
  function computePlan() {
    const a = S.answers;
    const rec = E.recommend(a, catalog);
    const sched = rec.completedAll ? null : E.buildSchedule(a, rec, catalog);
    return { rec, sched };
  }

  function flatAnswers(a) {
    const out = {};
    ALL_FIELDS.forEach((f) => {
      if (!isVisible(f, a)) { out[f.id] = ''; return; }
      const v = a[f.id];
      if (f.type === 'courseSelect') out[f.id] = v && catalog.byId[v] ? `${v} - ${catalog.byId[v].titulo}` : '';
      else if (f.type === 'date') out[f.id] = v || '';
      else if (f.type === 'number') out[f.id] = v ? String(v).replace(',', '.') : '';
      else out[f.id] = displayValue(f, a) == null ? '' : String(displayValue(f, a)).replace(/\n/g, '; ');
    });
    out.consentimento = S.consent ? 'sim' : 'não';
    return out;
  }

  function buildPayload(plan) {
    const a = S.answers;
    const { rec, sched } = plan;
    const profile = profileSummary(a, rec, sched);
    const planRow = rec.start ? {
      resumo_perfil: profile,
      curso_inicial_id: rec.start.id,
      curso_inicial: rec.start.course.titulo,
      justificativa: justificationText(rec),
      sequencia: rec.sequence.map((s, i) => `${i + 1}. ${s.course.titulo} [${s.id}]`).join('; '),
      depois: rec.later.map((c) => `${c.titulo} [${c.id}]`).join('; '),
      carga_semanal_h: String(Number(a.horas_semana)),
      sessoes_semana: String(sched.perWeek),
      minutos_sessao: String(sched.sessionMin),
      inicio: sched.start,
      previsao_etapa: (sched.forecast.find((f) => f.id === rec.start.id) || {}).end || '',
      previsao_sequencia: sched.forecast.filter((f) => !f.later).map((f) => f.end).filter(Boolean).sort().pop() || '',
      prazo_desejado: label(O.prazo_etapa, a.prazo_etapa),
      prazo_viavel: sched.deadline ? (sched.deadline.ok ? 'sim' : `não (seriam necessárias ~${String(sched.deadline.needHours).replace('.', ',')} h/semana)`) : 'sem prazo definido',
      aulas_estimadas: String(sched.estimatedLessons),
    } : { resumo_perfil: profile, justificativa: 'Todos os cursos relacionados aos temas escolhidos já foram concluídos.' };
    const schedule = sched ? sched.sessions.flatMap((s) => s.items.map((it) => ({
      semana: String(s.week), data: s.date, dia_semana: s.dow, sessao: String(s.n), tipo: s.type,
      curso_id: it.courseId, curso: it.course, modulo: it.review ? '' : it.module, aula_id: it.review ? '' : it.lessonId,
      aula: it.review ? it.text : it.lesson + (it.part ? ` (parte ${it.part})` : ''),
      minutos: String(it.min), duracao_estimada: it.estimated ? 'sim' : 'não',
      atividade_complementar: s.comp + (s.compMin ? ` (${s.compMin} min)` : ''), objetivo_sessao: s.goal, link: it.link || '',
    }))) : [];
    const sug = {};
    ['temas_futuros', 'aprofundar', 'formatos', 'falta', 'melhoria'].forEach((k) => { sug[k] = flatAnswers(a)[k]; });
    return {
      action: 'submit', id: S.pendingId, formVersion: CONFIG.FORM_VERSION, catalogVersion: catalog.version,
      clientSubmittedAt: new Date().toISOString(), website: (document.getElementById('f-website') || {}).value || '',
      answers: flatAnswers(a), plan: planRow, schedule, suggestions: sug,
      courseIds: rec.sequence.map((s) => s.id).concat(rec.later.map((c) => c.id)),
    };
  }

  async function submit() {
    if (!S.pendingId) S.pendingId = uuid(); // mesmo ID em todas as tentativas: o servidor ignora duplicatas
    persist();
    let plan;
    try { plan = computePlan(); } catch (e) { console.error(e); show('error', { kind: 'plan', message: e.message }); return; }
    S.result = plan;
    if (!CONFIG.ENDPOINT) { S.saved = false; S.mode = 'demo'; show('result'); return; }
    show('sending');
    try {
      const payload = buildPayload(plan);
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), CONFIG.REQUEST_TIMEOUT_MS);
      let j;
      try {
        const r = await fetch(CONFIG.ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload), signal: ctrl.signal, redirect: 'follow' });
        j = await r.json();
      } finally { clearTimeout(t); }
      if (!j || !j.ok) throw new Error((j && j.error) || 'Resposta inesperada do servidor');
      S.saved = true; S.mode = 'saved';
      show('result');
    } catch (e) {
      console.error(e);
      show('error', { kind: 'send', message: e.name === 'AbortError' ? 'O servidor demorou para responder.' : e.message });
    }
  }

  function renderSending() {
    return h('section', { class: 'stack', 'aria-busy': 'true' },
      h('h2', { 'data-focus': '' }, 'Gerando e salvando seu plano…'),
      h('p', { class: 'muted', role: 'status' }, 'Isso costuma levar alguns segundos. Não feche esta página.'));
  }

  function renderError(opts) {
    const isPlan = opts && opts.kind === 'plan';
    return h('section', { class: 'stack-lg' },
      h('div', { class: 'banner err', role: 'alert' }, h('span', null, h('strong', null, isPlan ? 'Não foi possível montar o plano. ' : 'Seu plano ainda não foi salvo. '),
        isPlan ? 'Revise suas respostas e tente novamente.' : 'Suas respostas continuam guardadas neste navegador. Verifique sua conexão e tente de novo; o reenvio não cria registro duplicado.')),
      h('h2', { 'data-focus': '' }, isPlan ? 'Algo deu errado ao gerar o plano' : 'Não conseguimos salvar agora'),
      opts && opts.message ? h('p', { class: 'muted small' }, 'Detalhe técnico: ' + opts.message) : null,
      h('div', { class: 'actions' },
        h('button', { class: 'btn secondary', type: 'button', onclick: () => show('review') }, 'Voltar à revisão'),
        !isPlan ? h('button', { class: 'btn ghost', type: 'button', onclick: () => { S.saved = false; S.mode = 'unsaved'; show('result'); } }, 'Ver o plano sem salvar') : null,
        h('button', { class: 'btn', type: 'button', onclick: submit }, 'Tentar novamente')));
  }

  /* ----- resultado ----- */
  function profileSummary(a, rec, sched) {
    const parts = [];
    parts.push(`Objetivo: ${a.objetivo === 'outro' && a.objetivo_outro ? 'outro' : label(O.objetivo, a.objetivo).replace(/\.$/, '').toLowerCase()}.`);
    parts.push(`Temas: ${rec.themes.map((t) => `${t} (${label(O.nivel, (a.nivel_tema || {})[t] || 'iniciante').toLowerCase()})`).join(', ')}.`);
    parts.push(`Ponto de partida: ${label(O.momento, a.momento).replace(/\.$/, '').toLowerCase()}.`);
    if (sched) parts.push(`Disponibilidade: ${fmtHours(Number(a.horas_semana))} por semana em ${sched.perWeek} sessão(ões) de até ${E.fmtMin(sched.sessionMin)}.`);
    return parts.join(' ');
  }

  function justificationNodes(rec) {
    const ph = E.reasonPhrases(rec.start, rec, catalog);
    const t = rec.start.course.titulo;
    if (!ph.length) return ['Indicamos ', h('strong', null, t), ' como primeiro passo porque ele é a base dos demais cursos ligados aos seus temas.'];
    return ['Indicamos ', h('strong', null, t), ' como primeiro passo porque ', E.joinPt(ph), '.'];
  }
  const justificationText = (rec) => justificationNodes(rec).map((n) => (typeof n === 'string' ? n : n.textContent)).join('');

  function renderResult() {
    const a = S.answers;
    const { rec, sched } = S.result;
    const name = String(a.nome || '').trim().split(/\s+/)[0] || '';
    const status = S.mode === 'saved'
      ? h('div', { class: 'banner ok no-print', role: 'status' }, h('span', null, h('strong', null, 'Plano salvo. '), 'Suas respostas e seu plano foram registrados com sucesso.'))
      : S.mode === 'unsaved'
        ? h('div', { class: 'banner err no-print', role: 'status' }, h('span', null, h('strong', null, 'Plano ainda não salvo. '), 'Você pode consultar o plano abaixo, mas ele não foi registrado. ', h('button', { class: 'btn ghost', type: 'button', onclick: submit }, 'Tentar salvar de novo')))
        : null; // modo demonstração: o aviso fixo do topo já informa que nada foi enviado

    const head = h('div', { class: 'stack' },
      h('p', { class: 'eyebrow' }, 'Seu plano de estudos'),
      h('h2', { 'data-focus': '' }, name ? `${name}, este é o seu próximo passo` : 'Este é o seu próximo passo'),
      h('p', { class: 'muted small' }, `Gerado em ${new Date().toLocaleDateString('pt-BR')} · catálogo ${catalog.version}${catalog.demo ? ' (demonstração)' : ''}`));

    if (rec.completedAll) {
      return h('section', { class: 'stack-lg' }, status, head,
        h('div', { class: 'panel stack' }, h('p', null, 'Você já concluiu todos os cursos do catálogo ligados aos temas que escolheu. Refaça o diagnóstico escolhendo outros temas, ou fale com a equipe para indicar os próximos passos.')),
        restartActions());
    }

    // Seu momento atual
    const momento = h('section', { class: 'result-section', 'aria-labelledby': 'r-momento' },
      h('h3', { id: 'r-momento' }, 'Seu momento atual'),
      h('p', null, profileSummary(a, rec, sched)),
      h('div', { class: 'facts' },
        fact(fmtHours(sched.weeklyMin / 60), 'por semana informadas'),
        fact(`${sched.perWeek}× ${E.fmtMin(sched.sessionMin)}`, 'sessões por semana'),
        fact(fmtDate(sched.start), 'início do plano'),
        fact(label(O.ritmo, a.ritmo).split(',')[0].replace(/\.$/, ''), 'ritmo escolhido')));

    // Por onde começar
    const sc = rec.start.course;
    const startCard = h('section', { class: 'start-card', 'aria-labelledby': 'r-start' },
      h('p', { class: 'eyebrow' }, 'Por onde começar'),
      h('h3', { id: 'r-start' }, sc.titulo),
      sc.descricao ? h('p', { class: 'muted' }, sc.descricao) : null,
      h('p', null, justificationNodes(rec)),
      rec.start.pct ? h('p', { class: 'small' }, 'Você já começou este curso. Retome pela aula indicada no cronograma ou pela aula em que parou.') : null,
      sc.link ? h('div', null, h('a', { class: 'btn', href: sc.link, target: '_blank', rel: 'noopener' }, 'Acessar o curso'))
        : CONFIG.MEMBER_AREA_URL ? h('div', { class: 'stack' }, h('div', null, h('a', { class: 'btn', href: CONFIG.MEMBER_AREA_URL, target: '_blank', rel: 'noopener' }, 'Abrir a área de membros')), h('p', { class: 'small muted' }, `Na área de membros, abra a trilha “${sc.titulo}”.`))
          : h('p', { class: 'small muted' }, 'O link oficial deste curso ainda não foi cadastrado no catálogo.'));

    // Curso desejado fora do início
    let desiredNote = null;
    if (rec.desired && rec.desired.id !== rec.start.id) {
      const pos = rec.sequence.findIndex((s) => s.id === rec.desired.id);
      const missingPre = rec.desired.prereqs.filter((p) => rec.sequence.some((s) => s.id === p) || rec.later.some((c) => c.id === p));
      desiredNote = h('p', { class: 'small' }, `Sobre ${rec.desired.titulo}, o curso que você quer muito começar: `,
        pos >= 0 ? `ele está na posição ${pos + 1} da sua sequência` : 'ele entra depois da sequência principal',
        missingPre.length ? ` porque depende de ${E.joinPt(missingPre.map((p) => catalog.byId[p].titulo))}.` : ' para respeitar suas prioridades e os pré-requisitos.');
    }

    // Sequência
    const seqList = h('ol', { class: 'seq' });
    rec.sequence.forEach((s, i) => {
      const f = sched.forecast.find((x) => x.id === s.id);
      const prog = S.answers.iniciou !== 'nao' ? (S.answers.cursos_iniciados || {}) : {};
      const pre = s.course.prereqs.map((p) => catalog.byId[p].titulo + ((prog[p] || {}).status === 'concluido' ? ' (já concluído)' : ''));
      seqList.append(h('li', null, h('span', { class: 'n' }, String(i + 1)), h('div', null,
        h('strong', null, s.course.titulo),
        h('div', { class: 'meta' }, E.roleOf(s, i, catalog), ' · ', f.blockMode ? `carga estimada de ${E.fmtMin(f.contentMin)} (provisória)` : `${E.fmtMin(f.contentMin)} de aulas${f.estimatedCount ? ' (inclui estimativas)' : ''}`),
        pre.length ? h('div', { class: 'meta' }, `Pré-requisito: ${E.joinPt(pre)}`) : null,
        f.end ? h('div', { class: 'meta' }, `Previsão: ${fmtDateShort(f.start)} a ${fmtDate(f.end)}`) : null)));
    });
    const seqSection = h('section', { class: 'result-section', 'aria-labelledby': 'r-seq' },
      h('h3', { id: 'r-seq' }, 'Sua sequência de estudos'),
      h('p', { class: 'muted small' }, 'A ordem respeita os pré-requisitos de cada curso e depois as suas prioridades.'),
      h('div', { class: 'panel' }, seqList), desiredNote,
      rec.later.length ? h('p', { class: 'small muted' }, `Depois dessa sequência: ${rec.later.map((c) => c.titulo).join(', ')}.`) : null,
      rec.waived.length ? h('p', { class: 'small muted' }, rec.waived.map((w) => `Como você já avançou em ${catalog.byId[w.course].titulo}, não pedimos que volte para ${catalog.byId[w.prereq].titulo} antes de continuar. Se sentir falta da base, faça esse curso em paralelo.`).join(' ')) : null);

    // Cronograma
    const weeks = {};
    sched.sessions.forEach((s) => (weeks[s.week] = weeks[s.week] || []).push(s));
    const weekKeys = Object.keys(weeks).map(Number).sort((x, y) => x - y);
    const cron = h('section', { class: 'result-section', 'aria-labelledby': 'r-cron' },
      h('h3', { id: 'r-cron' }, weekKeys.length >= 4 ? 'Seu cronograma das próximas quatro semanas' : 'Seu cronograma'),
      h('p', { class: 'muted small' }, `Cada semana usa no máximo o tempo que você informou (${fmtHours(sched.weeklyMin / 60)}). Aulas longas aparecem divididas em partes.`),
      weekKeys.map((w) => weekTable(w, weeks[w], sched)));
    const notes = [];
    if (sched.forecast.some((f) => f.blockMode)) notes.push('As aulas e durações dos cursos ainda estão sendo cadastradas. Por isso o cronograma usa blocos de estudo de 30 minutos sobre uma carga horária estimada e provisória. Em cada bloco, siga a ordem das aulas do curso na área de membros, de onde parou. As datas de conclusão são estimativas.');
    if (sched.estimatedLessons) notes.push(`${sched.estimatedLessons} aula(s) ainda não têm duração cadastrada no catálogo. Para elas usamos uma estimativa de ${sched.defaultLessonMin} minutos, marcada como “estimado”.`);
    notes.push(...sched.notes);
    if (sched.deadline && !sched.deadline.ok) notes.push(`Você gostaria de concluir a primeira etapa até ${fmtDate(sched.deadline.wanted)}. Com ${fmtHours(sched.deadline.haveHours)} por semana, a previsão realista é ${fmtDate(sched.deadline.forecast)}. Para chegar antes, seriam necessárias cerca de ${String(sched.deadline.needHours).replace('.', ',')} h por semana. Mantivemos o plano dentro do tempo que você tem.`);
    if (sched.deadline && sched.deadline.ok) notes.push(`A previsão de conclusão de ${sc.titulo} (${fmtDate(sched.deadline.forecast)}) cabe no prazo que você deseja.`);
    if (a.prazo_compromisso === 'sim' && a.prazo_data) notes.push(`Você mencionou um compromisso em ${fmtDate(a.prazo_data)}. Use o plano como apoio na preparação; ele não garante um resultado.`);
    cron.append(h('div', { class: 'panel stack small' }, h('strong', null, 'Observações sobre o cronograma'), h('ul', { class: 'intro-list' }, notes.map((n) => h('li', null, n)))));
    const fc = h('ul', { class: 'forecast' });
    sched.forecast.filter((f) => f.end).forEach((f) => fc.append(h('li', null, h('span', null, f.titulo), h('span', null, `${fmtDateShort(f.start)} → ${fmtDate(f.end)}`))));
    cron.append(h('div', { class: 'stack' }, h('strong', null, 'Previsão das próximas etapas'), h('p', { class: 'small muted' }, 'Estimativa mantendo o mesmo ritmo. Ela muda se sua rotina mudar, e tudo bem.'), fc));

    // Evolução
    const ms = sched.milestones.slice(0, 5).map((m) => h('li', null, `${m.text} (semana ${m.week})`));
    const evo = h('section', { class: 'result-section', 'aria-labelledby': 'r-evo' },
      h('h3', { id: 'r-evo' }, 'Como acompanhar sua evolução'),
      h('ul', { class: 'checklist' },
        h('li', null, 'Cumprir as sessões da primeira semana, mesmo que mais curtas que o previsto'),
        ms,
        h('li', null, 'Na revisão semanal, listar um conceito que ficou mais claro e uma dúvida que ainda resta'),
        (a.evolucao || []).includes('aplicacao') ? h('li', null, 'Registrar uma situação em que você aplicou algo que estudou') : null));

    const change = h('section', { class: 'result-section', 'aria-labelledby': 'r-change' },
      h('h3', { id: 'r-change' }, 'Se sua rotina mudar'),
      h('ul', { class: 'intro-list' },
        h('li', null, 'Perdeu uma sessão? Siga para a próxima do ponto em que parou. Não é preciso compensar tudo de uma vez.'),
        h('li', null, 'Semana apertada? Faça só a parte de aula e deixe a atividade complementar para a revisão.'),
        h('li', null, 'Se sua disponibilidade ou seus objetivos mudarem, refaça o diagnóstico para gerar um plano novo. O histórico anterior fica guardado.')));

    return h('section', { class: 'stack-lg' }, status, head, momento, startCard, seqSection, cron, evo, change, restartActions());
  }

  function fact(v, l) { return h('div', { class: 'fact' }, h('b', null, v), h('span', null, l)); }

  function weekTable(w, sessions, sched) {
    const total = sessions.reduce((t, s) => t + s.minutes, 0);
    const tbody = h('tbody');
    sessions.forEach((s) => {
      let lastCtx = '';
      const lessons = s.items.map((it) => it.review
        ? h('div', { class: 'lesson-line' }, h('span', { class: 'course' }, it.course), it.text)
        : h('div', { class: 'lesson-line' },
          (() => { const ctx = `${it.course} · ${it.module}`; if (ctx === lastCtx) return null; lastCtx = ctx; return h('span', { class: 'course' }, ctx); })(),
          it.link ? h('a', { href: it.link, target: '_blank', rel: 'noopener' }, it.lesson) : it.lesson,
          it.part ? h('span', { class: 'tag cont' }, it.continuation ? `continuação, parte ${it.part}` : `parte ${it.part}`) : null,
          it.estimated && !it.block ? h('span', { class: 'tag' }, 'estimado') : null,
          it.block && (!it.part || it.part === 1) ? h('span', { class: 'tag' }, 'bloco de estudo') : null,
          ` · ${E.fmtMin(it.min)}`));
      tbody.append(h('tr', { class: s.type === 'revisao' ? 'rev' : '' },
        h('td', { 'data-label': 'Semana', class: 'num' }, String(s.week)),
        h('td', { 'data-label': 'Dia ou sessão' }, h('div', null, `${s.dow}, ${fmtDateShort(s.date)}`, h('br'), h('span', { class: 'muted small' }, `Sessão ${s.n}`))),
        h('td', { 'data-label': 'Curso e aula' }, h('div', null, lessons)),
        h('td', { 'data-label': 'Tempo previsto', class: 'num' }, E.fmtMin(s.minutes)),
        h('td', { 'data-label': 'Atividade complementar' }, h('div', null, s.comp, s.compMin ? ` (${E.fmtMin(s.compMin)})` : '')),
        h('td', { 'data-label': 'Objetivo da sessão' }, s.goal)));
    });
    return h('div', { class: 'week' },
      h('div', { class: 'week-head' }, h('strong', null, `Semana ${w}`), h('small', null, `${E.fmtMin(total)} de ${E.fmtMin(sched.weeklyMin)} disponíveis`)),
      h('div', { class: 'table-wrap' }, h('table', { class: 'plan' },
        h('thead', null, h('tr', null, ['Semana', 'Dia ou sessão', 'Curso e aula', 'Tempo previsto', 'Atividade complementar', 'Objetivo da sessão'].map((c) => h('th', { scope: 'col' }, c)))),
        tbody)));
  }

  function restartActions() {
    const framed = window.self !== window.top;
    return h('div', { class: 'actions no-print' },
      framed ? h('p', { class: 'small muted grow' }, 'Para imprimir ou salvar em PDF, abra a página publicada fora desta prévia.')
        : h('button', { class: 'btn secondary', type: 'button', onclick: () => window.print() }, 'Imprimir ou salvar em PDF'),
      h('button', { class: 'btn', type: 'button', onclick: () => { store.clear(); S = { view: 'intro', step: 0, answers: {}, pendingId: null, fromReview: false, result: null, saved: false, consent: false }; show('step'); } }, 'Refazer o diagnóstico'));
  }

  /* ---------- início ---------- */
  async function boot() {
    app.replaceChildren(h('p', { class: 'muted', role: 'status' }, 'Carregando o catálogo de cursos…'));
    try {
      await loadCatalog();
      renderBanner();
      show('intro', { noFocus: true });
    } catch (e) {
      console.error(e);
      app.replaceChildren(h('section', { class: 'stack' },
        h('div', { class: 'banner err', role: 'alert' }, h('span', null, h('strong', null, 'Não foi possível carregar o catálogo de cursos. '), 'Verifique sua conexão e tente novamente.')),
        h('div', null, h('button', { class: 'btn', type: 'button', onclick: boot }, 'Tentar novamente'))));
    }
  }
  // Exposto para testes automatizados
  window.__cv = { get state() { return S; }, get catalog() { return catalog; }, computePlan, buildPayload };
  boot();
})();
