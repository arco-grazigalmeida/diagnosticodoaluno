// Catálogo do Combo Vitalício — trilhas reais da área de membros (Hotmart), lidas dos prints enviados em 2026-10-07.
// Gera as linhas no formato da aba "Catálogo".
//
// O QUE É REAL: títulos das trilhas.
// O QUE É PROPOSTA (validar com a equipe): temas, nível, pré-requisitos e carga estimada.
// MÓDULOS E AULAS: vêm de src/catalogo-aulas.json, gerado por src/importar_doc.py a partir do Google Doc da equipe.
// O QUE FALTA: duração e link de cada aula. Sem duração, o plano usa a estimativa padrão por aula, sinalizada ao aluno.
// Curso sem aulas no documento usa "blocos de estudo" sobre a carga estimada (provisória).
//
// tipo: "curso" entra na recomendação; "recurso" (suporte, bônus, ao vivo, ebook) não entra no cronograma.
const VERSION = 'doc-aulas-2026-10-07-provisorio';
const AULAS = require('./catalogo-aulas.json').cursos;
const T = {
  anat: 'Anatomia facial',
  tox: 'Toxina botulínica',
  preench: 'Preenchimento facial',
  areas: 'Preenchimento avançado por região',
  bio: 'Bioestimuladores',
  fios: 'Fios',
  corp: 'Harmonização corporal',
  comp: 'Complicações e segurança',
  gestao: 'Atendimento e rotina de consultório',
};
// [id, título, temas, nível(1-4), pré-requisitos, carga estimada (h), tipo]
const CURSOS = [
  ['ANAT', 'Formação Especialista em Anatomia', [T.anat], 1, [], 12],
  ['CAD', 'Anatomia em Cadáveres', [T.anat], 3, ['ANAT'], 4],
  ['CTX', 'CTX - Protocolo Glabela', [T.tox], 1, ['ANAT'], 2],
  ['BTX', 'Formação Especialista em Botox', [T.tox], 2, ['ANAT'], 12],
  ['CPX', 'Curso de Preenchimento Express', [T.preench], 1, ['ANAT'], 3],
  ['FEP', 'Formação Especialista em Preenchimento', [T.preench], 2, ['ANAT'], 12],
  ['OLH', 'Imersão Avançada em Preenchimento de Olheiras', [T.areas, T.preench], 3, ['FEP'], 4],
  ['LAB', 'Imersão Avançada em Preenchimento Labial', [T.areas, T.preench], 3, ['FEP'], 4],
  ['RINO', 'Imersão Avançada em Rinomodelação', [T.areas, T.preench], 3, ['FEP'], 4],
  ['FF', 'Imersão Avançada em Full Face', [T.areas, T.preench], 3, ['FEP'], 4],
  ['FF10', 'Imersão Avançada em Full Face com mais de 10 ml', [T.areas], 4, ['FF'], 4],
  ['BIO', 'Formação Especialista em Bioestimuladores', [T.bio], 2, ['ANAT'], 10],
  ['FIOS', 'Formação Especialista em Fios', [T.fios], 3, ['ANAT'], 10],
  ['CORP', 'Formação Especialista em Corporal', [T.corp], 2, [], 10],
  ['COMP', 'Curso Avançado de Complicações', [T.comp], 3, ['FEP', 'BTX'], 6],
  ['ATD', 'Atenda Todo Santo Dia', [T.gestao], 1, [], 4],
];
const RECURSOS = [
  ['EBOOK', '[Ebook] A Ciência e Arte do Preenchimento… (título completo a confirmar)', [T.areas]],
  ['EXTRA', 'Conteúdos adicionais e bônus (convidados, workshops, Pithon Napoli Experience)', []],
  ['LIVE', 'Aulas Ao Vivo', []],
  ['BON', 'Bônus', []],
  ['SUP', 'Suporte Técnico', []],
];
const MEMBER_AREA = 'https://hotmart.com/pt-BR/club/combo-vitalicio/products/4636748';

function rows() {
  const base = { curso_descricao: '', objetivos: '', link_curso: '', modulo_id: '', modulo_titulo: '', modulo_ordem: '',
    aula_id: '', aula_titulo: '', aula_ordem: '', duracao_min: '', link_aula: '', materiais: '', ativo: 'sim' };
  const out = [];
  CURSOS.forEach(([id, t, temas, nivel, pre, carga]) => {
    const curso = Object.assign({}, base, {
      curso_id: id, curso_titulo: t, temas: temas.join('; '), nivel, prerequisitos: pre.join('; '), tipo: 'curso',
      materiais: id === 'OLH' ? 'Ebook A Ciência e Arte do Preenchimento (casos clínicos de olheiras)' : '',
    });
    const mods = AULAS[id] || [];
    if (!mods.length) { out.push(Object.assign(curso, { carga_estimada_h: carga, carga_fonte: 'provisória' })); return; }
    mods.forEach((m, mi) => m.aulas.forEach((a, ai) => out.push(Object.assign({}, curso, {
      modulo_id: `${id}-M${mi + 1}`, modulo_titulo: m.titulo, modulo_ordem: mi + 1,
      aula_id: `${id}-M${mi + 1}-A${ai + 1}`, aula_titulo: a, aula_ordem: ai + 1, carga_estimada_h: '', carga_fonte: '',
    }))));
  });
  RECURSOS.forEach(([id, t, temas]) => out.push(Object.assign({}, base, {
    curso_id: id, curso_titulo: t, temas: temas.join('; '), nivel: '', prerequisitos: '', tipo: 'recurso', carga_estimada_h: '', carga_fonte: '',
  })));
  return out;
}
module.exports = { rows, VERSION, MEMBER_AREA };
if (require.main === module) process.stdout.write(JSON.stringify(rows(), null, 1));
