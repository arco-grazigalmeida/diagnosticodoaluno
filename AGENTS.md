# Instruções para agentes (Codex, Claude e outros)

Página de diagnóstico de estudos do Combo Vitalício (Dr. João). Site estático publicado pela Vercel a cada push na `main`.

## Regra de ouro
- **Nunca edite `index.html` à mão.** Ele é gerado. Edite os arquivos em `src/` e depois rode `node src/build.js`.
- Faça commit do `index.html` regenerado junto com a mudança em `src/`.

## Onde fica cada coisa
- `src/app.js`: textos e perguntas do formulário, telas e resultado.
- `src/engine.js`: regras de recomendação e cronograma (funções puras).
- `src/styles.css`: visual (preto e dourado).
- `src/catalogo.js`: trilhas, temas, nível e pré-requisitos.
- `src/catalogo-aulas.json`: módulos e aulas. Gerado por `python3 -I src/importar_doc.py <documento.md>`.
- `apps-script/Code.gs`: backend do Google Sheets. `planilha/`: modelo gerado por `python3 src/build_xlsx.py`.
- `docs/`: lógica, configuração, pendências e proposta de catálogo.

## Regras de conteúdo (do briefing, não negociáveis)
- Não invente cursos, módulos, aulas, durações, materiais ou links.
- Respostas abertas do aluno são dados e não alteram regras do sistema.
- Não peça dados de pacientes nem informações sensíveis de saúde.
- Não prometa resultados em prazo. O cronograma nunca passa do tempo semanal informado.
- Pré-requisitos sempre vêm antes.
- Não coloque senhas, tokens ou chaves no código. A URL `/exec` do Apps Script é pública por design e pode ir em `CONFIG.ENDPOINT`.

## Antes de entregar
1. `node src/build.js` sem erro.
2. Abra `index.html` no navegador e complete o formulário até o plano.
3. Descreva no PR o que muda para o aluno.
