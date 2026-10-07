# Diagnóstico do aluno — Combo Vitalício

Página de diagnóstico de estudos do Combo Vitalício (Dr. João): formulário em 7 etapas que gera o curso inicial, a sequência recomendada e um cronograma de 4 semanas.

- `index.html` — página publicada (arquivo único, gerado). **Não edite à mão.**
- `src/` — código-fonte (catálogo em `src/catalogo.js`). Depois de editar, rode `node src/build.js` para regenerar o `index.html`.
- `apps-script/Code.gs` — backend para gravar no Google Sheets.
- `planilha/` — modelo da planilha (inclui as 20 trilhas reais, sem aulas ainda).
- `docs/` — lógica de recomendação, guia de configuração e pendências.

**Status:** versão em validação. Trilhas reais do Combo Vitalício, mas sem módulos, aulas, durações e links: o plano usa blocos de estudo sobre cargas provisórias (ver `docs/catalogo-proposta.md`). Nada é gravado até preencher `CONFIG.ENDPOINT` em `src/app.js` (ver `docs/guia-configuracao.md`).

Hospedagem: Vercel (site estático, sem build). Cada push na `main` publica automaticamente.
