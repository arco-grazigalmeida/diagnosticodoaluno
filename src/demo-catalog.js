// Catálogo FICTÍCIO de demonstração. Substituir pelo catálogo oficial (aba "Catálogo" da planilha).
// Gera as linhas no mesmo formato da aba "Catálogo": uma linha por aula.
const SPEC = [
  { id: 'C01', t: 'Fundamentos Essenciais (demo)', d: 'Conceitos centrais que sustentam os demais cursos.', temas: 'Fundamentos', nivel: 1, pre: '',
    obj: 'Construir base sólida; revisar conceitos centrais', link: 'https://example.com/demo/fundamentos', mat: 'Resumo em PDF; Checklist de revisão',
    mods: [['Conceitos-base', [['Visão geral dos fundamentos', 18], ['Conceitos centrais I', 22], ['Conceitos centrais II', 25]]],
           ['Estrutura de raciocínio', [['Como organizar o raciocínio', 20], ['Erros comuns de base', 30], ['Revisão guiada do módulo', 15]]]] },
  { id: 'C02', t: 'Prática Aplicada (demo)', d: 'Aplicação dos fundamentos em situações do dia a dia profissional.', temas: 'Prática aplicada', nivel: 2, pre: 'C01',
    obj: 'Aplicar conceitos na atuação profissional', link: '', mat: 'Exercícios comentados',
    mods: [['Da teoria à prática', [['Roteiro de aplicação', 25], ['Situações frequentes', 35], ['Exercício guiado', 40]]],
           ['Tomada de decisão', [['Critérios de decisão', 45], ['Discussão de exemplos', 30]]]] },
  { id: 'C03', t: 'Casos Complexos (demo)', d: 'Estudos de caso com maior nível de complexidade.', temas: 'Estudos de caso; Prática aplicada', nivel: 3, pre: 'C02',
    obj: 'Desenvolver segurança em situações complexas', link: '', mat: 'Estudos de caso',
    mods: [['Análise de casos', [['Método de análise de casos', 50], ['Caso comentado 1', 40], ['Caso comentado 2', null]]],
           ['Casos integrados', [['Caso integrado', null], ['Síntese e revisão', 35]]]] },
  { id: 'C04', t: 'Atualizações Recentes (demo)', d: 'O que mudou recentemente nos temas do combo.', temas: 'Atualizações', nivel: 2, pre: 'C01',
    obj: 'Atualizar conhecimentos', link: '', mat: 'Resumo em PDF',
    mods: [['Panorama de atualizações', [['O que mudou e por quê', 15], ['Atualização em fundamentos', 15], ['Atualização em prática', 20], ['Como se manter atualizado', 20]]]] },
  { id: 'C05', t: 'Comunicação e Relacionamento (demo)', d: 'Comunicação clara com pessoas atendidas e com a equipe.', temas: 'Comunicação', nivel: 1, pre: '',
    obj: 'Comunicar-se com mais segurança', link: '', mat: 'Checklist de comunicação',
    mods: [['Bases da comunicação', [['Escuta e clareza', 20], ['Conversas difíceis', 25], ['Comunicação escrita', 20]]],
           ['Relacionamento com a equipe', [['Alinhamento e feedback', 30], ['Prática comentada', 20]]]] },
  { id: 'C06', t: 'Organização e Rotina de Estudos (demo)', d: 'Como montar e manter uma rotina de estudos realista.', temas: 'Organização dos estudos', nivel: 1, pre: '',
    obj: 'Ganhar constância e organização', link: '', mat: 'Checklist de rotina',
    mods: [['Rotina possível', [['Planejando a semana', 10], ['Sessões curtas que funcionam', 12], ['Revisão espaçada na prática', 15]]]] },
  { id: 'C07', t: 'Aprofundamento Avançado (demo)', d: 'Discussões avançadas para quem já domina a base e a prática.', temas: 'Fundamentos; Estudos de caso', nivel: 4, pre: 'C03; C04',
    obj: 'Aprofundar temas avançados', link: '', mat: '',
    mods: [['Tópicos avançados', [['Tópico avançado I', 60], ['Tópico avançado II', 55], ['Discussão final', 50]]]] },
];

function rows() {
  const out = [];
  for (const c of SPEC) {
    c.mods.forEach(([mt, aulas], mi) => {
      aulas.forEach(([at, dur], ai) => {
        const aulaId = `${c.id}-M${mi + 1}-A${ai + 1}`;
        out.push({
          curso_id: c.id, curso_titulo: c.t, curso_descricao: c.d, temas: c.temas, nivel: c.nivel,
          prerequisitos: c.pre, objetivos: c.obj, link_curso: c.link,
          modulo_id: `${c.id}-M${mi + 1}`, modulo_titulo: mt, modulo_ordem: mi + 1,
          aula_id: aulaId, aula_titulo: at, aula_ordem: ai + 1, duracao_min: dur == null ? '' : dur,
          link_aula: c.link ? `${c.link}/aula-${mi + 1}-${ai + 1}` : '', materiais: c.mat, ativo: 'sim',
        });
      });
    });
  }
  return out;
}
module.exports = { rows };
if (require.main === module) process.stdout.write(JSON.stringify(rows(), null, 1));
