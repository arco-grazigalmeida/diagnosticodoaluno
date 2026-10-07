/**
 * Backend do Diagnóstico do Combo Vitalício (Google Apps Script vinculado à planilha).
 *
 * - GET  ?action=catalog  -> devolve o catálogo ativo (aba "Catálogo") e a versão (aba "Configuração").
 * - POST (JSON em text/plain) -> registra diagnóstico, plano, cronograma e sugestões.
 *
 * Segurança:
 * - Nenhuma credencial fica na página: o script roda com a conta da equipe ("Executar como: eu").
 * - O endpoint nunca devolve dados de alunos; só o catálogo e confirmações.
 * - Texto do aluno é gravado como texto (prefixo ' em valores que começam com = + - @),
 *   impedindo a execução de fórmulas.
 * - Envios repetidos com o mesmo ID não duplicam registros (idempotência + LockService).
 * Guia: docs/guia-configuracao.md
 */

const SHEETS = {
  diag: 'Diagnósticos',
  plano: 'Planos de estudo',
  cron: 'Cronograma',
  sug: 'Sugestões de atualização',
  cat: 'Catálogo',
  cfg: 'Configuração',
};

// HEADERS:BEGIN (lido também pelo gerador do modelo .xlsx — manter JSON válido)
const HEADERS = {
  "Diagnósticos": ["diagnostico_id", "recebido_em", "enviado_em_cliente", "status", "versao_formulario", "versao_catalogo",
    "nome", "email", "area", "momento", "momento_outro", "tempo_combo", "iniciou", "cursos_iniciados",
    "objetivo", "objetivo_outro", "temas", "dificuldade", "fazer_melhor", "curso_desejado", "curso_desejado_motivo",
    "prazo_compromisso", "prazo_descricao", "prazo_data", "meta_30", "meta_3m", "meta_12m", "prazo_etapa",
    "evolucao", "evolucao_outro", "nivel_tema", "estudou_antes", "revisar_assuntos", "freq_conceitos", "revisar_fundamentos",
    "horas_semana", "dias", "duracao_sessao", "periodo", "inicio", "ritmo", "previsibilidade",
    "ajuda", "atrapalha", "atrapalha_outro", "sequencial", "acessibilidade", "consentimento", "erro"],
  "Planos de estudo": ["plano_id", "diagnostico_id", "criado_em", "nome", "email", "resumo_perfil", "curso_inicial_id", "curso_inicial",
    "justificativa", "sequencia", "depois", "carga_semanal_h", "sessoes_semana", "minutos_sessao", "inicio",
    "previsao_etapa", "previsao_sequencia", "prazo_desejado", "prazo_viavel", "aulas_estimadas", "versao_catalogo", "versao_formulario"],
  "Cronograma": ["diagnostico_id", "plano_id", "semana", "data", "dia_semana", "sessao", "tipo", "curso_id", "curso", "modulo",
    "aula_id", "aula", "minutos", "duracao_estimada", "atividade_complementar", "objetivo_sessao", "link"],
  "Sugestões de atualização": ["diagnostico_id", "recebido_em", "nome", "email", "temas_futuros", "aprofundar", "formatos", "falta", "melhoria", "status_analise"],
  "Catálogo": ["curso_id", "curso_titulo", "curso_descricao", "temas", "nivel", "prerequisitos", "objetivos", "link_curso",
    "modulo_id", "modulo_titulo", "modulo_ordem", "aula_id", "aula_titulo", "aula_ordem", "duracao_min", "link_aula", "materiais", "ativo"],
  "Configuração": ["chave", "valor", "descricao"]
};
// HEADERS:END

const LIMITS = { MAX_BODY: 300000, MAX_FIELD: 2000, MAX_SCHEDULE_ROWS: 400, MAX_PER_EMAIL_10MIN: 6 };

/* ---------------- Entradas HTTP ---------------- */

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || '';
  if (action === 'catalog') {
    try {
      return json_({ ok: true, version: getConfig_('versao_catalogo') || 'sem-versao', rows: readCatalog_() });
    } catch (err) {
      return json_({ ok: false, error: 'Catálogo indisponível' });
    }
  }
  return json_({ ok: true, service: 'diagnostico-combo-vitalicio' });
}

function doPost(e) {
  let body;
  try {
    if (!e || !e.postData || !e.postData.contents) return json_({ ok: false, error: 'Requisição vazia' });
    if (e.postData.contents.length > LIMITS.MAX_BODY) return json_({ ok: false, error: 'Envio muito grande' });
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ ok: false, error: 'JSON inválido' });
  }
  if (body.action !== 'submit') return json_({ ok: false, error: 'Ação desconhecida' });

  const id = String(body.id || '');
  if (!/^[A-Za-z0-9-]{8,64}$/.test(id)) return json_({ ok: false, error: 'Identificador inválido' });
  if (body.website) return json_({ ok: true, id: id }); // honeypot preenchido: robô; não grava e não revela
  const answers = body.answers || {};
  const email = String(answers.email || '').trim().toLowerCase();
  if (!answers.nome || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return json_({ ok: false, error: 'Nome e e-mail são obrigatórios' });
  if (answers.consentimento !== 'sim') return json_({ ok: false, error: 'Consentimento não informado' });

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return json_({ ok: false, error: 'Servidor ocupado, tente novamente' });
  try {
    const ss = ss_();
    const diag = ss.getSheetByName(SHEETS.diag);
    const existingRow = findRow_(diag, 1, id);
    if (existingRow) {
      const status = diag.getRange(existingRow, colIndex_(diag, 'status')).getValue();
      if (status === 'plano gerado') return json_({ ok: true, id: id, duplicate: true }); // reenvio: já registrado
      // Tentativa anterior falhou no meio: limpa o que ficou parcial e grava de novo
      deleteRowsById_(ss.getSheetByName(SHEETS.plano), 2, id);
      deleteRowsById_(ss.getSheetByName(SHEETS.cron), 1, id);
      deleteRowsById_(ss.getSheetByName(SHEETS.sug), 1, id);
      diag.deleteRow(existingRow);
    } else if (!throttleOk_(email)) {
      return json_({ ok: false, error: 'Muitos envios seguidos. Aguarde alguns minutos.' });
    }

    const now = new Date();
    const catVersion = getConfig_('versao_catalogo') || 'sem-versao';
    // 1) Diagnóstico com status "recebido"
    const diagRecord = Object.assign({}, answers, {
      diagnostico_id: id, recebido_em: now, enviado_em_cliente: String(body.clientSubmittedAt || ''),
      status: 'recebido', versao_formulario: String(body.formVersion || ''), versao_catalogo: String(body.catalogVersion || ''), erro: '',
    });
    const diagRow = appendRecord_(diag, diagRecord, ['recebido_em']);

    try {
      // 2) Valida que o plano usa somente cursos do catálogo ativo
      const active = {};
      readCatalog_().forEach(function (r) { active[String(r.curso_id)] = true; });
      const ids = (body.courseIds || []).concat((body.schedule || []).map(function (s) { return s.curso_id; }));
      const unknown = ids.filter(function (c) { return c && !active[String(c)]; });
      if (unknown.length) throw new Error('Plano cita cursos fora do catálogo ativo: ' + unknown.slice(0, 5).join(', '));
      if (body.catalogVersion && String(body.catalogVersion) !== String(catVersion)) {
        // Catálogo mudou entre o carregamento da página e o envio: registra, mas sinaliza
        diagRecord.erro = 'Aviso: plano gerado com catálogo ' + body.catalogVersion + '; versão atual ' + catVersion;
      }

      // 3) Plano
      const planoId = 'P-' + id;
      const plan = body.plan || {};
      appendRecord_(ss.getSheetByName(SHEETS.plano), Object.assign({}, plan, {
        plano_id: planoId, diagnostico_id: id, criado_em: now, nome: answers.nome, email: email,
        versao_catalogo: String(body.catalogVersion || ''), versao_formulario: String(body.formVersion || ''),
      }), ['criado_em']);

      // 4) Cronograma (uma linha por aula/atividade de cada sessão)
      const sched = (body.schedule || []).slice(0, LIMITS.MAX_SCHEDULE_ROWS);
      appendRecords_(ss.getSheetByName(SHEETS.cron), sched.map(function (s) {
        return Object.assign({}, s, { diagnostico_id: id, plano_id: planoId, link: safeUrl_(s.link) });
      }), []);

      // 5) Sugestões (só se houver alguma resposta)
      const sug = body.suggestions || {};
      const hasSug = ['temas_futuros', 'aprofundar', 'formatos', 'falta', 'melhoria'].some(function (k) { return String(sug[k] || '').trim(); });
      if (hasSug) appendRecord_(ss.getSheetByName(SHEETS.sug), Object.assign({}, sug, { diagnostico_id: id, recebido_em: now, nome: answers.nome, email: email, status_analise: 'nova' }), ['recebido_em']);

      // 6) Conclui
      setCell_(diag, diagRow, 'status', 'plano gerado');
      if (diagRecord.erro) setCell_(diag, diagRow, 'erro', diagRecord.erro);
      SpreadsheetApp.flush();
      return json_({ ok: true, id: id, planoId: planoId });
    } catch (err) {
      setCell_(diag, diagRow, 'status', 'erro');
      setCell_(diag, diagRow, 'erro', String(err && err.message || err).slice(0, 500));
      SpreadsheetApp.flush();
      return json_({ ok: false, error: 'Não foi possível registrar o plano' });
    }
  } finally {
    lock.releaseLock();
  }
}

/* ---------------- Configuração inicial ---------------- */

/** Rode uma vez pelo editor: cria abas que faltarem, cabeçalhos e formatação. Não apaga dados. */
function setup() {
  const ss = ss_();
  Object.keys(HEADERS).forEach(function (name) {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    const headers = HEADERS[name];
    const current = sh.getLastColumn() ? sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].filter(String) : [];
    if (!current.length) {
      sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    } else {
      const missing = headers.filter(function (h) { return current.indexOf(h) === -1; });
      if (missing.length) sh.getRange(1, current.length + 1, 1, missing.length).setValues([missing]);
    }
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, sh.getLastColumn()).setFontWeight('bold');
  });
  const cfg = ss.getSheetByName(SHEETS.cfg);
  if (!getConfig_('versao_catalogo')) cfg.appendRow(['versao_catalogo', 'v1', 'Atualize sempre que o catálogo mudar. Fica registrada em cada plano.']);
  // Protege as abas de registro contra edição acidental (a equipe edita só Catálogo e Configuração)
  [SHEETS.diag, SHEETS.plano, SHEETS.cron].forEach(function (n) {
    const sh = ss.getSheetByName(n);
    if (!sh.getProtections(SpreadsheetApp.ProtectionType.SHEET).length) {
      sh.protect().setDescription('Registros automáticos do diagnóstico').setWarningOnly(true);
    }
  });
}

/* ---------------- Auxiliares ---------------- */

function ss_() {
  const id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** Converte qualquer valor do aluno em texto seguro para a planilha. */
function safe_(v) {
  if (v == null) return '';
  let s = typeof v === 'object' ? JSON.stringify(v) : String(v);
  s = s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').slice(0, LIMITS.MAX_FIELD);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // impede interpretação como fórmula
  return s;
}

function safeUrl_(u) {
  const s = String(u || '').trim();
  return /^https:\/\/[^\s"'<>]+$/i.test(s) ? s : '';
}

function headers_(sh) {
  return sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
}

function colIndex_(sh, name) {
  const i = headers_(sh).indexOf(name);
  if (i === -1) throw new Error('Coluna "' + name + '" não encontrada em ' + sh.getName() + '. Rode setup().');
  return i + 1;
}

function toRow_(headers, rec, rawKeys) {
  return headers.map(function (h) {
    const v = rec[h];
    if (rawKeys.indexOf(h) !== -1 && v instanceof Date) return v; // datas geradas pelo servidor
    return safe_(v);
  });
}

function appendRecord_(sh, rec, rawKeys) {
  const headers = headers_(sh);
  const row = sh.getLastRow() + 1;
  sh.getRange(row, 1, 1, headers.length).setValues([toRow_(headers, rec, rawKeys || [])]);
  return row;
}

function appendRecords_(sh, recs, rawKeys) {
  if (!recs.length) return;
  const headers = headers_(sh);
  const rows = recs.map(function (r) { return toRow_(headers, r, rawKeys || []); });
  sh.getRange(sh.getLastRow() + 1, 1, rows.length, headers.length).setValues(rows);
}

function setCell_(sh, row, col, value) {
  sh.getRange(row, colIndex_(sh, col)).setValue(safe_(value));
}

function findRow_(sh, col, value) {
  if (sh.getLastRow() < 2) return 0;
  const hit = sh.getRange(2, col, sh.getLastRow() - 1, 1).createTextFinder(value).matchEntireCell(true).findNext();
  return hit ? hit.getRow() : 0;
}

function deleteRowsById_(sh, col, id) {
  if (!sh || sh.getLastRow() < 2) return;
  const vals = sh.getRange(2, col, sh.getLastRow() - 1, 1).getValues();
  for (let i = vals.length - 1; i >= 0; i--) if (String(vals[i][0]) === id) sh.deleteRow(i + 2);
}

function readCatalog_() {
  const sh = ss_().getSheetByName(SHEETS.cat);
  if (!sh || sh.getLastRow() < 2) return [];
  const values = sh.getRange(1, 1, sh.getLastRow(), sh.getLastColumn()).getDisplayValues();
  const headers = values.shift().map(String);
  return values.filter(function (r) { return String(r[0]).trim(); }).map(function (r) {
    const o = {};
    headers.forEach(function (h, i) { if (HEADERS['Catálogo'].indexOf(h) !== -1) o[h] = r[i]; });
    return o;
  }).filter(function (o) { return ['não', 'nao', 'n', 'false', '0'].indexOf(String(o.ativo || 'sim').trim().toLowerCase()) === -1; });
}

function getConfig_(key) {
  const sh = ss_().getSheetByName(SHEETS.cfg);
  if (!sh || sh.getLastRow() < 2) return '';
  const vals = sh.getRange(2, 1, sh.getLastRow() - 1, 2).getDisplayValues();
  for (let i = 0; i < vals.length; i++) if (vals[i][0] === key) return vals[i][1];
  return '';
}

function throttleOk_(email) {
  const cache = CacheService.getScriptCache();
  const key = 'rl_' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, email)).slice(0, 40);
  const n = Number(cache.get(key) || 0);
  if (n >= LIMITS.MAX_PER_EMAIL_10MIN) return false;
  cache.put(key, String(n + 1), 600);
  return true;
}
