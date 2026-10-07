# Diagnóstico do aluno — Combo Vitalício

Página de diagnóstico de estudos do Combo Vitalício (Dr. João): formulário em 7 etapas que gera o curso inicial, a sequência recomendada e um cronograma de 4 semanas.

- `index.html` — página publicada (arquivo único, gerado). **Não edite à mão.**
- `src/` — código-fonte (catálogo em `src/catalogo.js`). Depois de editar, rode `node src/build.js` para regenerar o `index.html`.
- `apps-script/Code.gs` — backend para gravar no Google Sheets.
- `planilha/` — modelo da planilha (inclui as trilhas e as 1.013 aulas, sem duração e link).
- `docs/` — lógica de recomendação, guia de configuração e pendências.

**Status:** versão em validação. Trilhas, módulos e aulas reais do Combo Vitalício, mas sem duração e link: o plano usa 20 min por aula, marcado como estimado (ver `docs/catalogo-proposta.md`). Nada é gravado até preencher `CONFIG.ENDPOINT` em `src/app.js` (ver `docs/guia-configuracao.md`).

Hospedagem: Vercel (site estático, sem build). Cada push na `main` publica automaticamente.
