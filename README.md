# Diagnóstico do aluno — Combo Vitalício

Página de diagnóstico de estudos do Combo Vitalício (Dr. João): formulário em 7 etapas que gera o curso inicial, a sequência recomendada e um cronograma de 4 semanas.

- `index.html` — página publicada (arquivo único, gerado). **Não edite à mão.**
- `src/` — código-fonte. Depois de editar, rode `node src/build.js` para regenerar o `index.html`.
- `apps-script/Code.gs` — backend para gravar no Google Sheets.
- `planilha/` — modelo da planilha (inclui catálogo fictício de demonstração).
- `docs/` — lógica de recomendação, guia de configuração e pendências.

**Status:** modo demonstração. Cursos fictícios e nada é gravado até preencher `CONFIG.ENDPOINT` em `src/app.js` (ver `docs/guia-configuracao.md`).

Hospedagem: Vercel (site estático, sem build). Cada push na `main` publica automaticamente.
