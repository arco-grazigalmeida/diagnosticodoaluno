# Lógica de recomendação e cronograma

Implementação: `src/engine.js` (funções puras, roda no navegador). Versão do formulário: `1.0.0`.

**Regra de segurança:** o motor só lê respostas fechadas (opções, números, datas, cursos do catálogo). Textos abertos nunca entram na lógica, então não conseguem alterar regras.

## 1. Entradas usadas

| Pergunta | Uso no motor |
|---|---|
| Temas (até 3, em ordem) | Define os cursos-alvo e o peso de cada um |
| Nível por tema (autoavaliação) | Ajusta início pela base ou por cursos mais avançados |
| Revisar fundamentos / frequência de conceitos não compreendidos / momento atual | Sinal de "precisa de base" |
| Objetivo principal | Pequeno ajuste de peso (base ou aprofundamento) |
| Cursos iniciados/concluídos e progresso | Concluídos saem do plano e liberam pré-requisitos; em andamento ganham prioridade e pulam as aulas já vistas (aproximação) |
| Curso desejado | Ganha prioridade, mas nunca fura pré-requisito |
| O que atrapalha (organização, não saber por onde começar) | Traz o curso de apoio à organização, se existir no catálogo |
| Horas/semana, dias, duração da sessão, início, ritmo, previsibilidade | Cronograma |
| O que ajuda a aprender | Escolha da atividade complementar |
| Concluir um por vez ou alternar | Um curso por vez ou dois cursos intercalados |
| Prazo da primeira etapa | Checagem de viabilidade |

## 2. Escolha e ordem dos cursos

1. **Pontuação inicial**
   - Tema prioridade 1: +30 · prioridade 2: +20 · prioridade 3: +10
   - Curso desejado: +15 · Curso em andamento: +12 · Curso de apoio à organização: +6
2. **Pré-requisitos**: adicionados de forma recursiva. Curso concluído conta como pré-requisito cumprido.
   - Exceção: num curso *em andamento* com ≥ 50% de progresso, ou com autoavaliação intermediária ou avançada, o pré-requisito não é exigido. O aluno vê um aviso sugerindo fazê-lo em paralelo. **Decisão pedagógica a validar com a equipe.**
3. **Ajustes**
   - Se o aluno precisa de base: cursos de nível 1 ganham +10, cursos de nível 3 ou mais perdem 5.
   - Objetivo "base sólida": nível 1 ou 2 ganha +6.
   - Objetivo "aprofundar": cursos até 1 nível acima do aluno ganham +4.
   - Curso 2 ou mais níveis acima da autoavaliação: −8.
   - Nível 1 perde 4 quando o aluno é intermediário ou avançado e não quer revisar a base.
   - O aluno "precisa de base" quando marca que quer revisar os fundamentos, ou quando não recusou a revisão e mostra pelo menos um destes sinais: encontra conceitos difíceis com frequência, está começando, está retomando, ou se avaliou como iniciante.
4. **Herança**: o pré-requisito recebe no mínimo a pontuação do curso que ele destrava, mais 1.
5. **Ordenação topológica**: o pré-requisito sempre vem antes. Os empates são resolvidos, nesta ordem, por pontuação, tema de maior prioridade, nível mais baixo e ordem no catálogo.
6. O curso de apoio à organização, quando entra, fica em 2º lugar porque é curto e ajuda a manter a constância.
7. A sequência principal mostra no máximo 5 cursos. Os demais aparecem como "Depois dessa sequência".
8. O **ponto de partida** é o 1º curso da sequência.

**Justificativa**: o texto é montado a partir dos motivos registrados. Exemplo real do protótipo: *"Indicamos Prática Aplicada como primeiro passo porque é pré-requisito de Casos Complexos e trabalha 'Prática aplicada', o tema que você colocou como prioridade número 1."*

## 3. Cronograma

- **Orçamento semanal** = horas × 60. Quando a rotina "muda bastante", o plano usa só 85% desse tempo e deixa o resto como folga.
- **Sessão** = menor valor entre o teto escolhido (15, 30, 60 ou 90 min) e o orçamento dividido pelos dias, arredondado para baixo em múltiplos de 5. Se a sessão ficar com menos de 10 min, o plano usa menos dias e avisa o aluno.
- **Divisão de cada sessão**: aula + atividade complementar.
  - A atividade complementar ocupa 25% da sessão no ritmo leve, 20% no equilibrado e 15% no intensivo, com mínimo de 5 min.
  - Sessões de até 15 min são só de aula.
- **Revisão semanal**: a última sessão da semana vira revisão. Ritmo leve: toda semana. Equilibrado: a cada 2 semanas. Intensivo: a cada 4 semanas. Com 1 sessão por semana, a revisão acontece a cada 3, 4 ou 6 semanas, conforme o ritmo.
- **Aulas**: seguem a ordem do catálogo (módulo e aula).
  - Aula maior que a sessão é dividida em partes, marcadas como continuação.
  - Uma aula nova não começa quando sobram menos de 10 min. Esse tempo vai para a atividade complementar.
- **Aula sem duração no catálogo**: o plano usa 20 min e marca a aula como **"estimado"**.
- **Garantia**: o motor interrompe o cálculo com erro se alguma semana passar do tempo informado.
- **Atividade complementar**: só cita material que existe na coluna `materiais` do curso. Sem material cadastrado, sugere atividades de estudo genéricas, como anotar ou resumir. O motor não inventa recurso.
- **Prazo**: compara a conclusão prevista do curso inicial com o prazo desejado. Se não couber, mostra a data realista e quantas horas por semana seriam necessárias, sem mudar o plano.
- **Detalhe**: 4 semanas com data. As etapas seguintes aparecem só como previsão de início e fim por curso.

## 4. Parâmetros ajustáveis (`engine.js` › `DEFAULTS`)

`DEFAULT_LESSON_MIN` (20), `MAX_SEQUENCE` (5), `DETAIL_WEEKS` (4), `SUPPORT_THEME_PATTERN` (/organiza/ — tema do curso de apoio).

## 5. Limitações conhecidas

- **Progresso informado em faixa:** "consideramos as N primeiras aulas como vistas" é uma aproximação, e o aluno é avisado disso. Resolver de verdade exige integração com a plataforma de cursos.
- **Nível é autoavaliação:** não há questões objetivas aprovadas pela equipe. Quando houver, elas entram como uma etapa opcional.
- **O plano é calculado no navegador:** o servidor valida se todos os cursos citados existem no catálogo ativo, mas não recalcula o plano. Para uso educacional o risco é baixo. Se o plano virar algo auditável, mova o motor para o Apps Script, que roda o mesmo JavaScript.
